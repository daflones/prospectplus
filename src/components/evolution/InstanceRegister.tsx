import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { evolutionService } from '../../services/evolutionService';
import type { EvolutionInstance, CreateInstanceRequest } from '../../types';
import toast from 'react-hot-toast';
import { 
  QrCode, 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  Loader2,
  RefreshCw,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';

interface InstanceRegisterProps {
  userName: string;
  onSuccess?: (instance: EvolutionInstance) => void;
  onCancel?: () => void;
}

export default function InstanceRegister({ userName, onSuccess, onCancel }: InstanceRegisterProps) {
  const { addInstance, getInstanceByUserId } = useStore();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'creating' | 'connecting' | 'connected' | 'error'>('idle');
  const [instance, setInstance] = useState<EvolutionInstance | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Verificar se usuário já tem instância
    const existingInstance = getInstanceByUserId(userName);
    if (existingInstance) {
      setInstance(existingInstance);
      setConnectionStatus('connected');
    }
  }, [userName, getInstanceByUserId]);

  const handleCreateInstance = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Por favor, informe seu número de WhatsApp');
      return;
    }

    // Validar formato do número (DDI + DDD + número)
    const phoneRegex = /^\d{10,15}$/;
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    if (!phoneRegex.test(cleanPhone)) {
      toast.error('Número de telefone inválido. Use apenas números (ex: 5511999998888)');
      return;
    }

    setIsLoading(true);
    setError('');
    setConnectionStatus('creating');

    try {
      // Configurar API key (você pode obter isso das variáveis de ambiente ou configuração)
      const apiKey = import.meta.env.VITE_EVOLUTION_API_KEY || '';
      evolutionService.setApiKey(apiKey);

      // Criar instância
      const instanceData: CreateInstanceRequest = {
        instanceName: userName.toLowerCase().replace(/\s+/g, '_'),
        qrcode: true,
        number: cleanPhone,
        integration: 'WHATSAPP-BAILEYS',
        webhook: `${window.location.origin}/webhook/evolution`,
        webhook_by_events: true,
        events: ['APPLICATION_STARTUP', 'QRCODE_UPDATED', 'CONNECTION_UPDATE'],
        reject_call: true,
        msg_call: 'Desculpe, não consigo receber chamadas no momento. Por favor, envie uma mensagem.',
        groups_ignore: false,
        always_online: true,
        read_messages: true,
        read_status: true,
      };

      const response = await evolutionService.createInstance(instanceData);
      
      // Salvar instância localmente
      const newInstance: EvolutionInstance = {
        id: response.instance.instanceId,
        userId: userName, // Usando userName como userId temporariamente
        instanceName: response.instance.instanceName,
        instanceId: response.instance.instanceId,
        userName,
        phoneNumber: cleanPhone,
        status: 'created',
        token: instanceData.token || '',
        apikey: response.hash.apikey,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      addInstance(newInstance);
      setInstance(newInstance);

      // Gerar QR Code
      await generateQRCode(response.instance.instanceName);

    } catch (err: any) {
      console.error('Erro ao criar instância:', err);
      setError(err.response?.data?.message || 'Erro ao criar instância');
      setConnectionStatus('error');
      toast.error('Erro ao criar instância');
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRCode = async (instanceName: string) => {
    setIsLoading(true);
    setConnectionStatus('connecting');

    try {
      const connectResponse = await evolutionService.connectInstance(instanceName, phoneNumber);
      
      if (connectResponse.code) {
        setQrCode(connectResponse.code);
        setPairingCode(connectResponse.pairingCode);
        
        // Iniciar verificação de status
        startConnectionMonitoring(instanceName);
      }
    } catch (err: any) {
      console.error('Erro ao gerar QR Code:', err);
      setError(err.response?.data?.message || 'Erro ao gerar QR Code');
      setConnectionStatus('error');
      toast.error('Erro ao gerar QR Code');
    } finally {
      setIsLoading(false);
    }
  };

  const startConnectionMonitoring = (instanceName: string) => {
    const checkConnection = async () => {
      try {
        const state = await evolutionService.getConnectionState(instanceName);
        
        if (state.state === 'open') {
          setConnectionStatus('connected');
          if (instance) {
            const updatedInstance = {
              ...instance,
              status: 'connected' as const,
              connectedAt: new Date(),
              updatedAt: new Date(),
            };
            addInstance(updatedInstance);
            setInstance(updatedInstance);
          }
          toast.success('WhatsApp conectado com sucesso!');
          onSuccess?.(instance!);
          return;
        }

        if (state.state === 'close') {
          setConnectionStatus('error');
          toast.error('Falha na conexão. Tente novamente.');
          return;
        }

        // Continuar verificando
        setTimeout(checkConnection, 3000);
      } catch (err) {
        console.error('Erro ao verificar status:', err);
        setTimeout(checkConnection, 3000);
      }
    };

    checkConnection();
  };

  const handleRestart = async () => {
    if (!instance) return;

    setIsLoading(true);
    try {
      await evolutionService.restartInstance(instance.instanceName);
      setQrCode('');
      setPairingCode('');
      setConnectionStatus('connecting');
      await generateQRCode(instance.instanceName);
    } catch (err: any) {
      console.error('Erro ao reiniciar:', err);
      toast.error('Erro ao reiniciar instância');
    } finally {
      setIsLoading(false);
    }
  };

  const renderQRCode = () => {
    if (!qrCode) return null;

    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="bg-white p-4 rounded-lg shadow-lg">
          <img 
            src={`data:image/png;base64,${qrCode}`}
            alt="QR Code WhatsApp"
            className="w-64 h-64"
          />
        </div>
        
        {pairingCode && (
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-2">Código de pareamento:</p>
            <p className="text-2xl font-mono font-bold text-primary-600">{pairingCode}</p>
            <p className="text-xs text-slate-500 mt-1">
              Abra o WhatsApp &gt; Dispositivos conectados &gt; Conectar dispositivo
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderStatus = () => {
    switch (connectionStatus) {
      case 'creating':
        return (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            <span className="ml-2 text-slate-600">Criando instância...</span>
          </div>
        );

      case 'connecting':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-orange-500 animate-pulse" />
              <span className="ml-2 text-slate-600">Aguardando leitura do QR Code...</span>
            </div>
            {renderQRCode()}
          </div>
        );

      case 'connected':
        return (
          <div className="flex items-center justify-center py-8">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <span className="ml-2 text-slate-600">WhatsApp conectado com sucesso!</span>
          </div>
        );

      case 'error':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-500" />
              <span className="ml-2 text-slate-600">Erro na conexão</span>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <div className="flex justify-center">
              <button
                onClick={handleRestart}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (instance && connectionStatus === 'connected') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Instância WhatsApp</h3>
            <Settings className="w-5 h-5 text-slate-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <span className="ml-2 text-slate-600">WhatsApp conectado!</span>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <strong>Usuário:</strong> {instance.userName}<br />
                <strong>Número:</strong> {instance.phoneNumber}<br />
                <strong>Status:</strong> Conectado<br />
                <strong>Conectado em:</strong> {instance.connectedAt?.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-slate-900">
          Conectar WhatsApp - {userName}
        </h3>
        <p className="text-sm text-slate-500">
          Configure sua instância do WhatsApp para envio de mensagens
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {connectionStatus === 'idle' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Seu número de WhatsApp
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="5511999998888"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={isLoading}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Apenas números, com DDI e DDD (ex: 5511999998888)
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCreateInstance}
                  disabled={isLoading || !phoneNumber.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <QrCode className="w-4 h-4" />
                  )}
                  Gerar QR Code
                </button>
                
                {onCancel && (
                  <button
                    onClick={onCancel}
                    disabled={isLoading}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          )}

          {renderStatus()}
        </div>
      </CardContent>
    </Card>
  );
}

