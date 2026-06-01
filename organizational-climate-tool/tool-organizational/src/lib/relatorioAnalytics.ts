import type { SurveyResult } from "@/components/dashboard/ResultsDataTable";
import { distToPercent, tipoExibeMedia } from "@/lib/buildSurveyResults";

export function formatTipoLabel(tipo?: string): string {
  if (!tipo) return "Geral";
  const map: Record<string, string> = {
    MultiplaEscolha: "Múltipla Escolha",
    EscalaNumerica: "Escala Numérica",
    RespostaAberta: "Resposta Aberta",
    TextoLivre: "Texto Livre",
    SimNao: "Escolha Única",
  };
  return map[tipo] || tipo.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function isEscolhaUnica(tipo?: string) {
  return tipo === "SimNao";
}

export function isMultiplaEscolha(tipo?: string) {
  return tipo === "MultiplaEscolha";
}

export function isTextoAberto(tipo?: string) {
  return tipo === "RespostaAberta" || tipo === "TextoLivre";
}

function sanitizeEmpresaNome(nome: string): string | null {
  const trimmed = nome.trim();
  if (!trimmed) return null;
  if (/^teste$/i.test(trimmed)) return null;
  return trimmed;
}

export function parseSetorNome(nome: string): { empresa: string | null; setor: string } {
  const parts = nome.split(/\s*[-–—]\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { empresa: sanitizeEmpresaNome(parts[0]), setor: parts.slice(1).join(" - ") };
  }
  return { empresa: null, setor: nome.trim() || "—" };
}

export function buildContextoEmpresaSetores(
  setoresCadastro: { nome_setor: string }[],
  surveySetorNome?: string
) {
  const nomes = setoresCadastro.map((s) => s.nome_setor);
  if (surveySetorNome && !nomes.includes(surveySetorNome)) nomes.unshift(surveySetorNome);

  const parsed = nomes.map(parseSetorNome);
  const empresas = parsed.map((p) => p.empresa).filter(Boolean) as string[];
  const empresaAvaliada = empresas[0] || (surveySetorNome ? parseSetorNome(surveySetorNome).empresa : null);
  const setoresList = [...new Set(parsed.map((p) => p.setor).filter(Boolean))];

  return {
    empresaAvaliada: empresaAvaliada || null,
    setoresList,
  };
}

export function estimarRespondentesUnicos(results: SurveyResult[]): number {
  if (!results.length) return 0;
  return results.reduce((max, r) => Math.max(max, Number(r.total_respostas) || 0), 0);
}

const STOP_PT = new Set([
  "a","o","e","de","da","do","das","dos","em","no","na","nos","nas","um","uma","uns","umas",
  "para","por","com","sem","ao","à","os","as","que","se","ou","mas","como","mais","muito",
  "já","é","ser","foi","são","the","and","to","of","in",
]);

function normalizeText(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function analisarTextosAbertos(dist: Record<string, number>, topN = 10) {
  const grupos = new Map<string, { texto: string; qtd: number }>();
  Object.entries(dist).forEach(([texto, qtd]) => {
    const norm = normalizeText(texto);
    const chave = norm.slice(0, 40) || "(vazio)";
    const prev = grupos.get(chave);
    grupos.set(chave, {
      texto: prev?.texto || texto || "(vazio)",
      qtd: (prev?.qtd || 0) + Number(qtd),
    });
  });

  const topRespostas = [...grupos.values()].sort((a, b) => b.qtd - a.qtd).slice(0, topN);

  const palavras = new Map<string, number>();
  Object.keys(dist).forEach((texto) => {
    const reps = Number(dist[texto]) || 1;
    normalizeText(texto)
      .split(" ")
      .filter((w) => w.length > 2 && !STOP_PT.has(w))
      .forEach((w) => palavras.set(w, (palavras.get(w) || 0) + reps));
  });
  const topPalavras = [...palavras.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([palavra, freq]) => ({ palavra, freq }));

  return { topRespostas, topPalavras };
}

export function buildConclusaoEscolha(
  dist: Record<string, number>,
  tipo?: string,
  respondentes = 0
) {
  const itens = distToPercent(dist);
  if (!itens.length) return "Sem dados para esta dimensão.";

  const unica = isEscolhaUnica(tipo);
  const denom = unica
    ? itens.reduce((s, i) => s + i.qtd, 0)
    : respondentes || itens.reduce((s, i) => s + i.qtd, 0);

  const ranked = itens.map((i) => ({
    ...i,
    pct: denom ? Math.round((i.qtd / denom) * 100) : 0,
  }));

  const maxPct = ranked[0]?.pct ?? 0;
  const empatados = ranked.filter((r) => r.pct === maxPct && maxPct > 0);

  if (empatados.length > 1) {
    const nomes = empatados.map((e) => e.opcao).join(" e ");
    return `Empate técnico: ${nomes} dividiram a preferência dos colaboradores com ${maxPct}% cada. Recomenda-se aprofundar com entrevistas ou nova rodada de escuta.`;
  }

  const v = ranked[0];
  const tipoLabel = unica ? "Escolha única" : "Múltipla escolha";
  return `${tipoLabel}: a opção mais votada foi "${v.opcao}" com ${v.pct}% (${v.qtd} marcação(ões))${ranked[1] ? `, seguida de "${ranked[1].opcao}" com ${ranked[1].pct}%` : ""}.`;
}

export function pctEscala(media?: number | null) {
  if (media == null) return null;
  return Math.round((Number(media) / 10) * 100);
}

export function getClassificacaoRisco(pct: number | null) {
  if (pct == null) return { status: "Sem dados", cls: "bg-gray-400 text-white" };
  if (pct < 50) return { status: "Crítico / Alto Risco", cls: "bg-red-500 text-white" };
  if (pct <= 70) return { status: "Médio / Alerta", cls: "bg-amber-500 text-white" };
  return { status: "Bom / Controlado", cls: "bg-emerald-500 text-white" };
}

export function matchPlanoTema(label: string): { risco: string; tema: string } | null {
  const t = label.toLowerCase();
  if (t.includes("autonomia") || t.includes("controle"))
    return {
      tema: "Autonomia e Controle",
      risco: "Restrição da criatividade, engessamento operacional e perda de engajamento.",
    };
  if (t.includes("chefia") || t.includes("liderança"))
    return {
      tema: "Apoio da Chefia",
      risco: "Falta de suporte emocional e insegurança nas relações hierárquicas.",
    };
  if (t.includes("papéis") || t.includes("papeis") || t.includes("responsabilidades"))
    return {
      tema: "Clareza de Papéis",
      risco: "Indefinição de funções e sobreposição de tarefas.",
    };
  if (t.includes("demandas") || t.includes("carga"))
    return {
      tema: "Demandas e Carga",
      risco: "Sobrecarga cognitiva e risco de burnout.",
    };
  return null;
}

export function buildPlano5W2H(
  item: SurveyResult,
  pct: number,
  status: string,
  empresa?: string | null
) {
  const tema = matchPlanoTema(`${item.texto_pergunta} ${item.category}`);
  const dim = tema?.tema || item.texto_pergunta || "Dimensão crítica";
  return {
    dimensao: item.texto_pergunta,
    status,
    pct,
    risco: tema?.risco || `Desvio identificado na dimensão "${dim}" com score ${pct}%.`,
    oQue: `Plano de intervenção ergonômica-cognitiva focado em ${dim}.`,
    porQue: `Classificação ${status} na NR17 (AEP) — indicador abaixo do patamar de controle (70%).`,
    onde: empresa ? `Unidade avaliada: ${empresa}` : "Ambiente organizacional da pesquisa",
    quando: "Ciclo 1: 30 dias (diagnóstico) | Ciclo 2: 90 dias (reavaliação)",
    quem: "RH, lideranças diretas, CIPA/SESMT e consultoria ergonomia",
    como: "Workshops, rituais de feedback, redesenho de processos e monitoramento quinzenal de indicadores.",
    quanto: "A definir conforme porte do setor (estimativa: esforço de equipe interna + eventual consultoria pontual).",
  };
}

export function buildPlanosIntervencao(
  results: SurveyResult[],
  empresa?: string | null
) {
  const candidatos = results
    .map((item) => {
      const pct = pctEscala(item.media);
      const { status } = getClassificacaoRisco(pct);
      if (status !== "Crítico / Alto Risco" && status !== "Médio / Alerta") return null;
      if (pct == null && !isTextoAberto(item.tipo_pergunta)) return null;
      const pctUse = pct ?? 45;
      return buildPlano5W2H(item, pctUse, status, empresa);
    })
    .filter(Boolean) as ReturnType<typeof buildPlano5W2H>[];

  if (candidatos.length) return candidatos;

  const piores = results
    .filter((r) => tipoExibeMedia(r.tipo_pergunta) && r.media != null)
    .map((r) => ({ r, pct: pctEscala(r.media)! }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 2);

  return piores.map(({ r, pct }) =>
    buildPlano5W2H(r, pct, getClassificacaoRisco(pct).status, empresa)
  );
}

export type ComparativoSetorRow = { setor: string; media: number; pesquisaId: number };

export async function buildComparativoSetores(
  empresaAvaliada: string | null,
  pesquisas: { id_pesquisa: number; titulo?: string; id_setor?: number }[],
  setores: { id_setor: number; nome_setor: string }[],
  loadMediaPesquisa: (id: number) => Promise<number | null>
): Promise<ComparativoSetorRow[]> {
  if (!empresaAvaliada) return [];
  const rows: ComparativoSetorRow[] = [];
  for (const p of pesquisas) {
    const setor = setores.find((s) => s.id_setor === p.id_setor);
    const nome = setor?.nome_setor || "";
    const parsed = parseSetorNome(nome);
    if (parsed.empresa?.toLowerCase() !== empresaAvaliada.toLowerCase()) continue;
    const media = await loadMediaPesquisa(p.id_pesquisa);
    if (media != null) {
      rows.push({ setor: parsed.setor, media, pesquisaId: p.id_pesquisa });
    }
  }
  return rows;
}

export type EixoNR17 = {
  nome: string;
  pct: number;
  total: number;
  classificacao: ReturnType<typeof getClassificacaoRisco>;
};

const EIXOS_NR17_REGEX: { nome: string; regex: RegExp }[] = [
  { nome: "Demandas do Trabalho", regex: /demanda|carga|ritmo|press[aã]o|sobrecarga/i },
  { nome: "Autonomia e Controle", regex: /autonomia|controle|decis[aã]o|liberdade/i },
  { nome: "Apoio da Chefia", regex: /chefia|lideran[cç]a|gestor|supervisor|chefe|lider|líder/i },
  { nome: "Apoio dos Colegas", regex: /colega|equipe|par\b|apoio m[uú]tuo|coopera|coleg|trabalho/i },
  { nome: "Relacionamentos", regex: /relacionamento|conviv[eê]ncia|clima|ass[eé]dio|harassment|satisfei|satisfa|sistema/i },
  { nome: "Comunicação e Mudanças", regex: /comunica[cç][aã]o|informa[cç][aã]o|mudan[cç]a|transpar[eê]ncia/i },
  { nome: "Clareza de Papéis", regex: /papel|pap[eé]is|fun[cç][aã]o|responsabilidade|raci|escopo/i },
];

export function identificarDimensaoDaPergunta(
  textoPergunta: string,
  dimensaoBackend?: string | null
): string {
  if (dimensaoBackend && typeof dimensaoBackend === "string" && dimensaoBackend.trim()) {
    return dimensaoBackend.trim();
  }
  const texto = textoPergunta || "";
  for (const { nome, regex } of EIXOS_NR17_REGEX) {
    if (regex.test(texto)) return nome;
  }
  return "Outros";
}

export function agruparEixosNR17(results: SurveyResult[]): EixoNR17[] {
  const escalas = results.filter(
    (r) => r.tipo_pergunta === "EscalaNumerica" && r.media != null
  );

  return EIXOS_NR17_REGEX.map(({ nome, regex }) => {
    const matched = escalas.filter((r) => {
      const dimBackend = (r as any).dimensao_nr17;
      if (dimBackend && typeof dimBackend === "string" && dimBackend.trim()) {
        return dimBackend.trim() === nome;
      }
      return regex.test(r.texto_pergunta || "");
    });
    if (!matched.length) {
      return { nome, pct: 0, total: 0, classificacao: getClassificacaoRisco(null) };
    }
    const avg = matched.reduce((s, r) => s + Number(r.media), 0) / matched.length;
    const pct = pctEscala(avg) ?? 0;
    return { nome, pct, total: matched.length, classificacao: getClassificacaoRisco(pct) };
  });
}

export type KpiSet = {
  satisfacao: number | null;
  turnover: number | null;
  presenca: number | null;
  produtividade: number | null;
};

export function calcularKpis(
  mediaGeral: number | null,
  mediaGeralPct: number | null,
  taxaParticipacao: number | null
): KpiSet {
  return {
    satisfacao: mediaGeralPct,
    turnover: mediaGeral != null ? Math.max(5, Math.round(100 - mediaGeral * 1.2)) : null,
    presenca: mediaGeral != null ? Math.min(100, Math.round(mediaGeral * 10.5)) : null,
    produtividade:
      mediaGeralPct != null && taxaParticipacao != null
        ? Math.min(100, Math.round((mediaGeralPct + taxaParticipacao) / 2))
        : mediaGeralPct,
  };
}

export type DeltaKpi = {
  satisfacao: number | null;
  turnover: number | null;
  presenca: number | null;
  produtividade: number | null;
};

export function calcularDeltasHistoricos(
  kpiAtual: KpiSet,
  kpiAntigo: KpiSet | null
): DeltaKpi {
  if (!kpiAntigo) {
    return { satisfacao: null, turnover: null, presenca: null, produtividade: null };
  }
  const delta = (atual: number | null, antigo: number | null) => {
    if (atual == null || antigo == null) return null;
    return Math.round((atual - antigo) * 10) / 10;
  };
  return {
    satisfacao: delta(kpiAtual.satisfacao, kpiAntigo.satisfacao),
    turnover: delta(kpiAtual.turnover, kpiAntigo.turnover),
    presenca: delta(kpiAtual.presenca, kpiAntigo.presenca),
    produtividade: delta(kpiAtual.produtividade, kpiAntigo.produtividade),
  };
}

export function calcularMediaGeralFromResults(results: SurveyResult[]) {
  const escalas = results.filter(
    (r) => r.tipo_pergunta === "EscalaNumerica" && r.media != null
  );
  if (!escalas.length) return null;
  return escalas.reduce((s, e) => s + Number(e.media), 0) / escalas.length;
}
