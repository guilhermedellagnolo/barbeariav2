# 🚦 Status dos Sistemas e Próximos Passos (Handover)

## Status Atual

### 1. `appdobabrbeirov1` (Painel Admin)
*   **Funcionalidades:** Gestão de agenda, visualização de faturamento (Dashboards), configuração de horários.
*   **Estado:** Estável. Conectado ao Supabase.

### 2. `sitebarbeariapereira` (Portal do Cliente)
*   **Funcionalidades:**
    *   Visualização de portfólio e serviços.
    *   Motor de Agendamento (`appointmentService.ts`) completo com regras de UTC-3 e trava de 2h.
    *   UI de Agendamento com privacidade aplicada (slots ocupados/bloqueados ocultos/desabilitados).
    *   Estrutura de Auth (Login/Cadastro) iniciada com Email/Senha (a ser substituída).

## ⚠️ Especificação Crítica para a Próxima IA

A próxima etapa é a implementação robusta da Autenticação com foco em UX (Zero Fricção).

### Tarefa 1: Login com Google OAuth
Substituir o atual formulário de Email/Senha por um botão "Continuar com Google".
*   **Lib:** Usar `@supabase/ssr`.
*   **Fluxo:** O botão deve disparar `signInWithOAuth` redirecionando para `${origin}/auth/callback`.

### Tarefa 2: Onboarding Progressivo (Critical Path)
Ao retornar do Google (no Callback ou em um Middleware de proteção), o sistema deve verificar a tabela `public.clientes`:

1.  **Verificação:** Existe um registro em `clientes` onde `user_id == auth.uid()`?
2.  **Cenário A (Já existe):** Redirecionar para a Home ou Agendamento.
3.  **Cenário B (Novo Usuário):**
    *   O Google fornece `email` e `full_name`.
    *   **Falta o Telefone (WhatsApp).**
    *   **Ação:** Redirecionar para uma rota intermediária `/completar-cadastro`.
    *   **UI:** Formulário simples pedindo *apenas* o WhatsApp.
    *   **Backend:** Ao salvar, criar o registro na tabela `clientes` com `user_id`, `email`, `nome` e `telefone`.

### Tarefa 3: Área "Meus Agendamentos"
Finalizar a página `/meus-agendamentos` (já criada, mas precisa ser validada com o fluxo do Google).
*   Garantir que a query filtre por `cliente_id` (obtido através do `user_id` da sessão).
*   Exibir botão de "Cancelar" respeitando a regra de 2 horas (chamar `cancelAppointment` via Server Action).

---
**Observação Final:** O código atual em `app/login/page.tsx` ainda reflete o formulário antigo. A prioridade zero é limpar esse arquivo e implementar o botão do Google.
