"use client";

import React, { useEffect, useState } from "react";
import { DataTable } from "@/components/dashboard/DataTable";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from '@/context/AuthContext';
import { usuarioService } from '@/lib/services/usuarioService';
import type { UsuarioAdministrador } from '@/lib/types';

const columns = [
  { accessorKey: "name", header: "Nome" },
  { accessorKey: "email", header: "E-mail" },
  { accessorKey: "role", header: "Função" },
  {
    id: "actions",
    header: "Ações",
    cell: ({ row: _ }: any) => (
      <Button variant="ghost" className="h-8 w-8 p-0">
        <span className="sr-only">Abrir menu</span>
        ...
      </Button>
    ),
  },
];

export default function UsuariosPage() {
  const { user, isLoading } = useAuth();
  const [users, setUsers] = useState<UsuarioAdministrador[]>([]);

  useEffect(() => {
    if (!user?.empresa_id) return;
    const fetch = async () => {
      try {
        const data = await usuarioService.listByEmpresa(user.empresa_id);
        setUsers(data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetch();
  }, [user]);

  const data = users.map((u) => ({
    id: String(u.id_user_admin),
    name: u.nome_admin,
    email: u.email,
    role: u.role || '-',
  }));

  return (
    <section className="container mx-auto px-4 mt-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="w-fit text-3xl font-bold tracking-tight bg-blue-500 text-white p-2 rounded-lg">
          Usuários
        </h1>
        <Link href="/usuarios/novo">
          <Button>Adicionar Novo Usuário</Button>
        </Link>
      </div>
      <p className="text-muted-foreground mt-2 mb-6">Gerencie os usuários administradores do sistema.</p>

      <div className="bg-background rounded-lg border p-4 h-full">
        {isLoading ? (
          <p>Carregando...</p>
        ) : (
          <DataTable columns={columns} data={data} />
        )}
      </div>
    </section>
  );
}

