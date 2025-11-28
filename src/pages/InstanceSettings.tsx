import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { evolutionService } from '../services/evolutionService';
import { InstanceService } from '../services/instanceService';
import { normalizeInstanceName } from '../lib/instanceHelpers';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import toast from 'react-hot-toast';
import {
  Smartphone,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Trash2,
  Plus,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface InstanceData {
  instanceName: string;
  instanceId: string;
  status: 'created' | 'connecting' | 'connected' | 'disconnected';
  qrCode?: string;
  pairingCode?: string;
}

export default function InstanceSettings() {
  const { user } = useAuthStore();
  const [instance, setInstance] = useState<InstanceData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  const instanceName = user?.name ? normalizeInstanceName(user.name) : '';
  const apiKey = import.meta.env.VITE_EVOLUTION_API_KEY || '';

  useEffect(() => {
    if (apiKey) {
      evolutionService.setApiKey(apiKey);
    }
  }, [apiKey]);

  // Carrega a instância do banco de dados ao abrir a página
  useEffect(() => {
    loadInstanceFromDatabase();
  }, [user]);

  // Removido: não precisa mais verificar separadamente
  // O loadInstanceFromDatabase já faz tudo

  const loadInstanceFromDatabase = async () => {
    if (!user) return;

    try {
      console.log('🔍 Buscando instâncias na Evolution API...');
      
      // Busca todas as instâncias na Evolution API
      const allInstances = await evolutionService.fetchInstances();
      console.log('📋 Instâncias encontradas:', allInstances);
      
      // Procura pela instância com o nome do usuário
      const userInstanceName = instanceName; // Nome normalizado do usuário
      const foundInstance = allInstances.find((item: any) => 
        item.name === userInstanceName || item.instance?.instanceName === userInstanceName
      );
      
      if (foundInstance) {
        // A resposta vem direto no objeto, não em foundInstance.instance
        const evolutionInstance = foundInstance;
        console.log('✅ Instância encontrada:', evolutionInstance);
        
        // Verifica se está com connectionStatus 'open'
        const isConnected = evolutionInstance.connectionStatus === 'open';
        
        const phoneNum = evolutionInstance.ownerJid?.replace('@s.whatsapp.net', '') || '';
        setPhoneNumber(phoneNum);
        setInstance({
          instanceName: evolutionInstance.name,
          instanceId: evolutionInstance.id,
          status: isConnected ? 'connected' : 'disconnected',
        });
        
        // Atualiza no banco de dados
        await InstanceService.saveInstance({
          userId: user.id,
          instanceName: evolutionInstance.name,
          instanceId: evolutionInstance.id,
          phoneNumber: phoneNum,
          status: isConnected ? 'connected' : 'disconnected',
        });
        
        if (isConnected) {
          console.log('✅ WhatsApp conectado!');
        } else {
          console.log('⚠️ WhatsApp desconectado');
        }
      } else {
        console.log('ℹ️ Nenhuma instância encontrada com o nome:', userInstanceName);
        
        // Busca no banco de dados como fallback
        const dbInstance = await InstanceService.getUserInstance(user.id);
        if (dbInstance) {
          console.log('📦 Instância encontrada no banco:', dbInstance);
          setPhoneNumber(dbInstance.phoneNumber);
          setInstance({
            instanceName: dbInstance.instanceName,
            instanceId: dbInstance.instanceId,
            status: 'disconnected', // Marca como desconectado se não está na Evolution API
          });
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar instância:', error);
      
      // Em caso de erro, tenta buscar do banco
      try {
        const dbInstance = await InstanceService.getUserInstance(user.id);
        if (dbInstance) {
          setPhoneNumber(dbInstance.phoneNumber);
          setInstance({
            instanceName: dbInstance.instanceName,
            instanceId: dbInstance.instanceId,
            status: dbInstance.status === 'connected' ? 'connected' : 'disconnected',
          });
        }
      } catch (dbError) {
        console.error('❌ Erro ao buscar do banco:', dbError);
      }
    }
  };

  // Polling para verificar status da conexão - APENAS quando está conectando
  useEffect(() => {
    if (instance?.status === 'connecting') {
      console.log('Iniciando polling para verificar conexão...');
      
      const interval = setInterval(async () => {
        await checkConnectionStatus();
      }, 1000); // Verifica a cada 1 segundo

      return () => {
        console.log('Parando polling');
        clearInterval(interval);
      };
    }
  }, [instance?.status]);


  const checkConnectionStatus = async () => {
    if (!instance || !user) return;

    try {
      // Busca a instância completa da Evolution API usando fetchInstances
      const instanceData = await evolutionService.fetchInstanceByName(instance.instanceName);
      
      if (!instanceData) {
        console.log('Instância ainda não encontrada na API');
        return;
      }
      
      console.log('📡 Dados da instância:', instanceData);
      
      // A Evolution API v2 retorna os dados diretamente, não em instanceData.instance
      const evolutionInstance = instanceData.instance || instanceData;
      console.log('📊 Status atual da instância:', evolutionInstance.connectionStatus || evolutionInstance.status);
      
      // Verifica connectionStatus (v2) ou status (v1)
      const isConnected = evolutionInstance.connectionStatus === 'open' || evolutionInstance.status === 'open';
      
      if (isConnected) {
        console.log('✅ WhatsApp CONECTADO! Status = open');
        console.log('💾 Salvando no banco de dados...');
        
        // Salva no banco de dados quando conectar
        await InstanceService.saveInstance({
          userId: user.id,
          instanceName: evolutionInstance.name || evolutionInstance.instanceName,
          instanceId: evolutionInstance.id || evolutionInstance.instanceId,
          phoneNumber: phoneNumber,
          status: 'connected',
        });

        console.log('🔄 Atualizando estado local para "connected"');
        setInstance({
          instanceName: evolutionInstance.name || evolutionInstance.instanceName,
          instanceId: evolutionInstance.id || evolutionInstance.instanceId,
          status: 'connected',
        });
        
        toast.success('WhatsApp conectado e salvo com sucesso!');
      } else if (evolutionInstance.connectionStatus === 'close' || evolutionInstance.status === 'close') {
        console.log('❌ Instância desconectada');
        setInstance(prev => prev ? { ...prev, status: 'disconnected' } : null);
        
        // Atualiza status no banco
        await InstanceService.updateInstanceStatus(instance.instanceName, 'disconnected');
      } else {
        console.log('⏳ Aguardando conexão... Status:', evolutionInstance.connectionStatus || evolutionInstance.status);
      }
    } catch (error) {
      console.error('❌ Erro ao verificar status:', error);
    }
  };

  const handleCreateInstance = async () => {
    if (!phoneNumber) {
      toast.error('Digite o número do WhatsApp');
      return;
    }

    setIsCreating(true);
    try {
      // 1. Deletar instância existente se houver (para evitar conflitos)
      try {
        console.log('🗑️ Verificando e deletando instância existente...');
        
        // Deleta da Evolution API
        await evolutionService.deleteInstance(instanceName);
        console.log('✅ Instância deletada da Evolution API');
        
        // Deleta do banco de dados
        if (user) {
          await InstanceService.deleteInstance(instanceName);
          console.log('✅ Instância deletada do banco de dados');
        }
      } catch (error) {
        console.log('ℹ️ Nenhuma instância anterior para deletar');
      }

      // 2. Criar nova instância
      const response = await evolutionService.createInstance({
        instanceName,
        qrcode: true,
        number: phoneNumber.replace(/\D/g, ''),
        integration: 'WHATSAPP-BAILEYS',
      });

      console.log('Instância criada:', response);

      // 3. Conectar e obter QR Code
      const connectResponse = await evolutionService.connectInstance(instanceName, phoneNumber);

      setInstance({
        instanceName,
        instanceId: response.instance.instanceId,
        status: 'connecting',
        qrCode: connectResponse.code,
        pairingCode: connectResponse.pairingCode,
      });

      toast.success('QR Code gerado! Escaneie com seu WhatsApp');
    } catch (error: any) {
      console.error('Erro ao criar instância:', error);
      toast.error(error.response?.data?.message || 'Erro ao criar instância');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRefreshQRCode = async () => {
    if (!instance) return;

    try {
      const connectResponse = await evolutionService.connectInstance(instance.instanceName, phoneNumber);
      
      setInstance(prev => prev ? {
        ...prev,
        qrCode: connectResponse.code,
        pairingCode: connectResponse.pairingCode,
      } : null);

      toast.success('QR Code atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar QR Code');
    }
  };

  const handleDeleteInstance = async () => {
    if (!instance) return;

    if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;

    try {
      // Deleta da Evolution API
      await evolutionService.deleteInstance(instance.instanceName);
      
      // Deleta do banco de dados
      await InstanceService.deleteInstance(instance.instanceName);
      
      setInstance(null);
      setPhoneNumber('');
      toast.success('Instância desconectada');
    } catch (error) {
      toast.error('Erro ao desconectar instância');
    }
  };

  const getStatusBadge = () => {
    if (!instance) return null;

    const badges = {
      created: <Badge variant="default">Criada</Badge>,
      connecting: <Badge variant="warning">Conectando...</Badge>,
      connected: <Badge variant="success">Conectado</Badge>,
      disconnected: <Badge variant="danger">Desconectado</Badge>,
    };

    return badges[instance.status];
  };

  const getStatusIcon = () => {
    if (!instance) return <WifiOff className="w-12 h-12 text-gray-300" />;

    const icons = {
      created: <Smartphone className="w-12 h-12 text-gray-400" />,
      connecting: <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />,
      connected: <CheckCircle className="w-12 h-12 text-green-500" />,
      disconnected: <XCircle className="w-12 h-12 text-red-500" />,
    };

    return icons[instance.status];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            WhatsApp Business
          </h1>
          <p className="text-gray-600">
            Conecte seu WhatsApp para enviar mensagens automaticamente
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status da Conexão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                {getStatusIcon()}
                <div className="mt-4">
                  {getStatusBadge()}
                </div>
                {instance && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Instância:</span> {instance.instanceName}
                    </p>
                    {instance.pairingCode && instance.status === 'connecting' && (
                      <div className="bg-purple-50 rounded-xl p-4 mt-4">
                        <p className="text-sm font-semibold text-purple-900 mb-2">
                          Código de Pareamento:
                        </p>
                        <p className="text-2xl font-bold text-purple-600 tracking-wider">
                          {instance.pairingCode}
                        </p>
                        <p className="text-xs text-purple-700 mt-2">
                          Use este código no WhatsApp em "Aparelhos conectados"
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {instance && instance.status === 'connected' && (
                <div className="space-y-3">
                  <Button
                    variant="secondary"
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                    onClick={checkConnectionStatus}
                    className="w-full"
                  >
                    Verificar Status
                  </Button>
                  <Button
                    variant="danger"
                    leftIcon={<Trash2 className="w-4 h-4" />}
                    onClick={handleDeleteInstance}
                    className="w-full"
                  >
                    Desconectar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* QR Code / Setup Card */}
          <Card>
            <CardHeader>
              <CardTitle>
                {instance?.status === 'connecting' ? 'QR Code' : 'Conectar WhatsApp'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!instance || instance.status === 'disconnected' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Número do WhatsApp
                    </label>
                    <input
                      type="tel"
                      placeholder="5511999999999"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Digite com código do país (ex: 5511999999999)
                    </p>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-blue-900 font-semibold mb-2">
                      Nome da Instância:
                    </p>
                    <p className="text-lg font-mono text-blue-700">
                      {instanceName || 'Configure seu perfil primeiro'}
                    </p>
                  </div>

                  <Button
                    leftIcon={<Plus className="w-5 h-5" />}
                    onClick={handleCreateInstance}
                    isLoading={isCreating}
                    disabled={!instanceName || !phoneNumber}
                    className="w-full"
                  >
                    {isCreating ? 'Criando...' : 'Criar Instância'}
                  </Button>
                </div>
              ) : instance.status === 'connecting' && instance.qrCode ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-4 flex items-center justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(instance.qrCode)}`}
                      alt="QR Code"
                      className="w-64 h-64"
                    />
                  </div>
                  
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-sm text-purple-900 text-center">
                      Escaneie o QR Code com o WhatsApp ou use o código de pareamento acima
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                    onClick={handleRefreshQRCode}
                    className="w-full"
                  >
                    Atualizar QR Code
                  </Button>

                  <Button
                    variant="danger"
                    leftIcon={<Trash2 className="w-4 h-4" />}
                    onClick={handleDeleteInstance}
                    className="w-full"
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Wifi className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-gray-900 mb-2">
                    WhatsApp Conectado!
                  </p>
                  <p className="text-gray-600">
                    Sua instância está pronta para enviar mensagens
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Como Conectar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Digite seu número</h4>
                  <p className="text-sm text-gray-600">
                    Informe o número do WhatsApp com código do país (ex: 5511999999999)
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Escaneie o QR Code</h4>
                  <p className="text-sm text-gray-600">
                    Abra o WhatsApp, vá em "Aparelhos conectados" e escaneie o QR Code
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Aguarde a conexão</h4>
                  <p className="text-sm text-gray-600">
                    O sistema verificará automaticamente quando a conexão for estabelecida
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
