import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { CampaignApiService } from '../../services/dispatchApiService';
import { CampaignDispatchService } from '../../services/campaignDispatchService';
import { InstanceService } from '../../services/instanceService';
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

    try {
      // Verifica se tem instância conectada
      const instance = await InstanceService.getUserInstance(user.id);
      
      if (!instance || instance.status !== 'connected') {
        toast.error('WhatsApp não conectado. Conecte sua instância primeiro.');
        setIsLaunching(false);
        return;
      }

      // Tenta usar o backend primeiro (recomendado - continua mesmo com aba fechada)
      try {
        const result = await CampaignApiService.launchCampaign(campaignId);
        
        if (result.success) {
          toast.success('🚀 ' + result.message + '\n\nVocê pode fechar esta aba - a campanha continuará rodando no servidor!', {
            duration: 6000,
          });
          onComplete();
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
