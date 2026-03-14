
-- 1. Adicionar coluna telefone na tabela barbeiros
ALTER TABLE barbeiros 
ADD COLUMN IF NOT EXISTS telefone TEXT;

-- 2. Atualizar o barbeiro "Claudinei" (ou o primeiro da lista se não achar pelo nome exato)
-- Como limpamos o banco, vou assumir que você vai recriar. 
-- Mas se já recriou, este comando atualiza.
UPDATE barbeiros
SET telefone = '47996589483'
WHERE nome ILIKE '%Claudinei%' OR nome ILIKE '%Barbeiro%';

-- Se não tiver barbeiro ainda, o UPDATE não faz nada, sem erro.
