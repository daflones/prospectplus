import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuração da Evolution API
const EVOLUTION_API_URL = process.env.VITE_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.VITE_EVOLUTION_API_KEY || process.env.EVOLUTION_API_KEY;

class DispatchService {
  constructor() {
    this.activeDispatches = new Map(); // campaignId -> intervalId
    this.isRunning = false;
  }

  /**
   * Inicia o serviço de monitoramento de campanhas
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Serviço de disparo já está rodando');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Serviço de disparo iniciado');
    
    // Verifica campanhas ativas a cada 30 segundos
    this.monitorInterval = setInterval(() => {
      this.checkActiveCampaigns();
    }, 30000);

    // Executa imediatamente na primeira vez
    this.checkActiveCampaigns();
  }

  /**
   * Para o serviço de monitoramento
   */
  stop() {
    this.isRunning = false;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    // Cancela todos os disparos ativos
    for (const [campaignId, timeoutId] of this.activeDispatches) {
      clearTimeout(timeoutId);
      console.log(`⏹️ Disparo cancelado para campanha ${campaignId}`);
    }
    this.activeDispatches.clear();

    console.log('🛑 Serviço de disparo parado');
  }

  /**
   * Verifica campanhas ativas no banco e inicia disparos pendentes
   */
  async checkActiveCampaigns() {
    try {
      // Busca campanhas ativas
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active');

      if (error) {
        console.error('❌ Erro ao buscar campanhas:', error);
        return;
      }

      if (!campaigns || campaigns.length === 0) {
        return;
      }

      console.log(`📋 ${campaigns.length} campanha(s) ativa(s) encontrada(s)`);

      for (const campaign of campaigns) {
        // Verifica se já está processando esta campanha
        if (this.activeDispatches.has(campaign.id)) {
          continue;
        }

        // Verifica se há próximo disparo agendado
        if (campaign.next_dispatch_at) {
          const nextDispatch = new Date(campaign.next_dispatch_at);
          const now = new Date();

          if (nextDispatch <= now) {
            // Hora de disparar!
            await this.processNextDispatch(campaign);
          } else {
            // Agenda o disparo
            const delay = nextDispatch.getTime() - now.getTime();
            this.scheduleDispatch(campaign, delay);
          }
        } else {
          // Não tem próximo disparo agendado, processa imediatamente
          await this.processNextDispatch(campaign);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao verificar campanhas:', error);
    }
  }

  /**
   * Agenda um disparo para uma campanha
   */
  scheduleDispatch(campaign, delay) {
    if (this.activeDispatches.has(campaign.id)) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      this.activeDispatches.delete(campaign.id);
      await this.processNextDispatch(campaign);
    }, delay);

    this.activeDispatches.set(campaign.id, timeoutId);
    
    const nextTime = new Date(Date.now() + delay);
    console.log(`⏰ Disparo agendado para campanha ${campaign.name} às ${nextTime.toLocaleTimeString('pt-BR')}`);
  }

  /**
   * Processa o próximo disparo de uma campanha
   */
  async processNextDispatch(campaign) {
    try {
      console.log(`\n📤 Processando campanha: ${campaign.name}`);

      // Busca o próximo lead pendente
      const { data: leads, error: leadsError } = await supabase
        .from('campaign_leads')
        .select('*')
        .eq('campaign_id', campaign.id)
        .eq('whatsapp_valid', true)
        .eq('message_status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1);

      if (leadsError) {
        console.error('❌ Erro ao buscar leads:', leadsError);
        return;
      }

      if (!leads || leads.length === 0) {
        console.log('✅ Todos os leads foram processados. Campanha concluída!');
        await this.completeCampaign(campaign.id);
        return;
      }

      const lead = leads[0];

      // Busca a instância do usuário
      const { data: instance, error: instanceError } = await supabase
        .from('evolution_instances')
        .select('*')
        .eq('user_id', campaign.user_id)
        .eq('status', 'connected')
        .single();

      if (instanceError || !instance) {
        console.error('❌ Instância não encontrada ou desconectada');
        await this.pauseCampaign(campaign.id, 'Instância WhatsApp desconectada');
        return;
      }

      // Envia a mensagem
      const success = await this.sendMessage(
        instance.instance_name,
        lead,
        campaign.message_template,
        campaign.media_files || []
      );

      if (success) {
        // Atualiza status do lead
        await supabase
          .from('campaign_leads')
          .update({ 
            message_status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', lead.id);

        // Atualiza estatísticas
        await supabase
          .from('campaigns')
          .update({ 
            sent_messages: (campaign.sent_messages || 0) + 1 
          })
          .eq('id', campaign.id);

        // Registra no log
        await this.logMessage(campaign.id, lead, 'sent');
      } else {
        // Marca como falha
        await supabase
          .from('campaign_leads')
          .update({ 
            message_status: 'failed',
            error_message: 'Falha ao enviar mensagem'
          })
          .eq('id', lead.id);

        await supabase
          .from('campaigns')
          .update({ 
            failed_messages: (campaign.failed_messages || 0) + 1 
          })
          .eq('id', campaign.id);

        await this.logMessage(campaign.id, lead, 'failed', 'Falha ao enviar');
      }

      // Agenda próximo disparo
      await this.scheduleNextDispatch(campaign);

    } catch (error) {
      console.error('❌ Erro ao processar disparo:', error);
    }
  }

  /**
   * Envia mensagem via Evolution API
   */
  async sendMessage(instanceName, lead, messageContent, mediaFiles = []) {
    const destination = lead.remote_jid || lead.phone_number.replace(/\D/g, '');

    try {
      console.log(`   📤 Enviando para: ${lead.business_name} (${destination})`);

      // 1. Envia o texto
      const textResponse = await axios.post(
        `${EVOLUTION_API_URL}/message/sendText/${instanceName}`,
        {
          number: destination,
          text: messageContent,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY,
          },
        }
      );

      console.log(`   ✅ Texto enviado! ID: ${textResponse.data?.key?.id || 'N/A'}`);

      // 2. Envia as mídias uma a uma
      if (mediaFiles && mediaFiles.length > 0) {
        console.log(`   📁 Enviando ${mediaFiles.length} arquivo(s)...`);

        for (let i = 0; i < mediaFiles.length; i++) {
          const media = mediaFiles[i];
          
          // Delay entre arquivos
          if (i > 0) {
            await this.delay(2000);
          }

          try {
            const mediaPayload = {
              number: destination,
              mediatype: media.type,
              media: media.url,
              delay: 1200,
            };

            if (media.mimeType) mediaPayload.mimetype = media.mimeType;
            if (media.fileName) mediaPayload.fileName = media.fileName;

            await axios.post(
              `${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`,
              mediaPayload,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': EVOLUTION_API_KEY,
                },
              }
            );

            console.log(`   ✅ ${media.type} ${i + 1} enviado!`);
          } catch (mediaError) {
            console.error(`   ⚠️ Erro ao enviar ${media.type} ${i + 1}:`, mediaError.message);
          }
        }
      }

      return true;
    } catch (error) {
      console.error(`   ❌ Erro ao enviar mensagem:`, error.message);
      return false;
    }
  }

