import firebaseConfig from '../../firebase-applet-config.json';
import { 
  parseFirestoreFields, 
  encodeFirestoreFields, 
  saveFirestoreDocRest 
} from './firebaseAdmin';
import { 
  RestaurantSubscription, 
  Invoice, 
  PaymentTransaction, 
  SavedPaymentMethod, 
  BillingOverviewSummary,
  Plan
} from '../../src/types';
import { DEFAULT_PLANS } from './plans';
import { APP_CONFIG } from './appConfig';

/**
 * Runs a Firestore structuredQuery to fetch documents in a collection filtered by restaurantId.
 */
export async function getDocsByRestaurantId(
  collectionName: string,
  restaurantId: string,
  env: Record<string, any> = {}
): Promise<any[]> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const databaseId = env.VITE_FIREBASE_DATABASE_ID || env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collectionName }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'restaurantId' },
              op: 'EQUAL',
              value: { stringValue: restaurantId }
            }
          }
        }
      })
    });

    if (!res.ok) {
      return [];
    }

    const rows: any = await res.json().catch(() => []);
    const results: any[] = [];
    if (Array.isArray(rows)) {
      for (const item of rows) {
        if (item.document?.fields) {
          const parsed = parseFirestoreFields(item.document.fields);
          const docId = item.document.name.split('/').pop();
          results.push({ id: docId, ...parsed });
        }
      }
    }
    return results;
  } catch (err) {
    console.warn(`[billingBackend] Error fetching ${collectionName} for ${restaurantId}:`, err);
    return [];
  }
}

/**
 * Fetches a single doc by ID from Firestore REST API.
 */
