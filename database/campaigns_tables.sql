-- Tabela de Campanhas
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  
  -- Filtros de busca
  search_query VARCHAR NOT NULL, -- "Comercios", "Lojas", etc
  location_city VARCHAR,
  location_state VARCHAR,
  location_country VARCHAR DEFAULT 'Brasil',
  
  -- Configuração de mensagem
  message_type VARCHAR NOT NULL CHECK (message_type IN ('default', 'custom')),
  message_content TEXT NOT NULL,
  
  -- Configuração de disparo
  min_interval_minutes INTEGER DEFAULT 10,
  max_interval_minutes INTEGER DEFAULT 20,
  
  -- Status e estatísticas
  status VARCHAR NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  total_leads INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  messages_pending INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Tabela de Leads da Campanha
CREATE TABLE IF NOT EXISTS public.campaign_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Informações do estabelecimento
  business_name VARCHAR NOT NULL,
  business_type VARCHAR,
  phone_number VARCHAR NOT NULL,
  whatsapp_number VARCHAR,
  address TEXT,
  city VARCHAR,
  state VARCHAR,
  country VARCHAR,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  google_place_id VARCHAR,
  
  -- Validação WhatsApp
  whatsapp_valid BOOLEAN DEFAULT false,
  whatsapp_checked_at TIMESTAMP,
  
  -- Status de envio
  message_status VARCHAR DEFAULT 'pending' CHECK (message_status IN ('pending', 'sent', 'failed', 'invalid_number')),
  message_sent_at TIMESTAMP,
  message_error TEXT,
  
  -- Conversão para lead
  converted_to_lead BOOLEAN DEFAULT false,
  lead_id UUID REFERENCES public.leads(id),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Log de Disparos
CREATE TABLE IF NOT EXISTS public.campaign_message_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  campaign_lead_id UUID NOT NULL REFERENCES public.campaign_leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Detalhes do envio
  phone_number VARCHAR NOT NULL,
  message_content TEXT NOT NULL,
  status VARCHAR NOT NULL CHECK (status IN ('sent', 'failed', 'invalid_number')),
  error_message TEXT,
  
  -- Resposta da Evolution API
  evolution_response JSONB,
  
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_id ON public.campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_message_status ON public.campaign_leads(message_status);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_whatsapp_valid ON public.campaign_leads(whatsapp_valid);
CREATE INDEX IF NOT EXISTS idx_campaign_message_log_campaign_id ON public.campaign_message_log(campaign_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

CREATE TRIGGER campaign_leads_updated_at
  BEFORE UPDATE ON public.campaign_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

-- RLS Policies
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_message_log ENABLE ROW LEVEL SECURITY;

-- Policies para campaigns
CREATE POLICY "Users can view their own campaigns"
  ON public.campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaigns"
  ON public.campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
  ON public.campaigns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns"
  ON public.campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- Policies para campaign_leads
CREATE POLICY "Users can view their own campaign leads"
  ON public.campaign_leads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaign leads"
  ON public.campaign_leads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaign leads"
  ON public.campaign_leads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaign leads"
  ON public.campaign_leads FOR DELETE
  USING (auth.uid() = user_id);

-- Policies para campaign_message_log
CREATE POLICY "Users can view their own campaign message logs"
  ON public.campaign_message_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaign message logs"
  ON public.campaign_message_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);
