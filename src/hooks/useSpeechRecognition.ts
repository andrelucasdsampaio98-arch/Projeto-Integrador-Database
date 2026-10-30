import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  mergeTranscriptWithOverlap, 
  cleanRepeatedWords, 
  sanitizeInterimTranscript,
  polishSentences 
} from '../utils/speechDeduplication';

// Declare types for Web Speech API SpeechRecognition
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export function useSpeechRecognition() {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSecureOrigin, setIsSecureOrigin] = useState(true);
  const [antiRepeatEnabled, setAntiRepeatEnabled] = useState(true);
  const [strictMode, setStrictMode] = useState(true);
  const [duplicatesCount, setDuplicatesCount] = useState(0);

  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const lastProcessedIndexRef = useRef<number>(-1);
  const transcriptRef = useRef<string>('');
  const antiRepeatEnabledRef = useRef(antiRepeatEnabled);
  const strictModeRef = useRef(strictMode);

  useEffect(() => {
    antiRepeatEnabledRef.current = antiRepeatEnabled;
  }, [antiRepeatEnabled]);

  useEffect(() => {
    strictModeRef.current = strictMode;
  }, [strictMode]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isHttpsOrLocal =
        window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      setIsSecureOrigin(isHttpsOrLocal);

      const win = window as IWindow;
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        setIsSupported(true);
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'pt-BR';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          setErrorMessage(null);
        };

        recognition.onresult = (event: any) => {
          let currentInterim = '';
          const newFinalPieces: string[] = [];

          const startIndex = typeof event.resultIndex === 'number' ? event.resultIndex : 0;

          // Process finalized results and interim hypotheses
          for (let i = startIndex; i < event.results.length; i++) {
            const item = event.results[i];
            if (!item || !item[0]) continue;

            const text = (item[0].transcript || '').trim();
            if (item.isFinal) {
              if (text && i > lastProcessedIndexRef.current) {
                lastProcessedIndexRef.current = i;
                newFinalPieces.push(text);
              }
            } else {
              currentInterim += (item[0].transcript || '') + ' ';
            }
          }

          // If new final chunks arrived, merge with anti-overlap and repetition removal
          if (newFinalPieces.length > 0) {
            const incomingChunk = newFinalPieces.join(' ');
            const { merged, removedOverlapCount } = mergeTranscriptWithOverlap(
              transcriptRef.current,
              incomingChunk,
              antiRepeatEnabledRef.current,
              strictModeRef.current
            );
            transcriptRef.current = merged;
            setTranscript(merged);
            if (removedOverlapCount > 0) {
              setDuplicatesCount((prev) => prev + removedOverlapCount);
            }
          }

          // Sanitize interim text to prevent flickering duplicate words
          if (currentInterim.trim()) {
            const sanitizedInterim = sanitizeInterimTranscript(
              transcriptRef.current,
              currentInterim,
              antiRepeatEnabledRef.current
            );
            setInterimTranscript(sanitizedInterim);
          } else {
            setInterimTranscript('');
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition error:', event.error);
          if (event.error === 'not-allowed') {
            setErrorMessage('Permissão do microfone negada. Clique no cadeado do navegador para autorizar.');
            shouldListenRef.current = false;
            setIsListening(false);
          } else if (event.error === 'no-speech') {
            // Ignore benign no-speech timeout in continuous mode
          } else if (event.error === 'network') {
            setErrorMessage('Erro de conexão no reconhecimento de voz.');
          } else {
            setErrorMessage(`Erro no microfone: ${event.error}`);
          }
        };

        recognition.onend = () => {
          // Reset session index tracking for next recognition session to prevent index desync
          lastProcessedIndexRef.current = -1;

          if (shouldListenRef.current) {
            try {
              recognition.start();
            } catch {
              setIsListening(false);
            }
          } else {
            setIsListening(false);
          }
        };

        recognitionRef.current = recognition;
      } else {
        setIsSupported(false);
      }

      return () => {
        shouldListenRef.current = false;
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {
            // ignore
          }
        }
      };
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      setErrorMessage('Navegador incompatível. Recomendamos Google Chrome ou Microsoft Edge.');
      return;
    }

    try {
      setErrorMessage(null);
      shouldListenRef.current = true;
      lastProcessedIndexRef.current = -1;
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      // already started or transitioning
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const clearTranscript = useCallback(() => {
    transcriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    lastProcessedIndexRef.current = -1;
    setDuplicatesCount(0);
  }, []);

  const setManualTranscript = useCallback((newText: string) => {
    transcriptRef.current = newText;
    setTranscript(newText);
  }, []);

  const optimizeTranscript = useCallback(() => {
    const { cleaned, removedCount } = cleanRepeatedWords(transcriptRef.current, true);
    const polished = polishSentences(cleaned);
    transcriptRef.current = polished;
    setTranscript(polished);
    if (removedCount > 0) {
      setDuplicatesCount((prev) => prev + removedCount);
    }
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    errorMessage,
    isSecureOrigin,
    antiRepeatEnabled,
    setAntiRepeatEnabled,
    strictMode,
    setStrictMode,
    duplicatesCount,
    startListening,
    stopListening,
    clearTranscript,
    setTranscript: setManualTranscript,
    optimizeTranscript,
  };
}
