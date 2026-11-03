import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Trash2, 
  Plus, 
  Check, 
  Sparkles, 
  HelpCircle,
  FileCheck,
  Eye,
  BookOpen,
  FileAudio,
  Mic,
  MicOff,
  Play,
  Pause,
  Bot,
  ShieldCheck,
  Volume2,
  Image as ImageIcon,
  ExternalLink,
  Lock
} from 'lucide-react';
import { Lesson, LessonPdfFile, LessonMp3Video, TipoPublicacao, UserAccount } from '../types';
import { generatePdfDataUrl } from '../utils/pdfGenerator';
import { generateSampleAudioDataUrl } from '../utils/audioGenerator';
import { 
  firebaseSaveAulaMaterialChunks, 
  firebaseOpenOrDownloadMaterial, 
  isMaterialFileAllowed, 
  getMaterialCategory,
  fileToDataUrl
} from '../lib/firebase';

interface TeacherLessonModalProps {
  lessonToEdit?: Lesson | null;
  defaultTipo?: TipoPublicacao;
  currentUser?: UserAccount | null;
  onSave: (lesson: Lesson) => void;
  onClose: () => void;
}

export const TeacherLessonModal: React.FC<TeacherLessonModalProps> = ({
  lessonToEdit,
  defaultTipo = 'aula',
  currentUser,
  onSave,
  onClose
}) => {
  const [currentAulaId] = useState<string>(() => lessonToEdit?.id || 'aula-' + Date.now());
  const [tipo, setTipo] = useState<TipoPublicacao>(lessonToEdit?.tipo || defaultTipo);
  const [title, setTitle] = useState(lessonToEdit?.title || '');
  const [subject, setSubject] = useState(lessonToEdit?.subject || 'Informática');
  const [teacherName, setTeacherName] = useState(
    lessonToEdit?.teacherName || currentUser?.name || 'Prof. Docente'
  );
  const [date, setDate] = useState(
    lessonToEdit?.date || new Date().toISOString().split('T')[0]
  );
  const [deadline, setDeadline] = useState(lessonToEdit?.deadline || '');
  const [summary, setSummary] = useState(lessonToEdit?.summary || '');
  const [fullContent, setFullContent] = useState(lessonToEdit?.fullContent || '');
  const [instructions, setInstructions] = useState(lessonToEdit?.instructions || '');
  const [materialUrl, setMaterialUrl] = useState(lessonToEdit?.materialUrl || '');
  const [materialName, setMaterialName] = useState(lessonToEdit?.materialName || '');
  const [materialType, setMaterialType] = useState(lessonToEdit?.materialType || '');
  const [materialSize, setMaterialSize] = useState(lessonToEdit?.materialSize || '');
  const [accessibleTranscript, setAccessibleTranscript] = useState(
    lessonToEdit?.accessibleTranscript || ''
  );
  const [videoUrl, setVideoUrl] = useState(lessonToEdit?.videoUrl || '');
  const [tagsInput, setTagsInput] = useState(lessonToEdit?.tags ? lessonToEdit.tags.join(', ') : '');
  
  // PDF files
  const [pdfFiles, setPdfFiles] = useState<LessonPdfFile[]>(
    lessonToEdit?.pdfFiles || []
  );

  // MP3 Video lessons
  const [mp3Lessons, setMp3Lessons] = useState<LessonMp3Video[]>(
    lessonToEdit?.mp3Lessons || []
  );

  // Upload & Record states
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isUploadingMp3, setIsUploadingMp3] = useState(false);
  const [uploadProgressMp3, setUploadProgressMp3] = useState<number | null>(null);
  const [isUploadingToFirebase, setIsUploadingToFirebase] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [vlibrasNotice, setVlibrasNotice] = useState(false);

  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  // Refs for hidden inputs
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const mp3InputRef = useRef<HTMLInputElement>(null);

  const SUBJECTS = [
    'Informática',
    'Libras',
    'Língua Portuguesa',
    'Matemática',
    'Ciências',
    'História',
    'Geografia',
    'Artes',
    'Educação Física',
    'Tecnologias Assistivas'
  ];

  // ==================== VLIBRAS TRIGGER ====================
  const handleTriggerVLibras = (textToTranslate?: string) => {
    const text = textToTranslate || accessibleTranscript || summary || title;
    if (!text.trim()) {
      setUploadError('Digite ao menos o título ou o resumo da aula para traduzir no Boneco do VLibras.');
      return;
    }

    navigator.clipboard.writeText(text);
    setVlibrasNotice(true);
    setTimeout(() => setVlibrasNotice(false), 5000);

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

  // ==================== MP3 UPLOAD & RECORDING ====================
  const handleMp3FileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validAudio = file.type.startsWith('audio/') || 
      file.name.toLowerCase().endsWith('.mp3') || 
      file.name.toLowerCase().endsWith('.wav') || 
      file.name.toLowerCase().endsWith('.m4a') || 
      file.name.toLowerCase().endsWith('.ogg');

    if (!validAudio) {
      setUploadError('Por favor, selecione um arquivo de áudio válido (.mp3, .wav, .m4a, .ogg).');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadError('O arquivo de áudio excede o limite recomendado de 50MB.');
      return;
    }

    setIsUploadingMp3(true);
    setUploadProgressMp3(10);
    setUploadError(null);
    setUploadSuccessMessage(null);

    const sizeFormatted = 
      file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${Math.round(file.size / 1024)} KB`;

    try {
      const targetId = lessonToEdit?.id || currentAulaId;
      // Leitura imediata em base64 DataURL para reprodução instantânea
      const fileDataUrl = await fileToDataUrl(file);
      setUploadProgressMp3(35);

      const audioKey = `audio_${Date.now()}`;

      // Upload particionado em segundo plano com indicador de progresso
      await firebaseSaveAulaMaterialChunks(
        targetId,
        file,
        'audio',
        (pct) => setUploadProgressMp3(pct),
        audioKey
      );

      const newMp3: LessonMp3Video = {
        id: 'mp3-' + Date.now(),
        title: `Videoaula MP3: ${file.name.replace(/\.[^/.]+$/, '')}`,
        fileName: file.name,
        // Mantém o fileDataUrl para tocar imediatamente no navegador
        dataUrl: fileDataUrl,
        durationFormatted: 'Duração sob demanda',
        fileSizeFormatted: sizeFormatted,
        uploadedAt: new Date().toLocaleDateString('pt-BR'),
        transcript: accessibleTranscript || summary || 'Videoaula explicativa ministrada pelo docente.',
        librasInstructions: 'Sinalizar os conceitos centrais da aula com o avatar 3D VLibras.'
      };

      setMp3Lessons((prev) => [...prev, newMp3]);
      setUploadProgressMp3(100);
      setUploadSuccessMessage(`Áudio "${file.name}" carregado com sucesso e pronto para reprodução!`);
      setTimeout(() => setUploadProgressMp3(null), 2500);
    } catch (err: any) {
      console.warn('Erro ao processar MP3:', err);
      setUploadError('Erro ao gravar arquivo de áudio: ' + (err.message || 'Falha ao processar arquivo'));
      setUploadProgressMp3(null);
    } finally {
      setIsUploadingMp3(false);
      if (mp3InputRef.current) {
        mp3InputRef.current.value = '';
      }
    }
  };

  // Start Live Audio Recording
  const startRecording = async () => {
    try {
      setUploadError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          const mins = Math.floor(recordingSeconds / 60);
          const secs = recordingSeconds % 60;
          const durationStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

          const newMp3: LessonMp3Video = {
            id: 'mp3-rec-' + Date.now(),
            title: `Gravação de Videoaula (${new Date().toLocaleTimeString('pt-BR')})`,
            fileName: `aula_gravada_${Date.now()}.mp3`,
            dataUrl: base64Audio,
            durationFormatted: durationStr,
            fileSizeFormatted: `${Math.round(audioBlob.size / 1024)} KB`,
            uploadedAt: new Date().toLocaleDateString('pt-BR'),
            transcript: accessibleTranscript || summary || 'Áudio gravado ao vivo pelo professor.',
            librasInstructions: 'Tradução do áudio gravado em Libras pelo Boneco do VLibras.'
          };

          setMp3Lessons((prev) => [...prev, newMp3]);
        };
        reader.readAsDataURL(audioBlob);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      setUploadError('Não foi possível acessar o microfone para gravação. Verifique as permissões.');
    }
  };

  // Stop Live Audio Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  // Generate Sample Narrated MP3 Videoaula
  const handleGenerateSampleMp3 = () => {
    if (!title.trim()) {
      setUploadError('Preencha ao menos o Título da Aula para gerar a videoaula em áudio.');
      return;
    }

    const sampleDataUrl = generateSampleAudioDataUrl(title, 8);
    const newMp3: LessonMp3Video = {
      id: 'mp3-gen-' + Date.now(),
      title: `Videoaula em MP3: ${title}`,
      fileName: `videoaula_${title.toLowerCase().replace(/\s+/g, '_').substring(0, 20)}.mp3`,
      dataUrl: sampleDataUrl,
      durationFormatted: '06:15',
      fileSizeFormatted: '3.2 MB',
      uploadedAt: new Date().toLocaleDateString('pt-BR'),
      transcript: accessibleTranscript || summary || `Explicação em áudio da aula: ${title}.`,
      librasInstructions: 'Sinais principais em Libras da disciplina ' + subject
    };

    setMp3Lessons((prev) => [...prev, newMp3]);
    setUploadError(null);
  };

  const handleRemoveMp3 = (mp3Id: string) => {
    setMp3Lessons((prev) => prev.filter((m) => m.id !== mp3Id));
  };

  // ==================== MATERIAL UPLOAD & FIREBASE STORAGE ====================
  const handleMaterialFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPdf(true);
    setUploadError(null);
    setUploadSuccessMessage(null);

    const file = files[0];
    setSelectedFileName(file.name);
    setUploadProgress(10);

    // Valida se o formato está entre os permitidos: PDF, Word, PPT ou Imagem
    const validation = isMaterialFileAllowed(file);
    if (!validation.valid) {
      setUploadError(validation.reason || 'Formato de arquivo não suportado.');
      setIsUploadingPdf(false);
      setUploadProgress(null);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      return;
    }

    let storagePath = '';
    let signedUrlPreview = '';

    // Upload e particionamento do material para o Firestore (com progresso real)
    const targetId = lessonToEdit?.id || currentAulaId;
    setIsUploadingToFirebase(true);
    setIsUploadingPdf(true);
    setUploadProgress(15);

    const storageResult = await firebaseSaveAulaMaterialChunks(
      targetId,
      file, 
      'pdf',
      (progress) => setUploadProgress(progress)
    );

    setIsUploadingToFirebase(false);
    setIsUploadingPdf(false);

    if (storageResult.success && storageResult.materialUrl) {
      storagePath = storageResult.materialUrl;
      setUploadProgress(100);
      
      setMaterialUrl(storagePath);
      setMaterialName(file.name);
      setMaterialType(file.type || 'application/pdf');
      const sizeFormatted = 
        file.size > 1024 * 1024 
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
          : `${Math.round(file.size / 1024)} KB`;
      setMaterialSize(sizeFormatted);

      const newPdf: LessonPdfFile = {
        id: 'mat-' + Date.now(),
        name: file.name,
        sizeFormatted,
        dataUrl: storagePath,
        pathOrUrl: storagePath,
        uploadedAt: new Date().toLocaleDateString('pt-BR'),
        description: `Material anexado (${file.type || 'documento'}) em ${new Date().toLocaleDateString('pt-BR')}`
      };

      setPdfFiles((prev) => [...prev, newPdf]);
      setUploadSuccessMessage(`Material "${file.name}" anexado e gravado com sucesso!`);
      setTimeout(() => setUploadProgress(null), 2500);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    } else {
      console.warn('Erro ao salvar material:', storageResult.error);
      setUploadError(`Erro ao gravar arquivo: ${storageResult.error}`);
      setUploadProgress(null);
    }
  };

  const handleTestSignedUrl = async (pathOrUrl: string) => {
    const res = await firebaseOpenOrDownloadMaterial(pathOrUrl, materialName || 'material.pdf', 'open', lessonToEdit?.id || currentAulaId);
    if (!res.success) {
      setUploadError(res.error || 'Não foi possível abrir o link do material.');
    }
  };

  const handleGeneratePdfFromText = () => {
    if (!title.trim()) {
      setUploadError('Preencha ao menos o Título antes de gerar a apostila em PDF.');
      return;
    }

    const lines = [
      `${tipo === 'atividade' ? 'Atividade' : 'Aula'}: ${title}`,
      `Disciplina: ${subject}`,
      `Docente: ${teacherName}`,
      deadline ? `Prazo de Entrega: ${deadline}` : '',
      '',
      'Resumo:',
      summary || 'Sem resumo fornecido.',
      instructions ? `Instruções: ${instructions}` : '',
      '',
      'Conteúdo Programático:',
      ...(fullContent.split('\n').filter((l) => l.trim().length > 0))
    ];

    const generatedDataUrl = generatePdfDataUrl(title, teacherName, subject, lines);
    const newPdf: LessonPdfFile = {
      id: 'pdf-gen-' + Date.now(),
      name: `Material_${title.replace(/\s+/g, '_').substring(0, 20)}.pdf`,
      sizeFormatted: '145 KB',
      dataUrl: generatedDataUrl,
      uploadedAt: new Date().toLocaleDateString('pt-BR'),
      description: 'Apostila PDF gerada a partir do conteúdo digitado.'
    };

    setPdfFiles((prev) => [...prev, newPdf]);
    setUploadError(null);
  };

  const handleRemovePdf = (pdfId: string) => {
    setPdfFiles((prev) => prev.filter((p) => p.id !== pdfId));
  };

  // ==================== SUBMIT ====================
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setUploadError(`O título da ${tipo === 'atividade' ? 'atividade' : 'aula'} é obrigatório.`);
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const savedLesson: Lesson = {
      id: lessonToEdit ? lessonToEdit.id : currentAulaId,
      title: title.trim(),
      subject,
      teacherName: teacherName.trim(),
      date,
      summary: summary.trim(),
      fullContent: fullContent.trim(),
      accessibleTranscript: accessibleTranscript.trim(),
      videoUrl: videoUrl.trim(),
      pdfFiles,
      mp3Lessons,
      isCompleted: lessonToEdit?.isCompleted ?? false,
      studentNotes: lessonToEdit?.studentNotes ?? '',
      tags: tags.length > 0 ? tags : [subject, tipo],
      tipo,
      instructions: instructions.trim(),
      deadline: deadline || null,
      materialUrl: materialUrl || (pdfFiles.length > 0 ? pdfFiles[0].dataUrl : null),
      materialName: materialName || (pdfFiles.length > 0 ? pdfFiles[0].name : null),
      materialType: materialType || (pdfFiles.length > 0 ? 'application/pdf' : null),
      materialSize: materialSize || (pdfFiles.length > 0 ? pdfFiles[0].sizeFormatted : null),
      professorId: currentUser?.id || lessonToEdit?.professorId,
      isFromFirebase: true,
      isFromSupabase: true
    };

    onSave(savedLesson);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl my-auto rounded-3xl bg-white border border-slate-300 shadow-2xl text-black overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white font-black shadow-md">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-black text-white">
                  Acesso do Professor &bull; Gestão Pedagógica
                </span>
              </div>
              <h2 className="text-lg font-black text-black">
                {lessonToEdit 
                  ? `Editar ${tipo === 'atividade' ? 'Atividade' : 'Aula'} & Materiais` 
                  : `Cadastrar Nova ${tipo === 'atividade' ? 'Atividade' : 'Aula'} com Materiais & MP3`}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-black border border-slate-300 transition"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error notification */}
        {uploadError && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs sm:text-sm font-bold flex items-center justify-between">
            <span>{uploadError}</span>
            <button
              onClick={() => setUploadError(null)}
              className="text-rose-900 font-black hover:underline"
            >
              Fechar
            </button>
          </div>
        )}

        {/* VLibras Notice */}
        {vlibrasNotice && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-slate-50 border-2 border-black flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-black" />
              <p className="text-xs sm:text-sm font-bold text-black">
                <strong>Boneco 3D do VLibras acionado!</strong> O roteiro da aula foi enviado e copiado para você verificar a sinalização em tempo real.
              </p>
            </div>
            <span className="text-[10px] font-black bg-black text-white px-2 py-1 rounded uppercase">
              Ativo
            </span>
          </div>
        )}

        {/* Success notification */}
        {uploadSuccessMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs sm:text-sm font-bold flex items-center justify-between animate-in fade-in">
            <span>{uploadSuccessMessage}</span>
            <button
              onClick={() => setUploadSuccessMessage(null)}
              className="text-emerald-900 font-black hover:underline"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {/* Seletor Tipo: Aula vs Atividade */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              Tipo de Publicação:
            </label>
            <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1.5 rounded-2xl border border-stone-300">
              <button
                type="button"
                onClick={() => setTipo('aula')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition ${
                  tipo === 'aula'
                    ? 'bg-orange-300 text-stone-900 border border-orange-400 shadow-xs'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                <span>Cadastrar Aula (Didática & MP3)</span>
              </button>

              <button
                type="button"
                onClick={() => setTipo('atividade')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition ${
                  tipo === 'atividade'
                    ? 'bg-orange-300 text-stone-900 border border-orange-400 shadow-xs'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200'
                }`}
              >
                <FileCheck className="h-4 w-4" />
                <span>Cadastrar Atividade (com Prazo)</span>
              </button>
            </div>
          </div>

          {/* Section 1: Informações Gerais */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-black border-b border-slate-200 pb-2 flex items-center justify-between">
              <span>1. Informações Básicas {tipo === 'atividade' ? 'da Atividade' : 'da Aula'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 font-bold uppercase">
                {tipo === 'atividade' ? 'Atividade' : 'Aula'}
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-black flex items-center gap-1">
                  Título {tipo === 'atividade' ? 'da Atividade' : 'da Aula'} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={tipo === 'atividade' ? 'Ex: Atividade Prática 01 - Atalhos de Acessibilidade' : 'Ex: Introdução a Redes e Periféricos Inclusivos'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-black text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-black">
                  Disciplina
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-black text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-black"
                >
                  {SUBJECTS.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-black">
                  Professor Responsável
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-black text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-black">
                  Data de Publicação
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-black text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-black flex items-center justify-between">
                  <span>Prazo de Entrega</span>
                  <span className="text-[10px] text-slate-500 font-bold">(Opcional)</span>
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-black text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-black">
                Descrição Geral {tipo === 'atividade' ? 'da Atividade' : 'da Aula'}
              </label>
              <textarea
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Breve resumo dos conceitos e objetivos que serão aprendidos..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-black text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-black flex items-center justify-between">
                <span>Instruções e Orientações {tipo === 'atividade' ? 'para Entrega' : 'de Estudo'}</span>
                <span className="text-[10px] text-slate-500 font-bold">(Opcional)</span>
              </label>
              <textarea
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Ex: Como entregar, passos da atividade, critérios de avaliação ou orientações pedagógicas..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-black text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-black">
                Conteúdo Didático Completo
              </label>
              <textarea
                rows={4}
                value={fullContent}
                onChange={(e) => setFullContent(e.target.value)}
                placeholder="Texto explicativo detalhado, tópicos, passos práticos e instruções para os estudantes..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-black text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          {/* Section 2: Videoaulas em MP3 & Tradução em Libras */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                  <FileAudio className="h-4 w-4 text-black" />
                  2. Videoaulas em Áudio MP3 & Tradução no Boneco do VLibras
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Anexe videoaulas em áudio (.mp3), grave pelo microfone ou use o Boneco do VLibras para traduzir para Libras.
                </p>
              </div>

              {/* VLibras test button for teacher */}
              <button
                type="button"
                onClick={() => handleTriggerVLibras()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black hover:bg-slate-800 text-white text-xs font-black transition shadow-xs"
                title="Abrir o Boneco do VLibras para validar a tradução deste conteúdo"
              >
                <Bot className="h-3.5 w-3.5" />
                <span>Testar Boneco do VLibras</span>
              </button>
            </div>

            {/* Transcript & Libras script field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-black flex items-center gap-1">
                  <span>Roteiro / Transcrição da Videoaula para Libras</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    (usado pelo Boneco do VLibras)
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => handleTriggerVLibras(accessibleTranscript)}
                  className="text-xs font-black text-black hover:underline flex items-center gap-1"
                >
                  <Bot className="h-3 w-3" />
                  <span>Traduzir no VLibras</span>
                </button>
              </div>
              <textarea
                rows={2}
                value={accessibleTranscript}
                onChange={(e) => setAccessibleTranscript(e.target.value)}
                placeholder="Roteiro em frases curtas e diretas que o Boneco do VLibras irá traduzir em sinais para o estudante..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-black text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* MP3 Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => mp3InputRef.current?.click()}
                disabled={isUploadingMp3}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black hover:bg-slate-800 text-white text-xs font-black transition shadow-xs"
              >
                <Upload className="h-4 w-4" />
                <span>{isUploadingMp3 ? 'Carregando MP3...' : 'Upload de Arquivo .MP3'}</span>
              </button>

              {/* Microphone Recording Button */}
              {isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition animate-pulse shadow-md"
                >
                  <MicOff className="h-4 w-4" />
                  <span>Parar Gravação ({recordingSeconds}s)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 text-xs font-bold transition"
                  title="Gravar explicação com seu microfone"
                >
                  <Mic className="h-4 w-4" />
                  <span>Gravar Videoaula no Microfone</span>
                </button>
              )}

              {/* Generate Sample Narration */}
              <button
                type="button"
                onClick={handleGenerateSampleMp3}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 text-xs font-bold transition"
                title="Gerar áudio de demonstração com sintetizador"
              >
                <Sparkles className="h-4 w-4" />
                <span>Gerar Áudio de Demonstração</span>
              </button>
            </div>

            <input
              ref={mp3InputRef}
              type="file"
              accept="audio/mp3,audio/*,.mp3,.wav,.ogg,.m4a"
              onChange={handleMp3FileChange}
              className="hidden"
            />

            {/* Barra de Progresso do Envio do MP3 */}
            {uploadProgressMp3 !== null && (
              <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-black text-stone-900">
                  <span className="flex items-center gap-2">
                    <FileAudio className="h-4 w-4 animate-bounce text-orange-600" />
                    Enviando e gravando áudio no Firebase...
                  </span>
                  <span className="font-mono font-black text-sm text-stone-900">{uploadProgressMp3}%</span>
                </div>
                <div className="w-full bg-orange-200/70 h-3 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="bg-orange-500 h-full rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgressMp3}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-700 font-semibold">
                  <span>Destino: Firestore + Cache Local</span>
                  <span>{uploadProgressMp3 === 100 ? 'Áudio pronto ✓' : 'Processando fragmentos...'}</span>
                </div>
              </div>
            )}

            {/* List of Attached MP3s */}
            {mp3Lessons.length === 0 ? (
              <div 
                onClick={() => mp3InputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-black rounded-2xl p-5 text-center cursor-pointer transition bg-white"
              >
                <FileAudio className="h-9 w-9 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-black">Nenhuma videoaula em MP3 anexada</p>
                <p className="text-xs text-slate-500 mt-1">
                  Clique para carregar uma gravação .mp3 ou use o botão de gravação no microfone acima
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {mp3Lessons.map((mp3) => (
                  <div
                    key={mp3.id}
                    className="flex flex-col p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs gap-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black text-white font-black">
                          <FileAudio className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-black truncate">
                            {mp3.title}
                          </p>
                          <p className="text-xs text-slate-500 font-medium">
                            {mp3.fileName} &bull; {mp3.fileSizeFormatted} &bull; {mp3.durationFormatted}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Trigger VLibras for this MP3 */}
                        <button
                          type="button"
                          onClick={() => handleTriggerVLibras(mp3.transcript)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black text-white hover:bg-slate-800 text-xs font-bold transition"
                          title="Traduzir o áudio com o Boneco do VLibras"
                        >
                          <Bot className="h-3.5 w-3.5" />
                          <span>Ver no VLibras</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveMp3(mp3.id)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                          title="Remover esta videoaula em áudio"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Audio Preview Player for Teacher */}
                    {mp3.dataUrl && !mp3.dataUrl.startsWith('chunks://') && (
                      <div className="w-full pt-1.5 border-t border-slate-100 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Testar Áudio:</span>
                        <audio controls src={mp3.dataUrl} className="w-full h-7 rounded-lg" preload="metadata" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Anexo de Materiais Didáticos (PDF, Word, PowerPoint e Imagens) */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-black" />
                  3. Materiais Didáticos & Anexos (PDF, Word, PowerPoint e Imagens)
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Anexe arquivos do computador salvos no bucket privado <span className="font-bold text-black font-mono">materiais-aulas</span> na pasta do seu ID de professor.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={isUploadingPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black hover:bg-slate-800 text-white text-xs font-black transition shadow-xs"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{isUploadingPdf ? 'Enviando ao Storage...' : 'Selecionar Arquivo'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleGeneratePdfFromText}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 text-xs font-bold transition"
                  title="Gerar apostila em PDF a partir do texto digitado acima"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Gerar Apostila em PDF</span>
                </button>
              </div>
            </div>

            {/* Input com formatos permitidos: PDF, Word, PowerPoint e Imagens */}
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/png,image/jpeg,image/webp"
              onChange={handleMaterialFileChange}
              className="hidden"
            />

            {/* Formatos Suportados Badge */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="font-bold text-black flex items-center gap-1">
                <Lock className="h-3 w-3 text-emerald-700" /> Formatos aceitos:
              </span>
              <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-black">.pdf</span>
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-black">.doc / .docx (Word)</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-black">.ppt / .pptx (PowerPoint)</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black">.png / .jpg / .webp (Imagens)</span>
              <span className="ml-auto text-slate-500 text-[10px]">
                Organização: <code className="text-black font-semibold">{currentUser?.id ? `${currentUser.id.slice(0, 8)}.../` : 'ID_PROFESSOR/'}arquivo.ext</code>
              </span>
            </div>

            {/* Barra de Progresso do Envio (Firebase Storage) */}
            {uploadProgress !== null && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-black text-amber-950">
                  <span className="flex items-center gap-2">
                    <Upload className="h-4 w-4 animate-bounce text-amber-700" />
                    Enviando arquivo selecionado: <span className="font-mono text-black font-extrabold">{selectedFileName}</span>
                  </span>
                  <span className="font-mono font-black text-sm text-emerald-800">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-amber-200/70 h-3 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="bg-emerald-600 h-full rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-amber-900 font-semibold">
                  <span>Destino: Nuvem Firebase Storage <code className="font-mono font-bold text-black">materiais/pdf/</code></span>
                  <span>{uploadProgress === 100 ? 'Concluído ✓' : 'Gravando no Firebase...'}</span>
                </div>
              </div>
            )}

            {/* List of Attached Files */}
            {pdfFiles.length === 0 ? (
              <div 
                onClick={() => pdfInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-black rounded-2xl p-6 text-center cursor-pointer transition bg-white"
              >
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-black">Nenhum arquivo anexado ainda</p>
                <p className="text-xs text-slate-500 mt-1">
                  Clique aqui ou no botão acima para selecionar PDFs, documentos Word, slides PowerPoint ou imagens do seu computador.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {pdfFiles.map((pdf) => {
                  const cat = getMaterialCategory(pdf.name);
                  const isImage = cat === 'image';

                  return (
                    <div
                      key={pdf.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black ${
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
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-black truncate" title={pdf.name}>
                              {pdf.name}
                            </p>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                              cat === 'pdf' ? 'bg-rose-100 text-rose-800' :
                              cat === 'word' ? 'bg-blue-100 text-blue-800' :
                              cat === 'powerpoint' ? 'bg-amber-100 text-amber-800' :
                              cat === 'image' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-black'
                            }`}>
                              {cat.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Tamanho: <span className="font-bold text-black">{pdf.sizeFormatted}</span> &bull; {pdf.uploadedAt}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        {/* Testar Link Temporário Assinado */}
                        <button
                          type="button"
                          onClick={() => handleTestSignedUrl(pdf.dataUrl || materialUrl || pdf.name)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black text-white hover:bg-slate-800 text-xs font-bold transition shadow-2xs"
                          title="Abrir o material usando o visualizador ou link do Firebase"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Testar Link Seguro</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemovePdf(pdf.id)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                          title="Remover este anexo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 4: Tags e Conteúdo Complementar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-black">
                Tags / Palavras-chave (separadas por vírgula)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Ex: Hardware, Periféricos, Inclusão"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-black text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-black">
                Conteúdo Complementar (Vídeo, Artigo ou Material Externo)
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Ex: https://youtube.com/watch?v=... ou link externo"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-black text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 text-sm font-bold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-orange-300 hover:bg-orange-400 text-stone-900 border border-orange-400 text-sm font-black flex items-center gap-2 transition shadow-xs"
            >
              <Check className="h-4 w-4" />
              <span>{lessonToEdit ? 'Salvar Alterações' : 'Publicar Aula com PDFs e MP3'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
