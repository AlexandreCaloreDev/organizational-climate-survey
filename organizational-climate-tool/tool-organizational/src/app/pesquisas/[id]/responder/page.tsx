"use client"

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { publicApiGet, publicApiPost } from "@/lib/api";
import LGPDBanner from "@/components/ui/lgpd-banner";

const answerSchema = z.object({
  questionId: z.string(),
  answer: z.any(),
});

const publicSurveyResponseSchema = z.object({
  surveyId: z.string(),
  answers: z.array(answerSchema),
});

type PublicSurveyResponseInputs = z.infer<typeof publicSurveyResponseSchema>;

function parseOptions(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fallback
    }
    return value.split(/\||,|;/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export default function PublicSurveyResponsePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const id = params?.id;

  const [survey, setSurvey] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasAlreadyResponded, setHasAlreadyResponded] = useState(false);
  const [isSuccessScreen, setIsSuccessScreen] = useState(false);

  const { handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = useForm<PublicSurveyResponseInputs>({
    resolver: zodResolver(publicSurveyResponseSchema),
    defaultValues: { surveyId: id, answers: [] }
  });

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    publicApiGet<any>(`/pesquisas/${id}`)
      .then((res) => {
        const pesquisa = (res as any).pesquisa ?? res;
        const perguntas = (res as any).perguntas ?? pesquisa?.perguntas ?? [];
        if (!mounted) return;
        setSurvey({ pesquisa, perguntas });
        // Se perguntas vieram vazias, tenta buscar separadamente
        if (perguntas.length === 0) {
          publicApiGet<any[]>(`/pesquisas/${pesquisa.id_pesquisa || pesquisa.id || id}/perguntas`)
            .then((pergList) => {
              if (!mounted) return;
              setSurvey((prev: any) => ({ ...prev, perguntas: pergList || [] }));
              const initialAnswers = (pergList || []).map((q: any) => ({ questionId: String(q.id_pergunta ?? q.id), answer: undefined }));
              reset({ surveyId: String(pesquisa?.id_pesquisa ?? pesquisa?.id ?? id), answers: initialAnswers });
            })
            .catch(() => {});
        } else {
          const initialAnswers = perguntas.map((q: any) => ({ questionId: String(q.id_pergunta ?? q.ID ?? q.id), answer: undefined }));
          reset({ surveyId: String(pesquisa?.id_pesquisa ?? pesquisa?.id ?? id), answers: initialAnswers });
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Não foi possível carregar a pesquisa.");
      })
      .finally(() => setLoading(false));
    return () => { mounted = false; };
  }, [id, reset]);

  const onSubmit = async (data: PublicSurveyResponseInputs) => {
    try {
      const pesquisaId = Number(survey?.pesquisa?.id_pesquisa ?? survey?.pesquisa?.id ?? id);
      // Gera token no momento do submit
      const tokenResp = await publicApiPost<{ token_acesso: string }>(`/pesquisas/${pesquisaId}/token`, {});
      const token = tokenResp?.token_acesso;
      const respostasPayload = data.answers.map(a => ({
        id_pergunta: Number(a.questionId),
        valor_resposta: Array.isArray(a.answer) ? a.answer.join(",") : String(a.answer ?? "")
      }));
      await publicApiPost("/respostas/submit", { token_acesso: token, respostas: respostasPayload });
      setIsSuccessScreen(true);
      toast.success("Sua resposta foi enviada com sucesso! Obrigado por participar.");
    } catch (error: any) {
      const status = error?.response?.status;
      const backendMsg = (error?.response?.data?.message || "").toLowerCase();
      if (status === 409 || backendMsg.includes("já respondeu")) {
        setHasAlreadyResponded(true);
      } else {
        toast.error("Ocorreu um erro ao enviar sua resposta. Por favor, tente novamente.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>Carregando pesquisa...</div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>Pesquisa não encontrada.</div>
      </div>
    );
  }

  const perguntas = survey.perguntas || [];

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <LGPDBanner />
      <div className="flex items-center justify-center py-10">
        <Card className="w-full max-w-3xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">{survey.pesquisa?.titulo ?? survey.pesquisa?.title ?? 'Pesquisa'}</CardTitle>
            <CardDescription className="text-gray-600 mt-2">{survey.pesquisa?.descricao ?? survey.pesquisa?.description ?? ''}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {perguntas.map((q: any, index: number) => {
                const questionId = String(q.id_pergunta ?? q.ID ?? q.id ?? index);
                const texto = q.texto_pergunta ?? q.TextoPergunta ?? q.questionText ?? 'Pergunta';
                const tipo = (String(q.tipo_pergunta ?? q.TipoPergunta ?? '')).toLowerCase();
                const options = parseOptions(q.opcoes_resposta ?? q.OpcoesResposta ?? q.opcoes ?? q.options);

                return (
                  <div key={questionId} className="space-y-4 border-b pb-6 last:border-b-0 last:pb-0">
                    <Label className="text-lg font-semibold">{index + 1}. {texto}</Label>

                    {options.length > 0 ? (
                      <div>
                        <RadioGroup
                          onValueChange={(value) => setValue(`answers.${index}.answer`, value)}
                          defaultValue={watch(`answers.${index}.answer`)}
                        >
                          {options.map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center space-x-2">
                              <RadioGroupItem value={option} id={`${questionId}-${optIndex}`} />
                              <Label htmlFor={`${questionId}-${optIndex}`}>{option}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    ) : (tipo.includes('escala') || tipo.includes('numerica')) ? (
                      <div className="space-y-4">
                        <RadioGroup
                          onValueChange={(value) => setValue(`answers.${index}.answer`, value)}
                          className="flex flex-row flex-wrap gap-3 mt-2"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <div key={num} className="flex flex-col items-center space-y-1">
                              <Label htmlFor={`${questionId}-scale-${num}`} className="text-sm cursor-pointer">{num}</Label>
                              <RadioGroupItem value={String(num)} id={`${questionId}-scale-${num}`} />
                            </div>
                          ))}
                        </RadioGroup>
                        <div className="flex justify-between text-xs text-muted-foreground px-1">
                          <span>Discordo totalmente</span><span>Concordo totalmente</span>
                        </div>
                      </div>
                    ) : (
                      <Textarea placeholder="Digite sua resposta aqui..." onChange={(e) => setValue(`answers.${index}.answer`, e.target.value)} />
                    )}
                  </div>
                );
              })}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
                {isSubmitting ? "Enviando Resposta..." : "Enviar Resposta"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}