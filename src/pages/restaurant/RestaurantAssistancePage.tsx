import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LifeBuoy, Plus, Search, MessageCircle, AlertTriangle, X, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { fetchAssistanceRequests, createAssistanceRequest, updateAssistanceRequest, deleteAssistanceRequest, AssistanceRequest, ASSISTANCE_STATUS_COLORS } from '../../services/assistanceService';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../hooks/useLanguage';
import { useSettings } from '../../hooks/useSettings';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-hot-toast';

export default function RestaurantAssistancePage() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { settings } = useSettings(slug);
  const { user } = useAuth();
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<AssistanceRequest | null>(null);

  const [editingTicket, setEditingTicket] = useState<AssistanceRequest | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);

  const loadRequests = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const data = await fetchAssistanceRequests(slug);
      setRequests(data);
    } catch (err) {
      console.error('Error loading requests:', err);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [slug]);

  const handleSubmit = async () => {
    if (!subject || !description) {
      toast.error(language === 'pt' ? 'Preencha todos os campos' : 'Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const newReq = await createAssistanceRequest({
        restaurantId: slug || 'default-restaurant',
        restaurantName: settings?.name || 'Restaurant',
        userId: user?.id || (user as any)?.uid || 'unknown',
        userEmail: user?.email || 'unknown',
        userName: user?.name || (user as any)?.displayName || 'unknown',
        subject,
        description,
      });

      toast.success(language === 'pt' ? 'Ticket submetido' : 'Ticket submitted');
      setSubmittedTicket(newReq as any);
      setSubject('');
      setDescription('');
      loadRequests();
    } catch (e: any) {
      console.error('Error submitting ticket:', e);
      toast.error(language === 'pt' ? 'Erro ao submeter' : (e?.message || 'Failed to submit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingTicketId) return;
    try {
      await deleteAssistanceRequest(deletingTicketId);
      toast.success(language === 'pt' ? 'Ticket apagado com sucesso' : 'Ticket deleted successfully');
      setDeletingTicketId(null);
      loadRequests();
    } catch (err: any) {
      console.error('Failed to delete request:', err);
      toast.error(language === 'pt' ? 'Erro ao apagar ticket' : 'Failed to delete ticket');
    }
  };

  const handleUpdate = async () => {
    if (!editingTicket) return;
    try {
      await updateAssistanceRequest(editingTicket.id, editSubject, editDescription);
      toast.success(language === 'pt' ? 'Ticket atualizado' : 'Ticket updated');
      setEditingTicket(null);
      loadRequests();
    } catch (err) {
      toast.error(language === 'pt' ? 'Erro ao atualizar' : 'Failed to update');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSubmittedTicket(null);
  };

  return (
    <div className={cn(
      "mx-auto py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300 min-h-screen",
      settings?.theme === 'dark' ? "text-white" : "text-gray-900"
    )}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LifeBuoy className="text-amber-500" />
          {language === 'pt' ? 'Minhas Solicitações de Assistência' : 'My Assistance Requests'}
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-sm transition-colors cursor-pointer"
        >
          <Plus size={16} />
          {language === 'pt' ? 'Abrir Novo Ticket' : 'Open New Ticket'}
        </button>
      </div>

      {/* Requests List */}
      <div className={cn(
        "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden"
      )}>
        {loading ? (
          <div className="p-10 text-center">{t('common.loading')}</div>
        ) : requests.length === 0 ? (
          <div className="p-10 text-center text-gray-500">{language === 'pt' ? 'Nenhuma solicitação encontrada.' : 'No requests found.'}</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4">{language === 'pt' ? 'Nº Ticket' : 'Ticket #'}</th>
                <th className="px-6 py-4">{language === 'pt' ? 'Assunto & Descrição' : 'Subject & Description'}</th>
                <th className="px-6 py-4">{language === 'pt' ? 'Status' : 'Status'}</th>
                <th className="px-6 py-4">{language === 'pt' ? 'Data' : 'Date'}</th>
                <th className="px-6 py-4 text-right">{language === 'pt' ? 'Ações' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {requests.map(req => (
                <tr key={req.id}>
                  <td className="px-6 py-4 font-mono font-bold text-amber-600">{req.ticketNumber || 'TKT-1001'}</td>
                  <td className="px-6 py-4 max-w-md">
                    <div className="font-bold text-gray-900 dark:text-white mb-0.5">{req.subject || 'Support Request'}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2">{req.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold text-white",
                      ASSISTANCE_STATUS_COLORS[req.status] || 'bg-gray-500'
                    )}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{new Date(req.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditingTicket(req);
                        setEditSubject(req.subject || '');
                        setEditDescription(req.description || '');
                      }}
                      className="p-1.5 text-blue-500 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/40 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                      title={language === 'pt' ? 'Editar' : 'Edit'}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setDeletingTicketId(req.id)}
                      className="p-1.5 text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-950/40 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                      title={language === 'pt' ? 'Apagar' : 'Delete'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg p-6 rounded-3xl shadow-2xl relative">
            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            {submittedTicket ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LifeBuoy size={32} />
                </div>
                <h2 className="text-xl font-bold mb-1">{language === 'pt' ? 'Ticket Submetido com Sucesso' : 'Ticket Successfully Submitted'}</h2>
                <p className="text-sm font-mono text-amber-600 font-bold mb-4">{submittedTicket.ticketNumber}</p>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl text-left space-y-2 mb-6">
                  <p className="text-xs font-bold text-gray-500">{language === 'pt' ? 'Assunto' : 'Subject'}</p>
                  <p className="text-sm font-medium">{submittedTicket.subject}</p>
                  <p className="text-xs font-bold text-gray-500 mt-2">{language === 'pt' ? 'Descrição' : 'Description'}</p>
                  <p className="text-sm">{submittedTicket.description}</p>
                </div>
                <button 
                  onClick={closeModal}
                  className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white py-3 rounded-lg font-bold text-sm transition-colors cursor-pointer"
                >
                  {language === 'pt' ? 'Fechar' : 'Close'}
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-4">{language === 'pt' ? 'Abrir Novo Ticket' : 'Open New Ticket'}</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">{language === 'pt' ? 'Assunto' : 'Subject'}</label>
                    <input 
                      type="text" 
                      value={subject} 
                      onChange={(e) => setSubject(e.target.value)} 
                      className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white p-3 rounded-lg text-sm border border-gray-200 dark:border-gray-700" 
                      placeholder={language === 'pt' ? 'Ex: Dúvida sobre reservas' : 'Ex: Question about reservations'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">{language === 'pt' ? 'Descrição' : 'Description'}</label>
                    <textarea 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)} 
                      className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white p-3 rounded-lg text-sm h-40 border border-gray-200 dark:border-gray-700" 
                      placeholder={language === 'pt' ? 'Descreva o problema...' : 'Describe the issue...'}
                    />
                  </div>
                  <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-lg font-bold text-sm transition-colors cursor-pointer"
                  >
                    {isSubmitting ? (language === 'pt' ? 'Submetendo...' : 'Submitting...') : (language === 'pt' ? 'Submeter Ticket' : 'Submit Ticket')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Ticket Modal */}
      {editingTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg p-6 rounded-3xl shadow-2xl relative">
            <button onClick={() => setEditingTicket(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">{language === 'pt' ? 'Editar Ticket' : 'Edit Ticket'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">{language === 'pt' ? 'Assunto' : 'Subject'}</label>
                <input 
                  type="text" 
                  value={editSubject} 
                  onChange={(e) => setEditSubject(e.target.value)} 
                  className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white p-3 rounded-lg text-sm border border-gray-200 dark:border-gray-700" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">{language === 'pt' ? 'Descrição' : 'Description'}</label>
                <textarea 
                  value={editDescription} 
                  onChange={(e) => setEditDescription(e.target.value)} 
                  className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white p-3 rounded-lg text-sm h-40 border border-gray-200 dark:border-gray-700" 
                />
              </div>
              <button 
                onClick={handleUpdate}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-lg font-bold text-sm transition-colors cursor-pointer"
              >
                {language === 'pt' ? 'Guardar Alterações' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTicketId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md p-6 rounded-3xl shadow-2xl relative text-center">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-950/50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {language === 'pt' ? 'Tem a certeza que pretende apagar este ticket?' : 'Are you sure you want to delete this ticket?'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {language === 'pt' ? 'Esta ação não pode ser revertida.' : 'This action cannot be undone.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingTicketId(null)}
                className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                {language === 'pt' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer shadow-lg shadow-red-500/20"
              >
                {language === 'pt' ? 'Sim, Apagar' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
