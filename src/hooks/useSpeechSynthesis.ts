import { useState, useEffect, useCallback } from 'react';

interface SpeechSynthesisHook {
  speak: (text: string) => void;
  cancel: () => void;
  isSpeaking: boolean;
  browserSupportsSpeechSynthesis: boolean;
  error: string | null;
}

const useSpeechSynthesis = (): SpeechSynthesisHook => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  const browserSupportsSpeechSynthesis = 'speechSynthesis' in window;

  useEffect(() => {
    if (!browserSupportsSpeechSynthesis) {
      setError('Speech synthesis is not supported by this browser.');
      return;
    }

    const synth = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance();
    u.lang = 'en-US';
    u.pitch = 1;
    u.rate = 1;
    u.volume = 1;

    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    u.onerror = (event) => {
      setError(`Speech synthesis error: ${event.error}`);
      setIsSpeaking(false);
    };

    setUtterance(u);

    return () => {
      synth.cancel();
    };
  }, [browserSupportsSpeechSynthesis]);

  const speak = useCallback((text: string) => {
    if (!browserSupportsSpeechSynthesis || !utterance) {
      setError('Speech synthesis not available or utterance not initialized.');
      return;
    }

    const synth = window.speechSynthesis;
    if (synth.speaking) {
      synth.cancel();
    }

    utterance.text = text;
    setIsSpeaking(true);
    synth.speak(utterance);
  }, [utterance, browserSupportsSpeechSynthesis]);

  const cancel = useCallback(() => {
    if (!browserSupportsSpeechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [browserSupportsSpeechSynthesis]);

  return {
    speak,
    cancel,
    isSpeaking,
    browserSupportsSpeechSynthesis,
    error,
  };
};

export default useSpeechSynthesis;
