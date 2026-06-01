"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Plus, Calendar, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cicloService } from "@/lib/services/cicloService";
import type { Ciclo } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CiclosPage() {
  const { user } = useAuth();
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [isLoadingCiclos, setIsLoadingCiclos] = useState(true);
  const [nomeCiclo, setNomeCiclo] = useState("");
  
  // Estados para recorrência detalhada
  const [hasRecorrencia, setHasRecorrencia] = useState(false);
  const [recorrenciaQtd, setRecorrenciaQtd] = useState(1);
  const [recorrenciaUnidade, setRecorrenciaUnidade] = useState<"mes" | "ano">("mes");
  
  const [isAddingCiclo, setIsAddingCiclo] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
      console.error("Erro ao carregar ciclos:", err);
      toast.error("Erro ao carregar a lista de ciclos.");
    } finally {
      setIsLoadingCiclos(false);
    }
  };

  const handleAddCiclo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCiclo.trim()) {
      toast.error("O nome do ciclo é obrigatório.");
      return;
    }
    
    // Concatena a recorrência final ex: "6 meses" ou "1 ano"
    const finalRecorrencia = hasRecorrencia
      ? (recorrenciaUnidade === "mes"
          ? (recorrenciaQtd === 1 ? "1 mês" : `${recorrenciaQtd} meses`)
          : (recorrenciaQtd === 1 ? "1 ano" : `${recorrenciaQtd} anos`))
      : undefined;

    try {
      setIsAddingCiclo(true);
      const novoCiclo = await cicloService.create(Number(user?.empresa_id), {
        nome: nomeCiclo.trim(),
        recorrencia: finalRecorrencia,
      });
      toast.success("Ciclo de avaliação criado com sucesso!");
      setCiclos((prev) => [...prev, novoCiclo]);
      setNomeCiclo("");
      setHasRecorrencia(false);
      setRecorrenciaQtd(1);
      setRecorrenciaUnidade("mes");
      setIsDialogOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Erro ao adicionar o ciclo. Tente novamente.";
      toast.error(msg);
      console.error("handleAddCiclo error:", err);
    } finally {
      setIsAddingCiclo(false);
    }
  };

  const handleDeleteCiclo = async () => {
    if (!cicloToDelete) return;
    try {
      await cicloService.delete(cicloToDelete.id_ciclo);
      toast.success("Ciclo removido com sucesso.");
      setCiclos(ciclos.filter((c) => c.id_ciclo !== cicloToDelete.id_ciclo));
    } catch (err: any) {
      console.error("Erro ao deletar ciclo:", err);
      toast.error("Não foi possível excluir o ciclo. Verifique se existem pesquisas ativas atreladas a ele.");
    } finally {
      setCicloToDelete(null);
    }
  };

  return (
    <section className="container mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-8 h-8 text-blue-600" />
            Gestão de Ciclos de Avaliação
          </h1>
          <p className="text-slate-500 mt-1">Visualize, cadastre e gerencie os ciclos (períodos) da sua empresa.</p>
        </div>
        
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Adicionar Novo Ciclo
        </Button>
      </div>

      {/* Main Content */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Ciclos Cadastrados</CardTitle>
          <CardDescription>Estes são os períodos ativos na sua organização para aplicação de pesquisas.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-md p-3 mb-6 flex items-center gap-2 font-medium">
            Atenção: Não é possível excluir ciclos que possuam pesquisas atreladas na base de dados.
          </p>

          {isLoadingCiclos ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Carregando ciclos...</p>
            </div>
          ) : ciclos.length > 0 ? (
            <div className="rounded-md border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Nome do Ciclo</TableHead>
                    <TableHead className="font-bold text-slate-700">Recorrência</TableHead>
                    <TableHead className="font-bold text-slate-700 text-right w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...ciclos]
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                    .map((ciclo) => (
                      <TableRow key={ciclo.id_ciclo} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-medium text-slate-900">{ciclo.nome}</TableCell>
                        <TableCell className="text-slate-600">
                          {ciclo.recorrencia || <span className="text-slate-400 italic">Nenhuma</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-red-600 rounded-md hover:bg-rose-50"
                            onClick={() => setCicloToDelete(ciclo)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 bg-slate-50 border border-dashed rounded-md border-slate-200">
              Nenhum ciclo cadastrado ainda.
            </div>
          )}
        </CardContent>
      </Card>

      {/* dialog for adding a new cycle */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAddCiclo} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Ciclo</DialogTitle>
              <DialogDescription>
                Crie um novo período ou ciclo de avaliação para agrupar as pesquisas de clima da sua empresa.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nomeCiclo" className="text-slate-700">Nome do Ciclo</Label>
                <Input
                  id="nomeCiclo"
                  placeholder="Ex: 2026.1, Q1-2026, Semestral..."
                  value={nomeCiclo}
                  onChange={(e) => setNomeCiclo(e.target.value)}
                  className="bg-slate-50"
                  required
                />
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="switch-recorrencia" className="text-slate-700 font-semibold text-sm">Definir Recorrência?</Label>
                  <p className="text-xs text-slate-500">Configure um período recorrente para este ciclo.</p>
                </div>
                <Switch
                  id="switch-recorrencia"
                  checked={hasRecorrencia}
                  onCheckedChange={setHasRecorrencia}
                />
              </div>

              {hasRecorrencia && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid gap-2">
                    <Label htmlFor="recorrenciaQtd" className="text-slate-700">Quantidade</Label>
                    <Input
                      id="recorrenciaQtd"
                      type="number"
                      min={1}
                      max={99}
                      value={recorrenciaQtd}
                      onChange={(e) => setRecorrenciaQtd(Math.max(1, parseInt(e.target.value) || 1))}
                      className="bg-slate-50"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="recorrenciaUnidade" className="text-slate-700">Período</Label>
                    <Select
                      value={recorrenciaUnidade}
                      onValueChange={(v) => setRecorrenciaUnidade(v as "mes" | "ano")}
                    >
                      <SelectTrigger id="recorrenciaUnidade" className="bg-slate-50">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mes">Mês / Meses</SelectItem>
                        <SelectItem value="ano">Ano / Anos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isAddingCiclo}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {isAddingCiclo ? "Adicionando..." : "Adicionar Ciclo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
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
            <Button 
              onClick={handleDeleteCiclo} 
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
