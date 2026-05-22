import * as React from "react";
import { CartesianGrid, Line, LineChart as RechartsLineChart, XAxis, YAxis } from "recharts";
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

const chartConfig = {
  engajamento: {
    label: "Média",
    color: "hsl(var(--chart-1))",
  },
  satisfacao: {
    label: "Total Respostas",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

interface ChartLineTrendsProps {
  dateRange?: DateRange;
  data?: any;
}

export function ChartLineTrends({ dateRange, data }: ChartLineTrendsProps) {
  const chartData = React.useMemo(() => {
    const metricas = data?.metricas_por_pergunta || [];
    return metricas
      .filter((m: any) => m.media !== undefined && m.media !== null)
      .map((m: any, i: number) => ({
        name: m.texto_pergunta ? m.texto_pergunta.substring(0, 10) + "..." : `Q${i + 1}`,
        engajamento: m.media ? Number(m.media.toFixed(1)) : 0,
        satisfacao: m.total_respostas || 0,
      }));
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Engajamento e Satisfação por Pergunta</CardTitle>
        <CardDescription>Métricas dinâmicas.</CardDescription>
      </CardHeader>
      <CardContent className="min-h-[250px] flex items-center justify-center">
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="w-full">
            <RechartsLineChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 12, right: 12 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Line dataKey="engajamento" type="monotone" stroke="#2B7FFF" strokeWidth={2} dot={false} />
              <Line dataKey="satisfacao" type="monotone" stroke="#579BFF" strokeWidth={2} dot={false} />
            </RechartsLineChart>
          </ChartContainer>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum dado disponível.</p>
        )}
      </CardContent>
    </Card>
  );
}
