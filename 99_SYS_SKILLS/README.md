# 99_SYS_SKILLS

Skills de agentes de IA organizadas por plataforma. Cada skill e um diretorio contendo um `SKILL.md` com instrucoes que o agente carrega ao ativar a skill.

## Estrutura

```
99_SYS_SKILLS/
├── 00_CORE_SHARED/        # 6 skills universais (funcionam em qualquer agente)
├── 01_AGENT_CLAUDE/       # 17 skills otimizadas para Claude Code
├── 02_AGENT_ANTIGRAVITY/  # 57 skills para Antigravity/Gemini (maior colecao)
└── README.md              # Este arquivo
```

## Ativacao de Skills

Cada skill possui um arquivo `SKILL.md` na raiz do seu diretorio. Para ativar:

1. Navegue ate a skill desejada
2. Leia o `SKILL.md` para carregar as instrucoes
3. Siga o protocolo definido no arquivo

Invocacao por nome: `@[nome-da-skill]` ou `/nome-da-skill`

## Hierarquia

| Prefixo | Escopo | Descricao |
|---------|--------|-----------|
| `00_`   | Compartilhado | Skills que funcionam em qualquer agente |
| `01_`   | Claude Code   | Skills especificas para Claude Code CLI |
| `02_`   | Antigravity   | Skills para Antigravity IDE / Gemini CLI |

## Formato de Skill

Cada skill segue o padrao Agent Skills:
- `SKILL.md` (obrigatorio) - Frontmatter YAML + instrucoes Markdown
- `scripts/` (opcional) - Scripts executaveis
- `references/` (opcional) - Documentacao de referencia
- `resources/` ou `templates/` (opcional) - Assets e templates
