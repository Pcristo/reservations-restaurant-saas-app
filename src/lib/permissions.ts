import { User, UserRole, Permission } from '../types';

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'reservations.view',
    'reservations.create',
    'reservations.edit',
    'reservations.cancel',
    'customers.view',
    'customers.edit',
    'tables.view',
    'tables.manage',
    'restaurant.settings',
    'restaurant.staff',
    'restaurant.analytics',
    'restaurant.billing',
    'seo.manage',
    'branding.manage',
    'domains.manage',
    'superadmin.manage',
  ],
  restaurant_owner: [
    'reservations.view',
    'reservations.create',
    'reservations.edit',
    'reservations.cancel',
    'customers.view',
    'customers.edit',
    'tables.view',
    'tables.manage',
    'restaurant.settings',
    'restaurant.staff',
    'restaurant.analytics',
    'restaurant.billing',
    'seo.manage',
    'branding.manage',
    'domains.manage',
  ],
  admin: [
    // Legacy support (Restaurant Admin)
    'reservations.view',
    'reservations.create',
    'reservations.edit',
    'reservations.cancel',
    'customers.view',
    'customers.edit',
    'tables.view',
    'tables.manage',
    'restaurant.settings',
    'restaurant.staff',
    'restaurant.analytics',
    'restaurant.billing',
    'seo.manage',
    'branding.manage',
    'domains.manage',
  ],
  restaurant_manager: [
    'reservations.view',
    'reservations.create',
    'reservations.edit',
    'reservations.cancel',
    'customers.view',
    'customers.edit',
    'tables.view',
    'tables.manage',
    'restaurant.settings',
    'restaurant.staff',
    'restaurant.analytics',
  ],
  restaurant_staff: [
    'reservations.view',
    'reservations.create',
    'reservations.edit',
    'reservations.cancel',
    'customers.view',
    'tables.view',
  ],
  staff: [
    // Legacy support (Restaurant Staff)
    'reservations.view',
    'reservations.create',
    'reservations.edit',
    'reservations.cancel',
    'customers.view',
    'tables.view',
  ],
  customer: [
    'reservations.view',
  ],
};

export function normalizeTenantIdentifier(idOrSlug: string | null | undefined): string {
  if (!idOrSlug) return '';
  const clean = idOrSlug.trim().toLowerCase();
  if (clean === 'bella-italia') return 'bela-italia';
  if (clean === 'main' || clean === 'default-restaurant') return 'dinemaster-bistro';
  return clean;
}

/**
 * Strictly verifies whether a user is a platform Super Admin.
 * Restaurant-scoped accounts (with restaurantId or restaurantIds) can NEVER be Super Admin.
 */
export function isUserSuperAdmin(userOrEmail: User | string | null | undefined): boolean {
  if (!userOrEmail) return false;

  const emailStr = typeof userOrEmail === 'string' ? userOrEmail : (userOrEmail.email || '');
  const cleanEmail = emailStr.toLowerCase().trim();

  // 1. Master Super Admin is ALWAYS Super Admin unconditionally
  if (cleanEmail === 'pcristo35@gmail.com') {
    return true;
  }

  if (typeof userOrEmail === 'string') {
    try {
      const cached = localStorage.getItem('dinemaster_superadmin_emails');
      if (cached) {
        const emailList: string[] = JSON.parse(cached);
        return emailList.some(e => e.toLowerCase() === cleanEmail);
      }
    } catch {}
    return false;
  }

  if (userOrEmail.status === 'suspended' || userOrEmail.status === 'inactive') {
    return false;
  }

  // Check cached emails from Super Admin panel invitations / creations
  if (cleanEmail) {
    try {
      const cached = localStorage.getItem('dinemaster_superadmin_emails');
      if (cached) {
        const emailList: string[] = JSON.parse(cached);
        if (emailList.some(e => e.toLowerCase() === cleanEmail)) {
          return true;
        }
      }
    } catch {}
  }

  // Accounts associated with any restaurant tenant can NEVER be Super Admins
  if (userOrEmail.restaurantId || (userOrEmail.restaurantIds && userOrEmail.restaurantIds.length > 0)) {
    return false;
  }

  if (userOrEmail.role === 'super_admin' || (userOrEmail.role as any) === 'superadmin') {
    return true;
  }

  return false;
}

/**
 * Strictly verifies whether a restaurant staff/admin user belongs to the target restaurant.
 * Returns true for Super Admins.
 * Returns false if the user has no assigned restaurant or belongs to a different restaurant.
 */
