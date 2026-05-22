// Tipagens base que espelham as entidades do backend Go

// ─── Enums ────────────────────────────────────────────────────────────────────

export type StatusPesquisa = 'Rascunho' | 'Ativa' | 'Concluída' | 'Arquivada';

export type TipoPergunta = 'EscalaNumerica' | 'MultiplaEscolha' | 'TextoLivre' | 'RespostaAberta' | 'SimNao';

export type StatusUsuario = 'Ativo' | 'Inativo' | 'Pendente';

// Role do usuário removida: backend atual não fornece role no JWT

// ─── Entidades ────────────────────────────────────────────────────────────────

export interface Empresa {
  id_empresa: number;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  data_cadastro: string;
  setores?: Setor[];
  usuarios_administradores?: UsuarioAdministrador[];
}

export interface UsuarioAdministrador {
  id_user_admin: number;
  id_empresa: number;
  nome_admin: string;
  email: string;
  data_cadastro: string;
  status: StatusUsuario;
  role?: string;
  empresa?: Empresa;
}

export interface Setor {
  id_setor: number;
  id_empresa: number;
  nome_setor: string;
  descricao: string;
  empresa?: Empresa;
}

export interface Pergunta {
  id_pergunta: number;
  id_pesquisa: number;
  texto_pergunta: string;
  tipo_pergunta: TipoPergunta;
  ordem_exibicao: number;
  opcoes_resposta?: string | null;
  respostas?: Resposta[];
}

export interface Pesquisa {
  id_pesquisa: number;
  id_empresa: number;
  id_user_admin: number;
  id_setor: number;
  titulo: string;
  descricao: string;
  data_criacao: string;
  data_abertura?: string | null;
  data_fechamento?: string | null;
  status: StatusPesquisa;
  link_acesso: string;
  qrcode_path: string;
  config_recorrencia?: string | null;
  anonimato: boolean;
  perguntas?: Pergunta[];
  usuario_administrador?: UsuarioAdministrador;
  setor?: Setor;
  dashboard?: Dashboard;
}

export interface Resposta {
  id_resposta: number;
  id_pergunta: number;
  id_pesquisa: number;
  valor_resposta: string;
  data_resposta: string;
  data_submissao: string;
  pergunta?: Pergunta;
  pesquisa?: Pesquisa;
}

export interface Dashboard {
  id_dashboard: number;
  id_pesquisa: number;
  titulo: string;
  data_criacao: string;
  config_filtros?: string | null;
  total_respostas?: number;
  taxa_participacao?: number;
  metricas?: Record<string, unknown>;
}

export interface LogAuditoria {
  id_log: number;
  id_user_admin: number;
  timestamp: string;
  acao_realizada: string;
  detalhes: string;
  endereco_ip: string;
  usuario_administrador?: UsuarioAdministrador;
}

// ─── Tipos de autenticação ────────────────────────────────────────────────────

export interface UserInfo {
  id: number;
  nome: string;
  email: string;
  empresa_id: number;
  status: StatusUsuario;
  role?: string;
}

export interface LoginResponse {
  token: string;
  expires_in: number;
  user: UserInfo;
}

export interface TokenValidationResponse {
  valid: boolean;
  user: UserInfo;
  expires_at: string;
}

// ─── Tipos de request ─────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface CreatePesquisaRequest {
  titulo: string;
  descricao: string;
  id_setor: number;
  data_abertura?: string;
  data_fechamento?: string;
  anonimato: boolean;
  id_user_admin?: number;
  status?: StatusPesquisa;
}

export interface CreatePerguntaRequest {
  texto_pergunta: string;
  tipo_pergunta: TipoPergunta;
  ordem_exibicao: number;
  opcoes_resposta?: string;
}

export interface SubmitRespostaRequest {
  // A submissão pública utiliza `token_acesso` no body; mantemos compatibilidade
  token_acesso?: string;
  id_pesquisa?: number;
  respostas: Array<{
    id_pergunta: number;
    valor_resposta: string;
  }>;
}

export interface CreateUsuarioRequest {
  nome_admin: string;
  email: string;
  senha: string;
  role: string;
}

export interface CreateEmpresaRequest {
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
}

export interface CreateSetorRequest {
  nome_setor: string;
  descricao: string;
  id_empresa: number;
}

// ─── Tipo de Dashboard Data ────────────────────────────────────────────────────

export interface MetricaPorPergunta {
  id_pergunta: number;
  texto_pergunta: string;
  tipo_pergunta: TipoPergunta;
  media?: number;
  distribuicao?: Record<string, number>;
  total_respostas: number;
}

export interface DashboardData {
  total_respostas: number;
  taxa_participacao: number;
  metricas_por_pergunta: MetricaPorPergunta[];
  nps_geral?: number;
}
