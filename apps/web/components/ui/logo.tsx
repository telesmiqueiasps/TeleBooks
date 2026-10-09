"use client";

import React, { useState } from "react";
import Image from "next/image";
import { cn } from "@telebooks/ui";

export interface LogoProps {
  variant?: "full" | "icon" | "image";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showSlogan?: boolean;
  className?: string;
  theme?: "light" | "dark" | "auto";
  priority?: boolean;
}

const sizeConfig = {
  xs: {
    iconSize: 24,
    textClass: "text-base",
    sloganClass: "text-[7.5px] tracking-[0.14em]",
    fullWidth: 120,
    fullHeight: 28,
  },
  sm: {
    iconSize: 32,
    textClass: "text-lg",
    sloganClass: "text-[9px] tracking-[0.16em]",
    fullWidth: 150,
    fullHeight: 36,
  },
  md: {
    iconSize: 42,
    textClass: "text-2xl",
    sloganClass: "text-[10px] tracking-[0.18em]",
    fullWidth: 190,
    fullHeight: 46,
  },
  lg: {
    iconSize: 56,
    textClass: "text-3xl",
    sloganClass: "text-[11px] tracking-[0.2em]",
    fullWidth: 240,
    fullHeight: 58,
  },
  xl: {
    iconSize: 72,
    textClass: "text-4xl",
    sloganClass: "text-[12px] tracking-[0.22em]",
    fullWidth: 300,
    fullHeight: 74,
  },
};

/**
 * Ícone vetorial oficial do TeleBooks (Livro 3D formando a letra 'T')
 */
export function TeleBooksVectorIcon({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none", className)}
    >
      <defs>
        <linearGradient id="bookBlueGrad" x1="15" y1="20" x2="105" y2="105" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="40%" stopColor="#007BFF" />
          <stop offset="100%" stopColor="#0052CC" />
        </linearGradient>

        <linearGradient id="spineGrad" x1="20" y1="35" x2="60" y2="105" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0066E0" />
          <stop offset="100%" stopColor="#003D99" />
        </linearGradient>

        <filter id="subtleDrop" x="0" y="0" width="120" height="120" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#007BFF" floodOpacity="0.25" />
        </filter>
      </defs>

      <g filter="url(#subtleDrop)">
        {/* Folha/Lombada esquerda */}
        <path d="M20 70 L52 87 L52 110 L20 93 Z" fill="url(#spineGrad)" />
        <path d="M20 38 L52 20 L52 87 L20 70 Z" fill="url(#spineGrad)" />

        {/* Páginas internas */}
        <path d="M52 20 L72 32 L72 98 L52 87 Z" fill="#FFFFFF" />

        {/* Haste horizontal do T */}
        <path d="M52 20 L102 48 L86 58 L36 30 Z" fill="url(#bookBlueGrad)" />

        {/* Haste vertical / Capa direita */}
        <path d="M72 32 L102 48 L102 76 L72 60 Z" fill="url(#bookBlueGrad)" />
        <path d="M62 45 L78 54 L78 102 L62 93 Z" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

/**
 * Componente oficial de Marca TeleBooks
 * Tenta utilizar as imagens oficiais (/logo.png e /icone.png) fornecidas pelo usuário,
 * e possui fallback vetorial automático caso ainda não estejam no diretório public/.
 */
export function Logo({
  variant = "full",
  size = "md",
  showSlogan = false,
  className,
  theme = "auto",
  priority = false,
}: LogoProps) {
  const [logoFileError, setLogoFileError] = useState(false);
  const [iconFileError, setIconFileError] = useState(false);
  const cfg = sizeConfig[size];

  // Caso seja apenas o ícone
  if (variant === "icon") {
    if (!iconFileError) {
      return (
        <div
          className={cn(
            "relative flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105",
            className
          )}
          style={{ width: cfg.iconSize, height: cfg.iconSize }}
        >
          <Image
            src="/icone.png"
            alt="TeleBooks"
            width={cfg.iconSize}
            height={cfg.iconSize}
            className="w-full h-full object-contain"
            onError={() => setIconFileError(true)}
            priority={priority}
          />
        </div>
      );
    }

    return (
      <div className={cn("shrink-0", className)}>
        <TeleBooksVectorIcon size={cfg.iconSize} />
      </div>
    );
  }

  // Tenta carregar a imagem de logo completa (/logo.png) se disponível
  if (!logoFileError) {
    return (
      <div
        className={cn(
          "relative inline-flex items-center select-none group transition-opacity",
          className
        )}
      >
        <Image
          src="/logo.png"
          alt="TeleBooks — Sua biblioteca, do seu jeito"
          width={cfg.fullWidth}
          height={cfg.fullHeight}
          className="h-auto w-auto max-h-[80px] object-contain"
          onError={() => setLogoFileError(true)}
          priority={priority}
        />
      </div>
    );
  }

  // Fallback / Composição estruturada com fonte Sora oficial e slogan
  return (
    <div
      className={cn(
        "inline-flex flex-col items-start select-none group transition-opacity",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        {/* Ícone */}
        <div
          className="relative flex items-center justify-center shrink-0"
          style={{ width: cfg.iconSize, height: cfg.iconSize }}
        >
          {!iconFileError ? (
            <Image
              src="/icone.png"
              alt="TeleBooks"
              width={cfg.iconSize}
              height={cfg.iconSize}
              className="w-full h-full object-contain"
              onError={() => setIconFileError(true)}
              priority={priority}
            />
          ) : (
            <TeleBooksVectorIcon size={cfg.iconSize} />
          )}
        </div>

        {/* Wordmark oficial com tipografia Sora */}
        <div className="flex flex-col">
          <div
            className={cn(
              "font-display font-extrabold tracking-tight leading-none flex items-center",
              cfg.textClass,
              theme === "dark"
                ? "text-white"
                : theme === "light"
                ? "text-[#0F172A]"
                : "text-[#0F172A] dark:text-white"
            )}
          >
            <span>Tele</span>
            <span className={theme === "dark" ? "text-blue-200" : "text-[#007BFF]"}>
              Books
            </span>
          </div>

          {/* Slogan oficial */}
          {showSlogan && (
            <span
              className={cn(
                "font-display font-semibold uppercase text-[#6B7280] dark:text-[#9CA3AF] mt-1.5 leading-none",
                cfg.sloganClass
              )}
            >
              SUA BIBLIOTECA, DO SEU JEITO.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
