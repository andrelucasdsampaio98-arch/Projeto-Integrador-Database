import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSpeechSynthesisProps {
  rate?: number;
  pitch?: number;
  voiceURI?: string;
  onVoiceAutoSelect?: (voiceURI: string) => void;
}

/**
 * Normalizes language tags (pt-BR, pt_BR, pt, por-BRA, etc.)
 */
export function isPortugueseVoice(v: SpeechSynthesisVoice): boolean {
  if (!v) return false;
  const lang = (v.lang || '').toLowerCase().replace('_', '-');
  const name = (v.name || '').toLowerCase();
  return (
    lang.startsWith('pt') ||
    lang.includes('por') ||
    name.includes('portugu') ||
    name.includes('brazil') ||
    name.includes('brasil')
  );
}

export type MobileVoiceType = 'mobile-google' | 'mobile-apple' | 'mobile-padrao';

export interface MobileVoiceItem {
  id: MobileVoiceType;
  title: string;
  badge: string;
  platform: string;
  description: string;
  samplePhrase: string;
  matchedVoice: SpeechSynthesisVoice | null;
}

/**
 * Resolves the 3 standard mobile device voices:
 * 1. Google Voz (Android / Chrome Mobile Neural)
 * 2. Apple / Siri (iPhone / iPad / Safari iOS)
 * 3. Voz Nativa do Smartphone (Samsung / Local Offline)
 */
export function getMobileVoices(voices: SpeechSynthesisVoice[]): MobileVoiceItem[] {
  const ptVoices = voices.filter(isPortugueseVoice);
  const pool = ptVoices.length > 0 ? ptVoices : voices;

  // 1. Google Voz (Android)
  const googleVoice = pool.find((v) => {
    const name = v.name.toLowerCase();
    const uri = (v.voiceURI || '').toLowerCase();
    return (
      name.includes('google') ||
      uri.includes('google') ||
      uri.includes('network') ||
      uri.includes('afs') ||
      name.includes('android')
    );
  }) || pool.find(v => (v.lang || '').toLowerCase().includes('pt-br')) || pool[0] || null;

  // 2. Apple / Siri (iOS)
  const appleVoice = pool.find((v) => {
    const name = v.name.toLowerCase();
    const uri = (v.voiceURI || '').toLowerCase();
    return (
      name.includes('luciana') ||
      name.includes('felipe') ||
      name.includes('joana') ||
      name.includes('apple') ||
      uri.includes('apple') ||
      name.includes('siri')
    );
  }) || pool.find(v => v !== googleVoice) || pool[0] || null;

  // 3. Voz Nativa do Celular (Samsung / Local do Smartphone)
  const nativeMobileVoice = pool.find((v) => {
    const name = v.name.toLowerCase();
    const uri = (v.voiceURI || '').toLowerCase();
    return (
      name.includes('samsung') ||
      name.includes('local') ||
      uri.includes('local') ||
      v.default ||
      (v !== googleVoice && v !== appleVoice)
    );
  }) || pool.find(v => v.default) || pool[1] || pool[0] || null;

  return [
    {
      id: 'mobile-google',
      title: 'Google Voz (Android)',
      badge: 'Android • Neural',
      platform: 'Smartphones Android',
      description: googleVoice ? googleVoice.name : 'Voz Neural do Google para Android',
      samplePhrase: 'Olá! Voz Google para celulares Android selecionada com sucesso.',
      matchedVoice: googleVoice,
    },
    {
      id: 'mobile-apple',
      title: 'Apple / Siri (iOS)',
      badge: 'iPhone • iPad',
      platform: 'Dispositivos Apple iOS',
      description: appleVoice ? appleVoice.name : 'Voz Luciana / Siri para iPhone e iPad',
      samplePhrase: 'Olá! Voz Apple para iPhone e iPad selecionada com sucesso.',
      matchedVoice: appleVoice,
    },
    {
      id: 'mobile-padrao',
      title: 'Voz Nativa do Celular',
      badge: 'Offline • Sistema',
      platform: 'Samsung / Padrão do Aparelho',
      description: nativeMobileVoice ? nativeMobileVoice.name : 'Sintetizador nativo local do smartphone',
      samplePhrase: 'Olá! Voz nativa do aparelho selecionada com sucesso.',
      matchedVoice: nativeMobileVoice,
    },
  ];
}

