"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

export function WelcomeSurveyModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const shown = localStorage.getItem("welcome_survey_shown");
    if (!shown) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("welcome_survey_shown", "true");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-600">
            <Info className="h-5 w-5" />
            Bem-vindo ao Clima Organizacional!
          </DialogTitle>
          <DialogDescription className="text-gray-600 pt-2 text-sm leading-relaxed">
            Olá! O sistema de gerenciamento de pesquisas foi construído com regras estritas de ciclo de vida.
            <br /><br />
            Para garantir a integridade dos dados coletados, o fluxo de status de cada pesquisa segue uma ordem linear obrigatória:
            <br /><br />
            <span className="font-semibold text-gray-900">Rascunho &rarr; Ativa &rarr; Concluída &rarr; Arquivada</span>
            <br /><br />
            Não é possível retornar ao status anterior após a transição.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleClose} className="bg-blue-600 hover:bg-blue-700 text-white w-full">
            Entendi, Prosseguir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
