import { useRef, useState } from 'react';
import { Loader2, Mic, Square } from 'lucide-react';
import { api, extractApiError } from '../services/api';
import type { Language } from '../types';

interface VoiceRecorderButtonProps {
  language: Language;
  disabled?: boolean;
  labelVariant?: 'compact' | 'full';
  onTranscribed: (text: string, detectedLanguage: Language) => void;
  onError?: (message: string) => void;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function VoiceRecorderButton({
  language,
  disabled = false,
  labelVariant = 'compact',
  onTranscribed,
  onError,
}: VoiceRecorderButtonProps) {
  const isTe = language === 'te';
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const speechRecRef = useRef<SpeechRecognitionLike | null>(null);
  const speechTranscriptRef = useRef<string>('');

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {
        // ignore
      }
      speechRecRef.current = null;
    }
  };

  const startRecording = async () => {
    if (disabled || processing) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onError?.(
        isTe
          ? 'ఈ బ్రౌజర్‌లో మైక్రోఫోన్ రికార్డింగ్ అందుబాటులో లేదు.'
          : 'Microphone recording is not supported in this browser.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      speechTranscriptRef.current = '';

      const SpeechRecCtor =
        typeof window !== 'undefined'
          ? ((window as unknown as Record<string, unknown>).SpeechRecognition ||
              (window as unknown as Record<string, unknown>).webkitSpeechRecognition)
          : undefined;
      if (typeof SpeechRecCtor === 'function') {
        try {
          const rec = new (SpeechRecCtor as new () => SpeechRecognitionLike)();
          rec.lang = isTe ? 'te-IN' : 'en-IN';
          rec.continuous = true;
          rec.interimResults = false;
          rec.onresult = (ev) => {
            const parts: string[] = [];
            for (let i = 0; i < ev.results.length; i++) {
              const alt = ev.results[i]?.[0]?.transcript;
              if (alt) parts.push(alt);
            }
            speechTranscriptRef.current = parts.join(' ').trim();
          };
          rec.onerror = () => {
            // silent passive fallback
          };
          rec.start();
          speechRecRef.current = rec;
        } catch {
          // ignore if browser blocks SpeechRecognition
        }
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        stopStream();
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size < 400) {
          if (speechTranscriptRef.current.trim()) {
            const fallbackText = speechTranscriptRef.current.trim();
            const hasTe = /[\u0C00-\u0C7F]/.test(fallbackText);
            onTranscribed(fallbackText, hasTe ? 'te' : language);
            return;
          }
          onError?.(
            isTe
              ? 'వాయిస్ రికార్డింగ్ చాలా చిన్నదిగా ఉంది. దయచేసి మళ్ళీ స్పష్టంగా మాట్లాడండి.'
              : 'Recording was too short. Please press the mic and speak clearly.'
          );
          return;
        }

        setProcessing(true);
        try {
          const result = await api.transcribeVoice(blob, language);
          if (result.text.trim()) {
            onTranscribed(result.text.trim(), result.detectedLanguage);
          } else if (speechTranscriptRef.current.trim()) {
            const fallbackText = speechTranscriptRef.current.trim();
            const hasTe = /[\u0C00-\u0C7F]/.test(fallbackText);
            onTranscribed(fallbackText, hasTe ? 'te' : language);
          } else {
            onError?.(
              isTe
                ? 'మాటలు స్పష్టంగా వినిపించలేదు. మళ్ళీ ప్రయత్నించండి.'
                : 'Could not hear clear speech. Please try again.'
            );
          }
        } catch (err) {
          if (speechTranscriptRef.current.trim()) {
            const fallbackText = speechTranscriptRef.current.trim();
            const hasTe = /[\u0C00-\u0C7F]/.test(fallbackText);
            onTranscribed(fallbackText, hasTe ? 'te' : language);
          } else {
            onError?.(extractApiError(err));
          }
        } finally {
          setProcessing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      stopStream();
      onError?.(
        isTe
          ? 'మైక్రోఫోన్ అనుమతి నిరాకరించబడింది. దయచేసి బ్రౌజర్‌లో మైక్రోఫోన్ అనుమతి ఇవ్వండి.'
          : 'Microphone permission was blocked. Please allow microphone access in your browser.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const idleLabel =
    labelVariant === 'full'
      ? isTe
        ? 'మాట్లాడి అడగండి'
        : 'Speak Question'
      : isTe
      ? 'మాట్లాడండి'
      : 'Speak';

  const recordingLabel = isTe ? 'ఆపండి & పంపండి' : 'Stop & Send';
  const processingLabel = isTe ? 'వింటోంది...' : 'Transcribing...';

  return (
    <button
      type="button"
      onClick={recording ? stopRecording : startRecording}
      disabled={disabled || processing}
      aria-label={recording ? recordingLabel : idleLabel}
      className={`px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer border active:scale-[0.98] ${
        recording
          ? 'bg-rose-600 hover:bg-rose-700 border-rose-700 text-white shadow-sm'
          : processing
          ? 'bg-teal-50 border-teal-200 text-teal-800'
          : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
      }`}
    >
      {processing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : recording ? (
        <span className="inline-flex items-end gap-0.5 h-3.5" aria-hidden="true">
          <span className="w-0.5 h-3.5 bg-white rounded-full animate-civic-wave" style={{ animationDelay: '0ms' }} />
          <span className="w-0.5 h-3.5 bg-white rounded-full animate-civic-wave" style={{ animationDelay: '150ms' }} />
          <span className="w-0.5 h-3.5 bg-white rounded-full animate-civic-wave" style={{ animationDelay: '300ms' }} />
          <span className="w-0.5 h-3.5 bg-white rounded-full animate-civic-wave" style={{ animationDelay: '100ms' }} />
        </span>
      ) : (
        <Mic className="w-4 h-4" />
      )}
      {recording && <Square className="w-3 h-3 fill-current" />}
      <span>{processing ? processingLabel : recording ? recordingLabel : idleLabel}</span>
    </button>
  );
}
