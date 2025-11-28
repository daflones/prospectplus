import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

const GOOGLE_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;
const PORT = process.env.PORT || 3000;

if (!GOOGLE_API_KEY) {
  console.warn('⚠️ VITE_GOOGLE_MAPS_API_KEY não configurada no ambiente.');
}

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

// --- End Proxy Routes ---

// Catch-all route to serve index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
