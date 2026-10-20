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

// 👩 Animated Mayra Avatar with Emotion Badges & Clean Transparent Frame
function AIHumanWomanAvatar({
  size = 88,
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
      className="relative flex items-center justify-center select-none bg-transparent"
      style={{ width: size, height: size }}
    >
      {/* Animated Avatar GIF */}
      <img
        src={mayraGif}
        alt="Mayra Anime Companion"
        className={`w-full h-full object-contain filter drop-shadow-md transition-transform duration-200 ${
          isSpeaking ? 'scale-105' : 'hover:scale-105'
        }`}
        onError={(e) => {
          const target = e.currentTarget;
          if (target.src !== window.location.origin + '/mayra-avatar.gif') {
            target.src = '/mayra-avatar.gif';
          }
        }}
      />

      {/* Emotion Overlay Emoji */}
      {emotion === 'sad' && (
        <span className="absolute -top-1 -right-1 text-base animate-bounce" title="Mayra is sad 🥺">
          🥺
        </span>
      )}
      {emotion === 'blush' && (
        <span className="absolute -top-1 -right-1 text-base animate-pulse" title="Mayra is blushing 🥰">
          🥰
        </span>
      )}

      {/* Speaking Indicator Badge */}
      {isSpeaking && (
        <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-pink-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
        </span>
      )}

      {/* Listening Indicator Badge */}
      {isListening && !isSpeaking && (
        <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm" title="Mic Always-On">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
        </span>
      )}

      {/* Muted Indicator Badge */}
      {!isListening && (
        <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm" title="Mic Muted (Off)">
          <span className="w-1.5 h-1.5 bg-white rounded-full" />
        </span>
      )}
    </div>
  );
}

