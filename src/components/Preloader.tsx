import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { Utensils } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useLanguage } from '../hooks/useLanguage';
import { getOptimizedUrl, cn, isPlatformHost, isTenantSubdomain } from '../lib/utils';
import { APP_CONFIG } from '../data/appConfig';
import { MarketingWebsiteSettings } from '../types';
import { getMarketingWebsiteSettings, DEFAULT_MARKETING_SETTINGS } from '../services/marketingWebsiteService';


interface PreloaderProps {
  isPlatform?: boolean;
  marketingSettings?: MarketingWebsiteSettings | null;
}

const Preloader: React.FC<PreloaderProps> = ({ 
  isPlatform: isPlatformProp,
  marketingSettings: marketingSettingsProp
}) => {
  const location = useLocation();
  const { settings, loading } = useSettings();
  const { language, t } = useLanguage();

  // Determine if this is the main platform route ('/') rather than an individual restaurant portal
  const isPlatformRoute = useMemo(() => {
    if (isPlatformProp !== undefined) return isPlatformProp;
    const searchParams = new URLSearchParams(location.search);
    const isExplicitBooking = searchParams.get('view') === 'booking' || searchParams.has('restaurant');
    const host = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
    const isPlatform = isPlatformHost(host);
    const isSubdomain = isTenantSubdomain(host);
    const isCustomDomain = !isPlatform;

    return (
      (location.pathname === '/' || location.pathname === '/marketing' || location.pathname === '/login') &&
      !isCustomDomain &&
      !isSubdomain &&
      !isExplicitBooking
    );
  }, [isPlatformProp, location.pathname, location.search]);

  // Marketing settings for platform branding (exact match to main Login form)
  const [marketingSettings, setMarketingSettings] = useState<MarketingWebsiteSettings>(() => {
    if (marketingSettingsProp) return marketingSettingsProp;
    try {
      const cached = localStorage.getItem('dinemaster_marketing_settings');
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_MARKETING_SETTINGS;
  });

  useEffect(() => {
    if (marketingSettingsProp) {
      setMarketingSettings(marketingSettingsProp);
      return;
    }
    if (isPlatformRoute) {
      getMarketingWebsiteSettings()
        .then(setMarketingSettings)
        .catch((e) => console.warn('[Preloader] Notice loading platform marketing settings:', e));
    }
  }, [marketingSettingsProp, isPlatformRoute]);

  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const platformLogoUrl = marketingSettings?.general?.logoUrl || null;
  const restaurantLogo = settings?.logoUrl || (settings?.useCloudinary && settings?.cloudinaryLogoUrl);

  const getBgClass = () => {
    if (isPlatformRoute) {
      return "bg-slate-950";
    }
    const bgType = settings?.preloaderBg || 'white';
    if (bgType === 'dark') {
      return "bg-[#030f20]";
    }
    if (bgType === 'brand') {
      return "";
    }
    return "bg-white";
  };

  const getInlineStyle = () => {
    if (isPlatformRoute) {
      return {};
    }
    const bgType = settings?.preloaderBg || 'white';
    if (bgType === 'brand' && settings?.primaryColor) {
      return { backgroundColor: settings.primaryColor };
    }
    return {};
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center select-none",
        getBgClass()
      )}
      style={getInlineStyle()}
    >
      <div className="relative">
        {/* Spinning Outer Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.9, repeat: Infinity, ease: "linear" }}
          className="absolute inset-[-18px] border-4 border-amber-600 border-t-transparent rounded-full shadow-lg shadow-amber-200/50"
        />
        
        {/* Spinning Inner Ring (Opposite direction) */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 1.42, repeat: Infinity, ease: "linear" }}
          className="absolute inset-[-11px] border-2 border-amber-400 border-b-transparent rounded-full opacity-50"
        />

        {/* Logo Container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            duration: 0.8,
            scale: { type: "spring", damping: 15, stiffness: 100 }
          }}
          className="w-32 h-32 flex items-center justify-center p-2 z-10"
        >
          {isPlatformRoute ? (
            /* Main DineMaster Pro platform logo / Fork and Knife badge exact match to login form */
            <div className="w-[110px] h-[110px] rounded-2xl border border-slate-800 shadow-xl shadow-amber-500/10 bg-slate-900 flex items-center justify-center p-2">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20"
                style={{
                  background: 'linear-gradient(to top right, #f59e0b, #fbbf24, #fcd34d)'
                }}
              >
                <Utensils size={36} className="text-slate-950" />
              </div>
            </div>
          ) : (
            /* Restaurant-specific preloader */
            loading ? (
              <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            ) : restaurantLogo ? (
              <img 
                src={getOptimizedUrl(settings?.logoUrl, settings, 'logo')} 
                alt={settings?.name || "Logo"} 
                className="max-w-full max-h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="text-2xl font-black text-amber-600 italic">
                {settings?.name?.charAt(0) || "D"}
              </div>
            )
          )}
        </motion.div>

        {/* Loading Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute -bottom-20 left-1/2 -translate-x-1/2 whitespace-nowrap text-center"
        >
          <span className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">
            {t('common.loading')}
          </span>
          <div className="flex justify-center gap-1 mt-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                className="w-1.5 h-1.5 bg-amber-500 rounded-full"
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Footer Info: App Name from Config & Developed by Zarco */}
      {/* Bottom Footer Info: App Name from Config & Developed by Zarco */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="absolute bottom-6 inset-x-0 flex flex-col items-center justify-center gap-2 text-center pointer-events-none select-none z-20 px-4"
      >
        <span className={cn(
          "text-sm font-black tracking-widest uppercase",
          isPlatformRoute || settings?.preloaderBg === 'dark' ? "text-white" : "text-slate-900"
        )}>
          DineMaster Pro
        </span>
        <div className={cn(
          "flex items-center justify-center gap-2 text-[11px] font-medium opacity-80",
          isPlatformRoute || settings?.preloaderBg === 'dark' ? "text-gray-400" : "text-gray-500"
        )}>
          <span>Developed by</span>
          <img src="/assets/developer/zarco_logo_1_no_bg.png" alt="Zarco Studios" className="h-5 w-auto object-contain" />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Preloader;
