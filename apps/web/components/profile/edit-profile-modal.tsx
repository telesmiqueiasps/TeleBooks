"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  Lock,
  Sparkles,
} from "lucide-react";
import { Button, Input, cn } from "@telebooks/ui";
import type { Profile } from "@telebooks/types";
import { api } from "../../lib/api";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  onProfileUpdated: (updated: Profile) => void;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]+$/;

export function EditProfileModal({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
}: EditProfileModalProps) {
  const [username, setUsername] = useState(profile.username || "");
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "");
  const [isPublic, setIsPublic] = useState(profile.is_public ?? true);

  // Estados de upload de foto
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de validação de username
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "valid" | "taken" | "invalid_format"
  >("idle");
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Estados de salvamento
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sincronizar ao abrir
  useEffect(() => {
    if (isOpen && profile) {
      setUsername(profile.username || "");
      setFullName(profile.full_name || "");
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatar_url || "");
      setIsPublic(profile.is_public ?? true);
      setUsernameStatus("idle");
      setUsernameError(null);
      setSaveError(null);
    }
  }, [isOpen, profile]);

  // Checagem em tempo real de username (Debounce 400ms)
  useEffect(() => {
    const clean = username.trim().toLowerCase();

    // Se for o mesmo username atual do usuário, está sempre válido
    if (clean === (profile.username || "").toLowerCase()) {
      setUsernameStatus("valid");
      setUsernameError(null);
      setIsCheckingUsername(false);
      return;
    }

    if (!clean) {
      setUsernameStatus("invalid_format");
      setUsernameError("O nome de usuário não pode ficar vazio.");
      return;
    }

    if (clean.length < 3 || clean.length > 30) {
      setUsernameStatus("invalid_format");
      setUsernameError("Deve ter entre 3 e 30 caracteres.");
      return;
    }

    if (!USERNAME_REGEX.test(clean)) {
      setUsernameStatus("invalid_format");
      setUsernameError("Permitido apenas letras, números, '.', '_' e '-'.");
      return;
    }

    setIsCheckingUsername(true);
    setUsernameStatus("idle");
    setUsernameError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await api.checkUsername(clean);
        if (res.available) {
          setUsernameStatus("valid");
          setUsernameError(null);
        } else {
          setUsernameStatus("taken");
          setUsernameError(res.reason || "Este nome de usuário já está em uso por outro leitor.");
        }
      } catch {
        setUsernameStatus("idle");
      } finally {
        setIsCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, profile.username]);

  // Manipulador de upload de avatar
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSaveError("Por favor, selecione uma imagem válida (JPEG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSaveError("A imagem deve ter no máximo 5MB.");
      return;
    }

    try {
      setIsUploadingPhoto(true);
      setSaveError(null);
      const res = await api.uploadFile(file, "avatars");
      setAvatarUrl(res.url);
    } catch (err: any) {
      setSaveError(err.message || "Erro ao fazer upload da imagem de perfil.");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setSaveError("O nome de usuário é obrigatório.");
      return;
    }

    if (usernameStatus === "taken" || usernameStatus === "invalid_format") {
      setSaveError(usernameError || "Verifique o nome de usuário.");
      return;
    }

    try {
      setIsSaving(true);
      const updated = await api.updateMyProfile({
        username: cleanUsername,
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        is_public: isPublic,
      });

      onProfileUpdated(updated);
      onClose();
    } catch (err: any) {
      setSaveError(err.message || "Não foi possível atualizar o perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-[#007BFF] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Editar Perfil
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalize sua identidade literária e privacidade
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Rolagem */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-6 space-y-5">
          {saveError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          {/* 1. Foto de Perfil */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white dark:border-[#0F172A] shadow-md bg-gradient-to-tr from-[#006CEB] to-[#007BFF] flex items-center justify-center text-white text-xl font-bold">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Foto de perfil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>
                    {(fullName || username || "U").substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Botão de câmera sobre o avatar */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute inset-0 rounded-full bg-black/45 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Trocar foto"
              >
                {isUploadingPhoto ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
              <label className="text-xs font-bold text-slate-900 dark:text-white block">
                Foto de Perfil
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Envie uma foto do seu computador ou celular (máx. 5MB)
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full text-xs h-7 px-3"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  leftIcon={
                    isUploadingPhoto ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )
                  }
                >
                  {isUploadingPhoto ? "Enviando..." : "Carregar Foto"}
                </Button>
                {avatarUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="rounded-full text-xs h-7 px-2.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    onClick={() => setAvatarUrl("")}
                  >
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* 2. Nome de Usuário (@username) com Validação em Tempo Real */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Nome de Usuário (@username)
              </label>
              {isCheckingUsername ? (
                <span className="text-[11px] text-blue-500 flex items-center gap-1 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Verificando disponibilidade...
                </span>
              ) : usernameStatus === "valid" ? (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  Disponível
                </span>
              ) : usernameStatus === "taken" || usernameStatus === "invalid_format" ? (
                <span className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3 h-3" />
                  {usernameError}
                </span>
              ) : null}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs select-none">
                @
              </span>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                placeholder="seunome"
                className={cn(
                  "pl-7 font-mono text-xs sm:text-sm rounded-2xl",
                  usernameStatus === "valid" &&
                    "border-emerald-500 focus-visible:ring-emerald-500",
                  (usernameStatus === "taken" || usernameStatus === "invalid_format") &&
                    "border-rose-500 focus-visible:ring-rose-500"
                )}
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Seu identificador único na plataforma. Letras minúsculas, números, ponto, hífen e sublinhado.
            </p>
          </div>

          {/* 3. Nome Completo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Nome Completo / Como deseja ser chamado
            </label>
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: Machado de Assis"
              className="rounded-2xl text-xs sm:text-sm"
              maxLength={80}
            />
          </div>

          {/* 4. Bio Literária */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Biografia Literária
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {bio.length}/280
              </span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte aos outros leitores sobre seus autores favoritos, gêneros que mais lê e sua meta do ano..."
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007BFF]/30 resize-none min-h-[90px]"
              maxLength={280}
            />
          </div>

          {/* 5. Privacidade do Perfil */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                    isPublic
                      ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400"
                  )}
                >
                  {isPublic ? (
                    <Globe className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {isPublic ? "Perfil Público" : "Perfil Privado"}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                    {isPublic
                      ? "Qualquer leitor pode seguir você instantaneamente e ver suas publicações no feed literário."
                      : "Outros leitores precisarão solicitar para seguir você. Apenas seguidores aprovados poderão ver suas publicações."}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isPublic}
                onClick={() => setIsPublic(!isPublic)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2",
                  isPublic ? "bg-[#007BFF]" : "bg-slate-300 dark:bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                    isPublic ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Rodapé com Botões */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full text-xs px-4"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="rounded-full text-xs px-6 bg-gradient-to-r from-[#006CEB] to-[#007BFF]"
              disabled={
                isSaving ||
                isCheckingUsername ||
                usernameStatus === "taken" ||
                usernameStatus === "invalid_format"
              }
              leftIcon={
                isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : undefined
              }
            >
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
