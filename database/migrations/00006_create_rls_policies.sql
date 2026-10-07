-- ==============================================================================
-- TeleBooks Migration 00006: Políticas de Segurança em Nível de Linha (RLS)
-- Regra de Ouro da Segurança: Dados privados nunca vazam entre usuários.
-- Nenhum cliente pode acessar ou modificar registros que pertençam a outro usuário.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Habilitar RLS em TODAS as Tabelas
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 2. Políticas para Catálogo Bibliográfico Global (Leitura Pública)
-- ------------------------------------------------------------------------------

-- Livros
DROP POLICY IF EXISTS "Catálogo: Qualquer pessoa pode visualizar livros" ON public.books;
CREATE POLICY "Catálogo: Qualquer pessoa pode visualizar livros"
    ON public.books FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Catálogo: Apenas serviço backend insere ou edita livros" ON public.books;
CREATE POLICY "Catálogo: Apenas serviço backend insere ou edita livros"
    ON public.books FOR ALL
    USING (auth.role() = 'service_role');

-- Autores
DROP POLICY IF EXISTS "Catálogo: Qualquer pessoa pode visualizar autores" ON public.authors;
CREATE POLICY "Catálogo: Qualquer pessoa pode visualizar autores"
    ON public.authors FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Catálogo: Apenas serviço backend insere ou edita autores" ON public.authors;
CREATE POLICY "Catálogo: Apenas serviço backend insere ou edita autores"
    ON public.authors FOR ALL
    USING (auth.role() = 'service_role');

-- Editoras
DROP POLICY IF EXISTS "Catálogo: Qualquer pessoa pode visualizar editoras" ON public.publishers;
CREATE POLICY "Catálogo: Qualquer pessoa pode visualizar editoras"
    ON public.publishers FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Catálogo: Apenas serviço backend insere ou edita editoras" ON public.publishers;
CREATE POLICY "Catálogo: Apenas serviço backend insere ou edita editoras"
    ON public.publishers FOR ALL
    USING (auth.role() = 'service_role');

-- Gêneros
DROP POLICY IF EXISTS "Catálogo: Qualquer pessoa pode visualizar gêneros" ON public.genres;
CREATE POLICY "Catálogo: Qualquer pessoa pode visualizar gêneros"
    ON public.genres FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Catálogo: Apenas serviço backend insere ou edita gêneros" ON public.genres;
CREATE POLICY "Catálogo: Apenas serviço backend insere ou edita gêneros"
    ON public.genres FOR ALL
    USING (auth.role() = 'service_role');

-- Edições
DROP POLICY IF EXISTS "Catálogo: Qualquer pessoa pode visualizar edições" ON public.book_editions;
CREATE POLICY "Catálogo: Qualquer pessoa pode visualizar edições"
    ON public.book_editions FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Catálogo: Apenas serviço backend insere ou edita edições" ON public.book_editions;
CREATE POLICY "Catálogo: Apenas serviço backend insere ou edita edições"
    ON public.book_editions FOR ALL
    USING (auth.role() = 'service_role');

-- Junções N:N do Catálogo
DROP POLICY IF EXISTS "Catálogo: Leitura pública de autores do livro" ON public.book_authors;
CREATE POLICY "Catálogo: Leitura pública de autores do livro"
    ON public.book_authors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Catálogo: Gestão restrita de autores do livro" ON public.book_authors;
CREATE POLICY "Catálogo: Gestão restrita de autores do livro"
    ON public.book_authors FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Catálogo: Leitura pública de gêneros do livro" ON public.book_genres;
CREATE POLICY "Catálogo: Leitura pública de gêneros do livro"
    ON public.book_genres FOR SELECT USING (true);

DROP POLICY IF EXISTS "Catálogo: Gestão restrita de gêneros do livro" ON public.book_genres;
CREATE POLICY "Catálogo: Gestão restrita de gêneros do livro"
    ON public.book_genres FOR ALL USING (auth.role() = 'service_role');

-- ------------------------------------------------------------------------------
-- 3. Políticas para Profiles
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Perfis: Próprio usuário ou perfis públicos podem ser visualizados" ON public.profiles;
CREATE POLICY "Perfis: Próprio usuário ou perfis públicos podem ser visualizados"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR is_public = true);

DROP POLICY IF EXISTS "Perfis: Usuário pode atualizar apenas o seu próprio perfil" ON public.profiles;
CREATE POLICY "Perfis: Usuário pode atualizar apenas o seu próprio perfil"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 4. Políticas para user_books (Estante Pessoal)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "user_books: Usuário acessa apenas seus próprios vínculos" ON public.user_books;
CREATE POLICY "user_books: Usuário acessa apenas seus próprios vínculos"
    ON public.user_books FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_books: Usuário insere apenas em sua própria estante" ON public.user_books;
CREATE POLICY "user_books: Usuário insere apenas em sua própria estante"
    ON public.user_books FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_books: Usuário atualiza apenas seus próprios livros" ON public.user_books;
CREATE POLICY "user_books: Usuário atualiza apenas seus próprios livros"
    ON public.user_books FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_books: Usuário exclui apenas seus próprios livros" ON public.user_books;
