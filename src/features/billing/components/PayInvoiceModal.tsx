import React, { useState } from 'react';
import { 
  X, 
  CreditCard, 
  ShieldCheck, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle 
} from 'lucide-react';
import { Invoice, SavedPaymentMethod } from '../../../types';
import { cn } from '../../../lib/utils';
import { useLanguage } from '../../../hooks/useLanguage';

interface PayInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  savedPaymentMethods?: SavedPaymentMethod[];
  onConfirmPayment: (paymentData: {
    cardNumber?: string;
    cardholderName?: string;
    paymentMethodToken?: any;
  }) => Promise<void>;
  isLoading: boolean;
}

export const PayInvoiceModal: React.FC<PayInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
  savedPaymentMethods = [],
  onConfirmPayment,
  isLoading,
}) => {
  const { language } = useLanguage();
  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    savedPaymentMethods.find(m => m.isDefault)?.id || savedPaymentMethods[0]?.id || 'new_card'
  );

  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState(invoice?.restaurantLegalName || '');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !invoice) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      if (selectedMethodId === 'new_card') {
        const cleanNum = cardNumber.replace(/\s+/g, '');
        if (cleanNum.length < 13) {
          setErrorMessage('Please enter a valid card number');
          return;
        }
        if (!cardholderName.trim()) {
          setErrorMessage('Please enter cardholder name');
          return;
        }
        await onConfirmPayment({
          cardNumber: cleanNum,
          cardholderName: cardholderName.trim(),
        });
      } else {
        const method = savedPaymentMethods.find(m => m.id === selectedMethodId);
        await onConfirmPayment({
          paymentMethodToken: method,
          cardholderName: method?.cardholderName,
        });
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Payment failed. Please verify card details.');
    }
  };

  const formatCurrency = (amt: number, curr = 'EUR') => {
    const sym = curr === 'EUR' ? '€' : curr === 'USD' ? '$' : curr === 'GBP' ? '£' : `${curr} `;
    return `${sym}${(amt || 0).toFixed(2)}`;
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {language === 'pt' ? 'Pagar Fatura' : 'Pay Outstanding Invoice'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {invoice.invoiceNumber} • {formatCurrency(invoice.total, invoice.currency)}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Invoice Summary Pill */}
          <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                {language === 'pt' ? 'Total a Pagar' : 'Total Amount Due'}
              </span>
              <span className="text-xl font-black text-gray-900 dark:text-white mt-0.5 block">
                {formatCurrency(invoice.total, invoice.currency)}
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              {invoice.status}
            </span>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {language === 'pt' ? 'Método de Pagamento:' : 'Payment Method:'}
            </label>

            {savedPaymentMethods.map((m) => (
              <label
                key={m.id}
                className={cn(
                  "p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                  selectedMethodId === m.id
                    ? "bg-amber-500/5 border-amber-500 text-gray-900 dark:text-white"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                )}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={m.id}
                    checked={selectedMethodId === m.id}
                    onChange={() => setSelectedMethodId(m.id)}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="uppercase font-bold text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {m.brand}
                    </span>
                    <span>•••• {m.last4}</span>
                    <span className="text-[10px] text-gray-400">({m.expMonth}/{m.expYear})</span>
                  </div>
                </div>
                {m.isDefault && (
                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                    Default
                  </span>
                )}
              </label>
            ))}

            <label
              className={cn(
                "p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                selectedMethodId === 'new_card'
                  ? "bg-amber-500/5 border-amber-500 text-gray-900 dark:text-white"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
              )}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="new_card"
                  checked={selectedMethodId === 'new_card'}
                  onChange={() => setSelectedMethodId('new_card')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span className="text-xs font-semibold">
                  {language === 'pt' ? 'Utilizar Novo Cartão de Crédito/Débito' : 'Use a New Credit / Debit Card'}
                </span>
              </div>
            </label>
          </div>

          {/* New Card Fields */}
          {selectedMethodId === 'new_card' && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">
                  {language === 'pt' ? 'Número do Cartão' : 'Card Number'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardInput(e.target.value))}
                    placeholder="4242 4242 4242 4242"
                    maxLength={19}
                    className="w-full text-xs font-mono pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <CreditCard size={15} className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">
                  {language === 'pt' ? 'Nome no Cartão' : 'Cardholder Name'}
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

              {/* Test card simulator hint */}
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 space-y-0.5">
                <span className="font-bold text-gray-600 dark:text-gray-300">Test Cards:</span>
                <p>• Card ending in <strong className="text-emerald-600">4242</strong>: Successful payment</p>
                <p>• Card ending in <strong className="text-red-500">0002</strong>: Declined simulation</p>
              </div>
            </div>
          )}

          {/* Security guarantee */}
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 pt-1">
            <Lock size={12} className="text-emerald-500 shrink-0" />
            <span>256-bit encrypted secure checkout. Card credentials are never stored in raw form.</span>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              {language === 'pt' ? 'Cancelar' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{language === 'pt' ? 'A processar pagamento...' : 'Processing payment...'}</span>
                </>
              ) : (
                <span>
                  {language === 'pt' ? `Pagar ${formatCurrency(invoice.total, invoice.currency)}` : `Pay ${formatCurrency(invoice.total, invoice.currency)}`}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
