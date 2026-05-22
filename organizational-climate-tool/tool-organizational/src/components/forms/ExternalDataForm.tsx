"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";
import { PlusCircle, Trash2, TrendingUp } from "lucide-react";

const absenceRecordSchema = z.object({
  dias: z.coerce.number().min(0.5, "Mínimo 0.5."),
});

const externalDataSchema = z.object({
  // Campos para Absenteísmo
  totalColaboradores: z.coerce.number().min(1, "Deve haver pelo menos 1 colaborador.").optional(),
  diasUteisPeriodo: z.coerce.number().min(1, "Deve haver pelo menos 1 dia útil.").optional(),
  registrosFaltas: z.array(absenceRecordSchema).optional(),

  // Campos para Turnover
  colaboradoresInicioPeriodo: z.coerce.number().min(0, "O valor não  pode ser negativo.").optional(),
  colaboradoresFimPeriodo: z.coerce.number().min(0, "O valor não pode ser negativo.").optional(),
  demissoesVoluntarias: z.coerce.number().min(0, "O valor não pode ser negativo.").optional(),
});

type ExternalDataFormValues = z.infer<typeof externalDataSchema>;

interface ExternalDataFormProps {
  surveyId: string;
  // No futuro, você pode passar os dados iniciais para preencher o formulário
  // initialData?: Partial<ExternalDataFormValues>;
}

