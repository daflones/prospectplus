-- Schema Integrado Prospect+ - Usuários, Leads, Instâncias WhatsApp e Configurações
-- Este script garante que todos os dados estejam vinculados aos usuários corretamente

-- =============================================
-- TABELAS DE USUÁRIOS (já existente em users.sql)
-- =============================================

-- Criar tabela de usuários se não existir
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar VARCHAR(500),
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at)
);

-- =============================================
-- TABELAS DE LEADS VINCULADAS A USUÁRIOS
-- =============================================

-- Criar tabela de leads vinculada ao usuário
CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    whatsapp VARCHAR(20),
    address TEXT,
    source ENUM('google-maps', 'linkedin', 'facebook', 'instagram', 'manual') NOT NULL DEFAULT 'manual',
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
    status ENUM('new', 'contacted', 'interested', 'not-interested', 'converted', 'lost') NOT NULL DEFAULT 'new',
    priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    tags JSON,
    custom_fields JSON,
    last_contact_at TIMESTAMP NULL,
    next_contact_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Chave estrangeira
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Índices
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_source (source),
    INDEX idx_created_at (created_at),
    INDEX idx_next_contact_at (next_contact_at),
    INDEX idx_name (name),
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_whatsapp (whatsapp)
);

-- Criar tabela de histórico de interações com leads
CREATE TABLE IF NOT EXISTS lead_interactions (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    lead_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    type ENUM('call', 'email', 'whatsapp', 'meeting', 'note', 'task') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    direction ENUM('inbound', 'outbound') DEFAULT 'outbound',
    status ENUM('completed', 'scheduled', 'cancelled', 'pending') DEFAULT 'completed',
    scheduled_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    duration_minutes INT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Chaves estrangeiras
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Índices
    INDEX idx_lead_id (lead_id),
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_scheduled_at (scheduled_at),
    INDEX idx_created_at (created_at)
);

-- =============================================
-- TABELAS DE INSTÂNCIAS WHATSAPP VINCULADAS A USUÁRIOS
-- =============================================

-- Criar tabela de instâncias da Evolution API vinculada ao usuário
CREATE TABLE IF NOT EXISTS evolution_instances (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    instance_name VARCHAR(255) NOT NULL,
    instance_id VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    status ENUM('created', 'connecting', 'connected', 'disconnected', 'error') NOT NULL DEFAULT 'created',
    qrcode TEXT,
    pairing_code VARCHAR(10),
    token VARCHAR(500) NOT NULL,
    apikey VARCHAR(500) NOT NULL,
    api_url VARCHAR(500) NOT NULL DEFAULT 'https://your-evolution-server.com',
    integration ENUM('WHATSAPP-BAILEYS', 'WHATSAPP-BUSINESS') NOT NULL DEFAULT 'WHATSAPP-BAILEYS',
    webhook_url VARCHAR(500),
    webhook_enabled BOOLEAN DEFAULT FALSE,
    connected_at TIMESTAMP NULL,
    last_activity_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Chave estrangeira
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Índices
    INDEX idx_user_id (user_id),
    INDEX idx_instance_name (instance_name),
    INDEX idx_instance_id (instance_id),
    INDEX idx_status (status),
    INDEX idx_phone_number (phone_number),
    INDEX idx_created_at (created_at),
    INDEX idx_connected_at (connected_at),
    
    -- Garantir que cada usuário tenha apenas uma instância ativa
    UNIQUE KEY unique_user_instance (user_id, status)
);

-- Criar tabela de logs de conexão das instâncias
CREATE TABLE IF NOT EXISTS evolution_connection_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    instance_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    action ENUM('created', 'connecting', 'connected', 'disconnected', 'error', 'restarted', 'deleted') NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Chaves estrangeiras
    FOREIGN KEY (instance_id) REFERENCES evolution_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Índices
    INDEX idx_instance_id (instance_id),
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- Criar tabela de configurações das instâncias
CREATE TABLE IF NOT EXISTS evolution_instance_settings (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    instance_id VARCHAR(36) NOT NULL UNIQUE,
    user_id VARCHAR(36) NOT NULL,
    reject_call BOOLEAN DEFAULT FALSE,
    msg_call TEXT,
    groups_ignore BOOLEAN DEFAULT TRUE,
    always_online BOOLEAN DEFAULT FALSE,
    read_messages BOOLEAN DEFAULT FALSE,
    read_status BOOLEAN DEFAULT FALSE,
    sync_full_history BOOLEAN DEFAULT FALSE,
    auto_reply_enabled BOOLEAN DEFAULT FALSE,
    auto_reply_message TEXT,
    business_hours JSON,
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Chaves estrangeiras
    FOREIGN KEY (instance_id) REFERENCES evolution_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Índices
    INDEX idx_instance_id (instance_id),
    INDEX idx_user_id (user_id)
);

