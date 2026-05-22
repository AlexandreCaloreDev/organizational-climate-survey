// src/components/pesquisas/SurveyResponseDetails.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListChecks } from "lucide-react";
import type { Resposta } from '@/lib/types';
import { respostaService } from '@/lib/services/respostaService';
import { apiGet } from '@/lib/api';
import { toast } from 'sonner';

interface SurveyResponseDetailsProps {
  surveyId: string;
}

export function SurveyResponseDetails({ surveyId }: SurveyResponseDetailsProps) {
  const [responses, setResponses] = useState<Resposta[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!surveyId) return;
    const fetch = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 3); // últimos 3 meses
        
        if (!start || !end) return;

        const formatDate = (date: Date) => date.toISOString().split('T')[0];
        
        const data = await apiGet<Resposta[]>(
          `/pesquisas/${surveyId}/respostas/by-date?start_date=${formatDate(start)}&end_date=${formatDate(end)}`
        );
        setResponses(data || []);
      } catch (err: any) {
        console.error(err);
        setErrorMsg("Erro no formato da data ou período inválido");
        toast.error("Erro no formato da data ou período inválido");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [surveyId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-green-500" />
          Detalhes das Respostas
        </CardTitle>
        <CardDescription>
          Visualização das respostas individuais e dados brutos da pesquisa.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Pesquisa ID: {surveyId} | Exibindo as últimas {responses.length} respostas.
        </p>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID Resposta</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Pergunta</TableHead>
                <TableHead>Resposta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">Carregando...</TableCell>
                </TableRow>
              ) : errorMsg ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-red-500 font-medium">{errorMsg}</TableCell>
                </TableRow>
              ) : responses.length ? (
                responses.map((r) => (
                  <TableRow key={r.id_resposta}>
                    <TableCell className="font-medium">{r.id_resposta}</TableCell>
                    <TableCell>{r.pesquisa?.setor?.nome_setor ?? '-'}</TableCell>
                    <TableCell>{new Date(r.data_submissao).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{r.pergunta?.texto_pergunta ?? '-'}</TableCell>
                    <TableCell>
                      {typeof r.valor_resposta === 'object' 
                        ? JSON.stringify(r.valor_resposta) 
                        : String(r.valor_resposta) === '[object Object]' 
                          ? 'Múltiplas opções (erro de parse)'
                          : String(r.valor_resposta)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">Nenhuma resposta encontrada para o período.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Use o filtro de data na aba "Tendência Histórica" para refinar os resultados.</p>
        </div>
      </CardContent>
    </Card>
  );
}