export const ExternalDataForm = ({ surveyId }: ExternalDataFormProps) => {
  const form = useForm<any>({
    resolver: zodResolver(externalDataSchema),
    // Em um aplicativo real, você buscaria e definiria os valores padrão aqui
    defaultValues: {
      totalColaboradores: undefined,
      diasUteisPeriodo: undefined,
      registrosFaltas: [],
      colaboradoresInicioPeriodo: undefined,
      colaboradoresFimPeriodo: undefined,
      demissoesVoluntarias: undefined,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "registrosFaltas",
  });

  // --- Cálculos em tempo real para feedback ao usuário ---
  const watchedValues = form.watch();

  const totalDiasFalta = useMemo(() => {
    return watchedValues.registrosFaltas?.reduce((sum: number, current: any) => sum + (current.dias || 0), 0) || 0;
  }, [watchedValues.registrosFaltas]);

  const absenteismoCalculado = useMemo(() => {
    if (watchedValues.totalColaboradores && watchedValues.diasUteisPeriodo && totalDiasFalta > 0) {
      const taxa = (totalDiasFalta / (watchedValues.totalColaboradores * watchedValues.diasUteisPeriodo)) * 100;
      return taxa.toFixed(2) + '%';
    }
    return null;
  }, [watchedValues.totalColaboradores, watchedValues.diasUteisPeriodo, totalDiasFalta]);

  const turnoverCalculado = useMemo(() => {
    if (watchedValues.colaboradoresInicioPeriodo !== undefined && watchedValues.colaboradoresFimPeriodo !== undefined && watchedValues.demissoesVoluntarias !== undefined) {
      const mediaColaboradores = (watchedValues.colaboradoresInicioPeriodo + watchedValues.colaboradoresFimPeriodo) / 2;
      if (mediaColaboradores > 0) {
        const taxa = (watchedValues.demissoesVoluntarias / mediaColaboradores) * 100;
        return taxa.toFixed(2) + '%';
      }
    }
    return null;
  }, [watchedValues.colaboradoresInicioPeriodo, watchedValues.colaboradoresFimPeriodo, watchedValues.demissoesVoluntarias]);
  // --- Fim dos cálculos em tempo real ---

  const onSubmit = (data: ExternalDataFormValues) => {
    const finalTotalDiasFalta = data.registrosFaltas?.reduce((sum, current) => sum + (current.dias || 0), 0) || 0;

    let absenteismoTaxa: number | undefined;
    if (data.totalColaboradores && data.diasUteisPeriodo && finalTotalDiasFalta > 0) {
      absenteismoTaxa = (finalTotalDiasFalta / (data.totalColaboradores * data.diasUteisPeriodo)) * 100;
    }

    let turnoverTaxa: number | undefined;
    if (data.colaboradoresInicioPeriodo && data.colaboradoresFimPeriodo && data.demissoesVoluntarias !== undefined) {
      const mediaColaboradores = (data.colaboradoresInicioPeriodo + data.colaboradoresFimPeriodo) / 2;
      if (mediaColaboradores > 0) {
        turnoverTaxa = (data.demissoesVoluntarias / mediaColaboradores) * 100;
      }
    }

    console.log("Salvando dados externos para a pesquisa:", surveyId, {
      rawData: data,
      absenteismo: absenteismoTaxa?.toFixed(2),
      turnover: turnoverTaxa?.toFixed(2),
    });
    // Aqui você chamaria sua API para salvar os dados brutos (data) ou calculados
    toast.success("Dados externos salvos com sucesso!");
  };

  return (
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="bg-slate-50/70 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Cálculo de Absenteísmo</CardTitle>
            <CardDescription>
              Fórmula: (Total de dias de falta / (Nº de colaboradores × Dias úteis)) × 100.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalColaboradores">Nº de Colaboradores no Período</Label>
                <Input id="totalColaboradores" type="number" {...form.register("totalColaboradores")} placeholder="Ex: 50" />
                <p className="text-xs text-muted-foreground">Quantos funcionários ativos a empresa ou setor tinha no período.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="diasUteisPeriodo">Dias Úteis no Período</Label>
                <Input id="diasUteisPeriodo" type="number" {...form.register("diasUteisPeriodo")} placeholder="Ex: 22" />
                <p className="text-xs text-muted-foreground">Quantos dias de trabalho existiram no mês ou período analisado.</p>
              </div>
            </div>
            
            <div>
              <Label>Registros de Faltas e Afastamentos</Label>
              <div className="p-3 mt-2 border rounded-md bg-white space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      step="0.5"
                      {...form.register(`registrosFaltas.${index}.dias`)} 
                      placeholder="Dias de falta (Ex: 1.5)"
                      className="flex-grow"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => append({ dias: 1 })}>
                  <PlusCircle className="w-4 h-4 mr-2" /> Adicionar Registro de Falta
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Some todas as ausências (faltas, licenças, etc.) dos colaboradores no período. Ex: um funcionário faltou 2 dias, outro 3. Adicione um registro com "2" e outro com "3".</p>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-100/80 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <TrendingUp className="w-5 h-5 text-blue-600"/>
              {absenteismoCalculado ? (
                <p>Taxa de Absenteísmo Calculada: <span className="text-blue-600 font-bold text-base">{absenteismoCalculado}</span></p>
              ) : (
                <p className="text-muted-foreground">Preencha os campos para ver a taxa.</p>
              )}
            </div>
          </CardFooter>
        </Card>

        <Card className="bg-slate-50/70 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Cálculo de Turnover Voluntário</CardTitle>
            <CardDescription>
              Fórmula: (Nº de demissões voluntárias / Média de colaboradores) × 100.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="colaboradoresInicioPeriodo">Colaboradores no Início</Label>
              <Input id="colaboradoresInicioPeriodo" type="number" {...form.register("colaboradoresInicioPeriodo")} placeholder="Ex: 100" />
              <p className="text-xs text-muted-foreground">Quantos funcionários no 1º dia do período.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="colaboradoresFimPeriodo">Colaboradores no Fim</Label>
              <Input id="colaboradoresFimPeriodo" type="number" {...form.register("colaboradoresFimPeriodo")} placeholder="Ex: 105" />
              <p className="text-xs text-muted-foreground">Quantos funcionários no último dia do período.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="demissoesVoluntarias">Demissões Voluntárias</Label>
              <Input id="demissoesVoluntarias" type="number" {...form.register("demissoesVoluntarias")} placeholder="Ex: 2" />
              <p className="text-xs text-muted-foreground">Quantos funcionários pediram para sair no período.</p>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-100/80 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <TrendingUp className="w-5 h-5 text-pink-600"/>
              {turnoverCalculado ? (
                <p>Taxa de Turnover Calculada: <span className="text-pink-600 font-bold text-base">{turnoverCalculado}</span></p>
              ) : (
                <p className="text-muted-foreground">Preencha os campos para ver a taxa.</p>
              )}
            </div>
          </CardFooter>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Salvando..." : "Salvar Indicadores"}
          </Button>
        </div>
      </form>
  );
};