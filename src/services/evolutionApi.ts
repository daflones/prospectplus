import axios, { type AxiosInstance } from 'axios';
import type { EvolutionAPIConfig } from '../types';

/**
 * Serviço para integração com Evolution API (WhatsApp)
 * Documentação: https://doc.evolution-api.com
 */
class EvolutionAPIService {
  private client: AxiosInstance | null = null;
  private config: EvolutionAPIConfig | null = null;

  /**
   * Inicializa o cliente da Evolution API
   */
  initialize(config: EvolutionAPIConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(config.token && { Authorization: `Bearer ${config.token}` }),
      },
      timeout: 30000,
    });
  }

  /**
   * Verifica se o serviço está configurado
   */
  private ensureInitialized() {
    if (!this.client || !this.config) {
      throw new Error('Evolution API não configurada. Configure em Configurações.');
    }
  }

  /**
   * Valida se um número tem WhatsApp
   */
  async validateWhatsApp(phoneNumber: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const response = await this.client!.post(
        `/message/validate/${this.config!.instanceName}`,
        {
          number: phoneNumber,
        }
      );

      return response.data?.exists || false;
    } catch (error) {
      console.error('Erro ao validar WhatsApp:', error);
      return false;
    }
  }

  /**
   * Envia uma mensagem de texto para um número
   */
  async sendTextMessage(phoneNumber: string, message: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const response = await this.client!.post(
        `/message/sendText/${this.config!.instanceName}`,
        {
          number: phoneNumber,
          text: message,
        }
      );

      return response.status === 200 || response.status === 201;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return false;
    }
  }

  /**
   * Envia mensagens em massa
   */
  async sendBulkMessages(
    messages: Array<{ phoneNumber: string; message: string }>
  ): Promise<{
    sent: number;
    failed: number;
    results: Array<{ phoneNumber: string; success: boolean; error?: string }>;
  }> {
    this.ensureInitialized();

    const results: Array<{
      phoneNumber: string;
      success: boolean;
      error?: string;
    }> = [];
    let sent = 0;
    let failed = 0;

    for (const { phoneNumber, message } of messages) {
      try {
        const success = await this.sendTextMessage(phoneNumber, message);
        if (success) {
          sent++;
          results.push({ phoneNumber, success: true });
        } else {
          failed++;
          results.push({
            phoneNumber,
            success: false,
            error: 'Falha no envio',
          });
        }

        // Delay entre mensagens para evitar bloqueio
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        failed++;
        results.push({
          phoneNumber,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    return { sent, failed, results };
  }

  /**
   * Testa a conexão com a API
   */
  async testConnection(): Promise<boolean> {
    this.ensureInitialized();

    try {
      const response = await this.client!.get(
        `/instance/connectionState/${this.config!.instanceName}`
      );
      return response.status === 200;
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      return false;
    }
  }

  /**
   * Obtém informações da instância
   */
  async getInstanceInfo() {
    this.ensureInitialized();

    try {
      const response = await this.client!.get(
        `/instance/fetchInstances/${this.config!.instanceName}`
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao obter informações da instância:', error);
      throw error;
    }
  }
}

export const evolutionApi = new EvolutionAPIService();
