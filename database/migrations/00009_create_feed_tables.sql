-- ==============================================================================
-- TeleBooks Migration 00009: Sistematica de Feed Publico (MVP)
-- Tabelas: feed_posts, feed_post_likes, feed_post_comments
-- Foco em estetica, velocidade, simplicidade e contadores atomicos
-- ==============================================================================

BEGIN;

-- 1. Tabela de Publicações (feed_posts)
CREATE TABLE IF NOT EXISTS public.feed_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    page_number INTEGER CHECK (page_number >= 0),
    likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
    comments_count INTEGER NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger para updated_at em feed_posts
DROP TRIGGER IF EXISTS set_feed_posts_updated_at ON public.feed_posts;
CREATE TRIGGER set_feed_posts_updated_at
    BEFORE UPDATE ON public.feed_posts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Tabela de Curtidas (feed_post_likes)
CREATE TABLE IF NOT EXISTS public.feed_post_likes (
    post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
);

-- 3. Tabela de Comentários (feed_post_comments)
CREATE TABLE IF NOT EXISTS public.feed_post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger para updated_at em feed_post_comments
DROP TRIGGER IF EXISTS set_feed_post_comments_updated_at ON public.feed_post_comments;
CREATE TRIGGER set_feed_post_comments_updated_at
    BEFORE UPDATE ON public.feed_post_comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Triggers Atômicos para Contadores de Likes e Comentários
CREATE OR REPLACE FUNCTION public.handle_feed_post_like_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.feed_posts
        SET likes_count = likes_count + 1
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.feed_posts
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feed_post_likes_counter ON public.feed_post_likes;
CREATE TRIGGER trg_feed_post_likes_counter
    AFTER INSERT OR DELETE ON public.feed_post_likes
    FOR EACH ROW EXECUTE FUNCTION public.handle_feed_post_like_counters();

CREATE OR REPLACE FUNCTION public.handle_feed_post_comment_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.feed_posts
        SET comments_count = comments_count + 1
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.feed_posts
        SET comments_count = GREATEST(0, comments_count - 1)
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feed_post_comments_counter ON public.feed_post_comments;
CREATE TRIGGER trg_feed_post_comments_counter
    AFTER INSERT OR DELETE ON public.feed_post_comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_feed_post_comment_counters();

-- 5. Índices de Alta Performance para Feed e Ordenação
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON public.feed_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_user_id ON public.feed_posts (user_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_book_id ON public.feed_posts (book_id);
CREATE INDEX IF NOT EXISTS idx_feed_post_comments_post_id ON public.feed_post_comments (post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_feed_post_likes_user_id ON public.feed_post_likes (user_id);

-- 6. Políticas RLS (Row Level Security)
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_post_comments ENABLE ROW LEVEL SECURITY;

-- Leitura de posts: Público geral ou autor
DROP POLICY IF EXISTS "feed_posts_read_policy" ON public.feed_posts;
CREATE POLICY "feed_posts_read_policy" ON public.feed_posts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = feed_posts.user_id AND (p.is_public = true OR p.id = auth.uid())
        )
    );

-- Inserção de posts: Usuários autenticados
DROP POLICY IF EXISTS "feed_posts_insert_policy" ON public.feed_posts;
CREATE POLICY "feed_posts_insert_policy" ON public.feed_posts
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

-- Atualização e exclusão de posts: Apenas o próprio autor
DROP POLICY IF EXISTS "feed_posts_update_policy" ON public.feed_posts;
CREATE POLICY "feed_posts_update_policy" ON public.feed_posts
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "feed_posts_delete_policy" ON public.feed_posts;
CREATE POLICY "feed_posts_delete_policy" ON public.feed_posts
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para Likes
DROP POLICY IF EXISTS "feed_post_likes_read_policy" ON public.feed_post_likes;
CREATE POLICY "feed_post_likes_read_policy" ON public.feed_post_likes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "feed_post_likes_insert_policy" ON public.feed_post_likes;
CREATE POLICY "feed_post_likes_insert_policy" ON public.feed_post_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feed_post_likes_delete_policy" ON public.feed_post_likes;
CREATE POLICY "feed_post_likes_delete_policy" ON public.feed_post_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para Comentários
DROP POLICY IF EXISTS "feed_post_comments_read_policy" ON public.feed_post_comments;
CREATE POLICY "feed_post_comments_read_policy" ON public.feed_post_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.feed_posts fp
            JOIN public.profiles p ON p.id = fp.user_id
            WHERE fp.id = feed_post_comments.post_id AND (p.is_public = true OR p.id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "feed_post_comments_insert_policy" ON public.feed_post_comments;
CREATE POLICY "feed_post_comments_insert_policy" ON public.feed_post_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feed_post_comments_delete_policy" ON public.feed_post_comments;
CREATE POLICY "feed_post_comments_delete_policy" ON public.feed_post_comments
    FOR DELETE USING (auth.uid() = user_id);

COMMIT;
