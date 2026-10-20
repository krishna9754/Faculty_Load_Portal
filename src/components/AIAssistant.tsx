import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  User,
  Trash2,
  Minimize2,
  Maximize2,
  Radio,
  ExternalLink,
  Settings,
  Music,
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

export type VoicePersona = 'dost' | 'man' | 'woman' | 'child';

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

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  personaUsed?: VoicePersona;
  quickAction?: {
    label: string;
    action: () => void;
  };
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ElevenLabs Voice IDs
const ELEVENLABS_VOICES = {
  dost: 'IKne3meq5aSn9XLyUdCD', // Charlie (Casual conversational)
  man: 'pNInz6obpgDQGcFmaJgB',  // Adam (Deep masculine)
  woman: '21m00Tcm4TlvDq8ikWAM', // Rachel (Warm feminine)
  child: 'AZnzlk1XvdvUeBnXmlld', // Domi (Energetic child)
};

// 🤖 Cute Animated Cartoon Robot
function CartoonRobotSVG({
  size = 40,
  isSpeaking = false,
  isListening = false,
}: {
  size?: number;
  isSpeaking?: boolean;
  isListening?: boolean;
}) {
  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full transition-transform duration-300 ${
          isSpeaking ? 'scale-105' : 'hover:scale-110'
        }`}
      >
        {/* Antenna */}
        <line x1="50" y1="20" x2="50" y2="7" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
        <circle
          cx="50"
          cy="7"
          r={isListening ? 6 : 5}
          fill={isListening ? '#ef4444' : isSpeaking ? '#22d3ee' : '#38bdf8'}
          className={isListening ? 'animate-ping' : isSpeaking ? 'animate-pulse' : ''}
        />
        <circle
          cx="50"
          cy="7"
          r="4"
          fill={isListening ? '#ef4444' : isSpeaking ? '#22d3ee' : '#38bdf8'}
        />

        {/* Headphones / Ears */}
        <rect x="12" y="38" width="8" height="24" rx="4" fill="#6366f1" />
        <rect x="80" y="38" width="8" height="24" rx="4" fill="#6366f1" />
        <path d="M 16 40 A 34 34 0 0 1 84 40" stroke="#818cf8" strokeWidth="5" fill="none" strokeLinecap="round" />

        {/* Head Outer Metallic Body */}
        <rect
          x="18"
          y="22"
          width="64"
          height="54"
          rx="22"
          fill="url(#robotGradient)"
          stroke="#4f46e5"
          strokeWidth="2.5"
        />

        {/* Glossy Screen Face */}
        <rect
          x="25"
          y="30"
          width="50"
          height="38"
          rx="14"
          fill="#0f172a"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Screen Shine */}
        <path
          d="M 28 34 Q 50 31 72 34"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Glowing Eyes */}
        {isListening ? (
          <>
            <circle cx="39" cy="46" r="6" fill="#ef4444" className="animate-pulse" />
            <circle cx="61" cy="46" r="6" fill="#ef4444" className="animate-pulse" />
            <circle cx="41" cy="44" r="2" fill="#ffffff" />
            <circle cx="63" cy="44" r="2" fill="#ffffff" />
          </>
        ) : (
          <>
            <rect
              x="33"
              y="40"
              width="13"
              height="11"
              rx="5"
              fill={isSpeaking ? '#22d3ee' : '#38bdf8'}
              className={isSpeaking ? 'animate-pulse' : ''}
            />
            <circle cx="37" cy="43" r="2" fill="#ffffff" />

            <rect
              x="54"
              y="40"
              width="13"
              height="11"
              rx="5"
              fill={isSpeaking ? '#22d3ee' : '#38bdf8'}
              className={isSpeaking ? 'animate-pulse' : ''}
            />
            <circle cx="58" cy="43" r="2" fill="#ffffff" />
          </>
        )}

        {/* Cheeks */}
        <circle cx="31" cy="56" r="3" fill="#f43f5e" opacity="0.6" />
        <circle cx="69" cy="56" r="3" fill="#f43f5e" opacity="0.6" />

        {/* Mouth */}
        {isSpeaking ? (
          <path
            d="M 40 58 Q 50 66 60 58"
            stroke="#22d3ee"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        ) : isListening ? (
          <circle cx="50" cy="59" r="3.5" fill="#ef4444" />
        ) : (
          <path
            d="M 41 57 Q 50 63 59 57"
            stroke="#38bdf8"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        )}

        <defs>
          <linearGradient id="robotGradient" x1="18" y1="22" x2="82" y2="76" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e0e7ff" />
            <stop offset="0.5" stopColor="#c7d2fe" />
            <stop offset="1" stopColor="#a5b4fc" />
          </linearGradient>
        </defs>
      </svg>
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
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [persona, setPersona] = useState<VoicePersona>(() => {
    return (localStorage.getItem('ai_buddy_persona') as VoicePersona) || 'dost';
  });

  // Default opening message as requested: "ha sir btao aapki kaise help kr skta hu apko aaj kis chiz k bre m jaana h"
  const [messages, setMessages] = useState<Message[]>(() => {
    return [
      {
        id: '1',
        sender: 'assistant',
        text: 'Haan Sir, batao aapki kaise help kar sakta hoon? Aapko aaj kis cheez ke baare me jaana hai? 😊\n\nKrishna Sir, main Nic hoon! Mere paas poore portal ka 100% live access hai—timetable, cancelled classes, faculty load, rooms ya free teachers. Aap jo bhi poochenge, main turant answer dunga!',
        timestamp: new Date(),
        personaUsed: 'dost',
      },
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('ai_buddy_voice_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  // Microphone state with live real-time speech feedback
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // ElevenLabs Key
  const [elevenLabsKey, setElevenLabsKey] = useState<string>(() => {
    return localStorage.getItem('ai_buddy_elevenlabs_key') || '';
  });
  const [useElevenLabs, setUseElevenLabs] = useState<boolean>(() => {
    return localStorage.getItem('ai_buddy_use_elevenlabs') === 'true';
  });

  // Optional Gemini API Key
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('ai_buddy_gemini_key') || '';
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized, interimTranscript]);

  // Load voices
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

  // Pick smooth natural voice
  const getSmoothVoice = (p: VoicePersona): { voice: SpeechSynthesisVoice | null; pitch: number; rate: number } => {
    if (!availableVoices.length) return { voice: null, pitch: 1.0, rate: 0.96 };

    const googleHindi = availableVoices.find(v => v.name.includes('Google हिन्दी') || (v.lang === 'hi-IN' && v.name.includes('Google')));
    const indianMale = availableVoices.find(v => 
      (v.name.includes('Rishi') || v.name.includes('Hemant') || v.name.includes('Prabhat')) &&
      !v.name.toLowerCase().includes('female')
    );
    const indianFemale = availableVoices.find(v => 
      (v.name.includes('Lekha') || v.name.includes('Swara') || v.name.includes('Neerja'))
    );

    if (p === 'dost' || p === 'man') {
      const selected = googleHindi || indianMale || availableVoices.find(v => v.lang === 'hi-IN' || v.lang === 'en-IN') || availableVoices[0];
      return { voice: selected || null, pitch: 1.0, rate: 0.98 };
    }

    if (p === 'woman') {
      const selected = googleHindi || indianFemale || availableVoices.find(v => v.lang === 'hi-IN' || v.name.toLowerCase().includes('female')) || availableVoices[0];
      return { voice: selected || null, pitch: 1.08, rate: 1.0 };
    }

    const childBase = availableVoices.find(v => v.name.includes('Junior') || v.name.includes('Albert') || v.name.includes('Rishi')) || availableVoices[0];
    return { voice: childBase || null, pitch: 1.35, rate: 1.05 };
  };

  const stopSpeaking = () => {
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

  // Smooth human speech synthesis (Chunked to prevent Chrome freeze/stutter)
  const speakText = async (fullText: string, currentPersona: VoicePersona = persona) => {
    if (!voiceEnabled) return;
    stopSpeaking();

    const clean = fullText
      .replace(/[*_#`~•]/g, ' ')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[()\[\]{}]/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return;

    // ElevenLabs Studio Voice if enabled
    if (useElevenLabs && elevenLabsKey.trim()) {
      try {
        setIsSpeaking(true);
        const voiceId = ELEVENLABS_VOICES[currentPersona] || ELEVENLABS_VOICES.dost;
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': elevenLabsKey.trim(),
          },
          body: JSON.stringify({
            text: clean,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.8,
              style: 0.3,
              use_speaker_boost: true,
            },
          }),
        });

        if (res.ok) {
          const blob = await res.blob();
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;

          audio.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
          };
          audio.onerror = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
          };

          await audio.play();
          return;
        }
      } catch (err) {
        console.warn('ElevenLabs error, using smooth browser speech:', err);
      }
    }

    // Smooth Chunked Stream (bina atke speech)
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const sentenceChunks = clean
      .split(/(?<=[.?!।\n])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (sentenceChunks.length === 0) return;

    const { voice, pitch, rate } = getSmoothVoice(currentPersona);
    setIsSpeaking(true);

    let currentIndex = 0;

    const speakNextChunk = () => {
      if (currentIndex >= sentenceChunks.length) {
        setIsSpeaking(false);
        return;
      }

      const chunk = sentenceChunks[currentIndex];
      currentIndex++;

      const utterance = new SpeechSynthesisUtterance(chunk);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || 'hi-IN';
      }
      utterance.pitch = pitch;
      utterance.rate = rate;
      utterance.volume = 1.0;

      utterance.onend = () => {
        setTimeout(speakNextChunk, 40);
      };

      utterance.onerror = (e) => {
        console.warn('Utterance error:', e);
        speakNextChunk();
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNextChunk();
  };

  const handlePersonaChange = (newPersona: VoicePersona) => {
    setPersona(newPersona);
    localStorage.setItem('ai_buddy_persona', newPersona);
    stopSpeaking();

    // Opening response
    let sampleText = 'Haan Sir batao, main Nic hoon! Aapki kaise help kar sakta hoon? Aapko aaj kis cheez ke baare me jaana hai?';

    const greetingMsg: Message = {
      id: Date.now().toString(),
      sender: 'assistant',
      text: sampleText,
      timestamp: new Date(),
      personaUsed: newPersona,
    };
    setMessages(prev => [...prev, greetingMsg]);
    speakText(sampleText, newPersona);
  };

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    localStorage.setItem('ai_buddy_voice_enabled', String(next));
    if (!next) {
      stopSpeaking();
    }
  };

  // 🎤 Bulletproof Microphone Input
  const toggleListening = async () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setInterimTranscript('');
      return;
    }

    stopSpeaking();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Krishna Ji, aapke browser me Speech Recognition enabled nahi hai. Kripya Chrome ya Edge browser use karein!');
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (permErr) {
      console.warn('Mic permission check:', permErr);
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let finalCapturedText = '';

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript('Nic sun raha hai... Boliye Sir!');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalCapturedText += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setInterimTranscript(interim || finalCapturedText);
      };

      recognition.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
        if (finalCapturedText && finalCapturedText.trim()) {
          setInputText(finalCapturedText.trim());
          handleSend(finalCapturedText.trim());
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      setIsListening(false);
      setInterimTranscript('');
    }
  };

  // 🧠 Deep Full Portal Knowledge Engine - Instant Direct Answers
  const analyzePortalQuery = (rawQuery: string): { text: string; action?: { label: string; action: () => void } } => {
    const q = rawQuery.toLowerCase().trim();
    const today = DAYS[new Date().getDay()];

    // Opening greeting trigger
    const isGeneralGreeting = (
      q === 'hi' ||
      q === 'hello' ||
      q === 'hey' ||
      q === 'nic' ||
      q === 'haan nic' ||
      q.includes('haan sir') ||
      q.includes('batao') ||
      q.includes('help') ||
      q.includes('kya haal') ||
      q.includes('aur bhai kaisa') ||
      q.includes('kaisa hai')
    );

    if (isGeneralGreeting && !q.includes('class') && !q.includes('schedule') && !q.includes('faculty') && !q.includes('room') && !q.includes('batch')) {
      return {
        text: `Haan Sir batao, aapki kaise help kar sakta hoon? Aapko aaj kis cheez ke baare me jaana hai? 😊\n\n(Krishna Sir, aap kisi bhi teacher ka schedule, cancelled classes, aaj ka timetable ya free faculty pooch sakte hain!)`,
      };
    }

    const salutation = 'Krishna Sir';

    // 1. Identity Check
    if (q.includes('mera naam') || q.includes('who am i') || q.includes('kaun hu main') || q.includes('krishna')) {
      return {
        text: `Aapka shubh naam Krishna Sir (Krishna Ji) hai! 🙏 Hamare Faculty Load Portal ke head admin aap hi hain. Aur mera naam Nic hai!`,
      };
    }

    if (q.includes('tera naam') || q.includes('your name') || q.includes('kaun ho tum')) {
      return {
        text: `Mera naam Nic hai Sir! Main aapka personal AI Portal Assistant hoon. Mere paas poore portal ka 100% access hai.`,
      };
    }

    // 2. Specific Faculty Name Search across portal
    const matchedFaculty = faculty.find(f => {
      const parts = f.name.toLowerCase().split(' ');
      return parts.some(part => part.length > 2 && q.includes(part));
    });

    if (matchedFaculty) {
      const facLoads = loads.filter(l => l.faculty_id === matchedFaculty.id);
      const facExtras = extraClasses.filter(e => e.faculty_id === matchedFaculty.id);
      const facCancelled = cancelledClasses.filter(c => c.faculty_id === matchedFaculty.id);

      if (facLoads.length === 0 && facExtras.length === 0) {
        return {
          text: `Haan ${salutation}, ${matchedFaculty.name} (${matchedFaculty.department}) ko abhi koi class load assigned nahi hai. Wo poori tarah free hain!`,
          action: onNavigateTab ? {
            label: 'Open Faculty Tab',
            action: () => onNavigateTab('faculty'),
          } : undefined,
        };
      }

      const scheduleDetails = facLoads.map(l => 
        `• ${l.day_of_week}: ${l.subject} (${l.start_time}-${l.end_time}) | Room: ${l.room || 'N/A'} | Batch: ${l.batch?.name || 'All'}`
      ).join('\n');

      let extraInfo = '';
      if (facExtras.length > 0) {
        extraInfo += `\n⚡ Extra Classes: ${facExtras.length} (${facExtras.map(e => `${e.date} ${e.start_time}`).join(', ')})`;
      }
      if (facCancelled.length > 0) {
        extraInfo += `\n❌ Cancelled: ${facCancelled.length} (${facCancelled.map(c => `${c.cancellation_date}: ${c.reason || 'Cancelled'}`).join(', ')})`;
      }

      return {
        text: `Haan ${salutation}, ${matchedFaculty.name} (${matchedFaculty.department}) ka complete schedule ye raha:\n\nWeekly Loads: ${facLoads.length}\n${scheduleDetails}${extraInfo}`,
        action: onNavigateTab ? {
          label: 'View Faculty Details',
          action: () => onNavigateTab('faculty'),
        } : undefined,
      };
    }

    // 3. Batch Search
    const matchedBatch = batches.find(b => q.includes(b.name.toLowerCase()));
    if (matchedBatch) {
      const batchLoads = loads.filter(l => l.batch_id === matchedBatch.id);
      if (batchLoads.length === 0) {
        return {
          text: `Haan ${salutation}, Batch "${matchedBatch.name}" me abhi koi classes mapped nahi hain.`,
        };
      }
      const bList = batchLoads.map(l => 
        `• ${l.day_of_week} ${l.start_time}-${l.end_time}: ${l.subject} (Faculty: ${l.faculty?.name || 'Assigned'}, Room: ${l.room || 'TBD'})`
      ).join('\n');

      return {
        text: `Haan ${salutation}, Batch "${matchedBatch.name}" ka schedule:\n\n${bList}`,
        action: onNavigateTab ? {
          label: 'View Batches Tab',
          action: () => onNavigateTab('batches'),
        } : undefined,
      };
    }

    // 4. Room Search
    const roomMatch = q.match(/room\s*(\d+[a-z]?|[a-z0-9\-]+)|lh\s*(\d+)|lab\s*(\d+)/i);
    if (roomMatch) {
      const roomTerm = roomMatch[0].toLowerCase();
      const roomLoads = loads.filter(l => l.room && l.room.toLowerCase().includes(roomTerm.replace('room', '').trim()));
      if (roomLoads.length > 0) {
        const rList = roomLoads.map(l => 
          `• ${l.day_of_week} ${l.start_time}-${l.end_time}: ${l.faculty?.name} (${l.subject}, Batch: ${l.batch?.name})`
        ).join('\n');
        return {
          text: `Haan ${salutation}, ${roomMatch[0].toUpperCase()} me ye lectures schedule hain:\n\n${rList}`,
        };
      }
    }

    // 5. Cancelled Classes
    if (q.includes('cancel') || q.includes('radd') || q.includes('cancelled')) {
      const count = cancelledClasses.length;
      if (count === 0) {
        return {
          text: `Haan ${salutation}, abhi poore portal me koi bhi class cancel nahi hui hai! Sab time par chal raha hai.`,
        };
      }

      const list = cancelledClasses.slice(0, 5).map(c => 
        `• ${c.faculty?.name || 'Faculty'} | ${c.subject} | Date: ${c.cancellation_date || 'N/A'}${c.reason ? ` (Karan: ${c.reason})` : ''}`
      ).join('\n');

      return {
        text: `Haan ${salutation}, portal par total ${count} class cancel hain:\n\n${list}\n\nAap Extra & Reschedule section me jakar filter bhi laga sakte hain!`,
        action: onNavigateTab ? {
          label: 'Open Extra & Reschedule',
          action: () => onNavigateTab('extraReschedule'),
        } : undefined,
      };
    }

    // 6. Extra Classes
    if (q.includes('extra') || q.includes('additional')) {
      const count = extraClasses.length;
      if (count === 0) {
        return {
          text: `Haan ${salutation}, abhi koi extra class schedule nahi hai. Sab normal timetable follow kar rahe hain.`,
        };
      }

      const list = extraClasses.map(e => 
        `• ${e.faculty?.name || 'Faculty'} | ${e.subject} | Date: ${e.date} (${e.start_time}-${e.end_time}) | Room: ${e.room || 'TBD'}`
      ).join('\n');

      return {
        text: `Haan ${salutation}, total ${count} extra class scheduled hain:\n\n${list}`,
        action: onNavigateTab ? {
          label: 'View Extra Classes',
          action: () => onNavigateTab('extraReschedule'),
        } : undefined,
      };
    }

    // 7. Rescheduled Classes
    if (q.includes('reschedule') || q.includes('shift') || q.includes('badla') || q.includes('change')) {
      const count = rescheduledClasses.length;
      if (count === 0) {
        return {
          text: `Haan ${salutation}, koi bhi class reschedule nahi hui hai. Sab regular timings par hain.`,
        };
      }

      const list = rescheduledClasses.map(r => 
        `• ${r.faculty?.name || 'Faculty'} (${r.subject}): Shifted to ${r.new_day} ${r.new_date} (${r.new_start_time}-${r.new_end_time}) | Room: ${r.room || 'TBD'}`
      ).join('\n');

      return {
        text: `Haan ${salutation}, total ${count} class reschedule hui hain:\n\n${list}`,
        action: onNavigateTab ? {
          label: 'Open Rescheduled Tab',
          action: () => onNavigateTab('extraReschedule'),
        } : undefined,
      };
    }

    // 8. Timetable
    const matchedDay = DAYS.find(d => q.includes(d.toLowerCase())) || (q.includes('aaj') || q.includes('today') ? today : null);
    if (matchedDay) {
      const dayLoads = loads.filter(l => l.day_of_week.toLowerCase() === matchedDay.toLowerCase());
      if (dayLoads.length === 0) {
        return {
          text: `Haan ${salutation}, ${matchedDay} ko portal par koi regular class mapped nahi hai.`,
        };
      }

      const breakdown = dayLoads.slice(0, 5).map(l => 
        `• ${l.start_time}-${l.end_time}: ${l.faculty?.name} (${l.subject}) -> Batch: ${l.batch?.name || 'All'} [Room ${l.room || 'N/A'}]`
      ).join('\n');

      return {
        text: `Haan ${salutation}, ${matchedDay} ko total ${dayLoads.length} lectures scheduled hain:\n\n${breakdown}${dayLoads.length > 5 ? `\n...aur ${dayLoads.length - 5} aur classes hain.` : ''}`,
        action: onNavigateTab ? {
          label: 'Open Dashboard',
          action: () => onNavigateTab('dashboard'),
        } : undefined,
      };
    }

    // 9. Free Faculty
    if (q.includes('free') || q.includes('available') || q.includes('khali') || q.includes('kaun free')) {
      const busyFacultyIds = new Set(
        loads
          .filter(l => l.day_of_week.toLowerCase() === today.toLowerCase())
          .map(l => l.faculty_id)
      );

      const free = faculty.filter(f => !busyFacultyIds.has(f.id));
      if (free.length === 0) {
        return {
          text: `Haan ${salutation}, aaj ${today} sabhi faculties busy hain! Sabka lecture scheduled hai.`,
        };
      }

      const names = free.map(f => `• ${f.name} (${f.department})`).join('\n');
      return {
        text: `Haan ${salutation}, aaj ${today} ${free.length} teachers free hain jinki koi class mapped nahi hai:\n\n${names}`,
        action: onNavigateTab ? {
          label: 'View Faculty Availability',
          action: () => onNavigateTab('facultyAvailability'),
        } : undefined,
      };
    }

    // 10. Load summary
    if (q.includes('highest') || q.includes('sabse zyada') || q.includes('load') || q.includes('summary') || q.includes('stats')) {
      const loadCountMap: Record<string, number> = {};
      loads.forEach(l => {
        loadCountMap[l.faculty_id] = (loadCountMap[l.faculty_id] || 0) + 1;
      });

      const sorted = Object.entries(loadCountMap).sort((a, b) => b[1] - a[1]);
      const topFaculty = sorted.length > 0 ? faculty.find(f => f.id === sorted[0][0]) : null;

      return {
        text: `Haan ${salutation}, portal ka summary ye raha:\n\n• 👨‍🏫 Total Faculty: ${faculty.length}\n• 🎓 Total Batches: ${batches.length}\n• 📚 Total Weekly Loads: ${loads.length}\n• ❌ Total Cancelled: ${cancelledClasses.length}\n• ⚡ Total Extra: ${extraClasses.length}\n${topFaculty ? `\n🔥 Highest Workload: ${topFaculty.name} (${sorted[0][1]} classes/week)` : ''}`,
      };
    }

    // 11. Jokes
    if (q.includes('joke') || q.includes('chutkula') || q.includes('masti')) {
      const jokes = [
        `Sun Flash Sir! Ek student ne exam me likha: "Bhagwan sab janta hai!"\nTeacher ne result me likha: "Bhagwan ko 100 me se 100, aur beta tumhein agle saal phir se!" 😂`,
        `Sir, ek coder ne doctor se kaha: "Doctor sahab, mera dimaag 404 Not Found error de raha hai!"\nDoctor: "Bhai coffee piyo aur cache clear karo!" 🤣`,
      ];
      return {
        text: jokes[Math.floor(Math.random() * jokes.length)],
      };
    }

    // Default Fallback
    return {
      text: `Haan Sir batao, aapki kaise help kar sakta hoon? Aapko aaj kis cheez ke baare me jaana hai? Maine poora portal scan kar rakha hai!`,
    };
  };

  const handleSend = async (customQuery?: string) => {
    const query = customQuery || inputText;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    let responseText = '';
    let actionItem: { label: string; action: () => void } | undefined;

    if (apiKey.trim()) {
      try {
        const portalSummary = `User: Krishna Sir (Krishna Ji).
Assistant Name: Nic.
Standard Opening Greeting: "Haan Sir batao, aapki kaise help kar sakta hoon? Aapko aaj kis cheez ke baare me jaana hai?"
Total Faculty: ${faculty.length}
Total Batches: ${batches.length}
Total Loads: ${loads.length}
Cancelled Classes: ${cancelledClasses.length}
Extra Classes: ${extraClasses.length}
Today: ${DAYS[new Date().getDay()]}`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: `You are Nic, the AI Assistant for Faculty Load Portal.
Always address user as "Krishna Sir" or "Sir".
When greeted or asked general things, start with: "Haan Sir batao, aapki kaise help kar sakta hoon? Aapko aaj kis cheez ke baare me jaana hai?".
Portal context: ${portalSummary}
User question: "${query}". Reply warmly and accurately in Hinglish with instant answers.`,
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (e) {
        console.warn('Gemini fallback to local intelligent search:', e);
      }
    }

    if (!responseText) {
      const result = analyzePortalQuery(query);
      responseText = result.text;
      actionItem = result.action;
    }

    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'assistant',
      text: responseText,
      timestamp: new Date(),
      personaUsed: persona,
      quickAction: actionItem,
    };

    setMessages(prev => [...prev, botMsg]);
    speakText(responseText, persona);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const clearChat = () => {
    stopSpeaking();
    setMessages([
      {
        id: Date.now().toString(),
        sender: 'assistant',
        text: 'Haan Sir batao, aapki kaise help kar sakta hoon? Aapko aaj kis cheez ke baare me jaana hai? 🚀',
        timestamp: new Date(),
        personaUsed: persona,
      },
    ]);
  };

  const personaConfig = {
    dost: {
      name: 'Nic (Dost Mode)',
      role: 'Casual & Best Friend',
    },
    man: {
      name: 'Nic (Real Man)',
      role: 'Deep Masculine',
    },
    woman: {
      name: 'Nic (Real Woman)',
      role: 'Warm Feminine',
    },
    child: {
      name: 'Nic (Real Child)',
      role: 'Cute & Playful',
    },
  };

  const quickPrompts = [
    { label: '👋 Haan Sir batao...', query: 'Haan Nic batao' },
    { label: 'Aaj ka timetable? 📅', query: 'Aaj ka schedule kya hai?' },
    { label: 'Cancelled classes? ❌', query: 'Kitni classes cancel hui hain?' },
    { label: 'Kaun faculty free hai? 👨‍🏫', query: 'Aaj kaun kaun free hai?' },
    { label: 'Extra classes? ⚡', query: 'Extra classes list batao' },
    { label: 'Highest workload? 🔥', query: 'Sabse zyada load kiska hai?' },
    { label: 'Ek joke sunao! 😂', query: 'Nic ek badhiya joke sunao' },
  ];

  return (
    <>
      {/* 🤖 Floating Cartoon Robot with "Nic AI" Label */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
          {/* Main Cartoon Robot Button */}
          <div
            onClick={() => {
              setIsOpen(true);
              speakText('Haan Sir batao, aapki kaise help kar sakta hoon? Aapko aaj kis cheez ke baare me jaana hai?');
            }}
            className="group relative flex items-center gap-3 pl-2 pr-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all duration-300 border border-white/30 cursor-pointer"
            title="Click to talk to Nic AI"
          >
            {/* Live Indicator Pulse */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
            </span>

            {/* Cartoon Robot */}
            <div className="w-11 h-11 flex-shrink-0 animate-bounce duration-1000">
              <CartoonRobotSVG size={44} isSpeaking={isSpeaking} isListening={isListening} />
            </div>

            <div className="text-left">
              <p className="text-xs font-black tracking-wide leading-tight flex items-center gap-1.5">
                Nic AI <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-300 font-semibold">Online</span>
              </p>
              <p className="text-[11px] text-white/90 font-medium flex items-center gap-1">
                Boliye: "Haan Nic..." 🎙️
              </p>
            </div>
          </div>

          {/* Direct One-Click Mic Button */}
          <button
            onClick={() => {
              setIsOpen(true);
              setTimeout(() => {
                toggleListening();
              }, 200);
            }}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all border border-white/30"
            title="Direct Voice (Click & Speak to Nic)"
          >
            <Mic className="w-5 h-5 animate-pulse" />
          </button>
        </div>
      )}

      {/* Main Chat Drawer */}
      {isOpen && (
        <div
          className={`fixed right-3 sm:right-6 bottom-3 sm:bottom-6 z-50 transition-all duration-300 shadow-2xl rounded-3xl overflow-hidden border border-slate-700/80 bg-slate-900/95 backdrop-blur-2xl flex flex-col text-white ${
            isMinimized ? 'w-80 h-16' : 'w-[94vw] sm:w-[440px] h-[640px] max-h-[92vh]'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border-b border-slate-800 flex items-center justify-between select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 flex-shrink-0">
                <CartoonRobotSVG size={40} isSpeaking={isSpeaking} isListening={isListening} />
              </div>

              <div>
                <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  Nic (Aapka AI Assistant)
                </h3>
                <p className="text-[10px] text-slate-300 flex items-center gap-1 font-medium">
                  {isListening ? (
                    <span className="text-red-400 flex items-center gap-1 font-bold animate-pulse">
                      <Radio className="w-3 h-3" /> Nic sun raha hai... Boliye!
                    </span>
                  ) : isSpeaking ? (
                    <span className="text-cyan-400 flex items-center gap-1 font-semibold">
                      <Radio className="w-3 h-3 animate-pulse" /> Nic bol raha hai...
                    </span>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Krishna Sir ke liye ready • 100% Portal Access</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Top Toolbar */}
            <div className="flex items-center gap-1">
              <button
                onClick={toggleVoice}
                className={`p-1.5 rounded-lg transition-colors ${
                  voiceEnabled ? 'text-cyan-400 hover:bg-cyan-500/20' : 'text-slate-500 hover:bg-slate-800 line-through'
                }`}
                title={voiceEnabled ? 'Voice Mute karein' : 'Voice Unmute karein'}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-lg transition-colors ${
                  showSettings ? 'text-amber-400 bg-slate-800' : 'text-slate-400 hover:bg-slate-800'
                }`}
                title="Voice Settings & ElevenLabs"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors"
                title={isMinimized ? 'Maximize' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  stopSpeaking();
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Persona Selector Bar */}
              <div className="px-3 py-2 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-semibold">Voice Mode:</span>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
                  <button
                    onClick={() => handlePersonaChange('dost')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      persona === 'dost'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🤝 Dost</span>
                  </button>

                  <button
                    onClick={() => handlePersonaChange('man')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      persona === 'man'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🧔 Man</span>
                  </button>

                  <button
                    onClick={() => handlePersonaChange('woman')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      persona === 'woman'
                        ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>👩 Woman</span>
                  </button>

                  <button
                    onClick={() => handlePersonaChange('child')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      persona === 'child'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>👦 Child</span>
                  </button>
                </div>
              </div>

              {/* Settings Drawer */}
              {showSettings && (
                <div className="p-3.5 bg-slate-800/95 border-b border-slate-700/80 text-xs space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between font-bold text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-cyan-400" />
                      ElevenLabs Studio Quality Human Voice
                    </span>
                    <button
                      onClick={clearChat}
                      className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Clear Chat
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                        <span>Enable ElevenLabs Human Voice</span>
                      </label>
                      <input
                        type="checkbox"
                        checked={useElevenLabs}
                        onChange={(e) => {
                          setUseElevenLabs(e.target.checked);
                          localStorage.setItem('ai_buddy_use_elevenlabs', String(e.target.checked));
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </div>

                    <div>
                      <input
                        type="password"
                        placeholder="ElevenLabs API Key (xi-api-key)..."
                        value={elevenLabsKey}
                        onChange={(e) => {
                          setElevenLabsKey(e.target.value);
                          localStorage.setItem('ai_buddy_elevenlabs_key', e.target.value);
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Free key elevenlabs.io se le sakte hain. Bina key ke Natural Indian Hindi Speech automatically bina atke chalega!
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Optional: Google Gemini Key (General AI):
                    </label>
                    <input
                      type="password"
                      placeholder="AIzaSy... (Khali chhod sakte hain)"
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        localStorage.setItem('ai_buddy_gemini_key', e.target.value);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Chat Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-700">
                {messages.map((m) => {
                  const isUser = m.sender === 'user';
                  return (
                    <div
                      key={m.id}
                      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 flex-shrink-0 mt-0.5">
                          <CartoonRobotSVG size={32} />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-sm ${
                          isUser
                            ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-tr-none'
                            : 'bg-slate-800/90 border border-slate-700/70 text-slate-100 rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-line">{m.text}</p>

                        {m.quickAction && (
                          <div className="mt-2.5 pt-2 border-t border-slate-700/70">
                            <button
                              onClick={m.quickAction.action}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-bold text-[11px] border border-blue-400/30 transition-all hover:scale-105 active:scale-95"
                            >
                              <span>{m.quickAction.label}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        <span
                          className={`text-[9px] mt-1 block text-right font-medium opacity-60 ${
                            isUser ? 'text-blue-100' : 'text-slate-400'
                          }`}
                        >
                          {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {isUser && (
                        <div className="w-7 h-7 rounded-xl bg-slate-700 flex items-center justify-center text-xs flex-shrink-0 mt-0.5 font-bold text-white shadow">
                          K
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 🔴 Live Listening Status Bubble */}
                {isListening && (
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-red-950/40 border border-red-500/50 rounded-2xl text-xs text-red-200 animate-pulse shadow-lg">
                    <Mic className="w-4 h-4 text-red-400 animate-bounce" />
                    <div>
                      <p className="font-bold text-red-300">Nic sun raha hai...</p>
                      {interimTranscript && (
                        <p className="text-[11px] text-white/90 italic">"{interimTranscript}"</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Animated Speaking Wave */}
                {isSpeaking && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/95 border border-cyan-500/40 rounded-xl w-fit shadow-lg animate-fadeIn">
                    <span className="text-[11px] text-cyan-300 font-bold flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                      Nic bol raha hai...
                    </span>
                    <div className="flex items-center gap-0.5">
                      <span className="w-1 h-3.5 bg-cyan-400 animate-bounce rounded-full" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-5 bg-cyan-400 animate-bounce rounded-full" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-2.5 bg-cyan-400 animate-bounce rounded-full" style={{ animationDelay: '300ms' }} />
                    </div>
                    <button
                      onClick={stopSpeaking}
                      className="ml-2 px-2 py-0.5 rounded text-[10px] bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold border border-red-500/30 transition-all"
                    >
                      Roko
                    </button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts Bar */}
              <div className="px-3 py-2 bg-slate-950/70 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p.query)}
                    className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all hover:scale-105 active:scale-95 flex-shrink-0 ${
                      idx === 0
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold hover:bg-emerald-500/30'
                        : 'bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 border-slate-700/80'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-2.5 rounded-xl transition-all duration-300 ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/60 scale-110'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                  title={isListening ? 'Sun raha hoon... Click karein band karne ke liye' : 'Microphone se boliye (Krishna Sir)'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  placeholder={
                    isListening
                      ? 'Krishna Sir boliye... Nic sun raha hai...'
                      : 'Poochiye: "Haan Sir batao..." ya koi bhi timetable...'
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />

                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!inputText.trim()}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white hover:opacity-90 disabled:opacity-40 transition-all duration-300 hover:scale-105 active:scale-95 shadow-md"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
