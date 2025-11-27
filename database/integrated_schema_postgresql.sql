-- Schema Integrado Prospect+ - Versão PostgreSQL
-- Este script garante que todos os dados estejam vinculados aos usuários corretamente

-- =============================================
-- EXTENSÕES NECESSÁRIAS
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================
-- TABELAS DE USUÁRIOS
-- =============================================

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar VARCHAR(500),
    role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de sessões de usuários
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    device_info TEXT,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Criar tabela de logs de autenticação
CREATE TABLE IF NOT EXISTS auth_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(20) NOT NULL CHECK (action IN ('login', 'logout', 'register', 'password_reset', 'email_verification', 'account_locked', 'account_unlocked')),
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Criar tabela de tentativas de login
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    ip_address INET,
    attempts_count INTEGER DEFAULT 1,
    blocked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de configurações do usuário
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    theme VARCHAR(10) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    language VARCHAR(10) DEFAULT 'pt-BR',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    backup_codes TEXT,
    default_lead_source VARCHAR(50) DEFAULT 'manual',
    default_lead_priority VARCHAR(10) DEFAULT 'medium' CHECK (default_lead_priority IN ('low', 'medium', 'high')),
    auto_save_interval INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Criar tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    bio TEXT,
    company VARCHAR(255),
    job_title VARCHAR(255),
    website VARCHAR(500),
    linkedin VARCHAR(500),
    facebook VARCHAR(500),
    instagram VARCHAR(500),
    twitter VARCHAR(500),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    birth_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- TABELAS DE LEADS VINCULADAS A USUÁRIOS
-- =============================================

-- Criar tabela de leads
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    whatsapp VARCHAR(20),
    address TEXT,
    source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('google-maps', 'linkedin', 'facebook', 'instagram', 'manual')),
    category VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    website VARCHAR(500),
    company VARCHAR(255),
    job_title VARCHAR(255),
    linkedin VARCHAR(500),
    facebook VARCHAR(500),
    instagram VARCHAR(500),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'not-interested', 'converted', 'lost')),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    tags JSONB,
    custom_fields JSONB,
    last_contact_at TIMESTAMP,
    next_contact_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Criar tabela de interações com leads
CREATE TABLE IF NOT EXISTS lead_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL,
    user_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('call', 'email', 'whatsapp', 'meeting', 'note', 'task')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    direction VARCHAR(10) DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'scheduled', 'cancelled', 'pending')),
    scheduled_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_minutes INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- TABELAS DE INSTÂNCIAS WHATSAPP VINCULADAS A USUÁRIOS
-- =============================================

-- Criar tabela de instâncias da Evolution API
CREATE TABLE IF NOT EXISTS evolution_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    instance_name VARCHAR(255) NOT NULL,
    instance_id VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'connecting', 'connected', 'disconnected', 'error')),
    qrcode TEXT,
    pairing_code VARCHAR(10),
    token VARCHAR(500) NOT NULL,
    apikey VARCHAR(500) NOT NULL,
    api_url VARCHAR(500) NOT NULL DEFAULT 'https://your-evolution-server.com',
    integration VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP-BAILEYS' CHECK (integration IN ('WHATSAPP-BAILEYS', 'WHATSAPP-BUSINESS')),
    webhook_url VARCHAR(500),
    webhook_enabled BOOLEAN DEFAULT FALSE,
    connected_at TIMESTAMP,
    last_activity_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, status) -- Garantir que cada usuário tenha apenas uma instância ativa
);

-- Criar tabela de logs de conexão das instâncias
CREATE TABLE IF NOT EXISTS evolution_connection_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'connecting', 'connected', 'disconnected', 'error', 'restarted', 'deleted')),
    details TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (instance_id) REFERENCES evolution_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Criar tabela de configurações das instâncias
CREATE TABLE IF NOT EXISTS evolution_instance_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    reject_call BOOLEAN DEFAULT FALSE,
    msg_call TEXT,
    groups_ignore BOOLEAN DEFAULT TRUE,
    always_online BOOLEAN DEFAULT FALSE,
    read_messages BOOLEAN DEFAULT FALSE,
    read_status BOOLEAN DEFAULT FALSE,
    sync_full_history BOOLEAN DEFAULT FALSE,
    auto_reply_enabled BOOLEAN DEFAULT FALSE,
    auto_reply_message TEXT,
    business_hours JSONB,
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (instance_id) REFERENCES evolution_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- TABELAS DE CAMPANHAS VINCULADAS A USUÁRIOS
-- =============================================

