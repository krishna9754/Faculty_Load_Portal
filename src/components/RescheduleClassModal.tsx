import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Faculty, FacultyLoadWithDetails, RescheduledClassWithDetails } from '@/lib/supabase';
import type { AnimeTheme } from '@/lib/animeThemes';
import type { GroupedClassSession } from '@/components/FacultyAvailabilityView';
import {
  X,
  Calendar,
  Clock,
  ArrowRightLeft,
  Building2,
  Users,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Info,
  CalendarPlus,
} from 'lucide-react';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface RescheduleClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  session: GroupedClassSession | null;
  facultyMember: Faculty | null;
  allLoads: FacultyLoadWithDetails[];
  rescheduledClasses?: RescheduledClassWithDetails[];
  animeTheme: AnimeTheme;
  initialDate?: string;
}

function timeOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const toMin = (t: string) => {
    const parts = t.split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };
  return toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);
}

function toLocalDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDayFromDate(dateStr: string): string {
  if (!dateStr) return 'Monday';
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return DAYS_OF_WEEK[d.getDay() === 0 ? 6 : d.getDay() - 1] || 'Monday';
}

function getNextDateForDay(dayName: string, fromDate = new Date()): string {
  const dayIdxMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  const targetDay = dayIdxMap[dayName] ?? 0;
  const currentDay = fromDate.getDay();
  let daysUntil = (targetDay - currentDay + 7) % 7;
  if (daysUntil === 0) daysUntil = 7;
  const result = new Date(fromDate);
  result.setDate(result.getDate() + daysUntil);
  return toLocalDateStr(result);
}

