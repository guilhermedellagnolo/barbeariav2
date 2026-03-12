
-- Garantir RLS para servicos
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar duplicidade
DROP POLICY IF EXISTS "Public servicos read" ON public.servicos;
DROP POLICY IF EXISTS "Barbeiros manage servicos" ON public.servicos;

-- Permitir leitura pública (clientes e todos)
CREATE POLICY "Public servicos read" ON public.servicos FOR SELECT USING (true);

-- Permitir barbeiros criarem/editarem/deletarem serviços da SUA barbearia
-- A lógica é: O usuário logado (auth.uid()) deve ser um barbeiro vinculado à mesma barbearia do serviço.
CREATE POLICY "Barbeiros manage servicos"
ON public.servicos
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.barbeiros
    WHERE barbeiros.usuario_id = auth.uid()
    AND barbeiros.barbearia_id = servicos.barbearia_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.barbeiros
    WHERE barbeiros.usuario_id = auth.uid()
    AND barbeiros.barbearia_id = servicos.barbearia_id
  )
);
