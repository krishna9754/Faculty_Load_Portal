import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Faculty, FacultyLoadWithDetails, RescheduledClassWithDetails, ExtraClassWithDetails, CancelledClassWithDetails } from '@/lib/supabase';
import type { AnimeTheme } from '@/lib/animeThemes';
import { AnimeSectionHeader } from '@/components/AnimeMascot';
import { RescheduleClassModal } from '@/components/RescheduleClassModal';
import * as XLSX from 'xlsx';
import {
  Clock,
  Calendar,
  CalendarDays,
  CalendarClock,
  UserCheck,
  UserX,
  Users,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  Building2,
  BookOpen,
  Layers,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Sun,
  Coffee,
  Zap,
  RotateCcw,
  Info,
  ArrowRightLeft,
} from 'lucide-react';

interface FacultyAvailabilityViewProps {
  faculty: Faculty[];
  loads: FacultyLoadWithDetails[];
  rescheduledClasses?: RescheduledClassWithDetails[];
  extraClasses?: ExtraClassWithDetails[];
  cancelledClasses?: CancelledClassWithDetails[];
  animeTheme: AnimeTheme;
  onRefresh?: () => void;
}

export interface GroupedClassSession {
  subject: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  start_min: number;
  end_min: number;
  duration_min: number;
  batchNames: string[];
  rooms: string[];
  start_date: string;
  end_date: string;
  loadIds: string[];
  loads: FacultyLoadWithDetails[];
  sessionType?: 'regular' | 'extra' | 'rescheduled';
  isExtraClass?: boolean;
  extraReason?: string | null;
  isRescheduledIncoming?: boolean;
  rescheduledFromDay?: string;
  rescheduledFromDate?: string;
  rescheduleReason?: string | null;
  isRescheduledAway?: boolean;
  rescheduledToDay?: string;
  rescheduledToDate?: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Helper: Convert "HH:MM:SS" or "HH:MM" to minutes from midnight
function timeToMinutes(timeStr: string | null | undefined): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  return h * 60 + m;
}