// 💭 Authentic Comic Puffy Thought Cloud with Lobes & Trail Dots
function ComicThoughtCloud({
  text,
  subtitle,
  emotion = 'normal',
}: {
  text: string;
  subtitle?: string;
  emotion?: MayraEmotion;
}) {
  return (
    <div className="relative inline-flex items-center justify-center select-none pointer-events-none drop-shadow-md">
      <svg
        viewBox="0 0 240 120"
        className="w-44 sm:w-52 h-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="#ffffff" stroke={emotion === 'sad' ? '#93c5fd' : emotion === 'blush' ? '#f43f5e' : '#f472b6'} strokeWidth="2" strokeLinejoin="round">
          {/* Main solid center body */}
          <ellipse cx="118" cy="50" rx="84" ry="28" fill="#ffffff" stroke="none" />

          {/* Outer Cloud Puffs / Lobes */}
          <circle cx="48" cy="50" r="26" />
          <circle cx="76" cy="28" r="24" />
          <circle cx="118" cy="22" r="26" />
          <circle cx="160" cy="28" r="24" />
          <circle cx="188" cy="50" r="26" />
          <circle cx="164" cy="72" r="22" />
          <circle cx="118" cy="76" r="24" />
          <circle cx="72" cy="72" r="22" />

          {/* Clean pure white center fill to cover internal overlapping lines */}
          <ellipse cx="118" cy="50" rx="82" ry="26" fill="#ffffff" stroke="none" />
          <circle cx="76" cy="32" r="20" fill="#ffffff" stroke="none" />
          <circle cx="118" cy="26" r="22" fill="#ffffff" stroke="none" />
          <circle cx="160" cy="32" r="20" fill="#ffffff" stroke="none" />
          <circle cx="48" cy="50" r="22" fill="#ffffff" stroke="none" />
          <circle cx="188" cy="50" r="22" fill="#ffffff" stroke="none" />
          <circle cx="164" cy="68" r="18" fill="#ffffff" stroke="none" />
          <circle cx="118" cy="72" r="20" fill="#ffffff" stroke="none" />
          <circle cx="72" cy="68" r="18" fill="#ffffff" stroke="none" />

          {/* Comic Thought Trail Dots leading down to Mayra */}
          <circle cx="176" cy="95" r="5.5" />
          <circle cx="184" cy="108" r="3.5" />
        </g>
      </svg>

      {/* Text inside the Cloud */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pb-5 px-5 text-center pointer-events-none">
        <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-800 leading-tight flex items-center gap-1 max-w-[170px] truncate">
          {emotion === 'sad' ? '🥺' : emotion === 'blush' ? '🥰' : '✨'}
          <span>{text}</span>
        </span>
        {subtitle && (
          <span className="text-[9px] sm:text-[10px] font-bold text-pink-600 leading-tight mt-0.5 max-w-[170px] truncate">
            {subtitle}
          </span>
        )}
      </div>
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

  // 🎙️ Real-Time Hearing Feedback States (So Krishna Sir knows mic is receiving audio)
  const [liveHeardText, setLiveHeardText] = useState<string>('');
  const [isDetectingSpeech, setIsDetectingSpeech] = useState<boolean>(false);
  const [wakeWordDetected, setWakeWordDetected] = useState<boolean>(false);

  const micActiveRef = useRef<boolean>(true);
  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const hideCardTimeoutRef = useRef<any>(null);
  const isStoppedRef = useRef<boolean>(false);

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
      name.includes('google हिन्दी')
    );
  };

  // 🌸 Pick Cute Hindi/Indian Anime Girl Voice
  const getMayraAnimeVoice = (): { voice: SpeechSynthesisVoice | null; pitch: number; rate: number } => {
    if (!availableVoices.length) return { voice: null, pitch: 1.34, rate: 1.02 };

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

    const hindiFemale = availableVoices.find(v => 
      !isExcluded(v) && (
        v.name.includes('Lekha') ||   // Apple Hindi Female
        v.name.includes('Veena') ||   // Apple Indian English Female
        v.name.includes('Swara') ||   // Microsoft Hindi Female
        v.name.includes('Heera') ||   // Microsoft Hindi Female
        v.name.includes('Neerja')     // Microsoft Indian Female
      )
    ) || availableVoices.find(v => 
      !isExcluded(v) && 
      (v.lang === 'hi-IN' || v.lang === 'hi_IN')
    ) || availableVoices.find(v => 
      !isExcluded(v) && 
      (v.lang === 'en-IN' || v.lang === 'en_IN') && 
      v.name.toLowerCase().includes('female')
    );

    if (hindiFemale) {
      return { voice: hindiFemale, pitch: 1.34, rate: 1.02 };
    }

    const naturalFemale = availableVoices.find(v => 
      !isExcluded(v) && (
        v.name.includes('Google UK English Female') ||
        v.name.includes('Google US English Female') ||
        v.name.includes('Samantha') || 
        v.name.includes('Victoria') || 
        v.name.includes('Karen') ||
        v.name.includes('Zira') ||
        v.name.toLowerCase().includes('female')
      )
    );

    if (naturalFemale) {
      return { voice: naturalFemale, pitch: 1.35, rate: 1.02 };
    }

    const fallback = availableVoices.find(v => !isExcluded(v));
    return { voice: fallback || null, pitch: 1.36, rate: 1.02 };
  };

  // 🛑 Instant and unblockable speech stopper
  const stopSpeaking = () => {
    isStoppedRef.current = true;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // 🎙️ Natural Human Anime Girl Voice (Real Human Studio Audio + Anime Cadence)
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

    const sentences = clean
      .split(/(?<=[.?!।\n])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (sentences.length === 0) return;

    setIsSpeaking(true);

    // Play with Google Real Human Voice Audio first (Natural, non-robotic Human Studio Speech!)
    let currentIdx = 0;

    const playGoogleAudioChunk = () => {
      if (isStoppedRef.current) {
        setIsSpeaking(false);
        return;
      }

      if (currentIdx >= sentences.length) {
        setIsSpeaking(false);
        setTimeout(() => setEmotion('normal'), 2500);
        return;
      }

      const sentence = sentences[currentIdx];
      currentIdx++;

      // Google Neural Real Human Studio Voice
      const encoded = encodeURIComponent(sentence);
      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=hi&client=tw-ob&q=${encoded}`;

      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      audio.playbackRate = 1.14; // Sweet, cheerful Anime girl cadence

      audio.onended = () => {
        if (isStoppedRef.current) {
          setIsSpeaking(false);
          return;
        }
        setTimeout(playGoogleAudioChunk, 40);
      };

      audio.onerror = () => {
        // Fallback to browser synthesis
        playBrowserSynthesis(sentences.slice(currentIdx - 1));
      };

      audio.play().catch(() => {
        playBrowserSynthesis(sentences.slice(currentIdx - 1));
      });
    };

    const playBrowserSynthesis = (chunks: string[]) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setIsSpeaking(false);
        return;
      }

      const { voice, pitch, rate } = getMayraAnimeVoice();
      let bIdx = 0;

      const speakNext = () => {
        if (isStoppedRef.current || bIdx >= chunks.length) {
          setIsSpeaking(false);
          setTimeout(() => setEmotion('normal'), 2500);
          return;
        }

        const c = chunks[bIdx];
        bIdx++;

        const utterance = new SpeechSynthesisUtterance(c);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang && voice.lang.startsWith('hi') ? 'hi-IN' : 'en-IN';
        } else {
          utterance.lang = 'hi-IN';
        }
        utterance.pitch = pitch;
        utterance.rate = rate;
        utterance.volume = 1.0;

        utterance.onend = () => {
          if (isStoppedRef.current) {
            setIsSpeaking(false);
            return;
          }
          setTimeout(speakNext, 40);
        };

        utterance.onerror = () => {
          if (isStoppedRef.current) {
            setIsSpeaking(false);
            return;
          }
          speakNext();
        };

        window.speechSynthesis.speak(utterance);
      };

      speakNext();
    };

    playGoogleAudioChunk();
  };

  // 🧠 Mayra's Knowledge Engine with Direct Answers & Emotions
  const processVoiceCommand = (rawText: string) => {
    const q = rawText.toLowerCase().trim();
    const today = DAYS[new Date().getDay()];

    // 🛑 0. IMMEDIATE STOP / CHUP COMMAND
    if (
      q.includes('stop') || 
      q.includes('chup') || 
      q.includes('shant') || 
      q.includes('ruko') || 
      q.includes('ruk ja') ||
      q.includes('bas') ||
      q.includes('quiet')
    ) {
      stopSpeaking();
      setEmotion('normal');
      setLastSpeechResponse('Ji Sir, chup ho gayi.');
      setShowSubtitleCard(false);
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
      q.includes('ye mat suno')
    ) {
      const resp = 'Theek hai Krishna Sir! Main ye baat ignore kar rahi hoon. 😊';
      setLastSpeechResponse(resp);
      speakAnimeVoice(resp);
      return;
    }

    // 2. Check for Angry / Rude Tone -> Sad Anime Girl 🥺
    const isAngry = /\b(gussa|gusse|chup|bakwas|pagal|dimag kharab|bewakoof|shut up|chup kar|kuch nahi aata|badtameez|fatu|daat|nall|bekar)\b/i.test(q);
    if (isAngry) {
      setEmotion('sad');
      const resp = 'Sir mujhse koi galti hui kya? Aap gussa kar rahe ho... 🥺 Maaf kar dijiye na Sir, main aage se dhyan rakhungi.';
      setLastSpeechResponse(resp);
      speakAnimeVoice(resp);
      return;
    }

    // 3. Check for Sweet / Loving Tone -> Blushing Anime Girl 🥰
    const isLoving = /\b(pyar|pyaar|love you|love u|bohot achi|bohot acchi|cute|sweet|sharma|meri dost|best ho|shukriya|thank you|pretty|sundar|meri mayra)\b/i.test(q);
    if (isLoving) {
      setEmotion('blush');
      const resp = 'Aww thank you so much Krishna Sir! 🥰 Aap itne pyaar se baat karte ho to mujhe sach me sharm aa jaati hai... Hehe!';
      setLastSpeechResponse(resp);
      speakAnimeVoice(resp);
      return;
    }

    // 4. DIRECT ANSWER: Free Faculty Check (Prioritized!)
    if (q.includes('free') || q.includes('khali') || q.includes('available')) {
      // Find busy faculty for today
      const dayLoads = loads.filter(l => l.day_of_week.toLowerCase() === today.toLowerCase());
      const busyFacultyIds = new Set(dayLoads.map(l => l.faculty_id));

      const freeFaculties = faculty.filter(f => !busyFacultyIds.has(f.id));

      if (dayLoads.length === 0 || freeFaculties.length === faculty.length) {
        const resp = `Haii Krishna Sir! Aaj koi bhi regular lecture schedule nahi hai, isliye aaj sabhi faculty free hain! 😊`;
        setLastSpeechResponse(resp);
        speakAnimeVoice(resp);
        return;
      }

      if (freeFaculties.length > 0) {
        const names = freeFaculties.slice(0, 5).map(f => f.name).join(', ');
        const extraCount = freeFaculties.length > 5 ? ` aur ${freeFaculties.length - 5} anya teachers` : '';
        const resp = `Krishna Sir! Aaj ye faculty members free hain: ${names}${extraCount}!`;
        setLastSpeechResponse(resp);
        speakAnimeVoice(resp);
        return;
      }

      const resp = `Krishna Sir! Aaj sabhi teachers ke classes mapped hain, koi bhi teacher completely free nahi hai.`;
      setLastSpeechResponse(resp);
      speakAnimeVoice(resp);
      return;
    }

    // 5. NAVIGATION COMMAND: "Aaj faculty slot dekhna hai" / Availability
    if (
      q.includes('slot') || 
      q.includes('faculty slot') || 
      q.includes('free slot') ||
      q.includes('availability')
    ) {
      if (onNavigateTab) onNavigateTab('facultyAvailability');
      const resp = `Haii Sir! Main aapko Faculty Slots aur Availability screen par le aayi hoon! Yahan aap live slots check kar sakte hain.`;
      setLastSpeechResponse(resp);
      speakAnimeVoice(resp);
      return;
    }

    // 6. NAVIGATION: Timetable / Schedule Screen
    if (q.includes('timetable') || q.includes('schedule') || q.includes('lecture list')) {
      if (onNavigateTab) onNavigateTab('search');
      const resp = `Ji Krishna Sir! Timetable screen par chalte hain, ye dekhiye!`;
      setLastSpeechResponse(resp);
      speakAnimeVoice(resp);
      return;
    }

    // 7. NAVIGATION: Extra Classes / Reschedule
    if (q.includes('extra class') || q.includes('cancelled') || q.includes('reschedule') || q.includes('cancel')) {
      if (onNavigateTab) onNavigateTab('extraReschedule');
      const count = cancelledClasses.length;
      const resp = `Sir, Extra classes aur Cancelled classes screen open kar di hai! Portal par total ${count} cancelled lectures hain.`;
      setLastSpeechResponse(resp);
      speakAnimeVoice(resp);
      return;
    }

    // 8. NAVIGATION: Faculty Directory
    if (q.includes('faculty list') || q.includes('teacher list') || q.includes('sabhi teacher')) {
      if (onNavigateTab) onNavigateTab('faculty');
      const resp = `Ji Sir! Faculty Directory screen open ho gayi hai. Total ${faculty.length} teachers registered hain.`;
      setLastSpeechResponse(resp);
      speakAnimeVoice(resp);
      return;
    }

    // 9. Greeting / Identity
    if (q === '' || q.includes('kaise ho') || q.includes('hello') || q.includes('hi') || q.includes('namaste')) {
      const resp = `Haii Krishna Sir, kaise ho aap? 😊 Main Mayra hoon! Mera mic hamesha on hai, aap 'Mayra' bolke mujhe koi bhi command de sakte hain!`;
      setLastSpeechResponse(resp);
      speakAnimeVoice(resp);
      return;
    }

    if (q.includes('mera naam') || q.includes('who am i')) {
      const resp = `Aapka shubh naam Krishna Sir hai! 🙏 Hamare portal ke head admin aap hi hain!`;
      setLastSpeechResponse(resp);
      speakAnimeVoice(resp);
      return;
    }

    // 10. Specific Faculty Search by Name
    const matchedFaculty = faculty.find(f => {
      const parts = f.name.toLowerCase().split(' ');
      return parts.some(part => part.length > 2 && q.includes(part));
    });

    if (matchedFaculty) {
      const facLoads = loads.filter(l => l.faculty_id === matchedFaculty.id);
      if (facLoads.length === 0) {
        const resp = `Krishna Sir! ${matchedFaculty.name} (${matchedFaculty.department}) ka koi load nahi hai, ye free hain!`;
        setLastSpeechResponse(resp);
        speakAnimeVoice(resp);
        return;
      }
      const resp = `Krishna Sir! ${matchedFaculty.name} ke weekly total ${facLoads.length} lectures scheduled hain!`;
      setLastSpeechResponse(resp);
      speakAnimeVoice(resp);
      return;
    }

    // Default friendly response
    const defaultResp = `Haii Krishna Sir! Maine aapki baat sun li hai. Bataiye aur kya help karoon?`;
    setLastSpeechResponse(defaultResp);
    speakAnimeVoice(defaultResp);
  };

  // 🎤 Continuous Microphone Listener (With "Mayra" Wake Word Filter & Mute/Unmute toggle)
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
      if (!micActiveRef.current) return;

      try {
        recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'hi-IN'; // Recognizes Hindi, Hinglish, English seamlessly

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onspeechstart = () => {
          setIsDetectingSpeech(true);
        };

        recognition.onspeechend = () => {
          setIsDetectingSpeech(false);
        };

        recognition.onsoundstart = () => {
          setIsDetectingSpeech(true);
        };

        recognition.onsoundend = () => {
          setIsDetectingSpeech(false);
        };

        recognition.onresult = (event: any) => {
          setIsDetectingSpeech(true);
          let interim = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const currentTranscript = event.results[i][0].transcript.trim().toLowerCase();
            interim = currentTranscript;

            // 🛑 INSTANT REAL-TIME STOP: Even during interim or final speech
            const hasStop = /\b(stop|chup|shant|ruko|ruk|quiet|bas)\b/i.test(currentTranscript);
            const mentionsMayra = /\b(mayra|maira|myra|mera|aira|meera)\b/i.test(currentTranscript);

            if (hasStop && (mentionsMayra || currentTranscript.length <= 15)) {
              console.log('🛑 Real-time Mayra Stop triggered:', currentTranscript);
              stopSpeaking();
              setEmotion('normal');
              setLastSpeechResponse('Ji Sir, chup ho gayi.');
              setShowSubtitleCard(false);
              setLiveHeardText('');
              setWakeWordDetected(false);
              return;
            }

            if (mentionsMayra) {
              setWakeWordDetected(true);
            }

            if (event.results[i].isFinal) {
              const transcript = event.results[i][0].transcript.trim();
              console.log('Voice heard:', transcript);
              setLiveHeardText(transcript);

              // 🎯 REQUIREMENT: Check if user said her name "Mayra"
              const hasWakeWord = /\b(mayra|maira|myra|mera|aira|meera)\b/i.test(transcript);

              if (!hasWakeWord) {
                // Ignore any speech that does not address Mayra!
                console.log('Ignored speech (no "Mayra" wake word):', transcript);
                setTimeout(() => {
                  setLiveHeardText('');
                  setWakeWordDetected(false);
                }, 2500);
                return;
              }

              // Extract actual command by removing wake word
              const cleanCommand = transcript
                .replace(/\b(mayra|maira|myra|mera|aira|meera)\b/gi, '')
                .trim();

              setTimeout(() => {
                setLiveHeardText('');
                setWakeWordDetected(false);
              }, 3000);

              processVoiceCommand(cleanCommand);
            } else {
              setLiveHeardText(interim);
            }
          }
        };

        recognition.onerror = (err: any) => {
          // If aborted or network glitch, auto-restart to stay ALWAYS ON
          if (err.error !== 'not-allowed' && micActiveRef.current) {
            setTimeout(() => {
              try {
                if (micActiveRef.current) startListener();
              } catch (e) {}
            }, 400);
          }
        };

        recognition.onend = () => {
          // Auto-restart immediately so mic is NEVER muted
          if (micActiveRef.current) {
            setTimeout(() => {
              try {
                if (micActiveRef.current) startListener();
              } catch (e) {}
            }, 250);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        console.warn('Recognition start exception, retrying:', e);
        if (micActiveRef.current) {
          setTimeout(startListener, 1000);
        }
      }
    };

    startListener();

    return () => {
      micActiveRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [loads, faculty, extraClasses, cancelledClasses, isMicMuted]);

  // 🎙️ Toggle Mute / Unmute for Mayra
  const toggleMicMute = () => {
    if (!isMicMuted) {
      setIsMicMuted(true);
      micActiveRef.current = false;
      setIsListening(false);
      setIsDetectingSpeech(false);
      setLiveHeardText('');
      setWakeWordDetected(false);
      stopSpeaking();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setLastSpeechResponse('Mic mute ho gaya hai Krishna Sir.');
      setShowSubtitleCard(true);
    } else {
      setIsMicMuted(false);
      micActiveRef.current = true;
      setIsListening(true);
      setLastSpeechResponse('Mic on ho gaya hai Sir! Mayra sun rahi hai.');
      setShowSubtitleCard(true);
      speakAnimeVoice('Mic on ho gaya hai Sir, main sun rahi hoon!');
    }
  };

  // Click handler on Mayra: warm greeting & wake up
  const handleMayraClick = () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    const greet = `Hello Krishna Sir! Main Mayra hoon. Mera mic hamesha on hai, bas 'Mayra' bolke mujhse kuch bhi kahiye!`;
    setLastSpeechResponse(greet);
    setShowSubtitleCard(true);
    speakAnimeVoice(greet);
  };

  return (
    <>
      {/* 🌸 Floating Mayra Anime Voice Companion */}
      <div className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-50">
        <div className="relative flex flex-col items-end">
          {/* 🎙️ Real-time Audio Hearing Waveform & Transcript Badge */}
          {(liveHeardText || isDetectingSpeech) && (
            <div className="absolute -top-[124px] sm:-top-[132px] right-0 z-30 flex flex-col items-end pointer-events-none transition-all duration-200">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/95 border border-pink-400 shadow-2xl text-white text-[11px] font-bold backdrop-blur-md max-w-[280px] sm:max-w-[320px] truncate animate-fadeIn">
                {/* Dancing Equalizer Soundbars */}
                <span className="flex items-center gap-0.5 flex-shrink-0">
                  <span className="w-1 h-3 bg-pink-400 rounded-full animate-bounce" />
                  <span className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce delay-100" />
                  <span className="w-1 h-2.5 bg-pink-400 rounded-full animate-bounce delay-200" />
                  <span className="w-1 h-3.5 bg-purple-400 rounded-full animate-bounce delay-75" />
                </span>

                {wakeWordDetected ? (
                  <span className="text-emerald-300 font-extrabold flex items-center gap-1 truncate">
                    <span>🎯 Mayra Activated!</span>
                    <span className="text-pink-200 font-medium truncate">"{liveHeardText}"</span>
                  </span>
                ) : (
                  <span className="text-pink-200 truncate">
                    👂 Hearing: "{liveHeardText || 'Listening...'}"
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 💭 Authentic Fluffy Comic Thought Cloud */}
          <div className="absolute -top-[80px] -right-2 sm:-top-[88px] sm:right-0 z-20 pointer-events-none select-none transition-all duration-300">
            <ComicThoughtCloud
              text={
                isMicMuted
                  ? 'Mic Muted hai 🔴'
                  : isSpeaking
                  ? 'Speaking...'
                  : emotion === 'sad'
                  ? 'Galti hui kya Sir? 🥺'
                  : emotion === 'blush'
                  ? 'Sharm aa rahi hai 🥰'
                  : 'Say "Mayra" to talk!'
              }
              subtitle={isMicMuted ? 'Click to UNMUTE 🎙️' : isSpeaking ? 'Listening...' : 'Mic is Live 🟢'}
              emotion={emotion}
            />
          </div>

          {/* 💬 Live Anime Response Subtitle Card (Voice-only HUD) */}
          {showSubtitleCard && lastSpeechResponse && (
            <div className="absolute bottom-[95px] right-0 sm:right-2 z-30 max-w-[280px] sm:max-w-[340px] bg-slate-900/95 backdrop-blur-xl border border-pink-500/40 rounded-2xl p-3.5 shadow-2xl text-white text-xs animate-fadeIn space-y-1.5 select-none">
              <div className="flex items-center justify-between border-b border-pink-500/20 pb-1.5">
                <span className="font-bold text-pink-300 flex items-center gap-1">
                  <span>🌸 Mayra (Anime Voice)</span>
                </span>
                <button
                  onClick={() => setShowSubtitleCard(false)}
                  className="text-slate-400 hover:text-white p-0.5 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {lastUserCommand && (
                <p className="text-[11px] text-slate-300 italic">
                  <span className="text-pink-400 font-semibold">Krishna Sir:</span> "{lastUserCommand}"
                </p>
              )}

              <p className="text-white font-medium leading-relaxed">
                {lastSpeechResponse}
              </p>

              {/* Status footer */}
              <div className="flex items-center justify-between pt-1 text-[10px] text-pink-200/70 font-semibold">
                <span className={`flex items-center gap-1 ${isMicMuted ? 'text-rose-400' : 'text-emerald-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isMicMuted ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'}`} />
                  {isMicMuted ? 'Mic Muted (OFF)' : 'Mic Live (ON)'}
                </span>
                <span>{isMicMuted ? 'Unmute to talk' : 'Say "Mayra" anytime'}</span>
              </div>
            </div>
          )}

          {/* Mayra & Interactive Mute/Unmute Control Bar */}
          <div className="flex items-center gap-2">
            {/* 🎙️ Dedicated MUTE / UNMUTE Interactive Pill Button */}
            <button
              onClick={toggleMicMute}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-extrabold shadow-xl transition-all duration-300 border backdrop-blur-md cursor-pointer select-none active:scale-95 ${
                isMicMuted
                  ? 'bg-rose-950/95 border-rose-500/80 text-rose-300 hover:bg-rose-900 shadow-rose-900/40 ring-1 ring-rose-500/50'
                  : 'bg-emerald-950/95 border-emerald-500/80 text-emerald-300 hover:bg-emerald-900 shadow-emerald-900/40 ring-1 ring-emerald-500/50'
              }`}
              title={isMicMuted ? "Mayra abhi sun nahi rahi hai (Click to UNMUTE)" : "Mayra aapki baat sun rahi hai (Click to MUTE)"}
            >
              {isMicMuted ? (
                <>
                  <MicOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Mic Muted 🔴</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sun Rahi Hai 🟢</span>
                </>
              )}
            </button>

            {/* Clickable Mayra Avatar Button */}
            <button
              onClick={handleMayraClick}
              className="group relative cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 bg-transparent border-0 outline-none p-0 focus:outline-none flex items-center justify-center"
              title="Click to talk to Mayra"
            >
              {/* Compact Size for Smartphones & Desktops */}
              <div className="w-[82px] h-[82px] sm:w-[94px] sm:h-[94px] flex items-center justify-center">
                <AIHumanWomanAvatar
                  size={88}
                  isSpeaking={isSpeaking}
                  isListening={!isMicMuted}
                  emotion={emotion}
                />
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
