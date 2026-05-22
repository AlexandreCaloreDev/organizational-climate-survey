"use client";

import { TrendingUp } from "lucide-react";
import {
  Label,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { InfoTooltip } from "@/components/ui/info-tooltip";

export const description = "A radial chart with a custom shape";

const chartConfig = {
  valor: {
    label: "Participação",
  },
  participacao: {
    label: "Participação",
    color: "var(--color-blue-600)",
  },
} satisfies ChartConfig;

export function ChartRadialShape({ data }: { data?: any }) {
  const taxa = data?.taxa_participacao || 0;

  const chartData = [
    { metrica: "participacao", valor: taxa, fill: "var(--color-blue-600)" },
  ];

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="flex items-center">
          Gráfico De Forma - Participação
          <InfoTooltip text="Taxa percentual de adesão: (Total de respostas / Total de funcionários) × 100" />
        </CardTitle>
        <CardDescription>Taxa de adesão dos funcionários</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
          <RadialBarChart
            data={chartData}
            startAngle={90}
            endAngle={-270}
            innerRadius={80}
            outerRadius={140}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} angleAxisId={0} />
            <PolarGrid gridType="circle" radialLines={false} stroke="none" className="first:fill-muted last:fill-background" polarRadius={[86, 74]} />
            <RadialBar dataKey="valor" background cornerRadius={10} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-4xl font-bold">
                          {chartData[0].valor.toLocaleString()}%
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground">
                          Participação
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          Atualização dinâmica <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Mostrando a participação dos colaboradores na pesquisa
        </div>
      </CardFooter>
    </Card>
  );
}
