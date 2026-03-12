-- Correção de IDs Automáticos (UUID)
-- O erro aconteceu porque a tabela 'barbeiros' não estava gerando o ID automaticamente.
-- Vamos garantir que TODAS as tabelas gerem seus IDs.

-- 1. Habilitar extensão pgcrypto (caso não esteja, para usar gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Corrigir tabela BARBEIROS (O erro atual)
ALTER TABLE barbeiros ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Prevenir erros futuros nas outras tabelas
ALTER TABLE horarios_trabalho ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE servicos ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE agendamentos ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE clientes ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 4. Garantir barbearias (provavelmente já tem, mas por segurança)
ALTER TABLE barbearias ALTER COLUMN id SET DEFAULT gen_random_uuid();
