"use client";

import React, { useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

// Cores dinâmicas para os diferentes setores
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

interface RadarComparativoProps {
  data: any[];
}

export function RadarComparativo({ data }: RadarComparativoProps) {
  const dataKeys = useMemo(() => {
    if (!data || data.length === 0) return [];
    // Pega as chaves do primeiro item, ignorando 'categoria'
    const keys = Object.keys(data[0]).filter((key) => key !== "categoria");
    return keys;
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        Nenhum dado disponível para o radar.
      </div>
    );
  }

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="categoria"
            tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }}
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#94a3b8" }} />
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
            itemStyle={{ fontWeight: 600 }}
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          {dataKeys.map((key, index) => (
            <Radar
              key={key}
              name={key}
              dataKey={key}
              stroke={COLORS[index % COLORS.length]}
              fill={COLORS[index % COLORS.length]}
              fillOpacity={0.3}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
