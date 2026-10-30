import React, { useState } from 'react';
import { Search, Monitor, Smartphone, Video, Presentation, ExternalLink, Copy, Check, ChevronDown, ChevronUp, Sparkles, BookOpen, Layers } from 'lucide-react';
import { SystemSolutionGuide } from '../types';

const GUIDES: SystemSolutionGuide[] = [
  {
    id: 'win-live-captions',
    title: 'Legendas ao Vivo do Windows 11 (Live Captions)',
    category: 'windows',
    shortDesc: 'Legenda em tempo real qualquer áudio reproduzido no PC ou captado pelo microfone do professor.',
    shortcut: 'Win + Ctrl + L',
    badge: 'Nativo no Windows 11',
    requirements: 'Windows 11 (versão 22H2 ou superior). Funciona 100% offline após baixar o pacote de idioma.',
    iconName: 'Monitor',
    steps: [
      'Pressione o atalho de teclado: Win + Ctrl + L (tecla Windows + Control + letra L).',
      'Na primeira vez que abrir, clique em "Concordo" e aguarde o download rápido do pacote de idiomas Português (Brasil).',
      'Uma barra de legendas se fixará no topo ou rodapé da tela.',
      'Clique na engrenagem (Configurações) da barra para: escolher posição (topo/base/janela flutuante), tamanho do texto e incluir áudio do microfone.',
      'Pronto! Qualquer vídeo no YouTube, reunião online ou fala captada no microfone da sala será legendada instantaneamente.'
    ],
    labTip: 'Excelente para os computadores do laboratório da escola, pois não consome internet após instalado e legenda todas as aulas em vídeo.'
  },
  {
    id: 'win-visual-alerts',
    title: 'Alertas Visuais do Sistema (Piscar Tela ao invés de Som)',
    category: 'windows',
    shortDesc: 'Substitui avisos sonoros (erros, notificações de sistema) pelo piscar visual da tela ou da barra de tarefas.',
    shortcut: 'Configurações > Acessibilidade > Áudio',
    badge: 'Windows & Android',
    requirements: 'Disponível nativamente no Windows 10, Windows 11 e na maioria dos celulares Android/iOS.',
    iconName: 'Monitor',
    steps: [
      'No Windows: Abra "Configurações" (Win + I) e selecione a aba "Acessibilidade".',
      'Clique em "Áudio" e procure pela opção "Piscar minha tela durante notificações de áudio".',
      'Selecione uma opção: "Piscar a barra de título da janela ativa", "Piscar a janela ativa" ou "Piscar a tela inteira".',
      'No Celular Android: Acesse Configurações > Acessibilidade > Notificação com flash (Flash da tela ou da câmera).',
      'No iPhone (iOS): Ajustes > Acessibilidade > Áudio/Visual > Piscar Flash para Alertas.'
    ],
    labTip: 'Evita que o aluno surdo perca avisos de erro de compilação, download concluído ou notificações de horário do laboratório.'
  },
  {
    id: 'vlibras-suite',
    title: 'VLibras (Suite Oficial do Governo Federal Brasileiro)',
    category: 'libras',
    shortDesc: 'Tradutor digital para Libras com avatares 3D (Ícaro e Hozana) para navegador web e desktop.',
    shortcut: 'Extensão Web & App Desktop',
    badge: 'Gratuito / Código Aberto',
    requirements: 'Computador Windows ou navegador Chrome, Edge ou Firefox.',
    iconName: 'Layers',
    steps: [
      'Acesse o site oficial: https://www.vlibras.gov.br/.',
      'Para Web: Instale a extensão "VLibras" na Chrome Web Store.',
      'Após instalar, um ícone azul de Libras aparecerá na lateral direita de qualquer página na internet.',
      'Basta clicar no texto ou selecionar uma frase para o avatar 3D traduzir imediatamente em sinais.',
      'Para o Computador Todo (fora do navegador): Baixe o software "VLibras Desktop" no site oficial para traduzir documentos e telas.'
    ],
    labTip: 'Recomenda-se pré-instalar a extensão do VLibras em todas as máquinas do laboratório de informática da escola.'
  },
  {
    id: 'hand-talk-app',
    title: 'Hand Talk (App Mobile com o Avatar Hugo)',
    category: 'libras',
    shortDesc: 'Aplicativo premiado para smartphone que traduz texto e voz para Libras usando o bonequinho 3D Hugo.',
    shortcut: 'Android & iOS',
    badge: 'App para Celular',
    requirements: 'Smartphone Android ou iPhone.',
    iconName: 'Smartphone',
    steps: [
      'No celular do aluno, abra a Google Play Store (Android) ou App Store (iPhone) e pesquise por "Hand Talk".',
      'Instale e abra o aplicativo.',
      'O avatar Hugo aparecerá na tela central.',
      'Digite uma palavra/frase ou toque no microfone para falar: o Hugo realiza a tradução em sinais 3D.',
      'Dica: É possível girar o bonequinho em 360°, dar zoom nas mãos e controlar a velocidade dos sinais.'
    ],
    labTip: 'O aluno pode deixar o celular com o Hand Talk aberto ao lado do teclado do laboratório para consultas rápidas durante as aulas.'
  },
  {
    id: 'google-live-transcribe',
    title: 'Transcrição Instantânea do Google (Live Transcribe)',
    category: 'android',
    shortDesc: 'Transcrição de fala em texto em tempo real de altíssima precisão no celular, desenvolvida com a Universidade Gallaudet.',
    shortcut: 'Configurações > Acessibilidade',
    badge: 'Google / Android',
    requirements: 'Dispositivos Android (já vem pré-instalado em muitos aparelhos Samsung, Motorola e Pixel).',
    iconName: 'Smartphone',
    steps: [
      'Abra as "Configurações" do celular e vá em "Acessibilidade".',
      'Toque em "Transcrição Instantânea" (ou baixe na Play Store caso não tenha).',
      'Ative o "Atalho da Transcrição Instantânea" (botão flutuante na tela).',
      'Quando o professor estiver explicando a matéria, toque no atalho: o celular transcreve a fala continuamente em letras grandes.',
      'O app também avisa vibrações de sons do ambiente (ex: palmas, campainha, risos, cachorro latindo).'
    ],
    labTip: 'Pode salvar o histórico de transcrições das aulas por até 3 dias para o aluno estudar em casa.'
  },
  {
    id: 'meet-captions',
    title: 'Legendas Automáticas no Google Meet',
    category: 'videochamada',
    shortDesc: 'Ativação de legendas em tempo real em português nas aulas remotas ou híbridas do Google Meet.',
    shortcut: 'Atalho: Tecla C',
    badge: 'Google Meet',
    requirements: 'Acesso pelo navegador Chrome, Edge ou app do Google Meet.',
    iconName: 'Video',
    steps: [
      'Durante uma chamada ou aula online, passe o mouse na barra inferior de controles.',
      'Clique no botão com o ícone "CC" (Ativar legendas) ou simplesmente pressione a tecla "C" no teclado.',
      'Para garantir o idioma Português: Clique nos 3 pontos (...) > Configurações > Legendas.',
      'Selecione o idioma "Português (Brasil)".',
      'As falas do professor e colegas aparecerão na parte inferior do vídeo com o nome de quem falou.'
    ],
    labTip: 'Para o aluno surdo, configure o layout em tela cheia e ative a fixação na tela do intérprete ou professor.'
  },
  {
    id: 'teams-captions',
    title: 'Legendas ao Vivo no Microsoft Teams',
    category: 'videochamada',
    shortDesc: 'Legendas ao vivo com identificação do interlocutor em reuniões e aulas no Microsoft Teams.',
    shortcut: 'Mais ações (...) > Idioma e fala',
    badge: 'Microsoft Teams',
    requirements: 'Microsoft Teams para Windows, Mac ou Navegador.',
    iconName: 'Video',
    steps: [
      'Na barra de controles da reunião, clique no botão "Mais ações" (ícone dos 3 pontinhos ...).',
      'Selecione "Idioma e fala" > "Ativar legendas ao vivo".',
      'Na barra de legendas que aparece, clique no ícone de configurações e selecione o idioma falado como "Português (Brasil)".',
      'Você pode personalizar o tamanho da fonte, a cor do texto e a quantidade de linhas exibidas.'
    ],
    labTip: 'O Teams também permite ativar a "Transcrição da Reunião", gerando um arquivo de texto completo da aula para download.'
  },
  {
    id: 'powerpoint-subtitles',
    title: 'Legendas em Tempo Real no Microsoft PowerPoint',
    category: 'apresentacao',
    shortDesc: 'O microfone do professor capta a explicação e projeta legendas automáticas abaixo dos slides da aula.',
    shortcut: 'Guia Apresentação de Slides',
    badge: 'Apresentação em Sala',
    requirements: 'Microsoft 365 / PowerPoint com conexão à internet.',
    iconName: 'Presentation',
    steps: [
      'No PowerPoint do professor, abra a apresentação de slides.',
      'Clique na guia superior "Apresentação de Slides".',
      'Marque a caixa "Sempre Usar Legendas".',
      'Em "Configurações de Legendas", defina: Idioma Falado (Português do Brasil) e Idioma da Legenda (Português do Brasil).',
      'Em "Posição", selecione "Abaixo do Slide (Sobreposto)" ou "Acima do Slide".',
      'Inicie a apresentação (F5): tudo que o professor falar no microfone será projetado como legenda gigante para toda a turma.'
    ],
    labTip: 'Ideal para o professor do laboratório adotar nas aulas práticas, beneficiando alunos surdos e toda a classe em ambientes com ruído de computadores.'
  }
];

