--
-- PostgreSQL database dump
--

\restrict ww1rVbveGVfzYzHlcu0lMxqZvKhDcC2F8NkbdQWS4Tg8OFWppom9WOaLwqbgh3b

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

DROP TABLE IF EXISTS public.dashboard CASCADE;
DROP TABLE IF EXISTS public.resposta CASCADE;
DROP TABLE IF EXISTS public.pergunta CASCADE;
DROP TABLE IF EXISTS public.pesquisa CASCADE;
DROP TABLE IF EXISTS public.log_auditoria CASCADE;
DROP TABLE IF EXISTS public.usuario_administrador CASCADE;
DROP TABLE IF EXISTS public.setor CASCADE;
DROP TABLE IF EXISTS public.empresa CASCADE;

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: dashboard; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dashboard (
    id_dashboard integer NOT NULL,
    id_pesquisa integer NOT NULL,
    titulo character varying(255) NOT NULL,
    data_criacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    config_filtros text
);


ALTER TABLE public.dashboard OWNER TO clima_user;

--
-- Name: TABLE dashboard; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.dashboard IS 'Dashboards de análise das pesquisas (1:1 com pesquisa)';


--
-- Name: dashboard_id_dashboard_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dashboard_id_dashboard_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dashboard_id_dashboard_seq OWNER TO clima_user;

--
-- Name: dashboard_id_dashboard_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dashboard_id_dashboard_seq OWNED BY public.dashboard.id_dashboard;


--
-- Name: empresa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empresa (
    id_empresa integer NOT NULL,
    nome_fantasia character varying(255) NOT NULL,
    razao_social character varying(255) NOT NULL,
    cnpj character varying(18) NOT NULL,
    data_cadastro timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cnpj_format_check CHECK (((cnpj)::text ~ '^[0-9]{2}\.[0-9]{3}\.[0-9]{3}/[0-9]{4}-[0-9]{2}$'::text))
);


ALTER TABLE public.empresa OWNER TO clima_user;

--
-- Name: TABLE empresa; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.empresa IS 'Tabela de empresas cadastradas no sistema';


--
-- Name: empresa_id_empresa_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.empresa_id_empresa_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.empresa_id_empresa_seq OWNER TO clima_user;

--
-- Name: empresa_id_empresa_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.empresa_id_empresa_seq OWNED BY public.empresa.id_empresa;


--
-- Name: log_auditoria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.log_auditoria (
    id_log integer NOT NULL,
    id_user_admin integer NOT NULL,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    acao_realizada character varying(255) NOT NULL,
    detalhes text,
    endereco_ip character varying(45)
);


ALTER TABLE public.log_auditoria OWNER TO clima_user;

--
-- Name: TABLE log_auditoria; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.log_auditoria IS 'Logs de auditoria das ações dos administradores';


--
-- Name: log_auditoria_id_log_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.log_auditoria_id_log_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.log_auditoria_id_log_seq OWNER TO clima_user;

--
-- Name: log_auditoria_id_log_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.log_auditoria_id_log_seq OWNED BY public.log_auditoria.id_log;


--
-- Name: pergunta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pergunta (
    id_pergunta integer NOT NULL,
    id_pesquisa integer NOT NULL,
    texto_pergunta text NOT NULL,
    tipo_pergunta character varying(50) NOT NULL,
    ordem_exibicao integer NOT NULL,
    opcoes_resposta text,
    CONSTRAINT ordem_positiva_check CHECK ((ordem_exibicao > 0)),
    CONSTRAINT tipo_pergunta_check CHECK (((tipo_pergunta)::text = ANY ((ARRAY['MultiplaEscolha'::character varying, 'RespostaAberta'::character varying, 'EscalaNumerica'::character varying, 'SimNao'::character varying])::text[])))
);


ALTER TABLE public.pergunta OWNER TO clima_user;

