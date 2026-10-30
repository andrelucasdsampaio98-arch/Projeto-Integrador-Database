import React, { useState } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  Lock, 
  Key, 
  User, 
  Check, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Sparkles, 
  UserPlus, 
  LogIn, 
  X, 
  Mail, 
  ShieldCheck, 
  CheckCircle2, 
  Globe
} from 'lucide-react';
import { UserAccount, UserRole } from '../types';
import { 
  firebaseSignIn, 
  firebaseSignUp, 
  firebaseSignInWithGoogle 
} from '../lib/firebase';
import { setCurrentUser as saveLocalCurrentUser } from '../data/authUsersData';

interface AuthPortalModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccessLogin: (user: UserAccount) => void;
  initialRole?: UserRole;
  allowClose?: boolean;
}

export const AuthPortalModal: React.FC<AuthPortalModalProps> = ({
  isOpen,
  onClose,
  onSuccessLogin,
  initialRole = 'aluno',
  allowClose = true,
}) => {
  const [activeRole, setActiveRole] = useState<UserRole>(initialRole);
  const [activeTab, setActiveTab] = useState<'login' | 'cadastro'>('login');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Login form state
  const [loginEmailOrMatricula, setLoginEmailOrMatricula] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSenha, setRegSenha] = useState('');
  const [regMatricula, setRegMatricula] = useState('');
  const [regTurmaOuArea, setRegTurmaOuArea] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Login submission with strict role check
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const val = loginEmailOrMatricula.trim();
    if (!val) {
      setLoginError('Por favor, informe seu e-mail ou matrícula.');
      return;
    }
    if (!loginSenha) {
      setLoginError('Por favor, digite sua senha de acesso.');
      return;
    }

    setIsLoadingAuth(true);

    // Converte matrícula para formato email caso o usuário digite apenas a matrícula
    const emailToUse = val.includes('@') ? val : `${val.toLowerCase().replace(/[^a-z0-9]/g, '')}@escola.edu.br`;

    // Passa o activeRole para garantir que Aluno não entre no portal Professor e vice-versa
    const res = await firebaseSignIn(emailToUse, loginSenha, activeRole);
    setIsLoadingAuth(false);

    if (res.success && res.user) {
      saveLocalCurrentUser(res.user);
      onSuccessLogin(res.user);
    } else {
      setLoginError(res.error || 'Falha ao autenticar. Verifique e-mail e senha.');
    }
  };

  // Login com o Google com verificação de papel
  const handleGoogleLogin = async () => {
    setLoginError(null);
    setIsLoadingAuth(true);

    const res = await firebaseSignInWithGoogle(activeRole);
    setIsLoadingAuth(false);

    if (res.success && res.user) {
      saveLocalCurrentUser(res.user);
      onSuccessLogin(res.user);
    } else {
      setLoginError(res.error || 'Erro ao realizar login com o Google.');
    }
  };

  // Gerar matrícula automática
  const handleGenerateMatricula = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newMat = activeRole === 'professor' ? `PROF-${randomSuffix}` : `2024${randomSuffix}`;
    setRegMatricula(newMat);
    if (!regEmail) {
      setRegEmail(`${newMat.toLowerCase()}@escola.edu.br`);
    }
  };

  // Handle Register submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    if (!regName.trim()) {
      setRegError('Por favor, informe o seu nome completo.');
      return;
    }

    const mat = regMatricula.trim() || (activeRole === 'professor' ? `PROF-${Date.now().toString().slice(-4)}` : `2024${Date.now().toString().slice(-4)}`);
    const email = regEmail.trim() || `${mat.toLowerCase().replace(/[^a-z0-9]/g, '')}@escola.edu.br`;

    if (!regSenha || regSenha.length < 6) {
      setRegError('A senha de acesso deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoadingAuth(true);

    const res = await firebaseSignUp({
      email,
      pass: regSenha,
      nome: regName.trim(),
      matricula: mat,
      role: activeRole,
      turmaOuArea: regTurmaOuArea.trim() || (activeRole === 'professor' ? 'Docência Inclusiva' : 'Ensino Fundamental/Médio')
    });

    setIsLoadingAuth(false);

    if (res.success && res.user) {
      setRegSuccess(`Conta criada com sucesso como ${activeRole === 'professor' ? 'Professor' : 'Aluno'}! Entrando...`);
      saveLocalCurrentUser(res.user);
      setTimeout(() => {
        onSuccessLogin(res.user!);
      }, 700);
    } else {
      setRegError(res.error || 'Erro ao cadastrar conta.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-xl my-auto rounded-3xl bg-white border border-slate-300 shadow-2xl p-6 sm:p-8 text-black space-y-5 animate-in fade-in zoom-in-95">
        
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300">
                Ambiente Escolar Acessível
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {activeRole === 'professor' ? 'Portal do Professor' : 'Portal do Aluno'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-black mt-1 flex items-center gap-2">
              {activeRole === 'professor' ? (
                <>
                  <BookOpen className="h-6 w-6 text-black" />
                  <span>Acesso do Professor</span>
                </>
              ) : (
                <>
                  <GraduationCap className="h-6 w-6 text-black" />
                  <span>Acesso do Aluno</span>
                </>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
              {activeRole === 'professor'
                ? 'Gerencie aulas, publique textos, grave áudios e disponibilize apostilas em PDF.'
                : 'Acesse suas aulas, escute áudios didáticos e consulte materiais de estudo.'}
            </p>
          </div>

          {allowClose && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-black border border-slate-300 text-xs font-bold transition"
              title="Fechar janela"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Role Selector: Aluno vs Professor */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-300">
          <button
            type="button"
            onClick={() => {
              setActiveRole('aluno');
              setLoginError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition ${
              activeRole === 'aluno'
                ? 'bg-orange-300 text-stone-900 border border-orange-400 shadow-xs'
                : 'text-slate-600 hover:text-black hover:bg-slate-200'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            <span>Sou Aluno</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveRole('professor');
              setLoginError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition ${
              activeRole === 'professor'
                ? 'bg-orange-300 text-stone-900 border border-orange-400 shadow-xs'
                : 'text-slate-600 hover:text-black hover:bg-slate-200'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Sou Professor</span>
          </button>
        </div>

        {/* Tabs: Entrar vs Cadastrar */}
        <div className="flex border-b border-slate-200 gap-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setLoginError(null);
            }}
            className={`pb-2 text-xs sm:text-sm font-black transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'login'
                ? 'border-black text-black'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <LogIn className="h-4 w-4" />
            <span>Entrar com Minha Conta</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('cadastro');
              setRegError(null);
              setRegSuccess(null);
            }}
            className={`pb-2 text-xs sm:text-sm font-black transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'cadastro'
                ? 'border-black text-black'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            <span>Criar Nova Conta</span>
          </button>
        </div>

        {/* VIEW 1: TAB LOGIN */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  <span>{loginError}</span>
                </div>
              </div>
            )}

            {/* Email or Matricula input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase text-black">
                E-mail ou Matrícula *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={loginEmailOrMatricula}
                  onChange={(e) => setLoginEmailOrMatricula(e.target.value)}
                  placeholder={activeRole === 'professor' ? 'professor@escola.edu.br ou PROF-1020' : 'aluno@escola.edu.br ou 20240101'}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-black font-semibold text-sm focus:outline-hidden focus:ring-2 focus:ring-black placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase text-black">
                  Senha de Acesso *
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key className="h-4 w-4" />
                </div>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginSenha}
                  onChange={(e) => setLoginSenha(e.target.value)}
                  placeholder="Digite sua senha de acesso"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-black font-semibold text-sm focus:outline-hidden focus:ring-2 focus:ring-black placeholder:text-slate-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-black"
                >
                  {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoadingAuth}
              className="w-full py-3 px-4 rounded-xl bg-orange-300 hover:bg-orange-400 disabled:opacity-60 text-stone-900 border border-orange-400 font-black text-sm flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
            >
              {isLoadingAuth ? (
                <>
                  <div className="h-4 w-4 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
                  <span>Entrando no Sistema...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Entrar como {activeRole === 'professor' ? 'Professor' : 'Aluno'}</span>
                </>
              )}
            </button>

            {/* Google Sign In option */}
            <div className="relative py-2 flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold text-slate-400 absolute uppercase">ou</span>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoadingAuth}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Globe className="h-4 w-4 text-blue-600" />
              <span>Entrar com Conta Google</span>
            </button>

            {/* First Access Prompt */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('cadastro');
                  setRegError(null);
                  setRegSuccess(null);
                }}
                className="text-xs font-bold text-black underline hover:text-slate-700 cursor-pointer"
              >
                Primeiro acesso ao sistema? Cadastre-se aqui &rarr;
              </button>
            </div>
          </form>
        )}

        {/* VIEW 2: TAB CADASTRO */}
        {activeTab === 'cadastro' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div className="p-3 rounded-2xl bg-orange-50/70 border border-orange-200 flex items-start gap-2.5 text-xs text-orange-950">
              <ShieldCheck className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-black block">
                  Cadastrar {activeRole === 'professor' ? 'Professor(a)' : 'Aluno(a)'}
                </span>
                <p className="text-[11px] text-orange-900 mt-0.5">
                  Informe seus dados para habilitar o acesso com perfil de {activeRole === 'professor' ? 'docente' : 'estudante'}.
                </p>
              </div>
            </div>

            {regError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{regError}</span>
                </div>
              </div>
            )}

            {regSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>{regSuccess}</span>
              </div>
            )}

            {/* Nome Completo */}
            <div className="space-y-1">
              <label className="block text-xs font-black uppercase text-black">
                Nome Completo *
              </label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder={activeRole === 'professor' ? 'Ex: Profa. Helena Martins' : 'Ex: Gabriel Souza Santos'}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-black font-semibold text-sm focus:outline-hidden focus:ring-2 focus:ring-black"
                required
              />
            </div>

            {/* E-mail */}
            <div className="space-y-1">
              <label className="block text-xs font-black uppercase text-black">
                E-mail Institucional ou Pessoal *
              </label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-black font-semibold text-sm focus:outline-hidden focus:ring-2 focus:ring-black"
                required
              />
            </div>

            {/* Senha */}
            <div className="space-y-1">
              <label className="block text-xs font-black uppercase text-black">
                Senha de Acesso (Mínimo 6 caracteres) *
              </label>
              <div className="relative">
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  value={regSenha}
                  onChange={(e) => setRegSenha(e.target.value)}
                  placeholder="Crie sua senha segura"
                  className="w-full px-3.5 pr-10 py-2 rounded-xl border border-slate-300 bg-white text-black font-semibold text-sm focus:outline-hidden focus:ring-2 focus:ring-black"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-black"
                >
                  {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Matrícula e Turma */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase text-black">
                    Matrícula *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateMatricula}
                    className="text-[10px] font-bold text-orange-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    <span>Gerar</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={regMatricula}
                  onChange={(e) => setRegMatricula(e.target.value)}
                  placeholder={activeRole === 'professor' ? 'PROF-3040' : '20240301'}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-black font-semibold text-sm focus:outline-hidden focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-black uppercase text-black">
                  {activeRole === 'professor' ? 'Área / Disciplina' : 'Turma / Série'}
                </label>
                <input
                  type="text"
                  value={regTurmaOuArea}
                  onChange={(e) => setRegTurmaOuArea(e.target.value)}
                  placeholder={activeRole === 'professor' ? 'Ex: Letras / Libras' : 'Ex: 1º Ano Médio'}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-black font-semibold text-sm focus:outline-hidden focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            {/* Submit Register Button */}
            <button
              type="submit"
              disabled={isLoadingAuth}
              className="w-full py-3 px-4 rounded-xl bg-orange-300 hover:bg-orange-400 disabled:opacity-60 text-stone-900 border border-orange-400 font-black text-sm flex items-center justify-center gap-2 transition shadow-xs cursor-pointer mt-2"
            >
              {isLoadingAuth ? (
                <>
                  <div className="h-4 w-4 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
                  <span>Criando Conta...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Concluir Cadastro</span>
                </>
              )}
            </button>

            {/* Back to Login link */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setRegError(null);
                  setRegSuccess(null);
                }}
                className="text-xs font-bold text-black underline hover:text-slate-700 cursor-pointer"
              >
                Já possui conta? Clique para entrar &rarr;
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
