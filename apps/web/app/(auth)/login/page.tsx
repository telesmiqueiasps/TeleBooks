"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, LogIn, AlertCircle } from "lucide-react";
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
import { useAuth } from "../../../components/auth/auth-provider";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setIsLoading(true);
    const result = await signIn(email, password);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      router.push(redirectTo);
    }
  };

  return (
    <Card className="border-[#e5e0d8] dark:border-[#272b35] shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Acessar sua biblioteca</CardTitle>
        <CardDescription>
          Entre com suas credenciais para continuar gerenciando suas leituras.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Endereço de E-mail"
            type="email"
            placeholder="seu.email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-[#4b5563] dark:text-[#a0a8b4]">
                Sua Senha
              </label>
              <Link
                href="/recuperar-senha"
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            isLoading={isLoading}
            leftIcon={<LogIn className="h-4 w-4" />}
          >
            Entrar no TeleBooks
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#eeeae2] dark:border-[#252a35] text-center">
          <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
                Ainda não tem uma conta?{" "}
            <Link
              href="/cadastro"
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Cadastre-se gratuitamente
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
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
            “Minha biblioteca, do meu jeito.”
          </p>
        </div>

        {/* Suspense wrapper for useSearchParams */}
        <Suspense
          fallback={
            <Card className="p-8 space-y-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </Card>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
