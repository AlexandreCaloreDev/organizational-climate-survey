"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  FileText,
  Printer,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricHelpPopover } from "@/components/relatorio/MetricHelpPopover";
import { useAuth } from "@/context/AuthContext";
import { pesquisaService } from "@/lib/services/pesquisaService";
import { respostaService } from "@/lib/services/respostaService";
import { dashboardService } from "@/lib/services/dashboardService";
import { setorService } from "@/lib/services/setorService";
import { cicloService } from "@/lib/services/cicloService";
import {
  buildResultsFromPerguntas,
  distToPercent,
  tipoExibeMedia,
} from "@/lib/buildSurveyResults";
import {
  buildContextoEmpresaSetores,
  estimarRespondentesUnicos,
  formatTipoLabel,
  isEscolhaUnica,
  isMultiplaEscolha,
  isTextoAberto,
  analisarTextosAbertos,
  buildConclusaoEscolha,
  getClassificacaoRisco,
  pctEscala,
  buildPlanosIntervencao,
  agruparEixosNR17,
  calcularKpis,
  calcularDeltasHistoricos,
  calcularMediaGeralFromResults,
  identificarDimensaoDaPergunta,
  type EixoNR17,
} from "@/lib/relatorioAnalytics";
import {
  ResultsDataTable,
  type SurveyResult,
} from "@/components/dashboard/ResultsDataTable";

const pieConfig = { valor: { label: "Respostas" } } satisfies ChartConfig;
const barConfig = { media: { label: "Média", color: "#2B7FFF" } } satisfies ChartConfig;

function DeltaBadge({ delta, inverso }: { delta: number | null; inverso?: boolean }) {
  if (delta == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
        <Minus className="h-3 w-3" /> 1ª Medição
      </span>
    );
  }
  const positivo = inverso ? delta < 0 : delta > 0;
  const negativo = inverso ? delta > 0 : delta < 0;
  if (positivo) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        <TrendingUp className="h-3 w-3" /> +{Math.abs(delta)}%
      </span>
    );
  }
  if (negativo) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        <TrendingDown className="h-3 w-3" /> -{Math.abs(delta)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
      <Minus className="h-3 w-3" /> 0%
    </span>
  );
}

