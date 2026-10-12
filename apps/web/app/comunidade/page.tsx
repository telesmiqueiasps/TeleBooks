"use client";

import React from "react";
import Link from "next/link";
import { Users, BookOpen, MessageSquare, Sparkles, Heart, Star, Library, Compass } from "lucide-react";
import { Button, Card, CardContent, Badge } from "@telebooks/ui";
import { AppShell } from "../../components/shell/app-shell";

export default function ComunidadePage() {
  return (
    <AppShell currentTab="community">
      <div className="space-y-6 sm:space-y-8 select-none">
        {/* Cabeçalho Editorial */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center shadow-md shadow-[#007BFF]/20">
                <Users className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Comunidade TeleBooks
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans">
              Descubra novos títulos, compartilhe impressões e conecte-se com outros apaixonados por livros.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/minha-biblioteca">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs px-3.5"
                leftIcon={<Library className="w-4 h-4 text-[#007BFF]" />}
              >
                Minha Biblioteca
              </Button>
            </Link>
          </div>
        </div>

        {/* Banner de Destaque da Comunidade */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#006CEB] via-[#007BFF] to-[#0057C2] text-white p-6 sm:p-8 shadow-xl shadow-[#007BFF]/15">
          <div className="relative z-10 max-w-xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Espaço Coletivo Literário</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Acompanhe leituras em tempo real e troque ideias
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-sans">
              Explore o feed coletivo, veja as últimas resenhas e encontre inspiração para a sua próxima leitura na estante.
            </p>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 rounded-l-full blur-2xl pointer-events-none" />
        </div>

        {/* Feed de Atividades Recentes da Comunidade */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#007BFF]" />
            <span>Atividades Recentes dos Leitores</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card Exemplo 1 */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs">
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#007BFF] dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                      CL
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Clube do Livro</p>
                      <p className="text-[11px] text-slate-500">leu 45 páginas de O Alquimista</p>
                    </div>
                  </div>
                  <Badge variant="reading" size="sm" dot>Lendo</Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  &ldquo;Uma narrativa envolvente sobre seguir sua lenda pessoal. Ritmo excelente hoje!&rdquo;
                </p>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span className="text-[11px]">Hoje às 18:30</span>
                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-1 hover:text-rose-500 transition-colors">
                      <Heart className="w-3.5 h-3.5" />
                      <span>12</span>
                    </button>
                    <button className="flex items-center gap-1 hover:text-[#007BFF] transition-colors">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>3</span>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card Exemplo 2 */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs">
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                      MS
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Marina Santos</p>
                      <p className="text-[11px] text-slate-500">concluiu a leitura de 1984</p>
                    </div>
                  </div>
                  <Badge variant="read" size="sm" dot>Lido</Badge>
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">5.0</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span className="text-[11px]">Ontem às 21:15</span>
                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-1 hover:text-rose-500 transition-colors">
                      <Heart className="w-3.5 h-3.5" />
                      <span>28</span>
                    </button>
                    <button className="flex items-center gap-1 hover:text-[#007BFF] transition-colors">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>7</span>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
