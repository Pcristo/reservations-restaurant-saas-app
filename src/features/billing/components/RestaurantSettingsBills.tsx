import React, { useState, useEffect, useCallback } from 'react';
import { 
  Receipt, 
  Download, 
  Eye, 
  Plus, 
  Trash2, 
  ExternalLink, 
  ShieldCheck, 
  AlertCircle, 
  RefreshCw, 
  CreditCard,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../../../hooks/useLanguage';
import { InvoicesTable } from './InvoicesTable';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { CreateInvoiceModal } from './CreateInvoiceModal';
import { 
  fetchBillingOverview, 
  deleteInvoice, 
  downloadInvoicePdf 
} from '../../../services/billingService';
import { Invoice, BillingOverviewSummary } from '../../../types';
import { cn } from '../../../lib/utils';
import { Link } from 'react-router-dom';
import { getDisplayInvoiceNumber } from '../utils/invoiceNaming';

interface RestaurantSettingsBillsProps {
  restaurantId: string;
  restaurantSettings?: any;
  theme?: string;
  adminBase?: string;
}

export const RestaurantSettingsBills: React.FC<RestaurantSettingsBillsProps> = ({
  restaurantId,
  restaurantSettings,
  theme,
  adminBase = `/r/${restaurantId}/admin`
}) => {
  const { language } = useLanguage();
  const isPt = language === 'pt';

  const [overview, setOverview] = useState<BillingOverviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadBillsData = useCallback(async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      const data = await fetchBillingOverview(restaurantId);
      setOverview(data);
      if (showToast) {
        toast.success(isPt ? 'Faturas e histórico atualizados!' : 'Bills and invoices refreshed!');
      }
    } catch (err: any) {
      console.error('[RestaurantSettingsBills] Error loading data:', err);
      toast.error(err?.message || (isPt ? 'Erro ao carregar faturas' : 'Failed to load invoices'));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [restaurantId, isPt]);

  useEffect(() => {
    loadBillsData();
  }, [loadBillsData]);

  // Handle invoice deletion
  const handleConfirmDelete = async () => {
    if (!invoiceToDelete) return;
    setIsDeleting(true);
    try {
      await deleteInvoice(invoiceToDelete.id, restaurantId);
      toast.success(
        isPt 
          ? `Fatura ${getDisplayInvoiceNumber(invoiceToDelete.invoiceNumber, invoiceToDelete.id, 'pt')} eliminada com sucesso!` 
          : `Invoice ${getDisplayInvoiceNumber(invoiceToDelete.invoiceNumber, invoiceToDelete.id, 'en')} deleted successfully!`
      );
      // Optimistic update
      setOverview((prev) => {
        if (!prev) return prev;
        const updated = prev.invoices.filter(i => i.id !== invoiceToDelete.id);
        const unpaid = updated.filter(i => i.status !== 'paid');
        return {
          ...prev,
          invoices: updated,
          unpaidInvoicesCount: unpaid.length,
          outstandingBalance: unpaid.reduce((sum, i) => sum + (Number(i.total) || 0), 0)
        };
      });
      setInvoiceToDelete(null);
      await loadBillsData();
    } catch (err: any) {
      toast.error(err?.message || (isPt ? 'Falha ao eliminar fatura' : 'Failed to delete invoice'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className={cn(
        "p-6 rounded-2xl border transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4",
        theme === 'dark' ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
      )}>
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>{isPt ? 'Faturas & Histórico de Cobranças' : 'Restaurant Bills & Invoices'}</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {isPt ? 'PDF PT-PT / EN' : 'PDF EN / PT-PT'}
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isPt
                  ? 'Consulte as faturas emitidas para o seu restaurante, visualize os detalhes e descarregue os PDFs em Português ou Inglês.'
                  : 'Review all issued invoices for your restaurant, preview details, and download PDF bills in English or Portuguese (PT-PT).'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to={`${adminBase}/billing`}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={14} />
            <span>{isPt ? 'Mudar / Cancelar Plano' : 'Change / Cancel Plan'}</span>
          </Link>

          <button
            type="button"
            onClick={() => loadBillsData(true)}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
            title={isPt ? 'Atualizar' : 'Refresh'}
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-amber-500" : ""} />
            <span>{isPt ? 'Atualizar' : 'Refresh'}</span>
          </button>

          <Link
            to={`${adminBase}/billing`}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <CreditCard size={14} />
            <span>{isPt ? 'Painel de Faturação' : 'Billing Dashboard'}</span>
            <ExternalLink size={12} className="opacity-70" />
          </Link>
        </div>
      </div>

      {/* Subscription Quick Status Grid */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={cn(
            "p-5 rounded-2xl border transition-colors shadow-2xs space-y-1.5",
            theme === 'dark' ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
          )}>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              {isPt ? 'Plano Atual' : 'Current Plan'}
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-black text-gray-900 dark:text-white capitalize">
                {overview.currentPlan?.name || 'Professional'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                {overview.subscription?.status || 'Active'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-mono">
              €{overview.currentPlan?.priceMonthly || 79}/mês
            </p>
          </div>

          <div className={cn(
            "p-5 rounded-2xl border transition-colors shadow-2xs space-y-1.5",
            theme === 'dark' ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
          )}>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              {isPt ? 'Total de Faturas' : 'Total Invoices'}
            </span>
            <div className="text-xl font-black text-gray-900 dark:text-white font-mono">
              {overview.invoices.length}
            </div>
            <p className="text-[11px] text-gray-500">
              {overview.invoices.filter(i => i.status === 'paid').length} {isPt ? 'liquidadas' : 'settled'}
            </p>
          </div>

          <div className={cn(
            "p-5 rounded-2xl border transition-colors shadow-2xs space-y-1.5",
            theme === 'dark' ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
          )}>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              {isPt ? 'Saldo Pendente' : 'Outstanding Balance'}
            </span>
            <div className={cn(
              "text-xl font-black font-mono",
              overview.outstandingBalance > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
            )}>
              €{overview.outstandingBalance.toFixed(2)}
            </div>
            <p className="text-[11px] text-gray-500">
              {overview.unpaidInvoicesCount} {isPt ? 'fatura(s) a pagar' : 'due invoice(s)'}
            </p>
          </div>

          <div className={cn(
            "p-5 rounded-2xl border transition-colors shadow-2xs space-y-1.5",
            theme === 'dark' ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
          )}>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              {isPt ? 'Opções de Exportação' : 'Export Formats'}
            </span>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                🇵🇹 PDF (PT-PT)
              </span>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30">
                🇬🇧 PDF (EN)
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              {isPt ? 'Layout fiscal vetorizado' : 'Print-ready vector layout'}
            </p>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      {loading ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 animate-pulse space-y-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 mx-auto" />
          <p className="text-xs text-gray-400">
            {isPt ? 'A carregar faturas...' : 'Loading invoices...'}
          </p>
        </div>
      ) : (
        <InvoicesTable
          invoices={overview?.invoices || []}
          onViewInvoice={(inv) => setSelectedInvoiceForDetail(inv)}
          onPayInvoice={(inv) => setSelectedInvoiceForDetail(inv)}
          onDeleteInvoice={(inv) => setInvoiceToDelete(inv)}
        />
      )}

      {/* Show Invoice Details Modal with PT/EN Toggle & Download */}
      <InvoiceDetailModal
        isOpen={Boolean(selectedInvoiceForDetail)}
        onClose={() => setSelectedInvoiceForDetail(null)}
        invoice={selectedInvoiceForDetail}
        onDeleteInvoice={(inv) => {
          setSelectedInvoiceForDetail(null);
          setInvoiceToDelete(inv);
        }}
      />

      {/* Create Manual Invoice Modal */}
      <CreateInvoiceModal
        isOpen={isCreateInvoiceModalOpen}
        onClose={() => setIsCreateInvoiceModalOpen(false)}
        restaurantId={restaurantId}
        restaurantSettings={restaurantSettings}
        defaultPlanId={overview?.currentPlan?.id || 'professional'}
        currentLanguage={isPt ? 'pt' : 'en'}
        onInvoiceCreated={async () => {
          await loadBillsData();
        }}
      />

      {/* Delete Invoice Confirmation Modal */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {isPt ? 'Eliminar Fatura' : 'Delete Invoice'}
                </h3>
                <p className="text-xs text-gray-500 font-mono">
                  {getDisplayInvoiceNumber(invoiceToDelete.invoiceNumber, invoiceToDelete.id, isPt ? 'pt' : 'en')}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {isPt
                ? `Tem a certeza de que deseja eliminar esta fatura no valor de €${(invoiceToDelete.total || invoiceToDelete.subtotal || 0).toFixed(2)}? Esta ação não pode ser revertida.`
                : `Are you sure you want to delete this invoice for €${(invoiceToDelete.total || invoiceToDelete.subtotal || 0).toFixed(2)}? This action cannot be undone.`}
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isPt ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
              >
                {isDeleting ? (
                  <span>{isPt ? 'A eliminar...' : 'Deleting...'}</span>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>{isPt ? 'Eliminar Fatura' : 'Delete Invoice'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
