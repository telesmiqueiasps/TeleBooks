# TELEBOOKS
## Especificação completa do produto, arquitetura e plano de desenvolvimento

> *Biblioteca pessoal • Organização • Leitura • Estatísticas • PWA • futura rede social*

| Propriedade | Valor |
| :--- | :--- |
| **Produto** | TeleBooks |
| **Tipo** | Web App / PWA para leitores |
| **Arquitetura** | Monorepo |
| **Stack principal** | Next.js + TypeScript + FastAPI + Supabase |
| **Deploy** | Netlify + Render + Supabase |

---

## 1. Visão do produto

O TeleBooks será uma plataforma focada em leitores que desejam catalogar, organizar, acompanhar e visualizar sua biblioteca pessoal de maneira rápida, bonita e flexível. O produto deve parecer uma experiência editorial moderna, e não um sistema administrativo.

### Princípio central:
> **“Minha biblioteca, do seu jeito.”**

### Objetivos
- Permitir que o usuário saiba exatamente quais livros possui.
- Organizar livros por autor, editora, coleção, gênero, tags, status, cor e outros critérios.
- Permitir cadastro manual e busca/importação de dados bibliográficos.
- Acompanhar leituras, metas, páginas e histórico.
- Exibir estatísticas pessoais de forma visual.
- Funcionar muito bem no desktop e no celular.
- Ser instalável como PWA.
- Criar uma base arquitetural pronta para uma futura rede social de leitores.

### O que o TeleBooks NÃO deve ser no início
- Uma rede social complexa no MVP.
- Um sistema cheio de telas administrativas.
- Uma cópia de Goodreads ou Skoob.
- Um CRUD visualmente genérico.
- Uma aplicação pesada que sacrifica velocidade por efeitos.

---

## 2. Princípios de produto e UX

- **Performance é requisito funcional:** telas principais devem abrir rapidamente.
- **Mobile-first** e responsivo desde o primeiro componente.
- **A capa dos livros** é parte da experiência visual.
- **Poucas ações por tela**, hierarquia visual clara.
- **Animações curtas, suaves e funcionais;** nunca animação por decoração.
- **Estados de loading** devem usar skeletons, não telas brancas.
- **Erros devem ser compreensíveis** para usuários comuns.
- **A interface deve ser acessível**, com bom contraste, teclado e leitores de tela.
- **Dark mode** deve ser nativo desde a base do design system.

---

## 3. Funcionalidades por versão

### MVP / V1
- Cadastro, login, recuperação de acesso.
- Perfil básico.
- Biblioteca pessoal.
- CRUD de livros.
- Autores, editoras, gêneros e coleções.
- Busca, filtros e ordenação.
- Status: quero ler, lendo, lido, pausado, abandonado.
- Nota pessoal.
- Notas e citações privadas.
- Data de início e conclusão.
- Dashboard.
- Estatísticas básicas.
- Modo estante.
- PWA e instalação no celular.
- Tema claro/escuro.

### V1.5
- Scanner de ISBN/código de barras.
- Busca automática de dados bibliográficos.
- Importação de biblioteca.
- Exportação CSV/JSON.
- Backup/exportação de dados.
- Estatísticas avançadas.
- Listas personalizadas.
- Compartilhamento de listas.

### V2 Social
- Perfil público.
- Seguir leitores.
- Feed.
- Listas públicas.
- Resenhas.
- Citações públicas.
- Curtidas e comentários.
- Notificações.

### V3 Comunidade
- Clubes de leitura.
- Desafios.
- Metas coletivas.
- Comunidades por tema.
- Recomendações.
- Descoberta de leitores e livros.

---

## 4. Stack técnica oficial

| Camada | Tecnologia |
| :--- | :--- |
| **Frontend** | Next.js + TypeScript |
| **UI** | Tailwind CSS + componentes próprios/reutilizáveis |
| **Estado** | Preferir Server Components e estado local; usar Zustand somente quando necessário |
| **Formulários** | React Hook Form + Zod |
| **Backend** | Python + FastAPI |
| **ORM** | SQLAlchemy 2.x |
| **Migrações** | Alembic |
| **Banco** | Supabase PostgreSQL |
| **Auth** | Supabase Auth |
| **Arquivos** | Supabase Storage / Cloudflare R2 |
| **Deploy frontend** | Netlify |
| **Deploy API** | Render |
| **Código** | GitHub |
| **Monorepo** | pnpm workspaces |
| **PWA** | Web App Manifest + Service Worker |
| **Observabilidade** | Sentry |
| **Analytics de produto** | PostHog, se necessário |
| **CI** | GitHub Actions |

---

## 5. Estrutura do monorepo

```text
telebooks/
├── apps/
│   ├── web/                # Next.js
│   └── api/                # FastAPI
├── packages/
│   ├── ui/                 # Design system compartilhado
│   ├── types/              # Tipos compartilhados
│   ├── validation/         # Schemas/contratos
│   └── config/             # Configurações compartilhadas
├── database/
│   ├── migrations/
│   └── seeds/
├── docs/
│   ├── product/
│   ├── architecture/
│   └── api/
├── scripts/
├── .github/
│   └── workflows/
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## 6. Arquitetura de produção

```text
Usuário
  │
  ├── HTTPS / Browser / PWA
  ▼
