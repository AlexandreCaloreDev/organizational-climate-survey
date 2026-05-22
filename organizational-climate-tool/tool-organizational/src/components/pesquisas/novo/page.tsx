"use client"; // ESSENCIAL para usar Hooks como useState, useRouter, etc.

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
// Importe os componentes de gráfico que você precisa
import { ChartLineTrends } from '@/components/dashboard/charts/ChartLineTrends';
import { ChartBarComparative } from '@/components/dashboard/charts/ChartBarComparative';
import { useAuth } from '@/context/AuthContext';
import { pesquisaService } from '@/lib/services/pesquisaService';


export default function NovoRelatorioPage() {
  const { user } = useAuth();
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [surveys, setSurveys] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (!user?.empresa_id) return;
    pesquisaService.listByEmpresa(user.empresa_id)
      .then((data) => {
        setSurveys((data || []).map((p: any) => ({
          id: String(p.id_pesquisa),
          title: p.titulo,
        })));
      })
      .catch(console.error);
  }, [user]);

  const handleGenerateReport = () => {
    if (!selectedSurveyId) {
      // Use o toast para feedback
      // toast.error("Selecione uma pesquisa para gerar o relatório.");
      return;
    }
    // Lógica para gerar o relatório (ex: buscar dados da API)
    console.log(`Gerando relatório para a pesquisa: ${selectedSurveyId}`);
  };

  return (
    <section className="container mx-auto px-4 mt-10">
      <h1 className="w-fit text-3xl font-bold tracking-tight bg-blue-500 text-white p-2 rounded-lg">
        Criar Novo Relatório
      </h1>
      <p className="text-muted-foreground mt-2 mb-6">
        Selecione a pesquisa e os filtros para gerar um relatório analítico.
      </p>

      {/* 1. Área de Filtros e Controles */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros do Relatório</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4">
          {/* Seletor de Pesquisa */}
          <div className="flex-1">
            <label className="text-sm font-medium">Pesquisa Base</label>
            <Select onValueChange={setSelectedSurveyId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a pesquisa..." />
              </SelectTrigger>
              <SelectContent>
                {surveys.map(survey => (
                  <SelectItem key={survey.id} value={survey.id}>
                    {survey.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seletor de Período (Reutilizando componente) */}
          <div className="flex-1">
            <label className="text-sm font-medium">Período</label>
            <DateRangePicker date={dateRange} onSelect={setDateRange} />
          </div>

          <div className="flex items-end">
            <Button onClick={handleGenerateReport} disabled={!selectedSurveyId}>
              Gerar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Área de Visualização do Relatório (Condicional) */}
      {selectedSurveyId && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Relatório Analítico</h2>
          
          {/* Gráfico de Linha Temporal (Tendências) */}
          <ChartLineTrends dateRange={dateRange} />

          {/* Gráfico de Barras Comparativas (Ex: Comparação entre Setores) */}
          <ChartBarComparative dateRange={dateRange} />

          {/* Tabela de Dados Detalhados (Reutilizando DataTable) */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Detalhados das Respostas</CardTitle>
            </CardHeader>
            <CardContent>
              {/* <DataTable columns={...} data={...} /> */}
              <p className="text-muted-foreground">Tabela de dados detalhados seria renderizada aqui.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
