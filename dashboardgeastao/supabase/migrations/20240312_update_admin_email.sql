-- ATUALIZAÇÃO DE SEGURANÇA: Mudar admin para t3barber@gmail.com

-- 1. Remove políticas antigas (para recriar)
DROP POLICY IF EXISTS "Apenas admin pode gerenciar barbearias" ON barbearias;
DROP POLICY IF EXISTS "Apenas admin pode gerenciar barbeiros" ON barbeiros;

-- 2. Recria com novo e-mail
CREATE POLICY "Apenas admin pode gerenciar barbearias"
ON barbearias FOR ALL
TO authenticated, service_role
USING (
  auth.jwt() ->> 'email' = 't3barber@gmail.com' 
  OR 
  auth.role() = 'service_role'
)
WITH CHECK (
  auth.jwt() ->> 'email' = 't3barber@gmail.com' 
  OR 
  auth.role() = 'service_role'
);

CREATE POLICY "Apenas admin pode gerenciar barbeiros"
ON barbeiros FOR ALL
TO authenticated, service_role
USING (
  auth.jwt() ->> 'email' = 't3barber@gmail.com' 
  OR 
  auth.role() = 'service_role'
)
WITH CHECK (
  auth.jwt() ->> 'email' = 't3barber@gmail.com' 
  OR 
  auth.role() = 'service_role'
);
