"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Search } from "lucide-react";
import { SurveyCard } from "@/components/pesquisas/SurveyCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateSurveyForm } from "@/components/forms/CreateSurveyForm";
import { SurveyDetailsModal } from "@/components/modals/SurveyDetailsModal";
import { SurveyLinkModal } from "@/components/modals/SurveyLinkModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { pesquisaService } from "@/lib/services/pesquisaService";
import type { Pesquisa, StatusPesquisa } from "@/lib/types";
import { InfoContext } from "@/components/pesquisas/InfoContext";
import { WelcomeSurveyModal } from "@/components/pesquisas/WelcomeSurveyModal";

const PesquisasPage = () => {
  const { user } = useAuth();
  const [pesquisas, setPesquisas] = React.useState<Pesquisa[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedSurvey, setSelectedSurvey] = React.useState<Pesquisa | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusPesquisa | "todos">("todos");
  const [isLinkModalOpen, setIsLinkModalOpen] = React.useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = React.useState("");

  const fetchPesquisas = React.useCallback(async () => {
    if (!user?.empresa_id) return;
    setIsLoading(true);
    try {
      const data = await pesquisaService.listByEmpresa(user.empresa_id);
      setPesquisas(data);
    } finally {
      setIsLoading(false);
    }
  }, [user?.empresa_id]);

  React.useEffect(() => {
    fetchPesquisas();
  }, [fetchPesquisas]);

  const filtered = pesquisas.filter((p) => {
    const matchesSearch = p.titulo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "todos" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    fetchPesquisas();
  };

  const handleGenerateLink = (surveyId: string) => {
    setSelectedSurveyId(surveyId);
    setIsLinkModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await pesquisaService.delete(Number(id));
      fetchPesquisas();
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangeStatus = async (id: string, status: string) => {
    try {
      await pesquisaService.updateStatus(Number(id), status as StatusPesquisa);
      fetchPesquisas();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section className="container mx-auto px-4 mt-10">
      <WelcomeSurveyModal />
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="w-fit text-3xl font-bold tracking-tight bg-blue-600 text-white p-2 rounded-lg">Pesquisas</h1>
            <InfoContext />
          </div>
          <p className="text-muted-foreground mt-2">
            Crie, gerencie e visualize todos os seus formulários.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="cursor-pointer bg-blue-600 text-white hover:bg-blue-500 hover:text-white transition-all duration-300">
              <PlusCircle className="mr-2 h-4 w-4" />
              Criar Pesquisa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle>Criar Nova Pesquisa</DialogTitle>
              <DialogDescription>
                Preencha as informações abaixo para criar um novo formulário.
              </DialogDescription>
            </DialogHeader>
            <CreateSurveyForm onClose={handleCloseDialog} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusPesquisa | "todos")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status: Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="Rascunho">Rascunhos</SelectItem>
            <SelectItem value="Ativa">Ativas</SelectItem>
            <SelectItem value="Concluída">Concluídas</SelectItem>
            <SelectItem value="Arquivada">Arquivadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))
        ) : filtered.length > 0 ? (
          filtered.map((pesquisa) => (
            <SurveyCard
              key={pesquisa.id_pesquisa}
              id={String(pesquisa.id_pesquisa)}
              linkAcesso={pesquisa.link_acesso}
              title={pesquisa.titulo}
              description={pesquisa.descricao}
              tag={pesquisa.status}
              creationDate={new Date(pesquisa.data_criacao).toLocaleDateString("pt-BR")}
              onViewDetails={() => setSelectedSurvey(pesquisa)}
              onGenerateLink={handleGenerateLink}
              onDelete={handleDelete}
              onChangeStatus={handleChangeStatus}
            />
          ))
        ) : (
          <p className="col-span-3 text-center text-muted-foreground py-10">
            {searchQuery
              ? `Nenhuma pesquisa encontrada com o termo "${searchQuery}".`
              : "Nenhuma pesquisa encontrada."}
          </p>
        )}
      </div>

      <Dialog open={!!selectedSurvey} onOpenChange={(open) => !open && setSelectedSurvey(null)}>
        <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
          {selectedSurvey && (
            <SurveyDetailsModal
              survey={selectedSurvey as any}
              description={selectedSurvey.descricao}
              tag={selectedSurvey.status}
              creationDate={new Date(
                selectedSurvey.data_criacao,
              ).toLocaleDateString("pt-BR")}
            />
          )}
        </DialogContent>
      </Dialog>

      {selectedSurveyId && (
        <SurveyLinkModal
          isOpen={isLinkModalOpen}
          onClose={() => setIsLinkModalOpen(false)}
          surveyId={selectedSurveyId}
        />
      )}
    </section>
  );
};

export default PesquisasPage;