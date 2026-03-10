# 🏗️ Arquitetura e Banco de Dados

## Stack Tecnológica
*   **Frontend:** Next.js (App Router), React, Tailwind CSS, Lucide React.
*   **Backend/Database:** Supabase (PostgreSQL + Auth).
*   **Linguagem:** TypeScript.
*   **Gerenciamento de Estado:** React Hooks (`useState`, `useEffect`).
*   **Autenticação:** `@supabase/ssr` (Cookies).

## Modelagem de Dados (Supabase)

O banco de dados é relacional e utiliza o Supabase. As principais tabelas são:

### 1. `barbearias`
Tabela raiz do sistema multi-tenant.
*   `id` (UUID, PK): Identificador único da barbearia.
*   `nome`: Nome da barbearia.
*   `slug`: Identificador para URL (ex: `barbearia-pereira`).

### 2. `barbeiros`
Profissionais vinculados a uma barbearia.
*   `id` (UUID, PK)
*   `barbearia_id` (UUID, FK -> `barbearias.id`)
*   `nome`: Nome do barbeiro.
*   `foto_url`: URL da imagem do perfil.
*   `usuario_id` (UUID, FK -> `auth.users`): Vínculo com o usuário de acesso do barbeiro (Painel Admin).

### 3. `horarios_trabalho`
Configuração da jornada de trabalho semanal.
*   `id` (UUID, PK)
*   `barbeiro_id` (UUID, FK -> `barbeiros.id`)
*   `dia_semana` (int): 0 (Domingo) a 6 (Sábado).
*   `inicio` (time): Horário de início (ex: `09:00`).
*   `fim` (time): Horário de fim (ex: `19:00`).
*   `inicio_almoco` (time)
*   `fim_almoco` (time)
*   `trabalha` (boolean): Se atende neste dia.

### 4. `servicos`
Catálogo de serviços.
*   `id` (UUID, PK)
*   `barbearia_id` (UUID, FK -> `barbearias.id`)
*   `nome`: Nome do serviço (ex: "Corte Social").
*   `preco`: Valor.
*   `duracao`: Tempo em minutos.

### 5. `clientes`
Base de clientes da barbearia.
*   `id` (UUID, PK)
*   `user_id` (UUID, FK -> `auth.users`, UNIQUE): **CRÍTICO.** Vínculo com o sistema de Auth do Supabase. Permite que o cliente faça login e veja seu histórico.
*   `barbearia_id` (UUID, FK -> `barbearias.id`)
*   `nome`
*   `email`
*   `telefone`: Usado para contato via WhatsApp.

### 6. `agendamentos`
Tabela central de reservas.
*   `id` (UUID, PK)
*   `barbearia_id` (UUID, FK -> `barbearias.id`)
*   `cliente_id` (UUID, FK -> `clientes.id`, Nullable): Se nulo, foi um agendamento manual sem cadastro.
*   `data_hora` (timestamptz): Momento do agendamento (UTC).
*   `status`: 'agendado', 'concluido', 'cancelado', 'faltou'.
*   `cliente_nome`: Backup do nome (para agendamentos sem `cliente_id`).
*   `cliente_telefone`: Backup do telefone.

## Row Level Security (RLS)
*   **Público:** Leitura permitida para `barbeiros`, `horarios_trabalho`, `servicos`.
*   **Autenticado (Clientes):**
    *   `clientes`: Pode ler e editar apenas seu próprio registro (`auth.uid() = user_id`).
    *   `agendamentos`: Pode ler seus próprios agendamentos (`cliente_id` vinculado ao seu `user_id`).
    *   `agendamentos` (Insert): Pode criar agendamentos para si mesmo.
*   **Admin (Barbeiros):** Acesso total aos dados da sua `barbearia_id`.
