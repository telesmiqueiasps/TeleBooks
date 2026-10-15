# Decisão de Arquitetura 0003: Moderação de Livros Manuais e Controle de Acesso por Papéis

**Data:** 14 de Outubro de 2026  
**Status:** Aprovado  
**Contexto:** Garantir a integridade do catálogo bibliográfico compartilhado, evitando que usuários comuns alterem fichas de livros existentes ou insiram dados incorretos/duplicados no acervo público sem curadoria prévia.

---

## 1. Princípios e Decisões de Arquitetura

1. **Catálogo Compartilhado Protegido contra Adulteração**:
   - As opções de "Editar Ficha" em livros já cadastrados e "Editar Dados" durante o fluxo de importação foram **removidas da interface de usuários comuns**.
   - Rotas de alteração direta no catálogo global (`PATCH /books/{id}` e `DELETE /books/{id}`) passaram a exigir privilégios de administrador (`role = 'admin'`).

2. **Cadastro Manual com Fila de Moderação**:
   - Livros não encontrados na busca automática (Google Books / Open Library) ainda podem ser cadastrados manualmente pelos usuários.
   - Porém, **não entram imediatamente no catálogo compartilhado nem na biblioteca do usuário**.
   - São submetidos à tabela `book_submissions` com status inicial `'pending'` (Pendente).
   - O card de "Adicionar diretamente à biblioteca" foi substituído por um aviso claro de que as obras passam por análise da equipe de suporte e, se aprovadas, entram no catálogo e na biblioteca em até 24 horas.

3. **Papéis de Usuário (RBAC)**:
   - Adicionada a coluna `role VARCHAR(20) NOT NULL DEFAULT 'user'` na tabela `public.profiles`.
   - Papéis suportados: `'user'` (comum) e `'admin'` (suporte/administrador).
   - Usuário administrador oficial configurado e ativo:
     - **Email:** `admin@telebooks.com`
     - **Senha:** `Josa1972.`
     - **Role:** `admin`

4. **Painel de Moderação Administrativa (`/admin`)**:
   - Apenas usuários com `profile.role === 'admin'` têm acesso à rota `/admin` e à aba de navegação "Moderação".
   - Recursos do painel:
     - Visualização completa da ficha bibliográfica (capa, título, autores, editora, páginas, ISBN, sinopse).
     - Identificação de quem submeteu o livro e tempo relativo.
     - **Aprovação**: Cria o livro no catálogo global (com autores e editoras normalizados), vincula automaticamente à biblioteca de quem o cadastrou (`user_books`) e envia notificação de sucesso (`book_approved`).
     - **Reprovação**: Permite preenchimento de justificativa e envia notificação explicativa (`book_rejected`) ao leitor.

---

## 2. Modelo de Dados

### Tabela `public.book_submissions`
| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | UUID PK | Identificador único (`gen_random_uuid()`) |
| `user_id` | UUID FK | Leitor que realizou o cadastro manual (`auth.users(id)`) |
| `title` | VARCHAR(500) | Título da obra |
| `subtitle` | VARCHAR(500) | Subtítulo da obra (opcional) |
| `author_names` | TEXT[] | Lista de nomes de autores |
| `publisher_name` | VARCHAR(255) | Nome da editora |
| `description` | TEXT | Sinopse ou resumo |
| `isbn13` / `isbn10` | VARCHAR | Códigos ISBN |
| `page_count` | INTEGER | Número total de páginas |
| `cover_url` | TEXT | URL da capa (Cloudflare R2 ou externa) |
| `initial_shelf_status` | VARCHAR(50) | Status inicial desejado na estante (`want_to_read`, etc.) |
| `status` | VARCHAR(20) | `'pending'`, `'approved'`, `'rejected'` |
| `rejection_reason` | TEXT | Motivo da recusa caso reprovado |
| `reviewed_by` | UUID FK | Administrador que avaliou a obra |
| `reviewed_at` | TIMESTAMPTZ | Data/hora da avaliação |
| `created_book_id` | UUID FK | Livro gerado no catálogo após aprovação |
| `created_at` / `updated_at` | TIMESTAMPTZ | Registro temporal |

---

## 3. Segurança (RLS e Dependências de API)
- **RLS em `book_submissions`**:
  - `INSERT`: Usuários autenticados podem inserir suas próprias submissões.
  - `SELECT`: Usuário vê suas próprias submissões; administradores veem todas.
  - `UPDATE` e `DELETE`: Exclusivo para administradores.
- **FastAPI**:
  - Dependência `get_current_admin` valida se o usuário possui `role = 'admin'` no banco antes de permitir operações administrativas.
