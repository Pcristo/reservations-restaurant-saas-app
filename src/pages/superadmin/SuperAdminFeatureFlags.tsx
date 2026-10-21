import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, RefreshCw, Activity } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { saveFeatureFlags, useFeatureFlags, DEFAULT_FEATURE_FLAGS } from '../../services/featureFlagsService';
import { cn } from '../../lib/utils';

const FLAG_ENFORCEMENT_SCOPE: Record<string, string[]> = {
  custom_domains: ['Custom Domain Routing', 'Admin Domain Settings', 'Domain Verification'],
  whatsapp_actions: ['Reservations List', 'Live Floor Plan', 'Customer Directory'],
  advanced_seo: ['JSON-LD Schema', 'OpenGraph & Social Cards', 'Admin SEO Studio'],
  waitlist_management: ['Public Booking Overflow', 'Reservations Waitlist', 'Live View & Dashboard'],
  sms_notifications: ['SMS OTP Verification', 'Twilio Dispatch API', 'Admin SMS Settings'],
  multi_language: ['Public Navbar Switcher', 'Landing Page Localization', 'EN / PT Translation Context']
};

export const SuperAdminFeatureFlags: React.FC = () => {
  const { flags, loading } = useFeatureFlags();
  const [savingId, setSavingId] = useState<string | null>(null);

  const toggleFlag = async (id: string) => {
    const target = flags.find(f => f.id === id);
    if (!target) return;

    const nextEnabled = !target.enabled;
    const updated = flags.map(f => f.id === id ? { ...f, enabled: nextEnabled } : f);
    
    setSavingId(id);

    try {
      await saveFeatureFlags(updated);
      toast.success(`Feature "${target.name}" ${nextEnabled ? 'enabled' : 'disabled'} across the platform.`);
    } catch (err: any) {
      toast.error('Failed to update feature flag.');
    } finally {
      setSavingId(null);
    }
  };

  const handleResetDefaults = async () => {
    setSavingId('__reset__');
    try {
      await saveFeatureFlags(DEFAULT_FEATURE_FLAGS);
      toast.success('All platform feature flags reset to defaults.');
    } catch (err) {
      toast.error('Failed to reset feature flags.');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400">Loading platform feature flags...</p>
      </div>
    );
  }

  const activeCount = flags.filter(f => f.enabled).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Feature Flags</h1>
          <p className="text-sm text-slate-400">
            Control global SaaS capabilities and rollout toggles across all tenant restaurants in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
            <Activity size={14} className="text-emerald-400" />
            <span><strong>{activeCount}</strong> / {flags.length} Active</span>
          </div>
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={savingId !== null}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            Reset Defaults
          </button>
        </div>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-xl divide-y divide-slate-800 shadow-sm">
        {flags.map((f) => {
          const scopes = FLAG_ENFORCEMENT_SCOPE[f.id] || [];
          return (
            <div key={f.id} className="p-5 flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white text-sm">{f.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 uppercase">
                    {f.category}
                  </span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                    f.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"
                  )}>
                    {f.enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  {f.description}
                </p>
                {scopes.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mr-1">Enforced in:</span>
                    {scopes.map((scope) => (
                      <span
                        key={scope}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-900/90 border border-slate-800/80 text-slate-400"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => toggleFlag(f.id)}
                disabled={savingId === f.id}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 disabled:opacity-50 ${
                  f.enabled 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 shadow-xs' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {savingId === f.id ? (
                  <RefreshCw size={14} className="animate-spin text-amber-400" />
                ) : f.enabled ? (
                  <>
                    <ToggleRight size={16} className="text-emerald-400" />
                    <span>Enabled</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft size={16} className="text-slate-500" />
                    <span>Disabled</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuperAdminFeatureFlags;
