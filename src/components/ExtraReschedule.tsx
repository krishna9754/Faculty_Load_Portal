import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Faculty, Batch, FacultyLoadWithDetails, ExtraClassWithDetails, RescheduledClassWithDetails, CancelledClassWithDetails } from '@/lib/supabase';
import { AnimeMascot } from '@/components/AnimeMascot';
import { IndianHolidaysManager, DEFAULT_INDIAN_HOLIDAYS } from '@/components/IndianHolidaysManager';
import * as XLSX from 'xlsx';
import {
  CalendarPlus,
  RefreshCw,
  XCircle,
  Search,
  X,
  ChevronDown,
  CheckCircle2,
  BookOpen,
  Pencil,
  Trash2,
  Save,
  Zap,
  Clock,
  Calendar,
  ArrowRight,
  Download,
  FileSpreadsheet,
  Users,
  Building2,
  Layers,
  Sparkles,
  AlertTriangle,
  Filter,
  Check,
  Plus,
  AlertCircle,
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.toLocaleDateString('en-GB', { day: '2-digit' });
  const month = d.toLocaleDateString('en-GB', { month: 'short' });
  const year = d.toLocaleDateString('en-GB', { year: 'numeric' });
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
  return `${day} ${month} ${year}, ${weekday}`;
}

/* ==================== Live Class Session Helper & Selector ==================== */

export type LiveClassSession = {
  key: string;
  faculty_id: string;
  faculty_name: string;
  department: string;
  subject: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string | null;
  start_date: string;
  end_date: string;
  status: 'pending' | 'running' | 'expired';
  batch_ids: string[];
  batchNames: string[];
  loadIds: string[];
};

function getLoadStatus(startDate?: string | null, endDate?: string | null): 'pending' | 'running' | 'expired' {
  if (!startDate || !endDate) return 'running';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const s = new Date(startDate);
  s.setHours(0, 0, 0, 0);
  const e = new Date(endDate);
  e.setHours(0, 0, 0, 0);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 'running';
  if (today < s) return 'pending';
  if (today > e) return 'expired';
  return 'running';
}

function extractClassSessions(loads: FacultyLoadWithDetails[]): LiveClassSession[] {
  const map = new Map<string, LiveClassSession>();
  const safeLoads = Array.isArray(loads) ? loads : [];

  for (const load of safeLoads) {
    if (!load) continue;
    const status = getLoadStatus(load.start_date, load.end_date);
    const normSub = String(load.subject || '').trim().toLowerCase();
    const sTime = String(load.start_time || '').trim();
    const eTime = String(load.end_time || '').trim();
    const facId = load.faculty_id || 'unknown';
    const key = `${facId}__${normSub}__${sTime}__${eTime}`;

    const batchName = load.batch?.name ? String(load.batch.name) : 'Unknown Batch';
    const roomStr = load.room != null ? String(load.room).trim() : null;
    const existing = map.get(key);

    if (existing) {
      if (load.batch_id && !existing.batch_ids.includes(load.batch_id)) {
        existing.batch_ids.push(load.batch_id);
      }
      if (batchName && !existing.batchNames.includes(batchName)) {
        existing.batchNames.push(batchName);
      }
      if (load.id && !existing.loadIds.includes(load.id)) {
        existing.loadIds.push(load.id);
      }
      if (roomStr && (!existing.room || !existing.room.includes(roomStr))) {
        existing.room = existing.room ? `${existing.room}, ${roomStr}` : roomStr;
      }
    } else {
      map.set(key, {
        key,
        faculty_id: load.faculty_id,
        faculty_name: load.faculty?.name || 'Unknown Faculty',
        department: load.faculty?.department || '',
        subject: load.subject || '',
        day_of_week: load.day_of_week || '',
        start_time: sTime,
        end_time: eTime,
        room: roomStr,
        start_date: load.start_date || '',
        end_date: load.end_date || '',
        status,
        batch_ids: load.batch_id ? [load.batch_id] : [],
        batchNames: [batchName],
        loadIds: load.id ? [load.id] : [],
      });
    }
  }

  const dayOrder: Record<string, number> = {
    Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7,
  };

  return Array.from(map.values()).sort((a, b) => {
    // Running/live classes first
    if (a.status === 'running' && b.status !== 'running') return -1;
    if (a.status !== 'running' && b.status === 'running') return 1;
    if (String(a.faculty_name).localeCompare(String(b.faculty_name)) !== 0) {
      return String(a.faculty_name).localeCompare(String(b.faculty_name));
    }
    const dayDiff = (dayOrder[a.day_of_week] || 0) - (dayOrder[b.day_of_week] || 0);
    if (dayDiff !== 0) return dayDiff;
    return String(a.start_time).localeCompare(String(b.start_time));
  });
}

