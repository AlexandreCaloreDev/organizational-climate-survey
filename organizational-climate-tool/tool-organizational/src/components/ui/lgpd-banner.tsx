"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function LGPDBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("lgpd_accepted");
    if (!accepted) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("lgpd_accepted", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-sm text-gray-700">
        Nós utilizamos cookies e coletamos dados anonimizados para fins de análise e melhoria da sua experiência, 
        de acordo com a Lei Geral de Proteção de Dados (LGPD).
      </p>
      <Button onClick={handleAccept} className="whitespace-nowrap">
        Aceitar e Fechar
      </Button>
    </div>
  );
}
