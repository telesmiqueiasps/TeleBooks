"use client";

import React, { useState, useEffect } from "react";
import { BookmarkCheck } from "lucide-react";
import { Modal, Button, Input } from "@telebooks/ui";
import { BookItem } from "./book-card";

export interface ReadingProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: BookItem | null;
  onSaveProgress: (bookId: string, newPage: number) => void;
}

export function ReadingProgressModal({
  isOpen,
  onClose,
  book,
  onSaveProgress,
}: ReadingProgressModalProps) {
  const [currentPage, setCurrentPage] = useState<number>(0);

  useEffect(() => {
    if (book) {
      setCurrentPage(book.currentPage || 0);
    }
  }, [book]);

  if (!book) return null;

  const totalPages = book.pages || 100;
  const progressPercent = Math.min(100, Math.round((currentPage / totalPages) * 100));

  const handleSave = () => {
    onSaveProgress(book.id, currentPage);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Atualizar Leitura"
      description={`Progresso de leitura para "${book.title}"`}
      size="sm"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4 p-3.5 rounded-xl bg-[#faf8f5] dark:bg-[#15171d] border border-[#e5e0d8] dark:border-[#272b35]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={book.coverUrl}
            alt={book.title}
            className="h-16 w-11 object-cover rounded shadow-sm book-spine shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h4 className="font-serif text-sm font-semibold text-[#141618] dark:text-[#f3f4f6] truncate">
              {book.title}
            </h4>
            <p className="text-xs text-[#6b7280] dark:text-[#9ca3af] truncate">
              {book.author}
            </p>
            <div className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400">
              {currentPage} de {totalPages} págs ({progressPercent}%)
            </div>
          </div>
        </div>

        <Input
          label="Página Atual"
          type="number"
          min={0}
          max={totalPages}
          value={currentPage}
          onChange={(e) => setCurrentPage(Math.max(0, parseInt(e.target.value) || 0))}
          helperText={`Restam ${Math.max(0, totalPages - currentPage)} páginas para concluir.`}
        />

        {/* Progress bar preview */}
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-[#eeeae2] dark:bg-[#252a35] overflow-hidden">
            <div
              className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#eeeae2] dark:border-[#252a35]">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            leftIcon={<BookmarkCheck className="h-4 w-4" />}
          >
            Salvar Progresso
          </Button>
        </div>
      </div>
    </Modal>
  );
}
