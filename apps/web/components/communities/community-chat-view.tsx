"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Users,
  ShieldCheck,
  Lock,
  Globe,
  Megaphone,
  BookOpen,
  BarChart2,
  Heart,
  Send,
  Loader2,
  X,
  Menu,
  CheckCircle2,
} from "lucide-react";
import { Button, Badge, cn } from "@telebooks/ui";
import type {
  Community,
  CommunityMessage,
  CommunityPoll,
  Book,
} from "@telebooks/types";
import { api } from "../../lib/api";
import { CreatePollModal } from "./create-poll-modal";
import { LinkBookModal } from "./link-book-modal";
import { CommunityMembersModal } from "./community-members-modal";

interface CommunityChatViewProps {
  community: Community;
  currentUserId: string;
  onBack: () => void;
  onCommunityUpdated?: (updated: Community) => void;
  onLeaveCommunity?: () => void;
}

export function CommunityChatView({
  community: initialCommunity,
  currentUserId,
  onBack,
  onCommunityUpdated,
  onLeaveCommunity,
}: CommunityChatViewProps) {
  const [community, setCommunity] = useState<Community>(initialCommunity);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Anexos da nova mensagem
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [pollDraft, setPollDraft] = useState<{
    question: string;
    options: string[];
  } | null>(null);

  // Modais
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);

  // Estado para rolagem
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialScrollDone = useRef(false);

  // Ref estável para onCommunityUpdated para evitar loops de render
  const onCommunityUpdatedRef = useRef(onCommunityUpdated);
  useEffect(() => {
    onCommunityUpdatedRef.current = onCommunityUpdated;
  }, [onCommunityUpdated]);

  const isOwner = community.my_role === "owner";
  const isAdmin = community.my_role === "admin" || isOwner;
  const canPost = !community.only_admins_can_post || isAdmin;

  // Carregar mensagens (com modo silencioso para não piscar a tela)
  const loadMessages = useCallback(
    async (isInitial = false) => {
      if (isInitial) {
        setIsLoadingMessages(true);
      }
      try {
        if (isInitial) {
          const [commData, msgsData] = await Promise.all([
            api.getCommunity(initialCommunity.id),
            api.getCommunityMessages(initialCommunity.id, { page: 1, page_size: 60 }),
          ]);
          setCommunity(commData);
          setMessages(msgsData.items || []);
        } else {
          // Polling periódico silencioso: apenas busca mensagens novas para não resetar o estado de edição da comunidade
          const msgsData = await api.getCommunityMessages(initialCommunity.id, { page: 1, page_size: 60 });
          setMessages(msgsData.items || []);
        }
      } catch (err) {
        console.error("TeleBooks Comunidade: Erro ao carregar mensagens:", err);
      } finally {
        if (isInitial) {
          setIsLoadingMessages(false);
        }
      }
    },
    [initialCommunity.id]
  );

  // Efeito de montagem e polling silencioso a cada 6 segundos
  useEffect(() => {
    let isMounted = true;
    isInitialScrollDone.current = false;
    loadMessages(true);

    const interval = setInterval(() => {
      if (isMounted) {
        loadMessages(false);
      }
    }, 6000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [loadMessages]);

  useEffect(() => {
    // Rolagem suave no primeiro carregamento de mensagens
    if (!isLoadingMessages && messages.length > 0 && !isInitialScrollDone.current) {
      isInitialScrollDone.current = true;
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isLoadingMessages, messages.length]);

  // Enviar Mensagem
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanContent = inputText.trim();
    if (!cleanContent) return;
    if (!canPost) return;

    try {
      setIsSubmitting(true);
      const newMsg = await api.createCommunityMessage(community.id, {
        content: cleanContent,
        book_id: selectedBook ? selectedBook.id : undefined,
        poll_question: pollDraft ? pollDraft.question : undefined,
        poll_options: pollDraft ? pollDraft.options : undefined,
      });

      setMessages((prev) => [...prev, newMsg]);
      setInputText("");
      setSelectedBook(null);
      setPollDraft(null);

      // Rolagem imediata
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } catch (err: any) {
      alert(err?.message || "Erro ao enviar mensagem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Curtir Mensagem (com atualização otimista)
  const handleToggleLike = async (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          const nextHasLiked = !msg.has_liked;
          return {
            ...msg,
            has_liked: nextHasLiked,
            likes_count: nextHasLiked
              ? msg.likes_count + 1
              : Math.max(0, msg.likes_count - 1),
          };
        }
        return msg;
      })
    );

    try {
      await api.likeCommunityMessage(messageId);
    } catch {
      // Reverter se falhar
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            const rollbackLiked = !msg.has_liked;
            return {
              ...msg,
              has_liked: rollbackLiked,
              likes_count: rollbackLiked
                ? msg.likes_count + 1
                : Math.max(0, msg.likes_count - 1),
            };
          }
          return msg;
        })
      );
    }
  };

  // Votar em Enquete
  const handleVotePoll = async (pollId: string, optionId: string) => {
    try {
      const updatedPoll = await api.voteCommunityPoll(pollId, optionId);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.poll && msg.poll.id === pollId
            ? { ...msg, poll: updatedPoll }
            : msg
        )
      );
    } catch (err: any) {
      alert(err?.message || "Não foi possível registrar o voto.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 h-[100dvh] w-full flex flex-col bg-white dark:bg-[#0F172A] sm:static sm:inset-auto sm:z-auto sm:h-[calc(100vh-140px)] sm:max-w-4xl sm:mx-auto sm:rounded-3xl sm:border sm:border-slate-200/80 sm:dark:border-slate-800 sm:shadow-md overflow-hidden animate-in fade-in duration-200">
      {/* =========================================================================
          1. Cabeçalho do Chat
          - No Mobile: Ocupa toda a largura, apenas seta à esquerda, título/avatar central e 3 tracinhos à direita
          ========================================================================= */}
      <div className="px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Seta no canto superior esquerdo para sair/voltar */}
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Voltar para a lista de comunidades"
          >
            <ArrowLeft className="w-5 h-5 sm:w-5 sm:h-5" />
          </button>

          {/* Avatar da Comunidade */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs shrink-0 overflow-hidden">
            {community.avatar_url ? (
              <img
                src={community.avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </div>

          {/* Título & Badges da Comunidade */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="font-display text-xs sm:text-base font-extrabold text-slate-900 dark:text-white truncate max-w-[170px] sm:max-w-[340px]">
                {community.name}
              </h2>
              {community.is_private ? (
                <Badge
                  variant="outline"
                  size="sm"
                  className="bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 text-[9px] py-0 px-1 font-bold"
                >
                  <Lock className="w-2.5 h-2.5 mr-0.5 text-amber-600" />
                  Privada
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  size="sm"
                  className="bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 text-[9px] py-0 px-1 font-bold"
                >
                  <Globe className="w-2.5 h-2.5 mr-0.5 text-emerald-600" />
                  Pública
                </Badge>
              )}
            </div>

            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
              <span>
                {community.members_count}{" "}
                {community.members_count === 1 ? "membro" : "membros"}
              </span>
              {community.only_admins_can_post && (
                <>
                  <span>•</span>
                  <span className="text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-0.5">
                    <Megaphone className="w-2.5 h-2.5" />
                    Mural Admins
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Botão de 3 Tracinhos (Apenas 3 tracinhos para Ajustes & Membros) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsMenuModalOpen(true)}
            className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Ajustes e Membros da Comunidade"
            aria-label="Ajustes da comunidade"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. Feed de Mensagens (Estreitado verticalmente para exibir mais mensagens na tela)
          ========================================================================= */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-1 sm:space-y-1.5 bg-slate-50/40 dark:bg-slate-900/10">
        {isLoadingMessages ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-[#007BFF] mb-2" />
            <span>Carregando mensagens da comunidade...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#007BFF] flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              Nenhuma mensagem ainda
            </h4>
            <p className="text-xs max-w-xs leading-relaxed">
              {canPost
                ? "Seja o primeiro a enviar uma mensagem, vincular um livro ou criar uma enquete!"
                : "Aguarde os administradores publicarem avisos e enquetes neste grupo."}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === currentUserId;
            const authorInitials = (
              msg.author?.full_name ||
              msg.author?.username ||
              "L"
            )
              .substring(0, 2)
              .toUpperCase();

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex items-start gap-1.5 sm:gap-2 max-w-[92%] sm:max-w-[78%]",
                  isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                {/* Avatar do Autor Compacto */}
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center font-bold text-[9px] sm:text-[10px] shrink-0 overflow-hidden shadow-2xs mt-0.5">
                  {msg.author?.avatar_url ? (
                    <img
                      src={msg.author.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{authorInitials}</span>
                  )}
                </div>

                {/* Balão da Mensagem Estreitado Verticalmente */}
                <div
                  className={cn(
                    "rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 space-y-1 shadow-2xs border text-left",
                    isMe
                      ? "bg-[#007BFF] text-white border-blue-600 rounded-tr-xs"
                      : "bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white border-slate-200/80 dark:border-slate-800 rounded-tl-xs"
                  )}
                >
                  {/* Cabeçalho do balão: Autor, Hora e Botão de Curtir tudo em uma linha compacta */}
                  <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] leading-tight font-medium">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold truncate max-w-[130px] sm:max-w-[200px]">
                        {msg.author?.full_name || `@${msg.author?.username}`}
                      </span>
                      <span className="opacity-40 text-[9px]">•</span>
                      <span className="opacity-75 text-[9px] sm:text-[10px] whitespace-nowrap">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Botão de curtir ultra-compacto integrado no topo */}
                    <button
                      type="button"
                      onClick={() => handleToggleLike(msg.id)}
                      className={cn(
                        "flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full transition-colors cursor-pointer shrink-0",
                        msg.has_liked
                          ? isMe
                            ? "bg-white/20 text-rose-300 font-bold"
                            : "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-bold"
                          : isMe
                          ? "text-blue-100 hover:bg-white/10"
                          : "text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                      title={msg.has_liked ? "Descurtir" : "Curtir"}
                    >
                      <Heart
                        className={cn(
                          "w-3 h-3",
                          msg.has_liked ? "fill-current text-rose-500" : ""
                        )}
                      />
                      {msg.likes_count > 0 && <span>{msg.likes_count}</span>}
                    </button>
                  </div>

                  {/* Conteúdo textual da Mensagem */}
                  <div className="text-xs sm:text-[13px] leading-snug whitespace-pre-wrap break-words font-sans">
                    {msg.content}
                  </div>

                  {/* Cartão de Livro Vinculado Compacto (se houver) */}
                  {msg.book && (
                    <div
                      className={cn(
                        "rounded-lg p-1.5 sm:p-2 flex items-center gap-2 border transition-colors",
                        isMe
                          ? "bg-white/10 border-white/20 text-white"
                          : "bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white"
                      )}
                    >
                      {/* Capa do Livro compacta */}
                      <div className="w-7 h-10 rounded overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 shadow-2xs flex items-center justify-center">
                        {msg.book.cover_url ? (
                          <img
                            src={msg.book.cover_url}
                            alt={msg.book.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BookOpen className="w-3.5 h-3.5 opacity-40" />
                        )}
                      </div>

                      <div className="min-w-0 pr-1 leading-tight">
                        <div className="flex items-center gap-1 text-[9px] font-bold opacity-75 uppercase tracking-wider">
                          <BookOpen className="w-2.5 h-2.5" />
                          <span>Livro</span>
                        </div>
                        <h5 className="text-[11px] sm:text-xs font-bold truncate">
                          {msg.book.title}
                        </h5>
                        <p
                          className={cn(
                            "text-[10px] truncate mt-0.5",
                            isMe ? "text-blue-100" : "text-slate-500 dark:text-slate-400"
                          )}
                        >
                          {msg.book.author_name || "Autor"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Enquete Interativa Compacta (se houver) */}
                  {msg.poll && (
                    <div
                      className={cn(
                        "rounded-lg p-2 sm:p-2.5 space-y-1 border",
                        isMe
                          ? "bg-white/15 border-white/25 text-white"
                          : "bg-purple-50/40 dark:bg-purple-950/30 border-purple-200/80 dark:border-purple-900/60 text-slate-900 dark:text-white"
                      )}
                    >
                      <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <BarChart2 className="w-3 h-3 text-purple-400 shrink-0" />
                          <span className="truncate">{msg.poll.question}</span>
                        </div>
                        <span className="text-[9px] font-normal opacity-80 shrink-0">
                          {msg.poll.total_votes}{" "}
                          {msg.poll.total_votes === 1 ? "voto" : "votos"}
                        </span>
                      </div>

                      {/* Opções da Enquete Compactas */}
                      <div className="space-y-1 pt-0.5">
                        {msg.poll.options.map((opt) => {
                          const hasVotedThis =
                            msg.poll?.user_voted_option_id === opt.id;

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleVotePoll(msg.poll!.id, opt.id)}
                              className={cn(
                                "w-full text-left py-1 px-2 rounded-md border text-[10px] sm:text-[11px] relative overflow-hidden transition-all group cursor-pointer",
                                isMe
                                  ? hasVotedThis
                                    ? "border-white bg-white/30 font-bold"
                                    : "border-white/20 bg-white/10 hover:bg-white/20"
                                  : hasVotedThis
                                  ? "border-purple-500 bg-purple-100/60 dark:bg-purple-900/40 font-bold"
                                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-300"
                              )}
                            >
                              {/* Barra de Progresso de Fundo */}
                              <div
                                className={cn(
                                  "absolute left-0 top-0 bottom-0 opacity-20 transition-all duration-500 pointer-events-none",
                                  isMe ? "bg-white" : "bg-purple-600"
                                )}
                                style={{ width: `${opt.percentage}%` }}
                              />

                              <div className="relative z-10 flex items-center justify-between gap-1.5">
                                <span className="truncate flex items-center gap-1">
                                  {hasVotedThis && (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                  )}
                                  <span>{opt.option_text}</span>
                                </span>
                                <span className="text-[9px] font-semibold opacity-90 shrink-0">
                                  {opt.percentage.toFixed(0)}% ({opt.votes_count})
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* =========================================================================
          3. Barra de Envio / Compositor Compacto
          ========================================================================= */}
      <div className="p-2 sm:p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0F172A] shrink-0">
        {!canPost ? (
          /* Aviso de comunidade restrita a administradores */
          <div className="p-2 sm:p-2.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 rounded-xl flex items-center gap-2 text-purple-700 dark:text-purple-300 text-[11px] sm:text-xs">
            <Megaphone className="w-3.5 h-3.5 shrink-0 text-purple-600" />
            <span className="leading-snug">
              Nesta comunidade, apenas os administradores publicam mensagens. Você pode curtir e votar nas enquetes!
            </span>
          </div>
        ) : (
          /* Formulário de Envio Compacto */
          <form onSubmit={handleSendMessage} className="space-y-1.5">
            {/* Chips de Anexos Prévios (Livro ou Enquete) */}
            {(selectedBook || pollDraft) && (
              <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
                {selectedBook && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[#007BFF] text-[11px] font-semibold">
                    <BookOpen className="w-3 h-3" />
                    <span className="truncate max-w-[150px]">
                      {selectedBook.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedBook(null)}
                      className="ml-0.5 hover:text-rose-500 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {pollDraft && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-300 text-[11px] font-semibold">
                    <BarChart2 className="w-3 h-3" />
                    <span className="truncate max-w-[150px]">
                      Enquete: {pollDraft.question}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPollDraft(null)}
                      className="ml-0.5 hover:text-rose-500 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Campo de Texto e Botão de Envio */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escreva uma mensagem..."
                maxLength={3000}
                disabled={isSubmitting}
                className="flex-1 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs sm:text-sm text-slate-900 dark:text-white px-3.5 py-2 sm:py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
              />

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || !inputText.trim()}
                className="rounded-full w-9 h-9 sm:w-10 sm:h-10 p-0 shrink-0 bg-gradient-to-tr from-[#006CEB] to-[#007BFF] shadow-xs active:scale-95 flex items-center justify-center"
                title="Enviar mensagem"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Ações de Anexo Compactas: Vincular Livro & Criar Enquete */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsBookModalOpen(true)}
                className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-[#007BFF] hover:border-blue-300 transition-colors cursor-pointer"
              >
                <BookOpen className="w-3 h-3 text-[#007BFF]" />
                <span>Vincular Livro</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPollModalOpen(true)}
                className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-purple-600 hover:border-purple-300 transition-colors cursor-pointer"
              >
                <BarChart2 className="w-3 h-3 text-purple-600" />
                <span>Criar Enquete</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* =========================================================================
          4. Modais Integrados
          ========================================================================= */}
      {/* Modal de Criação de Enquete */}
      <CreatePollModal
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        onConfirm={(question, options) => {
          setPollDraft({ question, options });
        }}
        initialQuestion={pollDraft?.question}
        initialOptions={pollDraft?.options}
      />

      {/* Modal de Seleção de Livro */}
      <LinkBookModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onSelectBook={(book) => {
          setSelectedBook(book);
        }}
        selectedBookId={selectedBook?.id}
      />

      {/* Modal de Ajustes, Membros & Moderação (3 Tracinhos) */}
      <CommunityMembersModal
        isOpen={isMenuModalOpen}
        onClose={() => setIsMenuModalOpen(false)}
        community={community}
        currentUserId={currentUserId}
        onMemberChanged={() => loadMessages(false)}
        onCommunityUpdated={(updated) => {
          setCommunity(updated);
          onCommunityUpdatedRef.current?.(updated);
        }}
        onLeaveCommunity={() => {
          onLeaveCommunity?.();
        }}
      />
    </div>
  );
}
