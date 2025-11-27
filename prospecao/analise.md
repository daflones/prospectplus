# 📍 Funcionalidade de Prospecção com Google Maps

## 📋 Visão Geral

Sistema completo de prospecção automatizada que busca estabelecimentos no Google Maps, valida números de WhatsApp e envia mensagens automaticamente, registrando tudo em logs detalhados.

---

## 📁 Estrutura de Arquivos e Pastas

### **1. Frontend - Páginas**

#### `src/pages/prospeccao/ProspeccaoPage.tsx` (36.965 bytes)
- Página principal da prospecção com interface completa
- Formulário de busca por tipo de estabelecimento e cidade
- Sistema de validação de WhatsApp integrado
- Envio automático de mensagens personalizadas
- Visualização de logs e estatísticas em tempo real
- Controle de limite de disparos diários

#### `src/pages/clientes/ClientesProspeccaoPage.tsx`
- Página dedicada para visualizar clientes gerados pela prospecção
- Filtros específicos para leads de prospecção
- Integração com pipeline de vendas

---

### **2. Frontend - Componentes**

#### `src/components/prospeccao/LogsProspeccaoTable.tsx` (20.552 bytes)
- Tabela completa para exibir logs de prospecção
- Sistema de filtros avançados:
  - Por tipo de estabelecimento
  - Por cidade
  - Por status de WhatsApp
  - Por mensagens enviadas
  - Por clientes salvos
  - Por período de data
- Paginação otimizada
- Exportação de dados

---

### **3. Frontend - Hooks**

#### `src/hooks/useProspeccao.ts` (460 linhas)
Hook principal com toda lógica de prospecção:

**Funções principais:**
- `buscarEstabelecimentos(tipo, cidade, minEstabelecimentos)` 
  - Busca no Google Maps com paginação automática
  - Verifica duplicatas antes de retornar
  - Suporte a múltiplas páginas de resultados
  
- `validarWhatsApp(telefone)` 
  - Valida números via Evolution API
  - Retorna JID e status de validação
  
- `enviarMensagem(numeroOuJid, mensagem)` 
  - Envia mensagens via WhatsApp
  - Tratamento de erros robusto
  
- `salvarComoCliente(estabelecimento, telefone, jid)` 
  - Salva estabelecimento como cliente no CRM
  - Preenche dados completos automaticamente
  - Define pipeline e classificação inicial
  
- `salvarLogProspeccao(...)` 
  - Registra todos os logs no banco de dados
  - Observações detalhadas por status
  
- `obterDisparosHoje()` 
  - Conta disparos realizados no dia atual
  - Controle de limite diário
  
- `obterHistoricoDisparos(dias)` 
  - Histórico de envios por período

#### `src/hooks/useLogsProspeccao.ts` (67 linhas)
Hook para gerenciar logs com React Query:
- Cache inteligente de 5 minutos
- Invalidação automática de queries
- Carregamento de estatísticas
- Retry automático em caso de falha

---

### **4. Frontend - Services/API**

#### `src/services/api/prospeccao.ts` (207 linhas)
Service para integração com Google Maps API:

**Funcionalidades:**
- `buscarEstabelecimentos(tipo, cidade, pageToken)` 
  - Google Places Text Search API
  - Suporte a paginação (next_page_token)
  - Processamento de até 20 estabelecimentos por página
  
- `buscarDetalhesEstabelecimento(placeId)` 
  - Google Places Details API
  - Busca telefone e informações adicionais
  - Sistema de retry com exponential backoff
  - Rate limiting inteligente (1.5s entre requisições)
  
- **Sistema de Proxies CORS:**
  - `allorigins.win`
  - `cors-anywhere.herokuapp.com`
  - `codetabs.com`
  - Rotação automática em caso de falha

#### `src/services/api/prospeccao-logs.ts` (267 linhas)
Service para gerenciar logs no Supabase:

**Funcionalidades:**
- `verificarJaProspectado(placeId)` 
  - Evita duplicatas por place_id
  - Verifica por perfil de usuário
  
- `salvarLog(logData)` 
  - Salva registro completo de prospecção
  - Associa ao perfil do usuário
  
- `buscarLogs(filtros)` 
  - Lista logs com múltiplos filtros
  - Paginação e contagem total
  
- `obterEstatisticas()` 
  - Métricas de conversão:
    - Total prospectados
    - WhatsApp válidos
    - Mensagens enviadas
    - Clientes salvos
    - Taxa de conversão

---

### **5. Backend - Supabase Functions**

#### `supabase/functions/google-maps-proxy/index.ts` (101 linhas)
Edge Function para proxy seguro do Google Maps API:

