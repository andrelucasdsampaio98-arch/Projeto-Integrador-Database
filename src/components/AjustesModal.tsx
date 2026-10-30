import React from 'react';
import { Sliders, Volume2, VolumeX, Type, Eye, RotateCcw, Check, Sparkles, X, Shuffle } from 'lucide-react';
import { AppSettings, FontSize, ContrastTheme } from '../types';

interface AjustesModalProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  speak: (text: string, onEndCallback?: () => void, overrideVoiceURI?: string) => void;
  onClose: () => void;
  voices?: SpeechSynthesisVoice[];
  selectedVoice?: SpeechSynthesisVoice | null;
  onSelectVoice?: (voiceURI: string) => void;
  isSpeaking?: boolean;
  cancelSpeak?: () => void;
  onCycleVoice?: () => SpeechSynthesisVoice | null;
}

export const AjustesModal: React.FC<AjustesModalProps> = ({
  settings,
  setSettings,
  speak,
  onClose,
  isSpeaking = false,
  cancelSpeak,
  voices = [],
  selectedVoice,
  onSelectVoice,
  onCycleVoice,
}) => {
  const distinctVoices = React.useMemo(() => {
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
        speak(`Voz alterada para ${newVoice.name}. Teste concluído.`, undefined, newVoice.voiceURI);
      }
    }
  };

  const handleSelectVoice = (uri: string, name: string) => {
    if (onSelectVoice) {
      onSelectVoice(uri);
      speak(`Voz alterada para ${name}. Teste concluído.`, undefined, uri);
    }
  };

  const handleTestVoice = () => {
    const vName = selectedVoice?.name || 'Voz Padrão';
    speak(`Olá! Esta é a voz ${vName} configurada para falar em português brasileiro a 1.05x.`, undefined, selectedVoice?.voiceURI);
  };
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: value };
      try {
        localStorage.setItem('ponte_app_settings', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleReset = () => {
    const defaultSettings: AppSettings = {
      fontSize: 'normal',
      contrastTheme: 'azul-laranja',
      voiceRate: 1.05,
      voicePitch: 1.02,
      selectedVoiceURI: '',
      vibrationEnabled: true,
      accessibleFont: false,
      screenWakeLock: false,
    };
    setSettings(defaultSettings);
    try {
      localStorage.setItem('ponte_app_settings', JSON.stringify(defaultSettings));
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white border border-slate-300 shadow-2xl p-6 sm:p-8 text-black space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-300 text-stone-900 border border-orange-400 font-black shadow-xs">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-black">Ajustes & Acessibilidade</h2>
              <p className="text-xs text-slate-600">Personalize a voz estilo ChatGPT, contraste e visualização</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-black border border-slate-300 text-xs font-bold transition"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Setting 1: Tamanho da Fonte */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
            <Type className="h-4 w-4" />
            Tamanho das Letras da Legenda
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'normal', label: 'Normal (100%)', sample: 'Aa' },
              { id: 'grande', label: 'Grande (140%)', sample: 'Aa' },
              { id: 'gigante', label: 'Gigante (180%)', sample: 'Aa' },
            ].map((size) => (
              <button
                key={size.id}
                onClick={() => updateSetting('fontSize', size.id as FontSize)}
                className={`p-3 rounded-2xl border-2 text-center transition flex flex-col items-center gap-1 ${
                  settings.fontSize === size.id
                    ? 'bg-orange-100 text-stone-900 border-orange-400 ring-2 ring-orange-400 shadow-xs'
                    : 'bg-slate-50 text-slate-800 border-slate-300 hover:border-orange-300 hover:bg-orange-50'
                }`}
              >
                <span className="text-lg font-black">{size.sample}</span>
                <span className="text-xs font-bold">{size.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Setting 2: Temas de Alto Contraste */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
            <Eye className="h-4 w-4" />
            Temas de Cor e Contraste
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'azul-laranja', label: 'Azul com Laranja (Padrão)', bg: 'bg-[#081026]', text: 'text-orange-400', border: 'border-orange-500' },
              { id: 'laranja-pastel', label: 'Laranja Pastel & Cinza', bg: 'bg-[#fff7ed]', text: 'text-stone-900', border: 'border-orange-400' },
              { id: 'preto-branco', label: 'Fundo Branco (Contraste)', bg: 'bg-white', text: 'text-black', border: 'border-slate-400' },
              { id: 'padrao', label: 'Cinza Suave Neutro', bg: 'bg-slate-50', text: 'text-slate-900', border: 'border-slate-300' },
              { id: 'amarelo-preto', label: 'Amarelo no Preto', bg: 'bg-black', text: 'text-yellow-300', border: 'border-yellow-400' },
              { id: 'azul-ciano', label: 'Azul & Ciano', bg: 'bg-slate-900', text: 'text-cyan-300', border: 'border-cyan-500' },
            ].map((theme) => (
              <button
                key={theme.id}
                onClick={() => updateSetting('contrastTheme', theme.id as ContrastTheme)}
                className={`p-2.5 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                  settings.contrastTheme === theme.id
                    ? 'ring-2 ring-orange-400 border-orange-400 shadow-sm'
                    : 'border-slate-300 hover:border-orange-300'
                } ${theme.bg}`}
              >
                <div className={`w-full h-4 rounded mb-2 ${theme.border} border`} />
                <span className={`text-[11px] font-black ${theme.text}`}>{theme.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Setting 3: VOZ PADRÃO BRASILEIRO (1.05x) */}
        <div className="space-y-3 p-4 rounded-2xl bg-orange-50 border border-orange-300">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-stone-950 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-orange-600" />
              Voz Padrão Brasileiro (pt-BR)
            </label>
            <span className="text-[11px] font-black text-orange-950 bg-orange-200 px-2.5 py-0.5 rounded-full border border-orange-300">
              1.05x Automático
            </span>
          </div>

          <p className="text-xs text-stone-700 leading-relaxed">
            Voz ativa no momento: <strong className="font-black text-stone-900">{selectedVoice?.name || 'Voz Neural Conversacional'}</strong>.
          </p>

          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
            <span className="text-xs font-bold text-stone-800">
              Idioma: Português do Brasil • Ritmo: 1.05x
            </span>

            <div className="flex items-center gap-2">
              {onCycleVoice && (
                <button
                  type="button"
                  onClick={handleCycleVoice}
                  className="text-xs text-stone-900 bg-stone-100 hover:bg-orange-100 font-black flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-300 shadow-2xs transition cursor-pointer"
                  title="Trocar para a próxima voz disponível"
                >
                  <Shuffle className="h-3.5 w-3.5" /> Outra Voz
                </button>
              )}

              {isSpeaking ? (
                <button
                  type="button"
                  onClick={cancelSpeak}
                  className="text-xs text-white bg-rose-600 hover:bg-rose-500 font-black flex items-center gap-1.5 px-3 py-1.5 rounded-xl shadow-2xs transition animate-pulse cursor-pointer"
                >
                  <VolumeX className="h-3.5 w-3.5" /> Parar Áudio
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleTestVoice}
                  className="text-xs text-stone-900 bg-orange-300 hover:bg-orange-400 font-black flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-orange-400 shadow-2xs transition cursor-pointer"
                >
                  <Volume2 className="h-3.5 w-3.5" /> Testar Voz
                </button>
              )}
            </div>
          </div>

          {/* Quick selectable voices if multiple available */}
          {distinctVoices.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-orange-200/80">
              <span className="text-[11px] font-bold text-stone-600">Troca rápida:</span>
              {distinctVoices.slice(0, 6).map((v, idx) => {
                const isSelected = selectedVoice?.voiceURI === v.voiceURI;
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
                        : 'bg-white hover:bg-orange-100 text-stone-700 border-stone-300'
                    }`}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    <span>{displayName}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Setting 4: Tipografia Inclusiva (Atkinson Hyperlegible) */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-300">
          <div>
            <strong className="text-xs font-black text-black block">Fonte Atkinson Hyperlegible</strong>
            <p className="text-[11px] text-slate-600">
              Desenvolvida pelo Braille Institute para diferenciar letras facilmente e reduzir confusão visual.
            </p>
          </div>
          <button
            onClick={() => updateSetting('accessibleFont', !settings.accessibleFont)}
            className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
              settings.accessibleFont ? 'bg-black' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform shadow-xs ${
                settings.accessibleFont ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Setting 5: Vibração Háptica */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-300">
          <div>
            <strong className="text-xs font-black text-black block">Vibração Háptica ao Tocar</strong>
            <p className="text-[11px] text-slate-600">
              Vibra o celular ao confirmar toques em frases e botões de ação.
            </p>
          </div>
          <button
            onClick={() => updateSetting('vibrationEnabled', !settings.vibrationEnabled)}
            className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
              settings.vibrationEnabled ? 'bg-black' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform shadow-xs ${
                settings.vibrationEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <button
            onClick={handleReset}
            className="text-xs text-slate-600 hover:text-rose-600 font-bold flex items-center gap-1 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restaurar Padrões
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-orange-300 hover:bg-orange-400 text-stone-900 border border-orange-400 font-black text-xs transition shadow-xs"
          >
            Salvar e Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
