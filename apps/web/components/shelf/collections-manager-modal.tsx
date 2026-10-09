"use client";

import React, { useState, useEffect } from "react";
import {
  Folder,
  FolderPlus,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Lock,
  Globe,
  X,
  Check,
  Tag,
  Palette,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { Modal, Button, Input } from "@telebooks/ui";
import type { Collection, UserTag } from "@telebooks/types";
import { api } from "../../lib/api";

export const PERSONAL_COLOR_PALETTE = [
  { id: "#007BFF", name: "Azul Royal", hex: "#007BFF" },
  { id: "#6366F1", name: "Índigo", hex: "#6366F1" },
  { id: "#8B5CF6", name: "Violeta", hex: "#8B5CF6" },
  { id: "#EC4899", name: "Pink", hex: "#EC4899" },
  { id: "#EF4444", name: "Rubi", hex: "#EF4444" },
  { id: "#F59E0B", name: "Âmbar", hex: "#F59E0B" },
  { id: "#10B981", name: "Esmeralda", hex: "#10B981" },
  { id: "#14B8A6", name: "Turquesa", hex: "#14B8A6" },
  { id: "#64748B", name: "Ardósia", hex: "#64748B" },
  { id: "#78350F", name: "Espresso", hex: "#78350F" },
];

export interface CollectionsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChanged?: () => void;
  initialTab?: "collections" | "tags";
}

