-- Remove políticas antigas se existirem para evitar conflitos
DROP POLICY IF EXISTS "Clientes podem ver seus proprios agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "Clientes podem cancelar seus proprios agendamentos" ON agendamentos;

-- Permite SELECT para clientes verem seus agendamentos
CREATE POLICY "Clientes podem ver seus proprios agendamentos"
ON agendamentos
FOR SELECT
TO authenticated
USING (
  cliente_id IN (
    SELECT id FROM clientes WHERE user_id = auth.uid()
  )
);

-- Permite UPDATE para clientes cancelarem seus agendamentos
CREATE POLICY "Clientes podem cancelar seus proprios agendamentos"
ON agendamentos
FOR UPDATE
TO authenticated
USING (
  cliente_id IN (
    SELECT id FROM clientes WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  cliente_id IN (
    SELECT id FROM clientes WHERE user_id = auth.uid()
  )
);