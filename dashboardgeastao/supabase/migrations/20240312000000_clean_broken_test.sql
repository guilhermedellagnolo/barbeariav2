-- Limpeza da barbearia de teste quebrada para permitir novo teste limpo
DELETE FROM public.agendamentos WHERE barbearia_id IN (SELECT id FROM public.barbearias WHERE subdominio = 'pereira');
DELETE FROM public.horarios_trabalho WHERE barbeiro_id IN (SELECT id FROM public.barbeiros WHERE barbearia_id IN (SELECT id FROM public.barbearias WHERE subdominio = 'pereira'));
DELETE FROM public.barbeiros WHERE barbearia_id IN (SELECT id FROM public.barbearias WHERE subdominio = 'pereira');
DELETE FROM public.barbearias WHERE subdominio = 'pereira';
