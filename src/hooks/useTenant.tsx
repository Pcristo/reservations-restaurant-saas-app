import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  isUserSuperAdmin,
  doesUserBelongToRestaurant,
  normalizeTenantIdentifier,
} from '../lib/permissions';
import { 
  Restaurant, 
  DomainRecord, 
  Plan, 
  PlanEntitlements, 
  RestaurantBranding, 
  RestaurantSEO, 
  RestaurantSettings,
} from '../types';
import { 
  getRestaurant, 
  getRestaurantBySlug, 
  getRestaurantByDomain, 
  listRestaurantDomains, 
  listAllRestaurants,
  updateRestaurant, 
  ensureDefaultRestaurant, 
  DEFAULT_RESTAURANT_ID,
} from '../services/tenantService';
import { DEFAULT_PLANS } from '../data/plans';
import { subscribeToPlans } from '../services/planService';
import {
  resolveEffectivePlanAndEntitlements,
  isPackageFeatureEnabled,
} from '../services/entitlementsService';
import { APP_CONFIG } from '../data/appConfig';
import { useAuth } from './useAuth';
import { updateFavicon, isPlatformHost, isTenantSubdomain, getTenantSubdomainSlug } from '../lib/utils';
import { isFeatureEnabled } from '../services/featureFlagsService';

export interface TenantContextType {
  tenant: Restaurant | null;
  restaurantId: string;
  targetRestaurantId: string;
  slug: string;
  name: string;
  domains: DomainRecord[];
  plan: Plan;
  entitlements: PlanEntitlements;
  plans: Plan[];
  isSuspended: boolean;
  isSuperAdmin: boolean;
  isImpersonating: boolean;
  impersonatedRestaurantId: string | null;
  activeSupportSession: any | null;
  impersonateRestaurant: (restaurantId: string) => Promise<void>;
  enterSupportSession: (session: any) => Promise<void>;
  exitImpersonation: (options?: { markCompleted?: boolean; resolutionSummary?: string }) => Promise<void>;
  switchRestaurant: (restaurantId: string) => Promise<void>;
  refreshTenant: () => Promise<void>;
  updateBranding: (branding: Partial<RestaurantBranding>) => Promise<void>;
  updateSEO: (seo: Partial<RestaurantSEO>) => Promise<void>;
  updateSettings: (settings: Partial<RestaurantSettings>) => Promise<void>;
  updateProfile: (profile: Partial<Restaurant>) => Promise<void>;
  availableRestaurants: Restaurant[];
  loading: boolean;
  domainError: boolean;
  tenantError: boolean;
}

export const TenantContext = createContext<TenantContextType | undefined>(undefined);

