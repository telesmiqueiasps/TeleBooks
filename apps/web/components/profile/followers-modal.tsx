"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  X,
  Users,
  UserCheck,
  UserPlus,
  Clock,
  Search,
  Loader2,
  Lock,
} from "lucide-react";
import { Button, Input, cn } from "@telebooks/ui";
import type { FollowStatus, FollowUserItem } from "@telebooks/types";
import { api } from "../../lib/api";

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  initialTab?: "followers" | "following";
  followersCount: number;
  followingCount: number;
  currentUserId?: string;
  onCountChange?: () => void;
}

export function FollowersModal({
  isOpen,
  onClose,
  username,
  initialTab = "followers",
  followersCount,
  followingCount,
  currentUserId,
  onCountChange,
}: FollowersModalProps) {
  const [activeTab, setActiveTab] = useState<"followers" | "following">(initialTab);
  const [followers, setFollowers] = useState<FollowUserItem[]>([]);
  const [following, setFollowing] = useState<FollowUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async (tab: "followers" | "following") => {
    try {
      setIsLoading(true);
      setError(null);
      if (tab === "followers") {
        const data = await api.getUserFollowers(username);
        setFollowers(data);
      } else {
        const data = await api.getUserFollowing(username);
        setFollowing(data);
      }
    } catch (err: any) {
      setError(err.message || "Não foi possível carregar a lista.");
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchFilter("");
      loadData(initialTab);
    }
  }, [isOpen, initialTab, loadData]);

  const handleTabChange = (tab: "followers" | "following") => {
    setActiveTab(tab);
    setSearchFilter("");
    if (tab === "followers" && followers.length === 0) {
      loadData("followers");
    } else if (tab === "following" && following.length === 0) {
      loadData("following");
    }
  };

  const handleToggleFollow = async (targetUser: FollowUserItem) => {
    const isFollowing = targetUser.follow_status === "following";
    const isRequested = targetUser.follow_status === "requested";

    setActionLoadingMap((prev) => ({ ...prev, [targetUser.id]: true }));

    // Atualização otimista
    const updateStatusInList = (list: FollowUserItem[], newStatus: FollowStatus) =>
      list.map((u) => (u.id === targetUser.id ? { ...u, follow_status: newStatus } : u));

    if (isFollowing || isRequested) {
      setFollowers((prev) => updateStatusInList(prev, "none"));
      setFollowing((prev) => updateStatusInList(prev, "none"));
    } else {
      const nextStatus = targetUser.is_public ? "following" : "requested";
      setFollowers((prev) => updateStatusInList(prev, nextStatus));
      setFollowing((prev) => updateStatusInList(prev, nextStatus));
    }

    try {
      if (isFollowing || isRequested) {
        await api.unfollowUser(targetUser.username);
      } else {
        await api.followUser(targetUser.username);
      }
      if (onCountChange) onCountChange();
    } catch {
      // Reverter se falhar
      setFollowers((prev) => updateStatusInList(prev, targetUser.follow_status));
      setFollowing((prev) => updateStatusInList(prev, targetUser.follow_status));
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [targetUser.id]: false }));
    }
  };

  const currentList = activeTab === "followers" ? followers : following;

  const filteredList = useMemo(() => {
    if (!searchFilter.trim()) return currentList;
    const q = searchFilter.toLowerCase();
    return currentList.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.full_name && u.full_name.toLowerCase().includes(q))
    );
  }, [currentList, searchFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#007BFF]" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Conexões de @{username}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas: Seguidores vs Seguindo */}
        <div className="grid grid-cols-2 p-1.5 mx-4 mt-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold">
          <button
            type="button"
            onClick={() => handleTabChange("followers")}
            className={cn(
              "py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5",
              activeTab === "followers"
                ? "bg-white dark:bg-[#0F172A] text-[#007BFF] shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <span>Seguidores</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-50 dark:bg-blue-950/80 text-[#007BFF]">
              {followersCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("following")}
            className={cn(
              "py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5",
              activeTab === "following"
                ? "bg-white dark:bg-[#0F172A] text-[#007BFF] shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <span>Seguindo</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-50 dark:bg-blue-950/80 text-[#007BFF]">
              {followingCount}
            </span>
          </button>
        </div>

        {/* Campo de Busca Rápida na Lista */}
        <div className="px-4 pt-3 pb-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar nesta lista..."
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007BFF]/30"
            />
          </div>
        </div>

        {/* Lista de Leitores com Rolagem */}
        <div className="overflow-y-auto p-4 flex-1 space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/60">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-[#007BFF]" />
              <span>Carregando conexões...</span>
            </div>
          ) : error ? (
            <div className="py-10 text-center px-4 space-y-2">
              <Lock className="w-8 h-8 mx-auto text-amber-500/80" />
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                {error}
              </p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-1">
              <Users className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]" />
              <p className="font-semibold text-slate-500">
                {searchFilter ? "Nenhum leitor encontrado na busca." : "Nenhum usuário por aqui ainda."}
              </p>
            </div>
          ) : (
            filteredList.map((u) => {
              const isSelf = currentUserId === u.id;
              const isActionLoading = !!actionLoadingMap[u.id];

              return (
                <div
                  key={u.id}
                  className="pt-2.5 first:pt-0 flex items-center justify-between gap-3"
                >
                  <Link
                    href={`/perfil/${u.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 min-w-0 flex-1 group"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
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
                        {!u.is_public && (
                          <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        @{u.username}
                      </p>
                      {u.bio && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 line-clamp-1">
                          {u.bio}
                        </p>
                      )}
                    </div>
                  </Link>

                  {/* Botão Seguir / Seguindo / Solicitado (exceto se for o próprio usuário) */}
                  {!isSelf && (
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
