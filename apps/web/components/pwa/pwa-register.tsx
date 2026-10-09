"use client";

import React, { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw, X } from "lucide-react";

export function PwaRegister() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showOnlineToast, setShowOnlineToast] = useState<boolean>(false);
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // 1. Status inicial de conexão
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineToast(true);
      const timer = setTimeout(() => {
        setShowOnlineToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOnlineToast(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 2. Registro do Service Worker
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((registration) => {
            // Verifica se há atualização pendente
            if (registration.waiting) {
              setWaitingWorker(registration.waiting);
              setHasUpdate(true);
            }

            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (
                    newWorker.state === "installed" &&
                    navigator.serviceWorker.controller
                  ) {
                    setWaitingWorker(newWorker);
                    setHasUpdate(true);
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.warn("TeleBooks: Falha ao registrar Service Worker:", error);
          });

        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
    setHasUpdate(false);
  };

  return (
    <>
      {/* Toast de Perda de Conexão */}
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
        >
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/95 dark:bg-amber-600/95 backdrop-blur-md text-amber-950 dark:text-white shadow-lg shadow-amber-500/20 border border-amber-300 dark:border-amber-500/40">
            <div className="p-1.5 rounded-xl bg-amber-600/20 dark:bg-amber-700/30 shrink-0">
              <WifiOff className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold leading-tight">Você está offline</p>
              <p className="text-[11px] opacity-90 leading-tight mt-0.5">
                Exibindo páginas salvas no cache do seu TeleBooks.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Reconexão */}
      {showOnlineToast && isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-emerald-500/95 dark:bg-emerald-600/95 backdrop-blur-md text-emerald-950 dark:text-white shadow-lg shadow-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-xl bg-emerald-600/20 dark:bg-emerald-700/30 shrink-0">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">Conexão restabelecida!</p>
                <p className="text-[11px] opacity-90 leading-tight mt-0.5">
                  Sincronizando seus livros e progresso...
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowOnlineToast(false)}
              className="p-1 rounded-lg hover:bg-emerald-600/20 transition-colors"
              aria-label="Fechar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Notificação de Nova Versão Disponível */}
      {hasUpdate && (
        <div
          role="status"
          className="fixed bottom-20 md:bottom-6 right-4 z-50 max-w-sm w-[90%] sm:w-auto animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#0F172A] text-white border border-slate-700 shadow-2xl">
            <div className="p-2 rounded-xl bg-[#007BFF]/20 text-[#007BFF] shrink-0">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold">Atualização do TeleBooks</p>
              <p className="text-[11px] text-slate-400">Uma nova versão está pronta.</p>
            </div>
            <button
              type="button"
              onClick={handleUpdate}
              className="px-3 py-1.5 rounded-xl bg-[#007BFF] hover:bg-[#006CEB] text-white text-xs font-bold transition-all shadow-md active:scale-95 shrink-0"
            >
              Atualizar
            </button>
            <button
              type="button"
              onClick={() => setHasUpdate(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
              aria-label="Dispensar atualização"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