Netlify
  │
  ├── Next.js
  ├── CDN
  └── Assets
  │
  ▼
Render
  │
  └── FastAPI
  │
  ├── Supabase Auth
  ├── Supabase PostgreSQL
  └── Supabase Storage

GitHub
  ├── CI/CD
  └── versionamento

Sentry
  └── erros e performance
```

> **Regra arquitetural:** o frontend nunca deve possuir credenciais privilegiadas. Segredos ficam apenas no backend e nas variáveis de ambiente do ambiente correspondente.

---

## 7. Modelo de dados

### Entidades principais:
- `profiles`
- `books`
- `book_editions`
- `authors`
- `publishers`
- `genres`
- `collections`
- `user_books`
- `user_collections`
- `user_tags`
- `user_book_tags`
- `reading_sessions`
- `user_notes`
- `user_quotes`
- `user_reviews`
- `reading_lists`
- `reading_list_books`
- `follows` (futuro)
- `posts` (futuro)
- `comments` (futuro)
- `likes` (futuro)
- `notifications` (futuro)

### Relacionamento conceitual

```text
profiles
  │
  └── user_books ───────── books
        │                    ├── authors
        ├── reading_sessions ├── publishers
        ├── user_notes       ├── genres
        ├── user_quotes      └── book_editions
        └── user_reviews

profiles
  └── collections / lists
```

### Regra importante: livro global x livro do usuário
O cadastro bibliográfico de um livro deve ser uma entidade global. O vínculo do usuário com esse livro fica em `user_books`. Assim, dois usuários podem ter o mesmo livro sem duplicar a entidade bibliográfica.

```text
books:
id | title | subtitle | description | isbn...

user_books:
id | user_id | book_id | status | rating | started_at | finished_at...
```

---

## 8. Campos recomendados para `books`

- `id` (UUID)
- `title`
- `subtitle`
- `description`
- `isbn10`
- `isbn13`
- `language`
- `page_count`
- `publication_date`
- `publisher_id`
- `cover_url`
- `thumbnail_url`
- `created_at`
- `updated_at`

---

## 9. Campos recomendados para `user_books`

- `id`
- `user_id`
- `book_id`
- `status`
- `rating`
- `owned`
- `favorite`
- `purchase_date`
- `purchase_price`
- `started_at`
- `finished_at`
- `current_page`
- `personal_color`
- `shelf_position`
- `private_notes`
- `created_at`
- `updated_at`

---

## 10. API

```http
/api/v1/auth
/api/v1/profile
/api/v1/books
/api/v1/authors
/api/v1/publishers
/api/v1/genres
/api/v1/collections
/api/v1/library
/api/v1/reading
/api/v1/quotes
/api/v1/notes
/api/v1/reviews
/api/v1/lists
/api/v1/statistics

# Futuro
/api/v1/social/feed
/api/v1/social/follows
/api/v1/social/posts
/api/v1/social/comments
/api/v1/social/likes
/api/v1/notifications
```

---

## 11. Design System

- **Tipografia:** aparência editorial e excelente legibilidade (**Sora** para títulos e **Inter** para interface).
- **Paleta base clara:** fundo próximo de branco quente (`#F8FAFC`); superfícies brancas; texto quase preto (`#0F172A`).
- **Paleta dark:** fundo grafite profundo (`#0B0F1A`), evitando preto absoluto.
- **Azul:** cor de ação/identidade (`#007BFF`), sem transformar tudo em azul.
- **Cards discretos:** bordas suaves e espaçamento generoso.
- **Capa do livro:** deve receber destaque visual com sombras realistas e lombada.
- **Botões primários:** claros e consistentes.
- **Ícones simples:** preferencialmente Lucide.
- **Microinterações:** entre 150 e 250ms.
- **Sem excessos:** não utilizar gradientes excessivos, glassmorphism exagerado ou efeitos que prejudiquem performance.

---

## 12. Principais telas

- **Landing page:** Apresentação do TeleBooks, benefícios, screenshots/mockups e CTA.
- **Login/Cadastro:** Fluxo simples e rápido.
- **Dashboard:** Resumo da biblioteca, leitura atual, recentes e estatísticas.
- **Minha Biblioteca:** Grid/lista/estante com filtros.
- **Livro:** Detalhes bibliográficos + dados pessoais do usuário.
- **Adicionar Livro:** Busca, cadastro manual e futuramente ISBN.
- **Coleções:** Agrupamentos personalizados.
- **Autores:** Navegação por autor.
- **Editoras:** Navegação por editora.
- **Leitura:** Livros em andamento, metas e histórico.
- **Estatísticas:** Gráficos e indicadores.
- **Perfil:** Dados do usuário; futuramente público/social.
- **Configurações:** Conta, aparência, privacidade, exportação e PWA.

---

## 13. Modo Estante

O Modo Estante é um diferencial visual. O usuário pode visualizar seus livros como uma estante virtual, com capas, agrupamentos e ordenação. Deve continuar sendo acessível e funcional, e não apenas uma animação.

- Agrupamento por coleção.
- Ordenação por título, autor, aquisição ou posição.
- Modo compacto e modo visual.
- Clique abre a ficha do livro.
- Responsivo para telas pequenas.
- Virtualização quando a biblioteca for grande.

