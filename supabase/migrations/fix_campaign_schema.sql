-- =====================================================
-- MIGRAÇÃO: Corrigir schema de campanhas
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. Adicionar colunas faltantes na tabela campaigns
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS type VARCHAR DEFAULT 'whatsapp',
ADD COLUMN IF NOT EXISTS target_audience JSONB,
ADD COLUMN IF NOT EXISTS message_template TEXT,
ADD COLUMN IF NOT EXISTS media_files JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS schedule_config JSONB,
ADD COLUMN IF NOT EXISTS instance_id UUID,
ADD COLUMN IF NOT EXISTS sent_messages INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivered_messages INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_messages INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS search_stats JSONB,
ADD COLUMN IF NOT EXISTS scheduled_dispatch JSONB,
ADD COLUMN IF NOT EXISTS next_scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_dispatch_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS messages_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS messages_today_date DATE;

-- 2. Atualizar constraint de status para incluir novos status
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_status_check 
  CHECK (status IN ('draft', 'scheduled', 'searching', 'validating', 'active', 'paused', 'completed', 'cancelled'));

-- 3. Adicionar colunas faltantes na tabela campaign_leads
ALTER TABLE public.campaign_leads 
ADD COLUMN IF NOT EXISTS remote_jid VARCHAR,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 4. Criar índice para remote_jid
CREATE INDEX IF NOT EXISTS idx_campaign_leads_remote_jid ON public.campaign_leads(remote_jid);

-- 5. Criar índice para google_place_id
CREATE INDEX IF NOT EXISTS idx_campaign_leads_google_place_id ON public.campaign_leads(google_place_id);

-- 6. Criar índice para user_id + phone_number (para verificação de duplicados)
CREATE INDEX IF NOT EXISTS idx_campaign_leads_user_phone ON public.campaign_leads(user_id, phone_number);

-- 7. Criar índice para user_id + google_place_id (para verificação de duplicados)
CREATE INDEX IF NOT EXISTS idx_campaign_leads_user_place ON public.campaign_leads(user_id, google_place_id);

-- 8. Adicionar política de service_role para bypass RLS
-- Isso permite que o backend (usando service_role_key) acesse todos os dados
DO $$
BEGIN
  -- Policy para campaigns
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'campaigns' AND policyname = 'Service role can do anything'
  ) THEN
    CREATE POLICY "Service role can do anything" ON public.campaigns
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
  
  -- Policy para campaign_leads
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'campaign_leads' AND policyname = 'Service role can do anything'
  ) THEN
    CREATE POLICY "Service role can do anything" ON public.campaign_leads
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
  
  -- Policy para campaign_message_log
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'campaign_message_log' AND policyname = 'Service role can do anything'
  ) THEN
    CREATE POLICY "Service role can do anything" ON public.campaign_message_log
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 9. Verificar se a tabela leads existe, se não criar
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name VARCHAR NOT NULL,
  phone VARCHAR,
  email VARCHAR,
  whatsapp_jid VARCHAR,
  address TEXT,
  source VARCHAR DEFAULT 'manual',
  status VARCHAR DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Habilitar RLS na tabela leads se existir
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 11. Criar políticas para leads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Users can view their own leads'
  ) THEN
    CREATE POLICY "Users can view their own leads" ON public.leads
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Users can create their own leads'
  ) THEN
    CREATE POLICY "Users can create their own leads" ON public.leads
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Users can update their own leads'
  ) THEN
    CREATE POLICY "Users can update their own leads" ON public.leads
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Service role can do anything'
  ) THEN
    CREATE POLICY "Service role can do anything" ON public.leads
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Pronto! Execute este script no Supabase SQL Editor
SELECT 'Migração concluída com sucesso!' as resultado;