function EscolhaVisual({
  item,
  respondentes,
}: {
  item: SurveyResult;
  respondentes: number;
}) {
  const dist = item.distribuicao || {};
  const itens = distToPercent(dist);
  const unica = isEscolhaUnica(item.tipo_pergunta);
  const denom = unica
    ? itens.reduce((s, i) => s + i.qtd, 0)
    : respondentes || itens.reduce((s, i) => s + i.qtd, 0);
  const cores = ["#579BFF", "#2B7FFF", "#0A4DB2", "#155dfc"];
  const chartData = itens.map((d, i) => ({
    nome: d.opcao.length > 20 ? `${d.opcao.slice(0, 20)}…` : d.opcao,
    valor: d.qtd,
    pct: denom ? Math.round((d.qtd / denom) * 100) : 0,
    fill: cores[i % cores.length],
  }));

  return (
    <div className="grid md:grid-cols-2 gap-4 break-inside-avoid page-break-inside-avoid">
      {chartData.length ? (
        <ChartContainer config={pieConfig} className="h-[220px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie data={chartData} dataKey="valor" nameKey="nome" innerRadius={45} />
          </PieChart>
        </ChartContainer>
      ) : (
        <p className="text-sm text-muted-foreground">Sem dados para esta dimensão.</p>
      )}
      <div className="space-y-3 text-sm">
        {chartData.map((d) => (
          <div key={d.nome} className="space-y-1">
            <div className="flex justify-between font-medium">
              <span>{d.nome}</span>
              <span>{d.pct}% ({d.valor})</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-[#155dfc]" style={{ width: `${d.pct}%` }} />
            </div>
          </div>
        ))}
        <p className="text-[#155dfc] font-medium pt-2 border-t">
          {buildConclusaoEscolha(dist, item.tipo_pergunta, respondentes)}
        </p>
      </div>
    </div>
  );
}

function TextoAbertoVisual({ item }: { item: SurveyResult }) {
  const { topRespostas, topPalavras } = analisarTextosAbertos(item.distribuicao || {});
  return (
    <div className="space-y-4 text-sm break-inside-avoid">
      {topPalavras.length > 0 && (
        <div>
          <p className="font-medium mb-2">Termos mais frequentes</p>
          <div className="flex flex-wrap gap-2">
            {topPalavras.map((t) => (
              <Badge key={t.palavra} variant="secondary">
                {t.palavra} ({t.freq})
              </Badge>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="font-medium mb-2">Respostas mais frequentes / similares</p>
        {topRespostas.length ? (
          <ul className="space-y-2 max-h-56 overflow-y-auto">
            {topRespostas.map((r) => (
              <li key={r.texto} className="rounded border p-2 bg-muted/30">
                <span className="text-muted-foreground">({r.qtd}x)</span> {r.texto}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Sem dados para esta dimensão.</p>
        )}
      </div>
    </div>
  );
}

function EscalaVisual({ item }: { item: SurveyResult }) {
  const data = Object.entries(item.distribuicao || {})
    .map(([nota, qtd]) => ({ nota, qtd: Number(qtd) }))
    .sort((a, b) => Number(a.nota) - Number(b.nota));
  if (!data.length) return <p className="text-sm text-muted-foreground">Sem dados para esta dimensão.</p>;
  return (
    <div className="space-y-2 break-inside-avoid">
      <p className="text-lg font-semibold text-[#155dfc]">
        Média: {item.media != null ? Number(item.media).toFixed(1) : "—"} / 10
        {item.media != null && ` (${pctEscala(item.media)}%)`}
      </p>
      <ChartContainer config={barConfig} className="h-[200px] w-full">
        <BarChart data={data}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="nota" />
          <YAxis allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="qtd" fill="#2B7FFF" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

function HeatmapCell({ pct }: { pct: number | null }) {
  if (pct == null || pct === 0) return <TableCell className="text-center text-muted-foreground">—</TableCell>;
  const bg =
    pct < 50
      ? "bg-red-500/20 text-red-700 font-semibold"
      : pct <= 70
        ? "bg-amber-500/20 text-amber-700 font-semibold"
        : "bg-emerald-500/20 text-emerald-700 font-semibold";
  return <TableCell className={`text-center ${bg}`}>{pct}%</TableCell>;
}



const RelatorioPage = () => {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;
  const { user } = useAuth();

  const [survey, setSurvey] = useState<any>(null);
  const [setoresCadastro, setSetoresCadastro] = useState<{ id_setor: number; nome_setor: string }[]>([]);
  const [tableResults, setTableResults] = useState<SurveyResult[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [eixosNR17, setEixosNR17] = useState<EixoNR17[]>([]);
  const [eixosPorSetor, setEixosPorSetor] = useState<{ setor: string; eixos: EixoNR17[] }[]>([]);
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [pesquisas, setPesquisas] = useState<any[]>([]);
  const [cicloSelecionado, setCicloSelecionado] = useState<string>("todos");

  useEffect(() => {
    const load = async () => {
      if (!surveyId) return;
      setPageLoading(true);
      const pid = Number(surveyId);
      try {
        const pesquisa = await pesquisaService.getById(pid);
        setSurvey(pesquisa);

        let setoresLocal: { id_setor: number; nome_setor: string }[] = [];
        if (pesquisa?.id_empresa) {
          try {
            const [setoresResponse, ciclosResponse, pesquisasResponse] = await Promise.all([
              setorService.listByEmpresa(pesquisa.id_empresa),
              cicloService.listByEmpresa(pesquisa.id_empresa),
              pesquisaService.listByEmpresa(pesquisa.id_empresa)
            ]);
            setoresLocal = setoresResponse;
            setSetoresCadastro(setoresLocal);
            setCiclos(ciclosResponse || []);
            setPesquisas(pesquisasResponse || []);

            if (pesquisa.id_ciclo) {
              setCicloSelecionado(pesquisa.id_ciclo.toString());
            } else {
              setCicloSelecionado("todos");
            }
          } catch (e) {
            console.error("Erro ao carregar filtros auxiliares", e);
          }
        }

        const perguntas = (await pesquisaService.listPerguntas(pid)) || [];
        let stats: Record<string, Record<string, number>> = {};
        let dadosProc: Record<string, any> = {};
        const dashboard = await dashboardService.getByPesquisa(pid);
        if (dashboard?.id_dashboard) {
          const dData = await dashboardService.getData(dashboard.id_dashboard);
          dadosProc = (dData as any)?.dados_processados || {};
          Object.entries(dadosProc).forEach(([k, v]: [string, any]) => {
            stats[k.replace("pergunta_", "")] = v?.distribuicao || v?.dados || {};
          });
        }
        if (Object.keys(stats).length === 0) {
          const raw = (await respostaService.getStatsByPesquisa(pid)) as Record<string, Record<string, number>>;
          Object.entries(raw || {}).forEach(([qId, d]) => { stats[qId] = d || {}; });
        }
        const results = buildResultsFromPerguntas(perguntas, stats, dadosProc);
        setTableResults(results);

        const eixos = agruparEixosNR17(results);
        setEixosNR17(eixos);

        const ctx = buildContextoEmpresaSetores(
          setoresLocal,
          pesquisa?.setor?.nome_setor
        );

        const setorAtualNome = ctx.setoresList[0] || pesquisa?.setor?.nome_setor || "Setor Atual";
        setEixosPorSetor([{ setor: setorAtualNome, eixos }]);
      } catch (e) {
        console.error(e);
        setTableResults([]);
      }
      setPageLoading(false);
    };
    load();
  }, [surveyId]);

  const contexto = useMemo(
    () => buildContextoEmpresaSetores(setoresCadastro, survey?.setor?.nome_setor),
    [setoresCadastro, survey]
  );

  const pessoasResponderam = useMemo(() => estimarRespondentesUnicos(tableResults), [tableResults]);

  const escalas = useMemo(
    () => tableResults.filter((r) => r.tipo_pergunta === "EscalaNumerica"),
    [tableResults]
  );

  const mediaGeral = useMemo(() => calcularMediaGeralFromResults(tableResults), [tableResults]);

  const mediaGeralPct = mediaGeral != null ? pctEscala(mediaGeral) : null;

  const taxaParticipacao = useMemo(() => {
    const alvo = Number(survey?.participantes) || 0;
    if (!alvo) return null;
    return Math.min(100, Math.round((pessoasResponderam / alvo) * 100));
  }, [survey, pessoasResponderam]);



  const kpis = useMemo(
    () => calcularKpis(mediaGeral, mediaGeralPct, taxaParticipacao),
    [mediaGeral, mediaGeralPct, taxaParticipacao]
  );

  const deltas = useMemo(
    () => calcularDeltasHistoricos(kpis, null),
    [kpis]
  );

  const planos = useMemo(
    () => buildPlanosIntervencao(tableResults, contexto.empresaAvaliada),
    [tableResults, contexto.empresaAvaliada]
  );

  const chartDataEscala = useMemo(
    () =>
      escalas.map((m, i) => ({
        label: (m.texto_pergunta || `Q${i + 1}`).slice(0, 18),
        media: m.media ? Number(Number(m.media).toFixed(1)) : 0,
      })),
    [escalas]
  );

  const radarData = useMemo(
    () =>
      eixosNR17.map((e) => ({
        eixo: e.nome.length > 12 ? e.nome.split(" ").slice(0, 2).join(" ") : e.nome,
        eixoFull: e.nome,
        pct: e.total > 0 ? e.pct : 0,
      })),
    [eixosNR17]
  );

  const proximaAvaliacao = useMemo(() => {
    const base = survey?.data_fechamento || survey?.data_criacao;
    if (!base) return null;
    const d = new Date(base);
    d.setMonth(d.getMonth() + 6);
    return d.toLocaleDateString("pt-BR");
  }, [survey]);



  if (pageLoading) {
    return (
      <section className="container mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </section>
    );
  }

  if (!tableResults.length) {
    return (
      <section className="container mx-auto px-4 py-10 print:p-12 print:bg-white">
        <Card><CardContent className="pt-6">Sem dados para esta pesquisa.</CardContent></Card>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-10 bg-gray-50/50 print:p-12 print:bg-white">
      <header className="mb-6 print:hidden flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold">{survey?.titulo}</h1>
          <p className="text-sm text-muted-foreground">
            Análise Ergonômica Preliminar — Avaliação Cognitiva — NR17
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 w-full md:w-auto">
          <div className="w-full sm:w-[200px]">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Ciclo de Avaliação</label>
            <select 
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={cicloSelecionado}
              onChange={(e) => {
                const val = e.target.value;
                setCicloSelecionado(val);
                if (val === "todos") {
                  router.push("/resultados?ciclo=todos&setor=todos");
                } else {
                  router.push(`/resultados?ciclo=${val}&setor=todos`);
                }
              }}
            >
              <option value="todos">Todos os Períodos</option>
              {ciclos.map((c) => (
                <option key={c.id_ciclo} value={c.id_ciclo.toString()}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-[220px]">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Pesquisa / Setor</label>
            <select 
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={surveyId}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "todos") {
                  router.push(`/resultados?ciclo=${cicloSelecionado}&setor=todos`);
                } else {
                  router.push(`/relatorios/${val}`);
                }
              }}
            >
              <option value="todos">Todas as Pesquisas</option>
              {pesquisas
                .filter((p) => cicloSelecionado === "todos" || p.id_ciclo === Number(cicloSelecionado))
                .map((p) => (
                  <option key={p.id_pesquisa} value={p.id_pesquisa.toString()}>
                    {p.titulo} - Setor: {p.setor?.nome_setor || "Geral"}
                  </option>
                ))}
            </select>
          </div>

          <Button onClick={() => window.print()} className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 h-10 px-4 sm:w-auto w-full">
            <Printer className="h-4 w-4" /> Exportar Laudo Técnico (PDF)
          </Button>
        </div>
      </header>

      <Card className="mb-6 border-2 break-inside-avoid page-break-inside-avoid">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle>Ficha Técnica Normativa</CardTitle>
          <CardDescription>NR17 — Avaliação Cognitiva e Psicossocial</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground block">Empresa Avaliada</span>
            <strong>{contexto.empresaAvaliada || survey?.titulo || "—"}</strong>
          </div>
          <div>
            <span className="text-muted-foreground block">Data da Avaliação</span>
            <strong>{new Date().toLocaleDateString("pt-BR")}</strong>
          </div>
          <div>
            <span className="text-muted-foreground block">População Alvo</span>
            <strong>{survey?.participantes ?? "—"}</strong>
          </div>
          <div>
            <span className="text-muted-foreground block">Pessoas que Responderam</span>
            <strong>{pessoasResponderam}</strong>
            <MetricHelpPopover title="Pessoas que responderam">
              <p>Estimativa com base no maior número de respostas obtido em uma única pergunta.</p>
            </MetricHelpPopover>
          </div>
          <div>
            <span className="text-muted-foreground block">Próxima Avaliação Sugerida</span>
            <strong>{proximaAvaliacao || "—"}</strong>
          </div>
          <div>
            <span className="text-muted-foreground block">Pontuação Geral</span>
            <strong className="text-[#155dfc]">{mediaGeralPct != null ? `${mediaGeralPct}%` : "—"}</strong>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <span className="text-muted-foreground block mb-2">Setores Avaliados</span>
            {contexto.setoresList.length ? (
              <div className="flex flex-wrap gap-2">
                {contexto.setoresList.map((s) => (
                  <Badge key={s} variant="secondary" className="text-sm">{s}</Badge>
                ))}
              </div>
            ) : (
              <span>Sem dados para esta dimensão</span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 break-inside-avoid">
        {([
          {
            label: "Satisfação Geral",
            val: kpis.satisfacao,
            delta: deltas.satisfacao,
            inverso: false,
            tip: (
              <>
                <p>Calculado com base na média das respostas de escala (0 a 10), convertida proporcionalmente em porcentagem.</p>
                {mediaGeral != null && <p className="font-medium text-foreground">Média bruta: {mediaGeral.toFixed(1)}/10</p>}
              </>
            ),
          },
          {
            label: "Chance de Rotatividade",
            val: kpis.turnover,
            delta: deltas.turnover,
            inverso: true,
            tip: <p>Indicador de risco: estima a probabilidade de desligamento voluntário de colaboradores. Quanto menor a satisfação geral, maior a tendência de rotatividade.</p>,
          },
          {
            label: "Presença (Absenteísmo est.)",
            val: kpis.presenca,
            delta: deltas.presenca,
            inverso: false,
            tip: <p>Estimativa de presença habitual e assiduidade dos colaboradores, calculada a partir dos níveis médios de satisfação e engajamento registrados.</p>,
          },
          {
            label: "Produtividade Esperada",
            val: kpis.produtividade,
            delta: deltas.produtividade,
            inverso: false,
            tip: <p>Desempenho projetado a partir da relação direta entre a satisfação média dos colaboradores e o nível de participação na pesquisa.</p>,
          },
        ] as const).map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-6 text-center space-y-2">
              <p className="text-2xl font-bold text-[#155dfc]">{k.val != null ? `${k.val}%` : "—"}</p>
              <DeltaBadge delta={k.delta} inverso={k.inverso} />
              <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center">
                {k.label}
                <MetricHelpPopover title={k.label}>{k.tip}</MetricHelpPopover>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-6 break-inside-avoid page-break-inside-avoid">
        <CardHeader>
          <CardTitle className="flex items-center">
            Indicadores NR17 — 7 Eixos Psicossociais
            <MetricHelpPopover title="Eixos NR17">
              <p>Indicadores divididos pelos eixos psicossociais da norma regulamentadora NR-17, avaliando o conforto, segurança e desempenho eficiente no ambiente de trabalho.</p>
            </MetricHelpPopover>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {eixosNR17.map((e) => (
                <div key={e.nome} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{e.nome}</span>
                    <span className="flex items-center gap-2">
                      {e.total > 0 ? `${e.pct}%` : "—"}
                      <Badge className={`text-[10px] ${e.classificacao.cls}`}>
                        {e.total > 0 ? e.classificacao.status : "Sem dados"}
                      </Badge>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        e.pct < 50 ? "bg-red-500" : e.pct <= 70 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: e.total > 0 ? `${e.pct}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {radarData.some((r) => r.pct > 0) && (
              <div className="w-full min-h-[320px] print:min-h-[350px]">
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={radarData} outerRadius="80%">
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis
                      dataKey="eixo"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                    />
                    <PolarRadiusAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 9, fill: "#94a3b8" }}
                      axisLine={false}
                      tickCount={5}
                    />
                    <Radar
                      dataKey="pct"
                      fill="#2B7FFF"
                      fillOpacity={0.25}
                      stroke="#2B7FFF"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#2B7FFF", strokeWidth: 0 }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {eixosPorSetor.length > 1 && (
        <Card className="mb-6 break-inside-avoid page-break-inside-avoid">
          <CardHeader>
            <CardTitle>Matriz de Risco / Mapa de Calor — Setores × Eixos NR17</CardTitle>
            <CardDescription>Cruzamento de departamentos com os 7 eixos psicossociais</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Setor</TableHead>
                  {eixosNR17.map((e) => (
                    <TableHead key={e.nome} className="text-center text-xs min-w-[90px]">
                      {e.nome.split(" ").slice(0, 2).join(" ")}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {eixosPorSetor.map((row) => (
                  <TableRow key={row.setor}>
                    <TableCell className="font-medium">{row.setor}</TableCell>
                    {row.eixos.map((e) => (
                      <HeatmapCell key={e.nome} pct={e.total > 0 ? e.pct : null} />
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6 break-inside-avoid page-break-inside-avoid">
        <CardHeader>
          <CardTitle className="flex items-center">
            Matriz de Risco Psicossocial — Por Pergunta
            <MetricHelpPopover title="Matriz de Risco">
              <p>Scores abaixo de 50% (nota &lt;5) = intervenção imediata. Entre 50–70% = alerta.</p>
            </MetricHelpPopover>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dimensão</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Eixo NR17</TableHead>
                <TableHead className="text-right">Média %</TableHead>
                <TableHead className="text-right">Respostas</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableResults.map((item) => {
                const pct = pctEscala(item.media);
                const { status, cls } = getClassificacaoRisco(pct);
                const dimensao = identificarDimensaoDaPergunta(
                  item.texto_pergunta || "",
                  (item as any).dimensao_nr17
                );
                return (
                  <TableRow key={item.id + item.tipo_pergunta}>
                    <TableCell className="font-medium max-w-[180px]">{item.texto_pergunta || "—"}</TableCell>
                    <TableCell>{formatTipoLabel(item.tipo_pergunta)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{dimensao}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{pct != null ? `${pct}%` : "—"}</TableCell>
                    <TableCell className="text-right">{item.total_respostas ?? 0}</TableCell>
                    <TableCell><Badge className={cls}>{status}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mb-6 break-inside-avoid page-break-inside-avoid">
        <CardHeader>
          <CardTitle className="flex items-center">
            Planos de Ação 5W2H
            <MetricHelpPopover title="Planos de Ação">
              <p>Gerados a partir das dimensões em alerta/crítico ou, na ausência de match textual, das piores médias de escala.</p>
            </MetricHelpPopover>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {planos.length ? planos.map((p) => (
            <Card key={p.dimensao} className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{p.dimensao}</CardTitle>
                <Badge className={getClassificacaoRisco(p.pct).cls}>{p.status} — {p.pct}%</Badge>
              </CardHeader>
              <CardContent className="text-sm grid md:grid-cols-2 gap-2">
                <p><b>Risco:</b> {p.risco}</p>
                <p><b>O quê:</b> {p.oQue}</p>
                <p><b>Por quê:</b> {p.porQue}</p>
                <p><b>Onde:</b> {p.onde}</p>
                <p><b>Quando:</b> {p.quando}</p>
                <p><b>Quem:</b> {p.quem}</p>
                <p><b>Como:</b> {p.como}</p>
                <p><b>Quanto:</b> {p.quanto}</p>
              </CardContent>
            </Card>
          )) : (
            <p className="text-muted-foreground">Sem dados para gerar planos de ação.</p>
          )}

          <Card className="border border-dashed border-muted-foreground/30 bg-muted/10">
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              <p className="font-medium mb-1">Histórico de Intervenções</p>
              <p>A gestão de ações e intervenções é realizada de forma externa pela equipe responsável. Histórico de banco de dados desativado.</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <div className="mb-6 break-inside-avoid page-break-inside-avoid">
        <ResultsDataTable data={tableResults.map((r) => ({ ...r, category: formatTipoLabel(r.tipo_pergunta) }))} />
      </div>

      {chartDataEscala.length > 0 && (
        <Card className="mb-6 break-inside-avoid page-break-inside-avoid">
          <CardHeader>
            <CardTitle>Desempenho — Perguntas de Escala Numérica</CardTitle>
            <CardDescription>Média por pergunta (somente Escala Numérica)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barConfig} className="h-[280px] w-full">
              <BarChart data={chartDataEscala}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="media" fill="#2B7FFF" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}



      <div className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" /> Detalhamento por Pergunta
        </h2>
        {tableResults.map((item) => {
          const dimensao = identificarDimensaoDaPergunta(
            item.texto_pergunta || "",
            (item as any).dimensao_nr17
          );
          return (
            <Card key={item.id} className="break-inside-avoid page-break-inside-avoid">
              <CardHeader>
                <CardTitle className="text-base">{item.texto_pergunta}</CardTitle>
                <CardDescription className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{formatTipoLabel(item.tipo_pergunta)}</Badge>
                  <Badge variant="outline" className="text-[10px]">{dimensao}</Badge>
                  <span>{item.total_respostas} marcação(ões) nesta pergunta</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tipoExibeMedia(item.tipo_pergunta) && <EscalaVisual item={item} />}
                {(isEscolhaUnica(item.tipo_pergunta) || isMultiplaEscolha(item.tipo_pergunta)) && (
                  <EscolhaVisual item={item} respondentes={pessoasResponderam} />
                )}
                {isTextoAberto(item.tipo_pergunta) && <TextoAbertoVisual item={item} />}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="break-inside-avoid border-t-4 border-t-[#155dfc]">
        <CardHeader>
          <CardTitle>Conclusão do Relatório</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-4">
          <p>
            A presente Análise Ergonômica Preliminar (AEP), conforme a NR17, avaliou os fatores
            psicossociais e cognitivos da organização <strong>{contexto.empresaAvaliada || survey?.titulo || "—"}</strong>,
            obtendo uma pontuação geral de <strong className="text-[#155dfc]">{mediaGeralPct != null ? `${mediaGeralPct}%` : "—"}</strong>.
            {mediaGeralPct != null && mediaGeralPct < 50 &&
              " O resultado indica necessidade de intervenção imediata nos eixos críticos identificados."}
            {mediaGeralPct != null && mediaGeralPct >= 50 && mediaGeralPct <= 70 &&
              " O resultado indica pontos de atenção que merecem acompanhamento e ações corretivas programadas."}
            {mediaGeralPct != null && mediaGeralPct > 70 &&
              " O resultado demonstra um ambiente organizacional dentro dos parâmetros de controle, recomendando-se manutenção das práticas atuais."}
          </p>
          <p>
            Recomenda-se reavaliação em <strong>{proximaAvaliacao || "6 meses"}</strong> (periodicidade semestral conforme NR17),
            para acompanhamento da evolução dos indicadores e efetividade das ações implementadas.
          </p>
          <div className="border-t pt-6 mt-6 flex flex-col sm:flex-row justify-between">
            <div className="space-y-3">
              <p className="font-semibold text-foreground text-base">{user?.nome || "Responsável Técnico"}</p>
              <div className="w-64 border-b border-dotted border-muted-foreground/50 mt-6 mb-1" />
              <p className="text-xs text-muted-foreground">Assinatura</p>
            </div>
            <div className="text-right mt-4 sm:mt-0 text-muted-foreground">
              <p className="font-medium text-foreground">Data de Emissão</p>
              <p>{new Date().toLocaleDateString("pt-BR")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default RelatorioPage;