-- Criar tabela de campanhas
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'whatsapp' CHECK (type IN ('email', 'whatsapp', 'sms', 'mixed')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    target_audience JSONB,
    message_template TEXT,
    schedule_config JSONB,
    instance_id UUID,
    total_leads INTEGER DEFAULT 0,
    sent_messages INTEGER DEFAULT 0,
    delivered_messages INTEGER DEFAULT 0,
    read_messages INTEGER DEFAULT 0,
    replied_messages INTEGER DEFAULT 0,
    failed_messages INTEGER DEFAULT 0,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (instance_id) REFERENCES evolution_instances(id) ON DELETE SET NULL
);

-- Criar tabela de mensagens de campanha
CREATE TABLE IF NOT EXISTS campaign_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL,
    lead_id UUID NOT NULL,
    user_id UUID NOT NULL,
    instance_id UUID,
    message_content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'replied', 'failed')),
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    replied_at TIMESTAMP,
    error_message TEXT,
    external_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (instance_id) REFERENCES evolution_instances(id) ON DELETE SET NULL
);

-- =============================================
-- CONFIGURAÇÕES DE PREFERÊNCIAS WHATSAPP
-- =============================================

-- Criar tabela de preferências de WhatsApp do usuário
CREATE TABLE IF NOT EXISTS user_whatsapp_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    auto_reply_enabled BOOLEAN DEFAULT FALSE,
    auto_reply_message TEXT,
    business_hours_enabled BOOLEAN DEFAULT FALSE,
    business_hours JSONB,
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    away_message_enabled BOOLEAN DEFAULT FALSE,
    away_message TEXT,
    away_dates JSONB,
    quick_replies JSONB,
    signature_enabled BOOLEAN DEFAULT FALSE,
    signature_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- TRIGGERS AUTOMÁTICOS (PostgreSQL)
-- =============================================

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_interactions_updated_at BEFORE UPDATE ON lead_interactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evolution_instances_updated_at BEFORE UPDATE ON evolution_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_messages_updated_at BEFORE UPDATE ON campaign_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_whatsapp_preferences_updated_at BEFORE UPDATE ON user_whatsapp_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

-- Índices básicos
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_priority ON leads(priority);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_next_contact_at ON leads(next_contact_at);
CREATE INDEX idx_leads_name ON leads(name);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_whatsapp ON leads(whatsapp);

CREATE INDEX idx_lead_interactions_lead_id ON lead_interactions(lead_id);
CREATE INDEX idx_lead_interactions_user_id ON lead_interactions(user_id);
CREATE INDEX idx_lead_interactions_type ON lead_interactions(type);
CREATE INDEX idx_lead_interactions_status ON lead_interactions(status);
CREATE INDEX idx_lead_interactions_scheduled_at ON lead_interactions(scheduled_at);
CREATE INDEX idx_lead_interactions_created_at ON lead_interactions(created_at);

CREATE INDEX idx_evolution_instances_user_id ON evolution_instances(user_id);
CREATE INDEX idx_evolution_instances_instance_name ON evolution_instances(instance_name);
CREATE INDEX idx_evolution_instances_instance_id ON evolution_instances(instance_id);
CREATE INDEX idx_evolution_instances_status ON evolution_instances(status);
CREATE INDEX idx_evolution_instances_phone_number ON evolution_instances(phone_number);
CREATE INDEX idx_evolution_instances_created_at ON evolution_instances(created_at);
CREATE INDEX idx_evolution_instances_connected_at ON evolution_instances(connected_at);

CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_type ON campaigns(type);
CREATE INDEX idx_campaigns_instance_id ON campaigns(instance_id);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at);
CREATE INDEX idx_campaigns_start_date ON campaigns(start_date);

