"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  Share2,
  BookOpen,
  Sparkles,
  Quote,
  Check,
  Trash2,
  Clock,
  User,
  Library,
  Globe,
  MoreHorizontal,
  Link2,
  BookmarkCheck,
} from "lucide-react";
import type { FeedPost, FeedComment } from "@telebooks/types";
import {
  Button,
  Card,
  CardContent,
  Skeleton,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
  cn,
} from "@telebooks/ui";
import { AppShell } from "../components/shell/app-shell";
import { useAuth } from "../components/auth/auth-provider";
import { api } from "../lib/api";
import { RabiscosBar } from "../components/rabiscos/rabiscos-bar";
import { CreatePostBar } from "../components/feed/create-post-bar";

export default function HomePage() {
  const { user, profile, isLoading: isAuthLoading, updateProfile } = useAuth();
  const router = useRouter();

  // Estados do Feed
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Interação (Comentários e Compartilhamento)
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingCommentId, setSubmittingCommentId] = useState<string | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  // Carregar Feed
  const loadFeed = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getFeed(1, 30);
      setPosts(data.items || []);
    } catch (err) {
      console.error("Erro ao carregar feed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login");
      return;
    }
    if (user) {
      loadFeed();
    }
  }, [user, isAuthLoading, router, loadFeed]);

  // Alternar Curtida (Like / Unlike) com Atualização Otimista
  const handleToggleLike = async (postId: string) => {
    if (!user) {
      router.push("/login");
      return;
    }

    // Atualização otimista imediata na UI
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const currentlyLiked = post.has_liked;
          return {
            ...post,
            has_liked: !currentlyLiked,
            likes_count: currentlyLiked
              ? Math.max(0, post.likes_count - 1)
              : post.likes_count + 1,
          };
        }
        return post;
      })
    );

    try {
      // Se o perfil estiver privado, torna público
      if (profile && !profile.is_public && updateProfile) {
        await updateProfile({ is_public: true });
      }

      const res = await api.toggleFeedLike(postId);
      // Sincroniza contador oficial retornado
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, has_liked: res.has_liked, likes_count: res.likes_count }
            : post
        )
      );
    } catch (err) {
      console.error("Erro ao curtir publicação:", err);
      // Reverte em caso de falha
      loadFeed();
    }
  };

  // Adicionar Comentário
  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      setSubmittingCommentId(postId);

      if (profile && !profile.is_public && updateProfile) {
        await updateProfile({ is_public: true });
      }

      const newComment = await api.createFeedComment(postId, text);

      setPosts((prev) =>
        prev.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              comments_count: post.comments_count + 1,
              comments: [...(post.comments || []), newComment],
            };
          }
          return post;
        })
      );

      // Limpa input
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    } catch (err) {
      console.error("Erro ao comentar:", err);
    } finally {
      setSubmittingCommentId(null);
    }
  };

  // Excluir Publicação
  const handleDeletePost = async (postId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta publicação?")) return;

    try {
      await api.deleteFeedPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error("Erro ao excluir publicação:", err);
    }
  };

  // Copiar Link da Publicação
  const handleCopyLink = (postId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/#post-${postId}`);
    setCopiedPostId(postId);
    setTimeout(() => setCopiedPostId(null), 2500);
  };

  // Formatação de data relativa amigável
  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now.getTime() - past.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHrs / 24);

      if (diffMin < 1) return "agora mesmo";
      if (diffMin < 60) return `há ${diffMin} min`;
      if (diffHrs < 24) return `há ${diffHrs}h`;
      if (diffDays === 1) return "ontem";
      if (diffDays < 7) return `há ${diffDays} dias`;
      return past.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    } catch {
      return "recentemente";
    }
  };

  const userInitials = (
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    "Leitor"
  )
    .substring(0, 2)
    .toUpperCase();

  return (
    <AppShell currentTab="home">
      <div className="max-w-6xl mx-auto py-2 sm:py-4">
        
        {/* Grid de 2 Colunas: Feed Principal + Coluna Lateral */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          
          {/* =========================================================================
              COLUNA PRINCIPAL DO FEED (ESQUERDA - 2 COLUNAS)
          ========================================================================= */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-5">
            
            {/* 1. Componente Horizontal Compacto de Iniciar Publicação */}
            <CreatePostBar
              user={user}
              profile={profile}
              onPostCreated={(newPost) => setPosts((prev) => [newPost, ...prev])}
              updateProfile={updateProfile}
            />

            {/* 2. Espaço Dedicado aos Rabiscos (Folium - Stories Efêmeros de 24 horas) */}
            <RabiscosBar
              currentUserId={user?.id}
              currentUserAvatar={profile?.avatar_url}
              currentUserName={profile?.full_name || profile?.username || user?.user_metadata?.full_name}
            />

            {/* 3. Linha Horizontal que separa as publicações temporárias do conteúdo permanente */}
            <div className="border-b border-slate-200/80 dark:border-slate-800 my-1 sm:my-2" />

            {/* 4. Lista de Publicações do Feed (sem filtros) */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="rounded-3xl p-5 space-y-4 bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-16 w-full rounded-2xl" />
                    <Skeleton className="h-8 w-40 rounded-full" />
                  </Card>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <Card className="rounded-3xl border-dashed border-2 border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center space-y-3 bg-white dark:bg-[#0F172A]">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#007BFF] flex items-center justify-center mx-auto">
                  <Quote className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Nenhuma publicação encontrada
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Seja o primeiro a compartilhar uma frase marcante ou reflexão sobre sua leitura!
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => {
                  const isAuthor = user?.id === post.user_id;
                  const isCommentsOpen = openCommentsPostId === post.id;
                  const postInitials = (
                    post.author.full_name ||
                    post.author.username ||
                    "L"
                  )
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <article
                      key={post.id}
                      id={`post-${post.id}`}
                      className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all p-4 sm:p-5 space-y-3.5"
                    >
                      {/* =========================================================================
                          PARTE 1: Identificação do autor (avatar, nome, identificador, data, menu de opções)
                          ========================================================================= */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Link
                            href={`/perfil/${post.author.username}`}
                            className="shrink-0 transition-transform active:scale-95"
                          >
                            {post.author.avatar_url ? (
                              <img
                                src={post.author.avatar_url}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover shadow-2xs"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                {postInitials}
                              </div>
                            )}
                          </Link>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link
                                href={`/perfil/${post.author.username}`}
                                className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate hover:text-[#007BFF] transition-colors leading-tight"
                              >
                                {post.author.full_name || post.author.username}
                              </Link>
                              <span className="text-[11px] text-slate-400 truncate leading-tight">
                                @{post.author.username}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 font-sans mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{formatTimeAgo(post.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Menu de Opções */}
                        <Dropdown>
                          <DropdownTrigger
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Opções da publicação"
                          >
                            <MoreHorizontal className="w-5 h-5" />
                          </DropdownTrigger>
                          <DropdownMenu align="right">
                            <DropdownItem
                              icon={<Link2 className="w-4 h-4 text-blue-500" />}
                              onClick={() => handleCopyLink(post.id)}
                            >
                              Copiar link da publicação
                            </DropdownItem>
                            <DropdownItem
                              icon={<User className="w-4 h-4 text-slate-500" />}
                              onClick={() => router.push(`/perfil/${post.author.username}`)}
                            >
                              Ver perfil do autor
                            </DropdownItem>
                            {isAuthor && (
                              <>
                                <DropdownSeparator />
                                <DropdownItem
                                  danger
                                  icon={<Trash2 className="w-4 h-4 text-rose-500" />}
                                  onClick={() => handleDeletePost(post.id)}
                                >
                                  Excluir publicação
                                </DropdownItem>
                              </>
                            )}
                          </DropdownMenu>
                        </Dropdown>
                      </div>

                      {/* =========================================================================
                          PARTE 2: Livro vinculado (capa em miniatura, título e autor num bloco cinza-azulado)
                          ========================================================================= */}
                      {post.book && (
                        <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-[#F1F5F9] dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 transition-colors">
                          {/* Capa em miniatura (principal elemento visual) */}
                          <Link
                            href={`/livros/${post.book.id}`}
                            className="w-12 h-16 sm:w-14 sm:h-20 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden shrink-0 shadow-xs block group/cover"
                          >
                            {post.book.cover_url ? (
                              <img
                                src={post.book.cover_url}
                                alt={post.book.title}
                                className="w-full h-full object-cover group-hover/cover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-blue-100 dark:bg-blue-950/60">
                                <BookOpen className="w-5 h-5 text-[#007BFF]" />
                              </div>
                            )}
                          </Link>

                          {/* Título e Autor do Livro */}
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/livros/${post.book.id}`}
                              className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white hover:text-[#007BFF] transition-colors line-clamp-1 block leading-snug"
                              title={post.book.title}
                            >
                              {post.book.title}
                            </Link>
                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {post.book.author_name || "Autor desconhecido"}
                            </p>
                            {post.page_number && (
                              <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
                                <BookmarkCheck className="w-3 h-3 text-[#007BFF]" />
                                <span>Página {post.page_number}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* =========================================================================
                          PARTE 3: Conteúdo da publicação (citação em tamanho confortável)
                          ========================================================================= */}
                      <div className="text-[15px] sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed font-sans whitespace-pre-line py-0.5">
                        {post.content}
                      </div>

                      {/* =========================================================================
                          PARTE 4: Ações (curtidas, comentários e compartilhamento)
                          ========================================================================= */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                        <div className="flex items-center gap-3">
                          {/* Curtir */}
                          <button
                            type="button"
                            onClick={() => handleToggleLike(post.id)}
                            className={cn(
                              "flex items-center gap-1.5 py-1 px-2.5 rounded-full transition-all active:scale-110 cursor-pointer font-medium",
                              post.has_liked
                                ? "text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/40"
                                : "text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                            title={post.has_liked ? "Descurtir" : "Curtir publicação"}
                          >
                            <Heart
                              className={cn(
                                "w-4 h-4 transition-transform",
                                post.has_liked ? "fill-rose-500 text-rose-500" : ""
                              )}
                            />
                            <span>{post.likes_count}</span>
                          </button>

                          {/* Comentários */}
                          <button
                            type="button"
                            onClick={() =>
                              setOpenCommentsPostId(isCommentsOpen ? null : post.id)
                            }
                            className={cn(
                              "flex items-center gap-1.5 py-1 px-2.5 rounded-full transition-all cursor-pointer font-medium",
                              isCommentsOpen
                                ? "text-[#007BFF] font-bold bg-blue-50 dark:bg-blue-950/40"
                                : "text-slate-500 hover:text-[#007BFF] hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                            title="Ver comentários"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>{post.comments_count}</span>
                          </button>
                        </div>

                        {/* Compartilhar / Copiar Link */}
                        <button
                          type="button"
                          onClick={() => handleCopyLink(post.id)}
                          className="flex items-center gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 py-1 px-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Compartilhar publicação"
                        >
                          {copiedPostId === post.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-[11px] text-emerald-600 font-bold">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-4 h-4" />
                              <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400 font-medium">Compartilhar</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Gaveta de Comentários (quando aberta) */}
                      {isCommentsOpen && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                          {post.comments && post.comments.length > 0 ? (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {post.comments.map((comment: FeedComment) => (
                                <div
                                  key={comment.id}
                                  className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <Link
                                      href={`/perfil/${comment.author?.username}`}
                                      className="font-bold text-slate-900 dark:text-white hover:text-[#007BFF] transition-colors"
                                    >
                                      {comment.author?.full_name || comment.author?.username || "Leitor"}
                                    </Link>
                                    <span className="text-[10px] text-slate-400">
                                      {formatTimeAgo(comment.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                                    {comment.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 text-center py-2 font-sans">
                              Seja o primeiro a comentar nesta publicação!
                            </p>
                          )}

                          {/* Input de Novo Comentário */}
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="text"
                              value={commentInputs[post.id] || ""}
                              onChange={(e) =>
                                setCommentInputs((prev) => ({
                                  ...prev,
                                  [post.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAddComment(post.id);
                                }
                              }}
                              placeholder="Escreva um comentário..."
                              className="flex-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleAddComment(post.id)}
                              disabled={
                                submittingCommentId === post.id ||
                                !commentInputs[post.id]?.trim()
                              }
                              className="rounded-full px-3.5 bg-[#007BFF] text-white shrink-0"
                            >
                              {submittingCommentId === post.id ? "..." : "Enviar"}
                            </Button>
                          </div>
                        </div>
                      )}

                    </article>
                  );
                })}
              </div>
            )}

          </div>

          {/* =========================================================================
              COLUNA LATERAL DIREITA DE SUPORTE (DESKTOP - 1 COLUNA)
          ========================================================================= */}
          <div className="hidden lg:block space-y-6 sticky top-20">
            
            {/* Card 1: Meu Perfil & Privacidade */}
            <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs">
              <CardContent className="p-5 space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {userInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {profile?.full_name || user?.user_metadata?.full_name || "Meu Perfil"}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      @{profile?.username || user?.user_metadata?.username || "leitor"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs">
                  <span className="text-slate-500 font-medium">Status no Feed:</span>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Perfil Público</span>
                  </div>
                </div>

                <Link href="/perfil" className="block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-full text-xs"
                    leftIcon={<User className="w-3.5 h-3.5 text-[#007BFF]" />}
                  >
                    Editar Perfil
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Card 2: Sobre o Feed TeleBooks */}
            <Card className="rounded-3xl border border-blue-200/60 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/50 via-white to-blue-50/30 dark:from-[#0F172A] dark:to-blue-950/20 shadow-xs">
              <CardContent className="p-5 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#007BFF] text-[11px] font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Feed Literário Aberto</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  O que compartilhar no Feed?
                </h4>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-[#007BFF] font-bold">•</span>
                    <span>Frases célebres e trechos que você destacou no seu livro.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#007BFF] font-bold">•</span>
                    <span>Impressões sinceras ao terminar um capítulo ou obra.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#007BFF] font-bold">•</span>
                    <span>Indicações de leitura para inspirar outros leitores da comunidade.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Card 3: Acesso Rápido à Estante */}
            <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs">
              <CardContent className="p-5 space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Library className="w-4 h-4 text-[#007BFF]" />
                  <span>Sua Biblioteca Pessoal</span>
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Acompanhe seu progresso de leitura, edições cadastradas e organize sua estante personalizada.
                </p>
                <div className="flex gap-2 pt-1">
                  <Link href="/minha-biblioteca" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full rounded-full text-xs">
                      Minha Estante
                    </Button>
                  </Link>
                  <Link href="/perfil" className="flex-1">
                    <Button size="sm" className="w-full rounded-full text-xs bg-[#007BFF] text-white">
                      Meu Perfil
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>

      </div>
    </AppShell>
  );
}
