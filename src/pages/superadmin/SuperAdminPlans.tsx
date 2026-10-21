import React, { useState, useEffect } from 'react';
import { Plan, PlanEntitlements, PlanCustomFeature } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import {
  listAllPlans,
  subscribeToPlans,
  savePlan,
  togglePlanVisibility,
  deletePlan,
  resetPlansToDefault,
} from '../../services/planService';
import {
  UNLIMITED_BOOKINGS_SENTINEL,
  UNLIMITED_STAFF_SENTINEL,
  UNLIMITED_TABLES_SENTINEL,
} from '../../data/plans';
import {
  normalizePlanEntitlements,
  validatePlanConfiguration,
  formatResourceAllowance,
  getEffectiveResourceLimit,
  detectSignificantPlanChanges,
} from '../../services/entitlementsService';
import {
  CreditCard,
  Sparkles,
  Shield,
  Users,
  Calendar,
  Globe,
  MessageCircle,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw,
  X,
  Smartphone,
  BarChart3,
  AlertTriangle,
  Sliders,
  Clock,
  Search,
  CheckCircle2,
  Infinity as InfinityIcon,
} from 'lucide-react';
import { MdTableRestaurant } from 'react-icons/md';
import { toast } from 'react-hot-toast';

export const SuperAdminPlans: React.FC = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all');

  // Editor Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isNewPlan, setIsNewPlan] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Significant changes confirmation state
  const [pendingPlanSave, setPendingPlanSave] = useState<{
    plan: Plan;
    impacts: string[];
  } | null>(null);

  // Delete / Reset confirmation modal state
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    id: string;
    name: string;
    description: string;
    priceMonthly: number;
    priceAnnual: number;
    currency: string;
    isPopular: boolean;
    isVisible: boolean;
    entitlements: PlanEntitlements;
    customFeatures: PlanCustomFeature[];
  }>({
    id: '',
    name: '',
    description: '',
    priceMonthly: 0,
    priceAnnual: 0,
    currency: 'EUR',
    isPopular: false,
    isVisible: true,
    entitlements: {
      limitBookingsEnabled: true,
      unlimitedBookings: false,
      maxReservations: 500,
      limitStaffEnabled: true,
      unlimitedStaff: false,
      maxStaffUsers: 5,
      limitTablesEnabled: true,
      unlimitedTables: false,
      maxTables: 25,
      customDomain: false,
      whatsapp: false,
      sms: false,
      advancedSEO: false,
      waitlist: false,
      advancedAnalytics: false,
      apiAccess: false,
    },
    customFeatures: [],
  });

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await listAllPlans();
      setPlans(data);
    } catch (err) {
      console.error('Error loading plans:', err);
      toast.error('Failed to load plans from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
    const unsubscribe = subscribeToPlans((livePlans) => {
      setPlans(livePlans);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenEdit = (plan: Plan) => {
    setIsNewPlan(false);
    setEditingPlan(plan);
    setValidationErrors([]);
    const normEnt = normalizePlanEntitlements(plan.entitlements);
    const bookingsLim = getEffectiveResourceLimit(normEnt, 'bookings');
    const staffLim = getEffectiveResourceLimit(normEnt, 'staff');
    const tablesLim = getEffectiveResourceLimit(normEnt, 'tables');

    setFormData({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      priceMonthly: plan.priceMonthly,
      priceAnnual:
        typeof plan.priceAnnual === 'number'
          ? plan.priceAnnual
          : Math.round(plan.priceMonthly * 12 * 0.8),
      currency: plan.currency || 'EUR',
      isPopular: Boolean(plan.isPopular),
      isVisible: plan.isActive !== false && plan.isPublic !== false,
      entitlements: {
        ...normEnt,
        limitBookingsEnabled: bookingsLim.enabled,
        unlimitedBookings: Boolean(normEnt.unlimitedBookings) || normEnt.maxReservations >= 99999,
        maxReservations:
          normEnt.maxReservations >= 99999 ? 500 : normEnt.maxReservations,
        limitStaffEnabled: staffLim.enabled,
        unlimitedStaff: Boolean(normEnt.unlimitedStaff) || normEnt.maxStaffUsers >= 900,
        maxStaffUsers: normEnt.maxStaffUsers >= 900 ? 5 : normEnt.maxStaffUsers,
        limitTablesEnabled: tablesLim.enabled,
        unlimitedTables: Boolean(normEnt.unlimitedTables) || normEnt.maxTables >= 900,
        maxTables: normEnt.maxTables >= 900 ? 30 : normEnt.maxTables,
      },
      customFeatures: Array.isArray(plan.customFeatures)
        ? plan.customFeatures.map((f) => ({ ...f }))
        : [],
    });
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setIsNewPlan(true);
    setEditingPlan(null);
    setValidationErrors([]);
    const newId = `tier-${Date.now().toString(36)}`;
    setFormData({
      id: newId,
      name: '',
      description: '',
      priceMonthly: 39,
      priceAnnual: Math.round(39 * 12 * 0.8),
      currency: 'EUR',
      isPopular: false,
      isVisible: true,
      entitlements: {
        limitBookingsEnabled: true,
        unlimitedBookings: false,
        maxReservations: 500,
        limitStaffEnabled: true,
        unlimitedStaff: false,
        maxStaffUsers: 5,
        limitTablesEnabled: true,
        unlimitedTables: false,
        maxTables: 30,
        customDomain: true,
        whatsapp: true,
        sms: true,
        advancedSEO: true,
        waitlist: true,
        advancedAnalytics: true,
        apiAccess: false,
      },
      customFeatures: [],
    });
    setIsModalOpen(true);
  };

  const handleAddCustomFeature = () => {
    const newFeat: PlanCustomFeature = {
      id: `feat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      title: '',
      description: '',
      enabled: true,
    };
    setFormData((prev) => ({
      ...prev,
      customFeatures: [...prev.customFeatures, newFeat],
    }));
  };

  const handleUpdateCustomFeature = (
    index: number,
    field: keyof PlanCustomFeature,
    value: any
  ) => {
    setFormData((prev) => {
      const updated = [...prev.customFeatures];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return {
        ...prev,
        customFeatures: updated,
      };
    });
  };

  const handleRemoveCustomFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      customFeatures: prev.customFeatures.filter((_, i) => i !== index),
    }));
  };

  const handleToggleVisibility = async (plan: Plan) => {
    const currentVisibility = plan.isActive !== false && plan.isPublic !== false;
    const newVisibility = !currentVisibility;

    setPlans((prev) =>
      prev.map((p) => {
        if (p.id === plan.id) {
          return { ...p, isActive: newVisibility, isPublic: newVisibility };
        }
        return p;
      })
    );

    try {
      await togglePlanVisibility(plan.id, newVisibility, user);
      toast.success(
        newVisibility
          ? `Package "${plan.name}" is now active and visible on the pricing page.`
          : `Package "${plan.name}" is now inactive and hidden from the pricing page.`
      );
    } catch (err) {
      console.error('Error toggling plan visibility:', err);
      toast.error('Failed to update package status.');
      loadPlans();
    }
  };

  const confirmDeletePlan = async () => {
    if (!planToDelete) return;
    const target = planToDelete;
    setPlanToDelete(null);

    try {
      await deletePlan(target.id, user);
      toast.success(`Package "${target.name}" deleted.`);
      setPlans((prev) => prev.filter((p) => p.id !== target.id));
    } catch (err) {
      console.error('Error deleting plan:', err);
      toast.error('Failed to delete package.');
    }
  };

  const confirmResetDefaults = async () => {
    setConfirmResetOpen(false);
    setLoading(true);
    try {
      const reset = await resetPlansToDefault(user);
      setPlans(reset);
      toast.success('Packages reset to platform defaults.');
    } catch (err) {
      console.error('Error resetting plans:', err);
      toast.error('Failed to reset packages.');
    } finally {
      setLoading(false);
    }
  };

  const buildCandidatePlan = (): Plan => {
    const ent = formData.entitlements;
    const limitBookingsEnabled = ent.limitBookingsEnabled !== false;
    const unlimitedBookings = Boolean(ent.unlimitedBookings);
    const maxReservations = unlimitedBookings
      ? UNLIMITED_BOOKINGS_SENTINEL
      : Math.max(0, Math.floor(Number(ent.maxReservations)));

    const limitStaffEnabled = ent.limitStaffEnabled !== false;
    const unlimitedStaff = Boolean(ent.unlimitedStaff);
    const maxStaffUsers = unlimitedStaff
      ? UNLIMITED_STAFF_SENTINEL
      : Math.max(0, Math.floor(Number(ent.maxStaffUsers)));

    const limitTablesEnabled = ent.limitTablesEnabled !== false;
    const unlimitedTables = Boolean(ent.unlimitedTables);
    const maxTables = unlimitedTables
      ? UNLIMITED_TABLES_SENTINEL
      : Math.max(0, Math.floor(Number(ent.maxTables)));

    return {
      id: formData.id.trim().toLowerCase(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      priceMonthly: Number(formData.priceMonthly),
      priceAnnual: Number(formData.priceAnnual),
      currency: formData.currency,
      isPopular: formData.isPopular,
      isActive: formData.isVisible,
      isPublic: formData.isVisible,
      entitlements: {
        limitBookingsEnabled,
        unlimitedBookings,
        maxReservations,
        limitStaffEnabled,
        unlimitedStaff,
        maxStaffUsers,
        limitTablesEnabled,
        unlimitedTables,
        maxTables,
        customDomain: Boolean(ent.customDomain),
        whatsapp: Boolean(ent.whatsapp),
        sms: Boolean(ent.sms),
        advancedSEO: Boolean(ent.advancedSEO),
        waitlist: Boolean(ent.waitlist),
        advancedAnalytics: Boolean(ent.advancedAnalytics),
        apiAccess: Boolean(ent.apiAccess),
      },
      customFeatures: (formData.customFeatures || [])
        .map((f) => ({
          id:
            f.id ||
            `feat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          title: f.title.trim(),
          description: f.description.trim(),
          enabled: f.enabled !== false,
        }))
        .filter((f) => Boolean(f.title)),
    };
  };

  const executeSavePlan = async (planToSave: Plan) => {
    setIsSaving(true);
    try {
      const saved = await savePlan(planToSave, user);
      toast.success(`Package "${saved.name}" saved and published across the platform.`);
      setPendingPlanSave(null);
      setIsModalOpen(false);
      await loadPlans();
    } catch (err: any) {
      console.error('Error saving plan:', err);
      toast.error(err?.message || 'Failed to save package.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);

    const candidate = buildCandidatePlan();
    const validation = validatePlanConfiguration(candidate);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      toast.error(validation.errors[0]);
      return;
    }

    // Check if significant changes affect existing subscribers
    if (!isNewPlan && editingPlan) {
      const impacts = detectSignificantPlanChanges(editingPlan, candidate);
      if (impacts.length > 0) {
        setPendingPlanSave({ plan: candidate, impacts });
        return;
      }
    }

    await executeSavePlan(candidate);
  };

  const visiblePlansCount = plans.filter(
    (p) => p.isActive !== false && p.isPublic !== false
  ).length;
  const hiddenPlansCount = plans.length - visiblePlansCount;

  const filteredPlans = plans.filter((p) => {
    const isVisible = p.isActive !== false && p.isPublic !== false;
    if (filter === 'visible') return isVisible;
    if (filter === 'hidden') return !isVisible;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <CreditCard className="text-amber-400" size={24} />
            <span>Subscription Packages & Entitlements</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Central source of truth for subscription packages, usage limits (bookings, staff, tables), and feature entitlements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setConfirmResetOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Reset packages to default platform definitions"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus size={15} />
            <span>Add New Package</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Packages ({plans.length})
          </button>

          <button
            onClick={() => setFilter('visible')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              filter === 'visible'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye size={13} />
            <span>Active on Website ({visiblePlansCount})</span>
          </button>

          <button
            onClick={() => setFilter('hidden')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              filter === 'hidden'
                ? 'bg-slate-800 text-slate-200 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <EyeOff size={13} />
            <span>Inactive / Hidden ({hiddenPlansCount})</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 hidden sm:block">
          Changes propagate in real time to public pricing and restaurant dashboards.
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-950 border border-slate-800/80 rounded-2xl">
          <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mb-3" />
          <span className="text-xs text-slate-400">
            Loading subscription packages and entitlements...
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredPlans.map((p) => {
            const isVisible = p.isActive !== false && p.isPublic !== false;
            const annualPrice =
              typeof p.priceAnnual === 'number'
                ? p.priceAnnual
                : Math.round(p.priceMonthly * 12 * 0.8);

            return (
              <div
                key={p.id}
                className={`bg-slate-950 border rounded-2xl p-6 flex flex-col justify-between transition-all relative ${
                  !isVisible
                    ? 'border-slate-800/60 opacity-80'
                    : p.isPopular
                    ? 'border-amber-500/80 shadow-xl shadow-amber-500/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3 gap-2">
                    {p.isPopular ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full shadow-sm">
                        <Sparkles size={10} />
                        Most Popular
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
                        ID: {p.id}
                      </span>
                    )}

                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                        isVisible
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {isVisible ? <Eye size={10} /> : <EyeOff size={10} />}
                      <span>{isVisible ? 'Active' : 'Inactive'}</span>
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-white">{p.name}</h2>
                  <p className="text-xs text-slate-400 mt-1 min-h-[36px] line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>

                  <div className="mt-4 mb-5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold text-white">
                        {p.priceMonthly === 0 ? 'Free' : `€${p.priceMonthly}`}
                      </span>
                      {p.priceMonthly > 0 && (
                        <span className="text-xs text-slate-400">/ month</span>
                      )}
                    </div>
                    {p.priceMonthly > 0 && (
                      <div className="text-[11px] text-amber-400/90 font-medium mt-0.5">
                        €{annualPrice} / year (Annual billing)
                      </div>
                    )}
                  </div>

                  {/* Usage Limits & Feature Entitlements Breakdown */}
                  <div className="space-y-2.5 text-xs text-slate-300 border-t border-slate-800/80 pt-4">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                      Usage Limits
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Calendar size={13} />
                        Monthly Bookings
                      </span>
                      <span className="font-semibold text-white">
                        {formatResourceAllowance(p.entitlements, 'bookings')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Users size={13} />
                        Staff Accounts
                      </span>
                      <span className="font-semibold text-white">
                        {formatResourceAllowance(p.entitlements, 'staff')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <MdTableRestaurant size={13} />
                        Max Dining Tables
                      </span>
                      <span className="font-semibold text-white">
                        {formatResourceAllowance(p.entitlements, 'tables')}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                      Feature Entitlements
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Globe size={13} />
                        Custom Subdomain/Domain
                      </span>
                      <span
                        className={
                          p.entitlements.customDomain
                            ? 'text-emerald-400 font-semibold'
                            : 'text-slate-600'
                        }
                      >
                        {p.entitlements.customDomain ? 'ON' : 'OFF'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <MessageCircle size={13} />
                        WhatsApp Action
                      </span>
                      <span
                        className={
                          p.entitlements.whatsapp
                            ? 'text-emerald-400 font-semibold'
                            : 'text-slate-600'
                        }
                      >
                        {p.entitlements.whatsapp ? 'ON' : 'OFF'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Smartphone size={13} />
                        SMS Reminders
                      </span>
                      <span
                        className={
                          p.entitlements.sms
                            ? 'text-emerald-400 font-semibold'
                            : 'text-slate-600'
                        }
                      >
                        {p.entitlements.sms ? 'ON' : 'OFF'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Search size={13} />
                        Advanced SEO
                      </span>
                      <span
                        className={
                          p.entitlements.advancedSEO
                            ? 'text-emerald-400 font-semibold'
                            : 'text-slate-600'
                        }
                      >
                        {p.entitlements.advancedSEO ? 'ON' : 'OFF'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Clock size={13} />
                        Waitlist Management
                      </span>
                      <span
                        className={
                          p.entitlements.waitlist
                            ? 'text-emerald-400 font-semibold'
                            : 'text-slate-600'
                        }
                      >
                        {p.entitlements.waitlist ? 'ON' : 'OFF'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <BarChart3 size={13} />
                        Advanced Analytics
                      </span>
                      <span
                        className={
                          p.entitlements.advancedAnalytics
                            ? 'text-emerald-400 font-semibold'
                            : 'text-slate-600'
                        }
                      >
                        {p.entitlements.advancedAnalytics ? 'ON' : 'OFF'}
                      </span>
                    </div>

                    {/* Custom Features preview on card */}
                    {p.customFeatures && p.customFeatures.length > 0 && (
                      <div className="pt-2.5 mt-2 border-t border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-amber-400 font-semibold">
                          <span className="flex items-center gap-1">
                            <Sparkles size={11} />
                            <span>Additional Features</span>
                          </span>
                          <span className="font-mono text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            {p.customFeatures.filter((f) => f.enabled !== false).length} active
                          </span>
                        </div>
                        {p.customFeatures.slice(0, 3).map((cf) => (
                          <div key={cf.id} className="flex items-center justify-between text-[11px]">
                            <span
                              className="text-slate-300 truncate max-w-[170px]"
                              title={cf.description || cf.title}
                            >
                              {cf.title}
                            </span>
                            <span
                              className={
                                cf.enabled !== false
                                  ? 'text-emerald-400 font-medium'
                                  : 'text-slate-600'
                              }
                            >
                              {cf.enabled !== false ? 'ON' : 'OFF'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions & Visibility Toggle */}
                <div className="mt-6 pt-4 border-t border-slate-800 space-y-3">
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(p)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border ${
                      isVisible
                        ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {isVisible ? (
                      <>
                        <EyeOff size={13} className="text-slate-400" />
                        <span>Set Inactive / Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye size={13} className="text-emerald-400" />
                        <span>Set Active / Show</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="flex-1 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 size={13} />
                      <span>Edit Package</span>
                    </button>

                    <button
                      onClick={() => setPlanToDelete(p)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/40 rounded-lg transition-colors cursor-pointer"
                      title="Delete Package"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Package Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div
            className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative my-8 overflow-hidden text-left"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Sliders size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isNewPlan
                      ? 'Create New Subscription Package'
                      : `Package Editor: ${editingPlan?.name}`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure package details, usage limits (enable/disable, numeric quota, unlimited), and feature entitlements.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={handleSubmitForm}
              className="p-6 space-y-6 max-h-[80vh] overflow-y-auto"
            >
              {validationErrors.length > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-400">
                    <AlertTriangle size={14} />
                    <span>Please resolve the following validation errors:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 1. Package Details */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold mb-3 flex items-center gap-1.5">
                  <CreditCard size={14} />
                  <span>1. Package Details & Pricing</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Package Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g. Professional"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Package ID / Slug *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!isNewPlan}
                      value={formData.id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          id: e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_-]/g, '-'),
                        })
                      }
                      placeholder="e.g. professional"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-60 disabled:cursor-not-allowed font-mono text-xs"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Short summary displayed on public pricing and restaurant billing cards..."
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Monthly Price (€)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      required
                      value={formData.priceMonthly}
                      onChange={(e) => {
                        const monthly = Math.max(0, Number(e.target.value));
                        setFormData({
                          ...formData,
                          priceMonthly: monthly,
                          priceAnnual: Math.round(monthly * 12 * 0.8),
                        });
                      }}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 font-bold"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Enter 0 for Free Trial
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Annual Price (€ / year)
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            priceAnnual: Math.round(prev.priceMonthly * 12 * 0.8),
                          }))
                        }
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                      >
                        Auto 20% off (€{Math.round(formData.priceMonthly * 12 * 0.8)})
                      </button>
                    </div>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      required
                      value={formData.priceAnnual}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priceAnnual: Math.max(0, Number(e.target.value)),
                        })
                      }
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 font-bold"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Used when a restaurant selects Annual billing
                    </span>
                  </div>
                </div>

                {/* Active/Inactive Status and Popular Toggles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isVisible}
                      onChange={(e) =>
                        setFormData({ ...formData, isVisible: e.target.checked })
                      }
                      className="mt-0.5 w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Active Package Status (Visible on Public Pricing)
                      </span>
                      <span className="text-[11px] text-slate-400 block leading-tight">
                        When enabled, this package is active and selectable on the public pricing page and restaurant billing portal.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPopular}
                      onChange={(e) =>
                        setFormData({ ...formData, isPopular: e.target.checked })
                      }
                      className="mt-0.5 w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Highlight as "Most Popular"
                      </span>
                      <span className="text-[11px] text-slate-400 block leading-tight">
                        Displays an emphasis border and "Most Popular" badge on pricing cards.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2. Usage Limits (Monthly Bookings, Staff Accounts, Maximum Dining Tables) */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold mb-3 flex items-center gap-1.5">
                  <Shield size={14} />
                  <span>2. Usage Limits & Resource Quotas</span>
                </h4>

                <div className="space-y-3">
                  {/* A. Monthly Bookings */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-sm">
                      <div className="flex items-center gap-2">
                        <Calendar size={15} className="text-amber-400" />
                        <span className="text-xs font-bold text-white">
                          Monthly Bookings Limit
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            formData.entitlements.limitBookingsEnabled !== false
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {formData.entitlements.limitBookingsEnabled !== false
                            ? 'Limit ON'
                            : 'Limit OFF'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Counts confirmed, seated, pending, booked, arrived, and completed bookings in the restaurant's current billing period.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {/* Enable / Disable Toggle */}
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formData.entitlements.limitBookingsEnabled !== false}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              entitlements: {
                                ...formData.entitlements,
                                limitBookingsEnabled: e.target.checked,
                              },
                            })
                          }
                          className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="font-semibold">Enable Limit</span>
                      </label>

                      {/* Unlimited Option */}
                      <label
                        className={`flex items-center gap-2 text-xs cursor-pointer select-none ${
                          formData.entitlements.limitBookingsEnabled === false
                            ? 'opacity-40 pointer-events-none'
                            : 'text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={formData.entitlements.limitBookingsEnabled === false}
                          checked={Boolean(formData.entitlements.unlimitedBookings)}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              entitlements: {
                                ...formData.entitlements,
                                unlimitedBookings: e.target.checked,
                              },
                            })
                          }
                          className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="flex items-center gap-1 font-semibold">
                          <InfinityIcon size={13} className="text-amber-400" />
                          Unlimited
                        </span>
                      </label>

                      {/* Numeric Limit Input */}
                      <div className="w-28">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          disabled={
                            formData.entitlements.limitBookingsEnabled === false ||
                            Boolean(formData.entitlements.unlimitedBookings)
                          }
                          value={
                            formData.entitlements.unlimitedBookings
                              ? 500
                              : formData.entitlements.maxReservations
                          }
                          onChange={(e) => {
                            const val =
                              e.target.value === ''
                                ? 0
                                : Math.max(0, Math.floor(Number(e.target.value)));
                            setFormData({
                              ...formData,
                              entitlements: {
                                ...formData.entitlements,
                                maxReservations: val,
                              },
                            });
                          }}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-bold text-right focus:outline-none focus:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Maximum monthly bookings"
                        />
                        <span className="text-[10px] text-slate-500 block text-right mt-0.5">
                          bookings / period
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* B. Staff Accounts */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-sm">
                      <div className="flex items-center gap-2">
                        <Users size={15} className="text-amber-400" />
                        <span className="text-xs font-bold text-white">
                          Staff Accounts Limit
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            formData.entitlements.limitStaffEnabled !== false
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {formData.entitlements.limitStaffEnabled !== false
                            ? 'Limit ON'
                            : 'Limit OFF'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Counts active restaurant staff & administrators belonging to the restaurant. Super Admins never count.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {/* Enable / Disable Toggle */}
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formData.entitlements.limitStaffEnabled !== false}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              entitlements: {
                                ...formData.entitlements,
                                limitStaffEnabled: e.target.checked,
                              },
                            })
                          }
                          className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="font-semibold">Enable Limit</span>
                      </label>

                      {/* Unlimited Option */}
                      <label
                        className={`flex items-center gap-2 text-xs cursor-pointer select-none ${
                          formData.entitlements.limitStaffEnabled === false
                            ? 'opacity-40 pointer-events-none'
                            : 'text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={formData.entitlements.limitStaffEnabled === false}
                          checked={Boolean(formData.entitlements.unlimitedStaff)}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              entitlements: {
                                ...formData.entitlements,
                                unlimitedStaff: e.target.checked,
                              },
                            })
                          }
                          className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="flex items-center gap-1 font-semibold">
                          <InfinityIcon size={13} className="text-amber-400" />
                          Unlimited
                        </span>
                      </label>

                      {/* Numeric Limit Input */}
                      <div className="w-28">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          disabled={
                            formData.entitlements.limitStaffEnabled === false ||
                            Boolean(formData.entitlements.unlimitedStaff)
                          }
                          value={
                            formData.entitlements.unlimitedStaff
                              ? 5
                              : formData.entitlements.maxStaffUsers
                          }
                          onChange={(e) => {
                            const val =
                              e.target.value === ''
                                ? 0
                                : Math.max(0, Math.floor(Number(e.target.value)));
                            setFormData({
                              ...formData,
                              entitlements: {
                                ...formData.entitlements,
                                maxStaffUsers: val,
                              },
                            });
                          }}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-bold text-right focus:outline-none focus:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Maximum staff accounts"
                        />
                        <span className="text-[10px] text-slate-500 block text-right mt-0.5">
                          active accounts
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* C. Maximum Dining Tables */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-sm">
                      <div className="flex items-center gap-2">
                        <MdTableRestaurant size={15} className="text-amber-400" />
                        <span className="text-xs font-bold text-white">
                          Maximum Dining Tables
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            formData.entitlements.limitTablesEnabled !== false
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {formData.entitlements.limitTablesEnabled !== false
                            ? 'Limit ON'
                            : 'Limit OFF'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Enforced when adding tables to the restaurant floor plan. Existing tables are preserved on downgrade.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {/* Enable / Disable Toggle */}
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formData.entitlements.limitTablesEnabled !== false}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              entitlements: {
                                ...formData.entitlements,
                                limitTablesEnabled: e.target.checked,
                              },
                            })
                          }
                          className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="font-semibold">Enable Limit</span>
                      </label>

                      {/* Unlimited Option */}
                      <label
                        className={`flex items-center gap-2 text-xs cursor-pointer select-none ${
                          formData.entitlements.limitTablesEnabled === false
                            ? 'opacity-40 pointer-events-none'
                            : 'text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={formData.entitlements.limitTablesEnabled === false}
                          checked={Boolean(formData.entitlements.unlimitedTables)}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              entitlements: {
                                ...formData.entitlements,
                                unlimitedTables: e.target.checked,
                              },
                            })
                          }
                          className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="flex items-center gap-1 font-semibold">
                          <InfinityIcon size={13} className="text-amber-400" />
                          Unlimited
                        </span>
                      </label>

                      {/* Numeric Limit Input */}
                      <div className="w-28">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          disabled={
                            formData.entitlements.limitTablesEnabled === false ||
                            Boolean(formData.entitlements.unlimitedTables)
                          }
                          value={
                            formData.entitlements.unlimitedTables
                              ? 30
                              : formData.entitlements.maxTables
                          }
                          onChange={(e) => {
                            const val =
                              e.target.value === ''
                                ? 0
                                : Math.max(0, Math.floor(Number(e.target.value)));
                            setFormData({
                              ...formData,
                              entitlements: {
                                ...formData.entitlements,
                                maxTables: val,
                              },
                            });
                          }}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-bold text-right focus:outline-none focus:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Maximum dining tables"
                        />
                        <span className="text-[10px] text-slate-500 block text-right mt-0.5">
                          dining tables
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Feature Entitlements & Toggles */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold mb-3 flex items-center gap-1.5">
                  <Sparkles size={14} />
                  <span>3. Package Feature Entitlements (ON / OFF)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      key: 'customDomain',
                      label: '1. Custom Subdomain/Domain',
                      desc: 'Allows restaurants to connect custom domains or branded subdomains with SSL',
                    },
                    {
                      key: 'whatsapp',
                      label: '2. WhatsApp Action',
                      desc: 'Direct one-click WhatsApp guest messaging from reservations and floor plan',
                    },
                    {
                      key: 'sms',
                      label: '3. SMS Reminders',
                      desc: 'SMS phone verification and automated pre-arrival booking SMS reminders',
                    },
                    {
                      key: 'advancedSEO',
                      label: '4. Advanced SEO',
                      desc: 'Custom meta titles, OpenGraph social cards, and Schema.org JSON-LD structured data',
                    },
                    {
                      key: 'waitlist',
                      label: '5. Waitlist Management',
                      desc: 'Digital walk-in and full-session waitlist queue for guests and hosts',
                    },
                    {
                      key: 'advancedAnalytics',
                      label: '6. Advanced Analytics',
                      desc: 'Shift performance, covers per hour, and guest retention insights',
                    },
                    {
                      key: 'apiAccess',
                      label: '7. REST API & Webhooks Access',
                      desc: 'POS integration and external webhook synchronization',
                    },
                  ].map((feat) => {
                    const isChecked = Boolean(
                      formData.entitlements[feat.key as keyof PlanEntitlements]
                    );

                    return (
                      <label
                        key={feat.key}
                        className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-amber-500/5 border-amber-500/30'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                entitlements: {
                                  ...formData.entitlements,
                                  [feat.key]: e.target.checked,
                                },
                              })
                            }
                            className="mt-0.5 w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                          />
                          <div>
                            <span
                              className={`text-xs font-semibold block ${
                                isChecked ? 'text-white' : 'text-slate-300'
                              }`}
                            >
                              {feat.label}
                            </span>
                            <span className="text-[11px] text-slate-400 block leading-tight mt-0.5">
                              {feat.desc}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            isChecked
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {isChecked ? 'ON' : 'OFF'}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Custom Features Section */}
                <div className="mt-5 pt-4 border-t border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles size={13} className="text-amber-400" />
                          <span>Custom Package Features</span>
                        </h5>
                        {formData.customFeatures.length > 0 && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                            {formData.customFeatures.length}{' '}
                            {formData.customFeatures.length === 1
                              ? 'Feature'
                              : 'Features'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Add custom features with titles and descriptions for this package.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddCustomFeature}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm w-fit"
                    >
                      <Plus size={14} />
                      <span>Add Custom Feature</span>
                    </button>
                  </div>

                  {formData.customFeatures.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-center">
                      <p className="text-xs text-slate-400">
                        No custom features added yet. Click{' '}
                        <span
                          className="text-amber-400 font-semibold cursor-pointer"
                          onClick={handleAddCustomFeature}
                        >
                          + Add Custom Feature
                        </span>{' '}
                        to include additional items on this package.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.customFeatures.map((feat, index) => (
                        <div
                          key={feat.id || index}
                          className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-slate-700 transition-colors space-y-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={feat.enabled !== false}
                                onChange={(e) =>
                                  handleUpdateCustomFeature(
                                    index,
                                    'enabled',
                                    e.target.checked
                                  )
                                }
                                className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                              />
                              <span className="text-[11px] font-mono uppercase tracking-wider">
                                {feat.enabled !== false ? (
                                  <span className="text-emerald-400 font-semibold">
                                    Enabled in Package
                                  </span>
                                ) : (
                                  <span className="text-slate-500 font-medium">
                                    Disabled
                                  </span>
                                )}
                              </span>
                            </label>

                            <button
                              type="button"
                              onClick={() => handleRemoveCustomFeature(index)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Remove Feature"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                Feature Title *
                              </label>
                              <input
                                type="text"
                                value={feat.title}
                                onChange={(e) =>
                                  handleUpdateCustomFeature(
                                    index,
                                    'title',
                                    e.target.value
                                  )
                                }
                                placeholder="e.g. Dedicated Account Manager"
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                Description
                              </label>
                              <input
                                type="text"
                                value={feat.description}
                                onChange={(e) =>
                                  handleUpdateCustomFeature(
                                    index,
                                    'description',
                                    e.target.value
                                  )
                                }
                                placeholder="e.g. 24/7 priority onboarding & phone support"
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 size={15} />
                  <span>
                    {isSaving
                      ? 'Saving Package...'
                      : isNewPlan
                      ? 'Create Package'
                      : 'Save Package Changes'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Significant Package Changes Affecting Existing Subscribers */}
      {pendingPlanSave && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Confirm Significant Package Changes
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  You are modifying <strong>{pendingPlanSave.plan.name}</strong> in ways that affect restaurants currently subscribed to this package:
                </p>
              </div>
            </div>

            <ul className="space-y-2 bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 max-h-56 overflow-y-auto">
              {pendingPlanSave.impacts.map((imp, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{imp}</span>
                </li>
              ))}
            </ul>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 leading-relaxed">
              <strong>Data Safety Guarantee:</strong> Existing dining tables, staff accounts, and historical reservation records will never be automatically deleted. Subscribed restaurants exceeding lowered limits will simply be prevented from adding new items until within quota or upgraded.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingPlanSave(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Review Again
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => executeSavePlan(pendingPlanSave.plan)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Applying...' : 'Confirm & Apply Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Package Confirmation Modal */}
      {planToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Delete Package "{planToDelete.name}"?
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Are you sure you want to delete this package? Existing subscribers on this tier will fall back to default entitlements unless reassigned.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePlan}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
              >
                Delete Package
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Defaults Confirmation Modal */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Reset Packages to Platform Defaults?
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  This will restore standard default limits and feature entitlements for Trial, Professional, Business, and Enterprise packages.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResetDefaults}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
