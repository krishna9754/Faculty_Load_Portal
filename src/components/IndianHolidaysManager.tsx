import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Faculty, Batch, FacultyLoadWithDetails, ExtraClassWithDetails } from '@/lib/supabase';
import { AnimeMascot } from '@/components/AnimeMascot';
import * as XLSX from 'xlsx';
import {
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  Clock,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  BookOpen,
  MapPin,
  ChevronDown,
  Info,
  CalendarCheck,
  Building2,
} from 'lucide-react';

export type IndianHoliday = {
  id: string;
  name: string;
  nameHindi: string;
  date: string; // YYYY-MM-DD
  type: 'Gazetted' | 'Restricted' | 'College Break' | 'Custom';
  description?: string;
  icon?: string;
};

// Official Indian Gazetted & National Holidays (2025, 2026, 2027)
export const DEFAULT_INDIAN_HOLIDAYS: IndianHoliday[] = [
  // 2026 Academic Year
  { id: 'h-2026-01-26', name: 'Republic Day', nameHindi: 'गणतंत्र दिवस', date: '2026-01-26', type: 'Gazetted', icon: '🇮🇳', description: 'National Holiday celebrating Constitution of India' },
  { id: 'h-2026-02-15', name: 'Maha Shivratri', nameHindi: 'महाशिवरात्रि', date: '2026-02-15', type: 'Gazetted', icon: '🔱', description: 'Great Night of Shiva' },
  { id: 'h-2026-03-03', name: 'Holi / Dhulandi', nameHindi: 'होली / धुलंडी', date: '2026-03-03', type: 'Gazetted', icon: '🎨', description: 'National Festival of Colors' },
  { id: 'h-2026-03-20', name: 'Id-ul-Fitr', nameHindi: 'ईद-उल-फ़ित्र', date: '2026-03-20', type: 'Gazetted', icon: '🌙', description: 'Celebration of Eid' },
  { id: 'h-2026-03-27', name: 'Ram Navami', nameHindi: 'राम नवमी', date: '2026-03-27', type: 'Gazetted', icon: '🏹', description: 'Birth of Lord Rama' },
  { id: 'h-2026-03-31', name: 'Mahavir Jayanti', nameHindi: 'महावीर जयंती', date: '2026-03-31', type: 'Gazetted', icon: '🪷', description: 'Birth of Lord Mahavira' },
  { id: 'h-2026-04-03', name: 'Good Friday', nameHindi: 'गुड फ्राइडे', date: '2026-04-03', type: 'Gazetted', icon: '✝️', description: 'Christian Holy Friday' },
  { id: 'h-2026-05-01', name: 'Buddha Purnima / May Day', nameHindi: 'बुद्ध पूर्णिमा / मजदूर दिवस', date: '2026-05-01', type: 'Gazetted', icon: '☸️', description: 'Birth and enlightenment of Buddha' },
  { id: 'h-2026-05-27', name: 'Id-ul-Zuha (Bakrid)', nameHindi: 'बकरीद (ईद-उल-जुहा)', date: '2026-05-27', type: 'Gazetted', icon: '🐑', description: 'Feast of the Sacrifice' },
  { id: 'h-2026-06-26', name: 'Muharram', nameHindi: 'मोहर्रम', date: '2026-06-26', type: 'Gazetted', icon: '🕌', description: 'First month of Islamic calendar' },
  { id: 'h-2026-08-15', name: 'Independence Day', nameHindi: 'स्वतंत्रता दिवस', date: '2026-08-15', type: 'Gazetted', icon: '🇮🇳', description: 'Indian Independence Day Celebration' },
  { id: 'h-2026-09-04', name: 'Janmashtami', nameHindi: 'श्रीकृष्ण जन्माष्टमी', date: '2026-09-04', type: 'Gazetted', icon: '🦚', description: 'Birth of Lord Krishna' },
  { id: 'h-2026-09-25', name: 'Milad-un-Nabi', nameHindi: 'मिलाद-उन-नबी', date: '2026-09-25', type: 'Gazetted', icon: '✨', description: 'Prophet Muhammad Birthday' },
  { id: 'h-2026-10-02', name: 'Mahatma Gandhi Jayanti', nameHindi: 'महात्मा गांधी जयंती', date: '2026-10-02', type: 'Gazetted', icon: '🕊️', description: 'National Holiday honouring Mahatma Gandhi' },
  { id: 'h-2026-10-20', name: 'Dussehra (Vijayadashami)', nameHindi: 'दशहरा (विजयादशमी)', date: '2026-10-20', type: 'Gazetted', icon: '🏹', description: 'Victory of Good over Evil' },
  { id: 'h-2026-11-08', name: 'Diwali (Deepawali)', nameHindi: 'दीपावली (लक्ष्मी पूजन)', date: '2026-11-08', type: 'Gazetted', icon: '🪔', description: 'Festival of Lights' },
  { id: 'h-2026-11-09', name: 'Govardhan Puja', nameHindi: 'गोवर्धन पूजा', date: '2026-11-09', type: 'Restricted', icon: '⛰️', description: 'Annakut Puja' },
  { id: 'h-2026-11-10', name: 'Bhai Dooj', nameHindi: 'भाई दूज', date: '2026-11-10', type: 'Restricted', icon: '🎁', description: 'Celebration of brother-sister bond' },
  { id: 'h-2026-11-24', name: 'Guru Nanak Jayanti', nameHindi: 'गुरु नानक जयंती (गुरपूरब)', date: '2026-11-24', type: 'Gazetted', icon: '☬', description: 'Gurpurab celebrating Guru Nanak Dev Ji' },
  { id: 'h-2026-12-25', name: 'Christmas Day', nameHindi: 'क्रिसमस', date: '2026-12-25', type: 'Gazetted', icon: '🎄', description: 'Celebration of Christmas' },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDateClean(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      weekday: 'short',
    });
  } catch (e) {
    return dateStr;
  }
}

