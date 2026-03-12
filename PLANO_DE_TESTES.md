# 🧪 Plano de Testes End-to-End (E2E) - Produção (Vercel)

Este roteiro cobre o ciclo de vida completo de uma barbearia no sistema, validando as correções críticas (login, criação de usuários e agendamento) utilizando o domínio de produção **73.barber.com**.

---

## 🏗️ Fase 1: Criação e Configuração (Dashboard Admin)

**Objetivo:** Garantir que a barbearia e seus usuários (barbeiros) sejam criados corretamente no banco e no sistema de Autenticação.

1.  **Acessar Dashboard:** Abra a URL do seu Dashboard na Vercel (ex: `https://dashboard-gestao.vercel.app` ou `admin.73.barber.com`).
2.  **Criar Nova Barbearia:**
    *   Clique em **"Nova Barbearia"**.
    *   **Dados Básicos:**
        *   Nome: `Barbearia Teste Final`
        *   Subdomínio: `teste-final` (o site será acessível em `https://teste-final.73.barber.com`)
    *   **Barbeiros (CRÍTICO):** Adicione 2 barbeiros para testar isolamento de agenda.
        *   **Barbeiro A:**
            *   Nome: `João Barbeiro`
            *   Email: `joao@teste.com` (Use um email que *não* exista no Auth ainda)
            *   Senha: `senha123`
        *   **Barbeiro B:**
            *   Nome: `Pedro Barbeiro`
            *   Email: `pedro@teste.com`
            *   Senha: `senha123`
    *   **Finalizar:** Clique em "Criar Barbearia".
    *   **Validação:** Você deve ser redirecionado para a lista e ver a barbearia criada.

3.  **Testar Edição (Correção Recente):**
    *   Clique na barbearia criada na lista.
    *   Vá na aba **"Barbeiros"**.
    *   **Teste de Novo Barbeiro:** Clique em "Adicionar Barbeiro".
        *   Nome: `Maria Barbeira`
        *   Email: `maria@teste.com`
        *   Senha: `senha123`
        *   Salvar.
    *   **Validação:** O card da Maria deve aparecer. (Isso confirma que a criação de usuários via *edição* está funcionando).
    *   **Teste de Troca de Senha:** No card do `João Barbeiro`, digite `nova123` no campo "Nova senha" e clique em "Salvar Alterações".

---

## 📱 Fase 2: Acesso do Barbeiro (App)

**Objetivo:** Validar se o login funciona (vínculo `usuario_id` correto) e configurar serviços.

4.  **Login Barbeiro A (João):**
    *   Acesse a URL do App do Barbeiro na Vercel (ex: `https://app-barbeiro.vercel.app` ou `app.73.barber.com`).
    *   Email: `joao@teste.com`
    *   Senha: `nova123` (Testando a senha alterada).
    *   **Validação:** Deve entrar no Dashboard do App. Se ficar em "Carregando perfil..." eternamente, o teste falhou.

5.  **Configurar Serviços (Obrigatório para Agendamento):**
    *   No App, vá na aba **"Serviços"** (ícone de lista).
    *   Clique em **"Novo"**.
    *   Crie: `Corte Cabelo` - R$ 50,00 - 30 min.
    *   Crie: `Barba` - R$ 30,00 - 30 min.
    *   **Validação:** Os serviços aparecem na lista.

6.  **Login Barbeiro B (Pedro):**
    *   Abra uma janela anônima ou outro navegador.
    *   Acesse a URL do App do Barbeiro.
    *   Email: `pedro@teste.com` / Senha: `senha123`.
    *   **Validação:** Entra no Dashboard dele.
    *   **Verificação de Isolamento:** Vá na aba "Serviços". Ele *deve* ver os mesmos serviços (pois serviços são da Barbearia, não do Barbeiro).

---

## 📅 Fase 3: Agendamento (Site do Cliente)

**Objetivo:** Simular um cliente real e verificar se o sistema de agendamento está funcional no domínio real.

7.  **Acessar Site:** Abra `https://teste-final.73.barber.com`.
    *   **Validação:** Deve carregar a "Barbearia Teste Final" com as cores/logo padrão.
    *   *Nota:* A propagação do DNS pode levar alguns minutos se o subdomínio for recém-criado, mas na Vercel costuma ser rápido para subdomínios wildcard.

8.  **Realizar Agendamento:**
    *   Clique em "Agendar Horário".
    *   Selecione o serviço `Corte Cabelo`.
    *   Escolha o profissional **`João Barbeiro`**.
    *   Escolha uma data (ex: Amanhã) e horário (ex: 10:00).
    *   **Login Cliente:** Use o login simples (email/senha) ou "Continuar sem cadastro" se disponível.
    *   Confirme o agendamento.
    *   **Validação:** Mensagem de sucesso.

9.  **Agendamento Cruzado (Teste de Isolamento):**
    *   Faça outro agendamento.
    *   Serviço: `Barba`.
    *   Profissional: **`Pedro Barbeiro`**.
    *   Data: Amanhã, Horário: 10:00 (O mesmo horário do João).
    *   **Validação:** O sistema DEVE permitir, pois são barbeiros diferentes.

---

## 🔍 Fase 4: Verificação Final (Ciclo Completo)

**Objetivo:** Confirmar se os agendamentos caíram nas agendas certas.

10. **Verificar App do João:**
    *   Volte ao App do João (no navegador onde ele está logado).
    *   Vá na aba **"Agenda"** ou **"Radar"**.
    *   Navegue até o dia de "Amanhã".
    *   **Validação:** Deve ter um agendamento às 10:00 (Corte Cabelo).

11. **Verificar App do Pedro:**
    *   Volte ao App do Pedro.
    *   Navegue até o dia de "Amanhã".
    *   **Validação:** Deve ter um agendamento às 10:00 (Barba).
    *   **CRÍTICO:** Pedro *não* deve ver o agendamento do João e vice-versa.

12. **Teste do "Botão do Pânico":**
    *   Vá no Dashboard Admin.
    *   Desative a opção "Ativo" da `Barbearia Teste Final`.
    *   Tente acessar o site `https://teste-final.73.barber.com`.
    *   **Validação:** Deve redirecionar para a página de **Manutenção**.
    *   Reative a barbearia e atualize o site. Deve voltar ao normal.

---

### ✅ Checklist de Sucesso
Se passar por todos esses 12 passos, o MVP está funcional no ambiente de produção e pronto para venda!
