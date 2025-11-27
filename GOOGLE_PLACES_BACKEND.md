# Google Places API - Backend Proxy

## Problema

A Google Places API não pode ser chamada diretamente do frontend devido à política CORS (Cross-Origin Resource Sharing). Você receberá o erro:

```
Access to XMLHttpRequest at 'https://maps.googleapis.com/...' has been blocked by CORS policy
```

## Solução: Backend Proxy

Você precisa criar um endpoint backend que faça a requisição para a Google Places API e retorne os resultados para o frontend.

## Opção 1: Node.js/Express Backend

### 1. Instalar dependências

```bash
npm install express axios cors dotenv
```

### 2. Criar arquivo `server.js`

```javascript
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Endpoint para buscar lugares
app.post('/api/places/search', async (req, res) => {
  try {
    const { query, city, state, country } = req.body;
    const searchQuery = `${query} em ${city}, ${state}, ${country}`;

    // Text Search
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/textsearch/json',
      {
        params: {
          query: searchQuery,
          key: GOOGLE_PLACES_API_KEY,
          language: 'pt-BR',
        },
      }
    );

    if (response.data.status !== 'OK') {
      return res.status(400).json({ error: response.data.status });
    }

    const places = [];

    // Processa cada resultado
    for (const place of response.data.results) {
      // Busca detalhes para obter telefone
      const detailsResponse = await axios.get(
        'https://maps.googleapis.com/maps/api/place/details/json',
        {
          params: {
            place_id: place.place_id,
            fields: 'formatted_phone_number,international_phone_number',
            key: GOOGLE_PLACES_API_KEY,
            language: 'pt-BR',
          },
        }
      );

      const details = detailsResponse.data.result || {};

      places.push({
        name: place.name,
        businessType: place.types?.[0] || 'business',
        phoneNumber: details.international_phone_number || details.formatted_phone_number,
        address: place.formatted_address,
        city: extractCity(place.formatted_address),
        state: state,
        country: country,
        latitude: place.geometry?.location?.lat,
        longitude: place.geometry?.location?.lng,
        placeId: place.place_id,
      });
    }

    res.json({ places });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function extractCity(address) {
  const parts = address.split('-');
  if (parts.length >= 2) {
    return parts[1].trim().split(',')[0].trim();
  }
  return '';
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend proxy rodando na porta ${PORT}`);
});
```

### 3. Atualizar `.env`

```env
GOOGLE_PLACES_API_KEY=sua_chave_aqui
PORT=3001
```

### 4. Rodar o backend

```bash
node server.js
```

### 5. Atualizar `placesService.ts`

Descomente o código real e ajuste a URL:

```typescript
const response = await axios.post('http://localhost:3001/api/places/search', {
  query,
  city,
  state,
  country,
});

return response.data.places;
```

## Opção 2: Serverless (Vercel/Netlify Functions)

### Vercel

Criar arquivo `api/places/search.ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, city, state, country } = req.body;
  const searchQuery = `${query} em ${city}, ${state}, ${country}`;

  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/textsearch/json',
      {
        params: {
          query: searchQuery,
          key: process.env.GOOGLE_PLACES_API_KEY,
          language: 'pt-BR',
        },
      }
    );

    // Processar resultados...
    
    res.json({ places: /* ... */ });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

## Opção 3: Supabase Edge Functions

Criar função no Supabase:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { query, city, state, country } = await req.json()
  
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${Deno.env.get('GOOGLE_PLACES_API_KEY')}`
  )
  
  const data = await response.json()
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

## Custos da Google Places API

- **Text Search**: $32 por 1000 requisições
- **Place Details**: $17 por 1000 requisições

Considere implementar cache para reduzir custos!

## Alternativas Gratuitas

1. **OpenStreetMap Nominatim** - Gratuito, mas sem telefones
2. **Bing Maps API** - Créditos gratuitos mensais
3. **Mapbox** - 100k requisições gratuitas/mês

## Status Atual

✅ Sistema funcionando com dados MOCK para teste
⚠️ Implemente backend proxy para produção
📝 Código comentado está pronto em `placesService.ts`
