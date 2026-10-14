"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Clock,
  Heart,
  MessageSquare,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import type { NotificationItem } from "@telebooks/types";
import { Card, CardContent, Button, Badge, Skeleton, cn } from "@telebooks/ui";
import { AppShell } from "../../components/shell/app-shell";
import { useAuth } from "../../components/auth/auth-provider";
import { api } from "../../lib/api";

export default function NotificacoesPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const res = await api.getNotifications(50, 0);
      setNotifications(res.items || []);
      setUnreadCount(res.unread_count || 0);
    } catch {
      // Ignora erro
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login");
      return;
    }
    if (user) {
      loadNotifications();
    }
  }, [user, isAuthLoading, router, loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await api.markNotificationsAsRead({ mark_all: true });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Ignora erro
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      api.markNotificationsAsRead({ notification_ids: [notif.id] }).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    if (notif.post_id) {
      router.push(`/#post-${notif.post_id}`);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    return true;
  });

  return (
    <AppShell currentTab="home">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Topo com Voltar e Ações */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Voltar para o Feed"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-serif tracking-tight">
                  Notificações
                </h1>
                {unreadCount > 0 && (
                  <Badge variant="outline" size="sm" className="bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400">
                    {unreadCount} nova{unreadCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Acompanhe interações, curtidas e comentários em suas postagens.
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="self-start sm:self-auto rounded-full text-xs font-semibold"
              leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Abas de Filtro */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
              filter === "all"
                ? "bg-[#007BFF] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            Todas ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
              filter === "unread"
                ? "bg-[#007BFF] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            Não Lidas ({unreadCount})
          </button>
        </div>

        {/* Lista de Notificações */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]"
              >
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <Skeleton className="h-3 w-1/2 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 text-center py-12 px-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#007BFF] flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Bell className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white">
              {filter === "unread" ? "Nenhuma notificação não lida" : "Nenhuma notificação por enquanto"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              Compartilhe citações e pensamentos sobre livros no feed para interagir com outros leitores da comunidade!
            </p>
            <div className="mt-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/")}
                className="rounded-full text-xs font-bold"
              >
                Ir para o Feed
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {filteredNotifications.map((notif) => {
              const actorName = notif.actor?.full_name || notif.actor?.username || "Alguém";
              const isLike = notif.type === "post_like";

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    "flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer",
                    notif.is_read
                      ? "bg-white dark:bg-[#0F172A] border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      : "bg-blue-50/50 dark:bg-blue-950/25 border-blue-200/70 dark:border-blue-900/60 shadow-xs hover:border-blue-300"
                  )}
                >
                  {/* Avatar do Autor com Selo */}
                  <div className="relative shrink-0 mt-0.5">
                    {notif.actor?.avatar_url ? (
                      <img
                        src={notif.actor.avatar_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover shadow-xs"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        {actorName.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span
                      className={cn(
                        "absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] shadow-xs text-white",
                        isLike ? "bg-rose-500" : "bg-blue-600"
                      )}
                    >
                      {isLike ? <Heart className="w-2.5 h-2.5 fill-current" /> : <MessageSquare className="w-2.5 h-2.5 fill-current" />}
                    </span>
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-snug">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {actorName}
                      </span>{" "}
                      {isLike
                        ? "curtiu sua publicação no feed."
                        : "comentou em sua publicação."}
                    </p>

                    {notif.content && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic line-clamp-2 mt-1 bg-white/60 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80">
                        &ldquo;{notif.content}&rdquo;
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 mt-2 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(notif.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                    </div>
                  </div>

                  {/* Ponto azul de não lida */}
                  {!notif.is_read && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0 mt-2" />
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </AppShell>
  );
}
