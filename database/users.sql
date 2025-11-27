-- Script para criar tabelas de usuários e autenticação
-- Prospect+ - Sistema de Prospecção

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at),
    INDEX idx_email_verification_token (email_verification_token),
    INDEX idx_password_reset_token (password_reset_token)
);

-- Criar tabela de sessões de usuários
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    device_info TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Chave estrangeira
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Índices
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at),
    INDEX idx_created_at (created_at)
);

-- Criar tabela de logs de autenticação
CREATE TABLE IF NOT EXISTS auth_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36),
    action ENUM('login', 'logout', 'register', 'password_reset', 'email_verification', 'account_locked', 'account_unlocked') NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Chave estrangeira (pode ser NULL para ações de registro)
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Índices
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_ip_address (ip_address),
    INDEX idx_created_at (created_at),
    INDEX idx_success (success)
);

-- Criar tabela de tentativas de login (para segurança)
CREATE TABLE IF NOT EXISTS login_attempts (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    attempts_count INT DEFAULT 1,
    blocked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_email (email),
    INDEX idx_ip_address (ip_address),
    INDEX idx_blocked_until (blocked_until),
    INDEX idx_created_at (created_at)
);

-- Criar tabela de configurações do usuário
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Chave estrangeira
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Criar tabela de perfis de usuário (informações adicionais)
CREATE TABLE IF NOT EXISTS user_profiles (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL UNIQUE,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Chave estrangeira
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Trigger para atualizar o campo updated_at automaticamente
DELIMITER //
CREATE TRIGGER update_users_timestamp 
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP();
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER update_login_attempts_timestamp 
BEFORE UPDATE ON login_attempts
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
CREATE TRIGGER update_user_profiles_timestamp 
BEFORE UPDATE ON user_profiles
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP();
END//
DELIMITER ;

-- Procedimento para registrar log de autenticação
DELIMITER //
CREATE PROCEDURE log_auth_event(
    IN p_user_id VARCHAR(36),
    IN p_action ENUM('login', 'logout', 'register', 'password_reset', 'email_verification', 'account_locked', 'account_unlocked'),
    IN p_ip_address VARCHAR(45),
    IN p_user_agent TEXT,
    IN p_success BOOLEAN,
    IN p_details TEXT
)
BEGIN
    INSERT INTO auth_logs (user_id, action, ip_address, user_agent, success, details)
    VALUES (p_user_id, p_action, p_ip_address, p_user_agent, p_success, p_details);
END//
DELIMITER ;

-- Procedimento para limpar sessões expiradas
DELIMITER //
CREATE PROCEDURE cleanup_expired_sessions()
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
END//
DELIMITER ;

-- Procedimento para limpar tentativas de login antigas
DELIMITER //
CREATE PROCEDURE cleanup_old_login_attempts()
BEGIN
    DELETE FROM login_attempts 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY) 
    AND blocked_until IS NULL;
END//
DELIMITER ;

-- View para consultar usuários com informações completas
CREATE VIEW v_users_complete AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.phone,
    u.avatar_url,
    u.role,
    u.is_active,
    u.email_verified,
    u.last_login_at,
    u.created_at,
    u.updated_at,
    us.theme,
    us.language,
    us.timezone,
    us.email_notifications,
    us.push_notifications,
    us.two_factor_enabled,
    up.bio,
    up.company,
    up.job_title,
    up.website,
    up.city,
    up.state,
    up.country
FROM users u
LEFT JOIN user_settings us ON u.id = us.user_id
LEFT JOIN user_profiles up ON u.id = up.user_id;

-- View para estatísticas de usuários
CREATE VIEW v_user_stats AS
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_users,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
    COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified_users,
    COUNT(CASE WHEN last_login_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as users_last_7_days,
    COUNT(CASE WHEN last_login_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as users_last_30_days,
    COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as new_users_last_7_days,
    COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_users_last_30_days
FROM users;

-- Evento para limpeza automática de sessões expiradas
CREATE EVENT IF NOT EXISTS cleanup_expired_sessions_event
ON SCHEDULE EVERY 1 HOUR
DO CALL cleanup_expired_sessions();

-- Evento para limpeza automática de tentativas de login antigas
CREATE EVENT IF NOT EXISTS cleanup_old_login_attempts_event
ON SCHEDULE EVERY 1 DAY
DO CALL cleanup_old_login_attempts();

-- Inserir usuário admin padrão (senha: admin123)
-- Em produção, remova ou altere esta linha
INSERT IGNORE INTO users (
    id, name, email, password_hash, role, is_active, email_verified
) VALUES (
    UUID(),
    'Administrador',
    'admin@prospectplus.com',
    '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ',
    'admin',
    TRUE,
    TRUE
);

-- Inserir configurações básicas para o usuário admin
INSERT IGNORE INTO user_settings (user_id)
SELECT id FROM users WHERE email = 'admin@prospectplus.com';

-- Inserir perfil básico para o usuário admin
INSERT IGNORE INTO user_profiles (user_id)
SELECT id FROM users WHERE email = 'admin@prospectplus.com';
