"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
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
 * Ilustração minimalista de planta e livros para a interseção do cartão
 */
function MinimalistPlantIllustration() {
  return (
    <div className="relative w-20 h-24 select-none pointer-events-none">
      <svg
        viewBox="0 0 80 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_8px_12px_rgba(0,0,0,0.15)]"
      >
        {/* Sombra suave projetada sobre o cartão branco */}
        <ellipse cx="40" cy="91" rx="28" ry="4" fill="#000000" fillOpacity="0.12" />

        {/* Vaso minimalista branco em cerâmica */}
        <path
          d="M22 62 L26 88 C26 90 28 92 31 92 L49 92 C52 92 54 90 54 88 L58 62 C59 58 57 56 53 56 L27 56 C23 56 21 58 22 62 Z"
          fill="#FFFFFF"
        />
        {/* Detalhe sutil de relevo/sombra no vaso */}
        <path
          d="M49 56 L53 56 C57 56 59 58 58 62 L54 88 C54 90 52 92 49 92 L47 92 L51 62 Z"
          fill="#E2E8F0"
        />

        {/* Folha central ereta (verde menta / sálvia) */}
        <path
          d="M40 56 C34 42 34 22 40 8 C46 22 46 42 40 56 Z"
          fill="#34D399"
        />
        {/* Nervura central da folha */}
        <path
          d="M40 18 L40 56"
          stroke="#059669"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Folha esquerda levemente inclinada */}
        <path
          d="M33 56 C24 45 22 28 28 16 C34 27 36 43 33 56 Z"
          fill="#10B981"
        />

        {/* Folha direita menor */}
        <path
          d="M47 56 C53 47 55 34 50 24 C45 33 44 47 47 56 Z"
          fill="#6EE7B7"
        />

        {/* Pequeno broto / detalhe azul da marca */}
        <circle cx="40" cy="56" r="3" fill="#007BFF" />
      </svg>
    </div>
  );
}

/**
 * Modal minimalista para recuperação de senha
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
      <div className="relative w-full max-w-sm p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl text-[#0F172A] dark:text-[#F8FAFC]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#007BFF]/10 text-[#007BFF] flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">Recuperar Senha</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enviaremos um link para seu e-mail
            </p>
          </div>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <span>
                Link enviado para <strong>{email}</strong>. Verifique sua caixa de entrada.
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-full h-11 rounded-full bg-[#007BFF] text-white text-xs font-bold hover:bg-[#0066D6] transition-colors"
            >
              Voltar ao Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {error && (
              <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="relative flex items-center">
              <Mail className="absolute left-4 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu e-mail"
                className="w-full h-11 pl-11 pr-4 rounded-full bg-slate-100/80 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#007BFF]/30 font-medium"
                required
              />
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 h-11 rounded-full bg-[#007BFF] hover:bg-[#0066D6] text-white text-xs font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Enviar</span>}
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
      <div className="w-full flex flex-col justify-between">
        <div className="mb-5">
          <h2 className="text-2xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
            Login
          </h2>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulário de Email e Senha */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Campo Email estilo pill */}
          <div className="relative flex items-center">
            <Mail className="absolute left-4 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full h-12 pl-11 pr-4 rounded-full bg-slate-100/90 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-transparent focus:border-[#007BFF] focus:bg-white dark:focus:bg-[#0B0F1A] focus:outline-none focus:ring-2 focus:ring-[#007BFF]/20 transition-all font-medium"
            />
          </div>

          {/* Campo Senha estilo pill */}
          <div className="space-y-1.5">
            <div className="relative flex items-center">
              <Lock className="absolute left-4 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full h-12 pl-11 pr-11 rounded-full bg-slate-100/90 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-transparent focus:border-[#007BFF] focus:bg-white dark:focus:bg-[#0B0F1A] focus:outline-none focus:ring-2 focus:ring-[#007BFF]/20 transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Link Esqueceu a Senha alinhado à direita */}
            <div className="flex justify-end pr-3">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-[#007BFF] dark:hover:text-[#38BDF8] transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>
          </div>

          {/* Botão Entrar estilo pill azul */}
          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full h-12 rounded-full bg-[#007BFF] hover:bg-[#0066D6] text-white text-sm font-bold shadow-md shadow-[#007BFF]/25 hover:shadow-lg hover:shadow-[#007BFF]/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 select-none mt-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <span>Entrar</span>
            )}
          </button>
        </form>

        {/* Divisor minimalista "ou continue com" */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white dark:bg-[#0F172A] px-3 text-slate-400 font-medium text-[11px]">
              ou entre com
            </span>
          </div>
        </div>

        {/* Botão Oficial Google OAuth estilo pill */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading || isGoogleLoading}
          className="w-full h-12 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/70 text-slate-800 dark:text-slate-100 text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-60 select-none"
        >
          {isGoogleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#007BFF]" />
          ) : (
            <GoogleIcon className="h-5 w-5 shrink-0" />
          )}
          <span>Entrar com Google</span>
        </button>

        {/* Link para Cadastro */}
        <div className="mt-5 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Não tem uma conta?{" "}
            <Link
              href="/cadastro"
              className="font-bold text-[#007BFF] hover:text-[#0066D6] hover:underline"
            >
              Cadastre-se
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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#EDF3FA] dark:bg-[#060B14] p-0 sm:p-6 transition-colors">
      {/* Moldura centralizada moderna (perfeita para PC e Mobile/PWA) */}
      <div className="w-full min-h-screen sm:min-h-0 sm:max-w-[400px] md:max-w-[420px] bg-white dark:bg-[#0F172A] sm:rounded-[36px] shadow-2xl sm:border sm:border-slate-200/80 dark:sm:border-slate-800/80 overflow-hidden flex flex-col transition-all">
        {/* ======================================================= */}
        {/* CABEÇALHO COM A COR OFICIAL TELEBOOKS                   */}
        {/* ======================================================= */}
        <div className="relative bg-gradient-to-br from-[#006CEB] via-[#007BFF] to-[#0057C2] px-6 sm:px-8 pt-10 sm:pt-10 pb-14 text-white overflow-hidden select-none">
          {/* Forma orgânica curva decorativa no canto superior esquerdo */}
          <div className="absolute -top-10 -left-10 w-36 h-36 rounded-full bg-white/10 blur-sm pointer-events-none" />
          <div className="absolute top-0 left-0 w-28 h-28 rounded-br-[60px] bg-white/[0.07] pointer-events-none" />

          {/* Marca TeleBooks no topo */}
          <div className="relative z-10 flex items-center justify-between mb-4">
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
          <div className="relative z-10 max-w-[240px]">
            <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
              Olá!
            </h1>
            <p className="text-xs sm:text-sm font-medium text-blue-100/90 mt-1 leading-snug">
              Sua biblioteca, do seu jeito.
            </p>
          </div>

          {/* Ilustração minimalista de planta sobreposta à junção do cartão */}
          <div className="absolute right-5 bottom-0 z-10 translate-y-3">
            <MinimalistPlantIllustration />
          </div>
        </div>

        {/* ======================================================= */}
        {/* CARTÃO INFERIOR (FOLHA BRANCA COM CANTOS ARREDONDADOS)   */}
        {/* ======================================================= */}
        <div className="relative z-20 -mt-6 rounded-t-[32px] sm:rounded-t-[36px] bg-white dark:bg-[#0F172A] px-6 sm:px-8 pt-7 pb-8 flex-1 flex flex-col justify-between shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
          <Suspense
            fallback={
              <div className="w-full h-64 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#007BFF]" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
