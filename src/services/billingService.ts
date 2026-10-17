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

/**
 * Generates and downloads real PDF invoice with print-ready layout.
 */
export function downloadInvoicePdf(invoice: Invoice) {
  return generateInvoicePdf(invoice, { autoDownload: true });
}
