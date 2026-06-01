"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RadarComparativo } from "@/components/analytics/RadarComparativo";
import { HeatmapGlobal } from "@/components/analytics/HeatmapGlobal";
import { EvolucaoHistorica } from "@/components/analytics/EvolucaoHistorica";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb, FileText, ArrowRight, Layers, BarChart2, Printer } from "lucide-react";
import { dashboardService } from "@/lib/services/dashboardService";
import { cicloService } from "@/lib/services/cicloService";
import { pesquisaService } from "@/lib/services/pesquisaService";
import type { RelatorioAnalyticsResponse, Ciclo, Pesquisa } from "@/lib/types";

function AnalyticsDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [cicloSelecionado, setCicloSelecionado] = useState<string>("todos");
  const [pesquisaSelecionada, setPesquisaSelecionada] = useState<string>("todos");
  
  const [dados, setDados] = useState<RelatorioAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [ciclosDisponiveis, setCiclosDisponiveis] = useState<Ciclo[]>([]);
  const [pesquisasDisponiveis, setPesquisasDisponiveis] = useState<Pesquisa[]>([]);

  // Carrega Filtros Dinâmicos Reais (Ciclos e Pesquisas)
  useEffect(() => {
    const carregarFiltros = async () => {
      try {
        const empresaId = 1; // ID da empresa
        const [ciclos, pesquisas] = await Promise.all([
          cicloService.listByEmpresa(empresaId),
          pesquisaService.listByEmpresa(empresaId)
        ]);
        
        setCiclosDisponiveis(ciclos || []);
        setPesquisasDisponiveis(pesquisas || []);
      } catch (err) {
        console.error("Erro ao carregar filtros", err);
      }
    };
    carregarFiltros();
  }, []);

  // Sincroniza Estados com a URL Query String
  useEffect(() => {
    const urlCiclo = searchParams.get("ciclo");
    const urlPesquisa = searchParams.get("pesquisa");

    if (urlCiclo) {
      setCicloSelecionado(urlCiclo);
    }
    
    if (urlPesquisa) {
      setPesquisaSelecionada(urlPesquisa);
    }
  }, [searchParams]);

  // Filtra as pesquisas associadas ao ciclo selecionado
  const pesquisasFiltradas = React.useMemo(() => {
    if (cicloSelecionado === "todos") {
      return pesquisasDisponiveis;
    }
    return pesquisasDisponiveis.filter(
      p => p.id_ciclo === Number(cicloSelecionado)
    );
  }, [cicloSelecionado, pesquisasDisponiveis]);

  // Se o ciclo selecionado mudar, verifica se a pesquisa selecionada atual ainda é válida dentro do ciclo filtrado.
  // Caso contrário, reseta para "todos".
  useEffect(() => {
    if (pesquisaSelecionada !== "todos") {
      const match = pesquisasFiltradas.find(
        p => p.id_pesquisa.toString() === pesquisaSelecionada
      );
      if (!match) {
        setPesquisaSelecionada("todos");
        const params = new URLSearchParams(searchParams.toString());
        params.set("pesquisa", "todos");
        router.push(`/resultados?${params.toString()}`);
      }
    }
  }, [cicloSelecionado, pesquisasFiltradas, pesquisaSelecionada, searchParams, router]);

  // Atualiza URL quando os filtros mudam localmente
  const handleFiltroCicloChange = (novoCiclo: string) => {
    setCicloSelecionado(novoCiclo);
    const params = new URLSearchParams(searchParams.toString());
    params.set("ciclo", novoCiclo);
    router.push(`/resultados?${params.toString()}`);
  };

  const handleFiltroPesquisaChange = (novaPesquisa: string) => {
    setPesquisaSelecionada(novaPesquisa);
    const params = new URLSearchParams(searchParams.toString());
    params.set("pesquisa", novaPesquisa);
    router.push(`/resultados?${params.toString()}`);
  };

  // Busca de Dados da API refletindo a Matriz de 4 Quadrantes baseada em Ciclo e Setor da Pesquisa
  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const cicloParam = cicloSelecionado === "todos" ? "todos" : cicloSelecionado;
        
        let setorParam: string | null = null;
        if (pesquisaSelecionada !== "todos") {
          const matchSurvey = pesquisasDisponiveis.find(
            p => p.id_pesquisa.toString() === pesquisaSelecionada
          );
          if (matchSurvey && matchSurvey.id_setor) {
            setorParam = matchSurvey.id_setor.toString();
          }
        }

        const data = await dashboardService.getAnalyticsReport(cicloParam, setorParam);
        setDados(data);
      } catch (error) {
        console.error("Erro ao buscar analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (pesquisasDisponiveis.length > 0 || cicloSelecionado === "todos") {
      fetchAnalytics();
    }
  }, [cicloSelecionado, pesquisaSelecionada, pesquisasDisponiveis]);

  // Identifica o objeto da pesquisa para o Cenário 4 (Pesquisa específica)
  const pesquisaCorrespondente = React.useMemo(() => {
    if (pesquisaSelecionada === "todos") return null;
    return pesquisasDisponiveis.find(
      p => p.id_pesquisa.toString() === pesquisaSelecionada
    );
  }, [pesquisaSelecionada, pesquisasDisponiveis]);

  return (
    <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header & Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart2 className="w-8 h-8 text-blue-600" />
            Relatório Cognitivo e Comportamental
          </h1>
          <p className="text-slate-500 mt-1">Análise de clima, riscos psicossociais e dimensões organizacionais da empresa.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 w-full md:w-auto print:hidden">
          <div className="w-full sm:w-[180px]">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Ciclo de Avaliação</label>
            <Select value={cicloSelecionado} onValueChange={handleFiltroCicloChange}>
              <SelectTrigger className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
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
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Pesquisa Específica</label>
            <Select value={pesquisaSelecionada} onValueChange={handleFiltroPesquisaChange}>
              <SelectTrigger className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
                <SelectValue placeholder="Selecione a Pesquisa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="font-semibold text-blue-600">Todas as Pesquisas</SelectItem>
                {pesquisasFiltradas.map(p => (
                  <SelectItem key={p.id_pesquisa} value={p.id_pesquisa.toString()}>
                    {p.titulo} (Setor: {p.setor?.nome_setor || "Geral"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={() => window.print()}
            className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 h-10 px-4 shrink-0"
          >
            <Printer className="w-4 h-4" />
            Exportar Relatório
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4 bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-semibold text-lg">Processando métricas analíticas...</p>
        </div>
      ) : dados ? (
        <>
          {/* Grid de KPIs - Renderizado se vier da API */}
          {dados.kpis && dados.kpis.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {dados.kpis.map((kpi, idx) => (
                <Card key={idx} className="border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 hover:translate-y-[-2px] bg-white break-inside-avoid print:block">
                  <CardContent className="p-6">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 truncate">{kpi.categoria}</p>
                    <div className="flex items-end justify-between">
                      <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                        {kpi.score.toFixed(1)}
                        <span className="text-lg text-slate-400 font-semibold ml-1">%</span>
                      </h3>
                      
                      <div className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full ${
                        kpi.delta_anterior > 0 
                          ? "text-emerald-700 bg-emerald-50" 
                          : kpi.delta_anterior < 0 
                            ? "text-rose-700 bg-rose-50" 
                            : "text-slate-500 bg-slate-50"
                      } print:hidden`}>
                        {kpi.delta_anterior > 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : kpi.delta_anterior < 0 ? (
                          <TrendingDown className="w-4 h-4" />
                        ) : (
                          <Minus className="w-4 h-4" />
                        )}
                        {Math.abs(kpi.delta_anterior)}%
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Lógica da Matriz de 4 Quadrantes */}
          
          {/* CENÁRIO 1: Visão Global do Ciclo (Pesquisa: todos + Ciclo: específico) */}
          {pesquisaSelecionada === "todos" && cicloSelecionado !== "todos" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white break-inside-avoid print:block">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-500" />
                    Comparativo entre Setores
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <RadarComparativo data={dados.radar || []} />
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white break-inside-avoid print:block">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    Matriz de Diagnóstico
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <HeatmapGlobal data={dados.heatmap || []} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* CENÁRIO 2 e 3: Visão Histórica (Ciclo: todos, Pesquisa: todos OU específica) */}
          {cicloSelecionado === "todos" && (
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white break-inside-avoid print:block">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  {pesquisaSelecionada === "todos" ? "Evolução Histórica da Empresa" : "Evolução Histórica do Setor"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <EvolucaoHistorica data={dados.evolucao || []} />
              </CardContent>
            </Card>
          )}
          
          {/* CENÁRIO 4: Visão Isolada da Pesquisa naquele Ciclo (Pesquisa: específica + Ciclo: específico) */}
          {pesquisaSelecionada !== "todos" && cicloSelecionado !== "todos" && (
            <div className="space-y-6">
              {pesquisaCorrespondente ? (
                <Card className="border-2 border-blue-100 bg-blue-50/40 shadow-sm rounded-xl overflow-hidden animate-in slide-in-from-bottom duration-300 break-inside-avoid print:block">
                  <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-blue-600 text-white font-bold text-xs uppercase rounded-md tracking-wider">
                          Laudo Encontrado
                        </span>
                        <span className="text-slate-500 text-sm print:hidden">
                          Pesquisa ID: #{pesquisaCorrespondente.id_pesquisa}
                        </span>
                      </div>
                      <h4 className="text-xl font-bold text-slate-900">
                        {pesquisaCorrespondente.titulo}
                      </h4>
                      <p className="text-slate-600 text-sm">
                        Esta pesquisa pertence ao ciclo de avaliação selecionado e ao setor{" "}
                        <strong className="text-slate-800">{pesquisaCorrespondente.setor?.nome_setor || "Geral"}</strong>.
                        O Laudo Técnico Completo com detalhamento das perguntas da NR17 está pronto.
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/relatorios/${pesquisaCorrespondente.id_pesquisa}`)}
                      className="cursor-pointer whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2 group shrink-0 print:hidden"
                    >
                      Visualizar Laudo Técnico Completo
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 p-6 rounded-xl break-inside-avoid print:block">
                  <CardContent className="flex flex-col items-center justify-center text-center p-4">
                    <AlertTriangle className="w-10 h-10 text-slate-400 mb-3" />
                    <h4 className="font-semibold text-slate-700 text-lg">Sem dados correspondentes</h4>
                    <p className="text-slate-500 text-sm max-w-md mt-1">
                      Não encontramos nenhuma pesquisa aplicada com estes parâmetros no momento.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Planos de Ação e Alertas (Renderizado nos Cenários 1 e 4 se houver dados) */}
          {dados.planos_de_acao && dados.planos_de_acao.length > 0 && (
            <div className="mt-8 break-inside-avoid print:block">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-amber-500" />
                Análise de Riscos e Recomendações
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dados.planos_de_acao.map((plano, idx) => (
                  <div 
                    key={idx} 
                    className="flex flex-col p-5 bg-white border-l-4 border-l-rose-500 rounded-r-lg shadow-sm border border-slate-200 transition-all hover:shadow-md hover:translate-x-[2px] break-inside-avoid print:block"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{plano.risco}</h4>
                        {plano.setor && (
                          <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-md">
                            Foco: {plano.setor}
                          </span>
                        )}
                        <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">
                          <span className="font-semibold text-slate-700">Ação Recomendada: </span>
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
        <div className="flex h-64 flex-col items-center justify-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <AlertTriangle className="w-10 h-10 text-slate-400 mb-2" />
          <p className="font-medium text-lg text-slate-600">Nenhum dado encontrado</p>
          <p className="text-sm text-slate-400">Não há dados computados para a combinação de filtros selecionada.</p>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-64 flex-col items-center justify-center bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium mt-2">Carregando painel de resultados...</p>
      </div>
    }>
      <AnalyticsDashboardContent />
    </Suspense>
  );
}
