"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Users,
  Settings,
  Edit3,
  Search,
  UserCheck,
  Globe,
  Lock,
  LogOut,
  Sparkles,
  BookOpen,
  MessageSquare,
  AlertCircle,
  Loader2,
  Plus,
  Library,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Skeleton,
  cn,
} from "@telebooks/ui";
import type { FeedPost, Profile } from "@telebooks/types";
import { useAuth } from "../../components/auth/auth-provider";
import { AppShell } from "../../components/shell/app-shell";
import { api } from "../../lib/api";
import { EditProfileModal } from "../../components/profile/edit-profile-modal";
import { FollowersModal } from "../../components/profile/followers-modal";
import { FollowRequestsModal } from "../../components/profile/follow-requests-modal";
import { UserSearchDialog } from "../../components/profile/user-search-dialog";
import { ProfilePostCard } from "../../components/profile/profile-post-card";
import { ProfileShelfView } from "../../components/profile/profile-shelf-view";

export default function MyProfilePage() {
  const router = useRouter();
  const { user, profile, isLoading: isAuthLoading, refreshProfile, signOut } = useAuth();

  // Estados dos Modais
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<"followers" | "following">("followers");
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Estados de Solicitações Pendentes
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Aba ativa: Publicações ou Estante
  const [activeTab, setActiveTab] = useState<"posts" | "shelf">("posts");
  const [booksCount, setBooksCount] = useState<number>(profile?.books_count || 0);

  // Estados do Feed de Publicações Próprias
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Carregar dados de perfil enriquecido (contadores oficiais da API)
  const [detailedProfile, setDetailedProfile] = useState<Profile | null>(null);

  const fetchProfileDetails = useCallback(async () => {
    try {
      const data = await api.getMyProfile();
      setDetailedProfile(data);
      if (data.books_count !== undefined) {
        setBooksCount(data.books_count);
      }
    } catch {
      // Usa dados do auth context como fallback
    }
  }, []);

  // Carregar contagem de solicitações pendentes
  const fetchPendingRequests = useCallback(async () => {
    try {
      const reqs = await api.getFollowRequests();
      setPendingRequestsCount(reqs.length);
    } catch {
      // Falha silenciosa
    }
  }, []);

  // Carregar publicações próprias
  const loadPosts = useCallback(async (pageToLoad = 1, append = false) => {
    if (!profile?.username) return;
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoadingPosts(true);
      }

      const res = await api.getUserPublications(profile.username, {
        page: pageToLoad,
        page_size: 15,
      });

      if (append) {
        setPosts((prev) => [...prev, ...res.items]);
      } else {
        setPosts(res.items);
      }

      setPostsTotal(res.total);
      setPostsPage(res.page);
      setHasMorePosts(res.page < res.total_pages);
    } catch {
      // Ignora erro
    } finally {
      setIsLoadingPosts(false);
      setIsLoadingMore(false);
    }
  }, [profile?.username]);

  useEffect(() => {
    if (user && profile?.username) {
      fetchProfileDetails();
      fetchPendingRequests();
      loadPosts(1, false);
    }
  }, [user, profile?.username, fetchProfileDetails, fetchPendingRequests, loadPosts]);

  const handlePostDeleted = (deletedId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== deletedId));
    setPostsTotal((prev) => Math.max(0, prev - 1));
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const activeProfile = detailedProfile || profile;

  if (isAuthLoading) {
    return (
      <AppShell currentTab="profile">
        <div className="max-w-4xl mx-auto space-y-6 py-4">
          <Skeleton className="h-44 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </AppShell>
    );
  }

  if (!user || !activeProfile) {
    return (
      <AppShell currentTab="profile">
        <div className="max-w-md mx-auto py-16 text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-amber-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Faça login para ver seu perfil
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acesse sua conta para visualizar suas publicações e gerenciar sua comunidade literária.
          </p>
          <Link href="/login">
            <Button variant="primary" size="sm" className="rounded-full px-6">
              Entrar no TeleBooks
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const initials = (
    activeProfile.full_name ||
    activeProfile.username ||
    "L"
  )
    .substring(0, 2)
    .toUpperCase();

  const followersCount = activeProfile.followers_count ?? 0;
  const followingCount = activeProfile.following_count ?? 0;
  const publicationCount = activeProfile.posts_count ?? postsTotal;

  return (
    <AppShell currentTab="profile">
      <div className="max-w-4xl mx-auto space-y-6 py-2 sm:py-4">
        
        {/* =========================================================================
            1. Cartão Principal de Perfil (Header Editorial do Leitor)
            ========================================================================= */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-sm">
          {/* Faixa Superior Gradiente Decorativa (Mais fina verticalmente para economizar tela) */}
          <div className="h-16 sm:h-24 bg-gradient-to-r from-[#006CEB] via-[#007BFF] to-[#38BDF8] relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/20" />
            
            {/* Atalho de Pesquisar Leitores no canto superior da faixa */}
            <div className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md text-[11px] sm:text-xs font-semibold shadow-xs transition-all cursor-pointer border border-white/25 active:scale-95"
                title="Pesquisar outros leitores"
              >
                <Search className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Pesquisar Leitores</span>
              </button>
            </div>
          </div>

          <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 relative">
            {/* Avatar Flutuante à esquerda e Botão Editar Perfil no canto superior direito logo abaixo da faixa azul */}
            <div className="flex items-end justify-between gap-3 -mt-9 sm:-mt-12 mb-2.5">
              {/* Avatar com Botão de Edição */}
              <div className="relative group w-20 h-20 sm:w-24 sm:h-24 rounded-full border-3 sm:border-4 border-white dark:border-[#0F172A] shadow-lg bg-gradient-to-tr from-[#006CEB] to-[#007BFF] flex items-center justify-center text-white text-xl sm:text-2xl font-extrabold shrink-0 overflow-hidden">
                {activeProfile.avatar_url ? (
                  <img
                    src={activeProfile.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
                
                {/* Overlay rápido para abrir edição */}
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Alterar foto e perfil"
                >
                  <Edit3 className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              {/* Canto superior direito logo abaixo da faixa azul: Ações do Perfil */}
              <div className="flex items-center gap-2 pb-0.5">
                {/* Botão de Solicitações Pendentes (se houver) */}
                {pendingRequestsCount > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full text-[11px] sm:text-xs h-7 sm:h-8 px-2.5 sm:px-3 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold"
                    onClick={() => setIsRequestsModalOpen(true)}
                    leftIcon={<UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600" />}
                  >
                    <span>Solicitações</span>
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[9px] sm:text-[10px]">
                      {pendingRequestsCount}
                    </span>
                  </Button>
                )}

                {/* Botão Editar Perfil */}
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  className="rounded-full text-xs h-7 sm:h-8 px-3.5 sm:px-4 bg-[#007BFF] hover:bg-[#006CEB] text-white shadow-xs font-semibold"
                  onClick={() => setIsEditModalOpen(true)}
                  leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                >
                  Editar Perfil
                </Button>
              </div>
            </div>

            {/* Informações Básicas do Leitor (Subidas e Otimizadas) */}
            <div className="space-y-2">
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                    {activeProfile.full_name || activeProfile.username}
                  </h1>
                  
                  {/* Badge de Privacidade */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold",
                      activeProfile.is_public
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                        : "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
                    )}
                  >
                    {activeProfile.is_public ? (
                      <>
                        <Globe className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span>Público</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span>Privado</span>
                      </>
                    )}
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-mono text-[#007BFF] dark:text-[#38BDF8] font-bold mt-0.5">
                  @{activeProfile.username}
                </p>
              </div>

              {/* Bio Literária */}
              {activeProfile.bio ? (
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 max-w-2xl leading-relaxed whitespace-pre-line font-sans">
                  {activeProfile.bio}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Adicione uma bio literária para contar aos outros leitores seus gêneros e autores favoritos.
                </p>
              )}

              {/* Card Horizontal de Indicadores (Publicações, Estante, Seguidores, Seguindo) */}
              <div className="grid grid-cols-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-1.5 sm:p-2.5 divide-x divide-slate-200/60 dark:divide-slate-800/60 text-center shadow-2xs mt-1">
                {/* 1. Publicações */}
                <button
                  type="button"
                  onClick={() => setActiveTab("posts")}
                  className="flex flex-col items-center justify-center py-1 sm:py-1.5 px-0.5 transition-colors group cursor-pointer"
                >
                  <span className="text-sm sm:text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-[#007BFF] transition-colors leading-tight">
                    {publicationCount}
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 group-hover:text-[#007BFF] transition-colors font-medium mt-0.5 truncate w-full">
                    Publicações
                  </span>
                </button>

                {/* 2. Estante */}
                <button
                  type="button"
                  onClick={() => setActiveTab("shelf")}
                  className="flex flex-col items-center justify-center py-1 sm:py-1.5 px-0.5 transition-colors group cursor-pointer"
                >
                  <span className="text-sm sm:text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-[#007BFF] transition-colors leading-tight">
                    {booksCount}
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 group-hover:text-[#007BFF] transition-colors font-medium mt-0.5 truncate w-full">
                    Estante
                  </span>
                </button>

                {/* 3. Seguidores */}
                <button
                  type="button"
                  onClick={() => {
                    setFollowersModalTab("followers");
                    setIsFollowersModalOpen(true);
                  }}
                  className="flex flex-col items-center justify-center py-1 sm:py-1.5 px-0.5 transition-colors group cursor-pointer"
                >
                  <span className="text-sm sm:text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-[#007BFF] transition-colors leading-tight">
                    {followersCount}
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 group-hover:text-[#007BFF] transition-colors font-medium mt-0.5 truncate w-full">
                    Seguidores
                  </span>
                </button>

                {/* 4. Seguindo */}
                <button
                  type="button"
                  onClick={() => {
                    setFollowersModalTab("following");
                    setIsFollowersModalOpen(true);
                  }}
                  className="flex flex-col items-center justify-center py-1 sm:py-1.5 px-0.5 transition-colors group cursor-pointer"
                >
                  <span className="text-sm sm:text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-[#007BFF] transition-colors leading-tight">
                    {followingCount}
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 group-hover:text-[#007BFF] transition-colors font-medium mt-0.5 truncate w-full">
                    Seguindo
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. Seletor de Abas: "Publicações" e "Estante"
            ========================================================================= */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={cn(
              "flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs",
              activeTab === "posts"
                ? "bg-[#007BFF] text-white shadow-xs"
                : "bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-300/80 dark:hover:bg-slate-700/80"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Publicações</span>
            <span
              className={cn(
                "px-1.5 sm:px-2 py-0.2 rounded-full text-[10px] sm:text-[11px] font-bold",
                activeTab === "posts"
                  ? "bg-white/20 text-white"
                  : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              )}
            >
              {postsTotal}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("shelf")}
            className={cn(
              "flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs",
              activeTab === "shelf"
                ? "bg-[#007BFF] text-white shadow-xs"
                : "bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-300/80 dark:hover:bg-slate-700/80"
            )}
          >
            <Library className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Estante</span>
            <span
              className={cn(
                "px-1.5 sm:px-2 py-0.2 rounded-full text-[10px] sm:text-[11px] font-bold",
                activeTab === "shelf"
                  ? "bg-white/20 text-white"
                  : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              )}
            >
              {booksCount}
            </span>
          </button>
        </div>

        {/* =========================================================================
            3. Conteúdo da Aba Ativa
            ========================================================================= */}
        {activeTab === "posts" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-[#007BFF] shrink-0" />
                <h2 className="text-xs sm:text-base md:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight truncate whitespace-nowrap">
                  Minhas Publicações
                </h2>
                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold shrink-0">
                  {postsTotal}
                </span>
              </div>

              <Link href="/" className="shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-[11px] sm:text-xs h-7 px-2.5 sm:px-3 border-slate-200 dark:border-slate-800 whitespace-nowrap font-medium"
                  leftIcon={<Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#007BFF]" />}
                >
                  Nova Publicação
                </Button>
              </Link>
            </div>

            {/* Lista de Publicações */}
            {isLoadingPosts ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="rounded-3xl p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-9 h-9 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-12 w-full" />
                  </Card>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <Card className="rounded-3xl border-dashed border-2 border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#007BFF] flex items-center justify-center mx-auto">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Você ainda não tem publicações
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Compartilhe citações marcantes, reflexões de leitura e resenhas na aba Início (Feed) ou na página de qualquer livro.
                </p>
                <Link href="/">
                  <Button
                    variant="primary"
                    size="sm"
                    className="rounded-full text-xs px-5 bg-[#007BFF] text-white mt-2"
                  >
                    Ir para o Feed Literário
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <ProfilePostCard
                    key={post.id}
                    post={post}
                    currentUserId={user.id}
                    onPostDeleted={handlePostDeleted}
                  />
                ))}

                {/* Botão Carregar Mais */}
                {hasMorePosts && (
                  <div className="text-center pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs px-5"
                      onClick={() => loadPosts(postsPage + 1, true)}
                      disabled={isLoadingMore}
                      leftIcon={
                        isLoadingMore ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : undefined
                      }
                    >
                      {isLoadingMore ? "Carregando mais..." : "Carregar Mais Publicações"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <ProfileShelfView
            username={activeProfile.username}
            isOwner={true}
            onTotalBooksChange={(total) => setBooksCount(total)}
          />
        )}

        {/* =========================================================================
            3. Modais Interativos
            ========================================================================= */}
        {/* Modal de Edição de Perfil */}
        {activeProfile && (
          <EditProfileModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            profile={activeProfile}
            onProfileUpdated={(updated) => {
              setDetailedProfile(updated);
              refreshProfile();
            }}
          />
        )}

        {/* Modal de Seguidores / Seguindo */}
        {activeProfile && (
          <FollowersModal
            isOpen={isFollowersModalOpen}
            onClose={() => setIsFollowersModalOpen(false)}
            username={activeProfile.username}
            initialTab={followersModalTab}
            followersCount={followersCount}
            followingCount={followingCount}
            currentUserId={user.id}
            onCountChange={fetchProfileDetails}
          />
        )}

        {/* Modal de Solicitações de Seguidor Pendentes */}
        <FollowRequestsModal
          isOpen={isRequestsModalOpen}
          onClose={() => setIsRequestsModalOpen(false)}
          onRequestHandled={(action) => {
            fetchPendingRequests();
            if (action === "accept") {
              fetchProfileDetails();
            }
          }}
        />

        {/* Diálogo de Pesquisa de Usuários */}
        <UserSearchDialog
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          currentUserId={user.id}
          onFollowAction={fetchProfileDetails}
        />
      </div>
    </AppShell>
  );
}