/**
 * Scores voices to find the closest match to ChatGPT's expressive,
 * natural and warm conversational voice in Brazilian Portuguese.
 */
export function scoreVoiceForChatGpt(
  v: SpeechSynthesisVoice | null,
  preferredPersona: 'chatgpt-natural' | 'chatgpt-masculino' | 'padrao' = 'chatgpt-masculino'
): number {
  if (!v) return -1000;
  const name = (v.name || '').toLowerCase();
  const uri = (v.voiceURI || '').toLowerCase();
  const lang = (v.lang || '').toLowerCase().replace('_', '-');
  let score = 0;

  // Non-Portuguese voices get large penalty
  const isPt = isPortugueseVoice(v);
  if (!isPt) return -800;

  // pt-BR highest priority
  if (lang === 'pt-br') score += 150;
  else if (lang.startsWith('pt')) score += 60;

  // 1. Microsoft Antonio Natural (Male ChatGPT style - other voice)
  if (name.includes('antonio')) {
    score += preferredPersona === 'chatgpt-masculino' ? 650 : 250;
  }
  // Microsoft Francisca Natural
  if (name.includes('francisca')) {
    score += preferredPersona === 'chatgpt-masculino' ? 250 : 650;
  }
  if (name.includes('thalita')) {
    score += 400;
  }

  // Neural and Natural descriptors indicate modern cloud/neural TTS (like ChatGPT)
  if (name.includes('natural') || uri.includes('natural')) score += 300;
  if (name.includes('neural') || uri.includes('neural')) score += 300;
  if (name.includes('online') || uri.includes('online')) score += 150;
  if (name.includes('enhanced') || name.includes('premium')) score += 180;

  // 2. Google Natural / Cloud Neural pt-BR voices (Android & Chrome)
  if (name.includes('google') && (lang === 'pt-br' || name.includes('brasil') || name.includes('português'))) {
    score += 350;
  }
  if (uri.includes('network') || name.includes('network') || uri.includes('afs') || uri.includes('yfn')) {
    score += 260;
  }

  // 3. Apple Brazilian voices (iOS & macOS)
  if (name.includes('felipe')) score += preferredPersona === 'chatgpt-masculino' ? 380 : 240;
  if (name.includes('luciana')) score += preferredPersona === 'chatgpt-masculino' ? 240 : 380;
  if (name.includes('siri')) score += 320;
  if (name.includes('joana')) score += 220;

  // Samsung Natural
  if (name.includes('samsung') && lang.startsWith('pt')) score += 120;

  // Severely penalize legacy robotic desktop synthesizers (SAPI 4/5, espeak, older monotone desktop voices)
  if (name.includes('desktop') && !name.includes('natural')) score -= 450;
  if (name.includes('espeak') || uri.includes('espeak')) score -= 900;
  if (name.includes('microsoft maria') && !name.includes('natural')) score -= 450;
  if (name.includes('microsoft daniel') && !name.includes('natural')) score -= 450;
  if (name.includes('helena') && !name.includes('natural')) score -= 350;

  return score;
}

export function findBestVoiceForChatGpt(
  voices: SpeechSynthesisVoice[],
  preferredPersona: 'chatgpt-natural' | 'chatgpt-masculino' | 'padrao' = 'chatgpt-masculino'
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // Filter Portuguese voices first
  const ptVoices = voices.filter(isPortugueseVoice);
  const candidatePool = ptVoices.length > 0 ? ptVoices : voices;

  const sorted = [...candidatePool].sort(
    (a, b) => scoreVoiceForChatGpt(b, preferredPersona) - scoreVoiceForChatGpt(a, preferredPersona)
  );
  return sorted[0] || candidatePool[0] || null;
}