---

## 14. Performance

- Não carregar a biblioteca inteira de uma vez.
- Paginar ou virtualizar listas grandes.
- Usar imagens otimizadas e tamanhos adequados.
- Lazy load para conteúdo secundário.
- Prefetch apenas onde fizer sentido.
- Evitar bibliotecas JavaScript pesadas sem necessidade.
- Medir Core Web Vitals.
- Skeletons para transições de carregamento.
- Índices no PostgreSQL para consultas frequentes.
- Evitar N+1 queries no backend.
- Cachear dados públicos e relativamente estáveis.
- Separar operações rápidas das operações demoradas.

---

## 15. PWA

- Manifest com nome, ícone, descrição, tema e modo standalone.
- Ícones em múltiplas resoluções.
- Service Worker.
- Página de fallback offline.
- Cache de assets estáticos.
- Prompt de instalação não intrusivo.
- Layout e navegação específicos para touch.
- Meta tags e viewport adequados.
- Testar instalação no Android e iOS.

---

## 16. Segurança

- Supabase Auth para autenticação.
- RLS no PostgreSQL para dados pertencentes ao usuário.
- Nunca confiar em `user_id` enviado pelo frontend.
- Validar todos os inputs no backend.
- Zod no frontend e Pydantic no backend.
- Rate limiting em endpoints sensíveis.
- CORS restritivo em produção.
- Secrets apenas em environment variables.
- Logs sem tokens, senhas ou informações privadas.
- Uploads com validação de tipo e tamanho.
- Políticas de Storage separadas por usuário.

---

## 17. Estratégia de Git

```text
main      -> produção
develop   -> integração
feature/* -> novas funcionalidades
fix/*     -> correções
refactor/*-> refatorações
```

- Commits pequenos e sem misturar funcionalidades.
- Pull Request mesmo quando o desenvolvedor for apenas você, para manter histórico.
- CI deve rodar lint, typecheck, testes e build.
- Nunca commitar `.env`.
- Nunca editar banco de produção manualmente sem migração versionada.

---

## 18. Variáveis de ambiente

```env
# WEB
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=

# API
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CORS_ORIGINS=
SENTRY_DSN=

# Nunca colocar SERVICE_ROLE_KEY no frontend.
```

*Os nomes exatos podem ser adaptados à implementação, mas a separação entre variáveis públicas e secretas deve ser preservada.*

---

## 19. Roadmap técnico recomendado

1. **0 — Fundação:** monorepo, padrões, lint, typecheck, CI e documentação.
2. **1 — Design system e shell da aplicação.**
3. **2 — Supabase, Auth, schema inicial e RLS.**
4. **3 — API FastAPI, SQLAlchemy e Alembic.**
5. **4 — Biblioteca:** livros, autores, editoras e gêneros.
6. **5 — Busca, filtros, ordenação e paginação.**
7. **6 — Coleções, tags e modo estante.**
8. **7 — Leitura, status, notas, citações e avaliações.**
9. **8 — Dashboard e estatísticas.**
10. **9 — PWA, instalação e otimizações mobile.**
11. **10 — Importação/exportação e ISBN.**
12. **11 — Observabilidade, segurança e hardening.**
13. **12 — Beta privado.**
14. **13 — Social v2.**

---

## 20. Prompts prontos para IA de desenvolvimento

> **Regra de uso:** executar um prompt por etapa. Não pedir para a IA construir todo o projeto de uma vez. Após cada etapa, rodar testes, revisar diff e fazer commit.

### Etapa 0 — Fundação do monorepo
```markdown
PROMPT PARA IA
Você está desenvolvendo o TeleBooks, uma plataforma web/PWA para leitores.
Objetivo: biblioteca pessoal rápida, elegante e visual, com futura evolução para rede social.
Stack oficial: Next.js + TypeScript no frontend, FastAPI + Python no backend, SQLAlchemy + Alembic, Supabase PostgreSQL/Auth/Storage, Netlify para frontend, Render para API, monorepo com pnpm.
Prioridades: performance, responsividade, acessibilidade, segurança, código simples e manutenível.
Não introduza outra stack sem justificar. Não implemente funcionalidades fora do escopo desta etapa.
Antes de alterar arquivos, inspecione a estrutura existente e preserve o que já funciona.
Ao final: liste arquivos alterados, decisões, comandos executados, testes e pendências.

Crie a fundação do monorepo do TeleBooks. Estruture apps/web, apps/api, packages/ui, packages/types, packages/validation, packages/config, database e docs.
Configure pnpm workspaces, scripts raiz, .gitignore, editorconfig, README inicial e CI básica no GitHub Actions para lint/typecheck/build quando aplicável.
Não crie funcionalidades de negócio ainda.
```

