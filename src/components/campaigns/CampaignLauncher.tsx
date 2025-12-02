import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { CampaignApiService } from '../../services/dispatchApiService';
import { CampaignDispatchService } from '../../services/campaignDispatchService';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import { Play, Loader } from 'lucide-react';

interface CampaignLauncherProps {
  campaignId: string;
  onComplete: () => void;
}

export default function CampaignLauncher({ campaignId, onComplete }: CampaignLauncherProps) {
  const { user } = useAuthStore();
  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunchCampaign = async () => {
    if (!user || isLaunching) return;

    setIsLaunching(true);
    console.log('🚀 Iniciando campanha:', campaignId);

    try {
      // Tenta usar o backend primeiro (recomendado - continua mesmo com aba fechada)
      // O backend verifica automaticamente se o WhatsApp está conectado
      try {
        console.log('📡 Chamando API: /api/campaign/launch/' + campaignId);
        const result = await CampaignApiService.launchCampaign(campaignId);
        console.log('📡 Resposta da API:', result);
        
        if (result.success) {
          toast.success('🚀 ' + result.message, {
            duration: 4000,
          });
          // Recarrega imediatamente e depois a cada segundo por 5 segundos
          onComplete();
          setTimeout(() => onComplete(), 1000);
          setTimeout(() => onComplete(), 2000);
          setTimeout(() => onComplete(), 3000);
          setTimeout(() => onComplete(), 5000);
        } else {
          toast.error(result.message);
        }
      } catch {
        // Fallback para processamento no frontend
        console.log('⚠️ Backend indisponível, usando processamento local');
        
        toast('Processando localmente... Mantenha a aba aberta.', {
          icon: '⚠️',
          duration: 4000,
        });

        const result = await CampaignDispatchService.startCampaignDispatch(campaignId, user.id);
        
        if (result.success) {
          toast.success(result.message);
          onComplete();
        } else {
          toast.error(result.message);
        }
      }

    } catch (error: any) {
      console.error('Erro ao iniciar campanha:', error);
      toast.error(error.message || 'Erro ao iniciar campanha');
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <Button
      variant="primary"
      size="sm"
      leftIcon={isLaunching ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
      onClick={handleLaunchCampaign}
      disabled={isLaunching}
    >
      {isLaunching ? 'Iniciando...' : 'Iniciar Campanha'}
    </Button>
  );
}
