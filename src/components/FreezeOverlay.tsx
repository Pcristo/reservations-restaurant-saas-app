import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';
import { Lock, Unlock, AlertCircle } from 'lucide-react';
import { cn, getOptimizedUrl } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function FreezeOverlay() {
  const { settings } = useSettings();
  const { language, t } = useLanguage();
  const { isStaff, logout } = useAuth();
  const [isFrozen, setIsFrozen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  // Use refs for activity timestamps so DOM events DO NOT trigger React re-renders or infinite loops
  const lastActivityRef = useRef<number>(Date.now());
  const lastRecordedRef = useRef<number>(Date.now());

  const freezeEnabled = settings?.freezeEnabled || false;
  const freezeMinutes = Math.max(1, settings?.freezeTime || 5);
  const freezeTimeMs = freezeMinutes * 60 * 1000;
  // Support either appUnlockPin or pdfPassword
  const correctPassword = (settings?.appUnlockPin || settings?.pdfPassword || '').trim();

  useEffect(() => {
    if (!freezeEnabled || !isStaff) {
      setIsFrozen(false);
      return;
    }

    lastActivityRef.current = Date.now();
    lastRecordedRef.current = Date.now();

    // Throttled activity listener: records activity at most once per second with zero React re-renders
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastRecordedRef.current > 1000) {
        lastRecordedRef.current = now;
        lastActivityRef.current = now;
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'pointerdown'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Check idle status every 10 seconds
    const interval = setInterval(() => {
      // If no PIN was ever configured, do not accidentally lock the user out
      if (!correctPassword) return;

      const idleDuration = Date.now() - lastActivityRef.current;
      if (idleDuration >= freezeTimeMs) {
        setIsFrozen(true);
      }
    }, 10000);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(interval);
    };
  }, [freezeEnabled, isStaff, freezeTimeMs, correctPassword]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctPassword || password === correctPassword) {
      setIsFrozen(false);
      setPassword('');
      setError(false);
      lastActivityRef.current = Date.now();
    } else {
      setError(true);
      setPassword('');
      setTimeout(() => setError(false), 2000);
    }
  };

  if (!freezeEnabled || !isStaff || !isFrozen) return null;

  return (
    <AnimatePresence>
      <motion.div 
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-950/90 backdrop-blur-xl"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className={cn(
            "w-full max-w-sm p-8 rounded-3xl border shadow-2xl transition-all duration-300",
            settings?.theme === 'dark' ? "bg-gray-900 border-orange-500/50" : "bg-white border-orange-500"
          )}
        >
          <div className="flex flex-col items-center text-center">
            <div className="flex flex-col items-center gap-3 mb-6">
              {(settings?.logoUrl || settings?.cloudinaryLogoUrl) && (
                <img 
                  src={getOptimizedUrl(settings?.logoUrl, settings, 'logo')} 
                  alt={settings.name || 'Logo'} 
                  className="w-auto object-contain max-h-16 mb-1"
                  referrerPolicy="no-referrer"
                />
              )}
              {settings?.name && (
                <h3 className={cn(
                  "text-lg font-bold transition-colors duration-300",
                  settings?.theme === 'dark' ? "text-gray-300" : "text-gray-600"
                )}>
                  {settings.name}
                </h3>
              )}
            </div>

            <hr className="w-full border-t border-orange-500 mb-6 opacity-50" />
            
            <div className={cn(
              "w-20 h-20 rounded-2xl flex items-center justify-center mb-2 rotate-3 transition-colors duration-300",
              error ? "bg-red-100 text-red-600" : (settings?.theme === 'dark' ? "bg-orange-500/20 text-orange-400" : "bg-orange-50 text-orange-600")
            )}>
              <Lock size={40} className={cn(error && "animate-shake")} />
            </div>

            <h2 className={cn(
              "text-2xl font-bold mb-2 transition-colors duration-300",
              settings?.theme === 'dark' ? "text-white" : "text-gray-900"
            )}>
              {language === 'pt' ? <>Congelar App <br />(Auto-Bloqueio)</> : (t('settings.freeze_app') || 'Freeze Application')}
            </h2>
            <p className={cn(
              "text-sm mb-8 transition-colors duration-300",
              settings?.theme === 'dark' ? "text-gray-400" : "text-gray-600"
            )}>
              {language === 'pt' 
                ? 'Este aplicativo está congelado por segurança. Por favor, insira a senha do administrador para continuar.' 
                : 'This application is frozen for security. Please enter the administrator password to continue.'}
            </p>

            <form onSubmit={handleUnlock} className="w-full relative pt-6">
              <div className="absolute top-0 left-0 right-0 h-6 flex items-center justify-center">
                <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-red-500 text-xs font-medium flex items-center justify-center gap-1"
                    >
                      <AlertCircle size={12} />
                      {language === 'pt' ? 'Senha inválida' : 'Invalid Password'}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative mb-4">
                <input 
                  type="password"
                  autoFocus
                  value={password}
                  maxLength={4}
                  onChange={(e) => setPassword(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder={language === 'pt' ? 'Introduza o PIN (4 dígitos)...' : 'Enter PIN (4 digits)...'}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 transition-all duration-300 text-center text-lg font-bold tracking-widest",
                    settings?.theme === 'dark' 
                      ? "bg-gray-800 border-gray-700 text-white focus:ring-red-900" 
                      : "bg-gray-50 border-gray-200 text-gray-900 focus:ring-red-100"
                  )}
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition-all shadow-lg shadow-red-900/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Unlock size={20} />
                {language === 'pt' ? 'Desbloquear Aplicação' : 'Unlock Application'}
              </button>

              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsFrozen(false);
                    logout(false);
                  }}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors underline cursor-pointer"
                >
                  {language === 'pt' ? 'Terminar sessão / Mudar de conta' : 'Sign out / Switch account'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
