import { 
  BillingOverviewSummary, 
  RestaurantSubscription, 
  Invoice, 
  PaymentTransaction, 
  SavedPaymentMethod,
  BillingFrequency
} from '../types';
import { generateInvoicePdf } from '../features/billing/utils/invoicePdfGenerator';
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
      invoiceNumber: `INV-${now.getFullYear()}-001`,
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

export async function deleteInvoice(invoiceId: string): Promise<void> {
  const res = await fetch(`/api/billing/invoices/${encodeURIComponent(invoiceId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Failed to delete invoice');
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
 * Generates and downloads real PDF invoice with print-ready layout.
 */
export function downloadInvoicePdf(invoice: Invoice) {
  return generateInvoicePdf(invoice, { autoDownload: true });
}

export async function createManualInvoice(invoiceData: {
  restaurantId: string;
  restaurantName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  dueDate: string;
  notes?: string;
  selectedPlanId?: string;
}): Promise<Invoice> {
  const invoiceId = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const subtotal = Number(invoiceData.amount) || 0;
  const taxRate = 23;
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  const newInvoice: Invoice = {
    id: invoiceId,
    invoiceNumber: invoiceId,
    restaurantId: invoiceData.restaurantId,
    restaurantName: invoiceData.restaurantName || invoiceData.restaurantId,
    restaurantLegalName: invoiceData.restaurantName || invoiceData.restaurantId,
    restaurantAddress: '123 Restaurant St',
    customerEmail: invoiceData.customerEmail || 'billing@restaurant.com',
    planId: invoiceData.selectedPlanId || 'professional',
    planName: invoiceData.selectedPlanId ? invoiceData.selectedPlanId.toUpperCase() : 'Professional',
    billingPeriod: `${new Date().toLocaleDateString()} – ${invoiceData.dueDate}`,
    subtotal,
    taxRate,
    taxAmount,
    total,
    currency: invoiceData.currency || 'EUR',
    status: 'unpaid',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: invoiceData.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    lineItems: [
      {
        id: `li-${Date.now()}`,
        description: invoiceData.notes || (invoiceData.selectedPlanId ? `Subscription Plan Package: ${invoiceData.selectedPlanId}` : 'Manual Invoice'),
        quantity: 1,
        unitPrice: subtotal,
        amount: subtotal
      }
    ],
    notes: invoiceData.notes || 'Created via Super Admin Billing',
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

