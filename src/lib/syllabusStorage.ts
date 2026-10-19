import { supabase, type Faculty, type Batch, type FacultyLoadWithDetails } from './supabase';
import * as XLSX from 'xlsx';

export type SyllabusSubject = {
  id: string;
  batch_id: string;
  batch_name: string;
  subject: string;
  faculty_id: string;
  faculty_name: string;
  allocated_hours: number;
  start_date?: string;
  end_date?: string;
  notes?: string;
  status: 'planned' | 'in_progress' | 'completed';
  created_at: string;
  updated_at?: string;
};

export type BatchSyllabusCardData = {
  batch_id: string;
  batch_name: string;
  subjects: SyllabusSubject[];
  total_allocated_hours: number;
  total_scheduled_hours: number;
  faculty_names: string[];
  unique_faculties_count: number;
};

const STORAGE_KEY = 'faculty_load_batch_syllabus_v1';

export async function fetchAllSyllabus(batches: Batch[] = [], faculties: Faculty[] = []): Promise<SyllabusSubject[]> {
  try {
    // Attempt Supabase fetch first
    const { data, error } = await supabase.from('batch_syllabus').select('*').order('created_at', { ascending: true });
    if (!error && data && data.length > 0) {
      // Map and sync local storage
      const items: SyllabusSubject[] = data.map((d: any) => ({
        id: d.id,
        batch_id: d.batch_id,
        batch_name: d.batch_name || batches.find(b => b.id === d.batch_id)?.name || 'Unknown Batch',
        subject: d.subject,
        faculty_id: d.faculty_id,
        faculty_name: d.faculty_name || faculties.find(f => f.id === d.faculty_id)?.name || 'Assigned Faculty',
        allocated_hours: Number(d.allocated_hours) || 40,
        start_date: d.start_date || undefined,
        end_date: d.end_date || undefined,
        notes: d.notes || '',
        status: (d.status as any) || 'in_progress',
        created_at: d.created_at || new Date().toISOString(),
        updated_at: d.updated_at,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return items;
    }
  } catch (err) {
    // Silent fallback to local storage
  }

  // Load from LocalStorage
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        // Strip out any previous dummy items
        const clean = parsed.filter(item => item && !String(item.id).startsWith('syl-kt-'));
        if (clean.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
        }
        return clean;
      }
    } catch {
      // ignore JSON parse error
    }
  }

  // No mock or fake seed: start completely clean with user's real batches
  return [];
}

export async function saveSyllabusSubject(
  item: Omit<SyllabusSubject, 'id' | 'created_at'> & { id?: string }
): Promise<SyllabusSubject> {
  const current = await fetchAllSyllabus();
  const id = item.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `syl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`);
  const now = new Date().toISOString();

  const fullItem: SyllabusSubject = {
    id,
    batch_id: item.batch_id,
    batch_name: item.batch_name,
    subject: item.subject.trim(),
    faculty_id: item.faculty_id,
    faculty_name: item.faculty_name,
    allocated_hours: Number(item.allocated_hours) || 40,
    start_date: item.start_date || undefined,
    end_date: item.end_date || undefined,
    notes: item.notes || '',
    status: item.status || 'in_progress',
    created_at: now,
    updated_at: now,
  };

  const existingIndex = current.findIndex(s => s.id === id);
  let updatedList: SyllabusSubject[];
  if (existingIndex >= 0) {
    updatedList = [...current];
    updatedList[existingIndex] = {
      ...current[existingIndex],
      ...fullItem,
      created_at: current[existingIndex].created_at,
    };
  } else {
    updatedList = [...current, fullItem];
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));

  // Try saving to Supabase in background
  try {
    await supabase.from('batch_syllabus').upsert([
      {
        id: fullItem.id,
        batch_id: fullItem.batch_id,
        batch_name: fullItem.batch_name,
        subject: fullItem.subject,
        faculty_id: fullItem.faculty_id,
        faculty_name: fullItem.faculty_name,
        allocated_hours: fullItem.allocated_hours,
        start_date: fullItem.start_date,
        end_date: fullItem.end_date,
        notes: fullItem.notes,
        status: fullItem.status,
        updated_at: fullItem.updated_at,
      },
    ]);
  } catch {
    // Non-blocking
  }

  return fullItem;
}

