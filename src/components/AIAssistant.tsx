import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
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
  HelpCircle,
  Flame,
  Settings,
  ChevronDown,
  Calendar,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Radio,
} from 'lucide-react';
import type { Faculty, Batch, FacultyLoadWithDetails, ExtraClassWithDetails, RescheduledClassWithDetails, CancelledClassWithDetails } from '@/lib/supabase';

interface AIAssistantProps {
  faculty: Faculty[];
  batches: Batch[];
  loads: FacultyLoadWithDetails[];
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

export function AIAssistant({
  faculty,
  batches,
  loads,
  extraClasses,
  rescheduledClasses,
  cancelledClasses,
  onNavigateTab,
}: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    return [
      {
        id: '1',
        sender: 'assistant',
        text: 'Arre bhai! Kya haal chaal? 👋 Main tera AI buddy Kabir hoon. Portal ka koi bhi scene ho—class cancel, extra class, reschedule ya kaun faculty free hai—apne bhai se bina jhijhak pooch!',
        timestamp: new Date(),
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

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  // Load and prioritize natural real male voices
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      // Filter and prioritize male and Indian / Hindi voices
      setAvailableVoices(voices);

      if (!selectedVoiceURI) {
        // Preferred order for real male voices:
        // 1. Indian English / Hindi male voices (Rishi, Hemant, Prabhat, Google हिन्दी)
        // 2. Natural English male voices (Daniel, Oliver, Tom, George, Alex, Arthur)
        // 3. Any voice having "male" in its name
        const preferred = voices.find(v => 
          (v.name.includes('Rishi') || v.name.includes('Hemant') || v.name.includes('Prabhat') || v.name.includes('Daniel') || v.name.includes('Oliver') || v.name.includes('Tom')) &&
          !v.name.toLowerCase().includes('female')
        ) || voices.find(v => 
          (v.lang === 'en-IN' || v.lang === 'hi-IN') && !v.name.toLowerCase().includes('female')
        ) || voices.find(v => 
          v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('female')
        ) || voices.find(v => 
          v.lang.startsWith('en') && (v.name.includes('Alex') || v.name.includes('Fred') || v.name.includes('David'))
        ) || voices[0];

        if (preferred) {
          setSelectedVoiceURI(preferred.voiceURI);
          localStorage.setItem('ai_buddy_selected_voice', preferred.voiceURI);
        }
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [selectedVoiceURI]);

  // Voice speech synthesis handler
  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

    // Clean text for speech (remove markdown symbols, emojis, and URLs)
    const cleanSpeech = text
      .replace(/[*_#`~]/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanSpeech) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    
    // Find selected male voice
    const voice = availableVoices.find(v => v.voiceURI === selectedVoiceURI) || 
      availableVoices.find(v => v.name.includes('Rishi') || v.name.includes('Daniel') || v.name.toLowerCase().includes('male'));
    
    if (voice) {
      utterance.voice = voice;
    }

    // Realistic male voice tuning: slightly lower pitch for warm masculine resonance
    utterance.pitch = 0.94;
    utterance.rate = 1.02; // natural pace
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

  // Speech Recognition (Mic Voice Input)
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Bhai aapke browser me Speech Recognition support nahi hai. Chrome ya Edge use karo mast chalega!');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN'; // recognizes Hinglish / Hindi & English words
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

  // Local Portal-Aware Hinglish Intelligence Engine
  const generateHinglishResponse = (query: string): { text: string; action?: { label: string; action: () => void } } => {
    const lower = query.toLowerCase().trim();
    const today = DAYS[new Date().getDay()];

    // 1. Cancelled Classes
    if (lower.includes('cancel') || lower.includes('radd') || lower.includes('cancelled')) {
      const totalCancelled = cancelledClasses.length;
      if (totalCancelled === 0) {
        return {
          text: `Bhai koi bhi class cancel nahi hui hai abhi! Sab schedule ke hisab se mast chal raha hai. Kisi aur cheez ki info chahiye to bata! 🎉`,
          action: onNavigateTab ? {
            label: 'View Extra & Reschedule',
            action: () => onNavigateTab('extraReschedule'),
          } : undefined,
        };
      }

      const recentCancelled = cancelledClasses.slice(0, 3).map(c => 
        `• ${c.faculty?.name || 'Faculty'} (${c.subject}) - Date: ${c.cancellation_date || 'N/A'}${c.reason ? ` [Wajah: ${c.reason}]` : ''}`
      ).join('\n');

      return {
        text: `Bhai total ${totalCancelled} class(es) cancel hui hain. Dekh details:\n\n${recentCancelled}\n\nAgar poori list dekhni ho ya filter lagana ho to Extra & Reschedule section me chalte hain!`,
        action: onNavigateTab ? {
          label: 'Open Cancelled Classes Tab',
          action: () => onNavigateTab('extraReschedule'),
        } : undefined,
      };
    }

    // 2. Extra Classes
    if (lower.includes('extra') || lower.includes('additional class')) {
      const totalExtra = extraClasses.length;
      if (totalExtra === 0) {
        return {
          text: `Bhai abhi koi extra class schedule nahi hai! Sab normal timetable follow kar rahe hain.`,
        };
      }
      const list = extraClasses.slice(0, 3).map(e => 
        `• ${e.faculty?.name || 'Faculty'} - ${e.subject} (${e.date} | ${e.start_time}-${e.end_time} Room: ${e.room || 'TBD'})`
      ).join('\n');

      return {
        text: `Bhai total ${totalExtra} extra class(es) lagi hui hain. Ye check kar:\n\n${list}\n\nSab sorted hai na?`,
        action: onNavigateTab ? {
          label: 'View Extra Classes',
          action: () => onNavigateTab('extraReschedule'),
        } : undefined,
      };
    }

    // 3. Rescheduled Classes
    if (lower.includes('reschedule') || lower.includes('shift') || lower.includes('timing change')) {
      const totalRescheduled = rescheduledClasses.length;
      if (totalRescheduled === 0) {
        return {
          text: `Bhai koi bhi class reschedule nahi hui hai. Sab apne fixed slots par hi ho rahi hain!`,
        };
      }
      const list = rescheduledClasses.slice(0, 3).map(r => 
        `• ${r.faculty?.name || 'Faculty'} (${r.subject}) -> Shift to: ${r.new_day} (${r.new_date}), Time: ${r.new_start_time}-${r.new_end_time}`
      ).join('\n');

      return {
        text: `Bhai total ${totalRescheduled} class(es) reschedule hui hain. Ye dekh:\n\n${list}`,
        action: onNavigateTab ? {
          label: 'Check Rescheduled Tab',
          action: () => onNavigateTab('extraReschedule'),
        } : undefined,
      };
    }

    // 4. Today's Classes & Schedule
    if (lower.includes('aaj') || lower.includes('today') || lower.includes('schedule') || lower.includes('timetable')) {
      const todayLoads = loads.filter(l => l.day_of_week.toLowerCase() === today.toLowerCase());
      if (todayLoads.length === 0) {
        return {
          text: `Bhai aaj (${today}) koi regular lecture load mapped nahi dikh raha hai! Ya to chhutti ka scene hai ya extra class check karni padegi.`,
        };
      }

      const sample = todayLoads.slice(0, 4).map(l => 
        `• ${l.faculty?.name || 'Faculty'} | ${l.subject} | ${l.start_time}-${l.end_time} (Batch: ${l.batch?.name || 'All'})`
      ).join('\n');

      return {
        text: `Bhai aaj ${today} ko total ${todayLoads.length} classes scheduled hain! Kuch main lectures ye rahe:\n\n${sample}\n\nPoora timetable Dashboard ya Faculty Availability me dekh sakta hai!`,
        action: onNavigateTab ? {
          label: 'Open Dashboard',
          action: () => onNavigateTab('dashboard'),
        } : undefined,
      };
    }

    // 5. Free Faculty / Availability
    if (lower.includes('free') || lower.includes('available') || lower.includes('khali') || lower.includes('kaun free')) {
      const busyFacultyIds = new Set(
        loads
          .filter(l => l.day_of_week.toLowerCase() === today.toLowerCase())
          .map(l => l.faculty_id)
      );

      const freeFaculties = faculty.filter(f => !busyFacultyIds.has(f.id));

      if (freeFaculties.length === 0) {
        return {
          text: `Bhai aaj ${today} sabhi faculties busy hain! Sabki class lagi hui hai. Kisi specific time slot ka check karna hai to Faculty Availability tab open karke dekhle!`,
          action: onNavigateTab ? {
            label: 'Check Availability Tab',
            action: () => onNavigateTab('facultyAvailability'),
          } : undefined,
        };
      }

      const names = freeFaculties.slice(0, 5).map(f => `• ${f.name} (${f.department})`).join('\n');
      return {
        text: `Bhai aaj ${today} lagbhag ${freeFaculties.length} faculty members free hain jinka koi lecture mapped nahi hai:\n\n${names}\n\nAgar extra class arrange karni ho to inse contact kar le! 😉`,
        action: onNavigateTab ? {
          label: 'Open Faculty Availability',
          action: () => onNavigateTab('facultyAvailability'),
        } : undefined,
      };
    }

    // 6. Faculty Load stats / Summary
    if (lower.includes('load') || lower.includes('highest') || lower.includes('kitni faculty') || lower.includes('total faculty')) {
      const totalFac = faculty.length;
      const totalBatches = batches.length;
      const totalLoads = loads.length;

      return {
        text: `Bhai poore portal ka quick load report ye raha:\n\n• 👨‍🏫 Total Faculty: ${totalFac}\n• 🎓 Total Batches: ${totalBatches}\n• 📚 Total Active Loads: ${totalLoads}\n• ⚡ Extra Classes: ${extraClasses.length}\n• ❌ Cancelled Classes: ${cancelledClasses.length}\n\nKaunse teacher ka individual load check karna hai bhai, naam bata de!`,
      };
    }

    // 7. Jokes & Friendly Chit-chat
    if (lower.includes('joke') || lower.includes('masti') || lower.includes('hansi') || lower.includes('chutkula')) {
      const jokes = [
        `Sun bhai! Ek student ne teacher se poocha: "Sir, kya aap mujhe us galti ki saza denge jo maine ki hi nahi?"\nTeacher: "Bilkul nahi beta!"\nStudent: "Badhiya sir, maine aaj homework hi nahi kiya!" 😂`,
        `Bhai ek developer ne doctor se bola: "Mujhe aisi bimari hai jisme main raat bhar sota nahi aur subah code push karta hoon!"\nDoctor: "Bhai ye bimari nahi, ise CSE engineering kehte hain!" 🤣`,
        `Teacher: "Beta agar 5 me se 2 apple kha liye to kya bacha?"\nStudent: "Sir pet me dard aur mummy ki daant!" 😆`,
      ];
      const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
      return { text: randomJoke };
    }

    // 8. Greetings & Casual Banter
    if (lower.includes('hi') || lower.includes('hello') || lower.includes('kya haal') || lower.includes('kaise ho') || lower.includes('hey')) {
      return {
        text: `Sab mast bhai! Ekdum zordar chal raha hai. Tu bata tera din kaisa ja raha hai? Portal me koi class schedule karni hai ya workload check karna hai?`,
      };
    }

    if (lower.includes('kaun ho') || lower.includes('who are you') || lower.includes('naam')) {
      return {
        text: `Main hoon Kabir! Tera personal AI assistant aur portal buddy. Tujhe faculty load, cancelled classes, timetable aur teacher availability sab second me bata sakta hoon. Aur haan, jab bore ho to baatein bhi mast karta hoon! 😎`,
      };
    }

    if (lower.includes('shukriya') || lower.includes('thank') || lower.includes('dhanyawad') || lower.includes('badhiya')) {
      return {
        text: `Arre bhai! Dosti me no sorry, no thank you! Kabhi bhi koi dikkat ho, apne bhai ko yaad karna. Anytime ready! 👊`,
      };
    }

    // Default Fallback
    return {
      text: `Samajh gaya bhai! Dekh agar tujhe portal se related kuch poochna hai—jaise "Aaj kitni class hain?", "Kaun si class cancel hui?", "Kaun faculty free hai?", ya "Ek joke sunao"—to bas bol ya type kar. Tere bhai ke paas har sawaal ka jawaab hai! 🔥`,
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

    // If Gemini API key is configured, we could optionally call it,
    // otherwise our custom Hinglish intelligence handles it instantly!
    let responseText = '';
    let actionItem: { label: string; action: () => void } | undefined;

    if (apiKey.trim()) {
      try {
        const portalContext = `You are Kabir, a super friendly Indian college buddy/brother assistant for Faculty Load Portal.
Speak in natural, warm, lively Hinglish (Hindi + English) with words like "bhai", "yaar", "tension mat le", "sorted hai".
Data summary:
Total Faculty: ${faculty.length}
Total Batches: ${batches.length}
Total Class Loads: ${loads.length}
Cancelled Classes: ${cancelledClasses.length}
Extra Classes: ${extraClasses.length}
Today is: ${DAYS[new Date().getDay()]}`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: `${portalContext}\n\nUser asked: "${query}". Reply as Kabir in friendly, warm Hinglish (keep it concise, 2-3 sentences max).` }
                ]
              }
            ]
          })
        });

        if (res.ok) {
          const data = await res.json();
          responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (e) {
        console.warn('Gemini API call failed, falling back to local engine:', e);
      }
    }

    if (!responseText) {
      const localResult = generateHinglishResponse(query);
      responseText = localResult.text;
      actionItem = localResult.action;
    }

    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'assistant',
      text: responseText,
      timestamp: new Date(),
      quickAction: actionItem,
    };

