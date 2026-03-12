
-- Tentar remover trigger comum que causa erro se a tabela destino não existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remover a função associada se existir no schema public ou auth
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS auth.handle_new_user();
