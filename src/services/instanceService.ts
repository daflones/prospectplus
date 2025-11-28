import { supabase } from './supabaseService';
import type { EvolutionInstance } from '../types';

export class InstanceService {
  /**
   * Salva ou atualiza uma instância no banco de dados
   */
  static async saveInstance(instanceData: {
    userId: string;
    instanceName: string;
    instanceId: string;
    phoneNumber: string;
    status: string;
  }): Promise<EvolutionInstance> {
    try {
      // Primeiro tenta atualizar se já existir
      const { data: existing } = await supabase
        .from('evolution_instances')
        .select('id')
        .eq('user_id', instanceData.userId)
        .single();

      let data, error;

      if (existing) {
        // Atualiza
        const result = await supabase
          .from('evolution_instances')
          .update({
            instance_name: instanceData.instanceName,
            instance_id: instanceData.instanceId,
            phone_number: instanceData.phoneNumber,
            status: instanceData.status,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', instanceData.userId)
          .select()
          .single();
        
        data = result.data;
        error = result.error;
      } else {
        // Insere novo
        const apiKey = import.meta.env.VITE_EVOLUTION_API_KEY || 'default-key';
        
        const result = await supabase
          .from('evolution_instances')
          .insert({
            user_id: instanceData.userId,
            instance_name: instanceData.instanceName,
            instance_id: instanceData.instanceId,
            phone_number: instanceData.phoneNumber,
            status: instanceData.status,
            token: apiKey,
            apikey: apiKey,
          })
          .select()
          .single();
        
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      return {
        id: data.id,
        userId: data.user_id,
        instanceName: data.instance_name,
        instanceId: data.instance_id,
        userName: data.profile_name || data.instance_name,
        phoneNumber: data.phone_number,
        status: data.status,
        token: data.token || '',
        apikey: data.apikey || '',
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    } catch (error) {
      console.error('Error saving instance:', error);
      throw error;
    }
  }

  /**
   * Busca a instância do usuário
   */
  static async getUserInstance(userId: string): Promise<EvolutionInstance | null> {
    try {
      const { data, error } = await supabase
        .from('evolution_instances')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Não encontrado
        throw error;
      }

      return {
        id: data.id,
        userId: data.user_id,
        instanceName: data.instance_name,
        instanceId: data.instance_id,
        userName: data.profile_name || data.instance_name,
        phoneNumber: data.phone_number,
        status: data.status,
        token: data.token || '',
        apikey: data.apikey || '',
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    } catch (error) {
      console.error('Error fetching user instance:', error);
      throw error;
    }
  }

  /**
   * Atualiza o status da instância
   */
  static async updateInstanceStatus(instanceName: string, status: string, additionalData?: any): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (additionalData?.owner) updateData.owner = additionalData.owner;
      if (additionalData?.profileName) updateData.profile_name = additionalData.profileName;
      if (additionalData?.profilePictureUrl) updateData.profile_picture_url = additionalData.profilePictureUrl;

      const { error } = await supabase
        .from('evolution_instances')
        .update(updateData)
        .eq('instance_name', instanceName);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating instance status:', error);
      throw error;
    }
  }

  /**
   * Deleta a instância do banco de dados
   */
  static async deleteInstance(instanceName: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('evolution_instances')
        .delete()
        .eq('instance_name', instanceName);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting instance:', error);
      throw error;
    }
  }
}