  /**
   * Agenda o próximo disparo baseado no intervalo configurado
   */
  async scheduleNextDispatch(campaign) {
    const scheduleConfig = campaign.schedule_config || {};
    const minInterval = scheduleConfig.minIntervalMinutes || scheduleConfig.minInterval || 10;
    const maxInterval = scheduleConfig.maxIntervalMinutes || scheduleConfig.maxInterval || 20;

    // Intervalo aleatório entre min e max
    const intervalMinutes = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
    const intervalMs = intervalMinutes * 60 * 1000;

    const nextDispatchAt = new Date(Date.now() + intervalMs);

    // Atualiza no banco
    await supabase
      .from('campaigns')
      .update({
        next_dispatch_at: nextDispatchAt.toISOString(),
      })
      .eq('id', campaign.id);

    console.log(`   ⏰ Próximo disparo em ${intervalMinutes} minutos (${nextDispatchAt.toLocaleTimeString('pt-BR')})`);

    // Agenda localmente
    this.scheduleDispatch({ ...campaign, next_dispatch_at: nextDispatchAt }, intervalMs);
  }

  /**
   * Marca campanha como concluída
   */
  async completeCampaign(campaignId) {
    await supabase
      .from('campaigns')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        next_dispatch_at: null,
      })
      .eq('id', campaignId);

    this.activeDispatches.delete(campaignId);
    console.log(`🏁 Campanha ${campaignId} concluída!`);
  }

  /**
   * Pausa campanha com motivo
   */
  async pauseCampaign(campaignId, reason) {
    await supabase
      .from('campaigns')
      .update({
        status: 'paused',
        next_dispatch_at: null,
      })
      .eq('id', campaignId);

    this.activeDispatches.delete(campaignId);
    console.log(`⏸️ Campanha ${campaignId} pausada: ${reason}`);
  }

  /**
   * Registra log de mensagem
   */
  async logMessage(campaignId, lead, status, errorMessage = null) {
    await supabase
      .from('campaign_message_log')
      .insert({
        campaign_id: campaignId,
        campaign_lead_id: lead.id,
        user_id: lead.user_id,
        phone_number: lead.phone_number,
        message_content: '',
        status,
        error_message: errorMessage,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
      });
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Inicia uma campanha específica (chamado pela API)
   */
  async startCampaign(campaignId) {
    try {
      // Busca a campanha
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error || !campaign) {
        return { success: false, message: 'Campanha não encontrada' };
      }

      // Verifica se há leads pendentes
      const { data: pendingLeads, error: leadsError } = await supabase
        .from('campaign_leads')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('whatsapp_valid', true)
        .eq('message_status', 'pending');

      if (leadsError || !pendingLeads || pendingLeads.length === 0) {
        return { success: false, message: 'Nenhum lead pendente para envio' };
      }

      // Atualiza status para ativo
      await supabase
        .from('campaigns')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      // Processa imediatamente o primeiro
      await this.processNextDispatch({ ...campaign, status: 'active' });

      return { 
        success: true, 
        message: `Campanha iniciada! ${pendingLeads.length} leads pendentes.` 
      };
    } catch (error) {
      console.error('Erro ao iniciar campanha:', error);
      return { success: false, message: 'Erro ao iniciar campanha' };
    }
  }

  /**
   * Para uma campanha específica
   */
  async stopCampaign(campaignId) {
    // Cancela timeout se existir
    if (this.activeDispatches.has(campaignId)) {
      clearTimeout(this.activeDispatches.get(campaignId));
      this.activeDispatches.delete(campaignId);
    }

    await supabase
      .from('campaigns')
      .update({
        status: 'paused',
        next_dispatch_at: null,
      })
      .eq('id', campaignId);

    return { success: true, message: 'Campanha pausada' };
  }

  /**
   * Retorna status do serviço
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeCampaigns: this.activeDispatches.size,
      campaignIds: Array.from(this.activeDispatches.keys()),
    };
  }
}

// Exporta instância única (singleton)
export const dispatchService = new DispatchService();
export default dispatchService;
