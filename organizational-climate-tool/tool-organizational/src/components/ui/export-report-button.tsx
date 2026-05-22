"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportReportButtonProps {
  surveyId: string;
}

export function ExportReportButton({ surveyId }: ExportReportButtonProps) {
  const handleView = () => {
    if (!surveyId) return;
    window.open(`/relatorios/${surveyId}`, "_blank");
  };

  return (
    <Button onClick={handleView} disabled={!surveyId}>
      <ExternalLink className="mr-2 h-4 w-4" />
      Visualizar Relatório
    </Button>
  );
}
