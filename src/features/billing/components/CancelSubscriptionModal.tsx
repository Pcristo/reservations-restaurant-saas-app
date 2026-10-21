import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  Calendar, 
  ShieldAlert 
} from 'lucide-react';
import { RestaurantSubscription } from '../../../types';
import { getLocalizedPlanName } from '../../../services/entitlementsService';
import { useLanguage } from '../../../hooks/useLanguage';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: RestaurantSubscription;
  onConfirm: (reason: string) => Promise<void>;
  isLoading: boolean;
}

export const CancelSubscriptionModal: React.FC<CancelSubscriptionModalProps> = ({
  isOpen,
  onClose,
  subscription,
  onConfirm,
  isLoading,
}) => {
  const { language } = useLanguage();
  const [reason, setReason] = useState('switching_provider');
  const [customNotes, setCustomNotes] = useState('');

  if (!isOpen) return null;

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

  const handleConfirm = () => {
    const finalReason = customNotes ? `${reason}: ${customNotes}` : reason;
    onConfirm(finalReason);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {language === 'pt' ? 'Cancelar Subscrição?' : 'Cancel Subscription?'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === 'pt' ? 'Lamentamos ver o seu restaurante partir' : "We're sorry to see your restaurant go"}
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
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs space-y-2">
            <p className="font-bold">
              {language === 'pt' ? 'O que acontece após o cancelamento:' : 'What happens after cancellation:'}
            </p>
            <ul className="list-disc pl-4 space-y-1 text-amber-800/90 dark:text-amber-200">
              <li>
                {language === 'pt'
                  ? `O seu plano ${getLocalizedPlanName({ id: subscription.planId, name: subscription.planName }, language)} permanece 100% ativo até ${formatDate(subscription.currentPeriodEnd)}.`
                  : `Your ${getLocalizedPlanName({ id: subscription.planId, name: subscription.planName }, language)} plan remains 100% active until ${formatDate(subscription.currentPeriodEnd)}.`}
              </li>
              <li>
                {language === 'pt'
                  ? 'Não serão feitas cobranças adicionais após essa data.'
                  : 'No further payments will be billed to your payment methods.'}
              </li>
              <li>
                {language === 'pt'
                  ? 'As suas reservas históricas e faturas passadas permanecem arquivadas e disponíveis para descarregamento a qualquer momento.'
                  : 'Your historical bookings, guest lists, and past invoices remain archived and accessible anytime.'}
              </li>
            </ul>
          </div>

          {/* Reason selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {language === 'pt' ? 'Motivo do cancelamento (opcional):' : 'Reason for cancelling (optional):'}
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="switching_provider">{language === 'pt' ? 'Mudança para outro sistema de reservas' : 'Switching to another reservation system'}</option>
              <option value="cost_pricing">{language === 'pt' ? 'Considerações de preço / custo' : 'Price / Cost considerations'}</option>
              <option value="closing_business">{language === 'pt' ? 'Restaurante vai encerrar ou pausar operações' : 'Restaurant is closing or pausing operations'}</option>
              <option value="missing_features">{language === 'pt' ? 'Faltam funcionalidades necessárias' : 'Missing required features'}</option>
              <option value="temporary">{language === 'pt' ? 'Encerramento sazonal / pausa temporária' : 'Seasonal closure / temporary pause'}</option>
              <option value="other">{language === 'pt' ? 'Outro motivo' : 'Other reason'}</option>
            </select>
          </div>

          {/* Additional Feedback */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {language === 'pt' ? 'Observações adicionais:' : 'Additional feedback:'}
            </label>
            <textarea
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder={language === 'pt' ? 'Diga-nos como poderíamos melhorar...' : 'Tell us what we could have done better...'}
              rows={2}
              className="w-full text-xs p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-950/40">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {language === 'pt' ? 'Manter Subscrição' : 'Keep Subscription'}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{language === 'pt' ? 'A cancelar...' : 'Cancelling...'}</span>
              </>
            ) : (
              <span>{language === 'pt' ? 'Confirmar Cancelamento' : 'Confirm Cancellation'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
