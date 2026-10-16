"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  UserCheck,
  Check,
  Trash2,
  Loader2,
  Inbox,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@telebooks/ui";
import type { FollowRequestItem } from "@telebooks/types";
import { api } from "../../lib/api";

interface FollowRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestHandled?: (action: "accept" | "reject") => void;
}

export function FollowRequestsModal({
  isOpen,
  onClose,
  onRequestHandled,
}: FollowRequestsModalProps) {
  const [requests, setRequests] = useState<FollowRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      loadRequests();
    }
  }, [isOpen]);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getFollowRequests();
      setRequests(data);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar solicitações de seguidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (req: FollowRequestItem) => {
    setActionLoadingMap((prev) => ({ ...prev, [req.id]: true }));
    try {
      await api.acceptFollowRequest(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      if (onRequestHandled) onRequestHandled("accept");
    } catch (err: any) {
      alert(err.message || "Não foi possível aceitar a solicitação.");
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [req.id]: false }));
    }
  };

  const handleReject = async (req: FollowRequestItem) => {
    setActionLoadingMap((prev) => ({ ...prev, [req.id]: true }));
    try {
      await api.rejectFollowRequest(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      if (onRequestHandled) onRequestHandled("reject");
    } catch (err: any) {
      alert(err.message || "Não foi possível recusar a solicitação.");
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [req.id]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Solicitações de Seguidor
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {requests.length}{" "}
                {requests.length === 1 ? "solicitação pendente" : "solicitações pendentes"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Rolagem */}
        <div className="overflow-y-auto p-4 flex-1 space-y-3">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-[#007BFF]" />
              <span>Carregando solicitações...</span>
            </div>
          ) : error ? (
            <div className="py-10 text-center px-4 space-y-2">
              <ShieldAlert className="w-8 h-8 mx-auto text-rose-500" />
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                {error}
              </p>
            </div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-1">
              <Inbox className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">
                Nenhuma solicitação pendente
              </p>
              <p className="text-[11px] text-slate-400">
                Quando outros leitores solicitarem seguir seu perfil privado, eles aparecerão aqui.
              </p>
            </div>
          ) : (
            requests.map((req) => {
              const u = req.user;
              const isActionLoading = !!actionLoadingMap[req.id];

              return (
                <div
                  key={req.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <Link
                    href={`/perfil/${u.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 min-w-0 flex-1 group"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                      {u.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>
                          {(u.full_name || u.username || "L").substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-[#007BFF] transition-colors">
                        {u.full_name || u.username}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        @{u.username}
                      </p>
                      {u.bio && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate line-clamp-1 mt-0.5">
                          {u.bio}
                        </p>
                      )}
                    </div>
                  </Link>

                  {/* Ações: Aceitar / Recusar */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      className="rounded-full text-xs h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleAccept(req)}
                      disabled={isActionLoading}
                      leftIcon={
                        isActionLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )
                      }
                    >
                      Aceitar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full text-xs h-7 px-2.5 text-slate-500 hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-800"
                      onClick={() => handleReject(req)}
                      disabled={isActionLoading}
                      title="Recusar solicitação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
