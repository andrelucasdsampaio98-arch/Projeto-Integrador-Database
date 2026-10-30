/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Volume2, 
  Mic, 
  MessageSquare, 
  Layers, 
  Wifi, 
  Sliders, 
  Info,
  CheckCircle2,
  ExternalLink,
  Laptop,
  GraduationCap,
  BookOpen,
  UserCheck,
  ShieldCheck,
  Check,
  LogIn,
  LogOut,
  User,
  Key,
  UserPlus,
  Database
} from 'lucide-react';

import { ActiveTab, AppSettings, UserRole, UserAccount, VoiceSpeechStyle } from './types';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { getCurrentUser, setCurrentUser as setStoredCurrentUser } from './data/authUsersData';
import { AuthPortalModal } from './components/AuthPortalModal';
import { 
  firebaseGetCurrentUserProfile, 
  firebaseSignOut,
  testConnection 
} from './lib/firebase';

import { SistemaEstudo } from './components/SistemaEstudo';
import { FalarPorMim } from './components/FalarPorMim';
import { OuvirLegendar } from './components/OuvirLegendar';
import { FrasesRapidas } from './components/FrasesRapidas';
import { SolucoesSistema } from './components/SolucoesSistema';
import { AcessoPorIP } from './components/AcessoPorIP';
import { AjustesModal } from './components/AjustesModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { RobotMascot } from './components/RobotMascot';