    setMessages(prev => [...prev, botMsg]);

    // Speak response with real male voice
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
        text: 'Chat fresh ho gayi bhai! Bata ab kya scene hai, kisme madad chahiye? 🚀',
        timestamp: new Date(),
      },
    ]);
  };

  const quickPrompts = [
    { label: 'Aaj ka schedule? 📅', query: 'Aaj ka schedule kya hai?' },
    { label: 'Cancelled classes? ❌', query: 'Kitni classes cancel hui hain?' },
    { label: 'Kaun free hai? 👨‍🏫', query: 'Aaj kaun kaun faculty free hai?' },
    { label: 'Extra class list? ⚡', query: 'Extra classes batao' },
    { label: 'Ek joke sunao! 😂', query: 'Bhai ek badhiya joke sunao' },
  ];

  return (
    <>
      {/* Floating Action Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20"
            title="Talk to Kabir (AI Buddy)"
          >
            {/* Animated Pulse Ring */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
            </span>

            {/* Avatar / Icon */}
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-base shadow-inner">
              👨‍💻
            </div>

            <div className="text-left pr-1">
              <p className="text-xs font-black tracking-wide leading-tight flex items-center gap-1">
                Kabir AI <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-300 font-normal">Hinglish</span>
              </p>
              <p className="text-[10px] text-white/80 font-medium">Bhai se baat karo</p>
            </div>
          </button>
        </div>
      )}

      {/* Main Chat Drawer / Modal */}
      {isOpen && (
        <div
          className={`fixed right-4 sm:right-6 bottom-4 sm:bottom-6 z-50 transition-all duration-300 shadow-2xl rounded-3xl overflow-hidden border border-slate-700/60 bg-slate-900/95 backdrop-blur-xl flex flex-col text-white ${
            isMinimized ? 'w-80 h-16' : 'w-[92vw] sm:w-[410px] h-[580px] max-h-[88vh]'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-center justify-between select-none">
            <div className="flex items-center gap-3">
              {/* Avatar with speaking wave */}
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-xl shadow-lg border border-white/20">
                  👨‍💻
                </div>
                {isSpeaking && (
                  <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500 border border-slate-900"></span>
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-1">
                    Kabir (Tera AI Buddy)
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <p className="text-[11px] text-slate-300 font-medium">
                    {isSpeaking ? (
                      <span className="text-cyan-400 flex items-center gap-1">
                        <Radio className="w-3 h-3 animate-pulse" /> Speaking...
                      </span>
                    ) : (
                      'Online • Real Male Voice'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-1">
              {/* Voice Mute / Unmute */}
              <button
                onClick={toggleVoice}
                className={`p-1.5 rounded-lg transition-colors ${
                  voiceEnabled
                    ? 'text-cyan-400 hover:bg-cyan-500/20'
                    : 'text-slate-400 hover:bg-slate-800 line-through'
                }`}
                title={voiceEnabled ? 'Voice Mute karein' : 'Voice Unmute karein'}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Settings */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-lg transition-colors ${
                  showSettings ? 'text-amber-400 bg-slate-800' : 'text-slate-400 hover:bg-slate-800'
                }`}
                title="Voice & Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Minimize */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors"
                title={isMinimized ? 'Maximize' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>

              {/* Close */}
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
              {/* Settings Dropdown / Drawer */}
              {showSettings && (
                <div className="p-3.5 bg-slate-800/90 border-b border-slate-700/80 text-xs space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between font-bold text-slate-200">
                    <span>Voice & Assistant Settings</span>
                    <button
                      onClick={clearChat}
                      className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Clear Chat
                    </button>
                  </div>

                  {/* Voice Selector */}
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Male Voice Selection (System Voices):
                    </label>
                    <select
                      value={selectedVoiceURI}
                      onChange={(e) => {
                        setSelectedVoiceURI(e.target.value);
                        localStorage.setItem('ai_buddy_selected_voice', e.target.value);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                    >
                      {availableVoices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Optional Gemini Key */}
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Optional: Google Gemini API Key (Unlimited General AI):
                    </label>
                    <input
                      type="password"
                      placeholder="Paste AIzaSy... (Khali chhod sakte hain)"
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

              {/* Chat Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-700">
                {messages.map((m) => {
                  const isUser = m.sender === 'user';
                  return (
                    <div
                      key={m.id}
                      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5 shadow-md">
                          👨‍💻
                        </div>
                      )}

                      <div
                        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-sm ${
                          isUser
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none'
                            : 'bg-slate-800/90 border border-slate-700/70 text-slate-100 rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-line">{m.text}</p>

                        {/* Quick Action Button if present */}
                        {m.quickAction && (
                          <div className="mt-2.5 pt-2 border-t border-slate-700/80">
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
                        <div className="w-7 h-7 rounded-xl bg-slate-700 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                          <User className="w-4 h-4 text-slate-300" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Animated Speaking Wave Indicator */}
                {isSpeaking && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 border border-cyan-500/30 rounded-xl w-fit">
                    <span className="text-[11px] text-cyan-300 font-semibold flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                      Kabir bol raha hai...
                    </span>
                    <div className="flex items-center gap-0.5">
                      <span className="w-1 h-3 bg-cyan-400 animate-bounce rounded-full" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-4 bg-cyan-400 animate-bounce rounded-full" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-2 bg-cyan-400 animate-bounce rounded-full" style={{ animationDelay: '300ms' }} />
                    </div>
                    <button
                      onClick={stopSpeaking}
                      className="ml-2 px-2 py-0.5 rounded text-[10px] bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold border border-red-500/30"
                    >
                      Chup karo
                    </button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts Chips */}
              <div className="px-3 py-2 bg-slate-900/60 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p.query)}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-blue-600/30 text-slate-300 hover:text-blue-200 text-[11px] font-medium border border-slate-700/80 transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Input Bar */}
              <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center gap-2">
                {/* Voice Input (Mic) */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-2.5 rounded-xl transition-all duration-300 ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                  title={isListening ? 'Listening... Tap to stop' : 'Bol kar baat karein (Microphone)'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  placeholder={isListening ? 'Bhai sun raha hai... Bolo...' : 'Hinglish me pooch apne bhai se...'}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />

                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!inputText.trim()}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:hover:from-blue-600 disabled:hover:to-indigo-600 transition-all duration-300 hover:scale-105 active:scale-95 shadow-md"
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
