import {
  Plan,
  PlanEntitlements,
  PackageFeatureKey,
  PackageResourceType,
  Reservation,
  RestaurantSubscription,
  User,
  Restaurant,
} from '../types';
import {
  DEFAULT_PLANS,
  UNLIMITED_BOOKINGS_SENTINEL,
  UNLIMITED_STAFF_SENTINEL,
  UNLIMITED_TABLES_SENTINEL,
} from '../data/plans';
import { doesUserBelongToRestaurant, isUserSuperAdmin } from '../lib/permissions';

/**
 * Reservation statuses that count towards a restaurant's monthly booking allowance.
 * Cancelled, rejected, waiting-list, and soft-deleted reservations do NOT consume quota.
 */
export const QUALIFYING_BOOKING_STATUSES = [
  'pending',
  'booked',
  'confirmed',
  'seated',
  'arrived',
  'completed',
] as const;

export const NON_QUALIFYING_BOOKING_STATUSES = [
  'cancelled',
  'rejected',
  'waiting-list',
  'history',
] as const;

/**
 * Roles that count towards a restaurant's Staff Accounts limit.
 * Policy: Active restaurant administrators (owner, manager, admin) and active restaurant staff
 * count towards the restaurant's staff account limit. Platform Super Admins and Customers never count.
 */
export const RESTAURANT_STAFF_QUOTA_ROLES = [
  'staff',
  'restaurant_staff',
  'admin',
  'restaurant_owner',
  'restaurant_manager',
] as const;

export interface EffectiveResourceLimit {
  resource: PackageResourceType;
  enabled: boolean;
  unlimited: boolean;
  limit: number | null;
  rawConfiguredValue: number;
}

export interface MonthlyBookingUsageSummary {
  used: number;
  limit: number | null;
  remaining: number | null;
  unlimited: boolean;
  limitEnabled: boolean;
  isAtLimit: boolean;
  isOverLimit: boolean;
  percentUsed: number;
  periodStart: string;
  periodEnd: string;
}

export interface ResourceCreationCheckResult {
  resource: PackageResourceType;
  allowed: boolean;
  currentUsage: number;
  limit: number | null;
  remaining: number | null;
  unlimited: boolean;
  limitEnabled: boolean;
  isOverLimitOnDowngrade: boolean;
  reason?: string;
  reasonPt?: string;
}

export const PACKAGE_FEATURE_METADATA: Record<
  PackageFeatureKey,
  {
    key: PackageFeatureKey;
    label: string;
    labelPt: string;
    description: string;
    descriptionPt: string;
  }
> = {
  customDomain: {
    key: 'customDomain',
    label: 'Custom Subdomain/Domain',
    labelPt: 'Domínio / Subdomínio Personalizado',
    description: 'Connect a custom domain or branded subdomain with automated SSL.',
    descriptionPt: 'Conecte um domínio próprio ou subdomínio personalizado com SSL automático.',
  },
  whatsapp: {
    key: 'whatsapp',
    label: 'WhatsApp Action',
    labelPt: 'Ações WhatsApp',
    description: 'Direct one-click WhatsApp guest messaging from reservations and floor plan.',
    descriptionPt: 'Mensagens diretas por WhatsApp com um clique na lista e planta de sala.',
  },
  sms: {
    key: 'sms',
    label: 'SMS Reminders',
    labelPt: 'Lembretes SMS',
    description: 'SMS phone verification and automated booking reminders via Twilio.',
    descriptionPt: 'Verificação telefónica por SMS e lembretes automáticos de reserva.',
  },
  advancedSEO: {
    key: 'advancedSEO',
    label: 'Advanced SEO',
    labelPt: 'SEO Avançado',
    description: 'Custom meta titles, OpenGraph social cards, and Schema.org JSON-LD structured data.',
    descriptionPt: 'Meta títulos personalizados, cartões OpenGraph e dados estruturados Schema.org.',
  },
  waitlist: {
    key: 'waitlist',
    label: 'Waitlist Management',
    labelPt: 'Gestão de Lista de Espera',
    description: 'Digital walk-in & full-session waitlist queue for guests and hosts.',
    descriptionPt: 'Fila de lista de espera digital quando os turnos estão lotados.',
  },
  advancedAnalytics: {
    key: 'advancedAnalytics',
    label: 'Advanced Analytics',
    labelPt: 'Análises Avançadas',
    description: 'Shift performance, covers per hour, and guest retention insights.',
    descriptionPt: 'Desempenho por turno, lugares ocupados e estatísticas de retenção.',
  },
  apiAccess: {
    key: 'apiAccess',
    label: 'REST API & Webhooks Access',
    labelPt: 'Acesso API REST & Webhooks',
    description: 'External POS integration and webhook event synchronization.',
    descriptionPt: 'Integração com POS externo e sincronização por webhooks.',
  },
  smartAlerts: {
    key: 'smartAlerts',
    label: 'Smart Alerts',
    labelPt: 'Alertas Inteligentes',
    description: 'Real-time operational alerts for pending bookings, capacity warnings, and table thresholds.',
    descriptionPt: 'Alertas operacionais em tempo real para reservas pendentes, avisos de capacidade e limites de mesas.',
  },
};

