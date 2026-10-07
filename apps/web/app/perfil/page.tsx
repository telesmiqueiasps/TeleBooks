"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Save,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Globe,
  Lock,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Skeleton,
} from "@telebooks/ui";
import { useAuth } from "../../components/auth/auth-provider";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, isLoading, updateProfile, signOut } = useAuth();

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setFullName(profile.full_name || "");
      setBio(profile.bio || "");
      setIsPublic(profile.is_public ?? false);
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    if (!username.trim()) {
      setSaveError("O nome de usuário é obrigatório.");
      return;
    }

    setIsSaving(true);
    const result = await updateProfile({
      username: username.trim().toLowerCase(),
      full_name: fullName.trim() || null,
      bio: bio.trim() || null,
      is_public: isPublic,
      avatar_url: avatarUrl.trim() || null,
    });
    setIsSaving(false);

    if (result.error) {
      setSaveError(result.error);
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card className="p-6 space-y-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
          <h2 className="font-serif text-2xl font-bold">Sessão Expirada</h2>
          <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
            Você precisa estar conectado para acessar as configurações do seu perfil.
          </p>
          <Link href="/login">
            <Button variant="primary">Fazer Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  const initials = (fullName || username || user.email || "TL")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#111317] p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#6b7280] dark:text-[#9ca3af] hover:text-[#141618] dark:hover:text-[#f3f4f6] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para a Biblioteca</span>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            leftIcon={<LogOut className="h-4 w-4 text-red-500" />}
            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs"
          >
            Encerrar Sessão
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="border-[#e5e0d8] dark:border-[#272b35] shadow-sm">
          <CardHeader className="pb-4 border-b border-[#eeeae2] dark:border-[#252a35]">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-500 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
                {initials}
              </div>
              <div>
                <CardTitle className="text-xl">
                  {fullName || "Perfil do Leitor"}
                </CardTitle>
                <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
                  @{username || "leitor"} • {user.email}
                </p>
                <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium border border-emerald-200/60 dark:border-emerald-800/40">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Autenticado via Supabase Auth</span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSave} className="space-y-4">
              {saveSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Perfil atualizado com sucesso!</span>
                </div>
              )}

              {saveError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Nome Completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome"
                />

                <Input
                  label="Nome de Usuário (@username) *"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="seu_usuario"
                  required
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-[#4b5563] dark:text-[#a0a8b4]">
                  Biografia / Sobre Você
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Compartilhe seus gêneros e autores favoritos..."
                  rows={3}
                  className="w-full rounded-lg border border-[#e2ddd3] dark:border-[#2b313d] bg-white dark:bg-[#181b22] px-3.5 py-2 text-sm text-[#161719] dark:text-[#f0f2f5] placeholder:text-[#9ca3af] focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                />
              </div>

              <Input
                label="URL do Avatar"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
              />

              {/* Privacy Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#e5e0d8] dark:border-[#272b35] bg-[#faf8f5] dark:bg-[#15171d]">
                <div className="flex items-center gap-2.5">
                  {isPublic ? (
                    <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  )}
                  <div>
                    <span className="text-xs font-semibold block text-[#141618] dark:text-[#f3f4f6]">
                      {isPublic ? "Perfil Público" : "Perfil Privado"}
                    </span>
                    <span className="text-[11px] text-[#6b7280] dark:text-[#9ca3af]">
                      {isPublic
                        ? "Outros leitores podem visualizar seu perfil e estante."
                        : "Apenas você tem acesso à sua biblioteca e dados pessoais."}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isPublic ? "bg-blue-600" : "bg-[#d1cbbf] dark:bg-[#343b47]"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                      isPublic ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#eeeae2] dark:border-[#252a35]">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSaving}
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
