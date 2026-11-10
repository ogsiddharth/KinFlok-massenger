import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Check, X } from 'lucide-react';

interface AudioRecorderProps {
  onComplete: (audioDataUrl: string, durationSec: number) => void;
  onCancel: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onComplete, onCancel }) => {
  const [seconds, setSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(100);
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Audio recording failed:', err);
      setError('Microphone permission denied or not supported.');
    }
  };

  const handleStopAndSend = () => {
    if (!mediaRecorderRef.current) return;
    const finalSeconds = seconds;

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        onComplete(base64Data, finalSeconds);
      };
      reader.readAsDataURL(audioBlob);
    };

    cleanup();
  };

  const handleCancel = () => {
    cleanup();
    onCancel();
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm w-full">
        <span>{error}</span>
        <button
          onClick={handleCancel}
          className="p-1 hover:bg-red-100 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full bg-forest-900 text-warm-bg px-4 py-2.5 rounded-2xl shadow-inner animate-pulse-gentle">
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
        <span className="text-sm font-semibold tracking-wide font-mono">
          {formatTime(seconds)}
        </span>
        <span className="text-xs text-warm-variant hidden sm:inline">
          Recording voice memo...
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleCancel}
          type="button"
          className="p-2 text-warm-variant hover:text-red-400 hover:bg-forest-800 rounded-full transition"
          title="Cancel recording"
        >
          <X className="w-5 h-5" />
        </button>
        <button
          onClick={handleStopAndSend}
          type="button"
          className="p-2 bg-sage-500 hover:bg-sage-600 text-white rounded-full transition shadow-md"
          title="Send voice memo"
        >
          <Check className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
