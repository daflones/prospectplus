import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabaseService';
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
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import toast from 'react-hot-toast';

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

export default function LeadsPage() {
  const { user } = useAuthStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const leadsPerPage = 12;

  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      loadLeads();
    }
  }, [user]);

  useEffect(() => {
    filterLeads();
  }, [leads, searchTerm, statusFilter, sourceFilter]);

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
        email: undefined,
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

      // Combina os dois arrays
      const allLeads = [...(leadsData || []), ...convertedCampaignLeads];
      
      // Ordena por data de criação
      allLeads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setLeads(allLeads);
      
      console.log(`✅ ${leadsData?.length || 0} leads + ${convertedCampaignLeads.length} de campanhas = ${allLeads.length} total`);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
      toast.error('Erro ao carregar leads');
    } finally {
      setIsLoading(false);
    }
  };

  const filterLeads = () => {
    let filtered = [...leads];

    // Filtro de busca inteligente
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          lead.name?.toLowerCase().includes(term) ||
          lead.phone?.toLowerCase().includes(term) ||
          lead.whatsapp?.toLowerCase().includes(term) ||
          lead.email?.toLowerCase().includes(term) ||
          lead.city?.toLowerCase().includes(term) ||
          lead.state?.toLowerCase().includes(term) ||
          lead.address?.toLowerCase().includes(term)
      );
    }

    // Filtro de status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((lead) => lead.status === statusFilter);
    }

    // Filtro de origem
    if (sourceFilter !== 'all') {
      filtered = filtered.filter((lead) => lead.source === sourceFilter);
    }

    setFilteredLeads(filtered);
    setCurrentPage(1); // Reset para primeira página ao filtrar
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    const currentLeads = getCurrentPageLeads();
    if (selectedLeads.length === currentLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(currentLeads.map((lead) => lead.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedLeads.length === 0) {
      toast.error('Selecione pelo menos um lead');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir ${selectedLeads.length} lead(s)?`)) {
      return;
    }

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
      console.error('Erro ao excluir leads:', error);
      toast.error('Erro ao excluir leads');
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) {
      return;
    }

    try {
      const { error } = await supabase.from('leads').delete().eq('id', leadId);

      if (error) throw error;

      toast.success('Lead excluído com sucesso');
      loadLeads();
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Erro ao excluir lead:', error);
      toast.error('Erro ao excluir lead');
    }
  };

  const handleViewDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDetailsModal(true);
  };

  // Paginação
  const indexOfLastLead = currentPage * leadsPerPage;
  const indexOfFirstLead = indexOfLastLead - leadsPerPage;
  const getCurrentPageLeads = () => filteredLeads.slice(indexOfFirstLead, indexOfLastLead);
  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);

  const getStatusBadge = (status?: string) => {
    const variants: Record<string, { variant: 'default' | 'success' | 'warning' | 'danger' | 'info'; label: string }> = {
      new: { variant: 'info', label: 'Novo' },
      contacted: { variant: 'warning', label: 'Contatado' },
      interested: { variant: 'success', label: 'Interessado' },
      'not-interested': { variant: 'danger', label: 'Não Interessado' },
      converted: { variant: 'success', label: 'Convertido' },
      lost: { variant: 'danger', label: 'Perdido' },
    };
    const config = variants[status || 'new'] || { variant: 'default' as const, label: status || 'Novo' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const uniqueSources = Array.from(new Set(leads.map((l) => l.source).filter(Boolean)));
  const uniqueStatuses = Array.from(new Set(leads.map((l) => l.status).filter(Boolean)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-600" />
              Leads
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {filteredLeads.length} lead(s) encontrado(s)
            </p>
          </div>
          <Button
            leftIcon={<Plus className="w-5 h-5" />}
            onClick={() => setShowCreateModal(true)}
          >
            Novo Lead
          </Button>
        </div>

        {/* Filtros e Busca */}
        <Card className="mb-6">
          <div className="p-4 space-y-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar por nome, telefone, cidade, estado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                >
                  <option value="all">Todos</option>
                  {uniqueStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Origem
                </label>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                >
                  <option value="all">Todas</option>
                  {uniqueSources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>

              {selectedLeads.length > 0 && (
                <div className="flex items-end">
                  <Button
                    variant="danger"
                    leftIcon={<Trash2 className="w-4 h-4" />}
                    onClick={handleDeleteSelected}
                  >
                    Excluir ({selectedLeads.length})
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Lista de Leads */}
        {getCurrentPageLeads().length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Nenhum lead encontrado
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchTerm || statusFilter !== 'all' || sourceFilter !== 'all'
                ? 'Tente ajustar os filtros'
                : 'Comece adicionando seu primeiro lead'}
            </p>
            {!searchTerm && statusFilter === 'all' && sourceFilter === 'all' && (
              <Button onClick={() => setShowCreateModal(true)} leftIcon={<Plus className="w-5 h-5" />}>
                Adicionar Primeiro Lead
              </Button>
            )}
          </Card>
        ) : (
          <>
            {/* Grid de Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {getCurrentPageLeads().map((lead) => {
                const isCampaignLead = lead.tags?.includes('campanha');
                return (
                  <Card
                    key={lead.id}
                    className={`hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                      selectedLeads.includes(lead.id) ? 'ring-2 ring-purple-500' : ''
                    } ${isCampaignLead ? 'border-l-4 border-l-blue-500' : ''}`}
                  >
                    <div className="p-5">
                      {/* Header do Card */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedLeads.includes(lead.id)}
                            onChange={() => handleSelectLead(lead.id)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 dark:text-white truncate text-lg">
                              {lead.name}
                            </h3>
                            {lead.source && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {lead.source}
                              </p>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(lead.status)}
                      </div>

                      {/* Tags */}
                      {lead.tags && lead.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {lead.tags.map((tag, index) => (
                            <Badge
                              key={index}
                              variant={tag === 'campanha' ? 'info' : tag === 'google-maps' ? 'success' : 'default'}
                              className="text-xs font-medium"
                            >
                              {tag === 'campanha' && '📢 '}
                              {tag === 'google-maps' && '🗺️ '}
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Informações */}
                      <div className="space-y-2.5 mb-4">
                        {lead.phone && (
                          <div className="flex items-center gap-2.5 text-sm">
                            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">{lead.phone}</span>
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-2.5 text-sm">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-gray-700 dark:text-gray-300 truncate">{lead.email}</span>
                          </div>
                        )}
                        {(lead.city || lead.state) && (
                          <div className="flex items-center gap-2.5 text-sm">
                            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="text-gray-700 dark:text-gray-300">
                              {lead.city}
                              {lead.city && lead.state && ', '}
                              {lead.state}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Eye className="w-4 h-4" />}
                          onClick={() => handleViewDetails(lead)}
                          className="flex-1"
                        >
                          Detalhes
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          leftIcon={<Trash2 className="w-4 h-4" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLead(lead.id);
                          }}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando {indexOfFirstLead + 1} a {Math.min(indexOfLastLead, filteredLeads.length)} de{' '}
                  {filteredLeads.length} leads
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Detalhes - Será implementado em seguida */}
      {showDetailsModal && selectedLead && (
        <LeadDetailsModal
          lead={selectedLead}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedLead(null);
          }}
          onDelete={() => handleDeleteLead(selectedLead.id)}
          onUpdate={loadLeads}
        />
      )}

      {/* Modal de Criação - Será implementado em seguida */}
      {showCreateModal && (
        <CreateLeadModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadLeads}
        />
      )}
    </div>
  );
}

// Componentes dos modais serão criados em arquivos separados
function LeadDetailsModal({ lead, onClose, onDelete }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{lead.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Telefone</label>
              <p className="text-gray-900 dark:text-white">{lead.phone || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">WhatsApp</label>
              <p className="text-gray-900 dark:text-white">{lead.whatsapp || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</label>
              <p className="text-gray-900 dark:text-white">{lead.email || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Origem</label>
              <p className="text-gray-900 dark:text-white">{lead.source || '-'}</p>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Endereço</label>
              <p className="text-gray-900 dark:text-white">{lead.address || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Cidade</label>
              <p className="text-gray-900 dark:text-white">{lead.city || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Estado</label>
              <p className="text-gray-900 dark:text-white">{lead.state || '-'}</p>
            </div>
          </div>

          {lead.notes && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Observações</label>
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          {lead.tags && lead.tags.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {lead.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="info">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Fechar
          </Button>
          <Button variant="danger" leftIcon={<Trash2 className="w-4 h-4" />} onClick={onDelete}>
            Excluir Lead
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreateLeadModal({ onClose, onSuccess }: any) {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    city: '',
    state: '',
    source: 'Manual',
    status: 'new',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from('leads').insert({
        user_id: user?.id,
        ...formData,
        tags: ['manual'],
      });

      if (error) throw error;

      toast.success('Lead criado com sucesso!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar lead:', error);
      toast.error('Erro ao criar lead');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Novo Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome *
            </label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Telefone
              </label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                WhatsApp
              </label>
              <Input
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Endereço
            </label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cidade
              </label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Estado
              </label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Observações
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Criar Lead
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
