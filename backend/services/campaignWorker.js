import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Configuração do Supabase (lazy initialization)
const getSupabaseUrl = () => process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const getSupabaseKey = () => process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;
const getSupabase = () => {
  if (!supabase) {
    const url = getSupabaseUrl();
    const key = getSupabaseKey();
    if (url && key) {
      supabase = createClient(url, key);
    }
  }
  return supabase;
};

// Configuração da Evolution API
const getEvolutionUrl = () => process.env.VITE_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
const getEvolutionKey = () => process.env.VITE_EVOLUTION_API_KEY || process.env.EVOLUTION_API_KEY;

// Configuração do Google Maps
const getGoogleApiKey = () => process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

/**
 * Worker de Campanhas - Roda no backend independente do frontend
 * Responsável por:
 * 1. Buscar estabelecimentos no Google Maps
 * 2. Validar números de WhatsApp
 * 3. Salvar leads no banco
 * 4. Disparar mensagens com intervalo
 */
class CampaignWorker {
  constructor() {
    this.activeCampaigns = new Map(); // campaignId -> { status, timeoutId }
    this.isRunning = false;
  }

  /**
   * Inicia o worker
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Campaign Worker já está rodando');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Campaign Worker iniciado');
    console.log(`   📍 Google Maps API: ${getGoogleApiKey() ? '✅ Configurada' : '❌ Não configurada'}`);
    console.log(`   📱 Evolution API: ${getEvolutionKey() ? '✅ Configurada' : '❌ Não configurada'}`);
    console.log(`   🗄️ Supabase: ${getSupabaseKey() ? '✅ Configurado' : '❌ Não configurado'}`);
    
    // Verifica campanhas a cada 30 segundos
    this.monitorInterval = setInterval(() => {
      this.checkCampaigns();
    }, 30000);

    // Executa imediatamente
    this.checkCampaigns();
  }

  /**
   * Para o worker
   */
  stop() {
    this.isRunning = false;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    // Cancela todos os timeouts
    for (const [campaignId, data] of this.activeCampaigns) {
      if (data.timeoutId) {
        clearTimeout(data.timeoutId);
      }
    }
    this.activeCampaigns.clear();

    console.log('🛑 Campaign Worker parado');
  }

  /**
   * Verifica campanhas que precisam de processamento
   */
  async checkCampaigns() {
    try {
      // Busca campanhas que precisam de processamento
      const { data: campaigns, error } = await getSupabase()
        .from('campaigns')
        .select('*')
        .in('status', ['active', 'searching', 'validating']);

      if (error) {
        console.error('❌ Erro ao buscar campanhas:', error);
        return;
      }

      if (!campaigns || campaigns.length === 0) {
        return;
      }

      console.log(`\n📋 ${campaigns.length} campanha(s) para processar`);

      for (const campaign of campaigns) {
        // Evita processar a mesma campanha múltiplas vezes
        if (this.activeCampaigns.has(campaign.id) && this.activeCampaigns.get(campaign.id).processing) {
          continue;
        }

        this.processCampaign(campaign);
      }
    } catch (error) {
      console.error('❌ Erro ao verificar campanhas:', error);
    }
  }

  /**
   * Processa uma campanha baseado no seu status
   */
  async processCampaign(campaign) {
    this.activeCampaigns.set(campaign.id, { processing: true });

    try {
      console.log(`\n🔄 Processando campanha: ${campaign.name} (${campaign.status})`);

      switch (campaign.status) {
        case 'searching':
          await this.searchEstablishments(campaign);
          break;
        case 'validating':
          await this.validateWhatsAppNumbers(campaign);
          break;
        case 'active':
          await this.processDispatch(campaign);
          break;
      }
    } catch (error) {
      console.error(`❌ Erro ao processar campanha ${campaign.name}:`, error);
    } finally {
      const data = this.activeCampaigns.get(campaign.id) || {};
      this.activeCampaigns.set(campaign.id, { ...data, processing: false });
    }
  }

  // ==================== BUSCA NO GOOGLE MAPS ====================