### Etapa 1 — Frontend e Design System
```markdown
PROMPT PARA IA
Você está desenvolvendo o TeleBooks, uma plataforma web/PWA para leitores.
Objetivo: biblioteca pessoal rápida, elegante e visual, com futura evolução para rede social.
Stack oficial: Next.js + TypeScript no frontend, FastAPI + Python no backend, SQLAlchemy + Alembic, Supabase PostgreSQL/Auth/Storage, Netlify para frontend, Render para API, monorepo com pnpm.
Prioridades: performance, responsividade, acessibilidade, segurança, código simples e manutenível.
Não introduza outra stack sem justificar. Não implemente funcionalidades fora do escopo desta etapa.
Antes de alterar arquivos, inspecione a estrutura existente e preserve o que já funciona.
Ao final: liste arquivos alterados, decisões, comandos executados, testes e pendências.

Implemente o shell inicial do frontend TeleBooks. Crie design tokens, tipografia, espaçamento, cores light/dark, botões, inputs, cards, badges, modais, dropdowns, skeletons e componentes de navegação reutilizáveis. Crie layout responsivo desktop/mobile e uma home interna de exemplo.
O resultado deve ter estética editorial premium, minimalista e rápida, sem aparência de ERP.
```

### Etapa 2 — Supabase, schema e RLS
```markdown
PROMPT PARA IA
Você está desenvolvendo o TeleBooks, uma plataforma web/PWA para leitores.
Objetivo: biblioteca pessoal rápida, elegante e visual, com futura evolução para rede social.
Stack oficial: Next.js + TypeScript no frontend, FastAPI + Python no backend, SQLAlchemy + Alembic, Supabase PostgreSQL/Auth/Storage, Netlify para frontend, Render para API, monorepo com pnpm.
Prioridades: performance, responsividade, acessibilidade, segurança, código simples e manutenível.
Não introduza outra stack sem justificar. Não implemente funcionalidades fora do escopo desta etapa.
Antes de alterar arquivos, inspecione a estrutura existente e preserve o que já funciona.
Ao final: liste arquivos alterados, decisões, comandos executados, testes e pendências.

Projete e implemente o schema inicial do PostgreSQL no Supabase para profiles, books, book_editions, authors, publishers, genres, collections, user_books, user_collections, user_tags, user_book_tags, reading_sessions, user_notes, user_quotes, user_reviews, reading_lists e reading_list_books.
Crie migrations versionadas, índices, constraints, foreign keys e RLS.
O princípio fundamental é separar entidade global do livro do vínculo do usuário em user_books.
```

### Etapa 3 — Autenticação
```markdown
PROMPT PARA IA
Você está desenvolvendo o TeleBooks, uma plataforma web/PWA para leitores.
Objetivo: biblioteca pessoal rápida, elegante e visual, com futura evolução para rede social.
Stack oficial: Next.js + TypeScript no frontend, FastAPI + Python no backend, SQLAlchemy + Alembic, Supabase PostgreSQL/Auth/Storage, Netlify para frontend, Render para API, monorepo com pnpm.
Prioridades: performance, responsividade, acessibilidade, segurança, código simples e manutenível.
Não introduza outra stack sem justificar. Não implemente funcionalidades fora do escopo desta etapa.
Antes de alterar arquivos, inspecione a estrutura existente e preserve o que já funciona.
Ao final: liste arquivos alterados, decisões, comandos executados, testes e pendências.

Implemente autenticação usando Supabase Auth. Crie cadastro, login, logout, recuperação de senha, sessão persistente, proteção de rotas e criação/atualização de profile.
Garanta que dados privados só sejam acessíveis ao próprio usuário.
Trate loading, erros e sessão expirada de maneira elegante.
```

### Etapa 4 — Backend FastAPI
```markdown
PROMPT PARA IA
Você está desenvolvendo o TeleBooks, uma plataforma web/PWA para leitores.
Objetivo: biblioteca pessoal rápida, elegante e visual, com futura evolução para rede social.
Stack oficial: Next.js + TypeScript no frontend, FastAPI + Python no backend, SQLAlchemy + Alembic, Supabase PostgreSQL/Auth/Storage, Netlify para frontend, Render para API, monorepo com pnpm.
Prioridades: performance, responsividade, acessibilidade, segurança, código simples e manutenível.
Não introduza outra stack sem justificar. Não implemente funcionalidades fora do escopo desta etapa.
Antes de alterar arquivos, inspecione a estrutura existente e preserve o que já funciona.
Ao final: liste arquivos alterados, decisões, comandos executados, testes e pendências.

Implemente a API FastAPI com arquitetura modular. Configure settings por ambiente, conexão com PostgreSQL, SQLAlchemy 2.x, Alembic, tratamento global de erros, validação Pydantic, CORS, health check e autenticação/autorização.
Crie uma estrutura preparada para crescer sem virar um monólito desorganizado.
```

### Etapa 5 — CRUD de livros
```markdown
PROMPT PARA IA
Você está desenvolvendo o TeleBooks, uma plataforma web/PWA para leitores.
Objetivo: biblioteca pessoal rápida, elegante e visual, com futura evolução para rede social.
Stack oficial: Next.js + TypeScript no frontend, FastAPI + Python no backend, SQLAlchemy + Alembic, Supabase PostgreSQL/Auth/Storage, Netlify para frontend, Render para API, monorepo com pnpm.
Prioridades: performance, responsividade, acessibilidade, segurança, código simples e manutenível.
Não introduza outra stack sem justificar. Não implemente funcionalidades fora do escopo desta etapa.
Antes de alterar arquivos, inspecione a estrutura existente e preserve o que já funciona.
Ao final: liste arquivos alterados, decisões, comandos executados, testes e pendências.

Implemente no backend e frontend o CRUD de livros e entidades relacionadas: autores, editoras e gêneros.
O usuário deve poder criar, editar, visualizar e excluir seus vínculos de biblioteca.
Separe claramente dados bibliográficos globais de dados pessoais do usuário.
Implemente paginação e consultas eficientes.
```

