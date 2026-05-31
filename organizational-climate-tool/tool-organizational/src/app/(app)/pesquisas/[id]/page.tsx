"use client";

import { useEffect, useState, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SurveyResponseDetails } from "@/components/pesquisas/SurveyResponseDetails";
import { SurveyHistoricalTrends } from "@/components/pesquisas/SurveyHistoricalTrends";
import { ExportReportButton } from "@/components/ui/export-report-button";
import { pesquisaService } from "@/lib/services/pesquisaService";
import type { Pesquisa } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function SurveyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const [survey, setSurvey] = useState<Pesquisa | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<any | undefined>(undefined);

  useEffect(() => {
    setIsLoading(true);
    pesquisaService.getById(Number(id))
      .then(setSurvey)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 mt-10 space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </section>
    );
  }

  if (!survey) {
    return (
      <section className="container mx-auto px-4 mt-10">
        <p className="text-center text-muted-foreground py-10">Pesquisa não encontrada.</p>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 mt-10">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/pesquisas">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <h1 className="w-fit text-3xl font-bold tracking-tight bg-blue-500 text-white p-2 rounded-lg">
            Resultados: {survey.titulo}
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <ExportReportButton surveyId={String(id)} />
        </div>
      </div>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <p><strong>ID:</strong> {survey.id_pesquisa}</p>
            <p><strong>Status:</strong> {survey.status}</p>
            <p><strong>Participantes:</strong> {(survey as any).participantes ?? 0}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="tendencia">
        <TabsList>
          <TabsTrigger value="tendencia">Ver Tendência Histórica</TabsTrigger>
          <TabsTrigger value="respostas">Ver Detalhes das Respostas</TabsTrigger>
        </TabsList>

        <TabsContent value="tendencia" className="mt-4">
          <SurveyHistoricalTrends surveyId={id} dateRange={dateRange} />
        </TabsContent>
        <TabsContent value="respostas" className="mt-4">
          <SurveyResponseDetails surveyId={id} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
