import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, setDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Table, Area } from '../types';
import { useTenantSafe } from './useTenant';
import { useAuth } from './useAuth';
import { DEFAULT_RESTAURANT_ID } from '../services/tenantService';
import { canManageRestaurant, doesUserBelongToRestaurant, isUserSuperAdmin, normalizeTenantIdentifier, isCustomerRole } from '../lib/permissions';
import {
  checkCanCreateResource,
  ResourceCreationCheckResult,
} from '../services/entitlementsService';

const generateFriendlyId = (text: string) => {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

export const DEFAULT_TABLES: Table[] = [
  { id: 'table-1', name: 'Table 1', seats: 2, x: 60, y: 80, shape: 'round', status: 'available', allowOnlineReservations: true, isActive: true },
  { id: 'table-2', name: 'Table 2', seats: 2, x: 180, y: 80, shape: 'round', status: 'available', allowOnlineReservations: true, isActive: true },
  { id: 'table-3', name: 'Table 3', seats: 4, x: 300, y: 80, shape: 'rectangle', status: 'available', allowOnlineReservations: true, isActive: true },
  { id: 'table-4', name: 'Table 4', seats: 4, x: 60, y: 200, shape: 'rectangle', status: 'available', allowOnlineReservations: true, isActive: true },
  { id: 'table-5', name: 'Table 5', seats: 6, x: 180, y: 200, shape: 'rectangle', status: 'available', allowOnlineReservations: true, isActive: true },
  { id: 'table-6', name: 'Table 6', seats: 8, x: 300, y: 200, shape: 'rectangle', status: 'available', allowOnlineReservations: true, isActive: true },
];

export const DEFAULT_AREAS: Area[] = [
  { id: 'area-main', name: 'Main Dining Room', order: 1, allowOnlineReservations: true, bookingMode: 'online' }
];

export function useTables(restaurantIdOverride?: string) {
  const tenantCtx = useTenantSafe();
  const { user } = useAuth();
  const activeRestaurant = tenantCtx?.tenant;
  const isSuperAdmin = isUserSuperAdmin(user) || Boolean(tenantCtx?.isSuperAdmin);

  const routeSlugMatch = typeof window !== 'undefined' ? window.location.pathname.match(/^\/r\/([a-zA-Z0-9_-]+)/) : null;
  const activeRouteSlug = routeSlugMatch && routeSlugMatch[1] ? normalizeTenantIdentifier(routeSlugMatch[1]) : null;

  // Resolve target restaurant ID strictly
  const targetRestaurantId = useMemo(() => {
    if (restaurantIdOverride) {
      const normOpt = normalizeTenantIdentifier(restaurantIdOverride);
      if (isSuperAdmin || !user || isCustomerRole(user.role) || doesUserBelongToRestaurant(user, normOpt, activeRestaurant)) {
        return normOpt;
      }
    }
    if (activeRouteSlug) {
      if (activeRestaurant && normalizeTenantIdentifier(activeRestaurant.slug) === activeRouteSlug) {
        return normalizeTenantIdentifier(activeRestaurant.id);
      }
      return activeRouteSlug;
    }
    if (tenantCtx?.targetRestaurantId) {
      return normalizeTenantIdentifier(tenantCtx.targetRestaurantId);
    }
    if (activeRestaurant?.id) {
      return normalizeTenantIdentifier(activeRestaurant.id);
    }
    if (user && !isSuperAdmin && !isCustomerRole(user.role)) {
      const userRest = user.restaurantId || (user.restaurantIds && user.restaurantIds[0]);
      if (userRest) return normalizeTenantIdentifier(userRest);
    }
    return DEFAULT_RESTAURANT_ID;
  }, [restaurantIdOverride, activeRouteSlug, activeRestaurant, tenantCtx?.targetRestaurantId, isSuperAdmin, user]);

  const isDefaultTenant = useMemo(() => {
    const norm = normalizeTenantIdentifier(targetRestaurantId);
    return (norm === 'main' || norm === 'default-restaurant' || norm === 'dinemaster-bistro') &&
      (!activeRouteSlug || activeRouteSlug === 'main' || activeRouteSlug === 'default-restaurant' || activeRouteSlug === 'dinemaster-bistro');
  }, [targetRestaurantId, activeRouteSlug]);

  const matchesTenant = useCallback((itemRestId?: string | null) => {
    const normI = normalizeTenantIdentifier(itemRestId);
    const normT = normalizeTenantIdentifier(targetRestaurantId);
    if (!normI) return isDefaultTenant;
    if (normI === normT) return true;
    if (activeRouteSlug && normI === activeRouteSlug) return true;
    if (activeRestaurant) {
      if (normI === normalizeTenantIdentifier(activeRestaurant.id) || normI === normalizeTenantIdentifier(activeRestaurant.slug)) {
        return true;
      }
    }
    if (isDefaultTenant && (normI === 'main' || normI === 'default-restaurant' || normI === 'dinemaster-bistro')) {
      return true;
    }
    return false;
  }, [targetRestaurantId, activeRouteSlug, activeRestaurant, isDefaultTenant]);

  const tablesCacheKey = `cached_tables_${targetRestaurantId}`;
  const areasCacheKey = `cached_areas_${targetRestaurantId}`;

  const defaultTenantTables = useMemo(() => {
    return DEFAULT_TABLES.map(t => ({ ...t, restaurantId: targetRestaurantId }));
  }, [targetRestaurantId]);

  const defaultTenantAreas = useMemo(() => {
    return DEFAULT_AREAS.map(a => ({ ...a, id: `area-${targetRestaurantId}-main`, restaurantId: targetRestaurantId }));
  }, [targetRestaurantId]);

  const [tables, setTables] = useState<Table[]>(() => {
    try {
      const cached = localStorage.getItem(tablesCacheKey) || (targetRestaurantId === DEFAULT_RESTAURANT_ID ? localStorage.getItem('cached_tables') : null);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return defaultTenantTables;
    } catch {
      return defaultTenantTables;
    }
  });

  const [areas, setAreas] = useState<Area[]>(() => {
    try {
      const cached = localStorage.getItem(areasCacheKey) || (targetRestaurantId === DEFAULT_RESTAURANT_ID ? localStorage.getItem('cached_areas') : null);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return defaultTenantAreas;
    } catch {
      return defaultTenantAreas;
    }
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const cachedT = localStorage.getItem(tablesCacheKey) || (targetRestaurantId === DEFAULT_RESTAURANT_ID ? localStorage.getItem('cached_tables') : null);
      setTables(cachedT ? JSON.parse(cachedT) : []);

      const cachedA = localStorage.getItem(areasCacheKey) || (targetRestaurantId === DEFAULT_RESTAURANT_ID ? localStorage.getItem('cached_areas') : null);
      setAreas(cachedA ? JSON.parse(cachedA) : []);
    } catch {}

    let tablesLoaded = false;
    let areasLoaded = false;

    const tablesQuery = isDefaultTenant
      ? query(collection(db, 'tables'))
      : query(collection(db, 'tables'), where('restaurantId', '==', targetRestaurantId));

    const unsubscribeTables = onSnapshot(tablesQuery, (snapshot) => {
      const tenantTables = snapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Table))
        .filter(t => matchesTenant(t.restaurantId));

      if (tenantTables.length > 0) {
        setTables(tenantTables);
        try {
          localStorage.setItem(tablesCacheKey, JSON.stringify(tenantTables));
        } catch (e) {}
      } else {
        setTables((prev) => (prev && prev.length > 0 ? prev : defaultTenantTables));
      }

      tablesLoaded = true;
      if (areasLoaded) setLoading(false);
    }, (error) => {
      setLoading(false);
      setTables((prev) => (prev && prev.length > 0 ? prev : defaultTenantTables));
      console.warn('[useTables] Notice on tables sync:', error);
    });

    const areasQuery = isDefaultTenant
      ? query(collection(db, 'areas'))
      : query(collection(db, 'areas'), where('restaurantId', '==', targetRestaurantId));

    const unsubscribeAreas = onSnapshot(areasQuery, (snapshot) => {
      const tenantAreas = snapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Area))
        .filter(a => matchesTenant(a.restaurantId));
      tenantAreas.sort((a, b) => (a.order || 0) - (b.order || 0));

      if (tenantAreas.length > 0) {
        setAreas(tenantAreas);
        try {
          localStorage.setItem(areasCacheKey, JSON.stringify(tenantAreas));
        } catch (e) {}
      } else {
        setAreas((prev) => (prev && prev.length > 0 ? prev : defaultTenantAreas));
      }

      areasLoaded = true;
      if (tablesLoaded) setLoading(false);
    }, (error) => {
      setAreas((prev) => (prev && prev.length > 0 ? prev : defaultTenantAreas));
      areasLoaded = true;
      if (tablesLoaded) setLoading(false);
      console.warn('[useTables] Notice on areas sync:', error);
    });

    return () => {
      unsubscribeTables();
      unsubscribeAreas();
    };
  }, [targetRestaurantId, isDefaultTenant, matchesTenant, tablesCacheKey, areasCacheKey, defaultTenantTables, defaultTenantAreas]);

  // Effective table limit check for the current subscription package
  const activeTablesCount = tables.length;
  const tableLimitCheck: ResourceCreationCheckResult = useMemo(() => {
    return checkCanCreateResource(tenantCtx?.entitlements, 'tables', tables.length);
  }, [tenantCtx?.entitlements, tables.length]);

  const assertCanMutateTables = () => {
    if (!doesUserBelongToRestaurant(user, targetRestaurantId, activeRestaurant)) {
      throw new Error('Access denied: You are not authorized to modify tables or areas for this restaurant.');
    }
  };

  const addTable = async (table: Omit<Table, 'id'>) => {
    assertCanMutateTables();

    // Enforce subscription package table limit
    const limitCheck = checkCanCreateResource(tenantCtx?.entitlements, 'tables', tables.length);
    if (!limitCheck.allowed) {
      throw new Error(
        limitCheck.reasonPt ||
        limitCheck.reason ||
        'Dining table limit reached for your subscription package. Please upgrade your package to add more tables.'
      );
    }

    let friendlyId = 'table-' + generateFriendlyId(table.name || '');
    if (friendlyId === 'table-') friendlyId = 'table-' + Date.now();
    friendlyId += '-' + Math.random().toString(36).substring(2, 6);
    
    await setDoc(doc(db, 'tables', friendlyId), { 
      ...table, 
      id: friendlyId,
      restaurantId: targetRestaurantId,
    });
  };

  const updateTable = async (id: string, table: Partial<Table>) => {
    assertCanMutateTables();
    const existing = tables.find(t => t.id === id);
    if (!existing || (existing.restaurantId && !matchesTenant(existing.restaurantId))) {
      throw new Error(`Unauthorized: Table ${id} does not belong to the current restaurant.`);
    }
    const { id: _, ...data } = table as any;
    await updateDoc(doc(db, 'tables', id), {
      ...data,
      restaurantId: targetRestaurantId,
    });
  };

  const deleteTable = async (id: string) => {
    if (!canManageRestaurant(user, targetRestaurantId, activeRestaurant)) {
      throw new Error('Access denied: Only restaurant administrators can delete tables.');
    }
    const existing = tables.find(t => t.id === id);
    if (!existing || (existing.restaurantId && !matchesTenant(existing.restaurantId))) {
      throw new Error(`Unauthorized: Table ${id} does not belong to the current restaurant.`);
    }
    await deleteDoc(doc(db, 'tables', id));
  };

  const addArea = async (area: Omit<Area, 'id'>) => {
    if (!canManageRestaurant(user, targetRestaurantId, activeRestaurant)) {
      throw new Error('Access denied: Only restaurant administrators can add dining areas.');
    }
    let friendlyId = generateFriendlyId(area.name || '');
    if (!friendlyId) friendlyId = 'area-' + Date.now();
    friendlyId += '-' + Math.random().toString(36).substring(2, 6);
    await setDoc(doc(db, 'areas', friendlyId), { 
      ...area, 
      id: friendlyId,
      restaurantId: targetRestaurantId,
    });
  };

  const updateArea = async (id: string, area: Partial<Area>) => {
    if (!canManageRestaurant(user, targetRestaurantId, activeRestaurant)) {
      throw new Error('Access denied: Only restaurant administrators can update dining areas.');
    }
    const existing = areas.find(a => a.id === id);
    if (!existing || (existing.restaurantId && !matchesTenant(existing.restaurantId))) {
      throw new Error(`Unauthorized: Area ${id} does not belong to the current restaurant.`);
    }
    const { id: _, ...data } = area as any;
    await updateDoc(doc(db, 'areas', id), {
      ...data,
      restaurantId: targetRestaurantId,
    });
  };

  const deleteArea = async (id: string) => {
    if (!canManageRestaurant(user, targetRestaurantId, activeRestaurant)) {
      throw new Error('Access denied: Only restaurant administrators can delete dining areas.');
    }
    const existing = areas.find(a => a.id === id);
    if (!existing || (existing.restaurantId && !matchesTenant(existing.restaurantId))) {
      throw new Error(`Unauthorized: Area ${id} does not belong to the current restaurant.`);
    }
    await deleteDoc(doc(db, 'areas', id));
  };

  return {
    tables,
    areas,
    loading,
    activeTablesCount,
    tableLimitCheck,
    addTable,
    updateTable,
    deleteTable,
    addArea,
    updateArea,
    deleteArea,
    restaurantId: targetRestaurantId,
  };
}
