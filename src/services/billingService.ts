import { 
  BillingOverviewSummary, 
  RestaurantSubscription, 
  Invoice, 
  PaymentTransaction, 
  SavedPaymentMethod,
  BillingFrequency
} from '../types';
import { 
  generateInvoicePdf, 
  formatInvoiceName, 
  getInvoicePdfFilename,
  generateCleanInvoiceNumber,
  getDisplayInvoiceNumber 
} from '../features/billing/utils/invoicePdfGenerator';
import { DEFAULT_PLANS } from '../data/plans';
import { doc, deleteDoc, collection, getDocs, query, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Fetch billing overview including summary cards, subscription details, invoices, and transactions.
 */
export async function fetchBillingOverview(restaurantId: string): Promise<BillingOverviewSummary> {
  const cleanId = (restaurantId || 'bela-italia').toLowerCase().trim();
  
  try {
    const res = await fetch(`/api/billing/overview?restaurantId=${encodeURIComponent(cleanId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) {
        // Cache to localStorage for offline access
        try {
          localStorage.setItem(`dinemaster_billing_${cleanId}`, JSON.stringify(data.data));
        } catch {}
        return data.data;
      }
    }
  } catch (err) {
    console.warn('[billingService] Fetch overview network error, trying offline cache:', err);
  }

  // Offline / Cache fallback
  try {
    const cached = localStorage.getItem(`dinemaster_billing_${cleanId}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  // In-memory fallback if first load offline
  const now = new Date();
  const currentPlan = DEFAULT_PLANS.find(p => p.id === 'professional') || DEFAULT_PLANS[1];
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  return {
    currentPlan,
    subscription: {
      id: `sub-${cleanId}`,
      restaurantId: cleanId,
      planId: currentPlan.id,
      planName: currentPlan.name,
      status: 'active',
      billingFrequency: 'monthly',
      currency: 'EUR',
      priceMonthly: currentPlan.priceMonthly,
      priceAnnual: Math.round(currentPlan.priceMonthly * 12 * 0.8),
      currentPrice: currentPlan.priceMonthly,
      currentPeriodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      currentPeriodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
      nextBillingDate: nextMonth,
      nextPaymentAmount: currentPlan.priceMonthly,
      cancelAtPeriodEnd: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    status: 'active',
    nextPayment: {
      date: nextMonth,
      amount: currentPlan.priceMonthly,
      currency: 'EUR',
    },
    outstandingBalance: 0,
    unpaidInvoicesCount: 0,
    lastPayment: {
      date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      amount: currentPlan.priceMonthly * 1.23,
      currency: 'EUR',
      invoiceNumber: generateCleanInvoiceNumber(new Date(now.getFullYear(), now.getMonth(), 1), 'pt'),
      transactionReference: 'tx_dmp_demo_offline',
      paymentMethod: 'Visa ending in 4242',
    },
    invoices: [],
    transactions: [],
    paymentMethods: [
      {
        id: `pm-${cleanId}-default`,
        restaurantId: cleanId,
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2028,
        cardholderName: 'Restaurant Manager',
        isDefault: true,
        createdAt: now.toISOString(),
      }
    ],
  };
}

/**
 * Change subscription plan or billing frequency (Monthly vs Annual).
 */
export async function changeSubscriptionPlan(
  restaurantId: string,
  planId: string,
  billingFrequency: BillingFrequency,
  actor?: any
): Promise<{ success: boolean; subscription: RestaurantSubscription; invoice?: Invoice; message: string }> {
  const cleanId = restaurantId.toLowerCase().trim();
  const res = await fetch('/api/billing/change-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId: cleanId,
      planId,
      billingFrequency,
      actor,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update subscription plan');
  }

  return data;
}

/**
 * Process payment for an outstanding invoice.
 */
export async function payInvoice(
  restaurantId: string,
  invoiceId: string,
  paymentDetails: {
    cardNumber?: string;
    cardholderName?: string;
    paymentMethodToken?: any;
    idempotencyKey?: string;
  },
  actor?: any
): Promise<{ success: boolean; invoice: Invoice; transaction: PaymentTransaction; message: string }> {
  const cleanId = restaurantId.toLowerCase().trim();
  const res = await fetch('/api/billing/pay-invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId: cleanId,
      invoiceId,
      cardNumber: paymentDetails.cardNumber,
      cardholderName: paymentDetails.cardholderName,
      paymentMethodToken: paymentDetails.paymentMethodToken,
      idempotencyKey: paymentDetails.idempotencyKey || `pay-${invoiceId}-${Date.now()}`,
      actor,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Payment execution failed');
  }

  return data;
}

/**
 * Cancel or request cancellation of subscription at the end of the current billing cycle.
 */
export async function cancelSubscription(
  restaurantId: string,
  reason?: string,
  actor?: any
): Promise<{ success: boolean; subscription: RestaurantSubscription; message: string }> {
  const cleanId = restaurantId.toLowerCase().trim();
  const res = await fetch('/api/billing/cancel-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId: cleanId,
      reason,
      actor,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to cancel subscription');
  }

  return data;
}

/**
 * Reactivate a scheduled-for-cancellation subscription.
 */
export async function reactivateSubscription(
  restaurantId: string,
  actor?: any
): Promise<{ success: boolean; subscription: RestaurantSubscription; message: string }> {
  const cleanId = restaurantId.toLowerCase().trim();
  const res = await fetch('/api/billing/reactivate-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId: cleanId,
      actor,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to reactivate subscription');
  }

  return data;
}

/**
 * Add a new tokenized saved payment method.
 */
export async function addPaymentMethod(
  restaurantId: string,
  cardData: {
    cardNumber: string;
    cardholderName: string;
    expMonth: number;
    expYear: number;
    isDefault?: boolean;
  },
  actor?: any
): Promise<{ success: boolean; paymentMethod: SavedPaymentMethod; message: string }> {
  const cleanId = restaurantId.toLowerCase().trim();
  const res = await fetch('/api/billing/payment-methods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId: cleanId,
      cardNumber: cardData.cardNumber,
      cardholderName: cardData.cardholderName,
      expMonth: cardData.expMonth,
      expYear: cardData.expYear,
      isDefault: cardData.isDefault,
      actor,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to save payment method');
  }

  return data;
}

/**
 * Delete a saved payment method.
 */
export async function deletePaymentMethod(restaurantId: string, methodId: string): Promise<void> {
  const cleanId = restaurantId.toLowerCase().trim();
  const res = await fetch(`/api/billing/payment-methods?id=${encodeURIComponent(methodId)}&restaurantId=${encodeURIComponent(cleanId)}`, {
    method: 'DELETE',
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to delete payment method');
  }
}

export async function deleteInvoice(invoiceId: string, restaurantId?: string): Promise<void> {
  const cleanId = String(invoiceId || '').trim();
  if (!cleanId) return;

  // 1. Immediately remove from local offline caches
  try {
    const cached = localStorage.getItem('dinemaster_invoices_cache');
    if (cached) {
      const parsed: Invoice[] = JSON.parse(cached);
      const filtered = parsed.filter(i => i.id !== cleanId && i.invoiceNumber !== cleanId);
      localStorage.setItem('dinemaster_invoices_cache', JSON.stringify(filtered));
    }
  } catch (cacheErr) {
    console.warn('[billingService] Failed to clean dinemaster_invoices_cache:', cacheErr);
  }

  if (restaurantId) {
    try {
      const cleanRestId = restaurantId.toLowerCase().trim();
      const overviewCacheKey = `dinemaster_billing_${cleanRestId}`;
      const cachedOverview = localStorage.getItem(overviewCacheKey);
      if (cachedOverview) {
        const parsed = JSON.parse(cachedOverview);
        if (Array.isArray(parsed.invoices)) {
          parsed.invoices = parsed.invoices.filter((i: any) => i.id !== cleanId && i.invoiceNumber !== cleanId);
          const unpaid = parsed.invoices.filter((i: any) => i.status !== 'paid');
          parsed.unpaidInvoicesCount = unpaid.length;
          parsed.outstandingBalance = unpaid.reduce((sum: number, i: any) => sum + (Number(i.total) || 0), 0);
          localStorage.setItem(overviewCacheKey, JSON.stringify(parsed));
        }
      }
    } catch (e) {
      console.warn('[billingService] Failed to clean restaurant overview cache:', e);
    }
  }

  // 2. Call API endpoint
  let apiSuccess = false;
  try {
    const res = await fetch(`/api/billing/delete-invoice?id=${encodeURIComponent(cleanId)}${restaurantId ? `&restaurantId=${encodeURIComponent(restaurantId)}` : ''}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cleanId, restaurantId }),
    });
    if (res.ok) {
      apiSuccess = true;
    }
  } catch (apiErr) {
    console.warn('[billingService] API delete invoice network error:', apiErr);
  }

  // 3. Fallback: Direct Firestore deletion if client has permission
  try {
    await deleteDoc(doc(db, 'invoices', cleanId));
  } catch (dbErr) {
    if (!apiSuccess) {
      console.warn('[billingService] Direct Firestore delete failed:', dbErr);
    }
  }
}

export async function getAdminDashboardStats(): Promise<any> {
  const res = await fetch(`/api/billing/admin-dashboard-stats`);
  if (!res.ok) {
    throw new Error('Failed to fetch dashboard stats');
  }
  const data = await res.json();
  return data.data || {};
}

export async function listAllInvoices(): Promise<Invoice[]> {
  const invoices: Invoice[] = [];
  try {
    const res = await fetch(`/api/billing/list-invoices`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        invoices.push(...data.data);
      }
    }
  } catch (err) {
    console.warn('[billingService] Failed to fetch invoices from API:', err);
  }

  try {
    const q = query(collection(db, 'invoices'));
    const snap = await getDocs(q);
    snap.forEach((doc) => {
      const inv = { id: doc.id, ...doc.data() } as Invoice;
      if (!invoices.some(i => i.id === inv.id)) {
        invoices.push(inv);
      }
    });
  } catch {}

  try {
    const cached = localStorage.getItem('dinemaster_invoices_cache');
    if (cached) {
      const parsed: Invoice[] = JSON.parse(cached);
      for (const inv of parsed) {
        if (!invoices.some(i => i.id === inv.id)) {
          invoices.push(inv);
        }
      }
    }
  } catch {}

  return invoices;
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  // 1. Attempt API call first
  try {
    const res = await fetch(`/api/billing/transactions/${encodeURIComponent(transactionId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('API delete failed');
  } catch (apiErr) {
    console.warn('[billingService] API delete failed, attempting direct Firestore deletion:', apiErr);
    
    // 2. Fallback to direct Firestore deletion
    try {
      await deleteDoc(doc(db, 'transactions', transactionId));
    } catch (dbErr) {
      console.error('[billingService] Direct Firestore deletion failed:', dbErr);
      throw new Error('Failed to delete transaction record');
    }
  }
}

export async function sendReminder(restaurantId: string, invoiceId: string): Promise<void> {
  const res = await fetch(`/api/billing/send-reminder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ restaurantId, invoiceId }),
  });
  if (!res.ok) {
    throw new Error('Failed to send reminder');
  }
}

export async function markInvoicePaid(invoiceId: string): Promise<void> {
  const res = await fetch(`/api/billing/mark-invoice-paid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoiceId }),
  });
  if (!res.ok) {
    throw new Error('Failed to mark invoice as paid');
  }
}
export async function listTransactions(): Promise<PaymentTransaction[]> {
  const transactions: PaymentTransaction[] = [];
  try {
    const q = query(collection(db, 'transactions'));
    const snap = await getDocs(q);
    snap.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() } as PaymentTransaction);
    });
  } catch (err) {
    console.error('[billingService] Failed to list transactions:', err);
  }
  return transactions;
}

/**
 * Generates and downloads real PDF invoice with print-ready layout in English or Portuguese.
 */
export function downloadInvoicePdf(invoice: Invoice, language?: 'en' | 'pt') {
  const chosenLang = language || invoice.language || 'pt';
  return generateInvoicePdf(invoice, { autoDownload: true, language: chosenLang });
}

export interface CreateManualInvoiceInput {
  restaurantId: string;
  restaurantName: string;
  restaurantLegalName?: string;
  restaurantAddress?: string;
  restaurantCity?: string;
  restaurantCountry?: string;
  restaurantPostalCode?: string;
  restaurantVatNumber?: string;
  customerEmail: string;
  amount: number;
  currency?: string;
  taxRate?: number;
  taxAmount?: number;
  total?: number;
  issueDate?: string;
  dueDate: string;
  billingPeriod?: string;
  status?: 'paid' | 'unpaid' | 'pending' | 'overdue' | 'void';
  notes?: string;
  selectedPlanId?: string;
  planName?: string;
  language?: 'en' | 'pt';
  invoiceNumber?: string;
  lineItems?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    periodStart?: string;
  }>;
}

