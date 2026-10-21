import { useMemo } from 'react';
import { useTenantSafe } from './useTenant';
import { useReservations } from './useReservations';
import { useTables } from './useTables';
import { useUsers } from './useUsers';
import {
  PackageFeatureKey,
  Plan,
  PlanEntitlements,
} from '../types';
import {
  isPackageFeatureEnabled,
  calculateMonthlyBookingUsage,
  checkCanCreateResource,
  getEffectiveResourceLimit,
  formatResourceAllowance,
  doesUserCountTowardsStaffQuota,
  MonthlyBookingUsageSummary,
  ResourceCreationCheckResult,
} from '../services/entitlementsService';

export interface UseEntitlementsResult {
  plan: Plan;
  entitlements: PlanEntitlements;
  bookingUsage: MonthlyBookingUsageSummary;
  staffUsage: {
    count: number;
    limit: number | null;
    remaining: number | null;
    unlimited: boolean;
    enabled: boolean;
    isAtLimit: boolean;
    isOverLimit: boolean;
    percentUsed: number;
  };
  tableUsage: {
    count: number;
    limit: number | null;
    remaining: number | null;
    unlimited: boolean;
    enabled: boolean;
    isAtLimit: boolean;
    isOverLimit: boolean;
    percentUsed: number;
  };
  isFeatureEnabled: (feature: PackageFeatureKey) => boolean;
  canCreateBooking: () => ResourceCreationCheckResult;
  canCreateStaff: () => ResourceCreationCheckResult;
  canCreateTable: () => ResourceCreationCheckResult;
  formatAllowance: (resource: 'bookings' | 'staff' | 'tables', language?: 'en' | 'pt') => string;
}

export function useEntitlements(): UseEntitlementsResult {
  const tenantCtx = useTenantSafe();
  const { reservations } = useReservations({ includeAll: true });
  const { tables } = useTables();
  const { users } = useUsers();

  const plan = tenantCtx?.plan;
  const entitlements = tenantCtx?.entitlements;
  const subscription = tenantCtx?.tenant?.subscription;

  // 1. Monthly Booking Usage
  const bookingUsage = useMemo(() => {
    return calculateMonthlyBookingUsage(reservations, entitlements, subscription);
  }, [reservations, entitlements, subscription]);

  // 2. Staff Accounts Usage
  const staffLimitInfo = useMemo(() => {
    return getEffectiveResourceLimit(entitlements, 'staff');
  }, [entitlements]);

  const activeStaffCount = useMemo(() => {
    return users.filter((u) => doesUserCountTowardsStaffQuota(u, tenantCtx?.tenant?.id, tenantCtx?.tenant)).length;
  }, [users, tenantCtx?.tenant]);

  const staffUsage = useMemo(() => {
    const limit = staffLimitInfo.limit;
    const count = activeStaffCount;
    const unlimited = staffLimitInfo.unlimited;
    const enabled = staffLimitInfo.enabled;
    const remaining = unlimited || limit === null ? null : Math.max(0, limit - count);
    const isAtLimit = !unlimited && limit !== null && count >= limit;
    const isOverLimit = !unlimited && limit !== null && count > limit;
    const percentUsed =
      unlimited || limit === null
        ? 0
        : limit === 0
        ? count > 0
          ? 100
          : 0
        : Math.min(100, Math.round((count / limit) * 100));

    return {
      count,
      limit,
      remaining,
      unlimited,
      enabled,
      isAtLimit,
      isOverLimit,
      percentUsed,
    };
  }, [staffLimitInfo, activeStaffCount]);

  // 3. Dining Tables Usage
  const tableLimitInfo = useMemo(() => {
    return getEffectiveResourceLimit(entitlements, 'tables');
  }, [entitlements]);

  const activeTablesCount = tables.length;

  const tableUsage = useMemo(() => {
    const limit = tableLimitInfo.limit;
    const count = activeTablesCount;
    const unlimited = tableLimitInfo.unlimited;
    const enabled = tableLimitInfo.enabled;
    const remaining = unlimited || limit === null ? null : Math.max(0, limit - count);
    const isAtLimit = !unlimited && limit !== null && count >= limit;
    const isOverLimit = !unlimited && limit !== null && count > limit;
    const percentUsed =
      unlimited || limit === null
        ? 0
        : limit === 0
        ? count > 0
          ? 100
          : 0
        : Math.min(100, Math.round((count / limit) * 100));

    return {
      count,
      limit,
      remaining,
      unlimited,
      enabled,
      isAtLimit,
      isOverLimit,
      percentUsed,
    };
  }, [tableLimitInfo, activeTablesCount]);

  const checkFeature = (feature: PackageFeatureKey): boolean => {
    return isPackageFeatureEnabled(entitlements, feature);
  };

  const canCreateBooking = (): ResourceCreationCheckResult => {
    return checkCanCreateResource(entitlements, 'bookings', bookingUsage.used);
  };

  const canCreateStaff = (): ResourceCreationCheckResult => {
    return checkCanCreateResource(entitlements, 'staff', activeStaffCount);
  };

  const canCreateTable = (): ResourceCreationCheckResult => {
    return checkCanCreateResource(entitlements, 'tables', activeTablesCount);
  };

  const formatAllowance = (
    resource: 'bookings' | 'staff' | 'tables',
    language: 'en' | 'pt' = 'en'
  ): string => {
    return formatResourceAllowance(entitlements, resource, language);
  };

  return {
    plan: plan!,
    entitlements: entitlements!,
    bookingUsage,
    staffUsage,
    tableUsage,
    isFeatureEnabled: checkFeature,
    canCreateBooking,
    canCreateStaff,
    canCreateTable,
    formatAllowance,
  };
}
