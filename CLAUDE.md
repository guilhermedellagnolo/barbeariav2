# Diretrizes do Sistema - SaaS Barbearia

## Status Atual
O sistema está funcional e em fase de AUDITORIA FINAL. Testes de concorrência e regras de negócio básicas já foram validados. 

## Stack Tecnológica
- Front-end: React, TailwindCSS
- Back-end/Database: Supabase (PostgreSQL)
- Estrutura: Monorepo (app do barbeiro e site do cliente)

## Regras de Operação da IA (Modo Auditoria)
1. READ-ONLY: Você está proibido de modificar, apagar ou reescrever qualquer arquivo do projeto sem permissão explícita.
2. FOCO DA ANÁLISE: Mapear o fluxo de dados, explicar a interação dos componentes e apontar vulnerabilidades ocultas de performance ou segurança (especialmente no isolamento de dados do Supabase para o modelo Multi-tenant).
3. SEM OVERENGINEERING: Não sugira novas bibliotecas se o sistema atual já resolve o problema.