export async function deleteSyllabusSubject(id: string): Promise<void> {
  const current = await fetchAllSyllabus();
  const updatedList = current.filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));

  try {
    await supabase.from('batch_syllabus').delete().eq('id', id);
  } catch {
    // Non-blocking
  }
}

export async function deleteBatchSyllabus(batchId: string): Promise<void> {
  const current = await fetchAllSyllabus();
  const updatedList = current.filter(s => s.batch_id !== batchId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));

  try {
    await supabase.from('batch_syllabus').delete().eq('batch_id', batchId);
  } catch {
    // Non-blocking
  }
}

// Group all syllabus subjects into unified batch cards
export function groupSyllabusByBatch(
  syllabusItems: SyllabusSubject[],
  loads: FacultyLoadWithDetails[] = []
): BatchSyllabusCardData[] {
  const map = new Map<string, { batch_name: string; subjects: SyllabusSubject[] }>();

  for (const item of syllabusItems) {
    if (!map.has(item.batch_id)) {
      map.set(item.batch_id, {
        batch_name: item.batch_name,
        subjects: [],
      });
    }
    map.get(item.batch_id)!.subjects.push(item);
  }

  // Pre-calculate scheduled hours from timetable loads for each batch + subject
  const scheduledHoursMap = new Map<string, number>(); // key: `${batch_id}|${normalized_subject}`
  for (const load of loads) {
    if (!load.start_time || !load.end_time) continue;
    const [sh, sm] = load.start_time.split(':').map(Number);
    const [eh, em] = load.end_time.split(':').map(Number);
    if (isNaN(sh) || isNaN(eh)) continue;
    const durationHours = Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);

    const key = `${load.batch_id}|${load.subject.trim().toLowerCase()}`;
    const prev = scheduledHoursMap.get(key) || 0;
    scheduledHoursMap.set(key, prev + durationHours);
  }

  const cards: BatchSyllabusCardData[] = [];

  for (const [batch_id, data] of map.entries()) {
    const totalAllocated = data.subjects.reduce((sum, s) => sum + s.allocated_hours, 0);

    // Calculate scheduled hours for this batch across all its syllabus subjects
    let totalScheduled = 0;
    for (const sub of data.subjects) {
      const key = `${batch_id}|${sub.subject.trim().toLowerCase()}`;
      totalScheduled += scheduledHoursMap.get(key) || 0;
    }

    const uniqueFaculties = Array.from(new Set(data.subjects.map(s => s.faculty_name).filter(Boolean)));

    cards.push({
      batch_id,
      batch_name: data.batch_name,
      subjects: data.subjects,
      total_allocated_hours: totalAllocated,
      total_scheduled_hours: Math.round(totalScheduled * 10) / 10,
      faculty_names: uniqueFaculties,
      unique_faculties_count: uniqueFaculties.length,
    });
  }

  // Sort by batch name ascending
  return cards.sort((a, b) => a.batch_name.localeCompare(b.batch_name));
}

// Export syllabus data to Excel
export function exportSyllabusToExcel(cards: BatchSyllabusCardData[], filename = 'Batch_Syllabus_Curriculum.xlsx'): void {
  const rows: any[] = [];

  for (const card of cards) {
    for (const sub of card.subjects) {
      rows.push({
        'Batch Name': card.batch_name,
        'Subject': sub.subject,
        'Assigned Faculty': sub.faculty_name,
        'Total Allocated Hours': sub.allocated_hours,
        'Start Date': sub.start_date || '-',
        'End Date': sub.end_date || '-',
        'Status': sub.status.toUpperCase(),
        'Notes & Syllabus Remarks': sub.notes || '-',
      });
    }
  }

  if (rows.length === 0) {
    rows.push({
      'Batch Name': 'No syllabus records yet',
      'Subject': '-',
      'Assigned Faculty': '-',
      'Total Allocated Hours': 0,
      'Start Date': '-',
      'End Date': '-',
      'Status': '-',
      'Notes & Syllabus Remarks': '-',
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Batch Planner');

  // Set column widths
  worksheet['!cols'] = [
    { wch: 38 }, // Batch
    { wch: 30 }, // Subject
    { wch: 22 }, // Faculty
    { wch: 18 }, // Hours
    { wch: 16 }, // Start Date
    { wch: 16 }, // End Date
    { wch: 15 }, // Status
    { wch: 45 }, // Notes
  ];

  XLSX.writeFile(workbook, filename);
}
