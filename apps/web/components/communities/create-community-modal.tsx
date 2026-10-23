"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Users,
  Lock,
  Globe,
  Megaphone,
  Loader2,
  AlertCircle,
  Sparkles,
  Image as ImageIcon,
  Camera,
  Trash2,
  Upload,
} from "lucide-react";
import { Button, Input, cn } from "@telebooks/ui";
import type { Community, CommunityCreateParams } from "@telebooks/types";
import { api } from "../../lib/api";

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommunityCreated: (community: Community) => void;
}

export function CreateCommunityModal({
  isOpen,
  onClose,
  onCommunityCreated,
}: CreateCommunityModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [onlyAdminsCanPost, setOnlyAdminsCanPost] = useState(false);
  const [coverUrl, setCoverUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione um arquivo de imagem válido para a capa.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("A capa deve ter no máximo 8MB.");
      return;
    }

    try {
      setIsUploadingCover(true);
      setError(null);
      const res = await api.uploadFile(file, "covers");
      setCoverUrl(res.url);
    } catch (err: any) {
      setError(err?.message || "Erro ao fazer upload da capa.");
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione um arquivo de imagem válido para a foto.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("A foto deve ter no máximo 5MB.");
      return;
    }

    try {
      setIsUploadingAvatar(true);
      setError(null);
      const res = await api.uploadFile(file, "avatars");
      setAvatarUrl(res.url);
    } catch (err: any) {
      setError(err?.message || "Erro ao fazer upload da foto.");
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Por favor, digite o nome da comunidade.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload: CommunityCreateParams = {
        name: name.trim(),
        description: description.trim() || undefined,
        is_private: isPrivate,
        only_admins_can_post: onlyAdminsCanPost,
        cover_url: coverUrl.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
      };

      const newCommunity = await api.createCommunity(payload);
      onCommunityCreated(newCommunity);
      onClose();
      // Reset form
      setName("");
      setDescription("");
      setIsPrivate(false);
      setOnlyAdminsCanPost(false);
      setCoverUrl("");
      setAvatarUrl("");
    } catch (err: any) {
      setError(
        err?.message || "Ocorreu um erro ao criar a comunidade. Tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0F172A] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabeçalho */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Nova Comunidade
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                Crie um espaço para debater livros e trocar ideias com leitores.
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

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-2.5 text-rose-700 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Seção Visual: Capa e Foto da Comunidade */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Capa & Foto do Grupo
            </label>

            {/* Banner da Capa com visualização e botão de upload */}
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
                      Trocar Capa
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

              {/* Foto / Avatar embutido na Capa */}
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
                    title="Adicionar/Trocar foto do grupo"
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

            {/* Inputs de arquivo ocultos */}
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

          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Nome da Comunidade *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Clube de Ficção Científica, Leitores de Machado..."
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
              placeholder="Descreva o propósito da comunidade, os gêneros preferidos ou cronogramas de leitura..."
              rows={3}
              maxLength={1000}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007BFF] resize-none"
            />
          </div>

          {/* Opções de Privacidade */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Privacidade do Grupo
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Opção Pública */}
              <div
                onClick={() => setIsPrivate(false)}
                className={cn(
                  "cursor-pointer p-3.5 rounded-2xl border transition-all text-left flex items-start gap-3",
                  !isPrivate
                    ? "border-[#007BFF] bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-[#007BFF]"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-xl shrink-0 mt-0.5",
                    !isPrivate
                      ? "bg-[#007BFF] text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  )}
                >
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Pública
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Qualquer leitor pode entrar e interagir imediatamente.
                  </p>
                </div>
              </div>

              {/* Opção Privada */}
              <div
                onClick={() => setIsPrivate(true)}
                className={cn(
                  "cursor-pointer p-3.5 rounded-2xl border transition-all text-left flex items-start gap-3",
                  isPrivate
                    ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-1 ring-amber-500"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-xl shrink-0 mt-0.5",
                    isPrivate
                      ? "bg-amber-500 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  )}
                >
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Privada
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Requer aprovação ou convite do administrador para entrar.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Opção de Restrição de Postagem (Apenas Admins) */}
          <div className="pt-1">
            <div
              onClick={() => setOnlyAdminsCanPost(!onlyAdminsCanPost)}
              className={cn(
                "cursor-pointer p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3",
                onlyAdminsCanPost
                  ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 ring-1 ring-purple-500"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              )}
            >
              <div className="flex items-start gap-3">
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
                    Restringir mensagens apenas para Administradores
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Ideal para canais de avisos e clubes moderados: apenas admins publicam mensagens; outros membros podem curtir e votar em enquetes.
                  </p>
                </div>
              </div>

              {/* Toggle switch visual */}
              <div
                className={cn(
                  "w-10 h-6 flex items-center rounded-full p-1 duration-200 cursor-pointer shrink-0 mt-1",
                  onlyAdminsCanPost ? "bg-purple-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                )}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md" />
              </div>
            </div>
          </div>

          {/* Botões do Rodapé */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full text-xs px-4"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !name.trim()}
              className="rounded-full text-xs px-5 bg-gradient-to-r from-[#006CEB] to-[#007BFF] shadow-xs"
              leftIcon={
                isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )
              }
            >
              {isSubmitting ? "Criando..." : "Criar Comunidade"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
