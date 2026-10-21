import React, { useState, useEffect } from 'react';
import { 
  LifeBuoy, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Play, 
  Square, 
  FileText, 
  Store, 
  User, 
  Calendar, 
  AlertTriangle, 
  Search, 
  Filter, 
  Check, 
  X, 
  ExternalLink,
  RefreshCw,
  Lock,
  Unlock
} from 'lucide-react';
import { 
  listSupportRequests, 
  updateSupportRequestStatus, 
  startSupportSession, 
  endSupportSession, 
  listSupportSessions, 
  listSupportAuditEvents,
  getActiveSupportSession
} from '../../services/supportService';
import { updateAssistanceRequestStatus } from '../../services/assistanceService';
import { SupportRequest, SupportSession, SupportAuditEvent, SupportRequestStatus } from '../../types/support';
import { useAuth } from '../../hooks/useAuth';
import { ASSISTANCE_STATUSES, ASSISTANCE_STATUS_COLORS } from '../../services/assistanceService';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

export const SuperAdminSupport: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [sessions, setSessions] = useState<SupportSession[]>([]);
  const [auditEvents, setAuditEvents] = useState<SupportAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Action modals state
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [actionModalType, setActionModalType] = useState<'reject' | 'complete' | 'details' | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqs, sess, audits] = await Promise.all([
        listSupportRequests(),
        listSupportSessions(),
        listSupportAuditEvents(),
      ]);
      setRequests(reqs);
      setSessions(sess);
      setAuditEvents(audits);
    } catch (err) {
      console.error('Failed to load support data:', err);
      toast.error('Failed to load support requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (req: SupportRequest) => {
    if (!window.confirm(`Approve support request from ${req.restaurantName}? This enables initiating a temporary support session.`)) {
      return;
    }
    try {
      await updateSupportRequestStatus(req.id, 'Approved', { adminNotes: 'Approved by Super Admin' });
      toast.success('Support request approved successfully.');
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve request.');
    }
  };

  const handleStartSession = async (req: SupportRequest) => {
    if (!window.confirm(`Start a secure temporary support session for ${req.restaurantName}? You will be granted temporary operational access.`)) {
      return;
    }
    try {
      const session = await startSupportSession(req.id, req.restaurantId, user || { id: 'sa', email: 'admin@dinemaster.pro', role: 'super_admin', status: 'active' } as any, 60);
      toast.success(`Support session started for ${req.restaurantName}!`);
      loadData();
      navigate(`/r/${session.restaurantSlug || session.restaurantId}/admin`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to start support session.');
    }
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      await endSupportSession(sessionId, 'super_admin_manual', user);
      toast.success('Support session ended successfully.');
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to end session.');
    }
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !actionModalType) return;

    setIsSubmittingAction(true);
    try {
      if (actionModalType === 'reject') {
        if (!actionNotes.trim()) {
          toast.error('Please provide a reason for rejection.');
          setIsSubmittingAction(false);
          return;
        }
        await updateSupportRequestStatus(selectedRequest.id, 'Rejected', { adminNotes: actionNotes.trim() });
        toast.success('Support request rejected.');
      } else if (actionModalType === 'complete') {
        await updateSupportRequestStatus(selectedRequest.id, 'Completed', { adminNotes: actionNotes.trim() || 'Completed by Super Admin' });
        toast.success('Support request marked as completed.');
      }
      setActionModalType(null);
      setSelectedRequest(null);
      setActionNotes('');
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update request.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    if (statusFilter !== 'all' && r.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        (r.restaurantName || '').toLowerCase().includes(q) ||
        (r.restaurantSlug || '').toLowerCase().includes(q) ||
        (r.userName || '').toLowerCase().includes(q) ||
        (r.userEmail || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Support Requests & Temporary Sessions</h1>
          <p className="text-sm text-slate-400">
            Review restaurant assistance requests and manage secure, auditable temporary Super Admin support sessions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics / Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-medium">Pending Requests</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {requests.filter(r => r.status === 'Pending').length}
          </div>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-medium">Approved Requests</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {requests.filter(r => r.status === 'Approved').length}
          </div>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-medium">Active Support Sessions</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {sessions.filter(s => s.status === 'active').length}
          </div>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-medium">Total Audit Events</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">
            {auditEvents.length}
          </div>
        </div>
      </div>

      {/* Requests Table Section */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-white">Assistance Requests</h2>
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-medium">
              {['all', ...ASSISTANCE_STATUSES].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "px-3 py-1 rounded-md transition-colors capitalize cursor-pointer",
                    statusFilter.toLowerCase() === st.toLowerCase()
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Search restaurant, admin, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="pb-3 font-semibold">Restaurant</th>
                <th className="pb-3 font-semibold">Requesting Admin</th>
                <th className="pb-3 font-semibold">Description</th>
                <th className="pb-3 font-semibold">Submitted</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRequests.map((req) => {
                const activeSess = sessions.find(s => s.requestId === req.id && s.status === 'active');
                return (
                  <tr key={req.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div className="font-semibold text-white">{req.restaurantName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">/r/{req.restaurantSlug || req.restaurantId}</div>
                    </td>
                    <td className="py-3.5 pr-4 text-slate-300">
                      <div>{req.userName}</div>
                      <div className="text-[11px] text-slate-500">{req.userEmail}</div>
                    </td>
                    <td className="py-3.5 pr-4 text-slate-300 max-w-xs truncate" title={req.description}>
                      {req.description}
                    </td>
                    <td className="py-3.5 pr-4 text-slate-400 whitespace-nowrap">
                      {req.createdAt ? format(parseISO(req.createdAt), 'dd MMM yyyy, HH:mm') : '—'}
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold capitalize",
                          req.status === 'Pending' && "bg-amber-500/10 text-amber-400 border border-amber-500/30",
                          req.status === 'Under Review' && "bg-blue-500/10 text-blue-400 border border-blue-500/30",
                          req.status === 'Approved' && "bg-purple-500/10 text-purple-400 border border-purple-500/30",
                          req.status === 'In Progress' && "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30",
                          req.status === 'Waiting for Restaurant' && "bg-yellow-400/10 text-yellow-400 border border-yellow-400/30",
                          req.status === 'Resolved' && "bg-green-600/10 text-green-400 border border-green-600/30",
                          req.status === 'Rejected' && "bg-red-500/10 text-red-400 border border-red-500/30",
                          req.status === 'Cancelled' && "bg-gray-400/10 text-gray-400 border border-gray-400/30"
                        )}>
                          {req.status}
                        </span>
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          ASSISTANCE_STATUS_COLORS[req.status] || 'bg-slate-500'
                        )} />
                      </div>
                      {activeSess && (
                        <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                          Session Active
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-right space-x-2 whitespace-nowrap">
                      <select
                        value={req.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          if (window.confirm(`Change status to ${newStatus}?`)) {
                            await updateAssistanceRequestStatus(req.id, newStatus);
                            loadData();
                          }
                        }}
                        className="px-2 py-1 bg-slate-800 text-white rounded text-[11px] border border-slate-700 cursor-pointer"
                      >
                        {ASSISTANCE_STATUSES.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                      
                      {(req.status === 'Approved' || req.status === 'Pending') && !activeSess && (
                        <button
                          onClick={() => handleStartSession(req)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px] transition-colors cursor-pointer"
                        >
                          Start Support Session
                        </button>
                      )}

                      {activeSess && (
                        <button
                          onClick={() => handleEndSession(activeSess.id)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-[11px] transition-colors cursor-pointer"
                        >
                          End Session
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No assistance requests found matching the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit History Section */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-base font-semibold text-white">Support & Session Audit History</h2>
          <span className="text-xs text-slate-400">Server-generated immutable audit trail</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="pb-3 font-semibold">Timestamp</th>
                <th className="pb-3 font-semibold">Action</th>
                <th className="pb-3 font-semibold">Actor</th>
                <th className="pb-3 font-semibold">Target Restaurant</th>
                <th className="pb-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {auditEvents.slice(0, 15).map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 pr-4 text-slate-400 whitespace-nowrap font-mono">
                    {ev.timestamp ? format(parseISO(ev.timestamp), 'dd/MM/yyyy HH:mm:ss') : '—'}
                  </td>
                  <td className="py-3 pr-4 font-mono font-semibold text-amber-400">
                    {ev.action}
                  </td>
                  <td className="py-3 pr-4 text-slate-300">
                    {ev.actorEmail || ev.actorId}
                  </td>
                  <td className="py-3 pr-4 text-slate-300">
                    {ev.targetRestaurantName || ev.targetRestaurantId || '—'}
                  </td>
                  <td className="py-3 text-slate-400 font-mono text-[11px] truncate max-w-xs">
                    {ev.details ? JSON.stringify(ev.details) : '—'}
                  </td>
                </tr>
              ))}
              {auditEvents.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No support audit events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject / Complete Modal */}
      {actionModalType && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative text-left">
            <button
              onClick={() => {
                setActionModalType(null);
                setSelectedRequest(null);
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-white mb-2">
              {actionModalType === 'reject' ? 'Reject Support Request' : 'Mark Request as Completed'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Restaurant: <span className="text-white font-medium">{selectedRequest.restaurantName}</span>
            </p>

            <form onSubmit={handleActionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {actionModalType === 'reject' ? 'Rejection Reason (Required)' : 'Resolution Notes (Optional)'}
                </label>
                <textarea
                  rows={4}
                  required={actionModalType === 'reject'}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder={actionModalType === 'reject' ? 'Explain why this request is being rejected...' : 'Describe how the issue was resolved...'}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActionModalType(null);
                    setSelectedRequest(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className={cn(
                    "px-4 py-2 text-white font-bold text-xs rounded-xl shadow-md",
                    actionModalType === 'reject' ? "bg-rose-600 hover:bg-rose-500" : "bg-emerald-600 hover:bg-emerald-500"
                  )}
                >
                  {isSubmittingAction ? 'Processing...' : 'Confirm Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