CREATE POLICY "user_books: Usuário exclui apenas seus próprios livros"
    ON public.user_books FOR DELETE
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 5. Políticas para Coleções (collections & user_collections)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Coleções: Visualização do proprietário ou coleções públicas" ON public.collections;
CREATE POLICY "Coleções: Visualização do proprietário ou coleções públicas"
    ON public.collections FOR SELECT
    USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "Coleções: Usuário cria em seu próprio nome" ON public.collections;
CREATE POLICY "Coleções: Usuário cria em seu próprio nome"
    ON public.collections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coleções: Usuário gerencia apenas suas coleções" ON public.collections;
CREATE POLICY "Coleções: Usuário gerencia apenas suas coleções"
    ON public.collections FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coleções: Usuário remove apenas suas coleções" ON public.collections;
CREATE POLICY "Coleções: Usuário remove apenas suas coleções"
    ON public.collections FOR DELETE
    USING (auth.uid() = user_id);

-- user_collections (itens da coleção)
DROP POLICY IF EXISTS "user_collections: Visualização por donos da coleção ou pública" ON public.user_collections;
CREATE POLICY "user_collections: Visualização por donos da coleção ou pública"
    ON public.user_collections FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.collections c
            WHERE c.id = collection_id AND (c.user_id = auth.uid() OR c.is_public = true)
        )
    );

DROP POLICY IF EXISTS "user_collections: Apenas dono da coleção adiciona livros" ON public.user_collections;
CREATE POLICY "user_collections: Apenas dono da coleção adiciona livros"
    ON public.user_collections FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.collections c
            WHERE c.id = collection_id AND c.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "user_collections: Apenas dono da coleção remove livros" ON public.user_collections;
CREATE POLICY "user_collections: Apenas dono da coleção remove livros"
    ON public.user_collections FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.collections c
            WHERE c.id = collection_id AND c.user_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 6. Políticas para Tags (user_tags & user_book_tags)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Tags: Gestão restrita ao dono da tag" ON public.user_tags;
CREATE POLICY "Tags: Gestão restrita ao dono da tag"
    ON public.user_tags FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_book_tags: Gestão restrita ao dono da tag" ON public.user_book_tags;
CREATE POLICY "user_book_tags: Gestão restrita ao dono da tag"
    ON public.user_book_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_tags t
            WHERE t.id = tag_id AND t.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_tags t
            WHERE t.id = tag_id AND t.user_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 7. Políticas para Sessões de Leitura, Notas e Citações Privadas
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Sessões: Restrito ao próprio leitor" ON public.reading_sessions;
CREATE POLICY "Sessões: Restrito ao próprio leitor"
    ON public.reading_sessions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Notas: Privadas para o próprio usuário" ON public.user_notes;
CREATE POLICY "Notas: Privadas para o próprio usuário"
    ON public.user_notes FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Citações: Privadas para o próprio usuário" ON public.user_quotes;
CREATE POLICY "Citações: Privadas para o próprio usuário"
    ON public.user_quotes FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 8. Políticas para Avaliações (user_reviews)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Reviews: Leitura do autor ou avaliações públicas" ON public.user_reviews;
CREATE POLICY "Reviews: Leitura do autor ou avaliações públicas"
    ON public.user_reviews FOR SELECT
    USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "Reviews: Criação restrita ao próprio usuário" ON public.user_reviews;
CREATE POLICY "Reviews: Criação restrita ao próprio usuário"
    ON public.user_reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Reviews: Edição restrita ao próprio autor" ON public.user_reviews;
CREATE POLICY "Reviews: Edição restrita ao próprio autor"
    ON public.user_reviews FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Reviews: Exclusão restrita ao próprio autor" ON public.user_reviews;
CREATE POLICY "Reviews: Exclusão restrita ao próprio autor"
    ON public.user_reviews FOR DELETE
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 9. Políticas para Listas de Leitura (reading_lists & reading_list_books)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Listas: Leitura do dono ou listas públicas" ON public.reading_lists;
CREATE POLICY "Listas: Leitura do dono ou listas públicas"
    ON public.reading_lists FOR SELECT
    USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "Listas: Gestão exclusiva pelo dono" ON public.reading_lists;
CREATE POLICY "Listas: Gestão exclusiva pelo dono"
    ON public.reading_lists FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reading_list_books: Visualização permitida se lista for acessível" ON public.reading_list_books;
CREATE POLICY "reading_list_books: Visualização permitida se lista for acessível"
    ON public.reading_list_books FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.reading_lists l
            WHERE l.id = list_id AND (l.user_id = auth.uid() OR l.is_public = true)
        )
    );

DROP POLICY IF EXISTS "reading_list_books: Gestão exclusiva pelo dono da lista" ON public.reading_list_books;
CREATE POLICY "reading_list_books: Gestão exclusiva pelo dono da lista"
    ON public.reading_list_books FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.reading_lists l
            WHERE l.id = list_id AND l.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.reading_lists l
            WHERE l.id = list_id AND l.user_id = auth.uid()
        )
    );
