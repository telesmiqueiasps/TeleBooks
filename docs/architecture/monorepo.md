# Arquitetura do Monorepo — TeleBooks

## Estrutura de Diretórios
```
telebooks/
├── apps/
│   ├── web/           # Frontend Next.js (TypeScript, PWA)
│   └── api/           # Backend FastAPI (Python, SQLAlchemy, Alembic)
├── packages/
│   ├── ui/            # Design system compartilhado e componentes
│   ├── types/         # Tipos TypeScript compartilhados
│   ├── validation/    # Schemas de validação Zod e contratos
│   └── config/        # Configurações TypeScript e ferramentas
├── database/
│   ├── migrations/    # Scripts versionados de migração
│   └── seeds/         # Dados iniciais para desenvolvimento
├── docs/              # Documentações técnicas e de produto
├── scripts/           # Scripts utilitários de desenvolvimento/deploy
├── .github/workflows/ # Workflows de CI/CD
├── docker-compose.yml # Ambiente local (PostgreSQL)
├── package.json       # Scripts raiz
├── pnpm-workspace.yaml# Definição dos workspaces pnpm
└── README.md
```

## Separação de Responsabilidades
- **apps/web**: Interface do usuário renderizada com Next.js (App Router). Consome a API e lida com Supabase Auth no cliente de forma restrita (chave pública anônima).
- **apps/api**: Lógica de backend e regras de negócio com FastAPI e SQLAlchemy. Possui acesso seguro a chaves administrativas (`SUPABASE_SERVICE_ROLE_KEY`) e conexão direta ao PostgreSQL.
- **packages/types**: Garante que o frontend e as validações compartilhem exatamente os mesmos contratos de dados.
- **packages/validation**: Centraliza validações de formulário e payload de entrada.
- **packages/ui**: Componentes de interface reutilizáveis com estética editorial.

## Regra Arquitetural de Segurança
O frontend **nunca** deve conter credenciais privilegiadas. Chaves de serviço e senhas mestras ficam estritamente no backend e em variáveis de ambiente seguras.
