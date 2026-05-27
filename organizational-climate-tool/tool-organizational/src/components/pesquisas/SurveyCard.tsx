import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, QrCode, Trash2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type SurveyCardProps = {
  id: string;
  linkAcesso?: string;
  title: string;
  description: string;
  tag: string;
  creationDate: string;
  onViewDetails: () => void;
  onGenerateLink: (link: string) => void;
  onDelete?: (id: string) => void | Promise<void>;
  onChangeStatus?: (id: string, status: string) => void | Promise<void>;
};

export const SurveyCard = ({
  id,
  linkAcesso,
  title,
  description,
  tag,
  creationDate,
  onViewDetails,
  onGenerateLink,
  onDelete,
  onChangeStatus,
}: SurveyCardProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [dontShowAgainChecked, setDontShowAgainChecked] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativa': return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
      case 'Concluída': return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
      case 'Arquivada': return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!onChangeStatus) return;
    try {
      await onChangeStatus(id, newStatus);
    } catch {
      toast.error("O servidor bloqueou esta transição de status. Lembre-se: Rascunho > Ativa > Concluída > Arquivada.");
    }
  };

  const normalizedTag = tag === "rascunho" || tag === "Rascunho" ? "Rascunho" :
                       tag === "em_andamento" || tag === "Ativa" ? "Ativa" :
                       tag === "concluido" || tag === "Concluída" ? "Concluída" :
                       tag === "Arquivada" ? "Arquivada" : tag;

  const nextStatusMap: Record<string, string> = {
    "Rascunho": "Ativa",
    "Ativa": "Concluída",
    "Concluída": "Arquivada"
  };
  const nextStatus = nextStatusMap[normalizedTag];

  return (
    <>
      <Card className="hover:shadow-lg hover:border-blue-600 hover:translate-y-[-5px] transition-all duration-500">
        <CardHeader>
          <div className="flex justify-between items-start">
            {nextStatus ? (
              <Button
                variant="outline"
                size="sm"
                className={cn("group h-7 px-3 text-xs font-semibold rounded-full border transition-all duration-300", getStatusColor(normalizedTag))}
                onClick={() => {
                  const skip = localStorage.getItem(`dont_show_again_status_${nextStatus}`) === "true";
                  if (skip) {
                    handleStatusChange(nextStatus);
                  } else {
                    setIsConfirmDialogOpen(true);
                  }
                }}
              >
              <div className="grid [grid-template-areas:'stack'] place-items-center">
                <span className="[grid-area:stack] transition-opacity duration-300 opacity-100 group-hover:opacity-0">{normalizedTag}</span>
                <span className="[grid-area:stack] transition-opacity duration-300 opacity-0 group-hover:opacity-100">{normalizedTag} ➔ {nextStatus}</span>
              </div>
              </Button>
            ) : (
              <span className={cn("inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold border", getStatusColor(normalizedTag))}>
                {normalizedTag}
              </span>
            )}

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md" 
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Excluir</span>
            </Button>
          </div>
          <div className="pt-2">
            <CardTitle className="text-xl">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        </CardContent>
        <CardFooter className="flex justify-between items-center text-sm text-muted-foreground">
          <span>Criado em: {creationDate}</span>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              className="cursor-pointer bg-blue-600 text-white hover:bg-blue-500 hover:text-white transition-all duration-500 rounded-md"
              onClick={() => onGenerateLink(linkAcesso || id)}
              title="QR Code / Link Público"
            >
              <QrCode className="h-4 w-4" />
            </Button>
            <Button
              className="cursor-pointer bg-blue-600 text-white hover:bg-blue-500 hover:text-white transition-all duration-500 rounded-md px-4"
              onClick={onViewDetails}
            >
              <Eye className="mr-2 h-4 w-4" /> Ver Detalhes
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tem certeza que deseja excluir?</DialogTitle>
            <DialogDescription>
              A exclusão não é possível pois possui dados vinculados se já existirem respostas ou perguntas atreladas. Tem certeza de que quer continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center justify-end gap-4 sm:gap-4 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (onDelete) onDelete(id);
                setIsDeleteDialogOpen(false);
              }} 
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar alteração de status</DialogTitle>
            <DialogDescription>
              Deseja avançar a pesquisa para {nextStatus}? O backend aplica regras rígidas e você não poderá retroceder.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 my-4">
            <input
              type="checkbox"
              id="dont-show-again"
              checked={dontShowAgainChecked}
              onChange={(e) => setDontShowAgainChecked(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="dont-show-again" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
              Não mostrar novamente
            </label>
          </div>
          <DialogFooter className="flex items-center justify-end gap-4 sm:gap-4">
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (dontShowAgainChecked) {
                  localStorage.setItem(`dont_show_again_status_${nextStatus}`, "true");
                }
                handleStatusChange(nextStatus);
                setIsConfirmDialogOpen(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};