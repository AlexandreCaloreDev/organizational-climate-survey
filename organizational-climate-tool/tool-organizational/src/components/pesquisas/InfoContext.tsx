"use client";

import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

export function InfoContext() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 rounded-md hover:bg-blue-50">
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Ajuda</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-white border shadow-md p-4" align="start">
        <h4 className="font-semibold text-sm mb-2 text-gray-900">Ciclo de Vida das Pesquisas</h4>
        <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
          <p>As pesquisas passam por um fluxo rígido de transição de status no banco de dados:</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li><strong>Rascunho:</strong> Configuração inicial. Editável.</li>
            <li><strong>Ativa:</strong> Publicada para respostas. Não editável.</li>
            <li><strong>Concluída:</strong> Finalizada. Estatísticas consolidadas.</li>
            <li><strong>Arquivada:</strong> Removida da visualização principal. Histórica.</li>
          </ol>
          <p className="font-medium text-red-600">Atenção: A transição segue apenas a ordem: Rascunho &gt; Ativa &gt; Concluída &gt; Arquivada. O servidor não permite voltar de status.</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
