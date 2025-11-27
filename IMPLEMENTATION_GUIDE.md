# 🚀 Guia de Implementação - Prospect+

Este documento descreve como implementar as funcionalidades reais de prospecção e disparos.

## 📋 Índice

1. [Implementação Evolution API (WhatsApp)](#evolution-api)
2. [Implementação Google Maps API](#google-maps-api)
3. [Implementação LinkedIn Scraping](#linkedin-scraping)
4. [Implementação Meta API (Instagram/Facebook)](#meta-api)
5. [Sistema de Email](#sistema-de-email)

---

## 🟢 Evolution API (WhatsApp)

### Configuração Inicial

A Evolution API já está integrada no projeto (`src/services/evolutionApi.ts`). Para usar:

1. **Obter Instância Evolution API**
   - Hospede sua própria instância ou use um serviço gerenciado
   - Documen tação: https://doc.evolution-api.com/v2/en/get-started/installation

2. **Configurar no Prospect+**
   - Acesse: Configurações → Evolution API
   - Preencha:
     - URL da API: `https://sua-api.com`
     - Nome da Instância: `sua-instancia`
     - Token (opcional): seu token de autenticação

3. **Conectar WhatsApp**
   - Use QR Code ou token do WhatsApp Business
   - Siga: https://doc.evolution-api.com/v2/en/integrations/cloudapi

### Funcionalidades Implementadas

✅ **Validação de WhatsApp**
```typescript
import { evolutionApi } from './services/evolutionApi';

// Inicializar
evolutionApi.initialize(config);

// Validar número
const isValid = await evolutionApi.validateWhatsApp('5511999999999');
```

✅ **Envio de Mensagens**
```typescript
// Enviar mensagem única
await evolutionApi.sendTextMessage('5511999999999', 'Olá!');

// Envio em massa
const results = await evolutionApi.sendBulkMessages([
  { phoneNumber: '5511999999999', message: 'Olá Lead 1!' },
  { phoneNumber: '5511988888888', message: 'Olá Lead 2!' },
]);
```

### Próximos Passos

- [ ] Implementar página de Campanhas (criar e agendar disparos)
- [ ] Sistema de filas para evitar bloqueio
- [ ] Webhooks para status de entrega
- [ ] Templates de mensagens personalizadas

---

## 🗺️ Google Maps API

### O que implementar

**Arquivo**: `src/services/googleMapsApi.ts`

```typescript
import axios from 'axios';

export interface GooglePlaceResult {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
}

class GoogleMapsService {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Buscar estabelecimentos por categoria e localização
   */
  async searchPlaces(
    category: string,
    city: string,
    state: string
  ): Promise<GooglePlaceResult[]> {
    const query = `${category} in ${city}, ${state}`;
    
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/textsearch/json',
      {
        params: {
          query,
          key: this.apiKey,
        },
      }
    );

    return response.data.results.map((place: any) => ({
      name: place.name,
      address: place.formatted_address,
      phone: place.formatted_phone_number,
      rating: place.rating,
    }));
  }

  /**
   * Obter detalhes completos de um estabelecimento
   */
  async getPlaceDetails(placeId: string) {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/details/json',
      {
        params: {
          place_id: placeId,
          fields: 'name,formatted_address,formatted_phone_number,website,rating',
          key: this.apiKey,
        },
      }
    );

    return response.data.result;
  }
}

export const googleMapsApi = new GoogleMapsService(
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY
);
```

### Configuração

1. **Obter API Key**
   - Console: https://console.cloud.google.com
   - Ativar: Places API, Geocoding API

2. **Configurar Variáveis de Ambiente**
   ```bash
   # .env
   VITE_GOOGLE_MAPS_API_KEY=sua_api_key_aqui
   ```

3. **Integrar na página de Prospecção**
   - Substituir mock em `src/pages/Prospecting.tsx`
   - Chamar `googleMapsApi.searchPlaces()` ao invés do mock

---

## 🔗 LinkedIn Scraping

### ⚠️ Atenção Legal

LinkedIn proíbe scraping automatizado. Alternativas:

1. **LinkedIn Sales Navigator API** (pago, oficial)
2. **Proxy/Scraper com cuidado** (risco de ban)
3. **Integração manual** (usuário faz busca e importa CSV)

### Implementação Recomendada: Import CSV

**Arquivo**: `src/components/LinkedInImport.tsx`

```typescript
import { useState } from 'react';
import { Upload } from 'lucide-react';
import Button from './ui/Button';
import { useStore } from '../store/useStore';
import Papa from 'papaparse'; // npm install papaparse

export function LinkedInImport() {
  const { addLead } = useStore();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        results.data.forEach((row: any) => {
          addLead({
            id: `linkedin-${Date.now()}-${Math.random()}`,
            name: row['Full Name'] || row['Name'],
            email: row['Email'],
            phone: row['Phone'],
            source: 'linkedin',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        });
      },
    });
  };

  return (
    <div>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="hidden"
        id="linkedin-upload"
      />
      <label htmlFor="linkedin-upload">
        <Button as="span" icon={<Upload />}>
          Importar CSV do LinkedIn
        </Button>
      </label>
    </div>
  );
}
```

---

## 📱 Meta API (Instagram/Facebook)

### Configuração

1. **Criar App no Facebook Developers**
   - Portal: https://developers.facebook.com
   - Criar novo app
   - Adicionar Instagram Messaging

2. **Obter Credenciais**
   - App ID
   - App Secret
   - Access Token (via OAuth)

3. **Implementar Serviço**

**Arquivo**: `src/services/metaApi.ts`

```typescript
import axios from 'axios';

class MetaAPIService {
  private accessToken: string;
  private apiVersion = 'v18.0';

  initialize(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Enviar mensagem via Instagram
   */
  async sendInstagramMessage(recipientId: string, message: string) {
    const response = await axios.post(
      `https://graph.facebook.com/${this.apiVersion}/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text: message },
      },
      {
        params: {
          access_token: this.accessToken,
        },
      }
    );

    return response.data;
  }

  /**
   * Enviar mensagem via Facebook Messenger
   */
  async sendMessengerMessage(recipientId: string, message: string) {
    // Mesmo endpoint, apenas muda o page token
    return this.sendInstagramMessage(recipientId, message);
  }
}

export const metaApi = new MetaAPIService();
```

### Documentação Importante

- **Instagram Messaging**: https://developers.facebook.com/docs/messenger-platform/instagram
- **Facebook Messenger**: https://developers.facebook.com/docs/messenger-platform
- **Webhooks**: https://developers.facebook.com/docs/messenger-platform/webhooks

---

## 📧 Sistema de Email

### Opções de Implementação

#### Opção 1: SendGrid (Recomendado)

```typescript
// src/services/emailService.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendEmail(to: string, subject: string, html: string) {
  await sgMail.send({
    to,
    from: 'seu-email@dominio.com',
    subject,
    html,
  });
}
```

#### Opção 2: Nodemailer + SMTP

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
}
```

