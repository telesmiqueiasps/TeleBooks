-- ==============================================================================
-- TeleBooks Migration 00008: Deduplicação e Índices Únicos Normalizados
-- (lower(trim(name))) para Editoras (publishers), Autores (authors) e Relação (book_authors)
-- Garante zero perda de livros e edições, reatribuindo chaves estrangeiras.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. DEDUPLICAÇÃO E UNIFICAÇÃO DE EDITORAS (PUBLISHERS)
-- ==============================================================================

-- Tabela temporária mapeando duplicadas para o ID canônico escolhido
-- Critério do canônico:
-- 1. Possui website preenchido
-- 2. Registro mais antigo (created_at ASC)
-- 3. Menor UUID (desempate determinístico)
DROP TABLE IF EXISTS tmp_publishers_dedup;
CREATE TEMP TABLE tmp_publishers_dedup AS
WITH ranked_publishers AS (
    SELECT
        id,
        name,
        website,
        created_at,
        FIRST_VALUE(id) OVER (
            PARTITION BY lower(trim(name))
            ORDER BY
                (website IS NOT NULL AND trim(website) <> '') DESC,
                created_at ASC,
                id ASC
        ) AS canonical_id,
        ROW_NUMBER() OVER (
            PARTITION BY lower(trim(name))
            ORDER BY
                (website IS NOT NULL AND trim(website) <> '') DESC,
                created_at ASC,
                id ASC
        ) AS rn
    FROM public.publishers
)
SELECT
    id AS duplicate_id,
    canonical_id,
    website
FROM ranked_publishers
WHERE rn > 1;

-- 1.1 Se a editora canônica não tiver website e alguma duplicada tiver, aproveita a informação
UPDATE public.publishers p
SET website = sub.website
FROM (
    SELECT
        canonical_id,
        (ARRAY_AGG(website) FILTER (WHERE website IS NOT NULL AND trim(website) <> ''))[1] AS website
    FROM tmp_publishers_dedup
    GROUP BY canonical_id
) sub
WHERE p.id = sub.canonical_id
  AND (p.website IS NULL OR trim(p.website) = '')
  AND sub.website IS NOT NULL;

-- 1.2 Reatribui livros (public.books) que apontavam para as editoras duplicadas
UPDATE public.books b
SET publisher_id = d.canonical_id
FROM tmp_publishers_dedup d
WHERE b.publisher_id = d.duplicate_id;

-- 1.3 Reatribui edições de livros (public.book_editions) que apontavam para as duplicadas
UPDATE public.book_editions be
SET publisher_id = d.canonical_id
FROM tmp_publishers_dedup d
WHERE be.publisher_id = d.duplicate_id;

-- 1.4 Exclui as editoras duplicadas com segurança (nenhum livro ficou órfão)
DELETE FROM public.publishers p
USING tmp_publishers_dedup d
WHERE p.id = d.duplicate_id;

-- 1.5 Limpa espaços nas extremidades (trim) dos nomes das editoras restantes
UPDATE public.publishers
SET name = trim(name)
WHERE name <> trim(name);

DROP TABLE IF EXISTS tmp_publishers_dedup;

-- ==============================================================================
-- 2. DEDUPLICAÇÃO E UNIFICAÇÃO DE AUTORES (AUTHORS)
-- ==============================================================================

-- Tabela temporária mapeando autores duplicados para o ID canônico escolhido
-- Critério do canônico:
-- 1. Possui bio preenchida
-- 2. Possui foto (avatar_url) preenchida
-- 3. Possui data de nascimento preenchida
-- 4. Registro mais antigo (created_at ASC)
-- 5. Menor UUID (desempate determinístico)
DROP TABLE IF EXISTS tmp_authors_dedup;
CREATE TEMP TABLE tmp_authors_dedup AS
WITH ranked_authors AS (
    SELECT
        id,
        name,
        bio,
        avatar_url,
        birth_date,
        death_date,
        created_at,
        FIRST_VALUE(id) OVER (
            PARTITION BY lower(trim(name))
            ORDER BY
                (bio IS NOT NULL AND trim(bio) <> '') DESC,
                (avatar_url IS NOT NULL AND trim(avatar_url) <> '') DESC,
                (birth_date IS NOT NULL) DESC,
                created_at ASC,
                id ASC
        ) AS canonical_id,
        ROW_NUMBER() OVER (
            PARTITION BY lower(trim(name))
            ORDER BY
                (bio IS NOT NULL AND trim(bio) <> '') DESC,
                (avatar_url IS NOT NULL AND trim(avatar_url) <> '') DESC,
                (birth_date IS NOT NULL) DESC,
                created_at ASC,
                id ASC
        ) AS rn
    FROM public.authors
)
SELECT
    id AS duplicate_id,
    canonical_id,
    bio,
    avatar_url,
    birth_date,
    death_date
