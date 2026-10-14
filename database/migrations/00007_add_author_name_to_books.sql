-- ==============================================================================
-- TeleBooks Migration 00007: Adiciona coluna author_name na tabela books
-- Facilita cadastro direto via SQL e consultas sem JOIN obrigatório
-- ==============================================================================

ALTER TABLE public.books ADD COLUMN IF NOT EXISTS author_name TEXT;

-- Preenche author_name com os autores existentes na tabela book_authors
UPDATE public.books b
SET author_name = sub.authors
FROM (
    SELECT ba.book_id, STRING_AGG(a.name, ', ' ORDER BY ba.is_primary DESC, a.name ASC) AS authors
    FROM public.book_authors ba
    JOIN public.authors a ON a.id = ba.author_id
    GROUP BY ba.book_id
) sub
WHERE b.id = sub.book_id AND (b.author_name IS NULL OR b.author_name = '');

-- Índice para buscas textuais e de ordenação por autor
CREATE INDEX IF NOT EXISTS idx_books_author_name ON public.books (author_name);
