import React, { useState, useEffect } from 'react';
import { Volume2, Maximize2, Plus, Trash2, AlertTriangle, BookOpen, MessageSquare, Wrench, ShieldAlert, Sparkles, Check } from 'lucide-react';
import { QuickPhrase, AppSettings } from '../types';

interface FrasesRapidasProps {
  speak: (text: string) => void;
  settings: AppSettings;
}

const DEFAULT_PHRASES: QuickPhrase[] = [
  // BÁSICO
  { id: 'b1', category: 'basico', text: 'Olá! Bom dia!', iconName: 'MessageSquare' },
  { id: 'b2', category: 'basico', text: 'Boa tarde!', iconName: 'MessageSquare' },
  { id: 'b3', category: 'basico', text: 'Sim, concordo.', iconName: 'Check' },
  { id: 'b4', category: 'basico', text: 'Não, obrigado.', iconName: 'MessageSquare' },
  { id: 'b5', category: 'basico', text: 'Por favor.', iconName: 'MessageSquare' },
  { id: 'b6', category: 'basico', text: 'Muito obrigado(a)!', iconName: 'MessageSquare' },
  { id: 'b7', category: 'basico', text: 'Com licença.', iconName: 'MessageSquare' },
  { id: 'b8', category: 'basico', text: 'Até logo!', iconName: 'MessageSquare' },

  // AULA / LABORATÓRIO
  { id: 'a1', category: 'aula', text: 'Preciso de ajuda com o código.', iconName: 'BookOpen' },
  { id: 'a2', category: 'aula', text: 'Pode repetir a explicação mais devagar?', iconName: 'BookOpen' },
  { id: 'a3', category: 'aula', text: 'Qual é o próximo passo da atividade?', iconName: 'BookOpen' },
  { id: 'a4', category: 'aula', text: 'Onde devo salvar os arquivos do projeto?', iconName: 'BookOpen' },
  { id: 'a5', category: 'aula', text: 'Terminei a tarefa de hoje!', iconName: 'Check' },
  { id: 'a6', category: 'aula', text: 'Não entendi essa parte, pode me mostrar na tela?', iconName: 'BookOpen' },
  { id: 'a7', category: 'aula', text: 'Posso fazer o exercício em dupla com você?', iconName: 'BookOpen' },
  { id: 'a8', category: 'aula', text: 'Pode escrever a instrução no chat ou no bloco de notas?', iconName: 'BookOpen' },

  // SUPORTE TÉCNICO
  { id: 's1', category: 'suporte', text: 'O computador travou totalmente.', iconName: 'Wrench' },
  { id: 's2', category: 'suporte', text: 'A internet / rede Wi-Fi caiu.', iconName: 'Wrench' },
  { id: 's3', category: 'suporte', text: 'O teclado ou mouse não estão funcionando.', iconName: 'Wrench' },
  { id: 's4', category: 'suporte', text: 'Não consigo fazer login com a minha senha.', iconName: 'Wrench' },
  { id: 's5', category: 'suporte', text: 'O cabo de rede ou monitor parece desconectado.', iconName: 'Wrench' },
  { id: 's6', category: 'suporte', text: 'Falta instalar o software necessário no meu computador.', iconName: 'Wrench' },
  { id: 's7', category: 'suporte', text: 'O monitor está sem sinal ou desligando.', iconName: 'Wrench' },
  { id: 's8', category: 'suporte', text: 'O programa fechou e perdi as alterações.', iconName: 'Wrench' },

  // URGÊNCIA (Highlighted in RED!)
  { id: 'u1', category: 'urgencia', text: 'Preciso ir ao banheiro com urgência!', iconName: 'AlertTriangle' },
  { id: 'u2', category: 'urgencia', text: 'Estou passando mal, preciso de auxílio!', iconName: 'AlertTriangle' },
  { id: 'u3', category: 'urgencia', text: 'Emergência! Alguém me ajude, por favor!', iconName: 'AlertTriangle' },
  { id: 'u4', category: 'urgencia', text: 'Preciso falar com a coordenação ou enfermaria.', iconName: 'AlertTriangle' },
  { id: 'u5', category: 'urgencia', text: 'Estou sentindo dor de cabeça forte.', iconName: 'AlertTriangle' },
  { id: 'u6', category: 'urgencia', text: 'Preciso tomar meu remédio agora.', iconName: 'AlertTriangle' },
];

