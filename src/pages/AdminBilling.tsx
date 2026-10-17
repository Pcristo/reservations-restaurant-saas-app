import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  CreditCard, 
  Receipt, 
  Sparkles, 
  ShieldCheck, 
  History, 
  Wallet, 
  RefreshCw, 
  ArrowLeft,
  AlertCircle,
  HelpCircle,
  Download,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { useLanguage } from '../hooks/useLanguage';
import { useTenantSafe } from '../hooks/useTenant';
import { cn } from '../lib/utils';
import { 
  BillingOverviewSummary, 
  Plan, 
  BillingFrequency, 
  Invoice 
} from '../types';
import { 
  fetchBillingOverview, 
  changeSubscriptionPlan, 
  cancelSubscription, 
  reactivateSubscription, 
  payInvoice, 
  addPaymentMethod, 
  deletePaymentMethod 
} from '../services/billingService';
import { BillingSummaryCards } from '../features/billing/components/BillingSummaryCards';
import { SubscriptionDetailsCard } from '../features/billing/components/SubscriptionDetailsCard';
import { PlanComparisonSection } from '../features/billing/components/PlanComparisonSection';
import { InvoicesTable } from '../features/billing/components/InvoicesTable';
import { InvoiceDetailModal } from '../features/billing/components/InvoiceDetailModal';
import { PayInvoiceModal } from '../features/billing/components/PayInvoiceModal';
import { ChangePlanModal } from '../features/billing/components/ChangePlanModal';
import { CancelSubscriptionModal } from '../features/billing/components/CancelSubscriptionModal';
import { PaymentMethodsSection } from '../features/billing/components/PaymentMethodsSection';
import { TransactionHistorySection } from '../features/billing/components/TransactionHistorySection';

