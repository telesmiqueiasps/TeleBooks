-- ==============================================================================
-- TeleBooks Migration 00014: Sistema de Comunidades e Grupos Literários
-- ==============================================================================

BEGIN;

-- 1. Tabela Principal de Comunidades
CREATE TABLE IF NOT EXISTS public.communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    is_private BOOLEAN NOT NULL DEFAULT false,
    only_admins_can_post BOOLEAN NOT NULL DEFAULT false,
    avatar_url TEXT,
    cover_url TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabela de Membros da Comunidade (com papéis e status de aprovação)
CREATE TABLE IF NOT EXISTS public.community_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_community_member UNIQUE (community_id, user_id)
);

-- 3. Tabela de Mensagens da Comunidade (apenas texto, opcionalmente com livro vinculado)
CREATE TABLE IF NOT EXISTS public.community_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(trim(content)) >= 1 AND char_length(content) <= 3000),
    book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
    is_poll BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabela de Enquetes na Mensagem
CREATE TABLE IF NOT EXISTS public.community_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.community_messages(id) ON DELETE CASCADE UNIQUE,
    question VARCHAR(300) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tabela de Opções da Enquete
CREATE TABLE IF NOT EXISTS public.community_poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
    option_text VARCHAR(200) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
);

-- 6. Tabela de Votos da Enquete (1 voto por usuário por enquete)
CREATE TABLE IF NOT EXISTS public.community_poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES public.community_poll_options(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_poll_user_vote UNIQUE (poll_id, user_id)
);

-- 7. Tabela de Curtidas em Mensagens da Comunidade
CREATE TABLE IF NOT EXISTS public.community_message_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.community_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_community_msg_like UNIQUE (message_id, user_id)
);

-- 8. Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_communities_slug ON public.communities (slug);
CREATE INDEX IF NOT EXISTS idx_communities_created_by ON public.communities (created_by);
CREATE INDEX IF NOT EXISTS idx_communities_is_private ON public.communities (is_private, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_members_comm ON public.community_members (community_id, status);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON public.community_members (user_id, status);
CREATE INDEX IF NOT EXISTS idx_community_messages_comm ON public.community_messages (community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_poll_options_poll ON public.community_poll_options (poll_id, position);
CREATE INDEX IF NOT EXISTS idx_community_poll_votes_poll ON public.community_poll_votes (poll_id);
CREATE INDEX IF NOT EXISTS idx_community_message_likes_msg ON public.community_message_likes (message_id);

-- 9. Habilitar RLS em Todas as Tabelas de Comunidade
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_message_likes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Comunidades
DROP POLICY IF EXISTS "Comunidades públicas ou pertencentes ao usuário são visíveis" ON public.communities;
CREATE POLICY "Comunidades públicas ou pertencentes ao usuário são visíveis"
    ON public.communities FOR SELECT
    TO authenticated
    USING (
        NOT is_private OR 
        created_by = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.community_members cm
            WHERE cm.community_id = id AND cm.user_id = auth.uid() AND cm.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Usuários autenticados podem criar comunidades" ON public.communities;
CREATE POLICY "Usuários autenticados podem criar comunidades"
    ON public.communities FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins da comunidade podem editar informações" ON public.communities;
CREATE POLICY "Admins da comunidade podem editar informações"
    ON public.communities FOR UPDATE
    TO authenticated
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.community_members cm
            WHERE cm.community_id = id AND cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin') AND cm.status = 'active'
        )
    );

-- Políticas de RLS para Membros
DROP POLICY IF EXISTS "Membros são visíveis para membros ativos da comunidade ou se comunidade for pública" ON public.community_members;
CREATE POLICY "Membros são visíveis para membros ativos da comunidade ou se comunidade for pública"
    ON public.community_members FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.communities c
            WHERE c.id = community_id AND (
                NOT c.is_private OR 
                c.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.community_members self_m
                    WHERE self_m.community_id = c.id AND self_m.user_id = auth.uid() AND self_m.status = 'active'
                )
            )
        )
    );

