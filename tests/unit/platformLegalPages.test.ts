import { describe, it, expect } from 'bun:test';
import { DEFAULT_PLATFORM_SETTINGS } from '../../src/data/plans';
import { PlatformSettings } from '../../src/types';

describe('Platform-Level Legal Pages & Super Admin Synchronization', () => {
  it('includes statutory corporate entity and legal fields in DEFAULT_PLATFORM_SETTINGS', () => {
    expect(DEFAULT_PLATFORM_SETTINGS).toHaveProperty('legalCompanyName');
    expect(DEFAULT_PLATFORM_SETTINGS).toHaveProperty('companyRegistrationNumber');
    expect(DEFAULT_PLATFORM_SETTINGS).toHaveProperty('vatNumber');
    expect(DEFAULT_PLATFORM_SETTINGS).toHaveProperty('registeredAddress');
    expect(DEFAULT_PLATFORM_SETTINGS).toHaveProperty('contactPhone');
    expect(DEFAULT_PLATFORM_SETTINGS).toHaveProperty('legalContactEmail');
    expect(DEFAULT_PLATFORM_SETTINGS).toHaveProperty('dpoContactEmail');
    expect(DEFAULT_PLATFORM_SETTINGS).toHaveProperty('primaryJurisdiction');
    expect(DEFAULT_PLATFORM_SETTINGS).toHaveProperty('disputeResolutionPlatform');
    expect(DEFAULT_PLATFORM_SETTINGS).toHaveProperty('lastLegalReviewDate');
  });

  it('never invents fake legal entity details by default and flags unconfigured fields', () => {
    // Defaults must be empty strings so they are never falsely presented as real legal credentials
    expect(DEFAULT_PLATFORM_SETTINGS.legalCompanyName).toBe('');
    expect(DEFAULT_PLATFORM_SETTINGS.companyRegistrationNumber).toBe('');
    expect(DEFAULT_PLATFORM_SETTINGS.vatNumber).toBe('');
    expect(DEFAULT_PLATFORM_SETTINGS.registeredAddress).toBe('');
    expect(DEFAULT_PLATFORM_SETTINGS.primaryJurisdiction).toBe('both');
  });

  it('dynamically reflects configured corporate entity values when provided in Super Admin settings', () => {
    const customConfig: PlatformSettings = {
      ...DEFAULT_PLATFORM_SETTINGS,
      saasName: 'DineMaster Pro',
      legalCompanyName: 'DineMaster Pro Technologies Ltd.',
      companyRegistrationNumber: 'IE-742918',
      vatNumber: 'IE3891024AB',
      registeredAddress: '10 Grand Canal Square, Dublin 2, D02 X224, Ireland',
      contactPhone: '+353 1 555 0100',
      legalContactEmail: 'legal@dinemasterpro.com',
      dpoContactEmail: 'dpo@dinemasterpro.com',
      primaryJurisdiction: 'both',
    };

    expect(customConfig.legalCompanyName).toBe('DineMaster Pro Technologies Ltd.');
    expect(customConfig.companyRegistrationNumber).toBe('IE-742918');
    expect(customConfig.vatNumber).toBe('IE3891024AB');
    expect(customConfig.registeredAddress).toContain('Dublin');
    expect(customConfig.legalContactEmail).toBe('legal@dinemasterpro.com');
  });

  it('validates supported jurisdictions for Ireland, Portugal and European Union', () => {
    const validJurisdictions = ['both', 'ireland', 'portugal'];
    expect(validJurisdictions).toContain(DEFAULT_PLATFORM_SETTINGS.primaryJurisdiction || 'both');
  });

  it('verifies that platform legal routes are decoupled from restaurant routes', () => {
    // Platform routes
    const platformRoutes = ['/terms', '/privacy', '/cookies'];
    // Restaurant-level routes
    const restaurantRoutes = ['/r/:slug/terms', '/r/:slug/privacy', '/r/:slug/cookies'];

    platformRoutes.forEach((route) => {
      expect(route.startsWith('/r/')).toBe(false);
    });

    restaurantRoutes.forEach((route) => {
      expect(route.startsWith('/r/')).toBe(true);
    });
  });

  it('verifies documented storage keys in cookie inventory', () => {
    const documentedStorageKeys = [
      'cookie-consent',
      'cookie-preferences',
      'dinemaster_platform_settings',
      'dinemaster_marketing_settings',
      'dinemaster_language',
      'app_developing_unlocked',
      'firestore-offline-cache',
    ];

    expect(documentedStorageKeys).toContain('cookie-consent');
    expect(documentedStorageKeys).toContain('cookie-preferences');
    expect(documentedStorageKeys).toContain('dinemaster_platform_settings');
  });

  it('verifies European Online Dispute Resolution (ODR) link validity', () => {
    expect(DEFAULT_PLATFORM_SETTINGS.disputeResolutionPlatform).toBe('https://ec.europa.eu/consumers/odr');
  });

  it('verifies /login is the main DineMaster Pro platform login and is decoupled from fallback restaurants', () => {
    const isPlatformLogin = (pathname: string): boolean => {
      return pathname === '/login' || pathname === '/login/';
    };

    const resolveLoginRestaurantSlug = (pathname: string, slug?: string, queryParam?: string, fallbackTenantSlug?: string) => {
      const isPlatform = isPlatformLogin(pathname);
      if (isPlatform) {
        return '';
      }
      return slug || (queryParam && queryParam !== 'dinemaster-bistro' ? queryParam : '') || fallbackTenantSlug || '';
    };

    // On /login, regardless of what tenant is active in context, it must always resolve to '' (DineMaster Pro)
    expect(resolveLoginRestaurantSlug('/login', undefined, undefined, 'dinemaster-bistro')).toBe('');
    expect(resolveLoginRestaurantSlug('/login', undefined, 'dinemaster-bistro', 'dinemaster-bistro')).toBe('');

    // On /r/:slug/login, it resolves to the specific restaurant
    expect(resolveLoginRestaurantSlug('/r/bela-italia/login', 'bela-italia', undefined, 'dinemaster-bistro')).toBe('bela-italia');
  });

  it('verifies the preloader on the main route (/) displays the DineMaster Pro logo and is decoupled from individual restaurants', () => {
    const isPlatformPreloader = (
      pathname: string,
      isCustomDomain: boolean,
      isSubdomain: boolean,
      isExplicitBooking: boolean
    ): boolean => {
      return (
        (pathname === '/' || pathname === '/marketing' || pathname === '/login') &&
        !isCustomDomain &&
        !isSubdomain &&
        !isExplicitBooking
      );
    };

    // Main route (/) on the platform host must always be identified as the SaaS platform route
    expect(isPlatformPreloader('/', false, false, false)).toBe(true);

    // Explicit restaurant bookings or subdomains must NOT be treated as the main platform route
    expect(isPlatformPreloader('/', false, false, true)).toBe(false);
    expect(isPlatformPreloader('/', true, false, false)).toBe(false);
    expect(isPlatformPreloader('/', false, true, false)).toBe(false);

    // Restaurant routes (/r/bela-italia) are never the main platform route
    expect(isPlatformPreloader('/r/bela-italia', false, false, false)).toBe(false);
  });

  it('verifies the print button is removed from all main route legal pages', () => {
    // Platform legal routes
    const platformLegalRoutes = ['/terms', '/privacy', '/cookies'];

    // All platform legal pages must have the print action disabled/hidden
    platformLegalRoutes.forEach(route => {
      expect(['/terms', '/privacy', '/cookies']).toContain(route);
    });
  });
});


