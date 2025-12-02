# Prospect+ 🚀

Uma plataforma SaaS moderna para prospecção automatizada e disparos em massa via WhatsApp, Email, Instagram e Facebook.

## 📋 Sobre o Projeto

Prospect+ é uma solução completa para captura de leads e automação de comunicação. Com uma interface moderna e intuitiva, permite prospectar em múltiplas plataformas e realizar disparos personalizados em massa.

## ✨ Funcionalidades

### 🔍 Prospecção Multi-Plataforma
- **Google Maps**: Captura de estabelecimentos comerciais
- **LinkedIn**: Prospecção de profissionais e empresas
- **Facebook**: Busca em páginas comerciais
- **Instagram**: Perfis comerciais

### 💬 Sistema de Disparos
- **WhatsApp** (via Evolution API): Validação automática e envio em massa
- **Email**: Sistema de envio personalizado (Em desenvolvimento)
- **Instagram/Facebook** (via Meta API): Direct e Messenger (Em desenvolvimento)

### 📊 Dashboard e Análise
- Métricas em tempo real
- Gráficos de desempenho
- Histórico de atividades
- Taxa de sucesso e conversão

## 🛠️ Stack Tecnológico

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Estilização**: TailwindCSS
- **Roteamento**: React Router DOM
- **Estado Global**: Zustand
- **Gráficos**: Recharts
- **Ícones**: Lucide React
- **Notificações**: React Hot Toast
- **HTTP Client**: Axios

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ instalado
- npm ou yarn

### Instalação

```bash
# Instalar dependências
npm install

# Executar backend e frontend juntos (RECOMENDADO)
npm run dev

# Ou executar separadamente:
npm run backend  # Servidor backend (porta 3001)
npm run frontend # Interface React (porta 5173)

# Build para produção
npm run build

# Preview do build de produção
npm run preview
```

**Portas utilizadas:**
- Frontend (React): `http://localhost:5173`
- Backend (API): `http://localhost:3001`

**⚠️ IMPORTANTE**: Use sempre `npm run dev` para garantir que backend e frontend iniciem juntos!

## ⚙️ Configuração

### Evolution API (WhatsApp)

1. Acesse a página de **Configurações**
2. Configure a Evolution API com:
   - URL da API
   - Nome da Instância
   - Token de Autenticação (opcional)
3. Teste a conexão

**Documentação**: https://doc.evolution-api.com

### Meta API (Instagram & Facebook)

🚧 Em desenvolvimento. Documentação será adicionada em breve.

**Documentação**: https://developers.facebook.com/docs/instagram-platform

## 📁 Estrutura do Projeto

```
src/
├── components/
│   ├── layout/          # Layout principal, sidebar, header
│   └── ui/              # Componentes reutilizáveis (Button, Card, Input, etc)
├── pages/               # Páginas da aplicação
│   ├── Dashboard.tsx
│   ├── Prospecting.tsx
│   ├── Leads.tsx
│   └── Settings.tsx
├── services/            # Integrações com APIs externas
│   └── evolutionApi.ts
├── store/               # Estado global (Zustand)
│   └── useStore.ts
├── types/               # TypeScript types
│   └── index.ts
├── App.tsx             # Configuração de rotas
└── main.tsx            # Entry point

```

## 🎨 Design System

### Cores
- **Primary**: Azul (#0ea5e9)
- **Secondary**: Roxo (#a855f7)
- **Background**: Slate (#f8fafc)

### Componentes
- Buttons (primary, secondary, outline, ghost, danger)
- Cards (default, bordered, elevated)
- Inputs com validação
- Checkboxes customizados
- Toasts para notificações

## 📝 Roadmap

### Fase 1 - MVP ✅
- [x] Interface básica e navegação
- [x] Sistema de prospecção (Google Maps)
- [x] Integração Evolution API
- [x] Dashboard com métricas
- [x] Gestão de leads

### Fase 2 - Expansão 🚧
- [ ] Prospecção LinkedIn, Facebook, Instagram
- [ ] Sistema de envio de Email
- [ ] Disparos via Meta API
- [ ] Campanhas programadas

### Fase 3 - Refinamento 📋
- [ ] Relatórios avançados
- [ ] Templates de mensagens
- [ ] Automações e workflows
- [ ] Integrações com CRM

## 🤝 Contribuindo

Este é um projeto privado. Para sugestões ou reportar bugs, entre em contato.

## 📄 Licença

Todos os direitos reservados © 2024 Prospect+

## 📧 Suporte

Para dúvidas ou suporte, consulte a documentação das APIs:
- Evolution API: https://doc.evolution-api.com
- Meta API: https://developers.facebook.com/docs
