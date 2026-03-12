-- Habilitar RLS em todas as tabelas
ALTER TABLE barbearias ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE horarios_trabalho ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Policies para Público (anon e authenticated - leitura)
CREATE POLICY "Public barbearias read" ON barbearias FOR SELECT USING (true);
CREATE POLICY "Public barbeiros read" ON barbeiros FOR SELECT USING (true);
CREATE POLICY "Public horarios read" ON horarios_trabalho FOR SELECT USING (true);
CREATE POLICY "Public servicos read" ON servicos FOR SELECT USING (true);
CREATE POLICY "Public agendamentos read" ON agendamentos FOR SELECT USING (true); -- Dashboard e clientes precisam ler
CREATE POLICY "Public clientes read" ON clientes FOR SELECT USING (true); -- Dashboard precisa ler

-- Policies para Escrita (Service Role bypassa RLS, então não precisa de policy específica para API Route)
-- Mas precisamos permitir INSERT publico em agendamentos para clientes marcarem
CREATE POLICY "Public agendamentos insert" ON agendamentos FOR INSERT WITH CHECK (true);

-- Policies para Barbeiros (Authenticated)
-- Permitir update no próprio perfil
CREATE POLICY "Barbeiros update self" ON barbeiros FOR UPDATE USING (auth.uid() = usuario_id);

-- Permitir update na própria agenda
CREATE POLICY "Barbeiros manage agendamentos" ON agendamentos FOR ALL USING (
  EXISTS (
    SELECT 1 FROM barbeiros 
    WHERE id = agendamentos.barbeiro_id 
    AND usuario_id = auth.uid()
  )
);
