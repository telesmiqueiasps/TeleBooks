# Documentação do Sistema de Perfil do Usuário e Conexões Literárias (TeleBooks)

## 1. Visão Geral

O sistema de perfil e comunidade do **TeleBooks** permite que cada leitor gerencie sua identidade literária, acompanhe suas próprias publicações no feed, descubra e siga outros leitores, e controle rigorosamente a visibilidade e privacidade do seu conteúdo.

---

## 2. Modelo de Dados & Banco de Dados (PostgreSQL / Supabase)

### 2.1. Alterações na Tabela `public.profiles`
- `followers_count` (integer, default 0, check >= 0): Contador desnormalizado de seguidores.
- `following_count` (integer, default 0, check >= 0): Contador desnormalizado de usuários seguidos.
- `bio` (text, max 280 chars): Biografia literária do leitor.
- `avatar_url` (text): URL da imagem de perfil (hospedada no Cloudflare R2 ou externa).
- `is_public` (boolean, default true): Controle de privacidade (Público vs. Privado).
- `username` (text, unique, regex `^[a-zA-Z0-9_.-]+$`): Identificador único do usuário.

### 2.2. Nova Tabela `public.user_follows`
| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Identificador único do relacionamento |
| `follower_id` | UUID (FK `profiles.id`) | Usuário que está seguindo |
| `following_id` | UUID (FK `profiles.id`) | Usuário que está sendo seguido |
| `status` | VARCHAR(20) | `'accepted'` (seguindo) ou `'pending'` (aguardando aprovação para perfil privado) |
| `created_at` | TIMESTAMPTZ | Data de criação da solicitação |
| `updated_at` | TIMESTAMPTZ | Data de atualização (ex: momento da aprovação) |

> **Restrições:**
> - `UNIQUE(follower_id, following_id)`: Impede duplicação de relação entre os mesmos dois usuários.
> - `CHECK (follower_id <> following_id)`: Impede que um usuário siga a si mesmo.
> - `CHECK (status IN ('accepted', 'pending'))`: Status permitidos.

### 2.3. Triggers Atômicos de Contadores e Notificações
1. **`handle_user_follows_counters()`**:
   - Incrementa automaticamente `following_count` no seguidor e `followers_count` no seguido quando uma relação atinge status `'accepted'`.
   - Decrementa os contadores quando uma relação `'accepted'` é desfeita ou excluída.
2. **`handle_user_follows_notification()`**:
   - Dispara notificação automática do tipo `'follow'` quando um seguidor segue um perfil público.
   - Dispara notificação `'follow_request'` quando uma solicitação é enviada para perfil privado.
   - Dispara notificação `'follow_accepted'` quando a solicitação é aprovada.

---

## 3. Endpoints da API Backend (FastAPI)

Prefixo de rota: `/api/v1/profiles`

### 3.1. Gerenciamento do Próprio Perfil
- **`GET /api/v1/profiles/me`**
  - Retorna o perfil completo do leitor autenticado, incluindo bio, avatar, contadores atualizados (`followers_count`, `following_count`, `posts_count`) e status de privacidade.
- **`PATCH /api/v1/profiles/me`**
  - Atualiza campos do perfil: `username`, `full_name`, `bio`, `avatar_url`, `is_public`.
  - **Validação de Username:**
    - Comprimento entre 3 e 30 caracteres.
    - Caracteres permitidos: apenas letras minúsculas, números, ponto (`.`), sublinhado (`_`) e hífen (`-`).
    - Validação de unicidade no banco de dados. Caso já esteja em uso por outro leitor, retorna `HTTP 409 Conflict` com mensagem descritiva: *"Este nome de usuário já está em uso por outro leitor."*

### 3.2. Busca de Usuários
- **`GET /api/v1/profiles/search?q={termo}&limit=20`**
  - Pesquisa usuários por nome de usuário (`@username`) ou nome completo (`full_name`).
  - Prioriza correspondências exatas e que iniciam com o termo pesquisado.
  - Retorna o status de relacionamento do usuário autenticado em relação a cada resultado (`'self'`, `'following'`, `'requested'`, `'none'`).

