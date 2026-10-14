"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  Sparkles,
  Library,
  Home,
  MessageSquare,
  BookOpen,
  Trophy,
  Compass,
  ArrowRight,
  Hammer,
  CheckCircle2,
  Heart,
  Send,
} from "lucide-react";
import { Button, Card, CardContent, Badge } from "@telebooks/ui";
import { AppShell } from "../../components/shell/app-shell";

export default function ComunidadePage() {
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [suggestion, setSuggestion] = useState("");

  const handleSendSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim()) return;
    setFeedbackSent(true);
    setSuggestion("");
  };

  return (
    <AppShell currentTab="community">
      <div className="space-y-8 max-w-5xl mx-auto select-none py-2 sm:py-4">
        
        {/* Cabeçalho da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center shadow-lg shadow-[#007BFF]/25">
                <Users className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Comunidade TeleBooks
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-sans">
                  O ponto de encontro dos apaixonados por literatura e boas histórias.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/minha-biblioteca">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs px-4"
                leftIcon={<Library className="w-4 h-4 text-[#007BFF]" />}
              >
                Minha Biblioteca
              </Button>
            </Link>
            <Link href="/">
              <Button
                variant="primary"
                size="sm"
                className="rounded-full text-xs px-4 bg-gradient-to-r from-[#006CEB] to-[#007BFF]"
                leftIcon={<Home className="w-4 h-4" />}
              >
                Início
              </Button>
            </Link>
          </div>
        </div>

        {/* Banner Hero: Em Desenvolvimento */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#006CEB] via-[#007BFF] to-[#0057C2] text-white p-6 sm:p-10 shadow-xl shadow-[#007BFF]/20 border border-blue-400/30">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold border border-white/30 text-amber-200 shadow-xs">
              <Hammer className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
              <span>Espaço em Construção</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-white/90">Lançamento em Breve</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
              Estamos preparando uma nova experiência comunitária para leitores.
            </h2>

            <p className="text-sm sm:text-base text-blue-100/95 leading-relaxed font-sans max-w-xl">
              Em breve você poderá conectar sua estante com amigos, compartilhar impressões e resenhas, criar clubes de leitura e debater seus capítulos favoritos em tempo real.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link href="/minha-biblioteca">
                <Button
                  size="md"
                  className="rounded-full bg-white text-[#006CEB] hover:bg-blue-50 font-bold text-xs sm:text-sm px-6 shadow-md transition-all active:scale-95"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Continuar Lendo na Estante
                </Button>
              </Link>
              <span className="text-xs text-blue-100/80 font-medium px-2">
                Fase de desenvolvimento ativo • TeleBooks 2026
              </span>
            </div>
          </div>

          {/* Efeitos de Iluminação Decorativa */}
          <div className="absolute -right-12 -bottom-12 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-12 top-6 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Seção do que está por vir (Roadmap da Comunidade) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#007BFF]" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                O que você encontrará por aqui em breve
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              4 Recursos Principais
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Card 1: Clubes do Livro */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs hover:border-blue-400/50 transition-all group">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#007BFF] dark:text-blue-400 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                    <BookOpen className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <Badge variant="default" size="sm" className="bg-blue-50 dark:bg-blue-900/40 text-[#007BFF] dark:text-blue-300 border-none">
                    Planejado
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Clubes do Livro & Círculos de Leitura
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Crie grupos privados ou participe de rodas abertas para ler livros simultaneamente e debater cada capítulo com cronograma sincronizado.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Feed Social de Resenhas */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs hover:border-blue-400/50 transition-all group">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                    <MessageSquare className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <Badge variant="default" size="sm" className="bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 border-none">
                    Em Breve
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Feed Literário & Resenhas Públicas
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Descubra novas leituras baseadas nas impressões reais de outros leitores. Curta, comente e salve citações inspiradoras diretamente no seu perfil.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Metas e Desafios Coletivos */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs hover:border-blue-400/50 transition-all group">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                    <Trophy className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <Badge variant="default" size="sm" className="bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 border-none">
                    Em Design
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Metas & Maratonas Coletivas
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Desafie seus amigos em metas de páginas lidas, maratonas temáticas de fim de semana e acompanhe rankings amigáveis de constância literária.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Recomendações e Descobertas */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs hover:border-blue-400/50 transition-all group">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                    <Compass className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <Badge variant="default" size="sm" className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 border-none">
                    Ideação
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Descobertas por Afinidade
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Encontre leitores que amam os mesmos autores e gêneros que você. Explore estantes públicas para se inspirar na próxima grande leitura.
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Card de Sugestão e Participação Interativa */}
        <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 dark:from-[#0F172A] dark:via-[#0F172A] dark:to-blue-950/20 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-lg">
              <div className="flex items-center gap-2 text-[#007BFF] font-bold text-xs uppercase tracking-wider">
                <Heart className="w-4 h-4 fill-[#007BFF]" />
                <span>Construa conosco</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Qual funcionalidade você mais gostaria de ver na Comunidade?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                Envie sua ideia ou sugestão para a equipe do TeleBooks priorizar no lançamento.
              </p>
            </div>

            <div className="w-full md:w-auto md:min-w-[320px]">
              {feedbackSent ? (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>Obrigado! Sua sugestão foi registrada com sucesso.</span>
                </div>
              ) : (
                <form onSubmit={handleSendSuggestion} className="flex gap-2">
                  <input
                    type="text"
                    value={suggestion}
                    onChange={(e) => setSuggestion(e.target.value)}
                    placeholder="Ex: Leitura conjunta com chat..."
                    className="flex-1 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="rounded-full px-4 bg-[#007BFF] shrink-0"
                    rightIcon={<Send className="w-3.5 h-3.5" />}
                  >
                    Enviar
                  </Button>
                </form>
              )}
            </div>
          </div>
        </Card>

      </div>
    </AppShell>
  );
}
