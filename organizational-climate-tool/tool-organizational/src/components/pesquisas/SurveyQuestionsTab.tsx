"use client";

import React, { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiGet } from "@/lib/api";
import { perguntaService } from "@/lib/services/perguntaService";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

// Componente para exibir respostas de texto livre (sem gráficos)
const TextAnswerDetails = ({ question }: { question: any }) => {
  const stats = question.estatisticas;

  if (!stats || !stats.distribuicao || Object.keys(stats.distribuicao).length === 0 || stats.total_respostas === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhuma resposta textual registrada.</p>
    );
  }

  const respostas = Object.entries(stats.distribuicao);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-gray-700">{stats.total_respostas} resposta(s) recebida(s):</p>
      <div className="max-h-60 overflow-y-auto space-y-2">
        {respostas.map(([texto, qtd]: [string, any], idx) => (
          <div key={idx} className="bg-white border rounded-md p-3 text-sm text-gray-800">
            <span>&ldquo;{texto}&rdquo;</span>
            {Number(qtd) > 1 && (
              <Badge variant="outline" className="ml-2 text-xs">x{qtd}</Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente para exibir gráficos de distribuição (escala, múltipla escolha, sim/não)
const ChartAnswerDetails = ({ question }: { question: any }) => {
  const stats = question.estatisticas;

  if (!stats || !stats.distribuicao || Object.keys(stats.distribuicao).length === 0 || stats.total_respostas === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground mb-2">Nenhuma resposta registrada para esta pergunta.</p>
        <div className="flex items-center gap-2">
          <Progress value={0} className="flex-1" />
          <span className="text-xs">0%</span>
        </div>
      </div>
    );
  }

  const distribuicao = stats.distribuicao;

  // Normaliza as chaves da distribuição
  const normalizedDistribuicao: Record<string, number> = {};
  Object.entries(distribuicao).forEach(([key, value]) => {
    if (typeof value !== 'number') return;
    if (key === '[object Object]') return;
    
    if (key.includes(',')) {
      const subKeys = key.split(',').map(k => k.trim()).filter(Boolean);
      subKeys.forEach(subKey => {
        normalizedDistribuicao[subKey] = (normalizedDistribuicao[subKey] || 0) + value;
      });
    } else {
      normalizedDistribuicao[key] = (normalizedDistribuicao[key] || 0) + value;
    }
  });

  const entries = Object.entries(normalizedDistribuicao).filter(([_, v]) => typeof v === 'number');

  if (entries.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground mb-2">Nenhuma resposta registrada para esta pergunta.</p>
      </div>
    );
  }

  const normalizedTotal = Object.values(normalizedDistribuicao).reduce((a, b) => a + b, 0) || 1;

  const chartData = entries.map(([opcao, qtd]) => ({
    name: opcao,
    quantidade: Number(qtd),
    porcentagem: Math.round((Number(qtd) / normalizedTotal) * 100) || 0,
  }));

  return (
    <div className="flex flex-col md:flex-row gap-6 items-center">
      <div className="flex flex-col gap-4 flex-1 w-full">
        <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2 border-b pb-1"><span>Opção</span><span>Distribuição</span></div>
        {entries.map(([opcao, qtd]: [string, any]) => {
          const percent = Math.round((Number(qtd) / normalizedTotal) * 100) || 0;
          return (
            <div key={opcao} className="flex flex-col gap-1">
              <div className="flex justify-between text-sm text-gray-700">
                <span>{opcao}</span>
                <span className="font-semibold">{percent}%</span>
              </div>
              <Progress value={percent} className="h-2" />
            </div>
          );
        })}
      </div>
      <div className="h-44 w-full md:w-64 mt-2 md:mt-0 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={30} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-2 border rounded shadow text-xs">
                      <p className="font-semibold">{data.name}</p>
                      <p className="text-blue-600 font-medium">{data.quantidade} respostas ({data.porcentagem}%)</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="quantidade" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const SurveyQuestionsTab = ({ survey }: { survey?: any }) => {
  const [perguntasComStats, setPerguntasComStats] = useState<any[]>([]);

  useEffect(() => {
    const fetchQuestionsAndStats = async () => {
      if (!survey?.id_pesquisa && !survey?.id) return;
      
      const surveyId = survey.id_pesquisa || survey.id;
      
      try {
        const fetchedPerguntas = await perguntaService.listByPesquisa(Number(surveyId));
        
        // Tenta buscar stats — pode falhar se a pesquisa não tem respostas
        let statsMap: Record<string, Record<string, number>> = {};
        try {
          statsMap = await apiGet<Record<string, Record<string, number>>>(`/pesquisas/${surveyId}/respostas/stats`);
        } catch {
          // Pesquisas sem respostas retornam 500 — silenciamos e mostramos "0 respostas"
          console.warn("Stats indisponível para pesquisa", surveyId);
        }
        
        const mapped = (fetchedPerguntas || []).map((q: any) => {
          const qId = String(q.id_pergunta);
          const distribuicao = statsMap[qId] || {};
          const total_respostas = Object.values(distribuicao).reduce((acc: number, val: number) => acc + val, 0);
          return {
            ...q,
            estatisticas: {
              distribuicao,
              total_respostas,
            }
          };
        });
        setPerguntasComStats(mapped);
      } catch (err) {
        console.error("Erro ao buscar perguntas", err);
      }
    };
    fetchQuestionsAndStats();
  }, [survey]);

  const perguntas = perguntasComStats.length > 0 ? perguntasComStats : (survey?.perguntas || []);

  if (perguntas.length === 0) {
    return <p className="text-center py-10 text-muted-foreground">Nenhuma pergunta cadastrada para esta pesquisa.</p>;
  }

  const formatTipoPergunta = (tipo: string) => {
    switch (tipo) {
      case 'RespostaAberta': return 'Texto Livre';
      case 'MultiplaEscolha': return 'Múltipla Escolha';
      case 'EscalaNumerica': return 'Escala Numérica (1-10)';
      case 'SimNao': return 'Sim/Não';
      default: return tipo;
    }
  };

  return (
    <div className="overflow-y-auto pr-4 h-full">
      <Accordion type="single" collapsible className="w-full">
        {perguntas.map((q: any) => (
          <AccordionItem value={String(q.id_pergunta)} key={q.id_pergunta}>
            <AccordionTrigger>
              <div className="flex items-center gap-4 text-left">
                <Badge variant="secondary">{formatTipoPergunta(q.tipo_pergunta)}</Badge>
                <span>{q.texto_pergunta}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="p-4 bg-slate-50 rounded-md">
                {q.tipo_pergunta === 'RespostaAberta' ? (
                  <TextAnswerDetails question={q} />
                ) : (
                  <ChartAnswerDetails question={q} />
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
