import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  CreditCard, 
  CheckCircle2, 
  Calendar, 
  Building2, 
  FileText,
  Clock,
  Languages,
  Trash2
} from 'lucide-react';
import { Invoice } from '../../../types';
import { cn } from '../../../lib/utils';
import { APP_CONFIG } from '../../../data/appConfig';
import { downloadInvoicePdf } from '../../../services/billingService';
import { getDisplayInvoiceNumber } from '../utils/invoiceNaming';
import { useLanguage } from '../../../hooks/useLanguage';

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onPayClick?: (invoice: Invoice) => void;
  onDeleteInvoice?: (invoice: Invoice) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onPayClick,
  onDeleteInvoice,
}) => {
  const { language } = useLanguage();
  const [viewLang, setViewLang] = useState<'pt' | 'en'>(
    invoice?.language || (language === 'pt' ? 'pt' : 'en')
  );

  if (!isOpen || !invoice) return null;

  const isPt = viewLang === 'pt';

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isPt) {
        return d.toLocaleDateString('pt-PT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      }
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number, curr = 'EUR') => {
    const formattedNumber = (amount || 0).toFixed(2);
    if (curr === 'EUR') {
      return isPt ? `${formattedNumber.replace('.', ',')} €` : `€${formattedNumber}`;
    }
    const sym = curr === 'USD' ? '$' : curr === 'GBP' ? '£' : `${curr} `;
    return `${sym}${formattedNumber}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = (lang: 'pt' | 'en' = viewLang) => {
    downloadInvoicePdf(invoice, lang);
  };

  const statusBadges: Record<string, { label: string; labelPt: string; bg: string; text: string; border: string }> = {
    paid: {
      label: 'PAID',
      labelPt: 'LIQUIDADO',
      bg: 'bg-emerald-500/10 dark:bg-emerald-950/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/30',
    },
    unpaid: {
      label: 'PAYMENT DUE',
      labelPt: 'A PAGAR',
      bg: 'bg-amber-500/10 dark:bg-amber-950/30',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/30',
    },
    overdue: {
      label: 'OVERDUE',
      labelPt: 'VENCIDO',
      bg: 'bg-rose-500/10 dark:bg-rose-950/30',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-500/30',
    },
    pending: {
      label: 'PENDING',
      labelPt: 'A PROCESSAR',
      bg: 'bg-blue-500/10 dark:bg-blue-950/30',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-500/30',
    },
    void: {
      label: 'VOID',
      labelPt: 'ANULADO',
      bg: 'bg-gray-500/10 dark:bg-gray-800',
      text: 'text-gray-500',
      border: 'border-gray-500/30',
    },
  };

  const badge = statusBadges[invoice.status] || statusBadges.unpaid;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Bar */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-950/40">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              {getDisplayInvoiceNumber(invoice.invoiceNumber, invoice.id, isPt ? 'pt' : 'en')}
            </span>
            <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border", badge.bg, badge.text, badge.border)}>
              {isPt ? badge.labelPt : badge.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View Language Switcher */}
            <div className="flex items-center rounded-xl p-0.5 bg-gray-200/60 dark:bg-gray-800 border border-gray-300/40 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setViewLang('pt')}
                className={cn(
                  "px-2 py-0.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer",
                  isPt ? "bg-amber-600 text-white shadow-2xs" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                )}
                title="Visualizar em Português (PT)"
              >
                PT
              </button>
              <button
                type="button"
                onClick={() => setViewLang('en')}
                className={cn(
                  "px-2 py-0.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer",
                  !isPt ? "bg-amber-600 text-white shadow-2xs" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                )}
                title="View in English (EN)"
              >
                EN
              </button>
            </div>



            <button
              onClick={handlePrint}
              className="p-1.5 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              title={isPt ? "Imprimir" : "Print"}
            >
              <Printer size={16} />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Invoice Printable View */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs text-gray-700 dark:text-gray-300 print:p-0">
          {/* Header Brand */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-600 flex items-center justify-center text-white font-black text-sm">
                  D
                </div>
                <span className="font-extrabold text-lg text-gray-900 dark:text-white">
                  {APP_CONFIG.appName}
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Hospitality Solutions Ltd • VAT / NIF: IE 3849120H
              </p>
              <p className="text-[11px] text-gray-400">
                {APP_CONFIG.address}, Dublin 2, Ireland
              </p>
            </div>

            <div className="text-right space-y-1">
              <span className="text-2xl font-black text-gray-900 dark:text-white block tracking-tight">
                {isPt 
                  ? (invoice.status === 'paid' ? 'FATURA-RECIBO' : 'FATURA')
                  : (invoice.status === 'paid' ? 'RECEIPT' : 'INVOICE')}
              </span>
              <span className="font-mono text-xs font-bold text-gray-500">
                {getDisplayInvoiceNumber(invoice.invoiceNumber, invoice.id, isPt ? 'pt' : 'en')}
              </span>
            </div>
          </div>

          {/* Supplier & Customer Info Grid */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                {isPt ? 'Faturado A:' : 'Billed To:'}
              </span>
              <p className="font-extrabold text-sm text-gray-900 dark:text-white">
                {invoice.restaurantLegalName || invoice.restaurantName}
              </p>
              {invoice.restaurantAddress && (
                <p className="text-gray-500 mt-0.5">{invoice.restaurantAddress}</p>
              )}
              {invoice.restaurantCity && (
                <p className="text-gray-500">
                  {invoice.restaurantCity}, {invoice.restaurantPostalCode} {invoice.restaurantCountry}
                </p>
              )}
              {invoice.restaurantVatNumber && (
                <p className="text-gray-500 font-mono mt-0.5">
                  {isPt ? 'NIF' : 'VAT ID'}: {invoice.restaurantVatNumber}
                </p>
              )}
              <p className="text-gray-400 mt-0.5">
                {isPt ? 'Contacto' : 'Contact'}: {invoice.customerEmail}
              </p>
            </div>

            <div className="text-right space-y-1.5">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  {isPt ? 'Data da Fatura:' : 'Invoice Date:'}
                </span>
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  {formatDate(invoice.issueDate)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  {isPt ? 'Data de Vencimento:' : 'Due Date:'}
                </span>
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  {formatDate(invoice.dueDate)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  {isPt ? 'Período de Faturação:' : 'Billing Period:'}
                </span>
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  {invoice.billingPeriod}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/80 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  <th className="py-2.5 px-4">{isPt ? 'Descrição' : 'Description'}</th>
                  <th className="py-2.5 px-3 text-center">{isPt ? 'Qtd' : 'Qty'}</th>
                  <th className="py-2.5 px-3 text-right">{isPt ? 'Preço Unit.' : 'Unit Price'}</th>
                  <th className="py-2.5 px-3 text-right">{isPt ? 'IVA' : 'VAT'}</th>
                  <th className="py-2.5 px-4 text-right">{isPt ? 'Total' : 'Amount'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {(invoice.lineItems || []).map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      {item.description}
                      {item.periodStart && (
                        <span className="block text-[10px] text-gray-400 font-normal">
                          {isPt ? 'Período' : 'Period'}: {item.periodStart} {item.periodEnd ? `– ${item.periodEnd}` : ''}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center text-gray-500">{item.quantity || 1}</td>
                    <td className="py-3 px-3 text-right text-gray-500 font-mono">
                      {formatCurrency(item.unitPrice, invoice.currency)}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-500 font-mono">
                      {invoice.taxRate || 23}%
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-gray-900 dark:text-white font-mono">
                      {formatCurrency(item.amount, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Payment Details */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
            {/* Payment or Instructions */}
            <div className="w-full sm:max-w-xs p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-1.5">
              {invoice.status === 'paid' ? (
                <>
                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={15} />
                    <span>{isPt ? 'Comprovativo de Pagamento' : 'Payment Confirmation'}</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {isPt ? 'Liquidado na totalidade a:' : 'Paid in full on:'} {formatDate(invoice.paidAt || invoice.issueDate)}
                  </p>
                  {invoice.paymentMethodDescription && (
                    <p className="text-[11px] text-gray-500">
                      {isPt ? 'Método:' : 'Method:'} {invoice.paymentMethodDescription}
                    </p>
                  )}
                  {invoice.transactionReference && (
                    <p className="text-[10px] text-gray-400 font-mono truncate">
                      {isPt ? 'Ref:' : 'Ref:'} {invoice.transactionReference}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                    <Clock size={15} />
                    <span>{isPt ? 'Instruções de Pagamento' : 'Payment Instructions'}</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {isPt ? 'Banco: Millennium BCP / Bank of Ireland' : 'Bank: Bank of Ireland (College Green, Dublin)'}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {isPt ? 'IBAN: PT50 0033 0000 1712 3456 7890 1' : 'IBAN: IE29 BOFI 9000 1712 3456 78'}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    BIC: {isPt ? 'BCPTPTLX' : 'BOFIIE2D'}
                  </p>
                  <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    Ref: {getDisplayInvoiceNumber(invoice.invoiceNumber, invoice.id, isPt ? 'pt' : 'en')}
                  </p>
                </>
              )}
            </div>

            {/* Totals Table */}
            <div className="w-full sm:w-60 space-y-2 text-right">
              <div className="flex justify-between text-gray-500">
                <span>{isPt ? 'Incidência (s/ IVA):' : 'Subtotal (excl. VAT):'}</span>
                <span className="font-mono">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>{isPt ? `IVA (${invoice.taxRate || 23}%):` : `VAT (${invoice.taxRate || 23}%):`}</span>
                <span className="font-mono">{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700 text-sm font-extrabold text-gray-900 dark:text-white">
                <span>{isPt ? (invoice.status === 'paid' ? 'Total Liquidado:' : 'Total a Pagar:') : (invoice.status === 'paid' ? 'Total Paid:' : 'Total Payable:')}</span>
                <span className="text-base text-amber-600 dark:text-amber-400 font-mono">
                  {formatCurrency(invoice.total, invoice.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-950/40">
          <div>
            {onDeleteInvoice && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDeleteInvoice(invoice);
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer flex items-center gap-1.5"
                title={isPt ? 'Apagar esta fatura' : 'Delete this invoice'}
              >
                <Trash2 size={13} />
                <span>{isPt ? 'Apagar Fatura' : 'Delete Invoice'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {invoice.status !== 'paid' && onPayClick && (
              <button
                onClick={() => {
                  onClose();
                  onPayClick(invoice);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CreditCard size={13} />
                <span>{isPt ? 'Pagar Fatura' : 'Pay Invoice'}</span>
              </button>
            )}

            <button
              onClick={() => handleDownload('pt')}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              title="Descarregar Fatura em Português (PT-PT)"
            >
              <Download size={13} />
              <span>PDF (PT-PT)</span>
            </button>

            <button
              onClick={() => handleDownload('en')}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Download size={13} />
              <span>PDF (EN)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
