"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, AlertCircle, CheckCircle2, Loader2, Check, X } from "lucide-react";
import { Logo } from "../../../components/ui/logo";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@telebooks/ui";
import { registerSchema } from "@telebooks/validation";
import { useAuth } from "../../../components/auth/auth-provider";
import { api } from "../../../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
  const [usernameFeedback, setUsernameFeedback] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
          setUsernameFeedback(res.reason || `@${clean} já está em uso por outro leitor.`);
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
      setError(usernameFeedback || "O nome de usuário já está em uso por outro leitor.");
      return;
    }

    // Validação com Zod do pacote @telebooks/validation
    const validationResult = registerSchema.safeParse({
      email,
      password,
      username: username.replace(/^@/, ""),
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]?.message || "Dados inválidos.";
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
      // Dispara o e-mail de boas-vindas editorial em segundo plano
      api.sendWelcomeEmail().catch(() => {});
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-[#f8fafc] dark:bg-[#0B0F1A]">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <Link href="/" className="inline-flex items-center justify-center transition-transform hover:scale-[1.02]">
            <Logo size="lg" showSlogan priority />
          </Link>
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] font-sans">
            Grandes histórias começam com um bom livro.
          </p>
        </div>

        {/* Card de Cadastro */}
        <Card className="border-[#E2E8F0] dark:border-[#1E293B] shadow-xl bg-white dark:bg-[#0F172A]">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Criar nova conta</CardTitle>
            <CardDescription>
              Comece a catalogar e acompanhar suas leituras do seu jeito.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {successNotice ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs leading-relaxed">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  <span>{successNotice}</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/login")}
                >
                  Ir para o Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {error && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <Input
                  label="Nome Completo"
                  placeholder="Ex: Machado de Assis"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />

                <div>
                  <Input
                    label="Nome de Usuário (@username) *"
                    placeholder="ex: machadodeassis"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                  <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                    {usernameStatus === "checking" && (
                      <span className="text-neutral-500 flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
                        Verificando disponibilidade...
                      </span>
                    )}
                    {usernameStatus === "available" && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        {usernameFeedback}
                      </span>
                    )}
                    {usernameStatus === "unavailable" && (
                      <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                        <X className="h-3 w-3" />
                        {usernameFeedback}
                      </span>
                    )}
                    {usernameStatus === "idle" && (
                      <span className="text-neutral-400">
                        Apenas letras, números e sublinhados (mín. 3 caracteres).
                      </span>
                    )}
                  </div>
                </div>

                <Input
                  label="Endereço de E-mail *"
                  type="email"
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />

                <Input
                  label="Senha *"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />

                <Input
                  label="Confirmar Senha *"
                  type="password"
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-3"
                  isLoading={isLoading}
                  leftIcon={<UserPlus className="h-4 w-4" />}
                >
                  Criar Conta
                </Button>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-[#eeeae2] dark:border-[#252a35] text-center">
              <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
                Já possui uma conta?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Fazer login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
