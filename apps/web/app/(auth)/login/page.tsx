"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";
import { Logo } from "../../../components/ui/logo";
import { GoogleIcon } from "../../../components/auth/google-button";
import { useAuth } from "../../../components/auth/auth-provider";

/**
 * Modal simples e elegante para recuperação de senha
 */
function ForgotPasswordModal({
  isOpen,
  onClose,
  initialEmail,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialEmail: string;
}) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Por favor, informe seu e-mail.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await resetPassword(email.trim());
    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setSuccess(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xl text-[#0F172A] dark:text-[#F8FAFC]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#007BFF]/10 text-[#007BFF] flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Recuperar Senha</h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Enviaremos um link de recuperação para seu e-mail
            </p>
          </div>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <span>
                Link de recuperação enviado com sucesso para <strong>{email}</strong>.
                Verifique sua caixa de entrada.
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-full h-11 rounded-xl bg-[#007BFF] text-white text-sm font-semibold hover:bg-[#0066D6] transition-colors"
            >
              Voltar ao Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1.5">
                Endereço de E-mail
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 h-4 w-4 text-[#94A3B8] pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full h-11 pl-10 pr-3 rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-slate-50 dark:bg-[#0B0F1A] text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] outline-none focus:border-[#007BFF] focus:ring-2 focus:ring-[#007BFF]/20 transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 rounded-xl border border-[#CBD5E1] dark:border-[#334155] text-xs font-semibold hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 h-11 rounded-xl bg-[#007BFF] hover:bg-[#0066D6] text-white text-xs font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Enviar Link</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";
  const urlError = searchParams.get("error");

  const { signIn, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const [error, setError] = useState<string | null>(
    urlError === "auth_callback_failed"
      ? "Não foi possível concluir o login com o Google. Tente novamente."
      : urlError
      ? decodeURIComponent(urlError)
      : null
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setIsLoading(true);
    const result = await signIn(email.trim(), password);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      router.push(redirectTo);
      router.refresh();
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);
    const result = await signInWithGoogle(redirectTo);
    if (result.error) {
      setIsGoogleLoading(false);
      setError(result.error);
    }
  };

  return (
    <>
      <div className="w-full rounded-2xl sm:rounded-3xl border border-[#E2E8F0] dark:border-[#1E293B] shadow-xl bg-white dark:bg-[#0F172A] p-6 sm:p-8">
        <div className="space-y-1 mb-6 text-center sm:text-left">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
            Acesse sua biblioteca
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
            Entre com sua conta Google ou use seu e-mail e senha.
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Botão Oficial Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading || isGoogleLoading}
          className="w-full h-12 flex items-center justify-center gap-3 px-4 rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-[#283548] text-[#0F172A] dark:text-[#F8FAFC] text-sm font-semibold shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#007BFF]/20 active:scale-[0.99] disabled:opacity-60 select-none"
        >
          {isGoogleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#007BFF]" />
          ) : (
            <GoogleIcon className="h-5 w-5 shrink-0" />
          )}
          <span>Entrar com o Google</span>
        </button>

        {/* Divisor */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[#E2E8F0] dark:border-[#1E293B]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-[#0F172A] px-3 text-[#94A3B8] font-medium tracking-wider text-[11px]">
              ou continue com e-mail
            </span>
          </div>
        </div>

        {/* Formulário de Email e Senha */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1.5">
              Endereço de E-mail
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 h-4 w-4 text-[#94A3B8] pointer-events-none" />
              <input
                type="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-slate-50/70 dark:bg-[#0B0F1A] text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] outline-none focus:border-[#007BFF] focus:ring-2 focus:ring-[#007BFF]/20 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[#475569] dark:text-[#94A3B8]">
                Sua Senha
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-[11px] sm:text-xs text-[#007BFF] hover:underline font-medium"
              >
                Esqueceu a senha?
              </button>
            </div>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 h-4 w-4 text-[#94A3B8] pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-slate-50/70 dark:bg-[#0B0F1A] text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] outline-none focus:border-[#007BFF] focus:ring-2 focus:ring-[#007BFF]/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors"
                aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full h-12 flex items-center justify-center gap-2 px-4 rounded-xl bg-[#007BFF] hover:bg-[#0066D6] text-white text-sm font-semibold shadow-sm shadow-[#007BFF]/25 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#007BFF]/30 active:scale-[0.99] disabled:opacity-60 select-none mt-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                <span>Entrar no TeleBooks</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] text-center">
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Ainda não tem uma conta?{" "}
            <Link
              href="/cadastro"
              className="font-semibold text-[#007BFF] hover:text-[#0066D6] hover:underline"
            >
              Cadastre-se gratuitamente
            </Link>
          </p>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmail={email}
      />
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-[#f8fafc] dark:bg-[#0B0F1A] transition-colors">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header com a Logo Oficial */}
        <div className="flex flex-col items-center text-center space-y-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center transition-transform hover:scale-[1.02] focus:outline-none"
            aria-label="Ir para a página inicial"
          >
            <Logo size="lg" showSlogan priority />
          </Link>
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] font-sans">
            Sua biblioteca pessoal, do seu jeito.
          </p>
        </div>

        {/* Card de Login */}
        <Suspense
          fallback={
            <div className="w-full h-80 rounded-2xl sm:rounded-3xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#007BFF]" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
