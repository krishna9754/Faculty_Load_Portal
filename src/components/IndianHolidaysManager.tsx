import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Faculty, Batch, FacultyLoadWithDetails, ExtraClassWithDetails } from '@/lib/supabase';
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
  XCircle,
  Download,
  BookOpen,
  MapPin,
  ChevronDown,
  ChevronUp,
  Info,
  CalendarCheck,
  Building2,
  Check,
} from 'lucide-react';

export type IndianHoliday = {
  id: string;
  name: string;
  nameHindi?: string;
  date: string; // YYYY-MM-DD
  type: 'Gazetted' | 'Restricted' | 'College Break' | 'Custom';
  description?: string;
  icon?: string;
};

// Official Indian Gazetted & National Holidays (2025, 2026, 2027)
export const DEFAULT_INDIAN_HOLIDAYS: IndianHoliday[] = [
  // ----------------- 2025 Academic Year -----------------
  { id: 'h-2025-01-26', name: 'Republic Day', date: '2025-01-26', type: 'Gazetted', icon: '🇮🇳', description: 'National Holiday celebrating Constitution of India' },
  { id: 'h-2025-02-26', name: 'Maha Shivratri', date: '2025-02-26', type: 'Gazetted', icon: '🔱', description: 'Celebration of Lord Shiva' },
  { id: 'h-2025-03-14', name: 'Holi / Dhulandi', date: '2025-03-14', type: 'Gazetted', icon: '🎨', description: 'National Festival of Colors' },
  { id: 'h-2025-03-31', name: 'Id-ul-Fitr', date: '2025-03-31', type: 'Gazetted', icon: '🌙', description: 'Celebration of Eid' },
  { id: 'h-2025-04-06', name: 'Ram Navami', date: '2025-04-06', type: 'Gazetted', icon: '🏹', description: 'Birth of Lord Rama' },
  { id: 'h-2025-04-10', name: 'Mahavir Jayanti', date: '2025-04-10', type: 'Gazetted', icon: '🪷', description: 'Birth of Lord Mahavira' },
  { id: 'h-2025-04-18', name: 'Good Friday', date: '2025-04-18', type: 'Gazetted', icon: '✝️', description: 'Christian Holy Friday' },
  { id: 'h-2025-05-12', name: 'Buddha Purnima', date: '2025-05-12', type: 'Gazetted', icon: '☸️', description: 'Birth and Enlightenment of Lord Buddha' },
  { id: 'h-2025-06-07', name: 'Id-ul-Zuha (Bakrid)', date: '2025-06-07', type: 'Gazetted', icon: '🐑', description: 'Feast of Sacrifice' },
  { id: 'h-2025-07-06', name: 'Muharram', date: '2025-07-06', type: 'Gazetted', icon: '🕌', description: 'Islamic Sacred Month' },
  { id: 'h-2025-08-15', name: 'Independence Day', date: '2025-08-15', type: 'Gazetted', icon: '🇮🇳', description: 'National Holiday celebrating Indian Independence' },
  { id: 'h-2025-08-16', name: 'Janmashtami', date: '2025-08-16', type: 'Gazetted', icon: '🦚', description: 'Birth of Lord Krishna' },
  { id: 'h-2025-09-05', name: 'Milad-un-Nabi', date: '2025-09-05', type: 'Gazetted', icon: '✨', description: 'Birthday of Prophet Muhammad' },
  { id: 'h-2025-10-02', name: 'Mahatma Gandhi Jayanti', date: '2025-10-02', type: 'Gazetted', icon: '🕊️', description: 'National Holiday honouring Mahatma Gandhi' },
  { id: 'h-2025-10-02-b', name: 'Dussehra (Vijayadashami)', date: '2025-10-02', type: 'Gazetted', icon: '🏹', description: 'Victory of Good over Evil' },
  { id: 'h-2025-10-20', name: 'Diwali (Deepawali)', date: '2025-10-20', type: 'Gazetted', icon: '🪔', description: 'Festival of Lights' },
  { id: 'h-2025-10-21', name: 'Govardhan Puja', date: '2025-10-21', type: 'Restricted', icon: '⛰️', description: 'Annakut Puja' },
  { id: 'h-2025-10-22', name: 'Bhai Dooj', date: '2025-10-22', type: 'Restricted', icon: '🎁', description: 'Celebration of sibling bond' },
  { id: 'h-2025-11-05', name: 'Guru Nanak Jayanti', date: '2025-11-05', type: 'Gazetted', icon: '☬', description: 'Gurpurab celebrating Guru Nanak Dev Ji' },
  { id: 'h-2025-12-25', name: 'Christmas Day', date: '2025-12-25', type: 'Gazetted', icon: '🎄', description: 'Celebration of Christmas' },

  // ----------------- 2026 Academic Year -----------------
  { id: 'h-2026-01-26', name: 'Republic Day', date: '2026-01-26', type: 'Gazetted', icon: '🇮🇳', description: 'National Holiday celebrating Constitution of India' },
  { id: 'h-2026-02-15', name: 'Maha Shivratri', date: '2026-02-15', type: 'Gazetted', icon: '🔱', description: 'Great Night of Shiva' },
  { id: 'h-2026-03-03', name: 'Holi / Dhulandi', date: '2026-03-03', type: 'Gazetted', icon: '🎨', description: 'National Festival of Colors' },
  { id: 'h-2026-03-20', name: 'Id-ul-Fitr', date: '2026-03-20', type: 'Gazetted', icon: '🌙', description: 'Celebration of Eid' },
  { id: 'h-2026-03-27', name: 'Ram Navami', date: '2026-03-27', type: 'Gazetted', icon: '🏹', description: 'Birth of Lord Rama' },
  { id: 'h-2026-03-31', name: 'Mahavir Jayanti', date: '2026-03-31', type: 'Gazetted', icon: '🪷', description: 'Birth of Lord Mahavira' },
  { id: 'h-2026-04-03', name: 'Good Friday', date: '2026-04-03', type: 'Gazetted', icon: '✝️', description: 'Christian Holy Friday' },
  { id: 'h-2026-05-01', name: 'Buddha Purnima / May Day', date: '2026-05-01', type: 'Gazetted', icon: '☸️', description: 'Birth and Enlightenment of Lord Buddha' },
  { id: 'h-2026-05-27', name: 'Id-ul-Zuha (Bakrid)', date: '2026-05-27', type: 'Gazetted', icon: '🐑', description: 'Feast of the Sacrifice' },
  { id: 'h-2026-06-26', name: 'Muharram', date: '2026-06-26', type: 'Gazetted', icon: '🕌', description: 'Sacred First Month of Islamic Calendar' },
  { id: 'h-2026-08-15', name: 'Independence Day', date: '2026-08-15', type: 'Gazetted', icon: '🇮🇳', description: 'Indian Independence Day Celebration' },
  { id: 'h-2026-09-04', name: 'Janmashtami', date: '2026-09-04', type: 'Gazetted', icon: '🦚', description: 'Birth of Lord Krishna' },
  { id: 'h-2026-09-25', name: 'Milad-un-Nabi', date: '2026-09-25', type: 'Gazetted', icon: '✨', description: 'Birthday of Prophet Muhammad' },
  { id: 'h-2026-10-02', name: 'Mahatma Gandhi Jayanti', date: '2026-10-02', type: 'Gazetted', icon: '🕊️', description: 'National Holiday honouring Mahatma Gandhi' },
  { id: 'h-2026-10-20', name: 'Dussehra (Vijayadashami)', date: '2026-10-20', type: 'Gazetted', icon: '🏹', description: 'Victory of Good over Evil' },
  { id: 'h-2026-11-08', name: 'Diwali (Deepawali)', date: '2026-11-08', type: 'Gazetted', icon: '🪔', description: 'National Festival of Lights' },
  { id: 'h-2026-11-09', name: 'Govardhan Puja', date: '2026-11-09', type: 'Restricted', icon: '⛰️', description: 'Annakut Puja' },
  { id: 'h-2026-11-10', name: 'Bhai Dooj', date: '2026-11-10', type: 'Restricted', icon: '🎁', description: 'Celebration of brother-sister bond' },
  { id: 'h-2026-11-24', name: 'Guru Nanak Jayanti', date: '2026-11-24', type: 'Gazetted', icon: '☬', description: 'Gurpurab celebrating Guru Nanak Dev Ji' },
  { id: 'h-2026-12-25', name: 'Christmas Day', date: '2026-12-25', type: 'Gazetted', icon: '🎄', description: 'Celebration of Christmas' },

  // ----------------- 2027 Academic Year -----------------
  { id: 'h-2027-01-26', name: 'Republic Day', date: '2027-01-26', type: 'Gazetted', icon: '🇮🇳', description: 'National Holiday celebrating Constitution of India' },
  { id: 'h-2027-03-06', name: 'Maha Shivratri', date: '2027-03-06', type: 'Gazetted', icon: '🔱', description: 'Great Night of Shiva' },
  { id: 'h-2027-03-10', name: 'Id-ul-Fitr', date: '2027-03-10', type: 'Gazetted', icon: '🌙', description: 'Celebration of Eid' },
  { id: 'h-2027-03-22', name: 'Holi / Dhulandi', date: '2027-03-22', type: 'Gazetted', icon: '🎨', description: 'National Festival of Colors' },
  { id: 'h-2027-03-26', name: 'Good Friday', date: '2027-03-26', type: 'Gazetted', icon: '✝️', description: 'Christian Holy Friday' },
  { id: 'h-2027-04-16', name: 'Ram Navami', date: '2027-04-16', type: 'Gazetted', icon: '🏹', description: 'Birth of Lord Rama' },
  { id: 'h-2027-04-20', name: 'Mahavir Jayanti', date: '2027-04-20', type: 'Gazetted', icon: '🪷', description: 'Birth of Lord Mahavira' },
  { id: 'h-2027-05-17', name: 'Id-ul-Zuha (Bakrid)', date: '2027-05-17', type: 'Gazetted', icon: '🐑', description: 'Feast of the Sacrifice' },
  { id: 'h-2027-05-20', name: 'Buddha Purnima', date: '2027-05-20', type: 'Gazetted', icon: '☸️', description: 'Birth and Enlightenment of Buddha' },
  { id: 'h-2027-07-16', name: 'Muharram', date: '2027-07-16', type: 'Gazetted', icon: '🕌', description: 'Sacred First Month of Islamic Calendar' },
  { id: 'h-2027-08-15', name: 'Independence Day', date: '2027-08-15', type: 'Gazetted', icon: '🇮🇳', description: 'Indian Independence Day Celebration' },
  { id: 'h-2027-08-25', name: 'Janmashtami', date: '2027-08-25', type: 'Gazetted', icon: '🦚', description: 'Birth of Lord Krishna' },
  { id: 'h-2027-10-02', name: 'Mahatma Gandhi Jayanti', date: '2027-10-02', type: 'Gazetted', icon: '🕊️', description: 'National Holiday honouring Mahatma Gandhi' },
  { id: 'h-2027-10-09', name: 'Dussehra (Vijayadashami)', date: '2027-10-09', type: 'Gazetted', icon: '🏹', description: 'Victory of Good over Evil' },
  { id: 'h-2027-10-29', name: 'Diwali (Deepawali)', date: '2027-10-29', type: 'Gazetted', icon: '🪔', description: 'National Festival of Lights' },
  { id: 'h-2027-11-14', name: 'Guru Nanak Jayanti', date: '2027-11-14', type: 'Gazetted', icon: '☬', description: 'Gurpurab celebrating Guru Nanak Dev Ji' },
  { id: 'h-2027-12-25', name: 'Christmas Day', date: '2027-12-25', type: 'Gazetted', icon: '🎄', description: 'Celebration of Christmas' },
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
  // Custom holidays stored in localStorage
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

  // Main tab filter: 'all' | 'upcoming' | 'past' | 'specialClasses'
  // Default to 'all' so users immediately see the full calendar of holidays!
  const [viewFilter, setViewFilter] = useState<'all' | 'upcoming' | 'past' | 'specialClasses'>('all');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Collapsible tracking for routine classes per holiday card
  const [expandedRoutineHolidays, setExpandedRoutineHolidays] = useState<Set<string>>(new Set());

  const toggleRoutineAccordion = (holidayId: string) => {
    setExpandedRoutineHolidays((prev) => {
      const next = new Set(prev);
      if (next.has(holidayId)) next.delete(holidayId);
      else next.add(holidayId);
      return next;
    });
  };

  // Modals state
  const [specialClassModalOpen, setSpecialClassModalOpen] = useState(false);
  const [customHolidayModalOpen, setCustomHolidayModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Scheduling Mode in Modal: 'routine' (1-click fill from existing load) or 'custom' (manual entry)
  const [modalMode, setModalMode] = useState<'routine' | 'custom'>('routine');

  // Form states for Special Holiday Class Entry
  const [selectedHolidayId, setSelectedHolidayId] = useState<string>('');
  const [customDate, setCustomDate] = useState<string>('');
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:30');
  const [room, setRoom] = useState('Room-101');
  const [reason, setReason] = useState('Special Class on Holiday');

  // Form states for Custom Holiday
  const [newHoliName, setNewHoliName] = useState('');
  const [newHoliDate, setNewHoliDate] = useState('');
  const [newHoliType, setNewHoliType] = useState<'Gazetted' | 'Restricted' | 'College Break' | 'Custom'>('College Break');
  const [newHoliDesc, setNewHoliDesc] = useState('');

  // Identify Extra Classes that are scheduled on Holidays
  const holidaySpecialClasses = useMemo(() => {
    const holidayDateSet = new Set(allHolidays.map((h) => h.date));
    return extraClasses.filter((ec) => {
      const isHolidayDate = holidayDateSet.has(ec.date);
      const hasHolidayReason = String(ec.reason || '').toLowerCase().includes('holiday');
      return isHolidayDate || hasHolidayReason;
    });
  }, [extraClasses, allHolidays]);

  // Group Special Classes by session (faculty + subject + date + time)
  const groupedHolidayClasses = useMemo(() => {
    const map = new Map<
      string,
      {
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
      }
    >();

    for (const ec of holidaySpecialClasses) {
      const key = `${ec.faculty_id}__${ec.subject}__${ec.date}__${ec.start_time}__${ec.end_time}`;
      const holidayInfo = allHolidays.find((h) => h.date === ec.date);
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

  // Routine classes suspended for a specific date
  const getRoutineClassesForDate = (dateStr: string): FacultyLoadWithDetails[] => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      const dayName = DAYS[d.getDay()];
      return loads.filter((l) => {
        if (l.day_of_week.toLowerCase() !== dayName.toLowerCase()) return false;
        if (l.start_date && l.end_date) {
          return dateStr >= l.start_date && dateStr <= l.end_date;
        }
        return true;
      });
    } catch {
      return [];
    }
  };

  // Filtered Holidays list
  const filteredHolidays = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return allHolidays.filter((h) => {
      // Year filter
      if (selectedYear !== 'all' && !h.date.startsWith(selectedYear)) return false;

      // Status tab filter
      if (viewFilter === 'upcoming' && h.date < todayStr) return false;
      if (viewFilter === 'past' && h.date >= todayStr) return false;

      // Search query filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = h.name.toLowerCase().includes(q);
        const matchDate = h.date.includes(q);
        const matchType = h.type.toLowerCase().includes(q);
        const matchDesc = (h.description || '').toLowerCase().includes(q);
        if (!matchName && !matchDate && !matchType && !matchDesc) return false;
      }

      // Month filter
      if (selectedMonth !== 'all') {
        const m = h.date.split('-')[1];
        if (m !== selectedMonth) return false;
      }

      return true;
    });
  }, [allHolidays, viewFilter, selectedYear, searchQuery, selectedMonth]);

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
    const finalDate = customDate || allHolidays.find((h) => h.id === selectedHolidayId)?.date;
    if (!finalDate) {
      setFeedback({ type: 'error', message: 'Please select a valid holiday date!' });
      return;
    }

    const matchedHoliday = allHolidays.find((h) => h.date === finalDate);
    const holidayName = matchedHoliday ? matchedHoliday.name : 'Indian Holiday';

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const inserts = selectedBatchIds.map((batchId) => ({
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
    setNewHoliDate('');
    setNewHoliDesc('');
  };

  // Delete Custom Holiday
  const handleDeleteCustomHoliday = (id: string) => {
    if (!window.confirm('Are you sure you want to remove this custom holiday?')) return;
    const updated = customHolidays.filter((h) => h.id !== id);
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
    const holidayData = allHolidays.map((h) => ({
      'Holiday Name': h.name,
      Date: h.date,
      'Day of Week': DAYS[new Date(h.date + 'T00:00:00').getDay()],
      Category: h.type,
      'Regular Classes Suspended': getRoutineClassesForDate(h.date).length,
      'Special Classes Scheduled': holidaySpecialClasses.filter((ec) => ec.date === h.date).length,
      Description: h.description || '',
    }));
    const wsHolidays = XLSX.utils.json_to_sheet(holidayData);
    XLSX.utils.book_append_sheet(wb, wsHolidays, 'Academic Holidays');

    // Sheet 2: Special Classes on Holidays
    const specialClassData = groupedHolidayClasses.map((sc) => ({
      'Faculty Name': sc.faculty.name,
      Department: sc.faculty.department,
      Subject: sc.subject,
      Batches: sc.batchNames.join(', '),
      Date: sc.date,
      'Time Slot': `${sc.start_time} - ${sc.end_time}`,
      'Room/Venue': sc.room || 'N/A',
      'Holiday Name': sc.holidayInfo?.name || 'Academic Holiday',
      Reason: sc.reason || '',
    }));
    const wsSpecial = XLSX.utils.json_to_sheet(specialClassData);
    XLSX.utils.book_append_sheet(wb, wsSpecial, 'Special Holiday Classes');

    XLSX.writeFile(wb, `Academic_Holidays_and_Special_Classes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const nextUpcoming = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return allHolidays.find((h) => h.date >= today) || allHolidays[0];
  }, [allHolidays]);

  // Routine classes eligible for linking into special class modal for the selected date
  const availableRoutineOptions = useMemo(() => {
    if (!customDate) return [];
    return getRoutineClassesForDate(customDate);
  }, [customDate, loads]);

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
                <span>Indian Academic Holidays</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                🚫 Routine Classes Off on Holidays
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Indian Academic Holidays & Special Class Management</span>
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed font-sans">
              Regular routine lectures remain suspended (Off) on Indian Gazetted and National Holidays.
              If a faculty member conducts a special or makeup lecture on a holiday, schedule a <strong className="text-amber-300">"Special Holiday Class"</strong> below.
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
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all duration-200 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-purple-300" />
              <span>Add Custom Holiday</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-3.5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all duration-200 cursor-pointer"
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
            <span className="text-[11px] text-purple-300 uppercase tracking-wider block font-semibold">Total Holidays</span>
            <span className="text-xl font-black text-white mt-0.5 block">{allHolidays.length}</span>
            <span className="text-[10px] text-purple-200/70">Gazetted, Restricted & Breaks</span>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-purple-300 uppercase tracking-wider block font-semibold">Next Upcoming</span>
            <span className="text-sm font-black text-amber-300 mt-0.5 block truncate">
              {nextUpcoming?.icon} {nextUpcoming?.name}
            </span>
            <span className="text-[10px] text-purple-200/70">{formatDateClean(nextUpcoming?.date || '')}</span>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-purple-300 uppercase tracking-wider block font-semibold">Special Classes</span>
            <span className="text-xl font-black text-amber-400 mt-0.5 block">{groupedHolidayClasses.length}</span>
            <span className="text-[10px] text-purple-200/70">Registered on Holidays</span>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-purple-300 uppercase tracking-wider block font-semibold">Routine Status</span>
            <span className="text-sm font-bold text-emerald-400 mt-0.5 block">100% Suspended / Off</span>
            <span className="text-[10px] text-purple-200/70">Auto-applied for all batches</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs, Year Selector & Search Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Main Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => setViewFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewFilter === 'all'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>All Holidays ({allHolidays.length})</span>
          </button>

          <button
            onClick={() => setViewFilter('upcoming')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewFilter === 'upcoming'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>Upcoming</span>
          </button>

          <button
            onClick={() => setViewFilter('past')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewFilter === 'past'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>Past Holidays</span>
          </button>

          <button
            onClick={() => setViewFilter('specialClasses')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              viewFilter === 'specialClasses'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>Special Classes on Holidays</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                viewFilter === 'specialClasses' ? 'bg-slate-950 text-amber-300' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {groupedHolidayClasses.length}
            </span>
          </button>
        </div>

        {/* Search, Year & Month Filters */}
        {viewFilter !== 'specialClasses' && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold focus:outline-none focus:border-purple-500"
            >
              <option value="2026">Year 2026</option>
              <option value="2025">Year 2025</option>
              <option value="2027">Year 2027</option>
              <option value="all">All Years</option>
            </select>

            {/* Month Selector */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold focus:outline-none focus:border-purple-500"
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

            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search holiday name, date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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
              Classes explicitly registered under Holiday Class Protocol
            </span>
          </div>

          {groupedHolidayClasses.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl">
                🏖️
              </div>
              <h4 className="text-base font-bold text-slate-900">No Special Classes Scheduled on Holidays</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                All academic holidays currently maintain full holiday status with 0 classes.
                To schedule a makeup lecture or syllabus revision on a holiday, click the button below.
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
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:border-amber-400 transition-all space-y-3"
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
                      <h4 className="text-base font-extrabold text-slate-900">{sc.subject}</h4>
                    </div>

                    <button
                      onClick={() => handleDeleteSpecialClass(sc.ids)}
                      title="Cancel this holiday class"
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
                        <span>
                          {sc.start_time} - {sc.end_time}
                        </span>
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
                        <span
                          key={bIdx}
                          className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[10px] font-bold text-slate-700"
                        >
                          {bn}
                        </span>
                      ))}
                    </div>

                    {sc.reason && (
                      <span className="text-[10px] text-slate-500 italic max-w-[200px] truncate" title={sc.reason}>
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
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
            <span>
              Showing {filteredHolidays.length} holiday(s)
              {selectedYear !== 'all' ? ` for year ${selectedYear}` : ''}
              {selectedMonth !== 'all' ? ` in month ${selectedMonth}` : ''}
            </span>
            <span>All routine lectures auto-marked Off</span>
          </div>

          {filteredHolidays.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto text-xl">
                🗓️
              </div>
              <h4 className="text-sm font-bold text-slate-800">No Holidays Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No holidays match your current filter or search criteria. Try switching years or clearing the month filter.
              </p>
              <button
                onClick={() => {
                  setSelectedMonth('all');
                  setSelectedYear('all');
                  setSearchQuery('');
                  setViewFilter('all');
                }}
                className="px-4 py-2 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredHolidays.map((holiday) => {
                const todayStr = new Date().toISOString().split('T')[0];
                const isToday = holiday.date === todayStr;
                const isPast = holiday.date < todayStr;
                const routineLoadsForDate = getRoutineClassesForDate(holiday.date);
                const holidayClassesForThisDay = holidaySpecialClasses.filter((ec) => ec.date === holiday.date);
                const holidayDateObj = new Date(holiday.date + 'T00:00:00');
                const weekdayName = !isNaN(holidayDateObj.getTime())
                  ? holidayDateObj.toLocaleDateString('en-US', { weekday: 'long' })
                  : '';
                const isRoutineExpanded = expandedRoutineHolidays.has(holiday.id);

                return (
                  <div
                    key={holiday.id}
                    className={`bg-white rounded-3xl border p-5 transition-all duration-300 relative flex flex-col justify-between space-y-4 ${
                      isToday
                        ? 'border-emerald-400 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-400/25'
                        : isPast
                        ? 'border-slate-200/80 bg-slate-50/40 opacity-85'
                        : 'border-slate-200/90 shadow-2xs hover:border-purple-300 hover:shadow-lg hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="space-y-3.5">
                      {/* Top Bar with Icon, Title and Type Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-purple-50/80 border border-purple-100 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
                            {holiday.icon || '🗓️'}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-base font-extrabold text-slate-900 leading-snug truncate" title={holiday.name}>
                              {holiday.name}
                            </h4>
                            <p className="text-xs font-semibold text-purple-700/80 mt-0.5">
                              {holiday.type} Holiday • {weekdayName}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
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

                      {/* Date & Day Pill */}
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 bg-slate-50/90 px-3.5 py-2.5 rounded-2xl border border-slate-200/70">
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                          <span className="font-bold text-slate-900">{formatDateClean(holiday.date)}</span>
                        </span>
                        <span className="text-[11px] font-mono text-purple-800 bg-purple-100/70 px-2.5 py-0.5 rounded-lg font-bold">
                          {weekdayName.slice(0, 3)}
                        </span>
                      </div>

                      {/* Class Impact Info Badges */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100/80 flex flex-col justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            Routine
                          </span>
                          <div className="mt-1 flex items-baseline justify-between">
                            <span className="font-black text-rose-950 text-sm">{routineLoadsForDate.length}</span>
                            <span className="text-[10px] font-semibold text-rose-700">Suspended</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100/80 flex flex-col justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            Special
                          </span>
                          <div className="mt-1 flex items-baseline justify-between">
                            <span
                              className={`font-black text-sm ${
                                holidayClassesForThisDay.length > 0 ? 'text-amber-950' : 'text-slate-400'
                              }`}
                            >
                              {holidayClassesForThisDay.length}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-600">Scheduled</span>
                          </div>
                        </div>
                      </div>

                      {/* Scheduled Special Classes Listed Directly on this Card */}
                      {holidayClassesForThisDay.length > 0 && (
                        <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider flex items-center gap-1">
                              <CalendarCheck className="w-3.5 h-3.5 text-amber-600" />
                              Scheduled Holiday Classes ({holidayClassesForThisDay.length})
                            </span>
                          </div>

                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {holidayClassesForThisDay.map((hc) => (
                              <div
                                key={hc.id}
                                className="bg-white p-2.5 rounded-xl border border-amber-200 flex items-center justify-between gap-2 text-xs shadow-2xs"
                              >
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 truncate">{hc.subject}</div>
                                  <div className="text-[10px] text-slate-600 flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className="font-semibold text-amber-800">{hc.faculty.name}</span>
                                    <span>•</span>
                                    <span className="font-mono text-slate-700">
                                      {hc.start_time}-{hc.end_time}
                                    </span>
                                    <span>•</span>
                                    <span className="text-slate-500 font-mono">{hc.batch.name}</span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteSpecialClass([hc.id])}
                                  title="Cancel this holiday class"
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Accordion Toggle for Suspended Regular Routine Classes */}
                      {routineLoadsForDate.length > 0 && (
                        <div>
                          <button
                            type="button"
                            onClick={() => toggleRoutineAccordion(holiday.id)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors border border-slate-200/60"
                          >
                            <span className="flex items-center gap-1.5 text-[11px]">
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                              <span>{routineLoadsForDate.length} routine lectures off on {weekdayName}</span>
                            </span>
                            {isRoutineExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                            )}
                          </button>

                          {isRoutineExpanded && (
                            <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs max-h-36 overflow-y-auto">
                              {routineLoadsForDate.map((rl) => (
                                <div
                                  key={rl.id}
                                  className="bg-white p-2 rounded-lg border border-slate-100 text-[11px] space-y-0.5"
                                >
                                  <div className="font-bold text-slate-800 truncate">{rl.subject}</div>
                                  <div className="text-[10px] text-slate-500 flex items-center justify-between">
                                    <span>{rl.faculty.name}</span>
                                    <span className="font-mono font-medium">
                                      {rl.start_time} - {rl.end_time} ({rl.batch.name})
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {holiday.description && (
                        <p className="text-xs text-slate-500 leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 line-clamp-2">
                          {holiday.description}
                        </p>
                      )}
                    </div>

                    {/* Footer Action Button */}
                    <div className="pt-3.5 mt-auto border-t border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenScheduleForHoliday(holiday)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200/80 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Schedule Class on Holiday</span>
                      </button>

                      {holiday.id.startsWith('custom-') && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomHoliday(holiday.id)}
                          className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
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
        </div>
      )}

      {/* ================= MODAL: Schedule Special Holiday Class ================= */}
      {specialClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          {/* Backdrop Click Area */}
          <div
            className="absolute inset-0"
            onClick={() => setSpecialClassModalOpen(false)}
            aria-hidden="true"
          />

          {/* Modal Container */}
          <div className="relative z-10 bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                    Holiday Protocol
                  </span>
                  <h3 className="text-base font-black text-slate-900">Schedule Special Holiday Class</h3>
                </div>
                <p className="text-xs text-slate-500">
                  Record an official special lecture or makeup session on an academic holiday
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSpecialClassModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-5 overflow-y-auto space-y-3.5 flex-1 text-xs">
              {/* Notice Banner */}
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="leading-snug">
                  Routine classes remain suspended on holidays. This allocates an official holiday session.
                </span>
              </div>

              {feedback && (
                <div
                  className={`p-3 rounded-xl flex items-center gap-2 ${
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

              {/* Mode Switcher */}
              <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setModalMode('routine')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all cursor-pointer ${
                    modalMode === 'routine'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ⚡ Link Routine Class (1-Click)
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('custom')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all cursor-pointer ${
                    modalMode === 'custom'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ✏️ Custom Special Class
                </button>
              </div>

              <form id="special-holiday-class-form" onSubmit={handleSubmitSpecialClass} className="space-y-3">
                {/* Holiday & Date Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Indian Holiday</label>
                    <select
                      value={selectedHolidayId}
                      onChange={(e) => {
                        setSelectedHolidayId(e.target.value);
                        const h = allHolidays.find((item) => item.id === e.target.value);
                        if (h) {
                          setCustomDate(h.date);
                          setReason(`Special Class on ${h.name}`);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:border-purple-500"
                    >
                      <option value="">-- Choose Holiday --</option>
                      {allHolidays.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.icon} {h.name} ({formatDateClean(h.date)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Class Date *</label>
                    <input
                      type="date"
                      required
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* 1-Click Routine Link Dropdown */}
                {modalMode === 'routine' && (
                  <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1.5">
                    <label className="font-bold text-purple-950 block">
                      Select Routine Timetable Class ({availableRoutineOptions.length} available)
                    </label>
                    {availableRoutineOptions.length === 0 ? (
                      <p className="text-[11px] text-purple-700">
                        No regular classes scheduled on this day of week. Switch to "Custom Special Class" above.
                      </p>
                    ) : (
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          const match = availableRoutineOptions.find((o) => o.id === val);
                          if (match) {
                            setSelectedFacultyId(match.faculty_id);
                            setSubject(match.subject);
                            setSelectedBatchIds([match.batch_id]);
                            setStartTime(match.start_time);
                            setEndTime(match.end_time);
                            setRoom(match.room || 'Room-101');
                            setReason(`Make-up lecture on holiday for ${match.subject}`);
                          }
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-purple-300 font-semibold text-purple-950 focus:outline-none"
                      >
                        <option value="">-- Click to Auto-fill Faculty, Batches & Timings --</option>
                        {availableRoutineOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.subject} • {opt.faculty.name} ({opt.start_time}-{opt.end_time}, {opt.batch.name})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Faculty & Subject Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Faculty Member *</label>
                    <select
                      required
                      value={selectedFacultyId}
                      onChange={(e) => setSelectedFacultyId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:border-purple-500"
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
                    <label className="font-bold text-slate-700 block mb-1">Subject Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Advanced Java Revision"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Batches Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">
                      Target Batches * ({selectedBatchIds.length} selected)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedBatchIds(batches.map((b) => b.id))}
                        className="text-[11px] font-bold text-purple-600 hover:text-purple-800 cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => setSelectedBatchIds([])}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="max-h-24 overflow-y-auto p-2 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {batches.map((b) => {
                      const isChecked = selectedBatchIds.includes(b.id);
                      return (
                        <label
                          key={b.id}
                          className={`flex items-center gap-1.5 p-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${
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
                                setSelectedBatchIds(selectedBatchIds.filter((id) => id !== b.id));
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

                {/* Times & Room Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Start Time *</label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">End Time *</label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Room / Venue</label>
                    <input
                      type="text"
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      placeholder="e.g. Lab-3"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                    />
                  </div>
                </div>

                {/* Purpose / Reason */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Purpose / Reason</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Midterm revision session"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                  />
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/70">
              <button
                type="button"
                onClick={() => setSpecialClassModalOpen(false)}
                className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-200/70 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                form="special-holiday-class-form"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>{isSubmitting ? 'Registering...' : 'Register Special Holiday Class'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: Add Custom College Holiday ================= */}
      {customHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          {/* Backdrop Click Area */}
          <div
            className="absolute inset-0"
            onClick={() => setCustomHolidayModalOpen(false)}
            aria-hidden="true"
          />

          {/* Modal Container */}
          <div className="relative z-10 bg-white rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="text-base font-black text-slate-900">Add Custom Academic Holiday</h3>
                <p className="text-xs text-slate-500">Record a college break, sports day, or local festival</p>
              </div>
              <button
                type="button"
                onClick={() => setCustomHolidayModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form id="custom-holiday-form" onSubmit={handleAddCustomHoliday} className="p-5 space-y-3.5 text-xs overflow-y-auto">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Holiday Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Sports Day / College Fest"
                  value={newHoliName}
                  onChange={(e) => setNewHoliName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={newHoliDate}
                    onChange={(e) => setNewHoliDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newHoliType}
                    onChange={(e) => setNewHoliType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:outline-none focus:border-purple-500"
                  >
                    <option value="College Break">College Break</option>
                    <option value="Gazetted">Gazetted</option>
                    <option value="Restricted">Restricted</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. All lectures suspended for university campus sports"
                  value={newHoliDesc}
                  onChange={(e) => setNewHoliDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>
            </form>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/70">
              <button
                type="button"
                onClick={() => setCustomHolidayModalOpen(false)}
                className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-200/70 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="custom-holiday-form"
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Save Holiday
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
