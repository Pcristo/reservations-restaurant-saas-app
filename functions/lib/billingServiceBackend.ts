import {
  BillingOverviewSummary,
  RestaurantSubscription,
  Invoice,
  PaymentTransaction,
  SavedPaymentMethod,
} from '../../src/types';
import {
  getFirestoreDocRest,
  queryFirestoreDocsRest,
  saveFirestoreDocRest,
} from './firebaseAdmin';
import { resolveBackendRestaurantEntitlements } from './plans';
import { APP_CONFIG } from './appConfig';

export async function getDocById(
  collectionName: string,
  docId: string,
  env: Record<string, any> = {}
): Promise<any> {
  const data = await getFirestoreDocRest(collectionName, docId, env);
  if (!data) return null;
  return { id: docId, ...data };
}

export async function getDocsByRestaurantId(
  collectionName: string,
  restaurantId: string,
  env: Record<string, any> = {}
): Promise<any[]> {
  const cleanId = (restaurantId || '').toLowerCase().trim();
  if (!cleanId) return [];
  return queryFirestoreDocsRest(collectionName, 'restaurantId', cleanId, env);
}

export async function getRestaurantMeta(
  restaurantId: string,
  env: Record<string, any> = {}
): Promise<{
  name: string;
  legalName: string;
  address: string;
  city: string;
  country: string;
  vatNumber: string;
  email: string;
}> {
  const cleanId = (restaurantId || 'dinemaster-bistro').toLowerCase().trim();
  const rest = await getFirestoreDocRest('restaurants', cleanId, env);
  const settings = await getFirestoreDocRest('settings', cleanId, env);

  const name = rest?.name || settings?.name || 'DineMaster Bistro';
  return {
    name,
    legalName: rest?.legalName || settings?.legalName || `${name} Lda.`,
    address: rest?.address || settings?.address || APP_CONFIG.address,
    city: rest?.city || settings?.city || 'Funchal',
    country: rest?.country || settings?.country || 'Portugal',
    vatNumber: rest?.vatNumber || settings?.vatNumber || 'PT509123456',
    email: rest?.ownerEmail || rest?.email || settings?.email || APP_CONFIG.email,
  };
}

