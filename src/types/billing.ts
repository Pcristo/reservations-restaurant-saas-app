import { Plan } from './plan';

export type SubscriptionStatus = 
  | 'active' 
  | 'trial' 
  | 'payment_due' 
  | 'past_due' 
  | 'suspended' 
  | 'cancelled';

export type BillingFrequency = 'monthly' | 'annual';

export interface RestaurantSubscription {
  id: string;
  restaurantId: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  billingFrequency: BillingFrequency;
  currency: string;
  priceMonthly: number;
  priceAnnual: number;
  currentPrice: number;
  currentPeriodStart: string; // ISO date string
  currentPeriodEnd: string;   // ISO date string
  nextBillingDate: string;    // ISO date string
  nextPaymentAmount: number;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  cancellationReason?: string;
  paymentMethodId?: string;
  trialStartDate?: string;
  trialEndDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'paid' | 'unpaid' | 'pending' | 'overdue' | 'void';

export interface InvoiceLineItem {
  id: string;
  description: string;
  periodStart?: string;
  periodEnd?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. "INV-2026-001"
  restaurantId: string;
  restaurantName: string;
  restaurantLegalName: string;
  restaurantAddress: string;
  restaurantCity?: string;
  restaurantCountry?: string;
  restaurantPostalCode?: string;
  restaurantVatNumber?: string;
  customerEmail: string;
  planId: string;
  planName: string;
  billingPeriod: string; // e.g. "01 Mar 2026 – 31 Mar 2026"
  issueDate: string;     // ISO string
  dueDate: string;       // ISO string
  paidAt?: string;       // ISO string
  subtotal: number;
  taxRate: number;       // e.g. 23 for 23%
  taxAmount: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  paymentMethodDescription?: string; // e.g. "Visa ending in 4242"
  transactionReference?: string;     // e.g. "tx_dmp_1741289123"
  lineItems: InvoiceLineItem[];
  notes?: string;
  language?: 'en' | 'pt';
  paymentInstructions?: {
    bankName: string;
    accountName: string;
    iban: string;
    bic: string;
    reference: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type TransactionStatus = 'succeeded' | 'pending' | 'failed' | 'refunded';

export interface PaymentTransaction {
  id: string;
  restaurantId: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  paymentMethod: string; // e.g. "Visa •••• 4242"
  providerReference: string; // e.g. "tx_pi_3N9rK1..."
  description: string;
  date: string; // ISO date string
  failureReason?: string;
  createdAt: string;
}

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'generic';

export interface SavedPaymentMethod {
  id: string;
  restaurantId: string;
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
  cardholderName: string;
  isDefault: boolean;
  createdAt: string;
}

export interface BillingOverviewSummary {
  currentPlan: Plan;
  subscription: RestaurantSubscription;
  status: SubscriptionStatus;
  nextPayment: {
    date: string;
    amount: number;
    currency: string;
  } | null;
  outstandingBalance: number;
  unpaidInvoicesCount: number;
  lastPayment: {
    date: string;
    amount: number;
    currency: string;
    invoiceNumber: string;
    transactionReference?: string;
    paymentMethod?: string;
  } | null;
  invoices: Invoice[];
  transactions: PaymentTransaction[];
  paymentMethods: SavedPaymentMethod[];
}