export interface IndianHolidaysManagerProps {
  faculty: Faculty[];
  batches: Batch[];
  loads: FacultyLoadWithDetails[];
  extraClasses: ExtraClassWithDetails[];
  onChange: () => void;
}

export function IndianHolidaysManager({
  faculty,
  batches,
  loads,
  extraClasses,
  onChange,
}: IndianHolidaysManagerProps) {
  // Custom holidays from localStorage
  const [customHolidays, setCustomHolidays] = useState<IndianHoliday[]>(() => {
    try {
      const saved = localStorage.getItem('academic_custom_holidays');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const allHolidays = useMemo(() => {
    const combined = [...DEFAULT_INDIAN_HOLIDAYS, ...customHolidays];
    return combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [customHolidays]);

  // Tab filter: 'all' | 'upcoming' | 'specialClasses'
  const [viewFilter, setViewFilter] = useState<'upcoming' | 'all' | 'specialClasses'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Modals state
  const [specialClassModalOpen, setSpecialClassModalOpen] = useState(false);
  const [customHolidayModalOpen, setCustomHolidayModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states for Special Holiday Class Entry
  const [selectedHolidayId, setSelectedHolidayId] = useState<string>('');
  const [customDate, setCustomDate] = useState<string>('');
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:30');
  const [room, setRoom] = useState('Room-101');
  const [reason, setReason] = useState('Syllabus Revision on Holiday');

  // Form states for Custom Holiday
  const [newHoliName, setNewHoliName] = useState('');
  const [newHoliHindi, setNewHoliHindi] = useState('');
  const [newHoliDate, setNewHoliDate] = useState('');
  const [newHoliType, setNewHoliType] = useState<'Gazetted' | 'Restricted' | 'College Break' | 'Custom'>('College Break');
  const [newHoliDesc, setNewHoliDesc] = useState('');

  // Identify Extra Classes that are scheduled on Holidays
  const holidaySpecialClasses = useMemo(() => {
    const holidayDateSet = new Set(allHolidays.map(h => h.date));
    return extraClasses.filter(ec => {
      const isHolidayDate = holidayDateSet.has(ec.date);
      const hasHolidayReason = String(ec.reason || '').toLowerCase().includes('holiday');
      return isHolidayDate || hasHolidayReason;
    });
  }, [extraClasses, allHolidays]);

  // Group Special Classes by session (faculty + subject + date + time)
  const groupedHolidayClasses = useMemo(() => {
    const map = new Map<string, {
      ids: string[];
      faculty: { name: string; department: string; branch: string | null };
      batchNames: string[];
      subject: string;
      date: string;
      start_time: string;
      end_time: string;
      room: string | null;
      reason: string | null;
      holidayInfo?: IndianHoliday;
    }>();

    for (const ec of holidaySpecialClasses) {
      const key = `${ec.faculty_id}__${ec.subject}__${ec.date}__${ec.start_time}__${ec.end_time}`;
      const holidayInfo = allHolidays.find(h => h.date === ec.date);
      if (map.has(key)) {
        const item = map.get(key)!;
        if (!item.batchNames.includes(ec.batch.name)) item.batchNames.push(ec.batch.name);
        item.ids.push(ec.id);
      } else {
        map.set(key, {
          ids: [ec.id],
          faculty: ec.faculty,
          batchNames: [ec.batch.name],
          subject: ec.subject,
          date: ec.date,
          start_time: ec.start_time,
          end_time: ec.end_time,
          room: ec.room,
          reason: ec.reason,
          holidayInfo,
        });
      }
    }
    return Array.from(map.values());
  }, [holidaySpecialClasses, allHolidays]);

  // Calculate routine class impact for a given date
  const getRoutineClassesSuspendedCount = (dateStr: string): number => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      const dayName = DAYS[d.getDay()];
      const activeLoads = loads.filter(l => {
        if (l.day_of_week.toLowerCase() !== dayName.toLowerCase()) return false;
        if (l.start_date && l.end_date) {
          return dateStr >= l.start_date && dateStr <= l.end_date;
        }
        return true;
      });
      return activeLoads.length;
    } catch {
      return 0;
    }
  };

  // Filtered Holidays list
  const filteredHolidays = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return allHolidays.filter(h => {
      if (viewFilter === 'upcoming' && h.date < todayStr) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = h.name.toLowerCase().includes(q);
        const matchHindi = h.nameHindi.toLowerCase().includes(q);
        const matchDate = h.date.includes(q);
        if (!matchName && !matchHindi && !matchDate) return false;
      }
      if (selectedMonth !== 'all') {
        const m = h.date.split('-')[1];
        if (m !== selectedMonth) return false;
      }
      return true;
    });
  }, [allHolidays, viewFilter, searchQuery, selectedMonth]);

  // Open Special Class modal with pre-selected holiday
  const handleOpenScheduleForHoliday = (holiday: IndianHoliday) => {
    setSelectedHolidayId(holiday.id);
    setCustomDate(holiday.date);
    setReason(`Special Class on ${holiday.name}`);
    setSpecialClassModalOpen(true);
  };

  // Submit Special Holiday Class Entry
  const handleSubmitSpecialClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacultyId) {
      setFeedback({ type: 'error', message: 'Please select a faculty member!' });
      return;
    }
    if (selectedBatchIds.length === 0) {
      setFeedback({ type: 'error', message: 'Please select at least one batch!' });
      return;
    }
    const finalDate = customDate || (allHolidays.find(h => h.id === selectedHolidayId)?.date);
    if (!finalDate) {
      setFeedback({ type: 'error', message: 'Please select a valid holiday date!' });
      return;
    }

    const matchedHoliday = allHolidays.find(h => h.date === finalDate);
    const holidayName = matchedHoliday ? matchedHoliday.name : 'Indian Holiday';

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const inserts = selectedBatchIds.map(batchId => ({
        faculty_id: selectedFacultyId,
        batch_id: batchId,
        subject: subject.trim() || 'Holiday Special Class',
        date: finalDate,
        start_time: startTime,
        end_time: endTime,
        room: room.trim() || 'Room-101',
        reason: `Holiday Special Class (${holidayName}): ${reason.trim()}`,
      }));

      const { error } = await supabase.from('extra_classes').insert(inserts);

      if (error) throw error;

      setFeedback({
        type: 'success',
        message: `Special Holiday Class successfully scheduled on ${holidayName} (${finalDate}) across ${selectedBatchIds.length} batch(es)!`,
      });

      onChange();
      setTimeout(() => {
        setSpecialClassModalOpen(false);
        setFeedback(null);
        setSelectedBatchIds([]);
        setSubject('');
      }, 1500);
    } catch (err: any) {
      console.error('Error scheduling special holiday class:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to schedule holiday class' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Custom Holiday
  const handleAddCustomHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliName.trim() || !newHoliDate) return;

    const newHoli: IndianHoliday = {
      id: `custom-${Date.now()}`,
      name: newHoliName.trim(),
      nameHindi: newHoliHindi.trim() || newHoliName.trim(),
      date: newHoliDate,
      type: newHoliType,
      description: newHoliDesc.trim() || 'College Academic Holiday',
      icon: '🎉',
    };

    const updated = [...customHolidays, newHoli];
    setCustomHolidays(updated);
    localStorage.setItem('academic_custom_holidays', JSON.stringify(updated));
    setCustomHolidayModalOpen(false);
    setNewHoliName('');
    setNewHoliHindi('');
    setNewHoliDate('');
    setNewHoliDesc('');
  };

  // Delete Custom Holiday
  const handleDeleteCustomHoliday = (id: string) => {
    const updated = customHolidays.filter(h => h.id !== id);
    setCustomHolidays(updated);
    localStorage.setItem('academic_custom_holidays', JSON.stringify(updated));
  };

  // Delete/Cancel Special Holiday Class
  const handleDeleteSpecialClass = async (ids: string[]) => {
    if (!window.confirm(`Are you sure you want to cancel this Special Holiday Class? It will be removed from the schedule.`)) {
      return;
    }
    try {
      const { error } = await supabase.from('extra_classes').delete().in('id', ids);
      if (error) throw error;
      onChange();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  // Export Excel Report
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Indian & College Holidays
    const holidayData = allHolidays.map(h => ({
      'Holiday Name (English)': h.name,
      'Holiday Name (Hindi)': h.nameHindi,
      'Date': h.date,
      'Day of Week': DAYS[new Date(h.date + 'T00:00:00').getDay()],
      'Holiday Category': h.type,
      'Regular Classes Suspended': getRoutineClassesSuspendedCount(h.date),
      'Special Classes Scheduled': holidaySpecialClasses.filter(ec => ec.date === h.date).length,
      'Description': h.description || '',
    }));
    const wsHolidays = XLSX.utils.json_to_sheet(holidayData);
    XLSX.utils.book_append_sheet(wb, wsHolidays, 'Indian Holidays 2026');

    // Sheet 2: Special Classes on Holidays
    const specialClassData = groupedHolidayClasses.map(sc => ({
      'Faculty Name': sc.faculty.name,
      'Department': sc.faculty.department,
      'Subject': sc.subject,
      'Batches': sc.batchNames.join(', '),
      'Date': sc.date,
      'Time Slot': `${sc.start_time} - ${sc.end_time}`,
      'Room/Venue': sc.room || 'N/A',
      'Holiday Name': sc.holidayInfo?.name || 'Academic Holiday',
      'Reason': sc.reason || '',
    }));
    const wsSpecial = XLSX.utils.json_to_sheet(specialClassData);
    XLSX.utils.book_append_sheet(wb, wsSpecial, 'Special Holiday Classes');

    XLSX.writeFile(wb, `Indian_Holidays_and_Special_Classes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const nextUpcoming = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return allHolidays.find(h => h.date >= today) || allHolidays[0];
  }, [allHolidays]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-xl border border-purple-500/30 relative overflow-hidden">
        {/* Holographic background glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/40 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
                <span>Indian Holidays & Class Protocols</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                🚫 Routine Classes Off on Holidays
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>भारतीय अवकाश एवं विशेष क्लास प्रबंधन</span>
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed font-sans">
              Indian Gazetted एवं राष्ट्रीय छुट्टियों के दिन नियमित क्लासेस स्वतः स्थगित (Off) रहती हैं।
              यदि किसी फैकल्टी को छुट्टी के दिन विशेष/एक्स्ट्रा क्लास लेनी है, तो नीचे <strong className="text-amber-300">"Special Holiday Class"</strong> की एंट्री करें।
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap self-stretch sm:self-auto">
            <button
              onClick={() => {
                setCustomDate(nextUpcoming?.date || '');
                setSelectedHolidayId(nextUpcoming?.id || '');
                setSpecialClassModalOpen(true);
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-amber-500/30 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
              <span>Schedule Special Holiday Class</span>
            </button>

            <button
              onClick={() => setCustomHolidayModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all duration-200"
            >
              <Calendar className="w-4 h-4 text-purple-300" />
              <span>Add Custom Holiday</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-3.5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all duration-200"
              title="Download Excel Report"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-purple-500/20 text-xs">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-purple-300 uppercase tracking-wider block font-semibold">Total Indian Holidays</span>
            <span className="text-xl font-black text-white mt-0.5 block">{allHolidays.length}</span>
            <span className="text-[10px] text-purple-200/70">Gazetted & Restricted</span>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-purple-300 uppercase tracking-wider block font-semibold">Next Upcoming Holiday</span>
            <span className="text-sm font-black text-amber-300 mt-0.5 block truncate">
              {nextUpcoming?.icon} {nextUpcoming?.name}
            </span>
            <span className="text-[10px] text-purple-200/70">{formatDateClean(nextUpcoming?.date || '')}</span>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-purple-300 uppercase tracking-wider block font-semibold">Special Classes on Holidays</span>
            <span className="text-xl font-black text-amber-400 mt-0.5 block">{groupedHolidayClasses.length}</span>
            <span className="text-[10px] text-purple-200/70">Registered Sessions</span>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-purple-300 uppercase tracking-wider block font-semibold">Routine Class Rule</span>
            <span className="text-sm font-bold text-emerald-400 mt-0.5 block">100% Off / Suspended</span>
            <span className="text-[10px] text-purple-200/70">Auto-marked for faculty</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setViewFilter('upcoming')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewFilter === 'upcoming'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>Upcoming Holidays</span>
          </button>

          <button
            onClick={() => setViewFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewFilter === 'all'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>All Indian Holidays ({allHolidays.length})</span>
          </button>

          <button
            onClick={() => setViewFilter('specialClasses')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewFilter === 'specialClasses'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>Special Holiday Classes</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${viewFilter === 'specialClasses' ? 'bg-slate-950 text-amber-300' : 'bg-amber-100 text-amber-800'}`}>
              {groupedHolidayClasses.length}
            </span>
          </button>
        </div>

        {viewFilter !== 'specialClasses' && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search holiday name, Hindi, date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Months</option>
              <option value="01">January</option>
              <option value="02">February</option>
              <option value="03">March</option>
              <option value="04">April</option>
              <option value="05">May</option>
              <option value="06">June</option>
              <option value="07">July</option>
              <option value="08">August</option>
              <option value="09">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>
        )}
      </div>

      {/* Main View: Special Holiday Classes List */}
      {viewFilter === 'specialClasses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-amber-500" />
              <span>Special Classes Scheduled on Holidays ({groupedHolidayClasses.length})</span>
            </h3>
            <span className="text-xs text-slate-500">
              Only special classes scheduled via holiday protocol appear here
            </span>
          </div>

          {groupedHolidayClasses.length === 0 ? (
            <div className="bg-white/80 rounded-3xl border border-slate-200/80 p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl">
                🏖️
              </div>
              <h4 className="text-base font-bold text-slate-900">No Special Classes Scheduled on Holidays</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                All Indian academic holidays currently have complete holiday status with 0 classes.
                If any teacher wishes to conduct a special revision or make-up class on a holiday, click below.
              </p>
              <button
                onClick={() => setSpecialClassModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule Special Holiday Class</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupedHolidayClasses.map((sc, idx) => (
                <div
                  key={idx}
                  className="bg-white/95 rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-amber-400 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <span>{sc.holidayInfo?.icon || '🏖️'}</span>
                          <span>{sc.holidayInfo?.name || 'Holiday Special Class'}</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 font-bold">
                          {formatDateClean(sc.date)}
                        </span>
                      </div>
                      <h4 className="text-base font-extrabold text-slate-900">
                        {sc.subject}
                      </h4>
                    </div>

                    <button
                      onClick={() => handleDeleteSpecialClass(sc.ids)}
                      title="Cancel this holiday class"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Faculty</span>
                      <span className="font-bold text-slate-800">{sc.faculty.name}</span>
                      <span className="text-[10px] text-slate-500 block truncate">({sc.faculty.department})</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Time & Room</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>{sc.start_time} - {sc.end_time}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{sc.room || 'Room-101'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-semibold">Batches:</span>
                      {sc.batchNames.map((bn, bIdx) => (
                        <span key={bIdx} className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[10px] font-bold text-slate-700">
                          {bn}
                        </span>
                      ))}
                    </div>

                    {sc.reason && (
                      <span className="text-[10px] text-slate-500 italic max-w-[180px] truncate" title={sc.reason}>
                        "{sc.reason}"
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main View: Indian Holidays Grid Cards */}
      {viewFilter !== 'specialClasses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHolidays.map((holiday) => {
            const todayStr = new Date().toISOString().split('T')[0];
            const isToday = holiday.date === todayStr;
            const isPast = holiday.date < todayStr;
            const suspendedLoadsCount = getRoutineClassesSuspendedCount(holiday.date);
            const holidayClassesForThisDay = holidaySpecialClasses.filter(ec => ec.date === holiday.date);

            return (
              <div
                key={holiday.id}
                className={`bg-white/95 rounded-2xl border p-4.5 transition-all duration-200 relative flex flex-col justify-between ${
                  isToday
                    ? 'border-emerald-400 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-400/20'
                    : isPast
                    ? 'border-slate-200/70 opacity-80'
                    : 'border-slate-200/80 shadow-2xs hover:border-purple-300 hover:shadow-md'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Top Bar with Icon, Tag and Type */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl select-none" role="img" aria-label={holiday.name}>
                        {holiday.icon || '🗓️'}
                      </span>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                          {holiday.name}
                        </h4>
                        <p className="text-xs font-medium text-slate-500">
                          {holiday.nameHindi}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                          holiday.type === 'Gazetted'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : holiday.type === 'Restricted'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {holiday.type}
                      </span>
                      {isToday && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500 text-white animate-pulse">
                          Today
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date and Day Badge */}
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    <span>{formatDateClean(holiday.date)}</span>
                  </div>

                  {/* Class Suspension / Impact Info */}
                  <div className="space-y-1.5 text-xs pt-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span className="flex items-center gap-1 text-rose-600 font-semibold">
                        <span>🚫 Routine Classes:</span>
                      </span>
                      <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {suspendedLoadsCount} Suspended
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span className="flex items-center gap-1 font-semibold text-amber-700">
                        <span>⭐ Special Classes:</span>
                      </span>
                      <span className={`font-bold px-2 py-0.5 rounded ${holidayClassesForThisDay.length > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'text-slate-400'}`}>
                        {holidayClassesForThisDay.length} Scheduled
                      </span>
                    </div>

                    {holiday.description && (
                      <p className="text-[11px] text-slate-500 leading-relaxed pt-1 line-clamp-2">
                        {holiday.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Action Button */}
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenScheduleForHoliday(holiday)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200/80 transition-all hover:scale-102 active:scale-98 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Schedule Class on this Holiday</span>
                  </button>

                  {holiday.id.startsWith('custom-') && (
                    <button
                      onClick={() => handleDeleteCustomHoliday(holiday.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Custom Holiday"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL: Schedule Special Holiday Class ================= */}
      {specialClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 inline-block mb-1">
                  Holiday Class Protocol
                </span>
                <h3 className="text-lg font-black text-slate-900">Schedule Special Holiday Class</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record an official special lecture or revision session taking place on a holiday
                </p>
              </div>

              <button
                onClick={() => setSpecialClassModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Holiday Warning Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Important:</strong> Normal routine classes are off on Indian Academic Holidays.
                This form registers an official Special Holiday Session, allocating room and faculty hours.
              </p>
            </div>

            {feedback && (
              <div
                className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmitSpecialClass} className="space-y-4">
              {/* Select Holiday & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Indian Holiday
                  </label>
                  <select
                    value={selectedHolidayId}
                    onChange={(e) => {
                      setSelectedHolidayId(e.target.value);
                      const h = allHolidays.find(item => item.id === e.target.value);
                      if (h) {
                        setCustomDate(h.date);
                        setReason(`Special Class on ${h.name}`);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500 focus:bg-white"
                  >
                    <option value="">-- Choose Indian Holiday --</option>
                    {allHolidays.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.icon} {h.name} ({formatDateClean(h.date)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Class Date
                  </label>
                  <input
                    type="date"
                    required
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Faculty & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Faculty Member *
                  </label>
                  <select
                    required
                    value={selectedFacultyId}
                    onChange={(e) => setSelectedFacultyId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500 focus:bg-white"
                  >
                    <option value="">-- Select Faculty --</option>
                    {faculty.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Advanced Java Revision"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Batches Multi-Select */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Target Batches * ({selectedBatchIds.length} selected)
                </label>
                <div className="max-h-28 overflow-y-auto p-2.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {batches.map((b) => {
                    const isChecked = selectedBatchIds.includes(b.id);
                    return (
                      <label
                        key={b.id}
                        className={`flex items-center gap-2 p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          isChecked ? 'bg-purple-100 text-purple-900 font-bold' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBatchIds([...selectedBatchIds, b.id]);
                            } else {
                              setSelectedBatchIds(selectedBatchIds.filter(id => id !== b.id));
                            }
                          }}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span className="truncate">{b.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots & Room */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Room / Lab
                  </label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="e.g. Lab-3 / Room-101"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Purpose / Reason */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Purpose / Justification
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Midterm syllabus revision & practical evaluation"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSpecialClassModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'Registering...' : 'Register Special Holiday Class'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: Add Custom College Holiday ================= */}
      {customHolidayModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Add Custom College Holiday</h3>
                <p className="text-xs text-slate-500">Record college break, sports day, or local holiday</p>
              </div>
              <button
                onClick={() => setCustomHolidayModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomHoliday} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Holiday Name (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Sports Day / College Fest"
                  value={newHoliName}
                  onChange={(e) => setNewHoliName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Holiday Name (Hindi / Devanagari)
                </label>
                <input
                  type="text"
                  placeholder="e.g. वार्षिक खेल दिवस"
                  value={newHoliHindi}
                  onChange={(e) => setNewHoliHindi(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newHoliDate}
                    onChange={(e) => setNewHoliDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Category
                  </label>
                  <select
                    value={newHoliType}
                    onChange={(e) => setNewHoliType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <option value="College Break">College Break</option>
                    <option value="Gazetted">Gazetted</option>
                    <option value="Restricted">Restricted</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. All lectures suspended for university games"
                  value={newHoliDesc}
                  onChange={(e) => setNewHoliDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCustomHolidayModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md"
                >
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
