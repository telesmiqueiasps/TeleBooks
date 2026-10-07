-- ==============================================================================
-- TeleBooks - Schema Completo do PostgreSQL no Supabase (Etapa 2)
-- Compatível com Supabase SQL Editor e CLI do Supabase.
-- ==============================================================================

-- 1. Extensões e Helpers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Perfis de Usuário
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(30) UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, full_name, avatar_url)
    VALUES (
        new.id,
        COALESCE(
            new.raw_user_meta_data->>'username',
            'leitor_' || substr(new.id::text, 1, 8)
        ),
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Catálogo Bibliográfico Global
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

CREATE TABLE IF NOT EXISTS public.genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.book_authors (
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.authors(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (book_id, author_id)
);

CREATE TABLE IF NOT EXISTS public.book_genres (
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    genre_id UUID NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, genre_id)
);

-- 4. Estante Pessoal e Leituras do Usuário
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

CREATE TABLE IF NOT EXISTS public.user_collections (
    collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    user_book_id UUID NOT NULL REFERENCES public.user_books(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (collection_id, user_book_id)
);

CREATE TABLE IF NOT EXISTS public.user_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color VARCHAR(7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_tag UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS public.user_book_tags (
    tag_id UUID NOT NULL REFERENCES public.user_tags(id) ON DELETE CASCADE,
    user_book_id UUID NOT NULL REFERENCES public.user_books(id) ON DELETE CASCADE,
    PRIMARY KEY (tag_id, user_book_id)
);

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

CREATE TABLE IF NOT EXISTS public.reading_list_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES public.reading_lists(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_list_book UNIQUE (list_id, book_id)
);

-- 5. Índices de Performance
CREATE INDEX IF NOT EXISTS idx_books_title_trgm ON public.books USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_books_isbn10 ON public.books (isbn10) WHERE isbn10 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_books_isbn13 ON public.books (isbn13) WHERE isbn13 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_books_publisher_id ON public.books (publisher_id);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON public.books (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_authors_name_trgm ON public.authors USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_genres_slug ON public.genres (slug);

CREATE INDEX IF NOT EXISTS idx_book_authors_book_id ON public.book_authors (book_id);
CREATE INDEX IF NOT EXISTS idx_book_authors_author_id ON public.book_authors (author_id);
CREATE INDEX IF NOT EXISTS idx_book_genres_book_id ON public.book_genres (book_id);
CREATE INDEX IF NOT EXISTS idx_book_genres_genre_id ON public.book_genres (genre_id);

CREATE INDEX IF NOT EXISTS idx_book_editions_book_id ON public.book_editions (book_id);
CREATE INDEX IF NOT EXISTS idx_book_editions_isbn13 ON public.book_editions (isbn13) WHERE isbn13 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_books_user_status ON public.user_books (user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_books_user_favorite ON public.user_books (user_id, favorite) WHERE favorite = true;
CREATE INDEX IF NOT EXISTS idx_user_books_user_updated ON public.user_books (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_books_book_id ON public.user_books (book_id);

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections (user_id, position);
CREATE INDEX IF NOT EXISTS idx_user_collections_collection ON public.user_collections (collection_id, position);
CREATE INDEX IF NOT EXISTS idx_user_collections_user_book ON public.user_collections (user_book_id);

CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON public.user_tags (user_id);
CREATE INDEX IF NOT EXISTS idx_user_book_tags_user_book ON public.user_book_tags (user_book_id);
CREATE INDEX IF NOT EXISTS idx_user_book_tags_tag ON public.user_book_tags (tag_id);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_book ON public.reading_sessions (user_book_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user ON public.reading_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notes_user_book ON public.user_notes (user_book_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_quotes_user_book ON public.user_quotes (user_book_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_reviews_book_id ON public.user_reviews (book_id) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_user_reviews_user_id ON public.user_reviews (user_id);

CREATE INDEX IF NOT EXISTS idx_reading_lists_user_id ON public.reading_lists (user_id);
CREATE INDEX IF NOT EXISTS idx_reading_list_books_list ON public.reading_list_books (list_id, position);

-- 6. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_book_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_list_books ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura Pública do Catálogo
DROP POLICY IF EXISTS "Catálogo: Leitura pública de livros" ON public.books;
CREATE POLICY "Catálogo: Leitura pública de livros" ON public.books FOR SELECT USING (true);

DROP POLICY IF EXISTS "Catálogo: Gestão restrita de livros" ON public.books;
CREATE POLICY "Catálogo: Gestão restrita de livros" ON public.books FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Catálogo: Leitura pública de autores" ON public.authors;
CREATE POLICY "Catálogo: Leitura pública de autores" ON public.authors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Catálogo: Gestão restrita de autores" ON public.authors;
CREATE POLICY "Catálogo: Gestão restrita de autores" ON public.authors FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Catálogo: Leitura pública de editoras" ON public.publishers;
CREATE POLICY "Catálogo: Leitura pública de editoras" ON public.publishers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Catálogo: Gestão restrita de editoras" ON public.publishers;
CREATE POLICY "Catálogo: Gestão restrita de editoras" ON public.publishers FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Catálogo: Leitura pública de gêneros" ON public.genres;
CREATE POLICY "Catálogo: Leitura pública de gêneros" ON public.genres FOR SELECT USING (true);

DROP POLICY IF EXISTS "Catálogo: Gestão restrita de gêneros" ON public.genres;
CREATE POLICY "Catálogo: Gestão restrita de gêneros" ON public.genres FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Catálogo: Leitura pública de edições" ON public.book_editions;
CREATE POLICY "Catálogo: Leitura pública de edições" ON public.book_editions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Catálogo: Gestão restrita de edições" ON public.book_editions;
CREATE POLICY "Catálogo: Gestão restrita de edições" ON public.book_editions FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Catálogo: Leitura pública de autores do livro" ON public.book_authors;
CREATE POLICY "Catálogo: Leitura pública de autores do livro" ON public.book_authors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Catálogo: Gestão restrita de autores do livro" ON public.book_authors;
CREATE POLICY "Catálogo: Gestão restrita de autores do livro" ON public.book_authors FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Catálogo: Leitura pública de gêneros do livro" ON public.book_genres;
CREATE POLICY "Catálogo: Leitura pública de gêneros do livro" ON public.book_genres FOR SELECT USING (true);

DROP POLICY IF EXISTS "Catálogo: Gestão restrita de gêneros do livro" ON public.book_genres;
CREATE POLICY "Catálogo: Gestão restrita de gêneros do livro" ON public.book_genres FOR ALL USING (auth.role() = 'service_role');

-- Políticas de Dados de Usuário
DROP POLICY IF EXISTS "Perfis: Leitura do dono ou perfis públicos" ON public.profiles;
CREATE POLICY "Perfis: Leitura do dono ou perfis públicos" ON public.profiles FOR SELECT USING (auth.uid() = id OR is_public = true);

DROP POLICY IF EXISTS "Perfis: Atualização restrita ao titular" ON public.profiles;
CREATE POLICY "Perfis: Atualização restrita ao titular" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "user_books: Leitura restrita ao titular" ON public.user_books;
CREATE POLICY "user_books: Leitura restrita ao titular" ON public.user_books FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_books: Inserção restrita ao titular" ON public.user_books;
CREATE POLICY "user_books: Inserção restrita ao titular" ON public.user_books FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_books: Atualização restrita ao titular" ON public.user_books;
CREATE POLICY "user_books: Atualização restrita ao titular" ON public.user_books FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_books: Exclusão restrita ao titular" ON public.user_books;
CREATE POLICY "user_books: Exclusão restrita ao titular" ON public.user_books FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coleções: Leitura do dono ou públicas" ON public.collections;
CREATE POLICY "Coleções: Leitura do dono ou públicas" ON public.collections FOR SELECT USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "Coleções: Gestão restrita ao dono" ON public.collections;
CREATE POLICY "Coleções: Gestão restrita ao dono" ON public.collections FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_collections: Leitura do dono ou coleções públicas" ON public.user_collections;
CREATE POLICY "user_collections: Leitura do dono ou coleções públicas" ON public.user_collections FOR SELECT USING (EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND (c.user_id = auth.uid() OR c.is_public = true)));

DROP POLICY IF EXISTS "user_collections: Gestão restrita ao dono" ON public.user_collections;
CREATE POLICY "user_collections: Gestão restrita ao dono" ON public.user_collections FOR ALL USING (EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND c.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND c.user_id = auth.uid()));

DROP POLICY IF EXISTS "Tags: Gestão restrita ao dono" ON public.user_tags;
CREATE POLICY "Tags: Gestão restrita ao dono" ON public.user_tags FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_book_tags: Gestão restrita ao dono" ON public.user_book_tags;
CREATE POLICY "user_book_tags: Gestão restrita ao dono" ON public.user_book_tags FOR ALL USING (EXISTS (SELECT 1 FROM public.user_tags t WHERE t.id = tag_id AND t.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.user_tags t WHERE t.id = tag_id AND t.user_id = auth.uid()));

DROP POLICY IF EXISTS "Sessões: Restrito ao próprio usuário" ON public.reading_sessions;
CREATE POLICY "Sessões: Restrito ao próprio usuário" ON public.reading_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Notas: Privadas para o titular" ON public.user_notes;
CREATE POLICY "Notas: Privadas para o titular" ON public.user_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Citações: Privadas para o titular" ON public.user_quotes;
CREATE POLICY "Citações: Privadas para o titular" ON public.user_quotes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Reviews: Leitura do autor ou públicas" ON public.user_reviews;
CREATE POLICY "Reviews: Leitura do autor ou públicas" ON public.user_reviews FOR SELECT USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "Reviews: Gestão exclusiva pelo autor" ON public.user_reviews;
CREATE POLICY "Reviews: Gestão exclusiva pelo autor" ON public.user_reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Listas: Leitura do titular ou públicas" ON public.reading_lists;
CREATE POLICY "Listas: Leitura do titular ou públicas" ON public.reading_lists FOR SELECT USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "Listas: Gestão exclusiva pelo dono" ON public.reading_lists;
CREATE POLICY "Listas: Gestão exclusiva pelo dono" ON public.reading_lists FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reading_list_books: Leitura se lista acessível" ON public.reading_list_books;
CREATE POLICY "reading_list_books: Leitura se lista acessível" ON public.reading_list_books FOR SELECT USING (EXISTS (SELECT 1 FROM public.reading_lists l WHERE l.id = list_id AND (l.user_id = auth.uid() OR l.is_public = true)));

DROP POLICY IF EXISTS "reading_list_books: Gestão pelo dono da lista" ON public.reading_list_books;
CREATE POLICY "reading_list_books: Gestão pelo dono da lista" ON public.reading_list_books FOR ALL USING (EXISTS (SELECT 1 FROM public.reading_lists l WHERE l.id = list_id AND l.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.reading_lists l WHERE l.id = list_id AND l.user_id = auth.uid()));