export const FrasesRapidas: React.FC<FrasesRapidasProps> = ({ speak, settings }) => {
  const [selectedCategory, setSelectedCategory] = useState<'todos' | 'basico' | 'aula' | 'suporte' | 'urgencia'>('todos');
  const [phrases, setPhrases] = useState<QuickPhrase[]>(() => {
    try {
      const saved = localStorage.getItem('ponte_custom_phrases');
      if (saved) {
        const parsed = JSON.parse(saved);
        return [...DEFAULT_PHRASES, ...parsed];
      }
    } catch {
      // fallback
    }
    return DEFAULT_PHRASES;
  });

  const [fullscreenPhrase, setFullscreenPhrase] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPhraseText, setNewPhraseText] = useState('');
  const [newPhraseCategory, setNewPhraseCategory] = useState<'basico' | 'aula' | 'suporte' | 'urgencia'>('aula');
  const [recentlyPlayedId, setRecentlyPlayedId] = useState<string | null>(null);

  const handlePhraseClick = (phrase: QuickPhrase) => {
    setRecentlyPlayedId(phrase.id);
    speak(phrase.text);
    setTimeout(() => setRecentlyPlayedId(null), 1500);
  };

  const handleAddPhrase = () => {
    if (!newPhraseText.trim()) return;
    const newPhrase: QuickPhrase = {
      id: 'custom_' + Date.now(),
      category: newPhraseCategory,
      text: newPhraseText.trim(),
      iconName: 'Sparkles',
      isCustom: true,
    };

    const updated = [...phrases, newPhrase];
    setPhrases(updated);

    // Save custom phrases
    try {
      const customs = updated.filter((p) => p.isCustom);
      localStorage.setItem('ponte_custom_phrases', JSON.stringify(customs));
    } catch {
      // ignore
    }

    setNewPhraseText('');
    setShowAddModal(false);
  };

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = phrases.filter((p) => p.id !== id);
    setPhrases(updated);
    try {
      const customs = updated.filter((p) => p.isCustom);
      localStorage.setItem('ponte_custom_phrases', JSON.stringify(customs));
    } catch {
      // ignore
    }
  };

  const filteredPhrases = phrases.filter((p) =>
    selectedCategory === 'todos' ? true : p.category === selectedCategory
  );

  return (
    <div className="space-y-6">
      {/* Fullscreen Overlay for single phrase */}
      {fullscreenPhrase && (
        <div
          onClick={() => setFullscreenPhrase(null)}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-8 text-center cursor-pointer ${
            settings.contrastTheme === 'amarelo-preto'
              ? 'bg-black text-yellow-300'
              : 'bg-white text-black'
          }`}
        >
          <div className="max-w-4xl space-y-6">
            <span className="text-xs uppercase font-extrabold tracking-widest px-3 py-1 rounded-full bg-slate-100 text-black border border-slate-300">
              Toque em qualquer lugar para fechar
            </span>
            <p className="text-4xl sm:text-7xl font-black leading-tight select-none text-black">
              {fullscreenPhrase}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                speak(fullscreenPhrase);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-black text-white font-black text-sm hover:bg-slate-800 transition shadow-lg"
            >
              <Volume2 className="h-5 w-5 fill-white" />
              Repetir em Voz Alta
            </button>
          </div>
        </div>
      )}

      {/* Main Header & Category Tabs */}
      <div className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
              Frases rápidas
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-950 font-extrabold border border-orange-200">
                Prancha CAA de 1 Toque
              </span>
            </h2>
            <p className="text-xs text-stone-600 mt-0.5">
              Toque em qualquer botão para o aparelho falar em voz alta instantaneamente. As frases de urgência estão em destaque vermelho.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-300 hover:bg-orange-400 text-stone-900 border border-orange-400 font-black text-xs transition shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Adicionar Frase
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('todos')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              selectedCategory === 'todos'
                ? 'bg-orange-300 text-stone-900 border-orange-400 shadow-xs font-black'
                : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-orange-50 hover:text-stone-900'
            }`}
          >
            Todas as Frases ({phrases.length})
          </button>

          <button
            onClick={() => setSelectedCategory('basico')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              selectedCategory === 'basico'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Básico / Social
          </button>

          <button
            onClick={() => setSelectedCategory('aula')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              selectedCategory === 'aula'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Aula & Laboratório
          </button>

          <button
            onClick={() => setSelectedCategory('suporte')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              selectedCategory === 'suporte'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
            Suporte Técnico
          </button>

          {/* URGÊNCIA (RED HIGHLIGHT BUTTON) */}
          <button
            onClick={() => setSelectedCategory('urgencia')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 border ${
              selectedCategory === 'urgencia'
                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
            Urgência & Emergência 🚨
          </button>
        </div>

        {/* Phrases Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredPhrases.map((phrase) => {
            const isUrgencia = phrase.category === 'urgencia';
            const isRecentlyPlayed = recentlyPlayedId === phrase.id;

            return (
              <div
                key={phrase.id}
                onClick={() => handlePhraseClick(phrase)}
                className={`group relative p-4 rounded-2xl cursor-pointer transition transform active:scale-95 flex flex-col justify-between border ${
                  isUrgencia
                    ? 'bg-rose-50 hover:bg-rose-100/70 border-rose-300 shadow-xs'
                    : 'bg-slate-50 hover:bg-blue-50/50 border-slate-200 hover:border-blue-300 shadow-xs'
                } ${isRecentlyPlayed ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      isUrgencia
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : phrase.category === 'suporte'
                        ? 'bg-amber-100 text-amber-900 border-amber-200'
                        : phrase.category === 'aula'
                        ? 'bg-indigo-100 text-indigo-900 border-indigo-200'
                        : 'bg-blue-100 text-blue-900 border-blue-200'
                    }`}
                  >
                    {phrase.category}
                  </span>

                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFullscreenPhrase(phrase.text);
                      }}
                      title="Exibir em tela cheia"
                      className="p-1 rounded-md hover:bg-white text-slate-500 hover:text-slate-900 shadow-xs"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                    {phrase.isCustom && (
                      <button
                        onClick={(e) => handleDeleteCustom(phrase.id, e)}
                        title="Excluir frase personalizada"
                        className="p-1 rounded-md hover:bg-rose-100 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p
                  className={`font-black leading-snug ${
                    isUrgencia
                      ? 'text-rose-950 text-sm sm:text-base'
                      : 'text-slate-900 text-sm'
                  }`}
                >
                  {phrase.text}
                </p>

                <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-200/80 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 text-blue-600 font-bold group-hover:underline">
                    <Volume2 className="h-3.5 w-3.5" />
                    {isRecentlyPlayed ? 'Falando...' : 'Falar'}
                  </span>
                  <span className="text-slate-400">1 toque</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Phrase Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-slate-900">Criar Nova Frase Rápida</h3>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Texto da Frase
              </label>
              <input
                type="text"
                value={newPhraseText}
                onChange={(e) => setNewPhraseText(e.target.value)}
                placeholder="Ex: Preciso sair 10 minutos mais cedo..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-medium text-sm focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Categoria
              </label>
              <select
                value={newPhraseCategory}
                onChange={(e) => setNewPhraseCategory(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white"
              >
                <option value="aula">Aula & Laboratório</option>
                <option value="basico">Básico / Social</option>
                <option value="suporte">Suporte Técnico</option>
                <option value="urgencia">Urgência / Emergência</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddPhrase}
                disabled={!newPhraseText.trim()}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition disabled:opacity-40"
              >
                Salvar Frase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
