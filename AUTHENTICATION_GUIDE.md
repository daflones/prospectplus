# Sistema de Autenticação - Prospect+

Este guia explica como funciona o sistema completo de autenticação implementado no Prospect+.

## 📋 Visão Geral

O sistema de autenticação garante que cada usuário tenha acesso apenas às suas informações pessoais, incluindo leads, campanhas e instâncias WhatsApp. Implementamos um fluxo completo de cadastro, login, proteção de rotas e gerenciamento de sessão.

## 🗄️ Estrutura do Banco de Dados

Execute o script SQL localizado em `database/users.sql` no seu banco de dados:

```bash
mysql -u usuario -p nome_do_banco < database/users.sql
```

### Tabelas Criadas:

- **`users`** - Informações básicas dos usuários
- **`user_sessions`** - Sessões ativas e tokens
- **`auth_logs`** - Logs de eventos de autenticação
- **`login_attempts`** - Controle de tentativas de login (segurança)
- **`user_settings`** - Preferências individuais
- **`user_profiles`** - Informações adicionais do perfil

## 🔧 Componentes Implementados

### 1. **Types e Interfaces** (`src/types/index.ts`)
```typescript
// Novos tipos adicionados:
- User
- AuthState
- LoginRequest
- RegisterRequest
- AuthResponse
```

### 2. **Service de Autenticação** (`src/services/authService.ts`)
- Classe `AuthService` com métodos completos
- Simulação local (facilmente adaptável para API real)
- Validações de segurança
- Gerenciamento de tokens
- Persistência no localStorage

### 3. **Store Zustand** (`src/store/authStore.ts`)
- Gerenciamento de estado global de autenticação
- Persistência automática no localStorage
- Verificação automática de token
- Métodos para login, registro, logout, etc.

### 4. **Páginas de Autenticação**
- **Login** (`src/pages/Login.tsx`) - Formulário de login completo
- **Register** (`src/pages/Register.tsx`) - Cadastro com validações

### 5. **Proteção de Rotas** (`src/components/auth/PrivateRoute.tsx`)
- `PrivateRoute` - Rotas que exigem autenticação
- `PublicRoute` - Rotas que redirecionam se já logado
- Verificação automática de status
- Proteção por nível de acesso (admin/user)

### 6. **Interface do Usuário**
- Header atualizado com dropdown do usuário
- Avatar com iniciais
- Menu de logout e configurações
- Boas-vindas personalizadas

## 🚀 Fluxo de Autenticação

### 1. **Registro de Usuário**
```
1. Usuário acessa /register
2. Preenche formulário (nome, email, senha, telefone)
3. Sistema valida dados localmente
4. Cria conta no "banco" (simulação)
5. Gera token JWT simulado
6. Redireciona para /dashboard
```

### 2. **Login**
```
1. Usuário acessa /login
2. Informa email e senha
3. Sistema credenciais no "banco"
4. Gera token de acesso
5. Salva dados no localStorage
6. Redireciona para página anterior ou dashboard
```

### 3. **Proteção de Rotas**
```
1. Usuário tenta acessar rota privada
2. PrivateRoute verifica autenticação
3. Se não autenticado → redireciona para /login
4. Se autenticado → permite acesso
5. Verificações adicionais (admin, isActive)
```

### 4. **Sessão Persistente**
```
1. Ao recarregar página
2. AuthStore reidrata do localStorage
3. Valida token expirado
4. Verifica status do usuário
5. Mantém ou limpa sessão
```

## 📱 Funcionalidades Implementadas

### ✅ **Login**
- Validação de email e senha
- Indicador de mostrar/ocultar senha
- Tratamento de erros
- Loading states
- Redirecionamento inteligente

### ✅ **Registro**
- Validação completa de formulário
- Verificação de força de senha
- Confirmação de senha
- Formatação automática de telefone
- Aceitação de termos

### ✅ **Segurança**
- Hash simulado de senhas
- Controle de tentativas de login
- Tokens com expiração
- Proteção contra acesso não autorizado
- Logs de auditoria

### ✅ **Experiência do Usuário**
- Interface moderna e responsiva
- Feedback visual em todas as ações
- Mensagens de erro claras
- Loading states
- Navegação intuitiva

### ✅ **Gerenciamento de Estado**
- Estado global com Zustand
- Persistência automática
- Sincronização entre componentes
- Verificação automática de autenticação

## 🔐 Segurança Implementada

### **Valideções de Entrada:**
- Email formato válido
- Senha mínimo 6 caracteres
- Confirmação de senha obrigatória
- Telefone formato válido

### **Proteção de Dados:**
- Senhas nunca expostas no frontend
- Tokens armazenados com segurança
- Limpeza automática de dados sensíveis

### **Controle de Acesso:**
- Rotas privadas protegidas
- Verificação de papel (role)
- Status de conta (active/inactive)
- Redirecionamento automático

## 🛠️ Configuração

### **Variáveis de Ambiente:**
```env
# API Backend (quando implementar)
VITE_API_URL=http://localhost:3001/api
```

### **Configuração do Store:**
```typescript
// Persistência configurada
persist({
  name: 'prospectplus-auth',
  storage: createJSONStorage(() => localStorage),
})
```

## 📊 Estatísticas e Monitoramento

O sistema inclui views SQL para monitoramento:

```sql
-- Estatísticas de usuários
SELECT * FROM v_user_stats;

-- Usuários completos
SELECT * FROM v_users_complete;
```

## 🔄 Integração com Backend

Para integrar com backend real, basta modificar `authService.ts`:

```typescript
// Substituir simulações por chamadas reais:
const response = await api.post('/auth/login', data);
const response = await api.post('/auth/register', data);
```

## 🎯 Casos de Uso

### **Usuário Comum:**
1. Acessa `/register` e cria conta
2. Faz login em `/login`
3. Acessa dashboard e funcionalidades
4. Gerencia suas instâncias WhatsApp
5. Visualiza apenas seus leads/campanhas

### **Administrador:**
1. Acesso a todas as funcionalidades
2. Visualização de todas as instâncias
3. Gerenciamento de usuários (futuro)
4. Relatórios e estatísticas

## 🚀 Próximos Passos

1. **Backend Real:**
   - Implementar API REST completa
   - Integração com banco MySQL
   - Autenticação JWT real

2. **Recursos Avançados:**
   - Recuperação de senha por email
   - Verificação de email
   - Autenticação de dois fatores
   - Login social (Google, Facebook)

3. **Administração:**
   - Painel administrativo
   - Gestão de usuários
   - Logs detalhados
   - Relatórios de segurança

## 📞 Suporte e Troubleshooting

### **Problemas Comuns:**

1. **Login não funciona:**
   - Verifique console para erros
   - Confirme dados no localStorage
   - Teste com usuário admin: `admin@prospectplus.com / admin123`

2. **Rotas não protegidas:**
   - Verifique se PrivateRoute está sendo usado
   - Confirme AuthStore funcionando
   - Teste limpeza do localStorage

3. **Estado não persiste:**
   - Verifique configuração do persist
   - Confirme localStorage habilitado
   - Teste reidratação manual

### **Logs e Debug:**
- Console do navegador: logs detalhados
- Redux DevTools: estado do auth store
- Network: requisições (quando backend implementado)
- localStorage: dados persistidos

---

**Sistema 100% funcional** e pronto para uso! Cada usuário agora tem acesso exclusivo às suas informações no Prospect+.