FROM ranked_authors
WHERE rn > 1;

-- 2.1 Enriquece o autor canônico com dados que faltem nele mas existam nas duplicadas
UPDATE public.authors a
SET
    bio = COALESCE(a.bio, sub.bio),
    avatar_url = COALESCE(a.avatar_url, sub.avatar_url),
    birth_date = COALESCE(a.birth_date, sub.birth_date),
    death_date = COALESCE(a.death_date, sub.death_date)
FROM (
    SELECT
        canonical_id,
        (ARRAY_AGG(bio) FILTER (WHERE bio IS NOT NULL AND trim(bio) <> ''))[1] AS bio,
        (ARRAY_AGG(avatar_url) FILTER (WHERE avatar_url IS NOT NULL AND trim(avatar_url) <> ''))[1] AS avatar_url,
        (ARRAY_AGG(birth_date) FILTER (WHERE birth_date IS NOT NULL))[1] AS birth_date,
        (ARRAY_AGG(death_date) FILTER (WHERE death_date IS NOT NULL))[1] AS death_date
    FROM tmp_authors_dedup
    GROUP BY canonical_id
) sub
WHERE a.id = sub.canonical_id;

-- 2.2 Reatribuição e unificação de vínculos na tabela book_authors
-- Coletamos todas as associações de livros afetadas (canônicos e duplicados)
-- Preservamos is_primary = true se QUALQUER uma das duplicadas ou o canônico for primário
DROP TABLE IF EXISTS tmp_affected_book_authors;
CREATE TEMP TABLE tmp_affected_book_authors AS
SELECT
    ba.book_id,
    COALESCE(d.canonical_id, ba.author_id) AS resolved_author_id,
    bool_or(ba.is_primary) AS is_primary
FROM public.book_authors ba
LEFT JOIN tmp_authors_dedup d ON ba.author_id = d.duplicate_id
WHERE ba.author_id IN (SELECT duplicate_id FROM tmp_authors_dedup)
   OR ba.author_id IN (SELECT canonical_id FROM tmp_authors_dedup)
GROUP BY ba.book_id, COALESCE(d.canonical_id, ba.author_id);

-- Removemos com segurança as associações antigas correspondentes
DELETE FROM public.book_authors ba
WHERE ba.author_id IN (SELECT duplicate_id FROM tmp_authors_dedup)
   OR ba.author_id IN (SELECT canonical_id FROM tmp_authors_dedup);

-- Inserimos as associações consolidadas sem risco de conflito de chave única/primária
INSERT INTO public.book_authors (book_id, author_id, is_primary)
SELECT book_id, resolved_author_id, is_primary
FROM tmp_affected_book_authors;

DROP TABLE IF EXISTS tmp_affected_book_authors;

-- 2.3 Exclui os autores duplicados com segurança (nenhum livro ou relação ficou órfã)
DELETE FROM public.authors a
USING tmp_authors_dedup d
WHERE a.id = d.duplicate_id;

-- 2.4 Limpa espaços nas extremidades (trim) dos nomes dos autores restantes
UPDATE public.authors
SET name = trim(name)
WHERE name <> trim(name);

DROP TABLE IF EXISTS tmp_authors_dedup;

-- 2.5 Atualiza a coluna denormalizada author_name na tabela books para refletir os nomes consolidados
UPDATE public.books b
SET author_name = sub.authors
FROM (
    SELECT
        ba.book_id,
        STRING_AGG(a.name, ', ' ORDER BY ba.is_primary DESC, a.name ASC) AS authors
    FROM public.book_authors ba
    JOIN public.authors a ON a.id = ba.author_id
    GROUP BY ba.book_id
) sub
WHERE b.id = sub.book_id
  AND (b.author_name IS DISTINCT FROM sub.authors);

-- ==============================================================================
-- 3. LIMPEZA PREVENTIVA DE DUPLICATAS EM BOOK_AUTHORS (SE HOUVER)
-- ==============================================================================
DELETE FROM public.book_authors ba
WHERE ba.ctid NOT IN (
    SELECT min(ctid)
    FROM public.book_authors
    GROUP BY book_id, author_id
);

-- ==============================================================================
-- 4. CRIAÇÃO DOS ÍNDICES ÚNICOS NORMALIZADOS
-- ==============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS publishers_name_normalized_uidx
ON public.publishers (lower(trim(name)));

CREATE UNIQUE INDEX IF NOT EXISTS authors_name_normalized_uidx
ON public.authors (lower(trim(name)));

CREATE UNIQUE INDEX IF NOT EXISTS book_authors_book_author_uidx
ON public.book_authors (book_id, author_id);

COMMIT;
