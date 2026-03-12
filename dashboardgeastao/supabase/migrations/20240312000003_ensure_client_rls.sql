
-- Garantir RLS para clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar duplicidade/conflito
DROP POLICY IF EXISTS "Clientes podem criar seu próprio perfil" ON public.clientes;
DROP POLICY IF EXISTS "Clientes podem atualizar seu próprio perfil" ON public.clientes;
DROP POLICY IF EXISTS "Clientes podem ver seu próprio perfil" ON public.clientes;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.clientes;
DROP POLICY IF EXISTS "Users can update own profile" ON public.clientes;
DROP POLICY IF EXISTS "Users can view own profile" ON public.clientes;

-- Criar novas políticas
CREATE POLICY "Clientes podem criar seu próprio perfil"
ON public.clientes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clientes podem atualizar seu próprio perfil"
ON public.clientes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Clientes podem ver seu próprio perfil"
ON public.clientes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
