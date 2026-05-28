-- Corrigir a função de trigger para suportar DELETE sem acessar NEW (que fica NULL)
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
