-- 1. Habilita RLS nas tabelas críticas (se ainda não estiver)
ALTER TABLE barbearias ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbeiros ENABLE ROW LEVEL SECURITY;

-- 2. Política de LEITURA (Pública para sites funcionarem)
-- Permite que qualquer um leia os dados da barbearia (necessário para o site do cliente carregar infos)
CREATE POLICY "Leitura publica de barbearias"
ON barbearias FOR SELECT
TO anon, authenticated, service_role
USING (true);

-- Permite leitura pública de barbeiros (para exibir equipe no site)
CREATE POLICY "Leitura publica de barbeiros"
ON barbeiros FOR SELECT
TO anon, authenticated, service_role
USING (true);

-- 3. Política de ESCRITA (Restrita ao Admin/Service Role)
-- Apenas o Dashboard (usando service_role) ou o seu usuário específico pode criar/editar barbearias
CREATE POLICY "Apenas admin pode gerenciar barbearias"
ON barbearias FOR ALL
TO authenticated, service_role
USING (
  auth.jwt() ->> 'email' = 'guilherme.delagnolo@gmail.com' 
  OR 
  auth.role() = 'service_role'
)
WITH CHECK (
  auth.jwt() ->> 'email' = 'guilherme.delagnolo@gmail.com' 
  OR 
  auth.role() = 'service_role'
);

-- Apenas admin pode gerenciar barbeiros (adicionar/remover equipe)
CREATE POLICY "Apenas admin pode gerenciar barbeiros"
ON barbeiros FOR ALL
TO authenticated, service_role
USING (
  auth.jwt() ->> 'email' = 'guilherme.delagnolo@gmail.com' 
  OR 
  auth.role() = 'service_role'
)
WITH CHECK (
  auth.jwt() ->> 'email' = 'guilherme.delagnolo@gmail.com' 
  OR 
  auth.role() = 'service_role'
);

-- 4. Proteção Extra: Clientes (Usuários Finais)
-- Garante que clientes só possam editar seus próprios dados (já deve existir, mas reforçando)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Permite que o sistema crie clientes livremente (ao agendar)
-- Mas edição restrita
CREATE POLICY "Sistema pode criar clientes"
ON clientes FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (true);
