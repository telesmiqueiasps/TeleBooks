-- ==============================================================================
-- TeleBooks Migration 00003: Catálogo Bibliográfico Global
-- Separação Fundamental: O livro global é independente dos usuários.
-- ==============================================================================

-- 1. Editoras
CREATE TABLE IF NOT EXISTS public.publishers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    website TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_publishers_updated_at ON public.publishers;
CREATE TRIGGER set_publishers_updated_at
    BEFORE UPDATE ON public.publishers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Autores
CREATE TABLE IF NOT EXISTS public.authors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    birth_date DATE,
    death_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_authors_updated_at ON public.authors;
CREATE TRIGGER set_authors_updated_at
    BEFORE UPDATE ON public.authors
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Gêneros Literários
CREATE TABLE IF NOT EXISTS public.genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Livros (Entidade Bibliográfica Global)
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    isbn10 VARCHAR(10) UNIQUE,
    isbn13 VARCHAR(13) UNIQUE,
    language VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
    page_count INTEGER CHECK (page_count > 0),
    publication_date DATE,
    publisher_id UUID REFERENCES public.publishers(id) ON DELETE SET NULL,
    cover_url TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_books_updated_at ON public.books;
CREATE TRIGGER set_books_updated_at
    BEFORE UPDATE ON public.books
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Edições de Livros
CREATE TABLE IF NOT EXISTS public.book_editions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    title TEXT,
    isbn10 VARCHAR(10),
    isbn13 VARCHAR(13),
    publisher_id UUID REFERENCES public.publishers(id) ON DELETE SET NULL,
    edition_number INTEGER,
    format TEXT DEFAULT 'paperback' CHECK (format IN ('paperback', 'hardcover', 'ebook', 'audiobook', 'other')),
    page_count INTEGER CHECK (page_count > 0),
    published_date DATE,
    cover_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_book_editions_updated_at ON public.book_editions;
CREATE TRIGGER set_book_editions_updated_at
    BEFORE UPDATE ON public.book_editions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Relação Livros <-> Autores (N:N)
CREATE TABLE IF NOT EXISTS public.book_authors (
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.authors(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (book_id, author_id)
);

-- 7. Relação Livros <-> Gêneros (N:N)
CREATE TABLE IF NOT EXISTS public.book_genres (
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    genre_id UUID NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, genre_id)
);