### Etapa 6 — Minha Biblioteca
```markdown
PROMPT PARA IA
Você está desenvolvendo o TeleBooks, uma plataforma web/PWA para leitores.
Objetivo: biblioteca pessoal rápida, elegante e visual, com futura evolução para rede social.
Stack oficial: Next.js + TypeScript no frontend, FastAPI + Python no backend, SQLAlchemy + Alembic, Supabase PostgreSQL/Auth/Storage, Netlify para frontend, Render para API, monorepo com pnpm.
Prioridades: performance, responsividade, acessibilidade, segurança, código simples e manutenível.
Não introduza outra stack sem justificar. Não implemente funcionalidades fora do escopo desta etapa.
Antes de alterar arquivos, inspecione a estrutura existente e preserve o que já funciona.
Ao final: liste arquivos alterados, decisões, comandos executados, testes e pendências.

Crie a tela Minha Biblioteca com grid de capas, lista e modo estante.
Implemente busca, filtros, ordenação, paginação/virtualização e estados de loading/vazio/erro.
Filtros iniciais: status, autor, editora, coleção, gênero, favorito e avaliação.
A experiência deve continuar rápida com centenas ou milhares de livros.
```

### Etapa 7 — Página do livro
```markdown
PROMPT PARA IA
Você está desenvolvendo o TeleBooks, uma plataforma web/PWA para leitores.
Objetivo: biblioteca pessoal rápida, elegante e visual, com futura evolução para rede social.
Stack oficial: Next.js + TypeScript no frontend, FastAPI + Python no backend, SQLAlchemy + Alembic, Supabase PostgreSQL/Auth/Storage, Netlify para frontend, Render para API, monorepo com pnpm.
Prioridades: performance, responsividade, acessibilidade, segurança, código simples e manutenível.
Não introduza outra stack sem justificar. Não implemente funcionalidades fora do escopo desta etapa.
Antes de alterar arquivos, inspecione a estrutura existente e preserve o que já funciona.
Ao final: liste arquivos alterados, decisões, comandos executados, testes e pendências.

Crie uma página de detalhe de livro visualmente premium. Exiba capa, título, autor, editora, edição, ISBN, páginas, descrição e os dados pessoais do usuário: status, nota, favorito, datas de leitura, página atual, notas e citações.
A página deve ser responsiva e ter excelente hierarquia visual.
```

### Etapa 8 — Coleções e organização
```markdown
PROMPT PARA IA
Você está desenvolvendo o TeleBooks, uma plataforma web/PWA para leitores.
Objetivo: biblioteca pessoal rápida, elegante e visual, com futura evolução para rede social.
Stack oficial: Next.js + TypeScript no frontend, FastAPI + Python no backend, SQLAlchemy + Alembic, Supabase PostgreSQL/Auth/Storage, Netlify para frontend, Render para API, monorepo com pnpm.
Prioridades: performance, responsividade, acessibilidade, segurança, código simples e manutenível.
Não introduza outra stack sem justificar. Não implemente funcionalidades fora do escopo desta etapa.
Antes de alterar arquivos, inspecione a estrutura existente e preserve o que já funciona.
Ao final: liste arquivos alterados, decisões, comandos executados, testes e pendências.

Implemente coleções, tags, cores pessoais e organização customizada.
Permita criar, editar, excluir e reorganizar coleções. Adicione filtros e agrupamentos na biblioteca.
Evite duplicação de lógica entre coleção, tag e gênero.
```

### Etapa 9 — Leitura
```markdown
PROMPT PARA IA
Você está desenvolvendo o TeleBooks, uma plataforma web/PWA para leitores.
Objetivo: biblioteca pessoal rápida, elegante e visual, com futura evolução para rede social.
Stack oficial: Next.js + TypeScript no frontend, FastAPI + Python no backend, SQLAlchemy + Alembic, Supabase PostgreSQL/Auth/Storage, Netlify para frontend, Render para API, monorepo com pnpm.
Prioridades: performance, responsividade, acessibilidade, segurança, código simples e manutenível.
Não introduza outra stack sem justificar. Não implemente funcionalidades fora do escopo desta etapa.
Antes de alterar arquivos, inspecione a estrutura existente e preserve o que já funciona.
Ao final: liste arquivos alterados, decisões, comandos executados, testes e pendências.

Implemente o fluxo de leitura: quero ler, lendo, pausado, lido e abandonado.
Adicione início, conclusão, página atual e sessões de leitura quando fizer sentido.
Crie uma tela de leitura atual com progresso visual e histórico.
```

