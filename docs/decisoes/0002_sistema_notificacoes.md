# Decisão de Arquitetura 0002: Sistema de Notificações Social (MVP)

**Data:** 14 de Outubro de 2026  
**Status:** Aprovado  
**Contexto:** Sistemática de notificações quando um post do usuário for curtido ou comentado, com badge na barra superior e acesso rápido tanto no desktop quanto no mobile.

---

## 1. Princípios e Escopo do MVP
Para manter o MVP simples, rápido e sem sobrecarregar a arquitetura:
1. **Tipos de Notificações Suportados:**
   - `post_like`: Quando outro usuário curte uma publicação do autor.
   - `post_comment`: Quando outro usuário comenta em uma publicação do autor.
2. **Auto-ignição evitada:** Não gera notificação quando o próprio autor curte ou comenta sua própria publicação.
3. **Criação Atômica por Triggers no PostgreSQL:**
   - As notificações são geradas por triggers atômicos no PostgreSQL (`trg_notify_feed_post_like` e `trg_notify_feed_post_comment`).
   - Isso garante 100% de consistência: mesmo se a ação for executada via FastAPI ou diretamente via Supabase client, a notificação é criada instantaneamente.
4. **Resumo Visual Ágil:**
   - Botão de sino de notificações sempre visível no Topbar (tanto desktop quanto mobile).
   - Badge com contagem de notificações não lidas.
   - Dropdown interativo com visualização rápida, marcação como lida e redirecionamento para o post.
   - Rota dedicada `/notificacoes` para histórico completo.

---

## 2. Modelo de Dados

### Tabela `public.notifications`
| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | UUID PK | Identificador único (`gen_random_uuid()`) |
| `user_id` | UUID FK | Destinatário da notificação (`profiles.id`) |
| `actor_id` | UUID FK | Usuário que executou a ação (`profiles.id`) |
| `type` | TEXT | Tipo da notificação: `'post_like'` ou `'post_comment'` |
| `post_id` | UUID FK | Post vinculado (`feed_posts.id`) |
| `comment_id` | UUID FK | Comentário vinculado (opcional, `feed_post_comments.id`) |
| `content` | TEXT | Prévia do conteúdo / comentário |
| `is_read` | BOOLEAN | Estado de leitura (default `false`) |
| `created_at` | TIMESTAMPTZ | Data e hora de criação (`now()`) |

### Índices de Performance
- `idx_notifications_user_unread`: `(user_id, is_read, created_at DESC)` para queries rápidas de notificações não lidas e contagem.
- `idx_notifications_user_created`: `(user_id, created_at DESC)` para paginação do histórico.

---

## 3. Segurança (RLS)
- `SELECT`: Apenas o destinatário (`auth.uid() = user_id`).
- `UPDATE`: Apenas o destinatário (`auth.uid() = user_id`) para marcar como lida.
- `DELETE`: Apenas o destinatário (`auth.uid() = user_id`).
