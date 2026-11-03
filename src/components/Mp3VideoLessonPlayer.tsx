import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Sparkles, 
  Download, 
  FileAudio, 
  Bot, 
  Check, 
  ExternalLink,
  FastForward,
  ShieldCheck,
  Type
} from 'lucide-react';
import { LessonMp3Video } from '../types';
import { firebaseLoadAulaMaterialUrl, dataUrlToBlob } from '../lib/firebase';

interface Mp3VideoLessonPlayerProps {
  mp3Lesson: LessonMp3Video;
  lessonTitle: string;
  onClose?: () => void;
}

export const Mp3VideoLessonPlayer: React.FC<Mp3VideoLessonPlayerProps> = ({
  mp3Lesson,
  lessonTitle,
  onClose
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [vlibrasNotice, setVlibrasNotice] = useState(false);
  const [selectedSentence, setSelectedSentence] = useState<string | null>(null);
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState<string>(() => {
    return mp3Lesson.dataUrl && !mp3Lesson.dataUrl.startsWith('chunks://') ? mp3Lesson.dataUrl : '';
  });
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    setPlaybackError(null);

    const resolveAudio = async () => {
      const source = mp3Lesson.dataUrl;
      if (!source) return;

      if (source.startsWith('chunks://')) {
        const cleanId = source.replace('chunks://', '');
        const loaded = await firebaseLoadAulaMaterialUrl(cleanId, source);
        if (isCurrent && loaded) {
          setResolvedAudioUrl(loaded);
        }
      } else {
        setResolvedAudioUrl(source);
      }
    };

    resolveAudio();

    return () => {
      isCurrent = false;
    };
  }, [mp3Lesson.dataUrl]);

  // When resolvedAudioUrl updates, force audio element to reload source buffer
  useEffect(() => {
    if (audioRef.current && resolvedAudioUrl && !resolvedAudioUrl.startsWith('chunks://')) {
      audioRef.current.load();
    }
  }, [resolvedAudioUrl]);

  // Sync audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setPlaybackError(null);
      if (!audio.src && resolvedAudioUrl && !resolvedAudioUrl.startsWith('chunks://')) {
        audio.src = resolvedAudioUrl;
        audio.load();
      }
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn('Playback error:', e);
        setPlaybackError('Toque em "Tentar Tocar" ou use os controles de áudio abaixo.');
        setIsPlaying(false);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Invoke the official Government VLibras 3D Avatar
  const triggerVLibrasAvatar = (textToTranslate?: string) => {
    const text = (textToTranslate || mp3Lesson.transcript || '').trim();
    if (!text) return;

    // 1. Copy only pure text to clipboard (sem botões ou rótulos de interface)
    navigator.clipboard.writeText(text);
    setCopiedTranscript(true);
    setVlibrasNotice(true);
    setTimeout(() => setCopiedTranscript(false), 3000);
    setTimeout(() => setVlibrasNotice(false), 6000);

    // 2. Select ONLY the clean text in document so VLibras detection picks it up
    try {
      const container = document.getElementById('vlibras-active-transcript');
      if (container) {
        const range = document.createRange();
        if (textToTranslate) {
          const matchingP = Array.from(container.querySelectorAll('p')).find(
            (p) => p.textContent?.trim() === textToTranslate.trim()
          );
          if (matchingP) {
            range.selectNodeContents(matchingP);
          } else {
            range.selectNodeContents(container);
          }
        } else {
          range.selectNodeContents(container);
        }

        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    } catch {
      // ignore
    }

    // 3. Click the official government VLibras button if present
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

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Break transcript into clickable sentences for individual VLibras translation
  const sentences = mp3Lesson.transcript
    ? mp3Lesson.transcript.split(/(?<=[.?!])\s+/).filter(Boolean)
    : [];

  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-5 sm:p-6 shadow-sm space-y-5">
      {/* Audio Element */}
      <audio 
        ref={audioRef} 
        src={resolvedAudioUrl && !resolvedAudioUrl.startsWith('chunks://') ? resolvedAudioUrl : undefined} 
        preload="auto" 
        onError={() => {
          if (resolvedAudioUrl && !resolvedAudioUrl.startsWith('chunks://')) {
            setPlaybackError('Clique no botão Tentar Tocar ou utilize a barra nativa de áudio.');
          }
        }}
      />

      {playbackError && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-semibold flex items-center justify-between gap-2">
          <span>{playbackError}</span>
          <button
            onClick={() => {
              setPlaybackError(null);
              if (audioRef.current) {
                audioRef.current.load();
                audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
              }
            }}
            className="px-2.5 py-1 rounded-lg bg-black text-white font-bold hover:bg-slate-800 transition"
          >
            Tentar Tocar
          </button>
        </div>
      )}

      {/* Header of the MP3 lesson */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-300 text-stone-900 font-black shadow-xs border border-orange-400/50">
            <FileAudio className="h-6 w-6 text-stone-900" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-200 text-orange-950 border border-orange-300">
                Videoaula em MP3
              </span>
              <span className="text-xs text-stone-500 font-semibold">
                {mp3Lesson.fileName} &bull; {mp3Lesson.fileSizeFormatted}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-stone-900 mt-0.5">
              {mp3Lesson.title}
            </h3>
          </div>
        </div>

        {/* VLibras Primary Action Button */}
        <button
          onClick={() => triggerVLibrasAvatar()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-300 hover:bg-orange-400 text-stone-900 border border-orange-400 font-black text-xs sm:text-sm shadow-xs transition transform active:scale-95"
          title="Abrir o Boneco do VLibras e traduzir este áudio para Libras"
        >
          <Bot className="h-4 w-4 text-stone-900" />
          <span>Traduzir com Boneco VLibras</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-stone-900 border border-orange-300">
            3D Gov.br
          </span>
        </button>
      </div>

      {/* Notice alert when VLibras is triggered */}
      {vlibrasNotice && (
        <div className="p-3.5 rounded-xl bg-slate-50 border-2 border-black flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-black shrink-0" />
            <p className="text-xs sm:text-sm font-bold text-black">
              O <strong>Boneco 3D do VLibras</strong> foi acionado no canto da tela! O texto da videoaula foi copiado e selecionado para tradução.
            </p>
          </div>
          <span className="text-[10px] font-black bg-black text-white px-2 py-1 rounded-md uppercase shrink-0">
            Pronto
          </span>
        </div>
      )}

      {/* Audio Player Controls */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-4">
        {/* Progress Bar & Seek */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-700">
            <span>{formatTime(currentTime)}</span>
            <span className="flex items-center gap-1.5 text-slate-500">
              {isPlaying && (
                <span className="flex items-center gap-0.5">
                  <span className="h-2 w-1 bg-black animate-pulse rounded-full" />
                  <span className="h-3 w-1 bg-black animate-pulse delay-75 rounded-full" />
                  <span className="h-2 w-1 bg-black animate-pulse delay-150 rounded-full" />
                </span>
              )}
              {duration > 0 ? formatTime(duration) : mp3Lesson.durationFormatted}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max={duration || 60}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-black"
          />
        </div>

        {/* Buttons Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Play/Pause & Mute */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-300 hover:bg-orange-400 text-stone-900 border border-orange-400 shadow-xs transition active:scale-95"
              title={isPlaying ? 'Pausar áudio' : 'Reproduzir videoaula'}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-stone-900 text-stone-900" />
              ) : (
                <Play className="h-5 w-5 fill-stone-900 text-stone-900 ml-0.5" />
              )}
            </button>

            <button
              onClick={toggleMute}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 transition"
              title={isMuted ? 'Desmutar som' : 'Mutar som'}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-rose-600" />
              ) : (
                <Volume2 className="h-4 w-4 text-black" />
              )}
            </button>

            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  setCurrentTime(0);
                }
              }}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 transition"
              title="Voltar ao início"
            >
              <RotateCcw className="h-4 w-4 text-black" />
            </button>
          </div>

          {/* Speed switcher */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl p-1">
            <span className="text-[10px] font-black uppercase text-slate-500 px-1.5">
              Velocidade:
            </span>
            {[0.75, 1.0, 1.25, 1.5].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-2 py-1 rounded-lg text-xs font-black transition ${
                  playbackRate === speed
                    ? 'bg-black text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Download Button */}
          <a
            href={resolvedAudioUrl || mp3Lesson.dataUrl}
            download={mp3Lesson.fileName || 'videoaula.mp3'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-black border border-slate-300 text-xs font-bold transition"
            title="Baixar arquivo MP3 para seu computador ou celular"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Baixar MP3</span>
          </a>
        </div>
      </div>

      {/* Transcript with VLibras integration */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
              <Type className="h-3.5 w-3.5 text-black" />
              Roteiro & Transcrição para o Boneco do VLibras
            </h4>
          </div>

          <button
            onClick={() => {
              setSelectedSentence(null);
              triggerVLibrasAvatar();
            }}
            className="flex items-center gap-1.5 text-xs font-black text-black hover:underline"
            title="Traduzir o roteiro completo no Boneco 3D do VLibras"
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Traduzir Tudo no VLibras</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-500 font-medium">
          Dica: Clique ou selecione qualquer frase abaixo para que o Boneco do VLibras traduza diretamente o texto da aula.
        </p>

        {/* Transcript Box - Apenas texto limpo sem botões no fluxo do texto */}
        <div 
          id="vlibras-active-transcript"
          className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium leading-relaxed text-black shadow-xs space-y-2 select-text"
        >
          {sentences.length > 0 ? (
            sentences.map((sentence, idx) => {
              const isSelected = selectedSentence === sentence;
              return (
                <p 
                  key={idx}
                  onClick={() => {
                    setSelectedSentence(sentence);
                    triggerVLibrasAvatar(sentence);
                  }}
                  className={`p-2.5 rounded-lg cursor-pointer transition-colors leading-relaxed ${
                    isSelected 
                      ? 'bg-orange-100 text-orange-950 font-semibold ring-1 ring-orange-300' 
                      : 'hover:bg-slate-50 text-black'
                  }`}
                  title="Clique nesta frase para o Boneco 3D do VLibras traduzir apenas ela"
                >
                  {sentence}
                </p>
              );
            })
          ) : (
            <p className="text-black p-2">{mp3Lesson.transcript || 'Sem transcrição cadastrada para esta videoaula.'}</p>
          )}
        </div>

        {/* Libras Guide / Keywords */}
        {mp3Lesson.librasInstructions && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-black shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-black font-extrabold">Dica de Tradução em Libras: </strong>
              <span className="text-slate-800 font-semibold">{mp3Lesson.librasInstructions}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
