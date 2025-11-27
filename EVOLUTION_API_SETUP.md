# Configuração da Evolution API - Prospect+

Este guia explica como configurar a integração com a Evolution API para gerenciamento de instâncias WhatsApp no Prospect+.

## 📋 Pré-requisitos

- Evolution API instalada e configurada
- Acesso à API Key da Evolution API
- Banco de dados MySQL/MariaDB (opcional, para persistência)

## 🗄️ Configuração do Banco de Dados

Execute o script SQL localizado em `database/instances.sql` no seu banco de dados:

```bash
mysql -u usuario -p nome_do_banco < database/instances.sql
```

Este script criará:
- `evolution_instances` - Tabela principal de instâncias
- `evolution_connection_logs` - Logs de eventos de conexão
- `evolution_instance_settings` - Configurações específicas de cada instância
- Views e procedures para facilitar consultas

## ⚙️ Configuração das Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure as variáveis:

```bash
cp .env.example .env
```

Configure as seguintes variáveis no arquivo `.env`:

```env
# Evolution API (WhatsApp)
VITE_EVOLUTION_API_URL=https://sua-evolution-api.com
VITE_EVOLUTION_API_KEY=sua-api-key-global
```

**Importante**: 
- `VITE_EVOLUTION_API_URL`: URL completa da sua Evolution API
- `VITE_EVOLUTION_API_KEY`: API Key global da sua Evolution API

## 🚀 Funcionalidades Implementadas

### 1. **Cadastro de Instância**
- Interface intuitiva para criar novas instâncias
- Geração automática de QR Code
- Validação de número de telefone
- Monitoramento em tempo real do status de conexão

### 2. **Gerenciamento de Instâncias**
- Lista todas as instâncias criadas
- Status em tempo real (conectado, conectando, desconectado, erro)
- Ações de reiniciar, verificar status e excluir
- Informações detalhadas de cada instância

### 3. **Monitoramento de Conexão**
- Verificação automática a cada 30 segundos
- Indicadores visuais de status
- Informações de bateria do dispositivo conectado
- Logs de eventos de conexão

### 4. **Componentes Reutilizáveis**
- `InstanceRegister` - Componente de cadastro
- `ConnectionStatus` - Indicador de status
- `InstanceSettings` - Página de gerenciamento

## 📱 Fluxo de Uso

### Para o Usuário Final:

1. **Acessar Configurações de WhatsApp**
   - Menu lateral → WhatsApp
   - URL: `/instances`

2. **Criar Nova Instância**
   - Clique em "Criar Instância"
   - Informe o número de WhatsApp (apenas números, com DDI)
   - Ex: `5511999998888`

3. **Ler QR Code**
   - O sistema gerará um QR Code
   - Abra o WhatsApp no seu celular
   - Vá em "Dispositivos conectados" → "Conectar dispositivo"
   - Escaneie o QR Code ou use o código de pareamento

4. **Aguardar Conexão**
   - O sistema monitorará automaticamente
   - Status atualizará para "Conectado" quando bem-sucedido

### Para Administradores:

1. **Visualizar Todas as Instâncias**
   - Role para baixo na página de configurações
   - Veja todas as instâncias criadas por todos os usuários

2. **Gerenciar Instâncias**
   - Verificar status individual
   - Reiniciar instâncias com problemas
   - Excluir instâncias desnecessárias

## 🛠️ Estrutura do Código

### Types (`src/types/index.ts`)
```typescript
// Novos tipos adicionados:
- EvolutionInstance
- CreateInstanceRequest
- CreateInstanceResponse
- ConnectInstanceResponse
- ConnectionStateResponse
```

### Service (`src/services/evolutionService.ts`)
- Classe `EvolutionService` para comunicação com API
- Métodos para criar, conectar, gerenciar instâncias
- Tratamento de erros e timeouts

### Store (`src/store/useStore.ts`)
- Gerenciamento de estado das instâncias
- Operações CRUD para instâncias
- Persistência local com Zustand

### Componentes
- `InstanceRegister` - Formulário de cadastro com QR Code
- `ConnectionStatus` - Indicador de status em tempo real
- `InstanceSettings` - Página principal de gerenciamento

## 🔧 Configurações Avançadas

### Webhooks
O sistema configura automaticamente webhooks para:
- `APPLICATION_STARTUP` - Início da aplicação
- `QRCODE_UPDATED` - Atualização do QR Code
- `CONNECTION_UPDATE` - Mudanças no status de conexão

URL do webhook: `${window.location.origin}/webhook/evolution`

### Configurações Padrão da Instância
```typescript
{
  reject_call: true,
  msg_call: 'Desculpe, não consigo receber chamadas...',
  groups_ignore: false,
  always_online: true,
  read_messages: true,
  read_status: true
}
```

## 🐛 Troubleshooting

### Problemas Comuns:

1. **QR Code não aparece**
   - Verifique se `VITE_EVOLUTION_API_URL` está correta
   - Confirme se a API Key é válida
   - Verifique se a Evolution API está online

2. **Conexão falha**
   - Reinicie a instância pelo botão "Reiniciar"
   - Verifique se o WhatsApp está atualizado
   - Confirme se o número está correto

3. **Status não atualiza**
   - Aguarde até 30 segundos para verificação automática
   - Use o botão "Verificar Status" manualmente
   - Verifique logs no console do navegador

### Logs e Debug:
- Console do navegador: logs detalhados de todas as operações
- Network tab: visualize as requisições para a Evolution API
- Store do Zustand: estado completo das instâncias

## 🔐 Segurança

- API Keys configuradas via variáveis de ambiente
- Validação de entrada de dados
- Tratamento seguro de erros
- Sem exposição de credenciais no frontend

## 📈 Próximos Passos

1. **Implementar backend completo**
   - Persistência real no banco de dados
   - Autenticação de usuários
   - API REST para gerenciamento

2. **Recursos avançados**
   - Envio de mensagens em massa
   - Campanhas automatizadas
   - Relatórios e analytics

3. **Integrações**
   - Chatwoot para suporte
   - Typebot para automação
   - RabbitMQ para processamento de filas

## 📞 Suporte

Caso encontre problemas:
1. Verifique os logs no console do navegador
2. Confirme as configurações da Evolution API
3. Consulte a documentação oficial: https://doc.evolution-api.com

---

**Desenvolvido para Prospect+ - Sistema de Prospecção Inteligente**