**⚠️ Nota**: Email em massa requer backend. O frontend sozinho não pode enviar emails.

---

## 🔐 Segurança e Boas Práticas

### Variáveis de Ambiente

Criar arquivo `.env`:

```bash
# Evolution API
VITE_EVOLUTION_API_URL=https://sua-api.com
VITE_EVOLUTION_INSTANCE=sua-instancia

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=sua_key

# Meta API
VITE_META_APP_ID=seu_app_id
VITE_META_APP_SECRET=seu_secret

# Email (Backend)
SENDGRID_API_KEY=sua_key
EMAIL_USER=seu@email.com
EMAIL_PASS=senha
```

### Rate Limiting

Implementar delays entre requisições:

```typescript
async function sendWithDelay(items: any[], delayMs = 1000) {
  for (const item of items) {
    await sendMessage(item);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}
```

### Tratamento de Erros

```typescript
try {
  await evolutionApi.sendTextMessage(phone, message);
} catch (error) {
  if (error.response?.status === 429) {
    // Rate limit - aguardar e tentar novamente
    await wait(5000);
    return retry();
  }
  // Logar erro e notificar usuário
  console.error(error);
  toast.error('Falha no envio');
}
```

---

## 📊 Próximas Features

### Fase 2
- [ ] Sistema de Campanhas completo
- [ ] Agendamento de disparos
- [ ] Templates de mensagens
- [ ] Webhooks para status
- [ ] Relatórios detalhados

### Fase 3
- [ ] CRM integrado
- [ ] Automações (workflows)
- [ ] Segmentação avançada
- [ ] A/B Testing de mensagens
- [ ] Análise de sentimento

---

## 🆘 Suporte e Recursos

### Documentações Oficiais
- Evolution API: https://doc.evolution-api.com
- Google Maps API: https://developers.google.com/maps
- Meta API: https://developers.facebook.com/docs
- SendGrid: https://docs.sendgrid.com

### Comunidades
- Evolution API Discord: [Link no GitHub]
- Meta Developers: https://developers.facebook.com/community

---

**Desenvolvido com ❤️ para Prospect+**
