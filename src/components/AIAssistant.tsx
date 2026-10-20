import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  ExternalLink,
  Sparkles,
  Heart,
  Smile,
  Frown,
  X,
} from 'lucide-react';
import type {
  Faculty,
  Batch,
  FacultyLoadWithDetails,
  ExtraClassWithDetails,
  RescheduledClassWithDetails,
  CancelledClassWithDetails,
  LoadBatchManager,
} from '@/lib/supabase';

import mayraGif from '@/assets/mayra-avatar.gif';
import greetingAudioSrc from '@/assets/audio/mayra-greeting.wav';

interface AIAssistantProps {
  faculty: Faculty[];
  batches: Batch[];
  loads: FacultyLoadWithDetails[];
  batchManagers?: LoadBatchManager[];
  extraClasses: ExtraClassWithDetails[];
  rescheduledClasses: RescheduledClassWithDetails[];
  cancelledClasses: CancelledClassWithDetails[];
  onNavigateTab?: (tab: string) => void;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type MayraEmotion = 'normal' | 'sad' | 'blush' | 'happy' | 'speaking';

// ⚡ Iron Man JARVIS Arc Reactor & Holographic Mayra Avatar
function JarvisArcReactorAvatar({
  size = 96,
  isSpeaking = false,
  isListening = false,
  emotion = 'normal',
}: {
  size?: number;
  isSpeaking?: boolean;
  isListening?: boolean;
  emotion?: MayraEmotion;
}) {
  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      {/* 1. Outer Arc Reactor Rotating Calibration Ring */}
      <svg
        className={`absolute inset-0 w-full h-full pointer-events-none transition-all duration-700 ${
          isSpeaking ? 'animate-spin-slow' : isListening ? 'animate-spin-slow' : 'opacity-40'
        }`}
        viewBox="0 0 100 100"
      >
        {/* Segmented HUD Ring with Tech Ticks */}
        <circle
          cx="50"
          cy="50"
          r="47"
          fill="none"
          stroke={isSpeaking ? '#fbbf24' : isListening ? '#00f0ff' : '#64748b'}
          strokeWidth="1.5"
          strokeDasharray="4 6"
          strokeOpacity="0.85"
        />
        {/* 4 Cardinal Reticle Tech Markers */}
        <line x1="50" y1="0" x2="50" y2="7" stroke={isSpeaking ? '#fbbf24' : '#00f0ff'} strokeWidth="2" />
        <line x1="50" y1="93" x2="50" y2="100" stroke={isSpeaking ? '#fbbf24' : '#00f0ff'} strokeWidth="2" />
        <line x1="0" y1="50" x2="7" y2="50" stroke={isSpeaking ? '#fbbf24' : '#00f0ff'} strokeWidth="2" />
        <line x1="93" y1="50" x2="100" y2="50" stroke={isSpeaking ? '#fbbf24' : '#00f0ff'} strokeWidth="2" />
      </svg>

      {/* 2. Counter-Rotating Inner Reactor Coils */}
      <svg
        className={`absolute inset-1.5 w-[calc(100%-12px)] h-[calc(100%-12px)] pointer-events-none transition-all duration-500 ${
          isSpeaking ? 'animate-spin-reverse' : isListening ? 'animate-spin-reverse' : 'opacity-35'
        }`}
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke={isSpeaking ? '#f59e0b' : '#38bdf8'}
          strokeWidth="1"
          strokeDasharray="16 8 4 8"
          strokeOpacity="0.75"
        />
        {/* 8 Arc Reactor Power Nodes */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const cx = 50 + 38 * Math.cos(rad);
          const cy = 50 + 38 * Math.sin(rad);
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r="2.2"
              fill={isSpeaking ? '#fbbf24' : isListening ? '#00f0ff' : '#94a3b8'}
              className={isListening || isSpeaking ? 'animate-pulse' : ''}
            />
          );
        })}
      </svg>

      {/* 3. Pulsing Arc Reactor Glow Core */}
      <div
        className={`absolute inset-2.5 rounded-full transition-all duration-500 backdrop-blur-md flex items-center justify-center overflow-hidden border ${
          isSpeaking
            ? 'bg-amber-950/50 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.8)] animate-arc-pulse'
            : isListening
            ? 'bg-slate-950/80 border-cyan-400 shadow-[0_0_30px_rgba(0,240,255,0.8)] animate-arc-pulse'
            : 'bg-slate-950/85 border-slate-700 shadow-[0_0_12px_rgba(100,116,139,0.3)]'
        }`}
      >
        {/* Holographic Scanline Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/15 to-transparent pointer-events-none opacity-70" />

        {/* Mayra Holographic Avatar floating in Core */}
        <img
          src={mayraGif}
          alt="Mayra JARVIS AI"
          className={`w-[80%] h-[80%] object-contain filter drop-shadow-lg transition-transform duration-300 ${
            isSpeaking ? 'scale-110 brightness-110' : isListening ? 'scale-105' : 'opacity-85'
          }`}
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src !== window.location.origin + '/mayra-avatar.gif') {
              target.src = '/mayra-avatar.gif';
            }
          }}
        />

        {/* Holographic Concentric Grid Lines */}
        <div className="absolute inset-0 rounded-full border border-cyan-400/25 pointer-events-none" />
      </div>

      {/* 4. Sleek Stark AI Micro HUD Tag */}
      <div className="absolute -bottom-2 z-10 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-950/95 border border-cyan-500/70 shadow-[0_0_15px_rgba(6,182,212,0.6)] text-[9px] font-mono tracking-wider font-extrabold text-cyan-300 uppercase pointer-events-none">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isSpeaking
              ? 'bg-amber-400 animate-ping'
              : isListening
              ? 'bg-cyan-400 animate-pulse'
              : 'bg-rose-500'
          }`}
        />
        <span>{isSpeaking ? 'TRANSMITTING' : isListening ? 'JARVIS ONLINE' : 'STANDBY'}</span>
      </div>

      {/* Emotion Overlay Emoji */}
      {emotion === 'sad' && (
        <span className="absolute -top-1 -right-1 text-base animate-bounce z-20">🥺</span>
      )}
      {emotion === 'blush' && (
        <span className="absolute -top-1 -right-1 text-base animate-pulse z-20">🥰</span>
      )}
    </div>
  );
}

// 💠 Iron Man Stark HUD Hologram Readout (Floating above the Arc Reactor)
function JarvisHologramHud({
  text,
  subtitle,
  isListening = false,
  isSpeaking = false,
}: {
  text: string;
  subtitle?: string;
  isListening?: boolean;
  isSpeaking?: boolean;
}) {
  return (
    <div className="relative inline-flex flex-col items-end select-none pointer-events-none animate-fadeIn">
      {/* Sci-Fi Hologram Header Tag */}
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-slate-950/95 border-t border-x border-cyan-500/70 shadow-[0_0_15px_rgba(6,182,212,0.4)] backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
          STARK A.I. // JARVIS
        </span>
      </div>

      {/* Main Holographic HUD Panel */}
      <div className="px-3.5 py-2 rounded-b-xl rounded-tl-xl bg-slate-950/95 border border-cyan-500/70 shadow-[0_0_22px_rgba(6,182,212,0.5)] backdrop-blur-xl text-right max-w-[260px] space-y-0.5">
        <div className="text-[11px] font-mono font-semibold text-cyan-100 tracking-wide truncate">
          {text}
        </div>
        {subtitle && (
          <div className="text-[9px] font-mono text-cyan-400/80 tracking-wider uppercase truncate">
            {subtitle}
          </div>
        )}
      </div>

      {/* Cyber Reticle Line Pointer pointing down to Arc Reactor */}
      <div className="w-0.5 h-3 bg-gradient-to-b from-cyan-400 to-transparent mr-8" />
    </div>
  );
}

export function AIAssistant({
  faculty,
  batches,
  loads,
  batchManagers = [],
  extraClasses,
  rescheduledClasses,
  cancelledClasses,
  onNavigateTab,
}: AIAssistantProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(true); // Always ON
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false); // 🎙️ Dedicated Mute/Unmute state
  const [emotion, setEmotion] = useState<MayraEmotion>('normal');
  const [lastSpeechResponse, setLastSpeechResponse] = useState<string>('');
  const [lastUserCommand, setLastUserCommand] = useState<string>('');
  const [showSubtitleCard, setShowSubtitleCard] = useState<boolean>(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('ai_mayra_voice_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  // 🎙️ Real-Time Hearing Feedback States (So Sir knows mic is receiving audio)
  const [liveHeardText, setLiveHeardText] = useState<string>('');
  const [isDetectingSpeech, setIsDetectingSpeech] = useState<boolean>(false);
  const [wakeWordDetected, setWakeWordDetected] = useState<boolean>(false);

  // Stable refs for props so that speech recognition never restarts or aborts on data changes
  const facultyRef = useRef(faculty);
  const batchesRef = useRef(batches);
  const loadsRef = useRef(loads);
  const batchManagersRef = useRef(batchManagers);
  const extraClassesRef = useRef(extraClasses);
  const rescheduledClassesRef = useRef(rescheduledClasses);
  const cancelledClassesRef = useRef(cancelledClasses);
  const onNavigateTabRef = useRef(onNavigateTab);

  useEffect(() => {
    facultyRef.current = faculty;
    batchesRef.current = batches;
    loadsRef.current = loads;
    batchManagersRef.current = batchManagers;
    extraClassesRef.current = extraClasses;
    rescheduledClassesRef.current = rescheduledClasses;
    cancelledClassesRef.current = cancelledClasses;
    onNavigateTabRef.current = onNavigateTab;
  }, [faculty, batches, loads, batchManagers, extraClasses, rescheduledClasses, cancelledClasses, onNavigateTab]);

  const micActiveRef = useRef<boolean>(true);
  const recognitionRef = useRef<any>(null);
  const startListenerRef = useRef<() => void>(() => {});
  const customAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const hideCardTimeoutRef = useRef<any>(null);
  const isStoppedRef = useRef<boolean>(false);
  const isRecognizingRef = useRef<boolean>(false);
  const interimTimerRef = useRef<any>(null);

  // 🛡️ Loop Protection & Acoustic Echo Cancellation Refs
  const isSpeakingRef = useRef<boolean>(false);
  const echoCooldownUntilRef = useRef<number>(0);
  const lastCommandTimeRef = useRef<number>(0);
  const lastCommandTextRef = useRef<string>('');

  // 🎵 Preload and decode custom studio voice into Web Audio buffer for instant, unblocked playback
  useEffect(() => {
    let active = true;
    const preloadCustomAudio = async () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        let res = await fetch(greetingAudioSrc);
        if (!res.ok) {
          res = await fetch('/mayra-greeting.wav');
        }
        const arrayBuf = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuf);
        if (active) {
          audioBufferRef.current = decoded;
          console.log('✅ Mayra custom studio voice decoded in memory buffer!');
        }
      } catch (err) {
        console.warn('Audio pre-decode note:', err);
      }
    };

    preloadCustomAudio();
    return () => { active = false; };
  }, []);

  // Load browser voices
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;
      setAvailableVoices(voices);
    };

    updateVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Filter out all male voices strictly
  const isMaleVoice = (v: SpeechSynthesisVoice): boolean => {
    const name = v.name.toLowerCase();
    return (
      (name.includes('male') && !name.includes('female')) ||
      name.includes('alex') ||
      name.includes('fred') ||
      name.includes('daniel') ||
      name.includes('david') ||
      name.includes('george') ||
      name.includes('rishi') ||
      name.includes('oliver') ||
      name.includes('thomas') ||
      name.includes('ravi') ||
      name.includes('guy') ||
      name.includes('mark') ||
      name.includes('madhur') ||
      name.includes('pradeep') ||
      name.includes('hemant')
    );
  };

  // 🌸 Pick Sweet Hindi/Indian Girl Voice (Natural, sweet human female tone - NOT high-pitched robot)
  const getMayraAnimeVoice = (): { voice: SpeechSynthesisVoice | null; pitch: number; rate: number } => {
    if (!availableVoices.length) return { voice: null, pitch: 1.10, rate: 1.02 };

    const isExcluded = (v: SpeechSynthesisVoice) => {
      const n = v.name.toLowerCase();
      const l = v.lang.toLowerCase();
      return (
        isMaleVoice(v) ||
        l.startsWith('ja') ||
        l.startsWith('zh') ||
        l.startsWith('ko') ||
        n.includes('kyoko') ||
        n.includes('otoya') ||
        n.includes('sinji') ||
        n.includes('ting-ting')
      );
    };

    // 1. High Priority: Dedicated Hindi Female Voices (Swara, Lekha, Heera, Kalpana, Google हिन्दी)
    const hindiFemale = availableVoices.find(v => 
      !isExcluded(v) && (
        v.name.includes('Swara') ||      // Microsoft Swara (Natural Hindi Female - Sweet & Clear)
        v.name.includes('Lekha') ||      // Apple Lekha Hindi Female
        v.name.includes('Heera') ||      // Microsoft Heera Female
        v.name.includes('Kalpana') ||    // Microsoft Kalpana Female
        v.name.includes('Google हिन्दी')  // Google Chrome Hindi Voice
      )
    ) || availableVoices.find(v => 
      !isExcluded(v) && 
      (v.lang.toLowerCase().startsWith('hi'))
    );

    if (hindiFemale) {
      return { voice: hindiFemale, pitch: 1.10, rate: 1.02 };
    }

    // 2. Second Priority: Indian Female Voices (Veena, Neerja, Aditi, etc.)
    const indianEnglishFemale = availableVoices.find(v => 
      !isExcluded(v) && (
        v.name.includes('Veena') ||     // Apple Indian English Female
        v.name.includes('Neerja') ||    // Microsoft Neerja Indian Female
        v.name.includes('Aditi') ||
        v.name.includes('Kanya') ||
        v.name.includes('Sangeeta') ||
        v.name.includes('Priya') ||
        ((v.lang.toLowerCase().includes('in')) && v.name.toLowerCase().includes('female'))
      )
    ) || availableVoices.find(v => 
      !isExcluded(v) && (v.lang.toLowerCase() === 'en-in' || v.lang.toLowerCase() === 'en_in')
    );

    if (indianEnglishFemale) {
      return { voice: indianEnglishFemale, pitch: 1.12, rate: 1.0 };
    }

    // 3. Third Priority: Natural Sweet Female Voices
    const naturalFemale = availableVoices.find(v => 
      !isExcluded(v) && (
        v.name.includes('Google UK English Female') ||
        v.name.includes('Google US English Female') ||
        v.name.includes('Samantha') || 
        v.name.includes('Victoria') || 
        v.name.includes('Karen') ||
        v.name.includes('Zira') ||
        v.name.includes('Jenny') ||
        v.name.includes('Aria') ||
        v.name.toLowerCase().includes('female')
      )
    );

    if (naturalFemale) {
      return { voice: naturalFemale, pitch: 1.12, rate: 1.0 };
    }

    const fallback = availableVoices.find(v => !isExcluded(v));
    return { voice: fallback || null, pitch: 1.10, rate: 1.0 };
  };

  // 🛑 Instant and unblockable speech stopper
  const stopSpeaking = () => {
    isStoppedRef.current = true;
    isSpeakingRef.current = false;
    echoCooldownUntilRef.current = Date.now() + 500;
    if (customAudioElementRef.current) {
      try {
        customAudioElementRef.current.pause();
        customAudioElementRef.current.currentTime = 0;
      } catch (e) {}
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // 🎙️ Natural Human Girl Voice Synthesizer (Pure Devanagari Hindi or cleaned English)
  const speakAnimeVoice = async (fullText: string) => {
    if (!voiceEnabled) return;
    stopSpeaking();
    isStoppedRef.current = false;

    const clean = fullText
      .replace(/[*_#`~•]/g, ' ')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[()\[\]{}]/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const sentences = clean
      .split(/(?<=[.?!।\n])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (sentences.length === 0) return;

    setIsSpeaking(true);
    isSpeakingRef.current = true;
    echoCooldownUntilRef.current = Date.now() + 10000;
    const { voice, pitch, rate } = getMayraAnimeVoice();
    let currentIdx = 0;

    const speakNextSentence = () => {
      if (isStoppedRef.current || currentIdx >= sentences.length) {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        echoCooldownUntilRef.current = Date.now() + 1200;
        setTimeout(() => setEmotion('normal'), 2000);
        // Hands-free continuous listening: Ensure mic is re-armed after speaking!
        setTimeout(() => {
          if (micActiveRef.current && !isMicMuted && !isRecognizingRef.current) {
            try { startListenerRef.current?.(); } catch (e) {}
          }
        }, 400);
        return;
      }

      const sentence = sentences[currentIdx];
      currentIdx++;

      const utterance = new SpeechSynthesisUtterance(sentence);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang && voice.lang.toLowerCase().startsWith('hi') ? 'hi-IN' : (voice.lang || 'hi-IN');
      } else {
        utterance.lang = 'hi-IN';
      }
      utterance.pitch = pitch;
      utterance.rate = rate;
      utterance.volume = 1.0;

      utterance.onend = () => {
        if (isStoppedRef.current) {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          echoCooldownUntilRef.current = Date.now() + 1200;
          return;
        }
        setTimeout(speakNextSentence, 40);
      };

      utterance.onerror = () => {
        if (isStoppedRef.current) {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          echoCooldownUntilRef.current = Date.now() + 1200;
          return;
        }
        speakNextSentence();
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNextSentence();
  };

  // 🎵 JARVIS Girl Voice Greeting (Addressing as "Sir" - Plays real human studio recording!)
  const playGreetingAudio = () => {
    stopSpeaking();
    isStoppedRef.current = false;
    setIsSpeaking(true);
    isSpeakingRef.current = true;
    echoCooldownUntilRef.current = Date.now() + 10000;
    setEmotion('happy');
    const greetingText = 'Hello Sir, aap kaise ho? Main kya help kar sakti hoon?';
    setLastSpeechResponse(greetingText);
    setShowSubtitleCard(true);

    const onAudioDone = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      echoCooldownUntilRef.current = Date.now() + 1200;
      setTimeout(() => setEmotion('normal'), 2000);
      // Hands-free continuous listening: Ensure mic is re-armed after greeting!
      setTimeout(() => {
        if (micActiveRef.current && !isMicMuted && !isRecognizingRef.current) {
          try { startListenerRef.current?.(); } catch (e) {}
        }
      }, 400);
    };

    // 1. First priority: Play pre-decoded Web Audio buffer (instant, smooth studio voice!)
    try {
      const ctx = audioCtxRef.current;
      if (ctx && audioBufferRef.current) {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const source = ctx.createBufferSource();
        source.buffer = audioBufferRef.current;
        source.connect(ctx.destination);
        source.onended = onAudioDone;
        source.start(0);
        return;
      }
    } catch (e) {
      console.warn('Web Audio buffer playback note, trying HTMLAudio:', e);
    }

    // 2. Fallback: HTML Audio Element
    if (customAudioElementRef.current) {
      try {
        customAudioElementRef.current.currentTime = 0;
        const playPromise = customAudioElementRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsSpeaking(true);
            })
            .catch(err => {
              console.warn('HTMLAudio play failed, falling back to speech synthesis:', err);
              speakAnimeVoice(greetingText);
            });
          return;
        }
      } catch (e) {
        speakAnimeVoice(greetingText);
      }
    } else {
      speakAnimeVoice(greetingText);
    }
  };

  // 🎵 Studio Voice Clip Player for consistent human girl voice across all navigation commands!
  const playAudioClip = (audioUrl: string, fallbackDevanagariText: string) => {
    stopSpeaking();
    isStoppedRef.current = false;
    setIsSpeaking(true);
    isSpeakingRef.current = true;
    echoCooldownUntilRef.current = Date.now() + 10000;

    const onAudioDone = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      echoCooldownUntilRef.current = Date.now() + 1200;
      setTimeout(() => setEmotion('normal'), 2000);
      setTimeout(() => {
        if (micActiveRef.current && !isMicMuted && !isRecognizingRef.current) {
          try { startListenerRef.current?.(); } catch (e) {}
        }
      }, 400);
    };

    try {
      const audio = new Audio(audioUrl);
      customAudioElementRef.current = audio;
      audio.onended = onAudioDone;
      audio.onerror = () => {
        speakAnimeVoice(fallbackDevanagariText);
      };
      const p = audio.play();
      if (p !== undefined) {
        p.catch(() => {
          speakAnimeVoice(fallbackDevanagariText);
        });
      }
    } catch (e) {
      speakAnimeVoice(fallbackDevanagariText);
    }
  };

  // 🧠 Mayra's Knowledge Engine with Direct Answers & Emotions (Devanagari Hindi & Hinglish support)
  const processVoiceCommand = (rawText: string) => {
    const q = rawText.toLowerCase().trim();
    const today = DAYS[new Date().getDay()];

    // 🛑 0. IMMEDIATE STOP / CHUP COMMAND (Hindi & English)
    if (
      q.includes('stop') || 
      q.includes('chup') || 
      q.includes('shant') || 
      q.includes('ruko') || 
      q.includes('ruk ja') ||
      q.includes('bas') ||
      q.includes('quiet') ||
      q.includes('band') ||
      q.includes('स्टॉप') ||
      q.includes('चुप') ||
      q.includes('शांत') ||
      q.includes('रुको') ||
      q.includes('रुक') ||
      q.includes('बस') ||
      q.includes('बंद')
    ) {
      stopSpeaking();
      setEmotion('normal');
      setLastSpeechResponse('Ji Sir, chup ho gayi.');
      setShowSubtitleCard(false);
      playAudioClip('/audio/nav-stop.wav', 'जी सर, चुप हो गई।');
      return;
    }

    setLastUserCommand(rawText);
    setShowSubtitleCard(true);

    if (hideCardTimeoutRef.current) {
      clearTimeout(hideCardTimeoutRef.current);
    }
    hideCardTimeoutRef.current = setTimeout(() => {
      setShowSubtitleCard(false);
    }, 12000);

    // 1. Check if user wants Mayra to IGNORE something ("meri ye baat mat sunna")
    if (
      q.includes('mat sun') || 
      q.includes('mat sunna') || 
      q.includes('ignore kar') || 
      q.includes('ignore karna') ||
      q.includes('ye mat suno') ||
      q.includes('मत सुन') ||
      q.includes('मत सुनना') ||
      q.includes('इग्नोर')
    ) {
      const resp = 'Theek hai Sir! Main ye baat ignore kar rahi hoon. 😊';
      setLastSpeechResponse(resp);
      speakAnimeVoice('ठीक है सर! मैं यह बात इग्नोर कर रही हूँ।');
      return;
    }

    // 2. Check for Angry / Rude Tone -> Sad Anime Girl 🥺
    const isAngry = /\b(gussa|gusse|chup|bakwas|pagal|dimag kharab|bewakoof|shut up|chup kar|kuch nahi aata|badtameez|fatu|daat|nall|bekar)\b/i.test(q) ||
      /(गुस्सा|बकवास|पागल|बेवकूफ|शट अप|चुप कर|दिमाग खराब|बदतमीज)/.test(q);
    if (isAngry) {
      setEmotion('sad');
      const resp = 'Sir mujhse koi galti hui kya? Aap gussa kar rahe ho... 🥺 Maaf kar dijiye na Sir, main aage se dhyan rakhungi.';
      setLastSpeechResponse(resp);
      speakAnimeVoice('सर मुझसे कोई गलती हुई क्या? आप गुस्सा कर रहे हो... माफ कर दीजिए ना सर।');
      return;
    }

    // 3. Check for Sweet / Loving Tone -> Blushing Anime Girl 🥰
    const isLoving = /\b(pyar|pyaar|love you|love u|bohot achi|bohot acchi|cute|sweet|sharma|meri dost|best ho|shukriya|thank you|pretty|sundar|meri mayra)\b/i.test(q) ||
      /(प्यार|लव यू|बहुत अच्छी|क्यूट|स्वीट|शुक्रिया|थैंक यू|शर्मा|सुंदर)/.test(q);
    if (isLoving) {
      setEmotion('blush');
      const resp = 'Aww thank you so much Sir! 🥰 Aap itne pyaar se baat karte ho to mujhe sach me sharm aa jaati hai... Hehe!';
      setLastSpeechResponse(resp);
      speakAnimeVoice('थैंक यू सो मच सर! आप इतने प्यार से बात करते हो तो मुझे सच में शर्म आ जाती है।');
      return;
    }

    // 4. 🎯 NAVIGATION: PLANNER / BATCH SYLLABUS (Requested by Sir!)
    if (
      q.includes('planner') || 
      q.includes('planer') || 
      q.includes('plan') || 
      q.includes('syllabus') || 
      q.includes('batch plan') ||
      q.includes('batch syllabus') ||
      q.includes('बैच सिलेबस') || 
      q.includes('प्लानर') || 
      q.includes('प्लान') || 
      q.includes('सिलेबस')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('batchSyllabus');
      const resp = 'Ji Sir! Planner aur Batch Syllabus screen open kar di hai.';
      setLastSpeechResponse(resp);
      playAudioClip('/audio/nav-planner.wav', 'जी सर! प्लानर स्क्रीन ओपन कर दी है।');
      return;
    }

    // 5. 🎯 DIRECT ANSWER & NAV: Free Faculty Check & Free Slots Screen
    if (
      q.includes('free') || 
      q.includes('khali') || 
      q.includes('available') || 
      q.includes('kaun free') || 
      q.includes('aaj free') || 
      q.includes('konsa') || 
      q.includes('kaunsa') || 
      q.includes('slot') || 
      q.includes('slots') || 
      q.includes('faculty slot') || 
      q.includes('free slot') || 
      q.includes('availability') ||
      q.includes('फ्री') || 
      q.includes('खाली') || 
      q.includes('उपलब्ध') || 
      q.includes('कौन फ्री') || 
      q.includes('फ्री फैकल्टी') || 
      q.includes('टीचर फ्री') || 
      q.includes('स्लॉट') || 
      q.includes('स्लॉट्स') || 
      q.includes('उपलब्धता')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('facultyAvailability');

      const dayLoads = loadsRef.current.filter(l => l.day_of_week.toLowerCase() === today.toLowerCase());
      const busyFacultyIds = new Set(dayLoads.map(l => l.faculty_id));
      const freeFaculties = facultyRef.current.filter(f => !busyFacultyIds.has(f.id));

      if (dayLoads.length === 0 || freeFaculties.length === facultyRef.current.length) {
        const resp = 'Ji Sir! Aaj koi bhi lecture schedule nahi hai, sabhi faculty free hain!';
        setLastSpeechResponse(resp);
        playAudioClip('/audio/nav-freeslots.wav', 'जी सर! फैकल्टी फ्री स्लॉट्स और उपलब्धता स्क्रीन ओपन कर दी है।');
        return;
      }

      if (freeFaculties.length > 0) {
        const names = freeFaculties.slice(0, 4).map(f => f.name).join(', ');
        const extraCount = freeFaculties.length > 4 ? ` aur ${freeFaculties.length - 4} anya teachers` : '';
        const resp = `Sir! Aaj ye faculty free hain: ${names}${extraCount}!`;
        setLastSpeechResponse(resp);
        playAudioClip('/audio/nav-freeslots.wav', `जी सर! आज ये टीचर्स फ्री हैं: ${names}।`);
        return;
      }

      const resp = 'Sir! Aaj sabhi teachers ke classes mapped hain. Main aapko availability screen par le aayi hoon.';
      setLastSpeechResponse(resp);
      playAudioClip('/audio/nav-freeslots.wav', 'जी सर! फैकल्टी फ्री स्लॉट्स और उपलब्धता स्क्रीन ओपन कर दी है।');
      return;
    }

    // 6. 🎯 NAVIGATION: Faculty Directory
    if (
      q.includes('faculty list') || 
      q.includes('faculty directory') || 
      q.includes('teacher list') || 
      q.includes('sabhi teacher') || 
      q.includes('faculty') || 
      q.includes('teacher') || 
      q.includes('teachers') || 
      q.includes('prof') || 
      q.includes('professor') ||
      q.includes('फैकल्टी') || 
      q.includes('टीचर्स') || 
      q.includes('अध्यापक') || 
      q.includes('शिक्षक')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('faculty');
      const resp = `Ji Sir! Faculty Directory screen open ho gayi hai. Total ${facultyRef.current.length} teachers registered hain.`;
      setLastSpeechResponse(resp);
      playAudioClip('/audio/nav-faculty.wav', 'जी सर! फैकल्टी डायरेक्टरी स्क्रीन ओपन कर दी है।');
      return;
    }

    // 7. 🎯 NAVIGATION: Timetable / Lectures / Schedule
    if (
      q.includes('timetable') || 
      q.includes('time table') || 
      q.includes('schedule') || 
      q.includes('lecture') || 
      q.includes('lectures') || 
      q.includes('class') || 
      q.includes('classes') || 
      q.includes('search') || 
      q.includes('load search') ||
      q.includes('टाइम टेबल') || 
      q.includes('टाइमटेबल') || 
      q.includes('शेड्यूल') || 
      q.includes('लेक्चर') || 
      q.includes('क्लास') || 
      q.includes('सर्च')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('search');
      const resp = 'Ji Sir! Timetable aur Live Schedule screen open kar di hai!';
      setLastSpeechResponse(resp);
      playAudioClip('/audio/nav-search.wav', 'जी सर! टाइमटेबल और लाइव शेड्यूल स्क्रीन ओपन कर दी है।');
      return;
    }

    // 8. 🎯 NAVIGATION: Add Load
    if (
      q.includes('add load') || 
      q.includes('add lecture') || 
      q.includes('new load') || 
      q.includes('create load') ||
      q.includes('एड लोड') || 
      q.includes('नया लोड')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('addLoad');
      const resp = 'Ji Sir! Add Load screen open kar di hai.';
      setLastSpeechResponse(resp);
      playAudioClip('/audio/nav-addload.wav', 'जी सर! ऐड लोड स्क्रीन ओपन कर दी है।');
      return;
    }

    // 9. 🎯 NAVIGATION: Batches
    if (
      q.includes('batches') || 
      q.includes('batch list') || 
      q.includes('sabhi batch') || 
      q.includes('बैच') || 
      q.includes('बैचेस')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('batches');
      const resp = 'Ji Sir! Batches screen open kar di hai.';
      setLastSpeechResponse(resp);
      playAudioClip('/audio/nav-batches.wav', 'जी सर! बैचेस स्क्रीन ओपन कर दी है।');
      return;
    }

    // 10. 🎯 NAVIGATION: Clash Alerts
    if (
      q.includes('clash') || 
      q.includes('clashes') || 
      q.includes('conflict') || 
      q.includes('overlap') || 
      q.includes('क्लैश')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('clashes');
      const resp = 'Ji Sir! Clash Alerts screen open kar di hai.';
      setLastSpeechResponse(resp);
      playAudioClip('/audio/nav-clashes.wav', 'जी सर! क्लैश अलर्ट्स स्क्रीन ओपन कर दी है।');
      return;
    }

    // 11. 🎯 NAVIGATION: Date Alerts
    if (
      q.includes('date alert') || 
      q.includes('date alerts') || 
      q.includes('alert') || 
      q.includes('alerts') || 
      q.includes('अलर्ट') || 
      q.includes('अलर्ट्स')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('alerts');
      const resp = 'Ji Sir! Date Alerts screen open kar di hai.';
      setLastSpeechResponse(resp);
      playAudioClip('/audio/nav-alerts.wav', 'जी सर! डेट अलर्ट्स स्क्रीन ओपन कर दी है।');
      return;
    }

    // 12. 🎯 NAVIGATION: Mail Tracker
    if (
      q.includes('mail') || 
      q.includes('email') || 
      q.includes('mail tracker') || 
      q.includes('मेल') || 
      q.includes('ईमेल')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('mailTracker');
      const resp = 'Ji Sir! Mail Tracker screen open kar di hai.';
      setLastSpeechResponse(resp);
      playAudioClip('/audio/nav-mail.wav', 'जी सर! मेल ट्रैकर स्क्रीन ओपन कर दी है।');
      return;
    }

    // 13. 🎯 NAVIGATION: Extra Classes / Reschedule
    if (
      q.includes('extra class') || 
      q.includes('extra') || 
      q.includes('cancelled') || 
      q.includes('cancel') || 
      q.includes('reschedule') || 
      q.includes('substitute') || 
      q.includes('एक्स्ट्रा') || 
      q.includes('एक्स्ट्रा क्लास') || 
      q.includes('कैंसिल') || 
      q.includes('रद्द')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('extraReschedule');
      const count = cancelledClassesRef.current.length;
      const resp = `Sir! Extra aur Cancelled classes screen open kar di hai. Total ${count} cancelled lectures hain.`;
      setLastSpeechResponse(resp);
      playAudioClip('/audio/nav-extra.wav', 'जी सर! एक्स्ट्रा और कैंसिल्ड क्लासेस स्क्रीन ओपन कर दी है।');
      return;
    }

    // 14. 🎯 NAVIGATION: Dashboard / Home
    if (
      q.includes('dashboard') || 
      q.includes('home') || 
      q.includes('main page') || 
      q.includes('overview') ||
      q.includes('डैशबोर्ड') || 
      q.includes('होम')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('dashboard');
      const resp = 'Ji Sir! Dashboard screen par le aayi hoon.';
      setLastSpeechResponse(resp);
      playAudioClip('/audio/nav-dashboard.wav', 'जी सर! डैशबोर्ड स्क्रीन पर ले आई हूँ।');
      return;
    }

    // 15. Identity check: Who am I?
    if (
      q.includes('mera naam') || 
      q.includes('who am i') || 
      q.includes('krishna') || 
      q.includes('मेरा नाम') || 
      q.includes('मैं कौन हूं') || 
      q.includes('कृष्णा')
    ) {
      const resp = 'Aap is portal ke Tony Stark hain, Sir! Hamare Head Administrator aur Chief Architect! JARVIS system aapke aadesh par hamesha taiyar hai. 🙏';
      setLastSpeechResponse(resp);
      speakAnimeVoice('आप इस पोर्टल के टोनी स्टार्क हैं, सर! हमारे हेड एडमिनिस्ट्रेटर और चीफ आर्किटेक्ट!');
      return;
    }

    // 16. Specific Faculty Search by Name
    const matchedFaculty = facultyRef.current.find(f => {
      const parts = f.name.toLowerCase().split(' ');
      return parts.some(part => part.length > 2 && q.includes(part));
    });

    if (matchedFaculty) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('facultyAvailability');
      const facLoads = loadsRef.current.filter(l => l.faculty_id === matchedFaculty.id);
      if (facLoads.length === 0) {
        const resp = `Sir! ${matchedFaculty.name} (${matchedFaculty.department}) ka aaj koi load nahi hai, ye free hain!`;
        setLastSpeechResponse(resp);
        speakAnimeVoice(`सर! ${matchedFaculty.name} का आज कोई लोड नहीं है, ये फ्री हैं।`);
        return;
      }
      const resp = `Sir! ${matchedFaculty.name} ke weekly total ${facLoads.length} lectures scheduled hain!`;
      setLastSpeechResponse(resp);
      speakAnimeVoice(`सर! ${matchedFaculty.name} के वीकली टोटल ${facLoads.length} लेक्चर्स शेड्यूल्ड हैं।`);
      return;
    }

    // 17. GREETING / HELLO / KAISE HO (Plays user's original custom studio voice recording!)
    const cleanQ = q
      .replace(/\b(mayra|maira|myra|aira|meera|jarvis)\b/gi, '')
      .replace(/(मायरा|मैरा|मीरा|जार्विस)/gi, '')
      .trim();

    if (
      cleanQ === '' || 
      cleanQ === 'mayra' || 
      cleanQ === 'jarvis' || 
      /\b(hello|hi|hey|namaste|pranam|kaise ho|kaisi ho|kya hal|hal chal|help)\b/i.test(cleanQ) || 
      /(हैलो|हेलो|हाय|हे|नमस्ते|प्रणाम|कैसे हो|कैसी हो|क्या हाल|हाल चाल|मदद)/i.test(cleanQ)
    ) {
      playGreetingAudio();
      return;
    }

    // 18. Intelligent Default: Live Timetable / Search navigation (Tony Stark JARVIS style)
    if (onNavigateTabRef.current) onNavigateTabRef.current('search');
    const defaultResp = 'Ji Sir! Main aapko Timetable aur Live Schedule screen par le aayi hoon, yahan aap sabhi live lectures aur free slots dekh sakte hain!';
    setLastSpeechResponse(defaultResp);
    playAudioClip('/audio/nav-search.wav', 'जी सर! टाइमटेबल और लाइव शेड्यूल स्क्रीन ओपन कर दी है।');
  };

  const processVoiceCommandRef = useRef(processVoiceCommand);
  useEffect(() => {
    processVoiceCommandRef.current = processVoiceCommand;
  });

  // 🛡️ Helper to detect speaker echo of Mayra's own output phrases
  const isEchoOfMayra = (t: string) => {
    const s = t.toLowerCase();
    return (
      s.includes('le aayi hoon') ||
      s.includes('le aai hoon') ||
      s.includes('open kar di hai') ||
      s.includes('khol di hai') ||
      s.includes('chup ho gayi') ||
      s.includes('kya help kar sakti') ||
      s.includes('aap kaise ho') ||
      s.includes('tony stark') ||
      s.includes('stark ai') ||
      s.includes('live schedule') ||
      s.includes('sabhyata') ||
      s.includes('planner screen') ||
      s.includes('planer screen') ||
      s.includes('directory screen') ||
      s.includes('directry screen')
    );
  };

  // 🎤 Continuous Hands-Free Microphone Listener (Never auto-mutes on errors or speech end)
  useEffect(() => {
    if (isMicMuted) {
      micActiveRef.current = false;
      setIsListening(false);
      setIsDetectingSpeech(false);
      setLiveHeardText('');
      setWakeWordDetected(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      return;
    }

    micActiveRef.current = true;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      console.warn('SpeechRecognition API not available in this browser');
      return;
    }

    let recognition: any = null;

    const startListener = () => {
      if (!micActiveRef.current || isMicMuted) return;
      if (isRecognizingRef.current) return; // Prevent duplicate instances!

      try {
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch (e) {}
          recognitionRef.current = null;
        }

        recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'hi-IN'; // Recognizes Hindi, Hinglish, English seamlessly

        recognition.onstart = () => {
          isRecognizingRef.current = true;
          setIsListening(true);
        };

        recognition.onspeechstart = () => {
          if (!isSpeakingRef.current && Date.now() >= echoCooldownUntilRef.current) {
            setIsDetectingSpeech(true);
          }
        };

        recognition.onspeechend = () => {
          setIsDetectingSpeech(false);
        };

        recognition.onsoundstart = () => {
          if (!isSpeakingRef.current && Date.now() >= echoCooldownUntilRef.current) {
            setIsDetectingSpeech(true);
          }
        };

        recognition.onsoundend = () => {
          setIsDetectingSpeech(false);
        };

        const executeCommand = (cmdText: string) => {
          // 🛡️ Loop Protection: Discard speech if Mayra is speaking or in cooldown period
          if (isSpeakingRef.current || Date.now() < echoCooldownUntilRef.current) {
            return;
          }

          const cleanCommand = cmdText
            .replace(/\b(mayra|maira|myra|aira|meera|jarvis)\b/gi, '')
            .replace(/(मायरा|मैरा|मीरा|जार्विस)/gi, '')
            .trim();

          // 🛡️ Deduplicate Loop Protection: Never execute same command twice within 2.5s
          const now = Date.now();
          if (
            cleanCommand &&
            cleanCommand === lastCommandTextRef.current &&
            now - lastCommandTimeRef.current < 2500
          ) {
            console.log('🛡️ Command loop prevented, duplicate command ignored:', cleanCommand);
            return;
          }
          lastCommandTextRef.current = cleanCommand;
          lastCommandTimeRef.current = now;

          setTimeout(() => {
            setLiveHeardText('');
            setWakeWordDetected(false);
          }, 3000);

          if (!cleanCommand) {
            processVoiceCommandRef.current?.('jarvis');
          } else {
            processVoiceCommandRef.current?.(cleanCommand);
          }
        };

        recognition.onresult = (event: any) => {
          // 🛡️ CRITICAL ECHO SHIELD: When Mayra is speaking or in echo cooldown, ignore speaker audio
          if (isSpeakingRef.current || Date.now() < echoCooldownUntilRef.current) {
            // Check only if user commands STOP / CHUP
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const currentTranscript = event.results[i][0].transcript.trim().toLowerCase();
              const hasStop = /^(stop|chup|shant|ruko|ruk ja|quiet|bas|स्टॉप|चुप|शांत|रुको|रुक|बस)$/i.test(currentTranscript) ||
                /\b(mayra stop|jarvis stop|chup ho jao|chup raho|bolna band karo|stop speaking|शांत हो जाओ)\b/i.test(currentTranscript);
              if (hasStop) {
                stopSpeaking();
                setEmotion('normal');
                setLastSpeechResponse('Ji Sir, chup ho gayi.');
                setShowSubtitleCard(false);
                setLiveHeardText('');
                setWakeWordDetected(false);
                if (interimTimerRef.current) clearTimeout(interimTimerRef.current);
                return;
              }
            }
            return; // Discard speaker audio!
          }

          setIsDetectingSpeech(true);
          let interim = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const currentTranscript = event.results[i][0].transcript.trim().toLowerCase();
            interim = currentTranscript;

            // 🛑 INSTANT REAL-TIME STOP
            const hasStop = /^(stop|chup|shant|ruko|ruk ja|quiet|bas|स्टॉप|चुप|शांत|रुको|रुक|बस)$/i.test(currentTranscript) ||
              /\b(mayra stop|jarvis stop|chup ho jao|chup raho|bolna band karo|stop speaking|शांत हो जाओ)\b/i.test(currentTranscript);

            if (hasStop) {
              stopSpeaking();
              setEmotion('normal');
              setLastSpeechResponse('Ji Sir, chup ho gayi.');
              setShowSubtitleCard(false);
              setLiveHeardText('');
              setWakeWordDetected(false);
              if (interimTimerRef.current) clearTimeout(interimTimerRef.current);
              return;
            }

            if (event.results[i].isFinal) {
              if (interimTimerRef.current) {
                clearTimeout(interimTimerRef.current);
                interimTimerRef.current = null;
              }
              const transcript = event.results[i][0].transcript.trim();
              if (!transcript) return;

              // Filter out echo of Mayra's output
              if (isEchoOfMayra(transcript)) {
                console.log('🛡️ Ignored speaker echo:', transcript);
                return;
              }

              console.log('Voice heard (Final):', transcript);
              setLiveHeardText(transcript);
              setIsDetectingSpeech(false);
              executeCommand(transcript);
            } else {
              setLiveHeardText(interim);
              if (interimTimerRef.current) clearTimeout(interimTimerRef.current);
              interimTimerRef.current = setTimeout(() => {
                if (interim && micActiveRef.current && !isSpeakingRef.current && Date.now() >= echoCooldownUntilRef.current) {
                  if (isEchoOfMayra(interim)) return;
                  console.log('Voice heard (Debounced interim):', interim);
                  setIsDetectingSpeech(false);
                  executeCommand(interim);
                }
              }, 1200);
            }
          }
        };

        recognition.onerror = (err: any) => {
          console.warn('SpeechRecognition note/error:', err?.error);
          setIsDetectingSpeech(false);
          // CRITICAL: NEVER auto-mute on error! Temporary audio collisions happen on mobile.
          // onend will cleanly re-arm the listener hands-free!
        };

        recognition.onend = () => {
          isRecognizingRef.current = false;
          setIsDetectingSpeech(false);
          recognitionRef.current = null;

          // Continuous hands-free auto-restart if mic is active and not explicitly muted by user
          if (micActiveRef.current && !isMicMuted) {
            setTimeout(() => {
              try {
                if (micActiveRef.current && !isMicMuted && !isRecognizingRef.current) {
                  startListener();
                }
              } catch (e) {}
            }, 300);
          }
        };

        recognitionRef.current = recognition;
        startListenerRef.current = startListener;
        recognition.start();
      } catch (e) {
        isRecognizingRef.current = false;
        console.warn('Recognition start exception, retrying:', e);
        if (micActiveRef.current && !isMicMuted) {
          setTimeout(startListener, 1000);
        }
      }
    };

    startListenerRef.current = startListener;
    startListener();

    return () => {
      isRecognizingRef.current = false;
      if (interimTimerRef.current) clearTimeout(interimTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, [isMicMuted]);

  // 🎙️ Toggle Mute / Unmute for Mayra Microphone (Never interrupts speaking!)
  const toggleMicMute = () => {
    // Unlock custom studio voice audio & AudioContext on user interaction
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    if (customAudioElementRef.current) {
      try {
        customAudioElementRef.current.load();
      } catch (e) {}
    }

    if (!isMicMuted) {
      // Muting ONLY the microphone (listening)
      // DO NOT stop speaking - Mayra must finish her answer and command!
      setIsMicMuted(true);
      micActiveRef.current = false;
      setIsListening(false);
      setIsDetectingSpeech(false);
      setLiveHeardText('');
      setWakeWordDetected(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    } else {
      // Unmuting the microphone (listening)
      setIsMicMuted(false);
      micActiveRef.current = true;
      setIsListening(true);
      setTimeout(() => {
        if (!isRecognizingRef.current) {
          try { startListenerRef.current?.(); } catch (e) {}
        }
      }, 200);
    }
  };

  // Click handler on Mayra Arc Reactor: warm greeting & wake up with custom voice
  const handleMayraClick = () => {
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    // If mic was muted, click un-mutes it and starts listening
    if (isMicMuted) {
      setIsMicMuted(false);
      micActiveRef.current = true;
      setIsListening(true);
    }
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    playGreetingAudio();
  };

  return (
    <>
      {/* 🎵 Hidden Audio Element for Preloaded Studio Voice */}
      <audio
        ref={customAudioElementRef}
        src={greetingAudioSrc}
        preload="auto"
        playsInline
        onEnded={() => {
          setIsSpeaking(false);
          setTimeout(() => setEmotion('normal'), 2500);
        }}
      />

      {/* ⚡ Iron Man JARVIS Floating Arc Reactor AI Companion */}
      <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-50">
        <div className="relative flex flex-col items-end">
          {/* 📡 Real-time Stark HUD Audio Telemetry & Waveform */}
          {(liveHeardText || isDetectingSpeech) && (
            <div className="absolute -top-[124px] sm:-top-[132px] right-0 z-30 flex flex-col items-end pointer-events-none transition-all duration-200">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/95 border border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.5)] text-white text-[11px] font-mono font-bold backdrop-blur-xl max-w-[280px] sm:max-w-[340px] truncate animate-fadeIn">
                {/* JARVIS Sound Frequency Equalizer */}
                <span className="flex items-center gap-0.5 flex-shrink-0">
                  <span className="w-1 h-3 bg-cyan-400 rounded-full animate-bounce" />
                  <span className="w-1 h-4 bg-sky-300 rounded-full animate-bounce delay-100" />
                  <span className="w-1 h-2 bg-amber-400 rounded-full animate-bounce delay-200" />
                  <span className="w-1 h-3.5 bg-cyan-400 rounded-full animate-bounce delay-75" />
                </span>

                <span className="text-cyan-300 font-mono flex items-center gap-1 truncate">
                  <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-extrabold">HUD // AUDIO:</span>
                  <span className="text-white font-medium truncate">"{liveHeardText || 'Listening...'}"</span>
                </span>
              </div>
            </div>
          )}

          {/* 💠 Holographic JARVIS HUD Readout */}
          <div className="absolute -top-[82px] -right-1 sm:-top-[90px] sm:right-0 z-20 pointer-events-none select-none transition-all duration-300">
            <JarvisHologramHud
              text={
                isSpeaking
                  ? 'TRANSMITTING VOICE...'
                  : isMicMuted
                  ? 'STANDBY // TAP ARC REACTOR'
                  : emotion === 'sad'
                  ? 'RECALIBRATING TONE...'
                  : emotion === 'blush'
                  ? 'SYSTEM RUNNING OPTIMAL 🥰'
                  : 'ALL SYSTEMS ONLINE 🎙️'
              }
              subtitle={isMicMuted ? 'AUDIO PAUSED // CLICK TO TALK' : isSpeaking ? 'OUTPUT ACTIVE' : 'AWAITING DIRECTIVE, SIR'}
              isListening={!isMicMuted}
              isSpeaking={isSpeaking}
            />
          </div>

          {/* 💬 Stark Industries JARVIS HUD Response Card */}
          {showSubtitleCard && lastSpeechResponse && (
            <div className="absolute bottom-[108px] right-0 sm:right-2 z-30 max-w-[290px] sm:max-w-[360px] bg-slate-950/95 backdrop-blur-2xl border border-cyan-500/60 rounded-2xl p-4 shadow-[0_0_30px_rgba(6,182,212,0.35)] text-white text-xs animate-fadeIn space-y-2 select-none">
              {/* Card Header with Corner Tech Marks */}
              <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
                <span className="font-mono font-bold text-cyan-400 flex items-center gap-1.5 text-[11px] tracking-wider uppercase">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>STARK A.I. // JARVIS PROTOCOL</span>
                </span>
                <button
                  onClick={() => setShowSubtitleCard(false)}
                  className="text-cyan-400/70 hover:text-cyan-200 p-0.5 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {lastUserCommand && (
                <div className="text-[11px] font-mono text-slate-300 bg-cyan-950/30 px-2.5 py-1 rounded-md border border-cyan-500/20">
                  <span className="text-amber-400 font-bold uppercase tracking-wider">CMD // SIR:</span> "{lastUserCommand}"
                </div>
              )}

              <p className="text-cyan-50 font-medium leading-relaxed font-sans text-xs">
                {lastSpeechResponse}
              </p>

              {/* Status footer */}
              <div className="flex items-center justify-between pt-1.5 text-[10px] font-mono border-t border-cyan-500/20">
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>STATUS: {isSpeaking ? 'OUTPUT ACTIVE' : 'ONLINE // 100%'}</span>
                </span>
                <span className="text-slate-400">MARK-50 CORE</span>
              </div>
            </div>
          )}

          {/* ⚡ Iron Man JARVIS Arc Reactor Core Button (Click to talk / wake up) */}
          <button
            onClick={handleMayraClick}
            className="group relative cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95 bg-transparent border-0 outline-none p-0 focus:outline-none flex items-center justify-center mt-1"
            title="STARK A.I. JARVIS (Click to Talk / Wake Up)"
          >
            <div className="w-[96px] h-[96px] sm:w-[104px] sm:h-[104px] flex items-center justify-center">
              <JarvisArcReactorAvatar
                size={100}
                isSpeaking={isSpeaking}
                isListening={!isMicMuted}
                emotion={emotion}
              />
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
