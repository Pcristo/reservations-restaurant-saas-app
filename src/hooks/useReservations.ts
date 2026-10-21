import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, query, where, getDoc, getDocs, setDoc, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Reservation } from '../types';
import { format, addDays } from 'date-fns';
import { APP_CONFIG } from '../data/appConfig';
import { getEffectiveOpeningHours } from '../lib/utils';
import { useTenantSafe } from './useTenant';
import { useAuth } from './useAuth';
import { DEFAULT_RESTAURANT_ID } from '../services/tenantService';
import { doesUserBelongToRestaurant, isUserSuperAdmin, normalizeTenantIdentifier, isCustomerRole } from '../lib/permissions';
import {
  doesReservationCountTowardsQuota,
  calculateMonthlyBookingUsage,
  isPackageFeatureEnabled,
  MonthlyBookingUsageSummary,
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

export interface UseReservationsOptions {
  date?: string;
  startDate?: string;
  endDate?: string;
  includeAll?: boolean;
  restaurantId?: string;
}

export function useReservations(options?: UseReservationsOptions) {
  const tenantCtx = useTenantSafe();
  const { user } = useAuth();
  const activeRestaurant = tenantCtx?.tenant;
  const isSuperAdmin = isUserSuperAdmin(user) || Boolean(tenantCtx?.isSuperAdmin);

  const routeSlugMatch = typeof window !== 'undefined' ? window.location.pathname.match(/^\/r\/([a-zA-Z0-9_-]+)/) : null;
  const activeRouteSlug = routeSlugMatch && routeSlugMatch[1] ? normalizeTenantIdentifier(routeSlugMatch[1]) : null;
  const isAdminOrStaffRoute = typeof window !== 'undefined' && (
    window.location.pathname.includes('/admin') || window.location.pathname.includes('/staff')
  );

  // Resolve target restaurant ID strictly: staff/admins cannot override to another restaurant
  const targetRestaurantId = useMemo(() => {
    if (options?.restaurantId) {
      const normOpt = normalizeTenantIdentifier(options.restaurantId);
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
  }, [options?.restaurantId, activeRouteSlug, activeRestaurant, tenantCtx?.targetRestaurantId, isSuperAdmin, user]);

  // Verify whether current user is authorized when on an admin/staff route
  const isAuthorizedForCurrentContext = useMemo(() => {
    if (!isAdminOrStaffRoute) return true; // Public booking or customer views
    if (!user) return false;
    if (isSuperAdmin) return true;
    return doesUserBelongToRestaurant(user, targetRestaurantId, activeRestaurant);
  }, [isAdminOrStaffRoute, user, isSuperAdmin, targetRestaurantId, activeRestaurant]);

  const isDefaultTenant = useMemo(() => {
    const norm = normalizeTenantIdentifier(targetRestaurantId);
    return (norm === 'main' || norm === 'default-restaurant' || norm === 'dinemaster-bistro') &&
      (!activeRouteSlug || activeRouteSlug === 'main' || activeRouteSlug === 'default-restaurant' || activeRouteSlug === 'dinemaster-bistro');
  }, [targetRestaurantId, activeRouteSlug]);

  const matchesTenant = useCallback((rRestId?: string | null) => {
    const normR = normalizeTenantIdentifier(rRestId);
    const normT = normalizeTenantIdentifier(targetRestaurantId);
    if (!normR) return isDefaultTenant;
    if (normR === normT) return true;
    if (activeRouteSlug && normR === activeRouteSlug) return true;
    if (activeRestaurant) {
      if (normR === normalizeTenantIdentifier(activeRestaurant.id) || normR === normalizeTenantIdentifier(activeRestaurant.slug)) {
        return true;
      }
    }
    if (isDefaultTenant && (normR === 'main' || normR === 'default-restaurant' || normR === 'dinemaster-bistro')) {
      return true;
    }
    return false;
  }, [targetRestaurantId, activeRouteSlug, activeRestaurant, isDefaultTenant]);

  const [operationalRes, setOperationalRes] = useState<Reservation[]>([]);
  const [onDemandRes, setOnDemandRes] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  // 1. Continuous synchronization of today's and tomorrow's reservations (operational cache)
  useEffect(() => {
    if (!isAuthorizedForCurrentContext) {
      setOperationalRes([]);
      setLoading(false);
      return;
    }

    const safetyTimer = setTimeout(() => {
      if (!options?.date && !options?.startDate && !options?.endDate && !options?.includeAll) {
        setLoading(false);
      }
    }, 1000);

    const q = query(
      collection(db, 'reservations'),
      where('date', 'in', [todayStr, tomorrowStr])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      clearTimeout(safetyTimer);
      const data = snapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Reservation))
        .filter(r => matchesTenant(r.restaurantId));
      setOperationalRes(data);
      if (!options?.date && !options?.startDate && !options?.endDate && !options?.includeAll) {
        setLoading(false);
      }
    }, (error) => {
      clearTimeout(safetyTimer);
      console.error('Error in operational reservations sync:', error);
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, [todayStr, tomorrowStr, targetRestaurantId, isAuthorizedForCurrentContext, matchesTenant, options?.date, options?.startDate, options?.endDate, options?.includeAll]);

  // 2. On-demand query based on requested date/range or includeAll option
  useEffect(() => {
    const hasOnDemand = options?.date || options?.startDate || options?.endDate || options?.includeAll;
    if (!hasOnDemand || !isAuthorizedForCurrentContext) {
      setOnDemandRes([]);
      return;
    }

    setLoading(true);
    const onDemandTimer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    let q;
    if (options?.includeAll) {
      q = query(collection(db, 'reservations'), limit(500));
    } else if (options?.startDate && options?.endDate) {
      q = query(
        collection(db, 'reservations'),
        where('date', '>=', options.startDate),
        where('date', '<=', options.endDate)
      );
    } else if (options?.date) {
      q = query(
        collection(db, 'reservations'),
        where('date', '==', options.date)
      );
    } else {
      clearTimeout(onDemandTimer);
      setOnDemandRes([]);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      clearTimeout(onDemandTimer);
      const data = snapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Reservation))
        .filter(r => matchesTenant(r.restaurantId));
      setOnDemandRes(data);
      setLoading(false);
    }, (error) => {
      clearTimeout(onDemandTimer);
      setLoading(false);
      console.warn('[useReservations] On-demand reservations sync notice:', error);
    });

    return () => {
      clearTimeout(onDemandTimer);
      unsubscribe();
    };
  }, [targetRestaurantId, isAuthorizedForCurrentContext, matchesTenant, options?.date, options?.startDate, options?.endDate, options?.includeAll]);

  // Combine both arrays, removing duplicates by reservation ID
  const reservations = useMemo(() => {
    if (!isAuthorizedForCurrentContext) return [];
    const mergedMap = new Map<string, Reservation>();
    operationalRes.forEach(r => mergedMap.set(r.id, r));
    onDemandRes.forEach(r => mergedMap.set(r.id, r));
    return Array.from(mergedMap.values());
  }, [operationalRes, onDemandRes, isAuthorizedForCurrentContext]);

  const activeReservations = reservations.filter(r => !r.isDeleted && !r.isHistory && r.status !== 'history');
  const deletedReservations = reservations.filter(r => r.isDeleted && !r.isHistory && r.status !== 'history');
  const historyReservations = reservations.filter(r => r.isHistory || r.status === 'history');

  const autoUnblockTable = async (res: Reservation) => {
    if (!res.tableId || !res.date) return;
    try {
      const tableRef = doc(db, 'tables', res.tableId);
      const tableSnap = await getDoc(tableRef);
      if (tableSnap.exists()) {
        const tableData = tableSnap.data();
        if (tableData.restaurantId && !matchesTenant(tableData.restaurantId)) {
          return;
        }
        const blockedDates = { ...(tableData.blockedDates || {}) };
        const dateRecord = { ...(blockedDates[res.date] || {}) };
        
        let sessionKey = 'general';
        try {
          const settingsRef = doc(db, 'settings', targetRestaurantId);
          const settingsSnap = await getDoc(settingsRef);
          if (settingsSnap.exists()) {
            const settings = settingsSnap.data();
            const eff = getEffectiveOpeningHours(res.date, settings as any);
            const lunch = eff.lunch;
            const dinner = eff.dinner;

            if (lunch?.active && res.time >= lunch.open && res.time < lunch.close) {
              sessionKey = 'lunch';
            } else if (dinner?.active && res.time >= dinner.open && res.time < dinner.close) {
              sessionKey = 'dinner';
            }
          }
        } catch (e) {
          console.error("Error fetching settings for auto-unblock session resolution:", e);
        }

        dateRecord[sessionKey] = false;
        dateRecord['default'] = false;
        dateRecord['general'] = false;
        
        const hasActiveBlock = Object.values(dateRecord).some(val => val === true);
        if (!hasActiveBlock) {
          delete blockedDates[res.date];
        } else {
          blockedDates[res.date] = dateRecord;
        }

        await updateDoc(tableRef, { blockedDates });
      }
    } catch (err) {
      console.error("Error auto-unblocking table:", err);
    }
  };

  const addReservation = async (reservation: Omit<Reservation, 'id'>) => {
    if (isAdminOrStaffRoute && !isAuthorizedForCurrentContext) {
      throw new Error('Access denied: You are not authorized to create reservations for this restaurant.');
    }

    // 1. Enforce Waitlist feature entitlement
    if (reservation.status === 'waiting-list') {
      if (!isPackageFeatureEnabled(tenantCtx?.entitlements, 'waitlist')) {
        throw new Error(
          'Waitlist Management is not included in your restaurant\'s current subscription package. Please upgrade your package to enable waitlists.'
        );
      }
    }

    // 2. Enforce Monthly Bookings package allowance for qualifying bookings
    if (doesReservationCountTowardsQuota(reservation)) {
      const usage = calculateMonthlyBookingUsage(
        reservations,
        tenantCtx?.entitlements,
        tenantCtx?.tenant?.subscription,
        reservation.date ? new Date(reservation.date) : new Date()
      );
      if (usage.isAtLimit) {
        throw new Error(
          `Monthly booking quota of ${usage.limit} reservations reached for the current billing period (${usage.periodStart} to ${usage.periodEnd}). Please upgrade your subscription package to allow additional bookings.`
        );
      }
    }

    let enableBookingNumber = true;
    let restaurantName = APP_CONFIG.appName;
    let bookingNumberPrefix = '';
    let bookingNumberResetDate: string | undefined = undefined;
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', targetRestaurantId));
      if (settingsDoc.exists()) {
        const settingsData = settingsDoc.data();
        if (settingsData.enableBookingNumber !== undefined) {
          enableBookingNumber = settingsData.enableBookingNumber;
        }
        if (settingsData.bookingNumberPrefix) {
          bookingNumberPrefix = settingsData.bookingNumberPrefix;
        }
        if (settingsData.bookingNumberResetDate) {
          bookingNumberResetDate = settingsData.bookingNumberResetDate;
        }
        if (settingsData.name) {
          restaurantName = settingsData.name;
        } else if (settingsData.restaurantName) {
          restaurantName = settingsData.restaurantName;
        }
      }
    } catch (e) {
      console.error("Error fetching settings for booking number check:", e);
    }

    let bookingNumber: string | undefined = undefined;

    if (enableBookingNumber) {
      let prefix = '';
      if (bookingNumberPrefix && bookingNumberPrefix.trim().length > 0) {
        prefix = bookingNumberPrefix.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      } else {
        const words = restaurantName.split(/[\s_\-]+/);
        const ignoredWords = ['the', 'restaurant', 'restaurante', 'o', 'a', 'os', 'as', 'pro', 'dine', 'master'];
        
        const filteredWords = words.filter(w => {
          const cleanW = w.replace(/[^a-zA-Z]/g, '');
          return !ignoredWords.includes(cleanW.toLowerCase()) && cleanW.length > 0;
        });
        
        const targetWord = filteredWords.length > 0 ? filteredWords[0] : (words[0] || 'Nortada');
        const cleanName = targetWord.replace(/[^a-zA-Z]/g, '').toUpperCase();
        prefix = cleanName.substring(0, 3);
      }
      while (prefix.length < 3) {
        prefix += 'X';
      }

      const dateParts = reservation.date ? reservation.date.split('-') : [];
      const year = dateParts[0] || new Date().getFullYear().toString();
      const month = dateParts[1] || String(new Date().getMonth() + 1).padStart(2, '0');
      const yearLastTwo = year.substring(year.length - 2);

      let nextNum = 1;
      try {
        let q;
        if (isDefaultTenant) {
          q = query(
            collection(db, 'reservations'),
            where('date', '>=', `${year}-01-01`),
            where('date', '<=', `${year}-12-31`)
          );
        } else {
          q = query(
            collection(db, 'reservations'),
            where('restaurantId', '==', targetRestaurantId),
            where('date', '>=', `${year}-01-01`),
            where('date', '<=', `${year}-12-31`)
          );
        }
        
        const querySnapshot = await getDocs(q);
        let maxNum = 0;
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          if (!matchesTenant(data.restaurantId)) return;
          if (bookingNumberResetDate && data.createdAt && data.createdAt < bookingNumberResetDate) {
            return;
          }
          if (data.bookingNumber) {
            const parts = data.bookingNumber.split('-');
            if (parts.length > 0) {
              const lastPart = parts[parts.length - 1];
              const num = parseInt(lastPart, 10);
              if (!isNaN(num) && num > maxNum) {
                maxNum = num;
              }
            }
          }
        });
        nextNum = maxNum + 1;
      } catch (e) {
        console.error("Error generating booking number:", e);
      }
      bookingNumber = `${prefix}-RES-${month}-${yearLastTwo}-${String(nextNum).padStart(6, '0')}`;
    }

    let reminderEmail = { scheduled: false, scheduledFor: null as string | null, sent: false };
    if (reservation.date && reservation.time) {
       try {
         const resDate = new Date(`${reservation.date}T${reservation.time}:00`);
         const reminderDate = new Date(resDate.getTime() - 24 * 60 * 60 * 1000);
         reminderEmail = {
           scheduled: true,
           scheduledFor: reminderDate.toISOString(),
           sent: false
         };
       } catch (e) {
         console.error('Error calculating reminder date:', e);
       }
    }

    const cleanReservation = Object.fromEntries(
      Object.entries(reservation).filter(([_, v]) => v !== undefined)
    );
    cleanReservation.reminderEmail = reminderEmail;

    let friendlyId = 'res-' + reservation.date + '-' + (reservation.customerName ? generateFriendlyId(reservation.customerName).substring(0, 15) : 'walkin');
    friendlyId += '-' + Math.random().toString(36).substring(2, 6);

    await setDoc(doc(db, 'reservations', friendlyId), {
      ...cleanReservation,
      id: friendlyId,
      restaurantId: targetRestaurantId,
      ...(bookingNumber ? { bookingNumber } : {}),
      createdAt: new Date().toISOString()
    });
    return { id: friendlyId, bookingNumber };
  };

  const updateReservation = async (id: string, reservation: Partial<Reservation>) => {
    if (isAdminOrStaffRoute && !isAuthorizedForCurrentContext) {
      throw new Error('Access denied: You are not authorized to update reservations for this restaurant.');
    }

    // IDOR Protection: verify reservation belongs to current restaurant
    let res = reservations.find(r => r.id === id);
    
    if (!res) {
      try {
        const snap = await getDoc(doc(db, 'reservations', id));
        if (snap.exists()) {
          res = { id: snap.id, ...snap.data() } as Reservation;
        }
      } catch (e) {
        console.warn("Notice checking reservation for IDOR check:", e);
      }
    }

    const isEmailUpdateOnly = Object.keys(reservation).every(k => k === 'confirmationEmail' || k === 'reminderEmail');

    if (!res && !isEmailUpdateOnly) {
      throw new Error(`Unauthorized: Reservation ${id} not found.`);
    }

    if (res) {
      if (!matchesTenant(res.restaurantId) && !isEmailUpdateOnly) {
        throw new Error(`Unauthorized: Reservation ${id} does not belong to the current restaurant.`);
      }
    }

    const { id: _, ...data } = reservation as any;

    // Enforce Waitlist feature entitlement on update
    if (data.status === 'waiting-list') {
      if (!isPackageFeatureEnabled(tenantCtx?.entitlements, 'waitlist')) {
        throw new Error(
          'Waitlist Management is not included in your restaurant\'s current subscription package. Please upgrade your package to enable waitlists.'
        );
      }
    }

    // Enforce Monthly Bookings package allowance if transitioning from non-qualifying to qualifying status
    if (
      res &&
      !doesReservationCountTowardsQuota(res) &&
      data.status &&
      doesReservationCountTowardsQuota({ ...res, ...data })
    ) {
      const usage = calculateMonthlyBookingUsage(
        reservations,
        tenantCtx?.entitlements,
        tenantCtx?.tenant?.subscription,
        (data.date || res.date) ? new Date(data.date || res.date) : new Date()
      );
      if (usage.isAtLimit) {
        throw new Error(
          `Monthly booking quota of ${usage.limit} reservations reached for the current billing period (${usage.periodStart} to ${usage.periodEnd}). Please upgrade your subscription package to allow additional bookings.`
        );
      }
    }
    
    if (res && data.status === 'cancelled') {
      await autoUnblockTable(res);
    }
    
    if (data.date || data.time) {
      const newDate = data.date || res?.date;
      const newTime = data.time || res?.time;
      if (newDate && newTime) {
        try {
          const resDate = new Date(`${newDate}T${newTime}:00`);
          const reminderDate = new Date(resDate.getTime() - 24 * 60 * 60 * 1000);
          data.reminderEmail = {
            ...(res?.reminderEmail || {}),
            scheduled: true,
            scheduledFor: reminderDate.toISOString(),
          };
        } catch (e) {}
      }
    }
    
    if (data.status === 'cancelled') {
       if (res?.reminderEmail) {
          data.reminderEmail = {
            ...res.reminderEmail,
            scheduled: false,
            sent: false
          };
       }
    }

    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );
    if (!isEmailUpdateOnly && data.status !== 'cancelled' && !res?.restaurantId) {
      cleanData.restaurantId = targetRestaurantId;
    }

    await updateDoc(doc(db, 'reservations', id), cleanData);
  };

  const deleteReservation = async (id: string, soft: boolean = true) => {
    if (!isAuthorizedForCurrentContext) {
      throw new Error('Access denied: You are not authorized to delete reservations for this restaurant.');
    }
    const res = reservations.find(r => r.id === id);
    if (!res || !matchesTenant(res.restaurantId)) {
      throw new Error(`Unauthorized: Reservation ${id} does not belong to the current restaurant.`);
    }
    await autoUnblockTable(res);
    if (soft) {
      await updateDoc(doc(db, 'reservations', id), { isDeleted: true });
    } else {
      await deleteDoc(doc(db, 'reservations', id));
    }
  };

  const restoreReservation = async (id: string) => {
    if (!isAuthorizedForCurrentContext) {
      throw new Error('Access denied.');
    }
    const res = reservations.find(r => r.id === id);
    if (!res || !matchesTenant(res.restaurantId)) {
      throw new Error(`Unauthorized: Reservation ${id} does not belong to the current restaurant.`);
    }
    await updateDoc(doc(db, 'reservations', id), { isDeleted: false, isHistory: false });
  };

  const bulkRestoreReservations = async (ids: string[]) => {
    if (!isAuthorizedForCurrentContext) throw new Error('Access denied.');
    await Promise.all(ids.map(id => {
      const res = reservations.find(r => r.id === id);
      if (!res || !matchesTenant(res.restaurantId)) throw new Error(`Unauthorized reservation ${id}`);
      return updateDoc(doc(db, 'reservations', id), { isDeleted: false, isHistory: false });
    }));
  };

  const moveToHistoryReservation = async (id: string) => {
    if (!isAuthorizedForCurrentContext) throw new Error('Access denied.');
    const res = reservations.find(r => r.id === id);
    if (!res || !matchesTenant(res.restaurantId)) {
      throw new Error(`Unauthorized: Reservation ${id} does not belong to the current restaurant.`);
    }
    await updateDoc(doc(db, 'reservations', id), { isHistory: true });
  };

  const bulkMoveToHistoryReservations = async (ids: string[]) => {
    if (!isAuthorizedForCurrentContext) throw new Error('Access denied.');
    await Promise.all(ids.map(id => {
      const res = reservations.find(r => r.id === id);
      if (!res || !matchesTenant(res.restaurantId)) throw new Error(`Unauthorized reservation ${id}`);
      return updateDoc(doc(db, 'reservations', id), { isHistory: true });
    }));
  };

  const forceDeleteReservation = async (id: string) => {
    if (!isAuthorizedForCurrentContext) throw new Error('Access denied.');
    const res = reservations.find(r => r.id === id);
    if (!res || !matchesTenant(res.restaurantId)) {
      throw new Error(`Unauthorized: Reservation ${id} does not belong to the current restaurant.`);
    }
    await deleteDoc(doc(db, 'reservations', id));
  };

  const bulkForceDeleteReservations = async (ids: string[]) => {
    if (!isAuthorizedForCurrentContext) throw new Error('Access denied.');
    await Promise.all(ids.map(id => {
      const res = reservations.find(r => r.id === id);
      if (!res || !matchesTenant(res.restaurantId)) throw new Error(`Unauthorized reservation ${id}`);
      return deleteDoc(doc(db, 'reservations', id));
    }));
  };

  // Live booking usage for current tenant and billing cycle
  const bookingUsage: MonthlyBookingUsageSummary = useMemo(() => {
    return calculateMonthlyBookingUsage(
      reservations,
      tenantCtx?.entitlements,
      tenantCtx?.tenant?.subscription
    );
  }, [reservations, tenantCtx?.entitlements, tenantCtx?.tenant?.subscription]);

  return { 
    reservations: activeReservations, 
    allReservations: reservations,
    deletedReservations, 
    loading, 
    bookingUsage,
    addReservation, 
    updateReservation, 
    deleteReservation, 
    restoreReservation, 
    bulkRestoreReservations,
    forceDeleteReservation,
    bulkForceDeleteReservations,
    moveToHistoryReservation,
    bulkMoveToHistoryReservations,
    historyReservations
  };
}
