import axios from 'axios';
import { supabase } from './supabaseService';

// Usa URL relativa - o Vite proxy redireciona para o backend em dev
// Em produção, o mesmo servidor serve frontend e API
const PROXY_URL = '';

export interface PlaceResult {
  name: string;
  businessType: string;
  phoneNumber?: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  placeId: string;
}

export class PlacesService {
  private static processedPlaceIds = new Set<string>();

  /**
   * Busca estabelecimentos com paginação automática e busca de telefones
   * Baseado no sistema antigo de prospecção
   */
  static async searchPlaces(
    query: string,
    city: string,
    state: string,
    country: string = 'Brasil',
    minResults: number = 20,
    maxPages: number = 3,
    onPlaceFound?: (place: PlaceResult) => void
  ): Promise<PlaceResult[]> {
    try {
      console.log(`🔍 Buscando: ${query} em ${city}, ${state}, ${country}`);
      console.log(`📊 Meta: ${minResults} resultados, máximo ${maxPages} páginas`);

      const allPlaces: PlaceResult[] = [];
      let pageToken: string | undefined;
      let pageCount = 0;

      // Loop de paginação
      do {
        pageCount++;
        console.log(`\n📄 Página ${pageCount}/${maxPages}`);

        // Busca uma página de resultados
        const pageData = await this.searchPlacesPage(query, city, state, country, pageToken);

        if (pageData.status !== 'OK') {
          console.error(`❌ Erro na API: ${pageData.status}`);
          break;
        }

        // Processa cada resultado da página
        for (const place of pageData.results || []) {
          // Verifica duplicata em memória
          if (this.processedPlaceIds.has(place.place_id)) {
            console.log(`⏭️ Duplicata (memória): ${place.name}`);
            continue;
          }

          // Verifica se já foi prospectado no banco
          const jaProspectado = await this.checkIfAlreadyProspected(place.place_id);
          if (jaProspectado) {
            console.log(`⏭️ Já prospectado: ${place.name}`);
            this.processedPlaceIds.add(place.place_id);
            continue;
          }

          // Busca detalhes (telefone)
          console.log(`📞 Buscando telefone: ${place.name}`);
          const details = await this.getPlaceDetails(place.place_id);

          // Rate limiting: aguarda 1.5s entre requisições de detalhes
          await this.delay(1500);

          // Cria objeto do resultado
          const placeResult: PlaceResult = {
            name: place.name,
            businessType: place.types?.[0] || 'business',
            phoneNumber: details.phoneNumber,
            address: place.formatted_address,
            city: this.extractCity(place.formatted_address, city),
            state,
            country,
            latitude: place.geometry?.location?.lat,
            longitude: place.geometry?.location?.lng,
            placeId: place.place_id,
          };

          allPlaces.push(placeResult);
          this.processedPlaceIds.add(place.place_id);

          console.log(`✅ ${allPlaces.length}. ${place.name} ${details.phoneNumber ? '📞' : '❌'}`);
          
          // Callback em tempo real
          if (onPlaceFound) {
            onPlaceFound(placeResult);
          }
        }

        // Pega token da próxima página
        pageToken = pageData.next_page_token;

        // Se tem próxima página e não atingiu os limites
        if (pageToken && pageCount < maxPages && allPlaces.length < minResults) {
          console.log(`⏳ Aguardando 2s para próxima página...`);
          await this.delay(2000); // Google requer delay entre páginas
        }

      } while (pageToken && pageCount < maxPages && allPlaces.length < minResults);

      console.log(`\n✅ Busca concluída!`);
      console.log(`📊 Total: ${allPlaces.length} estabelecimentos`);
      console.log(`📞 Com telefone: ${allPlaces.filter(p => p.phoneNumber).length}`);

      return allPlaces;
    } catch (error) {
      console.error('❌ Erro na busca:', error);
      throw error;
    }
  }

  /**
   * Busca uma página de resultados
   */
  private static async searchPlacesPage(
    query: string,
    city: string,
    state: string,
    country: string,
    pageToken?: string
  ): Promise<any> {
    const response = await axios.post(`${PROXY_URL}/api/places/search`, {
      query,
      city,
      state,
      country,
      pageToken,
    });
    return response.data;
  }

  /**
   * Verifica se place_id já foi prospectado
   */
  private static async checkIfAlreadyProspected(placeId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('campaign_leads')
        .select('id')
        .eq('google_place_id', placeId)
        .limit(1);

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Erro ao verificar duplicata:', error);
      return false;
    }
  }

  /**
   * Delay helper
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Busca detalhes de um lugar específico (telefone)
   */
  static async getPlaceDetails(placeId: string): Promise<{ phoneNumber?: string }> {
    try {
      const response = await axios.post(`${PROXY_URL}/api/places/details`, {
        placeId,
      });

      if (response.data.status === 'OK' && response.data.result) {
        const result = response.data.result;
        const phoneNumber = result.international_phone_number || result.formatted_phone_number;
        
        return { phoneNumber };
      }

      return {};
    } catch (error) {
      console.error('Erro ao buscar detalhes:', error);
      return {};
    }
  }

  /**
   * Extrai cidade do endereço formatado
   */
  private static extractCity(address: string, fallback: string): string {
    // Formato típico: "Rua X, Bairro - Cidade - Estado, CEP, País"
    const parts = address.split('-');
    if (parts.length >= 2) {
      return parts[1].trim().split(',')[0].trim();
    }
    return fallback;
  }

  /**
   * Normaliza número de telefone para formato internacional
   */
  static normalizePhoneNumber(phone: string, countryCode: string = '55'): string {
    // Remove todos os caracteres não numéricos
    let cleaned = phone.replace(/\D/g, '');

    // Se não tem código do país, adiciona
    if (!cleaned.startsWith(countryCode)) {
      cleaned = countryCode + cleaned;
    }

    return cleaned;
  }

  /**
   * Valida se o número de telefone parece válido
   */
  static isValidPhoneNumber(phone: string): boolean {
    if (!phone) return false;

    // Remove caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '');

    // Número brasileiro deve ter 12-13 dígitos (com código do país)
    // 55 (país) + 11 (DDD) + 9XXXX-XXXX (celular) = 13 dígitos
    // 55 (país) + 11 (DDD) + XXXX-XXXX (fixo) = 12 dígitos
    return cleaned.length >= 10 && cleaned.length <= 13;
  }
}
