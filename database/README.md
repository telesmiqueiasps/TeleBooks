# Banco de Dados TeleBooks (PostgreSQL / Supabase)

Este diretório contém os esquemas, migrações versionadas, políticas RLS (Row Level Security) e dados de seed do **TeleBooks**.

## 📁 Estrutura

- `migrations/`: Migrações SQL numeradas sequencialmente:
  - `00000_full_schema.sql`: Script consolidado contendo todas as definições (ideal para rodar no SQL Editor do Supabase Studio).
  - `00001_create_extensions_and_helpers.sql`: Extensões (`uuid-ossp`, `pg_trgm`) e função para `updated_at`.
  - `00002_create_profiles.sql`: Tabela `profiles` com gatilho automático ao cadastrar em `auth.users`.
  - `00003_create_catalog_tables.sql`: Catálogo global bibliográfico (`books`, `authors`, `publishers`, `genres`, `book_editions`, etc.).
  - `00004_create_user_shelf_and_reading.sql`: Estante pessoal do leitor (`user_books`), coleções, tags, notas, citações, avaliações e listas.
  - `00005_create_performance_indexes.sql`: Índices compostos e buscas textuais com Trigram (`pg_trgm`).
  - `00006_create_rls_policies.sql`: Políticas de segurança em nível de linha (RLS) protegendo dados privados de cada usuário.
- `seeds/`: Dados de inicialização e demonstração bibliográfica:
  - `001_initial_genres.sql`: Gêneros literários essenciais.
  - `002_demo_catalog.sql`: Editoras, autores clássicos e contemporâneos e livros de exemplo.
  - `seed.sql`: Script unificado de carga de dados.

## 🛡️ Regra Fundamental de Arquitetura
O livro bibliográfico (`books`) é uma entidade global compartilhada no catálogo.  
O vínculo, status, notas, páginas lidas e avaliações pertencem ao usuário e residem em `user_books`.

## 🚀 Como Aplicar no Supabase

### Opção 1: Via Dashboard do Supabase (Mais Rápido)
1. Acesse o projeto no [Supabase Dashboard](https://supabase.com/dashboard).
2. Vá em **SQL Editor**.
3. Copie e execute o conteúdo de `database/migrations/00000_full_schema.sql`.
4. (Opcional) Execute o conteúdo de `database/seeds/002_demo_catalog.sql` para carregar o catálogo de demonstração.

### Opção 2: Via Supabase CLI
```bash
# Vincular o projeto Supabase
supabase link --project-ref <seu-project-ref>

# Aplicar migrações
supabase db push
```

### Opção 3: PostgreSQL Local (via Docker Compose)
```bash
docker compose up -d postgres
# Aplicar schema via psql ou ferramenta gráfica (DBeaver, TablePlus, etc.)
```
