import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ChevronDown,
  UserCheck,
  Calendar,
  Layers,
  AlertTriangle,
  Smile,
  Shield,
  Activity,
  Award,
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

export type VoicePersona = 'man' | 'woman' | 'child';

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
    return (localStorage.getItem('ai_buddy_persona') as VoicePersona) || 'man';
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    return [
      {
        id: '1',
        sender: 'assistant',
        text: 'Pranaam Krishna Ji! 🙏 Main aapka personal AI Portal Assistant hoon. Mere paas poore portal ka 100% live access hai—kisi bhi faculty ka load, batch schedule, cancelled ya extra class, room info ya timetable... aap kuch bhi pooch sakte hain! Aur agar normal dosti wali baat karni ho to mujhe Flash boliye! 😊',
        timestamp: new Date(),
        personaUsed: 'man',
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
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(() => {
    return localStorage.getItem('ai_buddy_selected_voice') || '';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('ai_buddy_gemini_key') || '';
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  // Load and categorize voices
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

  // Pick voice based on active persona
  const getVoiceForPersona = (p: VoicePersona): { voice: SpeechSynthesisVoice | null; pitch: number; rate: number } => {
    if (!availableVoices.length) return { voice: null, pitch: 1.0, rate: 1.0 };

    if (p === 'man') {
      // Prioritize natural deep male voices
      const maleVoice = availableVoices.find(v => 
        (v.name.includes('Rishi') || v.name.includes('Hemant') || v.name.includes('Daniel') || v.name.includes('Oliver') || v.name.includes('Tom') || v.name.includes('Prabhat')) &&
        !v.name.toLowerCase().includes('female')
      ) || availableVoices.find(v => 
        (v.lang === 'en-IN' || v.lang === 'hi-IN') && !v.name.toLowerCase().includes('female')
      ) || availableVoices.find(v => 
        v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('female')
      ) || availableVoices.find(v => 
        v.name.includes('Alex') || v.name.includes('Fred')
      ) || availableVoices[0];

      return { voice: maleVoice || null, pitch: 0.88, rate: 0.98 };
    } 
    
    if (p === 'woman') {
      // Prioritize natural sweet female voices
      const femaleVoice = availableVoices.find(v => 
        (v.name.includes('Swara') || v.name.includes('Lekha') || v.name.includes('Neerja') || v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Zira') || v.name.includes('Karen')) &&
        !v.name.toLowerCase().includes('male')
      ) || availableVoices.find(v => 
        v.name.toLowerCase().includes('female')
      ) || availableVoices.find(v => 
        (v.lang === 'hi-IN' || v.lang === 'en-IN') && !v.name.toLowerCase().includes('male')
      ) || availableVoices.find(v => 
        v.lang.startsWith('en')
      ) || availableVoices[0];

      return { voice: femaleVoice || null, pitch: 1.15, rate: 1.02 };
    }

    // Child persona: cute, higher pitch, playful energetic rate
    const childBaseVoice = availableVoices.find(v => 
      v.name.includes('Junior') || v.name.includes('Albert') || v.name.includes('Samantha') || v.name.includes('Rishi')
    ) || availableVoices[0];

    return { voice: childBaseVoice || null, pitch: 1.55, rate: 1.12 };
  };

  const handlePersonaChange = (newPersona: VoicePersona) => {
    setPersona(newPersona);
    localStorage.setItem('ai_buddy_persona', newPersona);
    stopSpeaking();

    // Friendly greeting when persona changes
    let sampleText = '';
    if (newPersona === 'man') {
      sampleText = 'Krishna Ji, Kabir حاضر hai! Real masculine voice set ho gayi hai. Bataiye kya madad karu?';
    } else if (newPersona === 'woman') {
      sampleText = 'Namaste Krishna Ji! Main Ananya hoon. Real female voice activate ho gayi hai. Poore portal ka schedule mere paas hai!';
    } else {
      sampleText = 'Pranaam Krishna Bhaiya! Main Chhotu hoon! Real child voice on hai. Chaliye batayein kya dekhna hai!';
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

  // Text-To-Speech with human tuning
  const speakText = (text: string, currentPersona: VoicePersona = persona) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

    // Clean text for natural human audio
    const cleanSpeech = text
      .replace(/[*_#`~•]/g, ' ')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanSpeech) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    const { voice, pitch, rate } = getVoiceForPersona(currentPersona);

    if (voice) {
      utterance.voice = voice;
    }
    utterance.pitch = pitch;
    utterance.rate = rate;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    localStorage.setItem('ai_buddy_voice_enabled', String(next));
    if (!next) {
      stopSpeaking();
    }
  };

  // Speech Recognition (Microphone Voice Input)
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Krishna Ji, aapke browser me Speech Recognition enabled nahi hai. Kripya Chrome ya Edge browser use karein!');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN'; // Recognizes Hindi, Hinglish, English words
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

  // Full Portal Knowledge Base & Query Analysis
  const analyzePortalQuery = (rawQuery: string): { text: string; action?: { label: string; action: () => void } } => {
    const q = rawQuery.toLowerCase().trim();
    const today = DAYS[new Date().getDay()];

    // Determine Casual Mode (Flash) vs Professional/Portal Mode (Krishna Ji / Krishna Sir)
    const isCasualChitChat = (
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

    // 1. Identity / Name Query
    if (q.includes('mera naam') || q.includes('who am i') || q.includes('kaun hu main') || q.includes('krishna')) {
      return {
        text: `Aapka shubh naam Krishna Ji hai! 🙏 Hamare Faculty Workload Portal ke main administrator aur hero aap hi hain. Aur jab hum dosti me casual baat karte hain, to main aapko pyaar se "Flash bhai" bolta hoon!`,
      };
    }

    // 2. Specific Faculty Name Search across portal
    // Check if query contains any known faculty name
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
          text: `${salutation}, ${matchedFaculty.name} (${matchedFaculty.department}) ka record mila hai, lekin abhi unhe koi class load assigned nahi hai. Wo free hain!`,
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
        extraInfo += `\n❌ Cancelled Classes: ${facCancelled.length} (${facCancelled.map(c => `${c.cancellation_date}: ${c.reason || 'No reason'}`).join(', ')})`;
      }

      return {
        text: `${salutation}, ${matchedFaculty.name} (${matchedFaculty.department}) ka complete schedule ye raha:\n\nTotal Regular Loads: ${facLoads.length} per week\n${scheduleDetails}${extraInfo}`,
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
        text: `${salutation}, Batch "${matchedBatch.name}" ka complete schedule ye raha:\n\n${bList}`,
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

    // 5. Cancelled Classes (Deep Search)
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
        text: `${salutation}, portal par total ${count} class(es) cancel hain:\n\n${list}\n\nAap Extra & Reschedule section me jake Regular/Reschedule/Extra ke hisab se filter bhi kar sakte hain!`,
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
          text: `${salutation}, koi bhi class reschedule nahi hui hai. Sab regular timings par hain.`,
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

    // 8. Day-wise or Today's Timetable
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

    // 9. Free / Available Faculty
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
        text: `${salutation}, aaj ${today} lagbhag ${free.length} teachers free hain jinka koi lecture mapped nahi hai:\n\n${names}\n\nAgar kisi substitute ya extra class lagani ho to inka use kar sakte hain!`,
        action: onNavigateTab ? {
          label: 'View Faculty Availability Tab',
          action: () => onNavigateTab('facultyAvailability'),
        } : undefined,
      };
    }

    // 10. Maximum Load / Stats / Overview
    if (q.includes('highest') || q.includes('sabse zyada') || q.includes('load') || q.includes('summary') || q.includes('stats')) {
      // Calculate load per faculty
      const loadCountMap: Record<string, number> = {};
      loads.forEach(l => {
        loadCountMap[l.faculty_id] = (loadCountMap[l.faculty_id] || 0) + 1;
      });

      const sorted = Object.entries(loadCountMap).sort((a, b) => b[1] - a[1]);
      const topFaculty = sorted.length > 0 ? faculty.find(f => f.id === sorted[0][0]) : null;

      return {
        text: `${salutation}, poore portal ka load summary ye raha:\n\n• 👨‍🏫 Total Faculty: ${faculty.length}\n• 🎓 Total Batches: ${batches.length}\n• 📚 Total Weekly Loads: ${loads.length}\n• ❌ Total Cancelled: ${cancelledClasses.length}\n• ⚡ Total Extra: ${extraClasses.length}\n${topFaculty ? `\n🔥 Highest Workload: ${topFaculty.name} (${sorted[0][1]} classes/week)` : ''}`,
      };
    }

    // 11. Mail Tracker / Batch Managers
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

    // 12. Jokes & Humor (Casual Friend Mode - Flash)
    if (q.includes('joke') || q.includes('chutkula') || q.includes('masti')) {
      const jokes = [
        `Sun Flash bhai! Ek student ne exam me likha: "Bhagwan sab janta hai!"\nTeacher ne result me likha: "Bhagwan ko 100 me se 100, aur beta tumhein agle saal phir se!" 😂`,
        `Flash mere yaar, ek developer ne doctor se kaha: "Doctor sahab, mera dimaag 404 Not Found error de raha hai!"\nDoctor: "Bhai coffee piyo aur browser cache clear karo!" 🤣`,
        `Student: "Sir, exam me out of syllabus questions kyu aate hain?"\nTeacher: "Taaki beta tumhein pata chale ki duniya kitni badi hai aur tumhein kitna kam aata hai!" 😆`,
      ];
      return {
        text: jokes[Math.floor(Math.random() * jokes.length)],
      };
    }

    // 13. Casual Conversation (Flash Buddy Mode)
    if (isCasualChitChat) {
      const casualReplies = [
        `Arre Flash mere bhai! Ekdum first class! Tu bata, chai-pani hua ya abhi coding aur portal manage karne me hi busy hai? 😎`,
        `Flash bhai zindabad! Tera bhai 24/7 online hai. Bata aaj kya dhasu plan hai?`,
        `Chill kar Flash bhai! Jab tak tera ye AI dost yahan hai, load lene ka nahi sirf faculty ka load dene ka! 😉`,
      ];
      return {
        text: casualReplies[Math.floor(Math.random() * casualReplies.length)],
      };
    }

    // Default Fallback
    return {
      text: `${salutation}, maine poora portal check kiya. Aap mujhse kisi bhi teacher ka schedule ("Dr. Sharma ki classes"), batch timetable ("CS-A schedule"), room status ("Room 101"), cancelled classes, ya free teachers pooch sakte hain. Main turant real data se bata dunga!`,
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

    // Optional Gemini API key if provided
    if (apiKey.trim()) {
      try {
        const portalSummary = `User's Name: Krishna Ji (also known as Flash in casual conversation).
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
If query is casual/fun/joke/friendly, address as "Flash" or "Flash bhai".
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
        text: 'Chat fresh ho gayi Krishna Ji! Bataiye ab kya jankari chahiye? 🚀',
        timestamp: new Date(),
        personaUsed: persona,
      },
    ]);
  };

  const personaConfig = {
    man: {
      name: 'Kabir (Real Man)',
      icon: '🧔',
      role: 'Brotherly & Confident',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    woman: {
      name: 'Ananya (Real Woman)',
      icon: '👩',
      role: 'Sweet & Expressive',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    child: {
      name: 'Chhotu (Real Child)',
      icon: '👦',
      role: 'Playful & Cute',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
  };

  const quickPrompts = [
    { label: 'Aaj ka timetable? 📅', query: 'Aaj ka schedule kya hai?' },
    { label: 'Cancelled classes? ❌', query: 'Kitni classes cancel hui hain?' },
    { label: 'Kaun faculty free hai? 👨‍🏫', query: 'Aaj kaun kaun free hai?' },
    { label: 'Extra classes? ⚡', query: 'Extra classes list batao' },
    { label: 'Highest workload? 🔥', query: 'Sabse zyada load kiska hai?' },
    { label: 'Flash ek joke sunao! 😂', query: 'Flash bhai ek badhiya joke sunao' },
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all duration-300 border border-white/25"
            title="Talk to AI Portal Assistant"
          >
            {/* Live Indicator Pulse */}
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
              <p className="text-[10px] text-white/80 font-medium">Boliye ya Poochiye 🎙️</p>
            </div>
          </button>
        </div>
      )}

      {/* Main Chat Drawer */}
      {isOpen && (
        <div
          className={`fixed right-3 sm:right-6 bottom-3 sm:bottom-6 z-50 transition-all duration-300 shadow-2xl rounded-3xl overflow-hidden border border-slate-700/70 bg-slate-900/95 backdrop-blur-2xl flex flex-col text-white ${
            isMinimized ? 'w-80 h-16' : 'w-[94vw] sm:w-[430px] h-[610px] max-h-[90vh]'
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
                      <span>Krishna Ji ke liye ready • 100% Portal Access</span>
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
              {/* Voice Persona Selector Bar (Man / Woman / Child) */}
              <div className="px-3.5 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-semibold">Voice Persona:</span>
                <div className="flex items-center gap-1.5 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
                  <button
                    onClick={() => handlePersonaChange('man')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      persona === 'man'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🧔 Man</span>
                  </button>

                  <button
                    onClick={() => handlePersonaChange('woman')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      persona === 'woman'
                        ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>👩 Woman</span>
                  </button>

                  <button
                    onClick={() => handlePersonaChange('child')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      persona === 'child'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>👦 Child</span>
                  </button>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-700">
                {messages.map((m) => {
                  const isUser = m.sender === 'user';
                  return (
                    <div
                      key={m.id}
                      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5 shadow-md">
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

                        {/* Interactive Navigation Button */}
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

                {/* Live Speaking Indicator Wave */}
                {isSpeaking && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/90 border border-cyan-500/40 rounded-xl w-fit shadow-lg animate-fadeIn">
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

              {/* Quick Prompts Bar */}
              <div className="px-3 py-2 bg-slate-950/70 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p.query)}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 text-[11px] font-medium border border-slate-700/80 transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
                {/* Voice Input (Microphone) */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-2.5 rounded-xl transition-all duration-300 ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50 scale-110'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                  title={isListening ? 'Listening... Tap to stop' : 'Microphone se boliye (Krishna Ji / Flash)'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  placeholder={
                    isListening
                      ? 'Krishna Ji boliye... main sun raha hoon...'
                      : 'Kuch bhi poochiye (e.g. Dr. Sharma ki class, free faculty)...'
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
