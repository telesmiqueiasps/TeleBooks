-- ==============================================================================
-- TeleBooks Migration 00004: Estante Pessoal do Usuário e Leituras
-- Vínculo pessoal de cada leitor mantido em user_books e tabelas associadas.
-- ==============================================================================

-- Tipo Enum para o Status de Leitura
DO $$ BEGIN
    CREATE TYPE public.book_status AS ENUM (
        'want_to_read',
        'reading',
        'read',
        'paused',
        'abandoned'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. user_books (Vínculo pessoal do usuário com um livro bibliográfico)
CREATE TABLE IF NOT EXISTS public.user_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    status public.book_status NOT NULL DEFAULT 'want_to_read',
    rating NUMERIC(2,1) CHECK (rating >= 0 AND rating <= 5),
    owned BOOLEAN NOT NULL DEFAULT true,
    favorite BOOLEAN NOT NULL DEFAULT false,
    purchase_date DATE,
    purchase_price NUMERIC(10,2) CHECK (purchase_price >= 0),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    current_page INTEGER NOT NULL DEFAULT 0 CHECK (current_page >= 0),
    personal_color VARCHAR(7),
    shelf_position INTEGER,
    private_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_book UNIQUE (user_id, book_id)
);

DROP TRIGGER IF EXISTS set_user_books_updated_at ON public.user_books;
CREATE TRIGGER set_user_books_updated_at
    BEFORE UPDATE ON public.user_books
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Coleções do Usuário
CREATE TABLE IF NOT EXISTS public.collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_collections_updated_at ON public.collections;
CREATE TRIGGER set_collections_updated_at
    BEFORE UPDATE ON public.collections
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Associação Coleção <-> Livro do Usuário (user_collections)
CREATE TABLE IF NOT EXISTS public.user_collections (
    collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    user_book_id UUID NOT NULL REFERENCES public.user_books(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (collection_id, user_book_id)
);

-- 4. Tags Personalizadas do Usuário (user_tags)
CREATE TABLE IF NOT EXISTS public.user_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color VARCHAR(7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_tag UNIQUE (user_id, name)
);

-- 5. Associação Tags <-> Livro do Usuário (user_book_tags)
CREATE TABLE IF NOT EXISTS public.user_book_tags (
    tag_id UUID NOT NULL REFERENCES public.user_tags(id) ON DELETE CASCADE,
    user_book_id UUID NOT NULL REFERENCES public.user_books(id) ON DELETE CASCADE,
    PRIMARY KEY (tag_id, user_book_id)
);

-- 6. Sessões de Leitura (reading_sessions)
CREATE TABLE IF NOT EXISTS public.reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_book_id UUID NOT NULL REFERENCES public.user_books(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    start_page INTEGER NOT NULL CHECK (start_page >= 0),
    end_page INTEGER NOT NULL CHECK (end_page >= start_page),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER CHECK (duration_seconds >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Notas Privadas (user_notes)
CREATE TABLE IF NOT EXISTS public.user_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_book_id UUID NOT NULL REFERENCES public.user_books(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    page_number INTEGER CHECK (page_number >= 0),
    chapter TEXT,
    content TEXT NOT NULL,
    is_spoiler BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_user_notes_updated_at ON public.user_notes;
CREATE TRIGGER set_user_notes_updated_at
    BEFORE UPDATE ON public.user_notes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 8. Citações Privadas (user_quotes)
CREATE TABLE IF NOT EXISTS public.user_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_book_id UUID NOT NULL REFERENCES public.user_books(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    page_number INTEGER CHECK (page_number >= 0),
    content TEXT NOT NULL,
    author_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_user_quotes_updated_at ON public.user_quotes;
CREATE TRIGGER set_user_quotes_updated_at
    BEFORE UPDATE ON public.user_quotes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 9. Resenhas / Avaliações do Usuário (user_reviews)
CREATE TABLE IF NOT EXISTS public.user_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_book_id UUID NOT NULL REFERENCES public.user_books(id) ON DELETE CASCADE UNIQUE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating NUMERIC(2,1) CHECK (rating >= 0 AND rating <= 5),
    title TEXT,
    content TEXT NOT NULL,
    contains_spoilers BOOLEAN NOT NULL DEFAULT false,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_user_reviews_updated_at ON public.user_reviews;
CREATE TRIGGER set_user_reviews_updated_at
    BEFORE UPDATE ON public.user_reviews
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 10. Listas de Leitura do Usuário (reading_lists)
CREATE TABLE IF NOT EXISTS public.reading_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_reading_lists_updated_at ON public.reading_lists;
CREATE TRIGGER set_reading_lists_updated_at
    BEFORE UPDATE ON public.reading_lists
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 11. Itens da Lista de Leitura (reading_list_books)
CREATE TABLE IF NOT EXISTS public.reading_list_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES public.reading_lists(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_list_book UNIQUE (list_id, book_id)
);
