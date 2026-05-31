"use client";

import React, { useState, useEffect } from "react";
import { RadarComparativo } from "@/components/analytics/RadarComparativo";
import { HeatmapGlobal } from "@/components/analytics/HeatmapGlobal";
import { EvolucaoHistorica } from "@/components/analytics/EvolucaoHistorica";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb } from "lucide-react";
import { dashboardService } from "@/lib/services/dashboardService";
import type { RelatorioAnalyticsResponse } from "@/lib/types";

export default function AnalyticsDashboardPage() {
  const [cicloSelecionado, setCicloSelecionado] = useState<string>("2026.1");
  const [setorSelecionado, setSetorSelecionado] = useState<string>("todos");
  
  const [dados, setDados] = useState<RelatorioAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Mocks de filtros para o MVP (estes ainda podem ser mockados ou vir de um fetch de ciclos)
  const ciclosDisponiveis = ["2026.1", "2025.2", "2025.1"];
  const setoresDisponiveis = [
    { id: "1", nome: "Recursos Humanos" },
    { id: "2", nome: "Operações" },
    { id: "3", nome: "Tecnologia" },
  ];

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const data = await dashboardService.getAnalyticsReport(cicloSelecionado, setorSelecionado);
        setDados(data);
      } catch (error) {
        console.error("Erro ao buscar analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [cicloSelecionado, setorSelecionado]);

  return (
    <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header & Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Relatório Cognitivo e Comportamental</h1>
          <p className="text-slate-500 mt-1">Análise aprofundada de riscos e dimensões organizacionais.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="w-full sm:w-[180px]">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Ciclo de Avaliação</label>
            <Select value={cicloSelecionado} onValueChange={setCicloSelecionado}>
              <SelectTrigger className="bg-slate-50">
                <SelectValue placeholder="Selecione o Ciclo" />
              </SelectTrigger>
              <SelectContent>
                {ciclosDisponiveis.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-[220px]">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Recorte por Setor</label>
            <Select value={setorSelecionado} onValueChange={setSetorSelecionado}>
              <SelectTrigger className="bg-slate-50">
                <SelectValue placeholder="Selecione o Setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="font-semibold text-blue-600">Todos os Setores</SelectItem>
                {setoresDisponiveis.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Processando métricas analíticas...</p>
        </div>
      ) : dados ? (
        <>
          {/* Grid de KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dados.kpis.map((kpi, idx) => (
              <Card key={idx} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-slate-500 mb-2 truncate">{kpi.categoria}</p>
                  <div className="flex items-end justify-between">
                    <h3 className="text-3xl font-bold text-slate-900">{kpi.score.toFixed(1)}<span className="text-lg text-slate-400 font-medium ml-1">%</span></h3>
                    
                    <div className={`flex items-center gap-1 text-sm font-semibold ${
                      kpi.delta_anterior > 0 ? "text-emerald-600" : kpi.delta_anterior < 0 ? "text-rose-600" : "text-slate-400"
                    }`}>
                      {kpi.delta_anterior > 0 ? <TrendingUp className="w-4 h-4" /> : kpi.delta_anterior < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                      {Math.abs(kpi.delta_anterior)}%
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Lógica Condicional: Cenário A vs Cenário B */}
          {setorSelecionado === "todos" ? (
            // CENÁRIO A: Visão Global
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="col-span-1 border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-800">Comparativo entre Setores</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadarComparativo data={dados.radar || []} />
                </CardContent>
              </Card>

              <Card className="col-span-1 border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-800">Matriz de Diagnóstico</CardTitle>
                </CardHeader>
                <CardContent>
                  <HeatmapGlobal data={dados.heatmap || []} />
                </CardContent>
              </Card>
            </div>
          ) : (
            // CENÁRIO B: Visão Isolada (Evolução)
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-slate-800">Evolução Histórica do Setor</CardTitle>
              </CardHeader>
              <CardContent>
                <EvolucaoHistorica data={dados.evolucao || []} />
              </CardContent>
            </Card>
          )}

          {/* Planos de Ação e Alertas */}
          <div className="mt-10">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-amber-500" />
              Análise e Recomendações
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dados.planos_de_acao.length > 0 ? (
                dados.planos_de_acao.map((plano, idx) => (
                  <div key={idx} className="flex flex-col p-5 bg-white border-l-4 border-l-rose-500 rounded-r-lg shadow-sm border border-slate-200">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{plano.risco}</h4>
                        {plano.setor && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-md">
                            Foco: {plano.setor}
                          </span>
                        )}
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                          <span className="font-semibold text-slate-700">Ação Sugerida: </span>
                          {plano.recomendacao}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-1 md:col-span-2 p-6 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500">
                  Nenhum alerta crítico ou recomendação pendente para este filtro.
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex h-64 items-center justify-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
          Nenhum dado encontrado para os filtros selecionados.
        </div>
      )}
    </div>
  );
}
