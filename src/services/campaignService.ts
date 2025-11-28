import { supabase } from './supabaseService';

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: 'prospecting' | 'follow_up' | 'nurture';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  targetAudience?: {
    searchQuery?: string;
    location?: {
      city?: string;
      state?: string;
      country?: string;
    };
  };
  messageTemplate?: string;
  scheduleConfig?: {
    messageType?: 'default' | 'custom';
    minIntervalMinutes?: number;
    maxIntervalMinutes?: number;
    minInterval?: number; // Deprecated
    maxInterval?: number; // Deprecated
  };
  instanceId?: string;
  totalLeads: number;
  sentMessages: number;
  deliveredMessages: number;
  readMessages: number;
  repliedMessages: number;
  failedMessages: number;
  currentDispatchLeadId?: string; // Lead sendo processado agora
  nextDispatchAt?: Date; // Próximo disparo
  estimatedCompletionAt?: Date; // Previsão de término
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignLead {
  id: string;
  campaignId: string;
  userId: string;
  businessName: string;
  businessType?: string;
  phoneNumber: string;
  whatsappNumber?: string;
  remoteJid?: string; // JID do WhatsApp (ex: 5511999999999@s.whatsapp.net)
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  whatsappValid: boolean;
  whatsappCheckedAt?: Date;
  messageStatus: 'pending' | 'sent' | 'failed' | 'invalid_number';
  messageSentAt?: Date;
  messageError?: string;
  convertedToLead: boolean;
  leadId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignMessageLog {
  id: string;
  campaignId: string;
  leadId: string;
  phoneNumber: string;
  status: 'pending' | 'sent' | 'failed' | 'scheduled';
  messageId?: string;
  errorMessage?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class CampaignService {
  /**
   * Cria uma nova campanha
   */
  static async createCampaign(campaignData: {
    userId: string;
    name: string;
    description?: string;
    searchQuery: string;
    locationCity?: string;
    locationState?: string;
    locationCountry?: string;
    messageType: 'default' | 'custom';
    messageContent: string;
    minIntervalMinutes?: number;
    maxIntervalMinutes?: number;
  }): Promise<Campaign> {
    try {
      // Monta o target_audience com os filtros de busca
      const targetAudience = {
        searchQuery: campaignData.searchQuery,
        location: {
          city: campaignData.locationCity,
          state: campaignData.locationState,
          country: campaignData.locationCountry || 'Brasil',
        },
      };

      // Monta o schedule_config com os intervalos
      const scheduleConfig = {
        messageType: campaignData.messageType,
        minIntervalMinutes: campaignData.minIntervalMinutes || 10,
        maxIntervalMinutes: campaignData.maxIntervalMinutes || 20,
      };

      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          user_id: campaignData.userId,
          name: campaignData.name,
          description: campaignData.description,
          type: 'whatsapp',
          status: 'draft',
          target_audience: targetAudience,
          message_template: campaignData.messageContent,
          schedule_config: scheduleConfig,
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapCampaign(data);
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }

  /**
   * Busca campanhas do usuário
   */
  static async getUserCampaigns(userId: string): Promise<Campaign[]> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapCampaign);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  }

  /**
   * Busca uma campanha específica
   */
  static async getCampaign(campaignId: string): Promise<Campaign | null> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.mapCampaign(data);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      throw error;
    }
  }

  /**
   * Atualiza status da campanha
   */
  static async updateCampaignStatus(
    campaignId: string,
    status: Campaign['status']
  ): Promise<void> {
    try {
      const updateData: any = { status };

      if (status === 'active' && !updateData.started_at) {
        updateData.started_at = new Date().toISOString();
      }

      if (status === 'completed' || status === 'cancelled') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', campaignId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating campaign status:', error);
      throw error;
    }
  }

  /**
   * Deleta uma campanha e todos os dados relacionados
   */
  static async deleteCampaign(campaignId: string): Promise<void> {
    try {
      // Deleta logs de mensagens
      await supabase
        .from('campaign_message_log')
        .delete()
        .eq('campaign_id', campaignId);

      // Deleta leads
      await supabase
        .from('campaign_leads')
        .delete()
        .eq('campaign_id', campaignId);

      // Deleta campanha
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }
  }

  /**
   * Duplica uma campanha existente
   */
  static async duplicateCampaign(campaignId: string, userId: string): Promise<Campaign> {
    try {
      // Busca campanha original
      const originalCampaign = await this.getCampaign(campaignId);
      if (!originalCampaign) {
        throw new Error('Campanha não encontrada');
      }

      // Cria nova campanha com dados da original
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          user_id: userId,
          name: `${originalCampaign.name} (Cópia)`,
          description: originalCampaign.description,
          type: originalCampaign.type,
          status: 'draft',
          target_audience: originalCampaign.targetAudience,
          message_template: originalCampaign.messageTemplate,
          schedule_config: originalCampaign.scheduleConfig,
          instance_id: originalCampaign.instanceId,
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapCampaign(data);
    } catch (error) {
      console.error('Error duplicating campaign:', error);
      throw error;
    }
  }

  /**
   * Adiciona lead à campanha
   */
  static async addCampaignLead(leadData: {
    campaignId: string;
    userId: string;
    businessName: string;
    businessType?: string;
    phoneNumber: string;
    whatsappNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    googlePlaceId?: string;
  }): Promise<CampaignLead> {
    try {
      const { data, error } = await supabase
        .from('campaign_leads')
        .insert({
          campaign_id: leadData.campaignId,
          user_id: leadData.userId,
          business_name: leadData.businessName,
          business_type: leadData.businessType,
          phone_number: leadData.phoneNumber,
          whatsapp_number: leadData.whatsappNumber,
          address: leadData.address,
          city: leadData.city,
          state: leadData.state,
          country: leadData.country,
          latitude: leadData.latitude,
          longitude: leadData.longitude,
          google_place_id: leadData.googlePlaceId,
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapCampaignLead(data);
    } catch (error) {
      console.error('Error adding campaign lead:', error);
      throw error;
    }
  }

  /**
   * Busca leads da campanha
   */
  static async getCampaignLeads(campaignId: string): Promise<CampaignLead[]> {
    try {
      const { data, error } = await supabase
        .from('campaign_leads')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapCampaignLead);
    } catch (error) {
      console.error('Error fetching campaign leads:', error);
      throw error;
    }
  }

  /**
   * Atualiza validação de WhatsApp e salva o remoteJid
   */
  static async updateLeadWhatsAppValidation(
    leadId: string, 
    isValid: boolean, 
    remoteJid?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('campaign_leads')
        .update({
          whatsapp_valid: isValid,
          whatsapp_checked_at: new Date().toISOString(),
          remote_jid: remoteJid || null,
        })
        .eq('id', leadId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating WhatsApp validation:', error);
      throw error;
    }
  }

  /**
   * Converte um campaign lead para a tabela leads (CRM)
   */
  static async convertCampaignLeadToLead(
    campaignLeadId: string,
    userId: string,
    name: string,
    phone: string,
    remoteJid?: string,
    address?: string,
    city?: string,
    state?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('leads')
        .insert({
          user_id: userId,
          name: name,
          phone: phone,
          whatsapp: phone,
          remote_jid: remoteJid,
          address: address,
          city: city,
          state: state,
          source: 'Campanha',
          status: 'new',
          tags: ['campanha', 'google-maps'],
        });

      if (error) throw error;

      // Atualiza o campaign_lead para marcar que foi convertido
      await supabase
        .from('campaign_leads')
        .update({ converted_to_lead: true })
        .eq('id', campaignLeadId);
    } catch (error) {
      console.error('Error converting campaign lead to lead:', error);
      throw error;
    }
  }

  /**
   * Atualiza status de envio de mensagem
   */
  static async updateMessageStatus(
    leadId: string,
    status: 'sent' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('campaign_leads')
        .update({
          message_status: status,
          message_sent_at: status === 'sent' ? new Date().toISOString() : undefined,
          message_error: errorMessage,
        })
        .eq('id', leadId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating message status:', error);
      throw error;
    }
  }

  /**
   * Registra log de mensagem enviada
   */
  static async logMessage(logData: {
    campaignId: string;
    campaignLeadId: string;
    userId: string;
    phoneNumber: string;
    messageContent: string;
    status: 'sent' | 'failed' | 'invalid_number';
    errorMessage?: string;
    evolutionResponse?: any;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('campaign_message_log')
        .insert({
          campaign_id: logData.campaignId,
          campaign_lead_id: logData.campaignLeadId,
          user_id: logData.userId,
          phone_number: logData.phoneNumber,
          message_content: logData.messageContent,
          status: logData.status,
          error_message: logData.errorMessage,
          evolution_response: logData.evolutionResponse,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error logging message:', error);
      throw error;
    }
  }

  /**
   * Atualiza estatísticas da campanha
   */
  static async updateCampaignStats(campaignId: string): Promise<void> {
    try {
      const { data: leads } = await supabase
        .from('campaign_leads')
        .select('message_status')
        .eq('campaign_id', campaignId);

      if (!leads) return;

      const stats = {
        total_leads: leads.length,
        sent_messages: leads.filter(l => l.message_status === 'sent').length,
        failed_messages: leads.filter(l => l.message_status === 'failed').length,
      };

      const { error } = await supabase
        .from('campaigns')
        .update(stats)
        .eq('id', campaignId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating campaign stats:', error);
      throw error;
    }
  }

  /**
   * Atualiza progresso em tempo real da campanha
   */
  static async updateCampaignProgress(
    campaignId: string,
    currentLeadId: string,
    nextDispatchAt: Date,
    estimatedCompletionAt: Date
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          current_dispatch_lead_id: currentLeadId,
          next_dispatch_at: nextDispatchAt.toISOString(),
          estimated_completion_at: estimatedCompletionAt.toISOString(),
        })
        .eq('id', campaignId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating campaign progress:', error);
      throw error;
    }
  }

  private static mapCampaign(data: any): Campaign {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      description: data.description,
      type: data.type,
      status: data.status,
      targetAudience: data.target_audience,
      messageTemplate: data.message_template,
      scheduleConfig: data.schedule_config,
      instanceId: data.instance_id,
      totalLeads: data.total_leads || 0,
      sentMessages: data.sent_messages || 0,
      deliveredMessages: data.delivered_messages || 0,
      readMessages: data.read_messages || 0,
      repliedMessages: data.replied_messages || 0,
      failedMessages: data.failed_messages || 0,
      currentDispatchLeadId: data.current_dispatch_lead_id,
      nextDispatchAt: data.next_dispatch_at ? new Date(data.next_dispatch_at) : undefined,
      estimatedCompletionAt: data.estimated_completion_at ? new Date(data.estimated_completion_at) : undefined,
      startDate: data.start_date ? new Date(data.start_date) : undefined,
      endDate: data.end_date ? new Date(data.end_date) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Busca logs de mensagens de uma campanha
   */
  static async getCampaignLogs(campaignId: string): Promise<CampaignMessageLog[]> {
    const { data, error } = await supabase
      .from('campaign_message_log')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching campaign logs:', error);
      throw error;
    }

    return (data || []).map(this.mapCampaignLog);
  }

  private static mapCampaignLog(data: any): CampaignMessageLog {
    return {
      id: data.id,
      campaignId: data.campaign_id,
      leadId: data.lead_id,
      phoneNumber: data.phone_number,
      status: data.status,
      messageId: data.message_id,
      errorMessage: data.error_message,
      sentAt: data.sent_at ? new Date(data.sent_at) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private static mapCampaignLead(data: any): CampaignLead {
    return {
      id: data.id,
      campaignId: data.campaign_id,
      userId: data.user_id,
      businessName: data.business_name,
      businessType: data.business_type,
      phoneNumber: data.phone_number,
      whatsappNumber: data.whatsapp_number,
      remoteJid: data.remote_jid,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country,
      latitude: data.latitude,
      longitude: data.longitude,
      googlePlaceId: data.google_place_id,
      whatsappValid: data.whatsapp_valid,
      whatsappCheckedAt: data.whatsapp_checked_at ? new Date(data.whatsapp_checked_at) : undefined,
      messageStatus: data.message_status,
      messageSentAt: data.message_sent_at ? new Date(data.message_sent_at) : undefined,
      messageError: data.message_error,
      convertedToLead: data.converted_to_lead,
      leadId: data.lead_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
