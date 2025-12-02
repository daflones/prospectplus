import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { CampaignService, type Campaign } from '../services/campaignService';
import { InstanceService } from '../services/instanceService';
import { CampaignDispatchService } from '../services/campaignDispatchService';
import { DispatchApiService } from '../services/dispatchApiService';
import toast from 'react-hot-toast';
import {
  Plus,
  Play,
  Pause,
  Send,
  MapPin,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Smartphone,
  Eye,
  Trash2,
  Copy,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  BarChart3,
  CalendarDays,
  Timer,
  Shuffle,
  X,
} from 'lucide-react';
import CreateCampaignModal from '../components/campaigns/CreateCampaignModal';
import CampaignLauncher from '../components/campaigns/CampaignLauncher';
import CampaignDetailsModal from '../components/campaigns/CampaignDetailsModal';
import CampaignProgress from '../components/campaigns/CampaignProgress';

// Componente de Paginação Premium
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const getPageNumbers = () => {
    const pages = [];
    const showEllipsis = totalPages > 7;
    
    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </motion.button>
      
      {getPageNumbers().map((page, index) => (
        <motion.button
          key={index}
          whileHover={{ scale: page !== '...' ? 1.05 : 1 }}
          whileTap={{ scale: page !== '...' ? 0.95 : 1 }}
          onClick={() => typeof page === 'number' && onPageChange(page)}
          disabled={page === '...'}
          className={`min-w-[40px] h-10 rounded-xl font-medium transition-all ${
            page === currentPage
              ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-500/25'
              : page === '...'
              ? 'text-gray-400 cursor-default'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          {page}
        </motion.button>
      ))}
      
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
  );
}

// Modal de Disparo Programado
function ScheduledDispatchModal({
  campaign,
  onClose,
  onSchedule,
}: {
  campaign: Campaign;
  onClose: () => void;
  onSchedule: (config: ScheduleConfig) => void;
}) {
  const [config, setConfig] = useState<ScheduleConfig>({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    daysOfWeek: [1, 2, 3, 4, 5], // Segunda a Sexta
    startHour: 9,
    endHour: 18,
    minInterval: 10,
    maxInterval: 30,
    messagesPerDay: 50,
    randomizeOrder: true,
  });

  const daysOfWeekLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const toggleDay = (day: number) => {
    setConfig(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort(),
    }));
  };

  const calculateTotalDays = () => {
    const start = new Date(config.startDate);
    const end = new Date(config.endDate);
    let count = 0;
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (config.daysOfWeek.includes(d.getDay())) count++;
    }
    return count;
  };

  const estimatedDuration = () => {
    const totalDays = calculateTotalDays();
    const totalMessages = campaign.totalLeads - campaign.sentMessages;
    const daysNeeded = Math.ceil(totalMessages / config.messagesPerDay);
    return Math.max(daysNeeded, totalDays);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <CalendarDays className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Disparo Programado
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure o agendamento da campanha
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

        <div className="p-6 space-y-6">
          {/* Período */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data de Início
              </label>
              <input
                type="date"
                value={config.startDate}
                onChange={e => setConfig({ ...config, startDate: e.target.value })}
                className="input-premium"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data de Término
              </label>
              <input
                type="date"
                value={config.endDate}
                onChange={e => setConfig({ ...config, endDate: e.target.value })}
                className="input-premium"
              />
            </div>
          </div>

          {/* Dias da Semana */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Dias de Disparo
            </label>
            <div className="flex gap-2">
              {daysOfWeekLabels.map((label, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleDay(index)}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                    config.daysOfWeek.includes(index)
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Horário */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Horário de Início
              </label>
              <select
                value={config.startHour}
                onChange={e => setConfig({ ...config, startHour: Number(e.target.value) })}
                className="select-premium"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Horário de Término
              </label>
              <select
                value={config.endHour}
                onChange={e => setConfig({ ...config, endHour: Number(e.target.value) })}
                className="select-premium"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Intervalo entre mensagens */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Intervalo entre Mensagens (minutos)
            </label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Mínimo</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={config.minInterval}
                  onChange={e => setConfig({ ...config, minInterval: Number(e.target.value) })}
                  className="input-premium"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Máximo</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={config.maxInterval}
                  onChange={e => setConfig({ ...config, maxInterval: Number(e.target.value) })}
                  className="input-premium"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
              <Shuffle className="w-3 h-3" />
              Intervalo aleatório entre {config.minInterval} e {config.maxInterval} minutos
            </p>
          </div>

          {/* Mensagens por dia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Máximo de Mensagens por Dia
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={config.messagesPerDay}
              onChange={e => setConfig({ ...config, messagesPerDay: Number(e.target.value) })}
              className="input-premium"
            />
          </div>

          {/* Randomizar ordem */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              <Shuffle className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Randomizar Ordem dos Leads
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Envia para leads em ordem aleatória
                </p>
              </div>
            </div>
            <button
              onClick={() => setConfig({ ...config, randomizeOrder: !config.randomizeOrder })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                config.randomizeOrder ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <motion.div
                animate={{ x: config.randomizeOrder ? 24 : 2 }}
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
              />
            </button>
          </div>

          {/* Resumo */}
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Resumo do Agendamento
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-purple-600 dark:text-purple-400">Dias de disparo</p>
                <p className="font-semibold text-purple-900 dark:text-purple-100">
                  {calculateTotalDays()} dias
                </p>
              </div>
              <div>
                <p className="text-purple-600 dark:text-purple-400">Mensagens restantes</p>
                <p className="font-semibold text-purple-900 dark:text-purple-100">
                  {campaign.totalLeads - campaign.sentMessages}
                </p>
              </div>
              <div>
                <p className="text-purple-600 dark:text-purple-400">Estimativa de conclusão</p>
                <p className="font-semibold text-purple-900 dark:text-purple-100">
                  ~{estimatedDuration()} dias
                </p>
              </div>
              <div>
                <p className="text-purple-600 dark:text-purple-400">Horário de operação</p>
                <p className="font-semibold text-purple-900 dark:text-purple-100">
                  {config.startHour}h às {config.endHour}h
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSchedule(config)}
              className="flex-1 btn-premium flex items-center justify-center gap-2"
            >
              <CalendarDays className="w-5 h-5" />
              Agendar Disparo
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface ScheduleConfig {
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  startHour: number;
  endHour: number;
  minInterval: number;
  maxInterval: number;
  messagesPerDay: number;
  randomizeOrder: boolean;
}

export default function CampaignsPremium() {
  const { user } = useAuthStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [campaignToSchedule, setCampaignToSchedule] = useState<Campaign | null>(null);
  const [instanceStatus, setInstanceStatus] = useState<{
    connected: boolean;
    instanceName?: string;
    phoneNumber?: string;
  } | null>(null);

  // Filtros e Paginação
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    if (user) {
      loadCampaigns();
      checkInstanceStatus();
    }
  }, [user]);

  // Auto-refresh quando há campanhas em execução ou recentemente criadas
  useEffect(() => {
    const hasActive = campaigns.some(c => 
      ['active', 'searching', 'validating'].includes(c.status)
    );
    
    // Também verifica se há campanhas draft recentes (podem ter sido iniciadas)
    const hasRecentDraft = campaigns.some(c => {
      if (c.status !== 'draft') return false;
      const createdAt = new Date(c.createdAt).getTime();
      const now = Date.now();
      return (now - createdAt) < 60000; // Criada há menos de 1 minuto
    });
    
    if (hasActive || hasRecentDraft) {
      const interval = setInterval(() => {
        loadCampaigns(false); // Não mostrar loading no auto-refresh
      }, 2000); // Atualiza a cada 2 segundos
      
      return () => clearInterval(interval);
    }
  }, [campaigns]);

  useEffect(() => {
    filterCampaigns();
  }, [campaigns, searchTerm, statusFilter]);

  const loadCampaigns = async (showLoading = true) => {
    if (!user) return;
    try {
      if (showLoading && campaigns.length === 0) {
        setIsLoading(true);
      }
      const data = await CampaignService.getUserCampaigns(user.id);
      
      // Log para debug - mostra status das campanhas
      const activeCampaigns = data.filter(c => ['active', 'searching', 'validating'].includes(c.status));
      if (activeCampaigns.length > 0) {
        console.log('📊 Campanhas ativas encontradas:', activeCampaigns.map(c => ({
          id: c.id.substring(0, 8),
          name: c.name,
          status: c.status,
          totalLeads: c.totalLeads,
          sentMessages: c.sentMessages,
          failedMessages: c.failedMessages
        })));
      }
      
      setCampaigns(data);
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
      toast.error('Erro ao carregar campanhas');
    } finally {
      setIsLoading(false);
    }
  };

  const checkInstanceStatus = async () => {
    if (!user) return;
    try {
      const instance = await InstanceService.getUserInstance(user.id);
      if (instance) {
        setInstanceStatus({
          connected: instance.status === 'connected',
          instanceName: instance.instanceName,
          phoneNumber: instance.phoneNumber,
        });
      } else {
        setInstanceStatus({ connected: false });
      }
    } catch (error) {
      setInstanceStatus({ connected: false });
    }
  };

  const filterCampaigns = () => {
    let filtered = [...campaigns];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    setFilteredCampaigns(filtered);
    setCurrentPage(1);
  };

  const handleDeleteCampaign = async (campaignId: string, campaignName: string) => {
    if (!confirm(`Tem certeza que deseja deletar a campanha "${campaignName}"?`)) return;
    try {
      await CampaignService.deleteCampaign(campaignId);
      toast.success('Campanha deletada com sucesso!');
      loadCampaigns();
    } catch (error) {
      toast.error('Erro ao deletar campanha');
    }
  };

  const handleDuplicateCampaign = async (campaignId: string) => {
    if (!user) return;
    try {
      const newCampaign = await CampaignService.duplicateCampaign(campaignId, user.id);
      toast.success(`Campanha "${newCampaign.name}" criada!`);
      loadCampaigns();
    } catch (error) {
      toast.error('Erro ao duplicar campanha');
    }
  };

  const handleScheduleDispatch = async (config: ScheduleConfig) => {
    if (!campaignToSchedule) return;
    
    try {
      // Chamar API do backend para programar campanha
      const response = await fetch(`/api/campaign/schedule/${campaignToSchedule.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: true,
          startDate: config.startDate,
          endDate: config.endDate,
          daysOfWeek: config.daysOfWeek,
          startHour: config.startHour,
          endHour: config.endHour,
          messagesPerDay: config.messagesPerDay || 50,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`📅 ${result.message}`);
        setShowScheduleModal(false);
        setCampaignToSchedule(null);
        loadCampaigns();
      } else {
        toast.error(result.message || 'Erro ao programar disparo');
      }
    } catch (error) {
      console.error('Erro ao programar:', error);
      toast.error('Erro ao programar disparo');
    }
  };

  // Verifica se há alguma campanha em execução
  const hasRunningCampaign = campaigns.some(c => 
    ['active', 'searching', 'validating'].includes(c.status)
  );

  const getStatusConfig = (status: Campaign['status'] | 'scheduled' | 'searching' | 'validating') => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: Clock },
      scheduled: { label: 'Programada', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: CalendarDays },
      searching: { label: 'Buscando...', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Search },
      validating: { label: 'Validando...', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Smartphone },
      active: { label: 'Ativa', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Play },
      paused: { label: 'Pausada', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Pause },
      completed: { label: 'Concluída', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle },
      cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    };
    return configs[status] || configs.draft;
  };

  // Paginação
  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
  const paginatedCampaigns = filteredCampaigns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    messagesSent: campaigns.reduce((sum, c) => sum + c.sentMessages, 0),
    successRate: campaigns.length > 0
      ? Math.round((campaigns.reduce((sum, c) => sum + c.sentMessages, 0) /
          Math.max(campaigns.reduce((sum, c) => sum + c.totalLeads, 0), 1)) * 100)
      : 0,
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
          <p className="text-gray-500 font-medium">Carregando campanhas...</p>
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
                <Send className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              Campanhas
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Gerencie suas campanhas de prospecção automatizada
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateModal(true)}
            className="btn-premium flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nova Campanha
          </motion.button>
        </motion.div>

        {/* WhatsApp Status */}
        {instanceStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-2xl border-2 ${
              instanceStatus.connected
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${
                  instanceStatus.connected ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  <Smartphone className={`w-6 h-6 ${
                    instanceStatus.connected ? 'text-emerald-600' : 'text-red-600'
                  }`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">WhatsApp</h3>
                    <span className={`tag ${instanceStatus.connected ? 'tag-success' : 'tag-danger'}`}>
                      {instanceStatus.connected ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {instanceStatus.connected
                      ? instanceStatus.phoneNumber || instanceStatus.instanceName
                      : 'Conecte sua instância para iniciar campanhas'}
                  </p>
                </div>
              </div>
              {!instanceStatus.connected && (
                <motion.a
                  href="/instances"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
                >
                  Conectar
                </motion.a>
              )}
            </div>
          </motion.div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, icon: Send, color: 'purple' },
            { label: 'Ativas', value: stats.active, icon: Play, color: 'emerald' },
            { label: 'Mensagens', value: stats.messagesSent, icon: MessageSquare, color: 'blue' },
            { label: 'Taxa de Sucesso', value: `${stats.successRate}%`, icon: TrendingUp, color: 'amber' },
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
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar campanhas..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-premium pl-12"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="select-premium md:w-48"
            >
              <option value="all">Todos os status</option>
              <option value="draft">Rascunho</option>
              <option value="active">Ativa</option>
              <option value="paused">Pausada</option>
              <option value="completed">Concluída</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
        </motion.div>

        {/* Campaigns Grid */}
        {paginatedCampaigns.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card rounded-2xl p-12"
          >
            <div className="empty-state">
              <Send className="empty-state-icon" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {searchTerm || statusFilter !== 'all'
                  ? 'Nenhuma campanha encontrada'
                  : 'Nenhuma campanha criada'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {searchTerm || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros'
                  : 'Crie sua primeira campanha de prospecção'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCreateModal(true)}
                  className="btn-premium flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Criar Primeira Campanha
                </motion.button>
              )}
            </div>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {paginatedCampaigns.map((campaign, index) => {
                  const statusConfig = getStatusConfig(campaign.status);
                  // Progresso = (enviadas + falhas) / total de leads válidos
                  const processed = campaign.sentMessages + campaign.failedMessages;
                  const progress = campaign.totalLeads > 0
                    ? (processed / campaign.totalLeads) * 100
                    : 0;

                  return (
                    <motion.div
                      key={campaign.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      className="glass-card rounded-2xl overflow-hidden card-hover"
                    >
                      {/* Card Header */}
                      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${
                              campaign.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                              campaign.status === 'searching' ? 'bg-blue-100 dark:bg-blue-900/30' :
                              campaign.status === 'validating' ? 'bg-amber-100 dark:bg-amber-900/30' :
                              campaign.status === 'paused' ? 'bg-amber-100 dark:bg-amber-900/30' :
                              'bg-gray-100 dark:bg-gray-700'
                            }`}>
                              <statusConfig.icon className={`w-5 h-5 ${
                                campaign.status === 'active' ? 'text-emerald-600' :
                                campaign.status === 'searching' ? 'text-blue-600 animate-pulse' :
                                campaign.status === 'validating' ? 'text-amber-600 animate-pulse' :
                                campaign.status === 'paused' ? 'text-amber-600' :
                                'text-gray-600'
                              }`} />
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 dark:text-white">
                                {campaign.name}
                              </h3>
                              {campaign.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                                  {campaign.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className={`tag ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-6">
                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">
                              {campaign.targetAudience?.location?.city || 'Não definido'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Users className="w-4 h-4" />
                            <span>{campaign.totalLeads} leads</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Timer className="w-4 h-4" />
                            <span>
                              {campaign.scheduleConfig?.minIntervalMinutes || 10}-
                              {campaign.scheduleConfig?.maxIntervalMinutes || 20} min
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <MessageSquare className="w-4 h-4" />
                            <span>{campaign.sentMessages} enviadas</span>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-600 dark:text-gray-400">Progresso</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {campaign.sentMessages + campaign.failedMessages} / {campaign.totalLeads}
                            </span>
                          </div>
                          <div className="progress-premium">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                              className="progress-premium-bar"
                            />
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                            <p className="text-xl font-bold text-emerald-600">{campaign.sentMessages}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Enviadas</p>
                          </div>
                          <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                            <p className="text-xl font-bold text-amber-600">
                              {Math.max(0, campaign.totalLeads - campaign.sentMessages - campaign.failedMessages)}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Pendentes</p>
                          </div>
                          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                            <p className="text-xl font-bold text-red-600">{campaign.failedMessages}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Falhas</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          {campaign.status === 'draft' && (
                            <>
                              {hasRunningCampaign ? (
                                <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-400 rounded-xl font-medium cursor-not-allowed">
                                  <Play className="w-4 h-4" />
                                  Aguarde...
                                </div>
                              ) : (
                                <CampaignLauncher
                                  campaignId={campaign.id}
                                  onComplete={loadCampaigns}
                                />
                              )}
                              <motion.button
                                whileHover={!hasRunningCampaign ? { scale: 1.02 } : {}}
                                whileTap={!hasRunningCampaign ? { scale: 0.98 } : {}}
                                disabled={hasRunningCampaign}
                                onClick={() => {
                                  if (hasRunningCampaign) {
                                    toast.error('Aguarde a campanha atual terminar');
                                    return;
                                  }
                                  setCampaignToSchedule(campaign);
                                  setShowScheduleModal(true);
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                                  hasRunningCampaign 
                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                                }`}
                              >
                                <CalendarDays className="w-4 h-4" />
                                Programar
                              </motion.button>
                            </>
                          )}
                          
                          {campaign.status === 'active' && (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={async () => {
                                try {
                                  await DispatchApiService.stopCampaign(campaign.id);
                                  toast.success('Campanha pausada');
                                } catch {
                                  await CampaignDispatchService.pauseCampaign(campaign.id);
                                  toast.success('Campanha pausada');
                                }
                                loadCampaigns();
                              }}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-xl font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                            >
                              <Pause className="w-4 h-4" />
                              Pausar
                            </motion.button>
                          )}

                          {/* Campanha Programada */}
                          {campaign.status === 'scheduled' && (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setCampaignToSchedule(campaign);
                                setShowScheduleModal(true);
                              }}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-xl font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                            >
                              <CalendarDays className="w-4 h-4" />
                              Reprogramar
                            </motion.button>
                          )}

                          {/* Buscando ou Validando - mostrar loading */}
                          {(campaign.status === 'searching' || campaign.status === 'validating') && (
                            <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl font-medium">
                              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                              {campaign.status === 'searching' ? 'Buscando leads...' : 'Validando WhatsApp...'}
                            </div>
                          )}

                          {campaign.status === 'paused' && (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={async () => {
                                if (!user) return;
                                try {
                                  await DispatchApiService.resumeCampaign(campaign.id);
                                  toast.success('Campanha retomada');
                                } catch {
                                  await CampaignDispatchService.resumeCampaign(campaign.id, user.id);
                                  toast.success('Campanha retomada');
                                }
                                loadCampaigns();
                              }}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                            >
                              <Play className="w-4 h-4" />
                              Retomar
                            </motion.button>
                          )}

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedCampaign(campaign)}
                            className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleDuplicateCampaign(campaign.id)}
                            className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </motion.button>

                          {campaign.status !== 'active' && campaign.status !== 'searching' && campaign.status !== 'validating' && (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}
                              className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          )}
                        </div>

                        {/* Progresso em tempo real para campanhas ativas */}
                        <CampaignProgress 
                          campaignId={campaign.id}
                          isActive={['active', 'searching', 'validating'].includes(campaign.status)}
                        />
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
            />
          </>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateCampaignModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={loadCampaigns}
          />
        )}

        {selectedCampaign && (
          <CampaignDetailsModal
            campaign={selectedCampaign}
            onClose={() => setSelectedCampaign(null)}
          />
        )}

        {showScheduleModal && campaignToSchedule && (
          <ScheduledDispatchModal
            campaign={campaignToSchedule}
            onClose={() => {
              setShowScheduleModal(false);
              setCampaignToSchedule(null);
            }}
            onSchedule={handleScheduleDispatch}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
