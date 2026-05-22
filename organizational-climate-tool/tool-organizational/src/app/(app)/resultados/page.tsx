"use client";
import React, { Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {  ListFilter, Filter, ArrowDownToLine } from "lucide-react";
import { ResultsDataTable, SurveyResult } from "@/components/dashboard/ResultsDataTable";
import { ExportReportButton } from "@/components/ui/export-report-button";

import type { Pesquisa as BackendPesquisa } from '@/lib/types';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { buildResultsFromPerguntas } from '@/lib/buildSurveyResults';
import { pesquisaService } from '@/lib/services/pesquisaService';
import { dashboardService } from '@/lib/services/dashboardService';
import { respostaService } from '@/lib/services/respostaService';
import { setorService } from '@/lib/services/setorService';

const ResultadosPage = () => {
  const [selectedSurvey, setSelectedSurvey] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("todos");
  const [displayResults, setDisplayResults] = useState<SurveyResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pesquisas, setPesquisas] = useState<BackendPesquisa[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [isLoadingSetores, setIsLoadingSetores] = useState(true);

  const { user } = useAuth();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!user?.empresa_id) return;
    const fetch = async () => {
      try {
        const list = await pesquisaService.listByEmpresa(user.empresa_id);
        setPesquisas(list || []);
      } catch (err) {
        console.error(err);
      }
    };
    const fetchSetores = async () => {
      try {
        setIsLoadingSetores(true);
        const list = await setorService.listByEmpresa(user.empresa_id);
        setSetores(list || []);
      } catch (err) {
        console.error("Erro ao carregar setores:", err);
      } finally {
        setIsLoadingSetores(false);
      }
    };
    fetch();
    fetchSetores();
  }, [user]);

  useEffect(() => {
    const pid = searchParams.get("pesquisa");
    if (!pid || !pesquisas.length) return;
    setSelectedSurvey(pid);
    applyFilters(pid, selectedDepartment);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, pesquisas]);

  // Função centralizada que busca e filtra os dados
  const applyFilters = (surveyId: string, department: string) => {
    if (!surveyId) {
      setDisplayResults([]);
      return;
    }

    setIsLoading(true);
    (async () => {
      try {
        const pid = Number(surveyId);
        
        // Sempre busca os detalhes da pesquisa (com as perguntas) para ter o texto e o tipo das perguntas
        const surveyDetails = await pesquisaService.getById(pid);
        
        // Se o departamento for filtrado, verifica se a pesquisa pertence a este setor
        if (department && department !== "todos") {
          const selectedSetor = setores.find(s => s.nome_setor.toLowerCase() === department.toLowerCase());
          if (selectedSetor && surveyDetails.id_setor !== selectedSetor.id_setor) {
            setDisplayResults([]);
            setIsLoading(false);
            return;
          }
        }

        const perguntas = (await pesquisaService.listPerguntas(pid)) || [];
        let stats: Record<string, Record<string, number>> = {};
        let dadosProc: Record<string, any> = {};

        try {
          const dashboard = await dashboardService.getByPesquisa(pid);
          if (dashboard?.id_dashboard) {
            const dashboardData = await dashboardService.getData(dashboard.id_dashboard);
            dadosProc = (dashboardData as any)?.dados_processados || {};
            Object.entries(dadosProc).forEach(([k, v]: [string, any]) => {
              const qId = k.replace("pergunta_", "");
              stats[qId] = v?.distribuicao || v?.dados || {};
            });
          }
        } catch {
          // fallback silencioso
        }

        if (Object.keys(stats).length === 0) {
          try {
            const rawStats = (await respostaService.getStatsByPesquisa(pid)) as Record<
              string,
              Record<string, number>
            >;
            Object.entries(rawStats || {}).forEach(([qId, dist]) => {
              stats[qId] = dist || {};
            });
          } catch {
            // fallback silencioso
          }
        }

        setDisplayResults(buildResultsFromPerguntas(perguntas, stats, dadosProc));
      } catch (err) {
        console.error("Erro ao aplicar filtros nos resultados:", err);
        setDisplayResults([]);
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const handleSurveyChange = (surveyId: string) => {
    setSelectedSurvey(surveyId);
    applyFilters(surveyId, selectedDepartment);
  };

  const handleDepartmentChange = (department: string) => {
    setSelectedDepartment(department);
    // Aplica o filtro apenas se uma pesquisa já estiver selecionada
    if (selectedSurvey) {
      applyFilters(selectedSurvey, department);
    }
  };

  return (
    <section className="container mx-auto px-4 mt-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="w-fit text-3xl font-bold tracking-tight bg-blue-600 text-white p-2 rounded-lg">
            Resultados Detalhados
          </h1>
          <p className="text-muted-foreground mt-2">
            Filtre e analise as respostas de cada pesquisa em detalhes.
          </p>
        </div>
        <ExportReportButton surveyId={selectedSurvey} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListFilter className="h-5 w-5" />
            Filtros de Análise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <Select onValueChange={handleSurveyChange} value={selectedSurvey}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a pesquisa" />
              </SelectTrigger>
              <SelectContent>
                {pesquisas.map((pesquisa) => (
                  <SelectItem key={pesquisa.id_pesquisa} value={String(pesquisa.id_pesquisa)}>
                    {pesquisa.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              onValueChange={handleDepartmentChange}
              value={selectedDepartment}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os setores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os setores</SelectItem>
                {isLoadingSetores ? (
                  <SelectItem value="loading" disabled>Carregando setores...</SelectItem>
                ) : setores.length > 0 ? (
                  setores.map((setor) => (
                    <SelectItem key={setor.id_setor} value={setor.nome_setor.toLowerCase()}>
                      {setor.nome_setor}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>Nenhum setor encontrado</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <ResultsDataTable data={displayResults} isLoading={isLoading} />
    </section>
  );
};

export default function ResultadosPageWrapper() {
  return (
    <Suspense fallback={<section className="container mx-auto px-4 mt-10">Carregando...</section>}>
      <ResultadosPage />
    </Suspense>
  );
}
