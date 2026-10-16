-- ==============================================================================
-- TeleBooks Migration 00012: Sistema de Seguidores e Seguindo (User Follows)
-- ==============================================================================

BEGIN;

-- 1. Adicionar contadores de seguidores e seguindo em profiles (se não existirem)
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS followers_count INTEGER NOT NULL DEFAULT 0 CHECK (followers_count >= 0),
    ADD COLUMN IF NOT EXISTS following_count INTEGER NOT NULL DEFAULT 0 CHECK (following_count >= 0);

-- 2. Tabela de Relacionamento de Seguidores (user_follows)
CREATE TABLE IF NOT EXISTS public.user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'pending')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_follower_following UNIQUE (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

-- Trigger para updated_at em user_follows
DROP TRIGGER IF EXISTS set_user_follows_updated_at ON public.user_follows;
CREATE TRIGGER set_user_follows_updated_at
    BEFORE UPDATE ON public.user_follows
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows (follower_id, status);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows (following_id, status);
CREATE INDEX IF NOT EXISTS idx_user_follows_status ON public.user_follows (status);

-- 4. Triggers Atômicos para Contadores em Profiles
CREATE OR REPLACE FUNCTION public.handle_user_follows_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.status = 'accepted') THEN
            UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
            UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Mudou de pending para accepted
        IF (OLD.status = 'pending' AND NEW.status = 'accepted') THEN
            UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
            UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
        -- Mudou de accepted para pending
        ELSIF (OLD.status = 'accepted' AND NEW.status = 'pending') THEN
            UPDATE public.profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE id = NEW.following_id;
            UPDATE public.profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = NEW.follower_id;
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.status = 'accepted') THEN
            UPDATE public.profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
            UPDATE public.profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_follows_counter ON public.user_follows;
CREATE TRIGGER trg_user_follows_counter
    AFTER INSERT OR UPDATE OR DELETE ON public.user_follows
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_follows_counters();

-- 5. Atualizar constraint de tipo em notifications para permitir notificações de follow e submissões
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('post_like', 'post_comment', 'book_approved', 'book_rejected', 'follow', 'follow_request', 'follow_accepted'));

-- 6. Trigger para gerar notificações automáticas ao seguir / solicitar
CREATE OR REPLACE FUNCTION public.handle_user_follows_notification()
RETURNS TRIGGER AS $$
DECLARE
    actor_username TEXT;
BEGIN
    SELECT username INTO actor_username FROM public.profiles WHERE id = NEW.follower_id;

    IF (TG_OP = 'INSERT') THEN
        IF (NEW.status = 'accepted') THEN
            INSERT INTO public.notifications (user_id, actor_id, type, content)
            VALUES (
                NEW.following_id,
                NEW.follower_id,
                'follow',
                '@' || COALESCE(actor_username, 'alguém') || ' começou a seguir você.'
            );
        ELSIF (NEW.status = 'pending') THEN
            INSERT INTO public.notifications (user_id, actor_id, type, content)
            VALUES (
                NEW.following_id,
                NEW.follower_id,
                'follow_request',
                '@' || COALESCE(actor_username, 'alguém') || ' solicitou seguir seu perfil privado.'
            );
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status = 'pending' AND NEW.status = 'accepted') THEN
            INSERT INTO public.notifications (user_id, actor_id, type, content)
            VALUES (
                NEW.follower_id,
                NEW.following_id,
                'follow_accepted',
                'Sua solicitação para seguir foi aceita.'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_follows_notification ON public.user_follows;
CREATE TRIGGER trg_user_follows_notification
    AFTER INSERT OR UPDATE ON public.user_follows
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_follows_notification();

-- 7. Políticas de RLS em user_follows
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_follows_select_policy" ON public.user_follows;
CREATE POLICY "user_follows_select_policy" ON public.user_follows
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_follows_insert_policy" ON public.user_follows;
CREATE POLICY "user_follows_insert_policy" ON public.user_follows
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "user_follows_update_policy" ON public.user_follows;
CREATE POLICY "user_follows_update_policy" ON public.user_follows
    FOR UPDATE USING (auth.uid() = following_id OR auth.uid() = follower_id);

DROP POLICY IF EXISTS "user_follows_delete_policy" ON public.user_follows;
CREATE POLICY "user_follows_delete_policy" ON public.user_follows
    FOR DELETE USING (auth.uid() = follower_id OR auth.uid() = following_id);

COMMIT;
