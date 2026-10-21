import React, { useEffect, useRef, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { useTenantSafe } from '../hooks/useTenant';
import { useNotifications } from '../hooks/useNotifications';
import { useSettings } from '../hooks/useSettings';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Reservation, DEFAULT_RESTAURANT_ID } from '../types';
import { doesUserBelongToRestaurant, normalizeTenantIdentifier } from '../lib/permissions';

export const BookingNotificationListener: React.FC = () => {
  const { user, isStaff, isAdmin, isSuperAdmin } = useAuth();
  const tenant = useTenantSafe();
  const location = useLocation();
  const { setHasNewBookings, addNotificationBooking } = useNotifications();
  const { settings } = useSettings();
  const isInitialLoad = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listenerStartTime = useRef<number>(Date.now());
  const silentBellRef = useRef(false);

  const targetRestaurantId = useMemo(() => {
    const match = location.pathname.match(/^\/r\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return normalizeTenantIdentifier(match[1]);
    }
    if (tenant?.targetRestaurantId) {
      return normalizeTenantIdentifier(tenant.targetRestaurantId);
    }
    if (!isSuperAdmin && user?.restaurantId) {
      return normalizeTenantIdentifier(user.restaurantId);
    }
    return '';
  }, [location.pathname, tenant?.targetRestaurantId, isSuperAdmin, user?.restaurantId]);

  useEffect(() => {
    silentBellRef.current = !!settings?.silentBell;
  }, [settings?.silentBell]);

  useEffect(() => {
    isInitialLoad.current = true;
    listenerStartTime.current = Date.now();
    
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.5;

    // Only listen if staff or admin on management routes for their own restaurant
    if (!isStaff && !isAdmin) return;
    const isManagementView =
      location.pathname.startsWith('/admin') ||
      location.pathname.includes('/admin') ||
      location.pathname.includes('/staff');
    if (!isManagementView || !targetRestaurantId) return;

    if (!isSuperAdmin && !doesUserBelongToRestaurant(user, targetRestaurantId, tenant?.tenant)) {
      return;
    }

    const isDefault = targetRestaurantId === DEFAULT_RESTAURANT_ID || targetRestaurantId === 'main';
    const q = query(
      collection(db, 'reservations'),
      where('restaurantId', '==', targetRestaurantId),
      orderBy('createdAt', 'desc'),
      limit(15)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const reservation = { id: change.doc.id, ...data } as Reservation;
          
          const resRestId = normalizeTenantIdentifier(reservation.restaurantId);
          const isTenantMatch = isDefault
            ? (resRestId === DEFAULT_RESTAURANT_ID || resRestId === 'main')
            : resRestId === targetRestaurantId;
          if (!isTenantMatch) return;

          if (reservation.source !== 'public') return;
          
          let createdAtMs = 0;
          if (data.createdAt) {
            if (typeof data.createdAt.toMillis === 'function') {
              createdAtMs = data.createdAt.toMillis();
            } else {
              createdAtMs = new Date(data.createdAt).getTime();
            }
          } else {
            createdAtMs = Date.now();
          }

          if (createdAtMs > listenerStartTime.current - 5000) {
            setHasNewBookings(true);
            addNotificationBooking(reservation);

            if (audioRef.current && !silentBellRef.current) {
              audioRef.current.play().catch(err => console.error('Error playing notification sound:', err));
            }

            const dateStr = reservation.date;
            let dayName = '';
            try {
              const dateObj = new Date(dateStr);
              dayName = dateObj.toLocaleDateString(undefined, { weekday: 'long' });
            } catch (e) {
              dayName = dateStr;
            }

            toast.success(`New booking: ${reservation.customerName} for ${dayName} (${dateStr})`, {
              duration: 8000,
              icon: '🔔',
              style: {
                borderRadius: '12px',
                background: '#fff',
                color: '#1a1a1a',
                border: '1px solid #e5e7eb',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                fontWeight: 'bold',
              },
            });
          }
        }
      });
    }, (error) => {
      console.error("Error listening to reservations:", error);
    });

    return () => unsubscribe();
  }, [isStaff, isAdmin, isSuperAdmin, user, tenant?.tenant, location.pathname, targetRestaurantId]);

  return null;
};