**Características:**
- Evita expor API key no frontend
- Suporta duas ações:
  - `search` - Text Search API
  - `details` - Place Details API
- CORS totalmente configurado
- Logs detalhados para debug
- Tratamento de erros completo
- Validação de parâmetros

**Endpoint:** `https://[seu-projeto].supabase.co/functions/v1/google-maps-proxy`

---

### **6. Rotas da Aplicação**

#### `src/router.tsx`
Rotas configuradas:

```typescript
// Linha 33
const ProspeccaoPage = lazy(() => import('./pages/prospeccao/ProspeccaoPage'))

// Linha 173-175
{
  path: 'prospeccao',
  element: withSuspense(ProspeccaoPage),
}

// Linha 105-107
{
  path: 'clientes-prospeccao',
  element: withSuspense(ClientesProspeccaoPage),
}
```

**URLs de acesso:**
- `/app/prospeccao` - Página de prospecção
- `/app/clientes-prospeccao` - Clientes prospectados

---

## 🗄️ Banco de Dados

### **Tabela: `logs_prospeccao`**

⚠️ **IMPORTANTE:** Esta tabela precisa ser criada manualmente no Supabase!

```sql
CREATE TABLE logs_prospeccao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  nome_estabelecimento TEXT NOT NULL,
  endereco TEXT NOT NULL,
  telefone TEXT,
  whatsapp_valido BOOLEAN NOT NULL DEFAULT false,
  jid TEXT,
  mensagem_enviada BOOLEAN NOT NULL DEFAULT false,
  cliente_salvo BOOLEAN NOT NULL DEFAULT false,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  data_prospeccao TIMESTAMP WITH TIME ZONE NOT NULL,
  tipo_estabelecimento TEXT NOT NULL,
  cidade TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_logs_prospeccao_profile_id ON logs_prospeccao(profile_id);
CREATE INDEX idx_logs_prospeccao_place_id ON logs_prospeccao(place_id);
CREATE INDEX idx_logs_prospeccao_data_prospeccao ON logs_prospeccao(data_prospeccao);
CREATE INDEX idx_logs_prospeccao_whatsapp_valido ON logs_prospeccao(whatsapp_valido);
CREATE INDEX idx_logs_prospeccao_mensagem_enviada ON logs_prospeccao(mensagem_enviada);
CREATE INDEX idx_logs_prospeccao_cliente_salvo ON logs_prospeccao(cliente_salvo);

-- RLS (Row Level Security)
ALTER TABLE logs_prospeccao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios logs"
  ON logs_prospeccao FOR SELECT
  USING (
    profile_id = auth.uid() OR
    profile_id IN (
      SELECT admin_profile_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir seus próprios logs"
  ON logs_prospeccao FOR INSERT
  WITH CHECK (
    profile_id = auth.uid() OR
    profile_id IN (
      SELECT admin_profile_id FROM profiles WHERE id = auth.uid()
    )
  );
```

### **Campos da Tabela**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `profile_id` | UUID | ID do perfil do usuário |
| `place_id` | TEXT | ID único do Google Maps |
| `nome_estabelecimento` | TEXT | Nome do estabelecimento |
| `endereco` | TEXT | Endereço completo |
| `telefone` | TEXT | Telefone (opcional) |
| `whatsapp_valido` | BOOLEAN | Se o número é WhatsApp válido |
| `jid` | TEXT | JID do WhatsApp (opcional) |
| `mensagem_enviada` | BOOLEAN | Se a mensagem foi enviada |
| `cliente_salvo` | BOOLEAN | Se foi salvo como cliente |
| `cliente_id` | UUID | ID do cliente criado (opcional) |
| `data_prospeccao` | TIMESTAMP | Data/hora da prospecção |
| `tipo_estabelecimento` | TEXT | Tipo buscado (ex: "restaurante") |
| `cidade` | TEXT | Cidade da busca |
| `observacoes` | TEXT | Observações adicionais |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |

---

## 🔐 Variáveis de Ambiente

### **Arquivo: `.env`**

```env
# ========================================
# GOOGLE MAPS API
# ========================================
VITE_GOOGLE_MAPS_API_KEY=sua_chave_google_maps_aqui

# ========================================
# EVOLUTION API (WhatsApp)
# ========================================
# IMPORTANTE: URL SEM BARRA FINAL
VITE_EVOLUTION_API_URL=https://evolutionapi.agenciagvcompany.com.br
VITE_EVOLUTION_API_KEY=3fkUb5AJcvYfXa3eduZLFAhlbkwM6pYB

# ========================================
# SUPABASE
# ========================================
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_supabase
```

### **Como Obter as Chaves:**