export const CORE_PRICING_FEATURES: PackageFeatureKey[] = [
  'customDomain',
  'whatsapp',
  'sms',
  'advancedSEO',
  'waitlist',
];

/**
 * Validates whether a numeric limit is a valid non-negative integer.
 */
export function isValidNonNegativeInteger(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val) && Number.isInteger(val) && val >= 0;
}

/**
 * Normalizes raw PlanEntitlements from Firestore or user input,
 * preserving 0 explicitly and inferring unlimited flags from legacy sentinel numbers.
 */
export function normalizePlanEntitlements(
  raw?: Partial<PlanEntitlements> | null,
  fallback?: PlanEntitlements
): PlanEntitlements {
  const base = fallback || DEFAULT_PLANS[1].entitlements;

  const rawMaxRes =
    typeof raw?.maxReservations === 'number' && !Number.isNaN(raw.maxReservations)
      ? Math.max(0, Math.floor(raw.maxReservations))
      : base.maxReservations;

  const rawMaxStaff =
    typeof raw?.maxStaffUsers === 'number' && !Number.isNaN(raw.maxStaffUsers)
      ? Math.max(0, Math.floor(raw.maxStaffUsers))
      : base.maxStaffUsers;

  const rawMaxTables =
    typeof raw?.maxTables === 'number' && !Number.isNaN(raw.maxTables)
      ? Math.max(0, Math.floor(raw.maxTables))
      : base.maxTables;

  const limitBookingsEnabled =
    typeof raw?.limitBookingsEnabled === 'boolean'
      ? raw.limitBookingsEnabled
      : (base.limitBookingsEnabled ?? true);

  const unlimitedBookings =
    typeof raw?.unlimitedBookings === 'boolean'
      ? raw.unlimitedBookings
      : rawMaxRes >= 99999;

  const limitStaffEnabled =
    typeof raw?.limitStaffEnabled === 'boolean'
      ? raw.limitStaffEnabled
      : (base.limitStaffEnabled ?? true);

  const unlimitedStaff =
    typeof raw?.unlimitedStaff === 'boolean'
      ? raw.unlimitedStaff
      : rawMaxStaff >= 900;

  const limitTablesEnabled =
    typeof raw?.limitTablesEnabled === 'boolean'
      ? raw.limitTablesEnabled
      : (base.limitTablesEnabled ?? true);

  const unlimitedTables =
    typeof raw?.unlimitedTables === 'boolean'
      ? raw.unlimitedTables
      : rawMaxTables >= 900;

  return {
    ...(raw || {}),
    limitBookingsEnabled,
    unlimitedBookings,
    maxReservations: unlimitedBookings ? UNLIMITED_BOOKINGS_SENTINEL : rawMaxRes,
    limitStaffEnabled,
    unlimitedStaff,
    maxStaffUsers: unlimitedStaff ? UNLIMITED_STAFF_SENTINEL : rawMaxStaff,
    limitTablesEnabled,
    unlimitedTables,
    maxTables: unlimitedTables ? UNLIMITED_TABLES_SENTINEL : rawMaxTables,
    customDomain: typeof raw?.customDomain === 'boolean' ? raw.customDomain : Boolean(base.customDomain),
    whatsapp: typeof raw?.whatsapp === 'boolean' ? raw.whatsapp : Boolean(base.whatsapp),
    sms: typeof raw?.sms === 'boolean' ? raw.sms : Boolean(base.sms),
    advancedSEO: typeof raw?.advancedSEO === 'boolean' ? raw.advancedSEO : Boolean(base.advancedSEO),
    waitlist: typeof raw?.waitlist === 'boolean' ? raw.waitlist : Boolean(base.waitlist),
    advancedAnalytics:
      typeof raw?.advancedAnalytics === 'boolean' ? raw.advancedAnalytics : Boolean(base.advancedAnalytics),
    apiAccess: typeof raw?.apiAccess === 'boolean' ? raw.apiAccess : Boolean(base.apiAccess),
    smartAlerts: typeof raw?.smartAlerts === 'boolean' ? raw.smartAlerts : Boolean(base.smartAlerts ?? true),
  };
}

