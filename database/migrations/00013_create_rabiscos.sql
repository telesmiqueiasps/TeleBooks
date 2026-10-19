-- ==============================================================================
-- TeleBooks Migration 00013: Sistema de Rabiscos (Stories Efêmeros de 24 horas)
-- ==============================================================================

BEGIN;

-- 1. Tabela Principal de Rabiscos (Stories de texto efêmeros)
CREATE TABLE IF NOT EXISTS public.rabiscos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(trim(content)) >= 1 AND char_length(content) <= 300),
    background_style VARCHAR(50) NOT NULL DEFAULT 'gradient-blue',
    font_style VARCHAR(30) NOT NULL DEFAULT 'sans',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- 2. Tabela de Visualizações de Rabiscos (para saber quem já viu e status unread/seen)
CREATE TABLE IF NOT EXISTS public.rabisco_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rabisco_id UUID NOT NULL REFERENCES public.rabiscos(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_rabisco_viewer UNIQUE (rabisco_id, viewer_id)
);

-- 3. Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_rabiscos_active ON public.rabiscos (expires_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rabiscos_user ON public.rabiscos (user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_rabisco_views_rabisco ON public.rabisco_views (rabisco_id);
CREATE INDEX IF NOT EXISTS idx_rabisco_views_viewer ON public.rabisco_views (viewer_id, rabisco_id);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE public.rabiscos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rabisco_views ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Rabiscos
DROP POLICY IF EXISTS "Rabiscos são visíveis para todos os usuários autenticados" ON public.rabiscos;
CREATE POLICY "Rabiscos são visíveis para todos os usuários autenticados"
    ON public.rabiscos FOR SELECT
    TO authenticated
    USING (expires_at > now());

DROP POLICY IF EXISTS "Usuários podem criar seus próprios rabiscos" ON public.rabiscos;
CREATE POLICY "Usuários podem criar seus próprios rabiscos"
    ON public.rabiscos FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem deletar seus próprios rabiscos" ON public.rabiscos;
CREATE POLICY "Usuários podem deletar seus próprios rabiscos"
    ON public.rabiscos FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Políticas de RLS para Visualizações
DROP POLICY IF EXISTS "Visualizações são visíveis para o autor e visualizador" ON public.rabisco_views;
CREATE POLICY "Visualizações são visíveis para o autor e visualizador"
    ON public.rabisco_views FOR SELECT
    TO authenticated
    USING (
        auth.uid() = viewer_id OR 
        EXISTS (SELECT 1 FROM public.rabiscos WHERE rabiscos.id = rabisco_views.rabisco_id AND rabiscos.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Usuários podem registrar suas próprias visualizações" ON public.rabisco_views;
CREATE POLICY "Usuários podem registrar suas próprias visualizações"
    ON public.rabisco_views FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = viewer_id);

COMMIT;
