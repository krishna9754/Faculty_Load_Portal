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

type MayraEmotion = 'normal' | 'sad' | 'blush' | 'happy' | 'speaking';

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
      {/* 💭 Thought Cloud Bubble ("jaise koi soch raha ho") */}
      <div className="absolute -top-7 -right-2 z-30 pointer-events-none select-none flex flex-col items-center animate-bounce-slow">
        {/* Thought Cloud Body */}
        <div className="relative px-3 py-1 rounded-full bg-white/95 text-slate-800 border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.45)] text-[11px] font-black tracking-wider flex items-center gap-1">
          <span className="text-cyan-500 text-xs">✨</span>
          <span className="bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 bg-clip-text text-transparent font-black">
            Mayra
          </span>
          <span className="text-amber-500 text-xs">💭</span>
        </div>
        {/* Small Thought Dots leading to head like a comic thought bubble */}
        <div className="flex flex-col items-center -space-y-0.5 mt-0.5 -mr-4">
          <span className="w-2 h-2 rounded-full bg-white border border-cyan-400 shadow-2xs" />
          <span className="w-1.5 h-1.5 rounded-full bg-white border border-cyan-400 shadow-2xs mr-1" />
        </div>
      </div>

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

      {/* 3. Transparent Floating Mayra Avatar Core (Dark Background Removed & Larger Size) */}
      <div className="absolute inset-1 flex items-center justify-center pointer-events-none">
        <img
          src={mayraGif}
          alt="Mayra AI"
          className={`w-[95%] h-[95%] object-contain filter drop-shadow-[0_4px_16px_rgba(6,182,212,0.4)] transition-transform duration-300 ${
            isSpeaking ? 'scale-115 brightness-110' : isListening ? 'scale-110' : 'scale-100 opacity-95'
          }`}
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src !== window.location.origin + '/mayra-avatar.gif') {
              target.src = '/mayra-avatar.gif';
            }
          }}
        />
      </div>

      {/* 4. Sleek Stark AI Micro HUD Tag (Only LISTENING... and COMMAND) */}
      <div className="absolute -bottom-2 z-20 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-950/95 border border-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.6)] text-[9px] font-mono tracking-wider font-extrabold text-cyan-300 uppercase pointer-events-none">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isSpeaking
              ? 'bg-amber-400 animate-ping'
              : isListening
              ? 'bg-emerald-400 animate-pulse'
              : 'bg-rose-500'
          }`}
        />
        <span>
          {isSpeaking
            ? 'COMMAND'
            : isListening
            ? 'LISTENING...'
            : 'STANDBY'}
        </span>
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
  const speechSessionIdRef = useRef<number>(0);
  const activeWebAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const activeAudioElementRef = useRef<HTMLAudioElement | null>(null);

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

    // 🛡️ CRITICAL LOOP SHIELD: Pause mic recognition so speaker audio cannot be heard by mic!
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
    isRecognizingRef.current = false;
    setIsListening(false);
    setIsDetectingSpeech(false);
    setLiveHeardText('');

    setIsSpeaking(true);
    isSpeakingRef.current = true;
    echoCooldownUntilRef.current = Date.now() + 10000;

    speechSessionIdRef.current += 1;
    const thisSessionId = speechSessionIdRef.current;

    const { voice, pitch, rate } = getMayraAnimeVoice();
    let currentIdx = 0;

    const speakNextSentence = () => {
      if (isStoppedRef.current || speechSessionIdRef.current !== thisSessionId || currentIdx >= sentences.length) {
        if (speechSessionIdRef.current === thisSessionId) {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          echoCooldownUntilRef.current = Date.now() + 800;
          setTimeout(() => setEmotion('normal'), 1800);
          // Hands-free continuous listening: Ensure mic is re-armed ONLY after speech is done!
          setTimeout(() => {
            if (micActiveRef.current && !isMicMuted && !isSpeakingRef.current) {
              try { startListenerRef.current?.(); } catch (e) {}
            }
          }, 600);
        }
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
        if (isStoppedRef.current || speechSessionIdRef.current !== thisSessionId) {
          return;
        }
        setTimeout(speakNextSentence, 40);
      };

      utterance.onerror = (e: any) => {
        if (isStoppedRef.current || speechSessionIdRef.current !== thisSessionId || e?.error === 'canceled' || e?.error === 'interrupted') {
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
    echoCooldownUntilRef.current = Date.now() + 10000;
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
      echoCooldownUntilRef.current = Date.now() + 800;
      setTimeout(() => setEmotion('normal'), 1800);
      // Hands-free continuous listening: Ensure mic is re-armed after greeting!
      setTimeout(() => {
        if (micActiveRef.current && !isMicMuted && !isSpeakingRef.current) {
          try { startListenerRef.current?.(); } catch (e) {}
        }
      }, 600);
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

  // 🧠 Mayra's Knowledge Engine with Direct Answers & Emotions (Devanagari Hindi & Hinglish support)
  const processVoiceCommand = async (rawText: string) => {
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
      speakAnimeVoice('जी सर, चुप हो गई।');
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

    // 🎯 TASK A: ADD LOAD VIA VOICE (Step-by-step or direct execution)
    if (
      q.includes('load add karo') ||
      q.includes('load add kar do') ||
      q.includes('naya load add') ||
      q.includes('naya load create') ||
      q.includes('lecture add karo') ||
      q.includes('class add karo') ||
      (q.includes('add') && q.includes('load') && !q.includes('addload') && !q.includes('screen') && !q.includes('chalo')) ||
      (q.includes('create') && q.includes('load')) ||
      q.includes('लोड ऐड') ||
      q.includes('नया लोड ऐड')
    ) {
      let matchedFaculty = facultyRef.current.find(f => {
        const lowerName = f.name.toLowerCase();
        const parts = lowerName.split(' ');
        return parts.some(part => part.length > 2 && q.includes(part));
      });

      let matchedBatch = batchesRef.current.find(b => {
        const lowerBatch = b.name.toLowerCase();
        return q.includes(lowerBatch) || (lowerBatch.includes('cse') && q.includes('cse'));
      });

      let matchedDay = 'Monday';
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

      let startTime = '10:00:00';
      let endTime = '11:00:00';
      const timeMatch = q.match(/\b([0-1]?[0-9]|2[0-3])(?::([0-5][0-9]))?\s*(am|pm|baje)?\b/i);
      if (timeMatch) {
        let hr = parseInt(timeMatch[1], 10);
        const isPm = timeMatch[3] && timeMatch[3].toLowerCase() === 'pm';
        if (isPm && hr < 12) hr += 12;
        startTime = `${String(hr).padStart(2, '0')}:00:00`;
        endTime = `${String(hr + 1).padStart(2, '0')}:00:00`;
      }

      let matchedSubject = 'General Lecture';
      const subjectsList = ['java', 'python', 'c++', 'dsa', 'data structures', 'os', 'operating system', 'dbms', 'database', 'networking', 'maths', 'physics', 'ai', 'ml', 'machine learning', 'web tech', 'cloud', 'cyber security', 'compiler'];
      for (const s of subjectsList) {
        if (q.includes(s)) {
          matchedSubject = s.toUpperCase();
          break;
        }
      }

      if (matchedFaculty && matchedBatch) {
        const startDate = new Date().toISOString().split('T')[0];
        const endD = new Date();
        endD.setDate(endD.getDate() + 90);
        const endDate = endD.toISOString().split('T')[0];

        try {
          const { error } = await supabase.from('faculty_loads').insert({
            faculty_id: matchedFaculty.id,
            batch_id: matchedBatch.id,
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
            if (onNavigateTabRef.current) onNavigateTabRef.current('search');
            const resp = `Ji Sir! Maine ${matchedFaculty.name} ke liye ${matchedDay} ko ${startTime.slice(0, 5)} baje ${matchedSubject} subject ka load batch ${matchedBatch.name} mein successfully add kar diya hai!`;
            setLastSpeechResponse(resp);
            speakAnimeVoice(`जी सर! मैंने ${matchedFaculty.name} के लिए ${matchedDay} को ${matchedSubject} का लोड बैच ${matchedBatch.name} में सक्सेसफुली ऐड कर दिया है!`);
            return;
          }
        } catch (err) {
          console.warn('Voice add load error:', err);
        }
      }

      if (onNavigateTabRef.current) onNavigateTabRef.current('addLoad');
      const resp = 'Ji Sir! Load add karne ke liye mujhe teacher ka naam, subject, batch aur time bataiye. Jaise boliye: Krishna sir, Java, CSE A, Monday 10 AM. Main turant entry create kar doongi!';
      setLastSpeechResponse(resp);
      speakAnimeVoice('जी सर! लोड ऐड करने के लिए मुझे टीचर का नाम, सब्जेक्ट, बैच और टाइम बताइए। जैसे बोलिए: कृष्णा सर, जावा, सीएसई ए, मंडे १० बजे। मैं तुरंत एंट्री क्रिएट कर दूँगी!');
      return;
    }

    // 🎯 TASK B: ADD FACULTY VIA VOICE
    if (
      q.includes('teacher add karo') ||
      q.includes('faculty add karo') ||
      q.includes('naya teacher') ||
      q.includes('naya faculty') ||
      q.includes('add faculty') ||
      q.includes('add teacher') ||
      q.includes('टीचर ऐड करो') ||
      q.includes('फैकल्टी ऐड करो')
    ) {
      const cleanName = q
        .replace(/\b(teacher add karo|faculty add karo|naya teacher add karo|naya faculty add karo|add faculty|add teacher|naya teacher|naya faculty|karo|kar do|please|mayra|jarvis)\b/gi, '')
        .replace(/(टीचर ऐड करो|फैकल्टी ऐड करो|नया टीचर|नया फैकल्टी)/gi, '')
        .trim();

      if (cleanName.length >= 3) {
        const capitalized = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
        try {
          const { error } = await supabase.from('faculty').insert({
            name: capitalized,
            department: 'Computer Science',
          });
          if (!error) {
            onRefreshDataRef.current?.();
            if (onNavigateTabRef.current) onNavigateTabRef.current('faculty');
            const resp = `Ji Sir! Maine teacher ${capitalized} ko Computer Science department mein successfully add kar diya hai!`;
            setLastSpeechResponse(resp);
            speakAnimeVoice(`जी सर! मैंने टीचर ${capitalized} को कंप्यूटर साइंस डिपार्टमेंट में सक्सेसफुली ऐड कर दिया है!`);
            return;
          }
        } catch (e) {}
      }

      if (onNavigateTabRef.current) onNavigateTabRef.current('faculty');
      const resp = 'Ji Sir! Naya teacher add karne ke liye teacher ka naam bataiye, jaise boliye: Naya teacher add karo Dr. Amit Sharma. Main turant create kar doongi!';
      setLastSpeechResponse(resp);
      speakAnimeVoice('जी सर! नया टीचर ऐड करने के लिए टीचर का नाम बताइए, जैसे बोलिए: नया टीचर ऐड करो अमित शर्मा। मैं तुरंत ऐड कर दूँगी!');
      return;
    }

    // 🎯 TASK C: ADD BATCH VIA VOICE
    if (
      q.includes('batch add karo') ||
      q.includes('naya batch add') ||
      q.includes('naya batch create') ||
      q.includes('naya batch') ||
      q.includes('add batch') ||
      q.includes('create batch') ||
      q.includes('बैच ऐड करो') ||
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
            const resp = `Ji Sir! Naya batch ${batchName} successfully add kar diya hai!`;
            setLastSpeechResponse(resp);
            speakAnimeVoice(`जी सर! नया बैच ${batchName} सक्सेसफुली ऐड कर दिया है!`);
            return;
          }
        } catch (e) {}
      }

      if (onNavigateTabRef.current) onNavigateTabRef.current('batches');
      const resp = 'Ji Sir! Naya batch add karne ke liye batch ka naam bataiye, jaise boliye: Naya batch add karo CSE 2026. Main turant create kar doongi!';
      setLastSpeechResponse(resp);
      speakAnimeVoice('जी सर! नया बैच ऐड करने के लिए बैच का नाम बताइए, जैसे बोलिए: नया बैच ऐड करो सीएसई २०२६। मैं तुरंत बना दूँगी!');
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
      const resp = 'Ji Sir! Bulk Excel upload modal open kar diya hai, aap yahan se Excel file drag-and-drop karke sabhi load ek saath upload kar sakte hain!';
      setLastSpeechResponse(resp);
      speakAnimeVoice('जी सर! बल्क एक्सेल अपलोड मोडल ओपन कर दिया है, आप यहाँ से एक्सेल फाइल अपलोड कर सकते हैं!');
      return;
    }

    // 🎯 TASK E: CLASH CHECK & RESOLUTION
    if (
      q.includes('clash check') ||
      q.includes('check clash') ||
      q.includes('koi clash') ||
      q.includes('clashes batao') ||
      q.includes('clash batao') ||
      q.includes('overlap lecture') ||
      q.includes('overlap class') ||
      q.includes('क्लैश चेक')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('clashes');
      const cList = clashesRef.current || [];
      if (cList.length === 0) {
        const resp = 'Sir! Portal par ek bhi clash nahi hai. Sabhi faculty aur batches ke time slots perfectly clear hain!';
        setLastSpeechResponse(resp);
        speakAnimeVoice('सर! पोर्टल पर एक भी क्लैश नहीं है। सभी फैकल्टी और बैचेस के टाइम स्लॉट्स परफेक्टली क्लियर हैं!');
        return;
      } else {
        const firstMsg = cList[0]?.message || '';
        const resp = `Sir! Portal par total ${cList.length} clashes detected hain. Sabse pehla: ${firstMsg}. Main aapko Clash Alerts screen par le aayi hoon.`;
        setLastSpeechResponse(resp);
        speakAnimeVoice(`सर! पोर्टल पर टोटल ${cList.length} क्लैश डिटेक्ट हुए हैं। मैंने क्लैश अलर्ट्स स्क्रीन ओपन कर दी है।`);
        return;
      }
    }

    // 🎯 TASK F: PENDING MAIL CHECK
    if (
      q.includes('pending mail') ||
      q.includes('mail check') ||
      q.includes('kis kis ko mail') ||
      q.includes('kisko mail') ||
      q.includes('mail bhejna') ||
      q.includes('पेंडिंग मेल') ||
      q.includes('मेल चेक')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('mailTracker');
      const groups = mailGroupsRef.current || [];
      const pending = groups.filter((g: any) => !g.allMailed);
      if (pending.length === 0) {
        const resp = 'Sir! Sabhi teachers ko schedule emails bheje ja chuke hain, koi bhi mail pending nahi hai!';
        setLastSpeechResponse(resp);
        speakAnimeVoice('सर! सभी टीचर्स को शेड्यूल ईमेल्स भेजे जा चुके हैं, कोई भी मेल पेंडिंग नहीं है!');
        return;
      } else {
        const names = pending.slice(0, 4).map((g: any) => g.faculty_name).join(', ');
        const extra = pending.length > 4 ? ` aur ${pending.length - 4} anya teachers` : '';
        const resp = `Sir! Total ${pending.length} teachers ka mail pending hai: ${names}${extra}. Inhe schedule mail bhejna baaki hai.`;
        setLastSpeechResponse(resp);
        speakAnimeVoice(`सर! टोटल ${pending.length} टीचर्स का मेल पेंडिंग है: ${names}।`);
        return;
      }
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
      const resp = 'Ji Sir! Anime theme modal open kar diya hai, aap apni pasandeeda anime theme select kar sakte hain!';
      setLastSpeechResponse(resp);
      speakAnimeVoice('जी सर! एनीमे थीम मोडल ओपन कर दिया है, आप अपनी पसंद की थीम चुन सकते हैं!');
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
      const currentTab = activeTabRef.current || 'dashboard';
      let guide = '';
      let devanagariGuide = '';
      if (currentTab === 'addLoad') {
        guide = 'Sir, Add Load screen mein aap kisi bhi teacher ka naya lecture load add kar sakte hain ya bulk Excel upload kar sakte hain. Aap mujhe bol sakte hain: "Krishna sir ka Java Monday 10 baje load add karo".';
        devanagariGuide = 'सर, ऐड लोड स्क्रीन में आप किसी भी टीचर का नया लोड ऐड कर सकते हैं या बल्क एक्सेल अपलोड कर सकते हैं। आप मुझे बोल सकते हैं: कृष्णा सर का जावा मंडे १० बजे लोड ऐड करो।';
      } else if (currentTab === 'batchSyllabus') {
        guide = 'Sir, Planner screen mein aap batches ka syllabus, weekly hours aur lecture scheduling plan dekh sakte hain. Boliye kis batch ka syllabus check karna hai!';
        devanagariGuide = 'सर, प्लानर स्क्रीन में आप बैचेस का सिलेबस और वीकली आवर्स चेक कर सकते हैं। बोलिए किस बैच का सिलेबस देखना है!';
      } else if (currentTab === 'facultyAvailability') {
        guide = 'Sir, Spending Time screen mein aap live classes aur free slots dekh sakte hain. Aap pooch sakte hain: "Sharma sir kab free hain?" ya "Aaj kaun free hai?".';
        devanagariGuide = 'सर, स्पेंडिंग टाइम स्क्रीन में आप लाइव क्लासेस और फ्री स्लॉट्स देख सकते हैं। आप पूछ सकते हैं: शर्मा सर कब फ्री हैं? या आज कौन फ्री है?';
      } else if (currentTab === 'clashes') {
        guide = 'Sir, Clash Alerts screen mein aap overlapping lectures aur timing conflicts dekh sakte hain aur resolve kar sakte hain.';
        devanagariGuide = 'सर, क्लैश अलर्ट्स स्क्रीन में आप ओवरलैपिंग लेक्चर्स और टाइमिंग कॉन्फ्लिक्ट्स चेक कर सकते हैं।';
      } else {
        guide = `Sir, main poore portal ki AI Assistant hoon! Main kisi bhi screen par navigate kar sakti hoon, naya load ya faculty add kar sakti hoon, free slots check kar sakti hoon, clashes detect kar sakti hoon aur email tracker bata sakti hoon. Bataiye kya karna hai Sir!`;
        devanagariGuide = `सर, मैं पूरे पोर्टल की एआई असिस्टेंट हूँ! मैं लोड ऐड कर सकती हूँ, फ्री स्लॉट्स बता सकती हूँ, क्लैश डिटेक्ट कर सकती हूँ और ईमेल्स ट्रैक कर सकती हूँ। बताइए क्या करना है सर!`;
      }
      setLastSpeechResponse(guide);
      speakAnimeVoice(devanagariGuide);
      return;
    }

    // 4. 🎯 NAVIGATION: PLANNER / BATCH SYLLABUS (Proactive Ask!)
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
      const resp = 'Ji Sir! Main Planner screen par aa gayi hoon. Isme aapko kya karna hai mujhe bata dijiye, main kar deti hoon! Jaise kisi batch ka lecture plan check karna ya weekly schedule dekhna.';
      setLastSpeechResponse(resp);
      speakAnimeVoice('जी सर! मैं प्लानर स्क्रीन पर आ गई हूँ। इसमें आपको क्या करना है मुझे बता दीजिए, मैं कर देती हूँ! जैसे किसी बैच का लेक्चर प्लान चेक करना या वीकली शेड्यूल देखना।');
      return;
    }

    // 5. 🎯 NAVIGATION: SPENDING TIME / FREE SLOTS (Proactive Ask!)
    if (
      q.includes('spending time') ||
      q.includes('spending') ||
      q.includes('spend time') ||
      q.includes('स्पेंडिंग') ||
      q.includes('स्पेंडिंग टाइम') ||
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

      if (freeFaculties.length > 0 && freeFaculties.length < facultyRef.current.length) {
        const names = freeFaculties.slice(0, 4).map(f => f.name).join(', ');
        const extraCount = freeFaculties.length > 4 ? ` aur ${freeFaculties.length - 4} anya teachers` : '';
        const resp = `Ji Sir! Main Spending Time screen par aa gayi hoon. Aaj ye faculty free hain: ${names}${extraCount}! Yahan aapko kya karna hai mujhe bata dijiye, main kar deti hoon!`;
        setLastSpeechResponse(resp);
        speakAnimeVoice(`जी सर! मैं स्पेंडिंग टाइम स्क्रीन पर आ गई हूँ। आज ये टीचर्स फ्री हैं: ${names}। इसमें आपको क्या करना है मुझे बता दीजिए, मैं कर देती हूँ!`);
        return;
      }

      const resp = 'Ji Sir! Main Spending Time screen par aa gayi hoon. Isme aapko kya karna hai mujhe bata dijiye, main kar deti hoon! Aap kisi teacher ka free slot puch sakte hain ya live status check kar sakte hain.';
      setLastSpeechResponse(resp);
      speakAnimeVoice('जी सर! मैं स्पेंडिंग टाइम स्क्रीन पर आ गई हूँ। इसमें आपको क्या करना है मुझे बता दीजिए, मैं कर देती हूँ! आप किसी टीचर का फ्री स्लॉट पूछ सकते हैं या लाइव स्टेटस चेक कर सकते हैं।');
      return;
    }

    // 6. 🎯 NAVIGATION: FACULTY DIRECTORY (Proactive Ask!)
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
      const resp = `Ji Sir! Main Faculty Directory screen par aa gayi hoon. Total ${facultyRef.current.length} teachers registered hain. Yahan naya teacher add karna hai ya kisi department ki list dekhni hai Sir? Mujhe bataiye, main kar deti hoon!`;
      setLastSpeechResponse(resp);
      speakAnimeVoice(`जी सर! मैं फैकल्टी डायरेक्टरी स्क्रीन पर आ गई हूँ। टोटल ${facultyRef.current.length} टीचर्स रजिस्टर्ड हैं। यहाँ नया टीचर ऐड करना है या किसी डिपार्टमेंट की लिस्ट देखनी है सर? मुझे बताइए, मैं कर देती हूँ!`);
      return;
    }

    // 7. 🎯 NAVIGATION: TIMETABLE & LOAD SEARCH (Proactive Ask!)
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
      const resp = 'Ji Sir! Main Timetable aur Load Search screen par aa gayi hoon. Yahan aapko kis faculty ya kis batch ka timetable search karna hai Sir? Mujhe bataiye, main kar deti hoon!';
      setLastSpeechResponse(resp);
      speakAnimeVoice('जी सर! मैं टाइमटेबल और लोड सर्च स्क्रीन पर आ गई हूँ। यहाँ आपको किस फैकल्टी या किस बैच का टाइमटेबल सर्च करना है सर? मुझे बताइए, मैं कर देती हूँ!');
      return;
    }

    // 8. 🎯 NAVIGATION: ADD LOAD (Proactive Ask!)
    if (
      q.includes('add load') || 
      q.includes('add lecture') || 
      q.includes('new load') || 
      q.includes('create load') ||
      q.includes('एड लोड') || 
      q.includes('नया लोड')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('addLoad');
      const resp = 'Ji Sir! Main Add Load screen par aa gayi hoon. Isme aapko kya karna hai mujhe bata dijiye, main kar deti hoon! Aap mujhe teacher ka naam, subject, batch aur time bataiye, main load add kar doongi ya bulk upload open kar sakti hoon.';
      setLastSpeechResponse(resp);
      speakAnimeVoice('जी सर! मैं ऐड लोड स्क्रीन पर आ गई हूँ। इसमें आपको क्या करना है मुझे बता दीजिए, मैं कर देती हूँ! आप मुझे टीचर का नाम, सब्जेक्ट, बैच और टाइम बताइए, मैं लोड ऐड कर दूँगी या बल्क अपलोड ओपन कर सकती हूँ।');
      return;
    }

    // 9. 🎯 NAVIGATION: BATCHES (Proactive Ask!)
    if (
      q.includes('batches') || 
      q.includes('batch list') || 
      q.includes('sabhi batch') || 
      q.includes('बैच') || 
      q.includes('बैचेस')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('batches');
      const resp = `Ji Sir! Main Batches screen par aa gayi hoon. Total ${batchesRef.current.length} batches available hain. Yahan naya batch banana hai ya batch details check karni hain Sir? Mujhe bataiye!`;
      setLastSpeechResponse(resp);
      speakAnimeVoice(`जी सर! मैं बैचेस स्क्रीन पर आ गई हूँ। टोटल ${batchesRef.current.length} बैचेस उपलब्ध हैं। यहाँ नया बैच बनाना है या बैच डिटेल्स देखनी हैं सर? मुझे बताइए!`);
      return;
    }

    // 10. 🎯 NAVIGATION: CLASH ALERTS (Proactive Ask!)
    if (
      q.includes('clash') || 
      q.includes('clashes') || 
      q.includes('conflict') || 
      q.includes('overlap') || 
      q.includes('क्लैश')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('clashes');
      const cCount = clashesRef.current?.length || 0;
      const resp = `Ji Sir! Main Clash Alerts screen par aa gayi hoon. ${cCount > 0 ? `Total ${cCount} clashes detect hue hain. Kya main details bataun Sir?` : 'Ek bhi clash nahi hai, sabhi lectures clean hain!'}`;
      setLastSpeechResponse(resp);
      speakAnimeVoice(`जी सर! मैं क्लैश अलर्ट्स स्क्रीन पर आ गई हूँ। ${cCount > 0 ? `टोटल ${cCount} क्लैश डिटेक्ट हुए हैं। क्या मैं डिटेल्स बताऊँ सर?` : 'एक भी क्लैश नहीं है, सभी लेक्चर्स क्लीन हैं!'}`);
      return;
    }

    // 11. 🎯 NAVIGATION: DATE ALERTS (Proactive Ask!)
    if (
      q.includes('date alert') || 
      q.includes('date alerts') || 
      q.includes('alert') || 
      q.includes('alerts') || 
      q.includes('अलर्ट') || 
      q.includes('अलर्ट्स')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('alerts');
      const aCount = alertsRef.current?.length || 0;
      const resp = `Ji Sir! Main Date Alerts screen par aa gayi hoon. Total ${aCount} alerts available hain. Yahan kya check karna hai mujhe bata dijiye Sir!`;
      setLastSpeechResponse(resp);
      speakAnimeVoice(`जी सर! मैं डेट अलर्ट्स स्क्रीन पर आ गई हूँ। टोटल ${aCount} अलर्ट्स उपलब्ध हैं। यहाँ क्या चेक करना है मुझे बता दीजिए सर!`);
      return;
    }

    // 12. 🎯 NAVIGATION: MAIL TRACKER (Proactive Ask!)
    if (
      q.includes('mail') || 
      q.includes('email') || 
      q.includes('mail tracker') || 
      q.includes('मेल') || 
      q.includes('ईमेल')
    ) {
      if (onNavigateTabRef.current) onNavigateTabRef.current('mailTracker');
      const pCount = (mailGroupsRef.current || []).filter((g: any) => !g.allMailed).length;
      const resp = `Ji Sir! Main Mail Tracker screen par aa gayi hoon. ${pCount > 0 ? `Total ${pCount} teachers ke mail pending hain.` : 'Sabhi teachers ko mail bheja ja chuka hai!'} Yahan kya karna hai Sir?`;
      setLastSpeechResponse(resp);
      speakAnimeVoice(`जी सर! मैं मेल ट्रैकर स्क्रीन पर आ गई हूँ। ${pCount > 0 ? `टोटल ${pCount} टीचर्स के मेल पेंडिंग हैं।` : 'सभी टीचर्स को मेल भेजा जा चुका है!'} यहाँ क्या करना है सर?`);
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
      const resp = 'Ji Sir! Main Extra and Reschedule ke Indian Holidays section par aa gayi hoon. Yahan sabhi Indian National holidays ki chutti mapped hai aur routine classes off hain. Agar kisi teacher ko chutti ke din special class leni hai, to yahan entry kar sakte hain!';
      setLastSpeechResponse(resp);
      speakAnimeVoice('जी सर! मैं इंडियन हॉलिडेज और स्पेशल क्लासेस सेक्शन पर आ गई हूँ। यहाँ छुट्टियों के दिन रूटीन क्लासेस ऑफ हैं, और स्पेशल क्लास की एंट्री की जा सकती है!');
      return;
    }

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
      const resp = `Ji Sir! Main Extra aur Reschedule screen par aa gayi hoon. Total ${count} cancelled lectures hain. Yahan extra lecture add karna hai ya status check karna hai Sir? Mujhe bataiye, main kar deti hoon!`;
      setLastSpeechResponse(resp);
      speakAnimeVoice(`जी सर! मैं एक्स्ट्रा और रीशेड्यूल स्क्रीन पर आ गई हूँ। यहाँ एक्स्ट्रा लेक्चर ऐड करना है या स्टेटस चेक करना है सर? मुझे बताइए, मैं कर देती हूँ!`);
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
      if (onNavigateTabRef.current) onNavigateTabRef.current('dashboard');
      const resp = `Ji Sir! Main Dashboard par aa gayi hoon. Yahan portal ke sabhi statistics available hain: ${facultyRef.current.length} faculty, ${batchesRef.current.length} batches aur ${loadsRef.current.length} loads. Isme aapko kya karna hai mujhe bata dijiye, main kar deti hoon!`;
      setLastSpeechResponse(resp);
      speakAnimeVoice(`जी सर! मैं डैशबोर्ड पर आ गई हूँ। यहाँ पोर्टल के सभी स्टैटिस्टिक्स उपलब्ध हैं। इसमें आपको क्या करना है मुझे बता दीजिए, मैं कर देती हूँ!`);
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
    speakAnimeVoice('जी सर! टाइमटेबल और लाइव शेड्यूल स्क्रीन ओपन कर दी है। इसमें आपको क्या करना है मुझे बता दीजिए, मैं कर देती हूँ!');
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

          const rawLower = cmdText.toLowerCase();
          const cleanCommand = cmdText
            .replace(/\b(mayra|maira|myra|aira|meera|jarvis)\b/gi, '')
            .replace(/(मायरा|मैरा|मीरा|जार्विस)/gi, '')
            .trim();

          const hadWakeWord = /\b(mayra|maira|myra|aira|meera|jarvis)\b/i.test(rawLower) || /(मायरा|मैरा|मीरा|जार्विस)/.test(rawLower);

          // 🛡️ Deduplicate Loop Protection: Never execute same command twice within 3.5s
          const now = Date.now();
          if (
            cleanCommand &&
            cleanCommand === lastCommandTextRef.current &&
            now - lastCommandTimeRef.current < 3500
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
            // Only wake greeting if wake word was explicitly spoken
            if (hadWakeWord) {
              processVoiceCommandRef.current?.('jarvis');
            }
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
              // Only update live HUD text during speech; never trigger command execution on interim!
              setLiveHeardText(interim);
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

          {/* 💬 Stark Industries JARVIS HUD Response Card */}
          {showSubtitleCard && lastSpeechResponse && (
            <div className="absolute bottom-[108px] right-0 sm:right-2 z-30 max-w-[290px] sm:max-w-[360px] bg-slate-950/95 backdrop-blur-2xl border border-cyan-500/60 rounded-2xl p-4 shadow-[0_0_30px_rgba(6,182,212,0.35)] text-white text-xs animate-fadeIn space-y-2 select-none">
              {/* Card Header with Corner Tech Marks */}
              <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
                <span className="font-mono font-bold text-cyan-400 flex items-center gap-1.5 text-[11px] tracking-wider uppercase">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>MAYRA A.I. // JARVIS PROTOCOL</span>
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
          </button>
        </div>
      </div>
    </>
  );
}
