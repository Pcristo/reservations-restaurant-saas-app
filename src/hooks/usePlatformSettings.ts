import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { PlatformSettings } from '../types';
import { DEFAULT_PLATFORM_SETTINGS } from '../data/plans';

export function usePlatformSettings() {
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() => {
    try {
      const cached = localStorage.getItem('dinemaster_platform_settings');
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_PLATFORM_SETTINGS;
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'platform_settings', 'general'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as PlatformSettings;
          setPlatformSettings(data);
          try {
            localStorage.setItem('dinemaster_platform_settings', JSON.stringify(data));
          } catch {}
        }
        setLoading(false);
      },
      (error) => {
        console.warn('[usePlatformSettings] Notice loading platform settings:', error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Helper flags for required statutory information
  const legalDetails = {
    platformName: platformSettings.saasName || 'DineMaster Pro',
    platformUrl: platformSettings.platformUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://dinemasterpro.com'),
    legalCompanyName: platformSettings.legalCompanyName || '',
    registeredAddress: platformSettings.registeredAddress || '',
    vatNumber: platformSettings.vatNumber || '',
    companyRegistrationNumber: platformSettings.companyRegistrationNumber || '',
    contactEmail: platformSettings.legalContactEmail || platformSettings.supportEmail || 'legal@dinemasterpro.com',
    supportEmail: platformSettings.supportEmail || 'hello@dinemasterpro.com',
    contactPhone: platformSettings.contactPhone || '',
    dpoContactEmail: platformSettings.dpoContactEmail || '',
    primaryJurisdiction: platformSettings.primaryJurisdiction || 'both',
    disputeResolutionPlatform: platformSettings.disputeResolutionPlatform || 'https://ec.europa.eu/consumers/odr',
    lastLegalReviewDate: platformSettings.lastLegalReviewDate || '2026-10-21',

    // Flags for missing information
    isMissingLegalName: !platformSettings.legalCompanyName,
    isMissingAddress: !platformSettings.registeredAddress,
    isMissingVat: !platformSettings.vatNumber,
    isMissingRegistrationNumber: !platformSettings.companyRegistrationNumber,
  };

  return { platformSettings, legalDetails, loading };
}
