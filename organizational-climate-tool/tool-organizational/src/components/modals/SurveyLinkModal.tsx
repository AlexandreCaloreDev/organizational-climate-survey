'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface SurveyLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  surveyId: string;
}

export function SurveyLinkModal({ isOpen, onClose, surveyId }: SurveyLinkModalProps) {
  const [surveyLink, setSurveyLink] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Gera o link apenas no cliente
  useEffect(() => {
    if (typeof window !== "undefined") {
      setSurveyLink(`${window.location.origin}/responder/${surveyId}`);
    }
  }, [surveyId]);

  const copyToClipboard = () => {
    // Método 1: Usando navigator.clipboard (moderno)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(surveyLink)
        .then(() => {
          toast.success("Link copiado com sucesso!");
        })
        .catch(() => {
          // Fallback para o método antigo
          fallbackCopy();
        });
    } else {
      // Método 2: Fallback para navegadores mais antigos ou HTTP
      fallbackCopy();
    }
  };

  const fallbackCopy = () => {
    try {
      if (inputRef.current) {
        inputRef.current.select();
        inputRef.current.setSelectionRange(0, 99999); // Para mobile
        document.execCommand('copy');
        toast.success("Link copiado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao copiar:", error);
      toast.error("Erro ao copiar. Selecione e copie manualmente (Ctrl+C).");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Link da Pesquisa</DialogTitle>
          <DialogDescription>
            Compartilhe este link para que os participantes possam responder à pesquisa.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="survey-link">Link</Label>
            <div className="flex space-x-2">
              <Input 
                ref={inputRef}
                id="survey-link" 
                value={surveyLink} 
                readOnly 
              />
              <Button type="button" size="icon" onClick={() => window.open(surveyLink, '_blank')} title="Abrir em Nova Aba">
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only">Abrir Link</span>
              </Button>
              <Button type="button" size="icon" onClick={copyToClipboard} title="Copiar URL">
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copiar</span>
              </Button>
            </div>
          </div>
          {surveyLink && (
            <div className="flex flex-col items-center justify-center p-4 border rounded-md">
              <Label className="mb-2">QR Code</Label>
              <QRCode value={surveyLink} size={180} level="H" />
              <p className="text-sm text-muted-foreground mt-2">Escaneie para responder</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}