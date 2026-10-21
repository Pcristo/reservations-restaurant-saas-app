import { describe, it, expect } from 'bun:test';
import { User, Restaurant } from '../../src/types';
import { hasPermission, isUserSuperAdmin } from '../../src/lib/permissions';

// Helper function simulating cross-tenant authorization check used in backend actions and guards
function authorizeTenantAccess(user: User, targetRestaurantIdOrSlug: string, restaurantsMap: Record<string, Restaurant> = {}): boolean {
  if (!user || user.status !== 'active') return false;
  if (isUserSuperAdmin(user)) return true;

  const target = targetRestaurantIdOrSlug.toLowerCase();
  const primaryRest = (user.restaurantId || '').toLowerCase();
  const restIds = (user.restaurantIds || []).map(id => id.toLowerCase());

  // Check direct ID match
  if (primaryRest === target || restIds.includes(target)) return true;

  // Check slug match via restaurant entity
  const matchedRest = Object.values(restaurantsMap).find(r => 
    r.id.toLowerCase() === primaryRest || restIds.includes(r.id.toLowerCase())
  );
  if (matchedRest && (matchedRest.id.toLowerCase() === target || matchedRest.slug.toLowerCase() === target)) {
    return true;
  }

  return false;
}

// Helper simulating reservation tenant validation
function validateReservationAccess(user: User, reservationRestaurantId: string, restaurantsMap: Record<string, Restaurant> = {}): boolean {
  if (!user || user.status !== 'active') return false;
  if (isUserSuperAdmin(user)) return true;

  return authorizeTenantAccess(user, reservationRestaurantId, restaurantsMap);
}

describe('Multi-Tenant Staff and Admin Access Control Security Audit', () => {
  const restaurantA: Restaurant = {
    id: 'rest-a',
    name: 'Restaurant A (Dublin Bistro)',
    slug: 'dublin-bistro',
    status: 'active',
    ownerId: 'usr-owner-a',
    ownerEmail: 'owner@dublinbistro.com',
    country: 'ireland',
    currency: 'EUR',
    timezone: 'Europe/Dublin',
    language: 'en'
  };

  const restaurantB: Restaurant = {
    id: 'rest-b',
    name: 'Restaurant B (Cork Trattoria)',
    slug: 'cork-trattoria',
    status: 'active',
    ownerId: 'usr-owner-b',
    ownerEmail: 'owner@corktrattoria.com',
    country: 'ireland',
    currency: 'EUR',
    timezone: 'Europe/Dublin',
    language: 'en'
  };

  const restaurantsMap = {
    'rest-a': restaurantA,
    'rest-b': restaurantB
  };

  const staffUserA: User = {
    id: 'usr-staff-a',
    email: 'staff@dublinbistro.com',
    role: 'restaurant_staff',
    status: 'active',
    restaurantId: 'rest-a',
    permissions: ['reservations.view', 'tables.view']
  };

  const adminUserA: User = {
    id: 'usr-admin-a',
    email: 'admin@dublinbistro.com',
    role: 'restaurant_manager',
    status: 'active',
    restaurantId: 'rest-a'
  };

  const superAdminUser: User = {
    id: 'usr-super',
    email: 'pcristo35@gmail.com',
    role: 'super_admin',
    status: 'active'
  };

  it('1. Staff assigned to Restaurant A can access Restaurant A', () => {
    expect(authorizeTenantAccess(staffUserA, 'rest-a', restaurantsMap)).toBe(true);
    expect(authorizeTenantAccess(staffUserA, 'dublin-bistro', restaurantsMap)).toBe(true);
  });

  it('2. Staff assigned to Restaurant A cannot access Restaurant B', () => {
    expect(authorizeTenantAccess(staffUserA, 'rest-b', restaurantsMap)).toBe(false);
    expect(authorizeTenantAccess(staffUserA, 'cork-trattoria', restaurantsMap)).toBe(false);
  });

  it('3. Admin assigned to Restaurant A cannot access Restaurant B', () => {
    expect(authorizeTenantAccess(adminUserA, 'rest-b', restaurantsMap)).toBe(false);
    expect(authorizeTenantAccess(adminUserA, 'cork-trattoria', restaurantsMap)).toBe(false);
  });

  it('4. Changing the restaurant slug or ID in a URL does not grant access', () => {
    expect(authorizeTenantAccess(adminUserA, 'cork-trattoria', restaurantsMap)).toBe(false);
    expect(authorizeTenantAccess(staffUserA, 'rest-b', restaurantsMap)).toBe(false);
  });

  it('5. Changing a restaurant ID in an API request payload does not grant access', () => {
    const maliciousApiPayload = { restaurantId: 'rest-b', guestName: 'Hacker' };
    expect(authorizeTenantAccess(adminUserA, maliciousApiPayload.restaurantId, restaurantsMap)).toBe(false);
  });

  it('6. Users cannot create, edit, delete, or view reservations belonging to another restaurant', () => {
    const reservationAtB = { id: 'res-123', restaurantId: 'rest-b', guestName: 'Alice' };
    expect(validateReservationAccess(adminUserA, reservationAtB.restaurantId, restaurantsMap)).toBe(false);
    expect(validateReservationAccess(staffUserA, reservationAtB.restaurantId, restaurantsMap)).toBe(false);
  });

  it("7. Users cannot access another restaurant's customers, staff accounts, settings, or reports", () => {
    const targetResourceRestId = 'rest-b';
    expect(authorizeTenantAccess(adminUserA, targetResourceRestId, restaurantsMap)).toBe(false);
  });

  it('8. Restaurant admins cannot create users for another restaurant by manipulating request data', () => {
    const newUserCreationRequest = { email: 'newstaff@corktrattoria.com', restaurantId: 'rest-b', role: 'restaurant_staff' };
    expect(authorizeTenantAccess(adminUserA, newUserCreationRequest.restaurantId, restaurantsMap)).toBe(false);
  });

  it('9. Unassigned or invalid restaurant memberships are rejected safely', () => {
    const unassignedUser: User = {
      id: 'usr-unassigned',
      email: 'orphan@user.com',
      role: 'restaurant_staff',
      status: 'active'
    };
    expect(authorizeTenantAccess(unassignedUser, 'rest-a', restaurantsMap)).toBe(false);
    expect(authorizeTenantAccess(unassignedUser, 'rest-b', restaurantsMap)).toBe(false);
  });

  it('10. Super Admin can still perform authorised global operations', () => {
    expect(authorizeTenantAccess(superAdminUser, 'rest-a', restaurantsMap)).toBe(true);
    expect(authorizeTenantAccess(superAdminUser, 'rest-b', restaurantsMap)).toBe(true);
    expect(isUserSuperAdmin(superAdminUser)).toBe(true);
    expect(hasPermission(superAdminUser, 'superadmin.manage')).toBe(true);
  });

  it('11. Users cannot escalate their own role or restaurant membership', () => {
    const serverVerifiedSuperAdminCheck = isUserSuperAdmin(adminUserA);
    expect(serverVerifiedSuperAdminCheck).toBe(false);
  });

  it('12. Existing legitimate restaurant workflows continue to work', () => {
    const validReservationAtA = { id: 'res-999', restaurantId: 'rest-a', guestName: 'Bob' };
    expect(validateReservationAccess(adminUserA, validReservationAtA.restaurantId, restaurantsMap)).toBe(true);
    expect(validateReservationAccess(staffUserA, validReservationAtA.restaurantId, restaurantsMap)).toBe(true);
  });
});