### Etapa 10 — Dashboard e estatísticas
```markdown
PROMPT PARA IA
Você está desenvolvendo o TeleBooks, uma plataforma web/PWA para leitores.
Objetivo: biblioteca pessoal rápida, elegante e visual, com futura evolução para rede social.
Stack oficial: Next.js + TypeScript no frontend, FastAPI + Python no backend, SQLAlchemy + Alembic, Supabase PostgreSQL/Auth/Storage, Netlify para frontend, Render para API, monorepo com pnpm.
Prioridades: performance, responsividade, acessibilidade, segurança, código simples e manutenível.
Não introduza outra stack sem justificar. Não implemente funcionalidades fora do escopo desta etapa.
Antes de alterar arquivos, inspecione a estrutura existente e preserve o que já funciona.
Ao final: liste arquivos alterados, decisões, comandos executados, testes e pendências.

Crie o dashboard do TeleBooks. Mostre total de livros, autores, editoras, livros lidos, livros em andamento, páginas lidas, leitura recente e livros adicionados recentemente.
Crie estatísticas úteis sem poluir a interface. Consultas devem ser agregadas no banco e não exigir carregar centenas de registros no navegador.
```

### Etapa 11 — PWA e mobile
```markdown
PROMPT PARA IA
Você está desenvolvendo o TeleBooks, uma plataforma web/PWA para leitores.
Objetivo: biblioteca pessoal rápida, elegante e visual, com futura evolução para rede social.
Stack oficial: Next.js + TypeScript no frontend, FastAPI + Python no backend, SQLAlchemy + Alembic, Supabase PostgreSQL/Auth/Storage, Netlify para frontend, Render para API, monorepo com pnpm.
Prioridades: performance, responsividade, acessibilidade, segurança, código simples e manutenível.
Não introduza outra stack sem justificar. Não implemente funcionalidades fora do escopo desta etapa.
Antes de alterar arquivos, inspecione a estrutura existente e preserve o que já funciona.
Ao final: liste arquivos alterados, decisões, comandos executados, testes e pendências.

Transforme o frontend em PWA completo. Configure manifest, ícones, service worker, cache seguro de assets, fallback offline e experiência de instalação.
Revise todas as telas para mobile-first, touch targets, navegação inferior quando apropriado, safe areas e performance em conexão móvel.
```

### Etapa 12 — Busca externa e ISBN
```markdown
PROMPT PARA IA
Você está desenvolvendo o TeleBooks, uma plataforma web/PWA para leitores.
Objetivo: biblioteca pessoal rápida, elegante e visual, com futura evolução para rede social.
Stack oficial: Next.js + TypeScript no frontend, FastAPI + Python no backend, SQLAlchemy + Alembic, Supabase PostgreSQL/Auth/Storage, Netlify para frontend, Render para API, monorepo com pnpm.
Prioridades: performance, responsividade, acessibilidade, segurança, código simples e manutenível.
Não introduza outra stack sem justificar. Não implemente funcionalidades fora do escopo desta etapa.
Antes de alterar arquivos, inspecione a estrutura existente e preserve o que já funciona.
Ao final: liste arquivos alterados, decisões, comandos executados, testes e pendências.

Projete uma camada de integração para busca de livros por título, autor e ISBN.
A integração externa deve ficar isolada em um serviço/adaptador para poder trocar de provedor.
Implemente fluxo: pesquisar -> mostrar resultados -> usuário confirmar -> criar/reutilizar livro.
Não duplique livros quando ISBN ou outra identificação confiável já existir.
```

### Etapa 13 — Importação e exportação
```markdown
PROMPT PARA IA
Você está desenvolvendo o TeleBooks, uma plataforma web/PWA para leitores.
Objetivo: biblioteca pessoal rápida, elegante e visual, com futura evolução para rede social.
Stack oficial: Next.js + TypeScript no frontend, FastAPI + Python no backend, SQLAlchemy + Alembic, Supabase PostgreSQL/Auth/Storage, Netlify para frontend, Render para API, monorepo com pnpm.
Prioridades: performance, responsividade, acessibilidade, segurança, código simples e manutenível.
Não introduza outra stack sem justificar. Não implemente funcionalidades fora do escopo desta etapa.
Antes de alterar arquivos, inspecione a estrutura existente e preserve o que já funciona.
Ao final: liste arquivos alterados, decisões, comandos executados, testes e pendências.

Implemente importação e exportação da biblioteca. Comece por CSV e JSON.
Valide arquivos, mostre preview, erros por linha e resultado da importação.
Permita exportar os dados do usuário em formato legível e estruturado.
Não exponha dados de outros usuários.
```

### Etapa 14 — Segurança e hardening
```markdown
PROMPT PARA IA
Você está desenvolvendo o TeleBooks, uma plataforma web/PWA para leitores.
Objetivo: biblioteca pessoal rápida, elegante e visual, com futura evolução para rede social.
Stack oficial: Next.js + TypeScript no frontend, FastAPI + Python no backend, SQLAlchemy + Alembic, Supabase PostgreSQL/Auth/Storage, Netlify para frontend, Render para API, monorepo com pnpm.
Prioridades: performance, responsividade, acessibilidade, segurança, código simples e manutenível.
Não introduza outra stack sem justificar. Não implemente funcionalidades fora do escopo desta etapa.
Antes de alterar arquivos, inspecione a estrutura existente e preserve o que já funciona.
Ao final: liste arquivos alterados, decisões, comandos executados, testes e pendências.

Faça uma auditoria de segurança no projeto. Verifique RLS, autorização no backend, CORS, validação de inputs, uploads, secrets, rate limiting, logs, exposição de endpoints, SQL injection, XSS, CSRF quando aplicável e permissões de Storage.
Corrija vulnerabilidades encontradas sem alterar o comportamento funcional desnecessariamente.
```

