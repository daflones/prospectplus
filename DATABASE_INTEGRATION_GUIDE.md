# Guia de Integração de Banco de Dados - Prospect+

Este guia explica como implementar o schema integrado que garante que cada usuário acesse apenas seus próprios dados no Prospect+.

## 📋 Visão Geral

O schema integrado (`database/integrated_schema.sql`) foi projetado para:

1. **Isolamento Completo de Dados**: Cada usuário vê apenas suas informações
2. **Integridade Referencial**: Chaves estrangeiras em todas as relações
3. **Performance Otimizada**: Índices para consultas frequentes
4. **Auditoria Completa**: Logs e timestamps em todas as operações

## 🗄️ Estrutura de Tabelas

### 1. **Tabelas de Usuários**
```sql
users                     # Dados básicos do usuário
user_settings             # Preferências gerais
user_whatsapp_preferences # Configurações específicas do WhatsApp
```

### 2. **Tabelas de Leads (Vinculadas ao Usuário)**
```sql
leads              # Leads individuais de cada usuário
lead_interactions  # Histórico de interações com os leads
```

### 3. **Tabelas de Instâncias WhatsApp (Vinculadas ao Usuário)**
```sql
evolution_instances           # Instâncias criadas por cada usuário
evolution_connection_logs     # Logs de conexão das instâncias
evolution_instance_settings  # Configurações das instâncias
```

### 4. **Tabelas de Campanhas (Vinculadas ao Usuário)**
```sql
campaigns          # Campanhas criadas por cada usuário
campaign_messages  # Mensagens enviadas nas campanhas
```

## 🔧 Implementação

### Passo 1: Executar o Schema Integrado
```bash
mysql -u usuario -p prospect_plus < database/integrated_schema.sql
```

### Passo 2: Atualizar Tipos TypeScript
Os tipos já foram atualizados em `src/types/index.ts`:
- `Lead` agora inclui `userId`
- `Campaign` agora inclui `userId`
- `EvolutionInstance` agora inclui `userId`

### Passo 3: Atualizar Services e Stores
Os services precisam filtrar por `userId`:

#### Exemplo - Lead Service
```typescript
// Em vez de:
const leads = await api.get('/leads');

// Usar:
const leads = await api.get(`/leads?userId=${userId}`);
```

#### Exemplo - Store Zustand
```typescript
// No useStore.ts, filtrar leads por usuário:
const userLeads = leads.filter(lead => lead.userId === currentUserId);
```

## 🚀 Funcionalidades de Segurança

### 1. **Isolamento no Backend**
```sql
-- Middleware que verifica userId em todas as requisições
CREATE PROCEDURE verify_user_access(
    IN p_user_id VARCHAR(36),
    IN p_resource_id VARCHAR(36),
    IN p_table_name VARCHAR(50)
)
BEGIN
    -- Verifica se o usuário tem acesso ao recurso
    -- Implementar lógica de segurança aqui
END;
```

### 2. **Validações no Frontend**
```typescript
// Em cada componente, verificar se o usuário tem acesso
const { user } = useAuthStore();

const userLeads = leads.filter(lead => lead.userId === user.id);
const userInstances = instances.filter(instance => instance.userId === user.id);
```

### 3. **Proteção de API**
```typescript
// Middleware de API para validar acesso
app.use('/api/leads', (req, res, next) => {
  const userId = req.user.id;
  req.query.userId = userId; // Força filtragem
  next();
});
```

## 📊 Views para Consultas

### View de Leads do Usuário
```sql
SELECT * FROM v_user_leads WHERE user_id = 'user-uuid';
```

### View de Instâncias do Usuário
```sql
SELECT * FROM v_user_instances WHERE user_id = 'user-uuid';
```

### Estatísticas do Usuário
```sql
SELECT * FROM v_user_stats WHERE user_id = 'user-uuid';
```

## 🔍 Exemplos de Consultas

### 1. **Leads de um Usuário Específico**
```sql
-- Obter todos os leads do usuário
SELECT l.*, u.name as user_name 
FROM leads l 
INNER JOIN users u ON l.user_id = u.id 
WHERE l.user_id = 'uuid-do-usuario';

-- Leads pendentes de contato
SELECT * FROM leads 
WHERE user_id = 'uuid-do-usuario' 
AND next_contact_at <= NOW()
AND status != 'converted';
```

