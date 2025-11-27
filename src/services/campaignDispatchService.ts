import { evolutionService } from './evolutionService';
import { CampaignService, type CampaignLead } from './campaignService';
import { InstanceService } from './instanceService';

export class CampaignDispatchService {
  private static activeDispatches: Map<string, number> = new Map();

  /**
   * Verifica se o usuário tem uma instância conectada
   */
  static async checkUserInstance(userId: string): Promise<{ connected: boolean; instanceName?: string }> {
    try {
      console.log('🔍 Verificando instância do usuário no banco de dados...');
      
      // Busca instância do banco de dados
      const instance = await InstanceService.getUserInstance(userId);
      
      if (!instance) {
        console.log('❌ Nenhuma instância encontrada no banco');
        return { connected: false };
      }

      // Verifica se está conectada no banco
      const isConnected = instance.status === 'connected';
      
      if (!isConnected) {
        console.log('❌ Instância não está conectada:', instance.status);
        return { connected: false, instanceName: instance.instanceName };
      }

      console.log('✅ Instância conectada:', instance.instanceName);
      return { connected: true, instanceName: instance.instanceName };
    } catch (error) {
      console.error('❌ Erro ao verificar instância:', error);
      return { connected: false };
    }
  }

  /**
   * Valida números de WhatsApp de uma lista de leads
   */
  static async validateWhatsAppNumbers(
    instanceName: string,
    leads: CampaignLead[]
  ): Promise<void> {
    console.log(`🔍 Validando ${leads.length} números de WhatsApp...`);

    for (const lead of leads) {
      try {
        // Normaliza o número (remove caracteres especiais)
        const cleanNumber = lead.phoneNumber.replace(/\D/g, '');
        
        // Verifica se tem WhatsApp e pega o remoteJid
        const whatsappCheck = await evolutionService.checkWhatsAppNumber(instanceName, cleanNumber);
        
        // Atualiza no banco com remoteJid
        await CampaignService.updateLeadWhatsAppValidation(
          lead.id, 
          whatsappCheck.exists,
          whatsappCheck.jid
        );
        
        console.log(`${whatsappCheck.exists ? '✅' : '❌'} ${lead.businessName}: ${cleanNumber}`);
        
        // Delay entre verificações para não sobrecarregar
        await this.delay(1000);
      } catch (error) {
        console.error(`Erro ao validar ${lead.businessName}:`, error);
        await CampaignService.updateLeadWhatsAppValidation(lead.id, false);
      }
    }

    console.log('✅ Validação de números concluída');
  }

