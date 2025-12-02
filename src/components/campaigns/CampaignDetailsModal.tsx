import { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, XCircle, Send, Users, MessageSquare, AlertCircle, Info } from 'lucide-react';
import { CampaignService, type Campaign, type CampaignLead, type CampaignMessageLog } from '../../services/campaignService';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Card } from '../ui/Card';

// Tipo para logs em tempo real do backend
interface RealtimeLog {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  data?: any;
}

interface CampaignDetailsModalProps {
  campaign: Campaign;
  onClose: () => void;
}

export default function CampaignDetailsModal({ campaign, onClose }: CampaignDetailsModalProps) {
  const [currentCampaign, setCurrentCampaign] = useState<Campaign>(campaign);
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [logs, setLogs] = useState<CampaignMessageLog[]>([]);
  const [realtimeLogs, setRealtimeLogs] = useState<RealtimeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'logs'>('overview');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [progress, setProgress] = useState<any>({});

  useEffect(() => {
    loadData();
    loadRealtimeProgress();
    
    // Atualiza a cada 2 segundos se a campanha estiver ativa
    const interval = setInterval(() => {
      if (['active', 'searching', 'validating'].includes(currentCampaign.status)) {
        loadData();
        loadRealtimeProgress();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentCampaign.id, currentCampaign.status]);

  // Atualiza tempo restante a cada segundo
  useEffect(() => {
    if (currentCampaign.status === 'active' && currentCampaign.nextDispatchAt) {
      const updateTime = () => {
        const now = Date.now();
        const nextDispatch = new Date(currentCampaign.nextDispatchAt!).getTime();
        const diff = nextDispatch - now;

        if (diff <= 0) {
          setTimeRemaining('Enviando agora...');
        } else {
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          setTimeRemaining(`${minutes}m ${seconds}s`);
        }
      };

      updateTime();
      const timer = setInterval(updateTime, 1000);
      return () => clearInterval(timer);
    } else {
      setTimeRemaining('');
    }
  }, [currentCampaign.status, currentCampaign.nextDispatchAt]);

  const loadData = async () => {
    try {
      const [campaignData, leadsData, logsData] = await Promise.all([
        CampaignService.getCampaign(campaign.id),
        CampaignService.getCampaignLeads(campaign.id),
        CampaignService.getCampaignLogs(campaign.id),
      ]);

      if (campaignData) {
        setCurrentCampaign(campaignData);
      }
      setLeads(leadsData);
      setLogs(logsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Busca logs em tempo real do backend
  const loadRealtimeProgress = async () => {
    try {
      const response = await fetch(`/api/campaign/progress/${campaign.id}`);
      if (response.ok) {
        const data = await response.json();
        setRealtimeLogs(data.logs || []);
        setProgress(data.progress || {});
      }
    } catch (error) {
      // Ignora erros silenciosamente
    }
  };

  const getStatusBadge = (status: Campaign['status']) => {
    const badges: Record<string, React.ReactNode> = {
      draft: <Badge variant="default">Rascunho</Badge>,
      scheduled: <Badge variant="info">Programada</Badge>,
      searching: <Badge variant="info">Buscando...</Badge>,
      validating: <Badge variant="warning">Validando...</Badge>,
      active: <Badge variant="success">Ativa</Badge>,
      paused: <Badge variant="warning">Pausada</Badge>,
      completed: <Badge variant="info">Concluída</Badge>,
      cancelled: <Badge variant="danger">Cancelada</Badge>,
    };
    return badges[status] || <Badge variant="default">{status}</Badge>;
  };

  const getMessageStatusBadge = (status: string) => {
    const badges = {
      pending: <Badge variant="default">Pendente</Badge>,
      sent: <Badge variant="success">Enviada</Badge>,
      failed: <Badge variant="danger">Falhou</Badge>,
      scheduled: <Badge variant="info">Agendada</Badge>,
    };
    return badges[status as keyof typeof badges] || <Badge variant="default">{status}</Badge>;
  };

  // Usa dados do progresso em tempo real quando disponíveis, senão calcula dos leads
  const stats = {
    totalLeads: progress.leadsFound || leads.length,
    validWhatsApp: progress.leadsValid || leads.filter(l => l.whatsappValid).length,
    messagesSent: progress.messagesSent || leads.filter(l => l.messageStatus === 'sent').length,
    messagesFailed: progress.messagesFailed || leads.filter(l => l.messageStatus === 'failed').length,
    messagesPending: (progress.leadsValid || leads.filter(l => l.whatsappValid).length) - 
                     (progress.messagesSent || leads.filter(l => l.messageStatus === 'sent').length) -
                     (progress.messagesFailed || leads.filter(l => l.messageStatus === 'failed').length),
  };

  const conversionRate = stats.totalLeads > 0 
    ? ((stats.validWhatsApp / stats.totalLeads) * 100).toFixed(1)
    : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentCampaign.name}
              </h2>
              {getStatusBadge(currentCampaign.status)}
            </div>
            {currentCampaign.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {currentCampaign.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'leads'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Leads ({stats.validWhatsApp})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Logs ({realtimeLogs.length + logs.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Total de Leads</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            {stats.totalLeads}
                          </p>
                        </div>
                        <Users className="w-8 h-8 text-blue-500" />
                      </div>
                    </Card>

                    <Card>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">WhatsApp Válidos</p>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                            {stats.validWhatsApp}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{conversionRate}% de conversão</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-500" />
                      </div>
                    </Card>

                    <Card>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Mensagens Enviadas</p>
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                            {stats.messagesSent}
                          </p>
                        </div>
                        <Send className="w-8 h-8 text-blue-500" />
                      </div>
                    </Card>

                    <Card>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Pendentes</p>
                          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                            {stats.messagesPending}
                          </p>
                        </div>
                        <Clock className="w-8 h-8 text-orange-500" />
                      </div>
                    </Card>
                  </div>

                  {/* Progresso em Tempo Real */}
                  {currentCampaign.status === 'active' && (
                    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-800">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
                        Campanha em Andamento
                      </h3>
                      
                      <div className="space-y-4">
                        {/* Próximo Envio */}
                        {currentCampaign.nextDispatchAt && (
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-blue-300 dark:border-blue-700">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                ⏰ Próximo envio em:
                              </span>
                              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 animate-pulse">
                                {timeRemaining || 'Calculando...'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Horário previsto: {new Date(currentCampaign.nextDispatchAt).toLocaleTimeString('pt-BR')}
                            </div>
                          </div>
                        )}

                        {/* Estabelecimento Atual */}
                        {currentCampaign.currentDispatchLeadId && (
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Próximo estabelecimento:
                            </div>
                            {(() => {
                              const currentLead = leads.find(l => l.id === currentCampaign.currentDispatchLeadId);
                              return currentLead ? (
                                <div className="space-y-1">
                                  <div className="font-semibold text-gray-900 dark:text-white">
                                    {currentLead.businessName}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    📞 {currentLead.phoneNumber}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    📍 {currentLead.address}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500">Carregando...</div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Conclusão Estimada */}
                        {currentCampaign.estimatedCompletionAt && (
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Conclusão estimada:
                            </div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {new Date(currentCampaign.estimatedCompletionAt).toLocaleString('pt-BR')}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Faltam {stats.messagesPending} mensagens
                            </div>
                          </div>
                        )}

                        {/* Lista de Estabelecimentos */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Status dos Estabelecimentos:
                          </div>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {leads.filter(l => l.whatsappValid).map((lead) => {
                              const isSent = lead.messageStatus === 'sent';
                              const isFailed = lead.messageStatus === 'failed';
                              const isPending = lead.messageStatus === 'pending';
                              
                              return (
                                <div
                                  key={lead.id}
                                  className={`flex items-center justify-between p-2 rounded ${
                                    isSent ? 'bg-green-50 dark:bg-green-900/20' :
                                    isFailed ? 'bg-red-50 dark:bg-red-900/20' :
                                    'bg-gray-50 dark:bg-gray-900'
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                      {lead.businessName}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {lead.phoneNumber}
                                    </div>
                                  </div>
                                  <div className="ml-2">
                                    {isSent && (
                                      <div className="flex items-center gap-1 text-green-600">
                                        <CheckCircle className="w-4 h-4" />
                                        <span className="text-xs">Enviada</span>
                                      </div>
                                    )}
                                    {isFailed && (
                                      <div className="flex items-center gap-1 text-red-600">
                                        <XCircle className="w-4 h-4" />
                                        <span className="text-xs">Falhou</span>
                                      </div>
                                    )}
                                    {isPending && (
                                      <div className="flex items-center gap-1 text-orange-600">
                                        <Clock className="w-4 h-4" />
                                        <span className="text-xs">Pendente</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Campaign Info */}
                  <Card>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Informações da Campanha
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Tipo de Estabelecimento</p>
                        <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                          {currentCampaign.targetAudience?.searchQuery || 'Não especificado'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Localização</p>
                        <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                          {currentCampaign.targetAudience?.location?.city}, {currentCampaign.targetAudience?.location?.state}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Intervalo de Envio</p>
                        <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                          {currentCampaign.scheduleConfig?.minInterval || 10} - {currentCampaign.scheduleConfig?.maxInterval || 20} minutos
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Criada em</p>
                        <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                          {new Date(currentCampaign.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Message Template */}
                  <Card>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Mensagem
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {currentCampaign.messageTemplate}
                      </p>
                    </div>
                  </Card>

                  {/* Status Atual */}
                  {currentCampaign.status === 'active' && stats.messagesPending > 0 && (
                    <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-3">
                        <div className="animate-pulse">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        </div>
                        <div>
                          <p className="font-medium text-blue-900 dark:text-blue-100">
                            Campanha em andamento
                          </p>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            {stats.messagesPending} mensagens pendentes • Próximo envio em breve
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* Leads Tab */}
              {activeTab === 'leads' && (
                <div className="space-y-4">
                  {/* Filtra apenas leads com WhatsApp válido */}
                  {(() => {
                    const validLeads = leads.filter(l => l.whatsappValid === true);
                    
                    if (validLeads.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600 dark:text-gray-400">Nenhum lead com WhatsApp válido</p>
                          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                            Leads sem WhatsApp são automaticamente removidos
                          </p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Estabelecimento
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Telefone
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {validLeads.map((lead) => (
                              <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                <td className="px-4 py-3">
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {lead.businessName}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {lead.city}, {lead.state}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                  {lead.phoneNumber}
                                </td>
                                <td className="px-4 py-3">
                                  {lead.messageStatus === 'sent' ? (
                                    <Badge variant="success">Enviada</Badge>
                                  ) : lead.messageStatus === 'failed' ? (
                                    <Badge variant="danger">Falhou</Badge>
                                  ) : (
                                    <Badge variant="default">Pendente</Badge>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Logs Tab */}
              {activeTab === 'logs' && (
                <div className="space-y-4">
                  {/* Logs em tempo real do backend */}
                  {realtimeLogs.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Logs em Tempo Real
                      </h4>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        {realtimeLogs.slice().reverse().map((log, index) => (
                          <div 
                            key={index} 
                            className={`flex items-start gap-2 text-sm p-2 rounded ${
                              log.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                              log.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                              log.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                              'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                            }`}
                          >
                            {log.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> :
                             log.type === 'error' ? <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> :
                             log.type === 'warning' ? <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> :
                             <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                            <div className="flex-1">
                              <span>{log.message}</span>
                              <span className="text-xs opacity-60 ml-2">
                                {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Logs do banco de dados */}
                  {logs.length === 0 && realtimeLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400">Nenhum log encontrado</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        Os logs aparecerão aqui quando a campanha estiver em execução
                      </p>
                    </div>
                  ) : logs.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Histórico de Mensagens
                      </h4>
                      {logs.map((log) => {
                        const lead = leads.find(l => l.id === log.leadId);
                        return (
                          <Card key={log.id} className="hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  {log.status === 'sent' ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                  ) : log.status === 'failed' ? (
                                    <XCircle className="w-5 h-5 text-red-500" />
                                  ) : (
                                    <Clock className="w-5 h-5 text-orange-500" />
                                  )}
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {lead?.businessName || 'Lead não encontrado'}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {lead?.phoneNumber}
                                    </p>
                                  </div>
                                </div>
                                {log.errorMessage && (
                                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                                    Erro: {log.errorMessage}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                {getMessageStatusBadge(log.status)}
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {new Date(log.sentAt || log.createdAt).toLocaleString('pt-BR')}
                                </p>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
