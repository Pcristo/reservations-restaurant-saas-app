import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  Search, 
  Download, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  FileText,
  Trash2
} from 'lucide-react';
import { PaymentTransaction } from '../../../types';
import { cn } from '../../../lib/utils';
import { useLanguage } from '../../../hooks/useLanguage';

interface TransactionHistorySectionProps {
  transactions: PaymentTransaction[];
  onDeleteTransaction?: (id: string) => Promise<void>;
}

export const TransactionHistorySection: React.FC<TransactionHistorySectionProps> = ({
  transactions,
  onDeleteTransaction,
}) => {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'succeeded' | 'failed' | 'pending'>('all');

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = tx.description.toLowerCase().includes(q);
        const matchesInv = (tx.invoiceNumber || '').toLowerCase().includes(q);
        const matchesRef = (tx.providerReference || '').toLowerCase().includes(q);
        if (!matchesDesc && !matchesInv && !matchesRef) return false;
      }
      return true;
    });
  }, [transactions, statusFilter, searchQuery]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number, curr = 'EUR') => {
    const sym = curr === 'EUR' ? '€' : curr === 'USD' ? '$' : curr === 'GBP' ? '£' : `${curr} `;
    return `${sym}${(amount || 0).toFixed(2)}`;
  };

  const exportCsv = () => {
    const headers = ['Transaction ID', 'Date', 'Invoice', 'Description', 'Amount', 'Currency', 'Status', 'Payment Method', 'Provider Reference'];
    const rows = filteredTransactions.map(tx => [
      tx.id,
      tx.date,
      tx.invoiceNumber,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.amount,
      tx.currency,
      tx.status,
      `"${tx.paymentMethod.replace(/"/g, '""')}"`,
      tx.providerReference,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DineMaster-Pro-Transactions-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {language === 'pt' ? 'Histórico de Transações' : 'Transaction History'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {language === 'pt' ? 'Auditoria completa de todos os pagamentos e tentativas de cobrança.' : 'Complete audit trail of all membership payment charges and gateway events.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference..."
              className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 w-44"
            />
            <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
          </div>

          <button
            onClick={exportCsv}
            disabled={filteredTransactions.length === 0}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <CreditCard size={32} className="mx-auto text-gray-300 dark:text-gray-600" />
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {language === 'pt' ? 'Nenhuma transação registada.' : 'No transactions recorded yet.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Invoice</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3">Payment Method</th>
                <th className="py-3 px-3">Provider Ref</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3 text-center">Status</th>
                {onDeleteTransaction && <th className="py-3 px-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="py-3.5 px-3 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {formatDate(tx.date)}
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-gray-900 dark:text-white">
                    {tx.invoiceNumber}
                  </td>
                  <td className="py-3.5 px-3 text-gray-600 dark:text-gray-300 max-w-xs truncate">
                    {tx.description}
                  </td>
                  <td className="py-3.5 px-3 text-gray-500 whitespace-nowrap">
                    {tx.paymentMethod}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[11px] text-gray-400 max-w-[140px] truncate" title={tx.providerReference}>
                    {tx.providerReference}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-extrabold text-gray-900 dark:text-white">
                    {formatCurrency(tx.amount, tx.currency)}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    {tx.status === 'succeeded' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 size={11} />
                        <span>Succeeded</span>
                      </span>
                    ) : tx.status === 'failed' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                        <XCircle size={11} />
                        <span>Failed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        <Clock size={11} />
                        <span>Pending</span>
                      </span>
                    )}
                  </td>
                  {onDeleteTransaction && (
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="text-gray-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
