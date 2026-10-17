import React from 'react';
import { 
  X, 
  Sparkles, 
  Calendar, 
  CreditCard, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';
import { Plan, RestaurantSubscription, BillingFrequency } from '../../../types';
import { cn } from '../../../lib/utils';
import { useLanguage } from '../../../hooks/useLanguage';

interface ChangePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlan: Plan | null;
  targetFrequency: BillingFrequency;
  currentSubscription: RestaurantSubscription;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}

export const ChangePlanModal: React.FC<ChangePlanModalProps> = ({
  isOpen,
  onClose,
  targetPlan,
  targetFrequency,
  currentSubscription,
  onConfirm,
  isLoading,
}) => {
  const { language } = useLanguage();

  if (!isOpen || !targetPlan) return null;

  const isUpgrade = targetPlan.priceMonthly > (currentSubscription.priceMonthly || 0);
  const isAnnual = targetFrequency === 'annual';
  const price = isAnnual 
    ? Math.round(targetPlan.priceMonthly * 12 * 0.8) 
    : targetPlan.priceMonthly;

  const formatCurrency = (amt: number) => `€${amt.toFixed(2)}`;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {language === 'pt' ? 'Confirmar Mudança de Plano' : 'Confirm Plan Change'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === 'pt' ? 'Reveja os detalhes antes de confirmar' : 'Review details before finalizing'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Plan Comparison Summary */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                {language === 'pt' ? 'Plano Atual:' : 'Current Plan:'}
              </span>
              <span className="font-bold text-gray-800 dark:text-gray-200">
                {currentSubscription.planName} ({currentSubscription.billingFrequency === 'annual' ? (language === 'pt' ? 'Anual' : 'Annual') : (language === 'pt' ? 'Mensal' : 'Monthly')})
              </span>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
              <span className="text-gray-500 dark:text-gray-400">
                {language === 'pt' ? 'Novo Plano Escolhido:' : 'Target Plan:'}
              </span>
              <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                {targetPlan.name} ({isAnnual ? (language === 'pt' ? 'Anual' : 'Annual') : (language === 'pt' ? 'Mensal' : 'Monthly')})
              </span>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
              <span className="text-gray-500 dark:text-gray-400">
                {language === 'pt' ? 'Novo Preço:' : 'New Price:'}
              </span>
              <span className="font-extrabold text-gray-900 dark:text-white text-base">
                {formatCurrency(price)}
                <span className="text-xs font-normal text-gray-500">
                  /{isAnnual ? (language === 'pt' ? 'ano' : 'yr') : (language === 'pt' ? 'mês' : 'mo')}
                </span>
              </span>
            </div>
          </div>

          {/* Billing Consequences Notice */}
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-300 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{language === 'pt' ? 'Informações de Faturação' : 'Billing Notice'}</span>
            </div>
            <p className="text-blue-800/90 dark:text-blue-200 leading-relaxed">
              {isUpgrade
                ? (language === 'pt'
                    ? 'O upgrade entrará em vigor de imediato. Será gerada uma fatura correspondente e o seu método de pagamento padrão será utilizado.'
                    : 'Your plan will be upgraded immediately. An invoice will be generated and billed to your default saved payment method.')
                : (language === 'pt'
                    ? 'A mudança para o novo plano terá efeito a partir do próximo ciclo de faturação. Manterá os seus limites atuais até lá.'
                    : 'The change will take effect starting from your next billing renewal date. You retain full current limits until then.')}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-950/40">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            {language === 'pt' ? 'Cancelar' : 'Go Back'}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{language === 'pt' ? 'A processar...' : 'Processing...'}</span>
              </>
            ) : (
              <span>{language === 'pt' ? 'Confirmar Mudança' : 'Confirm & Switch'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