### 3.3. Perfil de Terceiros e Conexões
- **`GET /api/v1/profiles/{username}`**
  - Obtém dados do perfil de qualquer leitor pelo arroba.
  - Retorna flags de controle de privacidade: `can_view_content` (`true` se público, se for o próprio usuário ou se for seguidor aceito).
- **`POST /api/v1/profiles/{username}/follow`**
  - Se o perfil alvo for **público**: cria a relação com status `'accepted'` imediatamente e incrementa os seguidores.
  - Se o perfil alvo for **privado**: cria a relação com status `'pending'`, notificando o usuário alvo para aprovação.
- **`POST /api/v1/profiles/{username}/unfollow`**
  - Cancela o seguimento ou retira a solicitação pendente enviada.
- **`GET /api/v1/profiles/{username}/followers`**
  - Lista os seguidores do perfil especificado (bloqueado com `HTTP 403 Forbidden` se o perfil for privado e o visitante não for seguidor aceito).
- **`GET /api/v1/profiles/{username}/following`**
  - Lista os leitores seguidos pelo perfil especificado (bloqueado se privado e não autorizado).
- **`GET /api/v1/profiles/{username}/posts?page=1&page_size=20`**
  - Retorna o feed de publicações literárias criadas por aquele leitor, incluindo livros vinculados, contadores de curtidas e comentários.

### 3.4. Solicitações de Seguidor (Para Contas Privadas)
- **`GET /api/v1/profiles/me/follow-requests`**
  - Lista as solicitações pendentes recebidas pelo usuário logado.
- **`POST /api/v1/profiles/follow-requests/{request_id}/accept`**
  - Aceita a solicitação, tornando o leitor um seguidor aprovado e acionando o trigger de contadores.
- **`POST /api/v1/profiles/follow-requests/{request_id}/reject`**
  - Recusa e remove a solicitação de seguidor pendente.

---

## 4. Frontend & Experiência do Usuário (Next.js / TailwindCSS)

### 4.1. Página "Meu Perfil" (`/perfil`)
1. **Header Editorial:**
   - Avatar com upload direto para o Cloudflare R2 ou remoção.
   - Nome de exibição e `@username`.
   - Badge de privacidade ("Público" ou "Privado").
   - Bio literária formatada.
   - Contadores interativos de **Publicações**, **Seguidores** e **Seguindo**.
   - Botões de ação rápida: *Editar Perfil*, *Pesquisar Leitores*, *Solicitações (com contador)* e *Sair*.
2. **Feed "Minhas Publicações":**
   - Lista todas as notas, citações e resenhas publicadas pelo usuário.
   - Cada card permite curtir, abrir comentários, comentar, ver livro vinculado e excluir publicação.
   - Estado vazio amigável incentivando a criação de publicações no feed.

### 4.2. Modal de Edição de Perfil (`EditProfileModal`)
- **Foto de perfil**: upload com pré-visualização instantânea (suporte a JPEG, PNG, WebP de até 5MB).
- **Username com validação em tempo real**: debounced a cada 400ms consultando a disponibilidade na API.
  - Indicador verde de disponibilidade.
  - Indicador vermelho com mensagem se já estiver em uso.
  - Validação estrita de formato e bloqueio de caracteres inválidos.
- **Bio**: campo de texto com contador de caracteres (0/280).
- **Privacidade**: chave seletora com explicação clara sobre o impacto de perfil público vs privado.

### 4.3. Diálogo de Busca de Leitores (`UserSearchDialog`)
- Acessível diretamente pelo cabeçalho do perfil.
- Busca em tempo real com debounce de 300ms.
- Permite seguir, enviar solicitação ou visitar o perfil com 1 clique.

### 4.4. Página do Perfil de Outro Leitor (`/perfil/[username]`)
- Exibe o cabeçalho do leitor, bio e contadores.
- Botão dinâmico:
  - **Seguir** (perfil público)
  - **Solicitar para Seguir** (perfil privado)
  - **Solicitado** (com opção de cancelar)
  - **Seguindo** (ao passar o mouse, permite deixar de seguir)
- **Barreira de Privacidade**:
  - Se o perfil for privado e o visitante não for seguidor aceito, oculta as publicações e as conexões, exibindo um card explicativo de perfil privado com botão de envio de solicitação.
  - Se for público ou o visitante for seguidor aprovado, exibe todo o feed de publicações do leitor.
