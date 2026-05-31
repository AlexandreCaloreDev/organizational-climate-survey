"use client";

import React, { useMemo } from "react";
import type { HeatmapData } from "@/lib/types";

interface HeatmapGlobalProps {
  data: HeatmapData[];
}

export function HeatmapGlobal({ data }: HeatmapGlobalProps) {
  // Extrai dinamicamente todas as categorias/dimensões únicas presentes nos dados
  const categorias = useMemo(() => {
    if (!data || data.length === 0) return [];
    const chaves = new Set<string>();
    data.forEach((row) => {
      Object.keys(row.dimensoes).forEach((key) => chaves.add(key));
    });
    return Array.from(chaves);
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-slate-500 bg-slate-50 rounded-lg border border-slate-100">
        Nenhum dado disponível para a matriz.
      </div>
    );
  }

  const getStatus = (score: number) => {
    if (score >= 75) {
      return {
        label: "Bom",
        bg: "bg-emerald-100",
        text: "text-emerald-800",
        border: "border-emerald-200",
      };
    }
    if (score >= 50) {
      return {
        label: "Médio",
        bg: "bg-amber-100",
        text: "text-amber-800",
        border: "border-amber-200",
      };
    }
    return {
      label: "Ruim",
      bg: "bg-rose-100",
      text: "text-rose-800",
      border: "border-rose-200",
    };
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 min-w-[150px]">Setor</th>
            {categorias.map((cat) => (
              <th key={cat} className="px-4 py-3 min-w-[140px] text-center">
                {cat}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row) => (
            <tr key={row.setor} className="bg-white hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-900">{row.setor}</td>
              {categorias.map((cat) => {
                const score = row.dimensoes[cat];
                if (score === undefined) {
                  return (
                    <td key={cat} className="px-4 py-3 text-center text-slate-400">
                      -
                    </td>
                  );
                }

                const status = getStatus(score);
                return (
                  <td key={cat} className="px-4 py-3">
                    <div
                      className={`flex flex-col items-center justify-center p-2 rounded-md border ${status.bg} ${status.border} ${status.text}`}
                    >
                      <span className="font-bold text-base">{score.toFixed(1)}%</span>
                      <span className="text-[11px] uppercase tracking-wider font-semibold mt-0.5">
                        {status.label}
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