#### **Google Maps API Key:**
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto ou selecione um existente
3. Ative as APIs:
   - Places API
   - Places API (New)
4. Vá em "Credenciais" → "Criar credenciais" → "Chave de API"
5. Configure restrições (opcional mas recomendado)

#### **Evolution API:**
- URL e Key já estão configuradas no exemplo
- Certifique-se de ter uma instância WhatsApp conectada

#### **Supabase:**
- Disponível no dashboard do seu projeto Supabase
- Settings → API → Project URL e anon/public key

---

## 🔄 Fluxo de Funcionamento

### **1. Busca de Estabelecimentos**
```
Usuário → ProspeccaoPage → useProspeccao.buscarEstabelecimentos()
  ↓
prospeccaoService.buscarEstabelecimentos()
  ↓
Google Maps Text Search API (via proxy CORS)
  ↓
Retorna lista de estabelecimentos
  ↓
Para cada estabelecimento:
  - Verifica se já foi prospectado (verificarJaProspectado)
  - Se não, busca detalhes (telefone)
  ↓
Retorna lista filtrada (sem duplicatas)
```

### **2. Validação de WhatsApp**
```
Estabelecimento com telefone → useProspeccao.validarWhatsApp()
  ↓
Evolution API - /chat/whatsappNumbers/{instance}
  ↓
Retorna: { exists: true/false, jid: "...", number: "..." }
  ↓
Atualiza interface com status
```

### **3. Envio de Mensagem**
```
Número validado → useProspeccao.enviarMensagem()
  ↓
Evolution API - /message/sendText/{instance}
  ↓
Envia mensagem personalizada
  ↓
Retorna confirmação com message ID
```

### **4. Registro de Log**
```
Após cada ação → useProspeccao.salvarLogProspeccao()
  ↓
prospeccaoLogsService.salvarLog()
  ↓
INSERT na tabela logs_prospeccao
  ↓
Registra todos os detalhes da prospecção
```

### **5. Salvamento como Cliente (Opcional)**
```
Usuário clica "Salvar como Cliente" → useProspeccao.salvarComoCliente()
  ↓
clientesService.create()
  ↓
INSERT na tabela clientes
  ↓
Preenche dados completos automaticamente:
  - Nome, endereço, telefone, WhatsApp
  - Pipeline: "novo"
  - Classificação: "frio"
  - Origem: "Prospecção"
  - Fonte: "Google Maps - Prospecção Automatizada"
  ↓
Atualiza log com cliente_id
```

---

## 📊 Dependências Externas

