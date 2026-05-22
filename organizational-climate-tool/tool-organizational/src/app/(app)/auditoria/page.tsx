"use client";

import React, { useEffect, useState } from "react";
import { DataTable } from "@/components/dashboard/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge, badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import { useAuth } from "@/context/AuthContext";
import { auditoriaService } from "@/lib/services/auditoriaService";
import { Skeleton } from "@/components/ui/skeleton";

export type AuditLog = {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  status: "success" | "failed" | "info";
};

const columns: ColumnDef<AuditLog>[] = [
  { accessorKey: "timestamp", header: "Data/Hora" },
  { accessorKey: "user", header: "Usuário" },
  { accessorKey: "action", header: "Ação" },
  { accessorKey: "entity", header: "Entidade" },
  { accessorKey: "entityId", header: "ID da Entidade" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status");
      let badgeVariant: VariantProps<typeof badgeVariants>["variant"];
      let badgeText = "";
      switch (status) {
        case "success":
          badgeVariant = "success";
          badgeText = "Sucesso";
          break;
        case "failed":
          badgeVariant = "destructive";
          badgeText = "Falha";
          break;
        case "info":
          badgeVariant = "default";
          badgeText = "Info";
          break;
        default:
          badgeText = String(status);
          badgeVariant = "secondary";
      }
      return <Badge variant={badgeVariant}>{badgeText}</Badge>;
    },
  },
  {
    id: "actions",
    header: "Ações",
    cell: ({ row }) => {
      const log = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-center">Ações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(log.id)}>
              Copiar ID do Log
            </DropdownMenuItem>
            <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function AuditoriaPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.empresa_id) return;
    setIsLoading(true);
    auditoriaService.listByEmpresa(user.empresa_id)
      .then((data) => {
        setLogs((data || []).map((l: any) => ({
          id: String(l.id_log ?? l.id ?? ""),
          timestamp: l.data_hora ? new Date(l.data_hora).toLocaleString("pt-BR") : "-",
          user: l.usuario || l.nome_usuario || "-",
          action: l.acao || "-",
          entity: l.entidade || "-",
          entityId: String(l.id_entidade ?? ""),
          status: (l.status as "success" | "failed" | "info") || "info",
        })));
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [user]);

  return (
    <section className="container mx-auto px-4 mt-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="w-fit text-3xl font-bold tracking-tight bg-blue-500 text-white p-2 rounded-lg">
          Painel de Auditoria
        </h1>
      </div>
      <p className="text-muted-foreground mt-2 mb-6">
        Visualize e filtre os logs de atividades do sistema.
      </p>

      <div className="bg-background rounded-lg border p-4 h-full">
        {isLoading || authLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <DataTable columns={columns} data={logs} />
        )}
      </div>
    </section>
  );
}
