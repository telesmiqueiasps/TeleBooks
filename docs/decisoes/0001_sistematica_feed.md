# Decisão de Arquitetura: Sistemática de Feed Público (MVP)

**Data:** 14 de Outubro de 2026  
**Status:** Implementado  
**Contexto:** Evolução da página inicial para um Feed Público Literário com interação social simplificada e foco em alto desempenho.

---

## 1. Princípios de Decisão

1. **Simplicidade do MVP (Anti-Bloat Social):**
   * Não implementar sistemas complexos de amizades bidirecionais, aprovações de seguidores ou árvores infinitas de respostas nesta fase.
   * Focar no valor central: leitura, descoberta e troca de impressões/frases sobre livros.
   * Manter o modelo com apenas 3 entidades essenciais: `feed_posts`, `feed_post_likes` e `feed_post_comments`.

2. **Visibilidade Condicionada ao Perfil Público:**
   * Usuários com perfil privado mantêm total privacidade da sua estante e dados pessoais.
   * Publicações, comentários e curtidas só são veiculados e visualizados no feed público quando o perfil do autor está configurado como público (`profiles.is_public = true`).
   * A interface orienta o leitor de maneira fluida e acolhedora caso queira ativar o perfil público para participar do feed.

3. **Performance, Rapidez e Fluidez:**
   * **Contadores Atômicos:** `likes_count` e `comments_count` são mantidos diretamente na linha da publicação através de triggers no PostgreSQL. Isso elimina operações caras de `COUNT(*)` em consultas frequentes.
   * **Ordenação Indexada:** Índice em `(created_at DESC)` e chaves estrangeiras com índices dedicados para paginação ultrarrápida.
   * **Payload Otimizado:** Consultas do feed trazem em uma única viagem os dados necessários do autor (`profiles`), dados essenciais do livro vinculado (`books`), e o estado de curtida do usuário logado (`has_liked`).

---

## 2. Modelo de Dados

### 2.1 `public.feed_posts`
* `id` (`UUID`, PK)
* `user_id` (`UUID`, FK `profiles(id)`, CASCADE)
* `book_id` (`UUID`, FK `books(id)`, SET NULL, Opcional): Permite postagens sobre um livro específico ou pensamentos literários livres.
* `content` (`TEXT`): Texto da citação, comentário ou reflexão.
* `page_number` (`INTEGER`, Opcional): Número da página do livro referenciada.
* `likes_count` (`INTEGER`, DEFAULT 0): Contador atômico mantido por trigger.
* `comments_count` (`INTEGER`, DEFAULT 0): Contador atômico mantido por trigger.
* `created_at` / `updated_at` (`TIMESTAMPTZ`)

### 2.2 `public.feed_post_likes`
* `post_id` (`UUID`, FK `feed_posts(id)`, CASCADE)
* `user_id` (`UUID`, FK `profiles(id)`, CASCADE)
* `created_at` (`TIMESTAMPTZ`)
* `PRIMARY KEY (post_id, user_id)`: Impede curtidas duplicadas e viabiliza toggle instantâneo.

### 2.3 `public.feed_post_comments`
* `id` (`UUID`, PK)
* `post_id` (`UUID`, FK `feed_posts(id)`, CASCADE)
* `user_id` (`UUID`, FK `profiles(id)`, CASCADE)
* `content` (`TEXT`)
* `created_at` / `updated_at` (`TIMESTAMPTZ`)

---

## 3. Segurança e Políticas RLS (Row Level Security)

* **Leitura:** Qualquer usuário (autenticado ou visitante) pode ler publicações cujos autores tenham `profiles.is_public = true` (ou o próprio autor autenticado).
* **Inserção:** Apenas usuários autenticados com sessão válida.
* **Exclusão:** Apenas o autor da publicação ou comentário tem permissão para deletar seu próprio conteúdo.
