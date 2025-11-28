import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { CampaignService, type CampaignMediaFile } from '../../services/campaignService';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import toast from 'react-hot-toast';
import { X, Search, MapPin, MessageSquare, Clock, Sparkles, FileUp, Trash2, Image, Video, FileText } from 'lucide-react';

// Tipos de arquivo permitidos
const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/3gpp', 'video/quicktime'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'],
};

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB (limite do WhatsApp)

// Determina o tipo de mídia baseado no MIME type
const getMediaType = (mimeType: string): 'image' | 'video' | 'document' => {
  if (ALLOWED_FILE_TYPES.image.includes(mimeType)) return 'image';
  if (ALLOWED_FILE_TYPES.video.includes(mimeType)) return 'video';
  return 'document';
};

// Verifica se o tipo de arquivo é permitido
const isAllowedFileType = (mimeType: string): boolean => {
  return [...ALLOWED_FILE_TYPES.image, ...ALLOWED_FILE_TYPES.video, ...ALLOWED_FILE_TYPES.document].includes(mimeType);
};

interface CreateCampaignModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_MESSAGE = "Olá! Tudo bem? 😊\n\nEstou entrando em contato para apresentar uma oportunidade interessante para o seu negócio.\n\nPodemos conversar?";

export default function CreateCampaignModal({ onClose, onSuccess }: CreateCampaignModalProps) {
  const { user } = useAuthStore();
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState(1);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    searchQuery: '',
    locationCity: '',
    locationState: '',
    locationCountry: 'Brasil',
    messageType: 'default' as 'default' | 'custom',
    messageContent: DEFAULT_MESSAGE,
    mediaFiles: [] as CampaignMediaFile[],
    minIntervalMinutes: 10,
    maxIntervalMinutes: 20,
  });

  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Converte arquivo para base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Adiciona arquivo (imagem, vídeo ou documento)
  const handleAddFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingFile(true);
    try {
      const newFiles: CampaignMediaFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Valida tipo de arquivo
        if (!isAllowedFileType(file.type)) {
          toast.error(`${file.name}: tipo de arquivo não suportado`);
          continue;
        }
        
        // Valida tamanho (máx 16MB)
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} é muito grande (máx 16MB)`);
          continue;
        }
        
        const base64 = await fileToBase64(file);
        const mediaType = getMediaType(file.type);
        
        newFiles.push({
          url: base64,
          type: mediaType,
          mimeType: file.type,
          fileName: file.name,
          size: file.size,
        });
      }
      
      setFormData(prev => ({
        ...prev,
        mediaFiles: [...prev.mediaFiles, ...newFiles]
      }));
      
      if (newFiles.length > 0) {
        toast.success(`${newFiles.length} arquivo(s) adicionado(s)`);
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar arquivo');
    } finally {
      setIsUploadingFile(false);
      e.target.value = '';
    }
  };

  // Remove arquivo
  const handleRemoveFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      mediaFiles: prev.mediaFiles.filter((_, i) => i !== index)
    }));
    toast.success('Arquivo removido');
  };

  // Ícone do tipo de arquivo
  const getFileIcon = (type: 'image' | 'video' | 'document') => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
    }
  };

  // Formata tamanho do arquivo
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleCreateCampaign = async () => {
    if (!user) return;

    // Validações
    if (!formData.name.trim()) {
      toast.error('Digite o nome da campanha');
      return;
    }

    if (!formData.searchQuery.trim()) {
      toast.error('Digite o tipo de estabelecimento');
      return;
    }

    if (!formData.locationCity.trim() || !formData.locationState.trim()) {
      toast.error('Digite a localização');
      return;
    }

    if (!formData.messageContent.trim()) {
      toast.error('Digite a mensagem');
      return;
    }

    setIsCreating(true);
    try {
      await CampaignService.createCampaign({
        userId: user.id,
        name: formData.name,
        description: formData.description,
        searchQuery: formData.searchQuery,
        locationCity: formData.locationCity,
        locationState: formData.locationState,
        locationCountry: formData.locationCountry,
        messageType: formData.messageType,
        messageContent: formData.messageContent,
        mediaFiles: formData.mediaFiles,
        minIntervalMinutes: formData.minIntervalMinutes,
        maxIntervalMinutes: formData.maxIntervalMinutes,
      });

      toast.success('Campanha criada com sucesso!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      toast.error('Erro ao criar campanha');
    } finally {
      setIsCreating(false);
    }
  };

  const canProceedToStep2 = formData.name.trim() && formData.searchQuery.trim() && 
                            formData.locationCity.trim() && formData.locationState.trim();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Nova Campanha</h2>
            <p className="text-sm text-gray-600 mt-1">
              {step === 1 ? 'Configure os filtros de busca' : 'Personalize a mensagem'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                step >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <span className={`text-sm font-medium ${step >= 1 ? 'text-purple-600' : 'text-gray-600'}`}>
                Configuração
              </span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                step >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <span className={`text-sm font-medium ${step >= 2 ? 'text-purple-600' : 'text-gray-600'}`}>
                Mensagem
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 ? (
            <div className="space-y-6">
              {/* Nome da Campanha */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nome da Campanha *
                </label>
                <Input
                  placeholder="Ex: Prospecção Padarias - São Paulo"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descrição (opcional)
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  rows={3}
                  placeholder="Descreva o objetivo desta campanha..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>

              {/* Tipo de Estabelecimento */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Search className="w-4 h-4 inline mr-1" />
                  Tipo de Estabelecimento *
                </label>
                <Input
                  placeholder="Ex: Padarias, Restaurantes, Lojas de Roupas..."
                  value={formData.searchQuery}
                  onChange={(e) => handleInputChange('searchQuery', e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Digite o tipo de negócio que deseja prospectar
                </p>
              </div>

              {/* Localização */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Cidade *
                  </label>
                  <Input
                    placeholder="Ex: São Paulo"
                    value={formData.locationCity}
                    onChange={(e) => handleInputChange('locationCity', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Estado *
                  </label>
                  <Input
                    placeholder="Ex: SP"
                    value={formData.locationState}
                    onChange={(e) => handleInputChange('locationState', e.target.value)}
                  />
                </div>
              </div>

              {/* Intervalo de Envio */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Intervalo entre Mensagens
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Mínimo (minutos)</label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.minIntervalMinutes}
                      onChange={(e) => handleInputChange('minIntervalMinutes', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Máximo (minutos)</label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.maxIntervalMinutes}
                      onChange={(e) => handleInputChange('maxIntervalMinutes', parseInt(e.target.value))}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  As mensagens serão enviadas em intervalos aleatórios entre {formData.minIntervalMinutes} e {formData.maxIntervalMinutes} minutos
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tipo de Mensagem */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  Tipo de Mensagem
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange('messageType', 'default');
                      handleInputChange('messageContent', DEFAULT_MESSAGE);
                    }}
                    className={`p-4 border-2 rounded-xl transition-all ${
                      formData.messageType === 'default'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center mb-2">
                      <Sparkles className={`w-6 h-6 ${
                        formData.messageType === 'default' ? 'text-purple-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="text-sm font-semibold text-gray-900">Mensagem Padrão</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Mensagem profissional pré-definida
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInputChange('messageType', 'custom')}
                    className={`p-4 border-2 rounded-xl transition-all ${
                      formData.messageType === 'custom'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center mb-2">
                      <MessageSquare className={`w-6 h-6 ${
                        formData.messageType === 'custom' ? 'text-purple-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="text-sm font-semibold text-gray-900">Personalizada</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Escreva sua própria mensagem
                    </div>
                  </button>
                </div>
              </div>

              {/* Conteúdo da Mensagem */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Conteúdo da Mensagem *
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none font-mono text-sm"
                  rows={8}
                  placeholder="Digite sua mensagem..."
                  value={formData.messageContent}
                  onChange={(e) => handleInputChange('messageContent', e.target.value)}
                  disabled={formData.messageType === 'default'}
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    {formData.messageContent.length} caracteres
                  </p>
                  {formData.messageType === 'default' && (
                    <Badge variant="info">Mensagem Padrão</Badge>
                  )}
                </div>
              </div>

              {/* Upload de Arquivos */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FileUp className="w-4 h-4 inline mr-1" />
                  Arquivos (opcional)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Imagens, vídeos e documentos serão enviados após o texto, um por vez. (máx 16MB cada)
                </p>
                
                {/* Lista de arquivos */}
                <div className="space-y-2 mb-3">
                  {formData.mediaFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200 group">
                      <div className={`p-2 rounded-lg ${
                        file.type === 'image' ? 'bg-blue-100 text-blue-600' :
                        file.type === 'video' ? 'bg-purple-100 text-purple-600' :
                        'bg-orange-100 text-orange-600'
                      }`}>
                        {getFileIcon(file.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {file.type === 'image' ? 'Imagem' : file.type === 'video' ? 'Vídeo' : 'Documento'} • {formatFileSize(file.size || 0)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* Botão de adicionar */}
                <label className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all ${isUploadingFile ? 'opacity-50 cursor-wait' : ''}`}>
                  <input
                    type="file"
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    multiple
                    onChange={handleAddFile}
                    disabled={isUploadingFile}
                    className="hidden"
                  />
                  {isUploadingFile ? (
                    <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <FileUp className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-600">Clique para adicionar arquivos</span>
                    </>
                  )}
                </label>
                
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Image className="w-3 h-3" /> JPG, PNG, GIF, WebP</span>
                  <span className="flex items-center gap-1"><Video className="w-3 h-3" /> MP4, 3GP, MOV</span>
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> PDF, DOC, XLS, TXT</span>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-gray-700">Preview da Mensagem</span>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm space-y-3">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {formData.messageContent}
                  </p>
                  {formData.mediaFiles.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-2">+ {formData.mediaFiles.length} arquivo(s) anexado(s)</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.mediaFiles.map((file, index) => (
                          <div key={index} className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                            file.type === 'image' ? 'bg-blue-100 text-blue-700' :
                            file.type === 'video' ? 'bg-purple-100 text-purple-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {getFileIcon(file.type)}
                            <span className="max-w-[100px] truncate">{file.fileName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between rounded-b-2xl">
          <div>
            {step === 2 && (
              <Button
                variant="outline"
                onClick={() => setStep(1)}
              >
                Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            {step === 1 ? (
              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedToStep2}
              >
                Próximo
              </Button>
            ) : (
              <Button
                onClick={handleCreateCampaign}
                isLoading={isCreating}
              >
                Criar Campanha
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
