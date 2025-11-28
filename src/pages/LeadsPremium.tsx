import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabaseService';
import toast from 'react-hot-toast';
import {
  Users,
  Search,
  Trash2,
  Plus,
  X,
  Phone,
  Mail,
  MapPin,
  Eye,
  ChevronLeft,
  ChevronRight,
  Tag,
  MessageSquare,
  CheckCircle,
  Clock,
  XCircle,
  Star,
  Edit3,
  RefreshCw,
} from 'lucide-react';

interface Lead {
  id: string;
  user_id: string;
  name: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  source?: string;
  status?: string;
  tags?: string[];
  notes?: string;
  remote_jid?: string;
  created_at: string;
  updated_at: string;
}

// Componente de Tag
function TagBadge({
  tag,
  onRemove,
  variant = 'default',
}: {
  tag: string;
  onRemove?: () => void;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    primary: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${variants[variant]}`}>
      <Tag className="w-3 h-3" />
      {tag}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:bg-black/10 rounded-full p-0.5"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

// Componente de Paginação
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Mostrando <span className="font-semibold text-gray-900 dark:text-white">{startItem}</span> a{' '}
        <span className="font-semibold text-gray-900 dark:text-white">{endItem}</span> de{' '}
        <span className="font-semibold text-gray-900 dark:text-white">{totalItems}</span> leads
      </p>
      
      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        
        <div className="flex gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let page;
            if (totalPages <= 5) {
              page = i + 1;
            } else if (currentPage <= 3) {
              page = i + 1;
            } else if (currentPage >= totalPages - 2) {
              page = totalPages - 4 + i;
            } else {
              page = currentPage - 2 + i;
            }
            
            return (
              <motion.button
                key={page}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onPageChange(page)}
                className={`min-w-[40px] h-10 rounded-xl font-medium transition-all ${
                  page === currentPage
                    ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {page}
              </motion.button>
            );
          })}
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}