// Helper: Convert minutes from midnight to 12-hour AM/PM string
function minutesToTime(totalMinutes: number): string {
  const normalized = Math.max(0, totalMinutes);
  const h24 = Math.floor(normalized / 60) % 24;
  const m = normalized % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// Helper: Format duration in minutes to readable "Xh Ym"
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} mins`;
  if (m === 0) return `${h} ${h === 1 ? 'hour' : 'hours'}`;
  return `${h}h ${m}m`;
}

// Helper: Format Date as local "YYYY-MM-DD"
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Helper: Format date string to readable format
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const day = d.toLocaleDateString('en-GB', { day: '2-digit' });
  const month = d.toLocaleDateString('en-GB', { month: 'short' });
  const year = d.toLocaleDateString('en-GB', { year: 'numeric' });
  return `${day} ${month} ${year}`;
}

// Helper: Determine load lifecycle status relative to inspection date
function getLoadStatus(
  startDate: string,
  endDate: string,
  referenceDate: Date = new Date()
): 'pending' | 'running' | 'expired' {
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  const s = new Date(startDate);
  s.setHours(0, 0, 0, 0);
  const e = new Date(endDate);
  e.setHours(0, 0, 0, 0);
  if (ref < s) return 'pending';
  if (ref > e) return 'expired';
  return 'running';
}

// Helper: Group loads with same time and subject across multiple batches into ONE session
function groupLoadsBySession(loadsList: FacultyLoadWithDetails[]): GroupedClassSession[] {
  const map = new Map<string, GroupedClassSession>();

  loadsList.forEach((load) => {
    const normSub = (load.subject || '').trim().toLowerCase();
    const sTime = (load.start_time || '').trim();
    const eTime = (load.end_time || '').trim();
    // Key by start_time, end_time, subject (daily routine schedule)
    const key = `${sTime}__${eTime}__${normSub}`;

    const existing = map.get(key);
    const bName = load.batch?.name || 'Unknown Batch';
    const roomName = load.room != null ? String(load.room).trim() : '';

    if (existing) {
      if (!existing.batchNames.includes(bName)) {
        existing.batchNames.push(bName);
      }
      if (roomName && !existing.rooms.includes(roomName)) {
        existing.rooms.push(roomName);
      }
      existing.loadIds.push(load.id);
      existing.loads.push(load);
      if (load.start_date && load.start_date < existing.start_date) {
        existing.start_date = load.start_date;
      }
      if (load.end_date && load.end_date > existing.end_date) {
        existing.end_date = load.end_date;
      }
    } else {
      const sMin = timeToMinutes(sTime);
      const eMin = timeToMinutes(eTime);
      map.set(key, {
        subject: load.subject || 'Untitled Subject',
        day_of_week: load.day_of_week,
        start_time: sTime,
        end_time: eTime,
        start_min: sMin,
        end_min: eMin,
        duration_min: Math.max(0, eMin - sMin),
        batchNames: [bName],
        rooms: roomName ? [roomName] : [],
        start_date: load.start_date || '',
        end_date: load.end_date || '',
        loadIds: [load.id],
        loads: [load],
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.start_min - b.start_min);
}

// College academic day window: 06:00 AM (360 min) to 10:00 PM (1320 min)
const COLLEGE_DAY_START_MIN = 360; // 06:00 AM
const COLLEGE_DAY_END_MIN = 1320;  // 10:00 PM

export function FacultyAvailabilityView({
  faculty,
  loads,
  rescheduledClasses = [],
  extraClasses = [],
  cancelledClasses = [],
  animeTheme,
  onRefresh,
}: FacultyAvailabilityViewProps) {
  // Navigation sub-tabs
  const [subTab, setSubTab] = useState<'live' | 'daily' | 'monthly'>('live');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'busy' | 'free'>('all');
  const [classLifecycleFilter, setClassLifecycleFilter] = useState<'all' | 'running' | 'pending' | 'expired'>('all');

  // Reschedule Modal State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleTargetSession, setRescheduleTargetSession] = useState<GroupedClassSession | null>(null);
  const [rescheduleTargetFaculty, setRescheduleTargetFaculty] = useState<Faculty | null>(null);

  // Live Inspector vs Real-Time clock state
  const [isLiveClock, setIsLiveClock] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [simulatedDay, setSimulatedDay] = useState<string>(() => {
    const dayIdx = new Date().getDay();
    return DAYS_OF_WEEK[dayIdx === 0 ? 6 : dayIdx - 1];
  });
  const [simulatedTimeStr, setSimulatedTimeStr] = useState<string>(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });

  // Helper to format Date as "YYYY-MM-DD"
  const getTodayDateStr = () => toLocalDateStr(new Date());

  // Daily Slots Tab state (Interactive Calendar / Date-aware)
  const [dailySelectedDate, setDailySelectedDate] = useState<string>(getTodayDateStr);
  const [dailySelectedFacultyId, setDailySelectedFacultyId] = useState<string>('all');

  const dailySelectedDay = useMemo(() => {
    const d = new Date(dailySelectedDate + 'T00:00:00');
    if (isNaN(d.getTime())) return 'Monday';
    const dayIdx = d.getDay();
    return DAYS_OF_WEEK[dayIdx === 0 ? 6 : dayIdx - 1];
  }, [dailySelectedDate]);

  const formattedSelectedDate = useMemo(() => {
    const d = new Date(dailySelectedDate + 'T00:00:00');
    if (isNaN(d.getTime())) return dailySelectedDate;
    const dayName = DAYS_OF_WEEK[d.getDay() === 0 ? 6 : d.getDay() - 1];
    const dayNum = d.getDate();
    const monthName = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();
    return `${dayName}, ${dayNum} ${monthName} ${year}`;
  }, [dailySelectedDate]);

  const isSelectedDateToday = dailySelectedDate === getTodayDateStr();

  const shiftDailyDate = (deltaDays: number) => {
    const d = new Date(dailySelectedDate + 'T00:00:00');
    d.setDate(d.getDate() + deltaDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDailySelectedDate(`${y}-${m}-${day}`);
  };

  const jumpToToday = () => {
    setDailySelectedDate(getTodayDateStr());
  };

  // 7-day strip of the current week containing dailySelectedDate
  const weekDaysStrip = useMemo(() => {
    const curr = new Date(dailySelectedDate + 'T00:00:00');
    const dayIdx = curr.getDay();
    const distanceToMonday = dayIdx === 0 ? -6 : 1 - dayIdx;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + distanceToMonday);

    const todayStr = getTodayDateStr();
    const strip = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayNum}`;
      const dayName = DAYS_OF_WEEK[i];
      const shortDay = dayName.slice(0, 3);
      strip.push({
        dateStr,
        dayName,
        shortDay,
        dayNum: d.getDate(),
        monthShort: SHORT_MONTH_NAMES[d.getMonth()],
        isToday: dateStr === todayStr,
        isSelected: dateStr === dailySelectedDate,
      });
    }
    return strip;
  }, [dailySelectedDate]);

  // Monthly Timeline Tab state
  const [monthlyYear, setMonthlyYear] = useState<number>(() => new Date().getFullYear());
  const [monthlySelectedFacultyId, setMonthlySelectedFacultyId] = useState<string>('all');

  // Live clock ticker
  useEffect(() => {
    if (!isLiveClock) return;
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000); // Update every 15 seconds
    return () => clearInterval(interval);
  }, [isLiveClock]);

  // Derived current inspection day and minutes
  const activeDay = useMemo(() => {
    if (!isLiveClock) return simulatedDay;
    const dayIdx = currentTime.getDay();
    return DAYS_OF_WEEK[dayIdx === 0 ? 6 : dayIdx - 1];
  }, [isLiveClock, simulatedDay, currentTime]);

  const activeTimeMin = useMemo(() => {
    if (!isLiveClock) return timeToMinutes(simulatedTimeStr);
    return currentTime.getHours() * 60 + currentTime.getMinutes();
  }, [isLiveClock, simulatedTimeStr, currentTime]);

  const activeDateObj = useMemo(() => {
    return isLiveClock ? currentTime : new Date();
  }, [isLiveClock, currentTime]);

  // ---------------------------------------------------------------------------
  // Faculty Load Summary Map: Identifies Pending, Running, and Expired Classes
  // ---------------------------------------------------------------------------
  const facultyLoadSummaryMap = useMemo(() => {
    const map = new Map<
      string,
      {
        loads: FacultyLoadWithDetails[];
        runningLoads: FacultyLoadWithDetails[];
        pendingLoads: FacultyLoadWithDetails[];
        expiredLoads: FacultyLoadWithDetails[];
        runningSessions: GroupedClassSession[];
        pendingSessions: GroupedClassSession[];
        expiredSessions: GroupedClassSession[];
        runningClassCount: number;
        pendingClassCount: number;
        expiredClassCount: number;
        runningHours: number;
        pendingHours: number;
        expiredHours: number;
        hasAnyLoad: boolean;
        primaryStatus: 'running' | 'pending' | 'expired';
        earliestPendingDate: string | null;
        latestExpiredDate: string | null;
      }
    >();

    faculty.forEach((f) => {
      const facLoads = loads.filter((l) => l.faculty_id === f.id);
      const runningLoads: FacultyLoadWithDetails[] = [];
      const pendingLoads: FacultyLoadWithDetails[] = [];
      const expiredLoads: FacultyLoadWithDetails[] = [];

      facLoads.forEach((l) => {
        if (!l.start_date || !l.end_date) return;
        const status = getLoadStatus(l.start_date, l.end_date, activeDateObj);
        if (status === 'running') runningLoads.push(l);
        else if (status === 'pending') pendingLoads.push(l);
        else if (status === 'expired') expiredLoads.push(l);
      });

      // Deduplicate multi-batch classes sharing the same time & subject into 1 session
      const runningSessions = groupLoadsBySession(runningLoads);
      const pendingSessions = groupLoadsBySession(pendingLoads);
      const expiredSessions = groupLoadsBySession(expiredLoads);

      const runningHours = runningSessions.reduce((acc, s) => acc + (s.duration_min / 60), 0);
      const pendingHours = pendingSessions.reduce((acc, s) => acc + (s.duration_min / 60), 0);
      const expiredHours = expiredSessions.reduce((acc, s) => acc + (s.duration_min / 60), 0);

      const hasAnyLoad = facLoads.length > 0;
      let primaryStatus: 'running' | 'pending' | 'expired' = 'expired';
      if (runningSessions.length > 0) {
        primaryStatus = 'running';
      } else if (pendingSessions.length > 0) {
        primaryStatus = 'pending';
      }

      let earliestPendingDate: string | null = null;
      if (pendingLoads.length > 0) {
        const sorted = [...pendingLoads].sort((a, b) => String(a.start_date || '').localeCompare(String(b.start_date || '')));
        earliestPendingDate = sorted[0]?.start_date || null;
      }

      let latestExpiredDate: string | null = null;
      if (expiredLoads.length > 0) {
        const sorted = [...expiredLoads].sort((a, b) => String(b.end_date || '').localeCompare(String(a.end_date || '')));
        latestExpiredDate = sorted[0]?.end_date || null;
      }

      map.set(f.id, {
        loads: facLoads,
        runningLoads,
        pendingLoads,
        expiredLoads,
        runningSessions,
        pendingSessions,
        expiredSessions,
        runningClassCount: runningSessions.length,
        pendingClassCount: pendingSessions.length,
        expiredClassCount: expiredSessions.length,
        runningHours,
        pendingHours,
        expiredHours,
        hasAnyLoad,
        primaryStatus,
        earliestPendingDate,
        latestExpiredDate,
      });
    });

    return map;
  }, [faculty, loads, activeDateObj]);

  // ---------------------------------------------------------------------------
  // STRICT FILTER: Only faculty who have class loads (pending, running, or expired)
  // ---------------------------------------------------------------------------
  const assignedFaculty = useMemo(() => {
    return faculty.filter((f) => {
      const summary = facultyLoadSummaryMap.get(f.id);
      return summary && summary.hasAnyLoad;
    });
  }, [faculty, facultyLoadSummaryMap]);

  // Counts for the Lifecycle filter chips
  const runningFacultyCount = useMemo(() => {
    return assignedFaculty.filter((f) => {
      const s = facultyLoadSummaryMap.get(f.id);
      return s && s.runningLoads.length > 0;
    }).length;
  }, [assignedFaculty, facultyLoadSummaryMap]);

  const pendingFacultyCount = useMemo(() => {
    return assignedFaculty.filter((f) => {
      const s = facultyLoadSummaryMap.get(f.id);
      return s && s.pendingLoads.length > 0;
    }).length;
  }, [assignedFaculty, facultyLoadSummaryMap]);

  const expiredFacultyCount = useMemo(() => {
    return assignedFaculty.filter((f) => {
      const s = facultyLoadSummaryMap.get(f.id);
      return s && s.expiredLoads.length > 0;
    }).length;
  }, [assignedFaculty, facultyLoadSummaryMap]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const depts = new Set<string>();
    assignedFaculty.forEach((f) => {
      if (f.department) depts.add(f.department);
    });
    return Array.from(depts).sort();
  }, [assignedFaculty]);

  // Filtered faculty list based on department, search query, and class lifecycle
  const filteredFaculty = useMemo(() => {
    return assignedFaculty.filter((f) => {
      const summary = facultyLoadSummaryMap.get(f.id);
      if (!summary) return false;

      // Filter by Class Lifecycle Status (all, running, pending, expired)
      if (classLifecycleFilter === 'running' && summary.runningLoads.length === 0) return false;
      if (classLifecycleFilter === 'pending' && summary.pendingLoads.length === 0) return false;
      if (classLifecycleFilter === 'expired' && summary.expiredLoads.length === 0) return false;

      // Filter by Department
      const matchDept = selectedDept === 'all' || f.department === selectedDept;
      if (!matchDept) return false;

      // Filter by Search Query
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      const matchName = f.name.toLowerCase().includes(query);
      const matchDeptName = f.department ? f.department.toLowerCase().includes(query) : false;
      const matchBranch = f.branch ? f.branch.toLowerCase().includes(query) : false;
      const matchSubject = summary.loads.some((l) => l.subject && l.subject.toLowerCase().includes(query));

      return matchName || matchDeptName || matchBranch || matchSubject;
    });
  }, [assignedFaculty, facultyLoadSummaryMap, classLifecycleFilter, selectedDept, searchQuery]);

  // Faculty list for Daily Free Slots tab (filters by department & search, independent of live lifecycle chip)
  const dailyFacultyList = useMemo(() => {
    return assignedFaculty.filter((f) => {
      // Filter by Department
      const matchDept = selectedDept === 'all' || f.department === selectedDept;
      if (!matchDept) return false;

      // Filter by Search Query
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      const matchName = f.name.toLowerCase().includes(query);
      const matchDeptName = f.department ? f.department.toLowerCase().includes(query) : false;
      const matchBranch = f.branch ? f.branch.toLowerCase().includes(query) : false;
      const summary = facultyLoadSummaryMap.get(f.id);
      const matchSubject = summary?.loads.some((l) => l.subject && l.subject.toLowerCase().includes(query));

      return matchName || matchDeptName || matchBranch || matchSubject;
    });
  }, [assignedFaculty, facultyLoadSummaryMap, selectedDept, searchQuery]);

  // ---------------------------------------------------------------------------
  // Calculations for Daily Free Slots with Multi-Batch, Extra Classes & Reschedule Merging
  // ---------------------------------------------------------------------------
  const getFacultyDailyGaps = useCallback(
    (facultyId: string, dateStr: string, day: string) => {
      // 1. Cancelled routine classes for this faculty on dateStr
      const facCancelled = (cancelledClasses || []).filter(
        (cc) => cc.faculty_id === facultyId && cc.date === dateStr
      );

      // 2. Rescheduled AWAY classes from this date/day for this faculty
      const facRescheduledAway = (rescheduledClasses || []).filter(
        (rc) =>
          rc.faculty_id === facultyId &&
          (rc.original_date === dateStr ||
            (!rc.original_date && rc.new_date === dateStr && rc.original_day?.toLowerCase() === day.toLowerCase()))
      );

      const todayStr = toLocalDateStr(new Date());
      const isPastDate = dateStr < todayStr;

      // 3. Regular active loads valid on dateStr (runs Monday-Saturday; Sunday is off for routine classes)
      // Routine classes DO NOT run on Sunday. Sunday slots stay 100% free unless explicitly scheduled via Extra Classes or Reschedule!
      const dObj = new Date(dateStr + 'T00:00:00');
      const isSunday = (isNaN(dObj.getTime()) ? false : dObj.getDay() === 0) || day.toLowerCase() === 'sunday';

      const facLoads = isSunday
        ? []
        : loads.filter((l) => {
            if (l.faculty_id !== facultyId) return false;
            // Routine timetable classes run Monday-Saturday within their active date range.

            // On previous/past dates, ensure routine weekly timetable classes are shown
            // so that historical daily schedules are visible even if start_date in DB was set to today or a later date.
            // For future dates, check semester boundaries if set.
            if (!isPastDate && l.start_date && l.start_date > dateStr) return false;
            if (l.end_date && l.end_date < dateStr) return false;

            // Exclude cancelled on this date
            const isCancelled = facCancelled.some(
              (cc) =>
                cc.batch_id === l.batch_id &&
                cc.subject.toLowerCase() === (l.subject || '').toLowerCase() &&
                (cc.start_time ? cc.start_time.slice(0, 5) === l.start_time.slice(0, 5) : true)
            );
            if (isCancelled) return false;

            // Exclude rescheduled away from this date
            const isShiftedAway = facRescheduledAway.some(
              (rc) =>
                (rc.original_load_id && rc.original_load_id === l.id) ||
                (rc.batch_id === l.batch_id &&
                  rc.subject.toLowerCase() === (l.subject || '').toLowerCase() &&
                  rc.original_start_time &&
                  rc.original_start_time.slice(0, 5) === l.start_time.slice(0, 5))
            );
            if (isShiftedAway) return false;

            return true;
          });

      // 4. Group multi-batch regular classes into unique sessions
      const groupedSessions: GroupedClassSession[] = groupLoadsBySession(facLoads).map((s) => ({
        ...s,
        sessionType: 'regular' as const,
      }));

      // 5. Incoming one-time reschedules shifted TO this dateStr (or day)
      const incomingReschedules = (rescheduledClasses || []).filter(
        (rc) =>
          rc.faculty_id === facultyId &&
          (rc.new_date === dateStr || (!rc.new_date && rc.new_day.toLowerCase() === day.toLowerCase()))
      );

      incomingReschedules.forEach((rc) => {
        const sMin = timeToMinutes(rc.new_start_time);
        const eMin = timeToMinutes(rc.new_end_time);
        const bName = rc.batch?.name || 'Unknown Batch';
        const roomName = rc.room ? String(rc.room).trim() : '';

        const existing = groupedSessions.find(
          (s) =>
            s.start_min === sMin &&
            s.end_min === eMin &&
            s.subject.toLowerCase() === rc.subject.toLowerCase()
        );
        if (existing) {
          if (!existing.batchNames.includes(bName)) existing.batchNames.push(bName);
          if (roomName && !existing.rooms.includes(roomName)) existing.rooms.push(roomName);
          existing.sessionType = 'rescheduled';
          existing.isRescheduledIncoming = true;
          existing.rescheduledFromDay = rc.original_day || 'previous day';
          existing.rescheduledFromDate = rc.original_date || undefined;
          existing.rescheduleReason = rc.reason;
        } else {
          groupedSessions.push({
            subject: rc.subject,
            day_of_week: rc.new_day || day,
            start_time: rc.new_start_time,
            end_time: rc.new_end_time,
            start_min: sMin,
            end_min: eMin,
            duration_min: Math.max(0, eMin - sMin),
            batchNames: [bName],
            rooms: roomName ? [roomName] : [],
            start_date: rc.new_date || dateStr,
            end_date: rc.new_date || dateStr,
            loadIds: [rc.id],
            loads: [],
            sessionType: 'rescheduled',
            isRescheduledIncoming: true,
            rescheduledFromDay: rc.original_day || 'previous day',
            rescheduledFromDate: rc.original_date || undefined,
            rescheduleReason: rc.reason,
          });
        }
      });

      // 6. Extra classes on dateStr for this faculty
      const facExtra = (extraClasses || []).filter(
        (ec) => ec.faculty_id === facultyId && ec.date === dateStr
      );

      facExtra.forEach((ec) => {
        const sMin = timeToMinutes(ec.start_time);
        const eMin = timeToMinutes(ec.end_time);
        const bName = ec.batch?.name || 'Unknown Batch';
        const roomName = ec.room ? String(ec.room).trim() : '';

        const existing = groupedSessions.find(
          (s) =>
            s.start_min === sMin &&
            s.end_min === eMin &&
            s.subject.toLowerCase() === ec.subject.toLowerCase()
        );
        if (existing) {
          if (!existing.batchNames.includes(bName)) existing.batchNames.push(bName);
          if (roomName && !existing.rooms.includes(roomName)) existing.rooms.push(roomName);
          existing.sessionType = 'extra';
          existing.isExtraClass = true;
          existing.extraReason = ec.reason;
        } else {
          groupedSessions.push({
            subject: ec.subject,
            day_of_week: day,
            start_time: ec.start_time,
            end_time: ec.end_time,
            start_min: sMin,
            end_min: eMin,
            duration_min: Math.max(0, eMin - sMin),
            batchNames: [bName],
            rooms: roomName ? [roomName] : [],
            start_date: ec.date,
            end_date: ec.date,
            loadIds: [ec.id],
            loads: [],
            sessionType: 'extra',
            isExtraClass: true,
            extraReason: ec.reason,
          });
        }
      });

      groupedSessions.sort((a, b) => a.start_min - b.start_min);

      // 7. Merge overlapping/contiguous class intervals for ribbon & gap calculation
      const busyIntervals: { start: number; end: number; sessions: GroupedClassSession[] }[] = [];
      groupedSessions.forEach((session) => {
        const s = session.start_min;
        const e = session.end_min;
        if (busyIntervals.length === 0) {
          busyIntervals.push({ start: s, end: e, sessions: [session] });
        } else {
          const last = busyIntervals[busyIntervals.length - 1];
          if (s <= last.end) {
            last.end = Math.max(last.end, e);
            last.sessions.push(session);
          } else {
            busyIntervals.push({ start: s, end: e, sessions: [session] });
          }
        }
      });

      // 8. Compute free gaps within the standard college day [06:00 AM - 10:00 PM]
      const freeGaps: { start: number; end: number; duration: number }[] = [];
      if (busyIntervals.length === 0) {
        freeGaps.push({
          start: COLLEGE_DAY_START_MIN,
          end: COLLEGE_DAY_END_MIN,
          duration: COLLEGE_DAY_END_MIN - COLLEGE_DAY_START_MIN,
        });
      } else {
        if (busyIntervals[0].start > COLLEGE_DAY_START_MIN) {
          const gapEnd = Math.min(COLLEGE_DAY_END_MIN, busyIntervals[0].start);
          if (gapEnd > COLLEGE_DAY_START_MIN) {
            freeGaps.push({
              start: COLLEGE_DAY_START_MIN,
              end: gapEnd,
              duration: gapEnd - COLLEGE_DAY_START_MIN,
            });
          }
        }

        for (let i = 0; i < busyIntervals.length - 1; i++) {
          const gapStart = Math.max(COLLEGE_DAY_START_MIN, busyIntervals[i].end);
          const gapEnd = Math.min(COLLEGE_DAY_END_MIN, busyIntervals[i + 1].start);
          if (gapEnd > gapStart) {
            freeGaps.push({
              start: gapStart,
              end: gapEnd,
              duration: gapEnd - gapStart,
            });
          }
        }

        const lastBusy = busyIntervals[busyIntervals.length - 1];
        if (lastBusy.end < COLLEGE_DAY_END_MIN) {
          const gapStart = Math.max(COLLEGE_DAY_START_MIN, lastBusy.end);
          if (COLLEGE_DAY_END_MIN > gapStart) {
            freeGaps.push({
              start: gapStart,
              end: COLLEGE_DAY_END_MIN,
              duration: COLLEGE_DAY_END_MIN - gapStart,
            });
          }
        }
      }

      const totalBusyMins = busyIntervals.reduce((acc, curr) => acc + (curr.end - curr.start), 0);
      const totalFreeMins = freeGaps.reduce((acc, curr) => acc + curr.duration, 0);
      const extraSessionsCount = groupedSessions.filter((s) => s.isExtraClass).length;
      const rescheduledSessionsCount = groupedSessions.filter((s) => s.isRescheduledIncoming).length;

      return {
        rawLoads: facLoads,
        groupedSessions,
        busyIntervals,
        freeGaps,
        totalBusyMins,
        totalFreeMins,
        extraSessionsCount,
        rescheduledSessionsCount,
      };
    },
    [loads, cancelledClasses, rescheduledClasses, extraClasses]
  );

  // ---------------------------------------------------------------------------
  // Calculations for Live Status (Right Now) with Multi-Batch & Reschedule Merging
  // ---------------------------------------------------------------------------
  const facultyLiveStatusMap = useMemo(() => {
    const map = new Map<
      string,
      {
        faculty: Faculty;
        isBusy: boolean;
        currentSession: GroupedClassSession | null;
        currentClassDuration: number; // minutes
        currentClassRemaining: number; // minutes
        currentClassElapsed: number; // minutes
        currentClassProgress: number; // percentage 0-100
        nextSession: GroupedClassSession | null;
        nextClassInMinutes: number | null;
        todaySessions: GroupedClassSession[];
        todayLoads: FacultyLoadWithDetails[];
        todayTotalTeachingMinutes: number;
      }
    >();

    const targetDateStr = toLocalDateStr(activeDateObj);

    assignedFaculty.forEach((f) => {
      const daily = getFacultyDailyGaps(f.id, targetDateStr, activeDay);
      const todaySessions = daily.groupedSessions;
      const todayLoads = daily.rawLoads;

      let currentSession: GroupedClassSession | null = null;
      let nextSession: GroupedClassSession | null = null;
      let todayTotalTeachingMinutes = 0;

      todaySessions.forEach((sess) => {
        todayTotalTeachingMinutes += sess.duration_min;

        if (sess.start_min <= activeTimeMin && activeTimeMin < sess.end_min) {
          currentSession = sess;
        } else if (sess.start_min > activeTimeMin && !nextSession) {
          nextSession = sess;
        }
      });

      const isBusy = !!currentSession;
      let currentClassDuration = 0;
      let currentClassRemaining = 0;
      let currentClassElapsed = 0;
      let currentClassProgress = 0;

      if (currentSession) {
        const c = currentSession as GroupedClassSession;
        currentClassDuration = c.duration_min;
        currentClassElapsed = Math.max(0, activeTimeMin - c.start_min);
        currentClassRemaining = Math.max(0, c.end_min - activeTimeMin);
        currentClassProgress =
          currentClassDuration > 0
            ? Math.min(100, Math.max(0, Math.round((currentClassElapsed / currentClassDuration) * 100)))
            : 0;
      }

      let nextClassInMinutes: number | null = null;
      if (nextSession) {
        const nc = nextSession as GroupedClassSession;
        nextClassInMinutes = Math.max(0, nc.start_min - activeTimeMin);
      }

      map.set(f.id, {
        faculty: f,
        isBusy,
        currentSession,
        currentClassDuration,
        currentClassRemaining,
        currentClassElapsed,
        currentClassProgress,
        nextSession,
        nextClassInMinutes,
        todaySessions,
        todayLoads,
        todayTotalTeachingMinutes,
      });
    });

    return map;
  }, [assignedFaculty, getFacultyDailyGaps, activeDay, activeTimeMin, activeDateObj]);

  // Total busy faculties among currently filtered assigned faculties
  const totalBusyNow = useMemo(() => {
    let count = 0;
    filteredFaculty.forEach((f) => {
      const val = facultyLiveStatusMap.get(f.id);
      if (val?.isBusy) count++;
    });
    return count;
  }, [filteredFaculty, facultyLiveStatusMap]);

  // Total free faculties among currently filtered assigned faculties
  const totalFreeNow = useMemo(() => {
    return Math.max(0, filteredFaculty.length - totalBusyNow);
  }, [filteredFaculty.length, totalBusyNow]);

  // Faculty live cards with status filter applied
  const liveCards = useMemo(() => {
    return filteredFaculty
      .map((f) => {
        const live = facultyLiveStatusMap.get(f.id);
        const summary = facultyLoadSummaryMap.get(f.id);
        if (!live || !summary) return null;
        return {
          ...live,
          summary,
        };
      })
      .filter((item): item is NonNullable<typeof item> => {
        if (!item) return false;
        if (statusFilter === 'busy') return item.isBusy;
        if (statusFilter === 'free') return !item.isBusy;
        return true;
      });
  }, [filteredFaculty, facultyLiveStatusMap, facultyLoadSummaryMap, statusFilter]);

  // ---------------------------------------------------------------------------
  // Calculations for Monthly Timeline with Multi-Batch Merging
  // ---------------------------------------------------------------------------
  const getFacultyMonthlyTimeline = (facultyId: string, year: number) => {
    const facLoads = loads.filter((l) => l.faculty_id === facultyId);

    const monthStats = MONTH_NAMES.map((mName, mIdx) => {
      const monthStart = new Date(year, mIdx, 1);
      const monthEnd = new Date(year, mIdx + 1, 0);
      const startStr = monthStart.toISOString().split('T')[0];
      const endStr = monthEnd.toISOString().split('T')[0];

      const activeLoads = facLoads.filter((l) => {
        if (!l.start_date || !l.end_date) return false;
        return l.start_date <= endStr && l.end_date >= startStr;
      });

      const groupedMonthLoads = groupLoadsBySession(activeLoads);
      let weeklyMinutes = 0;
      const subjectsSet = new Set<string>();
      groupedMonthLoads.forEach((s) => {
        weeklyMinutes += s.duration_min;
        if (s.subject) subjectsSet.add(s.subject);
      });

      const isFree = activeLoads.length === 0;

      return {
        monthIndex: mIdx,
        monthName: mName,
        shortName: SHORT_MONTH_NAMES[mIdx],
        isFree,
        activeLoadsCount: activeLoads.length,
        uniqueSessionsCount: groupedMonthLoads.length,
        weeklyHours: (weeklyMinutes / 60).toFixed(1),
        subjects: Array.from(subjectsSet),
      };
    });

    const freePeriods: string[] = [];
    let curPeriodStart: number | null = null;

    for (let i = 0; i <= 12; i++) {
      const isFree = i < 12 ? monthStats[i].isFree : false;
      if (isFree && curPeriodStart === null) {
        curPeriodStart = i;
      } else if (!isFree && curPeriodStart !== null) {
        const startMonth = SHORT_MONTH_NAMES[curPeriodStart];
        const endMonth = SHORT_MONTH_NAMES[i - 1];
        if (curPeriodStart === i - 1) {
          freePeriods.push(startMonth);
        } else {
          freePeriods.push(`${startMonth} – ${endMonth}`);
        }
        curPeriodStart = null;
      }
    }

    const teachingPeriods: string[] = [];
    let curTeachStart: number | null = null;
    for (let i = 0; i <= 12; i++) {
      const isTeach = i < 12 ? !monthStats[i].isFree : false;
      if (isTeach && curTeachStart === null) {
        curTeachStart = i;
      } else if (!isTeach && curTeachStart !== null) {
        const startMonth = SHORT_MONTH_NAMES[curTeachStart];
        const endMonth = SHORT_MONTH_NAMES[i - 1];
        if (curTeachStart === i - 1) {
          teachingPeriods.push(startMonth);
        } else {
          teachingPeriods.push(`${startMonth} – ${endMonth}`);
        }
        curTeachStart = null;
      }
    }

    const freeMonthCount = monthStats.filter((m) => m.isFree).length;
    const busyMonthCount = 12 - freeMonthCount;

    return {
      monthStats,
      freePeriods,
      teachingPeriods,
      freeMonthCount,
      busyMonthCount,
    };
  };

  // ---------------------------------------------------------------------------
  // Excel Export Handler
  // ---------------------------------------------------------------------------
  const handleExportExcel = () => {
    // Sheet 1: Real-time Live Status
    const liveData = filteredFaculty.map((f) => {
      const status = facultyLiveStatusMap.get(f.id);
      const summary = facultyLoadSummaryMap.get(f.id);
      const curr = status?.currentSession;
      return {
        'Faculty Name': f.name,
        Department: f.department || '-',
        Branch: f.branch || '-',
        'Load Status': (summary?.runningClassCount || 0) > 0
          ? 'Running'
          : (summary?.pendingClassCount || 0) > 0
          ? 'Pending'
          : 'Expired',
        'Running Classes Count': summary?.runningClassCount || 0,
        'Running Weekly Hours': summary ? Number(summary.runningHours.toFixed(1)) : 0,
        'Pending Classes Count': summary?.pendingClassCount || 0,
        'Expired Classes Count': summary?.expiredClassCount || 0,
        'Live Occupancy': status?.isBusy ? '🔴 BUSY IN CLASS' : '🟢 FREE / AVAILABLE',
        'Current Class': status?.isBusy ? curr?.subject : 'N/A',
        'Batches & Room': status?.isBusy
          ? `${curr?.batchNames.join(', ')} (${curr?.rooms.join(', ') || 'No Room'})`
          : 'N/A',
        'Class Timing': status?.isBusy
          ? `${curr?.start_time} - ${curr?.end_time}`
          : 'N/A',
        'Remaining Time': status?.isBusy ? `${status.currentClassRemaining} mins remaining` : 'N/A',
        'Next Class Today': status?.nextSession
          ? `${status.nextSession.subject} at ${status.nextSession.start_time} (${status.nextSession.batchNames.join(', ')})`
          : 'No more classes today',
        'Total Teaching Hours Today': status
          ? `${(status.todayTotalTeachingMinutes / 60).toFixed(1)} hrs`
          : '0 hrs',
      };
    });

    // Sheet 2: Daily Free Slots
    const dailyData: any[] = [];
    dailyFacultyList.forEach((f) => {
      const daily = getFacultyDailyGaps(f.id, dailySelectedDate, dailySelectedDay);
      const summary = facultyLoadSummaryMap.get(f.id);
      if (daily.freeGaps.length === 0) {
        dailyData.push({
          'Faculty Name': f.name,
          Department: f.department || '-',
          'Load Status': summary?.primaryStatus || 'N/A',
          Date: dailySelectedDate,
          Day: dailySelectedDay,
          'Free Slot Time': 'No free slot (Packed day)',
          'Slot Duration': '0 mins',
          'Total Free Hours Today': `${(daily.totalFreeMins / 60).toFixed(1)} hrs`,
          'Total Teaching Hours Today': `${(daily.totalBusyMins / 60).toFixed(1)} hrs`,
          'Extra Classes': daily.extraSessionsCount,
          'Rescheduled Classes': daily.rescheduledSessionsCount,
        });
      } else {
        daily.freeGaps.forEach((g) => {
          dailyData.push({
            'Faculty Name': f.name,
            Department: f.department || '-',
            'Load Status': summary?.primaryStatus || 'N/A',
            Date: dailySelectedDate,
            Day: dailySelectedDay,
            'Free Slot Time': `${minutesToTime(g.start)} – ${minutesToTime(g.end)}`,
            'Slot Duration': formatDuration(g.duration),
            'Total Free Hours Today': `${(daily.totalFreeMins / 60).toFixed(1)} hrs`,
            'Total Teaching Hours Today': `${(daily.totalBusyMins / 60).toFixed(1)} hrs`,
            'Extra Classes': daily.extraSessionsCount,
            'Rescheduled Classes': daily.rescheduledSessionsCount,
          });
        });
      }
    });

    // Sheet 3: Monthly & Semester Free Periods
    const monthlyData = filteredFaculty.map((f) => {
      const mon = getFacultyMonthlyTimeline(f.id, monthlyYear);
      const summary = facultyLoadSummaryMap.get(f.id);
      return {
        'Faculty Name': f.name,
        Department: f.department || '-',
        'Load Status': summary?.primaryStatus || 'N/A',
        Year: monthlyYear,
        'Completely Free Months': mon.freePeriods.length > 0 ? mon.freePeriods.join(', ') : 'None',
        'Active Teaching Months': mon.teachingPeriods.length > 0 ? mon.teachingPeriods.join(', ') : 'None',
        'Total Free Months': `${mon.freeMonthCount} / 12 Months`,
        'Total Teaching Months': `${mon.busyMonthCount} / 12 Months`,
      };
    });

    const wb = XLSX.utils.book_new();
    const wsLive = XLSX.utils.json_to_sheet(liveData);
    const wsDaily = XLSX.utils.json_to_sheet(dailyData);
    const wsMonthly = XLSX.utils.json_to_sheet(monthlyData);

    XLSX.utils.book_append_sheet(wb, wsLive, 'Live Faculty Status');
    XLSX.utils.book_append_sheet(wb, wsDaily, 'Daily Free Slots');
    XLSX.utils.book_append_sheet(wb, wsMonthly, 'Monthly Free Timeline');

    const fileName = `Faculty_Availability_Free_Slots_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header with Mascot */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <AnimeSectionHeader
          title="Faculty Availability & Free Slots Tracker"
          icon={CalendarClock}
          mascotVariant="sensei"
          mascotColor="cyan"
          mascotMessage="Check live class status, shift classes between days, and inspect free slots with ninja precision!"
        >
          <p className="text-xs text-slate-500 font-medium mt-1">
            Real-time occupancy, shift classes to Sunday/other days, and track daily & semester free slots ({assignedFaculty.length} faculties tracked).
          </p>
        </AnimeSectionHeader>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-all active:scale-95"
            title="Download Excel report with Live, Daily, and Monthly availability"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Report (Excel)</span>
          </button>
        </div>
      </div>

      {/* Primary Sub-Tab Switcher Navigation */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-1.5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setSubTab('live')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              subTab === 'live'
                ? 'bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 text-white shadow-md shadow-red-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span>Live Status (Right Now)</span>
          </button>

          <button
            onClick={() => setSubTab('daily')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              subTab === 'daily'
                ? `${animeTheme.activeNavGradient}`
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Daily Free Slots & Schedule</span>
          </button>

          <button
            onClick={() => setSubTab('monthly')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              subTab === 'monthly'
                ? `${animeTheme.activeNavGradient}`
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Month-by-Month Free Timeline</span>
          </button>
        </div>

        {/* Global Search and Department Filter */}
        <div className="flex items-center gap-2 flex-1 md:flex-initial justify-end">
          <div className="relative min-w-[180px] max-w-[260px] w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search faculty or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-medium"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="all">All Depts ({departments.length})</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CLASS LIFECYCLE FILTER ROW: Running | Pending | Expired */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            Class Load Status:
          </span>
          <button
            onClick={() => setClassLifecycleFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              classLifecycleFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Assigned ({assignedFaculty.length})
          </button>
          <button
            onClick={() => setClassLifecycleFilter('running')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              classLifecycleFilter === 'running'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
            }`}
          >
            🟢 Running ({runningFacultyCount})
          </button>
          <button
            onClick={() => setClassLifecycleFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              classLifecycleFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            🟡 Pending ({pendingFacultyCount})
          </button>
          <button
            onClick={() => setClassLifecycleFilter('expired')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              classLifecycleFilter === 'expired'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            ⚪ Expired ({expiredFacultyCount})
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Displaying</span>
          <span className="font-bold text-slate-900 font-mono">{filteredFaculty.length}</span>
          <span>of {assignedFaculty.length} assigned faculty</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: LIVE STATUS (RIGHT NOW) */}
      {/* ========================================================================= */}
      {subTab === 'live' && (
        <div className="space-y-5 animate-fade-in">
          {/* Live Clock / Simulator Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isLiveClock ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                }`}
              >
                {isLiveClock ? <Zap className="w-5 h-5 animate-pulse" /> : <Clock className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isLiveClock ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}
                  >
                    {isLiveClock ? (
                      <>
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400"></span>
                        </span>
                        Real-Time Live
                      </>
                    ) : (
                      'Simulated Time Machine'
                    )}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {activeDay}, {minutesToTime(activeTimeMin)}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  {isLiveClock
                    ? `Live Campus Monitor: ${currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : `Simulating ${simulatedDay} at ${minutesToTime(activeTimeMin)}`}
                </h3>
              </div>
            </div>

            {/* Time Machine Simulator Controls */}
            <div className="flex flex-wrap items-center gap-2.5 bg-slate-800/80 p-2 rounded-xl border border-slate-700/80">
              <span className="text-[11px] font-semibold text-slate-300">Time Mode:</span>

              <button
                onClick={() => setIsLiveClock(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isLiveClock
                    ? 'bg-red-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                Now (Live)
              </button>

              <button
                onClick={() => setIsLiveClock(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  !isLiveClock
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                Pick Day & Time
              </button>

              {!isLiveClock && (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
                  <select
                    value={simulatedDay}
                    onChange={(e) => setSimulatedDay(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  <input
                    type="time"
                    value={simulatedTimeStr}
                    onChange={(e) => setSimulatedTimeStr(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics KPI Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-rose-200/70 shadow-xs relative overflow-hidden group">
              <div className="absolute -right-3 -bottom-3 w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center opacity-60 group-hover:scale-110 transition-transform">
                <BookOpen className="w-8 h-8 text-rose-300" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Busy In Class Now</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                {totalBusyNow} <span className="text-xs font-medium text-slate-500">faculties</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Taking classes right now</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-emerald-200/70 shadow-xs relative overflow-hidden group">
              <div className="absolute -right-3 -bottom-3 w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center opacity-60 group-hover:scale-110 transition-transform">
                <UserCheck className="w-8 h-8 text-emerald-300" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Free / Available Now</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                {totalFreeNow} <span className="text-xs font-medium text-slate-500">faculties</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Available for proxy or meetings</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-emerald-200/70 shadow-xs relative overflow-hidden group">
              <div className="absolute -right-3 -bottom-3 w-16 h-16 bg-emerald-50/60 rounded-full flex items-center justify-center opacity-60 group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Running Timetables</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                {runningFacultyCount} <span className="text-xs font-medium text-slate-500">active</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Currently active semester loads</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-amber-200/70 shadow-xs relative overflow-hidden group">
              <div className="absolute -right-3 -bottom-3 w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center opacity-60 group-hover:scale-110 transition-transform">
                <Clock className="w-8 h-8 text-amber-300" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pending & Expired</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                {pendingFacultyCount} <span className="text-xs font-medium text-amber-600">pnd</span> / {expiredFacultyCount} <span className="text-xs font-medium text-slate-400">exp</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Upcoming & past semester loads</p>
            </div>
          </div>

          {/* Secondary Live Status Filter */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Live Status:</span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                All ({filteredFaculty.length})
              </button>
              <button
                onClick={() => setStatusFilter('busy')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'busy'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
                }`}
              >
                Busy Now ({totalBusyNow})
              </button>
              <button
                onClick={() => setStatusFilter('free')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'free'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                }`}
              >
                Free Now ({totalFreeNow})
              </button>
            </div>

            <div className="text-xs text-slate-500">
              Showing <span className="font-bold text-slate-800">{liveCards.length}</span> faculties
            </div>
          </div>

          {/* Faculty Live Cards Grid */}
          {liveCards.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs">
              <UserX className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-800">No faculty found</h4>
              <p className="text-xs text-slate-500 mt-1">
                Try adjusting your search query, department, or class lifecycle status filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {liveCards.map((item) => {
                const {
                  faculty: f,
                  isBusy,
                  currentSession,
                  currentClassDuration,
                  currentClassRemaining,
                  currentClassProgress,
                  nextSession,
                  nextClassInMinutes,
                  todaySessions,
                  todayLoads,
                  todayTotalTeachingMinutes,
                  summary,
                } = item;

                const hasRunning = (summary.runningClassCount || 0) > 0;
                const isPendingOnly = !hasRunning && (summary.pendingClassCount || 0) > 0;
                const isExpiredOnly = !hasRunning && !isPendingOnly && (summary.expiredClassCount || 0) > 0;

                return (
                  <div
                    key={f.id}
                    className={`p-4 rounded-2xl bg-white border transition-all duration-300 hover:shadow-lg relative overflow-hidden flex flex-col justify-between ${
                      isBusy
                        ? 'border-rose-200/80 shadow-xs hover:border-rose-300 ring-1 ring-rose-500/10'
                        : isPendingOnly
                        ? 'border-amber-200/80 shadow-xs hover:border-amber-300 ring-1 ring-amber-500/10'
                        : isExpiredOnly
                        ? 'border-slate-300 shadow-xs hover:border-slate-400'
                        : 'border-emerald-200/80 shadow-xs hover:border-emerald-300 ring-1 ring-emerald-500/10'
                    }`}
                  >
                    {/* Top Status Header */}
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                            {f.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-medium text-slate-500 truncate">
                              {f.department || 'General'}
                            </span>
                            {f.branch && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-mono">
                                {f.branch}
                              </span>
                            )}
                          </div>

                          {/* Class Lifecycle Badges */}
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            {hasRunning && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                Running ({summary.runningClassCount}) • {summary.runningHours.toFixed(1)} hrs
                              </span>
                            )}
                            {summary.pendingClassCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                                Pending ({summary.pendingClassCount})
                              </span>
                            )}
                            {summary.expiredClassCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                Expired ({summary.expiredClassCount})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Live Occupancy Status Badge */}
                        <div className="shrink-0">
                          {isBusy ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-xs animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                              BUSY IN CLASS
                            </span>
                          ) : isPendingOnly ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                              UPCOMING
                            </span>
                          ) : isExpiredOnly ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-100 text-slate-700 border border-slate-300 shadow-xs">
                              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                              EXPIRED LOAD
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                              FREE / AVAILABLE
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Main Details Box */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        {isBusy && currentSession ? (
                          <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-100 space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                                    Current Class
                                  </span>
                                  {currentSession.batchNames.length > 1 && (
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-200/90 text-amber-950 font-mono shadow-2xs">
                                      {currentSession.batchNames.length} Batches Combined
                                    </span>
                                  )}
                                </div>
                                <h5 className="text-sm font-extrabold text-slate-900 leading-snug mt-0.5">
                                  {currentSession.subject}
                                </h5>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-200/70 text-rose-900 rounded-md shrink-0">
                                {formatDuration(currentClassDuration)}
                              </span>
                            </div>

                            {/* Multi-Batches Display */}
                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-start gap-1.5 text-slate-700">
                                <Users className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                                <div className="flex flex-wrap gap-1 flex-1">
                                  {currentSession.batchNames.map((bName, bIdx) => (
                                    <span
                                      key={bIdx}
                                      className="px-2 py-0.5 rounded-md bg-white border border-rose-200 text-[10px] font-bold text-slate-800 shadow-2xs"
                                    >
                                      {bName}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {currentSession.rooms.length > 0 && (
                                <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                                  <Building2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                  <span className="font-semibold text-slate-700">
                                    Room: {currentSession.rooms.join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-600 font-mono pt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-rose-500" />
                                {currentSession.start_time} – {currentSession.end_time}
                              </span>
                              <span className="font-bold text-rose-700">
                                {currentClassRemaining} mins left
                              </span>
                            </div>

                            {/* Remaining Progress Bar */}
                            <div className="w-full bg-rose-200/60 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-rose-500 to-amber-500 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${currentClassProgress}%` }}
                              />
                            </div>

                            {/* Quick Action: Shift / Reschedule */}
                            <div className="pt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setRescheduleTargetSession(currentSession);
                                  setRescheduleTargetFaculty(f);
                                  setRescheduleModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-800 bg-white border border-rose-200 hover:bg-rose-50 shadow-2xs transition-all"
                                title="Shift this class to Sunday or another day"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5 text-rose-600" />
                                <span>Shift to Sunday / Another Day</span>
                              </button>
                            </div>
                          </div>
                        ) : isPendingOnly ? (
                          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                              <span className="text-xs font-bold text-amber-900">
                                Upcoming Classes Queued
                              </span>
                            </div>
                            <p className="text-xs text-slate-600">
                              Starts on{' '}
                              <span className="font-bold text-amber-900 font-mono">
                                {formatDate(summary.earliestPendingDate)}
                              </span>
                              .
                            </p>
                            <div className="text-[11px] text-slate-500">
                              Assigned: {summary.pendingLoads.map((l) => l.subject).join(', ')}
                            </div>
                            <p className="text-[11px] text-emerald-700 font-semibold pt-0.5">
                              Currently free until semester starts.
                            </p>
                          </div>
                        ) : isExpiredOnly ? (
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0" />
                              <span className="text-xs font-bold text-slate-800">
                                Previous Semester Concluded
                              </span>
                            </div>
                            <p className="text-xs text-slate-600">
                              Classes completed on{' '}
                              <span className="font-bold text-slate-800 font-mono">
                                {formatDate(summary.latestExpiredDate)}
                              </span>
                              .
                            </p>
                            <p className="text-[11px] text-emerald-700 font-semibold pt-0.5">
                              Currently free awaiting next semester timetable.
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 space-y-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="text-xs font-bold text-emerald-900">
                                Currently Free & Available
                              </span>
                            </div>

                            {nextSession ? (
                              <div className="text-xs text-slate-600 space-y-1.5">
                                <div className="flex items-center justify-between text-slate-700">
                                  <span className="text-[11px] text-slate-500">Next class:</span>
                                  <span className="font-bold text-emerald-800 font-mono">
                                    in {formatDuration(nextClassInMinutes || 0)}
                                  </span>
                                </div>
                                <div className="font-semibold text-slate-900 truncate">
                                  {nextSession.subject}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {nextSession.batchNames.map((bName, bIdx) => (
                                    <span
                                      key={bIdx}
                                      className="px-1.5 py-0.2 rounded bg-white border border-emerald-200 text-[10px] font-semibold text-emerald-950"
                                    >
                                      {bName}
                                    </span>
                                  ))}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-0.5">
                                  <span className="flex items-center gap-1 font-mono">
                                    <Clock className="w-3 h-3 text-emerald-600" />
                                    {nextSession.start_time} – {nextSession.end_time}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRescheduleTargetSession(nextSession);
                                      setRescheduleTargetFaculty(f);
                                      setRescheduleModalOpen(true);
                                    }}
                                    className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                                  >
                                    <ArrowRightLeft className="w-3 h-3" />
                                    Shift
                                  </button>
                                </div>
                              </div>
                            ) : todaySessions.length > 0 ? (
                              <p className="text-xs text-emerald-800">
                                All classes completed for today! Free for the rest of the day.
                              </p>
                            ) : (
                              <p className="text-xs text-slate-500 italic">
                                No classes scheduled today on {activeDay}. Free all day!
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Bar: Today's Summary & Quick Link to Daily Breakdown */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div>
                        {hasRunning ? (
                          <>
                            Today: <span className="font-bold text-slate-700">{todaySessions.length}</span>{' '}
                            {todaySessions.length === 1 ? 'class session' : 'class sessions'} (
                            <span className="font-mono text-slate-800 font-semibold">
                              {(todayTotalTeachingMinutes / 60).toFixed(1)}h
                            </span>
                            )
                            {todayLoads.length > todaySessions.length && (
                              <span className="text-[10px] text-slate-400 ml-1">
                                • {todayLoads.length} batch loads
                              </span>
                            )}
                          </>
                        ) : isPendingOnly ? (
                          <span className="text-amber-800 font-medium">Pending session</span>
                        ) : (
                          <span className="text-slate-500">Past load</span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setDailySelectedFacultyId(f.id);
                          setSubTab('daily');
                        }}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5"
                      >
                        Free Gaps
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: DAILY FREE SLOTS & SCHEDULE */}
      {/* ========================================================================= */}
      {subTab === 'daily' && (
        <div className="space-y-5 animate-fade-in">
          {/* Controls: Interactive Calendar Date Inspector & Faculty Selector */}
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Calendar Date Navigator Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => shiftDailyDate(-1)}
                    title="Previous Day"
                    className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="relative flex items-center">
                    <Calendar className="w-3.5 h-3.5 text-blue-600 absolute left-2.5 pointer-events-none" />
                    <input
                      type="date"
                      value={dailySelectedDate}
                      onChange={(e) => e.target.value && setDailySelectedDate(e.target.value)}
                      className="pl-8 pr-2.5 py-1 text-xs font-bold text-slate-800 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => shiftDailyDate(1)}
                    title="Next Day"
                    className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={jumpToToday}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isSelectedDateToday
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Today
                </button>

                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 font-bold text-xs">
                  <CalendarDays className="w-4 h-4 text-blue-600" />
                  <span>{formattedSelectedDate}</span>
                </div>
              </div>

              {/* Faculty Selector Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-slate-500">Faculty:</span>
                <select
                  value={dailySelectedFacultyId}
                  onChange={(e) => setDailySelectedFacultyId(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="all">Overview: All Assigned Faculty ({dailyFacultyList.length})</option>
                  {dailyFacultyList.map((f) => {
                    const s = facultyLoadSummaryMap.get(f.id);
                    const statusTag = (s?.runningClassCount || 0) > 0
                      ? `Running (${s?.runningClassCount})`
                      : (s?.pendingClassCount || 0) > 0
                      ? `Pending (${s?.pendingClassCount})`
                      : 'Expired';
                    return (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.department || 'General'}) • [{statusTag}]
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* 7-Day Interactive Week Calendar Strip */}
            <div className="p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => shiftDailyDate(-7)}
                title="Previous Week"
                className="px-2.5 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 text-xs font-bold shrink-0 transition-colors"
              >
                ‹ Prev Week
              </button>

              <div className="grid grid-cols-7 gap-2 flex-1 min-w-[500px]">
                {weekDaysStrip.map((item) => {
                  return (
                    <button
                      key={item.dateStr}
                      type="button"
                      onClick={() => setDailySelectedDate(item.dateStr)}
                      className={`py-2 px-1.5 rounded-xl text-center transition-all flex flex-col items-center justify-center relative ${
                        item.isSelected
                          ? `${animeTheme.activeNavGradient} shadow-sm`
                          : item.isToday
                          ? 'bg-blue-50/70 border-2 border-blue-400 text-blue-900 hover:bg-blue-100/70'
                          : 'bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 text-slate-700'
                      }`}
                    >
                      <span className={`text-[10px] font-black uppercase tracking-wider ${item.isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                        {item.shortDay}
                      </span>
                      <span className={`text-base font-black font-mono leading-none my-0.5 ${item.isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {item.dayNum}
                      </span>
                      <span className={`text-[9px] font-semibold ${item.isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                        {item.monthShort}
                      </span>
                      {item.isToday && (
                        <span className={`text-[8px] font-black uppercase px-1 rounded-sm mt-0.5 ${item.isSelected ? 'bg-white/20 text-white' : 'bg-blue-200 text-blue-900'}`}>
                          Today
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => shiftDailyDate(7)}
                title="Next Week"
                className="px-2.5 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 text-xs font-bold shrink-0 transition-colors"
              >
                Next Week ›
              </button>
            </div>
          </div>

          {/* Specific Faculty Drilldown vs All Faculty Overview */}
          {dailySelectedFacultyId !== 'all' ? (
            (() => {
              const selectedFac = assignedFaculty.find((f) => f.id === dailySelectedFacultyId);
              if (!selectedFac) return null;
              const daily = getFacultyDailyGaps(selectedFac.id, dailySelectedDate, dailySelectedDay);
              const summary = facultyLoadSummaryMap.get(selectedFac.id);

              return (
                <div className="space-y-4">
                  {/* Summary Header Card */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                          {selectedFac.department || 'General'}
                        </span>
                        {selectedFac.branch && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                            {selectedFac.branch}
                          </span>
                        )}
                        {(summary?.runningClassCount || 0) > 0 ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            🟢 {summary?.runningClassCount} Running ({summary?.runningHours.toFixed(1)}h)
                          </span>
                        ) : (summary?.pendingClassCount || 0) > 0 ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                            🟡 Pending
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                            ⚪ Expired
                          </span>
                        )}
                        <span className="text-xs text-slate-500 font-semibold">• {formattedSelectedDate}</span>
                        {daily.extraSessionsCount > 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            ➕ {daily.extraSessionsCount} Extra {daily.extraSessionsCount === 1 ? 'Class' : 'Classes'}
                          </span>
                        )}
                        {daily.rescheduledSessionsCount > 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            🔁 {daily.rescheduledSessionsCount} Rescheduled {daily.rescheduledSessionsCount === 1 ? 'Class' : 'Classes'}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-900 mt-1">{selectedFac.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Schedule and Free Break Intervals across the academic day (06:00 AM – 10:00 PM) on {formattedSelectedDate}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-center">
                        <div className="text-lg font-black text-rose-700 font-mono">
                          {(daily.totalBusyMins / 60).toFixed(1)}h
                        </div>
                        <div className="text-[10px] font-bold text-rose-600 uppercase">Teaching</div>
                      </div>

                      <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                        <div className="text-lg font-black text-emerald-700 font-mono">
                          {(daily.totalFreeMins / 60).toFixed(1)}h
                        </div>
                        <div className="text-[10px] font-bold text-emerald-600 uppercase">Free Time</div>
                      </div>

                      <div className="px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-center">
                        <div className="text-lg font-black text-slate-800 font-mono">
                          {daily.groupedSessions.length}
                        </div>
                        <div className="text-[10px] font-bold text-slate-600 uppercase">
                          {daily.groupedSessions.length === 1 ? 'Session' : 'Sessions'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visual Timeline Ribbon (06:00 AM to 10:00 PM = 960 minutes total) */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-blue-600" />
                        Visual 06:00 AM – 10:00 PM Day Timeline
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
                          Free Slot
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span>
                          Routine Class
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <span className="w-3 h-3 rounded bg-indigo-600 inline-block"></span>
                          Extra Class
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <span className="w-3 h-3 rounded bg-amber-600 inline-block"></span>
                          Rescheduled Class
                        </span>
                      </div>
                    </div>

                    {/* Timeline Bar */}
                    <div className="relative w-full h-10 bg-slate-100 rounded-xl overflow-hidden flex border border-slate-200">
                      {(() => {
                        const totalDayMins = COLLEGE_DAY_END_MIN - COLLEGE_DAY_START_MIN;
                        const allSegments: {
                          isBusy: boolean;
                          segType: 'free' | 'regular' | 'extra' | 'rescheduled';
                          start: number;
                          end: number;
                          label: string;
                          sub?: string;
                        }[] = [];

                        daily.busyIntervals.forEach((b) => {
                          const subjectNames = Array.from(new Set(b.sessions.map((s) => s.subject))).join(', ');
                          const totalBatches = b.sessions.reduce((acc, s) => acc + s.batchNames.length, 0);
                          const batchTag = totalBatches > 1 ? ` (${totalBatches} Batches)` : '';
                          const hasExtra = b.sessions.some((s) => s.isExtraClass);
                          const hasRescheduled = b.sessions.some((s) => s.isRescheduledIncoming);

                          let labelPrefix = '';
                          let segType: 'regular' | 'extra' | 'rescheduled' = 'regular';
                          if (hasExtra) {
                            labelPrefix = '➕ Extra: ';
                            segType = 'extra';
                          } else if (hasRescheduled) {
                            labelPrefix = '🔁 Shifted: ';
                            segType = 'rescheduled';
                          }

                          allSegments.push({
                            isBusy: true,
                            segType,
                            start: Math.max(COLLEGE_DAY_START_MIN, b.start),
                            end: Math.min(COLLEGE_DAY_END_MIN, b.end),
                            label: `${labelPrefix}${subjectNames}${batchTag}`,
                            sub: `${minutesToTime(b.start)} - ${minutesToTime(b.end)}`,
                          });
                        });

                        daily.freeGaps.forEach((g) => {
                          allSegments.push({
                            isBusy: false,
                            segType: 'free',
                            start: Math.max(COLLEGE_DAY_START_MIN, g.start),
                            end: Math.min(COLLEGE_DAY_END_MIN, g.end),
                            label: 'Free Gap',
                            sub: `${minutesToTime(g.start)} - ${minutesToTime(g.end)} (${formatDuration(g.duration)})`,
                          });
                        });

                        allSegments.sort((a, b) => a.start - b.start);

                        return allSegments.map((seg, idx) => {
                          const widthPct = ((seg.end - seg.start) / totalDayMins) * 100;
                          if (widthPct <= 0) return null;

                          return (
                            <div
                              key={idx}
                              style={{ width: `${widthPct}%` }}
                              className={`h-full flex flex-col items-center justify-center text-[10px] font-bold px-1 transition-all group relative cursor-pointer ${
                                !seg.isBusy
                                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 border-r border-white/30'
                                  : seg.segType === 'extra'
                                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 border-r border-white/30'
                                  : seg.segType === 'rescheduled'
                                  ? 'bg-amber-600 text-white hover:bg-amber-700 border-r border-white/30'
                                  : 'bg-rose-500 text-white hover:bg-rose-600 border-r border-white/30'
                              }`}
                              title={`${seg.label} (${seg.sub})`}
                            >
                              <span className="truncate w-full text-center">{seg.label}</span>

                              {/* Hover Tooltip */}
                              <div className="hidden group-hover:block absolute bottom-full mb-1 z-30 bg-slate-900 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                                <div>{seg.label}</div>
                                <div className="text-[10px] text-slate-300 font-mono">{seg.sub}</div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Time Scale Marks (06:00 AM to 10:00 PM) */}
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono px-0.5 overflow-x-auto">
                      <span>06:00 AM</span>
                      <span>08:00 AM</span>
                      <span>10:00 AM</span>
                      <span>12:00 PM</span>
                      <span>02:00 PM</span>
                      <span>04:00 PM</span>
                      <span>06:00 PM</span>
                      <span>08:00 PM</span>
                      <span>10:00 PM</span>
                    </div>
                  </div>

                  {/* Chronological Breakdown List of Free Slots and Classes (Unified Multi-Batch Sessions) */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Chronological Breakdown for {formattedSelectedDate}
                      </h4>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Multi-batch classes at same time shown as 1 single card
                      </span>
                    </div>

                    {daily.groupedSessions.length === 0 ? (
                      <div className="p-8 text-center bg-emerald-50/50 rounded-2xl border border-emerald-200">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-emerald-950">Completely Free Day!</h4>
                        <p className="text-xs text-emerald-700 mt-1">
                          {selectedFac.name} has no scheduled teaching duties on {formattedSelectedDate}.
                          Available all day (06:00 AM – 10:00 PM, 16 hours free).
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {(() => {
                          const items: {
                            isFree: boolean;
                            start: number;
                            end: number;
                            duration: number;
                            session?: GroupedClassSession;
                          }[] = [];

                          // Push merged sessions (1 single item per multi-batch class)
                          daily.groupedSessions.forEach((sess) => {
                            items.push({
                              isFree: false,
                              start: sess.start_min,
                              end: sess.end_min,
                              duration: sess.duration_min,
                              session: sess,
                            });
                          });

                          // Push free gaps
                          daily.freeGaps.forEach((g) => {
                            items.push({
                              isFree: true,
                              start: g.start,
                              end: g.end,
                              duration: g.duration,
                            });
                          });

                          items.sort((a, b) => a.start - b.start);

                          return items.map((item, idx) => {
                            if (item.isFree) {
                              return (
                                <div
                                  key={`free-${idx}`}
                                  className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-3 transition-all hover:bg-emerald-50"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-700 flex items-center justify-center shrink-0">
                                      <Coffee className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-emerald-800 uppercase tracking-wide">
                                          Free Time Slot
                                        </span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 font-mono">
                                          {formatDuration(item.duration)} Free
                                        </span>
                                      </div>
                                      <div className="text-xs font-mono font-bold text-slate-700 mt-0.5">
                                        {minutesToTime(item.start)} – {minutesToTime(item.end)}
                                      </div>
                                    </div>
                                  </div>

                                  <span className="text-xs font-semibold text-emerald-700 hidden sm:inline">
                                    Available for meetings / proxy
                                  </span>
                                </div>
                              );
                            }

                            const sess = item.session!;
                            const isExtra = !!sess.isExtraClass;
                            const isRescheduled = !!sess.isRescheduledIncoming;

                            const cardBg = isExtra
                              ? 'bg-indigo-50/70 border-indigo-200/80 hover:bg-indigo-50'
                              : isRescheduled
                              ? 'bg-amber-50/70 border-amber-200/80 hover:bg-amber-50'
                              : 'bg-rose-50/70 border-rose-200/80 hover:bg-rose-50';

                            const iconBg = isExtra
                              ? 'bg-indigo-500/20 text-indigo-700'
                              : isRescheduled
                              ? 'bg-amber-500/20 text-amber-700'
                              : 'bg-rose-500/20 text-rose-700';

                            const titleColor = isExtra
                              ? 'text-indigo-950'
                              : isRescheduled
                              ? 'text-amber-950'
                              : 'text-rose-950';

                            return (
                              <div
                                key={`session-${idx}`}
                                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-start justify-between gap-3 transition-all ${cardBg}`}
                              >
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
                                    {isRescheduled ? (
                                      <ArrowRightLeft className="w-4 h-4" />
                                    ) : (
                                      <BookOpen className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className={`text-sm font-black ${titleColor}`}>
                                        {sess.subject}
                                      </span>
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-slate-800 border border-slate-200/70 font-mono">
                                        {formatDuration(sess.duration_min)} Class
                                      </span>
                                      {isExtra && (
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 font-mono">
                                          ➕ Extra Class
                                        </span>
                                      )}
                                      {isRescheduled && (
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                                          🔁 Shifted from {sess.rescheduledFromDay}
                                          {sess.rescheduledFromDate ? ` (${sess.rescheduledFromDate})` : ''}
                                        </span>
                                      )}
                                      {sess.batchNames.length > 1 && (
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 font-mono shadow-2xs">
                                          {sess.batchNames.length} Batches Combined
                                        </span>
                                      )}
                                    </div>

                                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2 font-mono">
                                      <span className="font-semibold text-slate-800">
                                        {minutesToTime(sess.start_min)} – {minutesToTime(sess.end_min)}
                                      </span>
                                      {sess.rooms.length > 0 && (
                                        <>
                                          <span>•</span>
                                          <span className="font-medium text-slate-700">
                                            Room: {sess.rooms.join(', ')}
                                          </span>
                                        </>
                                      )}
                                      {isExtra && sess.extraReason && (
                                        <>
                                          <span>•</span>
                                          <span className="font-medium text-indigo-700 italic">
                                            Reason: {sess.extraReason}
                                          </span>
                                        </>
                                      )}
                                      {isRescheduled && sess.rescheduleReason && (
                                        <>
                                          <span>•</span>
                                          <span className="font-medium text-amber-800 italic">
                                            Reason: {sess.rescheduleReason}
                                          </span>
                                        </>
                                      )}
                                    </div>

                                    {/* Multi-Batch Tag Badges */}
                                    <div className="flex flex-wrap items-center gap-1 pt-1">
                                      <span className="text-[10px] font-bold text-slate-500 mr-1">
                                        Batches:
                                      </span>
                                      {sess.batchNames.map((bName, bIdx) => (
                                        <span
                                          key={bIdx}
                                          className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-800 shadow-2xs"
                                        >
                                          {bName}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                                  <span className={`text-xs font-bold font-mono ${isExtra ? 'text-indigo-700' : isRescheduled ? 'text-amber-700' : 'text-rose-700'}`}>
                                    {isExtra ? 'Extra' : isRescheduled ? 'Rescheduled' : 'Busy'}
                                  </span>

                                  {/* One-Click Shift Class Button (Only for regular loads) */}
                                  {!isExtra && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRescheduleTargetSession(sess);
                                        setRescheduleTargetFaculty(selectedFac);
                                        setRescheduleModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all shadow-2xs active:scale-95"
                                      title={`Shift ${sess.subject} from ${dailySelectedDay} to Sunday or another day`}
                                    >
                                      <ArrowRightLeft className="w-3.5 h-3.5" />
                                      <span>Shift Class</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            /* All Faculty Quick Summary Table */
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Faculty Free Slots Overview on {formattedSelectedDate}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gaps and free windows during working college hours (06:00 AM – 10:00 PM)
                  </p>
                </div>
                <div className="text-xs text-slate-500">
                  Total <span className="font-bold text-slate-800">{dailyFacultyList.length}</span> faculties with classes
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 uppercase text-[10px] font-black tracking-wider">
                      <th className="py-3 px-3">Faculty</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3">Load Status</th>
                      <th className="py-3 px-3">Teaching Hours</th>
                      <th className="py-3 px-3">Total Free Time</th>
                      <th className="py-3 px-3">Free Time Gaps</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyFacultyList.map((f) => {
                      const daily = getFacultyDailyGaps(f.id, dailySelectedDate, dailySelectedDay);
                      const summary = facultyLoadSummaryMap.get(f.id);
                      const isEntireDayFree = daily.groupedSessions.length === 0;

                      return (
                        <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span>{f.name}</span>
                              {isEntireDayFree && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                  Free All Day
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {f.department || 'General'}
                            {f.branch && <span className="text-slate-400 font-mono ml-1">({f.branch})</span>}
                          </td>
                          <td className="py-3 px-3">
                            {(summary?.runningClassCount || 0) > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                🟢 {summary?.runningClassCount} Running ({summary?.runningHours.toFixed(1)}h)
                              </span>
                            ) : (summary?.pendingClassCount || 0) > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                🟡 Pending
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                ⚪ Expired
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-800">
                            <div className="flex flex-wrap items-center gap-1">
                              <span>{(daily.totalBusyMins / 60).toFixed(1)} hrs ({daily.groupedSessions.length} {daily.groupedSessions.length === 1 ? 'class' : 'classes'})</span>
                              {daily.extraSessionsCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800">
                                  +{daily.extraSessionsCount} Extra
                                </span>
                              )}
                              {daily.rescheduledSessionsCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                  +{daily.rescheduledSessionsCount} Shifted
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                            {(daily.totalFreeMins / 60).toFixed(1)} hrs
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1 max-w-md">
                              {daily.freeGaps.length === 0 ? (
                                <span className="text-[11px] text-rose-600 italic">No free gaps</span>
                              ) : (
                                daily.freeGaps.map((g, gIdx) => (
                                  <span
                                    key={gIdx}
                                    className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/70 font-mono text-[11px]"
                                    title={`${formatDuration(g.duration)} free`}
                                  >
                                    {minutesToTime(g.start)}–{minutesToTime(g.end)}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => setDailySelectedFacultyId(f.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              Timeline →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: MONTH-BY-MONTH & SEMESTER TIMELINE */}
      {/* ========================================================================= */}
      {subTab === 'monthly' && (
        <div className="space-y-5 animate-fade-in">
          {/* Controls: Year Selector and Faculty Selector */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                Academic Year:
              </span>
              <div className="flex items-center gap-1">
                {[monthlyYear - 1, monthlyYear, monthlyYear + 1].map((yr) => (
                  <button
                    key={yr}
                    onClick={() => setMonthlyYear(yr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      monthlyYear === yr
                        ? `${animeTheme.activeNavGradient}`
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Filter Faculty:</span>
              <select
                value={monthlySelectedFacultyId}
                onChange={(e) => setMonthlySelectedFacultyId(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="all">All Assigned Faculty ({filteredFaculty.length})</option>
                {filteredFaculty.map((f) => {
                  const s = facultyLoadSummaryMap.get(f.id);
                  const statusTag = (s?.runningClassCount || 0) > 0
                    ? `Running (${s?.runningClassCount})`
                    : (s?.pendingClassCount || 0) > 0
                    ? `Pending (${s?.pendingClassCount})`
                    : 'Expired';
                  return (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.department || 'General'}) • [{statusTag}]
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Monthly Cards List */}
          <div className="space-y-4">
            {filteredFaculty
              .filter((f) => monthlySelectedFacultyId === 'all' || f.id === monthlySelectedFacultyId)
              .map((f) => {
                const mon = getFacultyMonthlyTimeline(f.id, monthlyYear);
                const summary = facultyLoadSummaryMap.get(f.id);

                return (
                  <div
                    key={f.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4 hover:shadow-md transition-shadow"
                  >
                    {/* Faculty Title & Free Months Banner */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-extrabold text-slate-900">{f.name}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            {f.department || 'General'}
                          </span>
                          {f.branch && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                              {f.branch}
                            </span>
                          )}
                          {(summary?.runningClassCount || 0) > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              🟢 {summary?.runningClassCount} Running ({summary?.runningHours.toFixed(1)}h)
                            </span>
                          ) : (summary?.pendingClassCount || 0) > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              🟡 Pending
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              ⚪ Expired
                            </span>
                          )}
                        </div>

                        {/* Summary of Free and Active Teaching Spans */}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                          <span className="font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            🏖️ Free Months ({monthlyYear}):{' '}
                            <span className="font-bold">
                              {mon.freePeriods.length > 0 ? mon.freePeriods.join(', ') : 'None (Active Year-Round)'}
                            </span>
                          </span>

                          <span className="font-semibold text-slate-700 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200">
                            📚 Teaching Months:{' '}
                            <span className="font-bold">
                              {mon.teachingPeriods.length > 0
                                ? mon.teachingPeriods.join(', ')
                                : 'No classes assigned this year'}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start lg:self-auto shrink-0 font-mono text-xs">
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold">
                          {mon.freeMonthCount} Free Months
                        </span>
                        <span className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 font-bold">
                          {mon.busyMonthCount} Teaching Months
                        </span>
                      </div>
                    </div>

                    {/* 12-Month Calendar Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1">
                      {mon.monthStats.map((m) => (
                        <div
                          key={m.monthIndex}
                          className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                            m.isFree
                              ? 'bg-emerald-50/60 border-emerald-200/90 hover:bg-emerald-50'
                              : 'bg-white border-rose-200/80 hover:border-rose-300 shadow-xs'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-800">
                                {m.shortName}
                              </span>
                              {m.isFree ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900">
                                  FREE
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                                  ACTIVE
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-500 mt-1">
                              {m.monthName}
                            </p>
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-100">
                            {m.isFree ? (
                              <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                                <Sun className="w-3 h-3 text-emerald-600" />
                                100% Free
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <div className="text-[11px] font-bold text-slate-800 font-mono">
                                  {m.weeklyHours} hrs/wk
                                </div>
                                <div className="text-[10px] text-slate-500 truncate" title={m.subjects.join(', ')}>
                                  {m.subjects.join(', ') || 'Classes running'}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Reschedule / Shift Class Modal */}
      <RescheduleClassModal
        isOpen={rescheduleModalOpen}
        onClose={() => {
          setRescheduleModalOpen(false);
          setRescheduleTargetSession(null);
          setRescheduleTargetFaculty(null);
        }}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
        session={rescheduleTargetSession}
        facultyMember={rescheduleTargetFaculty}
        allLoads={loads}
        rescheduledClasses={rescheduledClasses}
        animeTheme={animeTheme}
        initialDate={dailySelectedDate}
      />
    </div>
  );
}
