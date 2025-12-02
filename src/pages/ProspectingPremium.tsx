import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { PlacesService, type PlaceResult } from '../services/placesService';
import { CampaignService } from '../services/campaignService';
import { InstanceService } from '../services/instanceService';
import { supabase } from '../services/supabaseService';
import toast from 'react-hot-toast';
import {
  Search,
  MapPin,
  Phone,
  Building2,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  Send,
  Target,
  Smartphone,
  Zap,
  FileText,
  Smile,
  Calendar,
  Play,
  X,
} from 'lucide-react';

// Componente de Emoji Picker simples
const EMOJI_LIST = ['😀', '😊', '👋', '🎉', '✨', '💼', '📞', '💬', '🚀', '⭐', '❤️', '👍', '🔥', '💯', '🎯', '📈'];

function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 z-50"
    >
      <div className="grid grid-cols-8 gap-1">
        {EMOJI_LIST.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-xl transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

interface ProspectingResult extends PlaceResult {
  id: string;
  hasWhatsApp?: boolean;
  isValidating?: boolean;
  isAdded?: boolean;
}

export default function ProspectingPremium() {
  const { user } = useAuthStore();
  
  // Estados de busca
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState({ current: 0, total: 0, phase: '' });
  const [results, setResults] = useState<ProspectingResult[]>([]);
  
  // Estados de filtro
  const [filters, setFilters] = useState({
    query: '',
    city: '',
    state: '',
    country: 'Brasil',
  });
  
  // Estados de campanha
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<ProspectingResult[]>([]);
  const [campaignData, setCampaignData] = useState({
    name: '',
    message: '',
    mediaFiles: [] as { url: string; type: string; fileName: string }[],
    useEmoji: true,
    // Agendamento
    startNow: true,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    daysOfWeek: [1, 2, 3, 4, 5],
    startHour: 9,
    endHour: 18,
    minInterval: 10,
    maxInterval: 30,
  });
  
  // Estados de WhatsApp
  const [instanceStatus, setInstanceStatus] = useState<{ connected: boolean; instanceName?: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Verifica status do WhatsApp ao carregar
  useEffect(() => {
    if (user) {
      checkWhatsAppStatus();
    }
  }, [user]);

  const checkWhatsAppStatus = async () => {
    if (!user) return;
    try {
      const instance = await InstanceService.getUserInstance(user.id);
      setInstanceStatus({
        connected: instance?.status === 'connected',
        instanceName: instance?.instanceName,
      });
    } catch {
      setInstanceStatus({ connected: false });
    }
  };

  // Busca estabelecimentos
  const handleSearch = async () => {
    if (!filters.query || !filters.city) {
      toast.error('Preencha o tipo de negócio e a cidade');
      return;
    }

    setIsSearching(true);
    setResults([]);
    setSearchProgress({ current: 0, total: 0, phase: 'Buscando estabelecimentos...' });

    try {
      const places = await PlacesService.searchPlaces(
        filters.query,
        filters.city,
        filters.state,
        filters.country,
        60, // minResults
        3,  // maxPages
        (place) => {
          // Callback em tempo real
          const newResult: ProspectingResult = {
            ...place,
            id: place.placeId,
          };
          setResults(prev => [...prev, newResult]);
          setSearchProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
      );

      setSearchProgress({ current: places.length, total: places.length, phase: 'Busca concluída!' });
      
      const withPhone = places.filter(p => p.phoneNumber).length;
      toast.success(`${places.length} estabelecimentos encontrados! ${withPhone} com telefone.`);
    } catch (error: any) {
      console.error('Erro na busca:', error);
      toast.error(error.message || 'Erro ao buscar estabelecimentos');
    } finally {
      setIsSearching(false);
    }
  };

  // Valida WhatsApp de um número
  const validateWhatsApp = async (result: ProspectingResult) => {
    if (!instanceStatus?.connected) {
      toast.error('Conecte seu WhatsApp primeiro');
      return;
    }

    if (!result.phoneNumber) {
      toast.error('Este estabelecimento não tem telefone');
      return;
    }

    setResults(prev => prev.map(r => 
      r.id === result.id ? { ...r, isValidating: true } : r
    ));

    try {
      const response = await fetch('/api/whatsapp/check-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: result.phoneNumber,
          instanceName: instanceStatus.instanceName,
        }),
      });

      const data = await response.json();
      
      setResults(prev => prev.map(r => 
        r.id === result.id ? { ...r, hasWhatsApp: data.exists, isValidating: false } : r
      ));

      if (data.exists) {
        toast.success(`${result.name} tem WhatsApp!`);
      } else {
        toast.error(`${result.name} não tem WhatsApp`);
      }
    } catch (error) {
      setResults(prev => prev.map(r => 
        r.id === result.id ? { ...r, isValidating: false } : r
      ));
      toast.error('Erro ao validar número');
    }
  };

  // Adiciona lead ao CRM
  const addToCRM = async (result: ProspectingResult) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('leads').insert({
        user_id: user.id,
        name: result.name,
        phone: result.phoneNumber,
        whatsapp: result.phoneNumber,
        address: result.address,
        city: result.city,
        state: result.state,
        source: 'Google Maps',
        status: 'new',
        tags: ['prospecção', 'google-maps'],
      });

      if (error) throw error;

      setResults(prev => prev.map(r => 
        r.id === result.id ? { ...r, isAdded: true } : r
      ));
      
      toast.success(`${result.name} adicionado ao CRM!`);
    } catch (error) {
      toast.error('Erro ao adicionar lead');
    }
  };

  // Toggle seleção para campanha
  const toggleSelectLead = (result: ProspectingResult) => {
    setSelectedLeads(prev => {
      const exists = prev.find(l => l.id === result.id);
      if (exists) {
        return prev.filter(l => l.id !== result.id);
      }
      return [...prev, result];
    });
  };

  // Seleciona todos com telefone
  const selectAllWithPhone = () => {
    const withPhone = results.filter(r => r.phoneNumber && !r.isAdded);
    setSelectedLeads(withPhone);
  };

  // Cria campanha com os leads selecionados
  const createCampaign = async () => {
    if (!user) return;
    if (!campaignData.name) {
      toast.error('Digite um nome para a campanha');
      return;
    }
    if (!campaignData.message) {
      toast.error('Digite a mensagem da campanha');
      return;
    }
    if (selectedLeads.length === 0) {
      toast.error('Selecione pelo menos um lead');
      return;
    }

    try {
      // Cria a campanha
      const campaign = await CampaignService.createCampaign({
        userId: user.id,
        name: campaignData.name,
        description: `Campanha de prospecção - ${filters.query} em ${filters.city}`,
        searchQuery: filters.query,
        locationCity: filters.city,
        locationState: filters.state,
        locationCountry: filters.country,
        messageType: 'custom',
        messageContent: campaignData.message,
        mediaFiles: campaignData.mediaFiles.map(f => ({
          url: f.url,
          type: f.type as 'image' | 'video' | 'document',
          mimeType: f.type === 'image' ? 'image/jpeg' : 'application/pdf',
          fileName: f.fileName,
        })),
        minIntervalMinutes: campaignData.minInterval,
        maxIntervalMinutes: campaignData.maxInterval,
      });

      // Adiciona os leads à campanha
      for (const lead of selectedLeads) {
        if (lead.phoneNumber) {
          await CampaignService.addCampaignLead({
            campaignId: campaign.id,
            userId: user.id,
            businessName: lead.name,
            businessType: lead.businessType,
            phoneNumber: lead.phoneNumber,
            address: lead.address,
            city: lead.city,
            state: lead.state,
            country: lead.country,
            latitude: lead.latitude,
            longitude: lead.longitude,
            googlePlaceId: lead.placeId,
          });
        }
      }

      // Atualiza configuração de agendamento se não for iniciar agora
      if (!campaignData.startNow) {
        await CampaignService.updateCampaign(campaign.id, {
          scheduleConfig: {
            minIntervalMinutes: campaignData.minInterval,
            maxIntervalMinutes: campaignData.maxInterval,
            scheduledDispatch: {
              startDate: campaignData.startDate,
              endDate: campaignData.endDate,
              daysOfWeek: campaignData.daysOfWeek,
              startHour: campaignData.startHour,
              endHour: campaignData.endHour,
            },
          },
        });
      }

      toast.success(`Campanha "${campaignData.name}" criada com ${selectedLeads.length} leads!`);
      setShowCampaignModal(false);
      setSelectedLeads([]);
      setCampaignData({
        name: '',
        message: '',
        mediaFiles: [],
        useEmoji: true,
        startNow: true,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        daysOfWeek: [1, 2, 3, 4, 5],
        startHour: 9,
        endHour: 18,
        minInterval: 10,
        maxInterval: 30,
      });

      // Se for iniciar agora, inicia a campanha
      if (campaignData.startNow && instanceStatus?.connected) {
        try {
          const response = await fetch(`/api/campaign/launch/${campaign.id}`, {
            method: 'POST',
          });
          const result = await response.json();
          if (result.success) {
            toast.success('Campanha iniciada! Buscando e validando números...');
          } else {
            toast.error(result.message || 'Erro ao iniciar campanha');
          }
        } catch {
          toast.error('Campanha criada, mas não foi possível iniciar automaticamente');
        }
      } else if (!campaignData.startNow) {
        // Programar campanha para disparo futuro
        try {
          const scheduleResponse = await fetch(`/api/campaign/schedule/${campaign.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              enabled: true,
              startDate: campaignData.startDate,
              endDate: campaignData.endDate,
              daysOfWeek: campaignData.daysOfWeek,
              startHour: campaignData.startHour,
              endHour: campaignData.endHour,
              messagesPerDay: 50,
            }),
          });
          const scheduleResult = await scheduleResponse.json();
          if (scheduleResult.success) {
            toast.success(`📅 ${scheduleResult.message}`);
          } else {
            toast.error(scheduleResult.message || 'Erro ao programar campanha');
          }
        } catch {
          toast.error('Campanha criada, mas não foi possível programar');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar campanha');
    }
  };

  // Upload de mídia
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const type = file.type.startsWith('image/') ? 'image' : 
                     file.type.startsWith('video/') ? 'video' : 'document';
        
        setCampaignData(prev => ({
          ...prev,
          mediaFiles: [...prev.mediaFiles, {
            url: base64,
            type,
            fileName: file.name,
          }],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  // Insere emoji na mensagem
  const insertEmoji = (emoji: string) => {
    setCampaignData(prev => ({
      ...prev,
      message: prev.message + emoji,
    }));
  };

  // Stats
  const stats = {
    total: results.length,
    withPhone: results.filter(r => r.phoneNumber).length,
    withWhatsApp: results.filter(r => r.hasWhatsApp).length,
    selected: selectedLeads.length,
  };

  const daysOfWeekLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Target className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            Prospecção
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Encontre leads qualificados no Google Maps
          </p>
        </motion.div>

        {/* WhatsApp Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 p-4 rounded-2xl border-2 ${
            instanceStatus?.connected
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${
                instanceStatus?.connected ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
              }`}>
                <Smartphone className={`w-6 h-6 ${
                  instanceStatus?.connected ? 'text-emerald-600' : 'text-amber-600'
                }`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {instanceStatus?.connected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {instanceStatus?.connected 
                    ? `Instância: ${instanceStatus.instanceName}`
                    : 'Conecte para validar números e enviar mensagens'}
                </p>
              </div>
            </div>
            {!instanceStatus?.connected && (
              <motion.a
                href="/instances"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl font-medium"
              >
                Conectar
              </motion.a>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Filtros de Busca */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="glass-card rounded-2xl p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Search className="w-5 h-5 text-purple-600" />
                Buscar Estabelecimentos
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de Negócio *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={filters.query}
                      onChange={e => setFilters({ ...filters, query: e.target.value })}
                      placeholder="Ex: Restaurantes, Academias..."
                      className="input-premium pl-12"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cidade *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={filters.city}
                      onChange={e => setFilters({ ...filters, city: e.target.value })}
                      placeholder="São Paulo"
                      className="input-premium pl-12"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={filters.state}
                    onChange={e => setFilters({ ...filters, state: e.target.value })}
                    placeholder="SP"
                    className="input-premium"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="w-full btn-premium py-4 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Buscar no Google Maps
                    </>
                  )}
                </motion.button>

                {isSearching && (
                  <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                    <p className="text-sm text-purple-700 dark:text-purple-300 mb-2">
                      {searchProgress.phase}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-purple-200 dark:bg-purple-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-purple-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((searchProgress.current / 60) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                        {searchProgress.current}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats */}
              {results.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                    Estatísticas
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-center">
                      <p className="text-2xl font-bold text-emerald-600">{stats.withPhone}</p>
                      <p className="text-xs text-gray-500">Com Telefone</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                      <p className="text-2xl font-bold text-blue-600">{stats.withWhatsApp}</p>
                      <p className="text-xs text-gray-500">Com WhatsApp</p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center">
                      <p className="text-2xl font-bold text-purple-600">{stats.selected}</p>
                      <p className="text-xs text-gray-500">Selecionados</p>
                    </div>
                  </div>

                  {stats.withPhone > 0 && (
                    <div className="mt-4 space-y-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={selectAllWithPhone}
                        className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        Selecionar Todos ({stats.withPhone})
                      </motion.button>
                      
                      {selectedLeads.length > 0 && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowCampaignModal(true)}
                          className="w-full btn-premium py-3 flex items-center justify-center gap-2"
                        >
                          <Send className="w-5 h-5" />
                          Criar Campanha ({selectedLeads.length})
                        </motion.button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Resultados */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            {results.length === 0 && !isSearching ? (
              <div className="glass-card rounded-2xl p-12">
                <div className="text-center">
                  <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <MapPin className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Busque Estabelecimentos
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    Digite o tipo de negócio e a cidade para encontrar leads qualificados no Google Maps
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Resultados ({results.length})
                  </h2>
                  {results.length > 0 && (
                    <button
                      onClick={() => setResults([])}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <AnimatePresence mode="popLayout">
                  {results.map((result, index) => (
                    <motion.div
                      key={result.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: Math.min(index * 0.02, 0.5) }}
                      className={`glass-card rounded-xl p-4 ${
                        selectedLeads.find(l => l.id === result.id) 
                          ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        {result.phoneNumber && (
                          <input
                            type="checkbox"
                            checked={!!selectedLeads.find(l => l.id === result.id)}
                            onChange={() => toggleSelectLead(result)}
                            className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                          />
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {result.name}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {result.address}
                              </p>
                            </div>
                            
                            {/* Status badges */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {result.hasWhatsApp === true && (
                                <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-medium flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  WhatsApp
                                </span>
                              )}
                              {result.hasWhatsApp === false && (
                                <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-xs font-medium flex items-center gap-1">
                                  <XCircle className="w-3 h-3" />
                                  Sem WhatsApp
                                </span>
                              )}
                              {result.isAdded && (
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium">
                                  No CRM
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Phone & Actions */}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-4">
                              {result.phoneNumber ? (
                                <span className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                                  <Phone className="w-4 h-4" />
                                  {result.phoneNumber}
                                </span>
                              ) : (
                                <span className="flex items-center gap-2 text-sm text-gray-400">
                                  <Phone className="w-4 h-4" />
                                  Sem telefone
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {result.phoneNumber && result.hasWhatsApp === undefined && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => validateWhatsApp(result)}
                                  disabled={result.isValidating || !instanceStatus?.connected}
                                  className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                  {result.isValidating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Zap className="w-4 h-4" />
                                  )}
                                  Validar
                                </motion.button>
                              )}
                              
                              {!result.isAdded && result.phoneNumber && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => addToCRM(result)}
                                  className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-1"
                                >
                                  <Plus className="w-4 h-4" />
                                  CRM
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Modal de Criar Campanha */}
      <AnimatePresence>
        {showCampaignModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCampaignModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                      <Send className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Criar Campanha
                      </h2>
                      <p className="text-sm text-gray-500">
                        {selectedLeads.length} leads selecionados
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setShowCampaignModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome da Campanha *
                  </label>
                  <input
                    type="text"
                    value={campaignData.name}
                    onChange={e => setCampaignData({ ...campaignData, name: e.target.value })}
                    placeholder="Ex: Prospecção Restaurantes SP"
                    className="input-premium"
                  />
                </div>

                {/* Mensagem */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mensagem *
                  </label>
                  <div className="relative">
                    <textarea
                      value={campaignData.message}
                      onChange={e => setCampaignData({ ...campaignData, message: e.target.value })}
                      placeholder="Olá {nome}! Tudo bem? ..."
                      rows={4}
                      className="input-premium resize-none pr-12"
                    />
                    <div className="absolute bottom-3 right-3">
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Smile className="w-5 h-5 text-gray-400" />
                      </button>
                      <AnimatePresence>
                        {showEmojiPicker && (
                          <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmojiPicker(false)} />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Use {'{nome}'} para personalizar com o nome do estabelecimento
                  </p>
                </div>

                {/* Mídia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Anexar Mídia (opcional)
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {campaignData.mediaFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                          {file.type === 'image' ? (
                            <img src={file.url} alt="" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <FileText className="w-8 h-8 text-gray-400" />
                          )}
                        </div>
                        <button
                          onClick={() => setCampaignData({
                            ...campaignData,
                            mediaFiles: campaignData.mediaFiles.filter((_, i) => i !== index),
                          })}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <label className="w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 transition-colors">
                      <Plus className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">Adicionar</span>
                      <input
                        type="file"
                        accept="image/*,video/*,.pdf,.doc,.docx"
                        multiple
                        onChange={handleMediaUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Agendamento */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      <span className="font-medium text-gray-900 dark:text-white">Agendamento</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCampaignData({ ...campaignData, startNow: true })}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          campaignData.startNow 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Iniciar Agora
                      </button>
                      <button
                        onClick={() => setCampaignData({ ...campaignData, startNow: false })}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          !campaignData.startNow 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Programar
                      </button>
                    </div>
                  </div>

                  {!campaignData.startNow && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Data Início</label>
                          <input
                            type="date"
                            value={campaignData.startDate}
                            onChange={e => setCampaignData({ ...campaignData, startDate: e.target.value })}
                            className="input-premium text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Data Fim</label>
                          <input
                            type="date"
                            value={campaignData.endDate}
                            onChange={e => setCampaignData({ ...campaignData, endDate: e.target.value })}
                            className="input-premium text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-2">Dias da Semana</label>
                        <div className="flex gap-1">
                          {daysOfWeekLabels.map((label, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                const days = campaignData.daysOfWeek.includes(index)
                                  ? campaignData.daysOfWeek.filter(d => d !== index)
                                  : [...campaignData.daysOfWeek, index];
                                setCampaignData({ ...campaignData, daysOfWeek: days });
                              }}
                              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                                campaignData.daysOfWeek.includes(index)
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Horário Início</label>
                          <select
                            value={campaignData.startHour}
                            onChange={e => setCampaignData({ ...campaignData, startHour: Number(e.target.value) })}
                            className="select-premium text-sm"
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Horário Fim</label>
                          <select
                            value={campaignData.endHour}
                            onChange={e => setCampaignData({ ...campaignData, endHour: Number(e.target.value) })}
                            className="select-premium text-sm"
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Intervalo */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <label className="block text-xs text-gray-500 mb-2">
                      Intervalo entre mensagens (minutos)
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={campaignData.minInterval}
                          onChange={e => setCampaignData({ ...campaignData, minInterval: Number(e.target.value) })}
                          className="input-premium text-sm"
                        />
                        <span className="text-xs text-gray-400">Mínimo</span>
                      </div>
                      <span className="text-gray-400">-</span>
                      <div className="flex-1">
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={campaignData.maxInterval}
                          onChange={e => setCampaignData({ ...campaignData, maxInterval: Number(e.target.value) })}
                          className="input-premium text-sm"
                        />
                        <span className="text-xs text-gray-400">Máximo</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCampaignModal(false)}
                    className="flex-1 px-6 py-3 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={createCampaign}
                    className="flex-1 btn-premium py-3 flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    {campaignData.startNow ? 'Criar e Iniciar' : 'Criar Campanha'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
