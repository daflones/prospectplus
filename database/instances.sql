-- Script para criar tabela de instâncias da Evolution API
-- Prospect+ - Sistema de Prospecção

-- Criar tabela de instâncias
CREATE TABLE IF NOT EXISTS evolution_instances (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    instance_name VARCHAR(255) NOT NULL UNIQUE,
    instance_id VARCHAR(255) NOT NULL UNIQUE,
    user_name VARCHAR(255) NOT NULL,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    connected_at TIMESTAMP NULL,
    
    -- Índices
    INDEX idx_instance_name (instance_name),
    INDEX idx_instance_id (instance_id),
    INDEX idx_user_name (user_name),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Criar tabela de logs de conexão
CREATE TABLE IF NOT EXISTS evolution_connection_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    instance_id VARCHAR(36) NOT NULL,
    action ENUM('created', 'connecting', 'connected', 'disconnected', 'error', 'restarted', 'deleted') NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Chave estrangeira
    FOREIGN KEY (instance_id) REFERENCES evolution_instances(id) ON DELETE CASCADE,
    
    -- Índices
    INDEX idx_instance_id (instance_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- Criar tabela de configurações da instância
CREATE TABLE IF NOT EXISTS evolution_instance_settings (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    instance_id VARCHAR(36) NOT NULL UNIQUE,
    reject_call BOOLEAN DEFAULT FALSE,
    msg_call TEXT,
    groups_ignore BOOLEAN DEFAULT TRUE,
    always_online BOOLEAN DEFAULT FALSE,
    read_messages BOOLEAN DEFAULT FALSE,
    read_status BOOLEAN DEFAULT FALSE,
    sync_full_history BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Chave estrangeira
    FOREIGN KEY (instance_id) REFERENCES evolution_instances(id) ON DELETE CASCADE
);

-- Inserir dados de exemplo (opcional)
-- INSERT INTO evolution_instances (
--     instance_name, instance_id, user_name, phone_number, status, token, apikey
-- ) VALUES (
--     'usuario_exemplo', 'example-instance-id', 'João Silva', '5511999998888', 'created', 
--     'example-token', 'example-apikey'
-- );

-- Trigger para atualizar o campo updated_at automaticamente
DELIMITER //
CREATE TRIGGER update_evolution_instances_timestamp 
BEFORE UPDATE ON evolution_instances
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER update_evolution_instance_settings_timestamp 
BEFORE UPDATE ON evolution_instance_settings
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//
DELIMITER ;

-- Procedimento para registrar logs de conexão
DELIMITER //
CREATE PROCEDURE log_connection_event(
    IN p_instance_id VARCHAR(36),
    IN p_action ENUM('created', 'connecting', 'connected', 'disconnected', 'error', 'restarted', 'deleted'),
    IN p_details TEXT
)
BEGIN
    INSERT INTO evolution_connection_logs (instance_id, action, details)
    VALUES (p_instance_id, p_action, p_details);
END//
DELIMITER ;

-- View para consultar instâncias com configurações
CREATE VIEW v_instances_with_settings AS
SELECT 
    i.id,
    i.instance_name,
    i.instance_id,
    i.user_name,
    i.phone_number,
    i.status,
    i.qrcode,
    i.pairing_code,
    i.token,
    i.apikey,
    i.api_url,
    i.integration,
    i.webhook_url,
    i.webhook_enabled,
    i.created_at,
    i.updated_at,
    i.connected_at,
    s.reject_call,
    s.msg_call,
    s.groups_ignore,
    s.always_online,
    s.read_messages,
    s.read_status,
    s.sync_full_history
FROM evolution_instances i
LEFT JOIN evolution_instance_settings s ON i.id = s.instance_id;
