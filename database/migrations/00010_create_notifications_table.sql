-- ==============================================================================
-- TeleBooks Migration 00010: Sistema de Notificações Social e Restrições de Feed
-- Tabelas: notifications
-- Triggers atômicos para curtidas e comentários
-- Sincronização automática de books.author_name
-- Restrição de feed apenas para usuários autenticados
-- ==============================================================================

BEGIN;

-- 1. Tabela de Notificações
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('post_like', 'post_comment')),
    post_id UUID REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.feed_post_comments(id) ON DELETE CASCADE,
    content TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Índices de Performance para Notificações
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
    ON public.notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
    ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_post_id 
    ON public.notifications (post_id);

-- 3. Políticas de Segurança (Row Level Security) em notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
CREATE POLICY "notifications_select_policy" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
CREATE POLICY "notifications_update_policy" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;
CREATE POLICY "notifications_delete_policy" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
CREATE POLICY "notifications_insert_policy" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() = actor_id OR auth.uid() IS NOT NULL);

-- 4. Função e Trigger para Notificação de Curtida (Like)
CREATE OR REPLACE FUNCTION public.handle_feed_post_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
    post_snippet TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        SELECT user_id, LEFT(content, 80) INTO target_user_id, post_snippet 
        FROM public.feed_posts 
        WHERE id = NEW.post_id;

        -- Só gera notificação se o autor da curtida for diferente do dono do post
        IF target_user_id IS NOT NULL AND target_user_id <> NEW.user_id THEN
            INSERT INTO public.notifications (user_id, actor_id, type, post_id, content)
            VALUES (target_user_id, NEW.user_id, 'post_like', NEW.post_id, post_snippet);
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        -- Ao remover a curtida, remove a notificação correspondente
        DELETE FROM public.notifications
        WHERE actor_id = OLD.user_id 
          AND post_id = OLD.post_id 
          AND type = 'post_like';
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_feed_post_like_notification ON public.feed_post_likes;
CREATE TRIGGER trg_feed_post_like_notification
    AFTER INSERT OR DELETE ON public.feed_post_likes
    FOR EACH ROW EXECUTE FUNCTION public.handle_feed_post_like_notification();

-- 5. Função e Trigger para Notificação de Comentário
CREATE OR REPLACE FUNCTION public.handle_feed_post_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        SELECT user_id INTO target_user_id 
        FROM public.feed_posts 
        WHERE id = NEW.post_id;

        -- Só gera notificação se o autor do comentário for diferente do dono do post
        IF target_user_id IS NOT NULL AND target_user_id <> NEW.user_id THEN
            INSERT INTO public.notifications (user_id, actor_id, type, post_id, comment_id, content)
            VALUES (target_user_id, NEW.user_id, 'post_comment', NEW.post_id, NEW.id, LEFT(NEW.content, 120));
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        -- Ao remover o comentário, remove a notificação associada
        DELETE FROM public.notifications
        WHERE comment_id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_feed_post_comment_notification ON public.feed_post_comments;
CREATE TRIGGER trg_feed_post_comment_notification
    AFTER INSERT OR DELETE ON public.feed_post_comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_feed_post_comment_notification();

-- 6. Trigger para manter books.author_name automaticamente sincronizado
CREATE OR REPLACE FUNCTION public.handle_sync_book_author_name()
RETURNS TRIGGER AS $$
DECLARE
    target_book_id UUID;
    computed_name TEXT;
BEGIN
    target_book_id := COALESCE(NEW.book_id, OLD.book_id);
    IF target_book_id IS NOT NULL THEN
        SELECT string_agg(a.name, ', ' ORDER BY ba.is_primary DESC, a.name ASC)
        INTO computed_name
        FROM public.book_authors ba
        JOIN public.authors a ON ba.author_id = a.id
        WHERE ba.book_id = target_book_id;

        UPDATE public.books
        SET author_name = computed_name
        WHERE id = target_book_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_book_author_name ON public.book_authors;
CREATE TRIGGER trg_sync_book_author_name
    AFTER INSERT OR UPDATE OR DELETE ON public.book_authors
    FOR EACH ROW EXECUTE FUNCTION public.handle_sync_book_author_name();

-- 7. Restringir Feed: apenas usuários autenticados podem ver o feed
DROP POLICY IF EXISTS "feed_posts_read_policy" ON public.feed_posts;
CREATE POLICY "feed_posts_read_policy" ON public.feed_posts
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = feed_posts.user_id AND (p.is_public = true OR p.id = auth.uid())
        )
    );

COMMIT;