export function useSpeechSynthesis({ 
  rate = 1.05, 
  pitch = 1.02, 
  voiceURI = '',
  onVoiceAutoSelect 
}: UseSpeechSynthesisProps = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentVoiceURIRef = useRef(voiceURI);
  const onVoiceAutoSelectRef = useRef(onVoiceAutoSelect);
  const resumeIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    currentVoiceURIRef.current = voiceURI;
  }, [voiceURI]);

  useEffect(() => {
    onVoiceAutoSelectRef.current = onVoiceAutoSelect;
  }, [onVoiceAutoSelect]);

  // Load and sync voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      const updateVoices = () => {
        try {
          const availableVoices = window.speechSynthesis.getVoices() || [];
          if (availableVoices.length === 0) return;

          setVoices(availableVoices);

          // By default, prioritize the alternative ChatGPT voice persona ('chatgpt-masculino')
          const bestChatGpt = findBestVoiceForChatGpt(availableVoices, 'chatgpt-masculino');
          let targetVoice: SpeechSynthesisVoice | null = null;

          // Check if currentVoiceURIRef matches an existing voice
          if (currentVoiceURIRef.current) {
            const currentMatch = availableVoices.find((v) => v.voiceURI === currentVoiceURIRef.current) || null;
            if (currentMatch) {
              targetVoice = currentMatch;
            }
          }

          // If no targetVoice yet, pick best alternative ChatGPT voice
          if (!targetVoice && bestChatGpt) {
            targetVoice = bestChatGpt;
            currentVoiceURIRef.current = bestChatGpt.voiceURI;
            onVoiceAutoSelectRef.current?.(bestChatGpt.voiceURI);
          }

          const finalVoice = targetVoice || bestChatGpt || availableVoices[0] || null;
          setSelectedVoice((prev) => (prev?.voiceURI === finalVoice?.voiceURI ? prev : finalVoice));
        } catch (e) {
          console.warn('Error reading speechSynthesis voices:', e);
        }
      };

      // 1. Initial attempt
      updateVoices();

      // 2. Browser event listener
      window.speechSynthesis.onvoiceschanged = updateVoices;
      if (typeof window.speechSynthesis.addEventListener === 'function') {
        window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
      }

      // 3. Fallback active polling (essential for Chrome, Android & Safari where voices load asynchronously)
      let pollCount = 0;
      const pollInterval = window.setInterval(() => {
        pollCount++;
        const currentVoices = window.speechSynthesis.getVoices();
        if (currentVoices && currentVoices.length > 0) {
          updateVoices();
          window.clearInterval(pollInterval);
        } else if (pollCount > 30) {
          window.clearInterval(pollInterval);
        }
      }, 100);

      return () => {
        window.clearInterval(pollInterval);
        if (typeof window.speechSynthesis.removeEventListener === 'function') {
          window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
        }
        if (resumeIntervalRef.current) {
          window.clearInterval(resumeIntervalRef.current);
        }
      };
    }
  }, []);

  // Sync selectedVoice when voiceURI prop changes
  useEffect(() => {
    if (voiceURI && voices.length > 0) {
      const match = voices.find((v) => v.voiceURI === voiceURI);
      if (match) {
        setSelectedVoice((prev) => (prev?.voiceURI === match.voiceURI ? prev : match));
      }
    }
  }, [voiceURI, voices]);

  // Programmatic voice selector by URI
  const selectVoiceByURI = useCallback((targetURI: string) => {
    if (!targetURI) return;
    currentVoiceURIRef.current = targetURI;
    const currentList = voices.length > 0 
      ? voices 
      : (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : []);
    const match = currentList.find((v) => v.voiceURI === targetURI);
    if (match) {
      setSelectedVoice(match);
      onVoiceAutoSelectRef.current?.(match.voiceURI);
    }
  }, [voices]);

  // Select one of the 3 Mobile Device Voices
  const selectMobileVoice = useCallback((mobileType: MobileVoiceType): SpeechSynthesisVoice | null => {
    const currentList = voices.length > 0 
      ? voices 
      : (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : []);
    if (!currentList || currentList.length === 0) return null;

    const mobileList = getMobileVoices(currentList);
    const chosen = mobileList.find(m => m.id === mobileType);
    if (chosen && chosen.matchedVoice) {
      setSelectedVoice(chosen.matchedVoice);
      currentVoiceURIRef.current = chosen.matchedVoice.voiceURI;
      onVoiceAutoSelectRef.current?.(chosen.matchedVoice.voiceURI);
      return chosen.matchedVoice;
    }
    return null;
  }, [voices]);

  // Select ChatGPT optimized voice persona
  const setChatGptPersona = useCallback(
    (persona: 'chatgpt-natural' | 'chatgpt-masculino' = 'chatgpt-natural'): SpeechSynthesisVoice | null => {
      const currentList = voices.length > 0 
        ? voices 
        : (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : []);
      if (!currentList || currentList.length === 0) return null;

      const best = findBestVoiceForChatGpt(currentList, persona);
      if (best) {
        setSelectedVoice(best);
        currentVoiceURIRef.current = best.voiceURI;
        onVoiceAutoSelectRef.current?.(best.voiceURI);
      }
      return best;
    },
    [voices]
  );

  // Cycles to the next available Portuguese voice
  const cycleNextVoice = useCallback((): SpeechSynthesisVoice | null => {
    const currentList = voices.length > 0 
      ? voices 
      : (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : []);
    if (!currentList || currentList.length === 0) return null;

    const ptVoices = currentList.filter(isPortugueseVoice);
    const pool = ptVoices.length > 0 ? ptVoices : currentList;

    // Filter distinct voices
    const distinct = pool.filter(
      (v, i, arr) => arr.findIndex((item) => item.voiceURI === v.voiceURI || item.name === v.name) === i
    );

    if (distinct.length === 0) return null;

    const currentURI = currentVoiceURIRef.current || selectedVoice?.voiceURI;
    const currentIndex = distinct.findIndex((v) => v.voiceURI === currentURI);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % distinct.length;
    const nextVoice = distinct[nextIndex];

    setSelectedVoice(nextVoice);
    currentVoiceURIRef.current = nextVoice.voiceURI;
    onVoiceAutoSelectRef.current?.(nextVoice.voiceURI);
    return nextVoice;
  }, [voices, selectedVoice]);

  const cancel = useCallback(() => {
    if (isSupported && typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        delete (window as any).__activeSpeechUtterance;
      } catch {}
      if (resumeIntervalRef.current) {
        window.clearInterval(resumeIntervalRef.current);
        resumeIntervalRef.current = null;
      }
      setIsSpeaking(false);
      setSpeakingText(null);
    }
  }, [isSupported]);

  const speak = useCallback(
    (text: string, onEndCallback?: () => void, overrideVoiceURI?: string, overridePitch?: number) => {
      if (!isSupported || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      if (!text || !text.trim()) return;

      try {
        // Clear any previous interval
        if (resumeIntervalRef.current) {
          window.clearInterval(resumeIntervalRef.current);
          resumeIntervalRef.current = null;
        }

        // Clean text and format natural conversational cadence (natural pauses after punctuation)
        const cleanText = text
          .replace(/[*_#`~[\]]/g, ' ')
          .replace(/([.?!,;:])/g, '$1 ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!cleanText) return;

        // Ensure available voices are retrieved even if state was delayed
        const freshVoices = window.speechSynthesis.getVoices();
        const availableVoices = freshVoices && freshVoices.length > 0 ? freshVoices : voices;

        // Target voice resolution order:
        // 1. Explicit overrideVoiceURI passed directly to speak()
        // 2. User selected voice (selectedVoice or currentVoiceURIRef)
        // 3. Best alternative ChatGPT voice
        const bestVoice = findBestVoiceForChatGpt(availableVoices, 'chatgpt-masculino');
        let voiceToUse: SpeechSynthesisVoice | null = null;

        if (overrideVoiceURI) {
          voiceToUse = availableVoices.find((v) => v.voiceURI === overrideVoiceURI) || null;
        }

        if (!voiceToUse) {
          const targetURI = currentVoiceURIRef.current || selectedVoice?.voiceURI;
          const candidate = (targetURI ? availableVoices.find((v) => v.voiceURI === targetURI) : null) || selectedVoice;
          voiceToUse = candidate || bestVoice || availableVoices[0] || null;
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utteranceRef.current = utterance;

        if (voiceToUse) {
          utterance.voice = voiceToUse;
          utterance.lang = (voiceToUse.lang || 'pt-BR').replace('_', '-');
        } else {
          utterance.lang = 'pt-BR';
        }

        // Explicit full volume
        utterance.volume = 1.0;

        // Adaptive pitch: if not explicitly overridden, match voice timbre/gender for clear audible distinction
        let resolvedPitch = overridePitch ?? pitch ?? 1.02;
        if (overridePitch === undefined && voiceToUse) {
          const vName = (voiceToUse.name || '').toLowerCase();
          if (
            vName.includes('antonio') ||
            vName.includes('felipe') ||
            vName.includes('daniel') ||
            vName.includes('male') ||
            vName.includes('homem') ||
            vName.includes('jorge')
          ) {
            resolvedPitch = 0.95;
          } else if (
            vName.includes('francisca') ||
            vName.includes('luciana') ||
            vName.includes('maria') ||
            vName.includes('leticia') ||
            vName.includes('female') ||
            vName.includes('mulher') ||
            vName.includes('heloisa') ||
            vName.includes('joana') ||
            vName.includes('thalita')
          ) {
            resolvedPitch = 1.18;
          }
        }

        // Speed rate (default 1.05) and pitch
        utterance.rate = Math.max(0.6, Math.min(1.8, rate || 1.05));
        utterance.pitch = Math.max(0.6, Math.min(1.4, resolvedPitch));

        // Keep strong reference on window to prevent Garbage Collection in Chromium
        (window as any).__activeSpeechUtterance = utterance;

        const cleanup = () => {
          setIsSpeaking(false);
          setSpeakingText(null);
          delete (window as any).__activeSpeechUtterance;
          if (resumeIntervalRef.current) {
            window.clearInterval(resumeIntervalRef.current);
            resumeIntervalRef.current = null;
          }
        };

        utterance.onstart = () => {
          setIsSpeaking(true);
          setSpeakingText(cleanText);
        };

        utterance.onend = () => {
          cleanup();
          if (onEndCallback) onEndCallback();
        };

        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis utterance error:', e);
          cleanup();
        };

        // Reset and unpause speech synthesis engine
        try {
          window.speechSynthesis.cancel();
          window.speechSynthesis.resume();
        } catch {}

        // Speak utterance
        window.speechSynthesis.speak(utterance);

        // Immediate unpause for Chromium iframe/background policy
        try {
          window.speechSynthesis.resume();
        } catch {}

        // Anti-freeze heartbeat: Chromium has a known 15s pause bug during continuous speech
        resumeIntervalRef.current = window.setInterval(() => {
          if (typeof window === 'undefined' || !window.speechSynthesis) {
            if (resumeIntervalRef.current) window.clearInterval(resumeIntervalRef.current);
            return;
          }
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
            cleanup();
          }
        }, 200);

      } catch (err) {
        console.warn('SpeechSynthesis speak failed:', err);
        setIsSpeaking(false);
        setSpeakingText(null);
      }
    },
    [isSupported, selectedVoice, voices, rate, pitch]
  );

  const ptVoices = voices.filter(isPortugueseVoice);

  return {
    isSupported,
    isSpeaking,
    speakingText,
    voices,
    ptVoices,
    selectedVoice,
    setSelectedVoice,
    selectVoiceByURI,
    selectMobileVoice,
    setChatGptPersona,
    cycleNextVoice,
    speak,
    cancel,
  };
}
