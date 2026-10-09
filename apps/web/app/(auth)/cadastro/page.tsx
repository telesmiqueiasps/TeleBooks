"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  AtSign,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { Logo } from "../../../components/ui/logo";
import { GoogleIcon } from "../../../components/auth/google-button";
import { registerSchema } from "@telebooks/validation";
import { useAuth } from "../../../components/auth/auth-provider";
import { api } from "../../../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "unavailable"
  >("idle");
  const [usernameFeedback, setUsernameFeedback] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Verificação de disponibilidade de nome de usuário em tempo real
  useEffect(() => {
    const clean = username.trim().replace(/^@/, "").toLowerCase();
    if (clean.length < 3) {
      setUsernameStatus("idle");
      setUsernameFeedback(null);
      return;
    }

    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await api.checkUsername(clean);
        if (res.available) {
          setUsernameStatus("available");
          setUsernameFeedback(`@${clean} está disponível!`);
        } else {
          setUsernameStatus("unavailable");
          setUsernameFeedback(
            res.reason || `@${clean} já está em uso por outro leitor.`
          );
        }
      } catch {
        setUsernameStatus("idle");
        setUsernameFeedback(null);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    if (password !== confirmPassword) {
      setError("As senhas não coincidem. Digite a mesma senha nos dois campos.");
      return;
    }

    if (usernameStatus === "unavailable") {
      setError(
        usernameFeedback || "O nome de usuário já está em uso por outro leitor."
      );
      return;
    }

    // Validação com Zod do pacote @telebooks/validation
    const validationResult = registerSchema.safeParse({
      email,
      password,
      username: username.replace(/^@/, ""),
    });

    if (!validationResult.success) {
      const firstError =
        validationResult.error.errors[0]?.message || "Dados inválidos.";
      setError(firstError);
      return;
    }

    setIsLoading(true);
    const result = await signUp(
      email,
      password,
      username.replace(/^@/, ""),
      fullName
    );
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.requiresEmailConfirmation) {
      setSuccessNotice(
        "Cadastro realizado com sucesso! Enviamos um link de confirmação para o seu e-mail. Por favor, verifique sua caixa de entrada."
      );
    } else {
      // Dispara e-mail de boas-vindas editorial em segundo plano
      api.sendWelcomeEmail().catch(() => {});
      router.push("/");
      router.refresh();
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    setIsGoogleLoading(true);
    const result = await signInWithGoogle();
    if (result.error) {
      setIsGoogleLoading(false);
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#EDF3FA] dark:bg-[#060B14] p-0 sm:p-6 transition-colors">
      {/* Moldura centralizada moderna (idêntica à tela de Login) */}
      <div className="w-full min-h-screen sm:min-h-0 sm:max-w-[400px] md:max-w-[420px] bg-white dark:bg-[#0F172A] sm:rounded-[36px] shadow-2xl sm:border sm:border-slate-200/80 dark:sm:border-slate-800/80 overflow-hidden flex flex-col transition-all">
        {/* ======================================================= */}
        {/* CABEÇALHO COM A COR OFICIAL TELEBOOKS                   */}
        {/* ======================================================= */}
        <div className="relative bg-gradient-to-br from-[#006CEB] via-[#007BFF] to-[#0057C2] px-6 sm:px-8 pt-8 pb-12 text-white overflow-hidden select-none">
          {/* Forma orgânica curva decorativa no canto superior esquerdo */}
          <div className="absolute -top-10 -left-10 w-36 h-36 rounded-full bg-white/10 blur-sm pointer-events-none" />
          <div className="absolute top-0 left-0 w-28 h-28 rounded-br-[60px] bg-white/[0.07] pointer-events-none" />

          {/* Marca TeleBooks no topo */}
          <div className="relative z-10 flex items-center justify-between mb-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 transition-transform hover:scale-[1.02] focus:outline-none"
            >
              <Logo variant="icon" size="sm" />
              <span className="font-display font-extrabold text-lg tracking-tight text-white">
                Tele<span className="text-blue-200">Books</span>
              </span>
            </Link>
          </div>

          {/* Saudação de boas-vindas */}
          <div className="relative z-10 max-w-[260px]">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Crie sua conta
            </h1>
            <p className="text-xs sm:text-sm font-medium text-blue-100/90 mt-1 leading-snug">
              Comece a organizar suas leituras hoje.
            </p>
          </div>
        </div>

        {/* ======================================================= */}
        {/* CARTÃO INFERIOR (FOLHA BRANCA COM CANTOS ARREDONDADOS)   */}
        {/* ======================================================= */}
        <div className="relative z-20 -mt-6 rounded-t-[32px] sm:rounded-t-[36px] bg-white dark:bg-[#0F172A] px-6 sm:px-8 pt-6 pb-8 flex-1 flex flex-col justify-between shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
          {/* Top link para voltar ao login */}
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#007BFF] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao login</span>
            </Link>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Cadastre-se
            </h2>
          </div>

          {successNotice ? (
            <div className="space-y-4 my-auto py-6">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs leading-relaxed flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <span>{successNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="w-full h-12 rounded-full bg-[#007BFF] text-white text-sm font-bold hover:bg-[#0066D6] transition-colors shadow-md shadow-[#007BFF]/25"
              >
                Ir para o Login
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 flex items-start gap-2.5 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Botão Oficial Google OAuth estilo pill */}
              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={isLoading || isGoogleLoading}
                className="w-full h-12 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/70 text-slate-800 dark:text-slate-100 text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-60 select-none"
              >
                {isGoogleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#007BFF]" />
                ) : (
                  <GoogleIcon className="h-5 w-5 shrink-0" />
                )}
                <span>Cadastrar com o Google</span>
              </button>

              {/* Divisor */}
              <div className="relative my-3.5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white dark:bg-[#0F172A] px-3 text-slate-400 font-medium text-[11px]">
                    ou cadastre com e-mail
                  </span>
                </div>
              </div>

              {/* Formulário de Cadastro */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Nome Completo */}
                <div className="relative flex items-center">
                  <User className="absolute left-4 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Nome Completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    className="w-full h-11 pl-11 pr-4 rounded-full bg-slate-100/90 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-transparent focus:border-[#007BFF] focus:bg-white dark:focus:bg-[#0B0F1A] focus:outline-none focus:ring-2 focus:ring-[#007BFF]/20 transition-all font-medium"
                  />
                </div>

                {/* Nome de Usuário */}
                <div>
                  <div className="relative flex items-center">
                    <AtSign className="absolute left-4 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Nome de usuário (@usuario)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      required
                      className="w-full h-11 pl-11 pr-8 rounded-full bg-slate-100/90 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-transparent focus:border-[#007BFF] focus:bg-white dark:focus:bg-[#0B0F1A] focus:outline-none focus:ring-2 focus:ring-[#007BFF]/20 transition-all font-medium"
                    />
                    {usernameStatus === "checking" && (
                      <Loader2 className="absolute right-3.5 h-3.5 w-3.5 animate-spin text-slate-400" />
                    )}
                    {usernameStatus === "available" && (
                      <Check className="absolute right-3.5 h-3.5 w-3.5 text-emerald-500 stroke-[3]" />
                    )}
                    {usernameStatus === "unavailable" && (
                      <X className="absolute right-3.5 h-3.5 w-3.5 text-rose-500 stroke-[3]" />
                    )}
                  </div>
                  {usernameFeedback && (
                    <p
                      className={`text-[10px] mt-1 pl-4 font-medium ${
                        usernameStatus === "available"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {usernameFeedback}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="relative flex items-center">
                  <Mail className="absolute left-4 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="Endereço de E-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    className="w-full h-11 pl-11 pr-4 rounded-full bg-slate-100/90 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-transparent focus:border-[#007BFF] focus:bg-white dark:focus:bg-[#0B0F1A] focus:outline-none focus:ring-2 focus:ring-[#007BFF]/20 transition-all font-medium"
                  />
                </div>

                {/* Senha */}
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha (mínimo 8 caracteres)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    className="w-full h-11 pl-11 pr-11 rounded-full bg-slate-100/90 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-transparent focus:border-[#007BFF] focus:bg-white dark:focus:bg-[#0B0F1A] focus:outline-none focus:ring-2 focus:ring-[#007BFF]/20 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Confirmar Senha */}
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirmar Senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    className="w-full h-11 pl-11 pr-11 rounded-full bg-slate-100/90 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-transparent focus:border-[#007BFF] focus:bg-white dark:focus:bg-[#0B0F1A] focus:outline-none focus:ring-2 focus:ring-[#007BFF]/20 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    aria-label={
                      showConfirmPassword ? "Ocultar senha" : "Exibir senha"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Botão Cadastrar */}
                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="w-full h-12 rounded-full bg-[#007BFF] hover:bg-[#0066D6] text-white text-sm font-bold shadow-md shadow-[#007BFF]/25 hover:shadow-lg hover:shadow-[#007BFF]/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 select-none mt-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <span>Cadastrar</span>
                  )}
                </button>
              </form>

              {/* Link para Login */}
              <div className="mt-4 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Já possui uma conta?{" "}
                  <Link
                    href="/login"
                    className="font-bold text-[#007BFF] hover:text-[#0066D6] hover:underline"
                  >
                    Entrar
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
