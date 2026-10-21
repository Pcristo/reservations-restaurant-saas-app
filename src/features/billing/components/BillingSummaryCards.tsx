import React from 'react';
import { 
  CreditCard, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { BillingOverviewSummary } from '../../../types';
import { getLocalizedPlanName } from '../../../services/entitlementsService';
import { cn } from '../../../lib/utils';
import { useLanguage } from '../../../hooks/useLanguage';

interface BillingSummaryCardsProps {
  overview: BillingOverviewSummary;
  onPayOutstanding?: () => void;
  onViewPlans?: () => void;
}

export const BillingSummaryCards: React.FC<BillingSummaryCardsProps> = ({
  overview,
  onPayOutstanding,
  onViewPlans,
}) => {
  const { language } = useLanguage();
  const sub = overview.subscription;
  const plan = overview.currentPlan;

  // Status mapping
  const statusDetails: Record<string, { label: string; labelPt: string; color: string; bg: string; border: string }> = {
    active: {
      label: 'Active',
      labelPt: 'Ativa',
      color: 'text-emerald-500 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
    },
    trial: {
      label: 'Free Trial',
      labelPt: 'Período Experimental',
      color: 'text-blue-500 dark:text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
    },
    payment_due: {
      label: 'Payment Due',
      labelPt: 'Pagamento Pendente',
      color: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
    },
    past_due: {
      label: 'Past Due',
      labelPt: 'Vencido',
      color: 'text-red-500 dark:text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
    },
    suspended: {
      label: 'Suspended',
      labelPt: 'Suspensa',
      color: 'text-rose-500 dark:text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
    },
    cancelled: {
      label: 'Cancelled',
      labelPt: 'Cancelada',
      color: 'text-gray-500 dark:text-gray-400',
      bg: 'bg-gray-500/10',
      border: 'border-gray-500/30',
    },
  };

  const statusConfig = statusDetails[sub.status] || statusDetails.active;

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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Current Plan */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/40 transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {language === 'pt' ? 'Plano Atual' : 'Current Plan'}
          </span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Zap size={18} />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white truncate">
              {getLocalizedPlanName(plan || { id: sub?.planId, name: sub?.planName || 'Professional' }, language)}
            </h3>
            {sub.cancelAtPeriodEnd && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                {language === 'pt' ? 'Termina em breve' : 'Cancels soon'}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatCurrency(sub.currentPrice || plan?.priceMonthly || 0, sub.currency)} / {sub.billingFrequency === 'annual' ? (language === 'pt' ? 'ano' : 'yr') : (language === 'pt' ? 'mês' : 'mo')}
          </p>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs">
          <button
            onClick={onViewPlans}
            className="text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{language === 'pt' ? 'Mudar Plano' : 'Change Plan'}</span>
            <ArrowUpRight size={13} />
          </button>
        </div>
      </div>

      {/* 2. Subscription Status */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-amber-500/40 transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {language === 'pt' ? 'Estado' : 'Subscription Status'}
          </span>
          <div className={cn("p-2 rounded-xl", statusConfig.bg, statusConfig.color)}>
            <ShieldCheck size={18} />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border", statusConfig.bg, statusConfig.color, statusConfig.border)}>
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              {language === 'pt' ? statusConfig.labelPt : statusConfig.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {sub.cancelAtPeriodEnd 
              ? (language === 'pt' ? `Acesso até ${formatDate(sub.currentPeriodEnd)}` : `Access until ${formatDate(sub.currentPeriodEnd)}`)
              : (language === 'pt' ? `Renovação automática ativa` : `Auto-renews automatically`)}
          </p>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 text-[11px] text-gray-400">
          {language === 'pt' ? 'Faturação ' + (sub.billingFrequency === 'annual' ? 'Anual' : 'Mensal') : (sub.billingFrequency === 'annual' ? 'Annual' : 'Monthly') + ' cycle'}
        </div>
      </div>

      {/* 3. Next Payment */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-amber-500/40 transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {language === 'pt' ? 'Próximo Pagamento' : 'Next Payment'}
          </span>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Calendar size={18} />
          </div>
        </div>
        <div>
          {overview.nextPayment && !sub.cancelAtPeriodEnd ? (
            <>
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
                {formatCurrency(overview.nextPayment.amount, overview.nextPayment.currency)}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                <Clock size={12} className="text-blue-500" />
                <span>{formatDate(overview.nextPayment.date)}</span>
              </p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-extrabold text-gray-400 dark:text-gray-500">
                {language === 'pt' ? 'Nenhum agendado' : 'None scheduled'}
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {sub.cancelAtPeriodEnd ? (language === 'pt' ? 'Subscrição cancelada' : 'Subscription cancelled') : '—'}
              </p>
            </>
          )}
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 text-[11px] text-gray-400">
          {language === 'pt' ? 'Cobrado automaticamente' : 'Charged automatically'}
        </div>
      </div>

      {/* 4. Outstanding Balance */}
      <div className={cn(
        "rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all border",
        overview.outstandingBalance > 0
          ? "bg-amber-500/5 border-amber-500/30 dark:bg-amber-950/20"
          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-amber-500/40"
      )}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {language === 'pt' ? 'Saldo Devedor' : 'Outstanding Balance'}
          </span>
          <div className={cn(
            "p-2 rounded-xl",
            overview.outstandingBalance > 0 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
          )}>
            <AlertCircle size={18} />
          </div>
        </div>
        <div>
          <h3 className={cn(
            "text-xl font-extrabold",
            overview.outstandingBalance > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-white"
          )}>
            {formatCurrency(overview.outstandingBalance, sub.currency)}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {overview.outstandingBalance > 0 
              ? (language === 'pt' ? `${overview.unpaidInvoicesCount} fatura(s) pendente(s)` : `${overview.unpaidInvoicesCount} unpaid invoice(s)`)
              : (language === 'pt' ? 'Conta em dia' : 'All accounts settled')}
          </p>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
          {overview.outstandingBalance > 0 && onPayOutstanding ? (
            <button
              onClick={onPayOutstanding}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{language === 'pt' ? 'Pagar Agora' : 'Pay Now'}</span>
              <ArrowUpRight size={13} />
            </button>
          ) : (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
              <CheckCircle2 size={12} />
              <span>{language === 'pt' ? 'Sem dívidas' : 'No overdue dues'}</span>
            </span>
          )}
        </div>
      </div>

      {/* 5. Last Payment */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-amber-500/40 transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {language === 'pt' ? 'Último Pagamento' : 'Last Payment'}
          </span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CreditCard size={18} />
          </div>
        </div>
        <div>
          {overview.lastPayment ? (
            <>
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
                {formatCurrency(overview.lastPayment.amount, overview.lastPayment.currency)}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1 truncate">
                <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                <span className="truncate">{formatDate(overview.lastPayment.date)} ({overview.lastPayment.invoiceNumber})</span>
              </p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-extrabold text-gray-400">
                —
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {language === 'pt' ? 'Nenhum registo recente' : 'No recent payment'}
              </p>
            </>
          )}
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 text-[11px] text-gray-400 truncate">
          {overview.lastPayment?.paymentMethod || (language === 'pt' ? 'Cartão verificado' : 'Card verified')}
        </div>
      </div>
    </div>
  );
};