export const SolucoesSistema: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [expandedId, setExpandedId] = useState<string | null>('win-live-captions');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredGuides = GUIDES.filter((guide) => {
    const matchesSearch =
      guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guide.shortDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guide.steps.some((step) => step.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'todos' ? true : guide.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopySteps = (guide: SystemSolutionGuide) => {
    const text = `${guide.title}\nAtalho: ${guide.shortcut || 'N/A'}\n\nPasso a passo:\n${guide.steps
      .map((s, i) => `${i + 1}. ${s}`)
      .join('\n')}\n\nDica para o laboratório:\n${guide.labTip}`;
    navigator.clipboard.writeText(text);
    setCopiedId(guide.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-black text-black flex items-center gap-2">
              Soluções de sistema
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-black font-extrabold border border-slate-300">
                Guia de Configuração para Laboratórios
              </span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Passo a passo completo dos 8 principais recursos e softwares de acessibilidade para computadores e celulares da escola.
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por recurso (ex: Windows, Meet, Teams, VLibras, Alerta)..."
              className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-black rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-black focus:outline-none placeholder:text-slate-400 transition"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'todos', label: 'Todos (8)' },
              { id: 'windows', label: 'Windows 11' },
              { id: 'libras', label: 'Libras (VLibras / Hugo)' },
              { id: 'android', label: 'Android' },
              { id: 'videochamada', label: 'Meet & Teams' },
              { id: 'apresentacao', label: 'PowerPoint' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                  selectedCategory === cat.id
                    ? 'bg-orange-300 text-stone-900 border-orange-400 font-black shadow-2xs'
                    : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-orange-50 hover:text-stone-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Guides Accordion List */}
        <div className="space-y-3">
          {filteredGuides.map((guide) => {
            const isExpanded = expandedId === guide.id;
            const isCopied = copiedId === guide.id;

            return (
              <div
                key={guide.id}
                className="rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden transition"
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : guide.id)}
                  className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-blue-50/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 border border-blue-200 shadow-xs">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">{guide.title}</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200 shadow-xs">
                          {guide.badge}
                        </span>
                        {guide.shortcut && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            {guide.shortcut}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{guide.shortDesc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopySteps(guide);
                      }}
                      title="Copiar guia completo"
                      className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition shadow-xs"
                    >
                      {isCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <div className="p-2 text-slate-500">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Step-by-Step Body */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-slate-200 bg-white space-y-4 text-xs">
                    <div>
                      <span className="font-bold text-slate-600 uppercase text-[10px] tracking-wider block mb-1">
                        Requisitos do Sistema:
                      </span>
                      <p className="text-slate-800">{guide.requirements}</p>
                    </div>

                    <div>
                      <span className="font-bold text-blue-700 uppercase text-[10px] tracking-wider block mb-2">
                        Passo a Passo de Configuração:
                      </span>
                      <ol className="space-y-2">
                        {guide.steps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-slate-800 leading-relaxed">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-black text-[11px] border border-blue-200 mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Lab Pro-Tip Box */}
                    <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                      <strong className="block text-[11px] font-bold text-blue-950 mb-0.5">
                        💡 Aplicação Prática no Projeto Integrador / Laboratório:
                      </strong>
                      <p className="text-[11px] leading-relaxed">{guide.labTip}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
