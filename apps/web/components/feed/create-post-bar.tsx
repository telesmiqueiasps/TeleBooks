"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Edit3,
  Send,
  X,
  BookOpen,
  Search,
  AlertCircle,
  Loader2,
  Globe,
} from "lucide-react";
import { Button, cn } from "@telebooks/ui";
import type { FeedPost, Book, Profile } from "@telebooks/types";
import { api } from "../../lib/api";

export interface CreatePostBarProps {
  user: any;
  profile: Profile | null;
  onPostCreated: (post: FeedPost) => void;
  updateProfile?: (data: Partial<Profile>) => Promise<any>;
}

export function CreatePostBar({
  user,
  profile,
  onPostCreated,
  updateProfile,
}: CreatePostBarProps) {
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [content, setContent] = useState("");
  const [pageNumber, setPageNumber] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Busca de Livro no Editor
  const [isBookPickerOpen, setIsBookPickerOpen] = useState(false);
  const [bookSearchQuery, setBookSearchQuery] = useState("");
  const [bookSearchResults, setBookSearchResults] = useState<Book[]>([]);
  const [isSearchingBooks, setIsSearchingBooks] = useState(false);

  // Iniciais do Usuário
  const initials = (
    profile?.full_name ||
    profile?.username ||
    user?.user_metadata?.full_name ||
    user?.email ||
    "Leitor"
  )
    .substring(0, 2)
    .toUpperCase();

  const handleOpenEditor = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setIsModalOpen(true);
  };

  // Busca debounced de livros
  useEffect(() => {
    if (!bookSearchQuery.trim()) {
      setBookSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingBooks(true);
        const res = await api.getBooks({ q: bookSearchQuery.trim(), page_size: 5 });
        setBookSearchResults(res.items || []);
      } catch {
        setBookSearchResults([]);
      } finally {
        setIsSearchingBooks(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [bookSearchQuery]);

  // Submissão
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanContent = content.trim();
    if (!cleanContent) return;

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      setIsSubmitting(true);
      setPostError(null);

      // Se o perfil for privado, torna público para participar do feed
      if (profile && !profile.is_public && updateProfile) {
        await updateProfile({ is_public: true });
      }

      const newPost = await api.createFeedPost({
        content: cleanContent,
        book_id: selectedBook ? selectedBook.id : null,
        page_number: pageNumber ? parseInt(pageNumber, 10) : null,
      });

      onPostCreated(newPost);

      // Limpar e fechar
      setContent("");
      setPageNumber("");
      setSelectedBook(null);
      setIsBookPickerOpen(false);
      setIsModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao publicar no feed.";
      setPostError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* =========================================================================
          Barra Horizontal Compacta (Trigger)
          ========================================================================= */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs p-2 sm:p-2.5 flex items-center gap-2.5 sm:gap-3 transition-shadow hover:shadow-sm">
        {/* Avatar à esquerda */}
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-2xs">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        {/* Campo com fundo cinza-azulado muito claro e ícone de edição */}
        <button
          type="button"
          onClick={handleOpenEditor}
          className="flex-1 flex items-center gap-2.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full bg-[#F1F5F9] dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 hover:bg-[#E2E8F0] dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all cursor-pointer group text-left min-w-0 shadow-2xs"
        >
          <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#007BFF] group-hover:scale-110 transition-transform shrink-0" />
          <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate select-none font-normal">
            Iniciar uma publicação...
          </span>
        </button>

        {/* Botão circular azul de envio à direita */}
        <button
          type="button"
          onClick={handleOpenEditor}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#007BFF] hover:bg-[#006CEB] text-white flex items-center justify-center shrink-0 shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          title="Iniciar publicação"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </div>

      {/* =========================================================================
          Modal Completo de Criação de Publicação
          ========================================================================= */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#0F172A] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Editor */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {profile?.full_name || profile?.username || "Nova Publicação"}
                  </h3>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-[#007BFF]" />
                    <span>Publicação aberta no Feed da Comunidade</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo do Formulário */}
            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
              {/* Textarea */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Compartilhe uma citação marcante, frase ou reflexão sobre sua leitura..."
                rows={4}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:bg-white dark:focus:bg-[#0F172A] transition-all resize-none"
                autoFocus
              />

              {/* Livro Selecionado Badge */}
              {selectedBook && (
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {selectedBook.cover_url ? (
                      <img
                        src={selectedBook.cover_url}
                        alt=""
                        className="w-8 h-12 object-cover rounded-md shadow-xs shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-md flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-[#007BFF]" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {selectedBook.title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {selectedBook.author_name || "Autor desconhecido"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedBook(null)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Remover livro vinculado"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Seletor de Livros (Autocomplete) */}
              {isBookPickerOpen && !selectedBook && (
                <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 space-y-2.5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={bookSearchQuery}
                      onChange={(e) => setBookSearchQuery(e.target.value)}
                      placeholder="Digite o título do livro para pesquisar..."
                      className="w-full pl-9 pr-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                      autoFocus
                    />
                  </div>

                  {isSearchingBooks && (
                    <p className="text-xs text-slate-500 text-center py-2">Buscando no acervo...</p>
                  )}

                  {bookSearchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {bookSearchResults.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setSelectedBook(b);
                            setIsBookPickerOpen(false);
                            setBookSearchQuery("");
                          }}
                          className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                        >
                          <div className="w-7 h-10 bg-blue-100 dark:bg-blue-900/50 rounded overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                            {b.cover_url ? (
                              <img src={b.cover_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <BookOpen className="w-3.5 h-3.5 text-[#007BFF]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{b.title}</p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {b.author_name || (b.authors && b.authors.length > 0 ? b.authors.map((a: any) => a.name).join(", ") : "Autor desconhecido")}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Barra de Ferramentas / Vincular Livro e Página */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBookPickerOpen(!isBookPickerOpen)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer",
                      selectedBook || isBookPickerOpen
                        ? "bg-blue-50 text-[#007BFF] border-blue-200 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-300"
                        : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200"
                    )}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{selectedBook ? "Trocar Livro" : "Vincular Livro"}</span>
                  </button>

                  <input
                    type="number"
                    min="1"
                    value={pageNumber}
                    onChange={(e) => setPageNumber(e.target.value)}
                    placeholder="Pág. nº (opc)"
                    className="w-24 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                    title="Número da página da citação (opcional)"
                  />
                </div>

                {/* Botões do Modal */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs px-4"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSubmitting || !content.trim()}
                    className="rounded-full bg-[#007BFF] hover:bg-[#006CEB] text-white px-5 text-xs font-bold shadow-xs disabled:opacity-50"
                    leftIcon={
                      isSubmitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )
                    }
                  >
                    {isSubmitting ? "Publicando..." : "Publicar"}
                  </Button>
                </div>
              </div>

              {postError && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{postError}</span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
