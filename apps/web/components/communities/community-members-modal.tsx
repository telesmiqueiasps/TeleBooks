"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Settings,
  Image as ImageIcon,
  Camera,
  Upload,
  Globe,
  Lock,
  Megaphone,
  LogOut,
  Save,
  CheckCircle2,
} from "lucide-react";
import { Button, Input, Badge, cn } from "@telebooks/ui";
import type { Community, CommunityMember, CommunityUpdateParams, UserSearchItem } from "@telebooks/types";
import { api } from "../../lib/api";

interface CommunityMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  community: Community;
  currentUserId: string;
  onMemberChanged?: () => void;
  onCommunityUpdated?: (updated: Community) => void;
  onLeaveCommunity?: () => void;
}

export function CommunityMembersModal({
  isOpen,
  onClose,
  community,
  currentUserId,
  onMemberChanged,
  onCommunityUpdated,
  onLeaveCommunity,
}: CommunityMembersModalProps) {
  const isOwner = community.my_role === "owner";
  const isAdmin = community.my_role === "admin" || isOwner;

  // Abas: "settings" (Ajustes), "members" (Membros), "pending" (Solicitações), "invite" (Convidar)
  const [activeTab, setActiveTab] = useState<"settings" | "members" | "pending" | "invite">(
    isAdmin ? "settings" : "members"
  );

  // Estados de Membros
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [pendingMembers, setPendingMembers] = useState<CommunityMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Estados do Formulário de Ajustes
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description || "");
  const [isPrivate, setIsPrivate] = useState(community.is_private);
  const [onlyAdminsCanPost, setOnlyAdminsCanPost] = useState(community.only_admins_can_post);
  const [coverUrl, setCoverUrl] = useState(community.cover_url || "");
  const [avatarUrl, setAvatarUrl] = useState(community.avatar_url || "");

  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Mensagens globais de feedback
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Convite / Pesquisa de usuários
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<UserSearchItem[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Sincronizar dados da comunidade quando abrir
  useEffect(() => {
    if (isOpen) {
      setName(community.name);
      setDescription(community.description || "");
      setIsPrivate(community.is_private);
      setOnlyAdminsCanPost(community.only_admins_can_post);
      setCoverUrl(community.cover_url || "");
      setAvatarUrl(community.avatar_url || "");
      setMessage(null);
    }
  }, [isOpen, community]);

  // Carregar membros e pendentes
  const loadMembersData = useCallback(async () => {
    if (!isOpen) return;
    try {
      setIsLoadingMembers(true);
      const activeList = await api.getCommunityMembers(community.id, "active");
      setMembers(activeList);

      if (isAdmin) {
        const pendingList = await api.getCommunityMembers(community.id, "pending");
        setPendingMembers(pendingList);
      }
    } catch {
      // Ignora erro
    } finally {
      setIsLoadingMembers(false);
    }
  }, [community.id, isAdmin, isOpen]);

  useEffect(() => {
    loadMembersData();
  }, [loadMembersData]);

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

  // Upload de Capa
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ text: "Selecione uma imagem válida para a capa.", type: "error" });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setMessage({ text: "A capa deve ter no máximo 8MB.", type: "error" });
      return;
    }

    try {
      setIsUploadingCover(true);
      setMessage(null);
      const res = await api.uploadFile(file, "covers");
      setCoverUrl(res.url);
      setMessage({ text: "Capa carregada! Lembre-se de clicar em 'Salvar Ajustes'.", type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Erro ao carregar capa.", type: "error" });
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  // Upload de Foto / Avatar
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ text: "Selecione uma imagem válida para o avatar.", type: "error" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ text: "O avatar deve ter no máximo 5MB.", type: "error" });
      return;
    }

    try {
      setIsUploadingAvatar(true);
      setMessage(null);
      const res = await api.uploadFile(file, "avatars");
      setAvatarUrl(res.url);
      setMessage({ text: "Foto carregada! Lembre-se de clicar em 'Salvar Ajustes'.", type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Erro ao carregar foto.", type: "error" });
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  // Salvar Ajustes da Comunidade
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!name.trim()) {
      setMessage({ text: "O nome da comunidade é obrigatório.", type: "error" });
      return;
    }

    try {
      setIsSavingSettings(true);
      setMessage(null);

      const payload: CommunityUpdateParams = {
        name: name.trim(),
        description: description.trim() || null,
        is_private: isPrivate,
        only_admins_can_post: onlyAdminsCanPost,
        cover_url: coverUrl.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      };

      const updated = await api.updateCommunity(community.id, payload);
      setMessage({ text: "Informações da comunidade atualizadas com sucesso!", type: "success" });
      onCommunityUpdated?.(updated);
    } catch (err: any) {
      setMessage({ text: err?.message || "Erro ao salvar alterações da comunidade.", type: "error" });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Sair da Comunidade
  const handleLeaveCommunity = async () => {
    if (isOwner) {
      alert("Como criador da comunidade, você não pode sair sem transferir a propriedade antes.");
      return;
    }

    if (!confirm(`Tem certeza de que deseja sair de "${community.name}"?`)) {
      return;
    }

    try {
      setIsLeaving(true);
      await api.leaveCommunity(community.id);
      onClose();
      onLeaveCommunity?.();
    } catch (err: any) {
      setMessage({ text: err?.message || "Erro ao sair da comunidade.", type: "error" });
    } finally {
      setIsLeaving(false);
    }
  };

  // Aprovar solicitação
  const handleApprove = async (targetUserId: string) => {
    try {
      setActionLoadingId(targetUserId);
      await api.approveCommunityMember(community.id, targetUserId);
      setMessage({ text: "Membro aprovado com sucesso!", type: "success" });
      loadMembersData();
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
      loadMembersData();
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
      loadMembersData();
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
      loadMembersData();
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
      loadMembersData();
      onMemberChanged?.();
    } catch (err: any) {
      setMessage({ text: err?.message || "Erro ao adicionar usuário.", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtragem de membros ativos
  const filteredMembers = members.filter((m) => {
    if (!memberSearchQuery.trim()) return true;
    const q = memberSearchQuery.toLowerCase();
    const nameMatch = m.user?.full_name?.toLowerCase().includes(q);
    const usernameMatch = m.user?.username.toLowerCase().includes(q);
    return nameMatch || usernameMatch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0F172A] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center shadow-xs overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Users className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate max-w-[260px] sm:max-w-[340px]">
                {name || community.name}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Ajustes e gerenciamento da comunidade
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Abas */}
        <div className="px-4 sm:px-5 pt-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1 sm:gap-2 shrink-0 overflow-x-auto no-scrollbar">
          {/* Aba Ajustes */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("settings");
              setMessage(null);
            }}
            className={cn(
              "px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
              activeTab === "settings"
                ? "border-[#007BFF] text-[#007BFF]"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Ajustes</span>
          </button>

          {/* Aba Membros */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("members");
              setMessage(null);
            }}
            className={cn(
              "px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
              activeTab === "members"
                ? "border-[#007BFF] text-[#007BFF]"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Membros ({members.length})</span>
          </button>

          {/* Aba Solicitações (visível apenas para admins de comunidades privadas ou se houver pendentes) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("pending");
                setMessage(null);
              }}
              className={cn(
                "px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                activeTab === "pending"
                  ? "border-amber-500 text-amber-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Solicitações</span>
              {pendingMembers.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {pendingMembers.length}
                </span>
              )}
            </button>
          )}

          {/* Aba Convidar */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("invite");
                setMessage(null);
              }}
              className={cn(
                "px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
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
              "mx-5 mt-3 p-3 rounded-xl text-xs flex items-center gap-2",
              message.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200"
            )}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Conteúdo das Abas */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* =========================================================================
              ABA 1: AJUSTES DA COMUNIDADE
              ========================================================================= */}
          {activeTab === "settings" && (
            <div className="space-y-4">
              {isAdmin ? (
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  {/* Capa e Foto da Comunidade */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Capa e Foto do Grupo
                    </label>

                    <div className="relative w-full h-28 sm:h-32 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/80 group">
                      {coverUrl ? (
                        <>
                          <img
                            src={coverUrl}
                            alt="Capa da Comunidade"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => coverInputRef.current?.click()}
                              className="px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              Alterar Capa
                            </button>
                            <button
                              type="button"
                              onClick={() => setCoverUrl("")}
                              className="p-1.5 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white shadow-md cursor-pointer"
                              title="Remover capa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-3 text-center">
                          <ImageIcon className="w-6 h-6 mb-1 opacity-60" />
                          <span className="text-[11px] font-medium">Nenhuma capa adicionada</span>
                          <button
                            type="button"
                            onClick={() => coverInputRef.current?.click()}
                            disabled={isUploadingCover}
                            className="mt-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#007BFF] text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            {isUploadingCover ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#007BFF]" />
                            ) : (
                              <Upload className="w-3.5 h-3.5 text-[#007BFF]" />
                            )}
                            <span>{isUploadingCover ? "Enviando..." : "Adicionar Capa"}</span>
                          </button>
                        </div>
                      )}

                      {/* Avatar Flutuante na Capa */}
                      <div className="absolute bottom-2.5 left-3.5 z-10 flex items-center gap-2.5">
                        <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center font-bold text-sm shadow-md border-2 border-white dark:border-[#0F172A] overflow-hidden group/avatar">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Users className="w-5 h-5" />
                          )}
                          <button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            disabled={isUploadingAvatar}
                            className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                            title="Trocar foto do grupo"
                          >
                            {isUploadingAvatar ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Camera className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <div className="bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] text-white font-medium">
                          {avatarUrl ? (
                            <button
                              type="button"
                              onClick={() => setAvatarUrl("")}
                              className="hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                              Remover foto
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => avatarInputRef.current?.click()}
                              className="hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Upload className="w-2.5 h-2.5" />
                              Escolher foto
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={handleCoverUpload}
                      className="hidden"
                    />
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Nome da Comunidade */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Nome da Comunidade *
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nome da comunidade..."
                      maxLength={120}
                      required
                      className="rounded-xl border-slate-300 dark:border-slate-700 text-sm"
                    />
                  </div>

                  {/* Descrição */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Descrição ou Regras
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Descreva o propósito da comunidade, tópicos de discussão..."
                      rows={3}
                      maxLength={1000}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007BFF] resize-none"
                    />
                  </div>

                  {/* Alterar entre Público e Privado */}
                  <div className="space-y-2 pt-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Visibilidade da Comunidade
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPrivate(false)}
                        className={cn(
                          "p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1",
                          !isPrivate
                            ? "border-[#007BFF] bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-[#007BFF]"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        )}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                          <Globe className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Pública</span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                          Entrada aberta a todos os leitores.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsPrivate(true)}
                        className={cn(
                          "p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1",
                          isPrivate
                            ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-1 ring-amber-500"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        )}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                          <Lock className="w-3.5 h-3.5 text-amber-500" />
                          <span>Privada</span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                          Requer aprovação do admin.
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Alterar entre Mensagens Abertas ou Apenas Admin */}
                  <div className="pt-1">
                    <div
                      onClick={() => setOnlyAdminsCanPost(!onlyAdminsCanPost)}
                      className={cn(
                        "cursor-pointer p-3 rounded-2xl border transition-all flex items-start justify-between gap-3",
                        onlyAdminsCanPost
                          ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 ring-1 ring-purple-500"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={cn(
                            "p-2 rounded-xl shrink-0 mt-0.5",
                            onlyAdminsCanPost
                              ? "bg-purple-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          )}
                        >
                          <Megaphone className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            Apenas Administradores podem enviar mensagens
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            {onlyAdminsCanPost
                              ? "Ativado: Outros membros podem apenas curtir e votar em enquetes."
                              : "Desativado: Todos os membros ativos podem mandar mensagens."}
                          </p>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "w-9 h-5 flex items-center rounded-full p-0.5 duration-200 cursor-pointer shrink-0 mt-1",
                          onlyAdminsCanPost ? "bg-purple-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                        )}
                      >
                        <div className="bg-white w-4 h-4 rounded-full shadow-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Botão de Salvar Alterações */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={isSavingSettings}
                      className="w-full rounded-full text-xs h-9 bg-gradient-to-r from-[#006CEB] to-[#007BFF] shadow-xs font-bold"
                      leftIcon={
                        isSavingSettings ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )
                      }
                    >
                      {isSavingSettings ? "Salvando Alterações..." : "Salvar Alterações"}
                    </Button>
                  </div>
                </form>
              ) : (
                /* Visualização para leitores não-admins */
                <div className="space-y-4">
                  {/* Capa */}
                  {community.cover_url && (
                    <div className="h-28 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                      <img src={community.cover_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Sobre a Comunidade
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {community.description || "Nenhuma descrição fornecida."}
                    </p>
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      {community.is_private ? (
                        <Badge variant="outline" size="sm" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                          <Lock className="w-2.5 h-2.5 mr-1" /> Privada
                        </Badge>
                      ) : (
                        <Badge variant="outline" size="sm" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                          <Globe className="w-2.5 h-2.5 mr-1" /> Pública
                        </Badge>
                      )}
                      {community.only_admins_can_post && (
                        <Badge variant="outline" size="sm" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                          <Megaphone className="w-2.5 h-2.5 mr-1" /> Apenas Admins Postam
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Botão de Sair da Comunidade */}
              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800">
                {!isOwner ? (
                  <button
                    type="button"
                    onClick={handleLeaveCommunity}
                    disabled={isLeaving}
                    className="w-full py-2.5 px-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLeaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                    <span>Sair da Comunidade</span>
                  </button>
                ) : (
                  <p className="text-[11px] text-center text-slate-400">
                    Você é o criador desta comunidade.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              ABA 2: LISTA DE MEMBROS
              ========================================================================= */}
          {activeTab === "members" && (
            <div className="space-y-3">
              {/* Pesquisa de membros */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Buscar membro por nome ou usuário..."
                  className="pl-8 text-xs rounded-xl h-8.5 border-slate-200 dark:border-slate-800"
                />
              </div>

              {isLoadingMembers ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-[#007BFF] mb-2" />
                  <span>Carregando membros...</span>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  Nenhum membro encontrado.
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const isTargetOwner = member.role === "owner";
                  const isTargetAdmin = member.role === "admin";
                  const isSelf = member.user_id === currentUserId;
                  const canManageTarget =
                    (isOwner && !isSelf) || (isAdmin && !isTargetOwner && !isTargetAdmin && !isSelf);

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-2xs">
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

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
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
                          <span className="text-[10px] text-slate-400 block truncate">
                            @{member.user?.username}
                          </span>
                        </div>
                      </div>

                      {/* Ações de moderação */}
                      {canManageTarget && (
                        <div className="flex items-center gap-1 shrink-0">
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => handleToggleAdminRole(member.user_id, member.role)}
                              disabled={actionLoadingId === member.user_id}
                              className={cn(
                                "p-1.5 rounded-xl border text-[11px] font-semibold transition-colors cursor-pointer",
                                isTargetAdmin
                                  ? "border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50"
                                  : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              )}
                              title={isTargetAdmin ? "Remover admin" : "Promover a admin"}
                            >
                              {actionLoadingId === member.user_id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <ShieldCheck className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.user_id)}
                            disabled={actionLoadingId === member.user_id}
                            className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title="Remover membro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* =========================================================================
              ABA 3: SOLICITAÇÕES PENDENTES
              ========================================================================= */}
          {activeTab === "pending" && isAdmin && (
            <div className="space-y-2.5">
              {pendingMembers.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  Nenhuma solicitação de entrada pendente.
                </div>
              ) : (
                pendingMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                        {member.user?.avatar_url ? (
                          <img src={member.user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{(member.user?.username || "L").substring(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                          {member.user?.full_name || member.user?.username}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          @{member.user?.username}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApprove(member.user_id)}
                        disabled={actionLoadingId === member.user_id}
                        className="rounded-full text-xs h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700"
                        leftIcon={<Check className="w-3 h-3" />}
                      >
                        Aprovar
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleReject(member.user_id)}
                        disabled={actionLoadingId === member.user_id}
                        className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Recusar"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* =========================================================================
              ABA 4: CONVIDAR LEITORES
              ========================================================================= */}
          {activeTab === "invite" && isAdmin && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Pesquisar leitor por nome ou @username..."
                  className="pl-8 text-xs rounded-xl h-9 border-slate-200 dark:border-slate-800"
                />
              </div>

              {isSearchingUsers ? (
                <div className="py-8 flex items-center justify-center text-slate-400 text-xs gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#007BFF]" />
                  <span>Buscando leitores...</span>
                </div>
              ) : userSearchResults.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  {userSearchQuery.trim()
                    ? "Nenhum leitor encontrado para adicionar."
                    : "Digite o nome ou @ de quem deseja convidar."}
                </div>
              ) : (
                userSearchResults.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
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
                        <span className="text-[10px] text-slate-400 block truncate">
                          @{u.username}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleInviteUser(u.id)}
                      disabled={actionLoadingId === u.id}
                      className="rounded-full text-xs h-7 px-3 bg-[#007BFF]"
                      leftIcon={<UserPlus className="w-3 h-3" />}
                    >
                      {actionLoadingId === u.id ? "Adicionando..." : "Adicionar"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
