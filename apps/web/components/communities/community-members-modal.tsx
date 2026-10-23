"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Users,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Check,
  Ban,
  Trash2,
  Clock,
  Loader2,
  AlertCircle,
  Search,
} from "lucide-react";
import { Button, Input, Badge, cn } from "@telebooks/ui";
import type { Community, CommunityMember, UserSearchItem } from "@telebooks/types";
import { api } from "../../lib/api";

interface CommunityMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  community: Community;
  currentUserId: string;
  onMemberChanged?: () => void;
}

export function CommunityMembersModal({
  isOpen,
  onClose,
  community,
  currentUserId,
  onMemberChanged,
}: CommunityMembersModalProps) {
  const [activeTab, setActiveTab] = useState<"members" | "pending" | "invite">("members");
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [pendingMembers, setPendingMembers] = useState<CommunityMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Convite / Pesquisa de usuários
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<UserSearchItem[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  const isOwner = community.my_role === "owner";
  const isAdmin = community.my_role === "admin" || isOwner;

  const loadData = useCallback(async () => {
    if (!isOpen) return;
    try {
      setIsLoading(true);
      const activeList = await api.getCommunityMembers(community.id, "active");
      setMembers(activeList);

      if (isAdmin) {
        const pendingList = await api.getCommunityMembers(community.id, "pending");
        setPendingMembers(pendingList);
      }
    } catch {
      // Ignora erro
    } finally {
      setIsLoading(false);
    }
  }, [community.id, isAdmin, isOpen]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounce para busca de leitores no convite
  useEffect(() => {
    if (activeTab !== "invite" || !userSearchQuery.trim()) {
      setUserSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingUsers(true);
        const results = await api.searchUsers(userSearchQuery.trim(), 10);
        // Filtra os que já são membros
        const existingIds = new Set(members.map((m) => m.user_id));
        setUserSearchResults(results.filter((u) => !existingIds.has(u.id)));
      } catch {
        setUserSearchResults([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [userSearchQuery, activeTab, members]);

  if (!isOpen) return null;

  // Aprovar solicitação
  const handleApprove = async (targetUserId: string) => {
    try {
      setActionLoadingId(targetUserId);
      await api.approveCommunityMember(community.id, targetUserId);
      setMessage({ text: "Membro aprovado com sucesso!", type: "success" });
      loadData();
      onMemberChanged?.();
    } catch (err: any) {
      setMessage({ text: err?.message || "Erro ao aprovar membro.", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Recusar solicitação
  const handleReject = async (targetUserId: string) => {
    try {
      setActionLoadingId(targetUserId);
      await api.rejectCommunityMember(community.id, targetUserId);
      setMessage({ text: "Solicitação recusada.", type: "success" });
      loadData();
      onMemberChanged?.();
    } catch (err: any) {
      setMessage({ text: err?.message || "Erro ao recusar solicitação.", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Alterar Cargo (Promover a Admin ou Demitir para Membro)
  const handleToggleAdminRole = async (targetUserId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "member" : "admin";
    try {
      setActionLoadingId(targetUserId);
      await api.updateCommunityMemberRole(community.id, targetUserId, newRole);
      setMessage({
        text: newRole === "admin" ? "Membro promovido a Administrador!" : "Cargo alterado para Membro.",
        type: "success",
      });
      loadData();
      onMemberChanged?.();
    } catch (err: any) {
      setMessage({ text: err?.message || "Erro ao alterar cargo.", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Remover Membro da Comunidade
  const handleRemoveMember = async (targetUserId: string) => {
    if (!confirm("Tem certeza que deseja remover este membro da comunidade?")) return;
    try {
      setActionLoadingId(targetUserId);
      await api.removeCommunityMember(community.id, targetUserId);
      setMessage({ text: "Membro removido da comunidade.", type: "success" });
      loadData();
      onMemberChanged?.();
    } catch (err: any) {
      setMessage({ text: err?.message || "Erro ao remover membro.", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Convidar Usuário
  const handleInviteUser = async (targetUserId: string) => {
    try {
      setActionLoadingId(targetUserId);
      await api.inviteCommunityMember(community.id, targetUserId);
      setMessage({ text: "Leitor adicionado à comunidade!", type: "success" });
      setUserSearchQuery("");
      setUserSearchResults([]);
      loadData();
      onMemberChanged?.();
    } catch (err: any) {
      setMessage({ text: err?.message || "Erro ao adicionar usuário.", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0F172A] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-[#007BFF] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Membros da Comunidade
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {community.name} • {members.length} {members.length === 1 ? "membro" : "membros"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abas */}
        <div className="px-5 pt-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("members");
              setMessage(null);
            }}
            className={cn(
              "px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer",
              activeTab === "members"
                ? "border-[#007BFF] text-[#007BFF]"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            Membros Ativos ({members.length})
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("pending");
                setMessage(null);
              }}
              className={cn(
                "px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "pending"
                  ? "border-amber-500 text-amber-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Solicitações</span>
              {pendingMembers.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px]">
                  {pendingMembers.length}
                </span>
              )}
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("invite");
                setMessage(null);
              }}
              className={cn(
                "px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "invite"
                  ? "border-[#007BFF] text-[#007BFF]"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Convidar</span>
            </button>
          )}
        </div>

        {/* Mensagem de Feedback */}
        {message && (
          <div
            className={cn(
              "m-4 mb-0 p-3 rounded-xl text-xs flex items-center gap-2",
              message.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200"
            )}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{message.text}</span>
          </div>
        )}

        {/* Conteúdo da Aba */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-[#007BFF] mb-2" />
              <span>Carregando dados...</span>
            </div>
          ) : activeTab === "members" ? (
            /* Lista de Membros Ativos */
            members.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Nenhum membro encontrado.
              </div>
            ) : (
              members.map((member) => {
                const isTargetOwner = member.role === "owner";
                const isTargetAdmin = member.role === "admin";
                const isSelf = member.user_id === currentUserId;
                const canManageTarget =
                  (isOwner && !isSelf) || (isAdmin && !isTargetOwner && !isTargetAdmin && !isSelf);

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-xs">
                        {member.user?.avatar_url ? (
                          <img
                            src={member.user.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>
                            {(member.user?.full_name || member.user?.username || "M")
                              .substring(0, 2)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Informações */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {member.user?.full_name || member.user?.username}
                          </span>
                          {isTargetOwner ? (
                            <Badge
                              size="sm"
                              className="bg-blue-600 text-white font-extrabold text-[9px] py-0 px-1.5 border-none"
                            >
                              Criador
                            </Badge>
                          ) : isTargetAdmin ? (
                            <Badge
                              size="sm"
                              className="bg-purple-600 text-white font-bold text-[9px] py-0 px-1.5 border-none"
                            >
                              Admin
                            </Badge>
                          ) : null}
                        </div>
                        <span className="text-[11px] text-slate-400 block truncate">
                          @{member.user?.username}
                        </span>
                      </div>
                    </div>

                    {/* Ações de Moderação */}
                    {canManageTarget && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isOwner && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={actionLoadingId === member.user_id}
                            onClick={() => handleToggleAdminRole(member.user_id, member.role)}
                            className="rounded-full text-[11px] h-7 px-2.5 font-semibold"
                            title={isTargetAdmin ? "Remover admin" : "Promover para admin"}
                          >
                            <ShieldCheck className="w-3 h-3 text-purple-600 mr-1" />
                            {isTargetAdmin ? "Rebaixar" : "Tornar Admin"}
                          </Button>
                        )}

                        <button
                          type="button"
                          disabled={actionLoadingId === member.user_id}
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Remover da comunidade"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : activeTab === "pending" ? (
            /* Lista de Solicitações Pendentes */
            pendingMembers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Nenhuma solicitação de entrada pendente.
              </div>
            ) : (
              pendingMembers.map((pending) => (
                <div
                  key={pending.id}
                  className="flex items-center justify-between p-3 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                      {pending.user?.avatar_url ? (
                        <img
                          src={pending.user.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>
                          {(pending.user?.full_name || pending.user?.username || "P")
                            .substring(0, 2)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block truncate">
                        {pending.user?.full_name || pending.user?.username}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                        @{pending.user?.username} • Solicitou acesso
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={actionLoadingId === pending.user_id}
                      onClick={() => handleApprove(pending.user_id)}
                      className="rounded-full text-xs h-7.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      leftIcon={<Check className="w-3.5 h-3.5" />}
                    >
                      Aprovar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={actionLoadingId === pending.user_id}
                      onClick={() => handleReject(pending.user_id)}
                      className="rounded-full text-xs h-7.5 px-2.5 text-rose-600 hover:bg-rose-50 border-rose-200 font-semibold"
                      leftIcon={<Ban className="w-3.5 h-3.5" />}
                    >
                      Recusar
                    </Button>
                  </div>
                </div>
              ))
            )
          ) : (
            /* Aba Convidar Leitores */
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Pesquisar por @username ou nome do leitor..."
                  className="pl-9.5 rounded-full text-xs sm:text-sm h-9.5 bg-white dark:bg-slate-900"
                  autoFocus
                />
              </div>

              {isSearchingUsers ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#007BFF] mb-2" />
                  <span>Buscando leitores...</span>
                </div>
              ) : userSearchResults.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  {userSearchQuery.trim()
                    ? "Nenhum leitor encontrado para adicionar."
                    : "Digite acima para buscar leitores e adicioná-los à comunidade."}
                </div>
              ) : (
                <div className="space-y-2">
                  {userSearchResults.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{(u.full_name || u.username).substring(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                            {u.full_name || u.username}
                          </span>
                          <span className="text-[11px] text-slate-400 block truncate">
                            @{u.username}
                          </span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={actionLoadingId === u.id}
                        onClick={() => handleInviteUser(u.id)}
                        className="rounded-full text-xs h-7 px-3 bg-[#007BFF] font-semibold"
                        leftIcon={<UserPlus className="w-3 h-3" />}
                      >
                        Adicionar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-full text-xs px-4"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
