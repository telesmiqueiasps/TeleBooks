-- ==============================================================================
-- TeleBooks Seed 001: Gêneros Literários Iniciais
-- ==============================================================================

INSERT INTO public.genres (name, slug)
VALUES
    ('Fantasia', 'fantasia'),
    ('Ficção Científica', 'ficcao-cientifica'),
    ('Distopia', 'distopia'),
    ('Romance', 'romance'),
    ('Mistério & Suspense', 'misterio-suspense'),
    ('Terror & Horror', 'terror-horror'),
    ('Clássicos', 'classicos'),
    ('Filosofia', 'filosofia'),
    ('História', 'historia'),
    ('Biografia & Memórias', 'biografia-memorias'),
    ('Poesia', 'poesia'),
    ('Não-Ficção', 'nao-ficcao'),
    ('Desenvolvimento Pessoal', 'desenvolvimento-pessoal'),
    ('Suspense Psicológico', 'suspense-psicologico')
ON CONFLICT (slug) DO NOTHING;
