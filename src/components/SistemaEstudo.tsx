import React, { useState, useEffect, useCallback } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Circle, 
  Upload, 
  Download, 
  Eye, 
  Edit3, 
  Trash2, 
  Sparkles, 
  Volume2, 
  RotateCcw, 
  Check, 
  Layers, 
  Clock, 
  Calendar,
  AlertCircle,
  FileAudio,
  Bot,
  Play,
  ShieldCheck,
  Mic,
  ArrowRight,
  Headphones,
  Database,
  RefreshCw,
  FileCheck,
  Image as ImageIcon,
  Loader2,
  ExternalLink,
  Video
} from 'lucide-react';
import { 
  Lesson, 
  LessonPdfFile, 
  LessonMp3Video, 
  UserRole, 
  AppSettings, 
  UserAccount, 
  AulaAtividade, 
  TipoPublicacao 
} from '../types';
import { INITIAL_LESSONS } from '../data/lessonsData';
import { TeacherLessonModal } from './TeacherLessonModal';
import { StudentLessonDetailModal } from './StudentLessonDetailModal';
import { PdfViewerModal } from './PdfViewerModal';
import { Mp3VideoLessonPlayer } from './Mp3VideoLessonPlayer';
import { 
  firebaseFetchAulas, 
  firebaseCreateAula, 
  firebaseUpdateAula, 
  firebaseDeleteAula,
  firebaseOpenOrDownloadMaterial,
  getMaterialCategory
} from '../lib/firebase';

interface SistemaEstudoProps {
  settings: AppSettings;
  speak: (text: string) => void;
  isSpeaking: boolean;
  cancelSpeak: () => void;
  userRole?: UserRole;
  currentUser?: UserAccount | null;
  onRoleChange?: (role: UserRole) => void;
  onOpenLogin?: () => void;
}

const STORAGE_KEY = 'ponte_sistema_estudo_aulas';
const ROLE_STORAGE_KEY = 'ponte_sistema_estudo_role';

/**
 * Converte um registro da tabela 'aulas_atividades' do Firebase para a estrutura 'Lesson'
 */
function mapAulaAtividadeToLesson(item: AulaAtividade): Lesson {
  const dateStr = item.criado_em 
    ? item.criado_em.split('T')[0] 
    : (item.data_criacao ? item.data_criacao.split('T')[0] : new Date().toISOString().split('T')[0]);
  
  const deadlineStr = item.prazo || item.prazo_entrega || null;
  const fileName = item.material_nome || (item.material_url ? item.material_url.split('/').pop() : null) || (item.tipo === 'atividade' ? 'Atividade_Anexa.pdf' : 'Material_Aula.pdf');
  const pdfFiles: LessonPdfFile[] = [];

  if (item.material_url) {
    pdfFiles.push({
      id: 'mat-' + item.id,
      name: fileName,
      sizeFormatted: item.material_tamanho || 'Anexo',
      dataUrl: item.material_url,
      uploadedAt: item.criado_em ? new Date(item.criado_em).toLocaleDateString('pt-BR') : (item.data_criacao ? new Date(item.data_criacao).toLocaleDateString('pt-BR') : ''),
      description: `Material armazenado no Firebase Storage (materiais-aulas)`
    });
  }

  return {
    id: item.id,
    title: item.titulo,
    subject: item.disciplina || 'Geral',
    teacherName: item.professor_nome || 'Prof. Docente',
    date: dateStr,
    summary: item.descricao,
    fullContent: item.instrucoes || item.descricao,
    accessibleTranscript: `Publicação de ${item.tipo === 'atividade' ? 'Atividade' : 'Aula'}: ${item.titulo}. Professor: ${item.professor_nome || 'Docente'}. ${item.descricao}`,
    tags: [item.disciplina || 'Geral', item.tipo],
    pdfFiles,
    mp3Lessons: [],
    tipo: item.tipo,
    instructions: item.instrucoes || '',
    deadline: deadlineStr,
    professorId: item.professor_id,
    materialUrl: item.material_url || null,
    materialName: fileName,
    materialType: item.material_tipo || null,
    materialSize: item.material_tamanho || null,
    isFromFirebase: true,
  };
}

