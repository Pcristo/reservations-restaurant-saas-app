import React, { useState, useEffect } from 'react';
import {
  Check,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Plan, RestaurantSubscription, BillingFrequency } from '../../../types';
import { DEFAULT_PLANS } from '../../../data/plans';
import { subscribeToPlans } from '../../../services/planService';
import {
  formatResourceAllowance,
  isPackageFeatureEnabled,
  getLocalizedPlanName,
  getLocalizedPlanDescription,
  getLocalizedCustomFeatureTitle,
} from '../../../services/entitlementsService';
import { cn } from '../../../lib/utils';
import { useLanguage } from '../../../hooks/useLanguage';

interface PlanComparisonSectionProps {
  currentSubscription: RestaurantSubscription;
  onSelectPlan: (plan: Plan, frequency: BillingFrequency) => void;
  availablePlans?: Plan[];
}

export const PlanComparisonSection: React.FC<PlanComparisonSectionProps> = ({
  currentSubscription,
  onSelectPlan,
  availablePlans,
}) => {
  const { language } = useLanguage();
  const [frequency, setFrequency] = useState<BillingFrequency>(
    currentSubscription.billingFrequency || 'monthly'
  );
  const [livePlans, setLivePlans] = useState<Plan[]>(
    availablePlans && availablePlans.length > 0 ? availablePlans : DEFAULT_PLANS
  );

  useEffect(() => {
    if (availablePlans && availablePlans.length > 0) {
      setLivePlans(availablePlans);
      return;
    }
    const unsub = subscribeToPlans((loaded) => {
      const visible = loaded.filter(
        (p) =>
          (p.isActive !== false && p.isPublic !== false) ||
          p.id === currentSubscription.planId
      );
      if (visible.length > 0) {
        setLivePlans(visible);
      }
    });
    return () => unsub();
  }, [availablePlans, currentSubscription.planId]);

  const formatPrice = (plan: Plan, freq: BillingFrequency) => {
    if (plan.priceMonthly === 0) return language === 'pt' ? 'Grátis' : 'Free';
    if (freq === 'annual') {
      const annualPrice =
        typeof plan.priceAnnual === 'number'
          ? plan.priceAnnual
          : Math.round(plan.priceMonthly * 12 * 0.8);
      return `€${annualPrice}`;
    }
    return `€${plan.priceMonthly}`;
  };

  const formatPerPeriod = (plan: Plan, freq: BillingFrequency) => {
    if (plan.priceMonthly === 0) return language === 'pt' ? '14 dias' : '14 days';
    return freq === 'annual'
      ? language === 'pt'
        ? '/ano'
        : '/yr'
      : language === 'pt'
      ? '/mês'
      : '/mo';
  };

  return (
    <div className="space-y-6">
      {/* Monthly / Annual Toggle Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {language === 'pt'
              ? 'Escolha o Ciclo de Faturação'
              : 'Choose Your Billing Cycle'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {language === 'pt'
              ? 'Poupe até 20% com o pagamento anual ou mantenha a flexibilidade mensal.'
              : 'Save up to 20% with annual upfront billing or maintain complete monthly flexibility.'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto bg-gray-100 dark:bg-gray-800/80 p-1.5 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
          <button
            type="button"
            onClick={() => setFrequency('monthly')}
            className={cn(
              'px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
              frequency === 'monthly'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            {language === 'pt' ? 'Mensal' : 'Monthly'}
          </button>

          <button
            type="button"
            onClick={() => setFrequency('annual')}
            className={cn(
              'px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              frequency === 'annual'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <span>{language === 'pt' ? 'Anual' : 'Annual'}</span>
            <span
              className={cn(
                'text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider',
                frequency === 'annual'
                  ? 'bg-white text-amber-600'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              )}
            >
              {language === 'pt' ? '-20% Desconto' : 'Save 20%'}
            </span>
          </button>
        </div>
      </div>

      {/* Plans Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {livePlans.map((p) => {
          const isCurrent = Boolean(
            (currentSubscription.planId && p.id && currentSubscription.planId.toLowerCase() === p.id.toLowerCase()) ||
            (currentSubscription.planName && p.name && currentSubscription.planName.toLowerCase() === p.name.toLowerCase()) ||
            (currentSubscription.planId && p.name && currentSubscription.planId.toLowerCase() === p.name.toLowerCase())
          );
          const isPopular = p.isPopular;

          return (
            <div
              key={p.id}
              className={cn(
                'rounded-2xl p-6 transition-all relative flex flex-col justify-between border bg-[#0b1329] shadow-lg',
                isCurrent
                  ? 'border-emerald-500/50 ring-1 ring-emerald-500/30'
                  : isPopular
                  ? 'border-amber-500/50'
                  : 'border-slate-800'
              )}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-amber-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-md tracking-wider flex items-center gap-1">
                    <Sparkles size={11} />
                    {language === 'pt' ? 'Mais Popular' : 'Most Popular'}
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-bold text-white tracking-tight">
                    {getLocalizedPlanName(p, language)}
                  </h4>
                  {isCurrent && (
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {language === 'pt' ? 'Plano Ativo' : 'Active Plan'}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 min-h-[36px] line-clamp-2 leading-relaxed">
                  {getLocalizedPlanDescription(p, language)}
                </p>

                <div className="my-5 flex items-baseline gap-1.5 pb-5 border-b border-slate-700/60">
                  <span className="text-3xl font-extrabold text-white">
                    {formatPrice(p, frequency)}
                  </span>
                  <span className="text-xs font-medium text-slate-400">
                    {formatPerPeriod(p, frequency)}
                  </span>
                </div>

                {/* Plan Highlights */}
                <div className="space-y-2.5 text-xs text-slate-200">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span>
                      <strong className="text-white">
                        {formatResourceAllowance(p.entitlements, 'bookings', language)}
                      </strong>{' '}
                      <span className="text-slate-300">{language === 'pt' ? 'Reservas / mês' : 'Monthly Bookings'}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span>
                      <strong className="text-white">
                        {formatResourceAllowance(p.entitlements, 'staff', language)}
                      </strong>{' '}
                      <span className="text-slate-300">{language === 'pt' ? 'Contas de Staff' : 'Staff Accounts'}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span>
                      <strong className="text-white">
                        {formatResourceAllowance(p.entitlements, 'tables', language)}
                      </strong>{' '}
                      <span className="text-slate-300">{language === 'pt' ? 'Mesas de Refeição' : 'Max Dining Tables'}</span>
                    </span>
                  </div>

                  {[
                    {
                      enabled: p.entitlements.customDomain,
                      en: 'Custom Subdomain/Domain',
                      pt: 'Domínio / Subdomínio Próprio',
                    },
                    {
                      enabled: p.entitlements.whatsapp,
                      en: 'WhatsApp Action',
                      pt: 'Ações WhatsApp',
                    },
                    {
                      enabled: p.entitlements.sms,
                      en: 'SMS Reminders',
                      pt: 'Lembretes SMS',
                    },
                    {
                      enabled: p.entitlements.advancedSEO,
                      en: 'Advanced SEO',
                      pt: 'SEO Avançado',
                    },
                    {
                      enabled: p.entitlements.waitlist,
                      en: 'Waitlist Management',
                      pt: 'Lista de Espera',
                    },
                    {
                      enabled: p.entitlements.advancedAnalytics,
                      en: 'Advanced Analytics',
                      pt: 'Análises Avançadas',
                    },
                    {
                      enabled: isPackageFeatureEnabled(p.entitlements, 'smartAlerts'),
                      en: 'Smart Alerts',
                      pt: 'Alertas Inteligentes',
                    },
                    {
                      enabled: Boolean(p.entitlements.apiAccess),
                      en: 'API Webhooks & Integrations',
                      pt: 'API REST & Webhooks',
                    },
                  ].map((feat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {feat.enabled ? (
                        <Check size={14} className="text-emerald-400 shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-500 font-bold">
                          •
                        </span>
                      )}
                      <span className={cn(feat.enabled ? 'text-slate-200' : 'text-slate-500 line-through')}>
                        {language === 'pt' ? feat.pt : feat.en}
                      </span>
                    </div>
                  ))}

                  {p.customFeatures &&
                    p.customFeatures
                      .filter((f) => f.enabled !== false)
                      .map((cf) => (
                        <div key={cf.id} className="flex items-center gap-2">
                          <Check size={14} className="text-emerald-400 shrink-0" />
                          <span className="text-slate-200">{getLocalizedCustomFeatureTitle(cf.title, language)}</span>
                        </div>
                      ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-4 border-t border-slate-800">
                {isCurrent ? (
                  <button
                    disabled
                    aria-label={language === 'pt' ? 'Plano Ativo' : 'Active Plan'}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800/90 text-emerald-400 border border-emerald-500/30 cursor-not-allowed text-center flex items-center justify-center gap-1.5 shadow-inner opacity-90 select-none"
                  >
                    <Check size={14} className="text-emerald-400 stroke-[2.5]" />
                    <span>{language === 'pt' ? 'Plano Ativo' : 'Active Plan'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onSelectPlan(p, frequency)}
                    className={cn(
                      'w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 active:scale-95',
                      isPopular
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-amber-500/20'
                        : 'bg-white hover:bg-slate-100 text-slate-900 font-bold'
                    )}
                  >
                    <span>
                      {p.priceMonthly > (currentSubscription.priceMonthly || 0)
                        ? (language === 'pt' ? 'Fazer Upgrade' : 'Upgrade Plan')
                        : (language === 'pt' ? 'Mudar Plano' : 'Select Plan')}
                    </span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
