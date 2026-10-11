"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  ImagePlus,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Link2,
  BookOpen,
  RotateCcw,
} from "lucide-react";
import { Modal, Button, Input, Badge } from "@telebooks/ui";
import type { CoverOption } from "@telebooks/types";
import { api } from "../../lib/api";

export interface CoverSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  isbn?: string | null;
  title?: string | null;
  author?: string | null;
  currentCoverUrl?: string | null;
  onSelectCover: (coverUrl: string) => void;
}

export function CoverSelectorModal({
  isOpen,
  onClose,
  isbn,
  title,
  author,
  currentCoverUrl,
  onSelectCover,
}: CoverSelectorModalProps) {
  const [options, setOptions] = useState<CoverOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // URL manual colada pelo usuário
  const [manualUrl, setManualUrl] = useState("");
  const [previewManualUrl, setPreviewManualUrl] = useState<string | null>(null);

  // Capa selecionada atualmente
  const [selectedUrl, setSelectedUrl] = useState<string | null>(
    currentCoverUrl || null
  );

  const cleanIsbn = isbn ? isbn.replace(/[^0-9X]/gi, "").toUpperCase() : "";

  // Busca opções automáticas na API ao abrir
  const loadOptions = useCallback(async () => {
    setIsLoading(true);
    setSearchError(null);
    try {
      const res = await api.searchCoverOptions({
        isbn: cleanIsbn || undefined,
        title: title || undefined,
        author: author || undefined,
      });
      setOptions(res || []);
    } catch {
      setSearchError("Não foi possível consultar os catálogos no momento.");
    } finally {
      setIsLoading(false);
    }
  }, [cleanIsbn, title, author]);

  useEffect(() => {
    if (isOpen) {
      setSelectedUrl(currentCoverUrl || null);
      setManualUrl("");
      setPreviewManualUrl(null);
      loadOptions();
    }
  }, [isOpen, currentCoverUrl, loadOptions]);

  // Monta a URL de busca no Google Imagens
  const googleImagesQuery = [cleanIsbn, title, author, "capa livro"]
    .filter(Boolean)
    .join(" ");
  const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
    googleImagesQuery
  )}`;

  const handleApplyManual = () => {
    const trimmed = manualUrl.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      setSearchError("A URL deve começar com https:// ou http://");
      return;
    }
    setPreviewManualUrl(trimmed);
    setSelectedUrl(trimmed);
    setSearchError(null);
  };

  const handleConfirm = () => {
    if (!selectedUrl) return;
    onSelectCover(selectedUrl);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buscar Capa da Edição na Web"
      description={
        title
          ? `Selecione a imagem exata para "${title}"`
          : "Encontre ou cole o link da capa para esta obra"
      }
      size="lg"
    >
      <div className="space-y-6 pt-2">
        {/* ================================================================= */}
        {/* SEÇÃO 1: ATALHO GOOGLE IMAGENS + COLAR LINK DA WEB               */}
        {/* ================================================================= */}
        <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Pesquisa Direta na Web
              </span>
              <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80 leading-relaxed">
                Abra a pesquisa da sua edição, copie o endereço da imagem e cole abaixo.
              </p>
            </div>

            <a
              href={googleImagesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#007BFF] hover:bg-blue-600 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <span>Abrir no Google Imagens</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Campo de colar URL */}
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Link2 className="w-4 h-4" />
              </div>
              <input
                type="url"
                placeholder="Cole aqui o link da imagem (ex: https://m.media-amazon.com/...)"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyManual()}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleApplyManual}
              disabled={!manualUrl.trim()}
              className="rounded-xl text-xs font-semibold px-3.5"
            >
              Aplicar Link
            </Button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SEÇÃO 2: RESULTADOS AUTOMÁTICOS ENCONTRADOS                       */}
        {/* ================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Opções Encontradas Automaticamente
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={loadOptions}
              disabled={isLoading}
              leftIcon={<RotateCcw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              Recarregar
            </Button>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-[#007BFF]" />
              <p className="text-xs">Consultando catálogos abertos...</p>
            </div>
          ) : options.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 max-h-[42vh] overflow-y-auto pr-1">
              {options.map((opt, idx) => {
                const isSelected = selectedUrl === opt.url;
                return (
                  <div
                    key={`${opt.url}-${idx}`}
                    onClick={() => setSelectedUrl(opt.url)}
                    className={`group relative flex flex-col rounded-2xl overflow-hidden border p-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-[#007BFF] bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-[#007BFF]/30 shadow-md"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-400 bg-white dark:bg-[#0F172A]"
                    }`}
                  >
                    {/* Badge de Selecionado */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 z-10 w-5 h-5 rounded-full bg-[#007BFF] text-white flex items-center justify-center shadow">
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    )}

                    {/* Capa */}
                    <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 book-spine">
                      <Image
                        src={opt.thumbnail_url || opt.url}
                        alt={opt.label || "Opção de capa"}
                        fill
                        sizes="140px"
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                        unoptimized
                      />
                    </div>

                    {/* Metadados da Opção */}
                    <div className="pt-2 text-center space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block truncate">
                        {opt.source}
                      </span>
                      {opt.label && (
                        <p className="text-[10px] text-slate-400 truncate">
                          {opt.label}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center space-y-2 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
              <BookOpen className="w-8 h-8 text-slate-400 mx-auto stroke-[1.5]" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nenhuma capa automática encontrada para este ISBN
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Use o botão acima para abrir o Google Imagens, copie o endereço da capa e cole no campo de link.
              </p>
            </div>
          )}
        </div>

        {/* Pré-visualização da Capa Selecionada */}
        {selectedUrl && (
          <div className="p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center gap-3">
            <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 book-spine">
              <Image
                src={selectedUrl}
                alt="Capa Selecionada"
                fill
                sizes="48px"
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Capa selecionada pronta para uso
              </p>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 truncate">
                {selectedUrl}
              </p>
            </div>
          </div>
        )}

        {searchError && (
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-full text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            disabled={!selectedUrl}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
            className="rounded-full text-xs font-bold px-5"
          >
            Usar Esta Capa
          </Button>
        </div>
      </div>
    </Modal>
  );
}
