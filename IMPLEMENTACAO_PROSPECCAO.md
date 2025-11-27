# 🚀 Implementação do Sistema de Prospecção

## ✅ Status Atual

### **O que já está funcionando:**
1. ✅ Estrutura de campanhas completa
2. ✅ Integração com Evolution API (WhatsApp)
3. ✅ Validação de números WhatsApp
4. ✅ Envio de mensagens automatizado
5. ✅ Sistema de leads (`campaign_leads`)
6. ✅ Logs de mensagens (`campaign_message_log`)
7. ✅ Disparo com intervalo aleatório (10-20 min)

### **O que precisa ser melhorado:**
1. ⚠️ Google Places API com CORS (usando MOCK)
2. ⚠️ Paginação de resultados (múltiplas páginas)
3. ⚠️ Busca de detalhes (telefone) por place_id
4. ⚠️ Detecção de duplicatas por place_id
5. ⚠️ Rate limiting inteligente
6. ⚠️ Sistema de proxies CORS

---

## 📊 Comparação: Sistema Antigo vs Atual

| Funcionalidade | Sistema Antigo | Sistema Atual | Status |
|----------------|----------------|---------------|--------|
| **Busca Estabelecimentos** | Google Maps Text Search | Google Places API | ⚠️ MOCK |
| **Paginação** | Até 3 páginas (60 resultados) | 1 página (3 resultados) | ⚠️ Implementar |
| **Busca Detalhes** | Place Details API | Não implementado | ❌ Falta |
| **Duplicatas** | Verifica por place_id | Não verifica | ❌ Falta |
| **Validação WhatsApp** | Evolution API | Evolution API | ✅ OK |
| **Envio Mensagens** | Evolution API | Evolution API | ✅ OK |
| **Logs** | `logs_prospeccao` | `campaign_message_log` | ✅ OK |
| **Leads** | `clientes` | `campaign_leads` | ✅ OK |
| **Rate Limiting** | 1.5s entre detalhes | Não tem | ⚠️ Implementar |
| **Proxy CORS** | Supabase Edge Function | Não tem | ❌ Falta |

---

## 🔧 Melhorias Necessárias

### **1. Resolver CORS do Google Places API**

**Opções:**

#### **A) Backend Proxy Node.js/Express** (Recomendado)
```javascript
// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Text Search
app.post('/api/places/search', async (req, res) => {
  const { query, city, state, country, pageToken } = req.body;
  const searchQuery = `${query} em ${city}, ${state}, ${country}`;

  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/textsearch/json',
      {
        params: {
          query: searchQuery,
          key: GOOGLE_API_KEY,
          language: 'pt-BR',
          pagetoken: pageToken,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Place Details
app.post('/api/places/details', async (req, res) => {
  const { placeId } = req.body;

  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/details/json',
      {
        params: {
          place_id: placeId,
          fields: 'formatted_phone_number,international_phone_number',
          key: GOOGLE_API_KEY,
          language: 'pt-BR',
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => console.log('Proxy rodando na porta 3001'));
```

**Uso:**
```bash
npm install express axios cors dotenv
node server.js
```