### Etapa 15 — Performance
```markdown
PROMPT PARA IA
Você está desenvolvendo o TeleBooks, uma plataforma web/PWA para leitores.
Objetivo: biblioteca pessoal rápida, elegante e visual, com futura evolução para rede social.
Stack oficial: Next.js + TypeScript no frontend, FastAPI + Python no backend, SQLAlchemy + Alembic, Supabase PostgreSQL/Auth/Storage, Netlify para frontend, Render para API, monorepo com pnpm.
Prioridades: performance, responsividade, acessibilidade, segurança, código simples e manutenível.
Não introduza outra stack sem justificar. Não implemente funcionalidades fora do escopo desta etapa.
Antes de alterar arquivos, inspecione a estrutura existente e preserve o que já funciona.
Ao final: liste arquivos alterados, decisões, comandos executados, testes e pendências.

Faça uma auditoria completa de performance do TeleBooks.
Analise bundle, renderização, queries, N+1, imagens, cache, paginação, virtualização, Core Web Vitals e chamadas duplicadas. Corrija os gargalos encontrados.
Não faça otimizações especulativas que aumentem muito a complexidade.
```

### Etapa 16 — Observabilidade e produção
```markdown
PROMPT PARA IA
Você está desenvolvendo o TeleBooks, uma plataforma web/PWA para leitores.
Objetivo: biblioteca pessoal rápida, elegante e visual, com futura evolução para rede social.
Stack oficial: Next.js + TypeScript no frontend, FastAPI + Python no backend, SQLAlchemy + Alembic, Supabase PostgreSQL/Auth/Storage, Netlify para frontend, Render para API, monorepo com pnpm.
Prioridades: performance, responsividade, acessibilidade, segurança, código simples e manutenível.
Não introduza outra stack sem justificar. Não implemente funcionalidades fora do escopo desta etapa.
Antes de alterar arquivos, inspecione a estrutura existente e preserve o que já funciona.
Ao final: liste arquivos alterados, decisões, comandos executados, testes e pendências.

Prepare o projeto para produção. Configure Sentry, health checks, logs estruturados, tratamento de exceções, métricas essenciais e documentação de deploy.
Crie checklist de produção para Netlify, Render e Supabase.
```

### Etapa 17 — Testes
```markdown
PROMPT PARA IA
Você está desenvolvendo o TeleBooks, uma plataforma web/PWA para leitores.
Objetivo: biblioteca pessoal rápida, elegante e visual, com futura evolução para rede social.
Stack oficial: Next.js + TypeScript no frontend, FastAPI + Python no backend, SQLAlchemy + Alembic, Supabase PostgreSQL/Auth/Storage, Netlify para frontend, Render para API, monorepo com pnpm.
Prioridades: performance, responsividade, acessibilidade, segurança, código simples e manutenível.
Não introduza outra stack sem justificar. Não implemente funcionalidades fora do escopo desta etapa.
Antes de alterar arquivos, inspecione a estrutura existente e preserve o que já funciona.
Ao final: liste arquivos alterados, decisões, comandos executados, testes e pendências.

Crie uma estratégia de testes para o TeleBooks.
Adicione testes unitários para regras de negócio, testes de API para endpoints críticos e testes de interface para fluxos essenciais: login, adicionar livro, editar livro, alterar status e visualizar biblioteca.
Priorize testes que evitem regressões.
```

### Etapa 18 — Beta
```markdown
PROMPT PARA IA
Você está desenvolvendo o TeleBooks, uma plataforma web/PWA para leitores.
Objetivo: biblioteca pessoal rápida, elegante e visual, com futura evolução para rede social.
Stack oficial: Next.js + TypeScript no frontend, FastAPI + Python no backend, SQLAlchemy + Alembic, Supabase PostgreSQL/Auth/Storage, Netlify para frontend, Render para API, monorepo com pnpm.
Prioridades: performance, responsividade, acessibilidade, segurança, código simples e manutenível.
Não introduza outra stack sem justificar. Não implemente funcionalidades fora do escopo desta etapa.
Antes de alterar arquivos, inspecione a estrutura existente e preserve o que já funciona.
Ao final: liste arquivos alterados, decisões, comandos executados, testes e pendências.

Prepare uma versão beta privada. Revise UX, estados vazios, mensagens de erro, responsividade, acessibilidade, segurança, performance e fluxo completo do usuário.
Não adicione novas features. O objetivo desta etapa é estabilizar e polir o que já existe.
Gere uma lista objetiva de bugs, riscos e melhorias antes do lançamento.
```

