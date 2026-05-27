"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { setorService } from '@/lib/services/setorService';
import type { Setor } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SetoresPage() {
  const { user } = useAuth();
  const [setores, setSetores] = useState<Setor[]>([]);
  const [isLoadingSetores, setIsLoadingSetores] = useState(true);
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [nomeSetor, setNomeSetor] = useState('');
  const [descricaoSetor, setDescricaoSetor] = useState('');
  const [isAddingSetor, setIsAddingSetor] = useState(false);
  const [setorToDelete, setSetorToDelete] = useState<Setor | null>(null);

  useEffect(() => {
    if (user?.empresa_id) {
      carregarSetores();
    }
  }, [user]);

  const carregarSetores = async () => {
    try {
      setIsLoadingSetores(true);
      const list = await setorService.listByEmpresa(Number(user?.empresa_id));
      setSetores(list || []);
    } catch (err) {
      console.error('Erro ao carregar setores:', err);
    } finally {
      setIsLoadingSetores(false);
    }
  };

  const handleAddSetor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeEmpresa.trim() || !nomeSetor.trim()) {
      toast.error('O nome da empresa e o nome do setor são obrigatórios.');
      return;
    }
    const nomeCompleto = `${nomeEmpresa.trim()} - ${nomeSetor.trim()}`;
    if (nomeCompleto.length < 5) {
      toast.error('O nome concatenado deve ter um tamanho válido.');
      return;
    }
    try {
      setIsAddingSetor(true);
      const novoSetor = await setorService.create(Number(user?.empresa_id), {
        nome_setor: nomeCompleto,
        descricao: descricaoSetor.trim() || undefined,
      });
      toast.success('Setor adicionado com sucesso!');
      setSetores((prev) => [...prev, novoSetor]);
      setNomeEmpresa('');
      setNomeSetor('');
      setDescricaoSetor('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Erro ao adicionar o setor. Tente novamente.';
      toast.error(msg);
      console.error('handleAddSetor error:', err);
    } finally {
      setIsAddingSetor(false);
    }
  };

  const handleDeleteSetor = async () => {
    if (!setorToDelete) return;
    try {
      await setorService.delete(setorToDelete.id_setor || (setorToDelete as any).id);
      toast.success('Setor removido com sucesso.');
      setSetores(setores.filter((s) => s.id_setor !== setorToDelete.id_setor && (s as any).id !== (setorToDelete as any).id));
    } catch (err: any) {
      console.error('Erro ao deletar setor:', err);
      // O interceptor já mostra o toast error se for 500/400
    } finally {
      setSetorToDelete(null);
    }
  };

  return (
    <section className="container mx-auto px-4 mt-10">
      <h1 className="w-fit text-3xl font-bold tracking-tight bg-blue-600 text-white p-2 rounded-lg">
        Gestão de Setores
      </h1>
      <p className="text-muted-foreground mt-2 mb-6">
        Visualize, cadastre e gerencie os setores da sua empresa.
      </p>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Setores Cadastrados</CardTitle>
            <CardDescription>Estes são os departamentos ativos na sua organização.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Não é possível excluir setores que já possuem pesquisas vinculadas (Regra do Banco de Dados).
              </p>
              <div className="flex flex-col gap-2 mt-2">
                {isLoadingSetores ? (
                  <p className="text-sm text-muted-foreground">Carregando setores...</p>
                ) : setores.length > 0 ? (
                  [...setores].sort((a, b) => a.nome_setor.localeCompare(b.nome_setor)).map((setor) => (
                    <div key={setor.id_setor || (setor as any).id} className="flex justify-between items-center bg-blue-50 text-blue-800 border border-blue-100 rounded-md px-4 py-2 shadow-sm">
                      <span className="text-sm font-medium">{setor.nome_setor}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-blue-200 hover:text-red-600" onClick={() => setSetorToDelete(setor)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum setor cadastrado ainda.</p>
                )}
              </div>
            </div>

            <form onSubmit={handleAddSetor} className="border-t pt-4 space-y-4">
              <Label className="text-sm font-semibold">Adicionar Novo Setor</Label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
                  <Input
                    id="nomeEmpresa"
                    placeholder="Ex: ACME Corp"
                    value={nomeEmpresa}
                    onChange={(e) => setNomeEmpresa(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nomeSetor">Nome do Setor</Label>
                  <Input
                    id="nomeSetor"
                    placeholder="Ex: TI, Vendas"
                    value={nomeSetor}
                    onChange={(e) => setNomeSetor(e.target.value)}
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="descricaoSetor">Descrição (Opcional)</Label>
                  <Input
                    id="descricaoSetor"
                    placeholder="O que este setor faz?"
                    value={descricaoSetor}
                    onChange={(e) => setDescricaoSetor(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" disabled={isAddingSetor} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isAddingSetor ? 'Adicionando...' : 'Adicionar Setor'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!setorToDelete} onOpenChange={(open) => !open && setSetorToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tem certeza que deseja excluir?</DialogTitle>
            <DialogDescription>
              A exclusão do setor "{setorToDelete?.nome_setor}" pode ser bloqueada caso já existam pesquisas atreladas a ele. Tem certeza de que quer continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSetorToDelete(null)}>
              Cancelar
            </Button>
            <Button onClick={handleDeleteSetor} className="bg-red-600 hover:bg-red-700 text-white">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
