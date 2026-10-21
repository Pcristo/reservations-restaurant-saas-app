import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  History,
  UserCheck,
  FileText,
  Sparkles,
  Power,
  Ban,
} from 'lucide-react';
import { supportService } from '../services/supportService';
import {
  SupportRequest,
  SupportSession,
  SupportAuditLogEntry,
  SupportIssueCategory,
  SupportRequestStatus,
} from '../types/support';
import { useAuth } from '../hooks/useAuth';
import { useTenant } from '../hooks/useTenant';
import { isRestaurantAdminRole, isUserSuperAdmin } from '../lib/permissions';

interface SupportAccessSectionProps {
  language?: string;
}

export const SupportAccessSection: React.FC<SupportAccessSectionProps> = ({ language = 'en' }) => {
  const { user } = useAuth();
  const { tenant, restaurantId, refreshTenant } = useTenant();
  const isPt = language === 'pt' || language === 'pt-PT';

  const effectiveRestaurantId = tenant?.id || restaurantId;
  const isSuperAdmin = isUserSuperAdmin(user);
  const isAuthorisedRestaurantAdmin = Boolean(
    user && !isSuperAdmin && isRestaurantAdminRole(user.role)
  );

  const [supportAllowed, setSupportAllowed] = useState<boolean>(false);
  const [toggling, setToggling] = useState(false);
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [activeSession, setActiveSession] = useState<SupportSession | null>(null);
  const [auditLogs, setAuditLogs] = useState<SupportAuditLogEntry[]>([]);

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [category, setCategory] = useState<SupportIssueCategory>('settings');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    const allowed = Boolean(
      tenant?.supportAccessAllowed === true ||
      tenant?.settings?.supportAccessAllowed === true
    );
    setSupportAllowed(allowed);
  }, [tenant?.supportAccessAllowed, tenant?.settings?.supportAccessAllowed]);

  useEffect(() => {
    if (!effectiveRestaurantId) return;

    const unsubReqs = supportService.subscribeToRestaurantRequests(effectiveRestaurantId, (list) => {
      setRequests(list);
    });
    const unsubSession = supportService.subscribeToActiveSession(effectiveRestaurantId, (sess) => {
      setActiveSession(sess);
    });
    const unsubLogs = supportService.subscribeToSupportAuditLogs(effectiveRestaurantId, (logs) => {
      setAuditLogs(logs.slice(0, 25));
    });

    return () => {
      unsubReqs();
      unsubSession();
      unsubLogs();
    };
  }, [effectiveRestaurantId]);

  const openRequest = requests.find((r) => ['pending', 'approved', 'active'].includes(r.status));
  const latestRequest = openRequest || requests[0] || null;

  const handleTogglePermission = async () => {
    if (!isAuthorisedRestaurantAdmin || !effectiveRestaurantId || toggling) return;
    const nextValue = !supportAllowed;
    setToggling(true);
    setFeedback(null);

    try {
      const result = await supportService.toggleSupportAccess(effectiveRestaurantId, nextValue);
      setSupportAllowed(result.supportAccessAllowed);
      await refreshTenant();

      if (!nextValue && result.revokedSessionId) {
        setFeedback({
          type: 'info',
          message: isPt
            ? 'Permissão de acesso de suporte desativada. A sessão de suporte ativa foi revogada imediatamente.'
            : 'Support access permission disabled. The active support session was revoked immediately.',
        });
      } else {
        setFeedback({
          type: 'success',
          message: nextValue
            ? isPt
              ? 'Permissão de Acesso de Suporte ATIVADA. O Super Admin apenas poderá entrar após um pedido aprovado.'
              : 'Support Access permission enabled. Super Admin can only enter after an assistance request is approved.'
            : isPt
            ? 'Permissão de Acesso de Suporte DESATIVADA. Novas sessões de suporte estão bloqueadas.'
            : 'Support Access permission disabled. New support sessions are blocked.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || (isPt ? 'Falha ao atualizar permissão de suporte.' : 'Failed to update support permission.'),
      });
    } finally {
      setToggling(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorisedRestaurantAdmin || !effectiveRestaurantId || submitting) return;

    if (description.trim().length < 10) {
      setFeedback({
        type: 'error',
        message: isPt
          ? 'Por favor, descreva o problema com pelo menos 10 caracteres.'
          : 'Please describe the problem with at least 10 characters.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      await supportService.createSupportRequest({
        restaurantId: effectiveRestaurantId,
        category,
        subject: subject.trim() || (isPt ? 'Pedido de Assistência Técnica' : 'Configuration & Troubleshooting Assistance'),
        description: description.trim(),
      });

      setSubject('');
      setDescription('');
      setShowRequestForm(false);
      setFeedback({
        type: 'success',
        message: isPt
          ? 'Pedido de assistência submetido com sucesso! A equipa de Super Admin foi notificada.'
          : 'Assistance request submitted successfully! The Super Admin team has been notified.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || (isPt ? 'Erro ao submeter pedido de assistência.' : 'Failed to submit assistance request.'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeSessionNow = async () => {
    if (!isAuthorisedRestaurantAdmin || !effectiveRestaurantId || !activeSession) return;
    setToggling(true);
    setFeedback(null);
    try {
      await supportService.endSupportSession({
        restaurantId: effectiveRestaurantId,
        sessionId: activeSession.id,
        requestId: activeSession.requestId,
      });
      setFeedback({
        type: 'info',
        message: isPt
          ? 'Sessão de suporte terminada e revogada imediatamente pelo restaurante.'
          : 'Support session terminated and revoked immediately by the restaurant.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || (isPt ? 'Erro ao terminar sessão.' : 'Failed to revoke session.'),
      });
    } finally {
      setToggling(false);
    }
  };

  const renderStatusBadge = (status: SupportRequestStatus) => {
    const styles: Record<SupportRequestStatus, { bg: string; labelEn: string; labelPt: string }> = {
      pending: {
        bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        labelEn: 'Pending',
        labelPt: 'Pendente',
      },
      Pending: {
        bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        labelEn: 'Pending',
        labelPt: 'Pendente',
      },
      approved: {
        bg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
        labelEn: 'Approved',
        labelPt: 'Aprovado',
      },
      Approved: {
        bg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
        labelEn: 'Approved',
        labelPt: 'Aprovado',
      },
      active: {
        bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        labelEn: 'Active',
        labelPt: 'Ativo',
      },
      Active: {
        bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        labelEn: 'Active',
        labelPt: 'Ativo',
      },
      completed: {
        bg: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
        labelEn: 'Completed',
        labelPt: 'Concluído',
      },
      Completed: {
        bg: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
        labelEn: 'Completed',
        labelPt: 'Concluído',
      },
      expired: {
        bg: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        labelEn: 'Expired',
        labelPt: 'Expirado',
      },
      Expired: {
        bg: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        labelEn: 'Expired',
        labelPt: 'Expirado',
      },
      rejected: {
        bg: 'bg-red-500/15 text-red-400 border-red-500/30',
        labelEn: 'Rejected',
        labelPt: 'Rejeitado',
      },
      Rejected: {
        bg: 'bg-red-500/15 text-red-400 border-red-500/30',
        labelEn: 'Rejected',
        labelPt: 'Rejeitado',
      },
    };
    const cfg = styles[status] || styles.pending;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${cfg.bg}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {isPt ? cfg.labelPt : cfg.labelEn}
      </span>
    );
  };

  const categoryLabels: Record<SupportIssueCategory, { en: string; pt: string }> = {
    settings: { en: 'General Restaurant Configuration', pt: 'Configuração Geral do Restaurante' },
    floor_plan: { en: 'Floor Plan & Background Images', pt: 'Planta de Sala e Imagens de Fundo' },
    reservations: { en: 'Reservation Rules & Time Slots', pt: 'Regras de Reserva e Horários' },
    email_notifications: { en: 'Email & Notification Templates', pt: 'Modelos de Email e Notificações' },
    booking_page: { en: 'Public Booking Page & Branding', pt: 'Página Pública de Reservas e Marca' },
    domains: { en: 'Custom Domains & SEO', pt: 'Domínios Personalizados e SEO' },
    general: { en: 'Other Troubleshooting', pt: 'Outra Resolução de Problemas' },
    billing: { en: 'Billing & Subscription', pt: 'Faturação e Subscrição' },
    technical: { en: 'Technical Assistance', pt: 'Assistência Técnica' },
    account: { en: 'Account & Permissions', pt: 'Conta e Permissões' },
    other: { en: 'General Inquiry', pt: 'Questão Geral' },
  };

  return (
    <div className="space-y-6">
      {/* Header & Security Architecture Explanation */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <LifeBuoy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {isPt ? 'Acesso de Suporte e Assistência Técnica' : 'Support Access & Technical Assistance'}
              </h2>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {isPt
                  ? 'Controle quando a equipa de Super Admin pode aceder temporariamente às definições do seu restaurante para ajudar na configuração e resolução de problemas. O acesso é estritamente temporário, auditado e nunca expõe palavras-passe, chaves de API ou credenciais de pagamento.'
                  : 'Control when the platform Super Admin team may temporarily access your restaurant settings to assist with configuration and troubleshooting. Access is strictly time-bounded, fully audited, and never exposes passwords, API secrets, or payment credentials.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                supportAllowed
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {supportAllowed
                ? isPt
                  ? 'PERMISSÃO: ATIVA (ON)'
                  : 'PERMISSION: ON'
                : isPt
                ? 'PERMISSÃO: DESATIVADA (OFF)'
                : 'PERMISSION: OFF'}
            </span>
          </div>
        </div>

        {/* 4-Pillar Status Summary Grid (Clear Distinction) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              {isPt ? '1. Permissão de Suporte' : '1. Support Permission'}
            </div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              {supportAllowed ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">{isPt ? 'Permitido (ON)' : 'Permitted (ON)'}</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">{isPt ? 'Bloqueado (OFF)' : 'Locked (OFF)'}</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {supportAllowed
                ? isPt
                  ? 'Sessões aprovadas podem ser iniciadas.'
                  : 'Approved sessions may be started.'
                : isPt
                ? 'Nenhuma sessão pode ser iniciada.'
                : 'No support sessions can be started.'}
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              {isPt ? '2. Pedido de Assistência' : '2. Assistance Request'}
            </div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              {latestRequest ? (
                renderStatusBadge(latestRequest.status)
              ) : (
                <span className="text-slate-400">{isPt ? 'Nenhum submetido' : 'None submitted'}</span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {latestRequest
                ? new Date(latestRequest.createdAt).toLocaleString()
                : isPt
                ? 'Submeta um pedido quando precisar de ajuda.'
                : 'Submit a request when you need help.'}
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              {isPt ? '3. Estado de Aprovação' : '3. Approval State'}
            </div>
            <div className="text-sm font-bold text-white">
              {latestRequest && ['approved', 'active'].includes(latestRequest.status) ? (
                <span className="text-sky-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {isPt ? 'Aprovado pelo Super Admin' : 'Approved by Super Admin'}
                </span>
              ) : latestRequest?.status === 'rejected' ? (
                <span className="text-red-400 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  {isPt ? 'Rejeitado' : 'Rejected'}
                </span>
              ) : (
                <span className="text-slate-400">
                  {latestRequest?.status === 'pending'
                    ? isPt
                      ? 'A aguardar revisão'
                      : 'Awaiting review'
                    : isPt
                    ? 'Sem aprovação ativa'
                    : 'No active approval'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {latestRequest?.assignedSuperAdminName
                ? `${isPt ? 'Revisor:' : 'Reviewer:'} ${latestRequest.assignedSuperAdminName}`
                : isPt
                ? 'Requer aprovação explícita.'
                : 'Requires explicit approval.'}
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              {isPt ? '4. Sessão de Suporte' : '4. Support Session'}
            </div>
            <div className="text-sm font-bold text-white">
              {activeSession ? (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  {isPt ? 'Sessão Ativa Agora' : 'Session Active Now'}
                </span>
              ) : (
                <span className="text-slate-400">{isPt ? 'Nenhuma Sessão Ativa' : 'No Active Session'}</span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {activeSession
                ? `${isPt ? 'Expira às' : 'Expires at'} ${new Date(activeSession.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : isPt
                ? 'O Super Admin não está ligado.'
                : 'Super Admin is not connected.'}
            </p>
          </div>
        </div>

        {/* Active Support Session Alert Box (only when a session is truly active) */}
        {activeSession && (
          <div className="mb-6 bg-amber-500/10 border-2 border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-amber-300">
                  {isPt
                    ? `Sessão de Suporte Ativa — ${activeSession.superAdminName} (${activeSession.superAdminEmail})`
                    : `Active Support Session — ${activeSession.superAdminName} (${activeSession.superAdminEmail})`}
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  {isPt ? 'Motivo:' : 'Reason:'} {activeSession.reason} •{' '}
                  {isPt ? 'Expira:' : 'Expires:'} {new Date(activeSession.expiresAt).toLocaleString()}
                </div>
              </div>
            </div>
            {isAuthorisedRestaurantAdmin && (
              <button
                type="button"
                disabled={toggling}
                onClick={handleRevokeSessionNow}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                {isPt ? 'Revogar Sessão Imediatamente' : 'Revoke Session Immediately'}
              </button>
            )}
          </div>
        )}

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-start gap-3 text-sm ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : feedback.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            ) : feedback.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Toggle & Ask for Assistance Controls */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <label
                htmlFor="allow-support-access-toggle"
                className="text-base font-bold text-white cursor-pointer"
              >
                {isPt ? 'Permitir Acesso de Suporte do Super Admin' : 'Allow Super Admin Support Access'}
              </label>
              <button
                id="allow-support-access-toggle"
                type="button"
                role="switch"
                aria-checked={supportAllowed}
                disabled={!isAuthorisedRestaurantAdmin || toggling}
                onClick={handleTogglePermission}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  supportAllowed ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    supportAllowed ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              {isPt
                ? 'Ativar esta opção permite que uma sessão de suporte seja solicitada e iniciada mediante aprovação. Desativar esta opção bloqueia novas sessões e revoga imediatamente qualquer sessão ativa.'
                : 'Turning this ON permits a support session to be requested and started upon approval. Turning it OFF blocks new sessions and revokes any active support session immediately.'}
            </p>
            {!isAuthorisedRestaurantAdmin && (
              <p className="text-xs text-amber-400/90 pt-1">
                {isSuperAdmin
                  ? isPt
                    ? 'Nota de Segurança: O Super Admin não pode alterar esta permissão em nome do restaurante.'
                    : 'Security Policy: Super Admin cannot modify this permission on behalf of the restaurant.'
                  : isPt
                  ? 'Apenas administradores autorizados do restaurante podem gerir esta permissão ou submeter pedidos.'
                  : 'Only authorised restaurant administrators may manage this permission or submit requests.'}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            {isAuthorisedRestaurantAdmin && (
              <button
                type="button"
                onClick={() => setShowRequestForm((prev) => !prev)}
                disabled={Boolean(openRequest)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                {openRequest
                  ? isPt
                    ? 'Pedido de Assistência em Curso'
                    : 'Assistance Request in Progress'
                  : isPt
                  ? 'Pedir Assistência'
                  : 'Ask for Assistance'}
              </button>
            )}
          </div>
        </div>

        {/* Ask for Assistance Form */}
        {showRequestForm && isAuthorisedRestaurantAdmin && !openRequest && (
          <form
            onSubmit={handleSubmitRequest}
            className="mt-6 bg-slate-950 border border-amber-500/30 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                {isPt ? 'Submeter Pedido de Assistência Técnica' : 'Submit Technical Assistance Request'}
              </h3>
              <button
                type="button"
                onClick={() => setShowRequestForm(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                {isPt ? 'Cancelar' : 'Cancel'}
              </button>
            </div>

            {!supportAllowed && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {isPt
                    ? 'A permissão "Permitir Acesso de Suporte do Super Admin" está atualmente DESATIVADA (OFF). Pode enviar o pedido agora, mas terá de ativar a permissão antes que o Super Admin possa iniciar uma sessão de suporte.'
                    : '"Allow Super Admin Support Access" is currently OFF. You may submit this request now, but you will need to toggle the permission ON before a Super Admin can start a support session.'}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {isPt ? 'Área do Problema' : 'Issue Area / Category'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SupportIssueCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-amber-500 focus:outline-none"
                >
                  {(Object.keys(categoryLabels) as SupportIssueCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {isPt ? categoryLabels[cat].pt : categoryLabels[cat].en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {isPt ? 'Assunto Resumido' : 'Short Subject'}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={
                    isPt
                      ? 'Ex.: Ajuda a configurar horários e planta de sala'
                      : 'e.g., Help configuring opening hours & floor plan layout'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {isPt ? 'Descrição Detalhada do Problema' : 'Problem Description & Details'}
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  isPt
                    ? 'Descreva o problema que está a enfrentar e que definições precisam de verificação...'
                    : 'Describe the issue you are experiencing and which settings require configuration or troubleshooting...'
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-amber-500 focus:outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submitting
                  ? isPt
                    ? 'A enviar...'
                    : 'Submitting...'
                  : isPt
                  ? 'Enviar Pedido de Assistência'
                  : 'Submit Assistance Request'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Support Requests History for this Restaurant */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-amber-400" />
          {isPt ? 'Pedidos de Suporte do Restaurante' : 'Restaurant Support Requests'}
        </h3>

        {requests.length === 0 ? (
          <div className="text-center py-8 bg-slate-950/50 rounded-xl border border-slate-800/80 text-slate-400 text-sm">
            {isPt
              ? 'Ainda não existem pedidos de assistência para este restaurante.'
              : 'No support requests have been submitted for this restaurant yet.'}
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {renderStatusBadge(req.status)}
                    <span className="text-sm font-bold text-white">{req.subject}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {isPt
                        ? categoryLabels[req.category]?.pt || req.category
                        : categoryLabels[req.category]?.en || req.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{req.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                    <span>
                      {isPt ? 'Submetido em:' : 'Submitted:'} {new Date(req.createdAt).toLocaleString()}
                    </span>
                    <span>
                      {isPt ? 'Por:' : 'By:'} {req.requestedByName} ({req.requestedByRole})
                    </span>
                    {req.assignedSuperAdminName && (
                      <span className="text-amber-400/90 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        {isPt ? 'Super Admin:' : 'Assigned Super Admin:'} {req.assignedSuperAdminName}
                      </span>
                    )}
                  </div>
                  {req.decisionNote && (
                    <div className="mt-2 text-xs bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-300">
                      <strong className="text-slate-200">{isPt ? 'Nota do Super Admin:' : 'Super Admin Note:'}</strong>{' '}
                      {req.decisionNote}
                    </div>
                  )}
                  {req.resolutionSummary && (
                    <div className="mt-2 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 text-emerald-300">
                      <strong>{isPt ? 'Resumo da Resolução:' : 'Resolution Summary:'}</strong> {req.resolutionSummary}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Support Activity Audit Log for this Restaurant */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-amber-400" />
          {isPt ? 'Registo de Auditoria de Suporte' : 'Support Access Audit Trail'}
        </h3>

        {auditLogs.length === 0 ? (
          <div className="text-center py-6 bg-slate-950/50 rounded-xl border border-slate-800/80 text-slate-400 text-xs">
            {isPt
              ? 'Nenhum evento de auditoria de suporte registado.'
              : 'No support audit events recorded yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">{isPt ? 'Data / Hora' : 'Timestamp'}</th>
                  <th className="py-2.5 px-3">{isPt ? 'Ação' : 'Action'}</th>
                  <th className="py-2.5 px-3">{isPt ? 'Utilizador' : 'Actor'}</th>
                  <th className="py-2.5 px-3">{isPt ? 'Motivo / Detalhes' : 'Reason / Details'}</th>
                  <th className="py-2.5 px-3">{isPt ? 'Resultado' : 'Result'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono whitespace-nowrap text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-amber-300">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3">
                      {log.actorName} <span className="text-slate-500">({log.actorRole})</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {log.reason || log.resource}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.result === 'success'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-red-500/15 text-red-400'
                        }`}
                      >
                        {log.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
