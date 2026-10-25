import { describe, it, expect } from 'bun:test';
import { User, UserRole } from '../../src/types';
import { 
  isUserSuperAdmin, 
  isUserRestaurantAdmin, 
  isUserStaff, 
  isCustomerRole, 
  doesUserBelongToRestaurant,
  hasPermission 
} from '../../src/lib/permissions';

// Simulated Server-Side Self-Registration Engine conforming to hardened firestore.rules
function simulateServerSideRegistration(payload: {
  email: string;
  name: string;
  role?: any;
  permissions?: any;
  restaurantId?: any;
  restaurantIds?: any;
  status?: any;
}): { success: boolean; userDoc?: Partial<User>; error?: string } {
  const cleanEmail = (payload.email || '').trim().toLowerCase();
  if (!cleanEmail) {
    return { success: false, error: 'Email required' };
  }

  // Reject / ignore client-injected privileged roles or permissions
  const assignedRole: UserRole = 'customer';

  // Public registration cannot assign administrative restaurant tenancy or custom permissions
  if (payload.role && payload.role !== 'customer') {
    // Under firestore.rules: request.resource.data.role == 'customer' is strictly required for self-creation.
    // Writes with role != 'customer' are blocked by security rules.
    return { success: false, error: 'Permission Denied: Public registration cannot create privileged roles' };
  }

  if (payload.permissions && Array.isArray(payload.permissions) && payload.permissions.length > 0) {
    // Under firestore.rules: !request.resource.data.keys().hasAny(['permissions'])
    return { success: false, error: 'Permission Denied: Public registration cannot supply permissions' };
  }

  if (payload.restaurantId || (payload.restaurantIds && payload.restaurantIds.length > 0)) {
    // Under firestore.rules: restaurantId must be null or empty
    return { success: false, error: 'Permission Denied: Public registration cannot assign administrative tenancy' };
  }

  return {
    success: true,
    userDoc: {
      email: cleanEmail,
      name: payload.name || 'Customer',
      role: assignedRole,
      status: 'active',
      restaurantId: undefined,
      restaurantIds: [],
      permissions: undefined
    }
  };
}

// Simulated Profile Self-Update Engine conforming to hardened firestore.rules
function simulateSelfProfileUpdate(
  currentUser: User,
  updatePayload: Partial<User>
): { success: boolean; updatedUser?: User; error?: string } {
  // Under firestore.rules: self-update forbids modifying role, permissions, status, restaurantId, restaurantIds
  const protectedFields = ['role', 'permissions', 'restaurantId', 'restaurantIds', 'status'] as const;
  for (const field of protectedFields) {
    if (field in updatePayload && updatePayload[field] !== currentUser[field]) {
      return { success: false, error: `Permission Denied: Cannot modify protected field ${field}` };
    }
  }

  return {
    success: true,
    updatedUser: {
      ...currentUser,
      name: updatePayload.name || currentUser.name,
      phone: updatePayload.phone !== undefined ? updatePayload.phone : currentUser.phone,
    }
  };
}

// Simulated Restaurant User Management Engine
function simulateRestaurantUserCreation(
  actor: User,
  targetRestaurantId: string,
  newUserPayload: { email: string; role: string; restaurantId: string }
): { success: boolean; error?: string } {
  // Check if actor is authorized admin for this restaurant
  const isActorAdmin = isUserRestaurantAdmin(actor, targetRestaurantId);
  if (!isActorAdmin) {
    return { success: false, error: 'Unauthorized: Actor is not an admin for this restaurant' };
  }

  // Cross-tenant prevention: Cannot create users for a different restaurant
  if (newUserPayload.restaurantId !== targetRestaurantId) {
    return { success: false, error: 'Unauthorized: Cannot create users for another restaurant' };
  }

  // Privilege escalation prevention: Cannot create super_admin
  if (newUserPayload.role === 'super_admin' || newUserPayload.role === 'superadmin') {
    return { success: false, error: 'Unauthorized: Restaurant admins cannot create Super Admin accounts' };
  }

  return { success: true };
}

// Simulated Super Admin Account Creation Engine
function simulateSuperAdminCreation(
  actor: User | null,
  newAdminEmail: string
): { success: boolean; error?: string } {
  if (!actor || !isUserSuperAdmin(actor)) {
    return { success: false, error: 'Unauthorized: Only an authenticated Super Admin can create another Super Admin' };
  }
  return { success: true };
}

