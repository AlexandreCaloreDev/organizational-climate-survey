"use client";

import React, { useEffect, useState } from "react";
import { DataTable } from "@/components/dashboard/DataTable";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { empresaService } from "@/lib/services/empresaService";
import { Skeleton } from "@/components/ui/skeleton";

interface Company {
  id: string;
  name: string;
  cnpj: string;
  status: string;
}

const columns = [
  { accessorKey: "name", header: "Nome da Empresa" },
  { accessorKey: "cnpj", header: "CNPJ" },
  { accessorKey: "status", header: "Status" },
  {
    id: "actions",
    header: "Ações",
    cell: ({ row }: any) => (
      <Button variant="ghost" className="h-8 w-8 p-0">
        <span className="sr-only">Abrir menu</span>
        ...
      </Button>
    ),
  },
];

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    empresaService.list()
      .then((data) => {
        setEmpresas((data || []).map((e: any) => ({
          id: String(e.id_empresa ?? e.id ?? ""),
          name: e.nome_fantasia || e.razao_social || "-",
          cnpj: e.cnpj || "-",
          status: e.status || "ativo",
        })));
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <section className="container mx-auto px-4 mt-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="w-fit text-3xl font-bold tracking-tight bg-blue-500 text-white p-2 rounded-lg">
          Empresas
        </h1>
        <Link href="/empresas/nova">
          <Button>Adicionar Nova Empresa</Button>
        </Link>
      </div>
      <p className="text-muted-foreground mt-2 mb-6">
        Gerencie as empresas cadastradas no sistema.
      </p>

      <div className="bg-background rounded-lg border p-4 h-full">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <DataTable columns={columns} data={empresas} />
        )}
      </div>
    </section>
  );
}
