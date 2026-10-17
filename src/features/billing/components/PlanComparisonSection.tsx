import React, { useState } from 'react';
import { 
  Check, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  Users, 
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { MdTableRestaurant } from 'react-icons/md';
import { Plan, RestaurantSubscription, BillingFrequency } from '../../../types';
import { DEFAULT_PLANS } from '../../../data/plans';
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
  availablePlans = DEFAULT_PLANS,
}) => {
  const { language } = useLanguage();
  const [frequency, setFrequency] = useState<BillingFrequency>(
    currentSubscription.billingFrequency || 'monthly'
  );

  const formatPrice = (plan: Plan, freq: BillingFrequency) => {
    if (plan.priceMonthly === 0) return 'Free';
    if (freq === 'annual') {
      const annualPrice = Math.round(plan.priceMonthly * 12 * 0.8);
      return `€${annualPrice}`;
    }
    return `€${plan.priceMonthly}`;
  };

  const formatPerPeriod = (plan: Plan, freq: BillingFrequency) => {
    if (plan.priceMonthly === 0) return language === 'pt' ? 'para sempre' : 'forever';
    return freq === 'annual' ? (language === 'pt' ? '/ano' : '/yr') : (language === 'pt' ? '/mês' : '/mo');
  };

  return (
    <div className="space-y-6">
      {/* Monthly / Annual Toggle Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {language === 'pt' ? 'Escolha o Ciclo de Faturação' : 'Choose Your Billing Cycle'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {language === 'pt' 
              ? 'Economize 20% com o pagamento anual ou mantenha a flexibilidade mensal.' 
              : 'Save 20% with annual upfront billing or maintain complete monthly flexibility.'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto bg-gray-100 dark:bg-gray-800/80 p-1.5 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
          <button
            type="button"
            onClick={() => setFrequency('monthly')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              frequency === 'monthly'
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            {language === 'pt' ? 'Mensal' : 'Monthly'}
          </button>

          <button
            type="button"
            onClick={() => setFrequency('annual')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              frequency === 'annual'
                ? "bg-amber-600 text-white shadow-xs"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            <span>{language === 'pt' ? 'Anual' : 'Annual'}</span>
            <span className={cn(
              "text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
              frequency === 'annual' ? "bg-white text-amber-600" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            )}>
              {language === 'pt' ? '-20% Desconto' : 'Save 20%'}
            </span>
          </button>
        </div>
      </div>

      {/* Plans Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {availablePlans.map((p) => {
          const isCurrent = currentSubscription.planId === p.id && currentSubscription.billingFrequency === frequency;
          const isCurrentPlanDifferentFreq = currentSubscription.planId === p.id && currentSubscription.billingFrequency !== frequency;
          const isPopular = p.isPopular;

          return (
            <div
              key={p.id}
              className={cn(
                "rounded-2xl p-6 transition-all relative flex flex-col justify-between border",
                isCurrent
                  ? "bg-amber-500/5 border-amber-500 dark:border-amber-500 shadow-sm"
                  : isPopular
                  ? "bg-white dark:bg-gray-900 border-amber-500/60 dark:border-amber-500/40 shadow-xs"
                  : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-xs hover:border-gray-300 dark:hover:border-gray-700"
              )}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-amber-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-xs tracking-wider flex items-center gap-1">
                    <Sparkles size={11} />
                    {language === 'pt' ? 'Mais Popular' : 'Most Popular'}
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                    {p.name}
                  </h4>
                  {isCurrent && (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      {language === 'pt' ? 'Plano Atual' : 'Active Plan'}
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 min-h-[36px] line-clamp-2">
                  {p.description}
                </p>

                <div className="my-5 flex items-baseline gap-1.5 pb-5 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                    {formatPrice(p, frequency)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatPerPeriod(p, frequency)}
                  </span>
                </div>

                {/* Plan Highlights */}
                <div className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    <span>
                      <strong>{p.entitlements.maxStaffUsers >= 999 ? 'Unlimited' : p.entitlements.maxStaffUsers}</strong> {language === 'pt' ? 'Utilizadores Staff' : 'Staff Accounts'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    <span>
                      <strong>{p.entitlements.maxTables >= 999 ? 'Unlimited' : p.entitlements.maxTables}</strong> {language === 'pt' ? 'Mesas Configuráveis' : 'Tables on Floor Plan'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    <span>
                      <strong>{p.entitlements.maxReservations >= 99999 ? 'Unlimited' : p.entitlements.maxReservations.toLocaleString()}</strong> {language === 'pt' ? 'Reservas / mês' : 'Reservations / mo'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {p.entitlements.customDomain ? (
                      <Check size={14} className="text-emerald-500 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 flex items-center justify-center text-gray-400 font-bold">•</span>
                    )}
                    <span className={cn(!p.entitlements.customDomain && "text-gray-400 line-through")}>
                      {language === 'pt' ? 'Domínio Próprio Personalizado' : 'Custom Web Domain'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {p.entitlements.advancedAnalytics ? (
                      <Check size={14} className="text-emerald-500 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 flex items-center justify-center text-gray-400 font-bold">•</span>
                    )}
                    <span className={cn(!p.entitlements.advancedAnalytics && "text-gray-400 line-through")}>
                      {language === 'pt' ? 'Relatórios & Estatísticas Avançadas' : 'Advanced Analytics'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {p.entitlements.whatsapp ? (
                      <Check size={14} className="text-emerald-500 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 flex items-center justify-center text-gray-400 font-bold">•</span>
                    )}
                    <span className={cn(!p.entitlements.whatsapp && "text-gray-400 line-through")}>
                      {language === 'pt' ? 'Confirmações WhatsApp' : 'WhatsApp Confirmations'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {p.entitlements.waitlist ? (
                      <Check size={14} className="text-emerald-500 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 flex items-center justify-center text-gray-400 font-bold">•</span>
                    )}
                    <span className={cn(!p.entitlements.waitlist && "text-gray-400 line-through")}>
                      {language === 'pt' ? 'Lista de Espera em Tempo Real' : 'Real-time Live Waitlist'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-4">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed text-center"
                  >
                    {language === 'pt' ? 'Plano Selecionado' : 'Current Plan'}
                  </button>
                ) : (
                  <button
                    onClick={() => onSelectPlan(p, frequency)}
                    className={cn(
                      "w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5",
                      isPopular
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                    )}
                  >
                    <span>
                      {isCurrentPlanDifferentFreq
                        ? (language === 'pt' ? `Mudar para ${frequency === 'annual' ? 'Anual' : 'Mensal'}` : `Switch to ${frequency === 'annual' ? 'Annual' : 'Monthly'}`)
                        : (p.priceMonthly > (currentSubscription.priceMonthly || 0)
                          ? (language === 'pt' ? 'Fazer Upgrade' : 'Upgrade Plan')
                          : (language === 'pt' ? 'Mudar para este Plano' : 'Select Plan'))}
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
