"use client";

import * as React from "react";
import {
  Scatter,
  ScatterChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { TrendingUp } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/**
 * Estrutura de dados para uma resposta individual da pesquisa.
 */
export interface RespostaIndividual {
  usuarioId: string;
  perguntaId: string;
  categoria: string;
  departamento?: string;
  pontuacao: number;
  respondidoEm: string; // Data/hora da resposta no formato ISO 8601
  pontuacaoMaxima: number; // Pontuação máxima possível para a pergunta (ex: 5 ou 10)
}

interface IndividualScoresScatterPlotProps {
  data?: RespostaIndividual[];
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-2 text-sm bg-background border rounded-lg shadow-lg">
          <p className="font-bold">
            {`Respondido em: ${new Date(data.respondidoEm).toLocaleDateString(
              "pt-BR",
              { day: "2-digit", month: "short", year: "numeric" }
            )}`}
          </p>
          <p style={{ color: payload[0].color }}>
            {`${data.categoria}: ${data.pontuacao.toFixed(0)}`}
          </p>
          {data.departamento && (
            <p className="text-muted-foreground">{`Depto: ${data.departamento}`}</p>
          )}
        </div>
      );
    }
    return null;
};

export function IndividualScoresScatterPlot({ data: propData }: IndividualScoresScatterPlotProps) {
  const [unifyPoints, setUnifyPoints] = React.useState(false);
  const data = propData ?? [];

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp /> Dispersão de Pontuações Individuais
          </CardTitle>
          <CardDescription>
            Visualização da dispersão das respostas individuais ao longo do tempo, por categoria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Não há dados de respostas para exibir no momento.</p>
        </CardContent>
      </Card>
    );
  }

  // Detecta a pontuação máxima para definir o domínio do eixo Y dinamicamente.
  const yAxisMax = Math.max(...data.map(item => item.pontuacaoMaxima), 5);
  const yAxisTicks = Array.from({ length: yAxisMax + 1 }, (_, i) => i);

  const { periodos, dataWithJitter } = React.useMemo(() => {
    const getMonthYear = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '').replace(' de ', '/');
    };

    const meses: { [key: string]: number } = { 'jan': 1, 'fev': 2, 'mar': 3, 'abr': 4, 'mai': 5, 'jun': 6, 'jul': 7, 'ago': 8, 'set': 9, 'out': 10, 'nov': 11, 'dez': 12 };

    const currentPeriodos = [...new Set(data.map(item => getMonthYear(item.respondidoEm)))].sort((a, b) => {
          const [m1Str, y1] = a.toLowerCase().split('/');
          const [m2Str, y2] = b.toLowerCase().split('/');
          const dateA = new Date(parseInt(`20${y1}`), meses[m1Str] - 1);
          const dateB = new Date(parseInt(`20${y2}`), meses[m2Str] - 1);
          return dateA.getTime() - dateB.getTime();
        });

    const periodoMap = new Map(currentPeriodos.map((p, i) => [p, i]));

    const processedData = data.map(item => {
      const periodo = getMonthYear(item.respondidoEm);
      const jitter = unifyPoints ? 0 : (Math.random() - 0.5) * 0.7;
      return {
        ...item,
        periodo,
        x: (periodoMap.get(periodo) ?? 0) + jitter,
        y: item.pontuacao,
      };
    });

    return { periodos: currentPeriodos, dataWithJitter: processedData };
  }, [data, unifyPoints]);

  // Agrupa os dados por categoria para renderizar um <Scatter> para cada uma.
  const groupedData = dataWithJitter.reduce((acc, item) => {
    const key = item.categoria;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<string, typeof dataWithJitter>);

  // Configuração de cores para cada categoria.
  const categoryColors = ["#155DFC", "#16A34A", "#DB2777", "#9333EA"];
  const chartConfig = Object.keys(groupedData).reduce((acc, key, index) => {
    acc[key] = {
      label: key,
      color: categoryColors[index % categoryColors.length],
    };
    return acc;
  }, {} as ChartConfig);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
                <TrendingUp /> Dispersão de Pontuações Individuais
            </CardTitle>
            <CardDescription>
                Visualização da dispersão das respostas individuais ao longo do tempo, por categoria.
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="unify-points" onCheckedChange={setUnifyPoints} />
            <Label htmlFor="unify-points">Unificar Pontos</Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[450px] max-h-[600px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 40, bottom: 40, left: 10 }}>
              <XAxis
                type="number"
                dataKey="x"
                name="Período"
                domain={[-0.5, periodos.length - 0.5]}
                ticks={Array.from({ length: periodos.length }, (_, i) => i)}
                tickFormatter={(tick) => periodos[tick] || ""}
                angle={periodos.length > 15 ? -45 : -35}
                textAnchor="end"
                height={periodos.length > 15 ? 80 : 60}
                interval={0}
                tickLine={true}
                axisLine={false}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Pontuação"
                domain={[0, yAxisMax]}
                ticks={yAxisTicks}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={<CustomTooltip />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              {Object.entries(groupedData).map(([categoria, points]) => (
                <Scatter
                  key={categoria}
                  name={categoria}
                  data={points}
                  fill={`var(--color-${categoria})`}
                  shape="circle"
                  opacity={0.7}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}