export default function AdminBilling() {
  const { slug } = useParams<{ slug?: string }>();
  const { user, isAdmin } = useAuth();
  const tenant = useTenantSafe();
  const rawSlug = slug || tenant?.slug || user?.restaurantId || (user?.restaurantIds && user.restaurantIds[0]) || 'bela-italia';
  const currentSlug = rawSlug.toLowerCase() === 'bella-italia' ? 'bela-italia' : rawSlug;
  const { settings } = useSettings(currentSlug);
  const { t, language } = useLanguage();
  const adminBase = `/r/${currentSlug}/admin`;

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'membership' | 'invoices' | 'payment_methods' | 'transactions'>('overview');

  // Billing Data state
  const [overview, setOverview] = useState<BillingOverviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [selectedPlanForChange, setSelectedPlanForChange] = useState<Plan | null>(null);
  const [targetFrequency, setTargetFrequency] = useState<BillingFrequency>('monthly');
  const [isChangePlanModalOpen, setIsChangePlanModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Load Billing Data
  const loadData = useCallback(async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      const data = await fetchBillingOverview(currentSlug);
      setOverview(data);
      if (showToast) {
        toast.success(language === 'pt' ? 'Dados de faturação atualizados!' : 'Billing data refreshed!');
      }
    } catch (err: any) {
      console.error('[AdminBilling] Error loading data:', err);
      toast.error(err?.message || 'Failed to load billing details');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentSlug, language]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle plan switch trigger from comparison cards
  const handleSelectPlan = (plan: Plan, freq: BillingFrequency) => {
    setSelectedPlanForChange(plan);
    setTargetFrequency(freq);
    setIsChangePlanModalOpen(true);
  };

  // Confirm plan switch
  const handleConfirmPlanChange = async () => {
    if (!selectedPlanForChange) return;
    setIsActionLoading(true);
    try {
      const res = await changeSubscriptionPlan(
        currentSlug,
        selectedPlanForChange.id,
        targetFrequency,
        user
      );
      toast.success(res.message || 'Plan updated successfully!');
      setIsChangePlanModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Could not change plan');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle cancel subscription
  const handleConfirmCancel = async (reason: string) => {
    setIsActionLoading(true);
    try {
      const res = await cancelSubscription(currentSlug, reason, user);
      toast.success(res.message || 'Subscription cancellation scheduled');
      setIsCancelModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to cancel subscription');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle reactivate subscription
  const handleReactivate = async () => {
    setIsActionLoading(true);
    try {
      const res = await reactivateSubscription(currentSlug, user);
      toast.success(res.message || 'Subscription reactivated!');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reactivate');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle pay invoice
  const handleConfirmPayment = async (paymentData: {
    cardNumber?: string;
    cardholderName?: string;
    paymentMethodToken?: any;
  }) => {
    if (!selectedInvoiceForPayment) return;
    setIsActionLoading(true);
    try {
      const res = await payInvoice(
        currentSlug,
        selectedInvoiceForPayment.id,
        paymentData,
        user
      );
      toast.success(res.message || 'Payment completed successfully!');
      setSelectedInvoiceForPayment(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Payment execution failed');
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle add payment method
  const handleAddPaymentMethod = async (cardData: any) => {
    try {
      const res = await addPaymentMethod(currentSlug, cardData, user);
      toast.success(res.message || 'Payment card added securely!');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add card');
      throw err;
    }
  };

  // Handle delete payment method
  const handleDeletePaymentMethod = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this payment method?')) return;
    try {
      await deletePaymentMethod(currentSlug, id);
      toast.success('Card removed');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete card');
    }
  };

  return (
    <div className={cn(
      "min-h-screen py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300",
      settings?.theme === 'dark' ? "bg-gray-950 text-white" : "bg-gray-50/70 text-gray-900"
    )}>
      <div className={cn(
        "mx-auto space-y-6",
        settings?.containerWidth === '1480px' ? "max-w-[1480px]" : "max-w-[1267px]"
      )}>
        {/* Top Breadcrumb & Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Link to={adminBase} className="hover:text-amber-600 transition-colors flex items-center gap-1">
                <ArrowLeft size={13} />
                <span>{language === 'pt' ? 'Painel' : 'Dashboard'}</span>
              </Link>
              <span>/</span>
              <span className="text-gray-700 dark:text-gray-300 font-semibold">
                {language === 'pt' ? 'Faturação & Subscrições' : 'Billing & Membership'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-gray-800 dark:text-gray-200 tracking-tight flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <CreditCard size={22} />
                </div>
                <span>{language === 'pt' ? 'Faturação & Gestão de Subscrições' : 'Billing & Membership'}</span>
              </h1>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {language === 'pt'
                ? `Faça a gestão da subscrição do ${settings?.name || 'Restaurante'}, descarregue faturas fiscais e efetue pagamentos.`
                : `Manage your subscription for ${settings?.name || 'Restaurant'}, download tax invoices, and review payment history.`}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin text-amber-500" : ""} />
              <span>{language === 'pt' ? 'Atualizar' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-gray-200 dark:border-gray-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              "px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap",
              activeTab === 'overview'
                ? "bg-amber-600 text-white shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <ShieldCheck size={16} />
            <span>{language === 'pt' ? 'Visão Geral' : 'Overview'}</span>
          </button>

          <button
            onClick={() => setActiveTab('membership')}
            className={cn(
              "px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap",
              activeTab === 'membership'
                ? "bg-amber-600 text-white shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <Sparkles size={16} />
            <span>{language === 'pt' ? 'Planos & Subscrição' : 'Plans & Membership'}</span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={cn(
              "px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap relative",
              activeTab === 'invoices'
                ? "bg-amber-600 text-white shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <Receipt size={16} />
            <span>{language === 'pt' ? 'Faturas & Recibos' : 'Invoices & Receipts'}</span>
            {overview && overview.unpaidInvoicesCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('payment_methods')}
            className={cn(
              "px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap",
              activeTab === 'payment_methods'
                ? "bg-amber-600 text-white shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <Wallet size={16} />
            <span>{language === 'pt' ? 'Cartões & Pagamento' : 'Payment Methods'}</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={cn(
              "px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap",
              activeTab === 'transactions'
                ? "bg-amber-600 text-white shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <History size={16} />
            <span>{language === 'pt' ? 'Histórico de Transações' : 'Transactions'}</span>
          </button>
        </div>

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-36 rounded-2xl bg-gray-200 dark:bg-gray-800" />
              ))}
            </div>
            <div className="h-64 rounded-2xl bg-gray-200 dark:bg-gray-800" />
          </div>
        ) : !overview ? (
          <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-3">
            <AlertCircle size={36} className="mx-auto text-amber-500" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {language === 'pt' ? 'Não foi possível carregar os dados de faturação' : 'Unable to load billing data'}
            </h3>
            <button
              onClick={() => loadData(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 text-white shadow-xs cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Outstanding Balance Notification Banner if overdue invoices exist */}
            {overview.outstandingBalance > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0">
                    <AlertCircle size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">
                      {language === 'pt' ? 'Fatura Pendente de Pagamento' : 'Outstanding Membership Balance'}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      {language === 'pt'
                        ? `Tem um saldo devedor de €${overview.outstandingBalance.toFixed(2)} referente a ${overview.unpaidInvoicesCount} fatura(s). Por favor efetue o pagamento para evitar interrupções de serviço.`
                        : `You have an outstanding balance of €${overview.outstandingBalance.toFixed(2)} across ${overview.unpaidInvoicesCount} invoice(s). Please settle to prevent service disruptions.`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const firstUnpaid = overview.invoices.find(i => i.status !== 'paid');
                    if (firstUnpaid) setSelectedInvoiceForPayment(firstUnpaid);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CreditCard size={13} />
                  <span>{language === 'pt' ? 'Pagar Agora' : 'Pay Outstanding Balance'}</span>
                </button>
              </div>
            )}

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <BillingSummaryCards
                  overview={overview}
                  onPayOutstanding={() => {
                    const firstUnpaid = overview.invoices.find(i => i.status !== 'paid');
                    if (firstUnpaid) setSelectedInvoiceForPayment(firstUnpaid);
                  }}
                  onViewPlans={() => setActiveTab('membership')}
                />

                <SubscriptionDetailsCard
                  subscription={overview.subscription}
                  plan={overview.currentPlan}
                  onUpgradeClick={() => setActiveTab('membership')}
                  onCancelClick={() => setIsCancelModalOpen(true)}
                  onReactivateClick={handleReactivate}
                  isReactivating={isActionLoading}
                />

                {/* Quick Invoices Preview */}
                <InvoicesTable
                  invoices={overview.invoices.slice(0, 5)}
                  onViewInvoice={(inv) => setSelectedInvoiceForDetail(inv)}
                  onPayInvoice={(inv) => setSelectedInvoiceForPayment(inv)}
                />
              </div>
            )}

            {/* TAB 2: MEMBERSHIP & PLANS */}
            {activeTab === 'membership' && (
              <div className="space-y-6">
                <SubscriptionDetailsCard
                  subscription={overview.subscription}
                  plan={overview.currentPlan}
                  onUpgradeClick={() => {}}
                  onCancelClick={() => setIsCancelModalOpen(true)}
                  onReactivateClick={handleReactivate}
                  isReactivating={isActionLoading}
                />

                <PlanComparisonSection
                  currentSubscription={overview.subscription}
                  onSelectPlan={handleSelectPlan}
                />
              </div>
            )}

            {/* TAB 3: INVOICES & BILLING HISTORY */}
            {activeTab === 'invoices' && (
              <InvoicesTable
                invoices={overview.invoices}
                onViewInvoice={(inv) => setSelectedInvoiceForDetail(inv)}
                onPayInvoice={(inv) => setSelectedInvoiceForPayment(inv)}
              />
            )}

            {/* TAB 4: PAYMENT METHODS */}
            {activeTab === 'payment_methods' && (
              <PaymentMethodsSection
                paymentMethods={overview.paymentMethods}
                onAddPaymentMethod={handleAddPaymentMethod}
                onDeletePaymentMethod={handleDeletePaymentMethod}
                isLoading={isActionLoading}
              />
            )}

            {/* TAB 5: TRANSACTIONS AUDIT */}
            {activeTab === 'transactions' && (
              <TransactionHistorySection
                transactions={overview.transactions}
              />
            )}
          </>
        )}

        {/* Modals */}
        <InvoiceDetailModal
          isOpen={Boolean(selectedInvoiceForDetail)}
          onClose={() => setSelectedInvoiceForDetail(null)}
          invoice={selectedInvoiceForDetail}
          onPayClick={(inv) => {
            setSelectedInvoiceForDetail(null);
            setSelectedInvoiceForPayment(inv);
          }}
        />

        <PayInvoiceModal
          isOpen={Boolean(selectedInvoiceForPayment)}
          onClose={() => setSelectedInvoiceForPayment(null)}
          invoice={selectedInvoiceForPayment}
          savedPaymentMethods={overview?.paymentMethods || []}
          onConfirmPayment={handleConfirmPayment}
          isLoading={isActionLoading}
        />

        <ChangePlanModal
          isOpen={isChangePlanModalOpen}
          onClose={() => setIsChangePlanModalOpen(false)}
          targetPlan={selectedPlanForChange}
          targetFrequency={targetFrequency}
          currentSubscription={overview?.subscription as any}
          onConfirm={handleConfirmPlanChange}
          isLoading={isActionLoading}
        />

        {overview && (
          <CancelSubscriptionModal
            isOpen={isCancelModalOpen}
            onClose={() => setIsCancelModalOpen(false)}
            subscription={overview.subscription}
            onConfirm={handleConfirmCancel}
            isLoading={isActionLoading}
          />
        )}
      </div>
    </div>
  );
}
