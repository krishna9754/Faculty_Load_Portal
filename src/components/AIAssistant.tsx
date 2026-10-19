import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Bot,
  User,
  Trash2,
  Minimize2,
  Maximize2,
  Radio,
  ExternalLink,
  Settings,
  Smile,
  Flame,
  Key,
  Check,
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

// Preset ElevenLabs Voice IDs optimized for natural multilingual / Hindi speech
const ELEVENLABS_VOICES = {
  dost: 'IKne3meq5aSn9XLyUdCD', // Charlie - Casual, conversational, friendly male
  man: 'pNInz6obpgDQGcFmaJgB',  // Adam - Deep, authoritative, warm male
  woman: '21m00Tcm4TlvDq8ikWAM', // Rachel - Natural, clear, warm female
  child: 'AZnzlk1XvdvUeBnXmlld', // Domi - Cute, young, energetic
};

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

  const [messages, setMessages] = useState<Message[]>(() => {
    return [
      {
        id: '1',
        sender: 'assistant',
        text: 'Aur bhai kaisa hai! 👋 Sab badhiya na?\n\nMain tera AI Portal Buddy hoon! Krishna Ji, mere paas poore portal ka 100% live access hai—timetable, cancelled classes, faculty load, rooms ya free teachers, sab bata sakta hoon. Aur haan, jab normal baat karni ho to Flash bolke mast dosti wali baatein kar!',
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
  const [isListening, setIsListening] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // ElevenLabs Studio Voice API Key
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
  }, [messages, isOpen, isMinimized]);

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

  // Pick natural Indian Hindi/English voice for Web Speech fallback
  const getNaturalVoice = (p: VoicePersona): { voice: SpeechSynthesisVoice | null; pitch: number; rate: number } => {
    if (!availableVoices.length) return { voice: null, pitch: 1.0, rate: 1.0 };

    if (p === 'dost' || p === 'man') {
      // Prioritize natural Indian Hindi / Indian English male voices
      const hindiMale = availableVoices.find(v => 
        (v.lang === 'hi-IN' || v.name.includes('हिन्दी') || v.name.includes('Hindi')) &&
        !v.name.toLowerCase().includes('female')
      ) || availableVoices.find(v => 
        (v.name.includes('Rishi') || v.name.includes('Hemant') || v.name.includes('Prabhat') || v.name.includes('Daniel') || v.name.includes('Oliver')) &&
        !v.name.toLowerCase().includes('female')
      ) || availableVoices.find(v => 
        v.lang === 'en-IN' && !v.name.toLowerCase().includes('female')
      ) || availableVoices.find(v => 
        v.name.toLowerCase().includes('male')
      ) || availableVoices[0];

      const pitch = p === 'dost' ? 0.95 : 0.88;
      const rate = p === 'dost' ? 1.02 : 0.98;
      return { voice: hindiMale || null, pitch, rate };
    }

    if (p === 'woman') {
      const hindiFemale = availableVoices.find(v => 
        (v.lang === 'hi-IN' || v.name.includes('Lekha') || v.name.includes('Swara') || v.name.includes('Neerja'))
      ) || availableVoices.find(v => 
        v.name.toLowerCase().includes('female') || v.name.includes('Samantha') || v.name.includes('Victoria')
      ) || availableVoices[0];

      return { voice: hindiFemale || null, pitch: 1.15, rate: 1.0 };
    }

    // Child
    const childVoice = availableVoices.find(v => 
      v.name.includes('Junior') || v.name.includes('Albert') || v.name.includes('Samantha') || v.name.includes('Rishi')
    ) || availableVoices[0];

    return { voice: childVoice || null, pitch: 1.55, rate: 1.12 };
  };

  const stopSpeaking = () => {
    // Stop ElevenLabs audio if playing
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    // Stop Web Speech
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Speaks using ElevenLabs if key configured, otherwise natural Indian voice engine
  const speakText = async (text: string, currentPersona: VoicePersona = persona) => {
    if (!voiceEnabled) return;
    stopSpeaking();

    // Clean text for real human audio
    const cleanSpeech = text
      .replace(/[*_#`~•]/g, ' ')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanSpeech) return;

    // 1. If ElevenLabs is enabled and key is present -> Real Studio Human Voice
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
            text: cleanSpeech,
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
        } else {
          console.warn('ElevenLabs API returned error, falling back to natural browser speech:', await res.text());
        }
      } catch (err) {
        console.warn('ElevenLabs fetch failed, falling back:', err);
      }
    }

    // 2. Fallback: Natural Human Prosody via Web Speech Synthesis with Indian Hindi prioritization
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(cleanSpeech);
      const { voice, pitch, rate } = getNaturalVoice(currentPersona);

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || 'hi-IN';
      }
      utterance.pitch = pitch;
      utterance.rate = rate;
      utterance.volume = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  const handlePersonaChange = (newPersona: VoicePersona) => {
    setPersona(newPersona);
    localStorage.setItem('ai_buddy_persona', newPersona);
    stopSpeaking();

    let sampleText = '';
    if (newPersona === 'dost') {
      sampleText = 'Aur bhai kaisa hai! Flash bhai, tera dost online aa gaya hai. Bol kya chal raha hai!';
    } else if (newPersona === 'man') {
      sampleText = 'Pranaam Krishna Ji! Kabir حاضر hai. Real masculine voice activate ho gayi hai.';
    } else if (newPersona === 'woman') {
      sampleText = 'Namaste Krishna Ji! Main Ananya hoon. Real female voice set ho gayi hai.';
    } else {
      sampleText = 'Pranaam Krishna Bhaiya! Main Chhotu hoon! Real child voice activate hai!';
    }

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

  // Speech Recognition (Mic Input)
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Krishna Ji, aapke browser me Speech Recognition support nahi hai. Chrome ya Edge use karein!');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
          handleSend(transcript);
        }
      };

      recognition.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  // Complete Knowledge & Conversation Engine
  const analyzePortalQuery = (rawQuery: string): { text: string; action?: { label: string; action: () => void } } => {
    const q = rawQuery.toLowerCase().trim();
    const today = DAYS[new Date().getDay()];

    // Check for "Aur bhai kaisa hai?" greeting
    if (q.includes('aur bhai kaisa') || q.includes('or bhai kaisa') || q.includes('or bta bhai') || q.includes('kaisa hai bhai') || q.includes('kya haal hai bhai')) {
      return {
        text: `Arre Flash mere bhai! Ekdum first class, zordar! 🔥 Tu bata kaisa hai? Sab badhiya na?\n\nKrishna Ji, main yahan poore portal ka dhyaan rakh raha hoon. Aaj koi class check karni hai ya timetable dekhna hai? Bol apne bhai ko!`,
      };
    }

    const isCasualChitChat = (
      persona === 'dost' ||
      q.includes('flash') ||
      q.includes('joke') ||
      q.includes('chutkula') ||
      q.includes('kya haal') ||
      q.includes('kaise ho') ||
      q.includes('kuch suna') ||
      q.includes('bore') ||
      q.includes('chai') ||
      q.includes('dost') ||
      q.includes('masti') ||
      q.includes('gaana') ||
      q.includes('aur bata') ||
      q.includes('chill')
    );

    const salutation = isCasualChitChat 
      ? 'Flash bhai' 
      : (persona === 'child' ? 'Krishna Bhaiya' : 'Krishna Ji');

    // 1. Identity Check
    if (q.includes('mera naam') || q.includes('who am i') || q.includes('kaun hu main') || q.includes('krishna')) {
      return {
        text: `Aapka shubh naam Krishna Ji hai! 🙏 Hamare Faculty Load Portal ke head admin aur main sir aap hi hain. Aur jab hum dosti me baat karte hain to main aapko pyaar se "Flash bhai" bolta hoon!`,
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
          text: `${salutation}, ${matchedFaculty.name} (${matchedFaculty.department}) ka record mila hai, lekin unhe koi class load assigned nahi hai. Wo free hain!`,
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
        extraInfo += `\n⚡ Extra Classes: ${facExtras.length} scheduled (${facExtras.map(e => `${e.date} ${e.start_time}`).join(', ')})`;
      }
      if (facCancelled.length > 0) {
        extraInfo += `\n❌ Cancelled: ${facCancelled.length} (${facCancelled.map(c => `${c.cancellation_date}: ${c.reason || 'Cancelled'}`).join(', ')})`;
      }

      return {
        text: `${salutation}, ${matchedFaculty.name} (${matchedFaculty.department}) ka complete schedule:\n\nTotal Weekly Loads: ${facLoads.length}\n${scheduleDetails}${extraInfo}`,
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
          text: `${salutation}, Batch "${matchedBatch.name}" mila hai par abhi isme koi classes mapped nahi hain.`,
        };
      }
      const bList = batchLoads.map(l => 
        `• ${l.day_of_week} ${l.start_time}-${l.end_time}: ${l.subject} (Faculty: ${l.faculty?.name || 'Assigned'}, Room: ${l.room || 'TBD'})`
      ).join('\n');

      return {
        text: `${salutation}, Batch "${matchedBatch.name}" ka schedule ye raha:\n\n${bList}`,
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
          text: `${salutation}, ${roomMatch[0].toUpperCase()} me ye lectures schedule hain:\n\n${rList}`,
        };
      }
    }

    // 5. Cancelled Classes
    if (q.includes('cancel') || q.includes('radd') || q.includes('cancelled')) {
      const count = cancelledClasses.length;
      if (count === 0) {
        return {
          text: `${salutation}, poore portal me abhi koi bhi class cancel nahi hui hai! Sabhi faculty aur batch ka schedule regular chal raha hai.`,
        };
      }

      const list = cancelledClasses.slice(0, 5).map(c => 
        `• ${c.faculty?.name || 'Faculty'} | ${c.subject} | Date: ${c.cancellation_date || 'N/A'}${c.reason ? ` (Karan: ${c.reason})` : ''}`
      ).join('\n');

      return {
        text: `${salutation}, portal par total ${count} class(es) cancel hain:\n\n${list}\n\nAap Extra & Reschedule section me jaakar filter bhi laga sakte hain!`,
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
          text: `${salutation}, abhi koi extra class schedule nahi hai. Sab regular lectures hi chal rahe hain.`,
        };
      }

      const list = extraClasses.map(e => 
        `• ${e.faculty?.name || 'Faculty'} | ${e.subject} | Date: ${e.date} (${e.start_time}-${e.end_time}) | Room: ${e.room || 'TBD'}`
      ).join('\n');

      return {
        text: `${salutation}, total ${count} extra class(es) scheduled hain:\n\n${list}`,
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
          text: `${salutation}, koi bhi class reschedule nahi hui hai. Sab fixed timetable par hain.`,
        };
      }

      const list = rescheduledClasses.map(r => 
        `• ${r.faculty?.name || 'Faculty'} (${r.subject}): Shifted to ${r.new_day} ${r.new_date} (${r.new_start_time}-${r.new_end_time}) | Room: ${r.room || 'TBD'}`
      ).join('\n');

      return {
        text: `${salutation}, total ${count} class(es) reschedule hui hain:\n\n${list}`,
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
          text: `${salutation}, ${matchedDay} ko portal par koi regular class load mapped nahi hai.`,
        };
      }

      const breakdown = dayLoads.slice(0, 6).map(l => 
        `• ${l.start_time}-${l.end_time}: ${l.faculty?.name} (${l.subject}) -> Batch: ${l.batch?.name || 'All'} [Room ${l.room || 'N/A'}]`
      ).join('\n');

      return {
        text: `${salutation}, ${matchedDay} ke din total ${dayLoads.length} lectures scheduled hain:\n\n${breakdown}${dayLoads.length > 6 ? `\n...aur ${dayLoads.length - 6} aur classes hain.` : ''}`,
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
          text: `${salutation}, aaj ${today} sabhi faculties busy hain! Sabka koi na koi lecture scheduled hai.`,
        };
      }

      const names = free.map(f => `• ${f.name} (${f.department})`).join('\n');
      return {
        text: `${salutation}, aaj ${today} lagbhag ${free.length} teachers free hain jinka koi lecture mapped nahi hai:\n\n${names}`,
        action: onNavigateTab ? {
          label: 'View Faculty Availability Tab',
          action: () => onNavigateTab('facultyAvailability'),
        } : undefined,
      };
    }

    // 10. Load stats
    if (q.includes('highest') || q.includes('sabse zyada') || q.includes('load') || q.includes('summary') || q.includes('stats')) {
      const loadCountMap: Record<string, number> = {};
      loads.forEach(l => {
        loadCountMap[l.faculty_id] = (loadCountMap[l.faculty_id] || 0) + 1;
      });

      const sorted = Object.entries(loadCountMap).sort((a, b) => b[1] - a[1]);
      const topFaculty = sorted.length > 0 ? faculty.find(f => f.id === sorted[0][0]) : null;

      return {
        text: `${salutation}, portal ka workload overview:\n\n• 👨‍🏫 Total Faculty: ${faculty.length}\n• 🎓 Total Batches: ${batches.length}\n• 📚 Total Weekly Loads: ${loads.length}\n• ❌ Total Cancelled: ${cancelledClasses.length}\n• ⚡ Total Extra: ${extraClasses.length}\n${topFaculty ? `\n🔥 Highest Workload: ${topFaculty.name} (${sorted[0][1]} classes/week)` : ''}`,
      };
    }

    // 11. Mail Tracker
    if (q.includes('mail') || q.includes('batch manager') || q.includes('email')) {
      const pendingMails = loads.filter(l => !l.start_mail_sent).length;
      return {
        text: `${salutation}, Mail Tracker ka status:\n\n• Total Batch Managers: ${batchManagers.length}\n• Start Mail Pending: ${pendingMails} entries\n• Start Mail Sent: ${loads.length - pendingMails} entries`,
        action: onNavigateTab ? {
          label: 'Open Mail Tracker Tab',
          action: () => onNavigateTab('mailTracker'),
        } : undefined,
      };
    }

    // 12. Jokes & Humor
    if (q.includes('joke') || q.includes('chutkula') || q.includes('masti')) {
      const jokes = [
        `Sun Flash bhai! Ek student ne exam me likha: "Bhagwan sab janta hai!"\nTeacher ne result me likha: "Bhagwan ko 100 me se 100, aur beta tumhein agle saal phir se!" 😂`,
        `Flash mere yaar, ek coder ne doctor se kaha: "Doctor sahab, mera dimaag 404 Not Found error de raha hai!"\nDoctor: "Bhai coffee piyo aur cache clear karo!" 🤣`,
        `Student: "Sir, exam me itne kathin questions kyu aate hain?"\nTeacher: "Taaki beta tumhein pata chale ki padhna kitna zaroori hai!" 😆`,
      ];
      return {
        text: jokes[Math.floor(Math.random() * jokes.length)],
      };
    }

    // 13. Casual Conversation
    if (isCasualChitChat) {
      const casualReplies = [
        `Arre Flash mere bhai! Ekdum bindass! Tu bata, chai-pani hua ya abhi coding aur portal manage karne me hi busy hai? 😎`,
        `Flash bhai zindabad! Tera bhai 24/7 ready hai. Bata aaj kya dhasu plan hai?`,
        `Chill kar Flash bhai! Jab tak tera ye dost yahan hai, tension lene ka nahi sirf tension dene ka! 😉`,
      ];
      return {
        text: casualReplies[Math.floor(Math.random() * casualReplies.length)],
      };
    }

    // Default Fallback
    return {
      text: `${salutation}, maine poora portal check kiya. Aap kisi bhi teacher ka schedule ("Dr. Sharma ki class"), batch schedule, room status ("Room 101"), cancelled classes ya free faculty pooch sakte hain!`,
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
        const portalSummary = `User: Krishna Ji (casual: Flash / Flash bhai).
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
                      text: `You are an AI Assistant for Faculty Load Portal.
Persona mode: If query is portal/work related, address respectfully as "Krishna Ji" or "Krishna Sir".
If casual/friendly, address as "Flash" or "Flash bhai".
Voice persona style: ${persona}.
Portal context: ${portalSummary}
User question: "${query}". Reply warmly and accurately in Hinglish (2-4 sentences).`,
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
        text: 'Chat fresh ho gayi Krishna Ji! Aur bataiye, ab kya dekhna hai? 🚀',
        timestamp: new Date(),
        personaUsed: persona,
      },
    ]);
  };

  const personaConfig = {
    dost: {
      name: 'Flash Buddy (Dost)',
      icon: '🤝',
      role: 'Casual & Best Friend',
      tag: 'Aur bhai kaisa hai?',
    },
    man: {
      name: 'Kabir (Real Man)',
      icon: '🧔',
      role: 'Deep Masculine',
      tag: 'Purush Voice',
    },
    woman: {
      name: 'Ananya (Real Woman)',
      icon: '👩',
      role: 'Warm Feminine',
      tag: 'Mahila Voice',
    },
    child: {
      name: 'Chhotu (Real Child)',
      icon: '👦',
      role: 'Cute & Playful',
      tag: 'Bachha Voice',
    },
  };

  const quickPrompts = [
    { label: '👋 Aur bhai kaisa hai?', query: 'Aur bhai kaisa hai?' },
    { label: 'Aaj ka timetable? 📅', query: 'Aaj ka schedule kya hai?' },
    { label: 'Cancelled classes? ❌', query: 'Kitni classes cancel hui hain?' },
    { label: 'Kaun faculty free hai? 👨‍🏫', query: 'Aaj kaun kaun free hai?' },
    { label: 'Extra classes? ⚡', query: 'Extra classes list batao' },
    { label: 'Highest workload? 🔥', query: 'Sabse zyada load kiska hai?' },
    { label: 'Ek joke sunao! 😂', query: 'Flash bhai ek badhiya joke sunao' },
  ];

  return (
    <>
      {/* Floating Action Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all duration-300 border border-white/25"
            title="Talk to AI Portal Assistant"
          >
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
            </span>

            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-base shadow-inner">
              {personaConfig[persona].icon}
            </div>

            <div className="text-left pr-1">
              <p className="text-xs font-black tracking-wide leading-tight flex items-center gap-1.5">
                Krishna Ji's AI <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-300 font-semibold">Live</span>
              </p>
              <p className="text-[10px] text-white/80 font-medium">Boliye: "Aur bhai kaisa hai" 🎙️</p>
            </div>
          </button>
        </div>
      )}

      {/* Main Chat Drawer */}
      {isOpen && (
        <div
          className={`fixed right-3 sm:right-6 bottom-3 sm:bottom-6 z-50 transition-all duration-300 shadow-2xl rounded-3xl overflow-hidden border border-slate-700/70 bg-slate-900/95 backdrop-blur-2xl flex flex-col text-white ${
            isMinimized ? 'w-80 h-16' : 'w-[94vw] sm:w-[440px] h-[630px] max-h-[92vh]'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border-b border-slate-800 flex items-center justify-between select-none">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-xl shadow-lg border border-white/20">
                  {personaConfig[persona].icon}
                </div>
                {isSpeaking && (
                  <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500 border border-slate-900"></span>
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  {personaConfig[persona].name}
                </h3>
                <p className="text-[10px] text-slate-300 flex items-center gap-1 font-medium">
                  {isSpeaking ? (
                    <span className="text-cyan-400 flex items-center gap-1 font-semibold">
                      <Radio className="w-3 h-3 animate-pulse" /> Bol raha hai...
                    </span>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Krishna Ji ke sath live • 100% Portal Access</span>
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
                title="ElevenLabs & Settings"
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
              {/* Persona Selector Bar (Dost / Man / Woman / Child) */}
              <div className="px-3 py-2 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-semibold">Voice Mode:</span>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
                  <button
                    onClick={() => handlePersonaChange('dost')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      persona === 'dost'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🤝 Dost</span>
                  </button>

                  <button
                    onClick={() => handlePersonaChange('man')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      persona === 'man'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🧔 Man</span>
                  </button>

                  <button
                    onClick={() => handlePersonaChange('woman')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      persona === 'woman'
                        ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>👩 Woman</span>
                  </button>

                  <button
                    onClick={() => handlePersonaChange('child')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
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

                  {/* ElevenLabs API Key toggle */}
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
                        Free key elevenlabs.io se le sakte hain. Key na hone par automatic Natural Hindi Speech engine chalega!
                      </p>
                    </div>
                  </div>

                  {/* Gemini Key */}
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
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5 shadow-md">
                          {personaConfig[m.personaUsed || persona].icon}
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

                {/* Animated Speaking Wave */}
                {isSpeaking && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/95 border border-cyan-500/40 rounded-xl w-fit shadow-lg animate-fadeIn">
                    <span className="text-[11px] text-cyan-300 font-bold flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                      {personaConfig[persona].name} bol raha hai...
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

              {/* Quick Prompts Bar (with "Aur bhai kaisa hai?") */}
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
                      ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50 scale-110'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                  title={isListening ? 'Listening... Tap to stop' : 'Microphone se boliye'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  placeholder={
                    isListening
                      ? 'Krishna Ji boliye... main sun raha hoon...'
                      : 'Poochiye ya boliye "Aur bhai kaisa hai"...'
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
