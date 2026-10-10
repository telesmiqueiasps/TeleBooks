"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  X,
  FlipHorizontal,
  Flashlight,
  FlashlightOff,
  AlertCircle,
  Barcode,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Modal, Button } from "@telebooks/ui";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

export interface IsbnScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedIsbn: string) => void;
}

export function IsbnScannerModal({
  isOpen,
  onClose,
  onScan,
}: IsbnScannerModalProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = "telebooks-isbn-scanner-video";

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn("TeleBooks: Erro ao parar leitor de código de barras", err);
      } finally {
        scannerRef.current = null;
      }
    }
  }, []);

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      // Normaliza o código
      const clean = decodedText.replace(/[^0-9X]/gi, "").toUpperCase();
      if (!clean) return;

      // Código ISBN padrão: 13 dígitos (EAN-13) ou 10 dígitos (ISBN-10)
      if (clean.length === 13 || clean.length === 10) {
        setScannedCode(clean);
        setWarningMessage(null);

        // Feedback tátil no smartphone
        if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
          try {
            navigator.vibrate([40, 50, 40]);
          } catch {
            // Ignora se não permitido
          }
        }

        await stopScanner();

        // Aguarda 400ms para mostrar a confirmação visual antes de enviar
        setTimeout(() => {
          onScan(clean);
          onClose();
        }, 400);
      } else {
        // Código lido de 12 dígitos (ex: UPC) ou não conforme
        setWarningMessage(
          `Código detectado (${clean}) possui ${clean.length} dígitos. Para livros, posicione a câmera sobre o código de barras ISBN de 13 dígitos (iniciado por 978 ou 979).`
        );
      }
    },
    [onScan, onClose, stopScanner]
  );

  const startScanner = useCallback(
    async (cameraId?: string) => {
      try {
        setIsInitializing(true);
        setCameraError(null);
        setScannedCode(null);
        setWarningMessage(null);

        await stopScanner();

        const html5QrCode = new Html5Qrcode(readerElementId, {
          // Focado exclusivamente em código de barras oficial de livros (EAN-13 / Bookland)
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
          ],
          verbose: false,
        });

        scannerRef.current = html5QrCode;

        // Configurações otimizadas para código de barras horizontal de livro (retangular)
        const config = {
          fps: 15,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.0,
        };

        const cameraConfig = cameraId
          ? { deviceId: { exact: cameraId } }
          : { facingMode: "environment" }; // Câmera traseira por padrão

        await html5QrCode.start(
          cameraConfig,
          config,
          handleScanSuccess,
          () => {
            // Callback contínuo quando não há código no frame (ignora para não poluir console)
          }
        );

        // Verifica capacidade de lanterna (Torch)
        try {
          const videoElement = document.querySelector<HTMLVideoElement>(
            `#${readerElementId} video`
          );
          if (videoElement && videoElement.srcObject) {
            const stream = videoElement.srcObject as MediaStream;
            const track = stream.getVideoTracks()[0];
            if (track && typeof track.getCapabilities === "function") {
              const capabilities = track.getCapabilities() as unknown as { torch?: boolean };
              if (capabilities && capabilities.torch) {
                setHasTorch(true);
              }
            }
          }
        } catch {
          setHasTorch(false);
        }
      } catch (err: unknown) {
        console.error("TeleBooks: Falha ao iniciar câmera", err);
        const errMsg =
          err instanceof Error
            ? err.message
            : "Permissão de câmera negada ou dispositivo indisponível.";
        setCameraError(
          errMsg.includes("NotAllowedError") || errMsg.includes("Permission")
            ? "Permissão da câmera bloqueada. Permita o acesso à câmera nas configurações do navegador."
            : "Não foi possível acessar a câmera do dispositivo."
        );
      } finally {
        setIsInitializing(false);
      }
    },
    [handleScanSuccess, stopScanner]
  );

  useEffect(() => {
    if (isOpen) {
      // Busca dispositivos disponíveis
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length > 0) {
            setCameras(devices);
            // Prioriza câmera traseira se houver
            const backCam = devices.find((d) =>
              /back|traseira|rear|environment/i.test(d.label)
            );
            const initialId = backCam ? backCam.id : devices[0]?.id;
            if (initialId) {
              setSelectedCameraId(initialId);
              startScanner(initialId);
            } else {
              startScanner();
            }
          } else {
            startScanner();
          }
        })
        .catch(() => {
          startScanner();
        });
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, startScanner, stopScanner]);

  const toggleCamera = () => {
    if (cameras.length > 1) {
      const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      const nextCamera = cameras[nextIndex];
      if (nextCamera) {
        setSelectedCameraId(nextCamera.id);
        startScanner(nextCamera.id);
      }
    }
  };

  const toggleTorch = async () => {
    if (!hasTorch || !scannerRef.current) return;
    try {
      const videoElement = document.querySelector<HTMLVideoElement>(
        `#${readerElementId} video`
      );
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        if (track) {
          const nextState = !isTorchOn;
          await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
            advanced: [{ torch: nextState }],
          });
          setIsTorchOn(nextState);
        }
      }
    } catch (err) {
      console.warn("TeleBooks: Lanterna indisponível", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-[32px] bg-[#0F172A] border border-slate-800 shadow-2xl overflow-hidden text-white flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#007BFF]/20 text-[#007BFF]">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">
                Leitor de Código de Barras (ISBN)
              </h3>
              <p className="text-[11px] text-slate-400">
                Aponte para o código no verso do livro físico
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Fechar scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Área de Vídeo / Câmera */}
        <div className="relative w-full aspect-square bg-black flex items-center justify-center overflow-hidden">
          {/* Elemento do Html5Qrcode */}
          <div
            id={readerElementId}
            className="w-full h-full flex items-center justify-center [&_video]:object-cover [&_video]:w-full [&_video]:h-full"
          />

          {/* Mira de Escaneamento Estilizada */}
          {!cameraError && !scannedCode && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* Moldura Guia Retangular para Código de Barras EAN-13 */}
              <div className="relative w-[78%] h-[42%] max-w-[280px] rounded-2xl border-2 border-[#007BFF] shadow-[0_0_20px_rgba(0,123,255,0.4)] overflow-hidden">
                {/* Linha Laser Animada */}
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_#ef4444] animate-pulse top-1/2 -translate-y-1/2" />

                {/* Cantos destacados */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white rounded-br-lg" />
              </div>

              <p className="mt-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-medium text-slate-200">
                Enquadre o código de barras no retângulo
              </p>
            </div>
          )}

          {/* Loading Inicial da Câmera */}
          {isInitializing && !cameraError && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#007BFF] animate-spin" />
              <p className="text-xs text-slate-300">Iniciando câmera...</p>
            </div>
          )}

          {/* Feedback de Código Reconhecido */}
          {scannedCode && (
            <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  Código Identificado!
                </p>
                <p className="font-mono text-base font-extrabold text-white mt-0.5">
                  {scannedCode}
                </p>
              </div>
            </div>
          )}

          {/* Alerta de Código Não-ISBN (ex: 12 dígitos UPC) */}
          {warningMessage && !scannedCode && (
            <div className="absolute inset-x-3 bottom-3 p-3 rounded-2xl bg-amber-950/90 border border-amber-600/40 backdrop-blur-md flex flex-col gap-2 z-10 animate-in fade-in duration-150">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-200 leading-tight">
                  {warningMessage}
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setWarningMessage(null)}
                  className="px-2.5 py-1 rounded-lg bg-amber-900/60 hover:bg-amber-800 text-[11px] text-amber-100 font-medium transition-colors"
                >
                  Continuar Escaneando
                </button>
              </div>
            </div>
          )}

          {/* Erro de Câmera */}
          {cameraError && (
            <div className="absolute inset-0 p-6 bg-slate-900/95 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Câmera Indisponível</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">{cameraError}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => startScanner(selectedCameraId || undefined)}
                className="rounded-full text-xs mt-2"
              >
                Tentar Novamente
              </Button>
            </div>
          )}
        </div>

        {/* Barra de Controles Inferior */}
        <div className="flex items-center justify-around p-3 bg-slate-900/80 border-t border-slate-800">
          {cameras.length > 1 && (
            <button
              type="button"
              onClick={toggleCamera}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
              title="Trocar Câmera"
            >
              <FlipHorizontal className="w-4 h-4 text-blue-400" />
              <span>Alternar Câmera</span>
            </button>
          )}

          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs transition-colors ${
                isTorchOn
                  ? "bg-amber-500 text-black font-bold"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300"
              }`}
              title="Lanterna"
            >
              {isTorchOn ? (
                <>
                  <Flashlight className="w-4 h-4 text-black" />
                  <span>Lanterna Ligada</span>
                </>
              ) : (
                <>
                  <FlashlightOff className="w-4 h-4 text-slate-400" />
                  <span>Lanterna</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-300 transition-colors font-medium"
          >
            Digitar ISBN
          </button>
        </div>
      </div>
    </div>
  );
}
