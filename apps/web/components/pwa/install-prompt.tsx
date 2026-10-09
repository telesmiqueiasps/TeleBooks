"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Download, Share2, PlusSquare, X, Smartphone, Sparkles, Check } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(true); // Começa true até verificar
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(true); // Começa true até verificar

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Verifica se já está em modo PWA standalone
    const standaloneMedia = window.matchMedia("(display-mode: standalone)");
    const isRunningStandalone =
      standaloneMedia.matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsStandalone(isRunningStandalone);
    if (isRunningStandalone) return;

    // 2. Verifica se o usuário dispensou recentemente (cooldown de 7 dias)
    const dismissedTime = localStorage.getItem("telebooks-pwa-dismissed");
    if (dismissedTime) {
      const parsed = parseInt(dismissedTime, 10);
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - parsed < sevenDaysMs) {
        setIsDismissed(true);
        return;
      }
    }
    setIsDismissed(false);

    // 3. Detecção de iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari =
      /safari/.test(userAgent) &&
      !/crios|fxios|optios|chrome|chromium|edgios/.test(userAgent);

    if (isAppleDevice && isSafari && !isRunningStandalone) {
      setIsIOS(true);
    }

    // 4. Captura do evento beforeinstallprompt (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("telebooks-pwa-dismissed", Date.now().toString());
    }
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
        setIsDismissed(true);
      }
    } catch (err) {
      console.warn("TeleBooks: Instalação PWA cancelada ou indisponível", err);
    }
  };

  // Se já for standalone, ou dispensado, ou não houver prompt nem for iOS, não exibe
  if (isStandalone || isDismissed || (!deferredPrompt && !isIOS)) {
    return null;
  }

  return (
    <>
      {/* Banner Flutuante de Instalação */}
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-lg animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
        <div className="flex items-center gap-3 p-3.5 sm:p-4 rounded-3xl bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 shadow-[0_12px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
          {/* Ícone TeleBooks */}
          <div className="relative w-11 h-11 rounded-2xl overflow-hidden shrink-0 shadow-md border border-blue-500/20 bg-[#007BFF] flex items-center justify-center text-white">
            <Smartphone className="w-5 h-5 stroke-[2.2]" />
          </div>

          {/* Texto de Apelo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                Instale o App TeleBooks
              </p>
              <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-blue-100 text-[#007BFF] dark:bg-blue-950/60 dark:text-blue-300">
                <Sparkles className="w-2.5 h-2.5" /> PWA
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5 truncate">
              Acesso rápido na tela de início e leitura offline
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-[#006CEB] to-[#007BFF] hover:from-[#0057C2] hover:to-[#006CEB] text-white text-xs font-bold transition-all shadow-md shadow-[#007BFF]/25 active:scale-95 min-h-[40px]"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Instalar</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Dispensar aviso de instalação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Guiado para iOS Safari */}
      {showIOSModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm rounded-[32px] bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#007BFF] text-white flex items-center justify-center shadow-md">
                  <Smartphone className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Instalar no iPhone / iPad</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Siga os passos no navegador Safari
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
                aria-label="Fechar guia de instalação"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 py-5">
              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-[#007BFF] dark:bg-blue-950/60 dark:text-blue-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="text-xs font-semibold">Toque no botão Compartilhar</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Geralmente localizado na barra inferior do Safari (ícone de quadrado com seta para cima).
                  </p>
                  <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    <Share2 className="w-3.5 h-3.5 text-[#007BFF]" />
                    <span>Compartilhar</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-[#007BFF] dark:bg-blue-950/60 dark:text-blue-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="text-xs font-semibold">Selecione Adicionar à Tela de Início</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Role a folha de opções até encontrar a opção indicada.
                  </p>
                  <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    <PlusSquare className="w-3.5 h-3.5 text-[#007BFF]" />
                    <span>Adicionar à Tela de Início</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold">Pronto!</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    O ícone do TeleBooks será adicionado à sua tela inicial como um app nativo.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowIOSModal(false);
                handleDismiss();
              }}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-[#006CEB] to-[#007BFF] text-white text-xs font-bold transition-all shadow-md shadow-[#007BFF]/25 active:scale-95"
            >
              Entendi, obrigado!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
