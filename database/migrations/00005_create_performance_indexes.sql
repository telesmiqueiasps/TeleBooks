-- ==============================================================================
-- TeleBooks Migration 00005: Índices de Alta Performance
-- Otimização para buscas textuais, filtros de estante e integridade relacional.
-- ==============================================================================

-- 1. Índices no Catálogo Bibliográfico Global
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

-- 2. Índices na Estante do Usuário (user_books)
-- Muito frequente: buscar livros do usuário por status ou ordenados por atualização
CREATE INDEX IF NOT EXISTS idx_user_books_user_status ON public.user_books (user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_books_user_favorite ON public.user_books (user_id, favorite) WHERE favorite = true;
CREATE INDEX IF NOT EXISTS idx_user_books_user_updated ON public.user_books (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_books_book_id ON public.user_books (book_id);

-- 3. Índices em Coleções e Tags
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections (user_id, position);
CREATE INDEX IF NOT EXISTS idx_user_collections_collection ON public.user_collections (collection_id, position);
CREATE INDEX IF NOT EXISTS idx_user_collections_user_book ON public.user_collections (user_book_id);

CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON public.user_tags (user_id);
CREATE INDEX IF NOT EXISTS idx_user_book_tags_user_book ON public.user_book_tags (user_book_id);
CREATE INDEX IF NOT EXISTS idx_user_book_tags_tag ON public.user_book_tags (tag_id);

-- 4. Índices em Sessões de Leitura, Notas e Citações
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_book ON public.reading_sessions (user_book_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user ON public.reading_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notes_user_book ON public.user_notes (user_book_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_quotes_user_book ON public.user_quotes (user_book_id, created_at DESC);

-- 5. Índices em Avaliações e Listas
CREATE INDEX IF NOT EXISTS idx_user_reviews_book_id ON public.user_reviews (book_id) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_user_reviews_user_id ON public.user_reviews (user_id);

CREATE INDEX IF NOT EXISTS idx_reading_lists_user_id ON public.reading_lists (user_id);
CREATE INDEX IF NOT EXISTS idx_reading_list_books_list ON public.reading_list_books (list_id, position);
