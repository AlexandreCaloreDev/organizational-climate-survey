import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { DateRange } from "react-day-picker";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { InfoTooltip } from "@/components/ui/info-tooltip";

export const description = "um gráfico de barras interativo";

const chartConfig = {
  views: {
    label: "Métricas",
  },
  media: {
    label: "Média",
    color: "var(--color-blue-400)",
  },
  respostas: {
    label: "Total Respostas",
    color: "var(--color-blue-600)",
  },
} satisfies ChartConfig;

interface ChartBarInteractiveProps {
  dateRange?: DateRange;
  data?: any;
}

export function ChartBarInteractive({ dateRange, data }: ChartBarInteractiveProps) {
  const [activeChart, setActiveChart] = React.useState<keyof typeof chartConfig>("media");

  const chartData = React.useMemo(() => {
    const metricas = data?.metricas_por_pergunta || [];

    const formatado = metricas.map((m: any, index: number) => ({
      perguntaCurta: m.texto_pergunta ? m.texto_pergunta.substring(0, 15) + "..." : `Q${index + 1}`,
      perguntaCompleta: m.texto_pergunta || "Métrica desconhecida",
      media: m.media ? Number(m.media.toFixed(1)) : 0,
      respostas: m.total_respostas || 0,
    }));

    return formatado.length > 0 ? formatado : [{ perguntaCurta: "Sem dados", perguntaCompleta: "Nenhum dado disponível", media: 0, respostas: 0 }];
  }, [data]);

  const total = React.useMemo(() => ({
    media: chartData.reduce((acc: number, curr: any) => acc + curr.media, 0),
    respostas: chartData.reduce((acc: number, curr: any) => acc + curr.respostas, 0),
  }), [chartData]);

  return (
    <Card className="py-0 w-full">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
          <CardTitle className="flex items-center">
            Gráfico de Barras - Interativo
            <InfoTooltip text="Média de pontuação e total de respostas por pergunta da pesquisa" />
          </CardTitle>
          <CardDescription>Mostrando desempenho por pergunta</CardDescription>
        </div>
        <div className="flex">
          {["media", "respostas"].map((key) => {
            const chart = key as keyof typeof chartConfig;
            return (
              <button
                key={chart}
                data-active={activeChart === chart}
                className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-muted-foreground text-xs">{chartConfig[chart].label}</span>
                <span className="text-lg leading-none font-bold sm:text-3xl">
                  {chart === "media" && chartData.length > 0 ? (total.media / chartData.length).toFixed(1) : total[key as keyof typeof total].toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
            <BarChart accessibilityLayer data={chartData} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="perguntaCurta" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
              <ChartTooltip content={<ChartTooltipContent className="w-[150px]" nameKey="views" />} />
              <Bar dataKey={activeChart} fill={`var(--color-${activeChart})`} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[250px] items-center justify-center">
            <p className="text-sm text-muted-foreground">Nenhum dado disponível.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
