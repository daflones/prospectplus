-- ============================================
-- FIX: Tabelas de Campanhas e Leads
-- ============================================

-- 1. Adiciona coluna remote_jid em campaign_leads
ALTER TABLE campaign_leads 
ADD COLUMN IF NOT EXISTS remote_jid TEXT;

-- 2. Corrige tabela campaign_message_log
ALTER TABLE campaign_message_log 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Adiciona colunas de tags e paginação em leads (se não existirem)
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Cria índices para performance
CREATE INDEX IF NOT EXISTS idx_campaign_leads_remote_jid ON campaign_leads(remote_jid);
CREATE INDEX IF NOT EXISTS idx_campaign_message_log_created_at ON campaign_message_log(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_tags ON leads USING GIN(tags);

-- 5. Adiciona trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplica trigger em campaign_message_log
DROP TRIGGER IF EXISTS update_campaign_message_log_updated_at ON campaign_message_log;
CREATE TRIGGER update_campaign_message_log_updated_at
    BEFORE UPDATE ON campaign_message_log
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Adiciona coluna para tracking de disparo em tempo real
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS current_dispatch_lead_id UUID REFERENCES campaign_leads(id),
ADD COLUMN IF NOT EXISTS next_dispatch_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS estimated_completion_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- Comentários sobre as mudanças:
-- ============================================
-- remote_jid: Armazena o JID do WhatsApp para envio direto
-- tags: Array de tags para filtrar leads
-- current_dispatch_lead_id: Lead que está sendo processado agora
-- next_dispatch_at: Quando será o próximo disparo
-- estimated_completion_at: Previsão de término da campanha
