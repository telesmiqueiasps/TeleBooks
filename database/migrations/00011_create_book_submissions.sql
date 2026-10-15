-- ==============================================================================
-- TeleBooks Migration 00011: Sistema de Submissão Manual e Moderação de Livros
-- ==============================================================================

BEGIN;

-- 1. Garante coluna de role na tabela de perfis de usuário
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

-- 2. Tabela de Submissões Manuais de Livros para Moderação do Suporte
CREATE TABLE IF NOT EXISTS public.book_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    subtitle VARCHAR(500),
    author_names TEXT[] NOT NULL,
    publisher_name VARCHAR(255),
    description TEXT,
    isbn13 VARCHAR(13),
    isbn10 VARCHAR(10),
    page_count INTEGER,
    cover_url TEXT,
    initial_shelf_status VARCHAR(50) DEFAULT 'want_to_read',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de busca e filtros para moderação
CREATE INDEX IF NOT EXISTS idx_book_submissions_status 
    ON public.book_submissions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_book_submissions_user 
    ON public.book_submissions (user_id, created_at DESC);

-- Trigger de atualização automática de updated_at
DROP TRIGGER IF EXISTS set_book_submissions_updated_at ON public.book_submissions;
CREATE TRIGGER set_book_submissions_updated_at
    BEFORE UPDATE ON public.book_submissions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Atualização dos tipos suportados na tabela de notificações
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('post_like', 'post_comment', 'book_approved', 'book_rejected'));

ALTER TABLE public.notifications 
    ADD COLUMN IF NOT EXISTS book_id UUID REFERENCES public.books(id) ON DELETE CASCADE;

-- 4. Políticas de Segurança (Row Level Security) em book_submissions
ALTER TABLE public.book_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "book_submissions_select_policy" ON public.book_submissions;
CREATE POLICY "book_submissions_select_policy" ON public.book_submissions
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "book_submissions_insert_policy" ON public.book_submissions;
CREATE POLICY "book_submissions_insert_policy" ON public.book_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "book_submissions_update_policy" ON public.book_submissions;
CREATE POLICY "book_submissions_update_policy" ON public.book_submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "book_submissions_delete_policy" ON public.book_submissions;
CREATE POLICY "book_submissions_delete_policy" ON public.book_submissions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

COMMIT;
