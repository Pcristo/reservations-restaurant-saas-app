import React, { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export function AssistanceModeBanner() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAssistanceMode, setIsAssistanceMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('assistance_mode') === 'true') {
      sessionStorage.setItem('assistance_mode', 'true');
      setIsAssistanceMode(true);
    } else if (sessionStorage.getItem('assistance_mode') === 'true') {
      setIsAssistanceMode(true);
    }
  }, [location.search]);

  if (!isAssistanceMode) return null;

  return (
    <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-black flex items-center justify-between sticky top-0 z-[200] shadow-xl border-b border-amber-600">
      <div className="flex items-center gap-2 mx-auto">
        <ShieldAlert size={16} className="animate-pulse" />
        <span>🛡️ ASSISTANCE MODE ACTIVE (Super Admin Diagnostic Session)</span>
      </div>
      <button 
        onClick={() => {
          sessionStorage.removeItem('assistance_mode');
          setIsAssistanceMode(false);
          const newUrl = window.location.pathname;
          navigate(newUrl, { replace: true });
        }}
        className="px-2.5 py-1 bg-slate-950 text-amber-400 rounded-lg text-[10px] font-bold hover:bg-slate-900 transition-colors cursor-pointer"
      >
        Exit Mode
      </button>
    </div>
  );
}