export function CollectionsManagerModal({
  isOpen,
  onClose,
  onChanged,
  initialTab = "collections",
}: CollectionsManagerModalProps) {
  const [activeTab, setActiveTab] = useState<"collections" | "tags">(initialTab);

  // Estados de Coleções
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [collectionError, setCollectionError] = useState<string | null>(null);

  // Criar / Editar Coleção
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [collectionName, setCollectionName] = useState("");
  const [collectionDesc, setCollectionDesc] = useState("");
  const [collectionIsPublic, setCollectionIsPublic] = useState(false);
  const [isSubmittingCollection, setIsSubmittingCollection] = useState(false);

  // Estados de Tags
  const [tags, setTags] = useState<UserTag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);

  // Criar / Editar Tag
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState<string | null>(null);
  const [isSubmittingTag, setIsSubmittingTag] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      loadCollections();
      loadTags();
    }
  }, [isOpen, initialTab]);

  const loadCollections = async () => {
    setIsLoadingCollections(true);
    setCollectionError(null);
    try {
      const data = await api.getCollections();
      setCollections(data || []);
    } catch (err: unknown) {
      setCollectionError(
        err instanceof Error ? err.message : "Erro ao carregar coleções"
      );
    } finally {
      setIsLoadingCollections(false);
    }
  };

  const loadTags = async () => {
    setIsLoadingTags(true);
    setTagError(null);
    try {
      const data = await api.getUserTags();
      setTags(data || []);
    } catch (err: unknown) {
      setTagError(err instanceof Error ? err.message : "Erro ao carregar tags");
    } finally {
      setIsLoadingTags(false);
    }
  };

  // --------------------------------------------------------------------------
  // Ações de Coleção
  // --------------------------------------------------------------------------
  const startCreateCollection = () => {
    setEditingCollectionId(null);
    setCollectionName("");
    setCollectionDesc("");
    setCollectionIsPublic(false);
    setIsCreatingCollection(true);
  };

  const startEditCollection = (col: Collection) => {
    setIsCreatingCollection(false);
    setEditingCollectionId(col.id);
    setCollectionName(col.name);
    setCollectionDesc(col.description || "");
    setCollectionIsPublic(col.is_public);
  };

  const cancelCollectionForm = () => {
    setIsCreatingCollection(false);
    setEditingCollectionId(null);
    setCollectionName("");
    setCollectionDesc("");
    setCollectionIsPublic(false);
  };

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionName.trim()) return;

    setIsSubmittingCollection(true);
    try {
      if (editingCollectionId) {
        const updated = await api.updateCollection(editingCollectionId, {
          name: collectionName.trim(),
          description: collectionDesc.trim() || null,
          is_public: collectionIsPublic,
        });
        setCollections((prev) =>
          prev.map((c) => (c.id === editingCollectionId ? updated : c))
        );
      } else {
        const created = await api.createCollection({
          name: collectionName.trim(),
          description: collectionDesc.trim() || null,
          is_public: collectionIsPublic,
        });
        setCollections((prev) => [...prev, created]);
      }
      cancelCollectionForm();
      onChanged?.();
    } catch (err: unknown) {
      setCollectionError(
        err instanceof Error ? err.message : "Erro ao salvar coleção"
      );
    } finally {
      setIsSubmittingCollection(false);
    }
  };

  const handleDeleteCollection = async (col: Collection) => {
    if (
      !confirm(
        `Deseja realmente excluir a coleção "${col.name}"? Os livros continuarão na sua estante.`
      )
    ) {
      return;
    }

    try {
      await api.deleteCollection(col.id);
      setCollections((prev) => prev.filter((c) => c.id !== col.id));
      onChanged?.();
    } catch (err: unknown) {
      setCollectionError(
        err instanceof Error ? err.message : "Erro ao excluir coleção"
      );
    }
  };

  const handleMoveCollection = async (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === collections.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newCollections = [...collections];
    const [moved] = newCollections.splice(index, 1);
    if (!moved) return;
    newCollections.splice(targetIndex, 0, moved);

    // Atualização otimista imediata na UI
    setCollections(newCollections);

    try {
      const ids = newCollections.map((c) => c.id);
      const reordered = await api.reorderCollections(ids);
      setCollections(reordered);
      onChanged?.();
    } catch {
      loadCollections();
    }
  };

  // --------------------------------------------------------------------------
  // Ações de Tags
  // --------------------------------------------------------------------------
  const startCreateTag = () => {
    setEditingTagId(null);
    setTagName("");
    setTagColor("#007BFF");
    setIsCreatingTag(true);
  };

  const startEditTag = (t: UserTag) => {
    setIsCreatingTag(false);
    setEditingTagId(t.id);
    setTagName(t.name);
    setTagColor(t.color || "#007BFF");
  };

  const cancelTagForm = () => {
    setIsCreatingTag(false);
    setEditingTagId(null);
    setTagName("");
    setTagColor(null);
  };

  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;

    setIsSubmittingTag(true);
    try {
      const cleanName = tagName.trim().replace(/^#+/, "");
      if (editingTagId) {
        const updated = await api.updateUserTag(editingTagId, {
          name: cleanName,
          color: tagColor,
        });
        setTags((prev) =>
          prev.map((t) => (t.id === editingTagId ? updated : t))
        );
      } else {
        const created = await api.createUserTag({
          name: cleanName,
          color: tagColor,
        });
        setTags((prev) => [...prev, created]);
      }
      cancelTagForm();
      onChanged?.();
    } catch (err: unknown) {
      setTagError(err instanceof Error ? err.message : "Erro ao salvar tag");
    } finally {
      setIsSubmittingTag(false);
    }
  };

  const handleDeleteTag = async (t: UserTag) => {
    if (!confirm(`Deseja realmente remover a tag #${t.name}?`)) return;

    try {
      await api.deleteUserTag(t.id);
      setTags((prev) => prev.filter((tag) => tag.id !== t.id));
      onChanged?.();
    } catch (err: unknown) {
      setTagError(err instanceof Error ? err.message : "Erro ao excluir tag");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Organização da Biblioteca"
      size="lg"
    >
      <div className="space-y-5">
        {/* Alternador de Abas: Coleções vs Tags */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("collections")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "collections"
                ? "border-[#007BFF] text-[#007BFF]"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>Coleções ({collections.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tags")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "tags"
                ? "border-[#007BFF] text-[#007BFF]"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Tags Pessoais ({tags.length})</span>
          </button>
        </div>

        {/* =========================================================================
            ABA 1: COLEÇÕES
        ========================================================================= */}
        {activeTab === "collections" && (
          <div className="space-y-4">
            {collectionError && (
              <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{collectionError}</span>
              </div>
            )}

            {/* Cabeçalho com Botão Nova Coleção */}
            {!isCreatingCollection && !editingCollectionId && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Agrupe livros por temas, sagas, projetos ou recomendações.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={startCreateCollection}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  className="rounded-full text-xs"
                >
                  Nova Coleção
                </Button>
              </div>
            )}

            {/* Formulário de Criação / Edição de Coleção */}
            {(isCreatingCollection || editingCollectionId) && (
              <form
                onSubmit={handleSaveCollection}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {editingCollectionId ? "Editar Coleção" : "Criar Nova Coleção"}
                  </span>
                  <button
                    type="button"
                    onClick={cancelCollectionForm}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Nome da Coleção *
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="Ex: Clássicos da Ficção Científica, Trilogia do Senhor dos Anéis..."
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Descrição (opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Breve comentário ou proposta desta curadoria..."
                    value={collectionDesc}
                    onChange={(e) => setCollectionDesc(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={collectionIsPublic}
                      onChange={(e) => setCollectionIsPublic(e.target.checked)}
                      className="rounded border-slate-300 text-[#007BFF] focus:ring-[#007BFF]"
                    />
                    <span className="flex items-center gap-1.5">
                      {collectionIsPublic ? (
                        <>
                          <Globe className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Coleção Pública (visível no perfil social)</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Coleção Privada (somente você pode ver)</span>
                        </>
                      )}
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelCollectionForm}
                    disabled={isSubmittingCollection}
                    className="rounded-full text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSubmittingCollection}
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                    className="rounded-full text-xs"
                  >
                    {editingCollectionId ? "Atualizar Coleção" : "Salvar Coleção"}
                  </Button>
                </div>
              </form>
            )}

            {/* Lista de Coleções */}
            {isLoadingCollections ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Carregando suas coleções...
              </div>
            ) : collections.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <FolderPlus className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Você ainda não criou nenhuma coleção.
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Crie sua primeira coleção para organizar seus livros por sagas, temas ou projetos.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {collections.map((col, index) => (
                  <div
                    key={col.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs gap-3"
                  >
                    {/* Botões de Reordenação (Subir / Descer) */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveCollection(index, "up")}
                        className="p-1 text-slate-400 hover:text-[#007BFF] disabled:opacity-20 disabled:hover:text-slate-400 transition-colors rounded"
                        title="Subir posição"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === collections.length - 1}
                        onClick={() => handleMoveCollection(index, "down")}
                        className="p-1 text-slate-400 hover:text-[#007BFF] disabled:opacity-20 disabled:hover:text-slate-400 transition-colors rounded"
                        title="Descer posição"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Detalhes da Coleção */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-xs font-bold text-slate-900 dark:text-white truncate">
                          {col.name}
                        </span>
                        {col.is_public ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full font-medium"
                            title="Pública"
                          >
                            <Globe className="w-2.5 h-2.5" />
                            Pública
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full font-medium"
                            title="Privada"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            Privada
                          </span>
                        )}
                      </div>

                      {col.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {col.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          <span>
                            {col.book_count ?? 0} {col.book_count === 1 ? "livro" : "livros"}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Ações: Editar e Excluir */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditCollection(col)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Editar coleção"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCollection(col)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        title="Excluir coleção"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            ABA 2: TAGS PESSOAIS
        ========================================================================= */}
        {activeTab === "tags" && (
          <div className="space-y-4">
            {tagError && (
              <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{tagError}</span>
              </div>
            )}

            {/* Cabeçalho com Botão Nova Tag */}
            {!isCreatingTag && !editingTagId && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Rótulos livres para classificar formatos, momentos ou impressões (#kindle, #reler, #faculdade).
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={startCreateTag}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  className="rounded-full text-xs"
                >
                  Nova Tag
                </Button>
              </div>
            )}

            {/* Formulário de Criação / Edição de Tag */}
            {(isCreatingTag || editingTagId) && (
              <form
                onSubmit={handleSaveTag}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {editingTagId ? "Editar Tag" : "Criar Nova Tag"}
                  </span>
                  <button
                    type="button"
                    onClick={cancelTagForm}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Nome da Tag *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      #
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="reler, emprestado, kindle, faculdade..."
                      value={tagName}
                      onChange={(e) => setTagName(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                    />
                  </div>
                </div>

                {/* Seletor de Cor da Tag */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Palette className="w-3 h-3 text-slate-400" />
                    <span>Cor de Destaque</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {PERSONAL_COLOR_PALETTE.map((color) => {
                      const isSelected = tagColor === color.hex;
                      return (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => setTagColor(color.hex)}
                          className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center ${
                            isSelected
                              ? "scale-125 ring-2 ring-offset-2 ring-[#007BFF] shadow-sm"
                              : "hover:scale-110 opacity-80 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelTagForm}
                    disabled={isSubmittingTag}
                    className="rounded-full text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSubmittingTag}
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                    className="rounded-full text-xs"
                  >
                    {editingTagId ? "Atualizar Tag" : "Salvar Tag"}
                  </Button>
                </div>
              </form>
            )}

            {/* Grid de Tags */}
            {isLoadingTags ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Carregando suas tags...
              </div>
            ) : tags.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <Tag className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Você ainda não criou nenhuma tag.
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Crie tags para adicionar marcadores rápidos como #filosofia, #favoritos-2024, #clube-do-livro.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-[360px] overflow-y-auto pr-1">
                {tags.map((t) => (
                  <div
                    key={t.id}
                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-white dark:bg-[#0F172A] border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all text-xs"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: t.color || "#007BFF" }}
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      #{t.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => startEditTag(t)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                      title="Editar tag"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTag(t)}
                      className="text-slate-400 hover:text-rose-500 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Excluir tag"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
