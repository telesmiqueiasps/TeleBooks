"use client";

import React, { useState } from "react";
import { X, BarChart2, Plus, Trash2, Check } from "lucide-react";
import { Button, Input } from "@telebooks/ui";

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (question: string, options: string[]) => void;
  initialQuestion?: string;
  initialOptions?: string[];
}

export function CreatePollModal({
  isOpen,
  onClose,
  onConfirm,
  initialQuestion = "",
  initialOptions = ["", ""],
}: CreatePollModalProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [options, setOptions] = useState<string[]>(
    initialOptions.length >= 2 ? initialOptions : ["", ""]
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length >= 6) return;
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (text: string, index: number) => {
    const updated = [...options];
    updated[index] = text;
    setOptions(updated);
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion) {
      setError("Por favor, digite a pergunta da enquete.");
      return;
    }

    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setError("A enquete precisa de no mínimo 2 opções válidas.");
      return;
    }

    onConfirm(cleanQuestion, cleanOptions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0F172A] w-full max-w-md rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Criar Enquete
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Os membros poderão votar diretamente na mensagem.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleConfirm} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Pergunta */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Pergunta da Enquete
            </label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex: Qual o próximo livro que leremos?"
              maxLength={250}
              required
              className="rounded-xl text-xs sm:text-sm"
            />
          </div>

          {/* Opções */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Opções de Voto</span>
              <span className="text-[10px] text-slate-400">Mínimo 2, máximo 6</span>
            </label>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 w-4 text-center">
                    {idx + 1}.
                  </span>
                  <Input
                    value={opt}
                    onChange={(e) => handleOptionChange(e.target.value, idx)}
                    placeholder={`Opção ${idx + 1}`}
                    maxLength={100}
                    className="flex-1 rounded-xl text-xs sm:text-sm h-9"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Remover opção"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 6 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                className="w-full rounded-xl text-xs h-8 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-[#007BFF] hover:border-[#007BFF]"
                leftIcon={<Plus className="w-3 h-3" />}
              >
                Adicionar mais uma opção
              </Button>
            )}
          </div>

          {/* Ações */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-full text-xs px-3.5"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="rounded-full text-xs px-4 bg-purple-600 hover:bg-purple-700 text-white"
              leftIcon={<Check className="w-3.5 h-3.5" />}
            >
              Anexar Enquete
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
