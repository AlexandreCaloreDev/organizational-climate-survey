import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts";
import { DateRange } from "react-day-picker";

import {
  Card,
  CardContent,
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
  media: { label: "Média (1-10)", color: "var(--color-blue-600)" },
} satisfies ChartConfig;

interface ChartBarComparativeProps {
  dateRange?: DateRange;
  data?: any;
}

export function ChartBarComparative({ dateRange, data }: ChartBarComparativeProps) {
  const chartData = React.useMemo(() => {
    const metricas = data?.metricas_por_pergunta || data?.metricas || [];
    return metricas
      .filter((m: any) => m.media !== undefined && m.media !== null)
      .map((m: any, i: number) => ({
        category: m.texto_pergunta ? m.texto_pergunta.substring(0, 15) + "..." : `Q${i + 1}`,
        media: m.media ? Number(m.media.toFixed(1)) : 0,
      }));
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparativo de Desempenho por Categoria</CardTitle>
      </CardHeader>
      <CardContent className="min-h-[250px] flex items-center justify-center">
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="w-full">
            <BarChart
              data={chartData}
              margin={{ left: 0, right: 5 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} domain={[0, 10]} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent valueFormatter={(value) => `${value}/10`} />} />
              <Legend />
              <Bar dataKey="media" fill="#2B7FFF" />
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum dado disponível.</p>
        )}
      </CardContent>
    </Card>
  );
}
