import type { SurveyResult } from "@/components/dashboard/ResultsDataTable";

export const mapTipoCategoria = (tipo: string) => {
  const map: Record<string, string> = {
    MultiplaEscolha: "Múltipla Escolha",
    EscalaNumerica: "Escala Numérica",
    RespostaAberta: "Resposta Aberta",
    TextoLivre: "Texto Livre",
    SimNao: "Escolha Única",
  };
  return map[tipo] || String(tipo || "Geral").replace(/([a-z])([A-Z])/g, "$1 $2");
};

export const tipoExibeMedia = (tipo?: string) => tipo === "EscalaNumerica";

export function buildResultsFromPerguntas(
  perguntas: any[],
  stats: Record<string, Record<string, number>>,
  dadosProc: Record<string, any> = {}
): SurveyResult[] {
  return perguntas.map((p: any) => {
    const qId = String(p.id_pergunta);
    const proc = dadosProc[`pergunta_${qId}`] || {};
    const dist = stats[qId] || proc.distribuicao || proc.dados || {};
    let total = Number(proc.total_respostas) || 0;
    let soma = 0;
    if (!total) {
      Object.entries(dist).forEach(([val, count]) => {
        const c = Number(count);
        total += c;
        if (p.tipo_pergunta === "EscalaNumerica") soma += Number(val) * c;
      });
    } else if (p.tipo_pergunta === "EscalaNumerica") {
      Object.entries(dist).forEach(([val, count]) => {
        soma += Number(val) * Number(count);
      });
    }
    const mediaBackend = proc.media != null ? Number(proc.media) : NaN;
    const media = !Number.isNaN(mediaBackend)
      ? mediaBackend
      : p.tipo_pergunta === "EscalaNumerica" && total > 0
        ? soma / total
        : undefined;
    return {
      id: qId,
      texto_pergunta: p.texto_pergunta,
      tipo_pergunta: p.tipo_pergunta,
      category: mapTipoCategoria(p.tipo_pergunta),
      media,
      total_respostas: total,
      distribuicao: dist,
    };
  });
}

export function calcNps(dist: Record<string, number> = {}): number | null {
  let promoters = 0;
  let detractors = 0;
  let total = 0;
  Object.entries(dist).forEach(([val, count]) => {
    const n = Number(val);
    const c = Number(count);
    if (Number.isNaN(n)) return;
    total += c;
    if (n >= 9) promoters += c;
    else if (n <= 6) detractors += c;
  });
  if (!total) return null;
  return Math.round(((promoters - detractors) / total) * 100);
}

export function distToPercent(dist: Record<string, number> = {}) {
  const total = Object.values(dist).reduce((a, b) => a + Number(b), 0);
  if (!total) return [];
  return Object.entries(dist)
    .map(([opcao, qtd]) => ({
      opcao,
      qtd: Number(qtd),
      pct: Math.round((Number(qtd) / total) * 100),
    }))
    .sort((a, b) => b.qtd - a.qtd);
}

export function toDashboardChartData(results: SurveyResult[], totalRespostas = 0) {
  return {
    total_respostas: totalRespostas,
    metricas_por_pergunta: results.map((r) => ({
      id_pergunta: Number(r.id),
      texto_pergunta: r.texto_pergunta,
      tipo_pergunta: r.tipo_pergunta,
      media: r.media,
      total_respostas: r.total_respostas,
      distribuicao: r.distribuicao,
    })),
  };
}
