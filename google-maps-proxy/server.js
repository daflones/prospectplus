const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;
const PORT = process.env.PROXY_PORT || 3001;

if (!GOOGLE_API_KEY) {
  console.error('❌ ERRO: VITE_GOOGLE_MAPS_API_KEY não configurada no .env');
  process.exit(1);
}

console.log('✅ Google Maps API Key configurada');
console.log(`🚀 Servidor proxy iniciando na porta ${PORT}...`);

// Text Search - Busca estabelecimentos
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
    
    // Adiciona pageToken se fornecido (para paginação)
    if (pageToken) {
      params.pagetoken = pageToken;
      console.log(`📄 Buscando página: ${pageToken.substring(0, 20)}...`);
    }
    
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/textsearch/json',
      { params }
    );
    
    console.log(`✅ Status: ${response.data.status}`);
    console.log(`📊 Resultados: ${response.data.results?.length || 0}`);
    if (response.data.next_page_token) {
      console.log(`📄 Próxima página disponível`);
    }
    
    res.json(response.data);
  } catch (error) {
    console.error('❌ Erro na busca:', error.message);
    res.status(500).json({ 
      error: error.message,
      status: 'ERROR'
    });
  }
});

// Place Details - Busca detalhes de um lugar (telefone, etc)
app.post('/api/places/details', async (req, res) => {
  try {
    const { placeId } = req.body;
    
    if (!placeId) {
      return res.status(400).json({ error: 'placeId é obrigatório' });
    }
    
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
    
    if (response.data.result?.formatted_phone_number) {
      console.log(`✅ Telefone encontrado: ${response.data.result.formatted_phone_number}`);
    } else {
      console.log(`⚠️ Sem telefone`);
    }
    
    res.json(response.data);
  } catch (error) {
    console.error('❌ Erro ao buscar detalhes:', error.message);
    res.status(500).json({ 
      error: error.message,
      status: 'ERROR'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'Google Maps Proxy',
    apiKeyConfigured: !!GOOGLE_API_KEY
  });
});

app.listen(PORT, () => {
  console.log(`\n✅ Servidor proxy rodando!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔑 API Key: ${GOOGLE_API_KEY.substring(0, 10)}...`);
  console.log(`\n📚 Endpoints disponíveis:`);
  console.log(`   POST /api/places/search - Busca estabelecimentos`);
  console.log(`   POST /api/places/details - Busca detalhes (telefone)`);
  console.log(`   GET  /health - Status do servidor\n`);
});