--
-- Name: TABLE pergunta; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.pergunta IS 'Perguntas das pesquisas';


--
-- Name: pergunta_id_pergunta_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pergunta_id_pergunta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pergunta_id_pergunta_seq OWNER TO clima_user;

--
-- Name: pergunta_id_pergunta_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pergunta_id_pergunta_seq OWNED BY public.pergunta.id_pergunta;


--
-- Name: pesquisa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pesquisa (
    id_pesquisa integer NOT NULL,
    id_empresa integer NOT NULL,
    id_user_admin integer NOT NULL,
    id_setor integer NOT NULL,
    titulo character varying(255) NOT NULL,
    descricao text,
    data_criacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    data_abertura timestamp without time zone,
    data_fechamento timestamp without time zone,
    status character varying(50) DEFAULT 'Rascunho'::character varying,
    link_acesso character varying(255) NOT NULL,
    qrcode_path character varying(255),
    config_recorrencia text,
    anonimato boolean DEFAULT true,
    CONSTRAINT data_periodo_check CHECK (((data_abertura IS NULL) OR (data_fechamento IS NULL) OR (data_abertura <= data_fechamento))),
    CONSTRAINT status_pesquisa_check CHECK (((status)::text = ANY ((ARRAY['Rascunho'::character varying, 'Ativa'::character varying, 'Concluída'::character varying, 'Arquivada'::character varying])::text[])))
);


ALTER TABLE public.pesquisa OWNER TO clima_user;

--
-- Name: TABLE pesquisa; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.pesquisa IS 'Pesquisas de clima organizacional';


--
-- Name: pesquisa_id_pesquisa_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pesquisa_id_pesquisa_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pesquisa_id_pesquisa_seq OWNER TO clima_user;

--
-- Name: pesquisa_id_pesquisa_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pesquisa_id_pesquisa_seq OWNED BY public.pesquisa.id_pesquisa;


--
-- Name: resposta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resposta (
    id_resposta integer NOT NULL,
    id_pergunta integer NOT NULL,
    data_submissao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    valor_resposta text NOT NULL
);


ALTER TABLE public.resposta OWNER TO clima_user;

--
-- Name: TABLE resposta; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.resposta IS 'Respostas anônimas às perguntas';


--
-- Name: resposta_id_resposta_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.resposta_id_resposta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resposta_id_resposta_seq OWNER TO clima_user;

--
-- Name: resposta_id_resposta_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.resposta_id_resposta_seq OWNED BY public.resposta.id_resposta;


--
-- Name: setor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.setor (
    id_setor integer NOT NULL,
    id_empresa integer NOT NULL,
    nome_setor character varying(255) NOT NULL,
    descricao text
);


ALTER TABLE public.setor OWNER TO clima_user;

--
-- Name: TABLE setor; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.setor IS 'Setores e departamentos das empresas';


--
-- Name: setor_id_setor_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.setor_id_setor_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.setor_id_setor_seq OWNER TO clima_user;

--
-- Name: setor_id_setor_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.setor_id_setor_seq OWNED BY public.setor.id_setor;


