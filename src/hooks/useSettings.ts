import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, onSnapshot, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { RestaurantSettings } from '../types';
import { DEFAULT_SETTINGS, APP_CONFIG } from '../constants';
import { useTenantSafe } from './useTenant';
import { useAuth } from './useAuth';
import { DEFAULT_RESTAURANT_ID } from '../services/tenantService';
import { canManageRestaurant, isUserSuperAdmin, normalizeTenantIdentifier, isCustomerRole } from '../lib/permissions';

export function useSettings(restaurantIdOverride?: string) {
  const tenantCtx = useTenantSafe();
  const { user } = useAuth();
  const activeRestaurant = tenantCtx?.tenant;

  // Resolve target restaurant ID strictly: explicit override -> URL route slug -> current tenant -> user's assigned restaurant
  const targetRestaurantId = useMemo(() => {
    let resolved = restaurantIdOverride ? normalizeTenantIdentifier(restaurantIdOverride) : '';

    if (!resolved && typeof window !== 'undefined') {
      const match = window.location.pathname.match(/^\/r\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        resolved = normalizeTenantIdentifier(match[1]);
      }
    }

    if (resolved && activeRestaurant) {
      if (normalizeTenantIdentifier(activeRestaurant.slug) === resolved) {
        return normalizeTenantIdentifier(activeRestaurant.id);
      }
      if (normalizeTenantIdentifier(activeRestaurant.id) === resolved) {
        return normalizeTenantIdentifier(activeRestaurant.id);
      }
    }

    if (resolved) return resolved;

    if (activeRestaurant?.id) return normalizeTenantIdentifier(activeRestaurant.id);
    if (tenantCtx?.targetRestaurantId) return normalizeTenantIdentifier(tenantCtx.targetRestaurantId);

    if (typeof window !== 'undefined' && (window.location.pathname.startsWith('/admin') || window.location.pathname.includes('/admin'))) {
      if (user && !isUserSuperAdmin(user) && !isCustomerRole(user.role)) {
        const userRest = user.restaurantId || (user.restaurantIds && user.restaurantIds[0]);
        if (userRest) return normalizeTenantIdentifier(userRest);
      }
      if (isUserSuperAdmin(user)) {
        const stored = localStorage.getItem('eata_active_restaurant_id') || localStorage.getItem('active_restaurant_id');
        if (stored) return normalizeTenantIdentifier(stored);
      }
    }
    return '';
  }, [restaurantIdOverride, activeRestaurant, tenantCtx?.targetRestaurantId, user]);

  const cacheKey = targetRestaurantId ? `cached_restaurant_settings_${targetRestaurantId}` : 'cached_restaurant_settings';

  // Default fallback seeded with active restaurant info or APP_CONFIG
  const fallbackSettings = useMemo<RestaurantSettings>(() => {
    const restaurantName = activeRestaurant?.name || DEFAULT_SETTINGS.name || APP_CONFIG.appName;
    const restaurantAddress = activeRestaurant?.address || DEFAULT_SETTINGS.address || APP_CONFIG.address;
    const restaurantPhone = activeRestaurant?.phone || DEFAULT_SETTINGS.phone || APP_CONFIG.phone;
    const restaurantEmail = activeRestaurant?.email || activeRestaurant?.ownerEmail || DEFAULT_SETTINGS.email || APP_CONFIG.email;
    const restaurantTimezone = activeRestaurant?.timezone || DEFAULT_SETTINGS.timezone || 'Europe/Dublin';
    const restaurantWebsite = (
      activeRestaurant?.website || 
      activeRestaurant?.settings?.websiteUrl || 
      DEFAULT_SETTINGS.websiteUrl || 
      (typeof window !== 'undefined' ? `${window.location.origin}/r/${activeRestaurant?.slug || targetRestaurantId}` : `https://${APP_CONFIG.companyName.toLowerCase()}.com`)
    ).trim();

    const isTargetActiveRestaurant = Boolean(
      targetRestaurantId && activeRestaurant && (
        normalizeTenantIdentifier(activeRestaurant.id) === targetRestaurantId ||
        normalizeTenantIdentifier(activeRestaurant.slug) === targetRestaurantId
      )
    );
    const maintenanceEnabled = isTargetActiveRestaurant ? Boolean(activeRestaurant?.maintenanceModeEnabled) : false;
    const maintenanceMessage = isTargetActiveRestaurant ? (activeRestaurant?.maintenanceMessage || '') : '';

    const existingRestSettings = isTargetActiveRestaurant && activeRestaurant?.settings ? activeRestaurant.settings : {};
    const existingBranding = activeRestaurant?.branding || {};
    const customFloorPlan = (
      existingRestSettings.floorPlanBgUrl ||
      (existingRestSettings as any)?.cloudinaryFloorPlanBgUrl ||
      existingBranding?.floorPlanBgUrl ||
      (activeRestaurant as any)?.floorPlanBgUrl ||
      (activeRestaurant as any)?.cloudinaryFloorPlanBgUrl ||
      DEFAULT_SETTINGS.floorPlanBgUrl ||
      ''
    ).trim();

    return {
      ...DEFAULT_SETTINGS,
      ...existingRestSettings,
      id: targetRestaurantId,
      restaurantId: targetRestaurantId,
      name: restaurantName,
      address: restaurantAddress,
      city: activeRestaurant?.city || 'Dublin',
      phone: restaurantPhone,
      email: restaurantEmail,
      timezone: restaurantTimezone,
      websiteUrl: restaurantWebsite,
      maintenanceModeEnabled: maintenanceEnabled,
      maintenanceMessage: maintenanceMessage,
      showFloorPlanBg: existingRestSettings.showFloorPlanBg !== undefined
        ? existingRestSettings.showFloorPlanBg
        : DEFAULT_SETTINGS.showFloorPlanBg,
      floorPlanBgUrl: customFloorPlan,
      cloudinaryFloorPlanBgUrl: customFloorPlan,
      useDefaultFloorPlanBg: existingRestSettings.useDefaultFloorPlanBg !== undefined
        ? existingRestSettings.useDefaultFloorPlanBg
        : (customFloorPlan ? false : DEFAULT_SETTINGS.useDefaultFloorPlanBg),
      floorPlanOpacity: typeof existingRestSettings.floorPlanOpacity === 'number'
        ? existingRestSettings.floorPlanOpacity
        : DEFAULT_SETTINGS.floorPlanOpacity,
      description: activeRestaurant?.seo?.metaDescription || `${restaurantName} is pleased to welcome you for an exceptional dining experience.`,
      descriptionEn: activeRestaurant?.seo?.metaDescription || `${restaurantName} is pleased to welcome you for an exceptional dining experience.`,
      primaryColor: activeRestaurant?.branding?.primaryColor || (DEFAULT_SETTINGS as any).primaryColor || '#f59e0b',
      openingHours: activeRestaurant?.openingHours || DEFAULT_SETTINGS.openingHours,
      branding: {
        primaryColor: activeRestaurant?.branding?.primaryColor || '#f59e0b',
        secondaryColor: activeRestaurant?.branding?.secondaryColor || '#1e293b',
        accentColor: activeRestaurant?.branding?.accentColor || '#10b981',
        displayName: activeRestaurant?.branding?.displayName || restaurantName,
        theme: activeRestaurant?.branding?.theme || 'light',
        buttonStyle: activeRestaurant?.branding?.buttonStyle || 'rounded',
        floorPlanBgUrl: customFloorPlan,
        ...existingBranding,
      },
    } as unknown as RestaurantSettings;
  }, [activeRestaurant, targetRestaurantId]);

  const [settings, setSettings] = useState<RestaurantSettings | null>(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
      if (targetRestaurantId === DEFAULT_RESTAURANT_ID || targetRestaurantId === 'main') {
        const legacyCached = localStorage.getItem('cached_restaurant_settings');
        if (legacyCached) return JSON.parse(legacyCached);
      }
      return fallbackSettings;
    } catch {
      return fallbackSettings;
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!targetRestaurantId) {
      setSettings(fallbackSettings);
      setLoading(false);
      return;
    }
    setLoading(true);

    const docRef = doc(db, 'settings', targetRestaurantId);

    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (!isMounted) return;

      if (docSnap.exists()) {
        const docData = docSnap.data() || {};
        const isTargetActiveRestaurant = Boolean(
          targetRestaurantId && activeRestaurant && (
            normalizeTenantIdentifier(activeRestaurant.id) === targetRestaurantId ||
            normalizeTenantIdentifier(activeRestaurant.slug) === targetRestaurantId
          )
        );
        const isMaintenance = docData.maintenanceModeEnabled !== undefined
          ? Boolean(docData.maintenanceModeEnabled)
          : (isTargetActiveRestaurant ? Boolean(activeRestaurant?.maintenanceModeEnabled) : false);

        const docFloorPlanUrl = (docData.floorPlanBgUrl || docData.cloudinaryFloorPlanBgUrl || '').trim();
        const activeRestFloorPlanUrl = (
          activeRestaurant?.settings?.floorPlanBgUrl || 
          (activeRestaurant?.settings as any)?.cloudinaryFloorPlanBgUrl || 
          activeRestaurant?.branding?.floorPlanBgUrl || 
          (activeRestaurant as any)?.floorPlanBgUrl || 
          ''
        ).trim();
        const effectiveFloorPlanUrl = docFloorPlanUrl || activeRestFloorPlanUrl || fallbackSettings.floorPlanBgUrl || '';

        const data = { 
          ...fallbackSettings,
          ...docData,
          id: docSnap.id, 
          restaurantId: targetRestaurantId,
          floorPlanBgUrl: effectiveFloorPlanUrl,
          cloudinaryFloorPlanBgUrl: effectiveFloorPlanUrl,
          showFloorPlanBg: docData.showFloorPlanBg !== undefined
            ? docData.showFloorPlanBg
            : (activeRestaurant?.settings?.showFloorPlanBg !== undefined ? activeRestaurant.settings.showFloorPlanBg : fallbackSettings.showFloorPlanBg),
          useDefaultFloorPlanBg: docData.useDefaultFloorPlanBg !== undefined
            ? docData.useDefaultFloorPlanBg
            : (effectiveFloorPlanUrl ? false : fallbackSettings.useDefaultFloorPlanBg),
          floorPlanOpacity: typeof docData.floorPlanOpacity === 'number'
            ? docData.floorPlanOpacity
            : (typeof activeRestaurant?.settings?.floorPlanOpacity === 'number' ? activeRestaurant.settings.floorPlanOpacity : fallbackSettings.floorPlanOpacity),
          maintenanceModeEnabled: isMaintenance,
          ...(docData.maintenanceMessage !== undefined 
            ? { maintenanceMessage: docData.maintenanceMessage } 
            : (isTargetActiveRestaurant && activeRestaurant?.maintenanceMessage ? { maintenanceMessage: activeRestaurant.maintenanceMessage } : {})),
        } as unknown as RestaurantSettings;

        setSettings(data);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (e) {}
        setLoading(false);
      } else {
        if (targetRestaurantId === DEFAULT_RESTAURANT_ID || targetRestaurantId === 'main') {
          try {
            const legacySnap = await getDoc(doc(db, 'settings', 'main'));
            if (legacySnap.exists()) {
              const legacyData = { 
                id: targetRestaurantId, 
                restaurantId: targetRestaurantId, 
                ...(legacySnap.data() || {}) 
              } as unknown as RestaurantSettings;
              if (isMounted) {
                setSettings(legacyData);
                try {
                  localStorage.setItem(cacheKey, JSON.stringify(legacyData));
                } catch (e) {}
                setLoading(false);
                return;
              }
            }
          } catch (err) {
            console.warn('[useSettings] Legacy settings lookup failed:', err);
          }
        }

        // Check alternate identifier (if targetRestaurantId is id, check slug; if slug, check id)
        const altId = activeRestaurant?.id && normalizeTenantIdentifier(activeRestaurant.id) !== targetRestaurantId
          ? normalizeTenantIdentifier(activeRestaurant.id)
          : activeRestaurant?.slug && normalizeTenantIdentifier(activeRestaurant.slug) !== targetRestaurantId
          ? normalizeTenantIdentifier(activeRestaurant.slug)
          : null;

        if (altId) {
          try {
            const altSnap = await getDoc(doc(db, 'settings', altId));
            if (altSnap.exists()) {
              const altData = {
                ...fallbackSettings,
                ...(altSnap.data() || {}),
                id: targetRestaurantId,
                restaurantId: targetRestaurantId,
              } as unknown as RestaurantSettings;
              if (isMounted) {
                setSettings(altData);
                try {
                  localStorage.setItem(cacheKey, JSON.stringify(altData));
                } catch (e) {}
                setLoading(false);
                return;
              }
            }
          } catch (err) {
            console.warn(`[useSettings] Alternate settings lookup for ${altId} note:`, err);
          }
        }

        // Check if restaurants collection has settings/branding for this restaurant
        const candidateRestIds = [targetRestaurantId, altId].filter(Boolean) as string[];
        for (const candidateId of candidateRestIds) {
          try {
            const restSnap = await getDoc(doc(db, 'restaurants', candidateId));
            if (restSnap.exists()) {
              const rData = restSnap.data();
              const restFloorPlan = (rData.settings?.floorPlanBgUrl || (rData.settings as any)?.cloudinaryFloorPlanBgUrl || rData.branding?.floorPlanBgUrl || '').trim();
              const mergedFromRestaurant = {
                ...fallbackSettings,
                ...(rData.settings || {}),
                id: targetRestaurantId,
                restaurantId: targetRestaurantId,
                floorPlanBgUrl: restFloorPlan || fallbackSettings.floorPlanBgUrl || '',
                cloudinaryFloorPlanBgUrl: restFloorPlan || fallbackSettings.floorPlanBgUrl || '',
                showFloorPlanBg: rData.settings?.showFloorPlanBg !== undefined ? rData.settings.showFloorPlanBg : fallbackSettings.showFloorPlanBg,
                useDefaultFloorPlanBg: rData.settings?.useDefaultFloorPlanBg !== undefined ? rData.settings.useDefaultFloorPlanBg : (restFloorPlan ? false : fallbackSettings.useDefaultFloorPlanBg),
              } as unknown as RestaurantSettings;
              if (isMounted) {
                setSettings(mergedFromRestaurant);
                try {
                  localStorage.setItem(cacheKey, JSON.stringify(mergedFromRestaurant));
                } catch (e) {}
                setLoading(false);
                return;
              }
            }
          } catch (rErr) {
            console.warn(`[useSettings] Restaurant document fallback lookup for ${candidateId} notice:`, rErr);
          }
        }

        if (isMounted) {
          setSettings(fallbackSettings);
          setLoading(false);
        }
      }
    }, (error) => {
      if (!isMounted) return;
      setSettings((prev) => prev || fallbackSettings);
      setLoading(false);
      console.warn(`[useSettings] Settings sync notice for ${targetRestaurantId}:`, error);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [targetRestaurantId, cacheKey, fallbackSettings, activeRestaurant]);

  const updateSettings = useCallback(async (newSettings: RestaurantSettings) => {
    if (!targetRestaurantId) {
      throw new Error('Cannot update settings without an active restaurant context.');
    }
    if (!canManageRestaurant(user, targetRestaurantId, activeRestaurant)) {
      throw new Error('Access denied: You are not authorized to update settings for this restaurant.');
    }

    const payload = {
      ...newSettings,
      id: targetRestaurantId,
      restaurantId: targetRestaurantId,
      updatedAt: new Date().toISOString(),
    };

    // 1. Save to tenant-specific settings document
    await setDoc(doc(db, 'settings', targetRestaurantId), payload, { merge: true });

    // 4. Sync essential metadata to restaurants/{targetRestaurantId}
    try {
      const candidateRestIds = Array.from(new Set([
        activeRestaurant?.id ? normalizeTenantIdentifier(activeRestaurant.id) : null,
        activeRestaurant?.slug ? normalizeTenantIdentifier(activeRestaurant.slug) : null,
        targetRestaurantId ? normalizeTenantIdentifier(targetRestaurantId) : null,
      ].filter(Boolean))) as string[];

      const effectiveFloorPlan = (newSettings.floorPlanBgUrl || (newSettings as any).cloudinaryFloorPlanBgUrl || '').trim();

      for (const candidateId of candidateRestIds) {
        try {
          const restaurantRef = doc(db, 'restaurants', candidateId);
          const restaurantSnap = await getDoc(restaurantRef);
          if (restaurantSnap.exists()) {
            await updateDoc(restaurantRef, {
          name: newSettings.name,
          address: newSettings.address || '',
          city: newSettings.city || '',
          phone: newSettings.phone || '',
          email: newSettings.email || '',
          website: newSettings.websiteUrl || '', // Sync websiteUrl to website field
          timezone: newSettings.timezone || 'Europe/Dublin',
          openingHours: newSettings.openingHours,
          maintenanceModeEnabled: Boolean(newSettings.maintenanceModeEnabled),
          ...(newSettings.maintenanceMessage !== undefined ? { maintenanceMessage: newSettings.maintenanceMessage } : {}),
          branding: {
            ...(activeRestaurant?.branding || {}),
            primaryColor: newSettings.primaryColor || newSettings.branding?.primaryColor || '#f59e0b',
            secondaryColor: newSettings.branding?.secondaryColor || '#1e293b',
            accentColor: newSettings.branding?.accentColor || '#10b981',
            displayName: newSettings.name,
            theme: newSettings.branding?.theme || 'light',
            logoUrl: newSettings.logoUrl || newSettings.cloudinaryLogoUrl || activeRestaurant?.branding?.logoUrl || '',
            faviconUrl: newSettings.faviconUrl || newSettings.cloudinaryFaviconUrl || activeRestaurant?.branding?.faviconUrl || '',
            coverImageUrl: newSettings.heroImageUrl || newSettings.cloudinaryHeroImageUrl || newSettings.branding?.coverImageUrl || activeRestaurant?.branding?.coverImageUrl || '',
            floorPlanBgUrl: effectiveFloorPlan,
          },
          settings: {
            ...(activeRestaurant?.settings || {}),
            showFloorPlanBg: newSettings.showFloorPlanBg !== undefined ? newSettings.showFloorPlanBg : true,
            floorPlanBgUrl: effectiveFloorPlan,
            cloudinaryFloorPlanBgUrl: effectiveFloorPlan,
            useDefaultFloorPlanBg: newSettings.useDefaultFloorPlanBg !== undefined ? newSettings.useDefaultFloorPlanBg : false,
            floorPlanOpacity: typeof newSettings.floorPlanOpacity === 'number' ? newSettings.floorPlanOpacity : 1.0,
            ...(newSettings.galleryImages ? { galleryImages: newSettings.galleryImages } : {}),
          },
          updatedAt: new Date().toISOString(),
        });
          }
        } catch (innerErr) {
          console.warn(`[useSettings] Candidate restaurant sync notice for ${candidateId}:`, innerErr);
        }
      }

      if (tenantCtx?.refreshTenant) {
        await tenantCtx.refreshTenant();
      }
    } catch (err) {
      console.warn('[useSettings] Synced restaurant doc notice:', err);
    }

    // 5. Update local state and cache under primary and candidate keys
    setSettings(payload);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(payload));
      if (activeRestaurant?.slug) {
        localStorage.setItem(`cached_restaurant_settings_${normalizeTenantIdentifier(activeRestaurant.slug)}`, JSON.stringify(payload));
      }
      if (activeRestaurant?.id) {
        localStorage.setItem(`cached_restaurant_settings_${normalizeTenantIdentifier(activeRestaurant.id)}`, JSON.stringify(payload));
      }
    } catch (e) {}
  }, [targetRestaurantId, activeRestaurant, tenantCtx, cacheKey, user]);

  return { settings, loading, updateSettings, restaurantId: targetRestaurantId };
}
