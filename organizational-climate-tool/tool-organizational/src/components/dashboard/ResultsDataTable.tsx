// src/components/dashboard/ResultsDataTable.tsx

"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { tipoExibeMedia } from "@/lib/buildSurveyResults";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export type SurveyResult = Record<string, any>;

// 2. Criando dados de exemplo

// 3. Definindo as colunas da nossa tabela
export const columns: ColumnDef<SurveyResult>[] = [
  {
    accessorKey: "texto_pergunta",
    header: "Pergunta",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.texto_pergunta || row.original.question || ""}</div>
        <Badge variant="outline" className="mt-1">
          {row.original.category || row.original.categoria || row.original.tipo_pergunta || "Geral"}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "total_respostas",
    header: () => <div className="text-center">Nº de Respostas</div>,
    cell: ({ row }) => {
      const resp = row.getValue("total_respostas");
      return <div className="text-center">{resp != null ? String(resp) : "0"}</div>;
    },
  },
  {
    accessorKey: "media",
    header: "Resultado / Média",
    cell: ({ row }) => {
      const tipo = row.original.tipo_pergunta || "";
      const total = Number(row.original.total_respostas) || 0;
      if (!tipoExibeMedia(tipo)) {
        if (tipo === "MultiplaEscolha" || tipo === "SimNao") {
          const dist = row.original.distribuicao || {};
          const top = Object.entries(dist).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
          return (
            <span className="text-sm text-muted-foreground">
              {top ? `${top[0]} (${top[1]})` : total ? `${total} resposta(s)` : "—"}
            </span>
          );
        }
        return (
          <span className="text-sm text-muted-foreground">
            {total ? `${total} resposta(s)` : "—"}
          </span>
        );
      }
      const score = Number(row.getValue("media")) || 0;
      const percentage = (score / 10) * 100;
      return (
        <div className="flex items-center gap-2">
          <Progress value={percentage} className="w-[60%] [&>div]:bg-[#155dfc]" />
          <span className="font-medium">{score.toFixed(1)}</span>
        </div>
      );
    },
  },
];

export function exportResultsToCSV(data: SurveyResult[], filename = "resultados.csv") {
  if (!data.length) return;
  const headers = ["Pergunta", "Categoria", "Respostas", "Resultado"];
  const lines = [
    headers.join(","),
    ...data.map((o) => {
      const pergunta = (o.texto_pergunta || "").replace(/"/g, '""');
      const categoria = (o.category || o.categoria || o.tipo_pergunta || "").replace(/"/g, '""');
      const respostas = Number(o.total_respostas) || 0;
      const resultado = tipoExibeMedia(o.tipo_pergunta)
        ? (Number(o.media) || 0).toFixed(1)
        : "N/A";
      return `"${pergunta}","${categoria}",${respostas},${resultado}`;
    }),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 4. O componente da tabela que recebe os dados
export function ResultsDataTable({
  data: tableData = [],
  isLoading,
}: {
  data?: SurveyResult[];
  isLoading?: boolean;
}) {
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id ?? row.id_pergunta ?? row.texto_pergunta),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultados</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Carregando resultados...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Nenhum resultado para os filtros selecionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