export async function getDocById(
  collectionName: string,
  docId: string,
  env: Record<string, any> = {}
): Promise<any | null> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const databaseId = env.VITE_FIREBASE_DATABASE_ID || env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${collectionName}/${docId}?key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.fields) {
      return { id: docId, ...parseFirestoreFields(data.fields) };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Retrieves the restaurant metadata or defaults.
 */
export async function getRestaurantMeta(
  restaurantId: string,
  env: Record<string, any> = {}
): Promise<{
  name: string;
  legalName: string;
  address: string;
  city: string;
  country: string;
  email: string;
  planId: string;
  vatNumber: string;
}> {
  const raw = await getDocById('restaurants', restaurantId, env);
  if (raw) {
    return {
      name: raw.name || restaurantId,
      legalName: raw.legalName || raw.name || `${restaurantId} Hospitality`,
      address: raw.address || raw.settings?.address || APP_CONFIG.address,
      city: raw.city || raw.settings?.city || 'Dublin',
      country: raw.country || 'ireland',
      email: raw.email || raw.ownerEmail || APP_CONFIG.email,
      planId: raw.planId || 'business',
      vatNumber: raw.vatNumber || raw.settings?.vatNumber || (raw.country === 'portugal' ? 'PT 519827364' : 'IE 9876543W'),
    };
  }

  // Fallbacks for known defaults
  if (restaurantId === 'bela-italia' || restaurantId === 'bella-italia') {
    return {
      name: 'Bela Itália',
      legalName: 'Bela Itália Ristorante & Pizzeria Lda',
      address: 'Rua Augusta 120, Baixa',
      city: 'Lisboa',
      country: 'portugal',
      email: 'manager@belaitalia.com',
      planId: 'professional',
      vatNumber: 'PT 512398471',
    };
  }

  return {
    name: 'DineMaster Bistro',
    legalName: `${APP_CONFIG.companyName} Hospitality Solutions Ltd`,
    address: APP_CONFIG.address,
    city: 'Dublin',
    country: 'ireland',
    email: APP_CONFIG.email,
    planId: 'business',
    vatNumber: 'IE 3849120H',
  };
}

/**
 * Seeds or retrieves the complete billing state for a tenant restaurant.
 */
export async function getOrInitializeBilling(
  restaurantId: string,
  env: Record<string, any> = {}
): Promise<BillingOverviewSummary> {
  const restMeta = await getRestaurantMeta(restaurantId, env);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // 1. Check existing subscription in Firestore
  let sub = await getDocById('subscriptions', `sub-${restaurantId}`, env);

  if (!sub) {
    // Determine plan
    const matchingPlan = DEFAULT_PLANS.find(p => p.id === restMeta.planId) || DEFAULT_PLANS.find(p => p.id === 'business') || DEFAULT_PLANS[1];
    const priceMonthly = matchingPlan.priceMonthly;
    const priceAnnual = Math.round(priceMonthly * 12 * 0.8);

    const periodStart = new Date(currentYear, currentMonth, 1).toISOString();
    const periodEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();
    const nextBill = new Date(currentYear, currentMonth + 1, 1).toISOString();

    const newSub: RestaurantSubscription = {
      id: `sub-${restaurantId}`,
      restaurantId,
      planId: matchingPlan.id,
      planName: matchingPlan.name,
      status: 'active',
      billingFrequency: 'monthly',
      currency: matchingPlan.currency || 'EUR',
      priceMonthly,
      priceAnnual,
      currentPrice: priceMonthly,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      nextBillingDate: nextBill,
      nextPaymentAmount: priceMonthly,
      cancelAtPeriodEnd: false,
      createdAt: new Date(currentYear, currentMonth - 2, 1).toISOString(),
      updatedAt: now.toISOString(),
    };

    await saveFirestoreDocRest('subscriptions', newSub.id, newSub, env);
    sub = newSub;
  }

  // 2. Fetch or seed Invoices
  let invoices: Invoice[] = await getDocsByRestaurantId('invoices', restaurantId, env);

  if (invoices.length === 0) {
    const plan = DEFAULT_PLANS.find(p => p.id === sub.planId) || DEFAULT_PLANS[1];
    const subtotal = sub.currentPrice || plan.priceMonthly;
    const taxRate = 23;
    const taxAmount = Math.round(subtotal * 0.23 * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    // Create 3 realistic invoices: 2 paid earlier, 1 paid this month or 1 unpaid
    const seedInvoices: Invoice[] = [
      {
        id: `inv-${restaurantId}-001`,
        invoiceNumber: `INV-${currentYear}-001`,
        restaurantId,
        restaurantName: restMeta.name,
        restaurantLegalName: restMeta.legalName,
        restaurantAddress: restMeta.address,
        restaurantCity: restMeta.city,
        restaurantCountry: restMeta.country,
        restaurantVatNumber: restMeta.vatNumber,
        customerEmail: restMeta.email,
        planId: plan.id,
        planName: plan.name,
        billingPeriod: `01 ${getMonthName(currentMonth - 2)} ${currentYear} – ${getLastDay(currentMonth - 2, currentYear)} ${getMonthName(currentMonth - 2)} ${currentYear}`,
        issueDate: new Date(currentYear, currentMonth - 2, 1).toISOString(),
        dueDate: new Date(currentYear, currentMonth - 2, 15).toISOString(),
        paidAt: new Date(currentYear, currentMonth - 2, 1, 10, 30).toISOString(),
        subtotal,
        taxRate,
        taxAmount,
        total,
        currency: plan.currency || 'EUR',
        status: 'paid',
        paymentMethodDescription: 'Visa ending in 4242',
        transactionReference: `tx_dmp_${Date.now() - 5000000}`,
        lineItems: [
          {
            id: 'item-1',
            description: `${APP_CONFIG.appName} ${plan.name} Plan - Monthly Membership`,
            periodStart: `01 ${getMonthName(currentMonth - 2)} ${currentYear}`,
            periodEnd: `${getLastDay(currentMonth - 2, currentYear)} ${getMonthName(currentMonth - 2)} ${currentYear}`,
            quantity: 1,
            unitPrice: subtotal,
            amount: subtotal,
          }
        ],
        createdAt: new Date(currentYear, currentMonth - 2, 1).toISOString(),
        updatedAt: new Date(currentYear, currentMonth - 2, 1).toISOString(),
      },
      {
        id: `inv-${restaurantId}-002`,
        invoiceNumber: `INV-${currentYear}-002`,
        restaurantId,
        restaurantName: restMeta.name,
        restaurantLegalName: restMeta.legalName,
        restaurantAddress: restMeta.address,
        restaurantCity: restMeta.city,
        restaurantCountry: restMeta.country,
        restaurantVatNumber: restMeta.vatNumber,
        customerEmail: restMeta.email,
        planId: plan.id,
        planName: plan.name,
        billingPeriod: `01 ${getMonthName(currentMonth - 1)} ${currentYear} – ${getLastDay(currentMonth - 1, currentYear)} ${getMonthName(currentMonth - 1)} ${currentYear}`,
        issueDate: new Date(currentYear, currentMonth - 1, 1).toISOString(),
        dueDate: new Date(currentYear, currentMonth - 1, 15).toISOString(),
        paidAt: new Date(currentYear, currentMonth - 1, 1, 11, 15).toISOString(),
        subtotal,
        taxRate,
        taxAmount,
        total,
        currency: plan.currency || 'EUR',
        status: 'paid',
        paymentMethodDescription: 'Visa ending in 4242',
        transactionReference: `tx_dmp_${Date.now() - 2500000}`,
        lineItems: [
          {
            id: 'item-1',
            description: `${APP_CONFIG.appName} ${plan.name} Plan - Monthly Membership`,
            periodStart: `01 ${getMonthName(currentMonth - 1)} ${currentYear}`,
            periodEnd: `${getLastDay(currentMonth - 1, currentYear)} ${getMonthName(currentMonth - 1)} ${currentYear}`,
            quantity: 1,
            unitPrice: subtotal,
            amount: subtotal,
          }
        ],
        createdAt: new Date(currentYear, currentMonth - 1, 1).toISOString(),
        updatedAt: new Date(currentYear, currentMonth - 1, 1).toISOString(),
      },
      {
        id: `inv-${restaurantId}-003`,
        invoiceNumber: `INV-${currentYear}-003`,
        restaurantId,
        restaurantName: restMeta.name,
        restaurantLegalName: restMeta.legalName,
        restaurantAddress: restMeta.address,
        restaurantCity: restMeta.city,
        restaurantCountry: restMeta.country,
        restaurantVatNumber: restMeta.vatNumber,
        customerEmail: restMeta.email,
        planId: plan.id,
        planName: plan.name,
        billingPeriod: `01 ${getMonthName(currentMonth)} ${currentYear} – ${getLastDay(currentMonth, currentYear)} ${getMonthName(currentMonth)} ${currentYear}`,
        issueDate: new Date(currentYear, currentMonth, 1).toISOString(),
        dueDate: new Date(currentYear, currentMonth, 15).toISOString(),
        paidAt: new Date(currentYear, currentMonth, 1, 9, 45).toISOString(),
        subtotal,
        taxRate,
        taxAmount,
        total,
        currency: plan.currency || 'EUR',
        status: 'paid',
        paymentMethodDescription: 'Visa ending in 4242',
        transactionReference: `tx_dmp_${Date.now() - 100000}`,
        lineItems: [
          {
            id: 'item-1',
            description: `${APP_CONFIG.appName} ${plan.name} Plan - Monthly Membership`,
            periodStart: `01 ${getMonthName(currentMonth)} ${currentYear}`,
            periodEnd: `${getLastDay(currentMonth, currentYear)} ${getMonthName(currentMonth)} ${currentYear}`,
            quantity: 1,
            unitPrice: subtotal,
            amount: subtotal,
          }
        ],
        createdAt: new Date(currentYear, currentMonth, 1).toISOString(),
        updatedAt: new Date(currentYear, currentMonth, 1).toISOString(),
      }
    ];

    for (const inv of seedInvoices) {
      await saveFirestoreDocRest('invoices', inv.id, inv, env);
    }
    invoices = seedInvoices;
  }

  // 3. Fetch or seed Saved Payment Methods
  let paymentMethods: SavedPaymentMethod[] = await getDocsByRestaurantId('payment_methods', restaurantId, env);
  if (paymentMethods.length === 0) {
    const defaultPm: SavedPaymentMethod = {
      id: `pm-${restaurantId}-01`,
      restaurantId,
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2028,
      cardholderName: restMeta.legalName || 'Finance Manager',
      isDefault: true,
      createdAt: new Date(currentYear, currentMonth - 2, 1).toISOString(),
    };
    await saveFirestoreDocRest('payment_methods', defaultPm.id, defaultPm, env);
    paymentMethods = [defaultPm];
  }

  // 4. Fetch or seed Transactions
  let transactions: PaymentTransaction[] = await getDocsByRestaurantId('transactions', restaurantId, env);
  if (transactions.length === 0) {
    const seedTransactions: PaymentTransaction[] = invoices
      .filter(i => i.status === 'paid')
      .map((inv, idx) => ({
        id: `tx-${inv.id}`,
        restaurantId,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.total,
        currency: inv.currency,
        status: 'succeeded' as const,
        paymentMethod: inv.paymentMethodDescription || 'Visa •••• 4242',
        providerReference: inv.transactionReference || `tx_dmp_ref_${idx}`,
        description: `Payment for ${inv.invoiceNumber} (${inv.planName})`,
        date: inv.paidAt || inv.issueDate,
        createdAt: inv.paidAt || inv.issueDate,
      }));

    for (const tx of seedTransactions) {
      await saveFirestoreDocRest('transactions', tx.id, tx, env);
    }
    transactions = seedTransactions;
  }

  // Sort invoices & transactions by date descending
  invoices.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 5. Calculate Overview Metrics
  const currentPlan = DEFAULT_PLANS.find(p => p.id === sub.planId) || DEFAULT_PLANS[1];

  const unpaidInvoices = invoices.filter(i => i.status === 'unpaid' || i.status === 'overdue' || i.status === 'pending');
  const outstandingBalance = unpaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

  const lastSuccessfulTx = transactions.find(t => t.status === 'succeeded');
  const lastPaidInvoice = invoices.find(i => i.status === 'paid');

  let lastPayment = null;
  if (lastSuccessfulTx) {
    lastPayment = {
      date: lastSuccessfulTx.date,
      amount: lastSuccessfulTx.amount,
      currency: lastSuccessfulTx.currency,
      invoiceNumber: lastSuccessfulTx.invoiceNumber,
      transactionReference: lastSuccessfulTx.providerReference,
      paymentMethod: lastSuccessfulTx.paymentMethod,
    };
  } else if (lastPaidInvoice) {
    lastPayment = {
      date: lastPaidInvoice.paidAt || lastPaidInvoice.issueDate,
      amount: lastPaidInvoice.total,
      currency: lastPaidInvoice.currency,
      invoiceNumber: lastPaidInvoice.invoiceNumber,
      transactionReference: lastPaidInvoice.transactionReference,
      paymentMethod: lastPaidInvoice.paymentMethodDescription,
    };
  }

  let nextPayment = null;
  if (sub.status !== 'cancelled' && sub.nextBillingDate) {
    nextPayment = {
      date: sub.nextBillingDate,
      amount: sub.nextPaymentAmount || sub.currentPrice,
      currency: sub.currency,
    };
  }

  return {
    currentPlan,
    subscription: sub,
    status: sub.status,
    nextPayment,
    outstandingBalance: Math.round(outstandingBalance * 100) / 100,
    unpaidInvoicesCount: unpaidInvoices.length,
    lastPayment,
    invoices,
    transactions,
    paymentMethods,
  };
}

function getMonthName(monthIdx: number): string {
  const normalized = ((monthIdx % 12) + 12) % 12;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[normalized];
}

function getLastDay(monthIdx: number, year: number): number {
  const d = new Date(year, monthIdx + 1, 0);
  return d.getDate();
}
