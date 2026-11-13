import { useEffect, useRef, useState } from 'react';
import { Loader2, Square, Volume2 } from 'lucide-react';
import { api } from '../services/api';
import type { Language } from '../types';

interface ReadAloudButtonProps {
  text: string;
  language: Language;
  autoPlay?: boolean;
}

export function ReadAloudButton({ text, language, autoPlay = false }: ReadAloudButtonProps) {
  const isTe = language === 'te';
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayedRef = useRef(false);

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlaying(false);
  };

  const fallbackBrowserSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setPlaying(false);
      return;
    }
    window.speechSynthesis.cancel();
    const cleaned = text.replace(/https?:\/\/\S+/g, '').replace(/[#>*`_]/g, ' ');
    const utterance = new SpeechSynthesisUtterance(cleaned.slice(0, 1000));
    utterance.lang = isTe ? 'te-IN' : 'en-IN';
    utterance.rate = 0.92;
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    setPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const handlePlay = async () => {
    if (playing) {
      stopPlayback();
      return;
    }

    setLoading(true);
    try {
      const res = await api.synthesizeSpeech(text, language);
      const audio = new Audio(`data:${res.mimeType};base64,${res.audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => {
        audioRef.current = null;
        setPlaying(false);
      };
      audio.onerror = () => {
        audioRef.current = null;
        fallbackBrowserSpeech();
      };
      setPlaying(true);
      await audio.play();
    } catch {
      fallbackBrowserSpeech();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoPlay && !autoPlayedRef.current && text.trim()) {
      autoPlayedRef.current = true;
      handlePlay();
    }
    return () => {
      stopPlayback();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      type="button"
      onClick={handlePlay}
      disabled={loading}
      aria-label={playing ? 'Stop audio playback' : 'Listen to response aloud'}
      className={`px-3.5 py-2 min-h-[44px] text-xs font-medium rounded-lg border inline-flex items-center gap-2 transition-all cursor-pointer active:scale-[0.98] ${
        playing
          ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
          : 'bg-teal-50/70 hover:bg-teal-100 text-teal-800 border-teal-200'
      }`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : playing ? (
        <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true">
          <span className="w-0.5 h-3 bg-white rounded-full animate-civic-wave" style={{ animationDelay: '0ms' }} />
          <span className="w-0.5 h-3 bg-white rounded-full animate-civic-wave" style={{ animationDelay: '180ms' }} />
          <span className="w-0.5 h-3 bg-white rounded-full animate-civic-wave" style={{ animationDelay: '90ms' }} />
        </span>
      ) : (
        <Volume2 className="w-3.5 h-3.5" />
      )}
      {playing && <Square className="w-2.5 h-2.5 fill-current" />}
      <span>
        {loading
          ? isTe
            ? 'సిద్ధం...'
            : 'Loading...'
          : playing
          ? isTe
            ? 'ఆపండి'
            : 'Stop'
          : isTe
          ? 'వినండి'
          : 'Listen'}
      </span>
    </button>
  );
}
