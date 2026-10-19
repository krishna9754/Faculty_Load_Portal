import ExcelJS from 'exceljs';
import { supabase } from '@/lib/supabase';

export const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function getDayOfWeekFromDate(dateStr: string): string {
  if (!dateStr) return 'Monday';
  const d = new Date(dateStr + 'T00:00:00');
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayIndex = d.getDay();
  return isNaN(dayIndex) ? 'Monday' : (dayNames[dayIndex] || 'Monday');
}

export function normalizeDate(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'number') {
    // Excel serial date code
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (isNaN(date.getTime())) return null;
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(s)) {
    const delimiter = s.includes('/') ? '/' : '-';
    const [p1, p2, y] = s.split(delimiter);
    let d = p1;
    let m = p2;
    if (Number(p1) > 12 && Number(p2) <= 12) {
      d = p1;
      m = p2;
    } else if (Number(p2) > 12 && Number(p1) <= 12) {
      m = p1;
      d = p2;
    }
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

export function normalizeTime(val: unknown): string | null {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') {
    const totalMinutes = Math.round(val * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  const match24 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    const h = Number(match24[1]);
    const m = Number(match24[2]);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }
  const match12 = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (match12) {
    let h = Number(match12[1]);
    const m = Number(match12[2]);
    const ampm = match12[3].toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }
  return null;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export interface TemplateDownloadOptions {
  facultyList?: string[];
  subjectList?: string[];
  batchList?: string[];
}

/**
 * Downloads a schedule template (.xlsx with dynamic dropdown Data Validation or .csv)
 * pre-filled with sample rows demonstrating single & multiple comma-separated batch entries,
 * along with interactive dropdowns for Faculty Name, Batches, and Subject.
 */
export async function downloadBlankTemplate(
  format: 'xlsx' | 'csv',
  options?: TemplateDownloadOptions
) {
  let faculties = (options?.facultyList || []).map((f) => f.trim()).filter(Boolean);
  let subjects = (options?.subjectList || []).map((s) => s.trim()).filter(Boolean);
  let batches = (options?.batchList || []).map((b) => b.trim()).filter(Boolean);

  // If faculties, subjects, or batches are not provided or empty, query database directly
  if (faculties.length === 0 || subjects.length === 0 || batches.length === 0) {
    try {
      const [facRes, loadRes, batchRes] = await Promise.all([
        supabase.from('faculty').select('name').order('name'),
        supabase.from('faculty_loads').select('subject').order('subject'),
        supabase.from('batches').select('name').order('name'),
      ]);

      if (faculties.length === 0 && facRes.data) {
        faculties = Array.from(
          new Set(
            facRes.data
              .map((f: { name?: string }) => f.name?.trim())
              .filter((n): n is string => Boolean(n))
          )
        );
      }

      if (subjects.length === 0 && loadRes.data) {
        subjects = Array.from(
          new Set(
            loadRes.data
              .map((l: { subject?: string }) => l.subject?.trim())
              .filter((s): s is string => Boolean(s))
          )
        );
      }

      if (batches.length === 0 && batchRes.data) {
        batches = Array.from(
          new Set(
            batchRes.data
              .map((b: { name?: string }) => b.name?.trim())
              .filter((n): n is string => Boolean(n))
          )
        );
      }
    } catch (err) {
      console.warn('Could not fetch active faculties/subjects/batches from Supabase:', err);
    }
  }

  // Sensible fallbacks if database currently has 0 entries
  if (faculties.length === 0) {
    faculties = ["Yashika Ma'am", "Mumtaz Ma'am", 'Rakesh Sir', 'Pooja Sharma'];
  }
  if (subjects.length === 0) {
    subjects = ['General Science', 'History', 'Quantitative Aptitude', 'Reasoning', 'English'];
  }
  if (batches.length === 0) {
    batches = ['Aadhar JE 2029 Batch - Civil', 'Aadhar JE 2029 Batch - Electrical', 'RRB ALP Batch A', 'Gate 2026 CS'];
  }

  // Ensure demonstration batches requested by the user are present in the list
  const demoBatchCivil = 'Aadhar JE 2029 Batch - Civil';
  const demoBatchElectrical = 'Aadhar JE 2029 Batch - Electrical';
  if (!batches.includes(demoBatchCivil)) batches.unshift(demoBatchCivil);
  if (!batches.includes(demoBatchElectrical)) batches.splice(1, 0, demoBatchElectrical);

  const fac1 = faculties[0] || "Yashika Ma'am";
  const fac2 = faculties[1] || faculties[0] || "Mumtaz Ma'am";
  const fac3 = faculties[2] || faculties[0] || "Deependra Sir";

  const sub1 = subjects[0] || 'General Science';
  const sub2 = subjects[1] || subjects[0] || 'History';
  const sub3 = subjects[2] || subjects[0] || 'Reasoning';

  // Pre-filled sample rows: Demonstrates single batch, multiple comma-separated batches, and valid formats
  const sampleRows = [
    {
      faculty: fac1,
      room: 'Room 101',
      batches: demoBatchCivil, // Single batch selection
      subject: sub1,
      day: 'Monday',
      startTime: '08:00',
      endTime: '09:15',
      startDate: '2026-10-12',
      endDate: '2026-10-31',
    },
    {
      faculty: fac2,
      room: 'Hall A',
      batches: `${demoBatchCivil}, ${demoBatchElectrical}`, // Multiple batches selection
      subject: sub2,
      day: 'Tuesday',
      startTime: '09:30',
      endTime: '11:00',
      startDate: '2026-10-12',
      endDate: '2026-10-31',
    },
    {
      faculty: fac3,
      room: 'Lab 2',
      batches: batches[2] || demoBatchCivil,
      subject: sub3,
      day: 'Wednesday',
      startTime: '11:30',
      endTime: '12:45',
      startDate: '2026-10-12',
      endDate: '2026-10-31',
    },
  ];

  const columns = [
    { header: 'Faculty Name', key: 'faculty', width: 25 },
    { header: 'Room (optional)', key: 'room', width: 18 },
    { header: 'Batches', key: 'batches', width: 38 },
    { header: 'Subject', key: 'subject', width: 26 },
    { header: 'Day (optional)', key: 'day', width: 16 },
    { header: 'Start Time', key: 'startTime', width: 14 },
    { header: 'End Time', key: 'endTime', width: 14 },
    { header: 'Start Date', key: 'startDate', width: 16 },
    { header: 'End Date', key: 'endDate', width: 16 },
  ];

  if (format === 'csv') {
    const headers = columns.map((c) => c.header).join(',');
    const sampleCsvRows = sampleRows.map((r) =>
      [
        `"${r.faculty}"`,
        `"${r.room}"`,
        `"${r.batches}"`,
        `"${r.subject}"`,
        `"${r.day}"`,
        `"${r.startTime}"`,
        `"${r.endTime}"`,
        `"${r.startDate}"`,
        `"${r.endDate}"`,
      ].join(',')
    );
    const blob = new Blob([[headers, ...sampleCsvRows].join('\n') + '\n'], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Faculty_Load_Template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  // Excel (.xlsx) with Data Validation Dropdowns
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Faculty Workload Management Portal';
  wb.created = new Date();

  // 1. Main Sheet: 'Faculty Loads' (Sheet index 0)
  const ws = wb.addWorksheet('Faculty Loads', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = columns;

  // 2. Data Validation Lists sheet (hidden, Sheet index 1)
  const wsLists = wb.addWorksheet('ValidationLists');
  wsLists.state = 'hidden';

  wsLists.getCell('A1').value = 'Faculties';
  faculties.forEach((f, idx) => {
    wsLists.getCell(`A${idx + 2}`).value = f;
  });

  wsLists.getCell('B1').value = 'Subjects';
  subjects.forEach((s, idx) => {
    wsLists.getCell(`B${idx + 2}`).value = s;
  });

  wsLists.getCell('C1').value = 'Days';
  VALID_DAYS.forEach((d, idx) => {
    wsLists.getCell(`C${idx + 2}`).value = d;
  });

  wsLists.getCell('D1').value = 'Batches';
  batches.forEach((b, idx) => {
    wsLists.getCell(`D${idx + 2}`).value = b;
  });

  // Style Header Row
  const headerRow = ws.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }, // Blue 800
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Populate pre-filled sample rows
  sampleRows.forEach((row, i) => {
    const r = i + 2;
    ws.getCell(`A${r}`).value = row.faculty;
    ws.getCell(`B${r}`).value = row.room;
    ws.getCell(`C${r}`).value = row.batches;
    ws.getCell(`D${r}`).value = row.subject;
    ws.getCell(`E${r}`).value = row.day;
    ws.getCell(`F${r}`).value = row.startTime;
    ws.getCell(`G${r}`).value = row.endTime;
    ws.getCell(`H${r}`).value = row.startDate;
    ws.getCell(`I${r}`).value = row.endDate;
  });

  // Apply Data Validation dropdowns to rows 2 to 250
  const maxRows = 250;
  const facultyRange = `ValidationLists!$A$2:$A$${faculties.length + 1}`;
  const subjectRange = `ValidationLists!$B$2:$B$${subjects.length + 1}`;
  const dayRange = `ValidationLists!$C$2:$C$${VALID_DAYS.length + 1}`;
  const batchRange = `ValidationLists!$D$2:$D$${batches.length + 1}`;

  for (let r = 2; r <= maxRows; r++) {
    // Column A: Faculty Name (Dropdown list)
    ws.getCell(`A${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [facultyRange],
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'Faculty Selection',
      error: 'Please choose an active faculty from the dropdown list or confirm spelling.',
    };

    // Column C: Batches (Dropdown list with multi-batch guidance)
    ws.getCell(`C${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [batchRange],
      showErrorMessage: false, // allows entering multiple comma-separated batches without blocking
      showInputMessage: true,
      promptTitle: 'Batches (Web Multi-Select Supported)',
      prompt: 'Pick 1 batch here, or leave blank to check multiple batches with checkboxes in the web portal preview grid.',
    };
    ws.getCell(`C${r}`).numFmt = '@';

    // Column D: Subject (Dropdown list)
    ws.getCell(`D${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [subjectRange],
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'Subject Selection',
      error: 'Please choose an existing subject from the dropdown list or confirm spelling.',
    };

    // Column E: Day (Optional dropdown list)
    ws.getCell(`E${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [dayRange],
      showErrorMessage: true,
      errorStyle: 'information',
      errorTitle: 'Day of Week',
      error: 'Select a day of the week, or leave blank to auto-detect from Start Date.',
    };

    // Set Text formatting for Times and Dates
    ws.getCell(`F${r}`).numFmt = '@';
    ws.getCell(`G${r}`).numFmt = '@';
    ws.getCell(`H${r}`).numFmt = 'yyyy-mm-dd';
    ws.getCell(`I${r}`).numFmt = 'yyyy-mm-dd';
  }

  // Generate buffer and trigger browser download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Faculty_Load_Template.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const downloadSampleTemplate = downloadBlankTemplate;
