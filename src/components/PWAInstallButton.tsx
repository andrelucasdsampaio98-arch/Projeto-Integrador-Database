import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide
  if (isInstalled) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
        <Check className="h-3.5 w-3.5" /> App Instalado
      </span>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-md hover:from-cyan-400 hover:to-blue-500 transition"
      >
        <Download className="h-4 w-4" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition"
        >
          <Smartphone className="h-3.5 w-3.5 text-cyan-400" />
          Instalar no iPhone
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-cyan-400" />
                  Instalar no iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                    1
                  </span>
                  <div>
                    No Safari, toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima <Share2 className="h-3 w-3 inline mx-1" /> na barra inferior).
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                    2
                  </span>
                  <div>
                    Role as opções e toque em <strong>"Adicionar à Tela de Início"</strong> (<PlusSquare className="h-3 w-3 inline mx-1" />).
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                    3
                  </span>
                  <div>
                    Toque em <strong>Adicionar</strong> no canto superior direito. O ícone do <strong>Ponte</strong> aparecerá junto aos seus aplicativos!
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full mt-2 rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback button showing universal install tips
  return (
    <button
      onClick={() => {
        alert('Para instalar o app no seu dispositivo, use o menu do navegador (3 pontinhos) e clique em "Instalar aplicativo" ou "Adicionar à tela de início".');
      }}
      className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
    >
      <Download className="h-3.5 w-3.5 text-cyan-400" />
      Instalar
    </button>
  );
};
