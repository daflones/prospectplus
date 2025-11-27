import { useState, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { CampaignService } from '../../services/campaignService';
import { CampaignDispatchService } from '../../services/campaignDispatchService';
import { PlacesService } from '../../services/placesService';
import { evolutionService } from '../../services/evolutionService';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import { Play, CheckCircle, Loader, Send } from 'lucide-react';

interface CampaignLauncherProps {
  campaignId: string;
  onComplete: () => void;
}

export default function CampaignLauncher({ campaignId, onComplete }: CampaignLauncherProps) {
  const { user } = useAuthStore();
  const [isLaunching, setIsLaunching] = useState(false);
  const [currentStep, setCurrentStep] = useState<'idle' | 'searching' | 'validating' | 'dispatching'>('idle');
  const [progress, setProgress] = useState({
    total: 0,
    current: 0,
    message: '',
  });
  const [foundPlaces, setFoundPlaces] = useState<Array<{
    name: string;
    phone?: string;
    hasPhone: boolean;
  }>>([]);

  // Callback estável para adicionar lugares encontrados
  const addFoundPlace = useCallback((place: any) => {
    setFoundPlaces(prev => [...prev, {
      name: place.name,
      phone: place.phoneNumber,
      hasPhone: !!place.phoneNumber,
    }]);
  }, []);

  const handleLaunchCampaign = async () => {
    if (!user || isLaunching) return; // Evita múltiplas execuções

    setIsLaunching(true);
    setCurrentStep('searching');
    setFoundPlaces([]); // Limpa lista anterior

    try {
      // 1. Busca a campanha
      const campaign = await CampaignService.getCampaign(campaignId);
      if (!campaign) {
        toast.error('Campanha não encontrada');
        return;
      }

      // 2. Verifica se tem instância conectada
      setProgress({ total: 4, current: 1, message: 'Verificando WhatsApp...' });
      const instanceCheck = await CampaignDispatchService.checkUserInstance(user.id);
      
      if (!instanceCheck.connected) {
        toast.error('WhatsApp não conectado. Conecte sua instância primeiro.');
        setIsLaunching(false);
        setCurrentStep('idle');
        return;
      }

      const instanceName = instanceCheck.instanceName!;
      toast.success('WhatsApp conectado!');

      // 3. Busca estabelecimentos
      setCurrentStep('searching');
      setProgress({ total: 4, current: 2, message: 'Buscando estabelecimentos...' });
      
      const searchQuery = campaign.targetAudience?.searchQuery || '';
      const city = campaign.targetAudience?.location?.city || '';
      const state = campaign.targetAudience?.location?.state || '';
      const country = campaign.targetAudience?.location?.country || 'Brasil';

      const places = await PlacesService.searchPlaces(
        searchQuery, 
        city, 
        state, 
        country,
        20, // minResults
        3,  // maxPages
        addFoundPlace // Usa o callback estável definido fora
      );
      
      if (places.length === 0) {
        toast.error('Nenhum estabelecimento encontrado');
        setIsLaunching(false);
        setCurrentStep('idle');
        return;
      }

      toast.success(`${places.length} estabelecimentos encontrados!`);

      // 4. Valida números de WhatsApp E salva apenas os válidos
      setCurrentStep('validating');
      const placesWithPhone = places.filter(p => p.phoneNumber && PlacesService.isValidPhoneNumber(p.phoneNumber));
      
      setProgress({ 
        total: placesWithPhone.length, 
        current: 0, 
        message: 'Validando números de WhatsApp...' 
      });

      const validLeads = [];
      for (let i = 0; i < placesWithPhone.length; i++) {
        const place = placesWithPhone[i];
        const normalizedPhone = PlacesService.normalizePhoneNumber(place.phoneNumber!);
        
        setProgress({ 
          total: placesWithPhone.length, 
          current: i + 1, 
          message: `Validando ${place.name}...` 
        });

        try {
          // Valida WhatsApp e pega o remoteJid
          const whatsappCheck = await evolutionService.checkWhatsAppNumber(
            instanceName,
            normalizedPhone
          );

          // APENAS salva no banco se tiver WhatsApp válido
          if (whatsappCheck.exists) {
            // Salva como campaign lead
            const campaignLead = await CampaignService.addCampaignLead({
              campaignId: campaign.id,
              userId: user.id,
              businessName: place.name,
              businessType: place.businessType,
              phoneNumber: normalizedPhone,
              address: place.address,
              city: place.city,
              state: place.state,
              country: place.country,
              latitude: place.latitude,
              longitude: place.longitude,
              googlePlaceId: place.placeId,
            });
            
            // Marca como WhatsApp válido E salva o remoteJid
            await CampaignService.updateLeadWhatsAppValidation(
              campaignLead.id, 
              true, 
              whatsappCheck.jid
            );
            
            // TAMBÉM salva na tabela leads (CRM)
            try {
              await CampaignService.convertCampaignLeadToLead(
                campaignLead.id,
                user.id,
                place.name,
                normalizedPhone,
                whatsappCheck.jid,
                place.address,
                place.city,
                place.state
              );
            } catch (error) {
              console.error('Erro ao salvar lead no CRM:', error);
            }
            
            validLeads.push(campaignLead);
            
            console.log(`✅ ${validLeads.length}. ${place.name} - WhatsApp válido (${whatsappCheck.jid})`);
          } else {
            console.log(`❌ ${place.name} - Sem WhatsApp`);
          }

          // Delay para não sobrecarregar a API
          await new Promise(resolve => setTimeout(resolve, 800));
        } catch (error) {
          console.error(`Erro ao validar ${place.name}:`, error);
        }
      }

      if (validLeads.length === 0) {
        toast.error('Nenhum número válido de WhatsApp encontrado');
        setIsLaunching(false);
        setCurrentStep('idle');
        return;
      }

      toast.success(`${validLeads.length} números válidos de WhatsApp!`);

      // 6. Atualiza estatísticas da campanha
      await CampaignService.updateCampaignStats(campaignId);

      // 7. Inicia disparo automático
      setCurrentStep('dispatching');
      setProgress({ 
        total: 4, 
        current: 4, 
        message: 'Iniciando disparos automáticos...' 
      });

      const result = await CampaignDispatchService.startCampaignDispatch(campaignId, user.id);

      if (result.success) {
        toast.success(result.message);
        onComplete();
      } else {
        toast.error(result.message);
      }

    } catch (error: any) {
      console.error('Erro ao iniciar campanha:', error);
      toast.error(error.message || 'Erro ao iniciar campanha');
    } finally {
      setIsLaunching(false);
      setCurrentStep('idle');
    }
  };

  return (
    <div>
      <Button
        variant="primary"
        size="sm"
        leftIcon={isLaunching ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        onClick={handleLaunchCampaign}
        disabled={isLaunching}
      >
        {isLaunching ? 'Iniciando...' : 'Iniciar Campanha'}
      </Button>

      {/* Progress Modal */}
      {isLaunching && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Iniciando Campanha
            </h3>

            {/* Steps */}
            <div className="space-y-4 mb-6">
              <div className={`flex items-center gap-3 ${currentStep === 'searching' ? 'text-purple-600' : currentStep === 'idle' ? 'text-gray-400' : 'text-green-600'}`}>
                {currentStep === 'searching' ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : currentStep === 'idle' ? (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                <span className="font-medium">Buscando estabelecimentos</span>
              </div>

              <div className={`flex items-center gap-3 ${currentStep === 'validating' ? 'text-purple-600' : ['idle', 'searching'].includes(currentStep) ? 'text-gray-400' : 'text-green-600'}`}>
                {currentStep === 'validating' ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : ['idle', 'searching'].includes(currentStep) ? (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                <span className="font-medium">Validando números</span>
              </div>

              <div className={`flex items-center gap-3 ${currentStep === 'dispatching' ? 'text-purple-600' : currentStep === 'idle' || currentStep === 'searching' || currentStep === 'validating' ? 'text-gray-400' : 'text-green-600'}`}>
                {currentStep === 'dispatching' ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : currentStep === 'idle' || currentStep === 'searching' || currentStep === 'validating' ? (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                <span className="font-medium">Iniciando disparos</span>
              </div>
            </div>

            {/* Progress Bar */}
            {progress.total > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">{progress.message}</span>
                  <span className="font-semibold text-gray-900">
                    {progress.current}/{progress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${(progress.current / progress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <p className="text-sm text-gray-500 text-center">
              Aguarde enquanto processamos sua campanha...
            </p>

            {/* Lista de estabelecimentos encontrados */}
            {foundPlaces.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Estabelecimentos Encontrados ({foundPlaces.length})
                </h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {foundPlaces.map((place, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {place.name}
                        </p>
                        {place.phone && (
                          <p className="text-xs text-gray-500">{place.phone}</p>
                        )}
                      </div>
                      <div className="ml-2">
                        {place.hasPhone ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <span className="text-xs text-gray-400">Sem tel.</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
