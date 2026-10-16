"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Search,
  X,
  Users,
  UserCheck,
  UserPlus,
  Clock,
  Loader2,
  Lock,
  Globe,
} from "lucide-react";
import { Button, Input, cn } from "@telebooks/ui";
import type { UserSearchItem } from "@telebooks/types";
import { api } from "../../lib/api";

interface UserSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  onFollowAction?: () => void;
}

export function UserSearchDialog({
  isOpen,
  onClose,
  currentUserId,
  onFollowAction,
}: UserSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await api.searchUsers(q);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleToggleFollow = async (user: UserSearchItem) => {
    const isFollowing = user.follow_status === "following";
    const isRequested = user.follow_status === "requested";

    setActionLoadingMap((prev) => ({ ...prev, [user.id]: true }));

    // Atualização otimista
    const nextStatus = isFollowing || isRequested ? "none" : user.is_public ? "following" : "requested";
    setResults((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, follow_status: nextStatus } : u))
    );

    try {
      if (isFollowing || isRequested) {
        await api.unfollowUser(user.username);
      } else {
        await api.followUser(user.username);
      }
      if (onFollowAction) onFollowAction();
    } catch {
      // Reverter se erro
      setResults((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, follow_status: user.follow_status } : u))
      );
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [user.id]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 pt-16 sm:pt-20 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Cabeçalho com Campo de Busca */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#007BFF]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar leitores por @username ou nome..."
              className="w-full pl-10 pr-9 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007BFF]/40"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Resultados */}
        <div className="overflow-y-auto p-4 flex-1 space-y-2.5">
          {isSearching ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-[#007BFF]" />
              <span>Buscando leitores...</span>
            </div>
          ) : query && results.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-1">
              <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">
                Nenhum leitor encontrado para &ldquo;{query}&rdquo;
              </p>
              <p className="text-[11px] text-slate-400">
                Verifique a ortografia do nome ou nome de usuário (@username).
              </p>
            </div>
          ) : !query ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-1">
              <Search className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">
                Descubra novos leitores
              </p>
              <p className="text-[11px] text-slate-400">
                Digite um nome ou arroba para encontrar amigos e expandir sua comunidade literária.
              </p>
            </div>
          ) : (
            results.map((u) => {
              const isSelf = currentUserId === u.id || u.follow_status === "self";
              const isActionLoading = !!actionLoadingMap[u.id];

              return (
                <div
                  key={u.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-blue-300 dark:hover:border-blue-800/60 transition-colors"
                >
                  <Link
                    href={`/perfil/${u.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 min-w-0 flex-1 group"
                  >
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                      {u.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>
                          {(u.full_name || u.username || "L").substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-[#007BFF] transition-colors">
                          {u.full_name || u.username}
                        </p>
                        {!u.is_public ? (
                          <span title="Perfil Privado">
                            <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                          </span>
                        ) : (
                          <span title="Perfil Público">
                            <Globe className="w-3 h-3 text-emerald-500 shrink-0" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
                        <span>@{u.username}</span>
                        <span>•</span>
                        <span>{u.followers_count} seguidores</span>
                      </div>
                      {u.bio && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate line-clamp-1 mt-0.5">
                          {u.bio}
                        </p>
                      )}
                    </div>
                  </Link>

                  {/* Ação: Seguir / Seguindo / Solicitado / Você */}
                  {isSelf ? (
                    <span className="text-[11px] font-bold text-slate-400 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0">
                      Você
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        u.follow_status === "following"
                          ? "outline"
                          : u.follow_status === "requested"
                          ? "secondary"
                          : "primary"
                      }
                      className={cn(
                        "rounded-full text-xs h-7 px-3 shrink-0 font-semibold",
                        u.follow_status === "following" &&
                          "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-rose-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30",
                        u.follow_status === "requested" &&
                          "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-none",
                        u.follow_status === "none" &&
                          "bg-[#007BFF] hover:bg-[#006CEB] text-white"
                      )}
                      onClick={() => handleToggleFollow(u)}
                      disabled={isActionLoading}
                      leftIcon={
                        isActionLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : u.follow_status === "following" ? (
                          <UserCheck className="w-3 h-3" />
                        ) : u.follow_status === "requested" ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <UserPlus className="w-3 h-3" />
                        )
                      }
                    >
                      {u.follow_status === "following"
                        ? "Seguindo"
                        : u.follow_status === "requested"
                        ? "Solicitado"
                        : "Seguir"}
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
