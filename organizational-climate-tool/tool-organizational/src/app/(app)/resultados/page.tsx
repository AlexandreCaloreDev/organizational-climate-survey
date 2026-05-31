"use client";

import React, { useState, useEffect } from "react";
import { RadarComparativo } from "@/components/analytics/RadarComparativo";
import { HeatmapGlobal } from "@/components/analytics/HeatmapGlobal";
import { EvolucaoHistorica } from "@/components/analytics/EvolucaoHistorica";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb } from "lucide-react";
import { dashboardService } from "@/lib/services/dashboardService";
import { setorService } from "@/lib/services/setorService";
import { cicloService } from "@/lib/services/cicloService";
import type { RelatorioAnalyticsResponse, Setor, Ciclo } from "@/lib/types";

export default function AnalyticsDashboardPage() {
  const [cicloSelecionado, setCicloSelecionado] = useState<string>("todos");
  const [setorSelecionado, setSetorSelecionado] = useState<string>("todos");
  
  const [dados, setDados] = useState<RelatorioAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [ciclosDisponiveis, setCiclosDisponiveis] = useState<Ciclo[]>([]);
  const [setoresDisponiveis, setSetoresDisponiveis] = useState<Setor[]>([]);

  // Carrega Filtros Dinâmicos
  useEffect(() => {
    const carregarFiltros = async () => {
      try {
        const empresaId = 1; // ID da empresa mockado ou vindo de contexto de auth no futuro
        const [setores, ciclos] = await Promise.all([
          setorService.listByEmpresa(empresaId),
          cicloService.listByEmpresa(empresaId)
        ]);
        
        setSetoresDisponiveis(setores || []);
        setCiclosDisponiveis(ciclos || []);
      } catch (err) {
        console.error("Erro ao carregar filtros", err);
      }
    };
    carregarFiltros();
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        // Envia null se for "todos"
        const cicloParam = cicloSelecionado === "todos" ? "todos" : cicloSelecionado;
        const setorParam = setorSelecionado === "todos" ? null : setorSelecionado;
        const data = await dashboardService.getAnalyticsReport(cicloParam, setorParam);
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
                <SelectItem value="todos" className="font-semibold text-blue-600">Todos os Períodos</SelectItem>
                {ciclosDisponiveis.map(c => (
                  <SelectItem key={c.id_ciclo} value={c.id_ciclo.toString()}>{c.nome}</SelectItem>
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
                  <SelectItem key={s.id_setor} value={s.id_setor!.toString()}>{s.nome_setor}</SelectItem>
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
          {/* Grid de KPIs - Renderizado apenas se vier da API (Cenários 1 e 4) */}
          {dados.kpis && dados.kpis.length > 0 && (
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
          )}

          {/* Lógica da Matriz de 4 Quadrantes */}
          {setorSelecionado === "todos" && cicloSelecionado !== "todos" && (
            // CENÁRIO 1: Visão Global Atual (Setor: todos, Ciclo: específico)
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
          )}

          {( (setorSelecionado === "todos" && cicloSelecionado === "todos") || 
             (setorSelecionado !== "todos" && cicloSelecionado === "todos") ) && (
            // CENÁRIO 2 e 3: Visão Histórica (Ciclo: todos)
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-slate-800">
                  {setorSelecionado === "todos" ? "Evolução Histórica da Empresa" : "Evolução Histórica do Setor"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EvolucaoHistorica data={dados.evolucao || []} />
              </CardContent>
            </Card>
          )}
          
          {/* Cenário 4 (Setor Específico e Ciclo Específico) não renderiza gráficos comparativos ou de evolução */}

          {/* Planos de Ação e Alertas (Não renderiza nos cenários 2 e 3 se não vier na API) */}
          {dados.planos_de_acao && dados.planos_de_acao.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-amber-500" />
                Análise e Recomendações
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dados.planos_de_acao.map((plano, idx) => (
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
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex h-64 items-center justify-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
          Nenhum dado encontrado para os filtros selecionados.
        </div>
      )}
    </div>
  );
}

