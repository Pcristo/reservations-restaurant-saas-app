import React from 'react';
import {
  Users,
  Calendar,
  Globe,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { MdTableRestaurant } from 'react-icons/md';
import { RestaurantSubscription, Plan } from '../../../types';
import {
  formatResourceAllowance,
  getLocalizedPlanName,
  getLocalizedPlanDescription,
  isPackageFeatureEnabled,
  MonthlyBookingUsageSummary,
} from '../../../services/entitlementsService';
import { cn } from '../../../lib/utils';
import { useLanguage } from '../../../hooks/useLanguage';

interface SubscriptionDetailsCardProps {
  subscription: RestaurantSubscription;
  plan: Plan;
  bookingUsage?: MonthlyBookingUsageSummary;
  activeStaffCount?: number;
  activeTablesCount?: number;
  onUpgradeClick: () => void;
  onCancelClick: () => void;
  onReactivateClick?: () => void;
  isReactivating?: boolean;
}

export const SubscriptionDetailsCard: React.FC<SubscriptionDetailsCardProps> = ({
  subscription,
  plan,
  bookingUsage,
  activeStaffCount,
  activeTablesCount,
  onUpgradeClick,
  onCancelClick,
  onReactivateClick,
  isReactivating = false,
}) => {
  const { language } = useLanguage();

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number, curr = 'EUR') => {
    const sym = curr === 'EUR' ? '€' : curr === 'USD' ? '$' : curr === 'GBP' ? '£' : `${curr} `;
    return `${sym}${(amount || 0).toFixed(2)}`;
  };

  const ent = plan?.entitlements || {
    maxStaffUsers: 5,
    maxTables: 30,
    maxReservations: 500,
    customDomain: true,
    whatsapp: true,
    sms: true,
    advancedSEO: true,
    waitlist: true,
    advancedAnalytics: true,
    apiAccess: false,
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {getLocalizedPlanName(plan || { id: subscription?.planId, name: subscription?.planName }, language)}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {subscription.billingFrequency === 'annual'
                ? language === 'pt'
                  ? 'Faturação Anual'
                  : 'Annual Billing'
                : language === 'pt'
                ? 'Faturação Mensal'
                : 'Monthly Billing'}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
            {getLocalizedPlanDescription(plan, language) ||
              (language === 'pt'
                ? 'Gestão completa de reservas, sincronização da planta em tempo real e gestão de clientes.'
                : 'Full table reservations suite, real-time live floor plan sync, and customer management.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {subscription.cancelAtPeriodEnd ? (
            onReactivateClick && (
              <button
                onClick={onReactivateClick}
                disabled={isReactivating}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw size={14} className={isReactivating ? 'animate-spin' : ''} />
                <span>
                  {language === 'pt' ? 'Reativar Subscrição' : 'Reactivate Subscription'}
                </span>
              </button>
            )
          ) : (
            <>
              <button
                onClick={onUpgradeClick}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Sparkles size={14} />
                <span>
                  {language === 'pt' ? 'Mudar Plano / Ciclo' : 'Change Plan / Billing'}
                </span>
              </button>

              <button
                onClick={onCancelClick}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-900/50"
              >
                {language === 'pt' ? 'Cancelar Subscrição' : 'Cancel Subscription'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Cancellation Warning Banner if active */}
      {subscription.cancelAtPeriodEnd && (
        <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-start gap-3">
          <AlertTriangle
            size={18}
            className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
          />
          <div className="text-xs space-y-1">
            <p className="font-bold">
              {language === 'pt' ? 'Cancelamento Agendado' : 'Scheduled Cancellation'}
            </p>
            <p className="text-amber-700 dark:text-amber-400/90 leading-relaxed">
              {language === 'pt'
                ? `A sua subscrição será cancelada a ${formatDate(subscription.currentPeriodEnd)}. O seu restaurante continuará a ter acesso total aos recursos até essa data. Não serão efetuadas novas cobranças.`
                : `Your subscription is scheduled to end on ${formatDate(subscription.currentPeriodEnd)}. Your restaurant retains full access to all features until this date. No further charges will be made.`}
            </p>
          </div>
        </div>
      )}

      {/* Period & Renewal Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-b border-gray-100 dark:border-gray-800 text-xs">
        <div>
          <span className="text-gray-400 font-semibold block uppercase text-[10px] tracking-wider">
            {language === 'pt' ? 'Preço Vigente' : 'Current Price'}
          </span>
          <span className="text-sm font-extrabold text-gray-900 dark:text-white mt-1 block">
            {formatCurrency(
              subscription.currentPrice || plan?.priceMonthly || 0,
              subscription.currency
            )}
            <span className="text-[11px] font-normal text-gray-500">
              /
              {subscription.billingFrequency === 'annual'
                ? language === 'pt'
                  ? 'ano'
                  : 'yr'
                : language === 'pt'
                ? 'mês'
                : 'mo'}
            </span>
          </span>
        </div>

        <div>
          <span className="text-gray-400 font-semibold block uppercase text-[10px] tracking-wider">
            {language === 'pt' ? 'Período Atual' : 'Billing Period'}
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-white mt-1 block">
            {formatDate(subscription.currentPeriodStart)} –{' '}
            {formatDate(subscription.currentPeriodEnd)}
          </span>
        </div>

        <div>
          <span className="text-gray-400 font-semibold block uppercase text-[10px] tracking-wider">
            {language === 'pt' ? 'Data de Renovação' : 'Next Renewal'}
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-white mt-1 block">
            {subscription.cancelAtPeriodEnd
              ? language === 'pt'
                ? 'Não renova'
                : 'Will not renew'
              : formatDate(subscription.nextBillingDate || subscription.currentPeriodEnd)}
          </span>
        </div>

        <div>
          <span className="text-gray-400 font-semibold block uppercase text-[10px] tracking-wider">
            {language === 'pt' ? 'Membro Desde' : 'Member Since'}
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-white mt-1 block">
            {formatDate(subscription.createdAt)}
          </span>
        </div>
      </div>

      {/* Included Limits & Live Usage */}
      <div className="pt-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
          {language === 'pt'
            ? 'Limites, Utilização & Recursos Incluídos no Pacote'
            : 'Package Allowance, Usage & Feature Entitlements'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Monthly Bookings Usage & Allowance */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Calendar size={16} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                {language === 'pt' ? 'Reservas Mensais' : 'Monthly Bookings'}
              </span>
              <span className="text-sm font-extrabold text-gray-900 dark:text-white block">
                {bookingUsage
                  ? `${bookingUsage.used} / ${formatResourceAllowance(ent, 'bookings', language)}`
                  : formatResourceAllowance(ent, 'bookings', language)}
              </span>
              {bookingUsage && bookingUsage.remaining !== null && (
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block">
                  {language === 'pt'
                    ? `${bookingUsage.remaining} restantes no período`
                    : `${bookingUsage.remaining} remaining this period`}
                </span>
              )}
            </div>
          </div>

          {/* Staff Accounts Usage & Allowance */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users size={16} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                {language === 'pt' ? 'Contas de Staff' : 'Staff Accounts'}
              </span>
              <span className="text-sm font-extrabold text-gray-900 dark:text-white block">
                {typeof activeStaffCount === 'number'
                  ? `${activeStaffCount} / ${formatResourceAllowance(ent, 'staff', language)}`
                  : formatResourceAllowance(ent, 'staff', language)}
              </span>
            </div>
          </div>

          {/* Dining Tables Usage & Allowance */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <MdTableRestaurant size={16} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                {language === 'pt' ? 'Mesas de Refeição' : 'Dining Tables'}
              </span>
              <span className="text-sm font-extrabold text-gray-900 dark:text-white block">
                {typeof activeTablesCount === 'number'
                  ? `${activeTablesCount} / ${formatResourceAllowance(ent, 'tables', language)}`
                  : formatResourceAllowance(ent, 'tables', language)}
              </span>
            </div>
          </div>

          {/* Custom Subdomain/Domain */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Globe size={16} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                {language === 'pt' ? 'Domínio / Subdomínio' : 'Custom Subdomain/Domain'}
              </span>
              <span className="text-sm font-extrabold text-gray-900 dark:text-white block">
                {ent.customDomain
                  ? language === 'pt'
                    ? 'Incluído'
                    : 'Included'
                  : language === 'pt'
                  ? 'Não incluído'
                  : 'Not Included'}
              </span>
            </div>
          </div>
        </div>

        {/* Feature Entitlement Badges */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {[
            {
              enabled: ent.customDomain,
              label:
                language === 'pt'
                  ? 'Domínio / Subdomínio Próprio'
                  : 'Custom Subdomain/Domain',
            },
            {
              enabled: ent.whatsapp,
              label: language === 'pt' ? 'Ações WhatsApp' : 'WhatsApp Action',
            },
            {
              enabled: ent.sms,
              label: language === 'pt' ? 'Lembretes SMS' : 'SMS Reminders',
            },
            {
              enabled: ent.advancedSEO,
              label: language === 'pt' ? 'SEO Avançado' : 'Advanced SEO',
            },
            {
              enabled: ent.waitlist,
              label:
                language === 'pt' ? 'Gestão de Lista de Espera' : 'Waitlist Management',
            },
            {
              enabled: ent.advancedAnalytics,
              label: language === 'pt' ? 'Análises Avançadas' : 'Advanced Analytics',
            },
            {
              enabled: isPackageFeatureEnabled(ent, 'smartAlerts'),
              label: language === 'pt' ? 'Alertas Inteligentes' : 'Smart Alerts',
            },
            {
              enabled: ent.apiAccess,
              label:
                language === 'pt'
                  ? 'API REST & Webhooks'
                  : 'API Webhooks & Integrations',
            },
          ].map((feat, idx) => (
            <span
              key={idx}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold border',
                feat.enabled
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-transparent'
              )}
            >
              {feat.enabled ? <Check size={12} /> : <X size={12} />}
              {feat.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
