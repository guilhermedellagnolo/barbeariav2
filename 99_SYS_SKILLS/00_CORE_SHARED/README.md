# 00_CORE_SHARED

Skills universais que funcionam em qualquer agente de IA (Claude, Antigravity, Gemini, Cursor, Codex).

## Skills Disponiveis (6)

| Skill | Invocacao | Descricao |
|-------|-----------|-----------|
| design-md | `@[design-md]` | Criar documentos de design em Markdown estruturado |
| enhance-prompt | `@[enhance-prompt]` | Melhorar e otimizar prompts para maior eficacia |
| react-components | `@[react-components]` | Criar componentes React com arquitetura padronizada |
| remotion | `@[remotion]` | Criar videos programaticamente com React (Remotion) |
| shadcn-ui | `@[shadcn-ui]` | Construir interfaces com shadcn/ui, Tailwind e Radix |
| stitch-loop | `@[stitch-loop]` | Loop de desenvolvimento iterativo com handoff entre agentes |

## Estrutura Interna de Cada Skill

```
skill-name/
├── SKILL.md        # Instrucoes principais (obrigatorio)
├── README.md       # Descricao para humanos
├── examples/       # Exemplos de uso
├── resources/      # Templates e referencias
└── scripts/        # Scripts auxiliares
```
