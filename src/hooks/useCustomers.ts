import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, setDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from './useAuth';
import { useTenantSafe } from './useTenant';
import { Customer, DEFAULT_RESTAURANT_ID } from '../types';
import { doesUserBelongToRestaurant, isUserSuperAdmin, normalizeTenantIdentifier } from '../lib/permissions';

const generateFriendlyId = (text: string) => {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

const deleteCustomerAuth = async (id: string, restaurantId: string) => {
  try {
    const custDoc = await getDoc(doc(db, 'customers', id));
    if (custDoc.exists()) {
      const data = custDoc.data();
      if (data.authUid || data.email) {
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (auth.currentUser) {
            const token = await auth.currentUser.getIdToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;
          }
          await fetch('/api/admin/delete-user', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              uid: data.authUid || null,
              email: data.email || null,
              restaurantId,
              isCustomerDelete: true
            })
          });
        } catch (e) {
          console.error('Error deleting customer auth:', e);
        }
      }
    }
  } catch (err) {
    console.error('Error checking auth for customer:', err);
  }
};

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isStaff, isAdmin, loading: authLoading } = useAuth();
  const tenant = useTenantSafe();

  const routeSlugMatch = typeof window !== 'undefined' ? window.location.pathname.match(/^\/r\/([a-zA-Z0-9_-]+)/) : null;
  const activeRouteSlug = routeSlugMatch && routeSlugMatch[1] ? normalizeTenantIdentifier(routeSlugMatch[1]) : null;

  const targetRestaurantId = useMemo(() => {
    if (activeRouteSlug) {
      if (tenant?.tenant && normalizeTenantIdentifier(tenant.tenant.slug) === activeRouteSlug) {
        return normalizeTenantIdentifier(tenant.tenant.id);
      }
      return activeRouteSlug;
    }
    if (tenant?.targetRestaurantId) {
      return normalizeTenantIdentifier(tenant.targetRestaurantId);
    }
    if (user && !isUserSuperAdmin(user)) {
      const userRest = user.restaurantId || (user.restaurantIds && user.restaurantIds[0]);
      if (userRest) return normalizeTenantIdentifier(userRest);
    }
    return DEFAULT_RESTAURANT_ID;
  }, [activeRouteSlug, tenant?.tenant, tenant?.targetRestaurantId, user]);

  const isAuthorizedForCurrentRestaurant = useMemo(() => {
    if (!user || (!isStaff && !isAdmin)) return false;
    if (isUserSuperAdmin(user)) return true;
    return doesUserBelongToRestaurant(user, targetRestaurantId, tenant?.tenant);
  }, [user, isStaff, isAdmin, targetRestaurantId, tenant?.tenant]);

  const isDefaultTenant = useMemo(() => {
    const norm = normalizeTenantIdentifier(targetRestaurantId);
    return (norm === 'main' || norm === 'default-restaurant' || norm === 'dinemaster-bistro') &&
      (!activeRouteSlug || activeRouteSlug === 'main' || activeRouteSlug === 'default-restaurant' || activeRouteSlug === 'dinemaster-bistro');
  }, [targetRestaurantId, activeRouteSlug]);

  const matchesTenant = useCallback((cRestId?: string | null) => {
    const normC = normalizeTenantIdentifier(cRestId);
    const normT = normalizeTenantIdentifier(targetRestaurantId);
    if (!normC) return isDefaultTenant;
    if (normC === normT) return true;
    if (activeRouteSlug && normC === activeRouteSlug) return true;
    if (tenant?.tenant) {
      if (normC === normalizeTenantIdentifier(tenant.tenant.id) || normC === normalizeTenantIdentifier(tenant.tenant.slug)) {
        return true;
      }
    }
    if (isDefaultTenant && (normC === 'main' || normC === 'default-restaurant' || normC === 'dinemaster-bistro')) {
      return true;
    }
    return false;
  }, [targetRestaurantId, activeRouteSlug, tenant?.tenant, isDefaultTenant]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthorizedForCurrentRestaurant) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    // Query-level multi-tenant isolation
    const customersQuery = isDefaultTenant
      ? query(collection(db, 'customers'))
      : query(
          collection(db, 'customers'),
          where('restaurantId', '==', targetRestaurantId)
        );

    const unsubscribe = onSnapshot(customersQuery, (snapshot) => {
      clearTimeout(safetyTimer);
      const customersData = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Customer))
        .filter(c => matchesTenant(c.restaurantId));
      setCustomers(customersData);
      setLoading(false);
    }, (error) => {
      clearTimeout(safetyTimer);
      console.error('Error in customers listener:', error);
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, [authLoading, isAuthorizedForCurrentRestaurant, isDefaultTenant, targetRestaurantId, matchesTenant]);

  const activeCustomers = customers.filter(c => !c.isDeleted && !c.isHistory);
  const deletedCustomers = customers.filter(c => c.isDeleted && !c.isHistory);
  const historyCustomers = customers.filter(c => c.isHistory);

  const addCustomer = async (customer: Omit<Customer, 'id'>) => {
    if (!isAuthorizedForCurrentRestaurant) {
      throw new Error('Access denied: You are not authorized to add customers to this restaurant.');
    }

    if (customer.email && customer.email.trim() !== '') {
      const emailLower = customer.email.trim().toLowerCase();
      const existing = activeCustomers.find(c => c.email?.trim().toLowerCase() === emailLower);
      if (existing) {
        throw new Error("A customer with this email already exists in this restaurant.");
      }
      
      const qCust = query(
        collection(db, 'customers'),
        where('email', '==', emailLower)
      );
      const snapCust = await getDocs(qCust);
      const hasConflict = snapCust.docs.some(docSnap => {
        const d = docSnap.data();
        return matchesTenant(d.restaurantId);
      });
      if (hasConflict) {
        throw new Error("A customer with this email already exists in this restaurant.");
      }
    }
    const cleanCustomer = Object.fromEntries(
      Object.entries(customer).filter(([_, v]) => v !== undefined)
    );
    
    let friendlyId = cleanCustomer.email ? generateFriendlyId(String(cleanCustomer.email).split('@')[0]) : (cleanCustomer.phone ? generateFriendlyId(String(cleanCustomer.phone)) : 'customer');
    if (!friendlyId) friendlyId = 'customer';
    friendlyId += '-' + Math.random().toString(36).substring(2, 6);
    
    await setDoc(doc(db, 'customers', friendlyId), { 
      ...cleanCustomer, 
      id: friendlyId,
      restaurantId: targetRestaurantId,
      createdAt: new Date().toISOString().split('T')[0] 
    });
  };

  const updateCustomer = async (id: string, customer: Partial<Customer>) => {
    if (!isAuthorizedForCurrentRestaurant) {
      throw new Error('Access denied: You are not authorized to update customers in this restaurant.');
    }
    const existingCust = customers.find(c => c.id === id);
    if (!existingCust || !matchesTenant(existingCust.restaurantId)) {
      throw new Error(`Unauthorized: Customer ${id} does not belong to the current restaurant.`);
    }

    if (customer.email && customer.email.trim() !== '') {
      const emailLower = customer.email.trim().toLowerCase();
      const existing = activeCustomers.find(c => c.email?.trim().toLowerCase() === emailLower && c.id !== id);
      if (existing) {
        throw new Error("A customer with this email already exists in this restaurant.");
      }

      const qCust = query(
        collection(db, 'customers'),
        where('email', '==', emailLower)
      );
      const snapCust = await getDocs(qCust);
      let isDuplicate = false;
      snapCust.docs.forEach(docSnap => {
        if (docSnap.id !== id) {
          const d = docSnap.data();
          if (matchesTenant(d.restaurantId)) isDuplicate = true;
        }
      });
      if (isDuplicate) {
        throw new Error("A customer with this email already exists in this restaurant.");
      }
    }
    const cleanCustomer = Object.fromEntries(
      Object.entries(customer).filter(([_, v]) => v !== undefined)
    );
    cleanCustomer.restaurantId = targetRestaurantId;

    await updateDoc(doc(db, 'customers', id), cleanCustomer);
  };

  const deleteCustomer = async (id: string, soft: boolean = true) => {
    if (!isAuthorizedForCurrentRestaurant) {
      throw new Error('Access denied.');
    }
    const existingCust = customers.find(c => c.id === id);
    if (!existingCust || !matchesTenant(existingCust.restaurantId)) {
      throw new Error(`Unauthorized: Customer ${id} does not belong to the current restaurant.`);
    }

    if (soft) {
      await updateDoc(doc(db, 'customers', id), { isDeleted: true });
    } else {
      await deleteCustomerAuth(id, targetRestaurantId);
      await deleteDoc(doc(db, 'customers', id));
    }
  };

  const restoreCustomer = async (id: string) => {
    if (!isAuthorizedForCurrentRestaurant) throw new Error('Access denied.');
    const existingCust = customers.find(c => c.id === id);
    if (!existingCust || !matchesTenant(existingCust.restaurantId)) {
      throw new Error(`Unauthorized: Customer ${id} does not belong to the current restaurant.`);
    }
    await updateDoc(doc(db, 'customers', id), { isDeleted: false, isHistory: false });
  };

  const moveToHistoryCustomer = async (id: string) => {
    if (!isAuthorizedForCurrentRestaurant) throw new Error('Access denied.');
    const existingCust = customers.find(c => c.id === id);
    if (!existingCust || !matchesTenant(existingCust.restaurantId)) {
      throw new Error(`Unauthorized: Customer ${id} does not belong to the current restaurant.`);
    }
    await updateDoc(doc(db, 'customers', id), { isHistory: true });
  };

  const bulkMoveToHistoryCustomers = async (ids: string[]) => {
    if (!isAuthorizedForCurrentRestaurant) throw new Error('Access denied.');
    await Promise.all(ids.map(id => {
      const existingCust = customers.find(c => c.id === id);
      if (!existingCust || !matchesTenant(existingCust.restaurantId)) throw new Error(`Unauthorized customer ${id}`);
      return updateDoc(doc(db, 'customers', id), { isHistory: true });
    }));
  };

  const forceDeleteCustomer = async (id: string) => {
    if (!isAuthorizedForCurrentRestaurant) throw new Error('Access denied.');
    const existingCust = customers.find(c => c.id === id);
    if (!existingCust || !matchesTenant(existingCust.restaurantId)) {
      throw new Error(`Unauthorized: Customer ${id} does not belong to the current restaurant.`);
    }
    await deleteCustomerAuth(id, targetRestaurantId);
    await deleteDoc(doc(db, 'customers', id));
  };

  const bulkForceDeleteCustomers = async (ids: string[]) => {
    if (!isAuthorizedForCurrentRestaurant) throw new Error('Access denied.');
    await Promise.all(ids.map(async (id) => {
      const existingCust = customers.find(c => c.id === id);
      if (!existingCust || !matchesTenant(existingCust.restaurantId)) throw new Error(`Unauthorized customer ${id}`);
      await deleteCustomerAuth(id, targetRestaurantId);
      await deleteDoc(doc(db, 'customers', id));
    }));
  };

  const bulkRestoreCustomers = async (ids: string[]) => {
    if (!isAuthorizedForCurrentRestaurant) throw new Error('Access denied.');
    await Promise.all(ids.map(id => {
      const existingCust = customers.find(c => c.id === id);
      if (!existingCust || !matchesTenant(existingCust.restaurantId)) throw new Error(`Unauthorized customer ${id}`);
      return updateDoc(doc(db, 'customers', id), { isDeleted: false, isHistory: false });
    }));
  };

  return { 
    customers: activeCustomers, 
    allCustomers: customers,
    deletedCustomers,
    loading, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer,
    restoreCustomer,
    forceDeleteCustomer,
    bulkForceDeleteCustomers,
    moveToHistoryCustomer,
    bulkMoveToHistoryCustomers,
    historyCustomers,
    bulkRestoreCustomers
  };
}