/**
 * Normalizes a full Plan object from Firestore or defaults.
 */
export function normalizePlan(raw: Partial<Plan>, docId?: string): Plan {
  const id = (docId || raw.id || '').trim().toLowerCase();
  const matchedDefault = DEFAULT_PLANS.find((p) => p.id === id);
  const priceMonthly =
    typeof raw.priceMonthly === 'number' && !Number.isNaN(raw.priceMonthly)
      ? Math.max(0, raw.priceMonthly)
      : (matchedDefault?.priceMonthly ?? 0);

  const priceAnnual =
    typeof raw.priceAnnual === 'number' && !Number.isNaN(raw.priceAnnual)
      ? Math.max(0, raw.priceAnnual)
      : Math.round(priceMonthly * 12 * 0.8);

  return {
    id: id || 'custom-plan',
    name: (raw.name ?? matchedDefault?.name ?? id) || 'Subscription Plan',
    description: raw.description ?? matchedDefault?.description ?? '',
    priceMonthly,
    priceAnnual,
    currency: raw.currency || matchedDefault?.currency || 'EUR',
    isPopular: Boolean(raw.isPopular ?? matchedDefault?.isPopular),
    isActive: raw.isActive !== false,
    isPublic: raw.isPublic !== false,
    entitlements: normalizePlanEntitlements(raw.entitlements, matchedDefault?.entitlements),
    customFeatures: Array.isArray(raw.customFeatures)
      ? raw.customFeatures.map((f) => ({
          id: f.id || `feat-${Math.random().toString(36).substring(2, 7)}`,
          title: (f.title || '').trim(),
          description: (f.description || '').trim(),
          enabled: f.enabled !== false,
        }))
      : [],
    updatedAt: raw.updatedAt,
  };
}

/**
 * Validates a Plan configuration prior to saving.
 * Explicitly verifies non-negative integer limits and handles 0.
 */