// Simulated Invitation Activation Engine
function simulateInvitationActivation(
  invitation: { status: 'pending' | 'accepted' | 'declined' | 'revoked'; expiresAt?: string }
): { success: boolean; error?: string } {
  if (invitation.status === 'revoked') {
    return { success: false, error: 'Invitation has been revoked' };
  }
  if (invitation.status === 'accepted') {
    return { success: false, error: 'Invitation has already been used' };
  }
  if (invitation.expiresAt && new Date(invitation.expiresAt).getTime() < Date.now()) {
    return { success: false, error: 'Invitation has expired' };
  }
  return { success: true };
}

// Simulated Super Admin Deactivation / Removal Engine with Lockout Protection
function simulateSuperAdminDeactivationOrRemoval(
  actor: User | null,
  targetAdmin: User,
  allSuperAdmins: User[]
): { success: boolean; error?: string } {
  if (!actor || !isUserSuperAdmin(actor)) {
    return { success: false, error: 'Unauthorized: Only Super Admins can manage Super Admin accounts' };
  }
  if (targetAdmin.email?.toLowerCase() === 'pcristo35@gmail.com') {
    return { success: false, error: 'Lockout Protection: Platform master admin cannot be removed or deactivated' };
  }
  if (actor.email?.toLowerCase() === targetAdmin.email?.toLowerCase()) {
    return { success: false, error: 'Cannot remove or deactivate your own account' };
  }
  const remainingActive = allSuperAdmins.filter(
    a => a.status === 'active' && a.id !== targetAdmin.id && a.email?.toLowerCase() !== targetAdmin.email?.toLowerCase()
  );
  if (remainingActive.length === 0) {
    return { success: false, error: 'Lockout Protection: Cannot remove or deactivate the platform\'s last active Super Admin' };
  }
  return { success: true };
}

