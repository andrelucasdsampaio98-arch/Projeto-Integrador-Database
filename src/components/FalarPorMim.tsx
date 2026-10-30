import React, { useState, useMemo } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Copy, 
  Smartphone,
  Send,
  Shuffle,
  Play,
  Check,
  Sparkles
} from 'lucide-react';
import { AppSettings, VoiceSpeechStyle } from '../types';

interface FalarPorMimProps {
  speak: (text: string, onEndCallback?: () => void, overrideVoiceURI?: string, overridePitch?: number) => void;
  isSpeaking: boolean;
  cancelSpeak: () => void;
  settings: AppSettings;
  voices?: SpeechSynthesisVoice[];
  selectedVoice?: SpeechSynthesisVoice | null;
  onSelectVoice?: (voiceURI: string) => void;
  onUpdateSpeechStyle?: (style: VoiceSpeechStyle, rate: number, pitch: number) => void;
  onCycleVoice?: () => SpeechSynthesisVoice | null;
}

export const FalarPorMim: React.FC<FalarPorMimProps> = ({
  speak,
  isSpeaking,
  cancelSpeak,
  settings,
  voices = [],
  selectedVoice,
  onSelectVoice,
  onCycleVoice,
}) => {
  const [text, setText] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<string[]>([
    'Olá! Eu sou surdo(a). Podemos nos comunicar por texto aqui.',
    'Professor, tenho uma dúvida no exercício de programação.',
    'Obrigado pela explicação!',
  ]);

  const distinctVoices = useMemo(() => {
    const list = voices && voices.length > 0
      ? voices
      : (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : []);
    
    if (!list || list.length === 0) return [];
    const pt = list.filter((v) => {
      const lang = (v.lang || '').toLowerCase().replace('_', '-');
      const name = (v.name || '').toLowerCase();
      return lang.startsWith('pt') || lang.includes('por') || name.includes('portug') || name.includes('brazil') || name.includes('brasil');
    });
    const pool = pt.length > 0 ? pt : list;
    return pool.filter((v, i, arr) => arr.findIndex((item) => item.voiceURI === v.voiceURI || item.name === v.name) === i);
  }, [voices]);

  const handleCycleVoice = () => {
    if (onCycleVoice) {
      const newVoice = onCycleVoice();
      if (newVoice) {
        speak(`Voz alterada para ${newVoice.name}. Teste de fala funcionando com sucesso.`, undefined, newVoice.voiceURI);
      }
    }
  };

  const handleSelectVoice = (targetURI: string, voiceName: string) => {
    if (onSelectVoice) {
      onSelectVoice(targetURI);
      speak(`Voz alterada para ${voiceName}. Teste de fala funcionando com sucesso.`, undefined, targetURI);
    }
  };

  const handleTestCurrentVoice = () => {
    const vName = selectedVoice?.name || 'Voz Padrão Brasileiro';
    speak(`Olá! Esta é a voz de teste: ${vName}. Som configurado e funcionando perfeitamente!`, undefined, selectedVoice?.voiceURI);
  };

  const handleSpeak = (textToSpeak: string) => {
    if (!textToSpeak.trim()) return;
    speak(textToSpeak);

    // Save to history (avoid duplicates at top)
    setHistory((prev) => {
      const filtered = prev.filter((item) => item !== textToSpeak);
      return [textToSpeak, ...filtered].slice(0, 15);
    });
  };

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const quickChips = [
    'Preciso de ajuda',
    'Pode repetir?',
    'Entendi, obrigado!',
    'Onde salvo o arquivo?',
    'Meu código deu erro',
    'Posso ir ao banheiro?',
  ];

  return (
    <div className="space-y-6">
      {/* FULLSCREEN DISPLAY OVERLAY */}
      {isFullscreen && (
        <div
          className={`fixed inset-0 z-50 flex flex-col justify-between p-6 sm:p-12 transition-all ${
            settings.contrastTheme === 'amarelo-preto'
              ? 'bg-black text-yellow-300'
              : 'bg-white text-black'
          }`}
        >
          {/* Top Bar inside Fullscreen */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-widest px-3 py-1 rounded-full bg-slate-100 text-black border border-slate-300">
                Modo Apresentação em Tela Cheia
              </span>
              <span className="text-xs text-slate-600 hidden sm:inline font-medium">
                Mostre esta tela para o professor ou colega
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* 180° Flip Button for showing across desk */}
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  isFlipped
                    ? 'bg-black text-white border-black'
                    : 'bg-slate-100 text-black border-slate-300 hover:bg-slate-200'
                }`}
                title="Girar texto em 180° para quem está na sua frente ler facilmente"
              >
                <Smartphone className="h-4 w-4" />
                {isFlipped ? 'Girar Normal' : 'Girar 180° (Mesa)'}
              </button>

              <button
                onClick={() => handleSpeak(text)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-orange-300 hover:bg-orange-400 text-stone-900 border border-orange-400 font-black text-xs transition shadow-xs cursor-pointer"
              >
                <Volume2 className="h-4 w-4 fill-stone-900" />
                Falar em Voz Alta
              </button>

              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-black border border-slate-300 transition cursor-pointer"
                title="Fechar Tela Cheia"
              >
                <Minimize2 className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Central Giant Text display */}
          <div
            className={`flex-1 flex items-center justify-center text-center p-4 transition-transform duration-300 ${
              isFlipped ? 'rotate-180' : ''
            }`}
          >
            <p
              className={`font-black tracking-tight leading-tight select-all max-w-5xl text-black ${
                settings.fontSize === 'gigante'
                  ? 'text-5xl sm:text-7xl lg:text-8xl'
                  : settings.fontSize === 'grande'
                  ? 'text-4xl sm:text-6xl lg:text-7xl'
                  : 'text-3xl sm:text-5xl lg:text-6xl'
              }`}
            >
              {text || 'Digite uma frase para exibir aqui em tamanho gigante.'}
            </p>
          </div>

          {/* Bottom Bar inside Fullscreen */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-600">
            <span>Toque na tela ou use a tecla ESC para sair</span>
            <button
              onClick={() => setIsFullscreen(false)}
              className="text-black hover:underline font-black cursor-pointer"
            >
              Voltar à digitação
            </button>
          </div>
        </div>
      )}

      {/* REGULAR VIEW */}
      <div className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-7 shadow-xs space-y-5">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
              Falar por mim
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-950 font-extrabold border border-orange-200">
                Padrão Brasileiro pt-BR (1.05x)
              </span>
            </h2>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              Digite o que deseja comunicar no campo abaixo e clique em <strong>Falar Agora</strong>.
            </p>
          </div>

          <div className="flex flex-col gap-2 shrink-0 self-start sm:self-auto">
            <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-xs font-semibold text-orange-950 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Voz Ativa: <strong className="font-black text-stone-900">{selectedVoice?.name || 'Voz Neural (Estilo ChatGPT)'}</strong></span>
              
              {onCycleVoice && (
                <button
                  type="button"
                  onClick={handleCycleVoice}
                  className="ml-1 px-2.5 py-1 rounded-lg bg-orange-300 hover:bg-orange-400 text-stone-900 border border-orange-400 font-black text-[11px] transition flex items-center gap-1 shadow-2xs cursor-pointer"
                  title="Mudar para outra voz disponível no sistema"
                >
                  <Shuffle className="h-3 w-3" />
                  <span>Trocar Voz</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleTestCurrentVoice}
                className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-300 font-black text-[11px] transition flex items-center gap-1 shadow-2xs cursor-pointer"
                title="Ouvir teste da voz ativa agora"
              >
                <Play className="h-3 w-3 fill-stone-900" />
                <span>Testar Voz</span>
              </button>
            </div>

            {/* Direct voice selector buttons if multiple Portuguese voices exist */}
            {distinctVoices.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] font-bold text-stone-500">Escolha rápida:</span>
                {distinctVoices.slice(0, 6).map((v, idx) => {
                  const isSelected = selectedVoice?.voiceURI === v.voiceURI;
                  // Clean simplified name for display
                  const displayName = v.name
                    .replace(/(Microsoft|Google|Desktop|Natural|Online|\(Natural\))/gi, '')
                    .replace(/Portuguese \(Brazil\)/gi, 'Brasil')
                    .replace(/Português \(Brasil\)/gi, 'Brasil')
                    .trim() || `Voz ${idx + 1}`;

                  return (
                    <button
                      key={v.voiceURI || idx}
                      type="button"
                      onClick={() => handleSelectVoice(v.voiceURI, v.name)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold transition border cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-orange-400 text-stone-950 border-orange-500 shadow-2xs'
                          : 'bg-white hover:bg-orange-50 text-stone-700 border-slate-300'
                      }`}
                      title={v.name}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                      <span>{displayName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Text Input Area */}
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSpeak(text);
              }
            }}
            placeholder="Digite o que você quer falar..."
            rows={5}
            autoFocus
            className={`w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-2xl p-4 text-black focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 placeholder:text-slate-400 transition resize-none leading-relaxed font-medium shadow-2xs ${
              settings.fontSize === 'gigante' ? 'text-2xl' : settings.fontSize === 'grande' ? 'text-xl' : 'text-base'
            }`}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2 text-xs text-slate-500">
            <span>{text.length} caracteres</span>
            {text && (
              <button
                type="button"
                onClick={() => setText('')}
                className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-black cursor-pointer"
                title="Limpar texto"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Action Controls DIRECTLY BELOW the text input */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2.5">
            {isSpeaking ? (
              <button
                type="button"
                onClick={cancelSpeak}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm transition shadow-sm animate-pulse cursor-pointer"
              >
                <VolumeX className="h-5 w-5" />
                <span>Parar Áudio</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSpeak(text)}
                disabled={!text.trim()}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-300 hover:bg-orange-400 text-stone-900 border border-orange-400 font-black text-sm transition shadow-sm disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <Volume2 className="h-5 w-5" />
                <span>Falar Agora</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              disabled={!text.trim()}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-stone-100 hover:bg-orange-50 text-stone-800 disabled:opacity-40 disabled:pointer-events-none text-xs font-bold transition border border-stone-300 cursor-pointer"
              title="Exibir texto em tamanho gigante para outra pessoa ler"
            >
              <Maximize2 className="h-4 w-4" />
              <span>Tela Cheia</span>
            </button>

            {text && (
              <button
                type="button"
                onClick={() => setText('')}
                className="flex items-center gap-1.5 px-3.5 py-3 rounded-2xl bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-700 text-xs font-bold transition border border-stone-300 cursor-pointer"
                title="Limpar campo de texto"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Limpar</span>
              </button>
            )}
          </div>

          <span className="text-[11px] text-stone-600 font-medium hidden sm:inline">
            Dica: pressione <kbd className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-300 font-mono text-[10px] text-stone-900 font-bold">Ctrl + Enter</kbd> para falar rapidamente
          </span>
        </div>

        {/* Active Speaking Status Banner */}
        {isSpeaking && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-orange-200/90 border border-orange-300 text-stone-950 text-xs font-bold shadow-xs animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-600 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-600"></span>
              </span>
              <span>Reproduzindo fala em voz alta pelo alto-falante (Padrão pt-BR)...</span>
            </div>
            <button
              type="button"
              onClick={cancelSpeak}
              className="px-3 py-1 bg-stone-900 text-white rounded-xl text-xs font-black hover:bg-stone-800 transition cursor-pointer"
            >
              Silenciar
            </button>
          </div>
        )}

        {/* Quick Suggestion Chips */}
        <div className="pt-2 border-t border-slate-200">
          <span className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-2">
            Frases rápidas para conversa no laboratório e aula:
          </span>
          <div className="flex flex-wrap gap-2">
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setText(chip);
                  handleSpeak(chip);
                }}
                className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-orange-100 text-stone-800 hover:text-stone-950 text-xs font-bold transition border border-stone-300 hover:border-orange-300 flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>{chip}</span>
                <Volume2 className="h-3 w-3 text-stone-500" />
              </button>
            ))}
          </div>
        </div>

        {/* History of recent spoken phrases */}
        {history.length > 0 && (
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                Histórico de falas recentes:
              </span>
              <button
                type="button"
                onClick={() => setHistory([])}
                className="text-[11px] text-slate-500 hover:text-rose-600 font-bold transition cursor-pointer"
              >
                Limpar histórico
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {history.map((phrase, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition border border-slate-200 text-xs"
                >
                  <span className="text-black font-semibold truncate flex-1">
                    {phrase}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSpeak(phrase)}
                      className="p-1.5 rounded-lg bg-orange-300 hover:bg-orange-400 text-stone-900 border border-orange-400 transition cursor-pointer"
                      title="Falar novamente"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(phrase)}
                      className="p-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 transition border border-slate-300 cursor-pointer"
                      title="Copiar texto"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