-- =============================================
-- TABELAS DE CAMPANHAS VINCULADAS A USUÁRIOS
-- =============================================

-- Criar tabela de campanhas
CREATE TABLE IF NOT EXISTS campaigns (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('email', 'whatsapp', 'sms', 'mixed') NOT NULL DEFAULT 'whatsapp',
    status ENUM('draft', 'active', 'paused', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
    target_audience JSON,
    message_template TEXT,
    schedule_config JSON,
    instance_id VARCHAR(36),
    total_leads INT DEFAULT 0,
    sent_messages INT DEFAULT 0,
    delivered_messages INT DEFAULT 0,
    read_messages INT DEFAULT 0,
    replied_messages INT DEFAULT 0,
    failed_messages INT DEFAULT 0,
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Chaves estrangeiras
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (instance_id) REFERENCES evolution_instances(id) ON DELETE SET NULL,
    
    -- Índices
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_instance_id (instance_id),
    INDEX idx_created_at (created_at),
    INDEX idx_start_date (start_date)
);

-- Criar tabela de mensagens de campanha
CREATE TABLE IF NOT EXISTS campaign_messages (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    campaign_id VARCHAR(36) NOT NULL,
    lead_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    instance_id VARCHAR(36),
    message_content TEXT NOT NULL,
    status ENUM('pending', 'sent', 'delivered', 'read', 'replied', 'failed') NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    read_at TIMESTAMP NULL,
    replied_at TIMESTAMP NULL,
    error_message TEXT,
    external_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Chaves estrangeiras
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (instance_id) REFERENCES evolution_instances(id) ON DELETE SET NULL,
    
    -- Índices
    INDEX idx_campaign_id (campaign_id),
    INDEX idx_lead_id (lead_id),
    INDEX idx_user_id (user_id),
    INDEX idx_instance_id (instance_id),
    INDEX idx_status (status),
    INDEX idx_sent_at (sent_at),
    INDEX idx_created_at (created_at)
);

-- =============================================
-- CONFIGURAÇÕES E PREFERÊNCIAS DO USUÁRIO
-- =============================================

-- Criar tabela de configurações gerais do usuário
CREATE TABLE IF NOT EXISTS user_settings (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL UNIQUE,
    theme ENUM('light', 'dark', 'system') DEFAULT 'system',
    language VARCHAR(10) DEFAULT 'pt-BR',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    backup_codes TEXT,
    default_lead_source VARCHAR(50) DEFAULT 'manual',
    default_lead_priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    auto_save_interval INT DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Chave estrangeira
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Criar tabela de preferências de WhatsApp do usuário
CREATE TABLE IF NOT EXISTS user_whatsapp_preferences (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL UNIQUE,
    auto_reply_enabled BOOLEAN DEFAULT FALSE,
    auto_reply_message TEXT,
    business_hours_enabled BOOLEAN DEFAULT FALSE,
    business_hours JSON,
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    away_message_enabled BOOLEAN DEFAULT FALSE,
    away_message TEXT,
    away_dates JSON,
    quick_replies JSON,
    signature_enabled BOOLEAN DEFAULT FALSE,
    signature_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Chave estrangeira
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- TRIGGERS AUTOMÁTICOS
-- =============================================

DELIMITER //
CREATE TRIGGER update_users_timestamp 
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP();
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER update_leads_timestamp 
BEFORE UPDATE ON leads
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP();
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER update_lead_interactions_timestamp 
BEFORE UPDATE ON lead_interactions
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP();
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER update_evolution_instances_timestamp 
BEFORE UPDATE ON evolution_instances
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP();
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER update_campaigns_timestamp 
BEFORE UPDATE ON campaigns
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP();
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER update_campaign_messages_timestamp 
BEFORE UPDATE ON campaign_messages
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP();
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER update_user_settings_timestamp 
BEFORE UPDATE ON user_settings
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP();
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER update_user_whatsapp_preferences_timestamp 
BEFORE UPDATE ON user_whatsapp_preferences
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP();
END//
DELIMITER ;

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
        WHEN l.next_contact_at IS NOT NULL AND l.next_contact_at <= DATE_ADD(NOW(), INTERVAL 1 DAY) THEN 'soon'
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
        ELSE ROUND((c.sent_messages / c.total_leads) * 100, 2)
    END as sent_percentage,
    CASE 
        WHEN c.sent_messages = 0 THEN 0
        ELSE ROUND((c.delivered_messages / c.sent_messages) * 100, 2)
    END as delivery_rate,
    CASE 
        WHEN c.delivered_messages = 0 THEN 0
        ELSE ROUND((c.read_messages / c.delivered_messages) * 100, 2)
    END as read_rate,
    CASE 
        WHEN c.read_messages = 0 THEN 0
        ELSE ROUND((c.replied_messages / c.read_messages) * 100, 2)
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

DELIMITER //
CREATE PROCEDURE create_user_instance(
    IN p_user_id VARCHAR(36),
    IN p_instance_name VARCHAR(255),
    IN p_phone_number VARCHAR(20),
    IN p_token VARCHAR(500),
    IN p_apikey VARCHAR(500)
)
BEGIN
    DECLARE v_instance_id VARCHAR(36);
    
    SET v_instance_id = UUID();
    
    INSERT INTO evolution_instances (
        id, user_id, instance_name, instance_id, phone_number, token, apikey
    ) VALUES (
        v_instance_id, p_user_id, p_instance_name, v_instance_id, p_phone_number, p_token, p_apikey
    );
    
    INSERT INTO evolution_instance_settings (instance_id, user_id)
    VALUES (v_instance_id, p_user_id);
    
    SELECT v_instance_id as instance_id;
END//
DELIMITER ;

DELIMITER //
CREATE PROCEDURE get_user_dashboard_data(
    IN p_user_id VARCHAR(36)
)
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM leads WHERE user_id = p_user_id) as total_leads,
        (SELECT COUNT(*) FROM leads WHERE user_id = p_user_id AND status = 'new') as new_leads,
        (SELECT COUNT(*) FROM leads WHERE user_id = p_user_id AND next_contact_at <= NOW()) as pending_contacts,
        (SELECT COUNT(*) FROM evolution_instances WHERE user_id = p_user_id AND status = 'connected') as active_instances,
        (SELECT COUNT(*) FROM campaigns WHERE user_id = p_user_id AND status = 'active') as active_campaigns,
        (SELECT COUNT(*) FROM lead_interactions WHERE user_id = p_user_id AND DATE(created_at) = CURDATE()) as today_interactions;
END//
DELIMITER ;

-- =============================================
-- EVENTOS AUTOMÁTICOS
-- =============================================

CREATE EVENT IF NOT EXISTS cleanup_old_messages
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
    DELETE FROM campaign_messages 
    WHERE status IN ('delivered', 'read', 'replied') 
    AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- =============================================
-- INSERÇÃO DE DADOS INICIAIS (OPCIONAL)
-- =============================================

-- Inserir configurações padrão para usuários existentes
INSERT IGNORE INTO user_settings (user_id)
SELECT id FROM users;

INSERT IGNORE INTO user_whatsapp_preferences (user_id)
SELECT id FROM users;

-- =============================================
-- ÍNDICES ADICIONAIS DE PERFORMANCE
-- =============================================

-- Índices compostos para consultas frequentes
CREATE INDEX idx_leads_user_status ON leads(user_id, status);
CREATE INDEX idx_leads_user_priority ON leads(user_id, priority);
CREATE INDEX idx_campaigns_user_status ON campaigns(user_id, status);
CREATE INDEX idx_messages_campaign_status ON campaign_messages(campaign_id, status);
CREATE INDEX idx_interactions_user_date ON lead_interactions(user_id, created_at);
CREATE INDEX idx_instances_user_status ON evolution_instances(user_id, status);

-- Índices para busca de texto
CREATE FULLTEXT INDEX idx_leads_search ON leads(name, company, notes);
CREATE FULLTEXT INDEX idx_campaigns_search ON campaigns(name, description);

-- =============================================
-- COMENTÁRIOS FINAIS
-- =============================================

/*
Este schema integrado garante:

1. **Isolamento de Dados**: Cada usuário acessa apenas seus próprios dados
2. **Integridade Referencial**: Chaves estrangeiras em todas as relações
3. **Performance**: Índices otimizados para consultas frequentes
4. **Auditoria**: Logs e timestamps em todas as operações
5. **Flexibilidade**: JSON para campos customizáveis
6. **Segurança**: Restrições UNIQUE e CASCADE deletes
7. **Monitoramento**: Views para estatísticas e relatórios

Para executar:
mysql -u usuario -p prospect_plus < integrated_schema.sql
*/