// Modal de Detalhes do Lead
function LeadDetailsModal({
  lead,
  onClose,
  onDelete,
  onUpdate,
}: {
  lead: Lead;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<Lead>) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(lead);
  const [newTag, setNewTag] = useState('');

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          name: editData.name,
          phone: editData.phone,
          email: editData.email,
          address: editData.address,
          city: editData.city,
          state: editData.state,
          status: editData.status,
          notes: editData.notes,
          tags: editData.tags,
        })
        .eq('id', lead.id);

      if (error) throw error;
      
      toast.success('Lead atualizado com sucesso!');
      onUpdate(editData);
      setIsEditing(false);
    } catch (error) {
      toast.error('Erro ao atualizar lead');
    }
  };

  const addTag = () => {
    if (newTag && !editData.tags?.includes(newTag)) {
      setEditData({
        ...editData,
        tags: [...(editData.tags || []), newTag.toLowerCase()],
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditData({
      ...editData,
      tags: editData.tags?.filter(t => t !== tagToRemove) || [],
    });
  };

  const getStatusConfig = (status?: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      new: { label: 'Novo', color: 'bg-blue-100 text-blue-700', icon: Clock },
      contacted: { label: 'Contatado', color: 'bg-amber-100 text-amber-700', icon: MessageSquare },
      interested: { label: 'Interessado', color: 'bg-emerald-100 text-emerald-700', icon: Star },
      converted: { label: 'Convertido', color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
      lost: { label: 'Perdido', color: 'bg-red-100 text-red-700', icon: XCircle },
    };
    return configs[status || 'new'] || configs.new;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-violet-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold">
                {lead.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.name}
                    onChange={e => setEditData({ ...editData, name: e.target.value })}
                    className="bg-white/20 backdrop-blur border-0 rounded-lg px-3 py-1 text-xl font-bold text-white placeholder-white/50"
                  />
                ) : (
                  <h2 className="text-xl font-bold">{lead.name}</h2>
                )}
                <p className="text-white/80 text-sm">{lead.source || 'Origem não definida'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
              >
                <Edit3 className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Status */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            {isEditing ? (
              <select
                value={editData.status || 'new'}
                onChange={e => setEditData({ ...editData, status: e.target.value })}
                className="select-premium"
              >
                <option value="new">Novo</option>
                <option value="contacted">Contatado</option>
                <option value="interested">Interessado</option>
                <option value="converted">Convertido</option>
                <option value="lost">Perdido</option>
              </select>
            ) : (
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${getStatusConfig(lead.status).color}`}>
                {(() => {
                  const StatusIcon = getStatusConfig(lead.status).icon;
                  return <StatusIcon className="w-4 h-4" />;
                })()}
                {getStatusConfig(lead.status).label}
              </span>
            )}
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                Telefone
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.phone || ''}
                  onChange={e => setEditData({ ...editData, phone: e.target.value })}
                  className="input-premium"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">{lead.phone || '-'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={editData.email || ''}
                  onChange={e => setEditData({ ...editData, email: e.target.value })}
                  className="input-premium"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">{lead.email || '-'}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Endereço
            </label>
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Endereço"
                  value={editData.address || ''}
                  onChange={e => setEditData({ ...editData, address: e.target.value })}
                  className="input-premium"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Cidade"
                    value={editData.city || ''}
                    onChange={e => setEditData({ ...editData, city: e.target.value })}
                    className="input-premium"
                  />
                  <input
                    type="text"
                    placeholder="Estado"
                    value={editData.state || ''}
                    onChange={e => setEditData({ ...editData, state: e.target.value })}
                    className="input-premium"
                  />
                </div>
              </div>
            ) : (
              <p className="text-gray-900 dark:text-white">
                {lead.address || '-'}
                {(lead.city || lead.state) && (
                  <span className="text-gray-500 dark:text-gray-400">
                    {' '}• {lead.city}{lead.city && lead.state && ', '}{lead.state}
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {(isEditing ? editData.tags : lead.tags)?.map((tag, index) => (
                <TagBadge
                  key={index}
                  tag={tag}
                  variant={tag === 'campanha' ? 'info' : tag === 'google-maps' ? 'success' : 'default'}
                  onRemove={isEditing ? () => removeTag(tag) : undefined}
                />
              ))}
              {(!lead.tags || lead.tags.length === 0) && !isEditing && (
                <span className="text-gray-400 text-sm">Nenhuma tag</span>
              )}
            </div>
            {isEditing && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nova tag..."
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && addTag()}
                  className="input-premium flex-1"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={addTag}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl font-medium"
                >
                  Adicionar
                </motion.button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Observações
            </label>
            {isEditing ? (
              <textarea
                value={editData.notes || ''}
                onChange={e => setEditData({ ...editData, notes: e.target.value })}
                rows={4}
                className="input-premium resize-none"
              />
            ) : (
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                {lead.notes || 'Nenhuma observação'}
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Criado em</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(lead.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Atualizado em</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(lead.updated_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setEditData(lead);
                    setIsEditing(false);
                  }}
                  className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  className="flex-1 btn-premium"
                >
                  Salvar Alterações
                </motion.button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Fechar
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onDelete}
                  className="px-6 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  Excluir
                </motion.button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Modal de Criar Lead
function CreateLeadModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    source: 'Manual',
    status: 'new',
    notes: '',
    tags: [] as string[],
  });
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.toLowerCase()],
      });
      setNewTag('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Nome é obrigatório');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('leads').insert({
        user_id: user?.id,
        ...formData,
        whatsapp: formData.phone,
        tags: formData.tags.length > 0 ? formData.tags : ['manual'],
      });

      if (error) throw error;

      toast.success('Lead criado com sucesso!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Erro ao criar lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Plus className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Novo Lead
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Adicione um novo lead manualmente
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="input-premium"
              placeholder="Nome do lead ou empresa"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Telefone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="input-premium"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="input-premium"
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Endereço
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="input-premium"
              placeholder="Rua, número, bairro"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cidade
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="input-premium"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Estado
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
                className="input-premium"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag, index) => (
                <TagBadge
                  key={index}
                  tag={tag}
                  onRemove={() => setFormData({
                    ...formData,
                    tags: formData.tags.filter((_, i) => i !== index),
                  })}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Adicionar tag..."
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="input-premium flex-1"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Observações
            </label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="input-premium resize-none"
              placeholder="Notas sobre o lead..."
            />
          </div>
        </form>

        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 btn-premium disabled:opacity-50"
            >
              {isSubmitting ? 'Criando...' : 'Criar Lead'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LeadsPremium() {
  const { user } = useAuthStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    if (user) loadLeads();
  }, [user]);

  useEffect(() => {
    filterLeads();
  }, [leads, searchTerm, statusFilter, sourceFilter, tagFilter]);

  const loadLeads = async () => {
    try {
      setIsLoading(true);
      
      // Busca leads da tabela leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;

      // Busca leads de campanhas
      const { data: campaignLeadsData, error: campaignLeadsError } = await supabase
        .from('campaign_leads')
        .select('*')
        .eq('user_id', user?.id)
        .eq('whatsapp_valid', true)
        .order('created_at', { ascending: false });

      if (campaignLeadsError) throw campaignLeadsError;

      // Converte campaign_leads para o formato de Lead
      const convertedCampaignLeads: Lead[] = (campaignLeadsData || []).map((cl: any) => ({
        id: cl.id,
        user_id: cl.user_id,
        name: cl.business_name,
        phone: cl.phone_number,
        whatsapp: cl.phone_number,
        address: cl.address,
        city: cl.city,
        state: cl.state,
        source: 'Campanha',
        status: cl.message_status === 'sent' ? 'contacted' : 'new',
        tags: ['campanha', 'google-maps'],
        notes: `Lead gerado por campanha. ${cl.message_status === 'sent' ? 'Mensagem enviada.' : 'Aguardando envio.'}`,
        remote_jid: cl.remote_jid,
        created_at: cl.created_at,
        updated_at: cl.updated_at,
      }));

      const allLeads = [...(leadsData || []), ...convertedCampaignLeads];
      allLeads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setLeads(allLeads);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
      toast.error('Erro ao carregar leads');
    } finally {
      setIsLoading(false);
    }
  };

  const filterLeads = () => {
    let filtered = [...leads];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.name?.toLowerCase().includes(term) ||
        lead.phone?.toLowerCase().includes(term) ||
        lead.email?.toLowerCase().includes(term) ||
        lead.city?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter(lead => lead.source === sourceFilter);
    }

    if (tagFilter !== 'all') {
      filtered = filtered.filter(lead => lead.tags?.includes(tagFilter));
    }

    setFilteredLeads(filtered);
    setCurrentPage(1);
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return;

    try {
      const { error } = await supabase.from('leads').delete().eq('id', leadId);
      if (error) throw error;

      toast.success('Lead excluído com sucesso');
      loadLeads();
      setSelectedLead(null);
    } catch (error) {
      toast.error('Erro ao excluir lead');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedLeads.length === 0) return;
    if (!confirm(`Excluir ${selectedLeads.length} lead(s)?`)) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', selectedLeads);

      if (error) throw error;

      toast.success(`${selectedLeads.length} lead(s) excluído(s)`);
      setSelectedLeads([]);
      loadLeads();
    } catch (error) {
      toast.error('Erro ao excluir leads');
    }
  };

  // Paginação
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Dados para filtros
  const uniqueSources = Array.from(new Set(leads.map(l => l.source).filter(Boolean)));
  const uniqueTags = Array.from(new Set(leads.flatMap(l => l.tags || []).filter(Boolean)));

  // Stats
  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    converted: leads.filter(l => l.status === 'converted').length,
  };

  const getStatusConfig = (status?: string) => {
    const configs: Record<string, { label: string; color: string; bgColor: string }> = {
      new: { label: 'Novo', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
      contacted: { label: 'Contatado', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
      interested: { label: 'Interessado', color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
      converted: { label: 'Convertido', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
      lost: { label: 'Perdido', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
    };
    return configs[status || 'new'] || configs.new;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Carregando leads...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              Leads
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {filteredLeads.length} lead(s) encontrado(s)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={loadLeads}
              className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateModal(true)}
              className="btn-premium flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Novo Lead
            </motion.button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, icon: Users, color: 'purple' },
            { label: 'Novos', value: stats.new, icon: Clock, color: 'blue' },
            { label: 'Contatados', value: stats.contacted, icon: MessageSquare, color: 'amber' },
            { label: 'Convertidos', value: stats.converted, icon: CheckCircle, color: 'emerald' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-900/30`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-4 mb-6"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, telefone, email, cidade..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-premium pl-12"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="select-premium min-w-[140px]"
              >
                <option value="all">Todos os status</option>
                <option value="new">Novos</option>
                <option value="contacted">Contatados</option>
                <option value="interested">Interessados</option>
                <option value="converted">Convertidos</option>
                <option value="lost">Perdidos</option>
              </select>
              <select
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value)}
                className="select-premium min-w-[140px]"
              >
                <option value="all">Todas as origens</option>
                {uniqueSources.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
              <select
                value={tagFilter}
                onChange={e => setTagFilter(e.target.value)}
                className="select-premium min-w-[140px]"
              >
                <option value="all">Todas as tags</option>
                {uniqueTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedLeads.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-purple-600">{selectedLeads.length}</span> lead(s) selecionado(s)
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDeleteSelected}
                className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Excluir Selecionados
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* Leads Grid */}
        {paginatedLeads.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card rounded-2xl p-12"
          >
            <div className="empty-state">
              <Users className="empty-state-icon" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {searchTerm || statusFilter !== 'all' || sourceFilter !== 'all' || tagFilter !== 'all'
                  ? 'Nenhum lead encontrado'
                  : 'Nenhum lead cadastrado'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {searchTerm || statusFilter !== 'all' || sourceFilter !== 'all' || tagFilter !== 'all'
                  ? 'Tente ajustar os filtros'
                  : 'Comece adicionando seu primeiro lead'}
              </p>
              {!searchTerm && statusFilter === 'all' && sourceFilter === 'all' && tagFilter === 'all' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCreateModal(true)}
                  className="btn-premium flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Adicionar Primeiro Lead
                </motion.button>
              )}
            </div>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {paginatedLeads.map((lead, index) => {
                  const statusConfig = getStatusConfig(lead.status);
                  const isCampaignLead = lead.tags?.includes('campanha');

                  return (
                    <motion.div
                      key={lead.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.03 }}
                      className={`glass-card rounded-2xl overflow-hidden card-hover ${
                        selectedLeads.includes(lead.id) ? 'ring-2 ring-purple-500' : ''
                      } ${isCampaignLead ? 'border-l-4 border-l-blue-500' : ''}`}
                    >
                      <div className="p-5">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedLeads.includes(lead.id)}
                              onChange={() => {
                                setSelectedLeads(prev =>
                                  prev.includes(lead.id)
                                    ? prev.filter(id => id !== lead.id)
                                    : [...prev, lead.id]
                                );
                              }}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                            />
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg">
                              {lead.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 dark:text-white truncate">
                                {lead.name}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {lead.source || 'Origem não definida'}
                              </p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>

                        {/* Tags */}
                        {lead.tags && lead.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {lead.tags.slice(0, 3).map((tag, idx) => (
                              <TagBadge
                                key={idx}
                                tag={tag}
                                variant={tag === 'campanha' ? 'info' : tag === 'google-maps' ? 'success' : 'default'}
                              />
                            ))}
                            {lead.tags.length > 3 && (
                              <span className="text-xs text-gray-400">+{lead.tags.length - 3}</span>
                            )}
                          </div>
                        )}

                        {/* Contact Info */}
                        <div className="space-y-2 mb-4">
                          {lead.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                                <Phone className="w-4 h-4 text-emerald-600" />
                              </div>
                              <span className="text-gray-700 dark:text-gray-300">{lead.phone}</span>
                            </div>
                          )}
                          {lead.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                <Mail className="w-4 h-4 text-blue-600" />
                              </div>
                              <span className="text-gray-700 dark:text-gray-300 truncate">{lead.email}</span>
                            </div>
                          )}
                          {(lead.city || lead.state) && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-purple-600" />
                              </div>
                              <span className="text-gray-700 dark:text-gray-300">
                                {lead.city}{lead.city && lead.state && ', '}{lead.state}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedLead(lead)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-xl font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            Detalhes
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleDeleteLead(lead.id)}
                            className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredLeads.length}
              itemsPerPage={itemsPerPage}
            />
          </>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateLeadModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={loadLeads}
          />
        )}

        {selectedLead && (
          <LeadDetailsModal
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onDelete={() => handleDeleteLead(selectedLead.id)}
            onUpdate={(updates) => {
              setLeads(prev =>
                prev.map(l => l.id === selectedLead.id ? { ...l, ...updates } : l)
              );
              setSelectedLead(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