function LiveClassSelect({
  sessions,
  selectedSession,
  onSelect,
  themeColor = 'blue',
}: {
  sessions: LiveClassSession[];
  selectedSession: LiveClassSession | null;
  onSelect: (session: LiveClassSession | null) => void;
  themeColor?: 'blue' | 'amber' | 'red';
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [facultyFilter, setFacultyFilter] = useState<string>('all');
  const [showLiveOnly, setShowLiveOnly] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const uniqueFaculties = useMemo(() => {
    const map = new Map<string, string>();
    sessions.forEach((s) => {
      if (s.faculty_id && !map.has(s.faculty_id)) {
        map.set(s.faculty_id, s.faculty_name);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [sessions]);

  const runningSessions = sessions.filter((s) => s.status === 'running');
  // If no running sessions exist at all in DB today, fall back to all sessions so user isn't stuck
  const baseSessions = showLiveOnly && runningSessions.length > 0 ? runningSessions : sessions;

  const filtered = baseSessions.filter((s) => {
    if (facultyFilter !== 'all' && s.faculty_id !== facultyFilter) return false;
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      s.faculty_name.toLowerCase().includes(q) ||
      s.subject.toLowerCase().includes(q) ||
      s.day_of_week.toLowerCase().includes(q) ||
      (s.room && s.room.toLowerCase().includes(q)) ||
      s.batchNames.some((b) => b.toLowerCase().includes(q))
    );
  });

  const colorThemes = {
    blue: {
      activeBorder: 'border-blue-500 ring-2 ring-blue-500/20',
      badge: 'bg-blue-100 text-blue-700',
      btn: 'from-blue-600 to-cyan-500 text-white',
      accentBg: 'bg-blue-50/70 border-blue-200/80',
    },
    amber: {
      activeBorder: 'border-amber-500 ring-2 ring-amber-500/20',
      badge: 'bg-amber-100 text-amber-700',
      btn: 'from-amber-500 to-orange-500 text-white',
      accentBg: 'bg-amber-50/70 border-amber-200/80',
    },
    red: {
      activeBorder: 'border-rose-500 ring-2 ring-rose-500/20',
      badge: 'bg-rose-100 text-rose-700',
      btn: 'from-red-500 to-rose-500 text-white',
      accentBg: 'bg-rose-50/70 border-rose-200/80',
    },
  };
  const theme = colorThemes[themeColor];

  return (
    <div ref={ref} className="relative">
      {selectedSession ? (
        <div className={`p-4 rounded-xl border ${theme.accentBg} transition-all duration-200 animate-pop-in space-y-3`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                selectedSession.status === 'running'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {selectedSession.status === 'running' ? 'LIVE CLASS' : 'SCHEDULED'}
              </span>
              <span className="text-base font-bold text-slate-900">{selectedSession.faculty_name}</span>
              <span className="text-xs text-slate-500 font-medium">({selectedSession.department})</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setOpen(true);
              }}
              className="text-xs font-semibold text-slate-600 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 px-2.5 py-1.5 rounded-lg shadow-2xs hover:bg-red-50 transition-all flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Change Live Class
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 text-xs text-slate-700 flex-wrap">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 bg-white/80 px-2.5 py-1 rounded-md border border-slate-200/60 shadow-2xs">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              {selectedSession.subject}
            </div>
            <div className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 rounded-md border border-slate-200/60 shadow-2xs font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {selectedSession.day_of_week}
            </div>
            <div className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 rounded-md border border-slate-200/60 shadow-2xs font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              {selectedSession.start_time} - {selectedSession.end_time}
            </div>
            {selectedSession.room && (
              <div className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 rounded-md border border-slate-200/60 shadow-2xs text-slate-600">
                <span>Room:</span>
                <span className="font-semibold text-slate-800">{selectedSession.room}</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-200/60">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>All Included Batches ({selectedSession.batchNames.length})</span>
              <span className="text-[10px] text-emerald-700 font-bold lowercase bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                auto-linked for this live session
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {selectedSession.batchNames.map((name) => (
                <span
                  key={name}
                  className="px-2.5 py-1 rounded-md bg-white text-slate-800 text-xs font-semibold border border-slate-200/80 shadow-2xs flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`w-full px-4 py-3.5 rounded-xl border border-dashed border-slate-300 hover:border-blue-400 bg-white hover:bg-blue-50/30 text-left transition-all duration-200 flex items-center justify-between group shadow-2xs hover:shadow-md ${
            open ? theme.activeBorder : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shadow-sm shadow-emerald-500/20 group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700 flex items-center gap-1.5">
                Select Live Class
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {runningSessions.length > 0 ? `${runningSessions.length} Live Active` : `${sessions.length} Available`}
                </span>
              </p>
              <p className="text-xs text-slate-500">
                Click to choose from active running timetable classes (auto-fills faculty, all batches & schedule)
              </p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-transform duration-300 ${open ? 'rotate-180 scale-110' : ''}`} />
        </button>
      )}

      {open && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-[460px] overflow-hidden flex flex-col animate-bounce-in">
          {/* Header & Search */}
          <div className="p-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Live Timetable Classes
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {runningSessions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowLiveOnly(!showLiveOnly)}
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-colors ${
                      showLiveOnly
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {showLiveOnly ? `🟢 Live Only (${runningSessions.length})` : `All (${sessions.length})`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by faculty, subject, day, batch, or room..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 anime-input bg-slate-50/50"
                />
              </div>
              {uniqueFaculties.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={facultyFilter}
                    onChange={(e) => setFacultyFilter(e.target.value)}
                    className="text-xs font-semibold py-2 px-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0 max-w-[170px] truncate"
                  >
                    <option value="all">All Faculty ({uniqueFaculties.length})</option>
                    {uniqueFaculties.map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* List of Live Sessions */}
          <div className="overflow-y-auto p-2 space-y-2 flex-1">
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <p className="text-sm font-semibold text-slate-600">No matching classes found</p>
                <p className="text-xs text-slate-400 mt-1">Try another search term or switch filter.</p>
              </div>
            ) : (
              filtered.map((sess) => {
                const isSelected = selectedSession?.key === sess.key;
                return (
                  <button
                    key={sess.key}
                    type="button"
                    onClick={() => {
                      onSelect(sess);
                      setOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex flex-col gap-1.5 hover:shadow-md hover:scale-[1.01] ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20'
                        : sess.status === 'running'
                        ? 'bg-white hover:bg-emerald-50/40 border-slate-200/80 hover:border-emerald-300'
                        : 'bg-slate-50/60 hover:bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{sess.faculty_name}</span>
                        <span className="text-xs text-slate-500">({sess.department})</span>
                        <span className="inline-flex items-center gap-1 font-bold text-xs text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                          <BookOpen className="w-3 h-3 text-blue-600" />
                          {sess.subject}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {sess.status === 'running' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            LIVE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            {sess.status === 'pending' ? 'Upcoming' : 'Past'}
                          </span>
                        )}
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                      <span className="flex items-center gap-1 font-semibold text-slate-800">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {sess.day_of_week}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1 font-semibold text-slate-800">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {sess.start_time} - {sess.end_time}
                      </span>
                      {sess.room && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500">Room: <strong className="text-slate-700">{sess.room}</strong></span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 text-xs text-slate-500 flex-wrap">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase">
                        Batches ({sess.batchNames.length}):
                      </span>
                      {sess.batchNames.slice(0, 4).map((b) => (
                        <span key={b} className="px-1.5 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-medium">
                          {b}
                        </span>
                      ))}
                      {sess.batchNames.length > 4 && (
                        <span className="px-1.5 py-0.5 rounded text-[11px] bg-blue-100 text-blue-800 font-bold">
                          +{sess.batchNames.length - 4} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== Search Bar ==================== */

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-all duration-200" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-9 pr-9 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white anime-input"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200 hover:scale-110">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/* ==================== Grouping Helpers ==================== */

type GroupedExtra = {
  key: string; ids: string[];
  faculty_id: string;
  faculty: { name: string; department: string };
  batchNames: string[];
  batch_ids: string[];
  subject: string; date: string; start_time: string; end_time: string;
  room: string | null; reason: string | null;
  rawItems: ExtraClassWithDetails[];
};

type GroupedReschedule = {
  key: string; ids: string[];
  faculty_id: string;
  faculty: { name: string; department: string };
  batchNames: string[];
  batch_ids: string[];
  subject: string;
  original_day: string | null; original_date: string | null;
  original_start_time: string | null; original_end_time: string | null;
  new_day: string; new_date: string; new_start_time: string; new_end_time: string;
  room: string | null; reason: string | null;
  rawItems: RescheduledClassWithDetails[];
};

type GroupedCancelled = {
  key: string; ids: string[];
  faculty: { name: string; department: string };
  batchNames: string[];
  subject: string; date: string; day_of_week: string | null;
  start_time: string | null; end_time: string | null;
  room: string | null; reason: string | null;
};

function groupExtraClasses(items: ExtraClassWithDetails[]): GroupedExtra[] {
  const map = new Map<string, GroupedExtra>();
  for (const ec of items) {
    const key = `${ec.faculty_id}|${ec.subject}|${ec.date}|${ec.start_time}|${ec.end_time}`;
    if (map.has(key)) {
      const g = map.get(key)!;
      if (!g.batchNames.includes(ec.batch.name)) g.batchNames.push(ec.batch.name);
      if (!g.batch_ids.includes(ec.batch_id)) g.batch_ids.push(ec.batch_id);
      g.ids.push(ec.id);
      g.rawItems.push(ec);
    } else {
      map.set(key, {
        key,
        ids: [ec.id],
        faculty_id: ec.faculty_id,
        faculty: ec.faculty,
        batchNames: [ec.batch.name],
        batch_ids: [ec.batch_id],
        subject: ec.subject,
        date: ec.date,
        start_time: ec.start_time,
        end_time: ec.end_time,
        room: ec.room,
        reason: ec.reason,
        rawItems: [ec],
      });
    }
  }
  return Array.from(map.values());
}

function groupRescheduledClasses(items: RescheduledClassWithDetails[]): GroupedReschedule[] {
  const map = new Map<string, GroupedReschedule>();
  for (const rc of items) {
    const key = `${rc.faculty_id}|${rc.subject}|${rc.new_date}|${rc.new_day}|${rc.new_start_time}|${rc.new_end_time}`;
    if (map.has(key)) {
      const g = map.get(key)!;
      if (!g.batchNames.includes(rc.batch.name)) g.batchNames.push(rc.batch.name);
      if (!g.batch_ids.includes(rc.batch_id)) g.batch_ids.push(rc.batch_id);
      g.ids.push(rc.id);
      g.rawItems.push(rc);
    } else {
      map.set(key, {
        key,
        ids: [rc.id],
        faculty_id: rc.faculty_id,
        faculty: rc.faculty,
        batchNames: [rc.batch.name],
        batch_ids: [rc.batch_id],
        subject: rc.subject,
        original_day: rc.original_day,
        original_date: rc.original_date,
        original_start_time: rc.original_start_time,
        original_end_time: rc.original_end_time,
        new_day: rc.new_day,
        new_date: rc.new_date,
        new_start_time: rc.new_start_time,
        new_end_time: rc.new_end_time,
        room: rc.room,
        reason: rc.reason,
        rawItems: [rc],
      });
    }
  }
  return Array.from(map.values());
}

function groupCancelledClasses(items: CancelledClassWithDetails[]): GroupedCancelled[] {
  const map = new Map<string, GroupedCancelled>();
  for (const cc of items) {
    const key = `${cc.faculty_id}|${cc.subject}|${cc.date}`;
    if (map.has(key)) {
      const g = map.get(key)!;
      if (!g.batchNames.includes(cc.batch.name)) g.batchNames.push(cc.batch.name);
      g.ids.push(cc.id);
    } else {
      map.set(key, { key, ids: [cc.id], faculty: cc.faculty, batchNames: [cc.batch.name], subject: cc.subject, date: cc.date, day_of_week: cc.day_of_week, start_time: cc.start_time, end_time: cc.end_time, room: cc.room, reason: cc.reason });
    }
  }
  return Array.from(map.values());
}

function filterGroupedByFaculty<T extends { faculty: { name: string } }>(items: T[], query: string): T[] {
  if (!query.trim()) return items;
  return items.filter((item) => item.faculty.name.toLowerCase().includes(query.toLowerCase()));
}

/* ==================== Excel Export Helpers ==================== */

function exportExtrasToExcel(items: GroupedExtra[], singleItem?: GroupedExtra) {
  const wb = XLSX.utils.book_new();
  const data: (string | number)[][] = [['Faculty', 'Department', 'Subject', 'Batches', 'Date', 'Start Time', 'End Time', 'Room', 'Reason']];
  const target = singleItem ? [singleItem] : items;
  for (const g of target) {
    data.push([g.faculty.name, g.faculty.department, g.subject, g.batchNames.join(', '), formatDate(g.date), g.start_time, g.end_time, g.room || '', g.reason || '']);
  }
  const ws = XLSX.utils.aoa_to_sheet(data);
  const name = singleItem ? `extra_class_${singleItem.faculty.name}_${singleItem.date}` : `extra_classes_${new Date().toISOString().split('T')[0]}`;
  XLSX.utils.book_append_sheet(wb, ws, 'Extra Classes');
  XLSX.writeFile(wb, `${name}.xlsx`);
}

function exportRescheduledToExcel(items: GroupedReschedule[], singleItem?: GroupedReschedule) {
  const wb = XLSX.utils.book_new();
  const data: (string | number)[][] = [['Faculty', 'Department', 'Subject', 'Batches', 'Date', 'Day', 'Routine Time', 'New Rescheduled Time', 'Room', 'Reason']];
  const target = singleItem ? [singleItem] : items;
  for (const g of target) {
    const routineTime = (g.original_start_time && g.original_end_time) ? `${g.original_start_time} - ${g.original_end_time}` : '';
    const newTime = `${g.new_start_time} - ${g.new_end_time}`;
    data.push([
      g.faculty.name,
      g.faculty.department,
      g.subject,
      g.batchNames.join(', '),
      formatDate(g.new_date || g.original_date || ''),
      g.new_day || g.original_day || '',
      routineTime,
      newTime,
      g.room || '',
      g.reason || '',
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(data);
  const name = singleItem ? `rescheduled_${singleItem.faculty.name}_${singleItem.new_date}` : `rescheduled_classes_${new Date().toISOString().split('T')[0]}`;
  XLSX.utils.book_append_sheet(wb, ws, 'Rescheduled');
  XLSX.writeFile(wb, `${name}.xlsx`);
}

function exportCancelledToExcel(items: GroupedCancelled[], singleItem?: GroupedCancelled) {
  const wb = XLSX.utils.book_new();
  const data: (string | number)[][] = [['Faculty', 'Department', 'Subject', 'Batches', 'Date', 'Day', 'Start Time', 'End Time', 'Room', 'Reason']];
  const target = singleItem ? [singleItem] : items;
  for (const g of target) {
    data.push([g.faculty.name, g.faculty.department, g.subject, g.batchNames.join(', '), formatDate(g.date), g.day_of_week || '', g.start_time || '', g.end_time || '', g.room || '', g.reason || '']);
  }
  const ws = XLSX.utils.aoa_to_sheet(data);
  const name = singleItem ? `cancelled_${singleItem.faculty.name}_${singleItem.date}` : `cancelled_classes_${new Date().toISOString().split('T')[0]}`;
  XLSX.utils.book_append_sheet(wb, ws, 'Cancelled');
  XLSX.writeFile(wb, `${name}.xlsx`);
}

function ExportButtons({ onBulk, onSingle, singleDisabled }: { onBulk: () => void; onSingle: () => void; singleDisabled: boolean }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={onSingle}
        disabled={singleDisabled}
        title="Export this entry"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all duration-200 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Download className="w-3.5 h-3.5" />
        Single
      </button>
      <button
        onClick={onBulk}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 hover:scale-105"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
        Export All
      </button>
    </div>
  );
}

/* ==================== Main View ==================== */

type SubTab = 'liveManager' | 'extra' | 'reschedule' | 'cancelled' | 'holidays';

export function ExtraRescheduleView({
  faculty, batches, loads,
  extraClasses, rescheduledClasses, cancelledClasses, onChange,
}: {
  faculty: Faculty[]; batches: Batch[]; loads: FacultyLoadWithDetails[];
  extraClasses: ExtraClassWithDetails[]; rescheduledClasses: RescheduledClassWithDetails[];
  cancelledClasses: CancelledClassWithDetails[]; onChange: () => void;
}) {
  const [subTab, setSubTab] = useState<SubTab>('liveManager');

  useEffect(() => {
    const handleSubTabChange = (e: any) => {
      if (e.detail?.subTab) {
        setSubTab(e.detail.subTab);
      }
    };
    window.addEventListener('ai-extra-subtab', handleSubTabChange);
    return () => window.removeEventListener('ai-extra-subtab', handleSubTabChange);
  }, []);

  const allSessions = useMemo(() => extractClassSessions(loads), [loads]);
  const runningSessions = useMemo(() => allSessions.filter((s) => s.status === 'running'), [allSessions]);

  const groupedExtra = groupExtraClasses(extraClasses);
  const groupedResched = groupRescheduledClasses(rescheduledClasses);
  const groupedCancel = groupCancelledClasses(cancelledClasses);

  const holidaySpecialCount = useMemo(() => {
    return extraClasses.filter(ec => {
      const hasHoliday = String(ec.reason || '').toLowerCase().includes('holiday');
      const isHolidayDate = DEFAULT_INDIAN_HOLIDAYS.some(h => h.date === ec.date);
      return hasHoliday || isHolidayDate;
    }).length;
  }, [extraClasses]);

  const tabs: { id: SubTab; label: string; icon: typeof CalendarPlus; count: number; color: string }[] = [
    { id: 'liveManager', label: 'Faculty Live Classes', icon: Zap, count: runningSessions.length, color: 'emerald' },
    { id: 'extra', label: 'Extra Classes', icon: CalendarPlus, count: groupedExtra.length, color: 'blue' },
    { id: 'reschedule', label: 'Rescheduled', icon: RefreshCw, count: groupedResched.length, color: 'amber' },
    { id: 'cancelled', label: 'Cancelled', icon: XCircle, count: groupedCancel.length, color: 'red' },
    { id: 'holidays', label: 'Indian Holidays & Special Classes', icon: Sparkles, count: holidaySpecialCount, color: 'purple' },
  ];

  const colorMap: Record<string, { gradient: string; shadow: string; glow: string; bg: string; text: string; badge: string }> = {
    emerald: { gradient: 'from-emerald-600 via-teal-500 to-cyan-500', shadow: 'shadow-emerald-500/30', glow: 'anime-glow-emerald', bg: 'from-emerald-50/80 to-teal-50/80', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-800' },
    blue: { gradient: 'from-blue-600 via-cyan-500 to-teal-400', shadow: 'shadow-blue-500/30', glow: 'anime-glow-blue', bg: 'from-blue-50/80 to-cyan-50/80', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
    amber: { gradient: 'from-amber-500 via-orange-500 to-rose-400', shadow: 'shadow-amber-500/30', glow: 'anime-glow-amber', bg: 'from-amber-50/80 to-orange-50/80', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
    red: { gradient: 'from-red-500 via-rose-500 to-pink-400', shadow: 'shadow-red-500/30', glow: 'anime-glow-red', bg: 'from-red-50/80 to-rose-50/80', text: 'text-red-600', badge: 'bg-red-100 text-red-700' },
    purple: { gradient: 'from-purple-600 via-violet-500 to-indigo-500', shadow: 'shadow-purple-500/30', glow: 'anime-glow-purple', bg: 'from-purple-50/80 to-violet-50/80', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
  };

  return (
    <div className="space-y-6 anime-radial-bg min-h-full rounded-3xl p-4 sm:p-6">
      <div className="flex flex-wrap gap-3">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          const c = colorMap[tab.color];
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              style={{ animationDelay: `${idx * 80}ms` }}
              className={`anime-tab flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 animate-bounce-in ${
                isActive
                  ? `bg-gradient-to-r ${c.gradient} text-white shadow-lg ${c.shadow} ${c.glow} hover:scale-105`
                  : 'bg-white/80 backdrop-blur-sm border border-slate-200/60 text-slate-600 hover:bg-white hover:scale-105 hover:shadow-md'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 transition-transform duration-300 ${isActive ? 'animate-pulse scale-110' : ''}`} />
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all duration-200 anime-badge ${isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {subTab === 'liveManager' && (
        <FacultyLiveClassManager
          faculty={faculty}
          batches={batches}
          loads={loads}
          sessions={allSessions}
          extraClasses={groupedExtra}
          rescheduledClasses={groupedResched}
          onChange={onChange}
          onSwitchTab={(t) => setSubTab(t)}
        />
      )}
      {subTab === 'extra' && <ExtraClassesManager faculty={faculty} batches={batches} loads={loads} groupedItems={groupedExtra} onChange={onChange} />}
      {subTab === 'reschedule' && <RescheduledClassesManager faculty={faculty} batches={batches} loads={loads} groupedItems={groupedResched} onChange={onChange} />}
      {subTab === 'cancelled' && (
        <CancelledClassesManager
          faculty={faculty}
          batches={batches}
          loads={loads}
          groupedItems={groupedCancel}
          extraClasses={groupedExtra}
          rescheduledClasses={groupedResched}
          onChange={onChange}
        />
      )}
      {subTab === 'holidays' && (
        <IndianHolidaysManager
          faculty={faculty}
          batches={batches}
          loads={loads}
          extraClasses={extraClasses}
          onChange={onChange}
        />
      )}
    </div>
  );
}

/* ==================== Empty State ==================== */

function EmptyState({ icon: Icon, message, color }: { icon: typeof CalendarPlus; message: string; color: string }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-16 text-center anime-card animate-bounce-in">
      <AnimeMascot variant="student" color={color === 'from-blue-400 to-cyan-400' ? 'blue' : color === 'from-amber-400 to-orange-400' ? 'amber' : 'red'} size={100} pointing="up" message={message} />
      <p className="text-slate-500 font-medium mt-3">{message}</p>
    </div>
  );
}

function SetupRequired() {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-16 text-center anime-card animate-shake">
      <AnimeMascot variant="alert" color="amber" size={100} pointing="up" message="No timetable classes found!" />
      <h2 className="text-lg font-bold text-slate-900 mb-2 mt-3">Scheduled Classes Required</h2>
      <p className="text-slate-500">Add timetable classes in the Faculty Load section first to enable live class management.</p>
    </div>
  );
}

/* ==================== Batch Tags ==================== */

function BatchTags({ names, color }: { names: string[]; color: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {names.map((name, i) => (
        <span
          key={name}
          style={{ animationDelay: `${i * 50}ms` }}
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${color} animate-pop-in anime-badge border border-current/10`}
        >
          {name}
        </span>
      ))}
    </div>
  );
}

/* ==================== Anime Card Shell ==================== */

function CardShell({
  gradient, icon: Icon, facultyName, department, batchNames, badgeColor,
  onEdit, onDelete, onCancel, children, glowClass, extraButtons,
}: {
  gradient: string; icon: typeof CalendarPlus; facultyName: string; department: string;
  batchNames: string[]; badgeColor: string; onEdit: () => void; onDelete: () => void;
  onCancel?: () => void; children: React.ReactNode; glowClass: string; extraButtons?: React.ReactNode;
}) {
  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 overflow-hidden anime-card animate-impact group ${glowClass}`}>
      <div className={`anime-header-bar px-6 py-3.5 flex items-center justify-between bg-gradient-to-r ${gradient} border-b border-slate-100/80`}>
        <div className="flex items-center gap-2.5 flex-wrap relative z-10">
          <div className="w-8 h-8 rounded-lg bg-white/60 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
            <Icon className="w-4.5 h-4.5 text-slate-700" />
          </div>
          <span className="text-sm font-bold text-slate-900">{facultyName}</span>
          <span className="text-xs text-slate-500 font-medium">({department})</span>
          <BatchTags names={batchNames} color={badgeColor} />
        </div>
        <div className="flex items-center gap-1 shrink-0 relative z-10">
          {extraButtons}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              title="Cancel this class (records in Cancelled Classes)"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200/80 transition-all duration-200 hover:scale-105 active:scale-95 shadow-2xs mr-1"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Cancel</span>
            </button>
          )}
          <button onClick={onEdit} title="Edit details" className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white/60 transition-all duration-200 hover:scale-125 hover:rotate-6">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={onDelete} title="Delete permanently" className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-white/60 transition-all duration-200 hover:scale-125 hover:rotate-6">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-6 relative z-10">{children}</div>
    </div>
  );
}

/* ==================== Anime Form Card ==================== */

function FormCard({ title, icon: Icon, color, children, onSave, isValid, saving, saveLabel }: {
  title: string; icon: typeof CalendarPlus; color: string; children: React.ReactNode;
  onSave: () => void; isValid: boolean; saving: boolean; saveLabel: string;
}) {
  const colorMap: Record<string, { gradient: string; shadow: string; glow: string }> = {
    blue: { gradient: 'from-blue-600 to-cyan-500', shadow: 'shadow-blue-500/25', glow: 'anime-glow-blue' },
    amber: { gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/25', glow: 'anime-glow-amber' },
    red: { gradient: 'from-red-500 to-rose-500', shadow: 'shadow-red-500/25', glow: 'anime-glow-red' },
  };
  const c = colorMap[color];

  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6 anime-card animate-slide-in-right ${c.glow}`}>
      <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center shadow-md ${c.shadow}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {title}
      </h2>
      {children}
      <div className="mt-6 flex justify-end">
        <button
          onClick={onSave}
          disabled={!isValid || saving}
          className={`anime-btn px-7 py-2.5 rounded-xl bg-gradient-to-r ${c.gradient} text-white text-sm font-semibold hover:shadow-lg ${c.shadow} transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 flex items-center gap-2`}
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              {saveLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ==================== Anime Input Field ==================== */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function inputCls() {
  return 'w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent anime-input bg-white transition-all duration-200';
}

/* ==================== Detail Box ==================== */

function DetailBox({ label, children, accent }: { label: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className={`rounded-xl p-3.5 border ${accent || 'bg-slate-50 border-slate-200'}`}>
      <p className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">{label}</p>
      {children}
    </div>
  );
}

/* ==================== Edit Bar ==================== */

function EditBar({ onSave, onCancel, saving, color }: { onSave: () => void; onCancel: () => void; saving: boolean; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-600 to-cyan-500',
    amber: 'from-amber-500 to-orange-500',
    red: 'from-red-500 to-rose-500',
  };
  return (
    <div className="flex gap-2 mt-4">
      <button onClick={onSave} disabled={saving} className={`anime-btn flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gradient-to-r ${colorMap[color]} text-white text-sm font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 hover:scale-105 active:scale-95`}>
        <Save className="w-4 h-4" />
        {saving ? 'Saving...' : 'Save'}
      </button>
      <button onClick={onCancel} className="px-5 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-300 transition-all duration-200 hover:scale-105 active:scale-95">Cancel</button>
    </div>
  );
}

/* ==================== Faculty Live Class Operations Manager ==================== */

function calculateDuration(startTime?: string | null, endTime?: string | null): string {
  if (!startTime || !endTime) return '';
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return '';
  const totalMin = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMin <= 0) return '';
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs} hr${hrs > 1 ? 's' : ''}`;
  return `${mins} min`;
}

function FacultyLiveClassManager({
  faculty,
  batches,
  loads,
  sessions,
  extraClasses = [],
  rescheduledClasses = [],
  onChange,
  onSwitchTab,
}: {
  faculty: Faculty[];
  batches: Batch[];
  loads: FacultyLoadWithDetails[];
  sessions: LiveClassSession[];
  extraClasses?: GroupedExtra[];
  rescheduledClasses?: GroupedReschedule[];
  onChange: () => void;
  onSwitchTab?: (tab: SubTab) => void;
}) {
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyRunning, setShowOnlyRunning] = useState(true);

  // Active action modal
  const [modalType, setModalType] = useState<'reschedule' | 'extra' | 'cancel' | 'editLoad' | null>(null);
  const [activeSession, setActiveSession] = useState<LiveClassSession | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Cancellation for Rescheduled & Extra classes inside Live Class Manager
  const [cancellingExtra, setCancellingExtra] = useState<GroupedExtra | null>(null);
  const [cancellingResched, setCancellingResched] = useState<GroupedReschedule | null>(null);
  const [cancelExtraReschedReason, setCancelExtraReschedReason] = useState('');
  const [isCancellingItem, setIsCancellingItem] = useState(false);

  const facultyRescheduled = useMemo(() => {
    return (rescheduledClasses || []).filter((r) => {
      if (selectedFacultyId !== 'all' && r.faculty_id !== selectedFacultyId) return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        r.faculty.name.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q) ||
        r.batchNames.some((b) => b.toLowerCase().includes(q))
      );
    });
  }, [rescheduledClasses, selectedFacultyId, searchQuery]);

  const facultyExtras = useMemo(() => {
    return (extraClasses || []).filter((e) => {
      if (selectedFacultyId !== 'all' && e.faculty_id !== selectedFacultyId) return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        e.faculty.name.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.batchNames.some((b) => b.toLowerCase().includes(q))
      );
    });
  }, [extraClasses, selectedFacultyId, searchQuery]);

  const handleConfirmCancelExtraInLive = async () => {
    if (!cancellingExtra) return;
    setIsCancellingItem(true);
    try {
      const records = cancellingExtra.rawItems.map((item) => ({
        faculty_id: item.faculty_id,
        batch_id: item.batch_id,
        subject: item.subject.trim(),
        date: item.date,
        day_of_week: null,
        start_time: item.start_time,
        end_time: item.end_time,
        room: item.room,
        reason: cancelExtraReschedReason.trim()
          ? `[Extra Class Cancelled] ${cancelExtraReschedReason.trim()}`
          : '[Extra Class Cancelled]',
      }));

      const { error: cancelError } = await supabase.from('cancelled_classes').insert(records);
      if (cancelError) throw cancelError;

      const { error: delError } = await supabase.from('extra_classes').delete().in('id', cancellingExtra.ids);
      if (delError) throw delError;

      setCancellingExtra(null);
      setCancelExtraReschedReason('');
      setFeedback({ type: 'success', message: `Extra class for "${cancellingExtra.subject}" was cancelled successfully.` });
      onChange();
    } catch (err: any) {
      console.error('Error cancelling extra class:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to cancel extra class.' });
    } finally {
      setIsCancellingItem(false);
    }
  };

  const handleConfirmCancelReschedInLive = async () => {
    if (!cancellingResched) return;
    setIsCancellingItem(true);
    try {
      const records = cancellingResched.rawItems.map((item) => ({
        faculty_id: item.faculty_id,
        batch_id: item.batch_id,
        subject: item.subject.trim(),
        date: item.new_date || item.original_date,
        day_of_week: item.new_day || item.original_day || null,
        start_time: item.original_start_time || item.new_start_time || null,
        end_time: item.original_end_time || item.new_end_time || null,
        room: item.room || null,
        reason: cancelExtraReschedReason.trim()
          ? `[Rescheduled Class Cancelled] ${cancelExtraReschedReason.trim()}`
          : '[Rescheduled Class Cancelled]',
      }));

      const { error: cancelError } = await supabase.from('cancelled_classes').insert(records);
      if (cancelError) throw cancelError;

      const { error: delError } = await supabase.from('rescheduled_classes').delete().in('id', cancellingResched.ids);
      if (delError) throw delError;

      setCancellingResched(null);
      setCancelExtraReschedReason('');
      setFeedback({ type: 'success', message: `Rescheduled class for "${cancellingResched.subject}" was cancelled successfully.` });
      onChange();
    } catch (err: any) {
      console.error('Error cancelling rescheduled class:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to cancel rescheduled class.' });
    } finally {
      setIsCancellingItem(false);
    }
  };

  const [reschedForm, setReschedForm] = useState({
    date: '',
    new_start_time: '09:00',
    new_end_time: '10:00',
    room: '',
    reason: '',
  });

  const [extraForm, setExtraForm] = useState({
    date: '',
    start_time: '09:00',
    end_time: '10:00',
    room: '',
    reason: '',
  });

  const [cancelForm, setCancelForm] = useState({
    date: '',
    room: '',
    reason: '',
  });

  const [editLoadForm, setEditLoadForm] = useState({
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '10:00',
    room: '',
    start_date: '',
    end_date: '',
  });

  // Calculate live running stats per faculty
  const facultyStats = useMemo(() => {
    const map = new Map<string, { running: number; total: number; batchCount: number }>();
    sessions.forEach((s) => {
      if (!map.has(s.faculty_id)) {
        map.set(s.faculty_id, { running: 0, total: 0, batchCount: 0 });
      }
      const stat = map.get(s.faculty_id)!;
      stat.total += 1;
      if (s.status === 'running') stat.running += 1;
      stat.batchCount += s.batch_ids.length;
    });
    return map;
  }, [sessions]);

  // Options for faculty dropdown
  const facultyOptions = useMemo(() => {
    return faculty.map((f) => {
      const stat = facultyStats.get(f.id) || { running: 0, total: 0, batchCount: 0 };
      return {
        ...f,
        runningCount: stat.running,
        totalCount: stat.total,
      };
    }).sort((a, b) => {
      if (b.runningCount !== a.runningCount) return b.runningCount - a.runningCount;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [faculty, facultyStats]);

  const selectedFacultyObj = useMemo(() => {
    if (selectedFacultyId === 'all') return null;
    return faculty.find((f) => f.id === selectedFacultyId) || null;
  }, [faculty, selectedFacultyId]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (selectedFacultyId !== 'all' && s.faculty_id !== selectedFacultyId) return false;
      if (showOnlyRunning && s.status !== 'running') return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        s.faculty_name.toLowerCase().includes(q) ||
        s.subject.toLowerCase().includes(q) ||
        s.day_of_week.toLowerCase().includes(q) ||
        (s.room && s.room.toLowerCase().includes(q)) ||
        s.batchNames.some((b) => b.toLowerCase().includes(q))
      );
    });
  }, [sessions, selectedFacultyId, showOnlyRunning, searchQuery]);

  const totalRunningOverall = useMemo(() => {
    return sessions.filter((s) => s.status === 'running').length;
  }, [sessions]);

  // Auto-dismiss toast feedback
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Handlers to open modals
  const openRescheduleModal = (sess: LiveClassSession) => {
    setActiveSession(sess);
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setReschedForm({
      date: `${y}-${m}-${d}`,
      new_start_time: sess.start_time || '09:00',
      new_end_time: sess.end_time || '10:00',
      room: sess.room || '',
      reason: '',
    });
    setModalType('reschedule');
  };

  const openExtraModal = (sess: LiveClassSession) => {
    setActiveSession(sess);
    setExtraForm({
      date: '',
      start_time: sess.start_time || '09:00',
      end_time: sess.end_time || '10:00',
      room: sess.room || '',
      reason: '',
    });
    setModalType('extra');
  };

  const openCancelModal = (sess: LiveClassSession) => {
    setActiveSession(sess);
    setCancelForm({
      date: '',
      room: sess.room || '',
      reason: '',
    });
    setModalType('cancel');
  };

  const openEditLoadModal = (sess: LiveClassSession) => {
    setActiveSession(sess);
    setEditLoadForm({
      day_of_week: sess.day_of_week || 'Monday',
      start_time: sess.start_time || '09:00',
      end_time: sess.end_time || '10:00',
      room: sess.room || '',
      start_date: sess.start_date || '',
      end_date: sess.end_date || '',
    });
    setModalType('editLoad');
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setModalType(null);
    setActiveSession(null);
  };

  // Reschedule Submit Handler (Only Same Date, New Time)
  const handleRescheduleSubmit = async () => {
    if (!activeSession || !reschedForm.date || !reschedForm.new_start_time || !reschedForm.new_end_time) return;
    setIsSubmitting(true);
    try {
      const d = new Date(reschedForm.date + 'T00:00:00');
      const dayIdx = d.getDay();
      const dayName = !isNaN(d.getTime()) ? DAYS[dayIdx === 0 ? 6 : dayIdx - 1] : (activeSession.day_of_week || 'Monday');

      const records = activeSession.batch_ids.map((bId) => ({
        faculty_id: activeSession.faculty_id,
        batch_id: bId,
        subject: activeSession.subject.trim(),
        original_day: activeSession.day_of_week || dayName,
        original_date: reschedForm.date,
        original_start_time: activeSession.start_time || null,
        original_end_time: activeSession.end_time || null,
        new_day: dayName,
        new_date: reschedForm.date,
        new_start_time: reschedForm.new_start_time,
        new_end_time: reschedForm.new_end_time,
        room: reschedForm.room.trim() || null,
        reason: reschedForm.reason.trim() || null,
      }));

      const { error } = await supabase.from('rescheduled_classes').insert(records);
      if (error) throw error;

      setFeedback({
        type: 'success',
        message: `Successfully rescheduled "${activeSession.subject}" to new time (${reschedForm.new_start_time} - ${reschedForm.new_end_time}) on ${reschedForm.date}!`,
      });
      closeModal();
      onChange();
    } catch (err: any) {
      console.error('Error rescheduling class:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to reschedule class' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Extra Class Submit Handler
  const handleExtraSubmit = async () => {
    if (!activeSession || !extraForm.date || !extraForm.start_time || !extraForm.end_time) return;
    setIsSubmitting(true);
    try {
      const records = activeSession.batch_ids.map((bId) => ({
        faculty_id: activeSession.faculty_id,
        batch_id: bId,
        subject: activeSession.subject.trim(),
        date: extraForm.date,
        start_time: extraForm.start_time,
        end_time: extraForm.end_time,
        room: extraForm.room.trim() || null,
        reason: extraForm.reason.trim() || null,
      }));

      const { error } = await supabase.from('extra_classes').insert(records);
      if (error) throw error;

      setFeedback({
        type: 'success',
        message: `Extra class added for "${activeSession.subject}" across ${activeSession.batch_ids.length} batch(es)!`,
      });
      closeModal();
      onChange();
    } catch (err: any) {
      console.error('Error adding extra class:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to add extra class' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel Submit Handler
  const handleCancelSubmit = async () => {
    if (!activeSession || !cancelForm.date) return;
    setIsSubmitting(true);
    try {
      const records = activeSession.batch_ids.map((bId) => ({
        faculty_id: activeSession.faculty_id,
        batch_id: bId,
        subject: activeSession.subject.trim(),
        date: cancelForm.date,
        day_of_week: activeSession.day_of_week || null,
        start_time: activeSession.start_time || null,
        end_time: activeSession.end_time || null,
        room: cancelForm.room.trim() || activeSession.room || null,
        reason: cancelForm.reason.trim() || null,
      }));

      const { error } = await supabase.from('cancelled_classes').insert(records);
      if (error) throw error;

      setFeedback({
        type: 'success',
        message: `Cancelled lecture on ${formatDate(cancelForm.date)} for "${activeSession.subject}" across ${activeSession.batch_ids.length} batch(es)!`,
      });
      closeModal();
      onChange();
    } catch (err: any) {
      console.error('Error cancelling class:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to cancel class' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Timetable Load Submit Handler
  const handleEditLoadSubmit = async () => {
    if (!activeSession || !editLoadForm.start_time || !editLoadForm.end_time) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('faculty_loads').update({
        day_of_week: editLoadForm.day_of_week,
        start_time: editLoadForm.start_time,
        end_time: editLoadForm.end_time,
        room: editLoadForm.room.trim() || null,
        start_date: editLoadForm.start_date || null,
        end_date: editLoadForm.end_date || null,
      }).in('id', activeSession.loadIds);

      if (error) throw error;

      setFeedback({
        type: 'success',
        message: `Routine timetable updated for "${activeSession.subject}" across ${activeSession.loadIds.length} linked timetable entries!`,
      });
      closeModal();
      onChange();
    } catch (err: any) {
      console.error('Error updating timetable:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to update timetable' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 shadow-lg animate-bounce-in ${
            feedback.type === 'success'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
              : 'bg-gradient-to-r from-rose-500 to-red-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <p className="text-sm font-semibold">{feedback.message}</p>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 rounded-lg hover:bg-white/20 text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Faculty Selector Card */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xl shadow-slate-100/50 space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Faculty Live Class Manager
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  🟢 {totalRunningOverall} Active Live Classes
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Select a faculty member to see their live running classes and make quick changes (Reschedule, Extra Class, Cancel, or Edit).
              </p>
            </div>
          </div>

          {/* Quick Tab Jump */}
          {onSwitchTab && (
            <div className="flex items-center gap-1.5 self-end md:self-auto text-xs font-semibold text-slate-500 bg-slate-100/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => onSwitchTab('reschedule')}
                className="px-2.5 py-1 rounded-lg hover:bg-white hover:text-amber-700 transition-all"
              >
                View Rescheduled
              </button>
              <button
                type="button"
                onClick={() => onSwitchTab('extra')}
                className="px-2.5 py-1 rounded-lg hover:bg-white hover:text-blue-700 transition-all"
              >
                View Extras
              </button>
              <button
                type="button"
                onClick={() => onSwitchTab('cancelled')}
                className="px-2.5 py-1 rounded-lg hover:bg-white hover:text-red-700 transition-all"
              >
                View Cancelled
              </button>
            </div>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          {/* Faculty Dropdown */}
          <div className="sm:col-span-5 relative">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              Select Faculty
            </label>
            <div className="relative">
              <select
                value={selectedFacultyId}
                onChange={(e) => setSelectedFacultyId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-sm font-bold text-slate-800 bg-slate-50/50 hover:bg-white transition-all appearance-none cursor-pointer"
              >
                <option value="all">
                  🌟 All Faculty Members ({totalRunningOverall} Live Classes)
                </option>
                {facultyOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.department ? `(${f.department})` : ''} — {f.runningCount > 0 ? `🟢 ${f.runningCount} Live` : '⚪ No Live'}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Search bar */}
          <div className="sm:col-span-4">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-blue-600" />
              Search Classes
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search subject, batch, room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm font-medium text-slate-800 bg-slate-50/50 hover:bg-white transition-all"
              />
            </div>
          </div>

          {/* Running Only Toggle */}
          <div className="sm:col-span-3 flex flex-col justify-end">
            <button
              type="button"
              onClick={() => setShowOnlyRunning(!showOnlyRunning)}
              className={`w-full py-3 px-3 rounded-2xl border text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                showOnlyRunning
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${showOnlyRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {showOnlyRunning ? '🟢 Running Live Only' : '⚪ All Timetable Loads'}
            </button>
          </div>
        </div>

        {/* Selected Faculty Profile Chip (if specific faculty selected) */}
        {selectedFacultyObj && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-cyan-50/40 border border-emerald-200/80 flex flex-wrap items-center justify-between gap-4 animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-base shadow-md shadow-emerald-600/20">
                {(selectedFacultyObj.name || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{selectedFacultyObj.name}</h3>
                <p className="text-xs text-slate-500 font-medium">Department: <strong className="text-slate-700">{selectedFacultyObj.department || 'N/A'}</strong></p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1.5 rounded-xl bg-white text-emerald-800 text-xs font-bold border border-emerald-200 shadow-2xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                {facultyStats.get(selectedFacultyObj.id)?.running || 0} Running Live Sessions
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-white text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs">
                {facultyStats.get(selectedFacultyObj.id)?.total || 0} Total Routine Slots
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Live Class Cards Grid */}
      {filteredSessions.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/60 p-16 text-center anime-card animate-bounce-in space-y-3">
          <AnimeMascot variant="student" color="emerald" size={90} pointing="up" message="No matching live classes found" />
          <h3 className="text-base font-bold text-slate-800">No active live running classes match your filters</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {showOnlyRunning
              ? 'Classes might be scheduled for future dates or have expired dates in their Syllabus Planner. You can toggle "All Timetable Loads" above to see scheduled classes.'
              : 'No timetable classes found for this faculty in Supabase. Add timetable entries in the Faculty Load section.'}
          </p>
          {showOnlyRunning && (
            <button
              type="button"
              onClick={() => setShowOnlyRunning(false)}
              className="mt-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all"
            >
              Show All Timetable Classes
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-card-stagger">
          {filteredSessions.map((sess) => {
            const isLive = sess.status === 'running';
            const duration = calculateDuration(sess.start_time, sess.end_time);

            return (
              <div
                key={sess.key}
                className="bg-white rounded-3xl border-2 border-slate-200/80 hover:border-emerald-400 p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group anime-card"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                          isLive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        {isLive ? 'LIVE RUNNING CLASS' : sess.status.toUpperCase()}
                      </span>
                      {sess.start_date && sess.end_date && (
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                          {sess.start_date} to {sess.end_date}
                        </span>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {sess.batch_ids.length} {sess.batch_ids.length === 1 ? 'Batch' : 'Batches'}
                      </span>
                    </div>
                  </div>

                  {/* Subject & Faculty Title */}
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <h4 className="text-lg font-black text-slate-900 leading-snug group-hover:text-emerald-700 transition-colors">
                        {sess.subject}
                      </h4>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 mt-1 pl-10">
                      Faculty: <span className="text-slate-800 font-bold">{sess.faculty_name}</span> ({sess.department})
                    </p>
                  </div>

                  {/* Schedule Details Row */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-0.5">
                        <Calendar className="w-3 h-3 text-emerald-600" />
                        Day & Time
                      </p>
                      <p className="font-bold text-slate-800">
                        {sess.day_of_week}
                      </p>
                      <p className="text-slate-600 text-[11px]">
                        {sess.start_time} - {sess.end_time} {duration ? `(${duration})` : ''}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-0.5">
                        <Building2 className="w-3 h-3 text-cyan-600" />
                        Room / Hall
                      </p>
                      <p className="font-bold text-slate-800 truncate">
                        {sess.room || 'Not assigned'}
                      </p>
                      <p className="text-slate-400 text-[11px]">
                        Multi-batch sync enabled
                      </p>
                    </div>
                  </div>

                  {/* Connected Batches */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-purple-600" />
                        Connected Batches ({sess.batchNames.length})
                      </span>
                      <span className="text-[10px] text-emerald-700 lowercase font-bold">
                        Changes apply to all
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                      {sess.batchNames.map((bName) => (
                        <span
                          key={bName}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {bName}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="pt-5 mt-4 border-t border-slate-100 space-y-2">
                  <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Make Changes to This Live Class:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openRescheduleModal(sess)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-sm shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reschedule
                    </button>

                    <button
                      type="button"
                      onClick={() => openExtraModal(sess)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-xs font-bold shadow-sm shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Extra Class
                    </button>

                    <button
                      type="button"
                      onClick={() => openCancelModal(sess)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white text-xs font-bold shadow-sm shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Cancel Lecture
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditLoadModal(sess)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white text-xs font-bold shadow-sm hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit Timetable
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Rescheduled Classes for selected faculty */}
      {facultyRescheduled.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-slate-200/80 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              Active Rescheduled Classes ({facultyRescheduled.length})
            </h3>
            {onSwitchTab && (
              <button
                type="button"
                onClick={() => onSwitchTab('reschedule')}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1"
              >
                Go to Rescheduled Tab <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facultyRescheduled.map((r) => (
              <div
                key={r.key}
                className="bg-amber-50/70 rounded-3xl border-2 border-amber-200/90 p-5 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                      RESCHEDULED CLASS
                    </span>
                    <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-amber-200">
                      {r.batchNames.length} {r.batchNames.length === 1 ? 'Batch' : 'Batches'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-slate-900">{r.subject}</h4>
                    <p className="text-xs text-slate-600 font-medium">Faculty: <strong className="text-slate-800">{r.faculty.name}</strong></p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white rounded-xl p-2.5 border border-amber-200/60">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Date & Rescheduled Time</p>
                      <p className="font-bold text-slate-900">{formatDate(r.new_date)}</p>
                      <p className="font-bold text-amber-700">{r.new_start_time} - {r.new_end_time}</p>
                    </div>
                    <div className="bg-white rounded-xl p-2.5 border border-amber-200/60">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Original Routine Slot</p>
                      <p className="font-semibold text-slate-700">{r.original_day || r.new_day}</p>
                      <p className="text-slate-500">{r.original_start_time ? `${r.original_start_time} - ${r.original_end_time}` : 'Routine time'}</p>
                    </div>
                  </div>

                  {r.reason && (
                    <p className="text-xs text-amber-900 bg-white/80 p-2 rounded-xl border border-amber-200/50">
                      <strong>Reason:</strong> {r.reason}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {r.batchNames.map((b) => (
                      <span key={b} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white text-slate-700 border border-amber-200">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-amber-200/60 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500">Need to cancel this rescheduled class?</span>
                  <button
                    type="button"
                    onClick={() => { setCancellingResched(r); setCancelExtraReschedReason(''); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-bold shadow-sm shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel Lecture
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Extra Classes for selected faculty */}
      {facultyExtras.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-slate-200/80 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              Active Extra Classes ({facultyExtras.length})
            </h3>
            {onSwitchTab && (
              <button
                type="button"
                onClick={() => onSwitchTab('extra')}
                className="text-xs font-bold text-blue-700 hover:text-blue-800 hover:underline flex items-center gap-1"
              >
                Go to Extra Classes Tab <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facultyExtras.map((e) => (
              <div
                key={e.key}
                className="bg-blue-50/70 rounded-3xl border-2 border-blue-200/90 p-5 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-300">
                      EXTRA CLASS
                    </span>
                    <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-blue-200">
                      {e.batchNames.length} {e.batchNames.length === 1 ? 'Batch' : 'Batches'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-slate-900">{e.subject}</h4>
                    <p className="text-xs text-slate-600 font-medium">Faculty: <strong className="text-slate-800">{e.faculty.name}</strong></p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white rounded-xl p-2.5 border border-blue-200/60">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Date</p>
                      <p className="font-bold text-slate-900">{formatDate(e.date)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-2.5 border border-blue-200/60">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Time</p>
                      <p className="font-bold text-blue-700">{e.start_time} - {e.end_time}</p>
                    </div>
                  </div>

                  {e.reason && (
                    <p className="text-xs text-blue-900 bg-white/80 p-2 rounded-xl border border-blue-200/50">
                      <strong>Reason:</strong> {e.reason}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {e.batchNames.map((b) => (
                      <span key={b} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white text-slate-700 border border-blue-200">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-blue-200/60 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500">Need to cancel this extra class?</span>
                  <button
                    type="button"
                    onClick={() => { setCancellingExtra(e); setCancelExtraReschedReason(''); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-bold shadow-sm shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel Class
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= MODAL: Reschedule Live Class ================= */}
      {modalType === 'reschedule' && activeSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in-up">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Reschedule Live Class</h3>
                  <p className="text-xs text-slate-500">Will shift lecture across all {activeSession.batch_ids.length} linked batches</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target session info preview */}
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900">{activeSession.subject}</span>
                <span className="font-bold text-amber-800">{activeSession.faculty_name}</span>
              </div>
              <p className="text-slate-600">
                Routine Slot: {activeSession.day_of_week}, {activeSession.start_time} - {activeSession.end_time}
                {activeSession.room ? ` (Room: ${activeSession.room})` : ''}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {activeSession.batchNames.map((b) => (
                  <span key={b} className="px-2 py-0.5 rounded bg-white text-slate-700 text-[10px] font-semibold border border-amber-200">
                    {b}
                  </span>
                ))}
              </div>
            </div>

            {/* Form Fields: Only Same Date, New Time */}
            <div className="space-y-3.5">
              <Field label="Lecture Date * (Reschedule on same date)">
                <input
                  type="date"
                  required
                  value={reschedForm.date}
                  onChange={(e) => setReschedForm({ ...reschedForm, date: e.target.value })}
                  className={inputCls()}
                />
              </Field>

              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    New Time Slot on Same Date
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Routine: {activeSession.start_time} - {activeSession.end_time}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="New Start Time *">
                    <input
                      type="time"
                      required
                      value={reschedForm.new_start_time}
                      onChange={(e) => setReschedForm({ ...reschedForm, new_start_time: e.target.value })}
                      className={inputCls()}
                    />
                  </Field>
                  <Field label="New End Time *">
                    <input
                      type="time"
                      required
                      value={reschedForm.new_end_time}
                      onChange={(e) => setReschedForm({ ...reschedForm, new_end_time: e.target.value })}
                      className={inputCls()}
                    />
                  </Field>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Room (optional)">
                  <input
                    type="text"
                    placeholder="e.g. Room 204"
                    value={reschedForm.room}
                    onChange={(e) => setReschedForm({ ...reschedForm, room: e.target.value })}
                    className={inputCls()}
                  />
                </Field>
                <Field label="Reason (optional)">
                  <input
                    type="text"
                    placeholder="e.g. Shifted due to morning meeting / faculty slot change"
                    value={reschedForm.reason}
                    onChange={(e) => setReschedForm({ ...reschedForm, reason: e.target.value })}
                    className={inputCls()}
                  />
                </Field>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRescheduleSubmit}
                disabled={isSubmitting || !reschedForm.date || !reschedForm.new_start_time || !reschedForm.new_end_time}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-lg shadow-amber-500/25 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {isSubmitting ? 'Rescheduling...' : `Reschedule for all ${activeSession.batch_ids.length} Batches`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: Add Extra Class ================= */}
      {modalType === 'extra' && activeSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in-up">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <CalendarPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Add Extra Class</h3>
                  <p className="text-xs text-slate-500">Auto-links faculty, subject & ${activeSession.batch_ids.length} batches</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target session info preview */}
            <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900">{activeSession.subject}</span>
                <span className="font-bold text-blue-800">{activeSession.faculty_name}</span>
              </div>
              <p className="text-slate-600">All Batches: {activeSession.batchNames.join(', ')}</p>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Extra Class Date *">
                  <input
                    type="date"
                    required
                    value={extraForm.date}
                    onChange={(e) => setExtraForm({ ...extraForm, date: e.target.value })}
                    className={inputCls()}
                  />
                </Field>
                <Field label="Room (optional)">
                  <input
                    type="text"
                    placeholder="e.g. Room 101"
                    value={extraForm.room}
                    onChange={(e) => setExtraForm({ ...extraForm, room: e.target.value })}
                    className={inputCls()}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Start Time *">
                  <input
                    type="time"
                    required
                    value={extraForm.start_time}
                    onChange={(e) => setExtraForm({ ...extraForm, start_time: e.target.value })}
                    className={inputCls()}
                  />
                </Field>
                <Field label="End Time *">
                  <input
                    type="time"
                    required
                    value={extraForm.end_time}
                    onChange={(e) => setExtraForm({ ...extraForm, end_time: e.target.value })}
                    className={inputCls()}
                  />
                </Field>
              </div>

              <Field label="Reason (optional)">
                <input
                  type="text"
                  placeholder="e.g. Syllabus revision, exam preparation"
                  value={extraForm.reason}
                  onChange={(e) => setExtraForm({ ...extraForm, reason: e.target.value })}
                  className={inputCls()}
                />
              </Field>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExtraSubmit}
                disabled={isSubmitting || !extraForm.date || !extraForm.start_time || !extraForm.end_time}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                {isSubmitting ? 'Adding...' : `Add Extra Class (${activeSession.batch_ids.length} Batches)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: Cancel Lecture ================= */}
      {modalType === 'cancel' && activeSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in-up">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Cancel Lecture</h3>
                  <p className="text-xs text-slate-500">Record a cancelled session across {activeSession.batch_ids.length} batches</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target session info preview */}
            <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900">{activeSession.subject}</span>
                <span className="font-bold text-rose-800">{activeSession.faculty_name}</span>
              </div>
              <p className="text-slate-600">
                Slot: {activeSession.day_of_week}, {activeSession.start_time} - {activeSession.end_time} • Batches: {activeSession.batchNames.join(', ')}
              </p>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Date of Cancellation *">
                  <input
                    type="date"
                    required
                    value={cancelForm.date}
                    onChange={(e) => setCancelForm({ ...cancelForm, date: e.target.value })}
                    className={inputCls()}
                  />
                </Field>
                <Field label="Room (optional)">
                  <input
                    type="text"
                    placeholder="e.g. Room 101"
                    value={cancelForm.room}
                    onChange={(e) => setCancelForm({ ...cancelForm, room: e.target.value })}
                    className={inputCls()}
                  />
                </Field>
              </div>

              <Field label="Reason (optional)">
                <input
                  type="text"
                  placeholder="e.g. Faculty medical leave, campus event, holiday"
                  value={cancelForm.reason}
                  onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })}
                  className={inputCls()}
                />
              </Field>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCancelSubmit}
                disabled={isSubmitting || !cancelForm.date}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-bold shadow-lg shadow-red-500/25 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
              >
                <XCircle className="w-3.5 h-3.5" />
                {isSubmitting ? 'Cancelling...' : `Confirm Cancellation (${activeSession.batch_ids.length} Batches)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: Edit Timetable Load ================= */}
      {modalType === 'editLoad' && activeSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in-up">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Edit Routine Timetable</h3>
                  <p className="text-xs text-slate-500">Directly updates the base timetable for all {activeSession.loadIds.length} linked entries</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target session info preview */}
            <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900">{activeSession.subject}</span>
                <span className="font-bold text-indigo-800">{activeSession.faculty_name}</span>
              </div>
              <p className="text-slate-600">All Linked Batches: {activeSession.batchNames.join(', ')}</p>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Day of Week *">
                  <select
                    value={editLoadForm.day_of_week}
                    onChange={(e) => setEditLoadForm({ ...editLoadForm, day_of_week: e.target.value })}
                    className={inputCls()}
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Start Time *">
                  <input
                    type="time"
                    required
                    value={editLoadForm.start_time}
                    onChange={(e) => setEditLoadForm({ ...editLoadForm, start_time: e.target.value })}
                    className={inputCls()}
                  />
                </Field>
                <Field label="End Time *">
                  <input
                    type="time"
                    required
                    value={editLoadForm.end_time}
                    onChange={(e) => setEditLoadForm({ ...editLoadForm, end_time: e.target.value })}
                    className={inputCls()}
                  />
                </Field>
              </div>

              <Field label="Room / Hall (optional)">
                <input
                  type="text"
                  placeholder="e.g. Room 204"
                  value={editLoadForm.room}
                  onChange={(e) => setEditLoadForm({ ...editLoadForm, room: e.target.value })}
                  className={inputCls()}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Start Date (Planner)">
                  <input
                    type="date"
                    value={editLoadForm.start_date}
                    onChange={(e) => setEditLoadForm({ ...editLoadForm, start_date: e.target.value })}
                    className={inputCls()}
                  />
                </Field>
                <Field label="End Date (Planner)">
                  <input
                    type="date"
                    value={editLoadForm.end_date}
                    onChange={(e) => setEditLoadForm({ ...editLoadForm, end_date: e.target.value })}
                    className={inputCls()}
                  />
                </Field>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditLoadSubmit}
                disabled={isSubmitting || !editLoadForm.start_time || !editLoadForm.end_time}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                {isSubmitting ? 'Saving...' : `Update Routine Timetable (${activeSession.loadIds.length} Entries)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cancel Rescheduled Class Confirmation (inside Live Class Manager) */}
      {cancellingResched && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in-up">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Cancel Rescheduled Class</h3>
                  <p className="text-xs text-slate-500">Will move to Cancelled Classes for all {cancellingResched.batchNames.length} batch(es)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancellingResched(null)}
                disabled={isCancellingItem}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Class info preview */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-sm">{cancellingResched.subject}</span>
                <span className="font-bold text-amber-800">{cancellingResched.faculty.name}</span>
              </div>
              <p className="text-slate-600">
                Rescheduled to: {formatDate(cancellingResched.new_date)} • {cancellingResched.new_start_time} - {cancellingResched.new_end_time}
                {cancellingResched.room ? ` • Room: ${cancellingResched.room}` : ''}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {cancellingResched.batchNames.map((b) => (
                  <span key={b} className="px-2 py-0.5 rounded bg-white text-slate-700 text-[10px] font-semibold border border-amber-200">
                    {b}
                  </span>
                ))}
              </div>
            </div>

            {/* Cancellation Reason */}
            <div className="space-y-2">
              <Field label="Cancellation Reason (optional)">
                <input
                  type="text"
                  placeholder="e.g. Faculty unavailable, rescheduled slot conflict, holiday"
                  value={cancelExtraReschedReason}
                  onChange={(e) => setCancelExtraReschedReason(e.target.value)}
                  className={inputCls()}
                />
              </Field>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Faculty unavailable', 'Slot conflict', 'Health emergency', 'College event'].map((quickReason) => (
                  <button
                    key={quickReason}
                    type="button"
                    onClick={() => setCancelExtraReschedReason(quickReason)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  >
                    + {quickReason}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancellingResched(null)}
                disabled={isCancellingItem}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                Keep Rescheduled Class
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelReschedInLive}
                disabled={isCancellingItem}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-bold shadow-lg shadow-red-500/25 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
              >
                <XCircle className="w-3.5 h-3.5" />
                {isCancellingItem ? 'Cancelling...' : `Confirm & Cancel Rescheduled Class`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cancel Extra Class Confirmation (inside Live Class Manager) */}
      {cancellingExtra && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in-up">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Cancel Extra Class</h3>
                  <p className="text-xs text-slate-500">Will move to Cancelled Classes for all {cancellingExtra.batchNames.length} batch(es)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancellingExtra(null)}
                disabled={isCancellingItem}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Class info preview */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-sm">{cancellingExtra.subject}</span>
                <span className="font-bold text-blue-800">{cancellingExtra.faculty.name}</span>
              </div>
              <p className="text-slate-600">
                Scheduled: {formatDate(cancellingExtra.date)} • {cancellingExtra.start_time} - {cancellingExtra.end_time}
                {cancellingExtra.room ? ` • Room: ${cancellingExtra.room}` : ''}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {cancellingExtra.batchNames.map((b) => (
                  <span key={b} className="px-2 py-0.5 rounded bg-white text-slate-700 text-[10px] font-semibold border border-blue-200">
                    {b}
                  </span>
                ))}
              </div>
            </div>

            {/* Cancellation Reason */}
            <div className="space-y-2">
              <Field label="Cancellation Reason (optional)">
                <input
                  type="text"
                  placeholder="e.g. Faculty unavailable, syllabus covered, emergency"
                  value={cancelExtraReschedReason}
                  onChange={(e) => setCancelExtraReschedReason(e.target.value)}
                  className={inputCls()}
                />
              </Field>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Faculty unavailable', 'Health emergency', 'College event', 'Holiday'].map((quickReason) => (
                  <button
                    key={quickReason}
                    type="button"
                    onClick={() => setCancelExtraReschedReason(quickReason)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  >
                    + {quickReason}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancellingExtra(null)}
                disabled={isCancellingItem}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                Keep Extra Class
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelExtraInLive}
                disabled={isCancellingItem}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-bold shadow-lg shadow-red-500/25 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
              >
                <XCircle className="w-3.5 h-3.5" />
                {isCancellingItem ? 'Cancelling...' : `Confirm & Cancel Extra Class`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== Extra Classes Manager ==================== */

function ExtraClassesManager({ faculty, batches, loads, groupedItems, onChange }: {
  faculty: Faculty[]; batches: Batch[]; loads: FacultyLoadWithDetails[];
  groupedItems: GroupedExtra[]; onChange: () => void;
}) {
  const sessions = extractClassSessions(loads);
  const [selectedSession, setSelectedSession] = useState<LiveClassSession | null>(null);
  const [form, setForm] = useState({
    date: '',
    start_time: '09:00',
    end_time: '10:00',
    room: '',
    reason: '',
  });
  const [saving, setSaving] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ subject: '', date: '', start_time: '', end_time: '', room: '', reason: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('all');
  const [cancellingGroup, setCancellingGroup] = useState<GroupedExtra | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const facultyOptions = useMemo(() => {
    const map = new Map<string, number>();
    groupedItems.forEach((g) => {
      map.set(g.faculty.id, (map.get(g.faculty.id) || 0) + 1);
    });
    return faculty
      .filter((f) => map.has(f.id))
      .map((f) => ({ ...f, count: map.get(f.id) || 0 }))
      .sort((a, b) => b.count - a.count || (a.name || '').localeCompare(b.name || ''));
  }, [faculty, groupedItems]);

  const filtered = useMemo(() => {
    return groupedItems.filter((g) => {
      if (selectedFacultyId !== 'all' && g.faculty.id !== selectedFacultyId) return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        g.faculty.name.toLowerCase().includes(q) ||
        g.subject.toLowerCase().includes(q) ||
        (g.faculty.department && g.faculty.department.toLowerCase().includes(q)) ||
        (g.room && g.room.toLowerCase().includes(q)) ||
        (g.reason && g.reason.toLowerCase().includes(q)) ||
        g.batchNames.some((b) => b.toLowerCase().includes(q))
      );
    });
  }, [groupedItems, selectedFacultyId, searchQuery]);

  const isValid = selectedSession && form.date && form.start_time && form.end_time;

  const handleSelectSession = (s: LiveClassSession | null) => {
    setSelectedSession(s);
    if (s) {
      setForm((prev) => ({
        ...prev,
        start_time: s.start_time || prev.start_time,
        end_time: s.end_time || prev.end_time,
        room: s.room || prev.room,
      }));
    }
  };

  const handleSubmit = async () => {
    if (!isValid || !selectedSession) return;
    setSaving(true);
    const records = selectedSession.batch_ids.map((batch_id) => ({
      faculty_id: selectedSession.faculty_id,
      batch_id,
      subject: selectedSession.subject.trim(),
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      room: form.room.trim() || null,
      reason: form.reason.trim() || null,
    }));
    await supabase.from('extra_classes').insert(records);
    setSaving(false);
    setSelectedSession(null);
    setForm({ date: '', start_time: '09:00', end_time: '10:00', room: '', reason: '' });
    onChange();
  };

  const handleDeleteGroup = async (ids: string[]) => {
    await supabase.from('extra_classes').delete().in('id', ids);
    onChange();
  };

  const handleConfirmCancelExtra = async () => {
    if (!cancellingGroup) return;
    setIsCancelling(true);
    try {
      const records = cancellingGroup.rawItems.map((item) => ({
        faculty_id: item.faculty_id,
        batch_id: item.batch_id,
        subject: item.subject.trim(),
        date: item.date,
        day_of_week: null,
        start_time: item.start_time,
        end_time: item.end_time,
        room: item.room,
        reason: cancelReason.trim()
          ? `[Extra Class Cancelled] ${cancelReason.trim()}`
          : '[Extra Class Cancelled]',
      }));

      const { error: cancelError } = await supabase.from('cancelled_classes').insert(records);
      if (cancelError) throw cancelError;

      const { error: delError } = await supabase.from('extra_classes').delete().in('id', cancellingGroup.ids);
      if (delError) throw delError;

      setCancellingGroup(null);
      setCancelReason('');
      onChange();
    } catch (err: any) {
      console.error('Error cancelling extra class:', err);
      alert(err.message || 'Failed to cancel extra class');
    } finally {
      setIsCancelling(false);
    }
  };

  const startEdit = (g: GroupedExtra) => {
    setEditingKey(g.key);
    setEditForm({ subject: g.subject, date: g.date, start_time: g.start_time, end_time: g.end_time, room: g.room || '', reason: g.reason || '' });
  };

  const saveEdit = async (ids: string[]) => {
    setSavingEdit(true);
    await supabase.from('extra_classes').update({
      subject: editForm.subject.trim(), date: editForm.date,
      start_time: editForm.start_time, end_time: editForm.end_time,
      room: editForm.room.trim() || null, reason: editForm.reason.trim() || null,
    }).in('id', ids);
    setSavingEdit(false);
    setEditingKey(null);
    onChange();
  };

  if (faculty.length === 0 || loads.length === 0) return <SetupRequired />;

  return (
    <div className="space-y-6">
      <FormCard title="Add Extra Class" icon={CalendarPlus} color="blue" onSave={handleSubmit} isValid={!!isValid} saving={saving} saveLabel="Add Extra Class">
        <div className="space-y-4">
          <Field label="Live Scheduled Class (select to link faculty, subject & all batches)">
            <LiveClassSelect
              sessions={sessions}
              selectedSession={selectedSession}
              onSelect={handleSelectSession}
              themeColor="blue"
            />
          </Field>

          {selectedSession && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up">
              <Field label="Extra Class Date">
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls()} />
              </Field>
              <Field label="Room (optional)">
                <input type="text" placeholder="e.g., Room 101" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} className={inputCls()} />
              </Field>
              <Field label="Start Time">
                <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={inputCls()} />
              </Field>
              <Field label="End Time">
                <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className={inputCls()} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Reason (optional)">
                  <input type="text" placeholder="e.g., Make-up for missed lecture, revision session" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={inputCls()} />
                </Field>
              </div>
            </div>
          )}
        </div>
      </FormCard>

      {groupedItems.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-fade-in-up bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex-1">
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search subject, faculty, batch, room..." />
          </div>

          {facultyOptions.length > 0 && (
            <div className="relative shrink-0 min-w-[200px]">
              <select
                value={selectedFacultyId}
                onChange={(e) => setSelectedFacultyId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
              >
                <option value="all">👥 All Faculty ({groupedItems.length})</option>
                {facultyOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.count})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 font-semibold whitespace-nowrap bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
              {filtered.length} of {groupedItems.length}
            </span>
            {(selectedFacultyId !== 'all' || searchQuery.trim()) && (
              <button
                type="button"
                onClick={() => { setSelectedFacultyId('all'); setSearchQuery(''); }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline px-1 py-1"
              >
                Clear
              </button>
            )}
          </div>

          <ExportButtons onBulk={() => exportExtrasToExcel(filtered)} onSingle={() => filtered[0] && exportExtrasToExcel(filtered, filtered[0])} singleDisabled={filtered.length === 0} />
        </div>
      )}

      {groupedItems.length === 0 ? (
        <EmptyState icon={CalendarPlus} message="No extra classes recorded yet." color="from-blue-400 to-cyan-400" />
      ) : filtered.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-slate-200/80 p-12 text-center anime-card animate-bounce-in space-y-3">
          <AnimeMascot variant="student" color="blue" size={80} pointing="up" message="No matching extra classes" />
          <h3 className="text-base font-bold text-slate-800">No extra classes match your filter</h3>
          <p className="text-xs text-slate-500">Try selecting another faculty member or clearing the search query.</p>
          <button
            type="button"
            onClick={() => { setSelectedFacultyId('all'); setSearchQuery(''); }}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all"
          >
            Show All Extra Classes
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-card-stagger">
          {filtered.map((g) => {
            const isEditing = editingKey === g.key;
            return (
              <CardShell
                key={g.key}
                gradient="from-blue-50/80 to-cyan-50/80"
                icon={CalendarPlus}
                facultyName={g.faculty.name}
                department={g.faculty.department}
                batchNames={g.batchNames}
                badgeColor="bg-blue-100 text-blue-700"
                onCancel={() => { setCancellingGroup(g); setCancelReason(''); }}
                onEdit={() => startEdit(g)}
                onDelete={() => handleDeleteGroup(g.ids)}
                glowClass="anime-glow-blue"
                extraButtons={<button onClick={() => exportExtrasToExcel([], g)} title="Export this entry" className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-200 hover:scale-125 hover:rotate-6"><Download className="w-4 h-4" /></button>}
              >
                {isEditing ? (
                  <div className="space-y-3 animate-fade-back">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Subject"><input type="text" value={editForm.subject} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })} className={inputCls()} /></Field>
                      <Field label="Date"><input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className={inputCls()} /></Field>
                      <Field label="Start Time"><input type="time" value={editForm.start_time} onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })} className={inputCls()} /></Field>
                      <Field label="End Time"><input type="time" value={editForm.end_time} onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })} className={inputCls()} /></Field>
                      <Field label="Room"><input type="text" value={editForm.room} onChange={(e) => setEditForm({ ...editForm, room: e.target.value })} className={inputCls()} /></Field>
                      <Field label="Reason"><input type="text" value={editForm.reason} onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })} className={inputCls()} /></Field>
                    </div>
                    <EditBar onSave={() => saveEdit(g.ids)} onCancel={() => setEditingKey(null)} saving={savingEdit} color="blue" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <BookOpen className="w-5.5 h-5.5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-base">{g.subject}</p>
                        <p className="text-sm text-slate-500 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />{g.start_time} - {g.end_time}
                          {g.room && <><span className="text-slate-300">|</span><span>{g.room}</span></>}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <DetailBox label="Date"><p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-blue-500" />{formatDate(g.date)}</p></DetailBox>
                      <DetailBox label="Time"><p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-500" />{g.start_time} - {g.end_time}</p></DetailBox>
                    </div>
                    {g.reason && <div className="mt-3 rounded-xl bg-blue-50/80 p-3 border border-blue-200/60 animate-fade-in-up"><p className="text-xs text-blue-600 mb-0.5 font-semibold uppercase tracking-wide">Reason</p><p className="text-sm text-blue-900">{g.reason}</p></div>}

                    {/* Bottom Cancel Button */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-400">Want to cancel this extra class?</span>
                      <button
                        type="button"
                        onClick={() => { setCancellingGroup(g); setCancelReason(''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200/80 transition-all hover:scale-105 active:scale-95 shadow-2xs"
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        Cancel Class
                      </button>
                    </div>
                  </>
                )}
              </CardShell>
            );
          })}
        </div>
      )}

      {/* Modal: Cancel Extra Class Confirmation */}
      {cancellingGroup && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in-up">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Cancel Extra Class</h3>
                  <p className="text-xs text-slate-500">Will move to Cancelled Classes for all {cancellingGroup.batchNames.length} batch(es)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancellingGroup(null)}
                disabled={isCancelling}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Class info preview */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-sm">{cancellingGroup.subject}</span>
                <span className="font-bold text-blue-800">{cancellingGroup.faculty.name}</span>
              </div>
              <p className="text-slate-600">
                Scheduled: {formatDate(cancellingGroup.date)} • {cancellingGroup.start_time} - {cancellingGroup.end_time}
                {cancellingGroup.room ? ` • Room: ${cancellingGroup.room}` : ''}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {cancellingGroup.batchNames.map((b) => (
                  <span key={b} className="px-2 py-0.5 rounded bg-white text-slate-700 text-[10px] font-semibold border border-blue-200">
                    {b}
                  </span>
                ))}
              </div>
            </div>

            {/* Cancellation Reason */}
            <div className="space-y-2">
              <Field label="Cancellation Reason (optional)">
                <input
                  type="text"
                  placeholder="e.g. Faculty unavailable, syllabus already completed, emergency"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className={inputCls()}
                />
              </Field>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Faculty unavailable', 'Health emergency', 'College event', 'Holiday'].map((quickReason) => (
                  <button
                    key={quickReason}
                    type="button"
                    onClick={() => setCancelReason(quickReason)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  >
                    + {quickReason}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancellingGroup(null)}
                disabled={isCancelling}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                Keep Class
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelExtra}
                disabled={isCancelling}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-bold shadow-lg shadow-red-500/25 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
              >
                <XCircle className="w-3.5 h-3.5" />
                {isCancelling ? 'Cancelling...' : `Confirm & Cancel Extra Class`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== Rescheduled Classes Manager ==================== */

function RescheduledClassesManager({ faculty, batches, loads, groupedItems, onChange }: {
  faculty: Faculty[]; batches: Batch[]; loads: FacultyLoadWithDetails[];
  groupedItems: GroupedReschedule[]; onChange: () => void;
}) {
  const sessions = extractClassSessions(loads);
  const [selectedSession, setSelectedSession] = useState<LiveClassSession | null>(null);
  const [form, setForm] = useState({
    date: '',
    new_start_time: '09:00',
    new_end_time: '10:00',
    room: '',
    reason: '',
  });
  const [saving, setSaving] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ date: '', new_start_time: '', new_end_time: '', room: '', reason: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('all');

  // Cancellation State
  const [cancellingGroup, setCancellingGroup] = useState<GroupedReschedule | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const facultyOptions = useMemo(() => {
    const map = new Map<string, number>();
    groupedItems.forEach((g) => {
      map.set(g.faculty.id, (map.get(g.faculty.id) || 0) + 1);
    });
    return faculty
      .filter((f) => map.has(f.id))
      .map((f) => ({ ...f, count: map.get(f.id) || 0 }))
      .sort((a, b) => b.count - a.count || (a.name || '').localeCompare(b.name || ''));
  }, [faculty, groupedItems]);

  const filtered = useMemo(() => {
    return groupedItems.filter((g) => {
      if (selectedFacultyId !== 'all' && g.faculty.id !== selectedFacultyId) return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        g.faculty.name.toLowerCase().includes(q) ||
        g.subject.toLowerCase().includes(q) ||
        (g.faculty.department && g.faculty.department.toLowerCase().includes(q)) ||
        (g.room && g.room.toLowerCase().includes(q)) ||
        (g.reason && g.reason.toLowerCase().includes(q)) ||
        g.batchNames.some((b) => b.toLowerCase().includes(q))
      );
    });
  }, [groupedItems, selectedFacultyId, searchQuery]);
  const isValid = selectedSession && form.date && form.new_start_time && form.new_end_time;

  const handleSelectSession = (s: LiveClassSession | null) => {
    setSelectedSession(s);
    if (s) {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      setForm((prev) => ({
        ...prev,
        date: prev.date || `${y}-${m}-${d}`,
        new_start_time: s.start_time || prev.new_start_time,
        new_end_time: s.end_time || prev.new_end_time,
        room: s.room || prev.room,
      }));
    }
  };

  const handleSubmit = async () => {
    if (!isValid || !selectedSession) return;
    setSaving(true);
    const d = new Date(form.date + 'T00:00:00');
    const dayIdx = d.getDay();
    const dayName = !isNaN(d.getTime()) ? DAYS[dayIdx === 0 ? 6 : dayIdx - 1] : (selectedSession.day_of_week || 'Monday');

    const records = selectedSession.batch_ids.map((batch_id) => ({
      faculty_id: selectedSession.faculty_id,
      batch_id,
      subject: selectedSession.subject.trim(),
      original_day: selectedSession.day_of_week || dayName,
      original_date: form.date,
      original_start_time: selectedSession.start_time || null,
      original_end_time: selectedSession.end_time || null,
      new_day: dayName,
      new_date: form.date,
      new_start_time: form.new_start_time,
      new_end_time: form.new_end_time,
      room: form.room.trim() || null,
      reason: form.reason.trim() || null,
    }));
    await supabase.from('rescheduled_classes').insert(records);
    setSaving(false);
    setSelectedSession(null);
    setForm({ date: '', new_start_time: '09:00', new_end_time: '10:00', room: '', reason: '' });
    onChange();
  };

  const handleDeleteGroup = async (ids: string[]) => {
    await supabase.from('rescheduled_classes').delete().in('id', ids);
    onChange();
  };

  const handleConfirmCancelResched = async () => {
    if (!cancellingGroup) return;
    setIsCancelling(true);
    try {
      const records = cancellingGroup.rawItems.map((item) => ({
        faculty_id: item.faculty_id,
        batch_id: item.batch_id,
        subject: item.subject.trim(),
        date: item.new_date || item.original_date,
        day_of_week: item.new_day || item.original_day || null,
        start_time: item.original_start_time || item.new_start_time || null,
        end_time: item.original_end_time || item.new_end_time || null,
        room: item.room || null,
        reason: cancelReason.trim()
          ? `[Rescheduled Class Cancelled] ${cancelReason.trim()}`
          : '[Rescheduled Class Cancelled]',
      }));

      const { error: cancelError } = await supabase.from('cancelled_classes').insert(records);
      if (cancelError) throw cancelError;

      const { error: delError } = await supabase.from('rescheduled_classes').delete().in('id', cancellingGroup.ids);
      if (delError) throw delError;

      setCancellingGroup(null);
      setCancelReason('');
      onChange();
    } catch (err: any) {
      console.error('Error cancelling rescheduled class:', err);
      alert(err.message || 'Failed to cancel rescheduled class');
    } finally {
      setIsCancelling(false);
    }
  };

  const startEdit = (g: GroupedReschedule) => {
    setEditingKey(g.key);
    setEditForm({
      date: g.new_date || g.original_date || '',
      new_start_time: g.new_start_time,
      new_end_time: g.new_end_time,
      room: g.room || '',
      reason: g.reason || '',
    });
  };

  const saveEdit = async (ids: string[]) => {
    setSavingEdit(true);
    const d = new Date(editForm.date + 'T00:00:00');
    const dayIdx = d.getDay();
    const dayName = !isNaN(d.getTime()) ? DAYS[dayIdx === 0 ? 6 : dayIdx - 1] : 'Monday';

    await supabase.from('rescheduled_classes').update({
      original_date: editForm.date,
      new_day: dayName,
      new_date: editForm.date,
      new_start_time: editForm.new_start_time,
      new_end_time: editForm.new_end_time,
      room: editForm.room.trim() || null,
      reason: editForm.reason.trim() || null,
    }).in('id', ids);
    setSavingEdit(false);
    setEditingKey(null);
    onChange();
  };

  if (faculty.length === 0 || loads.length === 0) return <SetupRequired />;

  return (
    <div className="space-y-6">
      <FormCard title="Add Rescheduled Class (New Time on Same Date)" icon={RefreshCw} color="amber" onSave={handleSubmit} isValid={!!isValid} saving={saving} saveLabel="Add Rescheduled Class">
        <div className="space-y-4">
          <Field label="Live Scheduled Class to Reschedule (select to link faculty, subject & all batches)">
            <LiveClassSelect
              sessions={sessions}
              selectedSession={selectedSession}
              onSelect={handleSelectSession}
              themeColor="amber"
            />
          </Field>

          {selectedSession && (
            <div className="space-y-4 animate-fade-in-up">
              <div>
                <Field label="Lecture Date * (Reschedule on same date)">
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className={inputCls()}
                  />
                </Field>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    New Time Slot on Same Date
                  </p>
                  <span className="text-xs text-slate-500 font-mono">
                    Routine: {selectedSession.day_of_week}, {selectedSession.start_time} - {selectedSession.end_time}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="New Start Time *">
                    <input
                      type="time"
                      required
                      value={form.new_start_time}
                      onChange={(e) => setForm({ ...form, new_start_time: e.target.value })}
                      className={inputCls()}
                    />
                  </Field>
                  <Field label="New End Time *">
                    <input
                      type="time"
                      required
                      value={form.new_end_time}
                      onChange={(e) => setForm({ ...form, new_end_time: e.target.value })}
                      className={inputCls()}
                    />
                  </Field>
                  <Field label="Room (optional)">
                    <input
                      type="text"
                      placeholder="e.g., Room 101"
                      value={form.room}
                      onChange={(e) => setForm({ ...form, room: e.target.value })}
                      className={inputCls()}
                    />
                  </Field>
                  <Field label="Reason (optional)">
                    <input
                      type="text"
                      placeholder="e.g., Shifted due to morning meeting / faculty slot change"
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      className={inputCls()}
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}
        </div>
      </FormCard>

      {groupedItems.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-fade-in-up bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex-1">
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search subject, faculty, batch, room..." />
          </div>

          {facultyOptions.length > 0 && (
            <div className="relative shrink-0 min-w-[200px]">
              <select
                value={selectedFacultyId}
                onChange={(e) => setSelectedFacultyId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all appearance-none cursor-pointer"
              >
                <option value="all">👥 All Faculty ({groupedItems.length})</option>
                {facultyOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.count})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 font-semibold whitespace-nowrap bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
              {filtered.length} of {groupedItems.length}
            </span>
            {(selectedFacultyId !== 'all' || searchQuery.trim()) && (
              <button
                type="button"
                onClick={() => { setSelectedFacultyId('all'); setSearchQuery(''); }}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline px-1 py-1"
              >
                Clear
              </button>
            )}
          </div>

          <ExportButtons onBulk={() => exportRescheduledToExcel(filtered)} onSingle={() => filtered[0] && exportRescheduledToExcel(filtered, filtered[0])} singleDisabled={filtered.length === 0} />
        </div>
      )}

      {groupedItems.length === 0 ? (
        <EmptyState icon={RefreshCw} message="No rescheduled classes recorded yet." color="from-amber-400 to-orange-400" />
      ) : filtered.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-slate-200/80 p-12 text-center anime-card animate-bounce-in space-y-3">
          <AnimeMascot variant="alert" color="amber" size={80} pointing="up" message="No matching rescheduled classes" />
          <h3 className="text-base font-bold text-slate-800">No rescheduled classes match your filter</h3>
          <p className="text-xs text-slate-500">Try selecting another faculty member or clearing the search query.</p>
          <button
            type="button"
            onClick={() => { setSelectedFacultyId('all'); setSearchQuery(''); }}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all"
          >
            Show All Rescheduled Classes
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-card-stagger">
          {filtered.map((g) => {
            const isEditing = editingKey === g.key;
            return (
              <CardShell
                key={g.key}
                gradient="from-amber-50/80 to-orange-50/80"
                icon={RefreshCw}
                facultyName={g.faculty.name}
                department={g.faculty.department}
                batchNames={g.batchNames}
                badgeColor="bg-amber-100 text-amber-700"
                onCancel={() => { setCancellingGroup(g); setCancelReason(''); }}
                onEdit={() => startEdit(g)}
                onDelete={() => handleDeleteGroup(g.ids)}
                glowClass="anime-glow-amber"
                extraButtons={<button onClick={() => exportRescheduledToExcel([], g)} title="Export this entry" className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-200 hover:scale-125 hover:rotate-6"><Download className="w-4 h-4" /></button>}
              >
                {isEditing ? (
                  <div className="space-y-3 animate-fade-back">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Class Date"><input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className={inputCls()} /></Field>
                      <Field label="New Start Time"><input type="time" value={editForm.new_start_time} onChange={(e) => setEditForm({ ...editForm, new_start_time: e.target.value })} className={inputCls()} /></Field>
                      <Field label="New End Time"><input type="time" value={editForm.new_end_time} onChange={(e) => setEditForm({ ...editForm, new_end_time: e.target.value })} className={inputCls()} /></Field>
                      <Field label="Room"><input type="text" value={editForm.room} onChange={(e) => setEditForm({ ...editForm, room: e.target.value })} className={inputCls()} /></Field>
                      <div className="sm:col-span-2">
                        <Field label="Reason"><input type="text" value={editForm.reason} onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })} className={inputCls()} /></Field>
                      </div>
                    </div>
                    <EditBar onSave={() => saveEdit(g.ids)} onCancel={() => setEditingKey(null)} saving={savingEdit} color="amber" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <BookOpen className="w-5.5 h-5.5 text-amber-600" />
                      </div>
                      <p className="font-bold text-slate-900 text-base">{g.subject}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <DetailBox label="Original Schedule">
                        <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {formatDate(g.new_date)} ({g.original_day || g.new_day})
                        </p>
                        <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Routine Time: {g.original_start_time && g.original_end_time ? `${g.original_start_time} - ${g.original_end_time}` : 'Original time'}
                        </p>
                      </DetailBox>
                      <DetailBox label="New Time on Same Date" accent="bg-amber-50/80 border-amber-200/60">
                        <p className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          New Time: {g.new_start_time} - {g.new_end_time}
                        </p>
                        {g.room && <p className="text-xs text-slate-600 mt-1">Room: {g.room}</p>}
                      </DetailBox>
                    </div>
                    {g.reason && <div className="rounded-xl bg-amber-50/80 p-3 border border-amber-200/60 animate-fade-in-up"><p className="text-xs text-amber-600 mb-0.5 font-semibold uppercase tracking-wide">Reason</p><p className="text-sm text-amber-900">{g.reason}</p></div>}

                    {/* Bottom Cancel Button */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-400">Want to cancel this rescheduled class?</span>
                      <button
                        type="button"
                        onClick={() => { setCancellingGroup(g); setCancelReason(''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200/80 transition-all hover:scale-105 active:scale-95 shadow-2xs"
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        Cancel Lecture
                      </button>
                    </div>
                  </>
                )}
              </CardShell>
            );
          })}
        </div>
      )}

      {/* Modal: Cancel Rescheduled Class Confirmation */}
      {cancellingGroup && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in-up">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Cancel Rescheduled Class</h3>
                  <p className="text-xs text-slate-500">Will move to Cancelled Classes for all {cancellingGroup.batchNames.length} batch(es)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancellingGroup(null)}
                disabled={isCancelling}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Class info preview */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-sm">{cancellingGroup.subject}</span>
                <span className="font-bold text-amber-800">{cancellingGroup.faculty.name}</span>
              </div>
              <p className="text-slate-600">
                Rescheduled to: {formatDate(cancellingGroup.new_date)} • {cancellingGroup.new_start_time} - {cancellingGroup.new_end_time}
                {cancellingGroup.room ? ` • Room: ${cancellingGroup.room}` : ''}
              </p>
              {cancellingGroup.original_start_time && (
                <p className="text-slate-500 text-[11px]">
                  Routine Slot: {cancellingGroup.original_day || cancellingGroup.new_day}, {cancellingGroup.original_start_time} - {cancellingGroup.original_end_time}
                </p>
              )}
              <div className="flex flex-wrap gap-1 pt-1">
                {cancellingGroup.batchNames.map((b) => (
                  <span key={b} className="px-2 py-0.5 rounded bg-white text-slate-700 text-[10px] font-semibold border border-amber-200">
                    {b}
                  </span>
                ))}
              </div>
            </div>

            {/* Cancellation Reason */}
            <div className="space-y-2">
              <Field label="Cancellation Reason (optional)">
                <input
                  type="text"
                  placeholder="e.g. Faculty unavailable, slot conflicted, holiday"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className={inputCls()}
                />
              </Field>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Faculty unavailable', 'Slot conflict', 'Health emergency', 'College event'].map((quickReason) => (
                  <button
                    key={quickReason}
                    type="button"
                    onClick={() => setCancelReason(quickReason)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  >
                    + {quickReason}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancellingGroup(null)}
                disabled={isCancelling}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                Keep Rescheduled Class
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelResched}
                disabled={isCancelling}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-bold shadow-lg shadow-red-500/25 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
              >
                <XCircle className="w-3.5 h-3.5" />
                {isCancelling ? 'Cancelling...' : `Confirm & Cancel Rescheduled Class`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== Cancelled Classes Manager ==================== */

function CancelledClassesManager({
  faculty,
  batches,
  loads,
  groupedItems,
  extraClasses = [],
  rescheduledClasses = [],
  onChange,
}: {
  faculty: Faculty[];
  batches: Batch[];
  loads: FacultyLoadWithDetails[];
  groupedItems: GroupedCancelled[];
  extraClasses?: GroupedExtra[];
  rescheduledClasses?: GroupedReschedule[];
  onChange: () => void;
}) {
  const routineSessions = useMemo(() => extractClassSessions(loads), [loads]);

  const allCancelableSessions = useMemo<LiveClassSession[]>(() => {
    const list: LiveClassSession[] = [...routineSessions];

    // Add active rescheduled classes as cancelable sessions
    (rescheduledClasses || []).forEach((r) => {
      const d = new Date(r.new_date + 'T00:00:00');
      const dayName = !isNaN(d.getTime()) ? DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1] : r.new_day;
      list.push({
        key: `resched_${r.key}`,
        loadIds: r.ids,
        faculty_id: r.faculty_id,
        faculty_name: r.faculty.name,
        department: r.faculty.department,
        subject: `[Rescheduled] ${r.subject}`,
        day_of_week: `${dayName} (${formatDate(r.new_date)})`,
        start_time: r.new_start_time,
        end_time: r.new_end_time,
        room: r.room || undefined,
        batch_ids: r.batch_ids,
        batchNames: r.batchNames,
        start_date: r.new_date,
        end_date: r.new_date,
        status: 'running',
      });
    });

    // Add active extra classes as cancelable sessions
    (extraClasses || []).forEach((e) => {
      const d = new Date(e.date + 'T00:00:00');
      const dayName = !isNaN(d.getTime()) ? DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1] : 'Extra';
      list.push({
        key: `extra_${e.key}`,
        loadIds: e.ids,
        faculty_id: e.faculty_id,
        faculty_name: e.faculty.name,
        department: e.faculty.department,
        subject: `[Extra] ${e.subject}`,
        day_of_week: `${dayName} (${formatDate(e.date)})`,
        start_time: e.start_time,
        end_time: e.end_time,
        room: e.room || undefined,
        batch_ids: e.batch_ids,
        batchNames: e.batchNames,
        start_date: e.date,
        end_date: e.date,
        status: 'running',
      });
    });

    return list;
  }, [routineSessions, rescheduledClasses, extraClasses]);

  const [selectedSession, setSelectedSession] = useState<LiveClassSession | null>(null);
  const [form, setForm] = useState({
    date: '',
    room: '',
    reason: '',
  });
  const [saving, setSaving] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ date: '', reason: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  type CancelledTypeFilter = 'all' | 'regular' | 'rescheduled' | 'extra';
  const [typeFilter, setTypeFilter] = useState<CancelledTypeFilter>('all');
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('all');

  const typeCounts = useMemo(() => {
    let regular = 0;
    let rescheduled = 0;
    let extra = 0;
    groupedItems.forEach((g) => {
      if (g.reason?.includes('[Extra Class Cancelled]')) extra++;
      else if (g.reason?.includes('[Rescheduled Class Cancelled]')) rescheduled++;
      else regular++;
    });
    return { all: groupedItems.length, regular, rescheduled, extra };
  }, [groupedItems]);

  const facultyOptions = useMemo(() => {
    const map = new Map<string, number>();
    groupedItems.forEach((g) => {
      map.set(g.faculty.id, (map.get(g.faculty.id) || 0) + 1);
    });
    return faculty
      .filter((f) => map.has(f.id))
      .map((f) => ({
        ...f,
        cancelledCount: map.get(f.id) || 0,
      }))
      .sort((a, b) => b.cancelledCount - a.cancelledCount || (a.name || '').localeCompare(b.name || ''));
  }, [faculty, groupedItems]);

  const filtered = useMemo(() => {
    return groupedItems.filter((g) => {
      const isExtra = g.reason?.includes('[Extra Class Cancelled]');
      const isResched = g.reason?.includes('[Rescheduled Class Cancelled]');
      const isRegular = !isExtra && !isResched;

      if (typeFilter === 'regular' && !isRegular) return false;
      if (typeFilter === 'rescheduled' && !isResched) return false;
      if (typeFilter === 'extra' && !isExtra) return false;

      if (selectedFacultyId !== 'all' && g.faculty.id !== selectedFacultyId) return false;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        g.faculty.name.toLowerCase().includes(q) ||
        g.subject.toLowerCase().includes(q) ||
        (g.faculty.department && g.faculty.department.toLowerCase().includes(q)) ||
        (g.room && g.room.toLowerCase().includes(q)) ||
        (g.reason && g.reason.toLowerCase().includes(q)) ||
        g.batchNames.some((b) => b.toLowerCase().includes(q))
      );
    });
  }, [groupedItems, typeFilter, selectedFacultyId, searchQuery]);

  const isValid = selectedSession && form.date;

  const handleSelectSession = (s: LiveClassSession | null) => {
    setSelectedSession(s);
    if (s) {
      setForm((prev) => ({
        ...prev,
        date: s.start_date || prev.date,
        room: s.room || prev.room,
      }));
    }
  };

  const handleSubmit = async () => {
    if (!isValid || !selectedSession) return;
    setSaving(true);

    const isExtra = selectedSession.key.startsWith('extra_');
    const isResched = selectedSession.key.startsWith('resched_');
    const cleanSubject = selectedSession.subject
      .replace(/^\[(Extra|Rescheduled)\]\s*/, '')
      .trim();

    let prefix = '';
    if (isExtra) prefix = '[Extra Class Cancelled] ';
    else if (isResched) prefix = '[Rescheduled Class Cancelled] ';

    const reasonText = form.reason.trim()
      ? `${prefix}${form.reason.trim()}`
      : (prefix ? prefix.trim() : null);

    const records = selectedSession.batch_ids.map((batch_id) => ({
      faculty_id: selectedSession.faculty_id,
      batch_id,
      subject: cleanSubject,
      date: form.date,
      day_of_week: selectedSession.day_of_week || null,
      start_time: selectedSession.start_time || null,
      end_time: selectedSession.end_time || null,
      room: form.room.trim() || selectedSession.room || null,
      reason: reasonText,
    }));

    await supabase.from('cancelled_classes').insert(records);

    // If extra or rescheduled class, also delete from source table so faculty slot is freed!
    if (isExtra) {
      await supabase.from('extra_classes').delete().in('id', selectedSession.loadIds);
    } else if (isResched) {
      await supabase.from('rescheduled_classes').delete().in('id', selectedSession.loadIds);
    }

    setSaving(false);
    setSelectedSession(null);
    setForm({ date: '', room: '', reason: '' });
    onChange();
  };

  const handleDeleteGroup = async (ids: string[]) => {
    await supabase.from('cancelled_classes').delete().in('id', ids);
    onChange();
  };

  const startEdit = (g: GroupedCancelled) => {
    setEditingKey(g.key);
    setEditForm({ date: g.date, reason: g.reason || '' });
  };

  const saveEdit = async (ids: string[]) => {
    setSavingEdit(true);
    await supabase.from('cancelled_classes').update({
      date: editForm.date, reason: editForm.reason.trim() || null,
    }).in('id', ids);
    setSavingEdit(false);
    setEditingKey(null);
    onChange();
  };

  if (faculty.length === 0 || loads.length === 0) return <SetupRequired />;

  return (
    <div className="space-y-6">
      <FormCard title="Add Cancelled Class" icon={XCircle} color="red" onSave={handleSubmit} isValid={!!isValid} saving={saving} saveLabel="Add Cancelled Class">
        <div className="space-y-4">
          <Field label="Live Scheduled / Extra / Rescheduled Class to Cancel (select to link faculty, subject & all batches)">
            <LiveClassSelect
              sessions={allCancelableSessions}
              selectedSession={selectedSession}
              onSelect={handleSelectSession}
              themeColor="red"
            />
          </Field>

          {selectedSession && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up">
              <Field label="Date of Cancellation">
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls()} />
              </Field>
              <Field label="Room (optional)">
                <input type="text" placeholder="e.g., Room 101" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} className={inputCls()} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Reason (optional)">
                  <input type="text" placeholder="e.g., Holiday, emergency leave, technical maintenance" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={inputCls()} />
                </Field>
              </div>
            </div>
          )}
        </div>
      </FormCard>

      {groupedItems.length > 0 && (
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-3.5 animate-fade-in-up">
          {/* Class Type Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <Filter className="w-3.5 h-3.5 text-rose-500" />
              Filter By Type:
            </span>

            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                typeFilter === 'all'
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md shadow-red-500/25 scale-[1.02]'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>🌟 All Cancellations</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                typeFilter === 'all' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {typeCounts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter('regular')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                typeFilter === 'regular'
                  ? 'bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-md shadow-slate-900/20 scale-[1.02]'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>⚪ Regular Classes</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                typeFilter === 'regular' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {typeCounts.regular}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter('rescheduled')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                typeFilter === 'rescheduled'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 scale-[1.02]'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>🟠 Rescheduled Classes</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                typeFilter === 'rescheduled' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
                {typeCounts.rescheduled}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter('extra')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                typeFilter === 'extra'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>🔵 Extra Classes</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                typeFilter === 'extra' ? 'bg-white/25 text-white' : 'bg-blue-100 text-blue-800'
              }`}>
                {typeCounts.extra}
              </span>
            </button>
          </div>

          {/* Search, Faculty Dropdown & Export Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t border-slate-100">
            {/* Search Input */}
            <div className="flex-1">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search subject, faculty, batch, room..."
              />
            </div>

            {/* Faculty Dropdown Filter */}
            {facultyOptions.length > 0 && (
              <div className="relative shrink-0 min-w-[200px]">
                <select
                  value={selectedFacultyId}
                  onChange={(e) => setSelectedFacultyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="all">👥 All Faculty ({groupedItems.length})</option>
                  {facultyOptions.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.cancelledCount})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            )}

            {/* Count & Reset */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 font-semibold whitespace-nowrap bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
                {filtered.length} of {groupedItems.length}
              </span>

              {(typeFilter !== 'all' || selectedFacultyId !== 'all' || searchQuery.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter('all');
                    setSelectedFacultyId('all');
                    setSearchQuery('');
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline px-1.5 py-1"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Export Buttons */}
            <ExportButtons
              onBulk={() => exportCancelledToExcel(filtered)}
              onSingle={() => filtered[0] && exportCancelledToExcel(filtered, filtered[0])}
              singleDisabled={filtered.length === 0}
            />
          </div>
        </div>
      )}

      {groupedItems.length === 0 ? (
        <EmptyState icon={XCircle} message="No cancelled classes recorded yet." color="from-red-400 to-rose-400" />
      ) : filtered.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-slate-200/80 p-12 text-center anime-card animate-bounce-in space-y-3">
          <AnimeMascot variant="alert" color="red" size={80} pointing="up" message="No matching cancellations found" />
          <h3 className="text-base font-bold text-slate-800">No cancelled classes match your selected filter</h3>
          <p className="text-xs text-slate-500">
            {typeFilter === 'regular'
              ? 'No cancelled routine regular classes match the criteria.'
              : typeFilter === 'rescheduled'
              ? 'No cancelled rescheduled classes match the criteria.'
              : typeFilter === 'extra'
              ? 'No cancelled extra classes match the criteria.'
              : 'Try clearing your search query or faculty filter.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setTypeFilter('all');
              setSelectedFacultyId('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all"
          >
            Show All Cancelled Classes
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-card-stagger">
          {filtered.map((g) => {
            const isEditing = editingKey === g.key;
            const isExtraCancelled = g.reason?.includes('[Extra Class Cancelled]');
            const isReschedCancelled = g.reason?.includes('[Rescheduled Class Cancelled]');
            const cleanedReason = g.reason
              ? g.reason.replace(/\[(Extra Class Cancelled|Rescheduled Class Cancelled)\]\s*/g, '')
              : '';

            return (
              <CardShell key={g.key} gradient="from-red-50/80 to-rose-50/80" icon={XCircle} facultyName={g.faculty.name} department={g.faculty.department} batchNames={g.batchNames} badgeColor="bg-red-100 text-red-700" onEdit={() => startEdit(g)} onDelete={() => handleDeleteGroup(g.ids)} glowClass="anime-glow-red" extraButtons={<button onClick={() => exportCancelledToExcel([], g)} title="Export this entry" className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-200 hover:scale-125 hover:rotate-6"><Download className="w-4 h-4" /></button>}>
                {isEditing ? (
                  <div className="space-y-3 animate-fade-back">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Date"><input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className={inputCls()} /></Field>
                      <Field label="Reason"><input type="text" value={editForm.reason} onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })} className={inputCls()} /></Field>
                    </div>
                    <EditBar onSave={() => saveEdit(g.ids)} onCancel={() => setEditingKey(null)} saving={savingEdit} color="red" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-100 to-rose-100 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <BookOpen className="w-5.5 h-5.5 text-red-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-900 text-base">{g.subject}</p>
                          {isExtraCancelled ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-700 border border-blue-200">
                              Extra Class Cancelled
                            </span>
                          ) : isReschedCancelled ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-700 border border-amber-200">
                              Rescheduled Class Cancelled
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                              Routine Timetable Class
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3.5 h-3.5" />{formatDate(g.date)}
                          {g.day_of_week && <><span className="text-slate-300">|</span><span>{g.day_of_week}</span></>}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <DetailBox label="Date"><p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-red-500" />{formatDate(g.date)}</p></DetailBox>
                      <DetailBox label="Time"><p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-red-500" />{g.start_time && g.end_time ? `${g.start_time} - ${g.end_time}` : 'Not specified'}</p></DetailBox>
                    </div>
                    {cleanedReason && <div className="mt-3 rounded-xl bg-red-50/80 p-3 border border-red-200/60 animate-fade-in-up"><p className="text-xs text-red-600 mb-0.5 font-semibold uppercase tracking-wide">Reason</p><p className="text-sm text-red-900">{cleanedReason}</p></div>}
                  </>
                )}
              </CardShell>
            );
          })}
        </div>
      )}
    </div>
  );
}