export const SistemaEstudo: React.FC<SistemaEstudoProps> = ({
  settings,
  speak,
  isSpeaking,
  cancelSpeak,
  userRole: propUserRole,
  currentUser,
  onRoleChange: propOnRoleChange,
  onOpenLogin
}) => {
  // Current active role: 'aluno' or 'professor'
  const [internalRole, setInternalRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem(ROLE_STORAGE_KEY);
      if (saved === 'aluno' || saved === 'professor') return saved;
    } catch {
      // fallback
    }
    return 'aluno';
  });

  const userRole = propUserRole || internalRole;

  // Notification banner
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Sincronização e estados locais
  const [isSyncing, setIsSyncing] = useState(false);

  // Lessons list
  const [lessons, setLessons] = useState<Lesson[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_LESSONS;
  });

  // Save lessons to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons));
    } catch (e) {
      console.error('Error saving lessons to localStorage:', e);
    }
  }, [lessons]);

  // Sincronização com o Firebase Firestore
  const syncWithFirebase = useCallback(async (showFeedback = false) => {
    setIsSyncing(true);
    try {
      const res = await firebaseFetchAulas();
      if (res.success && res.data) {
        if (res.data.length > 0) {
          setLessons(res.data);
        }
        if (showFeedback) {
          setNotification({
            type: 'success',
            message: `${res.data.length} publicações sincronizadas com o Firebase Firestore!`,
          });
          setTimeout(() => setNotification(null), 4000);
        }
      } else if (res.error) {
        if (showFeedback) {
          setNotification({
            type: 'error',
            message: `Erro ao sincronizar com Firebase: ${res.error}`,
          });
          setTimeout(() => setNotification(null), 5000);
        }
      }
    } catch (err: any) {
      console.error('Falha na sincronização com Firebase:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Sincronizar na montagem inicial
  useEffect(() => {
    syncWithFirebase();
  }, [syncWithFirebase]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('Todas');
  const [selectedTipo, setSelectedTipo] = useState<'todos' | 'aula' | 'atividade' | 'minhas'>('todos');
  const [selectedMediaType, setSelectedMediaType] = useState<'todos' | 'com-mp3' | 'com-pdf' | 'com-video'>('todos');
  const [selectedStatus, setSelectedStatus] = useState<'todos' | 'pendentes' | 'concluidas'>('todos');

  // Modals state
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [teacherModalDefaultTipo, setTeacherModalDefaultTipo] = useState<TipoPublicacao>('aula');
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [activeDetailLesson, setActiveDetailLesson] = useState<Lesson | null>(null);
  const [activePdfViewer, setActivePdfViewer] = useState<{
    file: LessonPdfFile;
    lessonTitle: string;
  } | null>(null);
  const [activeMp3Modal, setActiveMp3Modal] = useState<{
    mp3: LessonMp3Video;
    lessonTitle: string;
  } | null>(null);

  // Estado e handlers para download e abertura segura com createSignedUrl
  const [downloadingMaterialKey, setDownloadingMaterialKey] = useState<string | null>(null);

  const handleOpenMaterialDirect = async (pathOrUrl: string, name?: string, aulaId?: string) => {
    setDownloadingMaterialKey(`${pathOrUrl}-open`);
    const res = await firebaseOpenOrDownloadMaterial(pathOrUrl, name || 'material', 'open', aulaId);
    if (!res.success) {
      setNotification({
        type: 'error',
        message: res.error || 'Erro ao abrir o material.'
      });
      setTimeout(() => setNotification(null), 4000);
    }
    setDownloadingMaterialKey(null);
  };

  const handleDownloadMaterialDirect = async (pathOrUrl: string, name?: string, aulaId?: string) => {
    setDownloadingMaterialKey(`${pathOrUrl}-download`);
    const res = await firebaseOpenOrDownloadMaterial(pathOrUrl, name || 'material', 'download', aulaId);
    if (!res.success) {
      setNotification({
        type: 'error',
        message: res.error || 'Erro ao baixar o material.'
      });
      setTimeout(() => setNotification(null), 4000);
    }
    setDownloadingMaterialKey(null);
  };

  // Extract unique subjects
  const availableSubjects = ['Todas', ...Array.from(new Set(lessons.map((l) => l.subject)))];

  /**
   * Verifica se a publicação pertence ao professor ativo
   * Requisito: "Listar, editar e excluir somente as publicações do próprio professor."
   */
  const isAuthorTeacher = (lesson: Lesson): boolean => {
    if (userRole !== 'professor') return false;
    if (!lesson.isFromFirebase) return true; // aulas locais de exemplo
    if (!currentUser) return false;
    return (
      (Boolean(lesson.professorId) && lesson.professorId === currentUser.id) ||
      lesson.teacherName.toLowerCase() === currentUser.name.toLowerCase()
    );
  };

  // Filter lessons
  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch = 
      lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSubject = selectedSubject === 'Todas' || lesson.subject === selectedSubject;

    const matchesTipo =
      selectedTipo === 'todos' ||
      (selectedTipo === 'aula' && (lesson.tipo === 'aula' || !lesson.tipo)) ||
      (selectedTipo === 'atividade' && lesson.tipo === 'atividade') ||
      (selectedTipo === 'minhas' && isAuthorTeacher(lesson));

    const matchesMediaType =
      selectedMediaType === 'todos' ||
      (selectedMediaType === 'com-mp3' && lesson.mp3Lessons && lesson.mp3Lessons.length > 0) ||
      (selectedMediaType === 'com-pdf' && ((lesson.pdfFiles && lesson.pdfFiles.length > 0) || Boolean(lesson.materialUrl))) ||
      (selectedMediaType === 'com-video' && Boolean(lesson.videoUrl));

    const matchesStatus = 
      selectedStatus === 'todos' ||
      (selectedStatus === 'concluidas' && lesson.isCompleted) ||
      (selectedStatus === 'pendentes' && !lesson.isCompleted);

    return matchesSearch && matchesSubject && matchesTipo && matchesMediaType && matchesStatus;
  });

  // Requisito: "Ordenar as publicações da mais recente para a mais antiga."
  const sortedLessons = [...filteredLessons].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Toggle completed state
  const handleToggleComplete = (lessonId: string) => {
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, isCompleted: !l.isCompleted } : l))
    );
    if (activeDetailLesson && activeDetailLesson.id === lessonId) {
      setActiveDetailLesson((prev) =>
        prev ? { ...prev, isCompleted: !prev.isCompleted } : null
      );
    }
  };

  // Update notes
  const handleUpdateNotes = (lessonId: string, notes: string) => {
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, studentNotes: notes } : l))
    );
    if (activeDetailLesson && activeDetailLesson.id === lessonId) {
      setActiveDetailLesson((prev) =>
        prev ? { ...prev, studentNotes: notes } : null
      );
    }
  };

  // Save new or edited publication
  const handleSaveLesson = async (savedLesson: Lesson) => {
    setIsTeacherModalOpen(false);
    const wasEditing = Boolean(editingLesson);
    setEditingLesson(null);
    setIsSyncing(true);

    const lessonWithFirebase: Lesson = {
      ...savedLesson,
      isFromFirebase: true,
      professorId: currentUser?.id || savedLesson.professorId || 'docente'
    };

    let result;
    if (wasEditing) {
      result = await firebaseUpdateAula(lessonWithFirebase);
    } else {
      result = await firebaseCreateAula(lessonWithFirebase);
    }

    if (result.success) {
      setNotification({
        type: 'success',
        message: `${savedLesson.tipo === 'atividade' ? 'Atividade' : 'Aula'} salva com sucesso no Firebase Firestore!`,
      });
      await syncWithFirebase();
    } else {
      setLessons((prev) => {
        const exists = prev.some((l) => l.id === savedLesson.id);
        if (exists) {
          return prev.map((l) => (l.id === savedLesson.id ? savedLesson : l));
        } else {
          return [savedLesson, ...prev];
        }
      });
      setNotification({
        type: 'error',
        message: `Salvo localmente. Aviso Firebase: ${result.error}`,
      });
    }

    setIsSyncing(false);
    setTimeout(() => setNotification(null), 4000);
  };

  // Delete publication
  const handleDeleteLesson = async (lessonId: string) => {
    const lessonToDelete = lessons.find((l) => l.id === lessonId);
    if (!confirm(`Tem certeza que deseja excluir "${lessonToDelete?.title || 'esta publicação'}"?`)) {
      return;
    }

    setIsSyncing(true);
    const delRes = await firebaseDeleteAula(lessonId);
    if (delRes.success) {
      setNotification({
        type: 'success',
        message: 'Publicação excluída com sucesso do Firebase!',
      });
      await syncWithFirebase();
    } else {
      setLessons((prev) => prev.filter((l) => l.id !== lessonId));
      setNotification({
        type: 'success',
        message: 'Publicação removida.',
      });
    }
    setIsSyncing(false);
    setTimeout(() => setNotification(null), 4000);
  };

  // Reset to initial demo lessons
  const handleResetLessons = () => {
    if (confirm('Deseja restaurar as aulas modelo de exemplo com PDFs e videoaulas em MP3?')) {
      setLessons(INITIAL_LESSONS);
    }
  };

  // Trigger VLibras official 3D avatar
  const handleQuickTriggerVLibras = (sampleText?: string) => {
    const text = sampleText || 'Bem-vindo ao estudo em Libras com o Boneco do VLibras.';
    navigator.clipboard.writeText(text);

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

  // Count stats
  const totalLessons = lessons.length;
  const totalAulasCount = lessons.filter((l) => l.tipo === 'aula' || !l.tipo).length;
  const totalAtividadesCount = lessons.filter((l) => l.tipo === 'atividade').length;
  const completedCount = lessons.filter((l) => l.isCompleted).length;
  const totalPdfsCount = lessons.reduce((acc, l) => acc + (l.pdfFiles ? l.pdfFiles.length : 0), 0);
  const totalMp3Count = lessons.reduce((acc, l) => acc + (l.mp3Lessons ? l.mp3Lessons.length : 0), 0);

  return (
    <div className="space-y-6 text-black">
      {/* Top Banner: Distinct Access Indicator & Role Selector */}
      <div className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-7 shadow-xs space-y-5">
        
        {/* Top Header Row with Firebase Connection Badge */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-black border border-slate-300">
                Acessos Separados
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {userRole === 'professor' ? 'Ambiente do Professor' : 'Ambiente do Aluno'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-black flex items-center gap-2 mt-1">
              {userRole === 'professor' ? (
                <>
                  <BookOpen className="h-6 w-6 text-black" />
                  <span>Painel do Professor &bull; Gestão de Aulas, Atividades & Materiais</span>
                </>
              ) : (
                <>
                  <GraduationCap className="h-6 w-6 text-black" />
                  <span>Painel do Aluno &bull; Aulas, Atividades & Materiais em Libras</span>
                </>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl mt-1">
              {userRole === 'professor'
                ? 'Painel docente exclusivo. Cadastre aulas e atividades, anexe apostilas em PDF pelo Firebase Storage e gerencie apenas suas publicações.'
                : 'Portal do estudante. Consulte as aulas e atividades mais recentes, faça download dos materiais autorizados e acompanhe seus prazos.'}
            </p>
          </div>

          {/* User badge & Firebase config action */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-100 border border-slate-300 text-xs font-black shadow-xs">
              {userRole === 'professor' ? (
                <>
                  <BookOpen className="h-4 w-4 text-black shrink-0" />
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span>{currentUser ? currentUser.name : 'Acesso do Professor'}</span>
                      <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded font-black">
                        Docente
                      </span>
                    </div>
                    {currentUser && (
                      <span className="text-[10px] text-slate-600 font-bold block">
                        Matrícula: {currentUser.matricula}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <GraduationCap className="h-4 w-4 text-black shrink-0" />
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span>{currentUser ? currentUser.name : 'Acesso do Aluno'}</span>
                      <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded font-black">
                        Estudante
                      </span>
                    </div>
                    {currentUser && (
                      <span className="text-[10px] text-slate-600 font-bold block">
                        Matrícula: {currentUser.matricula}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>


            {onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="text-[11px] font-extrabold text-slate-600 hover:text-black underline px-2 py-1"
                title="Acessar com outra matrícula ou cadastrar novo usuário"
              >
                Trocar Matrícula
              </button>
            )}
          </div>
        </div>

        {/* Global Operation Notification Banner */}
        {notification && (
          <div className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-between gap-3 animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-700 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="font-black text-xs hover:underline px-2 py-0.5"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Dynamic Portal Environment Description */}
        {userRole === 'professor' ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border-2 border-stone-300 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-300 text-stone-900 border border-orange-400/50 font-black shrink-0 shadow-xs">
                  <BookOpen className="h-6 w-6 text-stone-900" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-stone-900">
                      Painel do Professor &bull; Gestão Pedagógica
                    </h3>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-orange-300 text-stone-900 border border-orange-400">
                      Docente Autorizado
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 font-medium">
                    Publique aulas e atividades com prazos, anexe materiais em PDF e organize o conteúdo para seus alunos.
                  </p>
                </div>
              </div>

              {/* Action Buttons for Teacher: Cadastrar Aula & Cadastrar Atividade */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setEditingLesson(null);
                    setTeacherModalDefaultTipo('aula');
                    setIsTeacherModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-orange-300 hover:bg-orange-400 text-stone-900 border border-orange-400 text-xs font-black transition shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Cadastrar Aula</span>
                </button>

                <button
                  onClick={() => {
                    setEditingLesson(null);
                    setTeacherModalDefaultTipo('atividade');
                    setIsTeacherModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-stone-900 border border-amber-400 text-xs font-black transition shadow-xs"
                >
                  <FileCheck className="h-4 w-4" />
                  <span>+ Cadastrar Atividade</span>
                </button>

                <button
                  onClick={() => syncWithFirebase(true)}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-bold transition shadow-xs disabled:opacity-50"
                  title="Atualizar dados do Firebase"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sincronizar</span>
                </button>

                <button
                  onClick={() => handleQuickTriggerVLibras('Testando tradução pedagógica no Boneco do VLibras')}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-bold transition shadow-xs"
                  title="Abrir o Boneco do VLibras para testar tradução"
                >
                  <Bot className="h-4 w-4 text-stone-900" />
                  <span>Testar VLibras</span>
                </button>

                <button
                  onClick={handleResetLessons}
                  className="p-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-bold transition"
                  title="Restaurar aulas modelo padrão"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border-2 border-stone-300 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-300 text-stone-900 border border-orange-400/50 font-black shrink-0 shadow-xs">
                  <GraduationCap className="h-6 w-6 text-stone-900" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-stone-900">
                      Painel do Aluno &bull; Estudos & Atividades
                    </h3>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-orange-200 text-orange-950 border border-orange-300">
                      Estudante
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 font-medium">
                    Acesse suas aulas, resolva atividades antes do prazo e baixe os materiais em PDF autorizados pelos professores.
                  </p>
                </div>
              </div>

              {/* Quick Actions & Progress for Student */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => syncWithFirebase(true)}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-bold transition shadow-xs disabled:opacity-50"
                  title="Atualizar listagem de publicações do Firebase"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Atualizar Conteúdos</span>
                </button>

                <div className="flex items-center gap-3 text-xs bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-600 font-semibold">Concluídas:</span>
                  <span className="font-black text-black">
                    {completedCount} de {totalLessons}
                  </span>
                  <div className="w-20 bg-stone-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-orange-400 h-full rounded-full transition-all"
                      style={{ width: `${totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Aulas Publicadas
            </span>
            <span className="text-xl font-black text-black mt-0.5 block flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-black" />
              {totalAulasCount}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Atividades Escolares
            </span>
            <span className="text-xl font-black text-black mt-0.5 block flex items-center gap-1.5">
              <FileCheck className="h-4 w-4 text-black" />
              {totalAtividadesCount}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Materiais & PDFs
            </span>
            <span className="text-xl font-black text-black mt-0.5 block flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-black" />
              {totalPdfsCount}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {userRole === 'professor' ? 'Disciplinas Ativas' : 'Concluídas'}
            </span>
            <span className="text-xl font-black text-black mt-0.5 block">
              {userRole === 'professor' ? availableSubjects.length - 1 : completedCount}
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="rounded-3xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por título, resumo, professor, matéria ou instruções..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-300 bg-stone-50 text-stone-900 text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-orange-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500 hover:text-black"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Tipo Filter: Todas, Aulas, Atividades, Minhas (para professores) */}
          <div className="flex flex-wrap items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
            <button
              onClick={() => setSelectedTipo('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedTipo === 'todos'
                  ? 'bg-orange-300 text-stone-900 border border-orange-400 font-black shadow-2xs'
                  : 'text-stone-700 hover:text-stone-900 hover:bg-orange-50'
              }`}
            >
              Todos ({lessons.length})
            </button>
            <button
              onClick={() => setSelectedTipo('aula')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                selectedTipo === 'aula'
                  ? 'bg-orange-300 text-stone-900 border border-orange-400 font-black shadow-2xs'
                  : 'text-stone-700 hover:text-stone-900 hover:bg-orange-50'
              }`}
            >
              <BookOpen className="h-3 w-3" />
              <span>Aulas</span>
            </button>
            <button
              onClick={() => setSelectedTipo('atividade')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                selectedTipo === 'atividade'
                  ? 'bg-orange-300 text-stone-900 border border-orange-400 font-black shadow-2xs'
                  : 'text-stone-700 hover:text-stone-900 hover:bg-orange-50'
              }`}
            >
              <FileCheck className="h-3 w-3" />
              <span>Atividades</span>
            </button>
            {userRole === 'professor' && (
              <button
                onClick={() => setSelectedTipo('minhas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  selectedTipo === 'minhas'
                    ? 'bg-orange-300 text-stone-900 border border-orange-400 font-black shadow-2xs'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-orange-50'
                }`}
                title="Filtrar apenas as publicações criadas por você"
              >
                <span>👤 Minhas</span>
              </button>
            )}
          </div>

          {/* Media Filter */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 self-start md:self-auto">
            <button
              onClick={() => setSelectedMediaType('todos')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedMediaType === 'todos'
                  ? 'bg-orange-300 text-stone-900 border border-orange-400 font-black shadow-2xs'
                  : 'text-stone-700 hover:text-stone-900 hover:bg-orange-50'
              }`}
            >
              Mídia
            </button>
            <button
              onClick={() => setSelectedMediaType('com-pdf')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                selectedMediaType === 'com-pdf'
                  ? 'bg-orange-300 text-stone-900 border border-orange-400 font-black shadow-2xs'
                  : 'text-stone-700 hover:text-stone-900 hover:bg-orange-50'
              }`}
            >
              <FileText className="h-3 w-3" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => setSelectedMediaType('com-mp3')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                selectedMediaType === 'com-mp3'
                  ? 'bg-orange-300 text-stone-900 border border-orange-400 font-black shadow-2xs'
                  : 'text-stone-700 hover:text-stone-900 hover:bg-orange-50'
              }`}
            >
              <FileAudio className="h-3 w-3" />
              <span>MP3</span>
            </button>
            <button
              onClick={() => setSelectedMediaType('com-video')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                selectedMediaType === 'com-video'
                  ? 'bg-orange-300 text-stone-900 border border-orange-400 font-black shadow-2xs'
                  : 'text-stone-700 hover:text-stone-900 hover:bg-orange-50'
              }`}
            >
              <Video className="h-3 w-3 text-red-600" />
              <span>Vídeo</span>
            </button>
          </div>
        </div>

        {/* Subject Category Tags */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs">
          <span className="text-stone-500 font-bold shrink-0 mr-1 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Matéria:
          </span>
          {availableSubjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap border ${
                selectedSubject === sub
                  ? 'bg-orange-300 text-stone-900 border-orange-400 font-black shadow-2xs'
                  : 'bg-white text-stone-800 border-stone-200 hover:bg-orange-50 hover:text-stone-900 hover:border-orange-200'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* Publications Grid (Sorted Newest to Oldest) */}
      {sortedLessons.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-200 p-12 text-center shadow-xs space-y-3">
          <BookOpen className="h-12 w-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-black text-black">Nenhum conteúdo encontrado</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Não encontramos publicações com os filtros selecionados. Altere os termos da busca ou adicione novos materiais.
          </p>
          {userRole === 'professor' && (
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => {
                  setEditingLesson(null);
                  setTeacherModalDefaultTipo('aula');
                  setIsTeacherModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-orange-300 text-stone-900 border border-orange-400 text-xs font-black shadow-xs"
              >
                + Cadastrar Nova Aula
              </button>
              <button
                onClick={() => {
                  setEditingLesson(null);
                  setTeacherModalDefaultTipo('atividade');
                  setIsTeacherModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-200 text-stone-900 border border-amber-400 text-xs font-black shadow-xs"
              >
                + Cadastrar Nova Atividade
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedLessons.map((lesson) => (
            <div
              key={lesson.id}
              className="rounded-3xl bg-white border border-slate-200 p-5 shadow-xs hover:border-black transition flex flex-col justify-between space-y-4 group"
            >
              {/* Card Header: Type Badge, Subject & Completed Status */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      lesson.tipo === 'atividade'
                        ? 'bg-amber-100 text-amber-950 border-amber-300'
                        : 'bg-orange-100 text-stone-900 border-orange-300'
                    }`}>
                      {lesson.tipo === 'atividade' ? '📝 Atividade' : '📚 Aula'}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-black border border-slate-300">
                      {lesson.subject}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {lesson.isCompleted ? (
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="h-3 w-3" /> Concluída
                      </span>
                    ) : (
                      <button
                        onClick={() => handleToggleComplete(lesson.id)}
                        className="text-[10px] font-bold text-slate-500 hover:text-black flex items-center gap-1"
                        title="Marcar como concluída"
                      >
                        <Circle className="h-3 w-3" /> Pendente
                      </button>
                    )}
                  </div>
                </div>

                <h3 
                  onClick={() => setActiveDetailLesson(lesson)}
                  className="text-base font-black text-black leading-snug line-clamp-2 cursor-pointer group-hover:underline"
                >
                  {lesson.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {lesson.summary || lesson.fullContent}
                </p>

                {/* Prazo de Entrega para Atividades */}
                {lesson.deadline && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold">
                    <Clock className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                    <span>Prazo de Entrega: {lesson.deadline}</span>
                  </div>
                )}
              </div>

              {/* Videoaulas em MP3 Preview (se houver) */}
              {lesson.mp3Lessons && lesson.mp3Lessons.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                      <FileAudio className="h-3.5 w-3.5 text-black" />
                      Videoaula em MP3 ({lesson.mp3Lessons.length})
                    </span>

                    <button
                      onClick={() => handleQuickTriggerVLibras(lesson.mp3Lessons![0].transcript)}
                      className="text-[11px] font-extrabold text-black hover:underline flex items-center gap-1"
                      title="Traduzir o áudio com o Boneco do VLibras"
                    >
                      <Bot className="h-3.5 w-3.5" />
                      <span>Boneco VLibras</span>
                    </button>
                  </div>

                  {lesson.mp3Lessons.slice(0, 1).map((mp3) => (
                    <div
                      key={mp3.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs gap-2"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-black truncate max-w-[150px]">
                          {mp3.title}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          ({mp3.durationFormatted})
                        </span>
                      </div>

                      <button
                        onClick={() => setActiveMp3Modal({ mp3, lessonTitle: lesson.title })}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-300 text-stone-900 hover:bg-orange-400 text-[11px] font-black border border-orange-400/60 shadow-2xs"
                        title="Ouvir videoaula e traduzir com o Boneco do VLibras"
                      >
                        <Play className="h-3 w-3 fill-stone-900" />
                        <span>Ouvir</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Videoaula Online Link (se cadastrada) */}
              {lesson.videoUrl && (
                <div className="p-3 rounded-2xl bg-red-50/70 border border-red-200/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-2xs">
                      <Video className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black uppercase text-red-950">
                          Videoaula Online
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-200 text-red-900">
                          Vídeo
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate max-w-[160px] sm:max-w-[200px]">
                        {lesson.videoUrl}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setActiveDetailLesson(lesson)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-black shadow-xs transition"
                      title="Assistir à videoaula nos detalhes"
                    >
                      <Play className="h-3 w-3 fill-white" />
                      <span>Assistir</span>
                    </button>
                    <a
                      href={lesson.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition"
                      title="Abrir vídeo em nova aba"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* Materiais Anexados do Firebase Storage (PDF, Word, PPT, Imagens) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {lesson.date}
                  </span>
                  <span className="text-slate-800 font-bold truncate max-w-[140px]">
                    Prof: {lesson.teacherName}
                  </span>
                </div>

                {(() => {
                  const targetMaterialPath = lesson.materialUrl || (lesson.pdfFiles && lesson.pdfFiles.length > 0 ? lesson.pdfFiles[0].dataUrl : null);
                  const targetMaterialName = lesson.materialName || (lesson.pdfFiles && lesson.pdfFiles.length > 0 ? lesson.pdfFiles[0].name : 'Material_Anexo');
                  
                  if (!targetMaterialPath) {
                    return (
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
                        <span className="text-[11px] text-slate-400 font-medium">
                          Sem material anexado
                        </span>
                      </div>
                    );
                  }

                  const cat = getMaterialCategory(targetMaterialName);
                  const isOpening = downloadingMaterialKey === `${targetMaterialPath}-open`;
                  const isDownloading = downloadingMaterialKey === `${targetMaterialPath}-download`;

                  return (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between gap-1.5 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <div className={`p-1 rounded-md shrink-0 ${
                            cat === 'pdf' ? 'bg-rose-100 text-rose-800' :
                            cat === 'word' ? 'bg-blue-100 text-blue-800' :
                            cat === 'powerpoint' ? 'bg-amber-100 text-amber-800' :
                            cat === 'image' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-black'
                          }`}>
                            {cat === 'image' ? (
                              <ImageIcon className="h-3.5 w-3.5 text-emerald-800" />
                            ) : (
                              <FileText className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <span className="font-bold text-black truncate max-w-[140px]" title={targetMaterialName}>
                            {targetMaterialName}
                          </span>
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-500 shrink-0">
                          {cat}
                        </span>
                      </div>

                      {/* Botões "Abrir material" e "Baixar material" */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => handleOpenMaterialDirect(targetMaterialPath, targetMaterialName)}
                          disabled={Boolean(downloadingMaterialKey)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-black text-white hover:bg-slate-800 text-[11px] font-bold transition shadow-2xs disabled:opacity-50"
                          title="Abrir o material no navegador via createSignedUrl"
                        >
                          {isOpening ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ExternalLink className="h-3 w-3" />
                          )}
                          <span>Abrir material</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadMaterialDirect(targetMaterialPath, targetMaterialName)}
                          disabled={Boolean(downloadingMaterialKey)}
                          className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-200 text-black border border-slate-300 text-[11px] font-bold transition disabled:opacity-50"
                          title="Baixar material para o computador via createSignedUrl"
                        >
                          {isDownloading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                          <span className="hidden sm:inline">Baixar</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Card Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setActiveDetailLesson(lesson)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-orange-300 hover:bg-orange-400 text-stone-900 border border-orange-400/80 text-xs font-black transition shadow-xs"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>{lesson.tipo === 'atividade' ? 'Abrir Atividade' : 'Abrir Aula & Estudo'}</span>
                </button>

                {/* Controles de Professor: Restritos EXCLUSIVAMENTE ao autor da publicação */}
                {userRole === 'professor' && isAuthorTeacher(lesson) ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingLesson(lesson);
                        setTeacherModalDefaultTipo(lesson.tipo || 'aula');
                        setIsTeacherModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-black border border-slate-300 transition"
                      title="Editar sua publicação"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteLesson(lesson.id)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                      title="Excluir sua publicação"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : userRole === 'professor' ? (
                  <span className="text-[10px] text-slate-400 font-semibold px-2 py-1 bg-slate-50 rounded-lg border border-slate-200">
                    Autor: {lesson.teacherName.split(' ')[0]}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: Teacher Create/Edit Lesson or Activity */}
      {isTeacherModalOpen && (
        <TeacherLessonModal
          lessonToEdit={editingLesson}
          defaultTipo={teacherModalDefaultTipo}
          currentUser={currentUser}
          onSave={handleSaveLesson}
          onClose={() => {
            setIsTeacherModalOpen(false);
            setEditingLesson(null);
          }}
        />
      )}

      {/* MODAL 2: Student Lesson Detail */}
      {activeDetailLesson && (
        <StudentLessonDetailModal
          lesson={activeDetailLesson}
          onClose={() => setActiveDetailLesson(null)}
          onToggleComplete={handleToggleComplete}
          onUpdateNotes={handleUpdateNotes}
          onOpenPdf={(file, title) => setActivePdfViewer({ file, lessonTitle: title })}
          speak={speak}
          isSpeaking={isSpeaking}
          cancelSpeak={cancelSpeak}
        />
      )}

      {/* MODAL 3: PDF Viewer Modal */}
      {activePdfViewer && (
        <PdfViewerModal
          file={activePdfViewer.file}
          lessonTitle={activePdfViewer.lessonTitle}
          onClose={() => setActivePdfViewer(null)}
          onSpeakText={speak}
        />
      )}

      {/* MODAL 4: Dedicated MP3 Videoaula Player with VLibras */}
      {activeMp3Modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl my-auto rounded-3xl bg-white border border-slate-300 shadow-2xl p-6 text-black space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileAudio className="h-6 w-6 text-black" />
                <h3 className="text-base font-black text-black">
                  Reprodução de Videoaula & Tradução em Libras
                </h3>
              </div>
              <button
                onClick={() => setActiveMp3Modal(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-black border border-slate-300 text-xs font-bold transition"
              >
                Fechar
              </button>
            </div>

            <Mp3VideoLessonPlayer
              mp3Lesson={activeMp3Modal.mp3}
              lessonTitle={activeMp3Modal.lessonTitle}
              onClose={() => setActiveMp3Modal(null)}
            />
          </div>
        </div>
      )}


    </div>
  );
};
