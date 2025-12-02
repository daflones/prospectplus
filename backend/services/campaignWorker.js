import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Configuração do Supabase (lazy initialization)
// IMPORTANTE: O backend precisa da SERVICE_ROLE_KEY para bypassar RLS
const getSupabaseUrl = () => process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const getSupabaseKey = () => {
  // Prioriza service_role_key para o backend (bypassa RLS)
  return process.env.SUPABASE_SERVICE_ROLE_KEY || 
         process.env.VITE_SUPABASE_ANON_KEY || 
         process.env.SUPABASE_ANON_KEY;
};

let supabase = null;
const getSupabase = () => {
  if (!supabase) {
    const url = getSupabaseUrl();
    const key = getSupabaseKey();
    if (url && key) {
      supabase = createClient(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
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
    this.campaignLogs = new Map(); // campaignId -> { logs: [], progress: {} }
    this.isRunning = false;
  }

  /**
   * Adiciona log de progresso para uma campanha
   */
  addLog(campaignId, type, message, data = {}) {
    if (!this.campaignLogs.has(campaignId)) {
      this.campaignLogs.set(campaignId, { 
        logs: [], 
        progress: {
          stage: 'idle',
          stageLabel: 'Aguardando',
          percent: 0,
          leadsFound: 0,
          leadsValidated: 0,
          leadsValid: 0,
          messagesSent: 0,
          messagesFailed: 0,
          currentAction: '',
        }
      });
    }
    
    const campaignData = this.campaignLogs.get(campaignId);
    
    // Evita logs duplicados (mesmo tipo e mensagem nos últimos 2 segundos)
    const recentLogs = campaignData.logs.slice(-5);
    const isDuplicate = recentLogs.some(log => {
      const timeDiff = Date.now() - new Date(log.timestamp).getTime();
      return log.message === message && log.type === type && timeDiff < 2000;
    });
    
    if (isDuplicate) {
      return; // Ignora log duplicado
    }
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      type, // 'info', 'success', 'error', 'warning'
      message,
      data,
    };
    
    campaignData.logs.push(logEntry);
    
    // Mantém apenas os últimos 100 logs
    if (campaignData.logs.length > 100) {
      campaignData.logs = campaignData.logs.slice(-100);
    }
    
    // Log no console também
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '📋';
    console.log(`   ${emoji} ${message}`);
  }

  /**
   * Atualiza progresso de uma campanha
   */
  updateProgress(campaignId, progress) {
    if (!this.campaignLogs.has(campaignId)) {
      this.campaignLogs.set(campaignId, { logs: [], progress: {} });
    }
    
    const campaignData = this.campaignLogs.get(campaignId);
    campaignData.progress = { ...campaignData.progress, ...progress };
  }

  /**
   * Retorna progresso e logs de uma campanha
   */
  getCampaignProgress(campaignId) {
    const data = this.campaignLogs.get(campaignId);
    if (!data) {
      return {
        logs: [],
        progress: {
          stage: 'idle',
          stageLabel: 'Aguardando',
          percent: 0,
        }
      };
    }
    return data;
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
      // Busca campanhas ativas ou em processamento
      const { data: activeCampaigns, error: activeError } = await getSupabase()
        .from('campaigns')
        .select('*')
        .in('status', ['active', 'searching', 'validating']);

      if (activeError) {
        console.error('❌ Erro ao buscar campanhas ativas:', activeError);
      }

      // Busca campanhas programadas que devem iniciar
      const { data: scheduledCampaigns, error: scheduledError } = await getSupabase()
        .from('campaigns')
        .select('*')
        .eq('status', 'scheduled')
        .lte('next_scheduled_at', new Date().toISOString());

      if (scheduledError) {
        console.error('❌ Erro ao buscar campanhas programadas:', scheduledError);
      }

      // Processa campanhas programadas que devem iniciar
      if (scheduledCampaigns && scheduledCampaigns.length > 0) {
        for (const campaign of scheduledCampaigns) {
          if (this.shouldStartScheduledCampaign(campaign)) {
            console.log(`\n⏰ Iniciando campanha programada: ${campaign.name}`);
            await this.startScheduledCampaign(campaign);
          }
        }
      }

      const campaigns = activeCampaigns || [];
      if (campaigns.length === 0) {
        return;
      }

      console.log(`\n📋 ${campaigns.length} campanha(s) para processar`);

      for (const campaign of campaigns) {
        // Evita processar a mesma campanha múltiplas vezes
        const campaignState = this.activeCampaigns.get(campaign.id);
        if (campaignState?.processing) {
          console.log(`   ⏭️ ${campaign.name} já está sendo processada`);
          continue;
        }

        // Marca como processando ANTES de iniciar
        this.activeCampaigns.set(campaign.id, { ...campaignState, processing: true });
        
        // Processa sem await para não bloquear outras campanhas
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
   * Calcula quantos leads são necessários baseado na configuração da campanha
   */
  calculateRequiredLeads(campaign) {
    const scheduleConfig = campaign.schedule_config || {};
    const scheduledDispatch = campaign.scheduled_dispatch || scheduleConfig.scheduledDispatch || {};
    
    // Valores padrão - mínimo de 100 leads
    const minLeads = 100;
    const messagesPerDay = scheduledDispatch.messagesPerDay || 50;
    
    // Se tem agendamento com data de fim, calcula baseado nos dias
    if (scheduledDispatch.startDate && scheduledDispatch.endDate) {
      const startDate = new Date(scheduledDispatch.startDate);
      const endDate = new Date(scheduledDispatch.endDate);
      const daysOfWeek = scheduledDispatch.daysOfWeek || [1, 2, 3, 4, 5];
      
      // Conta dias úteis no período
      let workDays = 0;
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (daysOfWeek.includes(d.getDay())) {
          workDays++;
        }
      }
      
      const totalNeeded = workDays * messagesPerDay;
      console.log(`   📊 Campanha de ${workDays} dias x ${messagesPerDay} msgs/dia = ${totalNeeded} leads necessários`);
      
      return Math.max(minLeads, totalNeeded);
    }
    
    return minLeads;
  }

  /**
   * Verifica se um estabelecimento já existe no banco (por placeId ou telefone)
   * Verifica em OUTRAS campanhas do usuário (não na atual, pois já foi limpa)
   */
  async checkDuplicateEstablishment(campaign, placeId, phoneNumber) {
    const normalizedPhone = this.normalizePhone(phoneNumber);
    
    // Verifica por placeId em OUTRAS campanhas do usuário
    if (placeId) {
      const { data: byPlaceId } = await getSupabase()
        .from('campaign_leads')
        .select('id')
        .eq('user_id', campaign.user_id)
        .neq('campaign_id', campaign.id) // Exclui a campanha atual
        .eq('google_place_id', placeId)
        .limit(1);
      
      if (byPlaceId && byPlaceId.length > 0) {
        return { isDuplicate: true, reason: 'placeId' };
      }
    }
    
    // Verifica por telefone em OUTRAS campanhas do usuário
    if (normalizedPhone) {
      const { data: byPhone } = await getSupabase()
        .from('campaign_leads')
        .select('id')
        .eq('user_id', campaign.user_id)
        .neq('campaign_id', campaign.id) // Exclui a campanha atual
        .eq('phone_number', normalizedPhone)
        .limit(1);
      
      if (byPhone && byPhone.length > 0) {
        return { isDuplicate: true, reason: 'phone' };
      }
    }
    
    return { isDuplicate: false };
  }

  /**
   * Busca estabelecimentos no Google Maps com paginação inteligente
   */
  async searchEstablishments(campaign) {
    console.log(`\n🔍 ETAPA 1: Buscando estabelecimentos...`);
    
    // Inicializa progresso
    this.updateProgress(campaign.id, {
      stage: 'searching',
      stageLabel: 'Buscando estabelecimentos...',
      percent: 0,
      leadsFound: 0,
      currentAction: 'Iniciando busca',
    });
    this.addLog(campaign.id, 'info', 'Iniciando busca de estabelecimentos');

    const targetAudience = campaign.target_audience || {};
    const searchQuery = targetAudience.searchQuery || '';
    const location = targetAudience.location || {};
    const city = location.city || '';
    const state = location.state || '';
    const country = location.country || 'Brasil';

    if (!searchQuery || !city) {
      console.error('❌ Configuração de busca incompleta');
      this.addLog(campaign.id, 'error', 'Configuração de busca incompleta');
      await this.updateCampaignStatus(campaign.id, 'draft', 'Configuração de busca incompleta');
      return;
    }

    // Limpa leads antigos desta campanha para permitir nova busca
    console.log(`   🧹 Limpando leads antigos desta campanha...`);
    this.addLog(campaign.id, 'info', 'Limpando leads antigos');
    const { error: deleteError } = await getSupabase()
      .from('campaign_leads')
      .delete()
      .eq('campaign_id', campaign.id);
    
    if (deleteError) {
      console.log(`   ⚠️ Erro ao limpar leads antigos: ${deleteError.message}`);
    } else {
      console.log(`   ✅ Leads antigos removidos`);
    }

    try {
      const query = `${searchQuery} em ${city}, ${state}, ${country}`;
      console.log(`   🔎 Query: ${query}`);
      this.addLog(campaign.id, 'info', `Buscando: ${searchQuery} em ${city}`);

      // Calcula quantos leads são necessários
      const requiredLeads = this.calculateRequiredLeads(campaign);
      console.log(`   🎯 Meta: ${requiredLeads} leads únicos`);

      let savedLeads = 0;
      let duplicatesFound = 0;
      let processedPlaces = 0;
      let pageToken = null;
      let pageCount = 0;
      const maxPages = 10;
      const processedPlaceIds = new Set();

      // Busca múltiplas páginas até atingir a meta ou esgotar resultados
      while (savedLeads < requiredLeads && pageCount < maxPages) {
        const params = {
          query,
          key: getGoogleApiKey(),
          language: 'pt-BR',
        };

        if (pageToken) {
          params.pagetoken = pageToken;
          // Google requer delay entre páginas
          console.log(`   ⏳ Aguardando 2s para próxima página...`);
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
        pageToken = response.data.next_page_token;
        pageCount++;

        console.log(`\n   📄 Página ${pageCount}: ${places.length} estabelecimentos`);

        if (places.length === 0) {
          console.log(`   ⚠️ Nenhum resultado nesta página`);
          break;
        }

        // Processa cada lugar da página
        for (const place of places) {
          // Evita processar o mesmo lugar duas vezes
          if (processedPlaceIds.has(place.place_id)) {
            continue;
          }
          processedPlaceIds.add(place.place_id);
          processedPlaces++;

          // Verifica se já existe no banco
          const { isDuplicate, reason } = await this.checkDuplicateEstablishment(
            campaign, 
            place.place_id, 
            null // Ainda não temos o telefone
          );

          if (isDuplicate) {
            duplicatesFound++;
            console.log(`   ⏭️ Duplicado (${reason}): ${place.name}`);
            continue;
          }

          // Busca detalhes (telefone)
          const details = await this.getPlaceDetails(place.place_id);
          await this.delay(150); // Rate limit

          if (!details || !details.phoneNumber) {
            console.log(`   ❌ Sem telefone: ${place.name}`);
            continue;
          }

          // Verifica duplicata por telefone
          const phoneCheck = await this.checkDuplicateEstablishment(
            campaign,
            place.place_id,
            details.phoneNumber
          );

          if (phoneCheck.isDuplicate) {
            duplicatesFound++;
            console.log(`   ⏭️ Telefone duplicado: ${place.name} (${details.phoneNumber})`);
            continue;
          }

          // Salva o lead
          console.log(`      💾 Salvando lead: ${place.name} - ${details.phoneNumber}`);
          const saved = await this.saveCampaignLead(campaign, {
            name: place.name,
            address: place.formatted_address,
            phoneNumber: details.phoneNumber,
            placeId: place.place_id,
            lat: place.geometry?.location?.lat,
            lng: place.geometry?.location?.lng,
          });

          if (saved) {
            savedLeads++;
            console.log(`   ✅ ${savedLeads}/${requiredLeads} - ${place.name}: ${details.phoneNumber}`);
            
            // Atualiza progresso
            const percent = Math.min(Math.round((savedLeads / requiredLeads) * 50), 50); // Busca = 0-50%
            this.updateProgress(campaign.id, {
              leadsFound: savedLeads,
              percent,
              currentAction: `${savedLeads}/${requiredLeads} leads encontrados`,
            });
            this.addLog(campaign.id, 'success', `${place.name}: ${details.phoneNumber}`);
            
            // Verifica se atingiu a meta
            if (savedLeads >= requiredLeads) {
              console.log(`   🎯 Meta atingida!`);
              this.addLog(campaign.id, 'success', 'Meta de leads atingida!');
              break;
            }
          } else {
            console.log(`   ⚠️ Falha ao salvar: ${place.name}`);
          }
        }

        // Se não tem próxima página, para
        if (!pageToken) {
          console.log(`   📄 Não há mais páginas disponíveis`);
          this.addLog(campaign.id, 'warning', 'Não há mais resultados disponíveis');
          break;
        }

        // Se muitos duplicados, continua buscando mais páginas
        const duplicateRate = duplicatesFound / processedPlaces;
        if (duplicateRate > 0.7 && savedLeads < requiredLeads) {
          console.log(`   ⚠️ Alta taxa de duplicados (${Math.round(duplicateRate * 100)}%), buscando mais páginas...`);
        }
      }

      // Resumo final
      console.log(`\n   ═══════════════════════════════════════`);
      console.log(`   📊 RESUMO DA BUSCA:`);
      console.log(`   ═══════════════════════════════════════`);
      console.log(`   📄 Páginas processadas: ${pageCount}`);
      console.log(`   🏢 Estabelecimentos analisados: ${processedPlaces}`);
      console.log(`   ⏭️ Duplicados ignorados: ${duplicatesFound}`);
      console.log(`   ✅ Leads salvos: ${savedLeads}`);
      console.log(`   🎯 Meta: ${requiredLeads}`);
      console.log(`   ═══════════════════════════════════════\n`);

      // Atualiza estatísticas da campanha
      await getSupabase()
        .from('campaigns')
        .update({ 
          total_leads: savedLeads,
          search_stats: {
            pagesProcessed: pageCount,
            establishmentsAnalyzed: processedPlaces,
            duplicatesIgnored: duplicatesFound,
            leadsFound: savedLeads,
            targetLeads: requiredLeads,
            searchedAt: new Date().toISOString(),
          }
        })
        .eq('id', campaign.id);

      // Atualiza status para validação e continua automaticamente
      if (savedLeads > 0) {
        await this.updateCampaignStatus(campaign.id, 'validating');
        
        // Continua automaticamente para validação
        console.log(`\n🔄 Continuando para validação de WhatsApp...`);
        const updatedCampaign = { ...campaign, status: 'validating' };
        setTimeout(() => this.validateWhatsAppNumbers(updatedCampaign), 1000);
      } else {
        await this.updateCampaignStatus(campaign.id, 'draft', 'Nenhum estabelecimento novo com telefone encontrado');
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
    try {
      // Normaliza telefone
      const phoneNumber = this.normalizePhone(place.phoneNumber);
      
      if (!phoneNumber) {
        console.log(`      ⚠️ Telefone inválido para ${place.name}`);
        return null;
      }

      // Verifica se já existe NESTA campanha por telefone
      const { data: existingInCampaign } = await getSupabase()
        .from('campaign_leads')
        .select('id')
        .eq('campaign_id', campaign.id)
        .eq('phone_number', phoneNumber)
        .maybeSingle();

      if (existingInCampaign) {
        console.log(`      ⏭️ Telefone duplicado nesta campanha: ${place.name}`);
        return null; // Retorna null para não contar como salvo
      }

      // Verifica se já existe NESTA campanha por nome (evita duplicatas de nome)
      const { data: existingByName } = await getSupabase()
        .from('campaign_leads')
        .select('id')
        .eq('campaign_id', campaign.id)
        .eq('business_name', place.name)
        .maybeSingle();

      if (existingByName) {
        console.log(`      ⏭️ Estabelecimento duplicado: ${place.name}`);
        return null;
      }

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
        console.error(`      ❌ Erro ao salvar lead ${place.name}:`, error.message);
        return null;
      }

      return data;
    } catch (err) {
      console.error(`      ❌ Exceção ao salvar lead ${place.name}:`, err.message);
      return null;
    }
  }

  // ==================== VALIDAÇÃO DE WHATSAPP ====================

  /**
   * Valida números de WhatsApp dos leads
   */
  async validateWhatsAppNumbers(campaign) {
    console.log(`\n📱 ETAPA 2: Validando números de WhatsApp...`);
    
    // Atualiza progresso
    this.updateProgress(campaign.id, {
      stage: 'validating',
      stageLabel: 'Validando WhatsApp...',
      percent: 50,
      currentAction: 'Conectando à Evolution API',
    });
    this.addLog(campaign.id, 'info', 'Iniciando validação de WhatsApp');

    // Busca instância do usuário
    const { data: instance, error: instanceError } = await getSupabase()
      .from('evolution_instances')
      .select('*')
      .eq('user_id', campaign.user_id)
      .eq('status', 'connected')
      .single();

    if (instanceError || !instance) {
      console.error('❌ Instância WhatsApp não conectada');
      this.addLog(campaign.id, 'error', 'WhatsApp não conectado');
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
    console.log(`   🔗 Usando instância: ${instance.instance_name}`);
    this.addLog(campaign.id, 'info', `${leads.length} leads para validar`);

    let validCount = 0;
    let invalidCount = 0;
    let processedCount = 0;

    for (const lead of leads) {
      processedCount++;
      
      // Atualiza progresso (validação = 50-80%)
      const percent = 50 + Math.round((processedCount / leads.length) * 30);
      this.updateProgress(campaign.id, {
        percent,
        leadsValidated: processedCount,
        leadsValid: validCount,
        currentAction: `Validando ${processedCount}/${leads.length}`,
      });
      
      try {
        const cleanNumber = lead.phone_number.replace(/\D/g, '');
        console.log(`   🔍 [${processedCount}/${leads.length}] Validando: ${lead.business_name} (${cleanNumber})`);
        
        // Verifica se tem WhatsApp usando Evolution API
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
          this.addLog(campaign.id, 'success', `${lead.business_name}: WhatsApp válido`);
          this.updateProgress(campaign.id, { leadsValid: validCount });

          // Salva também na tabela leads (CRM)
          await this.saveToLeadsTable(campaign.user_id, lead, remoteJid);
        } else {
          invalidCount++;
          console.log(`   ❌ ${lead.business_name}: Sem WhatsApp`);
          this.addLog(campaign.id, 'warning', `${lead.business_name}: Sem WhatsApp`);
        }

        // Delay entre validações
        await this.delay(1000);

      } catch (error) {
        console.error(`   ⚠️ Erro ao validar ${lead.business_name}:`, error.message);
        this.addLog(campaign.id, 'error', `Erro ao validar ${lead.business_name}`);
        
        // Marca como inválido em caso de erro
        await getSupabase()
          .from('campaign_leads')
          .update({ whatsapp_valid: false })
          .eq('id', lead.id);
        
        invalidCount++;
      }
    }

    console.log(`\n   ═══════════════════════════════════════`);
    console.log(`   📊 RESUMO DA VALIDAÇÃO:`);
    console.log(`   ═══════════════════════════════════════`);
    console.log(`   ✅ WhatsApp válido: ${validCount}`);
    console.log(`   ❌ Sem WhatsApp: ${invalidCount}`);
    console.log(`   ═══════════════════════════════════════\n`);

    // Atualiza estatísticas e status
    await this.updateCampaignStats(campaign.id);

    if (validCount > 0) {
      await this.updateCampaignStatus(campaign.id, 'active');
      
      // Continua automaticamente para disparo
      console.log(`\n🚀 Iniciando disparos de mensagens...`);
      const updatedCampaign = { ...campaign, status: 'active' };
      setTimeout(() => this.processDispatch(updatedCampaign), 2000);
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
      this.addLog(campaign.id, 'error', 'WhatsApp desconectado');
      await this.updateCampaignStatus(campaign.id, 'paused', 'WhatsApp desconectado');
      return;
    }

    // Busca próximo lead pendente (não enviado e não falhou)
    const { data: leads } = await getSupabase()
      .from('campaign_leads')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('whatsapp_valid', true)
      .eq('message_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    // Conta mensagens enviadas e falhas
    const { count: sentCount } = await getSupabase()
      .from('campaign_leads')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id)
      .eq('message_status', 'sent');

    const { count: failedCount } = await getSupabase()
      .from('campaign_leads')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id)
      .eq('message_status', 'failed');

    const { count: totalValid } = await getSupabase()
      .from('campaign_leads')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id)
      .eq('whatsapp_valid', true);

    // Atualiza progresso com dados reais
    this.updateProgress(campaign.id, {
      messagesSent: sentCount || 0,
      messagesFailed: failedCount || 0,
      leadsValid: totalValid || 0,
    });

    if (!leads || leads.length === 0) {
      console.log('   ✅ Todos os leads foram processados!');
      this.addLog(campaign.id, 'success', `Campanha concluída! ${sentCount || 0} enviadas, ${failedCount || 0} falhas.`);
      this.updateProgress(campaign.id, {
        stage: 'completed',
        stageLabel: 'Concluída',
        percent: 100,
        messagesSent: sentCount || 0,
        messagesFailed: failedCount || 0,
      });
      await this.updateCampaignStatus(campaign.id, 'completed');
      return;
    }

    const lead = leads[0];
    // IMPORTANTE: A Evolution API espera apenas o número, sem @s.whatsapp.net
    // Remove qualquer sufixo do JID e mantém apenas os dígitos
    let destination = lead.phone_number.replace(/\D/g, '');
    if (lead.remote_jid) {
      // Extrai apenas o número do JID (ex: 5521999999999@s.whatsapp.net -> 5521999999999)
      destination = lead.remote_jid.replace(/@.*$/, '');
    }
    const messagesSent = sentCount || 0;

    // Atualiza progresso (disparo = 80-100%)
    const percent = 80 + Math.round((messagesSent / (totalValid || 1)) * 20);
    this.updateProgress(campaign.id, {
      stage: 'dispatching',
      stageLabel: 'Enviando mensagens...',
      percent,
      messagesSent,
      currentAction: `Enviando para ${lead.business_name}`,
    });

    console.log(`   🏢 ${lead.business_name}`);
    console.log(`   📞 Número: ${destination}`);

    // Verifica se tem mensagem para enviar
    const messageText = campaign.message_template || '';
    if (!messageText.trim()) {
      console.log(`   ⚠️ Mensagem vazia, pulando...`);
      this.addLog(campaign.id, 'warning', `Mensagem vazia para ${lead.business_name}`);
      // Marca como enviado para não tentar novamente
      await getSupabase()
        .from('campaign_leads')
        .update({ message_status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', lead.id);
      await this.scheduleNextDispatchTime(campaign);
      return;
    }

    try {
      // 1. Envia texto primeiro usando formato Evolution API v1
      console.log(`   📝 Enviando mensagem de texto...`);
      console.log(`   📄 Texto: ${messageText.substring(0, 50)}...`);
      
      const payload = {
        number: destination,
        text: messageText,
        options: {
          delay: 1200,
          presence: 'composing',
        },
      };
      
      console.log(`   🔗 URL: ${getEvolutionUrl()}/message/sendText/${instance.instance_name}`);
      
      const textResponse = await axios.post(
        `${getEvolutionUrl()}/message/sendText/${instance.instance_name}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': getEvolutionKey(),
          },
        }
      );

      console.log(`   ✅ Texto enviado! ID: ${textResponse.data?.key?.id || 'N/A'}`);

      // 2. Envia mídias DEPOIS do texto usando formato Evolution API v1
      const mediaFiles = campaign.media_files || [];
      if (mediaFiles.length > 0) {
        console.log(`   📁 Enviando ${mediaFiles.length} arquivo(s) de mídia...`);

        for (let i = 0; i < mediaFiles.length; i++) {
          const media = mediaFiles[i];
          
          // Delay entre mídias para não sobrecarregar
          await this.delay(3000);

          try {
            // Determina o mediaType correto baseado no tipo ou mimeType
            let mediaType = 'document';
            const mimeType = media.mimeType || '';
            
            if (media.type === 'image' || mimeType.startsWith('image/')) {
              mediaType = 'image';
            } else if (media.type === 'video' || mimeType.startsWith('video/')) {
              mediaType = 'video';
            } else if (media.type === 'audio' || mimeType.startsWith('audio/')) {
              mediaType = 'audio';
            }

            console.log(`   📤 Enviando ${mediaType}: ${media.fileName || 'arquivo'}`);

            const mediaPayload = {
              number: destination,
              options: {
                delay: 1200,
                presence: 'composing',
              },
              mediaMessage: {
                mediaType: mediaType,
                media: media.url, // URL pública ou Base64
              },
            };

            // Adiciona fileName para documentos
            if (media.fileName) {
              mediaPayload.mediaMessage.fileName = media.fileName;
            }

            // Adiciona caption se houver (opcional)
            if (media.caption) {
              mediaPayload.mediaMessage.caption = media.caption;
            }

            const mediaResponse = await axios.post(
              `${getEvolutionUrl()}/message/sendMedia/${instance.instance_name}`,
              mediaPayload,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': getEvolutionKey(),
                },
              }
            );

            console.log(`   ✅ ${mediaType} ${i + 1}/${mediaFiles.length} enviado! ID: ${mediaResponse.data?.key?.id || 'N/A'}`);
            this.addLog(campaign.id, 'success', `Mídia enviada: ${media.fileName || mediaType}`);
          } catch (mediaError) {
            const errorMsg = mediaError.response?.data?.message || mediaError.message;
            console.error(`   ⚠️ Erro ao enviar ${media.type || 'mídia'}:`, errorMsg);
            this.addLog(campaign.id, 'error', `Erro ao enviar mídia: ${errorMsg}`);
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
      this.addLog(campaign.id, 'success', `Mensagem enviada para ${lead.business_name}`);
      this.updateProgress(campaign.id, { 
        messagesSent: (messagesSent || 0) + 1,
        currentAction: `Enviado para ${lead.business_name}`,
      });

      console.log(`   ✅ Mensagem enviada com sucesso!`);

    } catch (error) {
      // Mostra detalhes do erro
      const errorDetails = error.response?.data || error.message;
      console.error(`   ❌ Erro ao enviar:`, JSON.stringify(errorDetails, null, 2));
      
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
      this.addLog(campaign.id, 'error', `Falha: ${lead.business_name} - ${errorMsg}`);

      // Marca como falha
      await getSupabase()
        .from('campaign_leads')
        .update({
          message_status: 'failed',
          error_message: typeof errorDetails === 'object' ? JSON.stringify(errorDetails) : errorMsg,
        })
        .eq('id', lead.id);

      await getSupabase()
        .from('campaigns')
        .update({
          failed_messages: (campaign.failed_messages || 0) + 1,
        })
        .eq('id', campaign.id);

      await this.logMessage(campaign.id, lead, 'failed', error.message);
      this.updateProgress(campaign.id, { 
        messagesFailed: (campaign.failed_messages || 0) + 1,
      });
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

    const { error } = await getSupabase()
      .from('campaigns')
      .update(updateData)
      .eq('id', campaignId);

    if (error) {
      console.error(`   ❌ Erro ao atualizar status: ${error.message}`);
    } else {
      console.log(`   📊 Status atualizado: ${status}`);
    }
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
        total_leads: validLeads, // Usa apenas leads válidos como total
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
      console.log(`\n📋 Buscando campanha: ${campaignId}`);
      
      const supabaseClient = getSupabase();
      if (!supabaseClient) {
        console.error('❌ Supabase não configurado');
        return { success: false, message: 'Erro de configuração do banco de dados' };
      }

      const { data: campaign, error } = await supabaseClient
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      console.log(`   📊 Resultado da busca:`, { campaign: campaign?.id, error: error?.message });

      if (error) {
        console.error('❌ Erro ao buscar campanha:', error);
        return { success: false, message: `Erro ao buscar campanha: ${error.message}` };
      }

      if (!campaign) {
        console.error('❌ Campanha não encontrada no banco');
        return { success: false, message: 'Campanha não encontrada' };
      }

      console.log(`   ✅ Campanha encontrada: ${campaign.name} (status: ${campaign.status})`);
      

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

    // Calcula próximo disparo respeitando o intervalo configurado
    const scheduleConfig = campaign.schedule_config || {};
    const minInterval = scheduleConfig.minIntervalMinutes || scheduleConfig.minInterval || 10;
    const maxInterval = scheduleConfig.maxIntervalMinutes || scheduleConfig.maxInterval || 20;
    const intervalMs = (Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval) * 60 * 1000;
    
    const nextDispatchAt = new Date(Date.now() + intervalMs);

    // Atualiza status e agenda próximo disparo
    await getSupabase()
      .from('campaigns')
      .update({
        status: 'active',
        next_dispatch_at: nextDispatchAt.toISOString(),
      })
      .eq('id', campaignId);

    console.log(`   📊 Status atualizado: active`);
    console.log(`   ⏰ Próximo disparo agendado para: ${nextDispatchAt.toLocaleTimeString('pt-BR')}`);

    // Agenda o disparo para o horário correto (não imediatamente)
    this.scheduleDispatch({ ...campaign, status: 'active' }, intervalMs);

    const minutes = Math.round(intervalMs / 60000);
    return { 
      success: true, 
      message: `Campanha retomada! Próximo envio em ${minutes} minutos. ${pendingLeads.length} leads pendentes.` 
    };
  }

  // ==================== CAMPANHAS PROGRAMADAS ====================

  /**
   * Verifica se uma campanha programada deve iniciar agora
   */
  shouldStartScheduledCampaign(campaign) {
    const scheduled = campaign.scheduled_dispatch;
    if (!scheduled || !scheduled.enabled) return false;

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0=Dom, 1=Seg, ..., 6=Sab
    const currentDate = now.toISOString().split('T')[0];

    // Verifica se está dentro do período
    if (scheduled.startDate && currentDate < scheduled.startDate) return false;
    if (scheduled.endDate && currentDate > scheduled.endDate) return false;

    // Verifica se é um dia permitido
    const daysOfWeek = scheduled.daysOfWeek || [1, 2, 3, 4, 5];
    if (!daysOfWeek.includes(currentDay)) return false;

    // Verifica se está no horário permitido
    const startHour = scheduled.startHour || 9;
    const endHour = scheduled.endHour || 18;
    if (currentHour < startHour || currentHour >= endHour) return false;

    // Verifica limite de mensagens por dia
    const messagesPerDay = scheduled.messagesPerDay || 50;
    const messagesToday = campaign.messages_today || 0;
    const messagesTodayDate = campaign.messages_today_date;

    // Se é um novo dia, reseta o contador
    if (messagesTodayDate !== currentDate) {
      return true; // Pode iniciar
    }

    // Verifica se ainda pode enviar mais mensagens hoje
    return messagesToday < messagesPerDay;
  }

  /**
   * Inicia uma campanha programada
   */
  async startScheduledCampaign(campaign) {
    try {
      // Verifica WhatsApp
      const instanceCheck = await this.checkWhatsAppInstance(campaign.user_id);
      if (!instanceCheck.connected) {
        console.log(`   ⚠️ WhatsApp não conectado para campanha ${campaign.name}`);
        return;
      }

      // Reseta contador de mensagens se é um novo dia
      const today = new Date().toISOString().split('T')[0];
      if (campaign.messages_today_date !== today) {
        await getSupabase()
          .from('campaigns')
          .update({
            messages_today: 0,
            messages_today_date: today,
          })
          .eq('id', campaign.id);
      }

      // Atualiza status para active
      await this.updateCampaignStatus(campaign.id, 'active');

      // Processa disparo
      setTimeout(() => this.processDispatch({ ...campaign, status: 'active' }), 100);

      console.log(`   ✅ Campanha programada iniciada: ${campaign.name}`);
    } catch (error) {
      console.error(`   ❌ Erro ao iniciar campanha programada:`, error);
    }
  }

  /**
   * Programa uma campanha para disparo futuro
   */
  async scheduleCampaign(campaignId, scheduleConfig) {
    try {
      const nextScheduledAt = this.calculateNextDispatchTime(scheduleConfig);

      await getSupabase()
        .from('campaigns')
        .update({
          status: 'scheduled',
          scheduled_dispatch: {
            enabled: true,
            ...scheduleConfig,
          },
          next_scheduled_at: nextScheduledAt?.toISOString() || null,
        })
        .eq('id', campaignId);

      return {
        success: true,
        message: nextScheduledAt 
          ? `Campanha programada para ${nextScheduledAt.toLocaleString('pt-BR')}`
          : 'Campanha programada',
        nextScheduledAt,
      };
    } catch (error) {
      console.error('Erro ao programar campanha:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Calcula o próximo horário de disparo
   */
  calculateNextDispatchTime(config) {
    if (!config || !config.enabled) return null;

    const now = new Date();
    const startDate = config.startDate ? new Date(config.startDate) : now;
    const endDate = config.endDate ? new Date(config.endDate) : null;
    const daysOfWeek = config.daysOfWeek || [1, 2, 3, 4, 5];
    const startHour = config.startHour || 9;
    const endHour = config.endHour || 18;

    // Começa pela data atual ou data de início
    let checkDate = new Date(Math.max(now.getTime(), startDate.getTime()));

    // Procura o próximo horário válido (máximo 14 dias)
    for (let i = 0; i < 14; i++) {
      const dayOfWeek = checkDate.getDay();

      if (daysOfWeek.includes(dayOfWeek)) {
        // É um dia válido
        if (endDate && checkDate > endDate) {
          return null; // Passou da data final
        }

        const currentHour = checkDate.getHours();

        if (checkDate.toDateString() === now.toDateString()) {
          // É hoje
          if (currentHour < endHour) {
            // Ainda dá tempo hoje
            const nextHour = Math.max(startHour, currentHour + 1);
            checkDate.setHours(nextHour, 0, 0, 0);
            return checkDate;
          }
        } else {
          // Dia futuro
          checkDate.setHours(startHour, 0, 0, 0);
          return checkDate;
        }
      }

      // Avança para o próximo dia
      checkDate.setDate(checkDate.getDate() + 1);
      checkDate.setHours(0, 0, 0, 0);
    }

    return null;
  }

  /**
   * Atualiza próximo horário de disparo após enviar mensagem
   */
  async updateNextScheduledDispatch(campaign) {
    const scheduled = campaign.scheduled_dispatch;
    if (!scheduled || !scheduled.enabled) return;

    // Incrementa contador de mensagens do dia
    const today = new Date().toISOString().split('T')[0];
    const messagesToday = (campaign.messages_today_date === today ? campaign.messages_today : 0) + 1;
    const messagesPerDay = scheduled.messagesPerDay || 50;

    // Calcula próximo horário
    let nextScheduledAt = null;
    let newStatus = campaign.status;

    if (messagesToday >= messagesPerDay) {
      // Atingiu limite do dia, programa para amanhã
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(scheduled.startHour || 9, 0, 0, 0);
      
      nextScheduledAt = this.calculateNextDispatchTime({
        ...scheduled,
        startDate: tomorrow.toISOString().split('T')[0],
      });

      // Pausa até amanhã
      newStatus = 'scheduled';
      console.log(`   📅 Limite diário atingido (${messagesToday}/${messagesPerDay}). Próximo: ${nextScheduledAt?.toLocaleString('pt-BR')}`);
    } else {
      // Ainda pode enviar hoje
      nextScheduledAt = this.calculateNextDispatchTime(scheduled);
    }

    // Verifica se a campanha terminou
    if (scheduled.endDate && new Date() > new Date(scheduled.endDate + 'T23:59:59')) {
      newStatus = 'completed';
      nextScheduledAt = null;
      console.log(`   ✅ Campanha programada concluída (período encerrado)`);
    }

    await getSupabase()
      .from('campaigns')
      .update({
        status: newStatus,
        messages_today: messagesToday,
        messages_today_date: today,
        next_scheduled_at: nextScheduledAt?.toISOString() || null,
        last_dispatch_at: new Date().toISOString(),
      })
      .eq('id', campaign.id);
  }

  // ==================== FIM CAMPANHAS PROGRAMADAS ====================

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
