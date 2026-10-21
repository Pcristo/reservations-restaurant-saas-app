export interface PlanCustomFeature {
  id: string;
  title: string;
  description: string;
  enabled?: boolean;
}

export type PackageFeatureKey =
  | 'customDomain'
  | 'whatsapp'
  | 'sms'
  | 'advancedSEO'
  | 'waitlist'
  | 'advancedAnalytics'
  | 'apiAccess'
  | 'smartAlerts';

export type PackageResourceType = 'bookings' | 'staff' | 'tables';

export interface PlanEntitlements {
  // Monthly Bookings Limit Controls
  limitBookingsEnabled?: boolean;
  unlimitedBookings?: boolean;
  maxReservations: number;

  // Staff Accounts Limit Controls
  limitStaffEnabled?: boolean;
  unlimitedStaff?: boolean;
  maxStaffUsers: number;

  // Maximum Dining Tables Limit Controls
  limitTablesEnabled?: boolean;
  unlimitedTables?: boolean;
  maxTables: number;

  // Package Feature Entitlements (ON/OFF)
  customDomain: boolean;
  whatsapp: boolean;
  sms: boolean;
  advancedSEO: boolean;
  waitlist: boolean;
  advancedAnalytics: boolean;
  apiAccess: boolean;
  smartAlerts?: boolean;
  [key: string]: unknown;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual?: number;
  currency: string;
  isPopular?: boolean;
  isActive?: boolean;
  isPublic?: boolean;
  entitlements: PlanEntitlements;
  customFeatures?: PlanCustomFeature[];
  updatedAt?: string;
}
