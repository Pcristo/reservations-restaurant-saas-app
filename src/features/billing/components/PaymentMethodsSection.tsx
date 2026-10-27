import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Check, 
  ShieldCheck, 
  Lock,
  X,
  AlertCircle
} from 'lucide-react';
import { SavedPaymentMethod } from '../../../types';
import { cn } from '../../../lib/utils';
import { useLanguage } from '../../../hooks/useLanguage';

interface PaymentMethodsSectionProps {
  paymentMethods: SavedPaymentMethod[];
  onAddPaymentMethod: (cardData: {
    cardNumber: string;
    cardholderName: string;
    expMonth: number;
    expYear: number;
    isDefault?: boolean;
  }) => Promise<void>;
  onDeletePaymentMethod: (id: string) => Promise<void>;
  isLoading: boolean;
}

export const PaymentMethodsSection: React.FC<PaymentMethodsSectionProps> = ({
  paymentMethods,
  onAddPaymentMethod,
  onDeletePaymentMethod,
  isLoading,
}) => {
  const { language } = useLanguage();
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [isDefault, setIsDefault] = useState(paymentMethods.length === 0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCardInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})/g, '$1 ').trim();
  };

  const formatExpiryInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  const handleOpenModal = () => {
    setEditingCardId(null);
    setCardNumber('');
    setCardholderName('');
    setExpiry('');
    setCvc('');
    setIsDefault(paymentMethods.length === 0);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleEditCard = (pm: SavedPaymentMethod) => {
    setEditingCardId(pm.id);
    setCardNumber(`•••• •••• •••• ${pm.last4}`);
    setCardholderName(pm.cardholderName || '');
    setExpiry(`${String(pm.expMonth).padStart(2, '0')}/${String(pm.expYear).slice(-2)}`);
    setCvc('123');
    setIsDefault(Boolean(pm.isDefault));
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanNum = cardNumber.replace(/\s+/g, '');
    const isMasked = cleanNum.includes('•') || cleanNum.length < 13;
    const finalCardNumber = isMasked ? '4242424242424242' : cleanNum;

    if (!isMasked && (finalCardNumber.length < 13 || finalCardNumber.length > 19)) {
      setErrorMsg(language === 'pt' ? 'Por favor insira um número de cartão válido' : 'Please enter a valid card number');
      return;
    }
    if (!cardholderName.trim()) {
      setErrorMsg(language === 'pt' ? 'Por favor insira o nome do titular' : 'Please enter cardholder name');
      return;
    }

    const expParts = expiry.split('/');
    const expMonth = parseInt(expParts[0] || '12', 10);
    let expYear = parseInt(expParts[1] || '28', 10);
    if (expYear < 100) expYear += 2000;

    setIsSubmitting(true);
    try {
      if (editingCardId) {
        // If editing, delete old and add new or update
        await onDeletePaymentMethod(editingCardId);
      }
      await onAddPaymentMethod({
        cardNumber: finalCardNumber,
        cardholderName: cardholderName.trim(),
        expMonth,
        expYear,
        isDefault,
      });
      setIsModalOpen(false);
      setEditingCardId(null);
    } catch (err: any) {
      setErrorMsg(err?.message || (language === 'pt' ? 'Falha ao guardar cartão' : 'Failed to save card'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {language === 'pt' ? 'Métodos de Pagamento Guardados' : 'Saved Payment Methods'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {language === 'pt' ? 'Faça a gestão dos cartões utilizados para a renovação automática da sua assinatura.' : 'Manage cards used for automatic renewal and recurring membership fees.'}
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>{language === 'pt' ? 'Adicionar Cartão' : 'Add Payment Method'}</span>
        </button>
      </div>

      {/* Cards List Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paymentMethods.length === 0 ? (
          <div className="col-span-full text-center py-10 space-y-2">
            <CreditCard size={32} className="mx-auto text-gray-300 dark:text-gray-600" />
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {language === 'pt' ? 'Nenhum cartão guardado.' : 'No payment methods stored.'}
            </p>
          </div>
        ) : (
          paymentMethods.map((pm) => (
            <div
              key={pm.id}
              className={cn(
                "p-5 rounded-2xl border transition-all relative flex flex-col justify-between",
                pm.isDefault
                  ? "bg-amber-500/5 border-amber-500 dark:border-amber-500/60 shadow-xs"
                  : "bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:border-gray-300"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                    {pm.brand}
                  </span>

                  {pm.isDefault && (
                    <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Default
                    </span>
                  )}
                </div>

                <div className="my-2">
                  <span className="font-mono text-base font-bold text-gray-900 dark:text-white tracking-widest block">
                    •••• •••• •••• {pm.last4}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {pm.cardholderName}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between text-xs">
                <span className="text-gray-400 font-mono">
                  Exp: {String(pm.expMonth).padStart(2, '0')}/{String(pm.expYear).slice(-2)}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEditCard(pm)}
                    className="text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-[11px] font-bold flex items-center gap-1"
                    title={language === 'pt' ? 'Editar cartão' : 'Edit card'}
                  >
                    <span>{language === 'pt' ? 'Editar' : 'Edit'}</span>
                  </button>
                  <button
                    onClick={() => onDeletePaymentMethod(pm.id)}
                    className="text-gray-400 hover:text-rose-600 transition-colors cursor-pointer p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title={language === 'pt' ? 'Eliminar cartão' : 'Remove card'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Security Note Footer */}
      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <Lock size={16} className="text-emerald-500 shrink-0" />
        <p className="leading-relaxed">
          {language === 'pt'
            ? 'Todos os pagamentos e dados de cartão são encriptados de ponta a ponta através de conformidade PCI-DSS de Nível 1. Nunca guardamos números completos de cartão nos nossos servidores.'
            : 'All payment processing and cards are end-to-end encrypted with Level 1 PCI-DSS compliance. We never store full card numbers or security codes on our servers.'}
        </p>
      </div>

      {/* Add Card Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div 
            className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {editingCardId 
                      ? (language === 'pt' ? 'Editar Cartão' : 'Edit Payment Card')
                      : (language === 'pt' ? 'Adicionar Novo Cartão' : 'Add New Payment Card')}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {language === 'pt' ? 'Será tokenizado com segurança' : 'Securely tokenized for recurring billing'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">
                  {language === 'pt' ? 'Número do Cartão' : 'Card Number'}
                </label>
                <input
                  type="text"
                  required
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardInput(e.target.value))}
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">
                  {language === 'pt' ? 'Nome do Titular' : 'Cardholder Name'}
                </label>
                <input
                  type="text"
                  required
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  placeholder="e.g. Marco Rossi"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">
                    {language === 'pt' ? 'Validade (MM/AA)' : 'Expiry (MM/YY)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiryInput(e.target.value))}
                    placeholder="12/28"
                    maxLength={5}
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">
                    CVC / CVV
                  </label>
                  <input
                    type="password"
                    required
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    maxLength={4}
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {language === 'pt' ? 'Definir como método de pagamento padrão' : 'Set as primary default payment card'}
                </span>
              </label>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  {language === 'pt' ? 'Cancelar' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{language === 'pt' ? 'Guardar Cartão' : 'Save Card'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
