"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../../../components/auth/auth-provider";
import { GoogleIcon } from "../../../components/auth/google-button";
import { telebooksTheme } from "../../../lib/theme";

/**
 * Logotipo vetorial oficial do TeleBooks com geometria 3D fiel à referência
 */
function TeleBooksHeaderLogo() {
  return (
    <div className="flex items-center gap-3 select-none">
      {/* Símbolo 3D do livro formando o 'T' */}
      <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 transition-transform duration-200 hover:scale-105">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-[0_8px_16px_rgba(8,124,255,0.4)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="tbCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#20B9FF" />
              <stop offset="100%" stopColor="#087CFF" />
            </linearGradient>
            <linearGradient id="tbBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#119DFF" />
              <stop offset="100%" stopColor="#0052CC" />
            </linearGradient>
            <linearGradient id="tbDarkBlue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0066E0" />
              <stop offset="100%" stopColor="#003580" />
            </linearGradient>
          </defs>

          {/* Topo / Capa inclinada formando a barra horizontal do T */}
          <path
            d="M20 32 L58 14 L88 30 L50 48 Z"
            fill="url(#tbCyanGrad)"
          />

          {/* Lombada esquerda formando a descida esquerda */}
          <path
            d="M20 32 L50 48 L50 78 L20 62 Z"
            fill="url(#tbBlueGrad)"
          />

          {/* Páginas internas brancas */}
          <path
            d="M50 48 L72 37 L72 67 L50 78 Z"
            fill="#F7F9FF"
          />

          {/* Haste vertical do T / Bloco de páginas e capa direita */}
          <path
            d="M42 43 L62 33 L62 88 L42 98 Z"
            fill="#FFFFFF"
          />
          <path
            d="M62 33 L88 30 L88 80 L62 88 Z"
            fill="url(#tbDarkBlue)"
          />

          {/* Destaque frontal do 'T' */}
          <path
            d="M34 40 L56 29 L56 41 L46 46 L46 84 L34 89 Z"
            fill="#FFFFFF"
            opacity="0.95"
          />
          <path
            d="M56 29 L70 36 L70 47 L56 41 Z"
            fill="url(#tbCyanGrad)"
          />
        </svg>
      </div>

      {/* Letreiro TeleBooks e Slogan */}
      <div className="flex flex-col">
        <div className="flex items-center text-2xl sm:text-3xl font-extrabold tracking-tight font-display leading-none">
          <span className="text-white">Tele</span>
          <span className="text-[#119DFF] drop-shadow-[0_2px_10px_rgba(17,157,255,0.4)]">
            Books
          </span>
        </div>
        <span className="text-[9.5px] sm:text-[10px] tracking-[0.2em] font-bold text-[#7186AB] uppercase mt-1">
          SUA BIBLIOTECA, DO SEU JEITO.
        </span>
      </div>
    </div>
  );
}

/**
 * Acentos decorativos de brilho (sparkles) nas laterais do botão principal
 */
