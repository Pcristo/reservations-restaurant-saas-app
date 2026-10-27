import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Plus, 
  Calendar, 
  DollarSign, 
  Check, 
  Sparkles, 
  Download, 
  Languages, 
  Building2, 
  Mail, 
  Clock, 
  Percent,
  Receipt
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Invoice } from '../../../types';
import { createManualInvoice, downloadInvoicePdf } from '../../../services/billingService';
import { generateCleanInvoiceNumber } from '../utils/invoiceNaming';
import { cn } from '../../../lib/utils';
import { DEFAULT_PLANS } from '../../../data/plans';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantSettings?: any;
  defaultPlanId?: string;
  currentLanguage?: 'en' | 'pt';
  onInvoiceCreated: (invoice: Invoice) => void;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  restaurantId,
  restaurantSettings,
  defaultPlanId = 'professional',
  currentLanguage = 'pt',
  onInvoiceCreated,
}) => {
  const [modalLang, setModalLang] = useState<'en' | 'pt'>(currentLanguage === 'en' ? 'en' : 'pt');
  const isPt = modalLang === 'pt';

  const todayStr = new Date().toISOString().split('T')[0];
  const in30DaysStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const now = new Date();
  const currentMonthStr = `${new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString(isPt ? 'pt-PT' : 'en-GB')} – ${new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString(isPt ? 'pt-PT' : 'en-GB')}`;

  // Form State
  const [selectedPlanId, setSelectedPlanId] = useState<string>(defaultPlanId);
  const [invoiceNumber, setInvoiceNumber] = useState<string>(() =>
    generateCleanInvoiceNumber(todayStr, modalLang)
  );
  const [issueDate, setIssueDate] = useState<string>(todayStr);
  const [dueDate, setDueDate] = useState<string>(in30DaysStr);
  const [billingPeriod, setBillingPeriod] = useState<string>(currentMonthStr);
  const [currency, setCurrency] = useState<string>('EUR');
  const [status, setStatus] = useState<'unpaid' | 'paid' | 'pending'>('unpaid');
  const [taxRate, setTaxRate] = useState<number>(23);
  const [pdfDownloadLang, setPdfDownloadLang] = useState<'pt' | 'en'>(modalLang);

  // Line items state
  const foundPlan = DEFAULT_PLANS.find(p => p.id === selectedPlanId);
  const [description, setDescription] = useState<string>(
    isPt 
      ? `Subscrição Pacote ${foundPlan?.name || 'Profissional'} - DineMaster Pro`
      : `${foundPlan?.name || 'Professional'} Subscription Package - DineMaster Pro`
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(foundPlan?.priceMonthly || 79);
  const [notes, setNotes] = useState<string>(
    isPt
      ? 'Obrigado pela preferência. Documento processado por via informática nos termos legais.'
      : 'Thank you for your business. Generated electronically via DineMaster Pro.'
  );

  // Customer / Restaurant details
  const [restaurantName, setRestaurantName] = useState<string>(
    restaurantSettings?.name || restaurantId || 'Bela Itália'
  );
  const [restaurantLegalName, setRestaurantLegalName] = useState<string>(
    restaurantSettings?.legalName || restaurantSettings?.name || 'Bela Itália Restauração Lda'
  );
  const [restaurantVatNumber, setRestaurantVatNumber] = useState<string>(
    restaurantSettings?.vatNumber || restaurantSettings?.nif || 'PT 512 345 678'
  );
  const [customerEmail, setCustomerEmail] = useState<string>(
    restaurantSettings?.email || 'billing@restaurant.com'
  );
  const [restaurantAddress, setRestaurantAddress] = useState<string>(
    restaurantSettings?.address || 'Rua das Flores, 123'
  );
  const [restaurantCity, setRestaurantCity] = useState<string>(
    restaurantSettings?.city || 'Lisboa'
  );
  const [restaurantPostalCode, setRestaurantPostalCode] = useState<string>(
    restaurantSettings?.postalCode || '1200-001'
  );
  const [restaurantCountry, setRestaurantCountry] = useState<string>(
    restaurantSettings?.country || 'Portugal'
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  // Real-time calculations
  const subtotal = Math.round(Number(unitPrice || 0) * Number(quantity || 1) * 100) / 100;
  const taxAmount = Math.round(subtotal * (Number(taxRate || 0) / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  // Handle plan selection change
  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    if (planId === 'custom') {
      setDescription(isPt ? 'Serviço Personalizado de Restauração' : 'Custom Hospitality Service');
      setUnitPrice(50);
      return;
    }
    const p = DEFAULT_PLANS.find(item => item.id === planId);
    if (p) {
      setUnitPrice(p.priceMonthly);
      setDescription(
        isPt
          ? `Subscrição Pacote ${p.name} - DineMaster Pro`
          : `${p.name} Subscription Package - DineMaster Pro`
      );
    }
  };

  // Toggle modal language and update default texts accordingly
  const handleToggleLanguage = (newLang: 'en' | 'pt') => {
    setModalLang(newLang);
    setPdfDownloadLang(newLang);
    setInvoiceNumber(prev => {
      if (/^(invoice|factura)_\d{2}_\d{2}(_\d+)?$/i.test(prev)) {
        return generateCleanInvoiceNumber(issueDate, newLang);
      }
      return prev;
    });
    if (newLang === 'pt') {
      if (selectedPlanId !== 'custom') {
        const p = DEFAULT_PLANS.find(item => item.id === selectedPlanId);
        setDescription(`Subscrição Pacote ${p?.name || 'Profissional'} - DineMaster Pro`);
      } else {
        setDescription('Serviço Personalizado de Restauração');
      }
      setNotes('Obrigado pela preferência. Documento processado por via informática nos termos legais.');
    } else {
      if (selectedPlanId !== 'custom') {
        const p = DEFAULT_PLANS.find(item => item.id === selectedPlanId);
        setDescription(`${p?.name || 'Professional'} Subscription Package - DineMaster Pro`);
      } else {
        setDescription('Custom Hospitality Service');
      }
      setNotes('Thank you for your business. Generated electronically via DineMaster Pro.');
    }
  };

  // Submit invoice creation
  const handleCreateInvoice = async (triggerDownload = false, downloadLanguage: 'en' | 'pt' = pdfDownloadLang) => {
    if (!restaurantName.trim()) {
      toast.error(isPt ? 'Por favor insira o nome do restaurante.' : 'Please enter restaurant name.');
      return;
    }
    if (subtotal <= 0) {
      toast.error(isPt ? 'O valor da fatura deve ser superior a zero.' : 'Invoice amount must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      const lineItems = [
        {
          id: `li-${Date.now()}`,
          description: description.trim(),
          quantity: Number(quantity),
          unitPrice: Number(unitPrice),
          amount: subtotal,
          periodStart: billingPeriod,
        }
      ];

      const createdInvoice = await createManualInvoice({
        restaurantId,
        restaurantName: restaurantName.trim(),
        restaurantLegalName: restaurantLegalName.trim() || restaurantName.trim(),
        restaurantAddress: restaurantAddress.trim(),
        restaurantCity: restaurantCity.trim(),
        restaurantPostalCode: restaurantPostalCode.trim(),
        restaurantCountry: restaurantCountry.trim(),
        restaurantVatNumber: restaurantVatNumber.trim(),
        customerEmail: customerEmail.trim() || 'billing@restaurant.com',
        amount: subtotal,
        taxRate: Number(taxRate),
        taxAmount,
        total,
        currency,
        issueDate,
        dueDate,
        billingPeriod,
        status,
        notes: notes.trim(),
        selectedPlanId: selectedPlanId !== 'custom' ? selectedPlanId : 'custom',
        planName: selectedPlanId !== 'custom' ? (DEFAULT_PLANS.find(p => p.id === selectedPlanId)?.name || 'Custom') : 'Custom',
        language: downloadLanguage,
        lineItems,
      });

      toast.success(
        isPt
          ? `Fatura ${createdInvoice.invoiceNumber} criada com sucesso!`
          : `Invoice ${createdInvoice.invoiceNumber} successfully created!`
      );

      if (triggerDownload) {
        downloadInvoicePdf(createdInvoice, downloadLanguage);
      }

      onInvoiceCreated(createdInvoice);
      onClose();
    } catch (err: any) {
      console.error('[CreateInvoiceModal] Error:', err);
      toast.error(err?.message || (isPt ? 'Falha ao criar fatura.' : 'Failed to create invoice.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[92vh] overflow-hidden my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/70 dark:bg-gray-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Receipt size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">
                  {isPt ? 'Criar Nova Fatura' : 'Create New Invoice'}
                </h2>
                <span className="font-mono text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  {invoiceNumber}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {isPt
                  ? 'Gere uma fatura fiscal oficial com suporte a download em PDF (PT-PT ou EN).'
                  : 'Generate an official tax invoice with real vector PDF download in EN or PT/PT.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="flex items-center rounded-xl p-0.5 bg-gray-200/70 dark:bg-gray-800 border border-gray-300/50 dark:border-gray-700">
              <button
                type="button"
                onClick={() => handleToggleLanguage('pt')}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1",
                  isPt 
                    ? "bg-amber-600 text-white shadow-2xs" 
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
                title="Português de Portugal"
              >
                <span>🇵🇹</span>
                <span>PT</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleLanguage('en')}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1",
                  !isPt 
                    ? "bg-amber-600 text-white shadow-2xs" 
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                )}
                title="English"
              >
                <span>🇬🇧</span>
                <span>EN</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 text-xs text-gray-700 dark:text-gray-300">
          {/* 1. Subscription Plan or Custom Preset */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-2">
              {isPt ? '1. Selecionar Pacote ou Serviço' : '1. Select Package or Service'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {DEFAULT_PLANS.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handlePlanChange(plan.id)}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1",
                      isSelected
                        ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-2 ring-amber-500/20"
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-950/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs truncate text-gray-900 dark:text-white">{plan.name}</span>
                      {isSelected && <Check size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />}
                    </div>
                    <div className="font-mono text-sm font-black text-amber-600 dark:text-amber-400">
                      €{plan.priceMonthly}<span className="text-[10px] font-normal text-gray-400">/m</span>
                    </div>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => handlePlanChange('custom')}
                className={cn(
                  "p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1",
                  selectedPlanId === 'custom'
                    ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-2 ring-amber-500/20"
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-950/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs truncate text-gray-900 dark:text-white">{isPt ? 'Personalizado' : 'Custom'}</span>
                  {selectedPlanId === 'custom' && <Check size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />}
                </div>
                <div className="font-mono text-sm font-black text-amber-600 dark:text-amber-400">
                  {isPt ? 'Valor livre' : 'Custom rate'}
                </div>
              </button>
            </div>
          </div>

          {/* 2. Line Item & Pricing Details */}
          <div className="p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-950/30 space-y-4">
            <h3 className="font-black text-xs uppercase tracking-wider text-gray-400">
              {isPt ? '2. Detalhes dos Itens da Fatura' : '2. Line Item & Pricing Details'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6 space-y-1">
                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  {isPt ? 'Descrição do Serviço' : 'Service Description'}
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  {isPt ? 'Qtd.' : 'Quantity'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs text-center"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  {isPt ? 'Preço Unit. (€)' : 'Unit Price (€)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs text-right"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  {isPt ? 'Taxa IVA' : 'Tax / VAT'}
                </label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                >
                  <option value={23}>23% (Normal PT)</option>
                  <option value={13}>13% (Intermédio)</option>
                  <option value={6}>6% (Reduzido)</option>
                  <option value={0}>0% (Isento)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                    {isPt ? 'Nº da Fatura' : 'Invoice Number'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceNumber(generateCleanInvoiceNumber(issueDate, isPt ? 'pt' : 'en'));
                    }}
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    {isPt ? 'Gerar Novo Nº' : 'Generate New #'}
                  </button>
                </div>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  {isPt ? 'Data de Emissão' : 'Issue Date'}
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  {isPt ? 'Data de Vencimento' : 'Payment Due Date'}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  {isPt ? 'Período de Faturação' : 'Billing Period'}
                </label>
                <input
                  type="text"
                  value={billingPeriod}
                  onChange={(e) => setBillingPeriod(e.target.value)}
                  placeholder="01/10/2026 – 31/10/2026"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  {isPt ? 'Estado do Pagamento' : 'Payment Status'}
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                >
                  <option value="unpaid">{isPt ? 'A Pagar / Pendente (Unpaid)' : 'Payment Due / Unpaid'}</option>
                  <option value="paid">{isPt ? 'Liquidado / Pago (Paid)' : 'Paid / Succeeded'}</option>
                  <option value="pending">{isPt ? 'A Processar (Pending)' : 'Processing (Pending)'}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  {isPt ? 'Moeda' : 'Currency'}
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Customer & Fiscal Billing Details */}
          <div className="p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-950/30 space-y-4">
            <h3 className="font-black text-xs uppercase tracking-wider text-gray-400">
              {isPt ? '3. Dados de Faturação & Fiscais do Restaurante' : '3. Customer & Restaurant Fiscal Details'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  {isPt ? 'Nome Comercial do Restaurante' : 'Restaurant Brand Name'}
                </label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  {isPt ? 'Razão Social / Nome Fiscal' : 'Legal Company Name'}
                </label>
                <input
                  type="text"
                  value={restaurantLegalName}
                  onChange={(e) => setRestaurantLegalName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  {isPt ? 'NIF / Nº Contribuinte' : 'VAT / Tax ID'}
                </label>
                <input
                  type="text"
                  value={restaurantVatNumber}
                  onChange={(e) => setRestaurantVatNumber(e.target.value)}
                  placeholder="PT 512 345 678"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  {isPt ? 'Email de Faturação' : 'Billing Email'}
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  {isPt ? 'País' : 'Country'}
                </label>
                <input
                  type="text"
                  value={restaurantCountry}
                  onChange={(e) => setRestaurantCountry(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  {isPt ? 'Morada Fiscal' : 'Address'}
                </label>
                <input
                  type="text"
                  value={restaurantAddress}
                  onChange={(e) => setRestaurantAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  {isPt ? 'Código Postal & Cidade' : 'Postal Code & City'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={restaurantPostalCode}
                    onChange={(e) => setRestaurantPostalCode(e.target.value)}
                    placeholder="1200-001"
                    className="w-1/2 px-2.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs text-center"
                  />
                  <input
                    type="text"
                    value={restaurantCity}
                    onChange={(e) => setRestaurantCity(e.target.value)}
                    placeholder="Lisboa"
                    className="w-1/2 px-2.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Notes & Payment Instructions */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
              {isPt ? 'Notas & Instruções da Fatura' : 'Invoice Notes & Terms'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
            />
          </div>

          {/* 5. Live Totals Card Preview */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                {isPt ? 'Resumo de Totais da Fatura' : 'Invoice Summary'}
              </span>
              <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-300">
                <span>{isPt ? 'Incidência:' : 'Subtotal:'} <strong>€{subtotal.toFixed(2)}</strong></span>
                <span>•</span>
                <span>IVA ({taxRate}%): <strong>€{taxAmount.toFixed(2)}</strong></span>
              </div>
            </div>

            <div className="flex items-baseline gap-2 self-end sm:self-auto">
              <span className="text-xs font-bold text-gray-500">
                {isPt ? (status === 'paid' ? 'Total Liquidado:' : 'Total a Pagar:') : (status === 'paid' ? 'Total Paid:' : 'Total Payable:')}
              </span>
              <span className="text-2xl font-black font-mono text-gray-900 dark:text-white">
                €{total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/70 dark:bg-gray-950/40">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isPt ? 'Cancelar' : 'Cancel'}
          </button>

          <div className="w-full sm:w-auto flex flex-wrap items-center gap-2.5 justify-end">
            {/* Create & Download PDF in PT */}
            <button
              type="button"
              onClick={() => handleCreateInvoice(true, 'pt')}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Download size={13} />
              <span>{isPt ? 'Criar & PDF (PT)' : 'Create & PDF (PT)'}</span>
            </button>

            {/* Create & Download PDF in EN */}
            <button
              type="button"
              onClick={() => handleCreateInvoice(true, 'en')}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Download size={13} />
              <span>{isPt ? 'Criar & PDF (EN)' : 'Create & PDF (EN)'}</span>
            </button>

            {/* Create Invoice only */}
            <button
              type="button"
              onClick={() => handleCreateInvoice(false)}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Plus size={14} />
              <span>{isSubmitting ? (isPt ? 'A Criar...' : 'Creating...') : (isPt ? 'Criar Fatura' : 'Create Invoice')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
