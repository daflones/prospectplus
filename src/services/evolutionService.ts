import axios from 'axios';
import type {
  CreateInstanceRequest,
  CreateInstanceResponse,
  ConnectInstanceResponse,
  ConnectionStateResponse
} from '../types';

const EVOLUTION_API_URL = import.meta.env.VITE_EVOLUTION_API_URL || 'https://your-evolution-server.com';

const api = axios.create({
  baseURL: EVOLUTION_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export class EvolutionService {
  private apiKey: string;

  constructor(apiKey: string = '') {
    this.apiKey = apiKey;
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'apikey': this.apiKey,
    };
  }

  async createInstance(data: CreateInstanceRequest): Promise<CreateInstanceResponse> {
    try {
      const response = await api.post('/instance/create', data, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error creating instance:', error);
      throw error;
    }
  }

  async connectInstance(instanceName: string, phoneNumber?: string): Promise<ConnectInstanceResponse> {
    try {
      const url = phoneNumber 
        ? `/instance/connect/${instanceName}?phone=${phoneNumber}`
        : `/instance/connect/${instanceName}`;
      
      const response = await api.get(url, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error connecting instance:', error);
      throw error;
    }
  }

  async getConnectionState(instanceName: string): Promise<ConnectionStateResponse> {
    try {
      const response = await api.get(`/instance/connectionState/${instanceName}`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error getting connection state:', error);
      throw error;
    }
  }

  async fetchInstances(): Promise<any[]> {
    try {
      const response = await api.get('/instance/fetchInstances', {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching instances:', error);
      throw error;
    }
  }

  async fetchInstanceByName(instanceName: string): Promise<any> {
    try {
      const response = await api.get(`/instance/fetchInstances?instanceName=${instanceName}`, {
        headers: this.getHeaders(),
      });
      
      // A API retorna um array, pegamos o primeiro item se existir
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching instance by name:', error);
      return null;
    }
  }

  async logoutInstance(instanceName: string): Promise<void> {
    try {
      await api.delete(`/instance/logout/${instanceName}`, {
        headers: this.getHeaders(),
      });
    } catch (error) {
      console.error('Error logging out instance:', error);
      throw error;
    }
  }

  async deleteInstance(instanceName: string): Promise<void> {
    try {
      await api.delete(`/instance/delete/${instanceName}`, {
        headers: this.getHeaders(),
      });
    } catch (error) {
      console.error('Error deleting instance:', error);
      throw error;
    }
  }

  async restartInstance(instanceName: string): Promise<void> {
    try {
      await api.put(`/instance/restart/${instanceName}`, {}, {
        headers: this.getHeaders(),
      });
    } catch (error) {
      console.error('Error restarting instance:', error);
      throw error;
    }
  }

  async getQRCodeImage(qrCode: string): Promise<string> {
    // Converte o QR Code base64 em uma URL de imagem
    return `data:image/png;base64,${qrCode}`;
  }

  async sendTextMessage(instanceName: string, phoneNumber: string, message: string): Promise<any> {
    try {
      const response = await api.post(`/message/sendText/${instanceName}`, {
        number: phoneNumber,
        text: message,
      }, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error sending text message:', error);
      throw error;
    }
  }

  /**
   * Envia mídia via Evolution API (imagem, vídeo ou documento)
   * @param instanceName Nome da instância
   * @param phoneNumber Número do destinatário
   * @param mediaUrl URL ou base64 do arquivo
   * @param mediaType Tipo de mídia: 'image' | 'video' | 'document'
   * @param mimeType MIME type do arquivo (ex: image/png, video/mp4, application/pdf)
   * @param fileName Nome do arquivo (obrigatório para documentos)
   * @param caption Legenda opcional
   */
  async sendMediaMessage(
    instanceName: string, 
    phoneNumber: string, 
    mediaUrl: string, 
    mediaType: 'image' | 'video' | 'document' = 'image',
    mimeType?: string,
    fileName?: string,
    caption?: string
  ): Promise<any> {
    try {
      const payload: any = {
        number: phoneNumber,
        mediatype: mediaType,
        media: mediaUrl,
        delay: 1200,
      };

      // Adiciona mimetype se fornecido
      if (mimeType) {
        payload.mimetype = mimeType;
      }

      // Adiciona fileName (obrigatório para documentos)
      if (fileName) {
        payload.fileName = fileName;
      }

      // Adiciona caption se fornecido
      if (caption) {
        payload.caption = caption;
      }

      const response = await api.post(`/message/sendMedia/${instanceName}`, payload, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error sending media message:', error);
      throw error;
    }
  }

  async checkWhatsAppNumber(instanceName: string, phoneNumber: string): Promise<{ exists: boolean; jid?: string }> {
    try {
      const response = await api.post(`/chat/whatsappNumbers/${instanceName}`, {
        numbers: [phoneNumber],
      }, {
        headers: this.getHeaders(),
      });
      
      // Retorna exists e jid se o número tem WhatsApp
      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        return {
          exists: result.exists || false,
          jid: result.jid || result.remoteJid || undefined,
        };
      }
      
      return { exists: false };
    } catch (error) {
      console.error('Error checking WhatsApp number:', error);
      return { exists: false };
    }
  }

  async waitForConnection(instanceName: string, maxAttempts: number = 30, interval: number = 2000): Promise<ConnectionStateResponse> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const state = await this.getConnectionState(instanceName);
        
        if (state.state === 'open') {
          return state;
        }
        
        if (state.state === 'close') {
          throw new Error('Connection failed');
        }
        
        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
      } catch (error) {
        if (attempts === maxAttempts - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
      }
    }
    
    throw new Error('Connection timeout');
  }
}

// Cria instância com API key do ambiente
const EVOLUTION_API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY || '';
export const evolutionService = new EvolutionService(EVOLUTION_API_KEY);