function ButtonSparkles({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left";
  return (
    <svg
      width="20"
      height="26"
      viewBox="0 0 20 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-opacity duration-300 ${
        isLeft ? "mr-1 rotate-0" : "ml-1 scale-x-[-1]"
      }`}
    >
      {/* Raio superior */}
      <line
        x1="2"
        y1="4"
        x2="16"
        y2="7"
        stroke="#20B9FF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Raio central */}
      <line
        x1="1"
        y1="13"
        x2="18"
        y2="13"
        stroke="#20B9FF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Raio inferior */}
      <line
        x1="2"
        y1="22"
        x2="16"
        y2="19"
        stroke="#20B9FF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Modal elegante de Recuperação de Senha
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
      setError("Por favor, digite seu e-mail.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-6 sm:p-7 rounded-[28px] bg-[#07152D] border border-[#203B69] shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-[#F7F9FF]">
        {/* Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#7186AB] hover:text-white hover:bg-[#0D1D3A] transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-[#087CFF]/15 border border-[#20B9FF]/30 flex items-center justify-center text-[#20B9FF]">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Recuperar Senha</h3>
            <p className="text-xs text-[#A4B5D2]">
              Enviaremos um link seguro para o seu e-mail
            </p>
          </div>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#42D6A4]/10 border border-[#42D6A4]/30 text-[#42D6A4] text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>
                Link de recuperação enviado com sucesso para{" "}
                <strong>{email}</strong>! Verifique sua caixa de entrada e siga as
                instruções.
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-[22px] bg-gradient-to-r from-[#087CFF] to-[#119DFF] text-white font-bold text-sm shadow-md transition-transform hover:scale-[1.01]"
            >
              Voltar ao Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-[#FF6B7A]/15 border border-[#FF6B7A]/40 text-[#FF6B7A] text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#A4B5D2] mb-1.5">
                Endereço de E-mail
              </label>
              <div className="flex items-center px-4 h-13 rounded-[20px] bg-[#0D1D3A] border border-[#203B69] focus-within:border-[#20B9FF] focus-within:ring-2 focus-within:ring-[#20B9FF]/20">
                <Mail className="w-5 h-5 text-[#20B9FF] shrink-0 mr-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full bg-transparent text-sm text-[#F7F9FF] placeholder:text-[#7186AB] outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 rounded-[22px] border border-[#203B69] bg-[#0D1D3A] text-[#A4B5D2] hover:text-white text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3.5 rounded-[22px] bg-gradient-to-r from-[#087CFF] to-[#119DFF] hover:from-[#0066E0] hover:to-[#087CFF] text-white text-xs font-bold shadow-lg shadow-[#087CFF]/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
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

/**
 * Formulário principal de autenticação
 */
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
      ? "Não foi possível concluir a autenticação com o Google. Tente novamente."
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
      setError("Por favor, preencha o e-mail e a senha.");
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
      <div className="w-full max-w-[430px] sm:max-w-[450px] relative rounded-[32px] p-6 sm:p-8 bg-[#07152D]/85 backdrop-blur-xl border border-[#203B69] shadow-[0_20px_50px_rgba(0,0,0,0.65),0_0_40px_rgba(8,124,255,0.12)]">
        {/* Brilho sutil no topo do card */}
        <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#20B9FF]/50 to-transparent" />

        {/* Cabeçalho do Card */}
        <div className="flex flex-col items-start">
          {/* Ícone de livro aberto em ciano */}
          <div className="w-12 h-12 rounded-2xl bg-[#087CFF]/15 border border-[#20B9FF]/30 flex items-center justify-center text-[#20B9FF] shadow-[0_0_20px_rgba(32,185,255,0.25)]">
            <BookOpen className="w-6 h-6" />
          </div>

          <h2 className="text-2xl sm:text-[27px] font-extrabold text-[#F7F9FF] tracking-tight mt-4">
            Acesse sua biblioteca
          </h2>

          <p className="text-xs sm:text-sm text-[#A4B5D2] leading-relaxed mt-1.5">
            Entre com suas credenciais para continuar gerenciando seus livros,
            autores, cores e muito mais!
          </p>
        </div>

        {/* Mensagem de Erro de Validação */}
        {error && (
          <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#FF6B7A]/15 border border-[#FF6B7A]/35 text-[#FF6B7A] text-xs leading-relaxed animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#FF6B7A]" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Campo E-mail */}
          <div>
            <label className="block text-xs font-semibold text-[#A4B5D2] mb-1.5">
              Endereço de E-mail
            </label>
            <div className="relative flex items-center h-13 sm:h-14 px-4 rounded-[22px] bg-[#0D1D3A] border border-[#203B69] focus-within:border-[#20B9FF] focus-within:ring-2 focus-within:ring-[#20B9FF]/25 transition-all duration-200">
              <Mail className="w-5 h-5 text-[#20B9FF] shrink-0 mr-3" />
              <input
                type="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full bg-transparent text-sm sm:text-[15px] text-[#F7F9FF] placeholder:text-[#7186AB] outline-none font-medium"
              />
            </div>
          </div>

          {/* Campo Senha */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#A4B5D2]">
                Sua Senha
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs font-semibold text-[#20B9FF] hover:text-[#119DFF] hover:underline transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>
            <div className="relative flex items-center h-13 sm:h-14 px-4 rounded-[22px] bg-[#0D1D3A] border border-[#203B69] focus-within:border-[#20B9FF] focus-within:ring-2 focus-within:ring-[#20B9FF]/25 transition-all duration-200">
              <Lock className="w-5 h-5 text-[#20B9FF] shrink-0 mr-3" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full bg-transparent text-sm sm:text-[15px] text-[#F7F9FF] placeholder:text-[#7186AB] outline-none font-medium tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 text-[#7186AB] hover:text-[#20B9FF] transition-colors shrink-0"
                aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Botão Principal com Efeito Brilho e Sparkles */}
          <div className="pt-2 flex items-center justify-center">
            <ButtonSparkles side="left" />
            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="flex-1 h-14 sm:h-[58px] rounded-[26px] bg-gradient-to-r from-[#087CFF] via-[#119DFF] to-[#087CFF] hover:from-[#0066E0] hover:to-[#087CFF] text-white font-bold text-base sm:text-[16px] shadow-[0_10px_25px_-4px_rgba(8,124,255,0.5),0_0_20px_rgba(32,185,255,0.3)] transition-all duration-200 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2.5 select-none"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <>
                  <LogIn className="w-5 h-5 text-white stroke-[2.4]" />
                  <span>Entrar no TeleBooks</span>
                </>
              )}
            </button>
            <ButtonSparkles side="right" />
          </div>
        </form>

        {/* Divisor "ou continue com" */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="w-full border-t border-[#203B69]/70" />
          <span className="absolute px-3 bg-[#07152D] text-[11px] sm:text-xs font-normal text-[#7186AB] tracking-wide">
            ou continue com
          </span>
        </div>

        {/* Botão Oficial Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading || isGoogleLoading}
          className="w-full h-13 sm:h-14 rounded-[26px] bg-white hover:bg-[#F8FAFC] text-[#1F1F1F] font-semibold text-sm sm:text-[15px] shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition-all duration-200 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-3 select-none"
        >
          {isGoogleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#087CFF]" />
          ) : (
            <GoogleIcon className="w-5 h-5 shrink-0" />
          )}
          <span>Entrar com Google</span>
        </button>

        {/* Link para Cadastro */}
        <div className="mt-5 pt-3 text-center">
          <p className="text-xs sm:text-[13px] text-[#A4B5D2]">
            Ainda não tem uma conta?{" "}
            <Link
              href="/cadastro"
              className="font-semibold text-[#20B9FF] hover:text-[#119DFF] hover:underline transition-colors inline-flex items-center gap-1"
            >
              <span>Cadastre-se gratuitamente</span>
              <span className="text-sm">→</span>
            </Link>
          </p>
        </div>
      </div>

      {/* Modal de Recuperação de Senha */}
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
    <div
      className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden font-sans"
      style={{
        backgroundColor: telebooksTheme.colors.bgPrimary,
        backgroundImage: telebooksTheme.gradients.bgGradient,
      }}
    >
      {/* ============================================================ */}
      {/* REGIÃO A & D: ILUSTRAÇÃO SUPERIOR DIREITA (HERO BIBLIOTECA) */}
      {/* ============================================================ */}
      <div className="absolute top-0 right-0 w-[280px] sm:w-[420px] md:w-[520px] lg:w-[600px] h-[320px] sm:h-[440px] md:h-[500px] pointer-events-none select-none z-0 overflow-hidden">
        {/* Imagem editorial de biblioteca com abajur, caneca e estantes */}
        <div className="relative w-full h-full">
          <Image
            src="/assets/telebooks/library-hero.jpg"
            alt="Biblioteca aconchegante TeleBooks"
            fill
            priority
            sizes="(max-width: 768px) 320px, 600px"
            className="object-cover object-top opacity-70 sm:opacity-85 mix-blend-screen"
          />
          {/* Gradientes de fusão suave para integrar com o fundo escuro */}
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#07142B]/40 to-[#030817]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030817] via-[#07142B]/30 to-transparent" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#030817] opacity-60" />
        </div>
      </div>

      {/* Glow atmosférico azul-elétrico de fundo */}
      <div className="absolute top-[15%] left-[10%] w-[350px] h-[350px] rounded-full bg-[#087CFF]/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[10%] w-[300px] h-[300px] rounded-full bg-[#20B9FF]/10 blur-[130px] pointer-events-none" />

      {/* ============================================================ */}
      {/* CONTEÚDO PRINCIPAL (CABEÇALHO + SAUDAÇÃO + CARD DE LOGIN)    */}
      {/* ============================================================ */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-8 flex flex-col items-center flex-1 justify-center">
        <div className="w-full max-w-[440px] sm:max-w-[460px] flex flex-col items-start space-y-6">
          {/* REGIÃO B: LOGOTIPO TELEBOOKS */}
          <Link
            href="/"
            className="transition-transform hover:scale-[1.02] focus:outline-none"
            aria-label="Ir para página inicial do TeleBooks"
          >
            <TeleBooksHeaderLogo />
          </Link>

          {/* REGIÃO C: SAUDAÇÃO DE BOAS-VINDAS */}
          <div className="flex flex-col items-start select-none">
            {/* Linha 1: "Bem-vindo(a)" */}
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#F7F9FF] tracking-tight leading-tight">
              Bem-vindo(a)
            </h1>

            {/* Linha 2: "de volta!" em fonte cursiva vibrante */}
            <div className="relative inline-block mt-0.5">
              <span className="font-handwriting text-3xl sm:text-4xl text-[#20B9FF] drop-shadow-[0_2px_12px_rgba(32,185,255,0.4)] tracking-wide">
                de volta!
              </span>
              {/* Traço decorativo feito à mão abaixo de "de volta!" */}
              <svg
                className="w-24 sm:w-28 h-2.5 mt-0.5 text-[#119DFF]"
                viewBox="0 0 110 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 7C25 2 75 1.5 108 5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Subtítulo poético */}
            <p className="text-xs sm:text-sm text-[#A4B5D2] font-normal leading-relaxed mt-2 max-w-[320px]">
              Continue sua jornada literária.
              <br />
              Aqui, seus livros ganham vida.
            </p>
          </div>

          {/* REGIÃO D: CARD PRINCIPAL DE AUTENTICAÇÃO */}
          <Suspense
            fallback={
              <div className="w-full max-w-[430px] h-[520px] rounded-[32px] bg-[#07152D]/85 border border-[#203B69] p-8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#20B9FF]" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>

      {/* ============================================================ */}
      {/* REGIÃO E: DECORAÇÃO INFERIOR (LIVROS + FRASE INSPIRADORA)    */}
      {/* ============================================================ */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-8 pb-4 sm:pb-6 flex items-end justify-between select-none">
        {/* Livros empilhados com plantinha no canto inferior esquerdo */}
        <div className="relative w-36 sm:w-52 h-24 sm:h-32 shrink-0 pointer-events-none opacity-85 hover:opacity-100 transition-opacity">
          <Image
            src="/assets/telebooks/books-footer.jpg"
            alt="Livros clássicos empilhados"
            fill
            sizes="(max-width: 768px) 150px, 220px"
            className="object-cover object-bottom rounded-tr-3xl"
          />
          {/* Máscara de fusão suave com o fundo */}
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#030817]/20 to-[#030817]" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#030817]/30 to-[#030817]" />
        </div>

        {/* Frase poética manuscrita no canto inferior direito */}
        <div className="text-right pb-2 pr-1 sm:pr-3 max-w-[200px] sm:max-w-[240px]">
          <p className="font-handwriting text-base sm:text-lg text-[#7186AB] leading-tight">
            Grandes histórias
            <br />
            começam com
            <br />
            um bom livro. ♡
          </p>
        </div>
      </footer>
    </div>
  );
}