DROP POLICY IF EXISTS "Usuários podem se associar ou solicitar entrada" ON public.community_members;
CREATE POLICY "Usuários podem se associar ou solicitar entrada"
    ON public.community_members FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.community_members admin_m
            WHERE admin_m.community_id = community_id AND admin_m.user_id = auth.uid() AND admin_m.role IN ('owner', 'admin')
        )
    );

DROP POLICY IF EXISTS "Admins podem atualizar membros ou usuários saírem" ON public.community_members;
CREATE POLICY "Admins podem atualizar membros ou usuários saírem"
    ON public.community_members FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.community_members admin_m
            WHERE admin_m.community_id = community_id AND admin_m.user_id = auth.uid() AND admin_m.role IN ('owner', 'admin')
        )
    );

DROP POLICY IF EXISTS "Admins podem remover membros ou usuário sair" ON public.community_members;
CREATE POLICY "Admins podem remover membros ou usuário sair"
    ON public.community_members FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.community_members admin_m
            WHERE admin_m.community_id = community_id AND admin_m.user_id = auth.uid() AND admin_m.role IN ('owner', 'admin')
        )
    );

-- Políticas de RLS para Mensagens
DROP POLICY IF EXISTS "Mensagens visíveis para membros ativos da comunidade ou comunidades públicas" ON public.community_messages;
CREATE POLICY "Mensagens visíveis para membros ativos da comunidade ou comunidades públicas"
    ON public.community_messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.communities c
            WHERE c.id = community_id AND (
                (NOT c.is_private AND EXISTS (
                    SELECT 1 FROM public.community_members m
                    WHERE m.community_id = c.id AND m.user_id = auth.uid() AND m.status = 'active'
                )) OR
                (c.is_private AND EXISTS (
                    SELECT 1 FROM public.community_members m
                    WHERE m.community_id = c.id AND m.user_id = auth.uid() AND m.status = 'active'
                ))
            )
        )
    );

DROP POLICY IF EXISTS "Membros ativos podem enviar mensagens respeitando restrição de admin" ON public.community_messages;
CREATE POLICY "Membros ativos podem enviar mensagens respeitando restrição de admin"
    ON public.community_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.communities c
            JOIN public.community_members m ON m.community_id = c.id
            WHERE c.id = community_id AND m.user_id = auth.uid() AND m.status = 'active'
            AND (NOT c.only_admins_can_post OR m.role IN ('owner', 'admin'))
        )
    );

-- Políticas de RLS para Enquetes e Opções
DROP POLICY IF EXISTS "Enquetes visíveis para autenticados" ON public.community_polls;
CREATE POLICY "Enquetes visíveis para autenticados" ON public.community_polls FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Opções visíveis para autenticados" ON public.community_poll_options;
CREATE POLICY "Opções visíveis para autenticados" ON public.community_poll_options FOR SELECT TO authenticated USING (true);

-- Políticas de RLS para Votos
DROP POLICY IF EXISTS "Votos visíveis para autenticados" ON public.community_poll_votes;
CREATE POLICY "Votos visíveis para autenticados" ON public.community_poll_votes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Membros podem votar em enquetes" ON public.community_poll_votes;
CREATE POLICY "Membros podem votar em enquetes" ON public.community_poll_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Políticas de RLS para Curtidas
DROP POLICY IF EXISTS "Curtidas visíveis para autenticados" ON public.community_message_likes;
CREATE POLICY "Curtidas visíveis para autenticados" ON public.community_message_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuários podem curtir mensagens" ON public.community_message_likes;
CREATE POLICY "Usuários podem curtir mensagens" ON public.community_message_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Usuários podem descurtir mensagens" ON public.community_message_likes;
CREATE POLICY "Usuários podem descurtir mensagens" ON public.community_message_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

COMMIT;
