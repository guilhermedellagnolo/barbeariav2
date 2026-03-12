
-- Garantir RLS para horarios_trabalho
ALTER TABLE public.horarios_trabalho ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar duplicidade
DROP POLICY IF EXISTS "Public horarios read" ON public.horarios_trabalho;
DROP POLICY IF EXISTS "Barbeiros manage horarios" ON public.horarios_trabalho;

-- Permitir leitura pública (clientes precisam ver os horários para agendar)
CREATE POLICY "Public horarios read" ON public.horarios_trabalho FOR SELECT USING (true);

-- Permitir barbeiros gerenciarem seus PRÓPRIOS horários
-- A regra é: O usuario_id do barbeiro dono do horário deve ser igual ao auth.uid() logado.
-- Mas a tabela horarios_trabalho tem 'barbeiro_id' (que é o ID da tabela barbeiros, não do auth.users).
-- Então precisamos fazer um JOIN.

CREATE POLICY "Barbeiros manage horarios"
ON public.horarios_trabalho
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.barbeiros
    WHERE barbeiros.id = horarios_trabalho.barbeiro_id
    AND barbeiros.usuario_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.barbeiros
    WHERE barbeiros.id = horarios_trabalho.barbeiro_id
    AND barbeiros.usuario_id = auth.uid()
  )
);
