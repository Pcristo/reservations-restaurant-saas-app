import { describe, it, expect } from 'bun:test';
import {
  normalizePlan,
  normalizePlanEntitlements,
  validatePlanConfiguration,
  getEffectiveResourceLimit,
  formatResourceAllowance,
  doesReservationCountTowardsQuota,
  doesUserCountTowardsStaffQuota,
  calculateMonthlyBookingUsage,
  checkCanCreateResource,
  detectSignificantPlanChanges,
  isPackageFeatureEnabled,
  QUALIFYING_BOOKING_STATUSES,
  NON_QUALIFYING_BOOKING_STATUSES,
} from '../../src/services/entitlementsService';
import { DEFAULT_PLANS } from '../../src/data/plans';
import { Plan, Reservation, User } from '../../src/types';

describe('Dynamic Subscription Package & Feature Management System', () => {
  it('1. Normalizes plan limits and preserves 0 explicitly', () => {
    const zeroPlan = normalizePlan({
      id: 'starter',
      name: 'Starter Tier',
      priceMonthly: 0,
      entitlements: {
        limitBookingsEnabled: true,
        unlimitedBookings: false,
        maxReservations: 0,
        limitStaffEnabled: true,
        unlimitedStaff: false,
        maxStaffUsers: 0,
        limitTablesEnabled: true,
        unlimitedTables: false,
        maxTables: 0,
        customDomain: false,
        whatsapp: false,
        sms: false,
        advancedSEO: false,
        waitlist: false,
      },
    });

    expect(zeroPlan.entitlements.maxReservations).toBe(0);
    expect(zeroPlan.entitlements.maxStaffUsers).toBe(0);
    expect(zeroPlan.entitlements.maxTables).toBe(0);

    const bookingLimit = getEffectiveResourceLimit(zeroPlan.entitlements, 'bookings');
    expect(bookingLimit.enabled).toBe(true);
    expect(bookingLimit.unlimited).toBe(false);
    expect(bookingLimit.limit).toBe(0);

    const staffLimit = getEffectiveResourceLimit(zeroPlan.entitlements, 'staff');
    expect(staffLimit.limit).toBe(0);

    const tableLimit = getEffectiveResourceLimit(zeroPlan.entitlements, 'tables');
    expect(tableLimit.limit).toBe(0);
  });

  it('2. Correctly handles unlimited options and disabled limits', () => {
    const unlimitedEntitlements = normalizePlanEntitlements({
      limitBookingsEnabled: true,
      unlimitedBookings: true,
      maxReservations: 999999,
      limitStaffEnabled: false,
      unlimitedStaff: false,
      maxStaffUsers: 5,
      limitTablesEnabled: true,
      unlimitedTables: true,
      maxTables: 999999,
    });

    const bLimit = getEffectiveResourceLimit(unlimitedEntitlements, 'bookings');
    expect(bLimit.unlimited).toBe(true);
    expect(bLimit.limit).toBe(null);
    expect(formatResourceAllowance(unlimitedEntitlements, 'bookings', 'en')).toBe('Unlimited');

    const sLimit = getEffectiveResourceLimit(unlimitedEntitlements, 'staff');
    expect(sLimit.enabled).toBe(false);
    expect(sLimit.unlimited).toBe(true);
    expect(sLimit.limit).toBe(null);
    expect(formatResourceAllowance(unlimitedEntitlements, 'staff', 'en')).toBe('Unlimited (No limit)');
  });

  it('3. Validates non-negative integer limits and handles invalid inputs', () => {
    // Negative number should fail
    const invalidNegative = validatePlanConfiguration({
      id: 'test',
      name: 'Test Plan',
      priceMonthly: 29,
      entitlements: {
        maxReservations: -5,
        maxStaffUsers: 2,
        maxTables: 10,
      } as any,
    });
    expect(invalidNegative.valid).toBe(false);
    expect(invalidNegative.errors.some((e) => e.includes('bookings limit'))).toBe(true);

    // Float number should fail
    const invalidFloat = validatePlanConfiguration({
      id: 'test',
      name: 'Test Plan',
      priceMonthly: 29,
      entitlements: {
        maxReservations: 10.5,
        maxStaffUsers: 2,
        maxTables: 10,
      } as any,
    });
    expect(invalidFloat.valid).toBe(false);

    // Valid zero and non-negative integers
    const validPlan = validatePlanConfiguration({
      id: 'test',
      name: 'Test Plan',
      priceMonthly: 0,
      priceAnnual: 0,
      entitlements: {
        limitBookingsEnabled: true,
        unlimitedBookings: false,
        maxReservations: 0,
        limitStaffEnabled: true,
        unlimitedStaff: false,
        maxStaffUsers: 3,
        limitTablesEnabled: true,
        unlimitedTables: false,
        maxTables: 15,
      } as any,
    });
    expect(validPlan.valid).toBe(true);
    expect(validPlan.errors.length).toBe(0);
  });

  it('4. Filters qualifying booking statuses according to single source of truth', () => {
    for (const status of QUALIFYING_BOOKING_STATUSES) {
      expect(doesReservationCountTowardsQuota({ status } as Reservation)).toBe(true);
    }

    for (const status of NON_QUALIFYING_BOOKING_STATUSES) {
      expect(doesReservationCountTowardsQuota({ status } as Reservation)).toBe(false);
    }

    // Soft-deleted reservations never consume quota
    expect(doesReservationCountTowardsQuota({ status: 'confirmed', isDeleted: true } as any)).toBe(false);
    expect(doesReservationCountTowardsQuota({ status: 'confirmed', isHistory: true } as any)).toBe(false);
  });

  it('5. Counts restaurant staff and admins towards staff quota while excluding Super Admins and customers', () => {
    const staffUser: Partial<User> = { role: 'staff', status: 'active', restaurantId: 'bela-italia' };
    const adminUser: Partial<User> = { role: 'admin', status: 'active', restaurantId: 'bela-italia' };
    const superAdminUser: Partial<User> = { role: 'super_admin', status: 'active' };
    const customerUser: Partial<User> = { role: 'customer', status: 'active', restaurantId: 'bela-italia' };
    const inactiveStaff: Partial<User> = { role: 'staff', status: 'inactive', restaurantId: 'bela-italia' };

    expect(doesUserCountTowardsStaffQuota(staffUser, 'bela-italia')).toBe(true);
    expect(doesUserCountTowardsStaffQuota(adminUser, 'bela-italia')).toBe(true);
    expect(doesUserCountTowardsStaffQuota(superAdminUser, 'bela-italia')).toBe(false);
    expect(doesUserCountTowardsStaffQuota(customerUser, 'bela-italia')).toBe(false);
    expect(doesUserCountTowardsStaffQuota(inactiveStaff, 'bela-italia')).toBe(false);
  });

  it('6. Calculates monthly booking usage and remaining allowance accurately within billing period', () => {
    const refDate = new Date('2026-10-15T12:00:00Z');
    const reservations: Partial<Reservation>[] = [
      { id: '1', date: '2026-10-02', status: 'confirmed' },
      { id: '2', date: '2026-10-08', status: 'seated' },
      { id: '3', date: '2026-10-14', status: 'cancelled' }, // should not count
      { id: '4', date: '2026-10-20', status: 'booked' },
      { id: '5', date: '2026-09-15', status: 'completed' }, // outside October window
    ];

    const entitlements = normalizePlanEntitlements({
      limitBookingsEnabled: true,
      unlimitedBookings: false,
      maxReservations: 10,
    });

    const usage = calculateMonthlyBookingUsage(reservations, entitlements, null, refDate);
    expect(usage.used).toBe(3); // id 1, 2, 4
    expect(usage.limit).toBe(10);
    expect(usage.remaining).toBe(7);
    expect(usage.percentUsed).toBe(30);
    expect(usage.isAtLimit).toBe(false);
  });

  it('7. Handles plan downgrades safely without deleting existing tables or staff', () => {
    const downgradedEntitlements = normalizePlanEntitlements({
      limitTablesEnabled: true,
      unlimitedTables: false,
      maxTables: 10,
    });

    // Currently has 12 tables (exceeds new cap of 10)
    const checkResult = checkCanCreateResource(downgradedEntitlements, 'tables', 12);
    expect(checkResult.allowed).toBe(false);
    expect(checkResult.isOverLimitOnDowngrade).toBe(true);
    expect(checkResult.remaining).toBe(0);
    expect(checkResult.currentUsage).toBe(12);
    expect(checkResult.reason).toContain('allows a maximum of 10');
  });

  it('8. Centralizes all 5 package feature entitlements', () => {
    const customEntitlements = normalizePlanEntitlements({
      customDomain: true,
      whatsapp: false,
      sms: true,
      advancedSEO: false,
      waitlist: true,
    });

    expect(isPackageFeatureEnabled(customEntitlements, 'customDomain')).toBe(true);
    expect(isPackageFeatureEnabled(customEntitlements, 'whatsapp')).toBe(false);
    expect(isPackageFeatureEnabled(customEntitlements, 'sms')).toBe(true);
    expect(isPackageFeatureEnabled(customEntitlements, 'advancedSEO')).toBe(false);
    expect(isPackageFeatureEnabled(customEntitlements, 'waitlist')).toBe(true);
  });

  it('9. Detects significant plan changes to warn Super Admin of impact on active subscribers', () => {
    const prevPlan = DEFAULT_PLANS[1]; // Professional (tables: 30, bookings: 500, price: 29)
    const updatedPlan: Plan = {
      ...prevPlan,
      priceMonthly: 69,
      entitlements: {
        ...prevPlan.entitlements,
        maxTables: 20, // Reduced from 30
        sms: false,    // Disabled
      },
    };

    const impacts = detectSignificantPlanChanges(prevPlan, updatedPlan);
    expect(impacts.some((i) => i.includes(`Monthly price changed from €${prevPlan.priceMonthly} to €69`))).toBe(true);
    expect(impacts.some((i) => i.includes('limit reduced from 30 to 20'))).toBe(true);
    expect(impacts.some((i) => i.includes('SMS Reminders'))).toBe(true);
  });

  it('10. Dynamically checks Smart Alerts entitlement in active package configuration', () => {
    const alertsEnabled = normalizePlanEntitlements({
      smartAlerts: true,
    });
    expect(isPackageFeatureEnabled(alertsEnabled, 'smartAlerts')).toBe(true);

    const alertsDisabled = normalizePlanEntitlements({
      smartAlerts: false,
    });
    expect(isPackageFeatureEnabled(alertsDisabled, 'smartAlerts')).toBe(false);

    // Default plans configuration test
    const professional = DEFAULT_PLANS.find((p) => p.id === 'professional');
    expect(professional).toBeDefined();
    expect(isPackageFeatureEnabled(professional?.entitlements, 'smartAlerts')).toBe(true);
  });

  it('11. Identifies active plan dynamically from subscription data for Plan Comparison Section', () => {
    const mockSubscription = {
      restaurantId: 'bela-italia',
      planId: 'professional',
      billingFrequency: 'monthly' as const,
      status: 'active' as const,
    };

    const plans = DEFAULT_PLANS;
    const activePlan = plans.find((p) => p.id.toLowerCase() === mockSubscription.planId.toLowerCase());
    expect(activePlan).toBeDefined();
    expect(activePlan?.id).toBe('professional');

    const isCurrentActive = (planId: string) => mockSubscription.planId.toLowerCase() === planId.toLowerCase();
    expect(isCurrentActive('professional')).toBe(true);
    expect(isCurrentActive('starter')).toBe(false);
    expect(isCurrentActive('enterprise')).toBe(false);
  });

  it('12. Translates package names, descriptions, and resource limits into en and pt-PT', () => {
    const { getLocalizedPlanName, getLocalizedPlanDescription } = require('../../src/services/entitlementsService');

    const trial = DEFAULT_PLANS.find((p) => p.id === 'trial')!;
    const professional = DEFAULT_PLANS.find((p) => p.id === 'professional')!;
    const business = DEFAULT_PLANS.find((p) => p.id === 'business')!;
    const enterprise = DEFAULT_PLANS.find((p) => p.id === 'enterprise')!;

    // English plan names
    expect(getLocalizedPlanName(trial, 'en')).toBe('Free Trial');
    expect(getLocalizedPlanName(professional, 'en')).toBe('Professional');
    expect(getLocalizedPlanName(business, 'en')).toBe('Business');
    expect(getLocalizedPlanName(enterprise, 'en')).toBe('Enterprise');

    // Portuguese (pt-PT) plan names
    expect(getLocalizedPlanName(trial, 'pt')).toBe('Experimental Gratuito');
    expect(getLocalizedPlanName(professional, 'pt')).toBe('Profissional');
    expect(getLocalizedPlanName(business, 'pt')).toBe('Empresarial');
    expect(getLocalizedPlanName(enterprise, 'pt')).toBe('Enterprise');

    // English and Portuguese plan descriptions
    expect(getLocalizedPlanDescription(professional, 'en')).toContain('independent restaurants');
    expect(getLocalizedPlanDescription(professional, 'pt')).toContain('restaurantes e bistrôs independentes');

    // Resource allowances in en and pt-PT
    expect(formatResourceAllowance(enterprise.entitlements, 'bookings', 'en')).toBe('Unlimited');
    expect(formatResourceAllowance(enterprise.entitlements, 'bookings', 'pt')).toBe('Ilimitado');
  });
});

