"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { InfoTooltip } from "@/components/ui/info-tooltip";

export const description = "A stacked bar chart with a legend";

const chartConfig = {
  positivo: {
    label: "Positivo",
    color: "var(--color-blue-400)",
  },
  negativo: {
    label: "Negativo",
    color: "var(--color-blue-600)",
  },
} satisfies ChartConfig;

export function ChartBarStacked({ data }: { data?: any }) {
  const metricas = data?.metricas_por_pergunta || [];

  const formatado = metricas.slice(0, 5).map((m: any) => {
    let pos = 0;
    let neg = 0;

    if (m.distribuicao) {
      Object.entries(m.distribuicao).forEach(([nota, qtd]) => {
        const numNota = Number(nota);
        const quantidade = Number(qtd);

        if (numNota >= 7) pos += quantidade;
        else if (numNota > 0) neg += quantidade;
        else {
          if (["promotor", "bom", "excelente", "sim"].some((palavra) => nota.toLowerCase().includes(palavra))) {
            pos += quantidade;
          } else {
            neg += quantidade;
          }
        }
      });
    } else if (m.media) {
      // Escala 1-10: media >= 7 = maioria positiva
      pos = Math.round((m.media / 10) * (m.total_respostas || 10));
      neg = (m.total_respostas || 10) - pos;
    }

    return {
      categoria: m.texto_pergunta ? m.texto_pergunta.substring(0, 12) + "..." : "Métrica",
      positivo: pos,
      negativo: neg,
    };
  });

  const chartData = formatado.length > 0 ? formatado : [{ categoria: "Sem dados", positivo: 0, negativo: 0 }];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          Gráfico de Barras - Positivo + Negativo
          <InfoTooltip text="Notas ≥ 7 = Positivo, < 7 = Negativo. Exibe as 5 primeiras perguntas." />
        </CardTitle>
        <CardDescription>Resumo de respostas positivas e negativas</CardDescription>
      </CardHeader>
      <CardContent className="min-h-[250px] flex items-center justify-center">
        {chartData.length > 0 && chartData[0]?.categoria !== "Sem dados" ? (
          <ChartContainer config={chartConfig} className="w-full">
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="categoria" tickLine={false} tickMargin={10} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="positivo" stackId="a" fill="var(--color-blue-400)" radius={[0, 0, 4, 4]} />
              <Bar dataKey="negativo" stackId="a" fill="var(--color-blue-600)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum dado disponível.</p>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="text-muted-foreground leading-none">
          Mostrando o total de Respostas
        </div>
      </CardFooter>
    </Card>
  );
}
