import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Eye, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  CheckCircle2, 
  Bookmark, 
  ExternalLink,
  Share2,
  BookOpen,
  Calendar,
  User,
  Check,
  Type,
  FileAudio,
  Bot,
  Clock,
  FileCheck,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { Lesson, LessonPdfFile } from '../types';
import { Mp3VideoLessonPlayer } from './Mp3VideoLessonPlayer';
import { 
  getMaterialCategory, 
  firebaseOpenOrDownloadMaterial 
} from '../lib/firebase';

interface StudentLessonDetailModalProps {
  lesson: Lesson;
  onClose: () => void;
  onToggleComplete: (lessonId: string) => void;
  onUpdateNotes: (lessonId: string, notes: string) => void;
  onOpenPdf: (file: LessonPdfFile, lessonTitle: string) => void;
  speak: (text: string) => void;
  isSpeaking: boolean;
  cancelSpeak: () => void;
}

export const StudentLessonDetailModal: React.FC<StudentLessonDetailModalProps> = ({
  lesson,
  onClose,
  onToggleComplete,
  onUpdateNotes,
  onOpenPdf,
  speak,
  isSpeaking,
  cancelSpeak
}) => {
  const [notes, setNotes] = useState(lesson.studentNotes || '');
  const [notesSaved, setNotesSaved] = useState(false);
  const [readingTextSize, setReadingTextSize] = useState<'normal' | 'grande' | 'gigante'>('normal');
  const [isGeneratingUrl, setIsGeneratingUrl] = useState<'open' | 'download' | null>(null);
  const [activeMaterialPath, setActiveMaterialPath] = useState<string | null>(null);
  const [materialError, setMaterialError] = useState<string | null>(null);

  const handleOpenMaterial = async (pathOrUrl: string, name?: string) => {
    setIsGeneratingUrl('open');
    setActiveMaterialPath(pathOrUrl);
    setMaterialError(null);
    const res = await firebaseOpenOrDownloadMaterial(pathOrUrl, name || 'material', 'open', lesson.id);
    if (!res.success) {
      setMaterialError(res.error || 'Erro ao abrir material.');
    }
    setIsGeneratingUrl(null);
    setActiveMaterialPath(null);
  };

  const handleDownloadMaterial = async (pathOrUrl: string, name?: string) => {
    setIsGeneratingUrl('download');
    setActiveMaterialPath(pathOrUrl);
    setMaterialError(null);
    const res = await firebaseOpenOrDownloadMaterial(pathOrUrl, name || 'material', 'download', lesson.id);
    if (!res.success) {
      setMaterialError(res.error || 'Erro ao baixar material.');
    }
    setIsGeneratingUrl(null);
    setActiveMaterialPath(null);
  };

  const handleSaveNotes = () => {
    onUpdateNotes(lesson.id, notes);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const handleReadLessonAloud = () => {
    if (isSpeaking) {
      cancelSpeak();
    } else {
      const textToRead = `Aula: ${lesson.title}. Disciplina: ${lesson.subject}. Professor: ${lesson.teacherName}. Resumo: ${lesson.summary}. Conteúdo da aula: ${lesson.fullContent}`;
      speak(textToRead);
    }
  };

  const handleTriggerVLibras = () => {
    // Attempt to invoke the government VLibras widget button
    const accessBtn = document.querySelector('[vw-access-button]') as HTMLElement;
    if (accessBtn) {
      accessBtn.click();
    }
    // Also copy lesson text to clipboard so student can paste into VLibras if desired
    navigator.clipboard.writeText(lesson.accessibleTranscript || lesson.title);
  };

  const getFontClass = () => {
    switch (readingTextSize) {
      case 'gigante':
        return 'text-lg sm:text-xl leading-relaxed';
      case 'grande':
        return 'text-base sm:text-lg leading-relaxed';
      default:
        return 'text-sm sm:text-base leading-relaxed';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl my-auto rounded-3xl bg-white border border-slate-300 shadow-2xl text-black overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white font-black shadow-xs">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  lesson.tipo === 'atividade'
                    ? 'bg-amber-100 text-amber-950 border-amber-300 font-black'
                    : 'bg-slate-100 text-black border-slate-300'
                }`}>
                  {lesson.tipo === 'atividade' ? '📝 Atividade' : '📚 Aula'}
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-black border border-slate-300">
                  {lesson.subject}
                </span>
                <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {lesson.date}
                </span>
              </div>
              <h2 className="text-lg font-black text-black">
                {lesson.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleComplete(lesson.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                lesson.isCompleted
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : 'bg-white hover:bg-slate-100 text-black border-slate-300'
              }`}
              title="Marcar aula como concluída"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{lesson.isCompleted ? 'Estudada ✓' : 'Marcar Concluída'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-black border border-slate-300 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Accessibility Action Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-semibold flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-slate-500" />
              Docente:
            </span>
            <span className="font-extrabold text-black">{lesson.teacherName}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* TTS Read Aloud */}
            <button
              onClick={handleReadLessonAloud}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition border ${
                isSpeaking 
                  ? 'bg-rose-600 text-white border-rose-700' 
                  : 'bg-white hover:bg-slate-100 text-black border-slate-300'
              }`}
              title="Ouvir o texto da aula narrado por voz sintética"
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="h-3.5 w-3.5" />
                  <span>Parar Áudio</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>Ouvir Aula em Voz Alta</span>
                </>
              )}
            </button>

            {/* VLibras Avatar Trigger */}
            <button
              onClick={handleTriggerVLibras}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 font-bold transition"
              title="Abrir o Boneco 3D do Governo Federal (VLibras) para tradução de Libras"
            >
              <span>🇧🇷</span>
              <span>Boneco 3D Gov (VLibras)</span>
            </button>

            {/* Font size toggle */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl p-0.5">
              <button
                onClick={() => setReadingTextSize('normal')}
                className={`px-2 py-0.5 rounded-lg font-bold text-xs ${
                  readingTextSize === 'normal' ? 'bg-black text-white' : 'text-slate-700'
                }`}
                title="Tamanho Normal"
              >
                A
              </button>
              <button
                onClick={() => setReadingTextSize('grande')}
                className={`px-2 py-0.5 rounded-lg font-bold text-xs ${
                  readingTextSize === 'grande' ? 'bg-black text-white' : 'text-slate-700'
                }`}
                title="Tamanho Grande"
              >
                A+
              </button>
              <button
                onClick={() => setReadingTextSize('gigante')}
                className={`px-2 py-0.5 rounded-lg font-bold text-xs ${
                  readingTextSize === 'gigante' ? 'bg-black text-white' : 'text-slate-700'
                }`}
                title="Tamanho Gigante"
              >
                A++
              </button>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Prazo de Entrega da Atividade */}
          {lesson.deadline && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-700 shrink-0" />
                <span className="font-black">Prazo de Entrega da Atividade:</span>
                <span className="font-bold underline">{lesson.deadline}</span>
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-amber-200 text-amber-950 border border-amber-400">
                Data Limite
              </span>
            </div>
          )}

          {/* Summary Card */}
          {lesson.summary && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <h3 className="text-xs font-black uppercase tracking-wider text-black mb-1">
                {lesson.tipo === 'atividade' ? 'Descrição da Atividade' : 'Resumo da Aula'}
              </h3>
              <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                {lesson.summary}
              </p>
            </div>
          )}

          {/* Instruções do Professor */}
          {lesson.instructions && (
            <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 space-y-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                <FileCheck className="h-4 w-4 text-stone-700" />
                Instruções do Professor
              </h3>
              <p className="text-sm font-semibold text-stone-800 whitespace-pre-line leading-relaxed">
                {lesson.instructions}
              </p>
            </div>
          )}

          {/* Accessible Transcript if available */}
          {lesson.accessibleTranscript && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-blue-700" />
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-950">
                  Guia Acessível em Linguagem Direta (Fácil Leitura e Libras)
                </h3>
              </div>
              <p className="text-sm font-bold text-blue-900 leading-relaxed">
                {lesson.accessibleTranscript}
              </p>
            </div>
          )}

          {/* SECTION: VIDEOAULAS EM MP3 & TRADUÇÃO COM BONECO DO VLIBRAS */}
          {lesson.mp3Lessons && lesson.mp3Lessons.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black text-white font-bold">
                    <FileAudio className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-black">
                      Videoaulas em Áudio MP3 & Tradução em Libras ({lesson.mp3Lessons.length})
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Ouça a explicação da aula e traduza para Libras com o Boneco do VLibras
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {lesson.mp3Lessons.map((mp3) => (
                  <Mp3VideoLessonPlayer
                    key={mp3.id}
                    mp3Lesson={mp3}
                    lessonTitle={lesson.title}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SECTION: MATERIAIS ANEXADOS PARA ESTUDO & ATIVIDADES */}
          {(() => {
            const allMaterials: Array<{
              id: string;
              name: string;
              pathOrUrl: string;
              sizeFormatted: string;
              type: string;
              description?: string;
              rawPdf?: LessonPdfFile;
            }> = [];

            if (lesson.materialUrl) {
              allMaterials.push({
                id: 'mat-primary',
                name: lesson.materialName || (lesson.tipo === 'atividade' ? 'Instrucoes_Atividade' : 'Material_Didatico'),
                pathOrUrl: lesson.materialUrl,
                sizeFormatted: lesson.materialSize || 'Anexo',
                type: lesson.materialType || 'application/octet-stream',
                description: `Material privado hospedado no bucket materiais-aulas`
              });
            }

            if (lesson.pdfFiles && lesson.pdfFiles.length > 0) {
              lesson.pdfFiles.forEach((f) => {
                // Evita duplicar se for o mesmo arquivo principal
                if (!lesson.materialUrl || (f.name !== lesson.materialName && f.dataUrl !== lesson.materialUrl)) {
                  allMaterials.push({
                    id: f.id,
                    name: f.name,
                    pathOrUrl: f.dataUrl,
                    sizeFormatted: f.sizeFormatted,
                    type: 'application/pdf',
                    description: f.description,
                    rawPdf: f
                  });
                }
              });
            }

            return (
              <div className="p-5 rounded-2xl bg-white border border-slate-300 space-y-4">
                <div className="flex flex-wrap items-center justify-between pb-2 border-b border-slate-200 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black text-white font-bold">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-black">
                        Materiais de Apoio & Anexos ({allMaterials.length})
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Arquivos anexados pelo professor para consulta e realização da {lesson.tipo === 'atividade' ? 'atividade' : 'aula'}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    Bucket Privado Seguro
                  </span>
                </div>

                {materialError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
                    <span>{materialError}</span>
                  </div>
                )}

                {allMaterials.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">
                    Nenhum material adicional foi anexado para esta publicação.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {allMaterials.map((file) => {
                      const cat = getMaterialCategory(file.name);
                      const isOpeningThis = isGeneratingUrl === 'open' && activeMaterialPath === file.pathOrUrl;
                      const isDownloadingThis = isGeneratingUrl === 'download' && activeMaterialPath === file.pathOrUrl;

                      return (
                        <div
                          key={file.id}
                          className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition space-y-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black ${
                              cat === 'pdf' ? 'bg-rose-100 text-rose-700' :
                              cat === 'word' ? 'bg-blue-100 text-blue-700' :
                              cat === 'powerpoint' ? 'bg-amber-100 text-amber-700' :
                              cat === 'image' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-black'
                            }`}>
                              {cat === 'image' ? (
                                <ImageIcon className="h-5 w-5 text-emerald-700" />
                              ) : (
                                <FileText className="h-5 w-5" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs font-black text-black truncate" title={file.name}>
                                  {file.name}
                                </h4>
                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-sm ${
                                  cat === 'pdf' ? 'bg-rose-100 text-rose-800' :
                                  cat === 'word' ? 'bg-blue-100 text-blue-800' :
                                  cat === 'powerpoint' ? 'bg-amber-100 text-amber-800' :
                                  cat === 'image' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-black'
                                }`}>
                                  {cat.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Tamanho: <span className="font-bold text-black">{file.sizeFormatted}</span>
                              </p>
                            </div>
                          </div>

                          {file.description && (
                            <p className="text-xs text-slate-600 line-clamp-2">
                              {file.description}
                            </p>
                          )}

                          {/* Botões do Aluno: Abrir material & Baixar material com links assinados temporários */}
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                            {/* Botão Abrir Material */}
                            <button
                              type="button"
                              onClick={() => handleOpenMaterial(file.pathOrUrl, file.name)}
                              disabled={Boolean(isGeneratingUrl)}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-black hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                              title="Abrir o material no navegador via link seguro assinado (createSignedUrl)"
                            >
                              {isOpeningThis ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  <span>Abrindo...</span>
                                </>
                              ) : (
                                <>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  <span>Abrir material</span>
                                </>
                              )}
                            </button>

                            {/* Botão Baixar Material */}
                            <button
                              type="button"
                              onClick={() => handleDownloadMaterial(file.pathOrUrl, file.name)}
                              disabled={Boolean(isGeneratingUrl)}
                              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-200 text-black border border-slate-300 text-xs font-bold transition disabled:opacity-50"
                              title="Baixar material para o computador via link temporário assinado"
                            >
                              {isDownloadingThis ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}
                              <span>Baixar material</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Full Lesson Text Content */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-black border-b border-slate-200 pb-1">
              Conteúdo Completo da Aula
            </h3>
            <div className={`p-5 rounded-2xl bg-white border border-slate-200 font-sans font-medium text-black whitespace-pre-wrap ${getFontClass()}`}>
              {lesson.fullContent}
            </div>
          </div>

          {/* Tags */}
          {lesson.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              <span className="text-xs font-bold text-slate-500 mr-1">Tópicos:</span>
              {lesson.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-black text-xs font-bold border border-slate-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Student Personal Study Notes */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-black" />
                <h3 className="text-xs font-black uppercase tracking-wider text-black">
                  Minhas Anotações & Dúvidas sobre a Aula
                </h3>
              </div>
              {notesSaved && (
                <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Anotações salvas!
                </span>
              )}
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escreva aqui suas observações, dúvidas para perguntar ao professor ou resumos..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-black text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black resize-y"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveNotes}
                className="px-4 py-2 rounded-xl bg-black hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
              >
                Salvar Anotações de Estudo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