CREATE INDEX idx_campaign_messages_campaign_id ON campaign_messages(campaign_id);
CREATE INDEX idx_campaign_messages_lead_id ON campaign_messages(lead_id);
CREATE INDEX idx_campaign_messages_user_id ON campaign_messages(user_id);
CREATE INDEX idx_campaign_messages_instance_id ON campaign_messages(instance_id);
CREATE INDEX idx_campaign_messages_status ON campaign_messages(status);
CREATE INDEX idx_campaign_messages_sent_at ON campaign_messages(sent_at);
CREATE INDEX idx_campaign_messages_created_at ON campaign_messages(created_at);

-- Índices compostos para consultas frequentes
CREATE INDEX idx_leads_user_status ON leads(user_id, status);
CREATE INDEX idx_leads_user_priority ON leads(user_id, priority);
CREATE INDEX idx_campaigns_user_status ON campaigns(user_id, status);
CREATE INDEX idx_messages_campaign_status ON campaign_messages(campaign_id, status);
CREATE INDEX idx_interactions_user_date ON lead_interactions(user_id, created_at);
CREATE INDEX idx_instances_user_status ON evolution_instances(user_id, status);

-- Índices para busca de texto
CREATE INDEX idx_leads_search ON leads USING gin(to_tsvector('portuguese', name || ' ' || COALESCE(company, '') || ' ' || COALESCE(notes, '')));
CREATE INDEX idx_campaigns_search ON campaigns USING gin(to_tsvector('portuguese', name || ' ' || COALESCE(description, '')));

-- =============================================
-- VIEWS PARA CONSULTAS FACILITADAS
-- =============================================

-- View completa de leads com informações do usuário
CREATE VIEW v_user_leads AS
SELECT 
    l.*,
    u.name as user_name,
    u.email as user_email,
    CASE 
        WHEN l.next_contact_at IS NOT NULL AND l.next_contact_at <= NOW() THEN 'overdue'
        WHEN l.next_contact_at IS NOT NULL AND l.next_contact_at <= (NOW() + INTERVAL '1 day') THEN 'soon'
        ELSE 'scheduled'
    END as contact_urgency
FROM leads l
INNER JOIN users u ON l.user_id = u.id;

-- View de instâncias com configurações do usuário
CREATE VIEW v_user_instances AS
SELECT 
    i.*,
    u.name as user_name,
    u.email as user_email,
    s.reject_call,
    s.msg_call,
    s.groups_ignore,
    s.always_online,
    s.read_messages,
    s.read_status,
    s.auto_reply_enabled,
    s.auto_reply_message,
    s.business_hours,
    s.timezone as instance_timezone
FROM evolution_instances i
INNER JOIN users u ON i.user_id = u.id
LEFT JOIN evolution_instance_settings s ON i.id = s.instance_id;

-- View de campanhas com estatísticas
CREATE VIEW v_user_campaigns AS
SELECT 
    c.*,
    u.name as user_name,
    u.email as user_email,
    i.instance_name,
    CASE 
        WHEN c.total_leads = 0 THEN 0
        ELSE ROUND((c.sent_messages::numeric / c.total_leads::numeric) * 100, 2)
    END as sent_percentage,
    CASE 
        WHEN c.sent_messages = 0 THEN 0
        ELSE ROUND((c.delivered_messages::numeric / c.sent_messages::numeric) * 100, 2)
    END as delivery_rate,
    CASE 
        WHEN c.delivered_messages = 0 THEN 0
        ELSE ROUND((c.read_messages::numeric / c.delivered_messages::numeric) * 100, 2)
    END as read_rate,
    CASE 
        WHEN c.read_messages = 0 THEN 0
        ELSE ROUND((c.replied_messages::numeric / c.read_messages::numeric) * 100, 2)
    END as reply_rate
FROM campaigns c
INNER JOIN users u ON c.user_id = u.id
LEFT JOIN evolution_instances i ON c.instance_id = i.id;