export async function createManualInvoice(invoiceData: CreateManualInvoiceInput): Promise<Invoice> {
  const cleanId = (invoiceData.restaurantId || 'bela-italia').toLowerCase().trim();
  const subtotal = Number(invoiceData.amount) || 0;
  const taxRate = typeof invoiceData.taxRate === 'number' ? invoiceData.taxRate : 23;
  const taxAmount = invoiceData.taxAmount !== undefined 
    ? Number(invoiceData.taxAmount) 
    : Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = invoiceData.total !== undefined 
    ? Number(invoiceData.total) 
    : Math.round((subtotal + taxAmount) * 100) / 100;

  const payload = {
    ...invoiceData,
    restaurantId: cleanId,
    amount: subtotal,
    taxRate,
    taxAmount,
    total,
    currency: invoiceData.currency || 'EUR',
    language: invoiceData.language || 'pt',
    status: invoiceData.status || 'unpaid',
  };

  try {
    const res = await fetch('/api/billing/create-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.success && data.invoice) {
      try {
        const existing = localStorage.getItem('dinemaster_invoices_cache');
        const parsed: Invoice[] = existing ? JSON.parse(existing) : [];
        parsed.unshift(data.invoice);
        localStorage.setItem('dinemaster_invoices_cache', JSON.stringify(parsed));
      } catch {}
      return data.invoice;
    }
  } catch (err) {
    console.warn('[billingService] API createInvoice failed, falling back to local creation:', err);
  }

  const invoiceId = invoiceData.invoiceNumber || generateCleanInvoiceNumber(invoiceData.issueDate, invoiceData.language);
  const defaultLineItem = {
    id: `li-${Date.now()}`,
    description: invoiceData.notes || (invoiceData.selectedPlanId ? `Subscription Plan Package: ${invoiceData.selectedPlanId}` : 'Manual Invoice'),
    quantity: 1,
    unitPrice: subtotal,
    amount: subtotal,
    periodStart: invoiceData.billingPeriod,
  };

  const newInvoice: Invoice = {
    id: invoiceId,
    invoiceNumber: invoiceId,
    restaurantId: cleanId,
    restaurantName: invoiceData.restaurantName || cleanId,
    restaurantLegalName: invoiceData.restaurantLegalName || invoiceData.restaurantName || cleanId,
    restaurantAddress: invoiceData.restaurantAddress || '123 Restaurant St',
    restaurantCity: invoiceData.restaurantCity || '',
    restaurantCountry: invoiceData.restaurantCountry || 'Portugal',
    restaurantPostalCode: invoiceData.restaurantPostalCode || '',
    restaurantVatNumber: invoiceData.restaurantVatNumber || '',
    customerEmail: invoiceData.customerEmail || 'billing@restaurant.com',
    planId: invoiceData.selectedPlanId || 'professional',
    planName: invoiceData.planName || (invoiceData.selectedPlanId ? invoiceData.selectedPlanId.toUpperCase() : 'Professional'),
    billingPeriod: invoiceData.billingPeriod || `${new Date().toLocaleDateString('pt-PT')} – ${invoiceData.dueDate}`,
    subtotal,
    taxRate,
    taxAmount,
    total,
    currency: invoiceData.currency || 'EUR',
    status: invoiceData.status || 'unpaid',
    language: invoiceData.language || 'pt',
    issueDate: invoiceData.issueDate || new Date().toISOString().split('T')[0],
    dueDate: invoiceData.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    lineItems: invoiceData.lineItems && invoiceData.lineItems.length > 0 ? invoiceData.lineItems : [defaultLineItem],
    notes: invoiceData.notes || 'Created via Billing & Payments',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const existing = localStorage.getItem('dinemaster_invoices_cache');
    const parsed: Invoice[] = existing ? JSON.parse(existing) : [];
    parsed.unshift(newInvoice);
    localStorage.setItem('dinemaster_invoices_cache', JSON.stringify(parsed));
  } catch (e) {
    console.warn('[billingService] Failed to cache new invoice:', e);
  }

  try {
    await setDoc(doc(db, 'invoices', invoiceId), newInvoice);
  } catch (dbErr) {
    console.warn('[billingService] Direct Firestore setDoc failed (saved in cache):', dbErr);
  }

  return newInvoice;
}