  /**
   * Inicia o disparo de uma campanha
   */
  static async startCampaignDispatch(
    campaignId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Verifica se já está rodando
      if (this.activeDispatches.has(campaignId)) {
        return { success: false, message: 'Campanha já está em execução' };
      }

      // 2. Verifica instância do usuário
      const instanceCheck = await this.checkUserInstance(userId);
      if (!instanceCheck.connected) {
        return { 
          success: false, 
          message: 'WhatsApp não conectado. Conecte sua instância primeiro.' 
        };
      }

      const instanceName = instanceCheck.instanceName!;

      // 3. Busca a campanha
      const campaign = await CampaignService.getCampaign(campaignId);
      if (!campaign) {
        return { success: false, message: 'Campanha não encontrada' };
      }

      // 4. Busca leads pendentes (válidos e não enviados)
      const allLeads = await CampaignService.getCampaignLeads(campaignId);
      const pendingLeads = allLeads.filter(
        lead => lead.whatsappValid && lead.messageStatus === 'pending'
      );

      if (pendingLeads.length === 0) {
        return { success: false, message: 'Nenhum lead pendente para envio' };
      }

      // 5. Atualiza status da campanha
      await CampaignService.updateCampaignStatus(campaignId, 'active');

      // 6. Inicia o processo de disparo
      const messageContent = campaign.messageTemplate || '';
      const minInterval = campaign.scheduleConfig?.minInterval || 10;
      const maxInterval = campaign.scheduleConfig?.maxInterval || 20;
      
      // Envia a PRIMEIRA mensagem IMEDIATAMENTE
      const [firstLead, ...remainingLeads] = pendingLeads;
      
      console.log('📤 Enviando primeira mensagem imediatamente...');
      await this.sendMessage(campaignId, userId, instanceName, firstLead, messageContent);
      
      // Agenda as próximas mensagens com intervalo
      if (remainingLeads.length > 0) {
        this.scheduleNextMessage(
          campaignId,
          userId,
          instanceName,
          remainingLeads,
          messageContent,
          minInterval,
          maxInterval
        );
      } else {
        // Se era a única mensagem, marca como concluída
        await CampaignService.updateCampaignStatus(campaignId, 'completed');
      }

      return { 
        success: true, 
        message: `Primeira mensagem enviada! ${remainingLeads.length} mensagens restantes serão enviadas com intervalo.` 
      };
    } catch (error) {
      console.error('Error starting campaign dispatch:', error);
      return { success: false, message: 'Erro ao iniciar campanha' };
    }
  }

  /**
   * Agenda o próximo envio de mensagem
   */
  private static scheduleNextMessage(
    campaignId: string,
    userId: string,
    instanceName: string,
    leads: CampaignLead[],
    messageContent: string,
    minInterval: number,
    maxInterval: number
  ): void {
    if (leads.length === 0) {
      // Campanha concluída
      CampaignService.updateCampaignStatus(campaignId, 'completed');
      this.activeDispatches.delete(campaignId);
      console.log('✅ Campanha concluída! Todas as mensagens foram enviadas.');
      return;
    }

    // Pega o próximo lead
    const [currentLead, ...remainingLeads] = leads;

    // Calcula intervalo aleatório (em milissegundos)
    const intervalMinutes = this.getRandomInterval(minInterval, maxInterval);
    const intervalMs = intervalMinutes * 60 * 1000;

    const now = new Date();
    const nextSendTime = new Date(now.getTime() + intervalMs);
    
    // Calcula tempo estimado de conclusão
    const avgInterval = (minInterval + maxInterval) / 2;
    const estimatedCompletionMs = leads.length * avgInterval * 60 * 1000;
    const estimatedCompletion = new Date(now.getTime() + estimatedCompletionMs);
    
    console.log(`\n📊 PRÓXIMO ENVIO:`);
    console.log(`   📍 Estabelecimento: ${currentLead.businessName}`);
    console.log(`   📞 Telefone: ${currentLead.phoneNumber}`);
    console.log(`   ⏰ Aguardando: ${intervalMinutes} minutos`);
    console.log(`   🕐 Horário previsto: ${nextSendTime.toLocaleTimeString('pt-BR')}`);
    console.log(`   📋 Faltam: ${leads.length} mensagens`);
    console.log(`   🏁 Conclusão estimada: ${estimatedCompletion.toLocaleString('pt-BR')}\n`);
    
    // Atualiza informações de progresso no banco (não aguarda para não bloquear)
    CampaignService.updateCampaignProgress(
      campaignId,
      currentLead.id,
      nextSendTime,
      estimatedCompletion
    ).catch(err => console.error('Erro ao atualizar progresso:', err));

    // Agenda o envio
    const timeout = setTimeout(async () => {
      await this.sendMessage(campaignId, userId, instanceName, currentLead, messageContent);
      
      // Agenda o próximo
      this.scheduleNextMessage(
        campaignId,
        userId,
        instanceName,
        remainingLeads,
        messageContent,
        minInterval,
        maxInterval
      );
    }, intervalMs);

    // Armazena o timeout para poder cancelar depois
    this.activeDispatches.set(campaignId, timeout);
  }

  /**
   * Envia uma mensagem para um lead
   */
  private static async sendMessage(
    campaignId: string,
    userId: string,
    instanceName: string,
    lead: CampaignLead,
    messageContent: string
  ): Promise<void> {
    const rawNumber = lead.whatsappNumber || lead.phoneNumber;
    const cleanNumber = rawNumber.replace(/\D/g, '');
    const destination = lead.remoteJid || cleanNumber;

    try {
      console.log(`\n📤 ENVIANDO MENSAGEM:`);
      console.log(`   🏢 Estabelecimento: ${lead.businessName}`);
      console.log(`   📞 Telefone: ${lead.phoneNumber}`);
      console.log(`   🆔 Remote JID: ${lead.remoteJid || 'N/A'}`);
      console.log(`   📍 Endereço: ${lead.address}`);
      
      console.log(`   🔢 Destinatário: ${destination} ${lead.remoteJid ? '(remoteJid)' : '(número limpo)'}`);

      // Envia a mensagem via Evolution API (usa remoteJid se disponível, conforme documentação)
      const response = await evolutionService.sendTextMessage(
        instanceName,
        destination,
        messageContent
      );

      // Atualiza status como enviado
      await CampaignService.updateMessageStatus(lead.id, 'sent');

      // Registra no log
      await CampaignService.logMessage({
        campaignId,
        campaignLeadId: lead.id,
        userId,
        phoneNumber: destination,
        messageContent,
        status: 'sent',
        evolutionResponse: response,
      });

      // Atualiza estatísticas da campanha
      await CampaignService.updateCampaignStats(campaignId);

      console.log(`   ✅ SUCESSO! Mensagem enviada`);
      console.log(`   🆔 Message ID: ${response?.key?.id || 'N/A'}\n`);
    } catch (error: any) {
      console.error(`\n❌ ERRO AO ENVIAR:`);
      console.error(`   🏢 Estabelecimento: ${lead.businessName}`);
      console.error(`   📞 Telefone: ${lead.phoneNumber}`);
      console.error(`   ⚠️ Erro: ${error.message}`);
      // Se for erro da Evolution API via Axios, tenta logar o response
      const anyError = error as any;
      if (anyError?.response) {
        console.error('   🌐 Evolution status:', anyError.response.status);
        console.error('   🌐 Evolution data:', anyError.response.data);
      }
      console.error('\n');

      // Atualiza status como falha
      await CampaignService.updateMessageStatus(
        lead.id,
        'failed',
        error.message || 'Erro desconhecido'
      );

      // Registra no log
      await CampaignService.logMessage({
        campaignId,
        campaignLeadId: lead.id,
        userId,
        phoneNumber: destination,
        messageContent,
        status: 'failed',
        errorMessage: error.message,
      });

      // Atualiza estatísticas
      await CampaignService.updateCampaignStats(campaignId);
    }
  }

  /**
   * Pausa uma campanha
   */
  static async pauseCampaign(campaignId: string): Promise<void> {
    const timeout = this.activeDispatches.get(campaignId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeDispatches.delete(campaignId);
    }
    await CampaignService.updateCampaignStatus(campaignId, 'paused');
  }

  /**
   * Cancela uma campanha
   */
  static async cancelCampaign(campaignId: string): Promise<void> {
    const timeout = this.activeDispatches.get(campaignId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeDispatches.delete(campaignId);
    }
    await CampaignService.updateCampaignStatus(campaignId, 'cancelled');
  }

  /**
   * Retoma uma campanha pausada
   */
  static async resumeCampaign(campaignId: string, userId: string): Promise<{ success: boolean; message: string }> {
    return this.startCampaignDispatch(campaignId, userId);
  }

  /**
   * Gera um intervalo aleatório entre min e max
   */
  private static getRandomInterval(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Delay helper
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
