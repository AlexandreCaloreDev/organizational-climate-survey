// src/components/pesquisas/SurveyHistoricalTrends.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { apiGet } from "@/lib/api";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { Resposta } from "@/lib/types";

interface SurveyHistoricalTrendsProps {
  surveyId: string;
  dateRange: any; // O tipo real seria DateRange do react-day-picker
}

export function SurveyHistoricalTrends({ surveyId, dateRange }: SurveyHistoricalTrendsProps) {
  const [responses, setResponses] = useState<Resposta[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startDate = dateRange?.from ? dateRange.from.toLocaleDateString('pt-BR') : 'Início';
  const endDate = dateRange?.to ? dateRange.to.toLocaleDateString('pt-BR') : 'Fim';

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (!surveyId) return;
    if (!dateRange?.from || !dateRange?.to) return;

    const fetch = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const startStr = formatDate(dateRange.from);
        const endStr = formatDate(dateRange.to);
        const data = await apiGet<Resposta[]>(
          `/pesquisas/${surveyId}/respostas/by-date?start_date=${startStr}&end_date=${endStr}`
        );
        setResponses(data || []);
      } catch (err: any) {
        console.error(err);
        setErrorMsg("Erro no formato da data ou período inválido");
        toast.error("Erro no formato da data ou período inválido");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [surveyId, dateRange]);

  const chartData = useMemo(() => {
    const numericResponses = responses.filter((r) => {
      const num = Number(r.valor_resposta);
      return !isNaN(num) && num >= 1 && num <= 10;
    });

    if (numericResponses.length === 0) return [];

    const grouped: Record<string, { sum: number; count: number }> = {};
    numericResponses.forEach((r) => {
      const dateKey = r.data_submissao ? r.data_submissao.split("T")[0] : "";
      if (!dateKey) return;
      
      const val = Number(r.valor_resposta);
      if (!grouped[dateKey]) {
        grouped[dateKey] = { sum: 0, count: 0 };
      }
      grouped[dateKey].sum += val;
      grouped[dateKey].count += 1;
    });

    return Object.entries(grouped)
      .map(([date, info]) => {
        let formattedDate = date;
        try {
          const [year, month, day] = date.split("-");
          formattedDate = `${day}/${month}`;
        } catch {}

        return {
          rawDate: date,
          dateLabel: formattedDate,
          media: Number((info.sum / info.count).toFixed(2)),
          respostas: info.count,
        };
      })
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate));
  }, [responses]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          Tendência Histórica da Pesquisa
        </CardTitle>
        <CardDescription>
          Análise da evolução dos resultados ao longo do tempo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          **Pesquisa ID:** {surveyId} | **Intervalo Selecionado:** {startDate} até {endDate}
        </p>
        <div className="h-[1px] w-full bg-slate-200 my-4" />
        
        {loading ? (
          <div className="h-96 w-full flex items-center justify-center bg-gray-50 border rounded-lg">
            <p className="text-sm text-muted-foreground">Carregando dados históricos...</p>
          </div>
        ) : errorMsg ? (
          <div className="h-96 w-full flex items-center justify-center bg-red-50/50 border border-red-100 rounded-lg">
            <p className="text-sm text-red-500 font-medium">{errorMsg}</p>
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-96 w-full bg-white p-4 border rounded-lg">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 10, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} tickMargin={8} className="text-xs text-gray-500" />
                <YAxis domain={[0, 10]} tickLine={false} axisLine={false} tickMargin={8} className="text-xs text-gray-500" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 border rounded shadow text-xs">
                          <p className="font-semibold text-gray-700">{data.rawDate}</p>
                          <p className="text-blue-600 font-medium">Média: {data.media}</p>
                          <p className="text-gray-500">Respostas: {data.respostas}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line type="monotone" dataKey="media" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-96 w-full flex items-center justify-center bg-gray-50 border rounded-lg">
            <p className="text-sm text-muted-foreground italic text-center px-4">
              Nenhuma resposta numérica de escala encontrada para o período selecionado para traçar o gráfico de tendência.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="p-4 border rounded-lg bg-green-50/50">
                <h4 className="font-semibold text-green-700">Ponto Alto</h4>
                <p className="text-sm">O score de "Satisfação com a Liderança" aumentou 15% no último trimestre.</p>
            </div>
            <div className="p-4 border rounded-lg bg-red-50/50">
                <h4 className="font-semibold text-red-700">Ponto de Atenção</h4>
                <p className="text-sm">O score de "Equilíbrio entre Vida Pessoal e Profissional" caiu 8% no último mês.</p>
            </div>
            <div className="p-4 border rounded-lg bg-blue-50/50">
                <h4 className="font-semibold text-blue-700">Comparativo</h4>
                <p className="text-sm">O resultado atual está 5% acima da média anual.</p>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
