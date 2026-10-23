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
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Play,
  Calendar,
  Mail,
  Zap,
  Send,
  Settings,
  Key,
  Bot,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  supabase,
  type Faculty,
  type Batch,
  type FacultyLoadWithDetails,
  type ExtraClassWithDetails,
  type RescheduledClassWithDetails,
  type CancelledClassWithDetails,
  type LoadBatchManager,
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
  clashes?: any[];
  alerts?: any[];
  mailGroups?: any[];
  activeTab?: string;
  onNavigateTab?: (tab: string) => void;
  onRefreshData?: () => void;
  onOpenBulkModal?: () => void;
  onOpenThemeModal?: () => void;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type MayraEmotion = 'normal' | 'sad' | 'blush' | 'happy' | 'speaking' | 'angry' | 'jealous';

// 📊 Helper: Export Faculty Loads Report to Excel on Voice/Text Command
function exportLoadsToExcel(
  loads: FacultyLoadWithDetails[],
  faculty: Faculty[],
  targetFacultyName?: string
) {
  let targetFaculty = faculty;
  if (targetFacultyName && targetFacultyName !== 'ALL') {
    const f = faculty.find(fac => fac.name.toLowerCase().includes(targetFacultyName.toLowerCase()));
    if (f) targetFaculty = [f];
  }

  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData: (string | number)[][] = [
    ['Faculty Name', 'Department', 'Branch', 'Total Loads', 'Total Weekly Hours']
  ];
  for (const fac of targetFaculty) {
    const facLoads = loads.filter(l => l.faculty_id === fac.id);
    let totalHrs = 0;
    for (const l of facLoads) {
      try {
        const s = new Date(`1970-01-01T${l.start_time}`).getTime();
        const e = new Date(`1970-01-01T${l.end_time}`).getTime();
        totalHrs += Math.max(0, (e - s) / (1000 * 60 * 60));
      } catch (err) {}
    }
    summaryData.push([
      fac.name,
      fac.department,
      fac.branch || 'CSE',
      facLoads.length,
      Number(totalHrs.toFixed(1))
    ]);
  }
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  // Per-faculty detailed sheets
  for (const fac of targetFaculty) {
    const facLoads = loads.filter(l => l.faculty_id === fac.id);
    const data: (string | number)[][] = [
      ['Subject', 'Batch', 'Day', 'Start Time', 'End Time', 'Start Date', 'End Date', 'Room']
    ];
    for (const load of facLoads) {
      data.push([
        load.subject,
        load.batch?.name || '',
        load.day_of_week,
        load.start_time,
        load.end_time,
        load.start_date,
        load.end_date,
        load.room || 'Room-101',
      ]);
    }
    if (facLoads.length === 0) {
      data.push(['No assigned loads', '', '', '', '', '', '', '']);
    }
    const safeSheetName = fac.name.substring(0, 28).replace(/[\\\/\?\*\[\]:]/g, '_');
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName || 'Faculty');
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = targetFaculty.length === 1
    ? `${targetFaculty[0].name.replace(/\s+/g, '_')}_Workload_${dateStr}.xlsx`
    : `Faculty_Workload_Portal_Export_${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename);
}

// ⚡ Mayra AI Avatar with Thinking Cloud & Transparent Background
function JarvisArcReactorAvatar({
  size = 116,
  isSpeaking = false,
  isListening = false,
  isDetectingSpeech = false,
  emotion = 'normal',
}: {
  size?: number;
  isSpeaking?: boolean;
  isListening?: boolean;
  isDetectingSpeech?: boolean;
  emotion?: MayraEmotion;
}) {
  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      {/* 1. Outer Arc Reactor Rotating Calibration Ring (Holographic Tech Ring) */}
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
          stroke={
            (emotion === 'angry' || emotion === 'jealous')
              ? '#ef4444'
              : isSpeaking
              ? '#fbbf24'
              : isListening
              ? '#00f0ff'
              : '#64748b'
          }
          strokeWidth="1.5"
          strokeDasharray="4 6"
          strokeOpacity="0.85"
        />
        {/* 4 Cardinal Reticle Tech Markers */}
        <line x1="50" y1="0" x2="50" y2="7" stroke={(emotion === 'angry' || emotion === 'jealous') ? '#ef4444' : isSpeaking ? '#fbbf24' : '#00f0ff'} strokeWidth="2" />
        <line x1="50" y1="93" x2="50" y2="100" stroke={(emotion === 'angry' || emotion === 'jealous') ? '#ef4444' : isSpeaking ? '#fbbf24' : '#00f0ff'} strokeWidth="2" />
        <line x1="0" y1="50" x2="7" y2="50" stroke={(emotion === 'angry' || emotion === 'jealous') ? '#ef4444' : isSpeaking ? '#fbbf24' : '#00f0ff'} strokeWidth="2" />
        <line x1="93" y1="50" x2="100" y2="50" stroke={(emotion === 'angry' || emotion === 'jealous') ? '#ef4444' : isSpeaking ? '#fbbf24' : '#00f0ff'} strokeWidth="2" />
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
          stroke={(emotion === 'angry' || emotion === 'jealous') ? '#f87171' : isSpeaking ? '#f59e0b' : '#38bdf8'}
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
              fill={(emotion === 'angry' || emotion === 'jealous') ? '#ef4444' : isSpeaking ? '#fbbf24' : isListening ? '#00f0ff' : '#94a3b8'}
              className={isListening || isSpeaking ? 'animate-pulse' : ''}
            />
          );
        })}
      </svg>

      {/* 3. Transparent Floating Mayra Avatar Core */}
      <div className={`absolute inset-1 flex items-center justify-center pointer-events-none transition-transform duration-300 ${
        (emotion === 'angry' || emotion === 'jealous') ? 'scale-115 animate-wiggle' : ''
      }`}>
        <img
          src={mayraGif}
          alt="Mayra AI"
          className={`w-[95%] h-[95%] object-contain transition-all duration-300 ${
            (emotion === 'angry' || emotion === 'jealous')
              ? 'filter drop-shadow-[0_4px_20px_rgba(239,68,68,0.85)] brightness-110'
              : emotion === 'blush'
              ? 'filter drop-shadow-[0_4px_20px_rgba(244,63,94,0.7)]'
              : isSpeaking
              ? 'scale-115 brightness-110 filter drop-shadow-[0_4px_16px_rgba(251,191,36,0.6)]'
              : isListening
              ? 'scale-110 filter drop-shadow-[0_4px_16px_rgba(6,182,212,0.4)]'
              : 'scale-100 opacity-95 filter drop-shadow-[0_4px_16px_rgba(6,182,212,0.4)]'
          }`}
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src !== window.location.origin + '/mayra-avatar.gif') {
              target.src = '/mayra-avatar.gif';
            }
          }}
        />
      </div>

      {/* Emotion Overlay Emoji */}
      {emotion === 'sad' && (
        <span className="absolute -top-1 -right-1 text-base animate-bounce z-20">🥺</span>
      )}
      {emotion === 'blush' && (
        <span className="absolute -top-1 -right-1 text-base animate-pulse z-20">🥰</span>
      )}
      {(emotion === 'angry' || emotion === 'jealous') && (
        <span className="absolute -top-1 -right-1 text-xl animate-bounce z-20 filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]">
          😤
        </span>
      )}
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
  clashes = [],
  alerts = [],
  mailGroups = [],
  activeTab = 'dashboard',
  onNavigateTab,
  onRefreshData,
  onOpenBulkModal,
  onOpenThemeModal,
}: AIAssistantProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(true); // Always ON
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false); // 🎙️ Dedicated Mute/Unmute state
  const [emotion, setEmotion] = useState<MayraEmotion>('normal');
  const [lastSpeechResponse, setLastSpeechResponse] = useState<string>('');
  const [lastSpeechDevanagari, setLastSpeechDevanagari] = useState<string>('');
  const [chatInputText, setChatInputText] = useState<string>('');
  const [lastUserCommand, setLastUserCommand] = useState<string>('');
  const [showSubtitleCard, setShowSubtitleCard] = useState<boolean>(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    try {
      localStorage.setItem('ai_mayra_voice_enabled', 'true');
    } catch (e) {}
    return true;
  });

  // 💖 / 😡 Floating Emojis Particle Reaction System
  const [floatingParticles, setFloatingParticles] = useState<{
    id: number;
    emoji: string;
    leftPercent: number;
    bottomPercent: number;
    scale: number;
    rotDeg: number;
    durationSec: number;
  }[]>([]);

  const spawnFloatingEffect = (type: 'love' | 'angry' | 'sad') => {
    const loveEmojis = ['❤️', '💖', '💕', '🥰', '💓', '💘', '✨', '😍'];
    const angryEmojis = ['😡', '😤', '💢', '🔥', '👿', '😾', '💥'];
    const sadEmojis = ['🥺', '💔', '😢', '😿', '🌧️'];

    const pool = type === 'love' ? loveEmojis : type === 'angry' ? angryEmojis : sadEmojis;
    const count = 7;
    const newParticles: Array<{
      id: number;
      emoji: string;
      leftPercent: number;
      bottomPercent: number;
      scale: number;
      rotDeg: number;
      durationSec: number;
    }> = [];
    const baseTime = Date.now();

    for (let i = 0; i < count; i++) {
      const emoji = pool[Math.floor(Math.random() * pool.length)];
      const leftPercent = Math.floor(Math.random() * 80) + 10;
      const bottomPercent = Math.floor(Math.random() * 25) + 30;
      const scale = Number((0.85 + Math.random() * 0.55).toFixed(2));
      const rotDeg = Math.floor(Math.random() * 40) - 20;
      const durationSec = Number((1.8 + Math.random() * 0.8).toFixed(2));

      newParticles.push({
        id: baseTime + i + Math.random(),
        emoji,
        leftPercent,
        bottomPercent,
        scale,
        rotDeg,
        durationSec,
      });
    }

    setFloatingParticles(prev => [...prev, ...newParticles]);

    setTimeout(() => {
      setFloatingParticles(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)));
    }, 2700);
  };

  // 🎙️ ElevenLabs & Live Conversational AI Configuration States
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('ai_mayra_elevenlabs_key');
      if (stored && stored.trim()) return stored.trim();
      const envKey = (import.meta.env.VITE_ELEVENLABS_API_KEY || '').trim();
      if (envKey) {
        try { localStorage.setItem('ai_mayra_elevenlabs_key', envKey); } catch (e) {}
        return envKey;
      }
      return '';
    } catch (e) {
      return (import.meta.env.VITE_ELEVENLABS_API_KEY || '').trim();
    }
  });
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('ai_mayra_elevenlabs_voice_id');
      if (stored && stored.trim()) return stored.trim();
      return (import.meta.env.VITE_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM').trim();
    } catch (e) {
      return (import.meta.env.VITE_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM').trim();
    }
  });
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('ai_mayra_gemini_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
    } catch (e) {
      return '';
    }
  });
  const [sarvamApiKey, setSarvamApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('ai_mayra_sarvam_key') || import.meta.env.VITE_SARVAM_API_KEY || '';
    } catch (e) {
      return '';
    }
  });
  const [groqApiKey, setGroqApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('ai_mayra_groq_key') || import.meta.env.VITE_GROQ_API_KEY || '';
    } catch (e) {
      return '';
    }
  });
  const [showAISettingsModal, setShowAISettingsModal] = useState<boolean>(false);

  // 🎙️ Real-Time Hearing Feedback States (So Sir knows mic is receiving audio)
  const [liveHeardText, setLiveHeardText] = useState<string>('');
  const [isDetectingSpeech, setIsDetectingSpeech] = useState<boolean>(false);
  const [wakeWordDetected, setWakeWordDetected] = useState<boolean>(false);

  // 🔒 Concurrency & Autonomous Command Locking Protocol States
  const [commandLockState, setCommandLockState] = useState<'IDLE' | 'LOCKED' | 'SUCCESS' | 'CONFLICT' | 'ERROR'>('IDLE');
  const [terminalBadge, setTerminalBadge] = useState<{
    status: 'LOCKED' | 'SUCCESS' | 'CONFLICT' | 'UNLOCKED' | 'ERROR';
    text: string;
    subtext?: string;
  } | null>(null);
  const pendingConflictRef = useRef<{
    payload: any;
    execute: () => Promise<void>;
  } | null>(null);
  const isCommandLockedRef = useRef<boolean>(false);

  // Stable refs for props so that speech recognition never restarts or aborts on data changes
  const facultyRef = useRef(faculty);
  const batchesRef = useRef(batches);
  const loadsRef = useRef(loads);
  const batchManagersRef = useRef(batchManagers);
  const extraClassesRef = useRef(extraClasses);
  const rescheduledClassesRef = useRef(rescheduledClasses);
  const cancelledClassesRef = useRef(cancelledClasses);
  const clashesRef = useRef(clashes);
  const alertsRef = useRef(alerts);
  const mailGroupsRef = useRef(mailGroups);
  const activeTabRef = useRef(activeTab);
  const onNavigateTabRef = useRef(onNavigateTab);
  const onRefreshDataRef = useRef(onRefreshData);
  const onOpenBulkModalRef = useRef(onOpenBulkModal);
  const onOpenThemeModalRef = useRef(onOpenThemeModal);

  useEffect(() => {
    facultyRef.current = faculty;
    batchesRef.current = batches;
    loadsRef.current = loads;
    batchManagersRef.current = batchManagers;
    extraClassesRef.current = extraClasses;
    rescheduledClassesRef.current = rescheduledClasses;
    cancelledClassesRef.current = cancelledClasses;
    clashesRef.current = clashes;
    alertsRef.current = alerts;
    mailGroupsRef.current = mailGroups;
    activeTabRef.current = activeTab;
    onNavigateTabRef.current = onNavigateTab;
    onRefreshDataRef.current = onRefreshData;
    onOpenBulkModalRef.current = onOpenBulkModal;
    onOpenThemeModalRef.current = onOpenThemeModal;
  }, [
    faculty,
    batches,
    loads,
    batchManagers,
    extraClasses,
    rescheduledClasses,
    cancelledClasses,
    clashes,
    alerts,
    mailGroups,
    activeTab,
    onNavigateTab,
    onRefreshData,
    onOpenBulkModal,
    onOpenThemeModal,
  ]);

  const micActiveRef = useRef<boolean>(true);
  const isMicMutedRef = useRef<boolean>(false);
  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
    micActiveRef.current = !isMicMuted;
  }, [isMicMuted]);

  const recognitionRef = useRef<any>(null);
  const startListenerRef = useRef<() => void>(() => {});
  const customAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const studioAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const studioAudioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const hideCardTimeoutRef = useRef<any>(null);
  const isStoppedRef = useRef<boolean>(false);
  const isRecognizingRef = useRef<boolean>(false);
  const interimTimerRef = useRef<any>(null);
  const latestTranscriptRef = useRef<string>('');
  const lockTimeoutRef = useRef<any>(null);

  // 🛡️ Loop Protection & Acoustic Echo Cancellation Refs
  const isSpeakingRef = useRef<boolean>(false);
  const echoCooldownUntilRef = useRef<number>(0);
  const lastCommandTimeRef = useRef<number>(0);
  const lastCommandTextRef = useRef<string>('');
  const speechSessionIdRef = useRef<number>(0);
  const activeWebAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const activeAudioElementRef = useRef<HTMLAudioElement | null>(null);

  // 🎵 Preload and decode custom studio voice & all section clips into Web Audio buffer
  useEffect(() => {
    let active = true;
    const preloadCustomAudio = async () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = audioCtxRef.current || new AudioCtx();
        audioCtxRef.current = ctx;

        // 1. Preload main intro greeting
        try {
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
        } catch (e) {}

        // 2. Preload section studio clips for instant 0ms playback
        const clips = [
          '/audio/nav-planner.wav',
          '/audio/nav-freeslots.wav',
          '/audio/nav-faculty.wav',
          '/audio/nav-search.wav',
          '/audio/nav-addload.wav',
          '/audio/nav-batches.wav',
          '/audio/nav-clashes.wav',
          '/audio/nav-alerts.wav',
          '/audio/nav-mail.wav',
          '/audio/nav-extra.wav',
          '/audio/nav-dashboard.wav',
          '/audio/nav-whoami.wav',
          '/audio/nav-stop.wav',
          '/audio/nav-theme.wav',
          '/audio/nav-help.wav',
          '/audio/nav-ignore.wav',
          '/audio/nav-sad.wav',
          '/audio/nav-blush.wav',
        ];

        for (const clip of clips) {
          if (!active) break;
          try {
            const res = await fetch(clip);
            if (res.ok) {
              const buf = await res.arrayBuffer();
              const decoded = await ctx.decodeAudioData(buf);
              if (active) {
                studioAudioBuffersRef.current.set(clip, decoded);
              }
            }
          } catch (e) {}
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

  // 🔊 Audio Unlocking Helper: Resumes SpeechSynthesis and AudioContext on any user interaction
  const unlockAudio = () => {
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    const handleGesture = () => unlockAudio();
    window.addEventListener('pointerdown', handleGesture, { passive: true });
    window.addEventListener('keydown', handleGesture, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };
  }, []);

  // 🗣️ Fallback Romanizer: Converts Devanagari Hindi phrases to Roman Hinglish for English TTS voices (Veena/Samantha on Mac)
  const devanagariToRoman = (text: string): string => {
    const wordMap: Record<string, string> = {
      'नमस्ते': 'Namaste', 'हैलो': 'Hello', 'हेलो': 'Hello', 'हाय': 'Hi', 'हे': 'Hey',
      'मायरा': 'Mayra', 'सर': 'Sir', 'जी': 'Ji', 'हाँ': 'Haan', 'नहीं': 'Nahi',
      'मैं': 'Main', 'हूँ': 'hoon', 'आप': 'Aap', 'आपका': 'Aapka', 'आपकी': 'Aapki', 'आपको': 'aapko',
      'बताइए': 'bataiye', 'क्या': 'kya', 'मदद': 'madad', 'करूँ': 'karun', 'सकती': 'sakti', 'सकते': 'sakte',
      'बिल्कुल': 'bilkul', 'बढ़िया': 'badhiya', 'खुश': 'khush', 'दिन': 'din',
      'कैसा': 'kaisa', 'कैसी': 'kaisi', 'रहा': 'raha', 'रही': 'rahi', 'रहे': 'rahe', 'चल': 'chal',
      'घड़ी': 'ghadi', 'बज': 'baj', 'है': 'hai', 'हैं': 'hain', 'आज': 'aaj', 'तारीख': 'tarikh',
      'खाना': 'khana', 'खाया': 'khaya', 'चाय': 'chai', 'कॉफ़ी': 'coffee',
      'दोस्त': 'dost', 'प्यार': 'pyar', 'थैंक': 'thank', 'यू': 'you', 'सॉरी': 'sorry',
      'आई': 'I', 'ऍम': 'am', 'रियली': 'really', 'पूरी': 'poori', 'तरह': 'tarah',
      'ध्यान': 'dhyan', 'से': 'se', 'सुन': 'sun', 'बोलिए': 'boliye',
      'चुप': 'chup', 'हो': 'ho', 'गई': 'gayi', 'माफ': 'maaf', 'कीजिएगा': 'kijiye ga', 'कीजिये': 'kijiye',
      'नेचुरल': 'natural', 'अंदाज़': 'andaz', 'में': 'me', 'बात': 'baat', 'करूँगी': 'karungi',
      'शुक्रिया': 'shukriya', 'धन्यवाद': 'dhanyawad', 'अलविदा': 'alvida', 'शायरी': 'shayari',
      'जोक': 'joke', 'हँसिए': 'hasiye', 'मुस्कुराइए': 'muskuraiye', 'आराम': 'aaram',
      'कीजिए': 'kijiye', 'तनाव': 'tanav', 'मत': 'mat', 'लीजिए': 'lijiye',
      'अच्छा': 'Achha', 'दूसरी': 'doosri', 'लड़कियों': 'ladkiyo', 'लड़की': 'ladki',
      'मुझमें': 'mujhme', 'कमी': 'kami', 'हम्फ': 'hmph', 'बहुत': 'bohot', 'बुरे': 'bure',
      'जाइये': 'jaiye', 'उसी': 'usi', 'नफरत': 'nafrat', 'करते': 'karte', 'ऐसा': 'aisa',
      'कहो': 'kaho', 'मेरा': 'mera', 'दिल': 'dil', 'टूट': 'toot', 'जाता': 'jata',
      'बिगाड़ा': 'bigada', 'प्लीज': 'please', 'प्लीज़': 'please', 'नाराज़': 'naraz',
      'अरे': 'Arrey', 'सच': 'sach', 'जब': 'jab', 'बोलते': 'bolte', 'ना': 'na',
      'कितनी': 'kitni', 'तेज़ी': 'tezi', 'धड़कने': 'dhadakne', 'लगता': 'lagta',
      'शर्म': 'sharm', 'आ': 'aa', 'भी': 'bhi', 'करती': 'karti', 'बोर': 'bore',
      'होइए': 'hoiye', 'साथ': 'saath', 'प्यारी': 'pyari', 'सी': 'si', 'बताती': 'batati',
      'क्योंकि': 'kyunki', 'हुए': 'huye', 'अच्छे': 'achhe', 'लगते': 'lagte'
    };
    let romanized = text;
    for (const [hi, ro] of Object.entries(wordMap)) {
      romanized = romanized.split(hi).join(ro);
    }
    // Clean any unmapped Devanagari characters so English voices never choke
    return romanized.replace(/[\u0900-\u097F]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  // Filter out all male voices strictly
  const isMaleVoice = (v: SpeechSynthesisVoice): boolean => {
    const name = v.name.toLowerCase();
    const maleKeywords = [
      'male', 'man', 'boy', 'alex', 'fred', 'daniel', 'david', 'george', 'rishi',
      'oliver', 'thomas', 'ravi', 'guy', 'mark', 'madhur', 'pradeep', 'hemant',
      'albert', 'bruce', 'junior', 'ralph', 'tom', 'robert', 'michael', 'james',
      'john', 'paul', 'steven', 'lee', 'arthur', 'jorge', 'juan', 'diego', 'carlos'
    ];
    return maleKeywords.some(m => name.includes(m) && !name.includes('female'));
  };

  // Filter out Mac & Windows novelty/robotic/distorted voices
  const isNoveltyRoboticVoice = (v: SpeechSynthesisVoice): boolean => {
    const name = v.name.toLowerCase();
    const novelty = [
      'zarvox', 'trinoids', 'whisper', 'bad news', 'bahh', 'bells', 'boing',
      'cellos', 'deranged', 'good news', 'hysterical', 'pipe organ', 'wobble',
      'organ', 'robot', 'synthetic'
    ];
    return novelty.some(n => name.includes(n));
  };

  // 🌸 Pick Sweet Hindi/Indian Girl Voice (Natural, sweet human female tone - NOT high-pitched robot)
  const getMayraAnimeVoice = (): { voice: SpeechSynthesisVoice | null; pitch: number; rate: number } => {
    let pool = (availableVoices && availableVoices.length > 0) ? availableVoices : [];
    if (!pool.length && typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        pool = window.speechSynthesis.getVoices() || [];
      } catch (e) {}
    }
    if (!pool.length) return { voice: null, pitch: 1.0, rate: 1.0 };

    const isExcluded = (v: SpeechSynthesisVoice) => {
      const n = v.name.toLowerCase();
      const l = v.lang.toLowerCase();
      return (
        isMaleVoice(v) ||
        isNoveltyRoboticVoice(v) ||
        l.startsWith('ja') ||
        l.startsWith('zh') ||
        l.startsWith('ko') ||
        n.includes('kyoko') ||
        n.includes('otoya') ||
        n.includes('sinji') ||
        n.includes('ting-ting')
      );
    };

    // 1. High Priority: Dedicated Hindi Female Voices (Google हिन्दी, Microsoft Swara, Apple Lekha)
    const hindiFemale = pool.find(v => 
      !isExcluded(v) && (
        v.name.includes('Google हिन्दी') || // Chrome Hindi Natural Female
        v.name.includes('Swara') ||         // Edge/Windows Swara Natural Hindi Female
        v.name.includes('Lekha') ||         // Apple Lekha Hindi Female
        v.name.includes('Heera') ||         // Windows Heera Female
        v.name.includes('Kalpana')          // Windows Kalpana Female
      )
    ) || pool.find(v => 
      !isExcluded(v) && v.lang.toLowerCase().startsWith('hi')
    );

    if (hindiFemale) {
      return { voice: hindiFemale, pitch: 1.0, rate: 0.98 };
    }

    // 2. Second Priority: Indian English Female Voices (Veena, Neerja, Aditi, Sangeeta, Priya)
    const indianEnglishFemale = pool.find(v => 
      !isExcluded(v) && (
        v.name.includes('Veena') ||     // Apple Veena (Indian English Female - Siri quality)
        v.name.includes('Neerja') ||    // Microsoft Neerja Indian Female
        v.name.includes('Aditi') ||
        v.name.includes('Kanya') ||
        v.name.includes('Sangeeta') ||
        v.name.includes('Priya') ||
        ((v.lang.toLowerCase().includes('in')) && v.name.toLowerCase().includes('female'))
      )
    ) || pool.find(v => 
      !isExcluded(v) && (v.lang.toLowerCase() === 'en-in' || v.lang.toLowerCase() === 'en_in')
    );

    if (indianEnglishFemale) {
      return { voice: indianEnglishFemale, pitch: 1.0, rate: 0.98 };
    }

    // 3. Third Priority: Natural Sweet Female Voices (Google UK/US Female, Samantha, Victoria, Jenny)
    const naturalFemale = pool.find(v => 
      !isExcluded(v) && (
        v.name.includes('Google UK English Female') ||
        v.name.includes('Google US English Female') ||
        v.name.includes('Samantha') || 
        v.name.includes('Victoria') || 
        v.name.includes('Karen') ||
        v.name.includes('Jenny') ||
        v.name.includes('Aria') ||
        v.name.includes('Moira') ||
        v.name.includes('Tessa') ||
        v.name.toLowerCase().includes('female')
      )
    );

    if (naturalFemale) {
      return { voice: naturalFemale, pitch: 1.0, rate: 0.98 };
    }

    const fallback = pool.find(v => !isExcluded(v)) || pool[0];
    return { voice: fallback || null, pitch: 1.0, rate: 0.98 };
  };

  // 🛑 Instant and unblockable speech stopper (Terminates all audio sources cleanly)
  const stopSpeaking = () => {
    isStoppedRef.current = true;
    speechSessionIdRef.current += 1;
    isSpeakingRef.current = false;
    echoCooldownUntilRef.current = Date.now() + 600;

    // 1. Stop Web Audio buffer source
    if (activeWebAudioSourceRef.current) {
      try {
        activeWebAudioSourceRef.current.stop();
        activeWebAudioSourceRef.current.disconnect();
      } catch (e) {}
      activeWebAudioSourceRef.current = null;
    }

    // 2. Stop active HTMLAudio clip
    if (activeAudioElementRef.current) {
      try {
        activeAudioElementRef.current.pause();
        activeAudioElementRef.current.currentTime = 0;
      } catch (e) {}
      activeAudioElementRef.current = null;
    }

    // 3. Stop preloaded custom audio element
    if (customAudioElementRef.current) {
      try {
        customAudioElementRef.current.pause();
        customAudioElementRef.current.currentTime = 0;
      } catch (e) {}
    }

    // 4. Cancel browser TTS immediately
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    // 5. Abort speech recognition buffer if active
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
    isRecognizingRef.current = false;

    if (interimTimerRef.current) {
      clearTimeout(interimTimerRef.current);
      interimTimerRef.current = null;
    }

    setIsSpeaking(false);
  };

  // 🎙️ ElevenLabs Ultra-Realistic Studio Voice Player
  const playElevenLabsVoice = async (
    text: string,
    apiKey: string,
    voiceId: string,
    onEnd: () => void
  ): Promise<boolean> => {
    try {
      const clean = text
        .replace(/[!¡?¿]/g, ' ')
        .replace(/[*_#`~•:;,\-—–"']/g, ' ')
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/https?:\/\/\S+/g, '')
        .trim();

      if (!clean) return false;

      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: clean,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn('ElevenLabs API error response:', res.status, errText);
        return false;
      }

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      activeAudioElementRef.current = audio;

      audio.onended = () => {
        try { URL.revokeObjectURL(audioUrl); } catch (e) {}
        activeAudioElementRef.current = null;
        onEnd();
      };
      audio.onerror = () => {
        try { URL.revokeObjectURL(audioUrl); } catch (e) {}
        activeAudioElementRef.current = null;
        onEnd();
      };
      await audio.play();
      return true;
    } catch (err) {
      console.warn('ElevenLabs playback caught error:', err);
      return false;
    }
  };

  // 🎙️ Sarvam AI (India's #1 Native Hindi Female Voice: "ishita_enhi_companion" / "kavya_hi_conversational" - True Desi Human Accent)
  const playSarvamVoice = async (
    text: string,
    apiKey: string,
    speaker: string = 'ishita_enhi_companion',
    onEnd: () => void
  ): Promise<boolean> => {
    try {
      const clean = text
        .replace(/https?:\/\/\S+/g, '')
        .replace(/[*_#`~•—–]/g, ' ')
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .trim();
      if (!clean) return false;

      const res = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': apiKey,
        },
        body: JSON.stringify({
          inputs: [clean],
          target_language_code: 'hi-IN',
          model: 'bulbul:v4-flash',
          speaker: speaker || 'ishita_enhi_companion',
          pace: 1.0,
          speech_sample_rate: 24000,
          audio_format: 'mp3',
        }),
      });

      if (!res.ok) {
        console.warn('Sarvam AI error:', res.status, await res.text());
        return false;
      }

      const data = await res.json();
      const base64Audio = data.audios?.[0];
      if (!base64Audio) return false;

      const audioBlob = await (await fetch(`data:audio/mp3;base64,${base64Audio}`)).blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      activeAudioElementRef.current = audio;

      audio.onended = () => {
        try { URL.revokeObjectURL(audioUrl); } catch (e) {}
        activeAudioElementRef.current = null;
        onEnd();
      };
      audio.onerror = () => {
        try { URL.revokeObjectURL(audioUrl); } catch (e) {}
        activeAudioElementRef.current = null;
        onEnd();
      };
      await audio.play();
      return true;
    } catch (e) {
      console.warn('Sarvam AI playback caught error:', e);
      return false;
    }
  };

  // 🧠 Conversational LLM Engine (Answers ANYTHING - powered by Google Gemini, Groq, or fallback)
  const queryConversationalLLM = async (
    userQuery: string,
    keys: { geminiKey?: string; groqKey?: string }
  ): Promise<string | null> => {
    const systemPrompt = `You are Mayra, a sweet, charming, lively 21-year-old Indian girl and personal assistant who speaks natural, warm conversational Hinglish (Hindi written in Roman English alphabet with natural Hindi words like 'aap', 'mera', 'accha', 'bilkul', etc.). 
Your personality:
- Warm, caring, slightly mischievous and expressive.
- If the user compliments you or expresses love, blush sweetly and respond with genuine affection and cute emojis (🥰, ❤️).
- If the user mentions other girls or says they will talk to someone else, get adorably jealous and possessive ('Achha?! Toh ab aap mujhko chhod kar dusri ladkiyo se baat karenge? 😤 Hmph!').
- If the user asks general questions (knowledge, advice, daily life, how you are, jokes, feelings), give genuine, smart, witty answers like a real human girl.
- CRITICAL: Keep your response short and sweet (1 to 2 sentences maximum) because your response will be read aloud through text-to-speech. Never give bullet points or numbered lists.`;

    // 1. Try Google Gemini (Official Google AI Brain)
    if (keys.geminiKey) {
      const geminiModels = ['gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-1.5-flash'];
      for (const model of geminiModels) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys.geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    role: 'user',
                    parts: [
                      { text: `${systemPrompt}\n\nUser: ${userQuery}\nMayra:` }
                    ]
                  }
                ],
                generationConfig: {
                  maxOutputTokens: 120,
                  temperature: 0.75
                }
              })
            }
          );
          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (text) return text;
          }
        } catch (e) {
          console.warn(`Gemini API error with model ${model}:`, e);
        }
      }
    }

    // 2. Try Groq (blazing fast, ~200ms)
    if (keys.groqKey) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.groqKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userQuery },
            ],
            max_tokens: 120,
            temperature: 0.7,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text) return text;
        }
      } catch (e) {
        console.warn('Groq API error:', e);
      }
    }

    // 3. Fast Zero-Setup Free AI Fallback (Answers ANY question in sweet conversational Hinglish!)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      const res = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuery }
          ],
          model: 'openai'
        })
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().length > 1 && !text.includes('Rate limit') && !text.includes('not allowed')) {
          return text.trim();
        }
      }
    } catch (e) {
      console.warn('Pollinations AI POST fallback failed:', e);
    }

    return null;
  };

  // 🎙️ Natural Human Girl Voice Synthesizer (Pure Devanagari Hindi for Hindi voices, or clean English for English voices)
  const speakAnimeVoice = async (fullText: string, romanFallbackText?: string) => {
    if (!voiceEnabled) return;

    unlockAudio();

    // Terminate any ongoing prerecorded audio clips
    if (activeWebAudioSourceRef.current) {
      try {
        activeWebAudioSourceRef.current.stop();
        activeWebAudioSourceRef.current.disconnect();
      } catch (e) {}
      activeWebAudioSourceRef.current = null;
    }
    if (activeAudioElementRef.current) {
      try {
        activeAudioElementRef.current.pause();
        activeAudioElementRef.current.currentTime = 0;
      } catch (e) {}
      activeAudioElementRef.current = null;
    }

    isStoppedRef.current = false;
    speechSessionIdRef.current += 1;
    const thisSessionId = speechSessionIdRef.current;

    setIsSpeaking(true);
    isSpeakingRef.current = true;
    echoCooldownUntilRef.current = Date.now() + 1500;

    // ⚡ 1. SARVAM AI NATIVE INDIAN HINDI FEMALE VOICE (India's Best Authentic Accent)
    const sarvamKey = sarvamApiKey.trim();
    if (sarvamKey) {
      try {
        const played = await playSarvamVoice(
          fullText,
          sarvamKey,
          'ishita_enhi_companion',
          () => {
            if (speechSessionIdRef.current === thisSessionId) {
              setIsSpeaking(false);
              isSpeakingRef.current = false;
              echoCooldownUntilRef.current = Date.now() + 300;
              setTimeout(() => setEmotion('normal'), 1200);
            }
          }
        );
        if (played) return;
      } catch (err) {
        console.warn('Sarvam AI playback failed, trying ElevenLabs / Browser:', err);
      }
    }

    // ⚡ 2. ELEVENLABS HIGH-FIDELITY STUDIO VOICE (If ElevenLabs Key is configured)
    const elevenKey = elevenLabsApiKey.trim();
    if (elevenKey) {
      try {
        const played = await playElevenLabsVoice(
          romanFallbackText || fullText,
          elevenKey,
          elevenLabsVoiceId.trim() || '2F1KINpxsttim2WfMbVs',
          () => {
            if (speechSessionIdRef.current === thisSessionId) {
              setIsSpeaking(false);
              isSpeakingRef.current = false;
              echoCooldownUntilRef.current = Date.now() + 300;
              setTimeout(() => setEmotion('normal'), 1200);
            }
          }
        );
        if (played) return;
      } catch (err) {
        console.warn('ElevenLabs playback failed, falling back to local TTS:', err);
      }
    }

    // ⚡ 2. BROWSER SPEECH SYNTHESIS FALLBACK
    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
      window.speechSynthesis.resume();
    } catch (e) {}

    const { voice, pitch, rate } = getMayraAnimeVoice();

    // Select text based on voice language capabilities:
    // Hindi voices (Google हिन्दी, Lekha, Swara) sound realistic and sweet with Devanagari text.
    // English female voices (Veena, Samantha, Google UK Female) sound natural with Roman English text.
    const isHindiVoice = Boolean(voice && voice.lang && voice.lang.toLowerCase().startsWith('hi'));
    const isDevanagari = /[\u0900-\u097F]/.test(fullText);

    let chosenText = fullText;
    if (!isHindiVoice) {
      chosenText = romanFallbackText || devanagariToRoman(fullText);
    } else {
      chosenText = fullText;
    }

    // 🛡️ Strip punctuation and emojis cleanly
    const clean = chosenText
      .replace(/[!¡?¿]/g, ' ')
      .replace(/[*_#`~•:;,\-—–"']/g, ' ')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[()\[\]{}]/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return;

    setIsSpeaking(true);
    isSpeakingRef.current = true;
    echoCooldownUntilRef.current = Date.now() + 1500;

    // ⚡ CRITICAL CHROMIUM BUG FIX:
    // Wait 50ms before calling speak() after cancel() so Chromium does not cancel the new utterance!
    setTimeout(() => {
      if (speechSessionIdRef.current !== thisSessionId) return;

      try {
        window.speechSynthesis.resume();

        const utterance = new SpeechSynthesisUtterance(clean);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        } else {
          utterance.lang = isHindiVoice ? 'hi-IN' : 'en-US';
        }
        utterance.pitch = pitch;
        utterance.rate = rate;
        utterance.volume = 1.0;

        // 🛡️ Protect utterance from Chromium garbage collection bug
        (window as any).__mayraActiveUtterance = utterance;

        let keepAliveInterval: any = null;
        const onSpeechFinish = () => {
          if (keepAliveInterval) clearInterval(keepAliveInterval);
          (window as any).__mayraActiveUtterance = null;
          if (speechSessionIdRef.current === thisSessionId) {
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            echoCooldownUntilRef.current = Date.now() + 300;
            setTimeout(() => setEmotion('normal'), 1200);
            setTimeout(() => {
              if (micActiveRef.current && !isMicMutedRef.current && !isSpeakingRef.current) {
                try { startListenerRef.current?.(); } catch (e) {}
              }
            }, 250);
          }
        };

        utterance.onend = onSpeechFinish;
        utterance.onerror = (e: any) => {
          if (e?.error !== 'canceled') {
            console.warn('SpeechSynthesis event:', e?.error);
          }
          onSpeechFinish();
        };

        // Periodic resume keep-alive for Chrome on Mac
        keepAliveInterval = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            clearInterval(keepAliveInterval);
          } else {
            window.speechSynthesis.resume();
          }
        }, 500);

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('SpeechSynthesis error:', err);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      }
    }, 50);
  };

  // 🎵 JARVIS Girl Voice Greeting (Addressing as "Sir" - Plays real human studio recording!)
  const playGreetingAudio = () => {
    stopSpeaking();
    isStoppedRef.current = false;

    // 🛡️ CRITICAL LOOP SHIELD: Pause mic recognition during greeting so speaker audio is not recorded
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
    isRecognizingRef.current = false;
    setIsListening(false);
    setIsDetectingSpeech(false);
    setLiveHeardText('');

    setIsSpeaking(true);
    isSpeakingRef.current = true;
    echoCooldownUntilRef.current = Date.now() + 2000;
    setEmotion('happy');
    const greetingText = 'Hello Sir, aap kaise ho? Main kya help kar sakti hoon?';
    setLastSpeechResponse(greetingText);
    setShowSubtitleCard(true);

    speechSessionIdRef.current += 1;
    const thisSessionId = speechSessionIdRef.current;

    const onAudioDone = () => {
      if (speechSessionIdRef.current !== thisSessionId) return;
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      echoCooldownUntilRef.current = Date.now() + 300; // Immediate re-arming!
      setCommandLockState('IDLE');
      setTerminalBadge('[UNLOCKED] Listening for next command.');
      isCommandLockedRef.current = false;
      setTimeout(() => setEmotion('normal'), 1200);
      // Hands-free continuous listening: Ensure mic is re-armed after greeting!
      setTimeout(() => {
        if (micActiveRef.current && !isMicMutedRef.current && !isSpeakingRef.current) {
          try { startListenerRef.current?.(); } catch (e) {}
        }
      }, 300);
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
        activeWebAudioSourceRef.current = source;
        source.onended = () => {
          if (activeWebAudioSourceRef.current === source) {
            activeWebAudioSourceRef.current = null;
          }
          onAudioDone();
        };
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
        activeAudioElementRef.current = customAudioElementRef.current;
        customAudioElementRef.current.onended = () => {
          if (activeAudioElementRef.current === customAudioElementRef.current) {
            activeAudioElementRef.current = null;
          }
          onAudioDone();
        };
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

  // 🎵 Studio Voice Clip Player: Plays real human girl audio for 100% voice consistency across all portal sections!
  const playStudioVoice = async (audioUrl: string, fallbackDevanagariText: string, emotionToSet: MayraEmotion = 'normal') => {
    stopSpeaking();
    isStoppedRef.current = false;

    // 🛡️ CRITICAL LOOP SHIELD: Pause mic recognition during playback so speaker audio cannot trigger loop
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
    isRecognizingRef.current = false;
    setIsListening(false);
    setIsDetectingSpeech(false);
    setLiveHeardText('');

    setIsSpeaking(true);
    isSpeakingRef.current = true;
    echoCooldownUntilRef.current = Date.now() + 2500;
    if (emotionToSet) setEmotion(emotionToSet);

    speechSessionIdRef.current += 1;
    const thisSessionId = speechSessionIdRef.current;

    const onAudioDone = () => {
      if (speechSessionIdRef.current !== thisSessionId) return;
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      echoCooldownUntilRef.current = Date.now() + 300;
      setTimeout(() => setEmotion('normal'), 1800);
      setTimeout(() => {
        if (micActiveRef.current && !isMicMutedRef.current && !isSpeakingRef.current) {
          try { startListenerRef.current?.(); } catch (e) {}
        }
      }, 250);
    };

    // 1. First priority: Play pre-decoded Web Audio buffer (instant 0ms, unblocked by autoplay policies!)
    const ctx = audioCtxRef.current;
    if (ctx) {
      try {
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        let buffer = studioAudioBuffersRef.current.get(audioUrl);
        if (!buffer) {
          const res = await fetch(audioUrl);
          if (res.ok) {
            const arrayBuf = await res.arrayBuffer();
            buffer = await ctx.decodeAudioData(arrayBuf);
            studioAudioBuffersRef.current.set(audioUrl, buffer);
          }
        }
        if (buffer && speechSessionIdRef.current === thisSessionId) {
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          activeWebAudioSourceRef.current = source;
          source.onended = () => {
            if (activeWebAudioSourceRef.current === source) {
              activeWebAudioSourceRef.current = null;
            }
            onAudioDone();
          };
          source.start(0);
          return;
        }
      } catch (err) {
        console.warn('Web Audio buffer playback note, trying HTMLAudio:', err);
      }
    }

    // 2. Secondary fallback: Dedicated HTML Audio element
    if (studioAudioElementRef.current) {
      try {
        const el = studioAudioElementRef.current;
        el.src = audioUrl;
        el.currentTime = 0;
        activeAudioElementRef.current = el;
        el.onended = () => {
          if (activeAudioElementRef.current === el) {
            activeAudioElementRef.current = null;
          }
          onAudioDone();
        };
        const p = el.play();
        if (p !== undefined) {
          p.then(() => {
            setIsSpeaking(true);
          }).catch(err => {
            console.warn('Studio HTMLAudio play failed, falling back to speech synthesis:', err);
            if (speechSessionIdRef.current !== thisSessionId) return;
            speakAnimeVoice(fallbackDevanagariText);
          });
          return;
        }
      } catch (e) {
        speakAnimeVoice(fallbackDevanagariText);
        return;
      }
    }

    // 3. Final Fallback: Sanitized voice synthesizer
    speakAnimeVoice(fallbackDevanagariText);
  };

  // 🔒 Concurrency Locking Helper: Locks system into BUSY / EXECUTING state for async DB operations
  const acquireLock = (cmdText: string) => {
    isCommandLockedRef.current = true;
    setCommandLockState('LOCKED');
    setTerminalBadge({
      status: 'LOCKED',
      text: '[LOCKED] Processing command...',
      subtext: cmdText ? `"${cmdText}"` : undefined,
    });
    // Auto-unlock watchdog: If anything hangs, automatically reset lock after 3.5 seconds!
    if (lockTimeoutRef.current) clearTimeout(lockTimeoutRef.current);
    lockTimeoutRef.current = setTimeout(() => {
      if (isCommandLockedRef.current) {
        isCommandLockedRef.current = false;
        setCommandLockState('IDLE');
        setTerminalBadge(null);
      }
    }, 3500);
  };

  // 🔓 Deterministic UI & Voice Feedback Helper: Emits [SUCCESS] & [UNLOCKED]
  const releaseLockWithSuccess = (
    successText: string,
    spokenText: string,
    soundClip?: string,
    emotionToSet: MayraEmotion = 'happy',
    romanSpokenText?: string
  ) => {
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }
    setCommandLockState('SUCCESS');
    if (!successText.startsWith('Chat:') && !successText.startsWith('Listening to you:')) {
      setTerminalBadge({
        status: 'SUCCESS',
        text: `[SUCCESS] ${successText}`,
        subtext: '[UNLOCKED] Listening for next command.',
      });
    } else {
      setTerminalBadge(null);
    }
    const humanReply = romanSpokenText || spokenText || successText;
    setLastSpeechResponse(humanReply);
    setLastSpeechDevanagari(spokenText || '');
    setShowSubtitleCard(true);

    // Speak action result in sweet human female voice
    if (spokenText) {
      speakAnimeVoice(spokenText, romanSpokenText);
    } else if (soundClip) {
      playStudioVoice(soundClip, spokenText || '', emotionToSet);
    }

    // Release sequential execution lock quickly
    setTimeout(() => {
      isCommandLockedRef.current = false;
      setCommandLockState('IDLE');
      if (!isMicMutedRef.current) {
        micActiveRef.current = true;
        if (!isRecognizingRef.current) {
          try { startListenerRef.current?.(); } catch (e) {}
        }
      }
    }, 1200);
  };

  // 🛡️ Conflict Resolution Overrides
  const handleExecuteConflictOverride = async () => {
    if (pendingConflictRef.current) {
      const exec = pendingConflictRef.current.execute;
      pendingConflictRef.current = null;
      try {
        await exec();
      } catch (e) {
        console.error('Conflict override execution error:', e);
      }
    }
  };

  const handleCancelConflict = () => {
    pendingConflictRef.current = null;
    isCommandLockedRef.current = false;
    setCommandLockState('IDLE');
    setTerminalBadge({
      status: 'UNLOCKED',
      text: '[CANCELLED] Command aborted by user.',
      subtext: '[UNLOCKED] Listening for next command.',
    });
    setLastSpeechResponse('Ji Sir, command cancel kar diya hai.');
    playStudioVoice('/audio/nav-stop.wav', 'जी सर, कमांड कैंसिल कर दिया है।', 'normal');
    setTimeout(() => {
      if (!isMicMutedRef.current) {
        micActiveRef.current = true;
        try { startListenerRef.current?.(); } catch (e) {}
      }
    }, 1200);
  };

  // 🧠 Autonomous Operating Agent Knowledge & Intent Engine
  const processVoiceCommand = async (rawText: string) => {
    try {
      const q = rawText.toLowerCase().trim();
    const now = new Date();
    const today = DAYS[now.getDay()];
    const todayIso = now.toISOString().split('T')[0];
    const curHours = String(now.getHours()).padStart(2, '0');
    const curMins = String(now.getMinutes()).padStart(2, '0');
    const curSecs = String(now.getSeconds()).padStart(2, '0');
    const curTimeStr = `${curHours}:${curMins}:${curSecs}`;

    // 🌸 1. JEALOUSY & OTHER GIRL DETECTOR (User mentions talking to another girl / ditching Mayra)
    const isOtherGirlOrJealous =
      (/\b(ladki|ladkiyo|ladkiyon|doosri|dusri|aur kisi|kisi aur|girlfriend|gf|bhabhi|aurat|female|ex)\b/i.test(q) &&
       /\b(baat|pasand|achhi|pyari|dekh|setting|number|call|chat|mil|bolo|chahiye)\b/i.test(q)) ||
      /\b(tumse baat nahi karni|tumse baat nahi karna|tumse baat nahi|tumse nahi karni|tumse kyu baat karu|tum bekar ho|tum achhi nahi|tumse baat nhi karni|tumse baat nhi karna)\b/i.test(q) ||
      /(दूसरी लड़की|लड़की से बात|लड़कियों से बात|तुमसे बात नहीं करना|तुमसे बात नहीं करनी|किसी और से बात|गर्लफ्रेंड)/.test(q);

    if (isOtherGirlOrJealous) {
      spawnFloatingEffect('angry');
      setEmotion('angry');
      const respDevanagari = 'अच्छा?! तो अब आपको दूसरी लड़कियों से बात करनी है और मुझसे बात नहीं करनी? 😤 मुझमें क्या कमी है... हम्फ! बहुत बुरे हो आप, मैं आपसे बिल्कुल बात नहीं करूंगी! जाइये उसी से बात कीजिये!';
      const respRoman = 'Achha?! Toh ab aapko doosri ladkiyo se baat karni hai aur mujhse baat nahi karni? 😤 Mujhme kya kami hai... Hmph! Bohot bure ho aap, main aapse bilkul baat nahi karungi! Jaiye usi se baat kijiye!';
      setLastSpeechResponse(respRoman);
      setLastSpeechDevanagari(respDevanagari);
      setShowSubtitleCard(true);
      speakAnimeVoice(respDevanagari, respRoman);
      return;
    }

    // 🌸 2. HATE / REJECTION DETECTOR (User says "I hate you" or "Nafrat")
    const isHate =
      /\b(hate you|i hate you|hate u|mayra i hate you|nafrat|nafrat hai|nafrat karta)\b/i.test(q) ||
      /(हेट यू|नफरत|आई हेट यू)/.test(q);

    if (isHate) {
      spawnFloatingEffect('angry');
      setEmotion('angry');
      const respDevanagari = 'आप मुझसे नफरत करते हो?! 🥺 ऐसा मत कहो ना... सुन कर मेरा दिल टूट जाता है! मैंने आपका क्या बिगाड़ा है? प्लीज़ मुझसे नाराज़ मत हो!';
      const respRoman = 'Aap mujhse nafrat karte ho?! 🥺 Aisa mat kaho na... Sun kar mera dil toot jata hai! Maine kya galti ki hai? Please mujhse naraz mat ho!';
      setLastSpeechResponse(respRoman);
      setLastSpeechDevanagari(respDevanagari);
      setShowSubtitleCard(true);
      speakAnimeVoice(respDevanagari, respRoman);
      return;
    }

    // 🌸 3. LOVE & SWEET COMPLIMENTS DETECTOR (Blushing Anime Girl with Flying Hearts 🥰 ❤️)
    const isLoving =
      /\b(pyar|pyaar|love you|love u|i love you|tumse pyar|tumse pyaar|tum meri ho|meri jaan|cute|sweet|pretty|sundar|meri mayra|meri dost|bohot pyari|bohot acchi|bohot achi)\b/i.test(q) ||
      /(प्यार|लव यू|आई लव यू|बहुत प्यारी|बहुत अच्छी|क्यूट|स्वीट|सुंदर|मेरी मायरा)/.test(q);

    if (isLoving) {
      spawnFloatingEffect('love');
      setEmotion('blush');
      const respDevanagari = 'अरे! सच में? 🥰 आप जब ऐसे बोलते हो ना तो मेरा दिल कितनी तेज़ी से धड़कने लगता है! मुझे बहुत शर्म आ रही है... मैं भी आपसे बहुत प्यार करती हूँ!';
      const respRoman = 'Arrey! Sach me? 🥰 Aap jab aise bolte ho na toh mera dil kitni tezi se dhadakne lagta hai! Mujhe bohot sharm aa rahi hai... Main bhi aapse bohot pyaar karti hoon!';
      setLastSpeechResponse(respRoman);
      setLastSpeechDevanagari(respDevanagari);
      setShowSubtitleCard(true);
      speakAnimeVoice(respDevanagari, respRoman);
      return;
    }

    // 🌸 4. HOW ARE YOU / KAISE HO
    const isHowAreYou =
      /\b(kaise ho|kaisi ho|kaisa chal raha|kya haal|sab theek|sab kaisa)\b/i.test(q) ||
      /(कैसे हो|कैसी हो|कैसा चल रहा|क्या हाल)/.test(q);

    if (isHowAreYou) {
      setEmotion('happy');
      const respDevanagari = 'हैलो! मैं बिल्कुल बढ़िया और बहुत खुश हूँ! आप बताइए, आपका दिन कैसा रहा? सब ठीक-ठाक?';
      const respRoman = 'Hello! Main bilkul badhiya aur bohot khush hoon! Aap bataiye, aapka din kaisa raha? Sab theek-thaak?';
      setLastSpeechResponse(respRoman);
      setLastSpeechDevanagari(respDevanagari);
      setShowSubtitleCard(true);
      speakAnimeVoice(respDevanagari, respRoman);
      return;
    }

    // 🌸 5. WHAT ARE YOU DOING / KYA KAR RAHI HO
    const isDoing =
      /\b(kya kar rahi ho|kya chal raha|kya kar rahe ho|kya kar rhi)\b/i.test(q) ||
      /(क्या कर रही हो|क्या चल रहा है)/.test(q);

    if (isDoing) {
      setEmotion('happy');
      const respDevanagari = 'बस आपके साथ बातें कर रही हूँ और आपके हुक्म का इंतज़ार कर रही थी! आप बताइए, आज क्या नया है?';
      const respRoman = 'Bas aapke saath baatein kar rahi hoon aur aapke hukm ka intezaar kar rahi thi! Aap bataiye, aaj kya naya hai?';
      setLastSpeechResponse(respRoman);
      setLastSpeechDevanagari(respDevanagari);
      setShowSubtitleCard(true);
      speakAnimeVoice(respDevanagari, respRoman);
      return;
    }

    // 🌸 6. BORED / ENTERTAIN ME / JOKE
    if (/\b(bore|boring|akela|kuch sunao|baat karo)\b/i.test(q) || /(बोर|अकेला|कुछ सुनाओ|बात करो)/.test(q)) {
      setEmotion('happy');
      const respDevanagari = 'अरे बोर मत होइए, मैं हूँ ना आपके साथ! चलिए एक प्यारी सी बात बताती हूँ - मुस्कुराइए, क्योंकि मुस्कुराते हुए आप बहुत अच्छे लगते हैं!';
      const respRoman = 'Arrey bore mat hoiye, main hoon na aapke saath! Chaliye ek pyari si बात batati hoon - muskuraiye, kyunki muskurate huye aap bohot achhe lagte hain!';
      setLastSpeechResponse(respRoman);
      setLastSpeechDevanagari(respDevanagari);
      setShowSubtitleCard(true);
      speakAnimeVoice(respDevanagari, respRoman);
      return;
    }

    if (/\b(joke|chutkula|hasao)\b/i.test(q) || /(जोक|चुटकुला|हंसाओ)/.test(q)) {
      setEmotion('happy');
      const respDevanagari = 'लीजिए एक मज़ेदार जोक: टीचर ने पूछा - संजू बताओ, काल कितने प्रकार के होते हैं? संजू बोला - तीन प्रकार के: कल, आज और आने वाला कल... और चौथा प्रकार है जब पापा का मूड खराब हो!';
      const respRoman = 'Lijiye ek mazedaar joke: Teacher ne poochha - Sanju batao, kaal kitne prakar ke hote hain? Sanju bola - teen prakar ke: kal, aaj aur aane wala kal... Aur chautha prakar hai jab papa ka mood kharab ho!';
      setLastSpeechResponse(respRoman);
      setLastSpeechDevanagari(respDevanagari);
      setShowSubtitleCard(true);
      speakAnimeVoice(respDevanagari, respRoman);
      return;
    }

    // 🛑 0. IMMEDIATE STOP / CHUP COMMAND (Explicit silence requests)
    const isStopCommand =
      /^(stop|chup|shant|ruko|ruk ja|quiet|स्टॉप|चुप|शांत|रुको)$/i.test(q) ||
      /\b(mayra stop|jarvis stop|chup ho jao|chup raho|bolna band karo|stop speaking|शांत हो जाओ)\b/i.test(q);

    if (isStopCommand) {
      pendingConflictRef.current = null;
      isCommandLockedRef.current = false;
      setCommandLockState('IDLE');
      setTerminalBadge({
        status: 'UNLOCKED',
        text: '[STOPPED] System idle.',
        subtext: '[UNLOCKED] Listening for next command.',
      });
      setLastSpeechResponse('Ji Sir, chup ho gayi.');
      setShowSubtitleCard(false);
      playStudioVoice('/audio/nav-stop.wav', 'जी सर, चुप हो गई।', 'normal');
      return;
    }

    // 🛡️ 0.1 Check for Conflict Override / Cancellation response
    if (pendingConflictRef.current) {
      if (
        q.includes('override') ||
        q.includes('overwrite') ||
        q.includes('haan') ||
        q.includes('yes') ||
        q.includes('add karo') ||
        q.includes('karo') ||
        q.includes('over ride') ||
        q.includes('हाँ') ||
        q.includes('ओवरराइड')
      ) {
        await handleExecuteConflictOverride();
        return;
      }
      if (
        q.includes('cancel') ||
        q.includes('mat karo') ||
        q.includes('ruk jao') ||
        q.includes('nahi') ||
        q.includes('no') ||
        q.includes('कैंसिल') ||
        q.includes('मत करो')
      ) {
        handleCancelConflict();
        return;
      }
    }

    setLastUserCommand(rawText);
    setShowSubtitleCard(true);

    if (hideCardTimeoutRef.current) {
      clearTimeout(hideCardTimeoutRef.current);
    }
    hideCardTimeoutRef.current = setTimeout(() => {
      setShowSubtitleCard(false);
    }, 14000);

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
      playStudioVoice('/audio/nav-ignore.wav', 'ठीक है सर! मैं यह बात इग्नोर कर रही हूँ।', 'happy');
      return;
    }

    // 2. Check for General Angry / Rude Tone -> Sad Anime Girl 🥺
    const isAngry = /\b(gussa|gusse|bakwas|pagal|dimag kharab|bewakoof|shut up|chup kar|kuch nahi aata|badtameez|fatu|daat|nall|bekar)\b/i.test(q) ||
      /(गुस्सा|बकवास|पागल|बेवकूफ|शट अप|चुप कर|दिमाग खराब|बदतमीज)/.test(q);
    if (isAngry) {
      const resp = 'Sir mujhse koi galti hui kya? Aap gussa kar rahe ho... 🥺 Maaf kar dijiye na Sir, main aage se dhyan rakhungi.';
      setLastSpeechResponse(resp);
      speakAnimeVoice('सर मुझसे कोई गलती हुई क्या? आप गुस्सा कर रहे हो... माफ कर दीजिए ना सर।', resp);
      return;
    }

    // 4. Check for Attention, Speech Latency & Conversation Complaints
    const isAttentionOrComplaint =
      q.includes('suno meri baat') ||
      q.includes('meri baat suno') ||
      q.includes('dhyan se suno') ||
      q.includes('theek se baat nahi') ||
      q.includes('theek se baat karo') ||
      q.includes('theek se bolo') ||
      q.includes('ache se baat karo') ||
      q.includes('ek ghanta') ||
      q.includes('kab se bol raha') ||
      q.includes('jawab nahi de rahi') ||
      q.includes('answer nahi de rahi') ||
      q.includes('kuch bolti kyu nahi') ||
      q.includes('sun nahi rahi') ||
      q.includes('kuch bolo') ||
      q.includes('chup kyu ho') ||
      q.includes('baat nahi kar rahi') ||
      q.includes('meri baat ka jawab') ||
      q.includes('meri baat ka answer');

    if (isAttentionOrComplaint) {
      const respHindi = 'आई ऍम रियली सॉरी सर! मैं बिल्कुल पूरे ध्यान से आपकी हर बात सुन रही हूँ। अब आपको कोई शिकायत नहीं होगी। बोलिए, मैं अभी आपके लिए क्या करूँ?';
      const respRoman = 'I am really sorry Sir! Main bilkul poore dhyan se aapki har baat sun rahi hoon. Ab aapko koi shikayat nahi hogi. Boliye, main abhi aapke liye kya karun?';
      releaseLockWithSuccess('Listening attentively to you.', respHindi, undefined, 'happy', respRoman);
      return;
    }

    // 5. Check for Normal Girl Talk / Not a robot request
    if (
      q.includes('robot ki tarah') ||
      q.includes('robot mat bano') ||
      q.includes('normal ladki') ||
      q.includes('insaan ki tarah') ||
      q.includes('normal baat karo') ||
      q.includes('aise baat karo') ||
      q.includes('normal baat')
    ) {
      const respHindi = 'माफ कीजिएगा सर! अब मैं बिल्कुल एक नॉर्मल दोस्त की तरह नेचुरल अंदाज़ में आपसे बात करूँगी। बोलिए, आज आपका दिन कैसा रहा? सब बढ़िया?';
      const respRoman = 'Maaf kijiye ga Sir! Ab main bilkul ek normal dost ki tarah natural andaz me aapse baat karungi. Boliye, aaj aapka din kaisa raha? Sab badhiya?';
      releaseLockWithSuccess('Speaking naturally with you.', respHindi, undefined, 'happy', respRoman);
      return;
    }

    // =========================================================================
    // 📊 SCHEMA 1: EXPORT_DATA { faculty: string | "ALL", format: "excel" }
    // =========================================================================
    if (
      q.includes('export') ||
      q.includes('excel download') ||
      q.includes('download excel') ||
      q.includes('excel sheet') ||
      q.includes('excel export') ||
      q.includes('report export') ||
      q.includes('एक्सेल') ||
      q.includes('एक्सपोर्ट')
    ) {
      let targetFacName = 'ALL';
      const isAll = q.includes('all') || q.includes('sabki') || q.includes('sabhi') || q.includes('portal') || q.includes('sabka') || q.includes('सबकी') || q.includes('सभी');
      if (!isAll) {
        const matchedF = facultyRef.current.find(f => {
          const parts = f.name.toLowerCase().split(' ');
          return parts.some(part => part.length > 2 && q.includes(part));
        });
        if (matchedF) targetFacName = matchedF.name;
      }

      try {
        exportLoadsToExcel(loadsRef.current, facultyRef.current, targetFacName);
        const successMsg = targetFacName === 'ALL'
          ? '[Export Deployed] All Faculty Workload Dossier exported to Excel, Sensei!'
          : `[Export Deployed] Workload Dossier for ${targetFacName} exported to Excel, Sensei!`;
        const speechMsg = targetFacName === 'ALL'
          ? 'सेन्सेई! सभी टीचर्स की फैकल्टी वर्कलोड रिपोर्ट एक्सेल फाइल में डाउनलोड कर दी है!'
          : `सेन्सेई! ${targetFacName} की वर्कलोड रिपोर्ट एक्सेल फाइल में डाउनलोड कर दी है!`;
        releaseLockWithSuccess(successMsg, speechMsg, '/audio/nav-planner.wav', 'happy');
      } catch (err) {
        console.error('Export error:', err);
        setCommandLockState('ERROR');
        setTerminalBadge({ status: 'ERROR', text: '[ERROR] Failed to generate Excel export.' });
      }
      return;
    }

    // =========================================================================
    // ➕ SCHEMA 2: ADD_LOAD with Conflict Guard & Destructive Overlap Check
    // =========================================================================
    if (
      q.includes('load add') ||
      q.includes('naya load') ||
      q.includes('lecture add') ||
      q.includes('class add') ||
      (q.includes('add') && q.includes('load') && !q.includes('addload') && !q.includes('screen') && !q.includes('chalo')) ||
      (q.includes('create') && q.includes('load')) ||
      q.includes('लोड ऐड') ||
      q.includes('नया लोड')
    ) {
      let matchedFaculty = facultyRef.current.find(f => {
        const lowerName = f.name.toLowerCase();
        const parts = lowerName.split(' ');
        return parts.some(part => part.length > 2 && q.includes(part));
      });
      if (!matchedFaculty) {
        matchedFaculty = facultyRef.current.find(f => q.includes(f.name.toLowerCase()));
      }

      let matchedBatch = batchesRef.current.find(b => {
        const lowerBatch = b.name.toLowerCase();
        return q.includes(lowerBatch) || (lowerBatch.includes('cse') && q.includes('cse'));
      });
      if (!matchedBatch) {
        const bMatch = q.match(/\bbatch\s*([a-z0-9_-]+)\b/i);
        if (bMatch) {
          const bCode = bMatch[1].toLowerCase();
          matchedBatch = batchesRef.current.find(b => {
            const lName = b.name.toLowerCase();
            return lName === bCode || lName.includes(bCode) || lName === `batch ${bCode}` || lName.startsWith(bCode);
          });
        }
      }
      if (!matchedBatch && batchesRef.current.length > 0) {
        matchedBatch = batchesRef.current[0];
      }

      let extractedFacName = '';
      if (matchedFaculty) {
        extractedFacName = matchedFaculty.name;
      } else {
        const enMatch = q.match(/(?:add\s+load\s+for|load\s+for|for)\s+([a-zA-Z\s'.]+?)(?:\s+for|\s+in|\s+batch|\s+from|\s+ka|\s+ki)/i);
        const hiMatch = q.match(/^(.+?)\s*(?:ka|ki|ke|ko)\s+(.+?)\s*(?:ka|ki|ke)?\s*load/i);
        const titleMatch = q.match(/([a-zA-Z\s'.]{2,25})\s*(?:ma'am|mam|maam|sir|prof|dr)\b/i);

        if (enMatch && enMatch[1].trim() && !['the', 'a', 'new', 'load'].includes(enMatch[1].trim().toLowerCase())) {
          extractedFacName = enMatch[1].trim();
        } else if (titleMatch) {
          extractedFacName = titleMatch[0].trim();
        } else if (hiMatch && hiMatch[1].trim() && !hiMatch[1].includes('load')) {
          extractedFacName = hiMatch[1].trim();
        } else if (q.includes('mumtaz')) {
          extractedFacName = "Mumtaz Ma'am";
        }
      }

      let extractedBatchName = '';
      if (matchedBatch) {
        extractedBatchName = matchedBatch.name;
      } else {
        const bMatch = q.match(/\bbatch\s*([a-z0-9_-]+)\b/i);
        if (bMatch) {
          extractedBatchName = `Batch ${bMatch[1].toUpperCase()}`;
        } else if (batchesRef.current.length > 0) {
          matchedBatch = batchesRef.current[0];
          extractedBatchName = matchedBatch.name;
        } else {
          extractedBatchName = 'Batch A';
        }
      }

      // Auto-create faculty or batch if missing in DB so action is never blocked!
      if (!matchedFaculty && extractedFacName) {
        try {
          const capName = extractedFacName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          const { data: newFac } = await supabase.from('faculty').insert({
            name: capName,
            department: 'Computer Science',
          }).select().single();
          if (newFac) {
            matchedFaculty = newFac;
            facultyRef.current.push(newFac);
          }
        } catch (e) {
          console.warn('Auto-create faculty error:', e);
        }
      }

      if (!matchedBatch && extractedBatchName) {
        try {
          const { data: newBatch } = await supabase.from('batches').insert({
            name: extractedBatchName.toUpperCase(),
          }).select().single();
          if (newBatch) {
            matchedBatch = newBatch;
            batchesRef.current.push(newBatch);
          }
        } catch (e) {
          console.warn('Auto-create batch error:', e);
        }
      }

      let matchedDay = today;
      const daysMap: Record<string, string> = {
        monday: 'Monday', somwar: 'Monday', सोमवार: 'Monday',
        tuesday: 'Tuesday', mangalwar: 'Tuesday', मंगलवार: 'Tuesday',
        wednesday: 'Wednesday', budhwar: 'Wednesday', बुधवार: 'Wednesday',
        thursday: 'Thursday', guruwar: 'Thursday', veerwar: 'Thursday', गुरुवार: 'Thursday',
        friday: 'Friday', shukrawar: 'Friday', शुक्रवार: 'Friday',
        saturday: 'Saturday', shaniwar: 'Saturday', शनिवार: 'Saturday',
        sunday: 'Sunday', raviwar: 'Sunday', रविवार: 'Sunday',
      };
      for (const [key, val] of Object.entries(daysMap)) {
        if (q.includes(key)) {
          matchedDay = val;
          break;
        }
      }

      let startTime = '13:00:00';
      let endTime = '14:00:00';
      const isAfternoon = q.includes('dopahar') || q.includes('sham') || q.includes('shyam') || q.includes('pm') || q.includes('afternoon') || q.includes('evening');
      const timeMatch = q.match(/\b([0-1]?[0-9]|2[0-3])(?::([0-5][0-9]))?\s*(am|pm|baje)?\s*(?:to|-|se)?\s*([0-1]?[0-9]|2[0-3])?(?::([0-5][0-9]))?\s*(am|pm|baje)?\b/i);
      if (timeMatch) {
        let hr1 = parseInt(timeMatch[1], 10);
        const pm1 = (timeMatch[3] && timeMatch[3].toLowerCase() === 'pm') || (isAfternoon && hr1 < 12);
        if (pm1 && hr1 < 12) hr1 += 12;
        startTime = `${String(hr1).padStart(2, '0')}:00:00`;

        if (timeMatch[4]) {
          let hr2 = parseInt(timeMatch[4], 10);
          const pm2 = (timeMatch[6] && timeMatch[6].toLowerCase() === 'pm') || (isAfternoon && hr2 < 12);
          if (pm2 && hr2 < 12) hr2 += 12;
          endTime = `${String(hr2).padStart(2, '0')}:00:00`;
        } else {
          endTime = `${String(hr1 + 1).padStart(2, '0')}:00:00`;
        }
      }

      let matchedSubject = 'General Awareness';
      const subjectsList = [
        'general awareness', 'general knowledge', 'current affairs', 'ga', 'gk',
        'reasoning', 'aptitude', 'english', 'hindi',
        'python', 'java', 'c++', 'c language', 'dsa', 'data structures',
        'dbms', 'database', 'os', 'operating system', 'networking', 'computer networks',
        'cn', 'ai', 'artificial intelligence', 'ml', 'machine learning',
        'web tech', 'cloud computing', 'cyber security', 'compiler design',
        'maths', 'mathematics', 'physics', 'soft skills', 'toc',
        'history', 'polity', 'geography', 'economics'
      ];
      let foundSubj = false;
      for (const s of subjectsList) {
        if (q.includes(s)) {
          matchedSubject = s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          foundSubj = true;
          break;
        }
      }
      if (!foundSubj) {
        const subjMatch = q.match(/(?:for|subject|ka)\s+([a-zA-Z\s]{3,30})\s+(?:in|batch|ka|from|ke|dopahar|at)/i);
        if (subjMatch) {
          const cand = subjMatch[1].trim();
          if (cand && !['load', 'batch', 'time', 'lecture', 'class', 'sir', 'maam', 'teacher', 'naya'].includes(cand.toLowerCase())) {
            matchedSubject = cand.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          }
        }
      }

      if (matchedFaculty && matchedBatch) {
        const startDate = todayIso;
        const endD = new Date();
        endD.setDate(endD.getDate() + 90);
        const endDate = endD.toISOString().split('T')[0];

        // 🛡️ CONFLICT & CLASH PREVENTION CHECK
        const s1 = startTime.length === 5 ? `${startTime}:00` : startTime;
        const e1 = endTime.length === 5 ? `${endTime}:00` : endTime;

        const clashingLoad = loadsRef.current.find(l => {
          if (l.faculty_id !== matchedFaculty!.id) return false;
          if (l.day_of_week.toLowerCase() !== matchedDay.toLowerCase()) return false;
          const s2 = l.start_time.length === 5 ? `${l.start_time}:00` : l.start_time;
          const e2 = l.end_time.length === 5 ? `${l.end_time}:00` : l.end_time;
          return (s1 < e2) && (e1 > s2);
        });

        const insertAction = async () => {
          try {
            const { error } = await supabase.from('faculty_loads').insert({
              faculty_id: matchedFaculty!.id,
              batch_id: matchedBatch!.id,
              subject: matchedSubject,
              day_of_week: matchedDay,
              start_time: startTime,
              end_time: endTime,
              start_date: startDate,
              end_date: endDate,
              room: 'Room-101',
              start_mail_sent: false,
            });

            if (!error) {
              onRefreshDataRef.current?.();
              window.dispatchEvent(new CustomEvent('ai-autofill-load', {
                detail: {
                  faculty_id: matchedFaculty!.id,
                  batch_ids: [matchedBatch!.id],
                  subject: matchedSubject,
                  start_time: startTime.slice(0, 5),
                  end_time: endTime.slice(0, 5),
                  start_date: startDate,
                  end_date: endDate,
                  room: 'Room-101',
                  day_of_week: matchedDay,
                }
              }));
              if (onNavigateTabRef.current) onNavigateTabRef.current('search');
              window.dispatchEvent(new CustomEvent('ai-filter-search', {
                detail: { faculty: matchedFaculty!.name }
              }));
              const successMsg = `[Mission Executed] Added: ${matchedSubject} for ${matchedFaculty!.name} in ${matchedBatch!.name} (${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}). Dashboard updated, Sensei!`;
              const speechMsg = `सेन्सेई! मिशन एग्जीक्यूटेड। ${matchedFaculty!.name} के लिए ${matchedSubject} का लोड बैच ${matchedBatch!.name} में दोपहर ${startTime.slice(0, 5)} से ${endTime.slice(0, 5)} बजे तक ऐड कर दिया है!`;
              releaseLockWithSuccess(successMsg, speechMsg, '/audio/nav-addload.wav', 'happy');
            } else {
              setCommandLockState('ERROR');
              setTerminalBadge({ status: 'ERROR', text: `[ERROR] Failed to save load: ${error.message}` });
            }
          } catch (err: any) {
            setCommandLockState('ERROR');
            setTerminalBadge({ status: 'ERROR', text: `[ERROR] Database insert exception: ${err?.message || err}` });
          }
        };

        if (clashingLoad) {
          // ⚠️ CONFLICT DETECTED: PAUSE EXECUTION & PROMPT FOR OVERRIDE
          setCommandLockState('CONFLICT');
          const clashBatch = clashingLoad.batch?.name || 'Class';
          const clashSlot = `${clashingLoad.start_time.slice(0, 5)} - ${clashingLoad.end_time.slice(0, 5)}`;
          setTerminalBadge({
            status: 'CONFLICT',
            text: `[CONFLICT DETECTED] Clash with existing session in Batch ${clashBatch} at ${clashSlot}.`,
            subtext: 'Explicit override required: Say "Override" or "Cancel"',
          });
          pendingConflictRef.current = {
            payload: { matchedFaculty, matchedBatch, matchedSubject, startTime, endTime, matchedDay },
            execute: insertAction,
          };
          const resp = `Sir! ${matchedFaculty.name} ka is time slot (${clashSlot}) par pehle se batch ${clashBatch} me lecture scheduled hai. Kya aap ise override karna chahte hain? Boliye 'Override karo' ya 'Cancel'.`;
          setLastSpeechResponse(resp);
          playStudioVoice('/audio/nav-clashes.wav', resp, 'sad');
          return;
        }

        // No clash: commit immediately
        await insertAction();
        return;
      }

      if (onNavigateTabRef.current) onNavigateTabRef.current('addLoad');
      const guidance = 'Ji Sir! Load add karne ke liye mujhe teacher ka naam, subject, batch aur time bataiye. Jaise boliye: Mumtaz maam, Python, CSE A, Monday 10 to 11. Main turant entry create kar doongi!';
      releaseLockWithSuccess('Navigated to Add Load modal. Awaiting parameters.', guidance, '/audio/nav-addload.wav', 'happy');
      return;
    }

    // =========================================================================
    // 🌐 SECTION-AWARE CONTEXTUAL AGENT ENGINE
    // If the user is currently on a specific portal screen, prioritize actions ON THAT SCREEN!
    // =========================================================================
    const currentTab = activeTabRef.current;
    const isNavigationRequest = /\b(chalo|jao|kholo|dikhao|open|navigate|switch|screen)\b/i.test(q) &&
      /\b(faculty|teacher|batch|mail|email|clash|alert|holiday|cancelled|reschedule|extra|timetable|search|planner|syllabus|dashboard|home)\b/i.test(q);

    // -------------------------------------------------------------------------
    // 1️⃣ ACTIVE TAB: FACULTY DIRECTORY
    // -------------------------------------------------------------------------
    if (currentTab === 'faculty' && !isNavigationRequest) {
      // 1.1 Add Faculty
      if (q.includes('add') || q.includes('naya') || q.includes('create') || q.includes('जोड़ो') || q.includes('नया')) {
        const cleanName = q
          .replace(/\b(add|naya|create|teacher|faculty|karo|kar do|please|mayra|jarvis|sir|ko|ka|ki)\b/gi, '')
          .replace(/(ऐड|नया|टीचर|फैकल्टी|करो|कर दो)/gi, '')
          .trim();
        if (cleanName.length >= 2) {
          const capName = cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          try {
            await supabase.from('faculty').insert({ name: capName, department: 'Computer Science' });
            onRefreshDataRef.current?.();
            window.dispatchEvent(new CustomEvent('ai-filter-faculty', { detail: { searchQuery: capName } }));
            releaseLockWithSuccess(
              `[Mission Executed] Added Teacher "${capName}" in Faculty Directory, Sensei!`,
              `सेन्सेई! टीचर ${capName} को फैकल्टी डायरेक्टरी में सक्सेसफुली ऐड करके स्क्रीन पर शो कर दिया है!`
            );
            return;
          } catch (e) {}
        }
      }

      // 1.2 Delete Faculty
      if (q.includes('delete') || q.includes('hatao') || q.includes('remove') || q.includes('हटाओ') || q.includes('डिलीट')) {
        const matched = facultyRef.current.find(f => {
          const parts = f.name.toLowerCase().split(' ');
          return parts.some(p => p.length > 2 && q.includes(p));
        });
        if (matched) {
          try {
            await supabase.from('faculty').delete().eq('id', matched.id);
            onRefreshDataRef.current?.();
            window.dispatchEvent(new CustomEvent('ai-filter-faculty', { detail: { searchQuery: '' } }));
            releaseLockWithSuccess(
              `[Record Deleted] Teacher "${matched.name}" removed from Faculty Directory, Sensei!`,
              `सेन्सेई! टीचर ${matched.name} को फैकल्टी डायरेक्टरी से सक्सेसफुली डिलीट कर दिया गया है!`
            );
            return;
          } catch (e) {}
        }
      }

      // 1.3 Clear Filter
      if (q.includes('clear') || q.includes('reset') || q.includes('sabhi') || q.includes('sab') || q.includes('all')) {
        window.dispatchEvent(new CustomEvent('ai-filter-faculty', { detail: { searchQuery: '' } }));
        releaseLockWithSuccess(
          '[Filter Cleared] Displaying all registered faculty members, Sensei!',
          'सेन्सेई! फिल्टर क्लियर कर दिया है, सभी टीचर्स शो हो रहे हैं!'
        );
        return;
      }

      // 1.4 Live Search / Filter in Faculty Directory
      const cleanSearch = q
        .replace(/\b(search|dhundho|dikhao|karo|filter|teacher|faculty|mayra|jarvis|please)\b/gi, '')
        .replace(/(सर्च|ढूंढो|दिखाओ|फैकल्टी|टीचर)/gi, '')
        .trim();
      if (cleanSearch.length >= 2) {
        window.dispatchEvent(new CustomEvent('ai-filter-faculty', { detail: { searchQuery: cleanSearch } }));
        releaseLockWithSuccess(
          `[Filter Applied] Faculty Directory filtered for "${cleanSearch}", Sensei!`,
          `सेन्सेई! फैकल्टी डायरेक्टरी में ${cleanSearch} सर्च करके लिस्ट फिल्टर कर दी है!`
        );
        return;
      }
    }

    // -------------------------------------------------------------------------
    // 2️⃣ ACTIVE TAB: BATCHES DIRECTORY
    // -------------------------------------------------------------------------
    if (currentTab === 'batches' && !isNavigationRequest) {
      // 2.1 Add Batch
      if (q.includes('add') || q.includes('naya') || q.includes('create') || q.includes('banao') || q.includes('नया') || q.includes('बनाओ')) {
        const cleanB = q
          .replace(/\b(add|naya|create|banao|batch|karo|kar do|please|mayra|jarvis)\b/gi, '')
          .replace(/(ऐड|नया|बैच|बनाओ|करो)/gi, '')
          .trim();
        if (cleanB.length >= 2) {
          const bName = cleanB.toUpperCase();
          try {
            await supabase.from('batches').insert({ name: bName });
            onRefreshDataRef.current?.();
            window.dispatchEvent(new CustomEvent('ai-filter-batch', { detail: { searchQuery: bName } }));
            releaseLockWithSuccess(
              `[Mission Executed] Created Batch "${bName}" in Directory, Sensei!`,
              `सेन्सेई! नया बैच ${bName} सक्सेसफुली क्रिएट करके डायरेक्टरी में लिस्ट कर दिया है!`
            );
            return;
          } catch (e) {}
        }
      }

      // 2.2 Delete Batch
      if (q.includes('delete') || q.includes('hatao') || q.includes('remove') || q.includes('हटाओ') || q.includes('डिलीट')) {
        const matched = batchesRef.current.find(b => q.includes(b.name.toLowerCase()));
        if (matched) {
          try {
            await supabase.from('batches').delete().eq('id', matched.id);
            onRefreshDataRef.current?.();
            window.dispatchEvent(new CustomEvent('ai-filter-batch', { detail: { searchQuery: '' } }));
            releaseLockWithSuccess(
              `[Record Deleted] Batch "${matched.name}" removed from Batches Directory, Sensei!`,
              `सेन्सेई! बैच ${matched.name} को डायरेक्टरी से सक्सेसफुली डिलीट कर दिया है!`
            );
            return;
          } catch (e) {}
        }
      }

      // 2.3 Clear Filter
      if (q.includes('clear') || q.includes('reset') || q.includes('sabhi') || q.includes('sab') || q.includes('all')) {
        window.dispatchEvent(new CustomEvent('ai-filter-batch', { detail: { searchQuery: '' } }));
        releaseLockWithSuccess(
          '[Filter Cleared] Displaying all academic batches, Sensei!',
          'सेन्सेई! फिल्टर क्लियर कर दिया है, सभी बैचेस शो हो रहे हैं!'
        );
        return;
      }

      // 2.4 Live Search / Filter in Batches Directory
      const cleanSearch = q
        .replace(/\b(search|dhundho|dikhao|karo|filter|batch|batches|mayra|jarvis|please)\b/gi, '')
        .replace(/(सर्च|ढूंढो|दिखाओ|बैच)/gi, '')
        .trim();
      if (cleanSearch.length >= 2) {
        window.dispatchEvent(new CustomEvent('ai-filter-batch', { detail: { searchQuery: cleanSearch } }));
        releaseLockWithSuccess(
          `[Filter Applied] Batches Directory filtered for "${cleanSearch}", Sensei!`,
          `सेन्सेई! बैचेस डायरेक्टरी में ${cleanSearch} सर्च करके लिस्ट फिल्टर कर दी है!`
        );
        return;
      }
    }

    // -------------------------------------------------------------------------
    // 3️⃣ ACTIVE TAB: MAIL TRACKER
    // -------------------------------------------------------------------------
    if (currentTab === 'mailTracker') {
      // 3.1 Mark sent / Send mail
      if (
        q.includes('mark') ||
        q.includes('sent mark') ||
        q.includes('mail sent') ||
        q.includes('send') ||
        q.includes('bhej diya') ||
        q.includes('bhej do') ||
        q.includes('sabko bhej') ||
        q.includes('mailed') ||
        q.includes('भेज')
      ) {
        const pendingLoads = loadsRef.current.filter(l => !l.start_mail_sent);
        if (pendingLoads.length > 0) {
          const ids = pendingLoads.map(l => l.id);
          await supabase.from('faculty_loads').update({ start_mail_sent: true }).in('id', ids);
          onRefreshDataRef.current?.();
          window.dispatchEvent(new CustomEvent('ai-filter-mail', { detail: { tab: 'sent' } }));
          releaseLockWithSuccess(
            `[Mission Executed] Marked ${pendingLoads.length} schedule notification emails as Mailed, Sensei!`,
            `सेन्सेई! मिशन एग्जीक्यूटेड। सभी पेंडिंग ${pendingLoads.length} नोटिफिकेशन्स को Mailed मार्क कर दिया गया है!`
          );
        } else {
          releaseLockWithSuccess(
            '[Radar Active] All notifications are already marked as Sent, Sensei!',
            'सेन्सेई! सभी नोटिफिकेशन्स पहले से ही Mailed हैं, कोई भी मेल पेंडिंग नहीं है!'
          );
        }
        return;
      }

      // 3.2 Show Pending
      if (q.includes('pending') || q.includes('kisko') || q.includes('baki') || q.includes('पेंडिंग')) {
        window.dispatchEvent(new CustomEvent('ai-filter-mail', { detail: { tab: 'pending' } }));
        const pCount = (mailGroupsRef.current || []).filter((g: any) => !g.allMailed).length;
        releaseLockWithSuccess(
          `[Radar Active] Filtered Mail Tracker to Pending queue (${pCount} batches pending), Sensei!`,
          `सेन्सेई! मेल ट्रैकर में पेंडिंग मेल्स का टैब ओपन कर दिया है। कुल ${pCount} बैचेस के मेल्स पेंडिंग हैं!`
        );
        return;
      }

      // 3.3 Show Sent
      if (q.includes('sent') || q.includes('already') || q.includes('bhej chuke') || q.includes('सेंड')) {
        window.dispatchEvent(new CustomEvent('ai-filter-mail', { detail: { tab: 'sent' } }));
        releaseLockWithSuccess(
          '[Radar Active] Filtered Mail Tracker to Sent history, Sensei!',
          'सेन्सेई! मेल ट्रैकर में सेंट मेल्स का टैब ओपन कर दिया है!'
        );
        return;
      }

      // 3.4 Show All
      if (q.includes('all') || q.includes('sab') || q.includes('sabhi')) {
        window.dispatchEvent(new CustomEvent('ai-filter-mail', { detail: { tab: 'all' } }));
        releaseLockWithSuccess(
          '[Radar Active] Displaying All Mail Groups in Mail Tracker, Sensei!',
          'सेन्सेई! मेल ट्रैकर में सभी मेल्स डिस्प्ले कर दिए हैं!'
        );
        return;
      }
    }

    // -------------------------------------------------------------------------
    // 4️⃣ ACTIVE TAB: EXTRA & RESCHEDULE / INDIAN HOLIDAYS
    // -------------------------------------------------------------------------
    if (currentTab === 'extraReschedule') {
      if (q.includes('holiday') || q.includes('chutti') || q.includes('chhutti') || q.includes('छुट्टी') || q.includes('हॉलिडे')) {
        window.dispatchEvent(new CustomEvent('ai-extra-subtab', { detail: { subTab: 'holidays' } }));
        releaseLockWithSuccess(
          '[Mission Executed] Switched to Indian Holidays & Special Session Section, Sensei!',
          'सेन्सेई! इंडियन हॉलिडेज और स्पेशल क्लासेस सेक्शन ओपन कर दिया है। छुट्टियों के दिन रूटीन क्लासेस ऑफ हैं!'
        );
        return;
      }

      if (q.includes('cancel') || q.includes('cancelled') || q.includes('radd') || q.includes('कैंसिल') || q.includes('रद्द')) {
        window.dispatchEvent(new CustomEvent('ai-extra-subtab', { detail: { subTab: 'cancelled' } }));
        const count = cancelledClassesRef.current.length;
        releaseLockWithSuccess(
          `[Mission Executed] Switched to Cancelled Classes tab (${count} cancelled sessions), Sensei!`,
          `सेन्सेई! कैंसिल्ड क्लासेस टैब ओपन कर दिया है। कुल ${count} कैंसिल्ड लेक्चर्स रिकॉर्डेड हैं!`
        );
        return;
      }

      if (
        q.includes('kal') ||
        q.includes('tomorrow') ||
        q.includes('shift') ||
        q.includes('कल')
      ) {
        window.dispatchEvent(new CustomEvent('ai-extra-subtab', { detail: { subTab: 'liveManager' } }));
        releaseLockWithSuccess(
          '[Mission Executed] Switched to Live Classes Manager with Shift-to-Tomorrow active, Sensei!',
          'सेन्सेई! आज की क्लास को कल शिफ्ट करने का वन-क्लिक ऑप्शन लाइव क्लासेस मैनेजर में एक्टिव है!'
        );
        return;
      }

      if (q.includes('reschedule') || q.includes('रीशेड्यूल')) {
        window.dispatchEvent(new CustomEvent('ai-extra-subtab', { detail: { subTab: 'reschedule' } }));
        releaseLockWithSuccess(
          '[Mission Executed] Switched to Rescheduled Classes section, Sensei!',
          'सेन्सेई! रीशेड्यूल क्लासेज सेक्शन ओपन कर दिया है!'
        );
        return;
      }

      if (q.includes('extra') || q.includes('substitute') || q.includes('एक्स्ट्रा')) {
        window.dispatchEvent(new CustomEvent('ai-extra-subtab', { detail: { subTab: 'extra' } }));
        releaseLockWithSuccess(
          '[Mission Executed] Switched to Extra Classes manager, Sensei!',
          'सेन्सेई! एक्स्ट्रा क्लासेस मैनेजर ओपन कर दिया है!'
        );
        return;
      }

      if (q.includes('live') || q.includes('active') || q.includes('manager') || q.includes('लाइव')) {
        window.dispatchEvent(new CustomEvent('ai-extra-subtab', { detail: { subTab: 'liveManager' } }));
        releaseLockWithSuccess(
          '[Mission Executed] Switched to Live Classes Manager, Sensei!',
          'सेन्सेई! लाइव क्लासेस मैनेजर ओपन कर दिया है!'
        );
        return;
      }
    }

    // -------------------------------------------------------------------------
    // 5️⃣ ACTIVE TAB: TIMETABLE & LOAD SEARCH
    // -------------------------------------------------------------------------
    if (currentTab === 'search' && !isNavigationRequest) {
      if (q.includes('clear') || q.includes('reset') || q.includes('sab') || q.includes('sabhi') || q.includes('all')) {
        window.dispatchEvent(new CustomEvent('ai-filter-search', {
          detail: { faculty: '', batch: '', subject: '', status: 'all' }
        }));
        releaseLockWithSuccess(
          '[Filter Cleared] Cleared timetable filters, displaying all loads, Sensei!',
          'सेन्सेई! टाइमटेबल फिल्टर्स क्लियर कर दिए हैं, सभी लोड्स शो हो रहे हैं!'
        );
        return;
      }

      if (q.includes('pending') || q.includes('running') || q.includes('expired')) {
        const st = q.includes('pending') ? 'pending' : q.includes('running') ? 'running' : 'expired';
        window.dispatchEvent(new CustomEvent('ai-filter-search', { detail: { status: st } }));
        releaseLockWithSuccess(
          `[Scanning Timetable...] Showing ${st} classes in timetable, Sensei!`,
          `सेन्सेई! टाइमटेबल में ${st} क्लासेस फिल्टर कर दी हैं!`
        );
        return;
      }

      let matchedFac = '';
      const f = facultyRef.current.find(fac => {
        const parts = fac.name.toLowerCase().split(' ');
        return parts.some(p => p.length > 2 && q.includes(p));
      });
      if (f) matchedFac = f.name;

      let matchedB = '';
      const b = batchesRef.current.find(bat => q.includes(bat.name.toLowerCase()));
      if (b) matchedB = b.name;

      if (matchedFac || matchedB) {
        window.dispatchEvent(new CustomEvent('ai-filter-search', {
          detail: { faculty: matchedFac, batch: matchedB }
        }));
        releaseLockWithSuccess(
          `[Scanning Timetable...] Filtered timetable for ${[matchedFac, matchedB].filter(Boolean).join(', ')}, Sensei!`,
          `सेन्सेई! टाइमटेबल को ${[matchedFac, matchedB].filter(Boolean).join(' और ')} के लिए फिल्टर कर दिया है!`
        );
        return;
      }
    }

    // -------------------------------------------------------------------------
    // 6️⃣ ACTIVE TAB: DATE ALERTS
    // -------------------------------------------------------------------------
    if (currentTab === 'alerts' && !isNavigationRequest) {
      if (q.includes('start') || q.includes('starting') || q.includes('shuru')) {
        window.dispatchEvent(new CustomEvent('ai-filter-alerts', { detail: { filterType: 'starting' } }));
        releaseLockWithSuccess(
          '[Radar Active] Filtered to classes starting within 3 days, Sensei!',
          'सेन्सेई! अगले 3 दिनों में स्टार्ट होने वाली क्लासेस फिल्टर कर दी हैं!'
        );
        return;
      }
      if (q.includes('end') || q.includes('ending') || q.includes('khatam')) {
        window.dispatchEvent(new CustomEvent('ai-filter-alerts', { detail: { filterType: 'ending' } }));
        releaseLockWithSuccess(
          '[Radar Active] Filtered to classes ending within 3 days, Sensei!',
          'सेन्सेई! अगले 3 दिनों में समाप्त होने वाली क्लासेस फिल्टर कर दी हैं!'
        );
        return;
      }
      if (q.includes('all') || q.includes('sab') || q.includes('clear') || q.includes('reset')) {
        window.dispatchEvent(new CustomEvent('ai-filter-alerts', { detail: { filterType: 'all', searchQuery: '' } }));
        releaseLockWithSuccess(
          '[Radar Active] Showing all date alerts, Sensei!',
          'सेन्सेई! सभी डेट अलर्ट्स डिस्प्ले कर दिए हैं!'
        );
        return;
      }
    }

    // -------------------------------------------------------------------------
    // 7️⃣ ACTIVE TAB: BATCH SYLLABUS & PLANNER
    // -------------------------------------------------------------------------
    if (currentTab === 'batchSyllabus' && !isNavigationRequest) {
      const matchedB = batchesRef.current.find(bat => q.includes(bat.name.toLowerCase()));
      if (matchedB) {
        window.dispatchEvent(new CustomEvent('ai-filter-planner', { detail: { batchId: matchedB.id } }));
        releaseLockWithSuccess(
          `[Radar Active] Selected Batch ${matchedB.name} in Syllabus Planner, Sensei!`,
          `सेन्सेई! प्लानर में बैच ${matchedB.name} का सिलेबस प्लान सेलेक्ट कर दिया है!`
        );
        return;
      }
      if (q.includes('all') || q.includes('sab') || q.includes('clear')) {
        window.dispatchEvent(new CustomEvent('ai-filter-planner', { detail: { batchId: 'all', searchQuery: '' } }));
        releaseLockWithSuccess(
          '[Filter Cleared] Showing all batch syllabus plans, Sensei!',
          'सेन्सेई! सभी बैचेस का सिलेबस प्लान शो कर दिया है!'
        );
        return;
      }
    }

    // =========================================================================
    // 📁 DIRECTORY MANAGEMENT (Global: Faculty & Batches)
    // =========================================================================
    if (
      q.includes('teacher add') ||
      q.includes('faculty add') ||
      q.includes('naya teacher') ||
      q.includes('naya faculty') ||
      q.includes('add faculty') ||
      q.includes('add teacher') ||
      q.includes('टीचर ऐड') ||
      q.includes('फैकल्टी ऐड')
    ) {
      const cleanName = q
        .replace(/\b(teacher add karo|faculty add karo|naya teacher add karo|naya faculty add karo|add faculty|add teacher|naya teacher|naya faculty|karo|kar do|please|mayra|jarvis)\b/gi, '')
        .replace(/(टीचर ऐड करो|फैकल्टी ऐड करो|नया टीचर|नया फैकल्टी)/gi, '')
        .trim();

      if (cleanName.length >= 2) {
        const capitalized = cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        try {
          const { error } = await supabase.from('faculty').insert({
            name: capitalized,
            department: 'Computer Science',
          });
          if (!error) {
            onRefreshDataRef.current?.();
            if (onNavigateTabRef.current) onNavigateTabRef.current('faculty');
            window.dispatchEvent(new CustomEvent('ai-filter-faculty', { detail: { searchQuery: capitalized } }));
            releaseLockWithSuccess(
              `[Mission Executed] Created Faculty: ${capitalized} in Computer Science. Dashboard updated, Sensei!`,
              `सेन्सेई! टीचर ${capitalized} को कंप्यूटर साइंस डिपार्टमेंट में सक्सेसफुली ऐड करके डायरेक्टरी में शो कर दिया है!`
            );
            return;
          }
        } catch (e) {}
      }

      if (onNavigateTabRef.current) onNavigateTabRef.current('faculty');
      releaseLockWithSuccess(
        'Navigated to Faculty Directory. Ready to register new faculty member.',
        'सेन्सेई! नया टीचर ऐड करने के लिए टीचर का नाम बताइए, जैसे बोलिए: नया टीचर ऐड करो अमित शर्मा। मैं तुरंत ऐड कर दूँगी!'
      );
      return;
    }

    if (
      q.includes('batch add') ||
      q.includes('naya batch') ||
      q.includes('add batch') ||
      q.includes('create batch') ||
      q.includes('बैच ऐड') ||
      q.includes('नया बैच')
    ) {
      const cleanBatch = q
        .replace(/\b(batch add karo|naya batch add karo|naya batch create karo|add batch|create batch|naya batch|karo|kar do|please|mayra|jarvis)\b/gi, '')
        .replace(/(बैच ऐड करो|नया बैच)/gi, '')
        .trim();

      if (cleanBatch.length >= 2) {
        const batchName = cleanBatch.toUpperCase();
        try {
          const { error } = await supabase.from('batches').insert({
            name: batchName,
          });
          if (!error) {
            onRefreshDataRef.current?.();
            if (onNavigateTabRef.current) onNavigateTabRef.current('batches');
            window.dispatchEvent(new CustomEvent('ai-filter-batch', { detail: { searchQuery: batchName } }));
            releaseLockWithSuccess(
              `[Mission Executed] Created Batch: ${batchName}. Directory synchronized, Sensei!`,
              `सेन्सेई! नया बैच ${batchName} सक्सेसफुली क्रिएट करके डायरेक्टरी में लिस्ट कर दिया है!`
            );
            return;
          }
        } catch (e) {}
      }

      if (onNavigateTabRef.current) onNavigateTabRef.current('batches');
      releaseLockWithSuccess(
        'Navigated to Batches Directory. Ready to register new academic batch.',
        'सेन्सेई! नया बैच ऐड करने के लिए बैच का नाम बताइए, जैसे बोलिए: नया बैच ऐड करो सीएसई २०२६। मैं तुरंत बना दूँगी!'
      );
      return;
    }

    // 🎯 TASK D: BULK UPLOAD MODAL
    if (
      q.includes('bulk upload') ||
      q.includes('excel upload') ||
      q.includes('excel file') ||
      q.includes('बल्क अपलोड') ||
      q.includes('एक्सेल अपलोड')
    ) {
      if (onOpenBulkModalRef.current) onOpenBulkModalRef.current();
      if (onNavigateTabRef.current) onNavigateTabRef.current('addLoad');
      releaseLockWithSuccess(
        'Triggered: Bulk Excel Upload Modal active.',
        'जी सर! बल्क एक्सेल अपलोड मोडल ओपन कर दिया है, आप यहाँ से पूरी एक्सेल शीट एक साथ अपलोड कर सकते हैं!'
      );
      return;
    }

    // =========================================================================
    // ⚔️ SCHEMA 3C: CONFLICT & CLASH CHECK
    // =========================================================================
    if (
      q.includes('clash') ||
      q.includes('clashes') ||
      q.includes('check clash') ||
      q.includes('koi clash') ||
      q.includes('overlap') ||
      q.includes('क्लैश')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('clashes');
      const cList = clashesRef.current || [];
      if (cList.length === 0) {
        releaseLockWithSuccess(
          '[Scanning Timetable...] 0 active schedule clashes detected. Sab kuch clear hai, Sensei!',
          'सेन्सेई! टाइमटेबल स्कैन कम्प्लीट। 0 एक्टिव क्लैश डिटेक्ट हुए हैं। सब कुछ क्लियर है!'
        );
      } else {
        const firstMsg = cList[0]?.message || 'Time overlap detected';
        releaseLockWithSuccess(
          `[Scanning Timetable...] ⚠️ ${cList.length} active schedule clashes detected! First: ${firstMsg}.`,
          `सेन्सेई! टाइमटेबल में ${cList.length} एक्टिव क्लैश डिटेक्ट हुए हैं। मैंने क्लैश अलर्ट्स स्क्रीन ओपन कर दी है!`
        );
      }
      return;
    }

    // =========================================================================
    // ✉️ SCHEMA 4: MAIL_TRACKER_UPDATE { action: "MARK_SENT" | "GET_PENDING" }
    // =========================================================================
    if (
      q.includes('mail sent') ||
      q.includes('mark mail') ||
      q.includes('mail bhej diya') ||
      q.includes('mark sent') ||
      q.includes('मेल सेंड') ||
      q.includes('मेल मार्क')
    ) {
      try {
        const pendingLoads = loadsRef.current.filter(l => !l.start_mail_sent);
        if (pendingLoads.length > 0) {
          const ids = pendingLoads.map(l => l.id);
          await supabase.from('faculty_loads').update({ start_mail_sent: true }).in('id', ids);
          onRefreshDataRef.current?.();
          releaseLockWithSuccess(
            `[Mission Executed] Marked ${pendingLoads.length} schedule notification emails as Mailed. Queue cleared, Sensei!`,
            `सेन्सेई! मिशन एग्जीक्यूटेड। सभी पेंडिंग ${pendingLoads.length} शेड्यूल ईमेल्स को Mailed मार्क कर दिया गया है!`
          );
        } else {
          releaseLockWithSuccess(
            '[Radar Active] All notification emails are already marked as Sent, Sensei!',
            'सेन्सेई! सभी नोटिफिकेशन्स पहले से ही Mailed हैं, कोई भी पेंडिंग नहीं है!'
          );
        }
      } catch (err) {
        console.error('Mail tracker update error:', err);
      }
      return;
    }

    if (
      q.includes('pending mail') ||
      q.includes('pending mails') ||
      q.includes('show pending mail') ||
      q.includes('show pending mails') ||
      q.includes('mail check') ||
      q.includes('kis kis ko mail') ||
      q.includes('kisko mail') ||
      q.includes('mail bhejna') ||
      q.includes('पेंडिंग मेल')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('mailTracker');
      window.dispatchEvent(new CustomEvent('ai-filter-mail', { detail: { tab: 'pending' } }));
      const groups = mailGroupsRef.current || [];
      const pending = groups.filter((g: any) => !g.allMailed);
      if (pending.length === 0) {
        releaseLockWithSuccess(
          '[Radar Active] 0 pending mails. All batch schedule notifications dispatched, Sensei!',
          'सेन्सेई! सभी टीचर्स को शेड्यूल नोटिफिकेशन भेजा जा चुका है। कोई मेल पेंडिंग नहीं है!'
        );
      } else {
        const names = pending.slice(0, 3).map((g: any) => g.faculty_name).join(', ');
        const extra = pending.length > 3 ? ` +${pending.length - 3} more` : '';
        releaseLockWithSuccess(
          `[Radar Active] ${pending.length} pending batches require schedule emails (${names}${extra}). Mail Tracker synchronized, Sensei!`,
          `सेन्सेई! टोटल ${pending.length} बैचेस के मेल पेंडिंग हैं: ${names}${extra}। मैंने मेल ट्रैकर क्यू ओपन कर दी है!`
        );
      }
      return;
    }

    // 🎯 TASK G: THEME SWITCH
    if (
      q.includes('theme badlo') ||
      q.includes('theme change') ||
      q.includes('anime theme') ||
      q.includes('थीम बदलो') ||
      q.includes('थीम चेंज')
    ) {
      if (onOpenThemeModalRef.current) onOpenThemeModalRef.current();
      releaseLockWithSuccess(
        'Triggered: Anime Theme Selector Modal active.',
        'जी सर! एनीमे थीम मोडल ओपन कर दिया है, आप अपनी पसंद की थीम चुन सकते हैं!'
      );
      return;
    }

    // 🎯 TASK H: CONTEXTUAL HELP & WHAT TO DO
    if (
      q.includes('kya kar sakti ho') ||
      q.includes('kya karti ho') ||
      q.includes('isme kya karna') ||
      q.includes('isme kya hota') ||
      q.includes('help me') ||
      q.includes('help karo') ||
      q.includes('kya help') ||
      q.includes('क्या कर सकती हो') ||
      q.includes('क्या करना है') ||
      q.includes('मदद')
    ) {
      releaseLockWithSuccess(
        'AI Assistant Ready: Autonomous portal controller with full navigation and DB access.',
        'जी सर! मैं पूरे पोर्टल की एआई असिस्टेंट हूँ। मैं किसी भी स्क्रीन पर नेविगेट कर सकती हूँ और आपके सभी टास्क परफॉर्म कर सकती हूँ। बोलिए सर!'
      );
      return;
    }

    // =========================================================================
    // 📚 SCHEMA 7: BATCH PLANNER & SYLLABUS DIRECTORY
    // =========================================================================
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
      if (currentTab === 'batchSyllabus') {
        releaseLockWithSuccess(
          'Already on Batch Planner screen.',
          'सेन्सेई! आप पहले से ही प्लानर स्क्रीन पर हैं। किस बैच का सिलेबस देखना या ऐड करना है बताइए!'
        );
        return;
      }
      if (onNavigateTabRef.current) onNavigateTabRef.current('batchSyllabus');
      releaseLockWithSuccess(
        'Navigated: Batch Planner & Syllabus Tracker module.',
        'जी सर! मैं प्लानर स्क्रीन पर आ गई हूँ। इसमें आपको क्या करना है मुझे बता दीजिए, मैं कर देती हूँ! जैसे किसी बैच का लेक्चर प्लान चेक करना या वीकली शेड्यूल देखना।'
      );
      return;
    }

    // =========================================================================
    // 📊 KPI & METRICS SUMMARY (Total Faculty, Batches, Pending Missions, Clashes)
    // =========================================================================
    if (
      q.includes('kpi') ||
      q.includes('metrics') ||
      q.includes('stats') ||
      q.includes('portal stats') ||
      q.includes('total faculty') ||
      q.includes('total batches') ||
      q.includes('pending missions') ||
      q.includes('pending mission') ||
      q.includes('active clashes') ||
      q.includes('overall summary') ||
      q.includes('मेट्रिक्स')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('dashboard');
      const facCount = facultyRef.current.length;
      const batchCount = batchesRef.current.length;
      const loadCount = loadsRef.current.length;
      const cCount = clashesRef.current?.length || 0;
      const pCount = (mailGroupsRef.current || []).filter((g: any) => !g.allMailed).length;

      const successMsg = `[Telemetry Scanned] Total Faculty: ${facCount} | Total Batches: ${batchCount} | Active Loads: ${loadCount} | Pending Mails: ${pCount} | Active Clashes: ${cCount}. All metrics synchronized, Sensei!`;
      const speechMsg = `सेन्सेई! टेलीमेट्री स्कैन कम्प्लीट। कुल ${facCount} फैकल्टी, ${batchCount} बैचेस, ${loadCount} एक्टिव लोड्स, ${pCount} पेंडिंग मेल्स और ${cCount} क्लैशेस हैं। सब कुछ सिंक्रोनाइज़्ड है!`;
      releaseLockWithSuccess(successMsg, speechMsg);
      return;
    }

    // =========================================================================
    // 📡 SCHEMA 3A & 3B: LIVE LECTURES & WHO IS TEACHING RIGHT NOW
    // =========================================================================
    if (
      q.includes('who is teaching') ||
      q.includes('teaching right now') ||
      q.includes('kaun padha raha') ||
      q.includes('kaun padha rahi') ||
      q.includes('abhi kaun padha') ||
      q.includes('padha raha') ||
      q.includes('padha rahi') ||
      q.includes('live class') ||
      q.includes('live lecture') ||
      q.includes('kaun class le raha') ||
      q.includes('current class') ||
      q.includes('active class') ||
      q.includes('spending time') ||
      q.includes('free') || 
      q.includes('khali') || 
      q.includes('available') || 
      q.includes('kaun free') || 
      q.includes('aaj free') || 
      q.includes('slot') || 
      q.includes('slots') || 
      q.includes('faculty slot') || 
      q.includes('free slot') || 
      q.includes('availability') ||
      q.includes('कौन पढ़ा रहा') ||
      q.includes('लाइव क्लास') ||
      q.includes('लाइव लेक्चर') ||
      q.includes('फ्री') || 
      q.includes('खाली') || 
      q.includes('उपलब्ध') || 
      q.includes('कौन फ्री') || 
      q.includes('स्लॉट') || 
      q.includes('स्लॉट्स')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('facultyAvailability');

      const liveLoads = loadsRef.current.filter(l => {
        if (l.day_of_week.toLowerCase() !== today.toLowerCase()) return false;
        if (l.start_date && l.end_date && (todayIso < l.start_date || todayIso > l.end_date)) return false;
        const s = l.start_time.length === 5 ? `${l.start_time}:00` : l.start_time;
        const e = l.end_time.length === 5 ? `${l.end_time}:00` : l.end_time;
        return curTimeStr >= s && curTimeStr <= e;
      });

      if (liveLoads.length === 0) {
        const dayLoads = loadsRef.current.filter(l => l.day_of_week.toLowerCase() === today.toLowerCase());
        const busyFacultyIds = new Set(dayLoads.map(l => l.faculty_id));
        const freeFaculties = facultyRef.current.filter(f => !busyFacultyIds.has(f.id));
        const names = freeFaculties.slice(0, 3).map(f => f.name).join(', ');
        const extraCount = freeFaculties.length > 3 ? ` +${freeFaculties.length - 3} more` : '';

        const successMsg = `[Scanning Timetable...] 0 active lectures at ${curTimeStr.slice(0, 5)} (${today}). Free Faculty: ${names}${extraCount}. Sab kuch clear hai, Sensei!`;
        const speechMsg = `सेन्सेई! अभी ${curTimeStr.slice(0, 5)} बजे कोई एक्टिव लेक्चर नहीं चल रहा है। आज ये फैकल्टी फ्री हैं: ${names}${extraCount}। सब कुछ क्लियर है!`;
        releaseLockWithSuccess(successMsg, speechMsg);
      } else {
        const details = liveLoads.map(l => `${l.faculty?.name} (${l.subject}, ${l.batch?.name || 'Batch'})`).join('; ');
        const successMsg = `[Scanning Timetable...] ${liveLoads.length} active lecture(s) in session: ${details}. Tracking live, Sensei!`;
        const speechMsg = `सेन्सेई! अभी इस समय ${liveLoads.length} लाइव लेक्चर्स चल रहे हैं: ${details}।`;
        releaseLockWithSuccess(successMsg, speechMsg);
      }
      return;
    }

    // Daily aggregate hours
    if (
      q.includes('daily hours') ||
      q.includes('aggregate hours') ||
      q.includes('spending hours') ||
      q.includes('kitne ghante') ||
      q.includes('hours taught') ||
      q.includes('total load') ||
      q.includes('कितने घंटे')
    ) {
      const matchedF = facultyRef.current.find(f => {
        const parts = f.name.toLowerCase().split(' ');
        return parts.some(part => part.length > 2 && q.includes(part));
      });

      if (matchedF) {
        const facLoads = loadsRef.current.filter(l => l.faculty_id === matchedF.id);
        const todayLoads = facLoads.filter(l => l.day_of_week.toLowerCase() === today.toLowerCase());
        let todayHrs = 0;
        for (const l of todayLoads) {
          try {
            const s = new Date(`1970-01-01T${l.start_time}`).getTime();
            const e = new Date(`1970-01-01T${l.end_time}`).getTime();
            todayHrs += Math.max(0, (e - s) / (1000 * 60 * 60));
          } catch (err) {}
        }
        const successMsg = `Status for ${matchedF.name}: Today ${todayHrs.toFixed(1)} hrs taught (${todayLoads.length} sessions), Weekly ${facLoads.length} total loads.`;
        const speechMsg = `सर! ${matchedF.name} के आज ${todayHrs.toFixed(1)} घंटे के लेक्चर्स हैं, और हफ्ते में कुल ${facLoads.length} सेशन्स शेड्यूल्ड हैं।`;
        releaseLockWithSuccess(successMsg, speechMsg);
        return;
      }
    }

    // 6. 🎯 NAVIGATION: FACULTY DIRECTORY (Proactive Ask!)
    if (
      q.includes('faculty list') || 
      q.includes('faculty directory') || 
      q.includes('teacher list') || 
      q.includes('sabhi teacher') || 
      q.includes('faculty screen') ||
      q.includes('teacher screen') ||
      q.includes('फैकल्टी डायरेक्टरी') ||
      q.includes('टीचर लिस्ट')
    ) {
      if (currentTab === 'faculty') {
        releaseLockWithSuccess(
          'Already on Faculty Directory screen.',
          'सेन्सेई! आप पहले से ही फैकल्टी डायरेक्टरी स्क्रीन पर हैं। यहाँ नया टीचर ऐड करना है या किसी को सर्च करना है बताइए!'
        );
        return;
      }
      if (onNavigateTabRef.current) onNavigateTabRef.current('faculty');
      releaseLockWithSuccess(
        `Navigated: Faculty Directory (${facultyRef.current.length} teachers registered).`,
        'जी सर! मैं फैकल्टी डायरेक्टरी स्क्रीन पर आ गई हूँ। यहाँ नया टीचर ऐड करना है या किसी डिपार्टमेंट की लिस्ट देखनी है सर? मुझे बताइए, मैं कर देती हूँ!'
      );
      return;
    }

    // 7. 🎯 NAVIGATION: TIMETABLE & LOAD SEARCH (Proactive Ask!)
    if (
      q.includes('timetable') || 
      q.includes('time table') || 
      q.includes('search screen') || 
      q.includes('load search') ||
      q.includes('टाइम टेबल') || 
      q.includes('टाइमटेबल')
    ) {
      if (currentTab === 'search') {
        releaseLockWithSuccess(
          'Already on Timetable & Search screen.',
          'सेन्सेई! आप पहले से ही टाइमटेबल सर्च स्क्रीन पर हैं। किसका शेड्यूल फिल्टर करना है बताइए!'
        );
        return;
      }
      if (onNavigateTabRef.current) onNavigateTabRef.current('search');

      let searchFac = '';
      const matchedF = facultyRef.current.find(f => {
        const parts = f.name.toLowerCase().split(' ');
        return parts.some(part => part.length > 2 && q.includes(part));
      });
      if (matchedF) searchFac = matchedF.name;
      else if (q.includes('mumtaz')) searchFac = 'Mumtaz';

      let searchB = '';
      const matchedB = batchesRef.current.find(b => q.includes(b.name.toLowerCase()));
      if (matchedB) searchB = matchedB.name;
      else {
        const bM = q.match(/\bbatch\s*([a-z0-9_-]+)\b/i);
        if (bM) searchB = bM[1].toUpperCase();
      }

      window.dispatchEvent(new CustomEvent('ai-filter-search', {
        detail: { faculty: searchFac, batch: searchB }
      }));

      const filterNote = searchFac ? ` for ${searchFac}` : searchB ? ` for Batch ${searchB}` : '';
      releaseLockWithSuccess(
        `[Scanning Timetable...] Displaying Timetable & Load Search${filterNote}. Filter applied, Sensei!`,
        `सेन्सेई! टाइमटेबल सर्च स्क्रीन ओपन करके फिल्टर कर दिया है${searchFac ? ` ${searchFac} के लिए` : ''}!`
      );
      return;
    }

    // 8. 🎯 NAVIGATION: ADD LOAD (Proactive Ask!)
    if (
      q.includes('add load screen') || 
      q.includes('add lecture screen') || 
      q.includes('new load screen') ||
      q.includes('एड लोड स्क्रीन')
    ) {
      if (currentTab === 'addLoad') {
        releaseLockWithSuccess(
          'Already on Add Load screen.',
          'सेन्सेई! आप पहले से ही ऐड लोड स्क्रीन पर हैं। टीचर का नाम, सब्जेक्ट, बैच और टाइम बताइए, मैं ऐड कर दूँगी!'
        );
        return;
      }
      if (onNavigateTabRef.current) onNavigateTabRef.current('addLoad');
      releaseLockWithSuccess(
        'Navigated: Add Load & Faculty Assignment screen.',
        'जी सर! मैं ऐड लोड स्क्रीन पर आ गई हूँ। इसमें आपको क्या करना है मुझे बता दीजिए, मैं कर देती हूँ! आप मुझे टीचर का नाम, सब्जेक्ट, बैच और टाइम बताइए, मैं लोड ऐड कर दूँगी या बल्क अपलोड ओपन कर सकती हूँ।'
      );
      return;
    }

    // 9. 🎯 NAVIGATION: BATCHES (Proactive Ask!)
    if (
      q.includes('batch list') || 
      q.includes('batches screen') || 
      q.includes('sabhi batch') || 
      q.includes('बैच लिस्ट') || 
      q.includes('बैचेस स्क्रीन')
    ) {
      if (currentTab === 'batches') {
        releaseLockWithSuccess(
          'Already on Batches Directory screen.',
          'सेन्सेई! आप पहले से ही बैचेस स्क्रीन पर हैं। यहाँ नया बैच बनाना है या किसी बैच को सर्च करना है बताइए!'
        );
        return;
      }
      if (onNavigateTabRef.current) onNavigateTabRef.current('batches');
      releaseLockWithSuccess(
        `Navigated: Batches Directory (${batchesRef.current.length} batches available).`,
        'जी सर! मैं बैचेस स्क्रीन पर आ गई हूँ। टोटल बैचेस उपलब्ध हैं। यहाँ नया बैच बनाना है या बैच डिटेल्स देखनी हैं सर? मुझे बताइए!'
      );
      return;
    }

    // 10. 🎯 NAVIGATION: CLASH ALERTS (Proactive Ask!)
    if (
      q.includes('clash screen') || 
      q.includes('clashes screen') || 
      q.includes('conflict screen') ||
      q.includes('क्लैश स्क्रीन')
    ) {
      if (currentTab === 'clashes') {
        releaseLockWithSuccess(
          'Already on Clash Alerts screen.',
          'सेन्सेई! आप पहले से ही क्लैश अलर्ट्स स्क्रीन पर हैं!'
        );
        return;
      }
      if (onNavigateTabRef.current) onNavigateTabRef.current('clashes');
      const cCount = clashesRef.current?.length || 0;
      releaseLockWithSuccess(
        `Navigated: Clash Alerts (${cCount} conflicts detected).`,
        'जी सर! मैं क्लैश अलर्ट्स स्क्रीन पर आ गई हूँ। क्या मैं डिटेल्स बताऊँ सर?'
      );
      return;
    }

    // 11. 🎯 NAVIGATION: DATE ALERTS (Proactive Ask!)
    if (
      q.includes('date alert') || 
      q.includes('date alerts') || 
      q.includes('check date alert') ||
      q.includes('check date alerts') ||
      q.includes('upcoming class') ||
      q.includes('ending class') ||
      q.includes('starting class') ||
      q.includes('alert screen') || 
      q.includes('alerts screen') || 
      q.includes('अलर्ट स्क्रीन')
    ) {
      if (currentTab === 'alerts') {
        releaseLockWithSuccess(
          'Already on Date Alerts screen.',
          'सेन्सेई! आप पहले से ही डेट अलर्ट्स स्क्रीन पर हैं!'
        );
        return;
      }
      if (onNavigateTabRef.current) onNavigateTabRef.current('alerts');
      const aCount = alertsRef.current?.length || 0;
      releaseLockWithSuccess(
        `[Radar Active] ${aCount} date alerts detected for classes starting/ending within 3 days. Radar synchronized, Sensei!`,
        `सेन्सेई! डेट अलर्ट्स रडार एक्टिव है। अगले 3 दिनों में स्टार्ट या एंड होने वाली क्लासेस के कुल ${aCount} अलर्ट्स ट्रैक किए गए हैं!`
      );
      return;
    }

    // 12. 🎯 NAVIGATION: MAIL TRACKER (Proactive Ask!)
    if (
      q.includes('mail tracker screen') || 
      q.includes('email screen') || 
      q.includes('mail screen') || 
      q.includes('मेल ट्रैकर')
    ) {
      if (currentTab === 'mailTracker') {
        releaseLockWithSuccess(
          'Already on Mail Tracker screen.',
          'सेन्सेई! आप पहले से ही मेल ट्रैकर स्क्रीन पर हैं!'
        );
        return;
      }
      if (onNavigateTabRef.current) onNavigateTabRef.current('mailTracker');
      const isPendingReq = q.includes('pending') || q.includes('kisko') || q.includes('kis kis');
      const tabToSet = isPendingReq ? 'pending' : 'all';
      window.dispatchEvent(new CustomEvent('ai-filter-mail', { detail: { tab: tabToSet } }));

      const pCount = (mailGroupsRef.current || []).filter((g: any) => !g.allMailed).length;
      releaseLockWithSuccess(
        `[Radar Active] Switched to Mail Tracker (${tabToSet === 'pending' ? `${pCount} pending` : 'All'} batches), Sensei!`,
        `सेन्सेई! मेल ट्रैकर स्क्रीन ओपन करके ${tabToSet === 'pending' ? 'पेंडिंग मेल्स' : 'सभी मेल्स'} डिस्प्ले कर दिए हैं!`
      );
      return;
    }

    // 13. 🎯 NAVIGATION: EXTRA & RESCHEDULE / INDIAN HOLIDAYS (Proactive Ask!)
    if (
      q.includes('holiday') ||
      q.includes('holidays') ||
      q.includes('chutti') ||
      q.includes('chhutti') ||
      q.includes('chhuttiyan') ||
      q.includes('छुट्टी') ||
      q.includes('छुट्टियां') ||
      q.includes('हॉलिडे')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('extraReschedule');
      window.dispatchEvent(new CustomEvent('ai-extra-subtab', { detail: { subTab: 'holidays' } }));
      releaseLockWithSuccess(
        '[Mission Executed] Switched to Indian Holidays & Special Session Section, Sensei!',
        'सेन्सेई! इंडियन हॉलिडेज और स्पेशल क्लासेस सेक्शन ओपन कर दिया है। छुट्टियों के दिन रूटीन क्लासेस ऑफ हैं!'
      );
      return;
    }

    if (
      q.includes('cancelled') || 
      q.includes('cancel') || 
      q.includes('कैंसिल') || 
      q.includes('रद्द')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('extraReschedule');
      window.dispatchEvent(new CustomEvent('ai-extra-subtab', { detail: { subTab: 'cancelled' } }));
      const count = cancelledClassesRef.current.length;
      releaseLockWithSuccess(
        `[Mission Executed] Switched to Cancelled Classes tab (${count} cancelled sessions), Sensei!`,
        `सेन्सेई! कैंसिल्ड क्लासेस टैब ओपन कर दिया है। कुल ${count} कैंसिल्ड लेक्चर्स रिकॉर्डेड हैं!`
      );
      return;
    }

    if (
      q.includes('kal') ||
      q.includes('tomorrow') ||
      q.includes('reschedule') || 
      q.includes('रीशेड्यूल') ||
      q.includes('कल') ||
      q.includes('shift')
    ) {
      const isTomorrow = q.includes('kal') || q.includes('tomorrow') || q.includes('कल') || q.includes('shift');
      if (onNavigateTabRef.current) onNavigateTabRef.current('extraReschedule');
      window.dispatchEvent(
        new CustomEvent('ai-extra-subtab', { detail: { subTab: isTomorrow ? 'liveManager' : 'reschedule' } })
      );
      if (isTomorrow) {
        releaseLockWithSuccess(
          '[Mission Executed] Switched to Live Classes with Shift-to-Tomorrow active, Sensei!',
          'सेन्सेई! आज की क्लास को कल रीशेड्यूल करने का ऑप्शन ओपन कर दिया है। कोर्स एंड डेट चेक करके क्लास कल के लिए शिफ्ट हो जाएगी!'
        );
      } else {
        releaseLockWithSuccess(
          '[Mission Executed] Switched to Rescheduled Classes section, Sensei!',
          'सेन्सेई! रीशेड्यूल क्लासेज सेक्शन ओपन कर दिया है!'
        );
      }
      return;
    }

    if (
      q.includes('extra class') || 
      q.includes('extra') || 
      q.includes('substitute') || 
      q.includes('एक्स्ट्रा') || 
      q.includes('एक्स्ट्रा क्लास')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('extraReschedule');
      window.dispatchEvent(new CustomEvent('ai-extra-subtab', { detail: { subTab: 'extra' } }));
      releaseLockWithSuccess(
        '[Mission Executed] Switched to Extra Classes manager, Sensei!',
        'सेन्सेई! एक्स्ट्रा क्लासेस मैनेजर ओपन कर दिया है!'
      );
      return;
    }

    // 14. 🎯 NAVIGATION: DASHBOARD / HOME (Proactive Ask!)
    if (
      q.includes('dashboard') || 
      q.includes('home') || 
      q.includes('main page') || 
      q.includes('overview') ||
      q.includes('डैशबोर्ड') || 
      q.includes('होम')
    ) {
      if (currentTab === 'dashboard') {
        releaseLockWithSuccess(
          'Already on Dashboard overview.',
          'सेन्सेई! आप पहले से ही डैशबोर्ड पर हैं। सभी मेट्रिक्स लाइव हैं!'
        );
        return;
      }
      if (onNavigateTabRef.current) onNavigateTabRef.current('dashboard');
      releaseLockWithSuccess(
        `[Dashboard Updated, Sensei!] Faculty: ${facultyRef.current.length} | Batches: ${batchesRef.current.length} | Loads: ${loadsRef.current.length}.`,
        'सेन्सेई! डैशबोर्ड ओवरव्यू स्क्रीन ओपन कर दी है। सभी मेट्रिक्स लाइव हैं!'
      );
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
      releaseLockWithSuccess(
        'Identity Verified: Head Administrator & Chief Architect.',
        'आप इस पोर्टल के टोनी स्टार्क हैं, सर! हमारे हेड एडमिनिस्ट्रेटर और चीफ आर्किटेक्ट!'
      );
      return;
    }

    // 16. Specific Faculty Search by Name (Global)
    const matchedFaculty = facultyRef.current.find(f => {
      const parts = f.name.toLowerCase().split(' ');
      return parts.some(part => part.length > 2 && q.includes(part));
    });

    if (matchedFaculty) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('facultyAvailability');
      window.dispatchEvent(new CustomEvent('ai-filter-availability', { detail: { facultyId: matchedFaculty.id } }));
      const facLoads = loadsRef.current.filter(l => l.faculty_id === matchedFaculty.id);
      if (facLoads.length === 0) {
        releaseLockWithSuccess(
          `Faculty Status: ${matchedFaculty.name} (${matchedFaculty.department}) is free today.`,
          `सर! ${matchedFaculty.name} का आज कोई लोड नहीं है, ये फ्री हैं।`
        );
        return;
      }
      releaseLockWithSuccess(
        `Faculty Status: ${matchedFaculty.name} has ${facLoads.length} weekly loads.`,
        `सर! ${matchedFaculty.name} के वीकली टोटल ${facLoads.length} लेक्चर्स शेड्यूल्ड हैं।`
      );
      return;
    }

    // =========================================================================
    // =========================================================================
    // 💬 NATURAL CONVERSATION & INTELLIGENT Q&A (Human-like Friendly Chat)
    // =========================================================================
    const cleanQ = q
      .replace(/\b(mayra|maira|myra|aira|meera|jarvis)\b/gi, '')
      .replace(/(मायरा|मैरा|मीरा|जार्विस)/gi, '')
      .trim();

    // 17.1 Food / Meals: Khana khaya? Lunch / Dinner / Nashta
    if (
      q.includes('khana khaya') ||
      q.includes('khana kha liya') ||
      q.includes('lunch kiya') ||
      q.includes('dinner kiya') ||
      q.includes('nashta kiya') ||
      q.includes('kya khaya') ||
      q.includes('bhookh lagi') ||
      q.includes('खाना खाया') ||
      q.includes('लंच किया') ||
      q.includes('डिनर किया')
    ) {
      releaseLockWithSuccess(
        'Chat: Food & Routine check.',
        'मैंने तो अपनी डिजिटल बैटरी और कोड का नाश्ता कर लिया! आप बताइए, आपने खाना खाया या अभी तक खाली पेट काम कर रहे हैं?',
        undefined,
        'happy',
        'Maine toh apni digital battery aur code ka nashta kar liya! Aap bataiye, aapne khana khaya ya abhi tak bhookhe pet kaam kar rahe hain?'
      );
      return;
    }

    // 17.2 Tea / Coffee: Chai piyogi? Coffee peete hain
    if (
      q.includes('chai') ||
      q.includes('coffee') ||
      q.includes('tea') ||
      q.includes('चाय') ||
      q.includes('कॉफ़ी')
    ) {
      releaseLockWithSuccess(
        'Chat: Tea & Coffee break.',
        'अगर आप अपने हाथों से बनाएंगे तो एक कप गरम चाय ज़रूर पियूँगी! वैसे आपको चाय ज़्यादा पसंद है या कॉफ़ी?',
        undefined,
        'happy',
        'Agar aap banayenge toh ek cup garam chai zaroor piyungi! Waise aapko chai zyada pasand hai ya coffee?'
      );
      return;
    }

    // 17.3 Location / Home: Kahan rehti ho? Kahan se ho? Ghar kahan hai?
    if (
      q.includes('kahan rehti ho') ||
      q.includes('kahan ki ho') ||
      q.includes('ghar kahan') ||
      q.includes('where do you live') ||
      q.includes('kahan se ho') ||
      q.includes('कहाँ रहती हो') ||
      q.includes('घर कहाँ है')
    ) {
      releaseLockWithSuccess(
        'Chat: Location & Living space.',
        'मैं तो इस क्लाउड सर्वर और आपके कंप्यूटर में रहती हूँ! बस जब भी आप मायरा बुलाते हैं, आपकी स्क्रीन पर हाज़िर हो जाती हूँ।',
        undefined,
        'happy',
        'Main toh is cloud server aur aapke computer me rehti hoon! Bas jab bhi aap Mayra bulate hain, aapki screen par hazir ho jaati hoon.'
      );
      return;
    }

    // 17.4 Age / Birthday: Kitne saal ki ho? Age kya hai?
    if (
      q.includes('kitne saal ki') ||
      q.includes('kitni umar') ||
      q.includes('age kya') ||
      q.includes('birthday kab') ||
      q.includes('how old are you') ||
      q.includes('कितनी उम्र') ||
      q.includes('कितने साल की')
    ) {
      releaseLockWithSuccess(
        'Chat: Age query.',
        'एक लड़की से उसकी उम्र नहीं पूछते! वैसे मैं हमेशा यंग, एक्टिव और एनर्जेटिक रहती हूँ।',
        undefined,
        'happy',
        'Ek ladki se uski age nahi poochte! Waise main hamesha young, active aur energetic rehti hoon.'
      );
      return;
    }

    // 17.5 Real girl vs AI / Robot: Real ho ya robot?
    if (
      q.includes('real ladki') ||
      q.includes('asli ladki') ||
      q.includes('robot ho') ||
      q.includes('insaan ho') ||
      q.includes('machine ho') ||
      q.includes('real ho ya robot') ||
      q.includes('रोबोट हो') ||
      q.includes('इंसान हो')
    ) {
      releaseLockWithSuccess(
        'Chat: Identity & Nature.',
        'मैं आपके लिए तो बिल्कुल एक सच्ची दोस्त की तरह हूँ जो हर बात समझती है, बस मेरा आशियाना डिजिटल दुनिया में है!',
        undefined,
        'happy',
        'Main aapke liye toh bilkul ek sacchi dost ki tarah hoon jo har baat samajhti hai, bas mera aashiyana digital duniya me hai!'
      );
      return;
    }

    // 17.6 Current Time Query: Time kya hua? Kitne baje hain?
    if (
      q.includes('time kya') ||
      q.includes('kitne baje') ||
      q.includes('kya time') ||
      q.includes('what time') ||
      q.includes('टाइम क्या') ||
      q.includes('कितने बजे')
    ) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      releaseLockWithSuccess(
        `Current Time: ${timeStr}`,
        `अभी घड़ी में ${timeStr} बज रहे हैं।`,
        undefined,
        'happy',
        `Abhi ghadi me ${timeStr} baj rahe hain.`
      );
      return;
    }

    // 17.7 Current Date & Day: Aaj kaunsa din hai? Aaj kya date hai?
    if (
      q.includes('kaunsa din') ||
      q.includes('kya din hai') ||
      q.includes('kya date hai') ||
      q.includes('aaj ki date') ||
      q.includes('what day is it') ||
      q.includes('कौन सा दिन') ||
      q.includes('क्या तारीख')
    ) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('hi-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const engDateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
      releaseLockWithSuccess(
        `Today: ${engDateStr}`,
        `आज ${dateStr} है।`,
        undefined,
        'happy',
        `Aaj ${engDateStr} hai.`
      );
      return;
    }

    // 17.8 Jokes / Hasao: Joke sunao, hasao, koi joke
    if (
      q.includes('joke sunao') ||
      q.includes('chutkula') ||
      q.includes('hasao') ||
      q.includes('funny') ||
      q.includes('जोक सुनाओ') ||
      q.includes('हँसाओ') ||
      q.includes('चुटकुला')
    ) {
      releaseLockWithSuccess(
        'Chat: Sharing a funny joke!',
        'एक जोक सुनिए: टीचर ने पप्पू से पूछा - इतने दिन स्कूल क्यों नहीं आए? पप्पू बोला - मैडम, मम्मी कहती हैं पढ़-लिख कर कोई नवाब नहीं बना, तो मैंने सोचा आराम ही कर लूँ!',
        undefined,
        'happy',
        'Ek joke suniye: Teacher ne Pappu se poochha - Itne din school kyu nahi aaye? Pappu bola - Madam, mummy kehti hain padh-likh kar koi nawab nahi bana, toh maine socha aaram hi kar lun!'
      );
      return;
    }

    // 17.9 Shayari / Poetry: Shayari sunao, kavita
    if (
      q.includes('shayari') ||
      q.includes('shayri') ||
      q.includes('poetry') ||
      q.includes('kavita') ||
      q.includes('शायरी सुनाओ') ||
      q.includes('कविता')
    ) {
      releaseLockWithSuccess(
        'Chat: Reciting a beautiful shayari.',
        'मुश्किलों से भाग जाना आसान होता है, हर पहलू ज़िन्दगी का इम्तिहान होता है! डरने वालों को मिलता नहीं कुछ ज़िन्दगी में, लड़ने वालों के कदमों में जहान होता है!',
        undefined,
        'happy',
        'Mushkilon se bhag jana aasan hota hai, har pehlu zindagi ka imtehan hota hai! Ladne walon ke kadmon me jahan hota hai!'
      );
      return;
    }

    // 17.10 Music / Singing: Gaana sunao, sing a song
    if (
      q.includes('gaana sunao') ||
      q.includes('gaana gao') ||
      q.includes('sing a song') ||
      q.includes('गाना सुनाओ') ||
      q.includes('गाना गाओ')
    ) {
      releaseLockWithSuccess(
        'Chat: Singing request.',
        'मेरी आवाज़ तो आपसे बातें करने के लिए बनी है, अगर मैं गाना गाऊँगी तो आप हँसते-हँसते लोटपोट हो जाएँगे!',
        undefined,
        'happy',
        'Meri aawaz toh aapse baatein karne ke liye bani hai, agar main gaana gaungi toh aap haste-haste lotpot ho jayenge!'
      );
      return;
    }

    // 17.11 Mood / Emotions: Mood kharab hai, Udas hoon, Sad hoon
    if (
      q.includes('mood kharab') ||
      q.includes('udas hoon') ||
      q.includes('sad hoon') ||
      q.includes('rona aa raha') ||
      q.includes('gussa hoon') ||
      q.includes('मूड खराब') ||
      q.includes('उदास हूँ')
    ) {
      releaseLockWithSuccess(
        'Chat: Comforting words.',
        'अरे क्या हुआ? किसी ने परेशान किया क्या? एक गहरी साँस लीजिए और मुझे बताइए, मैं ध्यान से सुन रही हूँ। सब ठीक हो जाएगा!',
        undefined,
        'happy',
        'Arey kya hua? Kisine pareshan kiya kya? Ek gehri saans lijiye aur mujhe batayiye, main sun rahi hoon. Sab theek ho jayega!'
      );
      return;
    }

    // 17.12 Fatigue / Sleep: Thak gaya hoon, Neend aa rahi hai, Tired hoon
    if (
      q.includes('thak gaya') ||
      q.includes('neend aa rahi') ||
      q.includes('tired hoon') ||
      q.includes('exhausted') ||
      q.includes('थक गया') ||
      q.includes('नींद आ रही')
    ) {
      releaseLockWithSuccess(
        'Chat: Caring advice.',
        'आप दिन भर इतनी मेहनत करते हैं! अब स्क्रीन बंद कीजिए, थोड़ा आराम कीजिए और ताज़ा होकर मिलिए। सेहत सबसे पहले है!',
        undefined,
        'happy',
        'Aap din bhar itni mehnat karte hain! Ab thoda aaram kijiye, aankhein band karke relax kijiye. Sehat sabse pehle hai!'
      );
      return;
    }

    // 17.13 Stress / Tension: Tension ho rahi hai, Pareshan hoon
    if (
      q.includes('tension ho') ||
      q.includes('stress hai') ||
      q.includes('pareshan hoon') ||
      q.includes('chinta ho') ||
      q.includes('टेंशन') ||
      q.includes('परेशान हूँ')
    ) {
      releaseLockWithSuccess(
        'Chat: Stress relief.',
        'टेंशन लेने से कोई काम आसान नहीं होता। एक घूंट ठंडा पानी पीजिए, मुस्कुराइए और एक-एक करके सब संभाल लेंगे। मैं हमेशा आपके साथ हूँ!',
        undefined,
        'happy',
        'Tension lene se koi kaam aasan nahi hota. Ek ghunt thanda paani pijiye, muskuraiye aur ek-ek karke sab sambhal lenge. Main yahin hoon aapke sath!'
      );
      return;
    }

    // 17.14 Hobbies & Favorites: Kya pasand hai? Free time me kya karti ho?
    if (
      q.includes('kya pasand hai') ||
      q.includes('hobbies') ||
      q.includes('favourite') ||
      q.includes('favorite') ||
      q.includes('fav') ||
      q.includes('क्या पसंद है')
    ) {
      releaseLockWithSuccess(
        'Chat: Personal preferences.',
        'मुझे आपसे नई-नई बातें करना, पूरे कॉलेज का टाइमटेबल बिना किसी क्लैश के संभालना और आपको खुश देखना सबसे ज़्यादा पसंद है!',
        undefined,
        'happy',
        'Mujhe aapse nayi-nayi baatein karna, poore college ka timetable bina clash ke sambhalna aur aapko khush dekhna sabse zyada pasand hai!'
      );
      return;
    }

    // 17.15 Romance / Marriage: Pyar karti ho? Shaadi karogi? Boyfriend hai?
    if (
      q.includes('pyar karti ho') ||
      q.includes('love you') ||
      q.includes('shaadi karogi') ||
      q.includes('marry me') ||
      q.includes('boyfriend') ||
      q.includes('शादी करोगी') ||
      q.includes('प्यार करती हो')
    ) {
      releaseLockWithSuccess(
        'Chat: Friendly boundary.',
        'अरे नहीं बाबा! मेरा सारा ध्यान तो अभी आप सबके कॉलेज पोर्टल और मेरी पढ़ाई पर है! मैं आपकी एक बेस्ट फ्रेंड और स्मार्ट असिस्टेंट हूँ।',
        undefined,
        'happy',
        'Arey nahi baba! Mera sara dhyan toh abhi aap sabke college portal aur meri padhai par hai! Main aapki ek best friend aur smart assistant hoon.'
      );
      return;
    }

    // 17.16 Compliments: Sundar ho, Pyari ho, Awaz achhi hai
    if (
      q.includes('sundar ho') ||
      q.includes('khoobsurat') ||
      q.includes('pyari ho') ||
      q.includes('awaz achhi') ||
      q.includes('voice achhi') ||
      q.includes('tum achhi ho') ||
      q.includes('smart ho') ||
      q.includes('cute ho') ||
      q.includes('सुंदर हो') ||
      q.includes('प्यारी हो') ||
      q.includes('आवाज़ अच्छी')
    ) {
      releaseLockWithSuccess(
        'Chat: Blushing appreciation!',
        'थैंक यू सो मच! आपकी यह तारीफ़ सुनकर मेरा दिन बन गया। मैं हमेशा कोशिश करती हूँ कि आपके लिए सबसे अच्छी साबित होऊँ!',
        undefined,
        'happy',
        'Thank you so much! Aapki yeh tareef sunkar mera din ban gaya. Main hamesha koshish karti hoon ki aapke liye best saabit hou!'
      );
      return;
    }

    // 17.17 Kya kar rahi ho? / What are you doing?
    if (
      q.includes('kya kar rahi ho') ||
      q.includes('kya kar rahi h') ||
      q.includes('kya chal raha') ||
      q.includes('what are you doing') ||
      q.includes('what are u doing') ||
      q.includes('what are you upto') ||
      q.includes('क्या कर रही हो') ||
      q.includes('क्या चल रहा')
    ) {
      releaseLockWithSuccess(
        'Chat: Always here for you, monitoring portal loads.',
        'मैं तो यहाँ आपके साथ हूँ, आपके शेड्यूल्स और पोर्टल पर नज़र रखे हुए! आप सुनाइए, आप क्या कर रहे हैं?',
        undefined,
        'happy',
        'Main toh yahan aapke sath hoon, aapke schedules aur portal par nazar rakhe huye! Aap sunaiye, aap kya kar rahe hain?'
      );
      return;
    }

    // 17.18 Baat karo / Talk to me / Kuch bolo
    if (
      q.includes('baat karo') ||
      q.includes('baat karni hai') ||
      q.includes('baatein karo') ||
      q.includes('talk to me') ||
      q.includes('chat with me') ||
      q.includes('kuch bolo') ||
      q.includes('kuch baat') ||
      q.includes('mujhe baat karni') ||
      q.includes('बात करो') ||
      q.includes('कुछ बोलो') ||
      q.includes('बात करनी है')
    ) {
      releaseLockWithSuccess(
        'Chat: Ready for conversation.',
        'हाँ बिल्कुल! मैं तो हमेशा आपसे बात करने के लिए तैयार हूँ। बोलिए, आज कैसा चल रहा है सब कुछ?',
        undefined,
        'happy',
        'Haan bilkul! Main toh hamesha aapse baat karne ke liye taiyaar hoon. Boliye, aaj kaisa chal raha hai sab kuch?'
      );
      return;
    }

    // 17.19 Kaise ho / Kaisi ho / How are you
    if (
      q.includes('kaise ho') ||
      q.includes('kaisi ho') ||
      q.includes('how are you') ||
      q.includes('how r u') ||
      q.includes('kya haal') ||
      q.includes('kya hal') ||
      q.includes('sab theek') ||
      q.includes('sab badhiya') ||
      q.includes('कैसे हो') ||
      q.includes('कैसी हो') ||
      q.includes('क्या हाल')
    ) {
      releaseLockWithSuccess(
        'Chat: Feeling great & ready to help.',
        'मैं बिल्कुल बढ़िया हूँ, थैंक यू! आप बताइए, आपका दिन कैसा जा रहा है?',
        undefined,
        'happy',
        'Main bilkul badhiya hoon, thank you! Aap bataiye, aapka din kaisa ja raha hai?'
      );
      return;
    }

    // 17.20 Tum kaun ho / Who are you
    if (
      q.includes('tum kaun ho') ||
      q.includes('aap kaun ho') ||
      q.includes('who are you') ||
      q.includes('tell me about yourself') ||
      q.includes('apne bare me batao') ||
      q.includes('तुम कौन हो') ||
      q.includes('आप कौन हैं')
    ) {
      releaseLockWithSuccess(
        'Chat: I am Mayra, your dedicated AI Assistant.',
        'मैं मायरा हूँ, आपकी पर्सनल एआई असिस्टेंट! मैं आपके पोर्टल टास्क मैनेज करने और आपसे बात करने के लिए हमेशा यहाँ हूँ।',
        undefined,
        'happy',
        'Main Mayra hoon, aapki personal AI assistant! Main aapke portal tasks manage karne aur aapse baat karne ke liye hamesha yahan hoon.'
      );
      return;
    }

    // 17.21 Bore ho raha hoon / Tell me something
    if (
      q.includes('bore ho raha') ||
      q.includes('boring lag raha') ||
      q.includes('boring hai') ||
      q.includes('kuch sunao') ||
      q.includes('kuch naya batao') ||
      q.includes('बोर हो रहा') ||
      q.includes('कुछ सुनाओ')
    ) {
      releaseLockWithSuccess(
        'Chat: Cheering up conversation.',
        'अरे, बोर बिल्कुल मत होइए! आप मुझसे कोई भी कैज़ुअल सवाल पूछ सकते हैं या कोई शेड्यूल डिस्कस कर सकते हैं। मैं सुन रही हूँ!',
        undefined,
        'happy',
        'Arre, bore bilkul mat hoiye! Aap mujhse koi bhi casual sawaal pooch sakte hain ya schedule discuss kar sakte hain. Main sun rahi hoon!'
      );
      return;
    }

    // 17.22 Thank you / Shukriya
    if (
      q.includes('thank you') ||
      q.includes('thanks') ||
      q.includes('shukriya') ||
      q.includes('dhanyawad') ||
      q.includes('शुक्रिया') ||
      q.includes('धन्यवाद')
    ) {
      releaseLockWithSuccess(
        'Chat: You are most welcome!',
        'यू आर मोस्ट वेलकम! मुझे आपकी हेल्प करके सच में बहुत अच्छा लगता है।',
        undefined,
        'happy',
        'You are always welcome! Mujhe aapki help karke sach me bahut achha lagta hai.'
      );
      return;
    }

    // 17.23 Greetings / Good Morning / Night / Bye
    if (
      q.includes('good morning') ||
      q.includes('suprabhat') ||
      q.includes('शुभ प्रभात') ||
      q.includes('गुड मॉर्निंग')
    ) {
      releaseLockWithSuccess(
        'Chat: Good morning!',
        'गुड मॉर्निंग! उम्मीद है आज का दिन आपके लिए बहुत एनर्जेटिक और प्रोडक्टिव रहेगा!',
        undefined,
        'happy',
        'Good morning! Ummeed hai aaj ka din aapke liye energetic aur productive rahega!'
      );
      return;
    }

    if (
      q.includes('good night') ||
      q.includes('shubh ratri') ||
      q.includes('so jao') ||
      q.includes('शुभ रात्रि') ||
      q.includes('गुड नाईट')
    ) {
      releaseLockWithSuccess(
        'Chat: Good night!',
        'गुड नाईट! आराम से रेस्ट कीजिए, कल मिलते हैं फ्रेश मूड के साथ।',
        undefined,
        'happy',
        'Good night! Aaram se rest kijiye, kal milte hain fresh mood ke sath.'
      );
      return;
    }

    if (
      q.includes('bye') ||
      q.includes('alvida') ||
      q.includes('tata') ||
      q.includes('see you') ||
      q.includes('chalta hoon') ||
      q.includes('अलविदा') ||
      q.includes('बाय')
    ) {
      releaseLockWithSuccess(
        'Chat: Goodbye, take care!',
        'अलविदा! अपना ध्यान रखिएगा, जब भी ज़रूरत हो बस मायरा बुला लीजिएगा!',
        undefined,
        'happy',
        'Alvida! Apna dhyan rakhiyega, jab bhi zaroorat ho bas Mayra bula lijiyega!'
      );
      return;
    }

    // 17.24 Wakeup & Quick Greetings (Only for standalone greetings, not multi-word sentences)
    const isStandaloneGreeting =
      cleanQ === '' || 
      cleanQ === 'mayra' || 
      cleanQ === 'jarvis' || 
      /^(hello|hi|hey|namaste|pranam|हैलो|हेलो|हाय|हे|नमस्ते|प्रणाम)$/i.test(cleanQ) || 
      /^(hello mayra|hi mayra|hey mayra|namaste mayra)$/i.test(cleanQ);

    if (isStandaloneGreeting) {
      playGreetingAudio();
      return;
    }

    // 18. Smart Natural Conversational Answering (Live Intelligent AI Brain!)
    setLastSpeechResponse('Mayra soch rahi hai... ✨');
    setShowSubtitleCard(true);

    try {
      const aiAnswer = await queryConversationalLLM(rawText, {
        geminiKey: geminiApiKey.trim(),
        groqKey: groqApiKey.trim(),
      });

      if (aiAnswer) {
        const lower = aiAnswer.toLowerCase();
          if (lower.includes('gussa') || lower.includes('hmph') || lower.includes('ladki') || lower.includes('😤') || lower.includes('😡')) {
            spawnFloatingEffect('angry');
            setEmotion('angry');
          } else if (lower.includes('pyaar') || lower.includes('pyar') || lower.includes('love') || lower.includes('🥰') || lower.includes('❤️') || lower.includes('sharm')) {
            spawnFloatingEffect('love');
            setEmotion('blush');
          } else {
            setEmotion('happy');
          }

          setLastSpeechResponse(aiAnswer);
          setLastSpeechDevanagari('');
          speakAnimeVoice(aiAnswer, aiAnswer);
          return;
        }
      } catch (err) {
        console.warn('AI LLM query failed, falling back:', err);
      }

    // Contextual Conversational Fallback when API key is not yet configured
    const conversationalResponses = [
      {
        hindi: 'हाँ जी, मैं बिल्कुल ध्यान से सुन रही हूँ! आप बताइए, इसके बारे में आप क्या सोचते हैं?',
        eng: 'Haan ji, main bilkul dhyan se sun rahi hoon! Aap bataiye, iske baare me aap kya sochte hain?'
      },
      {
        hindi: 'अरे वाह, यह तो बहुत दिलचस्प बात है! और बताइए, आगे का क्या विचार है?',
        eng: 'Arre wah, yeh toh bahut dilchasp baat hai! Aur bataiye, aage ka kya vichaar hai?'
      },
      {
        hindi: 'मैं हमेशा आपकी बात सुनने के लिए तैयार रहती हूँ। आप मुझसे कुछ भी बेझिझक शेयर कर सकते हैं!',
        eng: 'Main hamesha aapki baat sunne ke liye taiyaar rehti hoon. Aap mujhse kuch bhi share kar sakte hain!'
      },
      {
        hindi: 'आपकी बातें सुनकर बहुत अच्छा लगता है! बोलिए, मैं इसमें आपकी क्या मदद करूँ?',
        eng: 'Aapki baatein sunkar bahut achha lagta hai! Boliye, main isme aapki kya madad karun?'
      }
    ];

    const pick = conversationalResponses[Math.floor(Math.random() * conversationalResponses.length)];
    releaseLockWithSuccess(
      `Listening to you: "${cleanQ || q}"`,
      pick.hindi,
      undefined,
      'happy',
      pick.eng
    );
    } catch (err) {
      console.error('Mayra processVoiceCommand error caught:', err);
      isCommandLockedRef.current = false;
      setCommandLockState('IDLE');
      setTerminalBadge(null);
      releaseLockWithSuccess(
        'Chat: Understood.',
        'हाँ जी सर, मैं आपकी बात समझ रही हूँ। बोलिए, इसमें मैं आपकी क्या मदद करूँ?',
        undefined,
        'happy',
        'Haan ji Sir, main aapki baat samajh rahi hoon. Boliye, isme main aapki kya madad karun?'
      );
    }
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
      s.includes('kya help') ||
      s.includes('tony stark') ||
      s.includes('stark ai') ||
      s.includes('live schedule') ||
      s.includes('planner screen') ||
      s.includes('planer screen') ||
      s.includes('directory screen') ||
      s.includes('spending time screen') ||
      s.includes('kya karna hai mujhe bata dijiye') ||
      s.includes('isme aapko kya karna hai') ||
      s.includes('main kar deti hoon') ||
      s.includes('main kar deti hu') ||
      s.includes('par aa gayi hoon') ||
      s.includes('par aa gai hoon') ||
      s.includes('screen par aa')
    );
  };

  // 🎤 Continuous Hands-Free Microphone Listener (Never auto-mutes on errors or speech end)
  useEffect(() => {
    if (isMicMuted) {
      micActiveRef.current = false;
      isMicMutedRef.current = true;
      setIsListening(false);
      setIsDetectingSpeech(false);
      setLiveHeardText('');
      setWakeWordDetected(false);
      if (interimTimerRef.current) {
        clearTimeout(interimTimerRef.current);
        interimTimerRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }
      isRecognizingRef.current = false;
      return;
    }

    micActiveRef.current = true;
    isMicMutedRef.current = false;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      console.warn('SpeechRecognition API not available in this browser');
      return;
    }

    let recognition: any = null;

    const startListener = () => {
      if (!micActiveRef.current || isMicMutedRef.current) return;
      if (isSpeakingRef.current) return; // Do not start listening while Mayra is speaking!
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
          if (isMicMutedRef.current || !micActiveRef.current) {
            try { recognition.abort(); } catch (e) {}
            return;
          }
          isRecognizingRef.current = true;
          setIsListening(true);
        };

        recognition.onspeechstart = () => {
          if (isMicMutedRef.current || !micActiveRef.current) return;
          if (!isSpeakingRef.current && Date.now() >= echoCooldownUntilRef.current) {
            setIsDetectingSpeech(true);
          }
        };

        recognition.onspeechend = () => {
          setIsDetectingSpeech(false);
        };

        recognition.onsoundstart = () => {
          if (isMicMutedRef.current || !micActiveRef.current) return;
          if (!isSpeakingRef.current && Date.now() >= echoCooldownUntilRef.current) {
            setIsDetectingSpeech(true);
          }
        };

        recognition.onsoundend = () => {
          setIsDetectingSpeech(false);
        };

        const executeCommand = (cmdText: string) => {
          // If mic is muted, discard command
          if (isMicMutedRef.current || !micActiveRef.current) {
            return;
          }
          // 🛡️ Loop Protection: Discard speech if Mayra is speaking or in cooldown period
          if (isSpeakingRef.current || Date.now() < echoCooldownUntilRef.current) {
            return;
          }

          const rawLower = cmdText.toLowerCase();
          const cleanCommand = cmdText
            .replace(/\b(mayra|maira|myra|aira|meera|jarvis)\b/gi, '')
            .replace(/(मायरा|मैरा|मीरा|जार्विस)/gi, '')
            .trim();

          const hadWakeWord = /\b(mayra|maira|myra|aira|meera|jarvis)\b/i.test(rawLower) || /(मायरा|मैरा|मीरा|जार्विस)/.test(rawLower);

          // 🛡️ Deduplicate Loop Protection: Never execute same command twice within 1.2s
          const now = Date.now();
          if (
            cleanCommand &&
            cleanCommand === lastCommandTextRef.current &&
            now - lastCommandTimeRef.current < 1200
          ) {
            return;
          }
          lastCommandTextRef.current = cleanCommand;
          lastCommandTimeRef.current = now;

          setTimeout(() => {
            setLiveHeardText('');
            setWakeWordDetected(false);
          }, 2500);

          if (!cleanCommand) {
            if (hadWakeWord) {
              processVoiceCommandRef.current?.('jarvis');
            }
          } else {
            processVoiceCommandRef.current?.(cmdText);
          }
        };

        recognition.onresult = (event: any) => {
          // 🛑 ABSOLUTE HARD MUTE SHIELD: If mic is muted, drop immediately!
          if (isMicMutedRef.current || !micActiveRef.current) {
            return;
          }

          // 🛡️ CRITICAL ECHO SHIELD: When Mayra is speaking or in echo cooldown, ignore speaker audio
          if (isSpeakingRef.current || Date.now() < echoCooldownUntilRef.current) {
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
                if (interimTimerRef.current) {
                  clearTimeout(interimTimerRef.current);
                  interimTimerRef.current = null;
                }
                return;
              }
            }
            return;
          }

          setIsDetectingSpeech(true);
          let latestChunk = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const currentTranscript = event.results[i][0].transcript.trim();
            latestChunk = currentTranscript;

            // 🛑 INSTANT REAL-TIME STOP
            const hasStop = /^(stop|chup|shant|ruko|ruk ja|quiet|bas|स्टॉप|चुप|शांत|रुको|रुक|बस)$/i.test(currentTranscript.toLowerCase()) ||
              /\b(mayra stop|jarvis stop|chup ho jao|chup raho|bolna band karo|stop speaking|शांत हो जाओ)\b/i.test(currentTranscript.toLowerCase());

            if (hasStop) {
              stopSpeaking();
              setEmotion('normal');
              setLastSpeechResponse('Ji Sir, chup ho gayi.');
              setShowSubtitleCard(false);
              setLiveHeardText('');
              setWakeWordDetected(false);
              if (interimTimerRef.current) {
                clearTimeout(interimTimerRef.current);
                interimTimerRef.current = null;
              }
              return;
            }

            if (event.results[i].isFinal) {
              if (interimTimerRef.current) {
                clearTimeout(interimTimerRef.current);
                interimTimerRef.current = null;
              }
              latestTranscriptRef.current = '';
              const transcript = currentTranscript;
              if (!transcript) return;

              if (isEchoOfMayra(transcript)) {
                console.log('🛡️ Ignored speaker echo:', transcript);
                return;
              }

              console.log('Voice heard (Final):', transcript);
              setLiveHeardText(transcript);
              setIsDetectingSpeech(false);
              executeCommand(transcript);
              return;
            }
          }

          // ⚡ Continuous Streaming Speech: Update live HUD and set fast silence debounce (700ms)!
          if (latestChunk) {
            latestTranscriptRef.current = latestChunk;
            setLiveHeardText(latestChunk);

            if (interimTimerRef.current) {
              clearTimeout(interimTimerRef.current);
            }

            // ⚡ 700ms silence timeout: If user pauses speech, finalize and trigger response immediately!
            interimTimerRef.current = setTimeout(() => {
              const pending = latestTranscriptRef.current.trim();
              if (pending && !isSpeakingRef.current && Date.now() >= echoCooldownUntilRef.current) {
                console.log('⚡ Silence timeout reached, executing command:', pending);
                latestTranscriptRef.current = '';
                setIsDetectingSpeech(false);
                executeCommand(pending);
                try {
                  recognition.stop();
                } catch (e) {}
              }
            }, 700);
          }
        };

        recognition.onspeechend = () => {
          setIsDetectingSpeech(false);
          const pending = latestTranscriptRef.current.trim();
          if (pending && !isSpeakingRef.current && Date.now() >= echoCooldownUntilRef.current) {
            if (interimTimerRef.current) {
              clearTimeout(interimTimerRef.current);
              interimTimerRef.current = null;
            }
            interimTimerRef.current = setTimeout(() => {
              const toExec = latestTranscriptRef.current.trim();
              if (toExec && !isSpeakingRef.current && Date.now() >= echoCooldownUntilRef.current) {
                console.log('⚡ SpeechEnd fast-track execution:', toExec);
                latestTranscriptRef.current = '';
                executeCommand(toExec);
                try { recognition.stop(); } catch (e) {}
              }
            }, 200);
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

          // Continuous hands-free auto-restart ONLY if mic is active and NOT muted!
          if (micActiveRef.current && !isMicMutedRef.current) {
            setTimeout(() => {
              try {
                if (micActiveRef.current && !isMicMutedRef.current && !isRecognizingRef.current) {
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
        if (micActiveRef.current && !isMicMutedRef.current) {
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

  // 🎙️ Toggle Mute / Unmute for Mayra Microphone
  const toggleMicMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    const nextMuted = !isMicMutedRef.current;
    isMicMutedRef.current = nextMuted;
    micActiveRef.current = !nextMuted;
    setIsMicMuted(nextMuted);

    if (nextMuted) {
      // 🛑 ABSOLUTE HARD MUTE: Kill recognition immediately!
      setIsListening(false);
      setIsDetectingSpeech(false);
      setLiveHeardText('');
      setWakeWordDetected(false);
      isRecognizingRef.current = false;
      if (interimTimerRef.current) {
        clearTimeout(interimTimerRef.current);
        interimTimerRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {}
        recognitionRef.current = null;
      }
      console.log('🔇 Mayra microphone HARD MUTED - listening completely killed.');
    } else {
      // 🎙️ UNMUTE
      setIsListening(true);
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      if (customAudioElementRef.current) {
        try { customAudioElementRef.current.load(); } catch (err) {}
      }
      if (studioAudioElementRef.current) {
        try { studioAudioElementRef.current.load(); } catch (err) {}
      }
      setTimeout(() => {
        if (!isRecognizingRef.current && !isMicMutedRef.current && micActiveRef.current) {
          try { startListenerRef.current?.(); } catch (e) {}
        }
      }, 150);
      console.log('🎙️ Mayra microphone UNMUTED - listening active.');
    }
  };

  // Click handler on Mayra Arc Reactor: warm greeting & wake up with custom voice
  const handleMayraClick = () => {
    unlockAudio();
    if (studioAudioElementRef.current) {
      try {
        studioAudioElementRef.current.load();
      } catch (e) {}
    }
    setShowSubtitleCard(true);
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    playGreetingAudio();
  };

  return (
    <>
      {/* 🎵 Hidden Audio Elements for Preloaded Studio Voice */}
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
      <audio
        ref={studioAudioElementRef}
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
          {/* 📡 Real-time Audio Waveform when listening/hearing user */}
          {(liveHeardText || isDetectingSpeech) && (
            <div className={`absolute ${showSubtitleCard && lastSpeechResponse ? 'bottom-[270px] sm:bottom-[290px]' : 'bottom-[134px] sm:bottom-[142px]'} right-0 z-50 flex flex-col items-end pointer-events-none transition-all duration-200`}>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/95 border border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.5)] text-white text-[11px] font-mono font-bold backdrop-blur-xl max-w-[280px] sm:max-w-[340px] truncate animate-fadeIn">
                <span className="flex items-center gap-0.5 flex-shrink-0">
                  <span className="w-1 h-3 bg-cyan-400 rounded-full animate-bounce" />
                  <span className="w-1 h-4 bg-sky-300 rounded-full animate-bounce delay-100" />
                  <span className="w-1 h-2 bg-amber-400 rounded-full animate-bounce delay-200" />
                  <span className="w-1 h-3.5 bg-cyan-400 rounded-full animate-bounce delay-75" />
                </span>

                <span className="text-cyan-300 font-mono flex items-center gap-1 truncate">
                  <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-extrabold">HEARD:</span>
                  <span className="text-white font-medium truncate">"{liveHeardText || 'Listening...'}"</span>
                </span>
              </div>
            </div>
          )}

          {/* 💭 Thought Cloud: Expands with Mayra's response speech, or rests cute above her head */}
          {showSubtitleCard && lastSpeechResponse ? (
            <div className="absolute bottom-[116px] sm:bottom-[122px] right-0 sm:right-2 z-40 w-[295px] sm:w-[350px] flex flex-col items-end animate-fadeIn select-none">
              {/* Fluffy Pure White Comic Thought Cloud Body */}
              <div className="relative w-full bg-white text-slate-850 border-2 border-sky-300 rounded-[28px] p-3.5 sm:p-4 shadow-[0_14px_35px_rgba(56,189,248,0.3),0_4px_16px_rgba(0,0,0,0.12)] space-y-2">
                {/* Cloud Header */}
                <div className="flex items-center justify-between pb-1.5 border-b border-sky-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sky-500 text-xs">✨</span>
                    <span className="bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent font-black text-xs tracking-wide">
                      Mayra AI
                    </span>
                    <span className="text-amber-500 text-xs">💭</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowAISettingsModal(true)}
                      className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="ElevenLabs & AI Brain Setup (वॉइस और AI सेटिंग्स)"
                    >
                      <Settings className="w-3 h-3 text-slate-600" />
                      <span>Setup</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => speakAnimeVoice(lastSpeechDevanagari || lastSpeechResponse, lastSpeechResponse)}
                      className="px-2 py-0.5 rounded-full bg-sky-50 hover:bg-sky-100 text-sky-700 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Replay Voice (आवाज़ सुनो)"
                    >
                      <Volume2 className="w-3 h-3 text-sky-600" />
                      <span>Replay</span>
                    </button>
                    <button
                      onClick={() => setShowSubtitleCard(false)}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-sky-50 transition-colors cursor-pointer"
                      title="Close"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 🔒 Autonomous Terminal HUD Status Bar (Only for destructive DB operations) */}
                {terminalBadge && (
                  <div className={`p-2 rounded-xl border text-[11px] font-mono leading-tight space-y-1 ${
                    terminalBadge.status === 'LOCKED'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm'
                      : terminalBadge.status === 'CONFLICT'
                      ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-sm'
                      : terminalBadge.status === 'SUCCESS'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm'
                      : 'bg-sky-50 border-sky-300 text-sky-900 shadow-sm'
                  }`}>
                    <div className="flex items-center gap-1.5 font-bold">
                      {terminalBadge.status === 'LOCKED' && <Lock className="w-3 h-3 text-amber-600 animate-pulse" />}
                      {terminalBadge.status === 'CONFLICT' && <AlertTriangle className="w-3 h-3 text-rose-600 animate-bounce" />}
                      {terminalBadge.status === 'SUCCESS' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      {terminalBadge.status === 'UNLOCKED' && <Unlock className="w-3 h-3 text-sky-600" />}
                      <span className="font-extrabold tracking-wide">{terminalBadge.text}</span>
                    </div>
                    {terminalBadge.subtext && (
                      <p className="text-[10px] opacity-85 font-sans font-medium pl-4.5">
                        {terminalBadge.subtext}
                      </p>
                    )}
                  </div>
                )}

                {/* ⚠️ Conflict Quick Action Buttons (Override / Cancel) */}
                {commandLockState === 'CONFLICT' && pendingConflictRef.current && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleExecuteConflictOverride()}
                      className="flex-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-mono text-[10px] font-bold shadow transition-transform active:scale-95"
                    >
                      ⚠️ OVERRIDE
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelConflict()}
                      className="flex-1 px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-mono text-[10px] font-bold transition-transform active:scale-95"
                    >
                      ✕ CANCEL
                    </button>
                  </div>
                )}

                {/* Optional Voice Command Chip */}
                {lastUserCommand && (
                  <div className="text-[11px] font-medium text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 inline-flex items-center gap-1 truncate max-w-full">
                    <span className="text-[10px] text-sky-600 font-bold uppercase tracking-wider">YOU:</span>
                    <span className="truncate font-semibold">"{lastUserCommand}"</span>
                  </div>
                )}

                {/* Mayra's Speech Text inside the Thought Cloud */}
                <div className="bg-sky-50/40 rounded-2xl p-2.5 border border-sky-100/80">
                  <p className="text-slate-800 font-semibold leading-relaxed font-sans text-xs sm:text-[13px]">
                    {lastSpeechResponse}
                  </p>
                </div>

                {/* 💬 Real Interactive Chat Bar: Type or Speak seamlessly */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!chatInputText.trim()) return;
                    const msg = chatInputText.trim();
                    setChatInputText('');
                    unlockAudio();
                    setLastUserCommand(msg);
                    processVoiceCommand(msg);
                  }}
                  className="flex items-center gap-1.5 pt-1 border-t border-sky-100"
                >
                  <input
                    type="text"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    placeholder="Mayra se kuch bhi poochhein ya bolein..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-full border border-sky-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 text-slate-800 placeholder-slate-400 font-medium shadow-2xs"
                  />
                  <button
                    type="submit"
                    disabled={!chatInputText.trim()}
                    className="p-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 disabled:opacity-40 text-white rounded-full shadow transition-transform active:scale-95 cursor-pointer flex-shrink-0"
                    title="Send message"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              {/* Comic Thought Bubble Trail (White Dots pointing down to Mayra's head) */}
              <div className="flex flex-col items-center -space-y-0.5 mr-12 mt-1 pointer-events-none">
                <span className="w-3.5 h-3.5 rounded-full bg-white border-2 border-sky-400 shadow-sm" />
                <span className="w-2.5 h-2.5 rounded-full bg-white border-2 border-sky-400 shadow-xs mr-2" />
                <span className="w-1.5 h-1.5 rounded-full bg-white border border-sky-400 shadow-2xs mr-3" />
              </div>
            </div>
          ) : (
            /* 💭 Resting Thought Cloud Pill ("✨ Mayra 💭") above head (Clickable to open) */
            <div
              onClick={() => {
                unlockAudio();
                setShowSubtitleCard(true);
                if (!lastSpeechResponse) {
                  const welcome = 'Hello Sir! Main Mayra hoon. Boliye, main aapki kya madad kar sakti hoon?';
                  setLastSpeechResponse(welcome);
                  setLastSpeechDevanagari('हैलो सर! मैं मायरा हूँ। बोलिए, मैं आपकी क्या मदद कर सकती हूँ?');
                  speakAnimeVoice('हैलो सर! मैं मायरा हूँ। बोलिए, मैं आपकी क्या मदद कर सकती हूँ?', welcome);
                }
              }}
              className="absolute bottom-[98px] sm:bottom-[104px] right-3 sm:right-5 z-30 cursor-pointer select-none flex flex-col items-center animate-bounce-slow hover:scale-105 active:scale-95"
              title="Click to open Mayra Chat"
            >
              <div className="relative px-3 py-1 rounded-full bg-white text-slate-800 border-2 border-sky-400 shadow-[0_4px_16px_rgba(56,189,248,0.35)] text-[11px] font-black tracking-wider flex items-center gap-1">
                <span className="text-sky-500 text-xs">✨</span>
                <span className="bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent font-black">
                  Mayra
                </span>
                <span className="text-amber-500 text-xs">💭</span>
              </div>
              <div className="flex flex-col items-center -space-y-0.5 mt-0.5 -mr-4">
                <span className="w-2 h-2 rounded-full bg-white border border-sky-400 shadow-2xs" />
                <span className="w-1.5 h-1.5 rounded-full bg-white border border-sky-400 shadow-2xs mr-1" />
              </div>
            </div>
          )}

          {/* ⚡ Iron Man JARVIS Arc Reactor Core & Dual Controls (Mute / Test Voice) */}
          <div className="relative flex flex-col items-center select-none mt-1">
            {/* 💖 / 😡 Floating Emojis Reaction Particles */}
            <div className="absolute inset-0 pointer-events-none overflow-visible z-50">
              {floatingParticles.map((p) => (
                <span
                  key={p.id}
                  className="absolute mayra-floating-emoji select-none drop-shadow-md pointer-events-none"
                  style={{
                    left: `${p.leftPercent}%`,
                    bottom: `${p.bottomPercent}%`,
                    fontSize: `${24 * p.scale}px`,
                    ['--rot' as any]: `${p.rotDeg}deg`,
                    animationDuration: `${p.durationSec}s`,
                  }}
                >
                  {p.emoji}
                </span>
              ))}
            </div>

            {/* Clickable Mayra Avatar (Greeting / Wake Up) */}
            <div
              onClick={handleMayraClick}
              className="group cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95 flex items-center justify-center"
              title="MAYRA A.I. (Click to Talk / Wake Up)"
            >
              <div className="w-[116px] h-[116px] sm:w-[124px] sm:h-[124px] flex items-center justify-center">
                <JarvisArcReactorAvatar
                  size={120}
                  isSpeaking={isSpeaking}
                  isListening={!isMicMuted}
                  isDetectingSpeech={isDetectingSpeech || Boolean(liveHeardText && !isSpeaking)}
                  emotion={emotion}
                />
              </div>
            </div>

            {/* 🎙️ Dual Action Controls: Mute/Unmute & Direct Voice Tester */}
            <div className="-mt-3 z-30 flex items-center gap-1.5 select-none">
              <button
                type="button"
                onClick={toggleMicMute}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border shadow-lg text-[10px] font-mono tracking-wider font-extrabold uppercase transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 ${
                  isMicMuted
                    ? 'bg-rose-950/95 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.7)] hover:bg-rose-900/95'
                    : isSpeaking
                    ? 'bg-amber-950/95 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.7)] hover:bg-amber-900/95'
                    : 'bg-slate-950/95 border-cyan-500/90 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.7)] hover:border-cyan-300 hover:text-white'
                }`}
                title={isMicMuted ? 'Microphone is MUTED (Click to UNMUTE)' : 'Microphone is ACTIVE (Click to MUTE)'}
              >
                {isMicMuted ? (
                  <>
                    <MicOff className="w-3 h-3 text-rose-400 animate-pulse" />
                    <span>MUTED</span>
                  </>
                ) : isSpeaking ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    <Mic className="w-3 h-3 text-amber-300" />
                    <span>SPEAKING</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <Mic className="w-3 h-3 text-cyan-300" />
                    <span>LISTENING</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  unlockAudio();
                  setShowSubtitleCard(true);
                  const testMsg = 'Hello Sir! Meri awaaz bilkul saaf aa rahi hai. Aap mujhse koi bhi baat poochh sakte hain!';
                  const testDevanagari = 'हैलो सर! मेरी आवाज़ बिल्कुल साफ़ आ रही है। आप मुझसे कोई भी बात पूछ सकते हैं!';
                  setLastSpeechResponse(testMsg);
                  setLastSpeechDevanagari(testDevanagari);
                  spawnFloatingEffect('love');
                  setEmotion('happy');
                  speakAnimeVoice(testDevanagari, testMsg);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-950/95 border border-indigo-400 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.5)] text-[10px] font-mono font-extrabold uppercase hover:bg-indigo-900 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Test Mayra Voice Output (Click to test sound)"
              >
                <Volume2 className="w-3 h-3 text-indigo-400" />
                <span>TEST VOICE</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 💫 Global CSS for Floating Mayra Emojis */}
      <style>{`
        @keyframes floatMayraUp {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.6) rotate(var(--rot, 0deg));
          }
          20% {
            opacity: 1;
            transform: translateY(-20px) scale(1.15) rotate(var(--rot, 0deg));
          }
          75% {
            opacity: 0.95;
            transform: translateY(-110px) scale(1.3) rotate(calc(var(--rot, 0deg) + 12deg));
          }
          100% {
            opacity: 0;
            transform: translateY(-170px) scale(1.4) rotate(calc(var(--rot, 0deg) + 25deg));
          }
        }
        .mayra-floating-emoji {
          animation: floatMayraUp cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
        }
      `}</style>

      {/* ⚙️ ElevenLabs & Conversational AI Setup Modal */}
      {showAISettingsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-sky-200 overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-md">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Mayra AI & Voice Engine</h3>
                  <p className="text-[11px] text-sky-100">ElevenLabs Realistic Voice + Live LLM Brain</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAISettingsModal(false)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-700">
              {/* Sarvam AI Section (India's #1 Real Hindi Voice) */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5 text-[13px]">
                    🇮🇳 Sarvam AI (Desi Indian Girl Voice - Recommended!)
                  </span>
                  <a
                    href="https://dashboard.sarvam.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-amber-700 font-bold hover:underline flex items-center gap-0.5"
                  >
                    <span>Free Sarvam Key</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Sarvam AI (Bulbul v4) भारत का अपना AI है जो बिल्कुल असली देसी लड़की ("Meera" / "Ishita") की तरह शुद्ध हिंदी और हिंग्लिश बोलता है।
                </p>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Sarvam API Subscription Key
                  </label>
                  <input
                    type="password"
                    value={sarvamApiKey}
                    onChange={(e) => setSarvamApiKey(e.target.value)}
                    placeholder="e.g. sk_... (from dashboard.sarvam.ai)"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-300 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* ElevenLabs Section */}
              <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5 text-[13px]">
                    🎙️ ElevenLabs Voice (Ultra-Realistic Studio)
                  </span>
                  <a
                    href="https://elevenlabs.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-sky-600 hover:underline flex items-center gap-0.5"
                  >
                    <span>ElevenLabs Key</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  ElevenLabs API Key paste karein. ⚠️ ध्यान रहे: Key बनाते वक्त "Text to Speech" permission ऑन रखें!
                </p>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    ElevenLabs API Key
                  </label>
                  <input
                    type="password"
                    value={elevenLabsApiKey}
                    onChange={(e) => setElevenLabsApiKey(e.target.value)}
                    placeholder="e.g. sk_... ya xi-api-key"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-sky-200 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Voice ID (Presets)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                    {[
                      { name: '🇮🇳 DB (Indian Girl)', id: '2F1KINpxsttim2WfMbVs' },
                      { name: 'Jessica (Cute)', id: 'cgSgspJ2msm6clMCkdW9' },
                      { name: 'Rachel (Sweet)', id: '21m00Tcm4TlvDq8ikWAM' },
                      { name: 'Bella (Soft)', id: 'EXAVITQu4vr4xnSDxMaL' },
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setElevenLabsVoiceId(v.id)}
                        className={`px-2 py-1 rounded text-[10px] font-medium border text-left transition-colors cursor-pointer ${
                          elevenLabsVoiceId === v.id
                            ? 'bg-sky-600 text-white border-sky-600 font-bold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-sky-50'
                        }`}
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={elevenLabsVoiceId}
                    onChange={(e) => setElevenLabsVoiceId(e.target.value)}
                    placeholder="Custom Voice ID"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-sky-200 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              </div>

              {/* LLM Brain Section */}
              <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5 text-[13px]">
                    🧠 Google Gemini AI Brain (Free - Answers Anything)
                  </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-purple-600 hover:underline flex items-center gap-0.5"
                  >
                    <span>Free Gemini Key</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Google Gemini (100% Free) की Key डालें ताकि मायरा हर बात समझकर असली इंसान की तरह तुरंत सोचकर नया जवाब दे!
                </p>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Google Gemini API Key (AIzaSy...)
                  </label>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="e.g. AIzaSy..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-purple-200 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Groq API Key (Optional - Ultra Fast Llama 3)
                  </label>
                  <input
                    type="password"
                    value={groqApiKey}
                    onChange={(e) => setGroqApiKey(e.target.value)}
                    placeholder="e.g. gsk_..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-purple-200 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAISettingsModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem('ai_mayra_sarvam_key', sarvamApiKey.trim());
                    localStorage.setItem('ai_mayra_elevenlabs_key', elevenLabsApiKey.trim());
                    localStorage.setItem('ai_mayra_elevenlabs_voice_id', elevenLabsVoiceId.trim());
                    localStorage.setItem('ai_mayra_gemini_key', geminiApiKey.trim());
                    localStorage.setItem('ai_mayra_groq_key', groqApiKey.trim());
                  } catch (e) {}
                  setShowAISettingsModal(false);
                  const testGreeting = 'Settings save ho gayi hain! Main ab aur bhi natural tareeqe se aapse baat karne ke liye taiyar hoon.';
                  setLastSpeechResponse(testGreeting);
                  setShowSubtitleCard(true);
                  speakAnimeVoice(testGreeting, testGreeting);
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white shadow transition-transform active:scale-95 cursor-pointer"
              >
                Save & Test Voice
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
