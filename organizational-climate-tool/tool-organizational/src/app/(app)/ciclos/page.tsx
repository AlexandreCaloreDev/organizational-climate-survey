"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cicloService } from '@/lib/services/cicloService';
import type { Ciclo } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function CiclosPage() {
  const { user } = useAuth();
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [isLoadingCiclos, setIsLoadingCiclos] = useState(true);
  const [nomeCiclo, setNomeCiclo] = useState('');
  const [recorrencia, setRecorrencia] = useState('');
  const [isAddingCiclo, setIsAddingCiclo] = useState(false);
  const [cicloToDelete, setCicloToDelete] = useState<Ciclo | null>(null);

  useEffect(() => {
    if (user?.empresa_id) {
      carregarCiclos();
    }
  }, [user]);

  const carregarCiclos = async () => {
    try {
      setIsLoadingCiclos(true);
      const list = await cicloService.listByEmpresa(Number(user?.empresa_id));
      setCiclos(list || []);
    } catch (err) {
      console.error('Erro ao carregar ciclos:', err);
    } finally {
      setIsLoadingCiclos(false);
    }
  };

  const handleAddCiclo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCiclo.trim()) {
      toast.error('O nome do ciclo é obrigatório.');
      return;
    }
    try {
      setIsAddingCiclo(true);
      const novoCiclo = await cicloService.create(Number(user?.empresa_id), {
        nome: nomeCiclo.trim(),
        recorrencia: recorrencia.trim() || undefined,
      });
      toast.success('Ciclo adicionado com sucesso!');
      setCiclos((prev) => [...prev, novoCiclo]);
      setNomeCiclo('');
      setRecorrencia('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Erro ao adicionar o ciclo. Tente novamente.';
      toast.error(msg);
      console.error('handleAddCiclo error:', err);
    } finally {
      setIsAddingCiclo(false);
    }
  };

  const handleDeleteCiclo = async () => {
    if (!cicloToDelete) return;
    try {
      await cicloService.delete(cicloToDelete.id_ciclo);
      toast.success('Ciclo removido com sucesso.');
      setCiclos(ciclos.filter((c) => c.id_ciclo !== cicloToDelete.id_ciclo));
    } catch (err: any) {
      console.error('Erro ao deletar ciclo:', err);
      // O interceptor já mostra o toast error se for 500/400
    } finally {
      setCicloToDelete(null);
    }
  };

  return (
    <section className="container mx-auto px-4 mt-10">
      <h1 className="w-fit text-3xl font-bold tracking-tight bg-blue-600 text-white p-2 rounded-lg">
        Gestão de Ciclos de Avaliação
      </h1>
      <p className="text-muted-foreground mt-2 mb-6">
        Visualize, cadastre e gerencie os ciclos (períodos) da sua empresa.
      </p>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Ciclos Cadastrados</CardTitle>
            <CardDescription>Estes são os períodos ativos na sua organização.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Não é possível excluir ciclos que já possuem pesquisas vinculadas (Regra do Banco de Dados).
              </p>
              <div className="flex flex-col gap-2 mt-2">
                {isLoadingCiclos ? (
                  <p className="text-sm text-muted-foreground">Carregando ciclos...</p>
                ) : ciclos.length > 0 ? (
                  [...ciclos].sort((a, b) => a.nome.localeCompare(b.nome)).map((ciclo) => (
                    <div key={ciclo.id_ciclo} className="flex justify-between items-center bg-blue-50 text-blue-800 border border-blue-100 rounded-md px-4 py-2 shadow-sm">
                      <span className="text-sm font-medium">
                        {ciclo.nome} {ciclo.recorrencia && <span className="text-xs text-blue-600">({ciclo.recorrencia})</span>}
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-blue-200 hover:text-red-600" onClick={() => setCicloToDelete(ciclo)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum ciclo cadastrado ainda.</p>
                )}
              </div>
            </div>

            <form onSubmit={handleAddCiclo} className="border-t pt-4 space-y-4">
              <Label className="text-sm font-semibold">Adicionar Novo Ciclo</Label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="nomeCiclo">Nome do Ciclo</Label>
                  <Input
                    id="nomeCiclo"
                    placeholder="Ex: 2026.1, Q1-2026, Semestral..."
                    value={nomeCiclo}
                    onChange={(e) => setNomeCiclo(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="recorrencia">Recorrência (Opcional)</Label>
                  <Input
                    id="recorrencia"
                    placeholder="Ex: Anual, Mensal..."
                    value={recorrencia}
                    onChange={(e) => setRecorrencia(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" disabled={isAddingCiclo} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isAddingCiclo ? 'Adicionando...' : 'Adicionar Ciclo'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!cicloToDelete} onOpenChange={(open) => !open && setCicloToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tem certeza que deseja excluir?</DialogTitle>
            <DialogDescription>
              A exclusão do ciclo "{cicloToDelete?.nome}" pode ser bloqueada caso já existam pesquisas atreladas a ele. Tem certeza de que quer continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCicloToDelete(null)}>
              Cancelar
            </Button>
            <Button onClick={handleDeleteCiclo} className="bg-red-600 hover:bg-red-700 text-white">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