### 2. **Instâncias WhatsApp do Usuário**
```sql
-- Instâncias ativas do usuário
SELECT i.*, s.reject_call, s.auto_reply_enabled
FROM evolution_instances i
LEFT JOIN evolution_instance_settings s ON i.id = s.instance_id
WHERE i.user_id = 'uuid-do-usuario'
AND i.status = 'connected';
```

### 3. **Campanhas do Usuário**
```sql
-- Campanhas ativas com estatísticas
SELECT 
    c.*,
    ROUND((c.sent_messages / c.total_leads) * 100, 2) as sent_rate,
    ROUND((c.read_messages / c.sent_messages) * 100, 2) as read_rate
FROM campaigns c
WHERE c.user_id = 'uuid-do-usuario'
AND c.status = 'active';
```

## 🛠️ Migração de Dados

### Se já existirem dados sem userId:
```sql
-- Script de migração (executar com cuidado!)
UPDATE leads SET user_id = 'admin-user-id' WHERE user_id IS NULL;
UPDATE campaigns SET user_id = 'admin-user-id' WHERE user_id IS NULL;
UPDATE evolution_instances SET user_id = 'admin-user-id' WHERE user_id IS NULL;
```

## 📈 Performance e Índices

### Índices Criados Automaticamente:
```sql
-- Índices compostos para performance
CREATE INDEX idx_leads_user_status ON leads(user_id, status);
CREATE INDEX idx_campaigns_user_status ON campaigns(user_id, status);
CREATE INDEX idx_instances_user_status ON evolution_instances(user_id, status);

-- Índices de busca
CREATE FULLTEXT INDEX idx_leads_search ON leads(name, company, notes);
```

## 🔐 Recursos de Segurança

### 1. **Chaves Estrangeiras**
- Todos os dados vinculados a usuários com FOREIGN KEY
- CASCADE DELETE para manter integridade

### 2. **Restrições UNIQUE**
- Cada usuário só pode ter uma instância ativa
- Email único por usuário

### 3. **Auditoria**
- Logs de todas as operações
- Timestamps em todas as tabelas

## 📱 Integração com Frontend

### Atualizar Componentes:
```typescript
// Dashboard.tsx - filtrar dados do usuário
const { user } = useAuthStore();
const userStats = stats.filter(stat => stat.userId === user.id);

// Leads.tsx - mostrar apenas leads do usuário
const userLeads = leads.filter(lead => lead.userId === user.id);

// InstanceSettings.tsx - instâncias do usuário atual
const userInstances = instances.filter(instance => instance.userId === user.id);
```

## 🔄 Procedures Úteis

### Dashboard do Usuário:
```sql
CALL get_user_dashboard_data('user-uuid');
```

### Criar Instância do Usuário:
```sql
CALL create_user_instance('user-uuid', 'instance-name', 'phone', 'token', 'apikey');
```

## 📋 Checklist de Implementação

- [ ] Executar schema integrado no banco
- [ ] Atualizar types TypeScript
- [ ] Modificar services para incluir userId
- [ ] Atualizar stores para filtrar por usuário
- [ ] Implementar middleware de segurança na API
- [ ] Testar isolamento de dados
- [ ] Verificar performance das consultas
- [ ] Documentar acesso administrativo

## 🚨 Considerações de Segurança

1. **Nunca confie no frontend**: Sempre valide userId no backend
2. **Use JWT seguro**: Inclua userId no token
3. **Implemente rate limiting**: Previnir ataques de enumeração
4. **Logs de auditoria**: Registre todos os acessos
5. **Backup regular**: Proteja os dados dos usuários

## 📞 Suporte e Troubleshooting

### Problemas Comuns:

1. **Acesso cruzado de dados**:
   - Verifique se userId está sendo validado no backend
   - Confirme índices estão criados corretamente

2. **Performance lenta**:
   - Use views pré-definidas
   - Verifique plano de execução das queries

3. **Migração de dados**:
   - Faça backup antes de migrar
   - Teste em ambiente de desenvolvimento

---

Com este schema integrado, o Prospect+ agora garante que cada usuário tenha acesso **exclusivo e seguro** às suas informações de prospecção! 🎉
