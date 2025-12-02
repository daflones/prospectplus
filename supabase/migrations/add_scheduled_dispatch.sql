-- =============================================
-- MIGRAÇÃO: Adicionar suporte a disparo programado
-- =============================================

-- 1. Adiciona coluna para configuração de disparo programado
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS scheduled_dispatch JSONB DEFAULT NULL;

-- Estrutura do scheduled_dispatch:
-- {
--   "enabled": true,
--   "startDate": "2025-11-28",
--   "endDate": "2025-12-05",
--   "daysOfWeek": [1, 2, 3, 4, 5],  -- 0=Dom, 1=Seg, ..., 6=Sab
--   "startHour": 9,
--   "endHour": 18,
--   "messagesPerDay": 50,
--   "timezone": "America/Sao_Paulo"
-- }

-- 2. Adiciona coluna para próximo disparo programado
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS next_scheduled_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Adiciona coluna para último disparo
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS last_dispatch_at TIMESTAMPTZ DEFAULT NULL;

-- 4. Adiciona coluna para contagem de mensagens do dia
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS messages_today INTEGER DEFAULT 0;

-- 5. Adiciona coluna para data da contagem
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS messages_today_date DATE DEFAULT NULL;

-- 6. Adiciona novos status para campanhas programadas
-- Status possíveis: draft, scheduled, searching, validating, active, paused, completed, cancelled
COMMENT ON COLUMN campaigns.status IS 'Status da campanha: draft, scheduled, searching, validating, active, paused, completed, cancelled';

-- 7. Cria índice para buscar campanhas programadas
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled 
ON campaigns (status, next_scheduled_at) 
WHERE status = 'scheduled' OR status = 'active';

-- 8. Cria índice para buscar por user_id (otimiza RLS)
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id 
ON campaigns (user_id);

-- 9. Atualiza RLS para permitir que o service_role acesse tudo
-- (Isso já é o comportamento padrão, mas vamos garantir)

-- 10. Cria função para calcular próximo horário de disparo
CREATE OR REPLACE FUNCTION calculate_next_dispatch(
  p_scheduled_dispatch JSONB,
  p_current_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_days_of_week INTEGER[];
  v_start_hour INTEGER;
  v_end_hour INTEGER;
  v_current_date DATE;
  v_current_hour INTEGER;
  v_next_date DATE;
  v_next_time TIMESTAMPTZ;
  v_day_of_week INTEGER;
  v_i INTEGER;
BEGIN
  -- Se não tem configuração, retorna NULL
  IF p_scheduled_dispatch IS NULL OR NOT (p_scheduled_dispatch->>'enabled')::BOOLEAN THEN
    RETURN NULL;
  END IF;

  -- Extrai configurações
  v_start_date := (p_scheduled_dispatch->>'startDate')::DATE;
  v_end_date := (p_scheduled_dispatch->>'endDate')::DATE;
  v_start_hour := COALESCE((p_scheduled_dispatch->>'startHour')::INTEGER, 9);
  v_end_hour := COALESCE((p_scheduled_dispatch->>'endHour')::INTEGER, 18);
  
  -- Converte array de dias
  SELECT ARRAY_AGG(elem::INTEGER)
  INTO v_days_of_week
  FROM jsonb_array_elements_text(p_scheduled_dispatch->'daysOfWeek') AS elem;

  -- Data/hora atual
  v_current_date := p_current_time::DATE;
  v_current_hour := EXTRACT(HOUR FROM p_current_time)::INTEGER;

  -- Se já passou da data final, retorna NULL
  IF v_current_date > v_end_date THEN
    RETURN NULL;
  END IF;

  -- Começa pela data atual ou data de início (o que for maior)
  v_next_date := GREATEST(v_current_date, v_start_date);

  -- Procura o próximo dia válido (máximo 14 dias à frente)
  FOR v_i IN 0..14 LOOP
    v_day_of_week := EXTRACT(DOW FROM v_next_date)::INTEGER;
    
    -- Verifica se é um dia válido
    IF v_day_of_week = ANY(v_days_of_week) AND v_next_date <= v_end_date THEN
      -- Se é hoje, verifica se ainda está no horário
      IF v_next_date = v_current_date THEN
        IF v_current_hour < v_end_hour THEN
          -- Retorna o próximo horário válido hoje
          v_next_time := v_next_date + INTERVAL '1 hour' * GREATEST(v_start_hour, v_current_hour + 1);
          RETURN v_next_time;
        END IF;
      ELSE
        -- Dia futuro, retorna o horário de início
        v_next_time := v_next_date + INTERVAL '1 hour' * v_start_hour;
        RETURN v_next_time;
      END IF;
    END IF;
    
    v_next_date := v_next_date + INTERVAL '1 day';
  END LOOP;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 11. Comentários nas colunas
COMMENT ON COLUMN campaigns.scheduled_dispatch IS 'Configuração de disparo programado (JSON)';
COMMENT ON COLUMN campaigns.next_scheduled_at IS 'Próximo horário de disparo programado';
COMMENT ON COLUMN campaigns.last_dispatch_at IS 'Último disparo realizado';
COMMENT ON COLUMN campaigns.messages_today IS 'Quantidade de mensagens enviadas hoje';
COMMENT ON COLUMN campaigns.messages_today_date IS 'Data da contagem de mensagens de hoje';

-- =============================================
-- FIM DA MIGRAÇÃO
-- =============================================
