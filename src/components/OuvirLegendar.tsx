import React, { useState } from 'react';
import { 
  Mic, 
  MicOff, 
  RotateCcw, 
  Copy, 
  Check, 
  AlertCircle, 
  ShieldAlert, 
  Sparkles, 
  ShieldCheck, 
  Wand2, 
  Volume2, 
  Bot, 
  Type, 
  Sliders 
} from 'lucide-react';
import { AppSettings } from '../types';

interface OuvirLegendarProps {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  errorMessage: string | null;
  isSupported: boolean;
  isSecureOrigin: boolean;
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;
  settings: AppSettings;
  antiRepeatEnabled?: boolean;
  setAntiRepeatEnabled?: (enabled: boolean) => void;
  strictMode?: boolean;
  setStrictMode?: (strict: boolean) => void;
  duplicatesCount?: number;
  optimizeTranscript?: () => void;
  speak?: (text: string) => void;
}

export const OuvirLegendar: React.FC<OuvirLegendarProps> = ({
  isListening,
  transcript,
  interimTranscript,
  errorMessage,
  isSupported,
  isSecureOrigin,
  startListening,
  stopListening,
  clearTranscript,
  settings,
  antiRepeatEnabled = true,
  setAntiRepeatEnabled,
  strictMode = true,
  setStrictMode,
  duplicatesCount = 0,
  optimizeTranscript,
  speak,
}) => {
  const [copied, setCopied] = useState(false);
  const [justCleaned, setJustCleaned] = useState(false);
  const [localFontSize, setLocalFontSize] = useState<'normal' | 'grande' | 'gigante'>(
    settings.fontSize || 'grande'
  );
  const [vlibrasNotice, setVlibrasNotice] = useState(false);

  // Full clean caption text
  const fullText = transcript + (interimTranscript ? (transcript ? ' ' : '') + interimTranscript : '');
  const wordCount = fullText.trim() ? fullText.trim().split(/\s+/).length : 0;

  const handleCopy = () => {
    if (!fullText) return;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualOptimize = () => {
    if (optimizeTranscript) {
      optimizeTranscript();
      setJustCleaned(true);
      setTimeout(() => setJustCleaned(false), 2000);
    }
  };

  // Trigger official VLibras 3D Avatar with the current captioned text
  const handleTriggerVLibras = () => {
    if (!fullText.trim()) return;

    navigator.clipboard.writeText(fullText.trim());
    setVlibrasNotice(true);
    setTimeout(() => setVlibrasNotice(false), 5000);

    try {
      const el = document.getElementById('caption-text-content');
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    } catch {
      // ignore
    }

    const accessBtn = document.querySelector('[vw-access-button]') as HTMLElement;
    if (accessBtn) {
      accessBtn.click();
    } else {
      const vw = document.querySelector('[vw]') as HTMLElement;
      if (vw) {
        vw.classList.toggle('active');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Browser / Insecure Origin Compatibility Banner */}
      {!isSupported && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 flex items-start gap-3 text-amber-300">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-400" />
          <div className="text-xs leading-relaxed space-y-1">
            <strong className="block text-sm text-amber-200">Reconhecimento de Voz não suportado neste navegador</strong>
            <p>
              A função de <strong>Ouvir e Legendar</strong> utiliza a API Web Speech nativa, presente no <strong>Google Chrome</strong> e <strong>Microsoft Edge</strong> no computador, notebook e Android.
            </p>
            <p className="text-amber-400/80">
              Caso esteja em um navegador como Firefox ou Safari no iOS, utilize a aba <em>Falar por mim</em> ou instale o app pelo Chrome.
            </p>
          </div>
        </div>
      )}

      {!isSecureOrigin && isSupported && (
        <div className="rounded-2xl bg-sky-950/60 border border-sky-500/30 p-4 flex items-start gap-3 text-sky-200">
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-sky-400" />
          <div className="text-xs leading-relaxed space-y-1">
            <strong className="block text-sm text-sky-100">Dica de Acesso por Endereço IP na Escola</strong>
            <p>
              Você está acessando por HTTP na rede local. Os navegadores modernos exigem conexão segura (HTTPS ou localhost) para liberar o microfone.
            </p>
            <p className="text-sky-300/80">
              Para liberar o microfone no Chrome via IP: acesse <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code> e adicione o endereço IP do servidor. Ou use o link oficial publicado HTTPS.
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 flex items-center gap-3 text-rose-300 text-xs">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Caption Board */}
      <div className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-black flex items-center gap-2">
                Ouvir e legendar
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-black font-extrabold border border-slate-300">
                  Legenda Gigante em Tempo Real
                </span>
              </h2>

              {/* Anti-Repetition Status Pill */}
              <button
                onClick={() => setAntiRepeatEnabled && setAntiRepeatEnabled(!antiRepeatEnabled)}
                title="Clique para alternar o Filtro Anti-Repetição Inteligente"
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition border ${
                  antiRepeatEnabled
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                }`}
              >
                <ShieldCheck className={`h-3.5 w-3.5 ${antiRepeatEnabled ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Anti-Repetição: {antiRepeatEnabled ? 'Ativo' : 'Desativado'}</span>
                <span className={`h-2 w-2 rounded-full ${antiRepeatEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              </button>

              {/* Strict Mode Toggle (Filtro Turbo) */}
              {antiRepeatEnabled && setStrictMode && (
                <button
                  onClick={() => setStrictMode(!strictMode)}
                  title="Filtro Turbo: elimina gaguejos, ecos de microfone e repetições consecutivas de 2 a 8 palavras"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition border ${
                    strictMode
                      ? 'bg-orange-100 text-orange-950 border-orange-300 shadow-2xs'
                      : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Sparkles className="h-3 w-3 text-orange-600" />
                  <span>Modo Turbo: {strictMode ? 'Ligado' : 'Básico'}</span>
                </button>
              )}

              {duplicatesCount > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold animate-fadeIn">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  {duplicatesCount} {duplicatesCount === 1 ? 'repetição evitada' : 'repetições evitadas'}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Aproxime o microfone de quem está falando. O algoritmo inteligente remove automaticamente gaguejos, sobreposições de áudio da Web Speech API, ecos de microfone e repetições de palavras.
            </p>
          </div>

          {/* Quick Font Size Switcher for Classroom Reading */}
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-300 rounded-xl p-1">
            <span className="text-[10px] font-black uppercase text-slate-500 px-1.5 flex items-center gap-1">
              <Type className="h-3 w-3" /> Letra:
            </span>
            <button
              onClick={() => setLocalFontSize('normal')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                localFontSize === 'normal' ? 'bg-black text-white' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              A
            </button>
            <button
              onClick={() => setLocalFontSize('grande')}
              className={`px-2 py-1 rounded-lg text-xs font-black transition ${
                localFontSize === 'grande' ? 'bg-black text-white' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              A+
            </button>
            <button
              onClick={() => setLocalFontSize('gigante')}
              className={`px-2 py-1 rounded-lg text-xs font-black transition ${
                localFontSize === 'gigante' ? 'bg-black text-white' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              A++
            </button>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-2">
            {isListening ? (
              <button
                onClick={stopListening}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs sm:text-sm transition shadow-sm animate-pulse"
              >
                <MicOff className="h-4 w-4" />
                <span>Pausar Escuta</span>
              </button>
            ) : (
              <button
                onClick={startListening}
                disabled={!isSupported}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-300 hover:bg-orange-400 text-stone-900 border border-orange-400 font-black text-xs sm:text-sm transition shadow-xs disabled:opacity-40 disabled:pointer-events-none"
              >
                <Mic className="h-4 w-4 fill-stone-900" />
                <span>Começar a Ouvir</span>
              </button>
            )}

            {fullText && (
              <>
                <button
                  onClick={handleManualOptimize}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-950 text-xs font-bold transition border border-orange-300 shadow-2xs"
                  title="Executar limpeza imediata: elimina qualquer repetição residual, vícios de fala e formata pontuação"
                >
                  <Wand2 className="h-3.5 w-3.5 text-orange-700" />
                  <span>{justCleaned ? 'Repetições Limpas!' : 'Limpar Repetições'}</span>
                </button>

                <button
                  onClick={handleTriggerVLibras}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-black hover:text-white text-black text-xs font-bold transition border border-slate-300 shadow-2xs"
                  title="Traduzir o texto da legenda no Boneco 3D do VLibras"
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span>Traduzir no VLibras</span>
                </button>

                {speak && (
                  <button
                    onClick={() => speak(fullText)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-black text-xs font-bold transition border border-slate-300"
                    title="Ouvir a legenda em voz alta sintetizada"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Ouvir Fala</span>
                  </button>
                )}

                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-black text-xs font-bold transition border border-slate-300"
                  title="Copiar texto da legenda limpo"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>

                <button
                  onClick={clearTranscript}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-black transition border border-slate-300"
                  title="Limpar legenda"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Live Audio Visualizer Bar */}
        {isListening && (
          <div className="flex items-center justify-between bg-stone-50 border border-stone-300 rounded-2xl p-3 px-4 text-xs text-stone-900">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
              </span>
              <strong className="font-bold text-stone-900">Microfone ativo:</strong>
              <span className="hidden sm:inline">Captando fala em português com filtro profundo anti-repetição...</span>
              <span className="sm:hidden">Ouvindo em tempo real...</span>
            </div>

            {/* Audio Waveform Animation Bars */}
            <div className="flex items-center gap-1 h-7">
              <div className="w-1 bg-orange-400 rounded-full wave-bar-1" />
              <div className="w-1 bg-orange-400 rounded-full wave-bar-2" />
              <div className="w-1 bg-orange-400 rounded-full wave-bar-3" />
              <div className="w-1 bg-orange-400 rounded-full wave-bar-4" />
              <div className="w-1 bg-orange-400 rounded-full wave-bar-5" />
            </div>
          </div>
        )}

        {/* Notice alert when VLibras is triggered from caption */}
        {vlibrasNotice && (
          <div className="p-3 rounded-xl bg-slate-50 border border-black flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-black shrink-0" />
              <p className="text-xs font-bold text-black">
                Texto limpo enviado para o <strong>Boneco do VLibras</strong> no canto da tela!
              </p>
            </div>
            <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded uppercase">
              Pronto
            </span>
          </div>
        )}

        {/* Giant Caption Viewing Screen */}
        <div
          className={`min-h-[280px] rounded-3xl p-6 sm:p-8 flex flex-col justify-start transition-all border-2 ${
            settings.contrastTheme === 'amarelo-preto'
              ? 'bg-black text-yellow-300 border-yellow-500'
              : 'bg-white text-black border-slate-300 shadow-sm'
          }`}
        >
          {fullText ? (
            <div className="space-y-4">
              <p
                id="caption-text-content"
                className={`font-black tracking-tight leading-relaxed select-all ${
                  settings.contrastTheme === 'amarelo-preto' ? 'text-yellow-300' : 'text-black'
                } ${
                  localFontSize === 'gigante'
                    ? 'text-3xl sm:text-5xl lg:text-6xl'
                    : localFontSize === 'grande'
                    ? 'text-2xl sm:text-4xl lg:text-5xl'
                    : 'text-xl sm:text-3xl lg:text-4xl'
                }`}
              >
                <span>{transcript}</span>
                {interimTranscript && (
                  <span className={`italic font-semibold ml-2 ${
                    settings.contrastTheme === 'amarelo-preto' ? 'text-yellow-100 opacity-80' : 'text-slate-600'
                  }`}>
                    {interimTranscript}
                  </span>
                )}
              </p>

              {/* Caption Status Footer */}
              <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span>{wordCount} {wordCount === 1 ? 'palavra' : 'palavras'}</span>
                  <span>•</span>
                  <span>{fullText.length} caracteres</span>
                  {antiRepeatEnabled && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 inline" /> Filtro ativo (sem repetições)
                      </span>
                    </>
                  )}
                </div>

                <span className="text-[11px] text-slate-400">
                  Dica: Você pode selecionar qualquer trecho para copiar ou traduzir
                </span>
              </div>
            </div>
          ) : (
            <div className="m-auto text-center max-w-md py-8 space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 border border-slate-200 text-slate-500 mx-auto shadow-xs">
                <Mic className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-black text-black">Nenhuma fala captada no momento</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Clique no botão <strong>"Começar a Ouvir"</strong> acima e fale normalmente. As palavras aparecerão aqui em letras gigantes e limpas, sem repetições consecutivas ou gaguejos.
              </p>

              {/* Informational banner about the anti-repetition improvement */}
              <div className="mt-4 p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-left flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 leading-relaxed">
                  <strong className="block font-bold text-emerald-950">Aprimoramento Anti-Repetição Ativo:</strong>
                  O sistema agora detecta e mescla sobreposições de áudio da Web Speech API de até 16 palavras, elimina gaguejos, remove repetições consecutivas e sanitiza as hipóteses em tempo real para não duplicar na tela.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
