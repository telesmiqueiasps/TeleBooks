"use client";

import React, { useState } from "react";
import { BookPlus, Check } from "lucide-react";
import { Modal, Button, Input } from "@telebooks/ui";

export interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBook: (newBook: {
    title: string;
    author: string;
    pages: number;
    status: "want_to_read" | "reading" | "read";
    coverUrl?: string;
  }) => void;
}

export function AddBookModal({ isOpen, onClose, onAddBook }: AddBookModalProps) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [pages, setPages] = useState("");
  const [status, setStatus] = useState<"want_to_read" | "reading" | "read">("want_to_read");
  const [coverUrl, setCoverUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("O título do livro é obrigatório.");
      return;
    }
    if (!author.trim()) {
      setError("O nome do autor é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onAddBook({
        title,
        author,
        pages: parseInt(pages) || 320,
        status,
        coverUrl:
          coverUrl ||
          "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600",
      });
      setIsSubmitting(false);
      // Reset
      setTitle("");
      setAuthor("");
      setPages("");
      setCoverUrl("");
      setError(null);
      onClose();
    }, 400);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adicionar à Estante"
      description="Cadastre um novo livro na sua biblioteca pessoal com dados bibliográficos iniciais."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 text-xs">
            {error}
          </div>
        )}

        <Input
          label="Título do Livro *"
          placeholder="Ex: Cem Anos de Solidão"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Autor Principal *"
            placeholder="Ex: Gabriel García Márquez"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
          />

          <Input
            label="Número de Páginas"
            type="number"
            placeholder="Ex: 448"
            value={pages}
            onChange={(e) => setPages(e.target.value)}
          />
        </div>

        {/* Status selection */}
        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-medium text-[#4b5563] dark:text-[#a0a8b4]">
            Status Inicial de Leitura
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "want_to_read", label: "Quero Ler" },
              { id: "reading", label: "Lendo Agora" },
              { id: "read", label: "Já Lido" },
            ].map((option) => (
              <button
                type="button"
                key={option.id}
                onClick={() => setStatus(option.id as any)}
                className={`py-2 px-3 text-xs rounded-lg border font-medium transition-colors text-center ${
                  status === option.id
                    ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-500"
                    : "border-[#e5e0d8] dark:border-[#2b313e] bg-white dark:bg-[#181b22] text-[#4b5563] dark:text-[#9ca3af] hover:bg-[#faf8f5] dark:hover:bg-[#202530]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="URL da Capa (Opcional)"
          placeholder="https://..."
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          helperText="Se deixar vazio, uma capa editorial elegante será atribuída."
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#eeeae2] dark:border-[#252a35]">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            leftIcon={<BookPlus className="h-4 w-4" />}
          >
            Adicionar Livro
          </Button>
        </div>
      </form>
    </Modal>
  );
}
