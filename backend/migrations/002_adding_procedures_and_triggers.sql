--Cria função para gerar links
CREATE OR REPLACE FUNCTION generate_survey_link(id_pesquisa INT)
RETURNS TEXT AS $$
DECLARE
    unique_link TEXT;
BEGIN
    unique_link := 'survey_' || id_pesquisa || '_' || encode(gen_random_bytes(6), 'hex');
    RETURN unique_link;
END;
$$ LANGUAGE plpgsql;

--Função para validar CNPJ
CREATE OR REPLACE FUNCTION validar_cnpj(cnpj_in VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    numeros TEXT;
BEGIN
   --Remove caracteres não numéricos (importante para manter o banco limpo e robusto)
    numeros := regexp_replace(cnpj_in, '[^0-9]', '', 'g');
    IF length(numeros) != 14 THEN
        RETURN FALSE;
    END IF;

--Aqui poderia entrar a validação completa de dígitos verificadores do CNPJ (Ponto de melhoria futuro no projeto)
--Para simplificar, apenas retorna TRUE se tiver 14 dígitos
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

--Procedure para abrir pesquisa
CREATE OR REPLACE PROCEDURE abrir_pesquisa(p_id INT)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE pesquisa
    SET status = 'Ativa',
        data_abertura = NOW(),
        link_acesso = generate_survey_link(p_id)
    WHERE id_pesquisa = p_id;

    INSERT INTO log_auditoria (id_user_admin, acao_realizada, detalhes)
    VALUES (
        (SELECT id_user_admin FROM pesquisa WHERE id_pesquisa = p_id),
        'ABRIR PESQUISA',
        'Pesquisa ' || p_id || ' aberta'
    );
END;
$$;

--Procedure para fechar pesquisa
CREATE OR REPLACE PROCEDURE encerrar_pesquisa(p_id INT)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE pesquisa
    SET status = 'Concluída',
        data_fechamento = NOW()
    WHERE id_pesquisa = p_id;

    INSERT INTO log_auditoria (id_user_admin, acao_realizada, detalhes)
    VALUES (
        (SELECT id_user_admin FROM pesquisa WHERE id_pesquisa = p_id),
        'ENCERRAR PESQUISA',
        'Pesquisa ' || p_id || ' encerrada'
    );
END;
$$;

--Trigger para automação do link ao criar a pesquisa
CREATE OR REPLACE FUNCTION trg_generate_link()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.link_acesso IS NULL THEN
        NEW.link_acesso := generate_survey_link(NEW.id_pesquisa);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_insert_pesquisa
BEFORE INSERT ON pesquisa
FOR EACH ROW
EXECUTE FUNCTION trg_generate_link();

--Adicionando Trigger de autitoria
CREATE OR REPLACE FUNCTION trg_log_pesquisa()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id INT;
    v_pesquisa_id INT;
    v_titulo VARCHAR;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_user_id := OLD.id_user_admin;
        v_pesquisa_id := OLD.id_pesquisa;
        v_titulo := OLD.titulo;
    ELSE
        v_user_id := NEW.id_user_admin;
        v_pesquisa_id := NEW.id_pesquisa;
        v_titulo := NEW.titulo;
    END IF;

    INSERT INTO log_auditoria (id_user_admin, acao_realizada, detalhes)
    VALUES (
        v_user_id,
        TG_OP || ' PESQUISA',
        'ID ' || v_pesquisa_id || ' - ' || COALESCE(v_titulo, '')
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_pesquisa_changes
AFTER INSERT OR UPDATE OR DELETE ON pesquisa
FOR EACH ROW
EXECUTE FUNCTION trg_log_pesquisa();