--
-- Name: usuario_administrador; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario_administrador (
    id_user_admin integer NOT NULL,
    id_empresa integer NOT NULL,
    nome_admin character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    senha_hash character varying(255) NOT NULL,
    data_cadastro timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50) DEFAULT 'Ativo'::character varying,
    CONSTRAINT email_format_check CHECK (((email)::text ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT status_check CHECK (((status)::text = ANY ((ARRAY['Ativo'::character varying, 'Inativo'::character varying, 'Pendente'::character varying])::text[])))
);


ALTER TABLE public.usuario_administrador OWNER TO clima_user;

--
-- Name: TABLE usuario_administrador; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.usuario_administrador IS 'Usuários administradores vinculados às empresas';


--
-- Name: usuario_administrador_id_user_admin_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuario_administrador_id_user_admin_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuario_administrador_id_user_admin_seq OWNER TO clima_user;

--
-- Name: usuario_administrador_id_user_admin_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuario_administrador_id_user_admin_seq OWNED BY public.usuario_administrador.id_user_admin;


--
-- Name: dashboard id_dashboard; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dashboard ALTER COLUMN id_dashboard SET DEFAULT nextval('public.dashboard_id_dashboard_seq'::regclass);


--
-- Name: empresa id_empresa; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa ALTER COLUMN id_empresa SET DEFAULT nextval('public.empresa_id_empresa_seq'::regclass);


--
-- Name: log_auditoria id_log; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_auditoria ALTER COLUMN id_log SET DEFAULT nextval('public.log_auditoria_id_log_seq'::regclass);


--
-- Name: pergunta id_pergunta; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pergunta ALTER COLUMN id_pergunta SET DEFAULT nextval('public.pergunta_id_pergunta_seq'::regclass);


--
-- Name: pesquisa id_pesquisa; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pesquisa ALTER COLUMN id_pesquisa SET DEFAULT nextval('public.pesquisa_id_pesquisa_seq'::regclass);


--
-- Name: resposta id_resposta; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resposta ALTER COLUMN id_resposta SET DEFAULT nextval('public.resposta_id_resposta_seq'::regclass);


--
-- Name: setor id_setor; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setor ALTER COLUMN id_setor SET DEFAULT nextval('public.setor_id_setor_seq'::regclass);


--
-- Name: usuario_administrador id_user_admin; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_administrador ALTER COLUMN id_user_admin SET DEFAULT nextval('public.usuario_administrador_id_user_admin_seq'::regclass);


--
-- Name: dashboard dashboard_id_pesquisa_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dashboard
    ADD CONSTRAINT dashboard_id_pesquisa_key UNIQUE (id_pesquisa);


--
-- Name: dashboard dashboard_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dashboard
    ADD CONSTRAINT dashboard_pkey PRIMARY KEY (id_dashboard);


--
-- Name: empresa empresa_cnpj_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa
    ADD CONSTRAINT empresa_cnpj_key UNIQUE (cnpj);


--
-- Name: empresa empresa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa
    ADD CONSTRAINT empresa_pkey PRIMARY KEY (id_empresa);


--
-- Name: log_auditoria log_auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_auditoria
    ADD CONSTRAINT log_auditoria_pkey PRIMARY KEY (id_log);


--
-- Name: pergunta pergunta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pergunta
    ADD CONSTRAINT pergunta_pkey PRIMARY KEY (id_pergunta);


--
-- Name: pesquisa pesquisa_link_acesso_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pesquisa
    ADD CONSTRAINT pesquisa_link_acesso_key UNIQUE (link_acesso);


--
-- Name: pesquisa pesquisa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pesquisa
    ADD CONSTRAINT pesquisa_pkey PRIMARY KEY (id_pesquisa);


--
-- Name: resposta resposta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resposta
    ADD CONSTRAINT resposta_pkey PRIMARY KEY (id_resposta);


--
-- Name: setor setor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setor
    ADD CONSTRAINT setor_pkey PRIMARY KEY (id_setor);


--
-- Name: pergunta unique_ordem_pesquisa; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pergunta
    ADD CONSTRAINT unique_ordem_pesquisa UNIQUE (id_pesquisa, ordem_exibicao);


--
-- Name: setor unique_setor_empresa; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setor
    ADD CONSTRAINT unique_setor_empresa UNIQUE (id_empresa, nome_setor);


--
-- Name: usuario_administrador usuario_administrador_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_administrador
    ADD CONSTRAINT usuario_administrador_email_key UNIQUE (email);


--
-- Name: usuario_administrador usuario_administrador_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_administrador
    ADD CONSTRAINT usuario_administrador_pkey PRIMARY KEY (id_user_admin);


--
-- Name: idx_dashboard_pesquisa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dashboard_pesquisa ON public.dashboard USING btree (id_pesquisa);


--
-- Name: idx_empresa_cnpj; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_empresa_cnpj ON public.empresa USING btree (cnpj);


--
-- Name: idx_log_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_log_timestamp ON public.log_auditoria USING btree ("timestamp");


--
-- Name: idx_log_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_log_usuario ON public.log_auditoria USING btree (id_user_admin);


--
-- Name: idx_pergunta_ordem; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pergunta_ordem ON public.pergunta USING btree (id_pesquisa, ordem_exibicao);


--
-- Name: idx_pergunta_pesquisa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pergunta_pesquisa ON public.pergunta USING btree (id_pesquisa);


--
-- Name: idx_pesquisa_datas; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pesquisa_datas ON public.pesquisa USING btree (data_abertura, data_fechamento);


--
-- Name: idx_pesquisa_empresa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pesquisa_empresa ON public.pesquisa USING btree (id_empresa);


--
-- Name: idx_pesquisa_link; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pesquisa_link ON public.pesquisa USING btree (link_acesso);


--
-- Name: idx_pesquisa_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pesquisa_status ON public.pesquisa USING btree (status);


--
-- Name: idx_resposta_data; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_resposta_data ON public.resposta USING btree (data_submissao);


--
-- Name: idx_resposta_pergunta; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_resposta_pergunta ON public.resposta USING btree (id_pergunta);


--
-- Name: idx_setor_empresa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_setor_empresa ON public.setor USING btree (id_empresa);


--
-- Name: idx_usuario_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuario_email ON public.usuario_administrador USING btree (email);


--
-- Name: idx_usuario_empresa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuario_empresa ON public.usuario_administrador USING btree (id_empresa);


--
-- Name: dashboard dashboard_id_pesquisa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dashboard
    ADD CONSTRAINT dashboard_id_pesquisa_fkey FOREIGN KEY (id_pesquisa) REFERENCES public.pesquisa(id_pesquisa) ON DELETE CASCADE;


--
-- Name: log_auditoria log_auditoria_id_user_admin_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_auditoria
    ADD CONSTRAINT log_auditoria_id_user_admin_fkey FOREIGN KEY (id_user_admin) REFERENCES public.usuario_administrador(id_user_admin);


--
-- Name: pergunta pergunta_id_pesquisa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pergunta
    ADD CONSTRAINT pergunta_id_pesquisa_fkey FOREIGN KEY (id_pesquisa) REFERENCES public.pesquisa(id_pesquisa) ON DELETE CASCADE;


--
-- Name: pesquisa pesquisa_id_empresa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pesquisa
    ADD CONSTRAINT pesquisa_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa) ON DELETE CASCADE;


--
-- Name: pesquisa pesquisa_id_setor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pesquisa
    ADD CONSTRAINT pesquisa_id_setor_fkey FOREIGN KEY (id_setor) REFERENCES public.setor(id_setor);


--
-- Name: pesquisa pesquisa_id_user_admin_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pesquisa
    ADD CONSTRAINT pesquisa_id_user_admin_fkey FOREIGN KEY (id_user_admin) REFERENCES public.usuario_administrador(id_user_admin);


--
-- Name: resposta resposta_id_pergunta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resposta
    ADD CONSTRAINT resposta_id_pergunta_fkey FOREIGN KEY (id_pergunta) REFERENCES public.pergunta(id_pergunta) ON DELETE CASCADE;


--
-- Name: setor setor_id_empresa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setor
    ADD CONSTRAINT setor_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa) ON DELETE CASCADE;


--
-- Name: usuario_administrador usuario_administrador_id_empresa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_administrador
    ADD CONSTRAINT usuario_administrador_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ww1rVbveGVfzYzHlcu0lMxqZvKhDcC2F8NkbdQWS4Tg8OFWppom9WOaLwqbgh3b

