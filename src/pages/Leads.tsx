import { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Users,
  Search,
  Trash2,
  Send,
  Download,
  Plus,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import toast from 'react-hot-toast';

export default function Leads() {
  const { leads, deleteLead } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;

    return matchesSearch && matchesSource;
  });

  const handleSelectLead = (leadId: string) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId)
        ? prev.filter((id) => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map((lead) => lead.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedLeads.length === 0) {
      toast.error('Selecione pelo menos um lead');
      return;
    }

    selectedLeads.forEach((id) => deleteLead(id));
    setSelectedLeads([]);
    toast.success(`${selectedLeads.length} lead(s) excluído(s)`);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
      new: 'info',
      contacted: 'warning',
      interested: 'success',
      'not-interested': 'danger',
      converted: 'success',
      lost: 'danger',
    };
    return variants[status] || 'default';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: 'Novo',
      contacted: 'Contatado',
      interested: 'Interessado',
      'not-interested': 'Não Interessado',
      converted: 'Convertido',
      lost: 'Perdido',
    };
    return labels[status] || status;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Leads</h1>
            <p className="text-gray-600">
              Gerencie seus {leads.length} leads cadastrados
            </p>
          </div>
          <Button leftIcon={<Plus className="w-5 h-5" />}>
            Adicionar Lead
          </Button>
        </div>

        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <Input
                  placeholder="Buscar por nome, email ou telefone..."
                  leftIcon={<Search className="w-5 h-5" />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Source Filter */}
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
              >
                <option value="all">Todas as fontes</option>
                <option value="google-maps">Google Maps</option>
                <option value="linkedin">LinkedIn</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="manual">Manual</option>
              </select>

              {/* Actions */}
              {selectedLeads.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    leftIcon={<Send className="w-4 h-4" />}
                    size="sm"
                  >
                    Enviar ({selectedLeads.length})
                  </Button>
                  <Button
                    variant="danger"
                    leftIcon={<Trash2 className="w-4 h-4" />}
                    onClick={handleDeleteSelected}
                    size="sm"
                  >
                    Excluir
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        {filteredLeads.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left">
                        <input
                          type="checkbox"
                          checked={selectedLeads.length === filteredLeads.length}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Nome
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Contato
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Localização
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Fonte
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedLeads.includes(lead.id)}
                            onChange={() => handleSelectLead(lead.id)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">{lead.name}</p>
                            {lead.company && (
                              <p className="text-sm text-gray-600">{lead.company}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            {lead.email && (
                              <p className="text-gray-900">{lead.email}</p>
                            )}
                            {lead.phone && (
                              <p className="text-gray-600">{lead.phone}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900">
                            {lead.city && lead.state
                              ? `${lead.city}, ${lead.state}`
                              : lead.city || lead.state || '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={getStatusBadge(lead.status)}>
                            {getStatusLabel(lead.status)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="default">{lead.source}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                              <Send className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => {
                                deleteLead(lead.id);
                                toast.success('Lead excluído');
                              }}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum lead encontrado
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || sourceFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece adicionando seus primeiros leads'}
              </p>
              <Button leftIcon={<Plus className="w-5 h-5" />}>
                Adicionar Lead
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
