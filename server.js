import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { campaignWorker } from './backend/services/campaignWorker.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Aumenta limite para suportar base64 de arquivos
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

const GOOGLE_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;
const PORT = process.env.PORT || 3000;

if (!GOOGLE_API_KEY) {
  console.warn('⚠️ VITE_GOOGLE_MAPS_API_KEY não configurada no ambiente.');
}

// Inicia o Campaign Worker automaticamente
campaignWorker.start();

// --- Google Maps Proxy Routes ---

// Text Search
app.post('/api/places/search', async (req, res) => {
  try {
    const { query, city, state, country, pageToken } = req.body;
    console.log(`🔍 Buscando: ${query} em ${city}, ${state}`);

    const searchQuery = `${query} em ${city}, ${state}, ${country || 'Brasil'}`;
    const params = {
      query: searchQuery,
      key: GOOGLE_API_KEY,
      language: 'pt-BR',
    };

    if (pageToken) {
      params.pagetoken = pageToken;
    }

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/textsearch/json',
      { params }
    );

    res.json(response.data);
  } catch (error) {
    console.error('❌ Erro na busca:', error.message);
    res.status(500).json({ error: error.message, status: 'ERROR' });
  }
});

// Place Details
app.post('/api/places/details', async (req, res) => {
  try {
    const { placeId } = req.body;
    if (!placeId) return res.status(400).json({ error: 'placeId é obrigatório' });

    console.log(`📞 Buscando detalhes: ${placeId}`);

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/details/json',
      {
        params: {
          place_id: placeId,
          fields: 'formatted_phone_number,international_phone_number,name',
          key: GOOGLE_API_KEY,
          language: 'pt-BR',
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('❌ Erro ao buscar detalhes:', error.message);
    res.status(500).json({ error: error.message, status: 'ERROR' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Prospect+ Server' });
});

// --- WhatsApp API Routes ---

const EVOLUTION_API_URL = process.env.VITE_EVOLUTION_API_URL || process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.VITE_EVOLUTION_API_KEY || process.env.EVOLUTION_API_KEY;

// Verificar se número tem WhatsApp
app.post('/api/whatsapp/check-number', async (req, res) => {
  try {
    const { phoneNumber, instanceName } = req.body;
    
    // Normaliza o número
    let number = phoneNumber.replace(/\D/g, '');
    if (!number.startsWith('55')) {
      number = '55' + number;
    }

    console.log(`📱 Verificando WhatsApp: ${number}`);

    const response = await axios.post(
      `${EVOLUTION_API_URL}/chat/whatsappNumbers/${instanceName}`,
      { numbers: [number] },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
      }
    );

    const result = response.data?.[0];
    const exists = result?.exists || false;
    const jid = result?.jid || null;

    console.log(`   ${exists ? '✅' : '❌'} ${number}: ${exists ? 'Tem WhatsApp' : 'Não tem'}`);

    res.json({ exists, jid, number });
  } catch (error) {
    console.error('❌ Erro ao verificar WhatsApp:', error.message);
    res.json({ exists: false, error: error.message });
  }
});

// Enviar mensagem de texto
app.post('/api/whatsapp/send-text', async (req, res) => {
  try {
    const { phoneNumber, message, instanceName } = req.body;
    
    let number = phoneNumber.replace(/\D/g, '');
    if (!number.startsWith('55')) {
      number = '55' + number;
    }

    const response = await axios.post(
      `${EVOLUTION_API_URL}/message/sendText/${instanceName}`,
      { number, text: message },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
      }
    );

    console.log(`📤 Mensagem enviada para: ${number}`);
    res.json({ success: true, messageId: response.data?.key?.id });
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Enviar mídia
app.post('/api/whatsapp/send-media', async (req, res) => {
  try {
    const { phoneNumber, mediaUrl, mediaType, caption, fileName, instanceName } = req.body;
    
    let number = phoneNumber.replace(/\D/g, '');
    if (!number.startsWith('55')) {
      number = '55' + number;
    }

    const payload = {
      number,
      mediatype: mediaType,
      media: mediaUrl,
      caption: caption || '',
    };
    if (fileName) payload.fileName = fileName;

    const response = await axios.post(
      `${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
      }
    );

    console.log(`📤 Mídia enviada para: ${number}`);
    res.json({ success: true, messageId: response.data?.key?.id });
  } catch (error) {
    console.error('❌ Erro ao enviar mídia:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- End WhatsApp Routes ---

// --- Campaign Worker API Routes ---

// Status do worker
app.get('/api/campaign/status', (req, res) => {
  const status = campaignWorker.getStatus();
  res.json(status);
});

// Iniciar campanha (busca + validação + disparo)
app.post('/api/campaign/launch/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    console.log(`\n🚀 Iniciando campanha via API: ${campaignId}`);
    
    const result = await campaignWorker.launchCampaign(campaignId);
    res.json(result);
  } catch (error) {
    console.error('Erro ao iniciar campanha:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Pausar campanha
app.post('/api/campaign/stop/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    console.log(`\n⏸️ Pausando campanha via API: ${campaignId}`);
    
    const result = await campaignWorker.stopCampaign(campaignId);
    res.json(result);
  } catch (error) {
    console.error('Erro ao pausar campanha:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Retomar campanha
app.post('/api/campaign/resume/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    console.log(`\n▶️ Retomando campanha via API: ${campaignId}`);
    
    const result = await campaignWorker.resumeCampaign(campaignId);
    res.json(result);
  } catch (error) {
    console.error('Erro ao retomar campanha:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- End Campaign Worker Routes ---

// --- End Proxy Routes ---

// Catch-all route to serve index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
