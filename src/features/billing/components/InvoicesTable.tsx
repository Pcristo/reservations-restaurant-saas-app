import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  CreditCard, 
  FileText, 
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';
import { Invoice } from '../../../types';
import { cn } from '../../../lib/utils';
import { downloadInvoicePdf } from '../../../services/billingService';
import { getDisplayInvoiceNumber } from '../utils/invoiceNaming';
import { useLanguage } from '../../../hooks/useLanguage';

interface InvoicesTableProps {
  invoices: Invoice[];
  onViewInvoice: (invoice: Invoice) => void;
  onPayInvoice: (invoice: Invoice) => void;
  onCreateInvoice?: () => void;
  onDeleteInvoice?: (invoice: Invoice) => void;
}

export const InvoicesTable: React.FC<InvoicesTableProps> = ({
  invoices,
  onViewInvoice,
  onPayInvoice,
  onCreateInvoice,
  onDeleteInvoice,
}) => {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'overdue'>('all');

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'unpaid' && inv.status !== 'unpaid' && inv.status !== 'pending') return false;
        if (statusFilter === 'overdue' && inv.status !== 'overdue') return false;
        if (statusFilter === 'paid' && inv.status !== 'paid') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const invoiceLang = inv.language || (language === 'en' ? 'en' : 'pt');
        const matchesNumber = (inv.invoiceNumber || '').toLowerCase().includes(q) || 
          getDisplayInvoiceNumber(inv.invoiceNumber, inv.id, invoiceLang).toLowerCase().includes(q);
        const matchesPlan = (inv.planName || '').toLowerCase().includes(q);
        const matchesPeriod = (inv.billingPeriod || '').toLowerCase().includes(q);
        if (!matchesNumber && !matchesPlan && !matchesPeriod) return false;
      }

      return true;
    });
  }, [invoices, statusFilter, searchQuery]);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={11} />
            <span>{language === 'pt' ? 'Pago' : 'Paid'}</span>
          </span>
        );
      case 'unpaid':
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Clock size={11} />
            <span>{language === 'pt' ? 'Pendente' : 'Due'}</span>
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <AlertCircle size={11} />
            <span>{language === 'pt' ? 'Vencido' : 'Overdue'}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-gray-500/10 text-gray-500 border border-gray-500/30">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {language === 'pt' ? 'Faturas & Histórico de Cobrança' : 'Invoices & Billing History'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {language === 'pt' ? 'Visualize, descarregue em PDF ou pague as faturas da sua assinatura.' : 'View, download PDF, or pay your subscription invoices.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onCreateInvoice && (
            <button
              type="button"
              onClick={onCreateInvoice}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              <Plus size={13} />
              <span>{language === 'pt' ? 'Criar Fatura' : 'Create Invoice'}</span>
            </button>
          )}

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'pt' ? 'Pesquisar fatura...' : 'Search invoice #...'}
              className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 w-44 sm:w-52"
            />
            <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
          </div>

          {/* Status Filter */}
          <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 border border-gray-200/60 dark:border-gray-700/60 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                statusFilter === 'all' ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-2xs" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                statusFilter === 'paid' ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-2xs" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              {language === 'pt' ? 'Pagas' : 'Paid'}
            </button>
            <button
              onClick={() => setStatusFilter('unpaid')}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                statusFilter === 'unpaid' ? "bg-white dark:bg-gray-900 text-amber-600 dark:text-amber-400 shadow-2xs" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              {language === 'pt' ? 'Pendentes' : 'Unpaid'}
            </button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <FileText size={32} className="mx-auto text-gray-300 dark:text-gray-600" />
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {language === 'pt' ? 'Nenhuma fatura encontrada.' : 'No invoices found matching criteria.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <th className="py-3 px-3">Invoice #</th>
                <th className="py-3 px-3">Issue Date</th>
                <th className="py-3 px-3">Billing Period</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3 text-right">Subtotal</th>
                <th className="py-3 px-3 text-right">VAT (23%)</th>
                <th className="py-3 px-3 text-right">Total</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredInvoices.map((inv) => (
                <tr 
                  key={inv.id}
                  className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors group"
                >
                  <td className="py-3.5 px-3 font-mono font-bold text-gray-900 dark:text-white">
                    {getDisplayInvoiceNumber(inv.invoiceNumber, inv.id, inv.language || (language === 'en' ? 'en' : 'pt'))}
                  </td>
                  <td className="py-3.5 px-3 text-gray-500">
                    {formatDate(inv.issueDate)}
                  </td>
                  <td className="py-3.5 px-3 text-gray-500 whitespace-nowrap">
                    {inv.billingPeriod}
                  </td>
                  <td className="py-3.5 px-3 font-medium text-gray-800 dark:text-gray-200">
                    {inv.planName}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-gray-500">
                    {formatCurrency(inv.subtotal, inv.currency)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-gray-500">
                    {formatCurrency(inv.taxAmount, inv.currency)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-extrabold text-gray-900 dark:text-white">
                    {formatCurrency(inv.total, inv.currency)}
                  </td>
                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                    {getStatusBadge(inv.status)}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => onPayInvoice(inv)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <CreditCard size={12} />
                          <span>Pay</span>
                        </button>
                      )}

                      <button
                        onClick={() => onViewInvoice(inv)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        title={language === 'pt' ? 'Ver Detalhes da Fatura' : 'View Invoice Details'}
                      >
                        <Eye size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadInvoicePdf(inv, 'pt')}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold border border-gray-200 dark:border-gray-700 hover:border-amber-500/40 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Descarregar Fatura em Português (PT-PT)"
                      >
                        <Download size={11} />
                        <span>PDF (PT-PT)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadInvoicePdf(inv, 'en')}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold border border-gray-200 dark:border-gray-700 hover:border-indigo-500/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Download Invoice in English (EN)"
                      >
                        <Download size={11} />
                        <span>PDF (EN)</span>
                      </button>

                      {onDeleteInvoice && (
                        <button
                          type="button"
                          onClick={() => onDeleteInvoice(inv)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title={language === 'pt' ? 'Apagar Fatura' : 'Delete Invoice'}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
