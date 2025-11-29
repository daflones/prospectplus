import axios from 'axios';

// Usa URL relativa - o Vite proxy redireciona para o backend em dev
// Em produção, o mesmo servidor serve frontend e API
const api = axios.create({
  baseURL: '',
  timeout: 30000,
});

export interface WorkerStatus {
  isRunning: boolean;
  activeCampaigns: number;
  campaignIds: string[];
}

export interface CampaignResult {
  success: boolean;
  message: string;
}

export class CampaignApiService {
  /**
   * Obtém o status do Campaign Worker
   */
  static async getStatus(): Promise<WorkerStatus> {
    try {
      const response = await api.get('/api/campaign/status');
      return response.data;
    } catch (error) {
      console.error('Erro ao obter status do worker:', error);
      throw error;
    }
  }

  /**
   * Inicia uma campanha completa (busca + validação + disparo)
   * Tudo roda no backend, mesmo se o usuário fechar a aba
   */
  static async launchCampaign(campaignId: string): Promise<CampaignResult> {
    try {
      const response = await api.post(`/api/campaign/launch/${campaignId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao iniciar campanha:', error);
      throw error;
    }
  }

  /**
   * Para uma campanha
   */
  static async stopCampaign(campaignId: string): Promise<CampaignResult> {
    try {
      const response = await api.post(`/api/campaign/stop/${campaignId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao parar campanha:', error);
      throw error;
    }
  }

  /**
   * Retoma uma campanha pausada
   */
  static async resumeCampaign(campaignId: string): Promise<CampaignResult> {
    try {
      const response = await api.post(`/api/campaign/resume/${campaignId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao retomar campanha:', error);
      throw error;
    }
  }
}

// Alias para compatibilidade
export const DispatchApiService = CampaignApiService;

export default CampaignApiService;