  /**
   * Busca estabelecimentos no Google Maps
   */
  async searchEstablishments(campaign) {
    console.log(`\n🔍 ETAPA 1: Buscando estabelecimentos...`);

    const targetAudience = campaign.target_audience || {};
    const searchQuery = targetAudience.searchQuery || '';
    const location = targetAudience.location || {};
    const city = location.city || '';
    const state = location.state || '';
    const country = location.country || 'Brasil';

    if (!searchQuery || !city) {
      console.error('❌ Configuração de busca incompleta');
      await this.updateCampaignStatus(campaign.id, 'draft', 'Configuração de busca incompleta');
      return;
    }

    try {
      const query = `${searchQuery} em ${city}, ${state}, ${country}`;
      console.log(`   🔎 Query: ${query}`);

      let allPlaces = [];
      let pageToken = null;
      let pageCount = 0;
      const maxPages = 3;

      // Busca múltiplas páginas
      do {
        const params = {
          query,
          key: getGoogleApiKey(),
          language: 'pt-BR',
        };

        if (pageToken) {
          params.pagetoken = pageToken;
          // Google requer delay entre páginas
          await this.delay(2000);
        }

        const response = await axios.get(
          'https://maps.googleapis.com/maps/api/place/textsearch/json',
          { params }
        );

        if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
          console.error(`   ❌ Erro Google Maps: ${response.data.status}`);
          break;
        }

        const places = response.data.results || [];
        allPlaces = [...allPlaces, ...places];
        pageToken = response.data.next_page_token;
        pageCount++;

        console.log(`   📍 Página ${pageCount}: ${places.length} lugares (Total: ${allPlaces.length})`);

      } while (pageToken && pageCount < maxPages);

      console.log(`   ✅ Total encontrado: ${allPlaces.length} estabelecimentos`);

      // Busca detalhes (telefone) de cada lugar
      let placesWithPhone = 0;
      for (let i = 0; i < allPlaces.length; i++) {
        const place = allPlaces[i];
        
        try {
          const details = await this.getPlaceDetails(place.place_id);
          
          if (details && details.phoneNumber) {
            placesWithPhone++;
            
            // Salva como lead pendente de validação
            await this.saveCampaignLead(campaign, {
              name: place.name,
              address: place.formatted_address,
              phoneNumber: details.phoneNumber,
              placeId: place.place_id,
              lat: place.geometry?.location?.lat,
              lng: place.geometry?.location?.lng,
            });

            console.log(`   📞 ${placesWithPhone}. ${place.name}: ${details.phoneNumber}`);
          }

          // Delay para não exceder rate limit
          if (i < allPlaces.length - 1) {
            await this.delay(200);
          }
        } catch (error) {
          console.error(`   ⚠️ Erro ao buscar detalhes de ${place.name}:`, error.message);
        }
      }

      console.log(`   ✅ ${placesWithPhone} estabelecimentos com telefone salvos`);

      // Atualiza status para validação
      if (placesWithPhone > 0) {
        await this.updateCampaignStatus(campaign.id, 'validating');
      } else {
        await this.updateCampaignStatus(campaign.id, 'draft', 'Nenhum estabelecimento com telefone encontrado');
      }

    } catch (error) {
      console.error('❌ Erro na busca:', error);
      await this.updateCampaignStatus(campaign.id, 'draft', error.message);
    }
  }

  /**
   * Busca detalhes de um lugar (telefone)
   */
  async getPlaceDetails(placeId) {
    try {
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/place/details/json',
        {
          params: {
            place_id: placeId,
            fields: 'formatted_phone_number,international_phone_number,name',
            key: getGoogleApiKey(),
            language: 'pt-BR',
          }
        }
      );

      if (response.data.status === 'OK' && response.data.result) {
        const result = response.data.result;
        return {
          name: result.name,
          phoneNumber: result.international_phone_number || result.formatted_phone_number,
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Salva lead da campanha no banco
   */
  async saveCampaignLead(campaign, place) {
    // Normaliza telefone
    const phoneNumber = this.normalizePhone(place.phoneNumber);
    
    if (!phoneNumber) return null;

    // Verifica se já existe
    const { data: existing } = await getSupabase()
      .from('campaign_leads')
      .select('id')
      .eq('campaign_id', campaign.id)
      .eq('phone_number', phoneNumber)
      .single();

    if (existing) return existing;

    // Insere novo lead
    const { data, error } = await getSupabase()
      .from('campaign_leads')
      .insert({
        campaign_id: campaign.id,
        user_id: campaign.user_id,
        business_name: place.name,
        phone_number: phoneNumber,
        address: place.address,
        google_place_id: place.placeId,
        latitude: place.lat,
        longitude: place.lng,
        whatsapp_valid: null, // Será validado depois
        message_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar lead:', error);
      return null;
    }

    return data;
  }

  // ==================== VALIDAÇÃO DE WHATSAPP ====================

  /**
   * Valida números de WhatsApp dos leads
   */
  async validateWhatsAppNumbers(campaign) {
    console.log(`\n📱 ETAPA 2: Validando números de WhatsApp...`);

    // Busca instância do usuário
    const { data: instance, error: instanceError } = await getSupabase()
      .from('evolution_instances')
      .select('*')
      .eq('user_id', campaign.user_id)
      .eq('status', 'connected')
      .single();

    if (instanceError || !instance) {
      console.error('❌ Instância WhatsApp não conectada');
      await this.updateCampaignStatus(campaign.id, 'paused', 'WhatsApp não conectado');
      return;
    }

    // Busca leads pendentes de validação
    const { data: leads, error: leadsError } = await getSupabase()
      .from('campaign_leads')
      .select('*')
      .eq('campaign_id', campaign.id)
      .is('whatsapp_valid', null)
      .order('created_at', { ascending: true });

    if (leadsError || !leads || leads.length === 0) {
      console.log('   ✅ Todos os leads já foram validados');
      
      // Verifica se há leads válidos
      const { data: validLeads } = await getSupabase()
        .from('campaign_leads')
        .select('id')
        .eq('campaign_id', campaign.id)
        .eq('whatsapp_valid', true)
        .eq('message_status', 'pending');

      if (validLeads && validLeads.length > 0) {
        await this.updateCampaignStatus(campaign.id, 'active');
        await this.updateCampaignStats(campaign.id);
      } else {
        await this.updateCampaignStatus(campaign.id, 'completed', 'Nenhum número válido de WhatsApp');
      }
      return;
    }

    console.log(`   📋 ${leads.length} leads para validar`);

    let validCount = 0;
    let invalidCount = 0;

    for (const lead of leads) {
      try {
        const cleanNumber = lead.phone_number.replace(/\D/g, '');
        
        // Verifica se tem WhatsApp
        const response = await axios.post(
          `${getEvolutionUrl()}/chat/whatsappNumbers/${instance.instance_name}`,
          { numbers: [cleanNumber] },
          {
            headers: {
              'Content-Type': 'application/json',
              'apikey': getEvolutionKey(),
            },
          }
        );

        const result = response.data?.[0];
        const hasWhatsApp = result?.exists || false;
        const remoteJid = result?.jid || null;

        // Atualiza lead
        await getSupabase()
          .from('campaign_leads')
          .update({
            whatsapp_valid: hasWhatsApp,
            remote_jid: remoteJid,
            whatsapp_number: hasWhatsApp ? cleanNumber : null,
          })
          .eq('id', lead.id);

        if (hasWhatsApp) {
          validCount++;
          console.log(`   ✅ ${lead.business_name}: WhatsApp válido`);

          // Salva também na tabela leads (CRM)
          await this.saveToLeadsTable(campaign.user_id, lead, remoteJid);
        } else {
          invalidCount++;
          console.log(`   ❌ ${lead.business_name}: Sem WhatsApp`);
        }

        // Delay entre validações
        await this.delay(1000);

      } catch (error) {
        console.error(`   ⚠️ Erro ao validar ${lead.business_name}:`, error.message);
        
        // Marca como inválido em caso de erro
        await getSupabase()
          .from('campaign_leads')
          .update({ whatsapp_valid: false })
          .eq('id', lead.id);
        
        invalidCount++;
      }
    }

    console.log(`   ✅ Validação concluída: ${validCount} válidos, ${invalidCount} inválidos`);

    // Atualiza estatísticas e status
    await this.updateCampaignStats(campaign.id);

    if (validCount > 0) {
      await this.updateCampaignStatus(campaign.id, 'active');
    } else {
      await this.updateCampaignStatus(campaign.id, 'completed', 'Nenhum número válido');
    }
  }

  /**
   * Salva lead na tabela principal de leads (CRM)
   */
  async saveToLeadsTable(userId, campaignLead, remoteJid) {
    try {
      // Verifica se já existe
      const { data: existing } = await getSupabase()
        .from('leads')
        .select('id')
        .eq('user_id', userId)
        .eq('phone', campaignLead.phone_number)
        .single();

      if (existing) return;

      await getSupabase()
        .from('leads')
        .insert({
          user_id: userId,
          name: campaignLead.business_name,
          phone: campaignLead.phone_number,
          whatsapp_jid: remoteJid,
          address: campaignLead.address,
          source: 'campaign',
          status: 'new',
        });
    } catch (error) {
      // Ignora erros de duplicação
    }
  }

  // ==================== DISPARO DE MENSAGENS ====================

  /**
   * Processa disparo de mensagens
   */
  async processDispatch(campaign) {
    // Verifica se já está agendado
    const campaignData = this.activeCampaigns.get(campaign.id);
    if (campaignData?.timeoutId) {
      return; // Já tem disparo agendado
    }

    // Verifica se tem próximo disparo agendado
    if (campaign.next_dispatch_at) {
      const nextDispatch = new Date(campaign.next_dispatch_at);
      const now = new Date();

      if (nextDispatch > now) {
        // Agenda para o horário correto
        const delay = nextDispatch.getTime() - now.getTime();
        this.scheduleDispatch(campaign, delay);
        return;
      }
    }

    // Processa disparo imediatamente
    await this.sendNextMessage(campaign);
  }

  /**
   * Agenda próximo disparo
   */
  scheduleDispatch(campaign, delay) {
    const timeoutId = setTimeout(async () => {
      const data = this.activeCampaigns.get(campaign.id) || {};
      this.activeCampaigns.set(campaign.id, { ...data, timeoutId: null });
      
      // Recarrega campanha do banco
      const { data: updatedCampaign } = await getSupabase()
        .from('campaigns')
        .select('*')
        .eq('id', campaign.id)
        .single();

      if (updatedCampaign && updatedCampaign.status === 'active') {
        await this.sendNextMessage(updatedCampaign);
      }
    }, delay);

    const data = this.activeCampaigns.get(campaign.id) || {};
    this.activeCampaigns.set(campaign.id, { ...data, timeoutId });

    const nextTime = new Date(Date.now() + delay);
    console.log(`   ⏰ Próximo disparo agendado para ${nextTime.toLocaleTimeString('pt-BR')}`);
  }

  /**
   * Envia próxima mensagem
   */
  async sendNextMessage(campaign) {
    console.log(`\n📤 ETAPA 3: Enviando mensagem...`);

    // Busca instância
    const { data: instance } = await getSupabase()
      .from('evolution_instances')
      .select('*')
      .eq('user_id', campaign.user_id)
      .eq('status', 'connected')
      .single();

    if (!instance) {
      console.error('❌ Instância não conectada');
      await this.updateCampaignStatus(campaign.id, 'paused', 'WhatsApp desconectado');
      return;
    }

    // Busca próximo lead pendente
    const { data: leads } = await getSupabase()
      .from('campaign_leads')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('whatsapp_valid', true)
      .eq('message_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (!leads || leads.length === 0) {
      console.log('   ✅ Todos os leads foram processados!');
      await this.updateCampaignStatus(campaign.id, 'completed');
      return;
    }

    const lead = leads[0];
    const destination = lead.remote_jid || lead.phone_number.replace(/\D/g, '');

    console.log(`   🏢 ${lead.business_name}`);
    console.log(`   📞 ${destination}`);

    try {
      // 1. Envia texto
      const textResponse = await axios.post(
        `${getEvolutionUrl()}/message/sendText/${instance.instance_name}`,
        {
          number: destination,
          text: campaign.message_template,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': getEvolutionKey(),
          },
        }
      );

      console.log(`   ✅ Texto enviado! ID: ${textResponse.data?.key?.id || 'N/A'}`);

      // 2. Envia mídias
      const mediaFiles = campaign.media_files || [];
      if (mediaFiles.length > 0) {
        console.log(`   📁 Enviando ${mediaFiles.length} arquivo(s)...`);

        for (let i = 0; i < mediaFiles.length; i++) {
          const media = mediaFiles[i];
          
          if (i > 0) await this.delay(2000);

          try {
            const payload = {
              number: destination,
              mediatype: media.type,
              media: media.url,
              delay: 1200,
            };
            if (media.mimeType) payload.mimetype = media.mimeType;
            if (media.fileName) payload.fileName = media.fileName;

            await axios.post(
              `${getEvolutionUrl()}/message/sendMedia/${instance.instance_name}`,
              payload,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': getEvolutionKey(),
                },
              }
            );

            console.log(`   ✅ ${media.type} ${i + 1} enviado!`);
          } catch (mediaError) {
            console.error(`   ⚠️ Erro ao enviar ${media.type}:`, mediaError.message);
          }
        }
      }

      // Atualiza lead como enviado
      await getSupabase()
        .from('campaign_leads')
        .update({
          message_status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', lead.id);

      // Atualiza estatísticas
      await getSupabase()
        .from('campaigns')
        .update({
          sent_messages: (campaign.sent_messages || 0) + 1,
        })
        .eq('id', campaign.id);

      // Registra log
      await this.logMessage(campaign.id, lead, 'sent');

      console.log(`   ✅ Mensagem enviada com sucesso!`);

    } catch (error) {
      console.error(`   ❌ Erro ao enviar:`, error.message);

      // Marca como falha
      await getSupabase()
        .from('campaign_leads')
        .update({
          message_status: 'failed',
          error_message: error.message,
        })
        .eq('id', lead.id);

      await getSupabase()
        .from('campaigns')
        .update({
          failed_messages: (campaign.failed_messages || 0) + 1,
        })
        .eq('id', campaign.id);

      await this.logMessage(campaign.id, lead, 'failed', error.message);
    }

    // Agenda próximo disparo
    await this.scheduleNextDispatchTime(campaign);
  }

  /**
   * Calcula e agenda próximo disparo
   */
  async scheduleNextDispatchTime(campaign) {
    const config = campaign.schedule_config || {};
    const minInterval = config.minIntervalMinutes || config.minInterval || 10;
    const maxInterval = config.maxIntervalMinutes || config.maxInterval || 20;

    const intervalMinutes = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
    const intervalMs = intervalMinutes * 60 * 1000;
    const nextDispatchAt = new Date(Date.now() + intervalMs);

    // Atualiza no banco
    await getSupabase()
      .from('campaigns')
      .update({ next_dispatch_at: nextDispatchAt.toISOString() })
      .eq('id', campaign.id);

    // Agenda localmente
    this.scheduleDispatch(campaign, intervalMs);

    console.log(`   ⏰ Próximo disparo em ${intervalMinutes} minutos`);
  }

  // ==================== UTILITÁRIOS ====================

  /**
   * Atualiza status da campanha
   */
  async updateCampaignStatus(campaignId, status, errorMessage = null) {
    const updateData = { status };

    if (status === 'active') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'cancelled') {
      updateData.completed_at = new Date().toISOString();
      updateData.next_dispatch_at = null;
    } else if (status === 'paused') {
      updateData.next_dispatch_at = null;
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    await getSupabase()
      .from('campaigns')
      .update(updateData)
      .eq('id', campaignId);

    console.log(`   📊 Status atualizado: ${status}`);
  }

  /**
   * Atualiza estatísticas da campanha
   */
  async updateCampaignStats(campaignId) {
    const { data: stats } = await getSupabase()
      .from('campaign_leads')
      .select('message_status, whatsapp_valid')
      .eq('campaign_id', campaignId);

    if (!stats) return;

    const totalLeads = stats.length;
    const validLeads = stats.filter(s => s.whatsapp_valid === true).length;
    const sentMessages = stats.filter(s => s.message_status === 'sent').length;
    const failedMessages = stats.filter(s => s.message_status === 'failed').length;

    await getSupabase()
      .from('campaigns')
      .update({
        total_leads: totalLeads,
        sent_messages: sentMessages,
        failed_messages: failedMessages,
      })
      .eq('id', campaignId);
  }

  /**
   * Registra log de mensagem
   */
  async logMessage(campaignId, lead, status, errorMessage = null) {
    try {
      await getSupabase()
        .from('campaign_message_log')
        .insert({
          campaign_id: campaignId,
          campaign_lead_id: lead.id,
          user_id: lead.user_id,
          phone_number: lead.phone_number,
          status,
          error_message: errorMessage,
          sent_at: status === 'sent' ? new Date().toISOString() : null,
        });
    } catch (error) {
      // Ignora erros de log
    }
  }

  /**
   * Normaliza número de telefone
   */
  normalizePhone(phone) {
    if (!phone) return null;
    
    let cleaned = phone.replace(/\D/g, '');
    
    // Adiciona código do Brasil se necessário
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = '55' + cleaned;
    }
    
    // Valida tamanho
    if (cleaned.length < 12 || cleaned.length > 13) {
      return null;
    }
    
    return cleaned;
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== API PÚBLICA ====================

  /**
   * Verifica se a instância do WhatsApp está conectada
   */
  async checkWhatsAppInstance(userId) {
    try {
      // Busca instância do usuário no banco
      const { data: instance, error } = await getSupabase()
        .from('evolution_instances')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !instance) {
        return { connected: false, message: 'Instância não encontrada' };
      }

      // Verifica status no banco
      if (instance.status !== 'connected') {
        // Tenta verificar diretamente na Evolution API
        try {
          const response = await axios.get(
            `${getEvolutionUrl()}/instance/connectionState/${instance.instance_name}`,
            {
              headers: {
                'Content-Type': 'application/json',
                'apikey': getEvolutionKey(),
              },
            }
          );

          const state = response.data?.instance?.state || response.data?.state;
          const isConnected = state === 'open' || state === 'connected';

          // Atualiza status no banco se mudou
          if (isConnected && instance.status !== 'connected') {
            await getSupabase()
              .from('evolution_instances')
              .update({ status: 'connected' })
              .eq('id', instance.id);
          }

          if (!isConnected) {
            return { 
              connected: false, 
              message: 'WhatsApp desconectado. Reconecte sua instância.',
              instanceName: instance.instance_name
            };
          }
        } catch (apiError) {
          console.error('Erro ao verificar status na Evolution API:', apiError.message);
          return { 
            connected: false, 
            message: 'Não foi possível verificar o status do WhatsApp' 
          };
        }
      }

      return { 
        connected: true, 
        instanceName: instance.instance_name,
        instance 
      };
    } catch (error) {
      console.error('Erro ao verificar instância:', error);
      return { connected: false, message: 'Erro ao verificar WhatsApp' };
    }
  }

  /**
   * Inicia uma campanha (chamado pela API)
   */
  async launchCampaign(campaignId) {
    try {
      const { data: campaign, error } = await getSupabase()
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error || !campaign) {
        return { success: false, message: 'Campanha não encontrada' };
      }

      if (campaign.status === 'active' || campaign.status === 'searching' || campaign.status === 'validating') {
        return { success: false, message: 'Campanha já está em execução' };
      }

      // Verifica se a instância do WhatsApp está conectada
      const instanceCheck = await this.checkWhatsAppInstance(campaign.user_id);
      
      if (!instanceCheck.connected) {
        return { 
          success: false, 
          message: instanceCheck.message || 'WhatsApp não conectado. Conecte sua instância primeiro.' 
        };
      }

      console.log(`✅ WhatsApp conectado: ${instanceCheck.instanceName}`);

      // Inicia o processo de busca
      await this.updateCampaignStatus(campaignId, 'searching');

      // Processa imediatamente
      setTimeout(() => this.processCampaign({ ...campaign, status: 'searching' }), 100);

      return { 
        success: true, 
        message: 'Campanha iniciada! Buscando estabelecimentos...' 
      };
    } catch (error) {
      console.error('Erro ao iniciar campanha:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Para uma campanha
   */
  async stopCampaign(campaignId) {
    // Cancela timeout se existir
    const data = this.activeCampaigns.get(campaignId);
    if (data?.timeoutId) {
      clearTimeout(data.timeoutId);
    }
    this.activeCampaigns.delete(campaignId);

    await this.updateCampaignStatus(campaignId, 'paused');

    return { success: true, message: 'Campanha pausada' };
  }

  /**
   * Retoma uma campanha pausada
   */
  async resumeCampaign(campaignId) {
    const { data: campaign } = await getSupabase()
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (!campaign) {
      return { success: false, message: 'Campanha não encontrada' };
    }

    // Verifica se há leads pendentes
    const { data: pendingLeads } = await getSupabase()
      .from('campaign_leads')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('whatsapp_valid', true)
      .eq('message_status', 'pending');

    if (!pendingLeads || pendingLeads.length === 0) {
      return { success: false, message: 'Nenhum lead pendente' };
    }

    await this.updateCampaignStatus(campaignId, 'active');

    // Processa imediatamente
    setTimeout(() => this.processDispatch({ ...campaign, status: 'active' }), 100);

    return { 
      success: true, 
      message: `Campanha retomada! ${pendingLeads.length} leads pendentes.` 
    };
  }

  /**
   * Retorna status do worker
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeCampaigns: this.activeCampaigns.size,
      campaignIds: Array.from(this.activeCampaigns.keys()),
    };
  }
}

// Exporta instância única
export const campaignWorker = new CampaignWorker();
export default campaignWorker;