#### **B) Supabase Edge Function**
```typescript
// supabase/functions/google-places-proxy/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY')

serve(async (req) => {
  const { action, ...params } = await req.json()
  
  let url = ''
  if (action === 'search') {
    url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${params.query}&key=${GOOGLE_API_KEY}`
  } else if (action === 'details') {
    url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${params.placeId}&key=${GOOGLE_API_KEY}`
  }
  
  const response = await fetch(url)
  const data = await response.json()
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

**Deploy:**
```bash
supabase functions deploy google-places-proxy
```

---

### **2. Atualizar PlacesService com Paginação**

```typescript
export class PlacesService {
  private static processedPlaceIds = new Set<string>();
  
  /**
   * Busca estabelecimentos com paginação automática
   */
  static async searchPlacesWithPagination(
    query: string,
    city: string,
    state: string,
    minResults: number = 20,
    maxPages: number = 3
  ): Promise<PlaceResult[]> {
    const allPlaces: PlaceResult[] = [];
    let pageToken: string | undefined;
    let pageCount = 0;

    do {
      console.log(`📄 Buscando página ${pageCount + 1}...`);
      
      const response = await this.searchPlacesPage(query, city, state, pageToken);
      
      // Processa resultados
      for (const place of response.results) {
        // Verifica duplicata
        if (this.processedPlaceIds.has(place.place_id)) {
          console.log(`⏭️ Pulando duplicata: ${place.name}`);
          continue;
        }
        
        // Verifica se já foi prospectado no banco
        const jaProspectado = await this.checkIfAlreadyProspected(place.place_id);
        if (jaProspectado) {
          console.log(`⏭️ Já prospectado: ${place.name}`);
          continue;
        }
        
        // Busca detalhes (telefone)
        console.log(`📞 Buscando telefone de: ${place.name}`);
        const details = await this.getPlaceDetails(place.place_id);
        
        // Aguarda rate limit
        await this.delay(1500);
        
        allPlaces.push({
          name: place.name,
          businessType: place.types[0] || 'business',
          phoneNumber: details.phoneNumber,
          address: place.formatted_address,
          city: this.extractCity(place.formatted_address),
          state,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          placeId: place.place_id,
        });
        
        this.processedPlaceIds.add(place.place_id);
      }
      
      pageToken = response.next_page_token;
      pageCount++;
      
      // Aguarda antes da próxima página (Google requer delay)
      if (pageToken && pageCount < maxPages) {
        console.log('⏳ Aguardando 2s para próxima página...');
        await this.delay(2000);
      }
      
    } while (
      pageToken && 
      pageCount < maxPages && 
      allPlaces.length < minResults
    );

    console.log(`✅ Total encontrado: ${allPlaces.length} estabelecimentos`);
    return allPlaces;
  }
  
  /**
   * Busca uma página de resultados
   */
  private static async searchPlacesPage(
    query: string,
    city: string,
    state: string,
    pageToken?: string
  ): Promise<GooglePlaceSearchResult> {
    const searchQuery = `${query} em ${city}, ${state}, Brasil`;
    
    // Chama backend proxy
    const response = await axios.post('http://localhost:3001/api/places/search', {
      query: searchQuery,
      city,
      state,
      country: 'Brasil',
      pageToken,
    });
    
    return response.data;
  }
  
  /**
   * Verifica se place_id já foi prospectado
   */
  private static async checkIfAlreadyProspected(placeId: string): Promise<boolean> {
    const { data } = await supabase
      .from('campaign_leads')
      .select('id')
      .eq('place_id', placeId)
      .limit(1);
    
    return (data?.length || 0) > 0;
  }
  
  /**
   * Delay helper
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

### **3. Adicionar place_id na Tabela campaign_leads**

```sql
-- Adicionar coluna place_id
ALTER TABLE campaign_leads 
ADD COLUMN IF NOT EXISTS place_id TEXT;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_campaign_leads_place_id 
ON campaign_leads(place_id);

-- Adicionar constraint de unicidade (opcional)
-- ALTER TABLE campaign_leads 
-- ADD CONSTRAINT unique_place_id_per_campaign 
-- UNIQUE (campaign_id, place_id);
```

---

### **4. Atualizar CampaignLauncher com Progresso Detalhado**

```typescript
// Adicionar estados de progresso
const [progress, setProgress] = useState({
  phase: 'idle', // idle, searching, fetching_details, validating, sending
  current: 0,
  total: 0,
  message: '',
});

// Durante busca
setProgress({
  phase: 'searching',
  current: allPlaces.length,
  total: minResults,
  message: `Buscando estabelecimentos... (${allPlaces.length}/${minResults})`,
});

// Durante busca de detalhes
setProgress({
  phase: 'fetching_details',
  current: i + 1,
  total: places.length,
  message: `Buscando telefone ${i + 1}/${places.length}: ${place.name}`,
});

// Durante validação
setProgress({
  phase: 'validating',
  current: i + 1,
  total: leads.length,
  message: `Validando WhatsApp ${i + 1}/${leads.length}`,
});
```

---

### **5. Adicionar Estatísticas de Conversão**

```typescript
// Calcular métricas
const stats = {
  totalBuscados: places.length,
  comTelefone: places.filter(p => p.phoneNumber).length,
  whatsappValidos: validLeads.length,
  mensagensEnviadas: sentCount,
  taxaConversao: (validLeads.length / places.length) * 100,
};

console.log('📊 Estatísticas:');
console.log(`  Total buscados: ${stats.totalBuscados}`);
console.log(`  Com telefone: ${stats.comTelefone} (${(stats.comTelefone/stats.totalBuscados*100).toFixed(1)}%)`);
console.log(`  WhatsApp válidos: ${stats.whatsappValidos} (${(stats.whatsappValidos/stats.comTelefone*100).toFixed(1)}%)`);
console.log(`  Taxa de conversão: ${stats.taxaConversao.toFixed(1)}%`);
```

---

## 🎯 Próximos Passos

### **Fase 1: Resolver CORS** ✅
- [ ] Escolher opção de proxy (Node.js ou Supabase)
- [ ] Implementar backend proxy
- [ ] Testar chamadas à API

### **Fase 2: Paginação e Detalhes** 
- [ ] Implementar `searchPlacesWithPagination()`
- [ ] Adicionar busca de detalhes por place_id
- [ ] Implementar rate limiting (1.5s entre requisições)

### **Fase 3: Duplicatas**
- [ ] Adicionar coluna `place_id` em `campaign_leads`
- [ ] Implementar `checkIfAlreadyProspected()`
- [ ] Adicionar validação antes de salvar

### **Fase 4: UI/UX**
- [ ] Melhorar modal de progresso
- [ ] Adicionar barra de progresso por fase
- [ ] Mostrar estatísticas em tempo real
- [ ] Adicionar opção de cancelar busca

### **Fase 5: Otimizações**
- [ ] Cache de resultados
- [ ] Retry automático em falhas
- [ ] Logs detalhados
- [ ] Exportação de relatórios

---

## 💡 Recomendações

1. **Use Backend Proxy Node.js** - Mais simples e rápido para desenvolver
2. **Implemente paginação gradualmente** - Comece com 1 página, depois adicione mais
3. **Monitore custos da Google API** - Text Search custa $32/1000 requisições
4. **Adicione cache** - Evite buscar o mesmo estabelecimento múltiplas vezes
5. **Respeite rate limits** - Google pode bloquear se fizer muitas requisições rápidas

---

## 📝 Checklist de Implementação

- [ ] Criar backend proxy (Node.js ou Supabase)
- [ ] Atualizar `.env` com GOOGLE_PLACES_API_KEY
- [ ] Adicionar coluna `place_id` em `campaign_leads`
- [ ] Implementar paginação no PlacesService
- [ ] Adicionar busca de detalhes (telefone)
- [ ] Implementar detecção de duplicatas
- [ ] Adicionar rate limiting
- [ ] Melhorar UI de progresso
- [ ] Adicionar estatísticas
- [ ] Testar com dados reais
- [ ] Documentar custos e limites

---

**Status:** 🟡 Em Desenvolvimento
**Última atualização:** 21 de Novembro de 2025
