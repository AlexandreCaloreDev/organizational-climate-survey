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
  const [activeTab, setActiveTab] = useState<"individual" | "totem">("individual");
  const inputRef = useRef<HTMLInputElement>(null);

  // Gera o link apenas no cliente
  useEffect(() => {
    if (typeof window !== "undefined") {
      setSurveyLink(`${window.location.origin}/responder/${surveyId}`);
    }
  }, [surveyId]);

  const finalLink = activeTab === "totem" ? `${surveyLink}?kiosk=true` : surveyLink;

  const copyToClipboard = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(finalLink)
        .then(() => {
          toast.success("Link copiado com sucesso!");
        })
        .catch(() => {
          fallbackCopy();
        });
    } else {
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
            Escolha o modelo de link e compartilhe para receber as respostas dos participantes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex border-b mb-2 mt-2">
          <button
            type="button"
            className={`flex-1 pb-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "individual"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("individual")}
          >
            Link Individual
          </button>
          <button
            type="button"
            className={`flex-1 pb-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "totem"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("totem")}
          >
            Modo Totem
          </button>
        </div>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="survey-link">Link da Pesquisa</Label>
            <div className="flex space-x-2">
              <Input 
                ref={inputRef}
                id="survey-link" 
                value={finalLink} 
                readOnly 
              />
              <Button type="button" size="icon" onClick={() => window.open(finalLink, '_blank')} title="Abrir em Nova Aba">
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only">Abrir Link</span>
              </Button>
              <Button type="button" size="icon" onClick={copyToClipboard} title="Copiar URL">
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copiar</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeTab === "totem" 
                ? "💡 Recomendado para computador compartilhado. A tela reinicia a cada 10s automaticamente após responder." 
                : "💡 Recomendado para celulares pessoais. Limita tecnicamente para uma única resposta por celular."}
            </p>
          </div>
          {finalLink && (
            <div className="flex flex-col items-center justify-center p-4 border rounded-md">
              <Label className="mb-2">QR Code</Label>
              <QRCode value={finalLink} size={180} level="H" />
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