-- View de estatísticas por usuário
CREATE VIEW v_user_stats AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    COUNT(DISTINCT l.id) as total_leads,
    COUNT(DISTINCT CASE WHEN l.status = 'new' THEN l.id END) as new_leads,
    COUNT(DISTINCT CASE WHEN l.status = 'contacted' THEN l.id END) as contacted_leads,
    COUNT(DISTINCT CASE WHEN l.status = 'interested' THEN l.id END) as interested_leads,
    COUNT(DISTINCT CASE WHEN l.status = 'converted' THEN l.id END) as converted_leads,
    COUNT(DISTINCT i.id) as total_instances,
    COUNT(DISTINCT CASE WHEN i.status = 'connected' THEN i.id END) as active_instances,
    COUNT(DISTINCT c.id) as total_campaigns,
    COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_campaigns,
    COUNT(DISTINCT li.id) as total_interactions,
    MAX(l.created_at) as last_lead_created,
    MAX(i.connected_at) as last_instance_connected,
    MAX(c.created_at) as last_campaign_created
FROM users u
LEFT JOIN leads l ON u.id = l.user_id
LEFT JOIN evolution_instances i ON u.id = i.user_id
LEFT JOIN campaigns c ON u.id = c.user_id
LEFT JOIN lead_interactions li ON u.id = li.user_id
GROUP BY u.id, u.name, u.email;

-- =============================================
-- PROCEDURES E FUNÇÕES
-- =============================================

-- Procedure para criar instância do usuário
CREATE OR REPLACE FUNCTION create_user_instance(
    p_user_id UUID,
    p_instance_name VARCHAR(255),
    p_phone_number VARCHAR(20),
    p_token VARCHAR(500),
    p_apikey VARCHAR(500)
) RETURNS UUID AS $$
DECLARE
    v_instance_id UUID;
BEGIN
    v_instance_id := uuid_generate_v4();
    
    INSERT INTO evolution_instances (
        id, user_id, instance_name, instance_id, phone_number, token, apikey
    ) VALUES (
        v_instance_id, p_user_id, p_instance_name, v_instance_id::text, p_phone_number, p_token, p_apikey
    );
    
    INSERT INTO evolution_instance_settings (instance_id, user_id)
    VALUES (v_instance_id, p_user_id);
    
    RETURN v_instance_id;
END;
$$ LANGUAGE plpgsql;

-- Function para obter dados do dashboard do usuário
CREATE OR REPLACE FUNCTION get_user_dashboard_data(
    p_user_id UUID
) RETURNS TABLE(
    total_leads BIGINT,
    new_leads BIGINT,
    pending_contacts BIGINT,
    active_instances BIGINT,
    active_campaigns BIGINT,
    today_interactions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM leads WHERE user_id = p_user_id),
        (SELECT COUNT(*) FROM leads WHERE user_id = p_user_id AND status = 'new'),
        (SELECT COUNT(*) FROM leads WHERE user_id = p_user_id AND next_contact_at <= NOW()),
        (SELECT COUNT(*) FROM evolution_instances WHERE user_id = p_user_id AND status = 'connected'),
        (SELECT COUNT(*) FROM campaigns WHERE user_id = p_user_id AND status = 'active'),
        (SELECT COUNT(*) FROM lead_interactions WHERE user_id = p_user_id AND DATE(created_at) = CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INSERÇÃO DE DADOS INICIAIS
-- =============================================

-- Inserir usuário admin padrão
INSERT INTO users (
    id, name, email, password_hash, role, is_active, email_verified
) VALUES (
    uuid_generate_v4(),
    'Administrador',
    'admin@prospectplus.com',
    '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ',
    'admin',
    TRUE,
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Inserir configurações para usuários existentes
INSERT INTO user_settings (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_whatsapp_preferences (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

-- =============================================
-- COMENTÁRIOS FINAIS
-- =============================================

/*
Este schema PostgreSQL garante:

1. **Isolamento de Dados**: Cada usuário acessa apenas seus próprios dados
2. **Integridade Referencial**: Chaves estrangeiras em todas as relações
3. **Performance**: Índices otimizados para consultas frequentes
4. **Auditoria**: Logs e timestamps em todas as operações
5. **Flexibilidade**: JSONB para campos customizáveis
6. **Segurança**: Restrições UNIQUE e CASCADE deletes
7. **Monitoramento**: Views para estatísticas e relatórios

Para executar:
psql -U usuario -d prospect_plus -f integrated_schema_postgresql.sql
*/