export async function getOrInitializeBilling(
  restaurantId: string,
  env: Record<string, any> = {}
): Promise<BillingOverviewSummary> {
  const cleanId = (restaurantId || 'dinemaster-bistro').toLowerCase().trim();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const { plan: currentPlan, subscription: existingSub } =
    await resolveBackendRestaurantEntitlements(cleanId, env);

  const priceMonthly = currentPlan.priceMonthly;
  const priceAnnual =
    typeof currentPlan.priceAnnual === 'number'
      ? currentPlan.priceAnnual
      : Math.round(priceMonthly * 12 * 0.8);

  const subId = `sub-${cleanId}`;
  let subscription: RestaurantSubscription = existingSub as any;

  const periodStart = new Date(currentYear, currentMonth, 1).toISOString();
  const periodEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();
  const nextBillingDate = new Date(currentYear, currentMonth + 1, 1).toISOString();

  if (!subscription) {
    subscription = {
      id: subId,
      restaurantId: cleanId,
      planId: currentPlan.id,
      planName: currentPlan.name,
      status: 'active',
      billingFrequency: 'monthly',
      currency: currentPlan.currency || 'EUR',
      priceMonthly,
      priceAnnual,
      currentPrice: priceMonthly,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      nextBillingDate,
      nextPaymentAmount: priceMonthly,
      cancelAtPeriodEnd: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await saveFirestoreDocRest('subscriptions', subId, subscription, env);
  } else {
    // Keep plan metadata synchronized with live package config
    const isAnnual = subscription.billingFrequency === 'annual';
    subscription = {
      ...subscription,
      id: subscription.id || subId,
      restaurantId: cleanId,
      planId: currentPlan.id,
      planName: currentPlan.name,
      priceMonthly,
      priceAnnual,
      currentPrice: isAnnual ? priceAnnual : priceMonthly,
      nextPaymentAmount: isAnnual ? priceAnnual : priceMonthly,
    };
  }

  let [invoices, transactions, paymentMethods] = await Promise.all([
    getDocsByRestaurantId('invoices', cleanId, env) as Promise<Invoice[]>,
    getDocsByRestaurantId('transactions', cleanId, env) as Promise<PaymentTransaction[]>,
    getDocsByRestaurantId('payment_methods', cleanId, env) as Promise<SavedPaymentMethod[]>,
  ]);

  if (paymentMethods.length === 0) {
    const defaultPm: SavedPaymentMethod = {
      id: `pm-${cleanId}-default`,
      restaurantId: cleanId,
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2028,
      cardholderName: 'Restaurant Manager',
      isDefault: true,
      createdAt: now.toISOString(),
    };
    await saveFirestoreDocRest('payment_methods', defaultPm.id, defaultPm, env);
    paymentMethods = [defaultPm];
  }

  if (invoices.length === 0 && priceMonthly > 0) {
    const restMeta = await getRestaurantMeta(cleanId, env);
    const subtotal = subscription.currentPrice;
    const taxRate = 23;
    const taxAmount = Math.round(subtotal * 0.23 * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;
    const invId = `inv-${cleanId}-initial`;
    const initialInvoice: Invoice = {
      id: invId,
      invoiceNumber: `INV-${currentYear}-001`,
      restaurantId: cleanId,
      restaurantName: restMeta.name,
      restaurantLegalName: restMeta.legalName,
      restaurantAddress: restMeta.address,
      restaurantCity: restMeta.city,
      restaurantCountry: restMeta.country,
      restaurantVatNumber: restMeta.vatNumber,
      customerEmail: restMeta.email,
      planId: currentPlan.id,
      planName: currentPlan.name,
      billingPeriod: `${new Date(periodStart).toLocaleDateString('en-GB')} – ${new Date(periodEnd).toLocaleDateString('en-GB')}`,
      issueDate: periodStart,
      dueDate: periodEnd,
      paidAt: periodStart,
      subtotal,
      taxRate,
      taxAmount,
      total,
      currency: subscription.currency || 'EUR',
      status: 'paid',
      paymentMethodDescription: 'Visa ending in 4242',
      transactionReference: `tx_dmp_${cleanId}_001`,
      lineItems: [
        {
          id: `line-${cleanId}-1`,
          description: `${APP_CONFIG.appName} ${currentPlan.name} Plan (${subscription.billingFrequency === 'annual' ? 'Annual' : 'Monthly'})`,
          periodStart: new Date(periodStart).toLocaleDateString('en-GB'),
          periodEnd: new Date(periodEnd).toLocaleDateString('en-GB'),
          quantity: 1,
          unitPrice: subtotal,
          amount: subtotal,
        },
      ],
      createdAt: periodStart,
      updatedAt: periodStart,
    };
    await saveFirestoreDocRest('invoices', invId, initialInvoice, env);
    invoices = [initialInvoice];
  }

  invoices.sort((a, b) => (b.issueDate || '').localeCompare(a.issueDate || ''));
  transactions.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const unpaidInvoices = invoices.filter(
    (inv) => inv.status === 'unpaid' || inv.status === 'overdue' || inv.status === 'pending'
  );
  const outstandingBalance = unpaidInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  const paidInvoices = invoices.filter((inv) => inv.status === 'paid');
  const latestPaid = paidInvoices[0] || null;

  return {
    currentPlan,
    subscription,
    status: subscription.status,
    nextPayment: subscription.cancelAtPeriodEnd
      ? null
      : {
          date: subscription.nextBillingDate || subscription.currentPeriodEnd,
          amount: subscription.nextPaymentAmount ?? subscription.currentPrice,
          currency: subscription.currency || 'EUR',
        },
    outstandingBalance: Math.round(outstandingBalance * 100) / 100,
    unpaidInvoicesCount: unpaidInvoices.length,
    lastPayment: latestPaid
      ? {
          date: latestPaid.paidAt || latestPaid.issueDate,
          amount: latestPaid.total,
          currency: latestPaid.currency,
          invoiceNumber: latestPaid.invoiceNumber,
          transactionReference: latestPaid.transactionReference,
          paymentMethod: latestPaid.paymentMethodDescription,
        }
      : null,
    invoices,
    transactions,
    paymentMethods,
  };
}
