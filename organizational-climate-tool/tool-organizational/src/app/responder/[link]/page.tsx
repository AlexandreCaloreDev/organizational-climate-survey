"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { publicApiGet, publicApiPost } from "@/lib/api";

export default function ResponderPesquisaPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const link = params.link as string;
  const router = useRouter();
  const isKiosk = searchParams.get("kiosk") === "true";

  const [pesquisa, setPesquisa] = useState<any>(null);
  const [perguntas, setPerguntas] = useState<any[]>([]);
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [tokenAcesso, setTokenAcesso] = useState<string>('');
  const [hasAlreadyResponded, setHasAlreadyResponded] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Estados específicos para o Modo Totem (Kiosk)
  const [started, setStarted] = useState(false);
  const [countdown, setCountdown] = useState(10);

  // Carrega pesquisa e perguntas
  useEffect(() => {
    const fetchPesquisa = async () => {
      try {
        setIsLoading(true);

        // 1. Busca a pesquisa pelo link público (SEM JWT)
        const res = await publicApiGet<any>(`/pesquisas/link/${link}`);
        setPesquisa(res);

        const pesquisaId = res.id_pesquisa || res.id;

        // Validar se o usuário já respondeu localmente (apenas no modo individual)
        if (!isKiosk && localStorage.getItem(`pesquisa_respondida_${pesquisaId}`) === "true") {
          setHasAlreadyResponded(true);
          setIsLoading(false);
          return;
        }

        // 2. Busca as perguntas da pesquisa (SEM JWT)
        if (res.perguntas && res.perguntas.length > 0) {
          setPerguntas(res.perguntas);
        } else {
          try {
            const perguntasList = await publicApiGet<any[]>(`/pesquisas/${pesquisaId}/perguntas`);
            setPerguntas(perguntasList);
          } catch (e) {
            console.error("Erro ao buscar perguntas:", e);
          }
        }

        // No modo individual, gera o token na carga inicial da página
        if (!isKiosk) {
          try {
            const tokenRes = await publicApiPost<{ token_acesso: string }>(`/pesquisas/${pesquisaId}/token`, {
              kiosk: false
            });
            setTokenAcesso(tokenRes.token_acesso);
          } catch (tokenErr: any) {
            console.error("Erro ao gerar token de acesso na carga:", tokenErr);
            const status = tokenErr?.response?.status;
            const backendMsg = (tokenErr?.response?.data?.message || "").toLowerCase();
            const msg = tokenErr.message || "";
            
            if (status === 409 || backendMsg.includes("já respondeu") || msg.toLowerCase().includes("já respondeu")) {
              setHasAlreadyResponded(true);
            } else {
              setErrorMsg(tokenErr?.response?.data?.message || tokenErr.message || "Pesquisa não disponível.");
            }
          }
        }

      } catch (err: any) {
        console.error(err);
        setErrorMsg("Pesquisa não encontrada ou já encerrada.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPesquisa();
  }, [link, isKiosk]);

  // Função para iniciar pesquisa no Modo Totem
  const handleStartSurvey = async () => {
    try {
      setIsLoading(true);
      const pesquisaId = pesquisa.id_pesquisa || pesquisa.id;
      const tokenRes = await publicApiPost<{ token_acesso: string }>(`/pesquisas/${pesquisaId}/token`, {
        kiosk: true
      });
      setTokenAcesso(tokenRes.token_acesso);
      setStarted(true);
    } catch (tokenErr: any) {
      console.error("Erro ao gerar token de acesso no Totem:", tokenErr);
      const backendMsg = tokenErr?.response?.data?.message || "Não foi possível iniciar a pesquisa.";
      toast.error(backendMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para reiniciar o Totem para o próximo colaborador
  const handleResetKiosk = () => {
    setRespostas({});
    setTokenAcesso("");
    setStarted(false);
    setIsSuccess(false);
    setCountdown(10);
  };

  // Efeito do temporizador do Totem (Kiosk)
  useEffect(() => {
    if (isSuccess && isKiosk) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleResetKiosk();
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isSuccess, isKiosk]);

  const handleRespostaChange = (perguntaId: number, valor: string | string[], tipo: string) => {
    setRespostas((prev) => ({
      ...prev,
      [perguntaId]: valor,
    }));
  };

  const handleCheckboxChange = (perguntaId: number, opcao: string, checked: boolean) => {
    setRespostas((prev) => {
      const atuais = (prev[perguntaId] as string[]) || [];
      if (checked) {
        return { ...prev, [perguntaId]: [...atuais, opcao] };
      } else {
        return { ...prev, [perguntaId]: atuais.filter((o) => o !== opcao) };
      }
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const perguntasSemResposta = perguntas.filter((p) => {
      const val = respostas[p.id_pergunta];
      return val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0);
    });

    if (perguntasSemResposta.length > 0) {
      toast.error(`Por favor, responda a todas as perguntas antes de enviar. Faltam ${perguntasSemResposta.length} pergunta(s).`);
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Usa o token de acesso já gerado ou gera um novo se não houver
      let token = tokenAcesso;
      if (!token) {
        const pesquisaId = pesquisa.id_pesquisa || pesquisa.id;
        const tokenRes = await publicApiPost<{ token_acesso: string }>(`/pesquisas/${pesquisaId}/token`, {
          kiosk: isKiosk
        });
        token = tokenRes.token_acesso;
        setTokenAcesso(token);
      }

      // 2. Prepara o Payload — garante que nunca envia "undefined"
      const arrayRespostas = perguntas.map((p) => {
        let val = respostas[p.id_pergunta];
        if (Array.isArray(val)) val = val.join(',');

        return {
          id_pergunta: p.id_pergunta,
          valor_resposta: val != null ? String(val) : '',
        };
      });

      console.log("[DEBUG] Payload de respostas:", JSON.stringify(arrayRespostas, null, 2));

      // 3. Envia via publicApiPost (SEM JWT)
      await publicApiPost("/respostas/submit", {
        token_acesso: token,
        respostas: arrayRespostas,
      });

      // Gravar no localStorage local se for link individual (evita re-submeter no mesmo aparelho)
      if (!isKiosk) {
        const pesquisaId = pesquisa.id_pesquisa || pesquisa.id;
        localStorage.setItem(`pesquisa_respondida_${pesquisaId}`, "true");
      }

      setIsSuccess(true);
      toast.success("Respostas enviadas com sucesso!");
    } catch (err: any) {
      console.error(err);
      const status = err?.response?.status;
      const backendMsg = (err?.response?.data?.message || "").toLowerCase();
      const msg = err.message || "";

      if (status === 409 || backendMsg.includes("já respondeu") || msg.toLowerCase().includes("já respondeu")) {
        setHasAlreadyResponded(true);
      } else {
        toast.error(backendMsg || msg || "Ocorreu um erro ao enviar suas respostas. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (errorMsg || !pesquisa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full shadow-lg border-t-4 border-t-blue-600">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-gray-800">Ops!</CardTitle>
            <CardDescription className="text-lg mt-2">{errorMsg}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full shadow-lg border-t-4 border-t-green-500">
          <CardContent className="pt-8 pb-6 flex flex-col items-center text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <CardTitle className="text-2xl text-gray-800 mb-2">Obrigado por participar!.</CardTitle>
            <CardDescription className="text-base mb-6">
              Suas respostas foram registradas com sucesso de forma anônima.
            </CardDescription>

            {isKiosk && (
              <div className="w-full border-t pt-4 flex flex-col items-center space-y-4">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  ⏳ Esta tela será reiniciada em <strong className="text-foreground">{countdown}</strong> segundos...
                </span>
                <Button 
                  onClick={handleResetKiosk} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Responder Novamente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isKiosk && !started) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full shadow-lg border-t-4 border-t-blue-600">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl font-bold text-gray-900">{pesquisa.titulo}</CardTitle>
            {pesquisa.descricao && (
              <CardDescription className="text-base mt-2">{pesquisa.descricao}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-6">
            <p className="text-sm text-muted-foreground text-center mb-6">
              Esta é uma estação de pesquisa compartilhada (Totem). Suas respostas são totalmente anônimas e seguras de acordo com a LGPD.
            </p>
            <Button 
              onClick={handleStartSurvey} 
              size="lg" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg h-12 font-semibold shadow-md"
            >
              Iniciar Pesquisa
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasAlreadyResponded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full shadow-lg border-t-4 border-t-amber-500">
          <CardContent className="pt-8 pb-6 flex flex-col items-center text-center">
            <div className="rounded-full bg-amber-100 p-3 mb-4">
              <CheckCircle2 className="h-12 w-12 text-amber-500" />
            </div>
            <CardTitle className="text-2xl text-gray-800 mb-2">Você já respondeu!</CardTitle>
            <CardDescription className="text-base">
              Nosso sistema identificou que você já enviou as respostas para esta pesquisa anteriormente. O sistema permite apenas uma resposta por participante. Agradecemos sua colaboração!
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <Card className="shadow-md border-t-4 border-t-blue-600">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-gray-900">{pesquisa.titulo}</CardTitle>
            {pesquisa.descricao && (
              <CardDescription className="text-base mt-2">{pesquisa.descricao}</CardDescription>
            )}
          </CardHeader>
        </Card>

        {perguntas.length === 0 ? (
          <Card className="shadow-md">
            <CardContent className="pt-6 text-center text-gray-500">
              Esta pesquisa ainda não possui perguntas cadastradas.
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6">
            {perguntas.map((pergunta, index) => {
              const tipo = pergunta.tipo_pergunta;
              const opcoes = pergunta.opcoes_resposta ? pergunta.opcoes_resposta.split(",") : [];

              return (
                <Card key={pergunta.id_pergunta} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <Label className="text-lg font-medium text-gray-900">
                      {index + 1}. {pergunta.texto_pergunta.replace(/\u200B$/, "")}
                    </Label>
                  </CardHeader>
                  <CardContent>
                    {tipo === "MultiplaEscolha" && (
                      pergunta.texto_pergunta.endsWith("\u200B") ? (
                        <div className="flex flex-col space-y-2 mt-2">
                          {opcoes.map((opcao: string) => {
                            const trimmedOpcao = opcao.trim();
                            const respostasAtuais = (respostas[pergunta.id_pergunta] as string[]) || [];
                            const isChecked = respostasAtuais.includes(trimmedOpcao);
                            return (
                              <div key={trimmedOpcao} className="flex items-center space-x-3">
                                <Checkbox
                                  id={`${pergunta.id_pergunta}-${trimmedOpcao}`}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    handleCheckboxChange(pergunta.id_pergunta, trimmedOpcao, !!checked);
                                  }}
                                />
                                <Label
                                  htmlFor={`${pergunta.id_pergunta}-${trimmedOpcao}`}
                                  className="text-base font-normal cursor-pointer"
                                >
                                  {trimmedOpcao}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <RadioGroup
                          value={String(respostas[pergunta.id_pergunta] || "")}
                          onValueChange={(val) => handleRespostaChange(pergunta.id_pergunta, val, tipo)}
                          className="flex flex-col space-y-2 mt-2"
                        >
                          {opcoes.map((opcao: string) => (
                            <div key={opcao} className="flex items-center space-x-3">
                              <RadioGroupItem value={opcao.trim()} id={`${pergunta.id_pergunta}-${opcao.trim()}`} />
                              <Label htmlFor={`${pergunta.id_pergunta}-${opcao.trim()}`} className="text-base font-normal">
                                {opcao.trim()}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )
                    )}

                    {tipo === "RespostaAberta" && (
                      <Textarea
                        placeholder="Digite sua resposta aqui..."
                        className="mt-2 text-base resize-y"
                        rows={4}
                        onChange={(e) => handleRespostaChange(pergunta.id_pergunta, e.target.value, tipo)}
                      />
                    )}

                    {tipo === "SimNao" && (
                      <RadioGroup
                        value={String(respostas[pergunta.id_pergunta] || "")}
                        onValueChange={(val) => handleRespostaChange(pergunta.id_pergunta, val, tipo)}
                        className="flex flex-col space-y-2 mt-2"
                      >
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="Sim" id={`${pergunta.id_pergunta}-sim`} />
                          <Label htmlFor={`${pergunta.id_pergunta}-sim`} className="text-base font-normal">Sim</Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="Não" id={`${pergunta.id_pergunta}-nao`} />
                          <Label htmlFor={`${pergunta.id_pergunta}-nao`} className="text-base font-normal">Não</Label>
                        </div>
                      </RadioGroup>
                    )}

                    {tipo === "EscalaNumerica" && (
                      <RadioGroup
                        value={String(respostas[pergunta.id_pergunta] || "")}
                        onValueChange={(val) => handleRespostaChange(pergunta.id_pergunta, val, tipo)}
                        className="flex flex-row flex-wrap gap-3 mt-2 p-1"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <div key={num} className="flex flex-col items-center space-y-1">
                            <Label htmlFor={`${pergunta.id_pergunta}-${num}`} className="text-sm cursor-pointer">{num}</Label>
                            <RadioGroupItem value={String(num)} id={`${pergunta.id_pergunta}-${num}`} />
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            <div className="flex justify-end pt-4 pb-12">
              <Button 
                type="submit" 
                size="lg" 
                className="w-full sm:w-auto px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-md text-lg h-12"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Respostas"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
