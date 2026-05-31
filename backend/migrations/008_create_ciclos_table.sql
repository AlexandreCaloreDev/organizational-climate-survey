-- 008_create_ciclos_table.sql
-- Adiciona a entidade Ciclo de Avaliação e seu vínculo com a Pesquisa

CREATE TABLE IF NOT EXISTS ciclo_avaliacao (
    id_ciclo SERIAL PRIMARY KEY,
    id_empresa INT NOT NULL REFERENCES empresa(id_empresa) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    recorrencia VARCHAR(50),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index para otimizar busca por empresa
CREATE INDEX IF NOT EXISTS idx_ciclo_empresa ON ciclo_avaliacao(id_empresa);

-- Adiciona o vinculo na tabela de pesquisa
-- Usamos SET NULL para não quebrar em deletes, preservando o histórico da pesquisa se possivel.
ALTER TABLE pesquisa
ADD COLUMN id_ciclo INT REFERENCES ciclo_avaliacao(id_ciclo) ON DELETE SET NULL;

-- Create function if it doesn't exist (using plpgsql)
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para data de atualização
CREATE TRIGGER update_ciclo_avaliacao_modtime
BEFORE UPDATE ON ciclo_avaliacao
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
