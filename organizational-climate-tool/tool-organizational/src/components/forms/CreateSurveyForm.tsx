// CreateSurveyForm.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { PlusCircle, Trash2, Loader2, Lightbulb } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { pesquisaService } from "@/lib/services/pesquisaService";
import { perguntaService } from "@/lib/services/perguntaService";
import { setorService } from "@/lib/services/setorService";
import type { TipoPergunta, Setor, Pesquisa } from "@/lib/types";
import { useEffect, useState } from "react";

const tipoMap: Record<string, TipoPergunta> = {
  text: "RespostaAberta",
  radio: "MultiplaEscolha",
  checkbox: "MultiplaEscolha",
  scale: "EscalaNumerica",
};

// Definição do Schema para as Opções de Múltipla Escolha
const optionSchema = z.object({
  text: z.string().min(1, "A opção não pode ser vazia."),
});

// Definição do Schema para as Perguntas
const questionSchema = z.object({
  text: z.string().min(5, "O texto da pergunta deve ter pelo menos 5 caracteres."),
  type: z.enum(["text", "radio", "checkbox", "scale"], {
    message: "O tipo de pergunta é obrigatório.",
  }),
  options: z.array(optionSchema).optional(),
}).refine((data) => {
  if ((data.type === "radio" || data.type === "checkbox") && (!data.options || data.options.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "Perguntas de múltipla escolha exigem pelo menos uma opção de resposta.",
  path: ["options"],
});

// Definição do Schema Principal
const surveySchema = z.object({
  title: z.string().min(3, "O título deve ter no mínimo 3 caracteres."),
  description: z.string().optional(),
  setorId: z.string().min(1, "O setor é obrigatório."),
  ciclo: z.string().min(3, "O ciclo de avaliação é obrigatório (ex: 2026.1)."),
  questions: z.array(questionSchema).min(1, "A pesquisa deve ter pelo menos 1 pergunta."),
});

type SurveyFormData = z.infer<typeof surveySchema>;

interface CreateSurveyFormProps {
  onClose?: () => void;
}

export function CreateSurveyForm({ onClose }: CreateSurveyFormProps) {
  const { user } = useAuth();
  const [setores, setSetores] = useState<Setor[]>([]);
  const [isLoadingSetores, setIsLoadingSetores] = useState(true);
  const [existingSurveys, setExistingSurveys] = useState<Pesquisa[]>([]);

  const mapApiPerguntaToForm = (q: any): any => {
    const isCheckbox = q.texto_pergunta.endsWith("\u200B");
    const cleanText = q.texto_pergunta.replace(/\u200B/g, "");

    let type: "text" | "radio" | "checkbox" | "scale" = "text";
    if (q.tipo_pergunta === "RespostaAberta") {
      type = "text";
    } else if (q.tipo_pergunta === "EscalaNumerica") {
      type = "scale";
    } else if (q.tipo_pergunta === "MultiplaEscolha") {
      type = isCheckbox ? "checkbox" : "radio";
    } else if (q.tipo_pergunta === "SimNao") {
      type = "radio";
    }

    const optionsRaw = q.opcoes_resposta ? q.opcoes_resposta.split(",") : [];
    const options = optionsRaw.map((o: string) => ({ text: o.trim() }));

    if (q.tipo_pergunta === "SimNao" && options.length === 0) {
      options.push({ text: "Sim" }, { text: "Não" });
    }

    return {
      text: cleanText,
      type,
      options,
    };
  };

  const handleCopyQuestionsFromSurvey = async (surveyIdStr: string) => {
    const surveyId = Number(surveyIdStr);
    try {
      const loader = toast.loading("Carregando perguntas da pesquisa selecionada...");
      const fetchedQuestions = await pesquisaService.listPerguntas(surveyId);
      if (fetchedQuestions && fetchedQuestions.length > 0) {
        const formQuestions = fetchedQuestions.map(mapApiPerguntaToForm);
        form.setValue("questions", formQuestions, { shouldValidate: true });
        toast.success("Perguntas copiadas com sucesso!", { id: loader });
      } else {
        toast.error("Esta pesquisa não possui perguntas cadastradas.", { id: loader });
      }
    } catch {
      toast.error("Erro ao carregar perguntas da pesquisa.");
    }
  };

  const form = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      title: "",
      description: "",
      setorId: "",
      ciclo: "",
      questions: [{ text: "", type: "text", options: [] }],
    },
  });

  // USE useFieldArray CORRETAMENTE
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  // Carregar setores da empresa ao montar o componente
  useEffect(() => {
    const empresaId = user?.empresa_id ? Number(user.empresa_id) : 1;
    setorService
      .listByEmpresa(empresaId)
      .then((data) => {
        setSetores(data);
        if (data.length === 1) {
          form.setValue("setorId", String(data[0].id_setor), { shouldValidate: true });
        }
      })
      .catch(() => toast.error("Não foi possível carregar os setores."))
      .finally(() => setIsLoadingSetores(false));

    // Carregar pesquisas existentes para opção de cópia
    pesquisaService
      .listByEmpresa(empresaId)
      .then((data) => {
        setExistingSurveys(data);
      })
      .catch((err) => console.error("Erro ao carregar pesquisas para cópia:", err));
  }, [user]);

  const onSubmit = async (data: SurveyFormData) => {
    const empresaId = user?.empresa_id ? Number(user.empresa_id) : 1;
    let pesquisaCriadaId: number | null = null;

    try {
      const pesquisa = await pesquisaService.create(empresaId, {
        titulo: data.title,
        descricao: data.description || "",
        id_setor: Number(data.setorId),
        anonimato: true,
        id_user_admin: Number(user?.id || 1),
        status: "Ativa",
        ciclo: data.ciclo,
      });
      pesquisaCriadaId = pesquisa.id_pesquisa;

      try {
        await perguntaService.createBatch(
          pesquisaCriadaId as number,
          data.questions.map((q, i) => ({
            texto_pergunta: q.type === "checkbox" ? `${q.text}\u200B` : q.text,
            tipo_pergunta: tipoMap[q.type],
            ordem_exibicao: i + 1,
            opcoes_resposta: (q.type === "radio" || q.type === "checkbox") && q.options?.length
              ? q.options.map((o) => o.text).join(",")
              : undefined,
          }))
        );
      } catch (batchError) {
        // Rollback da pesquisa caso as perguntas falhem
        if (pesquisaCriadaId) {
          await pesquisaService.delete(pesquisaCriadaId).catch(() => console.error("Falha no rollback da pesquisa."));
        }
        throw batchError; // Relança para o catch externo / interceptor
      }

      toast.success("Pesquisa criada com sucesso!");
      if (onClose) onClose(); // Fecha o modal após o sucesso
    } catch (error) {
      console.error("Erro ao criar pesquisa/perguntas:", error);
      // O interceptor global exibirá o toast.error automaticamente
    }
  };

  const addQuestion = () => {
    append({ text: "", type: "text", options: [] });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto p-2">
      {/* Título e Descrição */}
      <div className="grid gap-2">
        <Label htmlFor="title">Título da Pesquisa</Label>
        <Input id="title" {...form.register("title")} />
        {form.formState.errors.title && (
          <p className="text-red-500 text-sm">{form.formState.errors.title.message}</p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Descrição (Opcional)</Label>
        <Textarea id="description" {...form.register("description")} />
      </div>

      {/* Ciclo de Avaliação */}
      <div className="grid gap-2">
        <Label htmlFor="ciclo">Ciclo de Avaliação (Período)</Label>
        <Input id="ciclo" placeholder="Ex: 2026.1, Q1-2026, Anual-2026" {...form.register("ciclo")} />
        {form.formState.errors.ciclo && (
          <p className="text-red-500 text-sm">{form.formState.errors.ciclo.message}</p>
        )}
      </div>

      {/* Copiar Perguntas */}
      {existingSurveys.length > 0 && (
        <div className="grid gap-2 border p-3 rounded-lg bg-slate-50 border-slate-200">
          <Label className="font-semibold text-sm text-blue-800 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Copiar Perguntas de Pesquisa Anterior
          </Label>
          <Select
            onValueChange={handleCopyQuestionsFromSurvey}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Selecione uma pesquisa existente para copiar" />
            </SelectTrigger>
            <SelectContent>
              {existingSurveys.map((p) => (
                <SelectItem key={p.id_pesquisa} value={String(p.id_pesquisa)}>
                  {p.titulo} ({new Date(p.data_criacao).toLocaleDateString("pt-BR")})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Isso substituirá as perguntas atuais pelas da pesquisa selecionada.</p>
        </div>
      )}

      {/* Setor */}
      <div className="grid gap-2">
        <Label>Setor</Label>
        {isLoadingSetores ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando setores...
          </div>
        ) : (
          <Select
            onValueChange={(value) => form.setValue("setorId", value, { shouldValidate: true })}
            value={form.watch("setorId")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o setor" />
            </SelectTrigger>
            <SelectContent>
              {setores.map((s) => (
                <SelectItem key={s.id_setor} value={String(s.id_setor)}>
                  {s.nome_setor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {form.formState.errors.setorId && (
          <p className="text-red-500 text-sm">{form.formState.errors.setorId.message}</p>
        )}
      </div>

      {/* Seção de Perguntas */}
      <h3 className="text-xl font-semibold mt-6">Perguntas</h3>
      <div className="space-y-4">
        {fields.map((field, index) => {
          const qType = form.watch(`questions.${index}.type`);
          return (
            <Card key={field.id} className="p-4 border-l-4 border-blue-500">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-medium">Pergunta #{index + 1}</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid gap-2 mb-3">
                <Label htmlFor={`questions.${index}.text`}>Texto da Pergunta</Label>
                <Input id={`questions.${index}.text`} {...form.register(`questions.${index}.text`)} />
                {form.formState.errors.questions?.[index]?.text && (
                  <p className="text-red-500 text-sm">{form.formState.errors.questions[index].text.message}</p>
                )}
              </div>

              <div className="grid gap-2 mb-3">
                <Label>Tipo de Resposta</Label>
                <Select
                  onValueChange={(value) => form.setValue(`questions.${index}.type`, value as any, { shouldValidate: true })}
                  defaultValue={field.type}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto Livre</SelectItem>
                    <SelectItem value="radio">Múltipla Escolha (Única)</SelectItem>
                    <SelectItem value="checkbox">Múltipla Escolha (Múltipla)</SelectItem>
                    <SelectItem value="scale">Escala (1 a 10)</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.questions?.[index]?.type && (
                  <p className="text-red-500 text-sm">{form.formState.errors.questions[index].type.message}</p>
                )}
              </div>

              {/* Lógica para Opções (Apenas para Múltipla Escolha/Escala) */}
              {(qType === "radio" || qType === "checkbox") && (
                <QuestionOptions
                  questionIndex={index}
                  control={form.control}
                  register={form.register}
                  errors={form.formState.errors}
                />
              )}
            </Card>
          );
        })}
      </div>

      <Button type="button" variant="outline" onClick={addQuestion} className="w-full">
        <PlusCircle className="w-4 h-4 mr-2" /> Adicionar Pergunta
      </Button>

      {/* Botão de Submissão */}
      <div className="flex justify-end pt-4 border-t">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Criando..." : "Criar Pesquisa"}
        </Button>
      </div>
    </form>
  );
}

interface QuestionOptionsProps {
  questionIndex: number;
  control: any;
  register: any;
  errors: any;
}

function QuestionOptions({ questionIndex, control, register, errors }: QuestionOptionsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `questions.${questionIndex}.options` as any,
  });

  return (
    <div className="mt-4 p-4 border rounded-lg bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Opções de Resposta</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ text: "" })}
          className="h-8 px-2 text-xs flex items-center gap-1 border-dashed"
        >
          <PlusCircle className="w-3.5 h-3.5" /> Adicionar Opção
        </Button>
      </div>

      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Nenhuma opção adicionada ainda. Adicione pelo menos uma.</p>
      )}

      <div className="space-y-2">
        {fields.map((field, optionIndex) => (
          <div key={field.id} className="flex gap-2 items-center">
            <Input
              placeholder={`Opção ${optionIndex + 1}`}
              {...register(`questions.${questionIndex}.options.${optionIndex}.text` as const)}
              className="bg-white dark:bg-black"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(optionIndex)}
              className="text-red-500 hover:text-red-700 h-9 w-9 p-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
      {errors?.questions?.[questionIndex]?.options && (
        <p className="text-red-500 text-xs mt-1">
          {errors.questions[questionIndex].options.message || "Verifique as opções."}
        </p>
      )}
    </div>
  );
}
