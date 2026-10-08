-- ==============================================================================
-- TeleBooks Seed 002: Catálogo Bibliográfico Demonstrativo (Idempotente)
-- ==============================================================================

DO $$
DECLARE
    -- Editoras
    pub_arqueiro UUID;
    pub_record UUID;
    pub_aleph UUID;
    pub_edipro UUID;
    pub_editora34 UUID;
    pub_companhia UUID;

    -- Autores
    auth_patrick UUID;
    auth_gabriel UUID;
    auth_frank UUID;
    auth_platao UUID;
    auth_dostoievski UUID;
    auth_yuval UUID;

    -- Gêneros
    gen_fantasia UUID;
    gen_ficcao UUID;
    gen_classicos UUID;
    gen_filosofia UUID;
    gen_nao_ficcao UUID;

    -- Livros
    book_vento UUID;
    book_solidao UUID;
    book_duna UUID;
    book_republica UUID;
    book_crime UUID;
    book_sapiens UUID;
BEGIN
    -- 1. Editoras
    INSERT INTO public.publishers (name, website)
    VALUES ('Editora Arqueiro', 'https://editoraarqueiro.com.br')
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO pub_arqueiro;

    INSERT INTO public.publishers (name, website)
    VALUES ('Editora Record', 'https://editorarecord.com.br')
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO pub_record;

    INSERT INTO public.publishers (name, website)
    VALUES ('Editora Aleph', 'https://editoraaleph.com.br')
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO pub_aleph;

    INSERT INTO public.publishers (name, website)
    VALUES ('Edipro', 'https://edipro.com.br')
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO pub_edipro;

    INSERT INTO public.publishers (name, website)
    VALUES ('Editora 34', 'https://editora34.com.br')
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO pub_editora34;

    INSERT INTO public.publishers (name, website)
    VALUES ('Companhia das Letras', 'https://companhiadasletras.com.br')
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO pub_companhia;

    -- 2. Autores
    SELECT id INTO auth_patrick FROM public.authors WHERE name = 'Patrick Rothfuss' LIMIT 1;
    IF auth_patrick IS NULL THEN
        INSERT INTO public.authors (name, bio)
        VALUES ('Patrick Rothfuss', 'Escritor norte-americano de fantasia épica, autor da série A Crônica do Matador do Rei.')
        RETURNING id INTO auth_patrick;
    END IF;

    SELECT id INTO auth_gabriel FROM public.authors WHERE name = 'Gabriel García Márquez' LIMIT 1;
    IF auth_gabriel IS NULL THEN
        INSERT INTO public.authors (name, bio)
        VALUES ('Gabriel García Márquez', 'Escritor colombiano, vencedor do Prêmio Nobel de Literatura e mestre do realismo mágico.')
        RETURNING id INTO auth_gabriel;
    END IF;

    SELECT id INTO auth_frank FROM public.authors WHERE name = 'Frank Herbert' LIMIT 1;
    IF auth_frank IS NULL THEN
        INSERT INTO public.authors (name, bio)
        VALUES ('Frank Herbert', 'Escritor de ficção científica reverenciado pelo universo de Duna.')
        RETURNING id INTO auth_frank;
    END IF;

    SELECT id INTO auth_platao FROM public.authors WHERE name = 'Platão' LIMIT 1;
    IF auth_platao IS NULL THEN
        INSERT INTO public.authors (name, bio)
        VALUES ('Platão', 'Filósofo grego do período clássico, discípulo de Sócrates e fundador da Academia em Atenas.')
        RETURNING id INTO auth_platao;
    END IF;

    SELECT id INTO auth_dostoievski FROM public.authors WHERE name = 'Fiódor Dostoiévski' LIMIT 1;
    IF auth_dostoievski IS NULL THEN
        INSERT INTO public.authors (name, bio)
        VALUES ('Fiódor Dostoiévski', 'Um dos maiores romancistas e ensaístas russos da história.')
        RETURNING id INTO auth_dostoievski;
    END IF;

    SELECT id INTO auth_yuval FROM public.authors WHERE name = 'Yuval Noah Harari' LIMIT 1;
    IF auth_yuval IS NULL THEN
        INSERT INTO public.authors (name, bio)
        VALUES ('Yuval Noah Harari', 'Historiador, filósofo e professor israelense.')
        RETURNING id INTO auth_yuval;
    END IF;

    -- 3. Obter IDs dos Gêneros
    SELECT id INTO gen_fantasia FROM public.genres WHERE slug = 'fantasia';
    SELECT id INTO gen_ficcao FROM public.genres WHERE slug = 'ficcao-cientifica';
    SELECT id INTO gen_classicos FROM public.genres WHERE slug = 'classicos';
    SELECT id INTO gen_filosofia FROM public.genres WHERE slug = 'filosofia';
    SELECT id INTO gen_nao_ficcao FROM public.genres WHERE slug = 'nao-ficcao';

    -- 4. Livros
    SELECT id INTO book_vento FROM public.books WHERE isbn13 = '9788580419320' LIMIT 1;
    IF book_vento IS NULL THEN
        INSERT INTO public.books (title, subtitle, description, isbn10, isbn13, language, page_count, publisher_id, cover_url)
        VALUES (
            'O Nome do Vento',
            'A Crônica do Matador do Rei: Primeiro Dia',
            'A jornada lendária de Kvothe, desde sua infância em uma trupe de artistas até se tornar o mago mais notório do mundo.',
            '8580419323',
            '9788580419320',
            'pt-BR',
            656,
            pub_arqueiro,
            'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600'
        ) RETURNING id INTO book_vento;
    END IF;

    SELECT id INTO book_solidao FROM public.books WHERE isbn13 = '9788501012074' LIMIT 1;
    IF book_solidao IS NULL THEN
        INSERT INTO public.books (title, subtitle, description, isbn10, isbn13, language, page_count, publisher_id, cover_url)
        VALUES (
            'Cem Anos de Solidão',
            NULL,
            'A saga inesquecível da família Buendía na mágica e mítica aldeia de Macondo.',
            '8501012079',
            '9788501012074',
            'pt-BR',
            448,
            pub_record,
            'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600'
        ) RETURNING id INTO book_solidao;
    END IF;

    SELECT id INTO book_duna FROM public.books WHERE isbn13 = '9788576573135' LIMIT 1;
    IF book_duna IS NULL THEN
        INSERT INTO public.books (title, subtitle, description, isbn10, isbn13, language, page_count, publisher_id, cover_url)
        VALUES (
            'Duna',
            'As Crônicas de Duna: Livro 1',
            'Uma obra monumental sobre política, religião e ecologia no inóspito planeta desértico Arrakis.',
            '8576573138',
            '9788576573135',
            'pt-BR',
            680,
            pub_aleph,
            'https://images.unsplash.com/photo-1532012164546-f432f2e3777f?auto=format&fit=crop&q=80&w=600'
        ) RETURNING id INTO book_duna;
    END IF;

    SELECT id INTO book_republica FROM public.books WHERE isbn13 = '9788572836241' LIMIT 1;
    IF book_republica IS NULL THEN
        INSERT INTO public.books (title, subtitle, description, isbn10, isbn13, language, page_count, publisher_id, cover_url)
        VALUES (
            'A República',
            NULL,
            'O clássico diálogo socrático sobre a justiça, a ordem da pólis ideal e o mito da caverna.',
            '857283624X',
            '9788572836241',
            'pt-BR',
            384,
            pub_edipro,
            'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600'
        ) RETURNING id INTO book_republica;
    END IF;

    SELECT id INTO book_crime FROM public.books WHERE isbn13 = '9788573262117' LIMIT 1;
    IF book_crime IS NULL THEN
        INSERT INTO public.books (title, subtitle, description, isbn10, isbn13, language, page_count, publisher_id, cover_url)
        VALUES (
            'Crime e Castigo',
            NULL,
            'O dilema moral e tormento psicológico do jovem estudante Rodion Raskólnikov em São Petersburgo.',
            '8573262115',
            '9788573262117',
            'pt-BR',
            592,
            pub_editora34,
            'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=600'
        ) RETURNING id INTO book_crime;
    END IF;

    SELECT id INTO book_sapiens FROM public.books WHERE isbn13 = '9788535925920' LIMIT 1;
    IF book_sapiens IS NULL THEN
        INSERT INTO public.books (title, subtitle, description, isbn10, isbn13, language, page_count, publisher_id, cover_url)
        VALUES (
            'Sapiens: Uma Breve História da Humanidade',
            NULL,
            'Uma narrativa fascinante sobre como uma espécie insignificante de macacos se tornou a dominadora do planeta Terra.',
            '8535925925',
            '9788535925920',
            'pt-BR',
            464,
            pub_companhia,
            'https://images.unsplash.com/photo-1495640388908-05fa85288e61?auto=format&fit=crop&q=80&w=600'
        ) RETURNING id INTO book_sapiens;
    END IF;

    -- 5. Relações Autores e Gêneros
    INSERT INTO public.book_authors (book_id, author_id, is_primary) VALUES
        (book_vento, auth_patrick, true),
        (book_solidao, auth_gabriel, true),
        (book_duna, auth_frank, true),
        (book_republica, auth_platao, true),
        (book_crime, auth_dostoievski, true),
        (book_sapiens, auth_yuval, true)
    ON CONFLICT DO NOTHING;

    IF gen_fantasia IS NOT NULL THEN
        INSERT INTO public.book_genres (book_id, genre_id) VALUES (book_vento, gen_fantasia) ON CONFLICT DO NOTHING;
    END IF;

    IF gen_ficcao IS NOT NULL THEN
        INSERT INTO public.book_genres (book_id, genre_id) VALUES (book_duna, gen_ficcao) ON CONFLICT DO NOTHING;
    END IF;

    IF gen_classicos IS NOT NULL THEN
        INSERT INTO public.book_genres (book_id, genre_id) VALUES
            (book_solidao, gen_classicos),
            (book_crime, gen_classicos)
        ON CONFLICT DO NOTHING;
    END IF;

    IF gen_filosofia IS NOT NULL THEN
        INSERT INTO public.book_genres (book_id, genre_id) VALUES (book_republica, gen_filosofia) ON CONFLICT DO NOTHING;
    END IF;

    IF gen_nao_ficcao IS NOT NULL THEN
        INSERT INTO public.book_genres (book_id, genre_id) VALUES (book_sapiens, gen_nao_ficcao) ON CONFLICT DO NOTHING;
    END IF;
END $$;
