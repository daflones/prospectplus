import { useState } from 'react';
import { Search, MapPin, Briefcase, Loader2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Switch from '../components/ui/Switch';
import Badge from '../components/ui/Badge';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import type { Lead } from '../types';

export default function Prospecting() {
  const { addLead } = useStore();
  const { user } = useAuthStore();
  const [isProspecting, setIsProspecting] = useState(false);
  
  const [sources, setSources] = useState({
    googleMaps: true,
    linkedin: false,
    facebook: false,
    instagram: false,
  });
  
  const [filters, setFilters] = useState({
    category: '',
    city: '',
    state: '',
    keywords: '',
  });
  
  const [results, setResults] = useState<Lead[]>([]);

  const handleProspect = async () => {
    if (!filters.category && !filters.keywords) {
      toast.error('Preencha pelo menos a categoria ou palavras-chave');
      return;
    }

    setIsProspecting(true);
    
    try {
      // Simulação de prospecção
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockLeads: Lead[] = [
        {
          id: '1',
          userId: user?.id || '',
          name: 'Empresa Exemplo Ltda',
          email: 'contato@exemplo.com',
          phone: '(11) 98765-4321',
          whatsapp: '11987654321',
          address: 'Rua Exemplo, 123',
          source: 'google-maps',
          category: filters.category,
          city: filters.city || 'São Paulo',
          state: filters.state || 'SP',
          status: 'new',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      setResults(mockLeads);
      toast.success(`${mockLeads.length} leads encontrados!`);
    } catch (error) {
      toast.error('Erro ao prospectar leads');
    } finally {
      setIsProspecting(false);
    }
  };

  const handleAddLead = (lead: Lead) => {
    addLead(lead);
    toast.success('Lead adicionado com sucesso!');
    setResults(prev => prev.filter(l => l.id !== lead.id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Prospecção de Leads
          </h1>
          <p className="text-gray-600">
            Encontre novos clientes em potencial automaticamente
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Filters Card */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Configurar Prospecção</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sources */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    Fontes de Dados
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Switch
                      checked={sources.googleMaps}
                      onCheckedChange={() => setSources(prev => ({ ...prev, googleMaps: !prev.googleMaps }))}
                      label="Google Maps"
                    />
                    <Switch
                      checked={sources.linkedin}
                      onCheckedChange={() => setSources(prev => ({ ...prev, linkedin: !prev.linkedin }))}
                      label="LinkedIn"
                    />
                    <Switch
                      checked={sources.facebook}
                      onCheckedChange={() => setSources(prev => ({ ...prev, facebook: !prev.facebook }))}
                      label="Facebook"
                    />
                    <Switch
                      checked={sources.instagram}
                      onCheckedChange={() => setSources(prev => ({ ...prev, instagram: !prev.instagram }))}
                      label="Instagram"
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Filtros de Busca
                  </h3>
                  
                  <Input
                    label="Categoria/Nicho"
                    placeholder="Ex: Restaurantes, Academias, Lojas..."
                    leftIcon={<Briefcase className="w-5 h-5" />}
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Cidade"
                      placeholder="São Paulo"
                      leftIcon={<MapPin className="w-5 h-5" />}
                      value={filters.city}
                      onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                    />
                    <Input
                      label="Estado"
                      placeholder="SP"
                      value={filters.state}
                      onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                    />
                  </div>

                  <Input
                    label="Palavras-chave"
                    placeholder="Palavras adicionais para refinar a busca"
                    value={filters.keywords}
                    onChange={(e) => setFilters({ ...filters, keywords: e.target.value })}
                  />
                </div>

                {/* Action Button */}
                <Button
                  onClick={handleProspect}
                  isLoading={isProspecting}
                  leftIcon={<Search className="w-5 h-5" />}
                  size="lg"
                  className="w-full"
                >
                  {isProspecting ? 'Prospectando...' : 'Iniciar Prospecção'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Stats Card */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Leads Encontrados</p>
                  <p className="text-3xl font-bold text-gray-900">{results.length}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Fontes Ativas</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {Object.values(sources).filter(Boolean).length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Resultados da Prospecção</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{lead.name}</h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span>{lead.phone}</span>
                          <span>{lead.city}, {lead.state}</span>
                          <Badge variant="info">{lead.source}</Badge>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleAddLead(lead)}
                        leftIcon={<Plus className="w-4 h-4" />}
                        size="sm"
                      >
                        Adicionar
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {!isProspecting && results.length === 0 && (
          <div className="mt-8">
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhuma prospecção realizada
                </h3>
                <p className="text-gray-600">
                  Configure os filtros e inicie uma prospecção para encontrar novos leads
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
