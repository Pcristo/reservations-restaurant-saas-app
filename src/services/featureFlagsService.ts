import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlag[] = [
  {
    id: 'custom_domains',
    name: 'Custom Domain Ingress & SSL',
    description: 'Allows restaurants to link their own apex and CNAME domains with automatic HTTPS resolution.',
    enabled: true,
    category: 'Infrastructure',
  },
  {
    id: 'whatsapp_actions',
    name: 'WhatsApp Customer Communication',
    description: 'One-click WhatsApp button on reservation cards with IE (+353) and PT (+351) number normalization.',
    enabled: true,
    category: 'Communications',
  },
  {
    id: 'advanced_seo',
    name: 'Dynamic Schema.org & SEO Meta',
    description: 'Injects dynamic JSON-LD Restaurant schemas, OpenGraph images, and meta tags for search engines.',
    enabled: true,
    category: 'SEO & Marketing',
  },
  {
    id: 'waitlist_management',
    name: 'Waitlist & Overflow Engine',
    description: 'Allows guest queueing when full house conditions are met for lunch or dinner shifts.',
    enabled: true,
    category: 'Operations',
  },
  {
    id: 'sms_notifications',
    name: 'SMS Reminders (Twilio Gateway)',
    description: 'Sends automated 2-hour pre-arrival booking reminders to guests via SMS.',
    enabled: false,
    category: 'Communications',
  },
  {
    id: 'multi_language',
    name: 'Bilingual Locale Support (EN / PT)',
    description: 'Full dual-language interface, email templates, and localized public booking flows.',
    enabled: true,
    category: 'Localization',
  },
];

const LOCAL_STORAGE_KEY = 'dinemaster_feature_flags';
const EVENT_NAME = 'dinemaster:feature-flags-updated';

// Merge stored flags with defaults so any newly introduced flags are always present
function mergeWithDefaults(stored: FeatureFlag[]): FeatureFlag[] {
  if (!Array.isArray(stored)) return DEFAULT_FEATURE_FLAGS;
  const map = new Map<string, FeatureFlag>();
  DEFAULT_FEATURE_FLAGS.forEach(def => map.set(def.id, { ...def }));
  stored.forEach(item => {
    if (item && item.id) {
      const def = map.get(item.id);
      if (def) {
        map.set(item.id, { ...def, ...item, enabled: Boolean(item.enabled) });
      } else {
        map.set(item.id, item);
      }
    }
  });
  return Array.from(map.values());
}

// Global singleton listener so the entire app stays in real-time sync with Firestore
let globalFlagsCache: FeatureFlag[] | null = null;
let listenerInitialized = false;

function getInitialFlags(): FeatureFlag[] {
  if (globalFlagsCache) return globalFlagsCache;
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          globalFlagsCache = mergeWithDefaults(parsed);
          return globalFlagsCache;
        }
      }
    } catch {}
  }
  return DEFAULT_FEATURE_FLAGS;
}

function notifyFlagListeners(flags: FeatureFlag[]) {
  globalFlagsCache = flags;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(flags));
    } catch {}
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: flags }));
  }
}

export function initFeatureFlagsListener() {
  if (listenerInitialized || typeof window === 'undefined') return;
  listenerInitialized = true;

  try {
    const ref = doc(db, 'platform_settings', 'feature_flags');
    onSnapshot(
      ref,
      (snap) => {
        if (snap.exists() && snap.data()?.flags) {
          const merged = mergeWithDefaults(snap.data().flags as FeatureFlag[]);
          notifyFlagListeners(merged);
        }
      },
      (err) => {
        console.warn('[FeatureFlags] Real-time listener notice:', err);
      }
    );
  } catch (err) {
    console.warn('[FeatureFlags] Failed to attach real-time listener:', err);
  }
}

// Start the real-time listener automatically in browser environments
if (typeof window !== 'undefined') {
  initFeatureFlagsListener();
}

export async function fetchFeatureFlags(): Promise<FeatureFlag[]> {
  initFeatureFlagsListener();
  try {
    const ref = doc(db, 'platform_settings', 'feature_flags');
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data()?.flags) {
      const merged = mergeWithDefaults(snap.data().flags as FeatureFlag[]);
      notifyFlagListeners(merged);
      return merged;
    }
  } catch (err) {
    console.warn('[FeatureFlags] Using local storage/default fallback:', err);
  }

  return getInitialFlags();
}

export async function saveFeatureFlags(flags: FeatureFlag[]): Promise<void> {
  const merged = mergeWithDefaults(flags);
  notifyFlagListeners(merged);

  try {
    const ref = doc(db, 'platform_settings', 'feature_flags');
    await setDoc(ref, { flags: merged, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error('[FeatureFlags] Failed to save to Firestore:', err);
    throw err;
  }
}

export function isFeatureEnabled(flagId: string): boolean {
  initFeatureFlagsListener();
  const current = getInitialFlags();
  const found = current.find(f => f.id === flagId);
  if (found) return Boolean(found.enabled);

  const defaultFound = DEFAULT_FEATURE_FLAGS.find(f => f.id === flagId);
  return defaultFound ? defaultFound.enabled : true;
}

/**
 * Reactive React hook that subscribes to real-time feature flag updates
 * across Firestore, localStorage, and in-tab custom events.
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>(() => getInitialFlags());

  useEffect(() => {
    initFeatureFlagsListener();
    setFlags(getInitialFlags());

    const handleCustomUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<FeatureFlag[]>;
      if (customEvent.detail) {
        setFlags(customEvent.detail);
      } else {
        setFlags(getInitialFlags());
      }
    };

    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const merged = mergeWithDefaults(parsed);
          globalFlagsCache = merged;
          setFlags(merged);
        } catch {}
      }
    };

    window.addEventListener(EVENT_NAME, handleCustomUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.removeEventListener(EVENT_NAME, handleCustomUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const checkEnabled = useCallback(
    (flagId: string): boolean => {
      const found = flags.find(f => f.id === flagId);
      if (found) return Boolean(found.enabled);
      const defaultFound = DEFAULT_FEATURE_FLAGS.find(f => f.id === flagId);
      return defaultFound ? defaultFound.enabled : true;
    },
    [flags]
  );

  return {
    flags,
    loading: false,
    isFeatureEnabled: checkEnabled,
  };
}
