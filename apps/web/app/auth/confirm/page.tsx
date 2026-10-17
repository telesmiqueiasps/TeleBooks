"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";

function AuthConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const next = searchParams.get("next") || "/";

    if (!code) {
      router.replace("/login");
      return;
    }

    const supabase = createClient();

    let isSubscribed = true;

    async function handleClientExchange() {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!isSubscribed) return;

        if (error) {
          console.error("[Client Auth Exchange Error]:", error);
          setErrorMessage(
            "Não foi possível concluir o login com o Google. Por favor, tente novamente."
          );
          setTimeout(() => {
            router.replace(
              `/login?error=${encodeURIComponent(
                "A sessão expirou ou foi cancelada. Por favor, tente entrar novamente."
              )}`
            );
          }, 1500);
        } else {
          router.replace(next);
          router.refresh();
        }
      } catch (err: any) {
        console.error("[Client Auth Exchange Exception]:", err);
        if (!isSubscribed) return;
        setErrorMessage("Erro ao validar sessão. Redirecionando...");
        setTimeout(() => {
          router.replace(
            `/login?error=${encodeURIComponent(
              "Erro de autenticação com o provedor. Tente novamente."
            )}`
          );
        }, 1500);
      }
    }

    handleClientExchange();

    return () => {
      isSubscribed = false;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#EDF3FA] dark:bg-[#060B14] p-4 text-center">
      <div className="p-8 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full space-y-4">
        {errorMessage ? (
          <>
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-xs">
              <AlertCircle className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Aviso de Autenticação
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {errorMessage}
            </p>
          </>
        ) : (
          <>
            <Loader2 className="w-9 h-9 animate-spin text-[#007BFF] mx-auto" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Concluindo login...
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Sincronizando suas credenciais do Google de forma segura.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#EDF3FA] dark:bg-[#060B14]">
          <Loader2 className="w-8 h-8 animate-spin text-[#007BFF]" />
        </div>
      }
    >
      <AuthConfirmContent />
    </Suspense>
  );
}
