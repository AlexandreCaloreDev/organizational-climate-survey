"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, FileText } from "lucide-react";
import { cicloService } from "@/lib/services/cicloService";
import { pesquisaService } from "@/lib/services/pesquisaService";
import { respostaService } from "@/lib/services/respostaService";
import { buildResultsFromPerguntas } from "@/lib/buildSurveyResults";
import { ResultsDataTable } from "@/components/dashboard/ResultsDataTable";
import type { Ciclo, Pesquisa } from "@/lib/types";

function AnalyticsDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [cicloSelecionado, setCicloSelecionado] = useState<string>("todos");
  const [pesquisaSelecionada, setPesquisaSelecionada] = useState<string>("todos");
  
  const [tableResults, setTableResults] = useState<any[]>([]);
  const [resumosSetores, setResumosSetores] = useState<any[]>([]);
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

  // Busca de Dados da API e agrega perguntas/respostas
  useEffect(() => {
    const fetchRealData = async () => {
      setIsLoading(true);
      try {
        if (pesquisasDisponiveis.length === 0) {
          setTableResults([]);
          setResumosSetores([]);
          setIsLoading(false);
          return;
        }

        // Determina quais pesquisas foram selecionadas
        let selectedSurveys: Pesquisa[] = [];
        if (pesquisaSelecionada !== "todos") {
          const match = pesquisasDisponiveis.find(p => p.id_pesquisa.toString() === pesquisaSelecionada);
          if (match) selectedSurveys = [match];
        } else {
          selectedSurveys = pesquisasFiltradas;
        }

        if (selectedSurveys.length === 0) {
          setTableResults([]);
          setResumosSetores([]);
          setIsLoading(false);
          return;
        }

        // Busca perguntas e respostas de cada pesquisa em paralelo
        const surveysData = await Promise.all(
          selectedSurveys.map(async (p) => {
            try {
              const [perguntas, statsRaw] = await Promise.all([
                pesquisaService.listPerguntas(p.id_pesquisa),
                respostaService.getStatsByPesquisa(p.id_pesquisa).catch(() => ({}))
              ]);
              return { p, perguntas, statsRaw };
            } catch (err) {
              console.error(`Erro ao carregar dados da pesquisa ${p.id_pesquisa}:`, err);
              return { p, perguntas: [], statsRaw: {} };
            }
          })
        );

        // 1. Constrói o resumo por setor
        const summaries = surveysData.map(({ p, perguntas, statsRaw }) => {
          const stats = statsRaw as Record<string, Record<string, number>>;
          let maxAnswers = 0;
          perguntas.forEach((q: any) => {
            const qId = String(q.id_pergunta);
            const dist = stats[qId] || {};
            const totalQ = Object.values(dist).reduce((acc, count) => acc + Number(count), 0);
            if (totalQ > maxAnswers) {
              maxAnswers = totalQ;
            }
          });

          return {
            id_pesquisa: p.id_pesquisa,
            titulo: p.titulo,
            setor: p.setor?.nome_setor || "Geral",
            total_respostas: maxAnswers
          };
        });
        setResumosSetores(summaries);

        // 2. Agrega perguntas e respostas
        const aggregatedQuestions: Record<string, {
          texto_pergunta: string;
          tipo_pergunta: string;
          ordem_exibicao: number;
          id_pergunta_original: number;
          opcoes_resposta: string;
          distribuicao: Record<string, number>;
        }> = {};

        surveysData.forEach(({ perguntas, statsRaw }) => {
          const stats = statsRaw as Record<string, Record<string, number>>;
          perguntas.forEach((p: any) => {
            const normalizedText = p.texto_pergunta.trim().toLowerCase();
            const qId = String(p.id_pergunta);
            const dist = stats[qId] || {};

            if (!aggregatedQuestions[normalizedText]) {
              aggregatedQuestions[normalizedText] = {
                texto_pergunta: p.texto_pergunta,
                tipo_pergunta: p.tipo_pergunta,
                ordem_exibicao: p.ordem_exibicao,
                id_pergunta_original: p.id_pergunta,
                opcoes_resposta: p.opcoes_resposta || "",
                distribuicao: {},
              };
            }

            const aq = aggregatedQuestions[normalizedText];
            Object.entries(dist).forEach(([val, count]) => {
              aq.distribuicao[val] = (aq.distribuicao[val] || 0) + Number(count);
            });
          });
        });

        const aggregatedPerguntasList = Object.values(aggregatedQuestions).map((aq, index) => ({
          id_pergunta: aq.id_pergunta_original,
          texto_pergunta: aq.texto_pergunta,
          tipo_pergunta: aq.tipo_pergunta,
          ordem_exibicao: index + 1,
          opcoes_resposta: aq.opcoes_resposta,
        }));

        const aggregatedStats: Record<string, Record<string, number>> = {};
        Object.values(aggregatedQuestions).forEach((aq) => {
          aggregatedStats[String(aq.id_pergunta_original)] = aq.distribuicao;
        });

        const results = buildResultsFromPerguntas(aggregatedPerguntasList, aggregatedStats, {});
        setTableResults(results);

      } catch (err) {
        console.error("Erro ao carregar dados reais de pesquisa:", err);
        setTableResults([]);
        setResumosSetores([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (pesquisasDisponiveis.length > 0 || (ciclosDisponiveis.length > 0 && cicloSelecionado !== "todos")) {
      fetchRealData();
    }
  }, [cicloSelecionado, pesquisaSelecionada, pesquisasDisponiveis, ciclosDisponiveis, pesquisasFiltradas]);

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
          <div className="flex items-center gap-2">
            <h1 className="w-fit text-3xl font-bold tracking-tight bg-blue-600 text-white p-2 rounded-lg">
              Relatório Cognitivo e Comportamental
            </h1>
          </div>
          <p className="text-slate-500 mt-2">Análise de clima, riscos psicossociais e dimensões organizacionais da empresa.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 w-full md:w-auto print:hidden">
          <div className="w-full sm:w-[180px]">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Ciclo de Avaliação</label>
            <Select value={cicloSelecionado} onValueChange={handleFiltroCicloChange}>
              <SelectTrigger className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors w-full overflow-hidden">
                <span className="truncate pr-4 block text-left w-full">
                  <SelectValue placeholder="Selecione o Ciclo" />
                </span>
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
              <SelectTrigger className="bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors w-full overflow-hidden">
                <span className="truncate pr-4 block text-left w-full">
                  <SelectValue placeholder="Selecione a Pesquisa" />
                </span>
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
            onClick={() => {
              if (pesquisaSelecionada !== "todos") {
                router.push(`/relatorios/${pesquisaSelecionada}`);
              } else {
                router.push(`/relatorios/todos?ciclo=${cicloSelecionado}`);
              }
            }}
            disabled={cicloSelecionado === "todos"}
            className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 h-10 px-4 shrink-0 disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            Visualizar Relatório
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4 bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-semibold text-lg">Processando métricas analíticas...</p>
        </div>
      ) : tableResults.length > 0 ? (
        <div className="space-y-6">
          {/* Cenário 1: Se for mais de uma pesquisa que foi selecionada, mostramos a tabela de resumos por setor */}
          {pesquisaSelecionada === "todos" && resumosSetores.length > 0 && (
            <Card className="border border-slate-200 shadow-sm bg-white">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg font-bold text-slate-800">
                  Resumo de Respostas por Setor
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Setor</TableHead>
                      <TableHead>Pesquisa</TableHead>
                      <TableHead className="text-center">Total de Respostas</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumosSetores.map((r) => (
                      <TableRow key={r.id_pesquisa}>
                        <TableCell className="font-semibold text-slate-700">{r.setor}</TableCell>
                        <TableCell className="text-slate-600">{r.titulo}</TableCell>
                        <TableCell className="text-center font-medium">{r.total_respostas}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleFiltroPesquisaChange(r.id_pesquisa.toString())}
                          >
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}


          {/* Tabela de Perguntas e Respostas */}
          <ResultsDataTable data={tableResults} />
        </div>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <AlertTriangle className="w-10 h-10 text-slate-400 mb-2" />
          <p className="font-medium text-lg text-slate-600">Nenhum dado real encontrado</p>
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


