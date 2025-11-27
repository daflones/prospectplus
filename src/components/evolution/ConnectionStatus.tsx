import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { evolutionService } from '../../services/evolutionService';
import type { EvolutionInstance, ConnectionStateResponse } from '../../types';
import {
  WifiOff,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Battery,
  BatteryLow,
} from 'lucide-react';

interface ConnectionStatusProps {
  instance: EvolutionInstance;
  showDetails?: boolean;
  onStatusChange?: (status: string) => void;
}

export default function ConnectionStatus({ 
  instance, 
  showDetails = false, 
  onStatusChange 
}: ConnectionStatusProps) {
  const { updateInstance } = useStore();
  const [connectionState, setConnectionState] = useState<ConnectionStateResponse | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkConnectionStatus = async () => {
    setIsChecking(true);
    try {
      const apiKey = import.meta.env.VITE_EVOLUTION_API_KEY || '';
      evolutionService.setApiKey(apiKey);
      
      const state = await evolutionService.getConnectionState(instance.instanceName);
      setConnectionState(state);
      setLastCheck(new Date());

      // Atualizar status da instância baseado no estado da conexão
      const newStatus = state.state === 'open' ? 'connected' : 
                       state.state === 'connecting' ? 'connecting' : 'disconnected';
      
      if (instance.status !== newStatus) {
        updateInstance(instance.id, {
          status: newStatus,
          updatedAt: new Date(),
        });
        onStatusChange?.(newStatus);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      setConnectionState(null);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Verificar status inicial
    checkConnectionStatus();

    // Configurar verificação periódica
    const interval = setInterval(() => {
      if (instance.status === 'connected' || instance.status === 'connecting') {
        checkConnectionStatus();
      }
    }, 30000); // Verificar a cada 30 segundos

    return () => clearInterval(interval);
  }, [instance.instanceName, instance.status]);

  const getStatusIcon = () => {
    switch (instance.status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'connecting':
        return <RefreshCw className="w-5 h-5 text-orange-500 animate-spin" />;
      case 'disconnected':
        return <WifiOff className="w-5 h-5 text-slate-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusText = () => {
    switch (instance.status) {
      case 'connected':
        return 'Conectado';
      case 'connecting':
        return 'Conectando...';
      case 'disconnected':
        return 'Desconectado';
      case 'error':
        return 'Erro';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusColor = () => {
    switch (instance.status) {
      case 'connected':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'connecting':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'disconnected':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getBatteryIcon = () => {
    if (!connectionState) return null;
    
    const battery = connectionState.battery;
    
    if (battery > 75) {
      return <Battery className="w-4 h-4 text-green-500" />;
    } else if (battery > 25) {
      return <Battery className="w-4 h-4 text-orange-500" />;
    } else {
      return <BatteryLow className="w-4 h-4 text-red-500" />;
    }
  };

  const getBatteryColor = () => {
    if (!connectionState) return '';
    
    const battery = connectionState.battery;
    
    if (battery > 75) return 'text-green-600';
    if (battery > 25) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {showDetails && connectionState && (
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            {getBatteryIcon()}
            <span className={getBatteryColor()}>
              {connectionState.battery}%
            </span>
            {connectionState.plugged && (
              <span className="text-green-500">⚡</span>
            )}
          </div>
          
          {lastCheck && (
            <span>
              Verificado: {lastCheck.toLocaleTimeString('pt-BR')}
            </span>
          )}
        </div>
      )}

      <button
        onClick={checkConnectionStatus}
        disabled={isChecking}
        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-50"
        title="Verificar status"
      >
        <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
