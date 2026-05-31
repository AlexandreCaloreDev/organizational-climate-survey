"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { LineChartData } from "@/lib/types";

// Paleta de cores para as linhas (dimensões/categorias)
const COLORS = [
  "#2563eb", // blue-600
  "#16a34a", // green-600
  "#d97706", // amber-600
  "#dc2626", // red-600
  "#9333ea", // purple-600
  "#0891b2", // cyan-600
  "#be123c", // rose-700
  "#4f46e5", // indigo-600
];

interface EvolucaoHistoricaProps {
  data: LineChartData[];
}

export function EvolucaoHistorica({ data }: EvolucaoHistoricaProps) {
  // Transforma os dados para o formato flat que o Recharts espera no LineChart:
  // { ciclo: "2026.1", "Autonomia": 80, "Demanda": 60 }
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((item) => ({
      ciclo: item.ciclo,
      ...item.dimensoes,
    }));
  }, [data]);

  // Identifica todas as categorias exclusivas para gerar as linhas dinamicamente
  const linhas = useMemo(() => {
    if (!data || data.length === 0) return [];
    const chaves = new Set<string>();
    data.forEach((item) => {
      Object.keys(item.dimensoes).forEach((k) => chaves.add(k));
    });
    return Array.from(chaves);
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        Nenhum histórico disponível para evolução.
      </div>
    );
  }

  return (
    <div className="h-[350px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="ciclo" 
            tick={{ fill: "#64748b", fontSize: 13, fontWeight: 500 }}
            axisLine={{ stroke: "#cbd5e1" }}
            tickLine={false}
            dy={10}
          />
          <YAxis 
            domain={[0, 100]} 
            tick={{ fill: "#64748b", fontSize: 13 }}
            axisLine={false}
            tickLine={false}
            dx={-10}
            tickFormatter={(val) => `${val}%`}
          />
          <Tooltip
            contentStyle={{ 
              borderRadius: "8px", 
              border: "none",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
            }}
            itemStyle={{ fontWeight: 600 }}
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          
          {linhas.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={key}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={3}
              activeDot={{ r: 6, strokeWidth: 0 }}
              dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
