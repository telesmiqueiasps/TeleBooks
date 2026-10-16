"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Users,
  UserCheck,
  UserPlus,
  Clock,
  ArrowLeft,
  Globe,
  Lock,
  MessageSquare,
  BookOpen,
  Loader2,
  AlertCircle,
  Share2,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Skeleton,
  cn,
} from "@telebooks/ui";
import type { FeedPost, Profile } from "@telebooks/types";
import { useAuth } from "../../../components/auth/auth-provider";
import { AppShell } from "../../../components/shell/app-shell";
import { api } from "../../../lib/api";
import { FollowersModal } from "../../../components/profile/followers-modal";
import { ProfilePostCard } from "../../../components/profile/profile-post-card";

export default function VisitorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const rawUsername = params?.username as string | undefined;
  const username = rawUsername ? decodeURIComponent(rawUsername).toLowerCase() : "";

  const { user, profile: authProfile } = useAuth();

  // Estados do Perfil
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Estados de Seguir / Ação
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Estados do Feed de Publicações
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Modal de Conexões
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<"followers" | "following">("followers");

  // Carregar Perfil do Usuário
  const loadProfile = useCallback(async () => {
    if (!username) return;

    try {
      setIsLoadingProfile(true);
      setProfileError(null);
      const data = await api.getUserProfile(username);
      setProfile(data);
    } catch (err: any) {
      setProfileError(err.message || "Usuário não encontrado.");
    } finally {
      setIsLoadingProfile(false);
    }
  }, [username]);

  // Carregar Publicações (se permitido pela privacidade)
  const loadPosts = useCallback(
    async (pageToLoad = 1, append = false) => {
      if (!username || !profile?.can_view_content) return;

      try {
        if (append) {
          setIsLoadingMore(true);
        } else {
          setIsLoadingPosts(true);
        }

        const res = await api.getUserPublications(username, {
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
        // Falha silenciosa
      } finally {
        setIsLoadingPosts(false);
        setIsLoadingMore(false);
      }
    },
    [username, profile?.can_view_content]
  );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (profile?.can_view_content) {
      loadPosts(1, false);
    }
  }, [profile?.can_view_content, loadPosts]);

  // Se o visitante for o próprio usuário, redireciona suavemente para /perfil
  useEffect(() => {
    if (authProfile?.username && username && authProfile.username.toLowerCase() === username) {
      router.replace("/perfil");
    }
  }, [authProfile?.username, username, router]);

  // Manipulador de Seguir / Deixar de Seguir
  const handleToggleFollow = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!profile || isFollowLoading) return;

    const currentStatus = profile.follow_status;
    const isCurrentlyFollowing = currentStatus === "following";
    const isCurrentlyRequested = currentStatus === "requested";

    setIsFollowLoading(true);

    // Otimista
    if (isCurrentlyFollowing || isCurrentlyRequested) {
      setProfile({
        ...profile,
        follow_status: "none",
        followers_count: isCurrentlyFollowing
          ? Math.max(0, (profile.followers_count ?? 1) - 1)
          : profile.followers_count,
        can_view_content: profile.is_public ?? false,
      });
    } else {
      const nextStatus = profile.is_public ? "following" : "requested";
      setProfile({
        ...profile,
        follow_status: nextStatus,
        followers_count: profile.is_public
          ? (profile.followers_count ?? 0) + 1
          : profile.followers_count,
        can_view_content: profile.is_public ? true : profile.can_view_content,
      });
    }

    try {
      if (isCurrentlyFollowing || isCurrentlyRequested) {
        await api.unfollowUser(profile.username);
      } else {
        await api.followUser(profile.username);
      }
      // Recarregar perfil atualizado
      await loadProfile();
    } catch {
      // Reverter se falhar
      await loadProfile();
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handlePostDeleted = (deletedId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== deletedId));
    setPostsTotal((prev) => Math.max(0, prev - 1));
  };

  if (isLoadingProfile) {
    return (
      <AppShell currentTab="community">
        <div className="max-w-4xl mx-auto space-y-6 py-4">
          <Skeleton className="h-44 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </AppShell>
    );
  }

  if (profileError || !profile) {
    return (
      <AppShell currentTab="community">
        <div className="max-w-md mx-auto py-16 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Usuário não encontrado
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            O leitor @{username} não existe ou alterou seu nome de usuário.
          </p>
          <div className="pt-2">
            <Link href="/perfil">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full px-5 text-xs"
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Voltar ao Meu Perfil
              </Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const initials = (
    profile.full_name ||
    profile.username ||
    "L"
  )
    .substring(0, 2)
    .toUpperCase();

  const isFollowing = profile.follow_status === "following";
  const isRequested = profile.follow_status === "requested";

  return (
    <AppShell currentTab="community">
      <div className="max-w-4xl mx-auto space-y-6 py-2 sm:py-4">
        
        {/* Botão Voltar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
        </div>

        {/* =========================================================================
            1. Cartão Principal de Perfil do Visitado
            ========================================================================= */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-sm">
          {/* Banner Gradiente Decorativo */}
          <div className="h-28 sm:h-36 bg-gradient-to-r from-[#006CEB] via-[#007BFF] to-[#38BDF8] relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/20" />
          </div>

          <div className="px-5 sm:px-8 pb-6 sm:pb-8 pt-0 relative">
            {/* Avatar Flutuante e Botão de Ação */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
              {/* Avatar */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white dark:border-[#0F172A] shadow-xl bg-gradient-to-tr from-[#006CEB] to-[#007BFF] flex items-center justify-center text-white text-2xl sm:text-3xl font-extrabold shrink-0 overflow-hidden">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              {/* Botão Seguir / Seguindo / Solicitado */}
              <div className="pt-2 sm:pt-0">
                <Button
                  type="button"
                  size="sm"
                  variant={
                    isFollowing
                      ? "outline"
                      : isRequested
                      ? "secondary"
                      : "primary"
                  }
                  className={cn(
                    "rounded-full text-xs h-8 px-5 font-bold shadow-xs transition-all",
                    isFollowing &&
                      "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-rose-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30",
                    isRequested &&
                      "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-none",
                    !isFollowing &&
                      !isRequested &&
                      "bg-gradient-to-r from-[#006CEB] to-[#007BFF] text-white hover:opacity-95"
                  )}
                  onClick={handleToggleFollow}
                  disabled={isFollowLoading}
                  leftIcon={
                    isFollowLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isFollowing ? (
                      <UserCheck className="w-3.5 h-3.5" />
                    ) : isRequested ? (
                      <Clock className="w-3.5 h-3.5" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5" />
                    )
                  }
                >
                  {isFollowing
                    ? "Seguindo"
                    : isRequested
                    ? "Solicitado"
                    : profile.is_public
                    ? "Seguir"
                    : "Solicitar para Seguir"}
                </Button>
              </div>
            </div>

            {/* Dados do Perfil */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {profile.full_name || profile.username}
                  </h1>

                  {/* Badge de Privacidade */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold",
                      profile.is_public
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                        : "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
                    )}
                  >
                    {profile.is_public ? (
                      <>
                        <Globe className="w-3 h-3" />
                        <span>Público</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>Privado</span>
                      </>
                    )}
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-mono text-[#007BFF] dark:text-[#38BDF8] font-bold">
                  @{profile.username}
                </p>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 max-w-2xl leading-relaxed whitespace-pre-line font-sans">
                  {profile.bio}
                </p>
              )}

              {/* Contadores */}
              <div className="flex items-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-baseline gap-1.5 select-none">
                  <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                    {profile.posts_count ?? 0}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {(profile.posts_count ?? 0) === 1 ? "publicação" : "publicações"}
                  </span>
                </div>

                {profile.can_view_content ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setFollowersModalTab("followers");
                        setIsFollowersModalOpen(true);
                      }}
                      className="flex items-baseline gap-1.5 hover:text-[#007BFF] transition-colors cursor-pointer group"
                    >
                      <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-[#007BFF]">
                        {profile.followers_count ?? 0}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-[#007BFF]">
                        {(profile.followers_count ?? 0) === 1 ? "seguidor" : "seguidores"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFollowersModalTab("following");
                        setIsFollowersModalOpen(true);
                      }}
                      className="flex items-baseline gap-1.5 hover:text-[#007BFF] transition-colors cursor-pointer group"
                    >
                      <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-[#007BFF]">
                        {profile.following_count ?? 0}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-[#007BFF]">
                        seguindo
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1.5 select-none">
                      <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                        {profile.followers_count ?? 0}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        seguidores
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1.5 select-none">
                      <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                        {profile.following_count ?? 0}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        seguindo
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. Barreira de Privacidade ou Feed de Publicações
            ========================================================================= */}
        {!profile.can_view_content ? (
          /* Card Elegante de Perfil Privado */
          <Card className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8 sm:p-12 text-center space-y-4 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Este perfil é privado
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                Envie uma solicitação para seguir @{profile.username} e ver suas publicações literárias e conexões.
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="button"
                variant={isRequested ? "secondary" : "primary"}
                size="sm"
                className={cn(
                  "rounded-full text-xs px-6 font-bold shadow-xs",
                  isRequested
                    ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200"
                    : "bg-[#007BFF] text-white"
                )}
                onClick={handleToggleFollow}
                disabled={isFollowLoading}
                leftIcon={
                  isFollowLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isRequested ? (
                    <Clock className="w-3.5 h-3.5" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )
                }
              >
                {isRequested ? "Solicitação Enviada (Cancelar)" : "Solicitar para Seguir"}
              </Button>
            </div>
          </Card>
        ) : (
          /* Feed de Publicações Acessível */
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <MessageSquare className="w-5 h-5 text-[#007BFF]" />
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                Publicações de @{profile.username}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                {postsTotal}
              </span>
            </div>

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
                  Nenhuma publicação por enquanto
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  @{profile.username} ainda não compartilhou notas ou citações no feed literário.
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <ProfilePostCard
                    key={post.id}
                    post={post}
                    currentUserId={user?.id}
                    onPostDeleted={handlePostDeleted}
                  />
                ))}

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
        )}

        {/* Modal de Conexões */}
        <FollowersModal
          isOpen={isFollowersModalOpen}
          onClose={() => setIsFollowersModalOpen(false)}
          username={profile.username}
          initialTab={followersModalTab}
          followersCount={profile.followers_count ?? 0}
          followingCount={profile.following_count ?? 0}
          currentUserId={user?.id}
          onCountChange={loadProfile}
        />
      </div>
    </AppShell>
  );
}