export function doesUserBelongToRestaurant(
  user: User | null | undefined,
  targetRestaurantIdOrSlug: string | null | undefined,
  tenantObj?: { id?: string; slug?: string } | null
): boolean {
  if (!user) return false;
  if (user.status === 'suspended' || user.status === 'inactive') return false;
  if (isUserSuperAdmin(user)) return true;

  // Gather all normalized restaurant identifiers assigned to this user
  const assignedSet = new Set<string>();
  if (user.restaurantId) {
    assignedSet.add(normalizeTenantIdentifier(user.restaurantId));
  }
  if (Array.isArray(user.restaurantIds)) {
    user.restaurantIds.forEach(id => {
      if (id) assignedSet.add(normalizeTenantIdentifier(id));
    });
  }

  // Every staff/admin account MUST be explicitly associated with at least one restaurant
  if (assignedSet.size === 0) {
    return false;
  }

  // Gather target identifiers to check against
  const targetCandidates = new Set<string>();
  if (targetRestaurantIdOrSlug) {
    targetCandidates.add(normalizeTenantIdentifier(targetRestaurantIdOrSlug));
  }
  if (tenantObj?.id) {
    targetCandidates.add(normalizeTenantIdentifier(tenantObj.id));
  }
  if (tenantObj?.slug) {
    targetCandidates.add(normalizeTenantIdentifier(tenantObj.slug));
  }

  if (targetCandidates.size === 0) {
    return false;
  }

  for (const candidate of targetCandidates) {
    if (candidate && assignedSet.has(candidate)) {
      return true;
    }
  }

  return false;
}

export function hasPermission(
  user: User | null,
  permission: Permission,
  targetRestaurantId?: string
): boolean {
  if (!user) return false;
  if (user.status === 'suspended' || user.status === 'inactive') return false;

  if (isUserSuperAdmin(user)) {
    return true;
  }

  // Non-super-admin staff/admins MUST have a valid restaurant assignment
  if (user.role !== 'customer') {
    const hasAssignedRestaurant = Boolean(
      user.restaurantId || (user.restaurantIds && user.restaurantIds.length > 0)
    );
    if (!hasAssignedRestaurant) {
      return false;
    }
  }

  // If a target restaurant is specified, enforce strict tenant membership
  if (targetRestaurantId && !doesUserBelongToRestaurant(user, targetRestaurantId)) {
    return false;
  }

  // Never allow restaurant-level users to hold superadmin.manage permission
  if (permission === 'superadmin.manage') {
    return false;
  }

  // Custom assigned permissions override
  if (user.permissions && user.permissions.length > 0) {
    return user.permissions.includes(permission);
  }

  // Fallback to role-based default permissions
  const rolePermissions = ROLE_DEFAULT_PERMISSIONS[user.role] || [];
  return rolePermissions.includes(permission);
}

export function isUserRestaurantAdmin(user: User | null, restaurantId?: string): boolean {
  if (!user) return false;
  if (user.status === 'suspended' || user.status === 'inactive') return false;
  if (isUserSuperAdmin(user)) return true;

  const isOwnerOrAdmin =
    user.role === 'restaurant_owner' ||
    user.role === 'admin' ||
    user.role === 'restaurant_manager';
  if (!isOwnerOrAdmin) return false;

  // Must have an explicit restaurant assignment
  const hasAssignedRestaurant = Boolean(
    user.restaurantId || (user.restaurantIds && user.restaurantIds.length > 0)
  );
  if (!hasAssignedRestaurant) return false;

  if (restaurantId) {
    return doesUserBelongToRestaurant(user, restaurantId);
  }
  return true;
}

export function isRestaurantAdminRole(role?: string | null): boolean {
  if (!role) return false;
  return role === 'restaurant_owner' || role === 'admin' || role === 'restaurant_manager' || role === 'owner';
}

export function isUserStaff(user: User | null, restaurantId?: string): boolean {
  if (!user) return false;
  if (user.status === 'suspended' || user.status === 'inactive') return false;
  if (isUserSuperAdmin(user)) return true;

  const isStaffRole = [
    'restaurant_owner',
    'restaurant_manager',
    'restaurant_staff',
    'admin',
    'staff',
  ].includes(user.role);
  if (!isStaffRole) return false;

  // Must have an explicit restaurant assignment
  const hasAssignedRestaurant = Boolean(
    user.restaurantId || (user.restaurantIds && user.restaurantIds.length > 0)
  );
  if (!hasAssignedRestaurant) return false;

  if (restaurantId) {
    return doesUserBelongToRestaurant(user, restaurantId);
  }
  return true;
}

export function isCustomerRole(role?: string | null): boolean {
  return !role || role === 'customer';
}

export function canManageRestaurant(
  user: User | null | undefined,
  targetRestaurantIdOrSlug: string | null | undefined,
  tenantObj?: { id?: string; slug?: string } | null
): boolean {
  if (!user) return false;
  if (user.status === 'suspended' || user.status === 'inactive') return false;
  if (isUserSuperAdmin(user)) return true;

  const isAdminOrOwnerRole =
    user.role === 'restaurant_owner' ||
    user.role === 'admin' ||
    user.role === 'restaurant_manager';
  if (!isAdminOrOwnerRole) return false;

  return doesUserBelongToRestaurant(user, targetRestaurantIdOrSlug, tenantObj);
}