### Etapa 19 — Fundação social futura
```markdown
PROMPT PARA IA
Você está desenvolvendo o TeleBooks, uma plataforma web/PWA para leitores.
Objetivo: biblioteca pessoal rápida, elegante e visual, com futura evolução para rede social.
Stack oficial: Next.js + TypeScript no frontend, FastAPI + Python no backend, SQLAlchemy + Alembic, Supabase PostgreSQL/Auth/Storage, Netlify para frontend, Render para API, monorepo com pnpm.
Prioridades: performance, responsividade, acessibilidade, segurança, código simples e manutenível.
Não introduza outra stack sem justificar. Não implemente funcionalidades fora do escopo desta etapa.
Antes de alterar arquivos, inspecione a estrutura existente e preserve o que já funciona.
Ao final: liste arquivos alterados, decisões, comandos executados, testes e pendências.

Sem implementar ainda um feed completo, revise a arquitetura para garantir que o futuro TeleBooks Social possa adicionar profiles públicos, follows, posts, reviews, comments, likes, listas públicas e notificações sem refatoração estrutural grande.
Documente as decisões necessárias e crie somente migrations/modelos claramente justificados.
Não deixe o social aumentar a complexidade do MVP.
```

---

## 21. Prompt mestre para usar no início de cada sessão da IA

```markdown
Você está desenvolvendo o TeleBooks, uma plataforma web/PWA para leitores.
Objetivo: biblioteca pessoal rápida, elegante e visual, com futura evolução para rede social.
Stack oficial: Next.js + TypeScript no frontend, FastAPI + Python no backend, SQLAlchemy + Alembic, Supabase PostgreSQL/Auth/Storage, Netlify para frontend, Render para API, monorepo com pnpm.
Prioridades: performance, responsividade, acessibilidade, segurança, código simples e manutenível.
Não introduza outra stack sem justificar. Não implemente funcionalidades fora do escopo desta etapa.
Antes de alterar arquivos, inspecione a estrutura existente e preserve o que já funciona.
Ao final: liste arquivos alterados, decisões, comandos executados, testes e pendências.

Antes de começar:
1. Inspecione o estado atual do repositório.
2. Identifique o que já foi implementado.
3. Não recrie arquivos ou arquitetura que já existem sem necessidade.
4. Leia as migrations e componentes relacionados antes de alterar código.
5. Faça a menor alteração necessária para cumprir a tarefa.
6. Preserve compatibilidade com as etapas anteriores.
7. Rode testes, lint, typecheck e build aplicáveis.
8. Se encontrar problema fora do escopo, registre como pendência em vez de expandir a tarefa.
9. Ao final, entregue resumo, arquivos alterados, testes e próximo passo sugerido.
```

---

## 22. Prompt de auditoria antes de cada commit

```markdown
Revise minhas alterações atuais como um engenheiro sênior.
Procure:
- bugs;
- regressões;
- problemas de segurança;
- violações de RLS;
- N+1 queries;
- problemas de responsividade;
- acessibilidade;
- código duplicado;
- dependências desnecessárias;
- secrets expostos;
- problemas de tipagem;
- problemas de performance.

Não reescreva tudo. Aponte primeiro os problemas por prioridade.
Depois corrija somente os problemas relevantes e rode os testes.
```

---

## 23. Critérios de qualidade do TeleBooks

- O usuário deve conseguir adicionar um livro em poucos passos.
- A biblioteca deve continuar agradável com 10, 100 ou 1.000 livros.
- O mobile não pode ser uma versão secundária do desktop.
- A capa do livro deve carregar rapidamente e sem distorção.
- Nenhum dado privado pode vazar entre usuários.
- O backend deve validar tudo que recebe.
- O banco deve ter índices nas consultas relevantes.
- Toda mudança de schema deve ser migration versionada.
- Toda feature deve ter estado de loading, vazio, sucesso e erro.
- A aplicação deve permanecer visualmente consistente através do design system.

---

## 24. Checklist de lançamento V1

- [ ] Domínio configurado.
- [ ] HTTPS ativo.
- [ ] Frontend em produção.
- [ ] API em produção.
- [ ] Banco Supabase configurado.
- [ ] RLS validado.
- [ ] Auth funcionando.
- [ ] Storage com políticas corretas.
- [ ] Variáveis de ambiente configuradas.
- [ ] CI funcionando.
- [ ] Backup/exportação testados.
- [ ] Sentry configurado.
- [ ] PWA instalável.
- [ ] Mobile revisado.
- [ ] Desktop revisado.
- [ ] Testes críticos passando.
- [ ] Core Web Vitals revisados.
- [ ] Página de privacidade e termos preparadas antes de abertura pública.

---

## 25. Próxima ordem prática

1. Criar o repositório GitHub telebooks.
2. Executar o Prompt da Etapa 0.
3. Executar a Etapa 1 e fechar o Design System.
4. Executar a Etapa 2 e validar o banco/RLS.
5. Executar a Etapa 3 de autenticação.
6. Executar a Etapa 4 de API.
7. Começar o CRUD de livros.
8. Construir Minha Biblioteca antes de qualquer recurso social.
9. Só avançar de etapa depois de testar e fazer commit.
10. Manter este documento como especificação viva do produto.

---

## 26. Regra de ouro do projeto

> ### **PRIMEIRO:** uma biblioteca pessoal excelente.
> ### **DEPOIS:** uma comunidade excelente.
> 
> *O diferencial do TeleBooks deve nascer da experiência de organizar e conhecer a própria biblioteca. A rede social será uma extensão natural dessa experiência, não o motivo para tornar o MVP complexo.*

---
*Documento inicial — TeleBooks*
