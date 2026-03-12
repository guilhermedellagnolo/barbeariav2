

## 🔄 Atualização de Infraestrutura e Correções (Sessão Atual)

### 1. Correção Crítica: Erro "Database error creating new user"
*   **Problema:** Ao tentar criar barbeiros, a API retornava `AuthApiError: Database error creating new user`.
*   **Causa:** Uma trigger antiga (`on_auth_user_created`) estava tentando inserir dados em tabelas que não existem mais ou têm restrições, causando falha na transação de criação do usuário.
*   **Solução:** Removidas as triggers e funções problemáticas (`on_auth_user_created`, `handle_new_user`) via migration `20240312000002_fix_auth_error.sql`.

### 2. Segurança e Onboarding de Clientes
*   **Problema:** Com a remoção da trigger, novos clientes logando com Google não teriam registro automático na tabela `public.clientes`, impedindo o agendamento.
*   **Solução:**
    *   Criada migration `20240312000003_ensure_client_rls.sql` que habilita RLS na tabela `clientes` e adiciona políticas permitindo que usuários autenticados criem (`INSERT`) e atualizem (`UPDATE`) seus próprios perfis.
    *   Isso permite que o fluxo de Onboarding do site (`/onboarding`) funcione corretamente, criando o registro do cliente no primeiro acesso.

### 3. Status Atual para Testes
*   **Barbeiros:** Criação de conta e vínculo com Auth funcionando.
*   **Clientes:** Login Google e criação de perfil via Onboarding funcionando.
*   **Agendamento:** Depende dos passos acima.

### 4. Próximos Passos (Imediato)
*   Seguir o `PLANO_DE_TESTES.md` (atualizado para domínio de produção) para validar o fluxo completo.
*   **Nota:** Se o erro de "Database error" persistir, verificar se existem outras triggers ocultas, mas o teste com script de diagnóstico indicou sucesso após a limpeza.