export function RescheduleClassModal({
  isOpen,
  onClose,
  onSuccess,
  session,
  facultyMember,
  allLoads,
  animeTheme,
  initialDate,
}: RescheduleClassModalProps) {
  // Mode: 'one-time' or 'permanent'
  const [mode, setMode] = useState<'one-time' | 'permanent'>('one-time');

  // Form State
  const [newDay, setNewDay] = useState<string>('Monday');
  const [newDate, setNewDate] = useState<string>('');
  const [newStartTime, setNewStartTime] = useState<string>('');
  const [newEndTime, setNewEndTime] = useState<string>('');
  const [room, setRoom] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form when session opens
  useEffect(() => {
    if (session) {
      const defaultDate = initialDate || toLocalDateStr(new Date());
      const derivedDay = getDayFromDate(defaultDate);
      if (mode === 'one-time') {
        setNewDay(derivedDay);
        setNewDate(defaultDate);
        setReason(`Rescheduled on ${defaultDate}`);
      } else {
        const defaultNewDay = session.day_of_week === 'Sunday' ? 'Monday' : 'Sunday';
        setNewDay(defaultNewDay);
        setNewDate(getNextDateForDay(defaultNewDay));
        setReason(`Shifted from ${session.day_of_week} to ${defaultNewDay}`);
      }
      setNewStartTime(session.start_time.slice(0, 5));
      setNewEndTime(session.end_time.slice(0, 5));
      setRoom(session.rooms[0] || '');
      setErrorMessage(null);
    }
  }, [session, isOpen, initialDate, mode]);

  // When newDate changes in one-time mode, update day automatically
  const handleDateChange = (dateVal: string) => {
    setNewDate(dateVal);
    const dayName = getDayFromDate(dateVal);
    setNewDay(dayName);
  };

  // When newDay changes in permanent mode
  const handleDayChange = (day: string) => {
    setNewDay(day);
    setNewDate(getNextDateForDay(day));
    if (session) {
      setReason(`Shifted from ${session.day_of_week} to ${day}`);
    }
  };

  // ---------------------------------------------------------------------------
  // Live Clash Detection: Checks if faculty or any batches have conflicts on new slot
  // ---------------------------------------------------------------------------
  const clashWarnings = useMemo(() => {
    if (!session || !facultyMember || !newDay || !newStartTime || !newEndTime) return [];

    const warnings: string[] = [];
    const currentLoadIds = new Set(session.loadIds);
    const sessionBatchIds = new Set(session.loads.map((l) => l.batch_id));

    allLoads.forEach((l) => {
      // Don't clash against the session itself
      if (currentLoadIds.has(l.id)) return;
      if (l.day_of_week.toLowerCase() !== newDay.toLowerCase()) return;
      if (!timeOverlap(l.start_time, l.end_time, newStartTime, newEndTime)) return;

      // 1. Faculty Clash
      if (l.faculty_id === facultyMember.id) {
        warnings.push(
          `Faculty ${facultyMember.name} already has "${l.subject}" (${l.start_time} - ${l.end_time}) on ${newDay}`
        );
      }

      // 2. Batch Clash
      if (sessionBatchIds.has(l.batch_id)) {
        warnings.push(
          `Batch "${l.batch.name}" already has "${l.subject}" taken by ${l.faculty.name} (${l.start_time} - ${l.end_time}) on ${newDay}`
        );
      }
    });

    return Array.from(new Set(warnings));
  }, [session, facultyMember, newDay, newStartTime, newEndTime, allLoads]);

  if (!isOpen || !session || !facultyMember) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStartTime || !newEndTime) {
      setErrorMessage('Please specify start time and end time.');
      return;
    }

    if (mode === 'one-time' && !newDate) {
      setErrorMessage('Please specify the date for this one-time class shift.');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);

      if (mode === 'permanent') {
        // PERMANENT TIMETABLE SHIFT:
        // Update all load entries of this session in faculty_loads table
        const { error } = await supabase
          .from('faculty_loads')
          .update({
            day_of_week: newDay,
            start_time: newStartTime,
            end_time: newEndTime,
            room: room.trim() || null,
          })
          .in('id', session.loadIds);

        if (error) throw error;
      } else {
        // ONE-TIME RESCHEDULE:
        // Insert records into rescheduled_classes table for each batch in this session
        const records = session.loads.map((l) => ({
          original_load_id: l.id,
          faculty_id: l.faculty_id,
          batch_id: l.batch_id,
          subject: session.subject,
          original_day: session.day_of_week,
          original_date: newDate,
          original_start_time: session.start_time,
          original_end_time: session.end_time,
          new_day: newDay,
          new_date: newDate,
          new_start_time: newStartTime,
          new_end_time: newEndTime,
          room: room.trim() || null,
          reason: reason.trim() || `Rescheduled on ${newDate} to ${newStartTime} - ${newEndTime}`,
        }));

        const { error } = await supabase.from('rescheduled_classes').insert(records);
        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to reschedule class:', err);
      setErrorMessage(err.message || 'Failed to reschedule class. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in my-8">
        {/* Top Header Banner */}
        <div
          className="p-5 text-white flex items-center justify-between"
          style={{
            background: `linear-gradient(135deg, ${animeTheme.primaryColor}, ${animeTheme.secondaryColor})`,
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-xs">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold leading-tight">
                Shift / Reschedule Class
              </h3>
              <p className="text-xs text-white/80 font-medium">
                {mode === 'one-time'
                  ? `Reschedule on same date (${newDate || 'selected date'}) with new time slot`
                  : `Move class from ${session.day_of_week} to ${newDay}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Original Class Information Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Current Scheduled Class
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                {session.day_of_week} • {session.start_time} - {session.end_time}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">{session.subject}</h4>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Faculty: <span className="font-bold text-slate-900">{facultyMember.name}</span>
                  {facultyMember.department && ` (${facultyMember.department})`}
                </p>
              </div>

              {session.rooms.length > 0 && (
                <div className="text-xs text-slate-500 font-mono">
                  Room: <span className="font-semibold text-slate-700">{session.rooms.join(', ')}</span>
                </div>
              )}
            </div>

            {/* Batches Pill List */}
            <div className="pt-1.5 border-t border-slate-200/70 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                Batches ({session.batchNames.length}):
              </span>
              {session.batchNames.map((bName, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-800 shadow-2xs"
                >
                  {bName}
                </span>
              ))}
            </div>
          </div>

          {/* Mode Selector: One-Time vs Permanent */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>Shift Type:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('one-time')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  mode === 'one-time'
                    ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      mode === 'one-time' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                    }`}
                  >
                    {mode === 'one-time' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    One-Time Reschedule (Same Date, New Time)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 pl-6">
                  Keep on lecture date ({newDate || 'same date'}) and manage a new time slot.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('permanent')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  mode === 'permanent'
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      mode === 'permanent' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                    }`}
                  >
                    {mode === 'permanent' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    Permanent Timetable Shift
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 pl-6">
                  Permanently move all future classes from {session.day_of_week} to {newDay}.
                </p>
              </button>
            </div>
          </div>

          {/* New Day & Timing Controls */}
          {mode === 'one-time' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Lecture Date * (Reschedule on same date)
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Schedule Information
                </label>
                <div className="px-3 py-2 text-xs font-semibold text-blue-800 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-between">
                  <span>Day: <strong className="font-bold">{newDay}</strong></span>
                  <span className="text-[11px] text-blue-700">Routine: {session.start_time} - {session.end_time}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  New Day of Week *
                </label>
                <select
                  value={newDay}
                  onChange={(e) => handleDayChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Scope
                </label>
                <div className="px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200">
                  Recurring Every {newDay}
                </div>
              </div>
            </div>
          )}


          {/* Time & Room Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                New Start Time *
              </label>
              <input
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                New End Time *
              </label>
              <input
                type="time"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Room Number
              </label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. Lab 2, Room 402"
                className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Reason / Remarks Field */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Reason / Remarks (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Shifted from Tuesday due to holiday / extra revision"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Live Clash / Conflict Detection Feedback */}
          {clashWarnings.length === 0 ? (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Slot is Available!</span> No clashes found for{' '}
                {facultyMember.name} or any of the {session.batchNames.length} batches on {newDay} (
                {newStartTime} – {newEndTime}).
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Notice: Existing Class Warning</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-800">
                {clashWarnings.map((warn, wIdx) => (
                  <li key={wIdx}>{warn}</li>
                ))}
              </ul>
              <p className="text-[10px] text-slate-500 italic pt-0.5">
                You can still proceed if this is an intentional combined or replacement class.
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
              {errorMessage}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all text-white ${
                mode === 'permanent'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/25'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-blue-500/25'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>
                {saving
                  ? 'Saving Changes...'
                  : mode === 'permanent'
                  ? `Permanently Move to ${newDay}`
                  : `Shift to ${newDay} (${newDate})`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
