"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@telebooks/ui";
import { registerSchema } from "@telebooks/validation";
import { useAuth } from "../../../components/auth/auth-provider";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    if (password !== confirmPassword) {
      setError("As senhas não coincidem. Digite a mesma senha nos dois campos.");
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
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-[#faf8f5] dark:bg-[#111317]">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="font-serif text-2xl font-bold tracking-tight text-[#141618] dark:text-[#f3f4f6]">
              TeleBooks
            </span>
          </Link>
          <p className="text-xs text-[#6b7280] dark:text-[#9ca3af] font-serif italic">
            Crie sua conta e organize sua biblioteca pessoal
          </p>
        </div>

        {/* Card de Cadastro */}
        <Card className="border-[#e5e0d8] dark:border-[#272b35] shadow-lg">
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

                <Input
                  label="Nome de Usuário (@username) *"
                  placeholder="ex: machadodeassis"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  helperText="Apenas letras, números e sublinhados (mín. 3 caracteres)."
                />

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