const IMPERSONATION_KEY = 'eata_impersonated_tenant_id';
const ACTIVE_RESTAURANT_KEY = 'eata_active_restaurant_id';

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isSuperAdmin = useMemo(() => {
    return isUserSuperAdmin(user);
  }, [user]);

  const [tenant, setTenant] = useState<Restaurant | null>(null);
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [availableRestaurants, setAvailableRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainError, setDomainError] = useState(false);
  const [activeSupportSession, setActiveSupportSession] = useState<any | null>(null);
  const [impersonatedRestaurantId, setImpersonatedRestaurantId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(IMPERSONATION_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const unsubscribe = subscribeToPlans((livePlans) => {
      if (livePlans && livePlans.length > 0) {
        setPlans(livePlans);
      }
    });
    return () => unsubscribe();
  }, []);

  // Extract explicit /r/:slug from URL synchronously
  const routeSlug = useMemo(() => {
    const match = location.pathname.match(/^\/r\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return normalizeTenantIdentifier(match[1]);
    }
    return '';
  }, [location.pathname]);

  // Determine current active restaurant ID from multiple sources
  const resolveTargetRestaurant = useCallback(async (): Promise<{ restaurant: Restaurant | null; isDomainError: boolean }> => {
    if (typeof window === 'undefined') {
      return { restaurant: null, isDomainError: false };
    }

    const host = window.location.hostname.toLowerCase();
    const pathname = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const queryRestaurant = searchParams.get('restaurant');
    const isManagementRoute = pathname.startsWith('/admin') || pathname.startsWith('/staff') || pathname.startsWith('/dashboard');

    // 1. Explicit path prefix /r/:slug (e.g. /r/bela-italia, /r/bela-italia/admin, /r/bela-italia/staff)
    // ALWAYS takes absolute priority when visiting a restaurant-specific URL!
    const matchSlug = pathname.match(/^\/r\/([a-zA-Z0-9_-]+)/);
    if (matchSlug && matchSlug[1]) {
      const cleanSlug = normalizeTenantIdentifier(matchSlug[1]);
      const bySlug = await getRestaurantBySlug(cleanSlug);
      if (bySlug) return { restaurant: bySlug, isDomainError: false };
      const byId = await getRestaurant(cleanSlug);
      if (byId) return { restaurant: byId, isDomainError: false };
      if (cleanSlug === DEFAULT_RESTAURANT_ID) {
        const defRest = await ensureDefaultRestaurant();
        return { restaurant: defRest, isDomainError: false };
      }
      return { restaurant: null, isDomainError: true };
    }

    // 2. Super Admin Active Support Session
    if (impersonatedRestaurantId && isSuperAdmin) {
      const imp = await getRestaurant(impersonatedRestaurantId);
      if (imp) return { restaurant: imp, isDomainError: false };
    }

    // 3. Authenticated Restaurant Admin / Staff user on management routes
    // Strictly lock non-Super-Admin staff/owners to their assigned restaurant!
    if (user && !isSuperAdmin && isManagementRoute) {
      const assignedId = user.restaurantId || (user.restaurantIds && user.restaurantIds[0]);
      if (assignedId) {
        const cleanAssigned = normalizeTenantIdentifier(assignedId);
        const byId = await getRestaurant(cleanAssigned);
        if (byId) return { restaurant: byId, isDomainError: false };
        const bySlug = await getRestaurantBySlug(cleanAssigned);
        if (bySlug) return { restaurant: bySlug, isDomainError: false };
      }
      return { restaurant: null, isDomainError: true };
    }

    // 4. Query parameter ?restaurant=slug_or_id
    if (queryRestaurant) {
      const cleanQuery = normalizeTenantIdentifier(queryRestaurant);
      if (user && !isSuperAdmin) {
        const isAllowed = doesUserBelongToRestaurant(user, cleanQuery);
        if (!isAllowed) {
          console.warn(`[useTenant] Unauthorized ?restaurant=${cleanQuery} query attempt by ${user.email}`);
          return { restaurant: null, isDomainError: true };
        }
      }
      const bySlug = await getRestaurantBySlug(cleanQuery);
      if (bySlug) return { restaurant: bySlug, isDomainError: false };
      const byId = await getRestaurant(cleanQuery);
      if (byId) return { restaurant: byId, isDomainError: false };
      return { restaurant: null, isDomainError: true };
    }

    // 5. Custom domain or tenant subdomain check (when customDomains feature flag is enabled)
    if (!isPlatformHost(host) && isFeatureEnabled('customDomains')) {
      const byDomain = await getRestaurantByDomain(host);
      if (byDomain) return { restaurant: byDomain, isDomainError: false };

      const subSlug = getTenantSubdomainSlug(host);
      if (subSlug) {
        const bySubSlug = await getRestaurantBySlug(subSlug);
        if (bySubSlug) return { restaurant: bySubSlug, isDomainError: false };
      }

      return { restaurant: null, isDomainError: true };
    }

    // 6. Authenticated Restaurant Owner / Manager / Staff user (fallback on non-slug routes)
    if (user && !isSuperAdmin) {
      const assignedId = user.restaurantId || (user.restaurantIds && user.restaurantIds[0]);
      if (assignedId) {
        const byUser = await getRestaurant(assignedId);
        if (byUser) return { restaurant: byUser, isDomainError: false };
        const byUserSlug = await getRestaurantBySlug(assignedId);
        if (byUserSlug) return { restaurant: byUserSlug, isDomainError: false };
      }
    }

    // 7. Super Admin manual tenant selection via switcher (ONLY when in active support session)
    if (isSuperAdmin && impersonatedRestaurantId) {
      const savedRest = await getRestaurant(impersonatedRestaurantId);
      if (savedRest) return { restaurant: savedRest, isDomainError: false };
    }

    // 8. Default fallback restaurant for main landing/demo
    const defRest = await ensureDefaultRestaurant();
    return { restaurant: defRest, isDomainError: false };
  }, [impersonatedRestaurantId, isSuperAdmin, user, location.pathname, location.search]);

  const loadTenantData = useCallback(async () => {
    setLoading(true);
    setDomainError(false);
    try {
      const { restaurant, isDomainError } = await resolveTargetRestaurant();
      if (isDomainError) {
        setDomainError(true);
        setTenant(null);
        setDomains([]);
      } else if (restaurant) {
        if (user && !isSuperAdmin) {
          const isStaffOrAdminUser = user.role !== 'customer' || Boolean(user.restaurantId || user.restaurantIds?.length);
          if (isStaffOrAdminUser) {
            const belongs = doesUserBelongToRestaurant(user, restaurant.id, restaurant);
            if (!belongs) {
              console.warn(`[useTenant] Tenant mismatch: user (${user.email}) is not authorized for ${restaurant.slug}. Terminating session.`);
              await logout(true);
              try {
                sessionStorage.removeItem(ACTIVE_RESTAURANT_KEY);
                localStorage.removeItem(ACTIVE_RESTAURANT_KEY);
                localStorage.removeItem('cached_user_profile');
              } catch {}
            }
          }
        }

        setTenant(restaurant);
        const domList = await listRestaurantDomains(restaurant.id);
        setDomains(domList);
      } else {
        setTenant(null);
        setDomains([]);
      }
      
      // If Super Admin, load all restaurants
      if (isSuperAdmin) {
        const all = await listAllRestaurants();
        setAvailableRestaurants(all);
      } else {
        setAvailableRestaurants([]);
      }
    } catch (err) {
      console.error('[useTenant] Error resolving tenant:', err);
    } finally {
      setLoading(false);
    }
  }, [resolveTargetRestaurant, isSuperAdmin, user, logout]);

  // Immediate synchronous route & query listener for restaurant session isolation
  useEffect(() => {
    if (user && !isSuperAdmin) {
      const isStaffOrAdminUser = user.role !== 'customer' || Boolean(user.restaurantId || user.restaurantIds?.length);
      if (!isStaffOrAdminUser) return;

      const hasAssignedRest = Boolean(user.restaurantId || (user.restaurantIds && user.restaurantIds.length > 0));
      if (!hasAssignedRest) {
        console.warn(`[useTenant] Staff/admin user (${user.email}) has no assigned restaurant. Terminating session.`);
        logout(true);
        return;
      }

      const match = location.pathname.match(/^\/r\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        const currentTargetSlug = normalizeTenantIdentifier(match[1]);
        const loadedMatchingTenant =
          tenant && (normalizeTenantIdentifier(tenant.slug) === currentTargetSlug || normalizeTenantIdentifier(tenant.id) === currentTargetSlug)
            ? tenant
            : null;
        const isMatch = doesUserBelongToRestaurant(
          user,
          currentTargetSlug,
          loadedMatchingTenant
        );
        if (!isMatch && (loadedMatchingTenant || !loading)) {
          console.warn(`[useTenant] Immediate route mismatch: user (${user.email}) visited /r/${currentTargetSlug}. Terminating session.`);
          logout(true);
          try {
            sessionStorage.removeItem(ACTIVE_RESTAURANT_KEY);
            localStorage.removeItem(ACTIVE_RESTAURANT_KEY);
            localStorage.removeItem('cached_user_profile');
          } catch {}
          return;
        }
      }

      const searchParams = new URLSearchParams(location.search);
      const queryRest = searchParams.get('restaurant');
      if (queryRest) {
        const cleanQueryRest = normalizeTenantIdentifier(queryRest);
        if (!doesUserBelongToRestaurant(user, cleanQueryRest)) {
          console.warn(`[useTenant] Query param tenant mismatch: user (${user.email}) requested ?restaurant=${cleanQueryRest}. Terminating session.`);
          logout(true);
          try {
            sessionStorage.removeItem(ACTIVE_RESTAURANT_KEY);
            localStorage.removeItem(ACTIVE_RESTAURANT_KEY);
            localStorage.removeItem('cached_user_profile');
          } catch {}
        }
      }
    }
  }, [location.pathname, location.search, user, isSuperAdmin, tenant, loading, logout]);

  useEffect(() => {
    loadTenantData();
  }, [loadTenantData, location.pathname, location.search]);

  // Apply theme & favicon dynamically when tenant changes
  useEffect(() => {
    if (!tenant) return;

    const primaryColor = tenant.branding?.primaryColor || '#f59e0b';
    document.documentElement.style.setProperty('--tenant-primary', primaryColor);

    const fav = tenant.branding?.faviconUrl || tenant.branding?.logoUrl || '/favicon.svg';
    updateFavicon(fav, { name: tenant.name, primaryColor });
  }, [tenant]);

  const { plan, entitlements } = useMemo(() => {
    return resolveEffectivePlanAndEntitlements({
      planId: tenant?.planId,
      plans,
      restaurant: tenant,
      subscription: tenant?.subscription,
    });
  }, [tenant, plans]);

  const isSuspended = useMemo(() => {
    return tenant?.status === 'suspended' || tenant?.status === 'cancelled';
  }, [tenant]);

  const isImpersonating = Boolean(
    isSuperAdmin &&
    impersonatedRestaurantId
  );

  const impersonateRestaurant = useCallback(async (targetRestaurantId: string) => {
    if (!isSuperAdmin) return;
    const target = await getRestaurant(targetRestaurantId);
    if (!target) {
      throw new Error('Target restaurant not found.');
    }

    sessionStorage.setItem(IMPERSONATION_KEY, targetRestaurantId);
    setImpersonatedRestaurantId(targetRestaurantId);
    setTenant(target);
    const domList = await listRestaurantDomains(target.id);
    setDomains(domList);
  }, [isSuperAdmin]);

  const enterSupportSession = useCallback(async (session: any) => {
    if (session?.restaurantId) {
      await impersonateRestaurant(session.restaurantId);
    }
  }, [impersonateRestaurant]);

  const exitImpersonation = useCallback(async () => {
    sessionStorage.removeItem(IMPERSONATION_KEY);
    setImpersonatedRestaurantId(null);
    setActiveSupportSession(null);
    await loadTenantData();
  }, [loadTenantData]);

  const switchRestaurant = useCallback(async (newRestaurantId: string) => {
    if (!isSuperAdmin) {
      console.warn('[useTenant] Unauthorized attempt to switch restaurant tenant blocked');
      return;
    }
    await impersonateRestaurant(newRestaurantId);
  }, [isSuperAdmin, impersonateRestaurant]);

  const updateBranding = useCallback(async (branding: Partial<RestaurantBranding>) => {
    if (!tenant) return;
    const newBranding = { ...tenant.branding, ...branding };
    await updateRestaurant(tenant.id, { branding: newBranding }, user);
    setTenant(prev => prev ? { ...prev, branding: newBranding } : null);
  }, [tenant, user]);

  const updateSEO = useCallback(async (seo: Partial<RestaurantSEO>) => {
    if (!tenant) return;
    if (!isPackageFeatureEnabled(entitlements, 'advancedSEO')) {
      throw new Error(`Advanced SEO is not included in the ${plan.name} package. Please upgrade your subscription package to configure Advanced SEO.`);
    }
    const newSeo = { ...tenant.seo, ...seo };
    await updateRestaurant(tenant.id, { seo: newSeo }, user);
    setTenant(prev => prev ? { ...prev, seo: newSeo } : null);
  }, [tenant, user, entitlements, plan.name]);

  const updateSettings = useCallback(async (settings: Partial<RestaurantSettings>) => {
    if (!tenant) return;
    const newSettings = { ...tenant.settings, ...settings };
    await updateRestaurant(tenant.id, { settings: newSettings }, user);
    setTenant(prev => prev ? { ...prev, settings: newSettings } : null);
  }, [tenant, user]);

  const updateProfile = useCallback(async (profile: Partial<Restaurant>) => {
    if (!tenant) return;
    await updateRestaurant(tenant.id, profile, user);
    setTenant(prev => prev ? { ...prev, ...profile } : null);
  }, [tenant, user]);

  const refreshTenant = useCallback(async () => {
    await loadTenantData();
  }, [loadTenantData]);

  const effectiveRestaurantId = useMemo(() => {
    if (routeSlug) {
      if (tenant && (normalizeTenantIdentifier(tenant.slug) === routeSlug || normalizeTenantIdentifier(tenant.id) === routeSlug)) {
        return tenant.id;
      }
      return routeSlug;
    }
    if (!isSuperAdmin && user && user.role !== 'customer') {
      const assigned = user.restaurantId || (user.restaurantIds && user.restaurantIds[0]);
      return assigned ? normalizeTenantIdentifier(assigned) : '';
    }
    return tenant?.id || '';
  }, [routeSlug, tenant, isSuperAdmin, user]);

  return (
    <TenantContext.Provider value={{
      tenant,
      restaurantId: effectiveRestaurantId,
      targetRestaurantId: effectiveRestaurantId,
      slug: tenant?.slug || routeSlug || '',
      name: tenant?.name || APP_CONFIG.appName,
      domains,
      plan,
      entitlements,
      plans,
      isSuspended,
      isSuperAdmin,
      isImpersonating,
      impersonatedRestaurantId,
      activeSupportSession,
      impersonateRestaurant,
      enterSupportSession,
      exitImpersonation,
      switchRestaurant,
      refreshTenant,
      updateBranding,
      updateSEO,
      updateSettings,
      updateProfile,
      availableRestaurants,
      loading,
      domainError,
      tenantError: domainError,
    }}>
      {children}
    </TenantContext.Provider>
  );
};

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

export function useTenantSafe(): TenantContextType | null {
  return useContext(TenantContext) || null;
}