### **1. Google Maps Places API**
- **Text Search API:** Busca estabelecimentos por query
- **Place Details API:** Obtém detalhes (telefone, etc)
- **Custo:** Consulte [Google Maps Pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
- **Limites:** Varia por plano

### **2. Evolution API (WhatsApp)**
- **Validação:** `/chat/whatsappNumbers/{instance}`
- **Envio:** `/message/sendText/{instance}`
- **Requisitos:** Instância WhatsApp conectada e ativa
- **Documentação:** Consulte documentação da Evolution API

### **3. Supabase**
- **Database:** PostgreSQL para logs e clientes
- **Edge Functions:** Proxy do Google Maps
- **Auth:** Autenticação de usuários
- **RLS:** Segurança em nível de linha

### **4. Proxies CORS (Fallback)**
- `https://api.allorigins.win/raw?url=`
- `https://cors-anywhere.herokuapp.com/`
- `https://api.codetabs.com/v1/proxy?quest=`
- **Nota:** Podem ter limitações de rate limit

---

## ⚙️ Configuração Passo a Passo

### **1. Criar Tabela no Supabase**
```sql
-- Execute o SQL fornecido na seção "Banco de Dados"
-- No Supabase: SQL Editor → New Query → Cole o SQL → Run
```

### **2. Configurar Variáveis de Ambiente**
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o .env e adicione suas chaves
nano .env
```

### **3. Configurar Google Maps API**
1. Obtenha a API Key
2. Ative as APIs necessárias
3. Configure restrições (opcional)
4. Adicione ao `.env`

### **4. Configurar Evolution API**
1. Certifique-se de ter uma instância criada
2. Conecte o WhatsApp via QR Code
3. Verifique se a instância está "open"
4. Teste a conexão

### **5. Deploy da Edge Function (Opcional)**
```bash
# Se quiser usar o proxy do Supabase
supabase functions deploy google-maps-proxy
```

### **6. Instalar Dependências**
```bash
npm install
```

### **7. Executar Aplicação**
```bash
npm run dev
```

---

## 🎯 Funcionalidades Principais

### **Interface de Prospecção**
- ✅ Busca por tipo de estabelecimento e cidade
- ✅ Paginação automática (até 3 páginas / 60 estabelecimentos)
- ✅ Detecção automática de duplicatas
- ✅ Validação de WhatsApp em lote
- ✅ Envio de mensagens personalizadas
- ✅ Controle de limite diário de disparos
- ✅ Preview de mensagem antes do envio
- ✅ Logs em tempo real
- ✅ Estatísticas de conversão

### **Sistema de Logs**
- ✅ Registro completo de cada prospecção
- ✅ Filtros avançados
- ✅ Exportação de dados
- ✅ Métricas de performance
- ✅ Histórico completo

### **Integração com CRM**
- ✅ Salvamento automático como cliente
- ✅ Preenchimento de dados completo
- ✅ Classificação e pipeline automáticos
- ✅ Follow-up habilitado
- ✅ Observações detalhadas

---

## 📈 Métricas e Estatísticas

O sistema rastreia:
- **Total de estabelecimentos prospectados**
- **WhatsApp válidos** (taxa de sucesso)
- **Mensagens enviadas** (taxa de envio)
- **Clientes salvos** (taxa de conversão)
- **Taxa de conversão geral** (%)

Fórmula da taxa de conversão:
```
Taxa de Conversão = (Clientes Salvos / Total Prospectados) × 100
```

---

## ⚠️ Observações Importantes

### **Limitações e Cuidados**

1. **Rate Limiting do Google Maps:**
   - Delay de 1.5s entre requisições de detalhes
   - Delay de 2s entre páginas de resultados
   - Máximo 3 páginas por busca (60 estabelecimentos)

2. **Limite de Disparos WhatsApp:**
   - Configurável na interface (padrão: 100/dia)
   - Evita bloqueio da conta WhatsApp
   - Respeite as políticas do WhatsApp

3. **Custos:**
   - Google Maps cobra por requisição
   - Monitore uso para evitar custos inesperados

4. **Duplicatas:**
   - Sistema verifica automaticamente por `place_id`
   - Não envia mensagem para estabelecimentos já prospectados

5. **Tabela do Banco:**
   - **CRÍTICO:** A tabela `logs_prospeccao` NÃO existe por padrão
   - Deve ser criada manualmente antes de usar
   - Execute o SQL fornecido neste documento

6. **Instância WhatsApp:**
   - Deve estar conectada e com status "open"
   - Verifique na página `/app/whatsapp`

---

## 🐛 Troubleshooting

### **Erro: "Google Maps API Key não configurada"**
- Verifique se `VITE_GOOGLE_MAPS_API_KEY` está no `.env`
- Reinicie o servidor de desenvolvimento

### **Erro: "Nenhuma instância WhatsApp configurada"**
- Acesse `/app/whatsapp` e conecte uma instância
- Verifique se está com status "open"

### **Erro: "Tabela logs_prospeccao não existe"**
- Execute o SQL de criação da tabela no Supabase
- Verifique se as políticas RLS foram criadas

### **Erro: "CORS blocked"**
- Use o proxy do Supabase (Edge Function)
- Ou configure CORS no Google Cloud Console

### **Mensagens não são enviadas**
- Verifique se o número é WhatsApp válido
- Confirme que a instância está conectada
- Verifique logs da Evolution API

---

## 📝 Exemplo de Uso

### **1. Buscar Restaurantes em São Paulo**
```
Tipo: "restaurante"
Cidade: "São Paulo, SP"
Clique em "Buscar Estabelecimentos"
```

### **2. Sistema Processa Automaticamente**
- Busca no Google Maps
- Verifica duplicatas
- Busca telefones
- Valida WhatsApp

### **3. Enviar Mensagens**
```
Mensagem: "Olá! Somos a [Sua Empresa]..."
Clique em "Enviar Mensagens"
```

### **4. Acompanhar Resultados**
- Veja logs em tempo real
- Confira estatísticas
- Salve leads como clientes

---

## 🔮 Próximas Melhorias (Sugestões)

- [ ] Agendamento de prospecção
- [ ] Templates de mensagens salvos
- [ ] Integração com IA para personalização
- [ ] Relatórios avançados
- [ ] Exportação para CSV/Excel
- [ ] Webhook para notificações
- [ ] Dashboard de performance
- [ ] Filtro por raio geográfico
- [ ] Integração com Google My Business

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs no console do navegador
2. Consulte a documentação das APIs externas
3. Revise as configurações de ambiente
4. Verifique o status das instâncias WhatsApp

---

## 📄 Licença

Este sistema faz parte do CRM NanoSync.

---

**Última atualização:** 21 de Novembro de 2025