export function validatePlanConfiguration(plan: Partial<Plan>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const cleanId = (plan.id || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  if (!cleanId) {
    errors.push('Package ID / slug is required.');
  }
  if (!plan.name || !plan.name.trim()) {
    errors.push('Package name is required.');
  }
  if (typeof plan.priceMonthly !== 'number' || Number.isNaN(plan.priceMonthly) || plan.priceMonthly < 0) {
    errors.push('Monthly price must be a valid non-negative number.');
  }
  if (
    plan.priceAnnual !== undefined &&
    (typeof plan.priceAnnual !== 'number' || Number.isNaN(plan.priceAnnual) || plan.priceAnnual < 0)
  ) {
    errors.push('Annual price must be a valid non-negative number.');
  }

  const ent = plan.entitlements;
  if (!ent) {
    errors.push('Package entitlements configuration is required.');
  } else {
    // 1. Monthly Bookings validation
    if (ent.limitBookingsEnabled !== false && !ent.unlimitedBookings) {
      if (!isValidNonNegativeInteger(ent.maxReservations)) {
        errors.push('Monthly bookings limit must be a valid non-negative integer (0 or greater).');
      }
    }
    // 2. Staff Accounts validation
    if (ent.limitStaffEnabled !== false && !ent.unlimitedStaff) {
      if (!isValidNonNegativeInteger(ent.maxStaffUsers)) {
        errors.push('Staff accounts limit must be a valid non-negative integer (0 or greater).');
      }
    }
    // 3. Dining Tables validation
    if (ent.limitTablesEnabled !== false && !ent.unlimitedTables) {
      if (!isValidNonNegativeInteger(ent.maxTables)) {
        errors.push('Maximum dining tables limit must be a valid non-negative integer (0 or greater).');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Resolves the effective resource limit for 'bookings', 'staff', or 'tables'.
 * - If limit is disabled (OFF), returns { enabled: false, unlimited: true, limit: null }.
 * - If unlimited is selected, returns { enabled: true, unlimited: true, limit: null }.
 * - If limit is enabled and numeric, returns { enabled: true, unlimited: false, limit: exactInteger } (including 0).
 */
export function getEffectiveResourceLimit(
  entitlements: PlanEntitlements | null | undefined,
  resource: PackageResourceType
): EffectiveResourceLimit {
  const norm = normalizePlanEntitlements(entitlements);

  if (resource === 'bookings') {
    const enabled = norm.limitBookingsEnabled !== false;
    const unlimited = Boolean(norm.unlimitedBookings) || norm.maxReservations >= 99999;
    return {
      resource: 'bookings',
      enabled,
      unlimited: !enabled || unlimited,
      limit: !enabled || unlimited ? null : norm.maxReservations,
      rawConfiguredValue: norm.maxReservations,
    };
  }

  if (resource === 'staff') {
    const enabled = norm.limitStaffEnabled !== false;
    const unlimited = Boolean(norm.unlimitedStaff) || norm.maxStaffUsers >= 900;
    return {
      resource: 'staff',
      enabled,
      unlimited: !enabled || unlimited,
      limit: !enabled || unlimited ? null : norm.maxStaffUsers,
      rawConfiguredValue: norm.maxStaffUsers,
    };
  }

  // resource === 'tables'
  const enabled = norm.limitTablesEnabled !== false;
  const unlimited = Boolean(norm.unlimitedTables) || norm.maxTables >= 900;
  return {
    resource: 'tables',
    enabled,
    unlimited: !enabled || unlimited,
    limit: !enabled || unlimited ? null : norm.maxTables,
    rawConfiguredValue: norm.maxTables,
  };
}

/**
 * Formats a resource limit for consistent display across Super Admin, Public Pricing, and Restaurant Admin.
 */
export function formatResourceAllowance(
  entitlements: PlanEntitlements | null | undefined,
  resource: PackageResourceType,
  language: 'en' | 'pt' = 'en'
): string {
  const resolved = getEffectiveResourceLimit(entitlements, resource);
  if (!resolved.enabled) {
    return language === 'pt' ? 'Ilimitado (Sem limite)' : 'Unlimited (No limit)';
  }
  if (resolved.unlimited || resolved.limit === null) {
    return language === 'pt' ? 'Ilimitado' : 'Unlimited';
  }
  return resolved.limit.toLocaleString(language === 'pt' ? 'pt-PT' : 'en-US');
}

/**
 * Returns localized Plan Name (en or pt-PT).
 */
export function getLocalizedPlanName(
  plan: Plan | { id?: string; name?: string } | null | undefined,
  language: 'en' | 'pt' = 'en'
): string {
  if (!plan) return '';
  const lowerId = (plan.id || '').toLowerCase();
  const lowerName = (plan.name || '').toLowerCase();
  if (language === 'pt') {
    if (lowerId === 'trial' || lowerName.includes('trial') || lowerName.includes('experimental')) return 'Experimental Gratuito';
    if (lowerId === 'starter' || lowerName.includes('starter') || lowerName.includes('iniciante')) return 'Iniciante';
    if (lowerId === 'professional' || lowerName.includes('professional') || lowerName.includes('profissional')) return 'Profissional';
    if (lowerId === 'business' || lowerName.includes('business') || lowerName.includes('empresarial')) return 'Empresarial';
    if (lowerId === 'enterprise' || lowerName.includes('enterprise')) return 'Enterprise';
    return plan.name || '';
  }
  // English (default)
  if (lowerId === 'trial' || lowerName.includes('trial') || lowerName.includes('experimental')) return 'Free Trial';
  if (lowerId === 'starter' || lowerName.includes('starter') || lowerName.includes('iniciante')) return 'Starter';
  if (lowerId === 'professional' || lowerName.includes('professional') || lowerName.includes('profissional')) return 'Professional';
  if (lowerId === 'business' || lowerName.includes('business') || lowerName.includes('empresarial')) return 'Business';
  if (lowerId === 'enterprise' || lowerName.includes('enterprise')) return 'Enterprise';
  return plan.name || '';
}

/**
 * Returns localized Plan Description (en or pt-PT).
 */
export function getLocalizedPlanDescription(
  plan: Plan | { id?: string; description?: string } | null | undefined,
  language: 'en' | 'pt' = 'en'
): string {
  if (!plan) return '';
  const lowerId = (plan.id || '').toLowerCase();
  if (language === 'pt') {
    if (lowerId === 'trial') {
      return 'Período de teste de 14 dias com gestão essencial de mesas e reservas online.';
    }
    if (lowerId === 'starter') {
      return 'Ideal para pequenos bistrôs e restaurantes que iniciam com reservas online e gestão essencial de mesas.';
    }
    if (lowerId === 'professional') {
      return 'Perfeito para restaurantes e bistrôs independentes consolidados com gestão completa de reservas e mesas.';
    }
    if (lowerId === 'business') {
      return 'Salas de refeição com grande volume que exigem plantas avançadas, alertas em tempo real e operações prioritárias.';
    }
    if (lowerId === 'enterprise') {
      return 'Para grupos hoteleiros, múltiplos espaços e soluções personalizadas com suporte dedicado 24/7.';
    }
  } else {
    if (lowerId === 'trial') {
      return '14-day trial with core table management and online reservation tools.';
    }
    if (lowerId === 'starter') {
      return 'Ideal for small bistros and restaurants starting with online reservations and core table management.';
    }
    if (lowerId === 'professional') {
      return 'Perfect for established independent restaurants and bistros with complete reservation and table tools.';
    }
    if (lowerId === 'business') {
      return 'High-volume dining rooms requiring extensive floor plans, real-time alerts and priority operations.';
    }
    if (lowerId === 'enterprise') {
      return 'For multi-location groups, hotel dining, and custom white-label deployments with 24/7 priority support.';
    }
  }
  return plan.description || '';
}

/**
 * Returns localized Custom Feature Title (en or pt-PT).
 */
export function getLocalizedCustomFeatureTitle(
  title: string | null | undefined,
  language: 'en' | 'pt' = 'en'
): string {
  if (!title) return '';
  const clean = title.trim();
  const lower = clean.toLowerCase();
  if (language === 'pt') {
    if (lower === '24/7 priority support' || lower === 'priority support') return 'Suporte Prioritário 24/7';
    if (lower === 'dedicated account manager') return 'Gestor de Conta Dedicado';
    if (lower === 'multi-location management') return 'Gestão Multi-Restaurante';
    if (lower === 'white-label branding') return 'Marca Própria (White-Label)';
    if (lower === 'custom integrations') return 'Integrações Personalizadas';
    return clean;
  }
  if (lower === 'suporte prioritário 24/7' || lower === 'suporte prioritario 24/7') return '24/7 Priority Support';
  if (lower === 'gestor de conta dedicado') return 'Dedicated Account Manager';
  if (lower === 'gestão multi-restaurante' || lower === 'gestao multi-restaurante') return 'Multi-Location Management';
  if (lower === 'marca própria (white-label)' || lower === 'marca propria (white-label)') return 'White-Label Branding';
  if (lower === 'integrações personalizadas' || lower === 'integracoes personalizadas') return 'Custom Integrations';
  return clean;
}

/**
 * Checks whether a package feature is enabled in the given entitlements.
 */
export function isPackageFeatureEnabled(
  entitlements: PlanEntitlements | null | undefined,
  feature: PackageFeatureKey
): boolean {
  if (!entitlements) return false;
  const norm = normalizePlanEntitlements(entitlements);
  return Boolean(norm[feature]);
}

/**
 * Resolves a restaurant's effective Plan and merged PlanEntitlements
 * (supporting optional customEntitlements per restaurant).
 */
export function resolveEffectivePlanAndEntitlements(params: {
  planId?: string | null;
  plans?: Plan[];
  subscription?: Partial<RestaurantSubscription> | null;
  restaurant?: Partial<Restaurant> | null;
}): { plan: Plan; entitlements: PlanEntitlements } {
  const availablePlans = params.plans && params.plans.length > 0 ? params.plans : DEFAULT_PLANS;
  const targetPlanId = (
    params.subscription?.planId ||
    params.restaurant?.planId ||
    params.planId ||
    'professional'
  )
    .trim()
    .toLowerCase();

  const matchedPlan =
    availablePlans.find((p) => p.id.toLowerCase() === targetPlanId) ||
    DEFAULT_PLANS.find((p) => p.id.toLowerCase() === targetPlanId) ||
    availablePlans.find((p) => p.id === 'professional') ||
    availablePlans[0] ||
    DEFAULT_PLANS[1];

  const baseNormalizedPlan = normalizePlan(matchedPlan, matchedPlan.id);

  const customOverrides = params.restaurant?.customEntitlements;
  const effectiveEntitlements = customOverrides
    ? normalizePlanEntitlements(
        { ...baseNormalizedPlan.entitlements, ...customOverrides },
        baseNormalizedPlan.entitlements
      )
    : baseNormalizedPlan.entitlements;

  return {
    plan: {
      ...baseNormalizedPlan,
      entitlements: effectiveEntitlements,
    },
    entitlements: effectiveEntitlements,
  };
}

/**
 * Determines whether a reservation counts towards the monthly booking quota.
 * Qualifying statuses: 'pending', 'booked', 'confirmed', 'seated', 'arrived', 'completed'.
 * Non-qualifying: 'cancelled', 'rejected', 'waiting-list', 'history', or soft-deleted (isDeleted / isHistory).
 */
export function doesReservationCountTowardsQuota(res?: Partial<Reservation> | null): boolean {
  if (!res) return false;
  if (res.isDeleted || res.isHistory) return false;
  const status = (res.status || 'booked').toLowerCase().trim();
  if ((NON_QUALIFYING_BOOKING_STATUSES as readonly string[]).includes(status)) {
    return false;
  }
  return (QUALIFYING_BOOKING_STATUSES as readonly string[]).includes(status);
}

/**
 * Determines whether a user account counts towards a restaurant's Staff Accounts limit.
 * - Counts active restaurant staff and restaurant administrators belonging to the restaurant.
 * - Excludes Super Admin accounts, customer accounts, and inactive/suspended accounts.
 */
export function doesUserCountTowardsStaffQuota(
  user?: Partial<User> | null,
  targetRestaurantId?: string | null,
  tenantObj?: { id?: string; slug?: string } | null
): boolean {
  if (!user) return false;
  if (user.status === 'inactive' || user.status === 'suspended') return false;
  const role = (user.role || '').toLowerCase().trim();
  if (!role || role === 'customer' || role === 'super_admin' || role === 'superadmin') {
    return false;
  }
  if (isUserSuperAdmin(user as User)) {
    return false;
  }
  if (!(RESTAURANT_STAFF_QUOTA_ROLES as readonly string[]).includes(role)) {
    return false;
  }
  if (targetRestaurantId) {
    return doesUserBelongToRestaurant(user as User, targetRestaurantId, tenantObj);
  }
  return Boolean(user.restaurantId || (user.restaurantIds && user.restaurantIds.length > 0));
}

/**
 * Computes the current monthly billing period window for usage calculation.
 * If the subscription has valid currentPeriodStart / currentPeriodEnd, uses the subscription's
 * monthly cycle window; otherwise defaults to the current calendar month.
 */
export function getSubscriptionBillingPeriod(
  subscription?: Partial<RestaurantSubscription> | null,
  referenceDate: Date = new Date()
): {
  periodStart: Date;
  periodEnd: Date;
  startDateStr: string;
  endDateStr: string;
} {
  const toYmd = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  if (subscription?.currentPeriodStart && subscription?.currentPeriodEnd) {
    const start = new Date(subscription.currentPeriodStart);
    const end = new Date(subscription.currentPeriodEnd);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start) {
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      // If monthly billing period (<= 35 days) and referenceDate falls within or near it
      if (diffDays <= 35 && referenceDate >= start && referenceDate <= end) {
        return {
          periodStart: start,
          periodEnd: end,
          startDateStr: toYmd(start),
          endDateStr: toYmd(end),
        };
      }
      // For annual subscriptions, anchor the monthly booking quota window to the subscription's billing day-of-month
      const anchorDay = Math.min(28, Math.max(1, start.getDate()));
      if (anchorDay > 1) {
        const refYear = referenceDate.getFullYear();
        const refMonth = referenceDate.getMonth();
        let cycleStart: Date;
        let cycleEnd: Date;
        if (referenceDate.getDate() >= anchorDay) {
          cycleStart = new Date(refYear, refMonth, anchorDay, 0, 0, 0);
          cycleEnd = new Date(refYear, refMonth + 1, anchorDay - 1, 23, 59, 59);
        } else {
          cycleStart = new Date(refYear, refMonth - 1, anchorDay, 0, 0, 0);
          cycleEnd = new Date(refYear, refMonth, anchorDay - 1, 23, 59, 59);
        }
        return {
          periodStart: cycleStart,
          periodEnd: cycleEnd,
          startDateStr: toYmd(cycleStart),
          endDateStr: toYmd(cycleEnd),
        };
      }
    }
  }

  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const firstDay = new Date(year, month, 1, 0, 0, 0);
  const lastDay = new Date(year, month + 1, 0, 23, 59, 59);

  return {
    periodStart: firstDay,
    periodEnd: lastDay,
    startDateStr: toYmd(firstDay),
    endDateStr: toYmd(lastDay),
  };
}

/**
 * Calculates the restaurant's monthly booking usage and remaining allowance
 * within the current subscription billing period.
 */
export function calculateMonthlyBookingUsage(
  reservations: Partial<Reservation>[],
  entitlements: PlanEntitlements | null | undefined,
  subscription?: Partial<RestaurantSubscription> | null,
  referenceDate: Date = new Date()
): MonthlyBookingUsageSummary {
  const { startDateStr, endDateStr } = getSubscriptionBillingPeriod(subscription, referenceDate);
  const limitInfo = getEffectiveResourceLimit(entitlements, 'bookings');

  const qualifying = (reservations || []).filter((res) => {
    if (!doesReservationCountTowardsQuota(res)) return false;
    const resDate = (res.date || '').substring(0, 10);
    if (resDate) {
      return resDate >= startDateStr && resDate <= endDateStr;
    }
    if (res.createdAt) {
      const createdDate = res.createdAt.substring(0, 10);
      return createdDate >= startDateStr && createdDate <= endDateStr;
    }
    return false;
  });

  const used = qualifying.length;
  const limit = limitInfo.limit;
  const unlimited = limitInfo.unlimited;
  const limitEnabled = limitInfo.enabled;

  const remaining = unlimited || limit === null ? null : Math.max(0, limit - used);
  const isAtLimit = !unlimited && limit !== null && used >= limit;
  const isOverLimit = !unlimited && limit !== null && used > limit;
  const percentUsed =
    unlimited || limit === null
      ? 0
      : limit === 0
      ? used > 0
        ? 100
        : 0
      : Math.min(100, Math.round((used / limit) * 100));

  return {
    used,
    limit,
    remaining,
    unlimited,
    limitEnabled,
    isAtLimit,
    isOverLimit,
    percentUsed,
    periodStart: startDateStr,
    periodEnd: endDateStr,
  };
}

/**
 * Checks whether a new resource ('bookings', 'staff', or 'tables') can be created
 * without exceeding the restaurant's effective package limit.
 */
export function checkCanCreateResource(
  entitlements: PlanEntitlements | null | undefined,
  resource: PackageResourceType,
  currentActiveCount: number
): ResourceCreationCheckResult {
  const limitInfo = getEffectiveResourceLimit(entitlements, resource);
  const usage = Math.max(0, Math.floor(currentActiveCount));

  if (!limitInfo.enabled || limitInfo.unlimited || limitInfo.limit === null) {
    return {
      resource,
      allowed: true,
      currentUsage: usage,
      limit: null,
      remaining: null,
      unlimited: true,
      limitEnabled: limitInfo.enabled,
      isOverLimitOnDowngrade: false,
    };
  }

  const limit = limitInfo.limit;
  const allowed = usage < limit;
  const remaining = Math.max(0, limit - usage);
  const isOverLimitOnDowngrade = usage > limit;

  const resourceLabels: Record<PackageResourceType, { en: string; pt: string }> = {
    bookings: { en: 'monthly bookings', pt: 'reservas mensais' },
    staff: { en: 'staff accounts', pt: 'contas de staff' },
    tables: { en: 'dining tables', pt: 'mesas de refeição' },
  };

  const label = resourceLabels[resource];

  return {
    resource,
    allowed,
    currentUsage: usage,
    limit,
    remaining,
    unlimited: false,
    limitEnabled: true,
    isOverLimitOnDowngrade,
    reason: allowed
      ? undefined
      : `Your current subscription package allows a maximum of ${limit} ${label.en} (currently using ${usage}). Please upgrade your package to add more.`,
    reasonPt: allowed
      ? undefined
      : `O seu pacote de subscrição atual permite o máximo de ${limit} ${label.pt} (atualmente em uso: ${usage}). Faça upgrade do seu plano para adicionar mais.`,
  };
}

/**
 * Identifies significant package changes made by Super Admin that may affect existing subscribers.
 */
export function detectSignificantPlanChanges(previousPlan: Plan, updatedPlan: Plan): string[] {
  const impacts: string[] = [];

  const prevVis = previousPlan.isActive !== false && previousPlan.isPublic !== false;
  const nextVis = updatedPlan.isActive !== false && updatedPlan.isPublic !== false;
  if (prevVis && !nextVis) {
    impacts.push('Package is being marked as Inactive/Hidden from the public pricing page.');
  }

  if (previousPlan.priceMonthly !== updatedPlan.priceMonthly) {
    impacts.push(
      `Monthly price changed from €${previousPlan.priceMonthly} to €${updatedPlan.priceMonthly}.`
    );
  }

  const prevAnnual = previousPlan.priceAnnual ?? Math.round(previousPlan.priceMonthly * 12 * 0.8);
  const nextAnnual = updatedPlan.priceAnnual ?? Math.round(updatedPlan.priceMonthly * 12 * 0.8);
  if (prevAnnual !== nextAnnual) {
    impacts.push(`Annual price changed from €${prevAnnual} to €${nextAnnual}.`);
  }

  // Compare resource limits
  const resources: { type: PackageResourceType; label: string }[] = [
    { type: 'bookings', label: 'Monthly Bookings' },
    { type: 'staff', label: 'Staff Accounts' },
    { type: 'tables', label: 'Maximum Dining Tables' },
  ];

  for (const res of resources) {
    const prevLim = getEffectiveResourceLimit(previousPlan.entitlements, res.type);
    const nextLim = getEffectiveResourceLimit(updatedPlan.entitlements, res.type);

    if (prevLim.unlimited && !nextLim.unlimited && nextLim.limit !== null) {
      impacts.push(
        `${res.label} changed from Unlimited to a cap of ${nextLim.limit}. Existing subscribers exceeding ${nextLim.limit} will keep existing records but cannot add new ones.`
      );
    } else if (
      !prevLim.unlimited &&
      !nextLim.unlimited &&
      prevLim.limit !== null &&
      nextLim.limit !== null &&
      nextLim.limit < prevLim.limit
    ) {
      impacts.push(
        `${res.label} limit reduced from ${prevLim.limit} to ${nextLim.limit}. Subscribers above ${nextLim.limit} will retain existing data but cannot create additional items.`
      );
    }
  }

  // Compare feature entitlements
  const allFeatures: PackageFeatureKey[] = [
    'customDomain',
    'whatsapp',
    'sms',
    'advancedSEO',
    'waitlist',
    'advancedAnalytics',
    'apiAccess',
  ];

  for (const featKey of allFeatures) {
    const wasEnabled = isPackageFeatureEnabled(previousPlan.entitlements, featKey);
    const isNowEnabled = isPackageFeatureEnabled(updatedPlan.entitlements, featKey);
    if (wasEnabled && !isNowEnabled) {
      const meta = PACKAGE_FEATURE_METADATA[featKey];
      impacts.push(
        `Feature "${meta.label}" is being disabled. Subscribed restaurants will lose access to new uses of ${meta.label} while preserving historical data.`
      );
    }
  }

  return impacts;
}
