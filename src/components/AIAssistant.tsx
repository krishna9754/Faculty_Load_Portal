import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
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

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  quickAction?: {
    label: string;
    action: () => void;
  };
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ElevenLabs Voice ID for Mayra (Studio Human Female Voice)
const ELEVENLABS_MAYRA_VOICE = '21m00Tcm4TlvDq8ikWAM'; // Rachel

// 👩 Animated AI Human Woman Avatar (Mayra GIF)
function AIHumanWomanAvatar({
  size = 48,
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
      {/* Outer Pulse / Ping Glow Ring */}
      <span
        className={`absolute inset-0 rounded-full transition-all duration-300 pointer-events-none ${
          isListening
            ? 'border-2 border-red-500 animate-ping'
            : isSpeaking
            ? 'border-2 border-pink-400 animate-pulse ring-2 ring-pink-500/50'
            : 'border border-pink-400/40'
        }`}
      />

      {/* Animated Avatar GIF */}
      <img
        src={mayraGif}
        alt="Mayra AI Assistant"
        className={`w-full h-full rounded-full object-cover shadow-md transition-all duration-300 border-2 bg-gradient-to-tr from-pink-100 to-indigo-100 ${
          isSpeaking
            ? 'border-pink-400 scale-105 ring-2 ring-pink-400/60'
            : isListening
            ? 'border-red-400 scale-105 ring-2 ring-red-400/60'
            : 'border-pink-300/80 hover:scale-105'
        }`}
        onError={(e) => {
          const target = e.currentTarget;
          if (target.src !== window.location.origin + '/mayra-avatar.gif') {
            target.src = '/mayra-avatar.gif';
          }
        }}
      />

      {/* Speaking Active Indicator Badge */}
      {isSpeaking && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-pink-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
        </span>
      )}

      {/* Listening Mic Indicator Badge */}
      {isListening && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
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
  onNavigateTab,
}: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Initial welcome message from Mayra
  const [messages, setMessages] = useState<Message[]>(() => {
    return [
      {
        id: '1',
        sender: 'assistant',
        text: 'Hello Sir, kaise ho aap? 😊\n\nMain Mayra hoon, aapki AI Assistant! Mere paas poore portal ka 100% access hai. Aap Hindi ya English me mujhse kisi bhi teacher ka timetable, room status, cancelled classes ya free teachers pooch sakte hain. How can I help you today?',
        timestamp: new Date(),
      },
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('ai_mayra_voice_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  // Speech Recognition with live real-time speech feedback
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // ElevenLabs Key (Optional for Studio Voice)
  const [elevenLabsKey, setElevenLabsKey] = useState<string>(() => {
    return localStorage.getItem('ai_mayra_elevenlabs_key') || '';
  });
  const [useElevenLabs, setUseElevenLabs] = useState<boolean>(() => {
    return localStorage.getItem('ai_mayra_use_elevenlabs') === 'true';
  });

  // Optional Gemini API Key
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('ai_mayra_gemini_key') || '';
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

  // Pick smooth, natural female voice for Mayra
  const getMayraVoice = (): { voice: SpeechSynthesisVoice | null; pitch: number; rate: number } => {
    if (!availableVoices.length) return { voice: null, pitch: 1.12, rate: 0.98 };

    // Find Indian Female / Natural Female voice
    const indianFemale = availableVoices.find(v => 
      (v.name.includes('Lekha') || v.name.includes('Swara') || v.name.includes('Neerja'))
    ) || availableVoices.find(v => 
      (v.lang === 'hi-IN' || v.lang === 'en-IN') && v.name.toLowerCase().includes('female')
    ) || availableVoices.find(v => 
      v.name.includes('Google हिन्दी')
    ) || availableVoices.find(v => 
      v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.toLowerCase().includes('female')
    ) || availableVoices[0];

    return { voice: indianFemale || null, pitch: 1.12, rate: 0.98 };
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

  // Smooth chunked speech for Mayra (Women voice, no stuttering)
  const speakText = async (fullText: string) => {
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

    // ElevenLabs Studio Human Voice
    if (useElevenLabs && elevenLabsKey.trim()) {
      try {
        setIsSpeaking(true);
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_MAYRA_VOICE}`, {
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
              style: 0.35,
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

    // Natural Browser Female Speech (Smooth sentence queue)
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const sentenceChunks = clean
      .split(/(?<=[.?!।\n])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (sentenceChunks.length === 0) return;

    const { voice, pitch, rate } = getMayraVoice();
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

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    localStorage.setItem('ai_mayra_voice_enabled', String(next));
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
      alert('Krishna Sir, aapke browser me Speech Recognition enabled nahi hai. Kripya Chrome ya Edge use karein!');
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
        setInterimTranscript('Mayra sun rahi hai... Boliye Sir!');
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

  // 🧠 Mayra's Bilingual Knowledge Engine (English & Hindi)
  const analyzePortalQuery = (rawQuery: string): { text: string; action?: { label: string; action: () => void } } => {
    const q = rawQuery.toLowerCase().trim();
    const today = DAYS[new Date().getDay()];

    const isEnglish = (
      q.startsWith('who') ||
      q.startsWith('what') ||
      q.startsWith('where') ||
      q.startsWith('which') ||
      q.startsWith('how') ||
      q.includes('timetable') ||
      q.includes('schedule') ||
      q.includes('faculty') ||
      q.includes('available') ||
      q.includes('cancelled')
    ) && !q.includes('kaun') && !q.includes('kya') && !q.includes('aaj') && !q.includes('kitni');

    // General Greeting Trigger
    if (
      q === 'hi' ||
      q === 'hello' ||
      q === 'hey' ||
      q === 'mayra' ||
      q === 'haan mayra' ||
      q.includes('kaise ho') ||
      q.includes('how are you') ||
      q.includes('hello sir')
    ) {
      return {
        text: `Hello Sir, kaise ho aap? 😊 Main Mayra hoon! Portal me aapko aaj kis cheez ke baare me jaana hai? Timetable, cancelled classes, free faculty ya room status?`,
      };
    }

    const salutation = 'Krishna Sir';

    // 1. Identity Check
    if (q.includes('mera naam') || q.includes('who am i') || q.includes('my name') || q.includes('krishna')) {
      return {
        text: `Aapka shubh naam Krishna Sir hai! 🙏 Hamare Faculty Load Portal ke head admin aap hi hain. Aur mera naam Mayra hai!`,
      };
    }

    if (q.includes('tera naam') || q.includes('your name') || q.includes('who are you')) {
      return {
        text: isEnglish
          ? `I am Mayra, your AI Assistant! I have 100% full live access to the portal data.`
          : `Mera naam Mayra hai Sir! Main aapki AI Assistant hoon. Mere paas poore portal ka live data hai.`,
      };
    }

    // 2. Specific Faculty Name Search
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
          text: `Yes ${salutation}, ${matchedFaculty.name} (${matchedFaculty.department}) currently has no active load assigned. They are completely free!`,
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
        text: `Yes ${salutation}, here is the complete schedule for ${matchedFaculty.name} (${matchedFaculty.department}):\n\nTotal Weekly Classes: ${facLoads.length}\n${scheduleDetails}${extraInfo}`,
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
          text: `Yes ${salutation}, Batch "${matchedBatch.name}" has no scheduled classes mapped yet.`,
        };
      }
      const bList = batchLoads.map(l => 
        `• ${l.day_of_week} ${l.start_time}-${l.end_time}: ${l.subject} (Faculty: ${l.faculty?.name || 'Assigned'}, Room: ${l.room || 'TBD'})`
      ).join('\n');

      return {
        text: `Yes ${salutation}, Batch "${matchedBatch.name}" schedule:\n\n${bList}`,
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
          text: `Yes ${salutation}, here are the scheduled lectures for ${roomMatch[0].toUpperCase()}:\n\n${rList}`,
        };
      }
    }

    // 5. Cancelled Classes
    if (q.includes('cancel') || q.includes('radd') || q.includes('cancelled')) {
      const count = cancelledClasses.length;
      if (count === 0) {
        return {
          text: isEnglish
            ? `Sir, there are currently 0 cancelled classes! Everything is running on schedule.`
            : `Sir, portal par abhi koi bhi class cancel nahi hui hai! Sabhi lectures time par chal rahe hain.`,
        };
      }

      const list = cancelledClasses.slice(0, 5).map(c => 
        `• ${c.faculty?.name || 'Faculty'} | ${c.subject} | Date: ${c.cancellation_date || 'N/A'}${c.reason ? ` (Reason: ${c.reason})` : ''}`
      ).join('\n');

      return {
        text: `Sir, there are total ${count} cancelled class(es):\n\n${list}\n\nYou can also filter them in the Extra & Reschedule section!`,
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
          text: `Sir, abhi koi extra class schedule nahi hai. All classes follow the regular timetable.`,
        };
      }

      const list = extraClasses.map(e => 
        `• ${e.faculty?.name || 'Faculty'} | ${e.subject} | Date: ${e.date} (${e.start_time}-${e.end_time}) | Room: ${e.room || 'TBD'}`
      ).join('\n');

      return {
        text: `Sir, there are ${count} extra class(es) scheduled:\n\n${list}`,
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
          text: `Sir, no classes are rescheduled right now. Everything is in its original slot.`,
        };
      }

      const list = rescheduledClasses.map(r => 
        `• ${r.faculty?.name || 'Faculty'} (${r.subject}): Shifted to ${r.new_day} ${r.new_date} (${r.new_start_time}-${r.new_end_time}) | Room: ${r.room || 'TBD'}`
      ).join('\n');

      return {
        text: `Sir, total ${count} class(es) have been rescheduled:\n\n${list}`,
        action: onNavigateTab ? {
          label: 'Open Rescheduled Tab',
          action: () => onNavigateTab('extraReschedule'),
        } : undefined,
      };
    }

    // 8. Timetable / Today's Schedule
    const matchedDay = DAYS.find(d => q.includes(d.toLowerCase())) || (q.includes('aaj') || q.includes('today') ? today : null);
    if (matchedDay) {
      const dayLoads = loads.filter(l => l.day_of_week.toLowerCase() === matchedDay.toLowerCase());
      if (dayLoads.length === 0) {
        return {
          text: `Sir, there are no regular classes mapped for ${matchedDay}.`,
        };
      }

      const breakdown = dayLoads.slice(0, 5).map(l => 
        `• ${l.start_time}-${l.end_time}: ${l.faculty?.name} (${l.subject}) -> Batch: ${l.batch?.name || 'All'} [Room ${l.room || 'N/A'}]`
      ).join('\n');

      return {
        text: `Sir, on ${matchedDay} there are total ${dayLoads.length} lectures scheduled:\n\n${breakdown}${dayLoads.length > 5 ? `\n...and ${dayLoads.length - 5} more classes.` : ''}`,
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
          text: `Sir, all faculty members are busy with scheduled lectures today on ${today}.`,
        };
      }

      const names = free.map(f => `• ${f.name} (${f.department})`).join('\n');
      return {
        text: `Sir, today (${today}) approximately ${free.length} faculty members have no scheduled lectures and are free:\n\n${names}`,
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
        text: `Sir, here is the portal workload summary:\n\n• 👨‍🏫 Total Faculty: ${faculty.length}\n• 🎓 Total Batches: ${batches.length}\n• 📚 Total Weekly Loads: ${loads.length}\n• ❌ Total Cancelled: ${cancelledClasses.length}\n• ⚡ Total Extra: ${extraClasses.length}\n${topFaculty ? `\n🔥 Highest Workload: ${topFaculty.name} (${sorted[0][1]} classes/week)` : ''}`,
      };
    }

    // 11. Jokes
    if (q.includes('joke') || q.includes('chutkula') || q.includes('masti')) {
      const jokes = [
        `Sunie Sir! Student: "Teacher, kya aap mujhe us galti ki saza denge jo maine nahi ki?"\nTeacher: "Nahi beta bilkul nahi!"\nStudent: "Acha hua sir, maine aaj homework hi nahi kiya!" 😂`,
        `Sir, why do programmers prefer dark mode?\nBecause light attracts bugs! 😆`,
      ];
      return {
        text: jokes[Math.floor(Math.random() * jokes.length)],
      };
    }

    // Default Fallback
    return {
      text: `Hello Sir, batao aapki kaise help kar sakti hoon? Aap mujhse kisi bhi teacher ka timetable, cancelled classes ya room status pooch sakte hain. Main turant answer de dungi!`,
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
Assistant: Mayra (AI Human Female Assistant).
Opening Greeting: "Hello Sir, kaise ho aap?"
Languages: English & Hindi (Bilingual).
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
                      text: `You are Mayra, a female AI Human Assistant for the Faculty Load Portal.
Always address user as "Krishna Sir" or "Sir".
You speak fluent English and Hindi.
Portal context: ${portalSummary}
User question: "${query}". Reply warmly and accurately in human female tone (2-3 sentences).`,
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
        console.warn('Gemini fallback:', e);
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
      quickAction: actionItem,
    };

    setMessages(prev => [...prev, botMsg]);
    speakText(responseText);
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
        text: 'Hello Sir, kaise ho aap? Chat fresh ho gayi hai. Bataiye kya madad kar sakti hoon? 🌸',
        timestamp: new Date(),
      },
    ]);
  };

  const quickPrompts = [
    { label: '🌸 Hello Sir, kaise ho?', query: 'Hello Mayra kaise ho' },
    { label: '📅 Aaj ka timetable?', query: 'Aaj ka schedule kya hai?' },
    { label: '❌ Cancelled classes?', query: 'Kitni classes cancel hui hain?' },
    { label: '👨‍🏫 Kaun free hai?', query: 'Aaj kaun kaun free hai?' },
    { label: '⚡ Extra classes?', query: 'Extra classes list batao' },
    { label: '🔥 Highest load?', query: 'Sabse zyada load kiska hai?' },
  ];

  return (
    <>
      {/* 👩 Elegant Circular Floating AI Human Woman Avatar (Mayra) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => {
              setIsOpen(true);
              speakText('Hello Sir, kaise ho aap?');
            }}
            className="group relative w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-indigo-600 p-1 shadow-2xl hover:shadow-pink-500/50 hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-white/60 flex items-center justify-center cursor-pointer overflow-visible"
            title="Click to talk to Mayra (AI Human Assistant)"
          >
            {/* Live Online Ping Dot */}
            <span className="absolute top-0 right-0 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
            </span>

            {/* AI Human Woman Avatar with Floating/Bobbing Effect */}
            <div className="w-full h-full flex items-center justify-center animate-bounce duration-1000">
              <AIHumanWomanAvatar size={48} isSpeaking={isSpeaking} isListening={isListening} />
            </div>
          </button>
        </div>
      )}

      {/* Main Chat Drawer */}
      {isOpen && (
        <div
          className={`fixed right-3 sm:right-6 bottom-3 sm:bottom-6 z-50 transition-all duration-300 shadow-2xl rounded-3xl overflow-hidden border border-pink-500/30 bg-slate-900/95 backdrop-blur-2xl flex flex-col text-white ${
            isMinimized ? 'w-80 h-16' : 'w-[94vw] sm:w-[430px] h-[640px] max-h-[92vh]'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-950 via-purple-950 to-pink-950 border-b border-pink-500/20 flex items-center justify-between select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 flex-shrink-0">
                <AIHumanWomanAvatar size={42} isSpeaking={isSpeaking} isListening={isListening} />
              </div>

              <div>
                <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  Mayra <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-semibold border border-pink-500/30">AI Human</span>
                </h3>
                <p className="text-[10px] text-pink-200/80 flex items-center gap-1 font-medium">
                  {isListening ? (
                    <span className="text-red-400 flex items-center gap-1 font-bold animate-pulse">
                      <Radio className="w-3 h-3" /> Mayra sun rahi hai... Boliye!
                    </span>
                  ) : isSpeaking ? (
                    <span className="text-pink-300 flex items-center gap-1 font-semibold">
                      <Radio className="w-3 h-3 animate-pulse" /> Mayra bol rahi hai...
                    </span>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Krishna Sir ke liye ready • Women Voice</span>
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
                  voiceEnabled ? 'text-pink-300 hover:bg-pink-500/20' : 'text-slate-500 hover:bg-slate-800 line-through'
                }`}
                title={voiceEnabled ? 'Voice Mute karein' : 'Voice Unmute karein'}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-lg transition-colors ${
                  showSettings ? 'text-pink-300 bg-slate-800' : 'text-slate-400 hover:bg-slate-800'
                }`}
                title="Settings & ElevenLabs"
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
              {/* Settings Drawer */}
              {showSettings && (
                <div className="p-3.5 bg-slate-800/95 border-b border-pink-500/20 text-xs space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between font-bold text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-pink-400" />
                      Mayra's Female Voice (ElevenLabs Studio Option)
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
                          localStorage.setItem('ai_mayra_use_elevenlabs', String(e.target.checked));
                        }}
                        className="w-4 h-4 rounded text-pink-600 focus:ring-0 cursor-pointer"
                      />
                    </div>

                    <div>
                      <input
                        type="password"
                        placeholder="ElevenLabs API Key (xi-api-key)..."
                        value={elevenLabsKey}
                        onChange={(e) => {
                          setElevenLabsKey(e.target.value);
                          localStorage.setItem('ai_mayra_elevenlabs_key', e.target.value);
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-pink-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Free key elevenlabs.io se le sakte hain. Bina key ke Natural Indian Female Voice automatically bina atke chalegi!
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
                        localStorage.setItem('ai_mayra_gemini_key', e.target.value);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-pink-500"
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
                          <AIHumanWomanAvatar size={32} />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-sm ${
                          isUser
                            ? 'bg-gradient-to-r from-pink-600 via-rose-600 to-indigo-600 text-white rounded-tr-none'
                            : 'bg-slate-800/90 border border-slate-700/70 text-slate-100 rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-line">{m.text}</p>

                        {m.quickAction && (
                          <div className="mt-2.5 pt-2 border-t border-slate-700/70">
                            <button
                              onClick={m.quickAction.action}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 font-bold text-[11px] border border-pink-400/30 transition-all hover:scale-105 active:scale-95"
                            >
                              <span>{m.quickAction.label}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        <span
                          className={`text-[9px] mt-1 block text-right font-medium opacity-60 ${
                            isUser ? 'text-pink-100' : 'text-slate-400'
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
                      <p className="font-bold text-red-300">Mayra sun rahi hai...</p>
                      {interimTranscript && (
                        <p className="text-[11px] text-white/90 italic">"{interimTranscript}"</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Animated Speaking Wave */}
                {isSpeaking && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/95 border border-pink-500/40 rounded-xl w-fit shadow-lg animate-fadeIn">
                    <span className="text-[11px] text-pink-300 font-bold flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                      Mayra bol rahi hai...
                    </span>
                    <div className="flex items-center gap-0.5">
                      <span className="w-1 h-3.5 bg-pink-400 animate-bounce rounded-full" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-5 bg-pink-400 animate-bounce rounded-full" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-2.5 bg-pink-400 animate-bounce rounded-full" style={{ animationDelay: '300ms' }} />
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
                        ? 'bg-pink-500/20 border-pink-500/40 text-pink-300 font-bold hover:bg-pink-500/30'
                        : 'bg-slate-800 hover:bg-pink-600/30 text-slate-300 hover:text-pink-200 border-slate-700/80'
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
                  title={isListening ? 'Sun rahi hoon... Click karein band karne ke liye' : 'Microphone se boliye (Hindi ya English)'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  placeholder={
                    isListening
                      ? 'Krishna Sir boliye... Mayra sun rahi hai...'
                      : 'Ask in English or Hindi (e.g. "Dr. Sharma schedule", "free faculty")...'
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                />

                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!inputText.trim()}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-indigo-600 text-white hover:opacity-90 disabled:opacity-40 transition-all duration-300 hover:scale-105 active:scale-95 shadow-md"
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
