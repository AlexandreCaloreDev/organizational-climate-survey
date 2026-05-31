"use client";

import { type Pesquisa } from "@/components/dashboard/DataTable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ClipboardList, Users, ToggleLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { respostaService } from "@/lib/services/respostaService";

export const SurveyOverviewTab = ({ survey }: { survey: Pesquisa }) => {
  const [totalRespostas, setTotalRespostas] = useState<number>(
    survey.participantes !== undefined ? survey.participantes : ((survey as any).total_respostas || 0)
  );

  useEffect(() => {
    const surveyId = (survey as any).id_pesquisa || survey.id;
    if (!surveyId) return;

    respostaService.countByPesquisa(Number(surveyId))
      .then((res) => {
        if (res && typeof res.total_respostas === 'number') {
          setTotalRespostas(res.total_respostas);
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar contagem de respostas em tempo real:", err);
      });
  }, [survey]);

  const getFormattedDate = () => {
    const rawDate = (survey as any).dataCriacao || (survey as any).data_criacao || (survey as any).creationDate;
    if (!rawDate) return "Não disponível";
    try {
      return format(new Date(rawDate), "dd 'de' MMMM, yyyy", { locale: ptBR });
    } catch {
      return String(rawDate);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "concluido":
      case "Concluída":
        return "Concluída";
      case "em_andamento":
      case "Ativa":
        return "Ativa";
      case "rascunho":
      case "Rascunho":
        return "Rascunho";
      case "Arquivada":
        return "Arquivada";
      default:
        return status || "Não informado";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "concluido":
      case "Concluída":
        return "text-blue-600 bg-blue-50 border-blue-100";
      case "em_andamento":
      case "Ativa":
        return "text-green-600 bg-green-50 border-green-100";
      case "Arquivada":
        return "text-orange-600 bg-orange-50 border-orange-100";
      default:
        return "text-gray-600 bg-gray-50 border-gray-100";
    }
  };

  const description = (survey as any).descricao || (survey as any).description || "Sem descrição cadastrada.";
  const title = survey.title || (survey as any).titulo || "Pesquisa Sem Título";
  const status = getStatusLabel(survey.status);

  return (
    <div className="flex flex-col gap-6 w-full pr-1">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Status Atual
            </CardTitle>
            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(survey.status)}`}>
              {status}
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Data de Criação
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-foreground">
              {getFormattedDate()}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Participantes
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-foreground">
              {survey.participantes !== undefined ? survey.participantes : ((survey as any).total_participantes !== undefined ? (survey as any).total_participantes : totalRespostas)} {((survey.participantes !== undefined ? survey.participantes : ((survey as any).total_participantes !== undefined ? (survey as any).total_participantes : totalRespostas)) === 1) ? "participante" : "participantes"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <ClipboardList className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-md font-semibold text-foreground">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {description}
          </p>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground italic mt-2">
        Nota: Pesquisas realizadas em períodos diferentes no mesmo setor são armazenadas como registros únicos, permitindo a comparação histórica de indicadores entre elas.
      </p>
    </div>
  );
};
