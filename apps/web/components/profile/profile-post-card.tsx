"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageSquare,
  Clock,
  BookOpen,
  Trash2,
  Send,
  Loader2,
  Share2,
} from "lucide-react";
import { Card, CardContent, Badge, Button, cn } from "@telebooks/ui";
import type { FeedPost, FeedComment } from "@telebooks/types";
import { api } from "../../lib/api";

interface ProfilePostCardProps {
  post: FeedPost;
  currentUserId?: string;
  onPostDeleted?: (postId: string) => void;
}

function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "agora";
    if (diffMin < 60) return `há ${diffMin}m`;
    if (diffHour < 24) return `há ${diffHour}h`;
    if (diffDay < 7) return `há ${diffDay}d`;
    return new Date(isoString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "";
  }
}

export function ProfilePostCard({
  post,
  currentUserId,
  onPostDeleted,
}: ProfilePostCardProps) {
  const isAuthor = currentUserId === post.user_id;

  // Like
  const [hasLiked, setHasLiked] = useState(post.has_liked ?? false);
  const [likesCount, setLikesCount] = useState(post.likes_count ?? 0);
  const [isLiking, setIsLiking] = useState(false);

  // Comentários
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>(post.comments || []);
  const [commentsCount, setCommentsCount] = useState(post.comments_count ?? 0);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Exclusão
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggleLike = async () => {
    if (isLiking) return;
    const nextLiked = !hasLiked;
    setHasLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    setIsLiking(true);

    try {
      const res = await api.toggleFeedLike(post.id);
      setHasLiked(res.has_liked);
      setLikesCount(res.likes_count);
    } catch {
      // Reverter se erro
      setHasLiked(hasLiked);
      setLikesCount(likesCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleToggleComments = () => {
    setIsCommentsOpen(!isCommentsOpen);
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmittingComment) return;

    try {
      setIsSubmittingComment(true);
      const newComment = await api.createFeedComment(post.id, commentText.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentsCount((prev) => prev + 1);
      setCommentText("");
    } catch (err: any) {
      alert(err.message || "Não foi possível enviar o comentário.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.deleteFeedComment(post.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCommentsCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Falha
    }
  };

  const handleDeletePost = async () => {
    if (!confirm("Tem certeza que deseja excluir esta publicação?")) return;
    try {
      setIsDeleting(true);
      await api.deleteFeedPost(post.id);
      if (onPostDeleted) onPostDeleted(post.id);
    } catch (err: any) {
      alert(err.message || "Erro ao excluir publicação.");
      setIsDeleting(false);
    }
  };

  const initials = (
    post.author.full_name ||
    post.author.username ||
    "L"
  )
    .substring(0, 2)
    .toUpperCase();

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all overflow-hidden">
      <CardContent className="p-4 sm:p-5 space-y-3.5">
        {/* Cabeçalho do Card */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/perfil/${post.author.username}`}
            className="flex items-center gap-3 min-w-0 group"
          >
            {post.author.avatar_url ? (
              <img
                src={post.author.avatar_url}
                alt=""
                className="w-9 h-9 rounded-full object-cover shrink-0 shadow-xs"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate group-hover:text-[#007BFF] transition-colors">
                  {post.author.full_name || post.author.username}
                </span>
                <span className="text-[11px] text-slate-400 truncate">
                  @{post.author.username}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 font-sans">
                <Clock className="w-3 h-3" />
                <span>{formatTimeAgo(post.created_at)}</span>
                {post.page_number && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      Pág. {post.page_number}
                    </span>
                  </>
                )}
              </div>
            </div>
          </Link>

          {/* Opção de Excluir (somente autor) */}
          {isAuthor && (
            <button
              type="button"
              onClick={handleDeletePost}
              disabled={isDeleting}
              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Excluir minha publicação"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Livro Vinculado */}
        {post.book && (
          <Link
            href={`/livros/${post.book.id}`}
            className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 transition-all group"
          >
            <div className="w-8 h-12 bg-blue-100 dark:bg-blue-950 rounded overflow-hidden shrink-0 shadow-xs">
              {post.book.cover_url ? (
                <img
                  src={post.book.cover_url}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-[#007BFF]" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-[#007BFF] transition-colors">
                {post.book.title}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {post.book.author_name || "Autor desconhecido"}
              </p>
            </div>
            <Badge
              variant="outline"
              size="sm"
              className="shrink-0 text-[10px] hidden sm:inline-flex"
            >
              Ver Livro
            </Badge>
          </Link>
        )}

        {/* Conteúdo da Publicação */}
        <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-line break-words font-sans">
          {post.content}
        </div>

        {/* Barra de Interações: Curtir e Comentar */}
        <div className="pt-2 flex items-center gap-4 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          {/* Botão de Curtida */}
          <button
            type="button"
            onClick={handleToggleLike}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all cursor-pointer font-semibold",
              hasLiked
                ? "text-rose-500 bg-rose-50 dark:bg-rose-950/40"
                : "text-slate-500 hover:text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <Heart
              className={cn(
                "w-4 h-4 transition-transform active:scale-125",
                hasLiked && "fill-current"
              )}
            />
            <span>{likesCount}</span>
          </button>

          {/* Botão de Comentários */}
          <button
            type="button"
            onClick={handleToggleComments}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all cursor-pointer font-semibold",
              isCommentsOpen
                ? "text-[#007BFF] bg-blue-50 dark:bg-blue-950/40"
                : "text-slate-500 hover:text-[#007BFF] hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{commentsCount}</span>
          </button>
        </div>

        {/* Bloco de Comentários Acordeon */}
        {isCommentsOpen && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            {/* Lista de Comentários */}
            {comments.length === 0 ? (
              <p className="py-2 text-center text-xs text-slate-400">
                Nenhum comentário por enquanto. Seja o primeiro a comentar!
              </p>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {comments.map((c) => {
                  const isCommentAuthor = currentUserId === c.user_id;
                  return (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5">
                          {c.author?.username ? (
                            <Link
                              href={`/perfil/${c.author.username}`}
                              className="font-bold text-slate-900 dark:text-white hover:text-[#007BFF] transition-colors"
                            >
                              {c.author.full_name || c.author.username}
                            </Link>
                          ) : (
                            <span className="font-bold text-slate-900 dark:text-white">
                              Leitor
                            </span>
                          )}
                          {c.author?.username && (
                            <span className="text-[10px] text-slate-400">
                              @{c.author.username}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">•</span>
                          <span className="text-[10px] text-slate-400">
                            {formatTimeAgo(c.created_at)}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-200 leading-relaxed break-words">
                          {c.content}
                        </p>
                      </div>

                      {isCommentAuthor && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(c.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-full transition-colors"
                          title="Excluir comentário"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Input de Novo Comentário */}
            <form onSubmit={handleSendComment} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Escreva um comentário literário..."
                className="flex-1 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-blue-400 dark:focus:border-blue-600 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                maxLength={500}
              />
              <Button
                type="submit"
                size="sm"
                variant="primary"
                className="rounded-full text-xs h-7 px-3 bg-[#007BFF] text-white shrink-0"
                disabled={!commentText.trim() || isSubmittingComment}
                leftIcon={
                  isSubmittingComment ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )
                }
              >
                Enviar
              </Button>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
