"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  ChevronDown,
  Check,
  Plus,
  Settings,
  Library,
  X,
} from "lucide-react";
import { cn } from "@telebooks/ui";
import type { Collection } from "@telebooks/types";

export interface CollectionsDropdownProps {
  collections: Collection[];
  activeCollectionId?: string;
  onSelectCollection: (collectionId?: string) => void;
  onOpenManageModal: () => void;
  totalBooks?: number;
}

export function CollectionsDropdown({
  collections = [],
  activeCollectionId,
  onSelectCollection,
  onOpenManageModal,
  totalBooks,
}: CollectionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeCollection = collections.find((c) => c.id === activeCollectionId);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Fecha no ESC
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (id?: string) => {
    onSelectCollection(id);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Botão de Disparo */}
      <div className="inline-flex items-center rounded-full shadow-xs">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="true"
          aria-expanded={isOpen}
          className={cn(
            "h-8 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all select-none cursor-pointer border active:scale-95",
            activeCollection
              ? "bg-blue-50 dark:bg-blue-950/70 text-[#006CEB] dark:text-blue-300 border-[#007BFF]/50 shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
          )}
          title="Filtrar por Coleção"
        >
          {activeCollection ? (
            <FolderOpen className="w-4 h-4 text-[#006CEB] dark:text-blue-400 stroke-[2.3] shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-[#007BFF] stroke-[2.2] shrink-0" />
          )}

          <span className="truncate max-w-[140px] sm:max-w-[200px]">
            {activeCollection ? activeCollection.name : "Coleções"}
          </span>

          {activeCollection ? (
            <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/60 text-[#006CEB] dark:text-blue-300 text-[10px] font-bold">
              {activeCollection.book_count ?? 0}
            </span>
          ) : collections.length > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold">
              {collections.length}
            </span>
          ) : null}

          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 opacity-60 transition-transform duration-200 shrink-0",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {/* Botão rápido para remover filtro ativo */}
        {activeCollection && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectCollection(undefined);
            }}
            className="h-8 w-7 -ml-2 rounded-r-full flex items-center justify-center text-blue-500 hover:text-blue-700 dark:hover:text-blue-200 hover:bg-blue-100/60 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
            title="Limpar filtro de coleção (Ver todos)"
            aria-label="Limpar filtro de coleção"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Menu Popover / Dropdown com a Lista de Coleções */}
      {isOpen && (
        <>
          {/* Backdrop no mobile para fechamento suave ao toque */}
          <div
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] sm:hidden animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div className="absolute left-0 sm:left-0 sm:right-auto top-full mt-2 w-[calc(100vw-2.5rem)] max-w-xs sm:w-80 rounded-2xl bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Cabeçalho do Dropdown */}
            <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-[#007BFF]" />
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  Coleções Pessoais
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {collections.length} {collections.length === 1 ? "criada" : "criadas"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden p-1 -mr-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          {/* Opção: Todos os Livros (Sem Filtro) */}
          <div className="p-1.5 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleSelect(undefined)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer",
                !activeCollectionId
                  ? "bg-blue-50 dark:bg-blue-950/60 text-[#006CEB] dark:text-blue-300 font-bold"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                    !activeCollectionId
                      ? "bg-[#006CEB] text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  )}
                >
                  <Library className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate">Todos os Livros</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                    Exibir todo o acervo
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {totalBooks !== undefined && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                    {totalBooks}
                  </span>
                )}
                {!activeCollectionId && (
                  <Check className="w-4 h-4 text-[#006CEB] dark:text-blue-400 stroke-[2.5]" />
                )}
              </div>
            </button>
          </div>

          {/* Lista com as Coleções do Usuário */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40 p-1.5">
            {collections.length === 0 ? (
              <div className="py-6 px-4 text-center">
                <Folder className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Nenhuma coleção criada
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Crie coleções para organizar seus livros por temas, sagas ou categorias.
                </p>
              </div>
            ) : (
              collections.map((coll) => {
                const isSelected = activeCollectionId === coll.id;
                return (
                  <button
                    key={coll.id}
                    type="button"
                    onClick={() => handleSelect(coll.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer group",
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-950/60 text-[#006CEB] dark:text-blue-300 font-bold"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          isSelected
                            ? "bg-[#006CEB] text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 dark:group-hover:bg-blue-950 dark:group-hover:text-blue-300"
                        )}
                      >
                        {isSelected ? (
                          <FolderOpen className="w-3.5 h-3.5" />
                        ) : (
                          <Folder className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{coll.name}</p>
                        {coll.description && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-normal">
                            {coll.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                          isSelected
                            ? "bg-blue-100 dark:bg-blue-900/60 text-[#006CEB] dark:text-blue-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        )}
                      >
                        {coll.book_count ?? 0}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#006CEB] dark:text-blue-400 stroke-[2.5]" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Rodapé: Ação de Gerenciar / Criar Coleção */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenManageModal();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold text-[#006CEB] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Gerenciar Coleções & Tags</span>
            </button>
          </div>
          </div>
        </>
      )}
    </div>
  );
}
