import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { CampaignService, type Campaign } from '../services/campaignService';
import { InstanceService } from '../services/instanceService';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import CreateCampaignModal from '../components/campaigns/CreateCampaignModal';
import CampaignLauncher from '../components/campaigns/CampaignLauncher';
import CampaignDetailsModal from '../components/campaigns/CampaignDetailsModal';
import { CampaignDispatchService } from '../services/campaignDispatchService';
import { DispatchApiService } from '../services/dispatchApiService';
import toast from 'react-hot-toast';
import {
  Plus,
  Play,
  Pause,
  StopCircle,
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
} from 'lucide-react';

export default function Campaigns() {
  const { user } = useAuthStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [instanceStatus, setInstanceStatus] = useState<{
    connected: boolean;
    instanceName?: string;
    phoneNumber?: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      loadCampaigns();
      checkInstanceStatus();
    }
  }, [user]);

  const loadCampaigns = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const data = await CampaignService.getUserCampaigns(user.id);
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
      console.log('🔍 Verificando status da instância no banco de dados...');
      
      // Busca instância do banco de dados
      const instance = await InstanceService.getUserInstance(user.id);
      
      if (instance) {
        const isConnected = instance.status === 'connected';
        
        console.log(`${isConnected ? '✅' : '❌'} Instância: ${instance.instanceName} - ${instance.status}`);
        
        setInstanceStatus({
          connected: isConnected,
          instanceName: instance.instanceName,
          phoneNumber: instance.phoneNumber,
        });
      } else {
        console.log('ℹ️ Nenhuma instância encontrada no banco de dados');
        setInstanceStatus({
          connected: false,
        });
      }
    } catch (error) {
      console.error('❌ Erro ao verificar instância:', error);
      setInstanceStatus({ connected: false });
    }
  };

  const getStatusBadge = (status: Campaign['status']) => {
    const badges = {
      draft: <Badge variant="default">Rascunho</Badge>,
      active: <Badge variant="success">Ativa</Badge>,
      paused: <Badge variant="warning">Pausada</Badge>,
      completed: <Badge variant="info">Concluída</Badge>,
      cancelled: <Badge variant="danger">Cancelada</Badge>,
    };

    return badges[status];
  };

  const getStatusIcon = (status: Campaign['status']) => {
    const icons = {
      draft: <Clock className="w-5 h-5 text-gray-400" />,
      active: <Play className="w-5 h-5 text-green-500" />,
      paused: <Pause className="w-5 h-5 text-yellow-500" />,
      completed: <CheckCircle className="w-5 h-5 text-blue-500" />,
      cancelled: <XCircle className="w-5 h-5 text-red-500" />,
    };

    return icons[status];
  };

  const handleDeleteCampaign = async (campaignId: string, campaignName: string) => {
    if (!confirm(`Tem certeza que deseja deletar a campanha "${campaignName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await CampaignService.deleteCampaign(campaignId);
      toast.success('Campanha deletada com sucesso!');
      loadCampaigns();
    } catch (error) {
      console.error('Erro ao deletar campanha:', error);
      toast.error('Erro ao deletar campanha');
    }
  };

  const handleDuplicateCampaign = async (campaignId: string) => {
    if (!user) return;

    try {
      const newCampaign = await CampaignService.duplicateCampaign(campaignId, user.id);
      toast.success(`Campanha "${newCampaign.name}" criada com sucesso!`);
      loadCampaigns();
    } catch (error) {
      console.error('Erro ao duplicar campanha:', error);
      toast.error('Erro ao duplicar campanha');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Campanhas de Prospecção
            </h1>
            <p className="text-gray-600">
              Crie e gerencie campanhas automatizadas de WhatsApp
            </p>
          </div>
          <Button
            leftIcon={<Plus className="w-5 h-5" />}
            onClick={() => setShowCreateModal(true)}
          >
            Nova Campanha
          </Button>
        </div>

        {/* WhatsApp Instance Status Card */}
        {instanceStatus && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${
                    instanceStatus.connected 
                      ? 'bg-green-100' 
                      : 'bg-red-100'
                  }`}>
                    <Smartphone className={`w-6 h-6 ${
                      instanceStatus.connected 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        WhatsApp
                      </h3>
                      {instanceStatus.connected ? (
                        <Badge variant="success">Conectado</Badge>
                      ) : (
                        <Badge variant="danger">Desconectado</Badge>
                      )}
                    </div>
                    {instanceStatus.connected ? (
                      <p className="text-sm text-gray-600">
                        {instanceStatus.phoneNumber 
                          ? `Número: ${instanceStatus.phoneNumber}`
                          : `Instância: ${instanceStatus.instanceName}`
                        }
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600">
                        Conecte sua instância para iniciar campanhas
                      </p>
                    )}
                  </div>
                </div>
                {!instanceStatus.connected && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => window.location.href = '/instances'}
                  >
                    Conectar WhatsApp
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Campanhas</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {campaigns.length}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Send className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Campanhas Ativas</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {campaigns.filter(c => c.status === 'active').length}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <Play className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Mensagens Enviadas</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {campaigns.reduce((sum, c) => sum + c.sentMessages, 0)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Taxa de Sucesso</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {campaigns.length > 0
                      ? Math.round(
                          (campaigns.reduce((sum, c) => sum + c.sentMessages, 0) /
                            Math.max(campaigns.reduce((sum, c) => sum + c.totalLeads, 0), 1)) *
                            100
                        )
                      : 0}
                    %
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns List */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                Carregando campanhas...
              </div>
            </CardContent>
          </Card>
        ) : campaigns.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Send className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhuma campanha criada
                </h3>
                <p className="text-gray-600 mb-6">
                  Crie sua primeira campanha de prospecção automatizada
                </p>
                <Button
                  leftIcon={<Plus className="w-5 h-5" />}
                  onClick={() => setShowCreateModal(true)}
                >
                  Criar Primeira Campanha
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} hover>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(campaign.status)}
                        <CardTitle>{campaign.name}</CardTitle>
                        {getStatusBadge(campaign.status)}
                      </div>
                      {campaign.description && (
                        <CardDescription>{campaign.description}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {campaign.targetAudience?.location?.city}, {campaign.targetAudience?.location?.state}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MessageSquare className="w-4 h-4" />
                      <span>
                        {campaign.scheduleConfig?.messageType === 'default' ? 'Mensagem Padrão' : 'Personalizada'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>
                        {campaign.scheduleConfig?.minIntervalMinutes || 10}-{campaign.scheduleConfig?.maxIntervalMinutes || 20} min
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <TrendingUp className="w-4 h-4" />
                      <span>{campaign.totalLeads} leads</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Progresso</span>
                      <span className="font-semibold text-gray-900">
                        {campaign.sentMessages} / {campaign.totalLeads}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${
                            campaign.totalLeads > 0
                              ? (campaign.sentMessages / campaign.totalLeads) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {campaign.sentMessages}
                      </p>
                      <p className="text-xs text-gray-600">Enviadas</p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">
                        {campaign.totalLeads - campaign.sentMessages - campaign.failedMessages}
                      </p>
                      <p className="text-xs text-gray-600">Pendentes</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">
                        {campaign.failedMessages}
                      </p>
                      <p className="text-xs text-gray-600">Falhas</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {campaign.status === 'draft' && (
                      <CampaignLauncher
                        campaignId={campaign.id}
                        onComplete={loadCampaigns}
                      />
                    )}
                    {campaign.status === 'active' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Pause className="w-4 h-4" />}
                        onClick={async () => {
                          try {
                            const result = await DispatchApiService.stopCampaign(campaign.id);
                            if (result.success) {
                              toast.success('Campanha pausada');
                            } else {
                              toast.error(result.message);
                            }
                          } catch {
                            // Fallback para o serviço local se o backend não estiver disponível
                            await CampaignDispatchService.pauseCampaign(campaign.id);
                            toast.success('Campanha pausada');
                          }
                          loadCampaigns();
                        }}
                      >
                        Pausar
                      </Button>
                    )}
                    {campaign.status === 'paused' && (
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Play className="w-4 h-4" />}
                        onClick={async () => {
                          if (!user) return;
                          try {
                            const result = await DispatchApiService.resumeCampaign(campaign.id);
                            if (result.success) {
                              toast.success(result.message);
                            } else {
                              toast.error(result.message);
                            }
                          } catch {
                            // Fallback para o serviço local
                            const result = await CampaignDispatchService.resumeCampaign(campaign.id, user.id);
                            if (result.success) {
                              toast.success(result.message);
                            } else {
                              toast.error(result.message);
                            }
                          }
                          loadCampaigns();
                        }}
                      >
                        Retomar
                      </Button>
                    )}
                    {(campaign.status === 'active' || campaign.status === 'paused') && (
                      <Button
                        variant="danger"
                        size="sm"
                        leftIcon={<StopCircle className="w-4 h-4" />}
                        onClick={async () => {
                          try {
                            await DispatchApiService.stopCampaign(campaign.id);
                            await CampaignService.updateCampaignStatus(campaign.id, 'cancelled');
                            toast.success('Campanha cancelada');
                          } catch {
                            await CampaignDispatchService.cancelCampaign(campaign.id);
                            toast.success('Campanha cancelada');
                          }
                          loadCampaigns();
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                    
                    {/* Botões sempre visíveis */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      leftIcon={<Eye className="w-4 h-4" />}
                      onClick={() => setSelectedCampaign(campaign)}
                    >
                      Ver Detalhes
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      leftIcon={<Copy className="w-4 h-4" />}
                      onClick={() => handleDuplicateCampaign(campaign.id)}
                      title="Duplicar campanha"
                    >
                      Duplicar
                    </Button>
                    
                    {/* Só permite deletar se não estiver ativa */}
                    {campaign.status !== 'active' && (
                      <Button 
                        variant="danger" 
                        size="sm"
                        leftIcon={<Trash2 className="w-4 h-4" />}
                        onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}
                        title="Deletar campanha"
                      >
                        Deletar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <CreateCampaignModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadCampaigns}
        />
      )}

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <CampaignDetailsModal
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
        />
      )}
    </div>
  );
}