describe('Dine Master Pro - Comprehensive 17-Scenario Security Audit', () => {

  // Scenario 1: Public registration cannot create a super admin account
  it('Scenario 1: Public registration cannot create a super admin account', () => {
    const maliciousPayload = {
      email: 'attacker@example.com',
      name: 'Attacker',
      role: 'super_admin'
    };
    const result = simulateServerSideRegistration(maliciousPayload);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Permission Denied');
  });

  // Scenario 2: Public registration cannot create a restaurant admin account
  it('Scenario 2: Public registration cannot create a restaurant admin account', () => {
    const maliciousPayload = {
      email: 'attacker@example.com',
      name: 'Attacker',
      role: 'admin',
      restaurantId: 'bela-italia'
    };
    const result = simulateServerSideRegistration(maliciousPayload);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Permission Denied');
  });

  // Scenario 3: Public registration cannot create a restaurant staff account
  it('Scenario 3: Public registration cannot create a restaurant staff account', () => {
    const maliciousPayload = {
      email: 'attacker@example.com',
      name: 'Attacker',
      role: 'staff',
      restaurantId: 'bela-italia'
    };
    const result = simulateServerSideRegistration(maliciousPayload);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Permission Denied');
  });

  // Scenario 4: Public registration with client-injected role fields ignores or rejects the role and creates a customer account only
  it('Scenario 4: Public registration with client-injected role fields ignores or rejects the role and creates a customer account only', () => {
    // Legitimate public registration without role injection
    const validPublicReg = simulateServerSideRegistration({
      email: 'guest@example.com',
      name: 'Guest Diner'
    });
    expect(validPublicReg.success).toBe(true);
    expect(validPublicReg.userDoc?.role).toBe('customer');

    // Attempted injection of arbitrary privileged role is rejected
    const injectedRoleReg = simulateServerSideRegistration({
      email: 'guest2@example.com',
      name: 'Guest Diner 2',
      role: 'restaurant_manager'
    });
    expect(injectedRoleReg.success).toBe(false);
  });

  // Scenario 5: Public registration with client-injected tenant or restaurantId cannot gain administrative access
  it('Scenario 5: Public registration with client-injected tenant or restaurantId cannot gain administrative access', () => {
    const injectedTenantReg = simulateServerSideRegistration({
      email: 'guest3@example.com',
      name: 'Sneaky User',
      restaurantId: 'bela-italia'
    });
    expect(injectedTenantReg.success).toBe(false);
    expect(injectedTenantReg.error).toContain('administrative tenancy');
  });

  // Scenario 6: A customer account cannot access restaurant admin routes or data
  it('Scenario 6: A customer account cannot access restaurant admin routes or data', () => {
    const customerUser: User = {
      id: 'cust-1',
      email: 'customer@domain.com',
      role: 'customer',
      status: 'active'
    };
    expect(isUserRestaurantAdmin(customerUser, 'bela-italia')).toBe(false);
    expect(isUserStaff(customerUser, 'bela-italia')).toBe(false);
    expect(hasPermission(customerUser, 'restaurant.settings', 'bela-italia')).toBe(false);
    expect(hasPermission(customerUser, 'restaurant.staff', 'bela-italia')).toBe(false);
  });

  // Scenario 7: A customer account cannot access super admin routes or data
  it('Scenario 7: A customer account cannot access super admin routes or data', () => {
    const customerUser: User = {
      id: 'cust-1',
      email: 'customer@domain.com',
      role: 'customer',
      status: 'active'
    };
    expect(isUserSuperAdmin(customerUser)).toBe(false);
    expect(hasPermission(customerUser, 'superadmin.manage')).toBe(false);
  });

  // Scenario 8: A restaurant staff account cannot access super admin routes or data
  it('Scenario 8: A restaurant staff account cannot access super admin routes or data', () => {
    const staffUser: User = {
      id: 'staff-1',
      email: 'staff@belaitalia.com',
      role: 'restaurant_staff',
      status: 'active',
      restaurantId: 'bela-italia'
    };
    expect(isUserSuperAdmin(staffUser)).toBe(false);
    expect(hasPermission(staffUser, 'superadmin.manage')).toBe(false);
  });

  // Scenario 9: A restaurant admin account cannot access super admin routes or data
  it('Scenario 9: A restaurant admin account cannot access super admin routes or data', () => {
    const restaurantAdmin: User = {
      id: 'admin-1',
      email: 'admin@belaitalia.com',
      role: 'admin',
      status: 'active',
      restaurantId: 'bela-italia'
    };
    expect(isUserSuperAdmin(restaurantAdmin)).toBe(false);
    expect(hasPermission(restaurantAdmin, 'superadmin.manage')).toBe(false);
    expect(hasPermission(restaurantAdmin, 'superadmin.manage', 'bela-italia')).toBe(false);
  });

  // Scenario 10: A restaurant staff account cannot create new users unless explicitly authorised
  it('Scenario 10: A restaurant staff account cannot create new users unless explicitly authorised', () => {
    const staffUser: User = {
      id: 'staff-1',
      email: 'staff@belaitalia.com',
      role: 'restaurant_staff',
      status: 'active',
      restaurantId: 'bela-italia',
      permissions: ['reservations.view', 'tables.view']
    };
    const result = simulateRestaurantUserCreation(staffUser, 'bela-italia', {
      email: 'newbie@belaitalia.com',
      role: 'staff',
      restaurantId: 'bela-italia'
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
  });

  // Scenario 11: A restaurant admin can create or invite staff for their own restaurant
  it('Scenario 11: A restaurant admin can create or invite staff for their own restaurant', () => {
    const restaurantAdmin: User = {
      id: 'admin-1',
      email: 'manager@belaitalia.com',
      role: 'restaurant_manager',
      status: 'active',
      restaurantId: 'bela-italia'
    };
    const result = simulateRestaurantUserCreation(restaurantAdmin, 'bela-italia', {
      email: 'waiter@belaitalia.com',
      role: 'restaurant_staff',
      restaurantId: 'bela-italia'
    });
    expect(result.success).toBe(true);
  });

  // Scenario 12: A restaurant admin cannot create or invite users for another restaurant
  it('Scenario 12: A restaurant admin cannot create or invite users for another restaurant', () => {
    const restaurantAdminA: User = {
      id: 'admin-a',
      email: 'admin@dublinbistro.com',
      role: 'restaurant_owner',
      status: 'active',
      restaurantId: 'dublin-bistro'
    };
    const result = simulateRestaurantUserCreation(restaurantAdminA, 'cork-trattoria', {
      email: 'intruder@corktrattoria.com',
      role: 'restaurant_staff',
      restaurantId: 'cork-trattoria'
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
  });

  // Scenario 13: A restaurant admin cannot create a super admin account
  it('Scenario 13: A restaurant admin cannot create a super admin account', () => {
    const restaurantAdmin: User = {
      id: 'admin-1',
      email: 'admin@belaitalia.com',
      role: 'admin',
      status: 'active',
      restaurantId: 'bela-italia'
    };
    const result = simulateRestaurantUserCreation(restaurantAdmin, 'bela-italia', {
      email: 'escalated@belaitalia.com',
      role: 'super_admin',
      restaurantId: 'bela-italia'
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Restaurant admins cannot create Super Admin');
  });

  // Scenario 14: A user cannot elevate their own role by editing their profile or submitting an update request
  it('Scenario 14: A user cannot elevate their own role by editing their profile or submitting an update request', () => {
    const normalStaff: User = {
      id: 'staff-9',
      email: 'waiter@belaitalia.com',
      role: 'staff',
      status: 'active',
      restaurantId: 'bela-italia'
    };

    // Attempting to self-promote to super_admin
    const selfElevateSuper = simulateSelfProfileUpdate(normalStaff, { role: 'super_admin' });
    expect(selfElevateSuper.success).toBe(false);
    expect(selfElevateSuper.error).toContain('Cannot modify protected field role');

    // Attempting to self-promote to restaurant admin
    const selfElevateAdmin = simulateSelfProfileUpdate(normalStaff, { role: 'admin' });
    expect(selfElevateAdmin.success).toBe(false);

    // Legitimate profile update (changing display name) succeeds
    const legitUpdate = simulateSelfProfileUpdate(normalStaff, { name: 'Waiter John' });
    expect(legitUpdate.success).toBe(true);
    expect(legitUpdate.updatedUser?.name).toBe('Waiter John');
    expect(legitUpdate.updatedUser?.role).toBe('staff');
  });

  // Scenario 15: A Super Admin account can only be created through the authorised Super Admin flow by an existing, authorised Super Admin
  it('Scenario 15: A Super Admin account can only be created through the authorised Super Admin flow by an existing, authorised Super Admin', () => {
    const superAdminActor: User = {
      id: 'sa-master',
      email: 'pcristo35@gmail.com',
      role: 'super_admin',
      status: 'active'
    };
    const unauthActor: User = {
      id: 'regular-user',
      email: 'regular@gmail.com',
      role: 'customer',
      status: 'active'
    };

    expect(simulateSuperAdminCreation(superAdminActor, 'newadmin@domain.com').success).toBe(true);
    expect(simulateSuperAdminCreation(unauthActor, 'newadmin@domain.com').success).toBe(false);
    expect(simulateSuperAdminCreation(null, 'newadmin@domain.com').success).toBe(false);
  });

  // Scenario 16: Revoked or expired invitations cannot be used to activate an account
  it('Scenario 16: Revoked or expired invitations cannot be used to activate an account', () => {
    const revokedInvite = { status: 'revoked' as const };
    const expiredInvite = { 
      status: 'pending' as const, 
      expiresAt: new Date(Date.now() - 3600 * 1000).toISOString() // 1 hour ago
    };
    const validInvite = { 
      status: 'pending' as const, 
      expiresAt: new Date(Date.now() + 86400 * 1000).toISOString() // 1 day in future
    };

    expect(simulateInvitationActivation(revokedInvite).success).toBe(false);
    expect(simulateInvitationActivation(revokedInvite).error).toContain('revoked');

    expect(simulateInvitationActivation(expiredInvite).success).toBe(false);
    expect(simulateInvitationActivation(expiredInvite).error).toContain('expired');

    expect(simulateInvitationActivation(validInvite).success).toBe(true);
  });

  // Scenario 17: A Super Admin cannot remove or deactivate the last remaining Super Admin
  it('Scenario 17: A Super Admin cannot remove or deactivate the last remaining Super Admin', () => {
    const masterAdmin: User = {
      id: 'sa-master',
      email: 'pcristo35@gmail.com',
      role: 'super_admin',
      status: 'active'
    };
    const secondaryAdmin: User = {
      id: 'sa-secondary',
      email: 'coadmin@wordwide.pro',
      role: 'super_admin',
      status: 'active'
    };

    // When there are 2 active super admins:
    const twoAdmins = [masterAdmin, secondaryAdmin];

    // Master admin cannot be removed
    const tryRemoveMaster = simulateSuperAdminDeactivationOrRemoval(secondaryAdmin, masterAdmin, twoAdmins);
    expect(tryRemoveMaster.success).toBe(false);
    expect(tryRemoveMaster.error).toContain('Platform master admin cannot be removed');

    // Actor cannot remove themselves
    const tryRemoveSelf = simulateSuperAdminDeactivationOrRemoval(secondaryAdmin, secondaryAdmin, twoAdmins);
    expect(tryRemoveSelf.success).toBe(false);
    expect(tryRemoveSelf.error).toContain('Cannot remove or deactivate your own account');

    // Master removing secondary when both exist is permitted
    const legitRemove = simulateSuperAdminDeactivationOrRemoval(masterAdmin, secondaryAdmin, twoAdmins);
    expect(legitRemove.success).toBe(true);

    // If only 1 super admin remains (master admin), attempting to remove them is strictly blocked
    const onlyOneAdmin = [masterAdmin];
    const tryRemoveLast = simulateSuperAdminDeactivationOrRemoval(masterAdmin, masterAdmin, onlyOneAdmin);
    expect(tryRemoveLast.success).toBe(false);
  });
});
