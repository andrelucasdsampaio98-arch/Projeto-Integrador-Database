import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  ExternalLink, 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Volume2, 
  Sparkles,
  Check,
  Eye,
  Loader2
} from 'lucide-react';
import { LessonPdfFile } from '../types';
import { firebaseLoadAulaMaterialUrl } from '../lib/firebase';

interface PdfViewerModalProps {
  file: LessonPdfFile;
  lessonTitle: string;
  onClose: () => void;
  onSpeakText?: (text: string) => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  file,
  lessonTitle,
  onClose,
  onSpeakText
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string>(file.dataUrl);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);

  useEffect(() => {
    if (file.dataUrl && file.dataUrl.startsWith('chunks://')) {
      const aulaId = file.dataUrl.replace('chunks://', '');
      setIsLoadingChunks(true);
      firebaseLoadAulaMaterialUrl(aulaId, file.dataUrl).then((url) => {
        if (url) {
          setResolvedUrl(url);
        }
        setIsLoadingChunks(false);
      }).catch(() => {
        setIsLoadingChunks(false);
      });
    } else {
      setResolvedUrl(file.dataUrl);
    }
  }, [file.dataUrl]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = resolvedUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenNewTab = () => {
    const win = window.open();
    if (win) {
      win.document.write(
        `<title>${file.name}</title><iframe src="${resolvedUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
      );
    } else {
      handleDownload();
    }
  };

  const handleCopyFileLink = () => {
    navigator.clipboard.writeText(resolvedUrl.substring(0, 100) + '... (Arquivo PDF)');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-5xl h-[92vh] flex flex-col rounded-3xl bg-white border border-slate-300 shadow-2xl overflow-hidden text-black animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black text-white font-black shadow-xs">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-black border border-slate-300">
                  Arquivo PDF &bull; {file.sizeFormatted}
                </span>
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  {file.uploadedAt}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-black truncate max-w-md sm:max-w-xl">
                {file.name}
              </h2>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
              title="Baixar arquivo PDF para o computador ou celular"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Baixar PDF</span>
            </button>

            <button
              onClick={handleOpenNewTab}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-black border border-slate-300 text-xs font-bold transition"
              title="Abrir em janela separada"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden md:inline">Nova Aba</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-black border border-slate-300 transition"
              title="Fechar leitor de PDF"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Zoom, Rotate & Description */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-semibold hidden sm:inline">Aula:</span>
            <span className="font-bold text-black truncate max-w-xs">{lessonTitle}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomLevel((prev) => Math.max(60, prev - 20))}
              className="p-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-black"
              title="Diminuir Zoom"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="font-mono font-bold text-black text-xs px-1">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(180, prev + 20))}
              className="p-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-black"
              title="Aumentar Zoom"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              className="p-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-black ml-1"
              title="Girar visualização em 90 graus"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            {onSpeakText && file.description && (
              <button
                onClick={() => onSpeakText(`Descrição do PDF ${file.name}: ${file.description}`)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-black font-semibold ml-2"
                title="Ouvir descrição em áudio"
              >
                <Volume2 className="h-3.5 w-3.5 text-black" />
                <span className="hidden sm:inline">Ouvir Descrição</span>
              </button>
            )}
          </div>
        </div>

        {/* PDF Viewer Body */}
        <div className="flex-1 bg-slate-100 p-2 sm:p-4 overflow-auto flex items-center justify-center">
          <div 
            className="w-full h-full bg-white rounded-2xl shadow-md border border-slate-300 overflow-hidden flex flex-col transition-transform duration-200"
            style={{
              transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center center'
            }}
          >
            {isLoadingChunks ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-3">
                <Loader2 className="h-10 w-10 animate-spin text-black" />
                <p className="text-sm font-bold text-black">Carregando material pedagógico...</p>
              </div>
            ) : resolvedUrl ? (
              <iframe
                src={resolvedUrl}
                title={file.name}
                className="w-full h-full border-none rounded-2xl bg-white"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-3">
                <FileText className="h-16 w-16 text-slate-400" />
                <h3 className="text-lg font-bold text-black">Arquivo PDF Indisponível</h3>
                <p className="text-sm text-slate-600 max-w-md">
                  Não foi possível renderizar o arquivo neste momento. Experimente fazer o download diretamente.
                </p>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-black text-white font-bold text-sm shadow-xs"
                >
                  Baixar Arquivo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer info bar */}
        {file.description && (
          <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <Eye className="h-4 w-4 text-black shrink-0" />
              <span className="line-clamp-1">{file.description}</span>
            </div>
            <span className="text-slate-500 font-medium shrink-0 ml-4">
              Ponte &bull; Visualizador Integrado
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
