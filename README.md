# TeleBooks 📚

> **"Minha biblioteca, do meu jeito."**  
> Plataforma web e PWA para catalogar, organizar, acompanhar e visualizar sua biblioteca pessoal de maneira rápida, bonita e flexível. Uma experiência editorial moderna, minimalista e rápida.

---

## 🏛️ Arquitetura e Stack Técnica

O projeto é estruturado como um monorepo com workspaces gerenciados pelo **pnpm**:

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, PWA
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.x, Alembic
- **Banco de Dados & Autenticação**: Supabase PostgreSQL (com RLS rigoroso), Supabase Auth, Supabase Storage
- **Deploy**: Netlify (Web) + Render (API)
- **CI/CD**: GitHub Actions

---

## 📂 Estrutura do Monorepo

```
telebooks/
├── apps/
│   ├── web/               # Aplicação Next.js (Frontend & PWA)
│   └── api/               # API REST em FastAPI (Backend)
├── packages/
│   ├── ui/                # Design system compartilhado e componentes reutilizáveis
│   ├── types/             # Definições de tipos TypeScript compartilhadas
│   ├── validation/        # Schemas de validação Zod e contratos
│   └── config/            # Configurações TypeScript e ferramentas
├── database/
│   ├── migrations/        # Scripts versionados de migração do banco
│   └── seeds/             # Dados iniciais para desenvolvimento
├── docs/
│   ├── product/           # Visão de produto e princípios de UX
│   ├── architecture/      # Arquitetura e decisões técnicas
│   └── api/               # Documentação das rotas da API
├── scripts/               # Scripts auxiliares de ambiente
├── .github/workflows/     # Workflows de CI (Lint, Typecheck, Build)
├── docker-compose.yml     # PostgreSQL local para desenvolvimento
├── pnpm-workspace.yaml    # Configuração dos workspaces do pnpm
└── README.md
```

---

## ⚙️ Pré-requisitos

- **Node.js** >= 20.x (Recomendado v22+)
- **pnpm** >= 10.x (Recomendado v12+)
- **Python** >= 3.12
- **Docker** (Opcional, para rodar PostgreSQL localmente)

---

## 🚀 Como Iniciar

### 1. Clonar e Instalar Dependências

```bash
# Instalar dependências de todos os workspaces
pnpm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e preencha conforme seu ambiente:

```bash
cp .env.example .env
```

> ⚠️ **Atenção de Segurança**: O frontend **nunca** deve possuir credenciais privilegiadas (`SUPABASE_SERVICE_ROLE_KEY` e senhas mestras de banco pertencem exclusivamente ao backend e às variáveis seguras do servidor).

### 3. Executar o Projeto em Desenvolvimento

```bash
# Executa todos os serviços simultaneamente
pnpm dev

# Ou execute serviços individualmente:
pnpm dev:web   # Inicia Next.js em http://localhost:3000
pnpm dev:api   # Inicia FastAPI em http://localhost:8000
```

---

## 🧪 Comandos Úteis

| Comando | Descrição |
| --- | --- |
| `pnpm dev` | Inicia os serviços em modo de desenvolvimento |
| `pnpm build` | Compila os pacotes e a aplicação web |
| `pnpm lint` | Executa a verificação de lint em todo o monorepo |
| `pnpm typecheck` | Executa a checagem estática de tipos com TypeScript |
| `pnpm format` | Formata o código com Prettier |

---

## 🌿 Estratégia de Branches (Git)

- `main` ➔ Produção
- `develop` ➔ Integração
- `feature/*` ➔ Novas funcionalidades
- `fix/*` ➔ Correções
- `refactor/*` ➔ Refatorações

---

## 🗺️ Roadmap de Desenvolvimento

- [x] **Etapa 0** — Fundação do monorepo, padrões, lint, typecheck e CI
- [ ] **Etapa 1** — Frontend, Design System e Shell da aplicação
- [ ] **Etapa 2** — Supabase, schema PostgreSQL inicial e RLS
- [ ] **Etapa 3** — Autenticação e sessões de usuário
- [ ] **Etapa 4** — Backend FastAPI modular
- [ ] **Etapa 5** — CRUD de livros e catálogo bibliográfico
- [ ] **Etapa 6** — Minha Biblioteca (Grid, Lista, Estante)
- [ ] **Etapa 7** — Página de detalhes do livro
- [ ] **Etapa 8** — Coleções e organização
- [ ] **Etapa 9** — Leitura e progresso
- [ ] **Etapa 10** — Dashboard e estatísticas
- [ ] **Etapa 11** — PWA e otimizações mobile
- [ ] **Etapa 12** — Integração com APIs externas de busca e ISBN
- [ ] **Etapa 13** — Importação e exportação de biblioteca
- [ ] **Etapa 14** — Hardening e auditoria de segurança
- [ ] **Etapa 15** — Performance e otimização Core Web Vitals
- [ ] **Etapa 16** — Observabilidade, Sentry e produção
- [ ] **Etapa 17** — Estratégia de testes automatizados
- [ ] **Etapa 18** — Beta privado
- [ ] **Etapa 19** — Fundação social futura
