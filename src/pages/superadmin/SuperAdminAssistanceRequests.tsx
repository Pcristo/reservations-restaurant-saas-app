import React, { useState, useEffect } from 'react';
import { fetchAssistanceRequests, updateAssistanceRequestStatus, deleteAssistanceRequest, AssistanceRequest, ASSISTANCE_STATUSES, ASSISTANCE_STATUS_COLORS } from '../../services/assistanceService';
import { LifeBuoy, Search, CheckCircle, AlertCircle, Clock, ChevronDown, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

export function SuperAdminAssistanceRequests() {
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await fetchAssistanceRequests();
      setRequests(data);
    } catch (err) {
      console.error('Failed to load assistance requests:', err);
      toast.error('Failed to load assistance requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleStatusChange = async (requestId: string, newStatus: any) => {
    setUpdatingId(requestId);
    try {
      await updateAssistanceRequestStatus(requestId, newStatus);
      setRequests(prev => prev.map(req => req.id === requestId ? { ...req, status: newStatus, updatedAt: new Date().toISOString() } : req));
      toast.success('Request status updated successfully');
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deletingTicketId) return;
    try {
      await deleteAssistanceRequest(deletingTicketId);
      setRequests(prev => prev.filter(req => req.id !== deletingTicketId));
      toast.success('Assistance ticket deleted successfully');
      setDeletingTicketId(null);
    } catch (err) {
      console.error('Failed to delete request:', err);
      toast.error('Failed to delete request');
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.ticketNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.restaurantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.restaurantId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <LifeBuoy size={24} />
            </div>
            Assistance Requests
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage and resolve support or assistance requests submitted by restaurants.
          </p>
        </div>
        <button
          onClick={loadRequests}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-colors border border-slate-700 cursor-pointer"
        >
          Refresh List
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search ticket #, restaurant, user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Statuses ({requests.length})</option>
            {ASSISTANCE_STATUSES.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Requests Table/List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-20 px-4">
            <LifeBuoy className="mx-auto text-slate-600 mb-3" size={48} />
            <h3 className="text-white font-bold text-lg">No assistance requests found</h3>
            <p className="text-slate-400 text-sm mt-1">There are no assistance requests matching your current filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Ticket # & Date</th>
                  <th className="py-4 px-6">Restaurant</th>
                  <th className="py-4 px-6">Subject</th>
                  <th className="py-4 px-6">Description</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {filteredRequests.map(req => {
                  const colorClass = ASSISTANCE_STATUS_COLORS[req.status] || 'bg-slate-500';
                  return (
                    <tr key={req.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="font-mono font-bold text-amber-400 text-base">{req.ticketNumber || 'TKT-1001'}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{new Date(req.createdAt).toLocaleString()}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{req.restaurantName || req.restaurantId}</span>
                          <Link 
                            to={`/r/${req.restaurantId}/admin?assistance_mode=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors inline-flex items-center gap-1 text-xs font-bold"
                            title="Open Restaurant in Assistance Mode"
                          >
                            <ExternalLink size={12} />
                            <span>Enter</span>
                          </Link>
                        </div>
                        <div className="text-xs text-slate-400 font-mono">ID: {req.restaurantId}</div>
                      </td>
                      <td className="py-4 px-6 font-bold text-white max-w-xs">
                        {req.subject || 'Support Request'}
                      </td>
                      <td className="py-4 px-6 max-w-md">
                        <p className="text-slate-200 text-xs whitespace-pre-wrap">{req.description}</p>
                      </td>
                      <td className="py-4 px-6">
                        <div className="relative inline-block">
                          <select
                            value={req.status}
                            disabled={updatingId === req.id}
                            onChange={(e) => handleStatusChange(req.id, e.target.value)}
                            className="appearance-none bg-slate-950 border border-slate-700 text-white font-medium rounded-xl pl-8 pr-8 py-2 text-xs focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-50"
                          >
                            {ASSISTANCE_STATUSES.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${colorClass}`} />
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setDeletingTicketId(req.id)}
                          className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center"
                          title="Delete Ticket"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingTicketId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-6 rounded-3xl shadow-2xl relative text-center">
            <div className="w-14 h-14 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Are you sure you want to delete this ticket?
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingTicketId(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer shadow-lg shadow-red-500/20"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
