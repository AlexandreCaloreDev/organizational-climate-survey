"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const externalDataSchema = z.object({
  absenteismo: z.coerce.number().min(0, "O valor não pode ser negativo.").optional(),
  turnover: z.coerce.number().min(0, "O valor não pode ser negativo.").optional(),
});

type ExternalDataForm = z.infer<typeof externalDataSchema>;

interface ExternalDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  surveyId: string | null;
  surveyTitle: string | null;
  onSave: (surveyId: string, data: { absenteismo: number; turnover: number }) => void;
}

export const ExternalDataModal = ({
  isOpen,
  onClose,
  surveyId,
  surveyTitle,
  onSave,
}: ExternalDataModalProps) => {
  const form = useForm<any>({
    resolver: zodResolver(externalDataSchema),
    defaultValues: {
      absenteismo: undefined,
      turnover: undefined,
    },
  });

  const onSubmit = (data: ExternalDataForm) => {
    if (!surveyId) return;
    onSave(surveyId, {
      absenteismo: data.absenteismo || 0,
      turnover: data.turnover || 0,
    });
    onClose();
  };

  // Limpa o formulário quando o modal é fechado
  useEffect(() => {
    if (!isOpen) {
      // Adiciona um pequeno delay para evitar que o reset seja visível antes do fechamento
      setTimeout(() => form.reset(), 200);
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Inserir Dados Externos de RH</DialogTitle>
            <DialogDescription>
              Dados para a pesquisa: <span className="font-semibold">"{surveyTitle}"</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="absenteismo" className="text-right">Absenteísmo (%)</Label>
              <Input id="absenteismo" type="number" {...form.register("absenteismo")} className="col-span-3" placeholder="Ex: 5"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="turnover" className="text-right">Turnover Vol. (%)</Label>
              <Input id="turnover" type="number" {...form.register("turnover")} className="col-span-3" placeholder="Ex: 12"/>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Salvando..." : "Salvar Dados"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};