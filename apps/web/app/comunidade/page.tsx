"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  Search,
  Plus,
  Compass,
  Bookmark,
  ShieldCheck,
  Loader2,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { Button, Input, Skeleton, cn } from "@telebooks/ui";
import { AppShell } from "../../components/shell/app-shell";
import { useAuth } from "../../components/auth/auth-provider";
import { api } from "../../lib/api";
import type { Community } from "@telebooks/types";
import { CommunityCard } from "../../components/communities/community-card";
import { CreateCommunityModal } from "../../components/communities/create-community-modal";
import { CommunityChatView } from "../../components/communities/community-chat-view";
import { UserSearchDialog } from "../../components/profile/user-search-dialog";

function ComunidadeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, isLoading: isAuthLoading } = useAuth();

  // Estados de navegação e filtros
  const [activeTab, setActiveTab] = useState<"explore" | "my" | "managed">("explore");
  const [communitySearchQuery, setCommunitySearchQuery] = useState("");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCommunity, setActiveCommunity] = useState<Community | null>(null);

  // Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // Carregar Comunidades da API
  const loadCommunities = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.getCommunities({
        tab: activeTab,
        query: communitySearchQuery.trim() || undefined,
        page: 1,
        page_size: 40,
      });
      setCommunities(res.items || []);
    } catch {
      setCommunities([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, communitySearchQuery]);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  // Carregar comunidade direta se houver id na URL (ex: ?id=uuid)
  useEffect(() => {
    const urlId = searchParams.get("id");
    if (urlId && (!activeCommunity || activeCommunity.id !== urlId)) {
      api
        .getCommunity(urlId)
        .then((data) => setActiveCommunity(data))
        .catch(() => {});
    }
  }, [searchParams, activeCommunity]);

  // Participar de uma comunidade
  const handleJoin = async (community: Community) => {
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      setJoiningId(community.id);
      const res = await api.joinCommunity(community.id);
      if (res.status === "active") {
        // Se entrou imediatamente (pública), abre o chat
        const updated = await api.getCommunity(community.id);
        setActiveCommunity(updated);
      } else {
        alert(res.message || "Solicitação de acesso enviada ao administrador!");
      }
      loadCommunities();
    } catch (err: any) {
      alert(err?.message || "Erro ao entrar na comunidade.");
    } finally {
      setJoiningId(null);
    }
  };

  // Abrir Chat de uma Comunidade
  const handleOpenCommunity = (comm: Community) => {
    setActiveCommunity(comm);
    // Atualiza a URL sem recarregar
    router.replace(`/comunidade?id=${comm.id}`, { scroll: false });
  };

  // Voltar para a lista de comunidades
  const handleBackToList = () => {
    setActiveCommunity(null);
    router.replace("/comunidade", { scroll: false });
    loadCommunities();
  };

  return (
    <AppShell currentTab="community">
      <div className="space-y-6 max-w-5xl mx-auto py-2 sm:py-4">
        {/* Se uma comunidade estiver aberta, exibe o Chat View */}
        {activeCommunity ? (
          <CommunityChatView
            community={activeCommunity}
            currentUserId={user?.id || ""}
            onBack={handleBackToList}
            onCommunityUpdated={(updated) => setActiveCommunity(updated)}
            onLeaveCommunity={handleBackToList}
          />
        ) : (
          /* Visualização de Lista / Exploração de Comunidades */
          <>
            {/* =========================================================================
                1. Cabeçalho da Página + Barra de Pesquisa de Usuários
                ========================================================================= */}
            <div className="flex flex-col gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Título & Ícone */}
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center shadow-lg shadow-[#007BFF]/25 shrink-0">
                    <Users className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      Comunidades
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-sans">
                      Clubes de leitura, rodas de debate e conexão entre leitores.
                    </p>
                  </div>
                </div>

                {/* Botão de Criar Comunidade */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (!user) {
                        router.push("/login");
                        return;
                      }
                      setIsCreateModalOpen(true);
                    }}
                    className="rounded-full text-xs px-4.5 bg-gradient-to-r from-[#006CEB] to-[#007BFF] shadow-sm font-bold active:scale-95"
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Criar Comunidade
                  </Button>
                </div>
              </div>

              {/* Barra de Pesquisa de Usuários (como a do perfil) no topo da tela */}
              <div
                onClick={() => {
                  if (!user) {
                    router.push("/login");
                    return;
                  }
                  setIsUserSearchOpen(true);
                }}
                className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-xs hover:border-[#007BFF]/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#007BFF] flex items-center justify-center shrink-0">
                    <Search className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                      Pesquisar outros leitores e amigos
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Encontre leitores por @username para seguir e trocar impressões
                    </span>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 font-semibold">
                  <span>Buscar Leitores</span>
                  <Search className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* =========================================================================
                2. Abas de Filtro & Busca de Grupos
                ========================================================================= */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Abas */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 w-fit">
                <button
                  type="button"
                  onClick={() => setActiveTab("explore")}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    activeTab === "explore"
                      ? "bg-white dark:bg-[#0F172A] text-[#007BFF] shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Explorar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("my")}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    activeTab === "my"
                      ? "bg-white dark:bg-[#0F172A] text-[#007BFF] shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Minhas Comunidades</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("managed")}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    activeTab === "managed"
                      ? "bg-white dark:bg-[#0F172A] text-[#007BFF] shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Gerenciadas</span>
                </button>
              </div>

              {/* Busca por Nome de Comunidade */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={communitySearchQuery}
                  onChange={(e) => setCommunitySearchQuery(e.target.value)}
                  placeholder="Filtrar comunidades..."
                  className="pl-8.5 rounded-full text-xs h-8.5 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            {/* =========================================================================
                3. Grade de Comunidades
                ========================================================================= */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-56 rounded-2xl w-full" />
                ))}
              </div>
            ) : communities.length === 0 ? (
              <div className="py-16 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/20 p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#007BFF] flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {communitySearchQuery
                    ? "Nenhuma comunidade encontrada com esse nome."
                    : activeTab === "my"
                    ? "Você ainda não participa de nenhuma comunidade."
                    : activeTab === "managed"
                    ? "Você não gerencia nenhuma comunidade ainda."
                    : "Nenhuma comunidade pública encontrada."}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {activeTab === "my"
                    ? "Explore a aba 'Explorar' para encontrar clubes de leitura e participar de discussões literárias."
                    : "Que tal criar a primeira comunidade e convidar seus amigos leitores?"}
                </p>
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="rounded-full text-xs px-5 bg-[#007BFF]"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Criar Nova Comunidade
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {communities.map((comm) => (
                  <CommunityCard
                    key={comm.id}
                    community={comm}
                    onOpen={handleOpenCommunity}
                    onJoin={handleJoin}
                    isJoining={joiningId === comm.id}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Modal de Criar Comunidade */}
        <CreateCommunityModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCommunityCreated={(created) => {
            loadCommunities();
            handleOpenCommunity(created);
          }}
        />

        {/* Diálogo de Pesquisa de Leitores */}
        {user && (
          <UserSearchDialog
            isOpen={isUserSearchOpen}
            onClose={() => setIsUserSearchOpen(false)}
            currentUserId={user.id}
          />
        )}
      </div>
    </AppShell>
  );
}

export default function ComunidadePage() {
  return (
    <Suspense
      fallback={
        <AppShell currentTab="community">
          <div className="space-y-6 max-w-5xl mx-auto py-4">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-56 rounded-2xl w-full" />
              ))}
            </div>
          </div>
        </AppShell>
      }
    >
      <ComunidadeContent />
    </Suspense>
  );
}

