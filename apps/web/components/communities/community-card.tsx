"use client";

import React from "react";
import {
  Users,
  Lock,
  Globe,
  ShieldCheck,
  Megaphone,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, Badge, Button, cn } from "@telebooks/ui";
import type { Community } from "@telebooks/types";

interface CommunityCardProps {
  community: Community;
  onOpen: (community: Community) => void;
  onJoin: (community: Community) => void;
  isJoining?: boolean;
}

export function CommunityCard({
  community,
  onOpen,
  onJoin,
  isJoining = false,
}: CommunityCardProps) {
  const isMember = community.my_status === "active";
  const isPending = community.my_status === "pending";
  const isOwner = community.my_role === "owner";
  const isAdmin = community.my_role === "admin";

  return (
    <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs hover:shadow-md hover:border-blue-400/50 transition-all flex flex-col justify-between overflow-hidden group">
      <div>
        {/* Banner de cabeçalho sutil ou capa personalizada */}
        <div
          className={cn(
            "w-full relative p-3 flex items-start justify-between overflow-hidden transition-all",
            community.cover_url ? "h-22" : "h-16"
          )}
        >
          {community.cover_url ? (
            <>
              <img
                src={community.cover_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/75" />
            </>
          ) : (
            <div
              className={cn(
                "absolute inset-0",
                community.is_private
                  ? "bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 dark:from-amber-950/40 dark:to-slate-900"
                  : "bg-gradient-to-r from-blue-600/15 via-indigo-600/10 to-blue-500/5 dark:from-blue-950/40 dark:to-slate-900"
              )}
            />
          )}

          {/* Badges de Privacidade e Permissão */}
          <div className="flex flex-wrap items-center gap-1.5 z-10">
            {community.is_private ? (
              <Badge
                variant="outline"
                size="sm"
                className="bg-amber-50/90 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80 font-bold text-[10px] py-0.5 gap-1 backdrop-blur-xs"
              >
                <Lock className="w-2.5 h-2.5 text-amber-600" />
                Privada
              </Badge>
            ) : (
              <Badge
                variant="outline"
                size="sm"
                className="bg-emerald-50/90 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80 font-bold text-[10px] py-0.5 gap-1 backdrop-blur-xs"
              >
                <Globe className="w-2.5 h-2.5 text-emerald-600" />
                Pública
              </Badge>
            )}

            {community.only_admins_can_post && (
              <Badge
                variant="outline"
                size="sm"
                className="bg-purple-50/90 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/80 font-semibold text-[10px] py-0.5 gap-1 backdrop-blur-xs"
                title="Apenas administradores podem enviar mensagens neste grupo"
              >
                <Megaphone className="w-2.5 h-2.5 text-purple-600" />
                Mural Admins
              </Badge>
            )}
          </div>

          {/* Minha Função Badge (se membro) */}
          {(isOwner || isAdmin) && (
            <Badge
              size="sm"
              className="bg-blue-600 text-white font-extrabold text-[10px] py-0.5 border-none shadow-xs z-10"
            >
              <ShieldCheck className="w-2.5 h-2.5 mr-1" />
              {isOwner ? "Criador" : "Admin"}
            </Badge>
          )}
        </div>

        {/* Informações Principais */}
        <div className="p-4 sm:p-5 pt-0 relative">
          {/* Avatar da Comunidade Flutuante */}
          <div className="-mt-7 mb-3 flex items-center justify-between">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center font-extrabold text-lg shadow-md shadow-blue-500/20 border-3 border-white dark:border-[#0F172A] shrink-0">
              {community.avatar_url ? (
                <img
                  src={community.avatar_url}
                  alt={community.name}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <Users className="w-6 h-6 stroke-[2.2]" />
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {community.members_count}{" "}
                {community.members_count === 1 ? "membro" : "membros"}
              </span>
            </div>
          </div>

          {/* Nome e Descrição */}
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white group-hover:text-[#007BFF] transition-colors line-clamp-1">
            {community.name}
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed min-h-[32px]">
            {community.description || "Comunidade literária no TeleBooks para debater leituras e compartilhar opiniões."}
          </p>
        </div>
      </div>

      {/* Rodapé com Ações */}
      <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-slate-800/60 mt-2">
        <div className="flex items-center justify-between gap-2 pt-3">
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">
            {community.creator?.full_name || community.creator?.username
              ? `Criado por @${community.creator.username}`
              : "Comunidade literária"}
          </div>

          <div>
            {isMember ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpen(community)}
                className="rounded-full text-xs px-4 h-8 bg-gradient-to-r from-[#006CEB] to-[#007BFF] shadow-xs active:scale-95"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Abrir Chat
              </Button>
            ) : isPending ? (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="rounded-full text-xs px-3.5 h-8 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold"
                leftIcon={<Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />}
              >
                Aguardando
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onJoin(community)}
                disabled={isJoining}
                className="rounded-full text-xs px-4 h-8 border-blue-300 dark:border-blue-700 text-[#007BFF] hover:bg-blue-50 dark:hover:bg-blue-950/30 font-bold active:scale-95"
                leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#007BFF]" />}
              >
                {community.is_private ? "Pedir Acesso" : "Participar"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