const INITIAL_SETTINGS: AppSettings = {
  fontSize: 'normal',
  contrastTheme: 'azul-laranja',
  voiceRate: 1.05,
  voicePitch: 1.02,
  selectedVoiceURI: '',
  vibrationEnabled: true,
  accessibleFont: false,
  screenWakeLock: false,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('estudos');
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Authenticated user session
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    return getCurrentUser();
  });

  // Separate Role Access: 'aluno' | 'professor'
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const user = getCurrentUser();
    if (user) return user.role;
    try {
      const saved = localStorage.getItem('ponte_sistema_estudo_role');
      if (saved === 'aluno' || saved === 'professor') return saved;
    } catch {
      // fallback
    }
    return 'aluno';
  });

  // If no user is logged in, show auth modal on initial access
  useEffect(() => {
    if (!currentUser) {
      setShowAuthModal(true);
    }
  }, []);

  // Check Firebase session and connectivity on startup
  useEffect(() => {
    testConnection();
    firebaseGetCurrentUserProfile().then((profile) => {
      if (profile) {
        setCurrentUser(profile);
        setUserRole(profile.role);
        setShowAuthModal(false);
      }
    });
  }, []);

  const handleSuccessLogin = (user: UserAccount) => {
    setCurrentUser(user);
    setUserRole(user.role);
    setShowAuthModal(false);
    setActiveTab('estudos');
  };

  const handleLogout = async () => {
    await firebaseSignOut();
    setStoredCurrentUser(null);
    setCurrentUser(null);
    setShowAuthModal(true);
  };

  const handleSwitchRole = (newRole: UserRole) => {
    setUserRole(newRole);
    try {
      localStorage.setItem('ponte_sistema_estudo_role', newRole);
    } catch {}
    if (!currentUser || currentUser.role !== newRole) {
      setShowAuthModal(true);
    } else {
      setActiveTab('estudos');
    }
  };

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('ponte_app_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        const updated: AppSettings = { 
          ...INITIAL_SETTINGS, 
          ...parsed, 
          selectedVoiceURI: parsed.selectedVoiceURI || '',
          contrastTheme: 'azul-laranja' 
        };
        localStorage.setItem('ponte_app_settings', JSON.stringify(updated));
        return updated;
      }
    } catch {
      // fallback
    }
    return { ...INITIAL_SETTINGS, contrastTheme: 'azul-laranja' };
  });

  // Ensure azul-laranja is persisted on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ponte_app_settings');
      const parsed = saved ? JSON.parse(saved) : {};
      localStorage.setItem('ponte_app_settings', JSON.stringify({ ...parsed, contrastTheme: 'azul-laranja' }));
    } catch {}
  }, []);

  // Apply theme & font to body classes and attributes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const body = document.body;
      body.setAttribute('data-theme', settings.contrastTheme);
      if (settings.contrastTheme === 'azul-laranja') {
        body.style.backgroundColor = '#081026';
        body.style.color = '#f1f5f9';
      } else if (settings.contrastTheme === 'amarelo-preto') {
        body.style.backgroundColor = '#000000';
        body.style.color = '#fde047';
      } else if (settings.contrastTheme === 'azul-ciano') {
        body.style.backgroundColor = '#0f172a';
        body.style.color = '#67e8f9';
      } else if (settings.contrastTheme === 'preto-branco') {
        body.style.backgroundColor = '#ffffff';
        body.style.color = '#000000';
      } else {
        body.style.backgroundColor = '#f9f8f6';
        body.style.color = '#292524';
      }

      if (settings.accessibleFont) {
        body.classList.add('font-accessible');
      } else {
        body.classList.remove('font-accessible');
      }
    }
  }, [settings.contrastTheme, settings.accessibleFont]);

  const handleVoiceAutoSelect = useCallback((uri: string) => {
    setSettings((prev) => {
      if (prev.selectedVoiceURI === uri) return prev;
      const updated = { ...prev, selectedVoiceURI: uri };
      try {
        localStorage.setItem('ponte_app_settings', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const handleUpdateSpeechStyle = useCallback((style: VoiceSpeechStyle, rate: number, pitch: number) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        voiceStyle: style,
        voiceRate: rate,
        voicePitch: pitch,
      };
      try {
        localStorage.setItem('ponte_app_settings', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Speech Synthesis Hook
  const {
    isSupported: isTtsSupported,
    isSpeaking,
    voices,
    ptVoices,
    selectedVoice,
    selectVoiceByURI,
    setChatGptPersona,
    cycleNextVoice,
    speak,
    cancel: cancelSpeak,
  } = useSpeechSynthesis({
    rate: settings.voiceRate,
    pitch: settings.voicePitch,
    voiceURI: settings.selectedVoiceURI,
    onVoiceAutoSelect: handleVoiceAutoSelect,
  });

  // Speech Recognition Hook
  const {
    isSupported: isSttSupported,
    isListening,
    transcript,
    interimTranscript,
    errorMessage: sttError,
    isSecureOrigin,
    antiRepeatEnabled,
    setAntiRepeatEnabled,
    strictMode,
    setStrictMode,
    duplicatesCount,
    startListening,
    stopListening,
    clearTranscript,
    optimizeTranscript,
  } = useSpeechRecognition();

  // Tab definitions customized by active role
  const tabs = [
    { 
      id: 'estudos', 
      label: userRole === 'professor' ? 'Painel Professor (Aulas & MP3)' : 'Aulas & PDFs (Aluno)', 
      icon: userRole === 'professor' ? BookOpen : GraduationCap, 
      color: 'text-black', 
      badge: userRole === 'professor' ? 'Docente' : 'Estudo' 
    },
    { id: 'falar', label: 'Falar por mim', icon: Volume2, color: 'text-cyan-400' },
    { id: 'ouvir', label: 'Ouvir e legendar', icon: Mic, color: 'text-emerald-400', badge: isListening ? 'Ouvindo' : undefined },
    { id: 'frases', label: 'Frases rápidas', icon: MessageSquare, color: 'text-purple-400' },
    { id: 'solucoes', label: 'Soluções de sistema', icon: Layers, color: 'text-blue-400' },
    { id: 'rede', label: 'Acesso por IP', icon: Wifi, color: 'text-sky-400' },
  ];

  // Dynamic contrast theme styling wrapper
  const isDarkBlueOrange = settings.contrastTheme === 'azul-laranja';

  const getThemeWrapperClass = () => {
    switch (settings.contrastTheme) {
      case 'azul-laranja':
        return 'bg-[#081026] text-slate-100 min-h-screen theme-azul-laranja';
      case 'amarelo-preto':
        return 'bg-black text-yellow-300 min-h-screen';
      case 'azul-ciano':
        return 'bg-slate-900 text-cyan-100 min-h-screen';
      case 'preto-branco':
        return 'bg-white text-black min-h-screen';
      case 'laranja-pastel':
      case 'padrao':
      default:
        return 'bg-[#f9f8f6] text-stone-800 min-h-screen';
    }
  };

  return (
    <div className={getThemeWrapperClass()} data-theme={settings.contrastTheme}>
      {/* Top Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-md shadow-xs ${
        isDarkBlueOrange
          ? 'bg-[#0d1938]/95 border-b border-orange-500/30'
          : 'bg-[#f9f8f6]/95 border-b border-orange-200/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm transition-transform hover:scale-105 ${
              isDarkBlueOrange
                ? 'bg-[#0a1226] border border-orange-500/50 shadow-orange-500/10'
                : 'bg-orange-100 border border-orange-300 shadow-orange-500/10'
            }`} title="Mascote Comunica Acessível">
              <RobotMascot className="h-7 w-7 drop-shadow-xs" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-base sm:text-lg font-black tracking-tight ${
                  isDarkBlueOrange ? 'text-orange-400' : 'text-orange-600'
                }`}>
                  Comunica Acessível
                </h1>
              </div>
              <p className={`text-[11px] hidden sm:block font-medium ${
                isDarkBlueOrange ? 'text-slate-400' : 'text-stone-600'
              }`}>
                Projeto Integrador &bull; Acessibilidade para Alunos Surdos e Mudos
              </p>
            </div>
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Authenticated User & Portal Button */}
            {currentUser ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition border shadow-xs ${
                    userRole === 'professor'
                      ? isDarkBlueOrange
                        ? 'bg-orange-500 hover:bg-orange-600 text-slate-950 border-orange-400'
                        : 'bg-orange-300 hover:bg-orange-400 text-stone-900 border-orange-400'
                      : isDarkBlueOrange
                        ? 'bg-[#101e42] hover:bg-[#162754] text-slate-100 border-[#1f3366]'
                        : 'bg-stone-100 hover:bg-orange-100 text-stone-800 border-stone-300'
                  }`}
                  title={`Usuário logado: ${currentUser.name} (Matrícula: ${currentUser.matricula}). Clique para gerenciar conta.`}
                >
                  {userRole === 'professor' ? (
                    <>
                      <BookOpen className={`h-4 w-4 ${isDarkBlueOrange ? 'text-slate-950' : 'text-stone-900'}`} />
                      <span className="hidden sm:inline font-black truncate max-w-[130px]">
                        {currentUser.name}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-black sm:ml-1 ${
                        isDarkBlueOrange ? 'bg-slate-950 text-orange-400 border border-orange-500/40' : 'bg-stone-900 text-orange-200'
                      }`}>
                        Matr. {currentUser.matricula}
                      </span>
                    </>
                  ) : (
                    <>
                      <GraduationCap className={`h-4 w-4 ${isDarkBlueOrange ? 'text-orange-400' : 'text-stone-800'}`} />
                      <span className="hidden sm:inline font-black truncate max-w-[130px]">
                        {currentUser.name}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-black sm:ml-1 border ${
                        isDarkBlueOrange
                          ? 'bg-orange-500 text-slate-950 border-orange-400'
                          : 'bg-orange-300 text-stone-900 border-orange-400/40'
                      }`}>
                        Matr. {currentUser.matricula}
                      </span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleLogout}
                  className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1 ${
                    isDarkBlueOrange
                      ? 'bg-[#101e42] hover:bg-[#162754] text-slate-300 hover:text-white border-[#1f3366]'
                      : 'bg-stone-100 hover:bg-orange-100 text-stone-700 hover:text-stone-900 border-stone-300'
                  }`}
                  title="Sair / Encerrar Sessão"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden md:inline text-[11px]">Sair</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition shadow-xs ${
                  isDarkBlueOrange
                    ? 'bg-orange-500 hover:bg-orange-600 text-slate-950 border border-orange-400'
                    : 'bg-orange-300 hover:bg-orange-400 text-stone-900 border border-orange-400'
                }`}
                title="Acessar com matrícula de Aluno ou Professor"
              >
                <LogIn className="h-4 w-4" />
                <span>Entrar (Login / Cadastro)</span>
              </button>
            )}


            {/* Quick Button to open Sistema de Aulas & PDFs */}
            <button
              onClick={() => {
                if (!currentUser) {
                  setShowAuthModal(true);
                } else {
                  setActiveTab('estudos');
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                activeTab === 'estudos'
                  ? isDarkBlueOrange
                    ? 'bg-orange-500 text-slate-950 border border-orange-400 font-black'
                    : 'bg-orange-300 text-stone-900 border border-orange-400 font-black'
                  : isDarkBlueOrange
                    ? 'bg-[#101e42] hover:bg-[#162754] text-slate-200 border border-[#1f3366]'
                    : 'bg-stone-100 hover:bg-orange-50 text-stone-800 border border-stone-300'
              }`}
              title="Acessar o Painel de Aulas"
            >
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Aulas & PDFs</span>
            </button>

            <PWAInstallButton />

            <button
              onClick={() => setShowSettings(true)}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                isDarkBlueOrange
                  ? 'bg-[#101e42] hover:bg-[#162754] text-slate-200 border-[#1f3366]'
                  : 'bg-stone-100 hover:bg-orange-50 text-stone-800 border-stone-300'
              }`}
              title="Ajustes de Acessibilidade"
            >
              <Sliders className={`h-4 w-4 ${isDarkBlueOrange ? 'text-orange-400' : 'text-stone-800'}`} />
              <span className="hidden sm:inline">Ajustes</span>
            </button>
          </div>
        </div>

        {/* Desktop Navigation Tabs Bar */}
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 hidden md:flex items-center gap-1.5 overflow-x-auto py-2.5 ${
          isDarkBlueOrange ? 'border-t border-orange-500/20' : 'border-t border-orange-200/60'
        }`}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                  isActive
                    ? isDarkBlueOrange
                      ? 'bg-orange-500 text-slate-950 border-orange-400 shadow-md font-black'
                      : 'bg-orange-300 text-stone-900 border-orange-400 shadow-xs font-black'
                    : isDarkBlueOrange
                      ? 'bg-[#101e42] text-slate-300 border-[#1f3366] hover:text-white hover:bg-[#162754] hover:border-orange-500/40'
                      : 'bg-stone-100/90 text-stone-700 border-stone-200 hover:text-stone-900 hover:bg-orange-50 hover:border-orange-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-slate-950' : isDarkBlueOrange ? 'text-orange-400' : 'text-stone-600'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="relative flex h-2 w-2 ml-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12 space-y-6">
        {/* Tab 0: Aulas & Estudo (Aluno e Professor com PDFs & MP3) */}
        {activeTab === 'estudos' && (
          <SistemaEstudo
            settings={settings}
            speak={speak}
            isSpeaking={isSpeaking}
            cancelSpeak={cancelSpeak}
            userRole={userRole}
            currentUser={currentUser}
            onRoleChange={handleSwitchRole}
            onOpenLogin={() => setShowAuthModal(true)}
          />
        )}

        {/* Tab 1: Falar por mim */}
        {activeTab === 'falar' && (
          <FalarPorMim
            speak={speak}
            isSpeaking={isSpeaking}
            cancelSpeak={cancelSpeak}
            settings={settings}
            voices={voices}
            selectedVoice={selectedVoice}
            onSelectVoice={selectVoiceByURI}
            onCycleVoice={cycleNextVoice}
          />
        )}

        {/* Tab 2: Ouvir e legendar */}
        {activeTab === 'ouvir' && (
          <OuvirLegendar
            isListening={isListening}
            transcript={transcript}
            interimTranscript={interimTranscript}
            errorMessage={sttError}
            isSupported={isSttSupported}
            isSecureOrigin={isSecureOrigin}
            startListening={startListening}
            stopListening={stopListening}
            clearTranscript={clearTranscript}
            settings={settings}
            antiRepeatEnabled={antiRepeatEnabled}
            setAntiRepeatEnabled={setAntiRepeatEnabled}
            strictMode={strictMode}
            setStrictMode={setStrictMode}
            duplicatesCount={duplicatesCount}
            optimizeTranscript={optimizeTranscript}
            speak={speak}
          />
        )}

        {/* Tab 3: Frases rápidas */}
        {activeTab === 'frases' && (
          <FrasesRapidas
            speak={speak}
            settings={settings}
          />
        )}

        {/* Tab 4: Soluções de sistema */}
        {activeTab === 'solucoes' && (
          <SolucoesSistema />
        )}

        {/* Tab 7: Acesso por IP */}
        {activeTab === 'rede' && (
          <AcessoPorIP />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className={`fixed bottom-0 left-0 right-0 z-40 md:hidden flex items-center overflow-x-auto px-2 py-1.5 safe-area-bottom shadow-lg scrollbar-none gap-1 ${
        isDarkBlueOrange
          ? 'bg-[#0d1938] border-t border-orange-500/30'
          : 'bg-[#f9f8f6] border-t border-orange-200'
      }`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition min-w-[58px] shrink-0 relative ${
                isActive
                  ? isDarkBlueOrange
                    ? 'text-orange-400 font-extrabold bg-orange-950/70 border border-orange-500/50'
                    : 'text-stone-900 font-extrabold bg-orange-200 border border-orange-300'
                  : isDarkBlueOrange
                    ? 'text-slate-400 hover:text-white'
                    : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 ${
                isActive 
                  ? isDarkBlueOrange ? 'text-orange-400' : 'text-stone-900' 
                  : isDarkBlueOrange ? 'text-slate-400' : 'text-stone-500'
              }`} />
              <span className="text-[10px] mt-0.5 truncate max-w-[62px]">
                {tab.label.split(' ')[0]}
              </span>
              {tab.badge && (
                <span className="absolute top-0.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Settings Modal */}
      {showSettings && (
        <AjustesModal
          settings={settings}
          setSettings={setSettings}
          speak={speak}
          isSpeaking={isSpeaking}
          cancelSpeak={cancelSpeak}
          voices={voices}
          selectedVoice={selectedVoice}
          onSelectVoice={selectVoiceByURI}
          onCycleVoice={cycleNextVoice}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Auth Portal Modal (Login e Cadastro com Matrícula para Aluno e Professor) */}
      <AuthPortalModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccessLogin={handleSuccessLogin}
        initialRole={userRole}
        allowClose={currentUser !== null}
      />
    </div>
  );
}
