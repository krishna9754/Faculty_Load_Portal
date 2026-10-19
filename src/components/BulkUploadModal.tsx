import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import type { Faculty, Batch, FacultyLoadWithDetails } from '@/lib/supabase';
import {
  Upload,
  X,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Link as LinkIcon,
  Layers,
  ArrowRight,
  RefreshCw,
  Info,
  ChevronDown,
  Search,
  Plus,
} from 'lucide-react';

export interface ParsedRow {
  rowNum: number;
  facultyName: string;
  subject: string;
  batchNames: string[];
  day: string;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  room: string;
  isValid: boolean;
  errors: string[];
  clashes: string[];
}

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingFaculty: Faculty[];
  existingBatches: Batch[];
  existingLoads: FacultyLoadWithDetails[];
  onSuccess: (summary: { addedLoads: number; addedFaculty: number; addedBatches: number }) => void;
}

import {
  VALID_DAYS,
  getDayOfWeekFromDate,
  normalizeDate,
  normalizeTime,
  timeToMinutes,
  downloadBlankTemplate,
} from '@/lib/templateUtils';

function computeRowValidationAndClashes(
  row: {
    facultyName: string;
    subject: string;
    batchNames: string[];
    day: string;
    startTime: string;
    endTime: string;
    startDate: string;
    endDate: string;
  },
  existingLoads: FacultyLoadWithDetails[]
): { isValid: boolean; errors: string[]; clashes: string[] } {
  const errors: string[] = [];
  const clashes: string[] = [];

  const facultyClean = row.facultyName.trim();
  const subjectClean = row.subject.trim();

  if (!facultyClean) errors.push('Missing Faculty Name');
  if (!subjectClean) errors.push('Missing Subject');

  if (row.batchNames.length === 0) {
    errors.push('At least one Batch Name is required (click to select batches)');
  }

  const startDate = normalizeDate(row.startDate);
  if (!startDate) {
    errors.push(`Invalid Start Date: "${row.startDate}" (use YYYY-MM-DD)`);
  }

  const endDate = normalizeDate(row.endDate);
  if (!endDate) {
    errors.push(`Invalid End Date: "${row.endDate}" (use YYYY-MM-DD)`);
  }

  if (startDate && endDate && endDate < startDate) {
    errors.push(`End Date (${endDate}) is before Start Date (${startDate})`);
  }

  const startTime = normalizeTime(row.startTime);
  if (!startTime) {
    errors.push(`Invalid Start Time: "${row.startTime}" (use HH:mm)`);
  }

  const endTime = normalizeTime(row.endTime);
  if (!endTime) {
    errors.push(`Invalid End Time: "${row.endTime}" (use HH:mm)`);
  }

  if (startTime && endTime && timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    errors.push(`End Time (${endTime}) must be after Start Time (${startTime})`);
  }

  let day = row.day;
  if (day) {
    const found = VALID_DAYS.find((d) => d.toLowerCase() === day.toLowerCase());
    if (found) {
      day = found;
    } else {
      errors.push(`Invalid Day: "${day}". Must be one of Monday-Sunday`);
    }
  } else if (startDate) {
    day = getDayOfWeekFromDate(startDate);
  } else {
    day = 'Monday';
  }

  // Conflict / Clash Check against existingLoads
  if (errors.length === 0 && startDate && endDate && startTime && endTime) {
    const rowStartMin = timeToMinutes(startTime);
    const rowEndMin = timeToMinutes(endTime);
    const rowStartMs = new Date(startDate).getTime();
    const rowEndMs = new Date(endDate).getTime();

    for (const existing of existingLoads) {
      if (existing.day_of_week && existing.day_of_week !== day) continue;
      const exStartMs = new Date(existing.start_date).getTime();
      const exEndMs = new Date(existing.end_date).getTime();
      if (rowStartMs > exEndMs || rowEndMs < exStartMs) continue;

      const exStartMin = timeToMinutes(existing.start_time);
      const exEndMin = timeToMinutes(existing.end_time);
      if (rowStartMin >= exEndMin || rowEndMin <= exStartMin) continue;

      // Faculty clash
      if (
        existing.faculty?.name &&
        facultyClean.toLowerCase() === existing.faculty.name.toLowerCase().trim() &&
        !row.batchNames.some((b) => b.toLowerCase().trim() === existing.batch?.name?.toLowerCase().trim())
      ) {
        clashes.push(
          `Faculty clash: ${existing.faculty.name} is scheduled with batch ${existing.batch?.name} (${existing.start_time}-${existing.end_time})`
        );
      }

      // Batch clash
      for (const bn of row.batchNames) {
        if (
          existing.batch?.name &&
          bn.toLowerCase().trim() === existing.batch.name.toLowerCase().trim() &&
          facultyClean.toLowerCase() !== existing.faculty?.name?.toLowerCase().trim()
        ) {
          clashes.push(
            `Batch clash: Batch "${bn}" already has ${existing.faculty?.name} (${existing.start_time}-${existing.end_time})`
          );
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    clashes,
  };
}

function RowBatchSelector({
  selectedBatches,
  allBatches,
  onChange,
}: {
  selectedBatches: string[];
  allBatches: Batch[];
  onChange: (batches: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 330 });

  const updatePos = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.min(360, Math.max(300, window.innerWidth - 32));
    let top = rect.bottom + 6;
    let left = rect.left;

    if (left + width > window.innerWidth - 16) {
      left = window.innerWidth - width - 16;
    }
    if (left < 16) left = 16;

    if (top + 330 > window.innerHeight && rect.top > 340) {
      top = rect.top - 336;
    }

    setPos({ top, left, width });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePos();

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    const handleScroll = (e: Event) => {
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) return;
      updatePos();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updatePos);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [isOpen]);

  const allNames = Array.from(
    new Set([...selectedBatches, ...allBatches.map((b) => b.name).filter(Boolean)])
  );

  const query = search.toLowerCase().trim();
  const filtered = allNames.filter((name) => name.toLowerCase().includes(query));

  const toggleBatch = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (selectedBatches.includes(trimmed)) {
      onChange(selectedBatches.filter((b) => b !== trimmed));
    } else {
      onChange([...selectedBatches, trimmed]);
    }
  };

  const handleSelectAllFiltered = () => {
    const set = new Set([...selectedBatches, ...filtered]);
    onChange(Array.from(set));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const handleAddCustom = () => {
    const trimmed = search.trim();
    if (!trimmed) return;
    if (!selectedBatches.includes(trimmed)) {
      onChange([...selectedBatches, trimmed]);
    }
    setSearch('');
  };

  return (
    <div className="relative">
      {selectedBatches.length === 0 ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            updatePos();
            setIsOpen(!isOpen);
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-semibold transition-all shadow-2xs group cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
          <span>Select Batches</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-200/80 text-amber-900 text-[10px] font-bold">
            0
          </span>
        </button>
      ) : selectedBatches.length === 1 ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            updatePos();
            setIsOpen(!isOpen);
          }}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-blue-900 text-[11px] font-medium transition-all cursor-pointer text-left max-w-[220px]"
          title="Click to check/uncheck batches"
        >
          <span className="truncate max-w-[170px]" title={selectedBatches[0]}>
            {selectedBatches[0]}
          </span>
          <ChevronDown className="w-3 h-3 text-blue-600 shrink-0" />
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            updatePos();
            setIsOpen(!isOpen);
          }}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-blue-900 text-[11px] font-medium transition-all cursor-pointer text-left"
          title="Click to check/uncheck batches"
        >
          <span className="truncate max-w-[120px]" title={selectedBatches[0]}>
            {selectedBatches[0]}
          </span>
          <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold shrink-0">
            +{selectedBatches.length - 1} more
          </span>
          <ChevronDown className="w-3 h-3 text-blue-600 shrink-0" />
        </button>
      )}

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: `${pos.top}px`,
              left: `${pos.left}px`,
              width: `${pos.width}px`,
              zIndex: 99999,
            }}
            className="bg-white rounded-xl shadow-2xl border border-slate-200 p-3 text-xs animate-in fade-in-50 zoom-in-95 duration-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-800 text-xs">
                Select Batches ({selectedBatches.length} checked)
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mt-2 mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search portal batches..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustom();
                  }
                }}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                autoFocus
              />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between text-[11px] px-1 mb-2">
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
              >
                Select All {filtered.length > 0 && `(${filtered.length})`}
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-slate-500 hover:text-slate-800 font-medium hover:underline"
              >
                Clear All
              </button>
            </div>

            {/* Checkbox List */}
            <div className="max-h-52 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs">
                  <p>No matching batches found.</p>
                  {search.trim() && (
                    <button
                      type="button"
                      onClick={handleAddCustom}
                      className="mt-2 text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add "{search.trim()}"
                    </button>
                  )}
                </div>
              ) : (
                filtered.map((name) => {
                  const isChecked = selectedBatches.includes(name);
                  return (
                    <label
                      key={name}
                      className={`flex items-start gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                        isChecked ? 'bg-blue-50/80 text-blue-900 font-medium' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleBatch(name)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 mt-0.5 shrink-0"
                      />
                      <span className="text-xs leading-snug break-words flex-1">
                        {name}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {selectedBatches.length} of {allNames.length} selected
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export function BulkUploadModal({
  isOpen,
  onClose,
  existingFaculty,
  existingBatches,
  existingLoads,
  onSuccess,
}: BulkUploadModalProps) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [filterView, setFilterView] = useState<'all' | 'valid' | 'needs-batches' | 'errors'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [fetchingGoogleSheet, setFetchingGoogleSheet] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setStep('upload');
    setFileName('');
    setFileSize('');
    setParsedRows([]);
    setSkippedCount(0);
    setFilterView('all');
    setIsSubmitting(false);
    setErrorBanner(null);
    setGoogleSheetUrl('');
  };

  const handleModalClose = () => {
    resetState();
    onClose();
  };

  const handleRowBatchesChange = (rowNum: number, newBatches: string[]) => {
    setParsedRows((prev) =>
      prev.map((r) => {
        if (r.rowNum !== rowNum) return r;
        const updatedRow = { ...r, batchNames: newBatches };
        const { isValid, errors, clashes } = computeRowValidationAndClashes(updatedRow, existingLoads);
        return {
          ...updatedRow,
          isValid,
          errors,
          clashes,
        };
      })
    );
  };

  const parseAndValidateData = (rawRows: Record<string, unknown>[], sourceName: string, sizeText = '') => {
    setErrorBanner(null);
    if (!rawRows || rawRows.length === 0) {
      setErrorBanner('The uploaded file appears to be empty or has no data rows.');
      return;
    }

    const cleanKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
    let skippedEmpty = 0;

    const rows: ParsedRow[] = rawRows.map((raw, idx) => {
      const rowNum = idx + 2; // Row number in sheet (accounting for header)
      const mapped: Record<string, unknown> = {};
      Object.keys(raw).forEach((k) => {
        mapped[cleanKey(k)] = raw[k];
      });

      const getVal = (...keys: string[]): unknown => {
        for (const k of keys) {
          const val = mapped[cleanKey(k)];
          if (val !== undefined && val !== null && String(val).trim() !== '') return val;
        }
        return '';
      };

      const facultyNameRaw = String(getVal('facultyname', 'faculty', 'faculties', 'teacher', 'instructor', 'name', 'facultymember')).trim();
      const roomRaw = String(getVal('roomoptional', 'room', 'roomno', 'classroom', 'hall', 'venue')).trim();
      const batchesRaw = String(getVal('batches', 'batch', 'batchnames', 'batchname', 'classes', 'class')).trim();
      const subjectRaw = String(getVal('subject', 'subjects', 'course', 'topic')).trim();
      const startTimeRaw = getVal('starttime', 'timefrom', 'fromtime', 'start', 'timestart');
      const endTimeRaw = getVal('endtime', 'timeto', 'totime', 'end', 'timeend');
      const startDateRaw = getVal('startdate', 'datefrom', 'fromdate', 'datestart', 'from');
      const endDateRaw = getVal('enddate', 'dateto', 'todate', 'dateend', 'to');
      const dayRaw = String(getVal('day', 'weekday', 'dayofweek')).trim();

      const hasFaculty = Boolean(facultyNameRaw);
      const hasSubject = Boolean(subjectRaw);
      const hasBatches = Boolean(batchesRaw);
      const hasStartTime = Boolean(startTimeRaw !== undefined && startTimeRaw !== null && String(startTimeRaw).trim() !== '');
      const hasEndTime = Boolean(endTimeRaw !== undefined && endTimeRaw !== null && String(endTimeRaw).trim() !== '');
      const hasStartDate = Boolean(startDateRaw !== undefined && startDateRaw !== null && String(startDateRaw).trim() !== '');
      const hasEndDate = Boolean(endDateRaw !== undefined && endDateRaw !== null && String(endDateRaw).trim() !== '');
      const hasRoom = Boolean(roomRaw);
      const hasDay = Boolean(dayRaw);

      // 1. Completely empty row (no cell has any value)
      if (
        !hasFaculty &&
        !hasSubject &&
        !hasBatches &&
        !hasStartTime &&
        !hasEndTime &&
        !hasStartDate &&
        !hasEndDate &&
        !hasRoom &&
        !hasDay
      ) {
        skippedEmpty++;
        return null;
      }

      // 2. Intelligent Blank/Unselected Template Row Filter:
      // In pre-formatted templates, empty rows contain dropdown configs or formatting but no actual schedule entries.
      // Automatically ignore/skip rows where user hasn't filled in essential schedule details:
      // - Must have timing and/or date details (a load requires schedule timing/dates)
      // - Must have at least faculty or subject/batch
      // - Must have at least 3 essential schedule fields filled
      const hasAnyTimeOrDate = hasStartTime || hasEndTime || hasStartDate || hasEndDate;
      const filledEssentialCount = [
        hasFaculty,
        hasSubject,
        hasBatches,
        hasStartTime,
        hasEndTime,
        hasStartDate,
        hasEndDate,
      ].filter(Boolean).length;

      if (!hasAnyTimeOrDate || (!hasFaculty && !hasSubject) || filledEssentialCount < 3) {
        skippedEmpty++;
        return null;
      }

      const batchNames = Array.from(
        new Set(
          batchesRaw
            .split(/(?:[,;\n|]|\s+\/\s+)+/)
            .map((b) => b.replace(/^["']|["']$/g, '').trim())
            .filter(Boolean)
        )
      );

      const startDate = normalizeDate(startDateRaw);
      const endDate = normalizeDate(endDateRaw);
      const startTime = normalizeTime(startTimeRaw);
      const endTime = normalizeTime(endTimeRaw);

      let day = '';
      if (dayRaw) {
        const found = VALID_DAYS.find((d) => d.toLowerCase() === dayRaw.toLowerCase());
        day = found || dayRaw;
      } else if (startDate) {
        day = getDayOfWeekFromDate(startDate);
      } else {
        day = 'Monday';
      }

      const { isValid, errors, clashes } = computeRowValidationAndClashes(
        {
          facultyName: facultyNameRaw,
          subject: subjectRaw,
          batchNames,
          day,
          startTime: startTime || String(startTimeRaw || ''),
          endTime: endTime || String(endTimeRaw || ''),
          startDate: startDate || String(startDateRaw || ''),
          endDate: endDate || String(endDateRaw || ''),
        },
        existingLoads
      );

      return {
        rowNum,
        facultyName: facultyNameRaw,
        subject: subjectRaw,
        batchNames,
        day,
        startTime: startTime || String(startTimeRaw || ''),
        endTime: endTime || String(endTimeRaw || ''),
        startDate: startDate || String(startDateRaw || ''),
        endDate: endDate || String(endDateRaw || ''),
        room: roomRaw,
        isValid,
        errors,
        clashes,
      };
    }).filter((r): r is ParsedRow => r !== null);

    if (rows.length === 0) {
      setErrorBanner(
        `No filled schedule entries found in "${sourceName}"${
          skippedEmpty > 0 ? ` (${skippedEmpty} blank or unselected template rows were automatically skipped)` : ''
        }. Please fill out at least one row with faculty, subject, batches, and timing details.`
      );
      return;
    }

    setFileName(sourceName);
    setFileSize(sizeText);
    setSkippedCount(skippedEmpty);
    setParsedRows(rows);
    setStep('preview');
  };

  const handleFileProcess = (file: File) => {
    const sizeStr = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          setErrorBanner('Uploaded workbook has no sheets.');
          return;
        }

        // Explicitly read from 'Faculty Loads' sheet, avoiding hidden 'ValidationLists'
        const targetSheetName =
          wb.SheetNames.find((s) => s.trim().toLowerCase() === 'faculty loads') ||
          wb.SheetNames.find((s) => !s.trim().toLowerCase().includes('validation')) ||
          wb.SheetNames[0];

        const ws = wb.Sheets[targetSheetName];
        if (!ws) {
          setErrorBanner(`Could not find sheet "${targetSheetName}" in workbook.`);
          return;
        }

        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: true });
        parseAndValidateData(rows, file.name, sizeStr);
      } catch (err) {
        setErrorBanner(`Failed to parse file: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    reader.onerror = () => {
      setErrorBanner('Failed to read the selected file.');
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleFetchGoogleSheet = async () => {
    if (!googleSheetUrl.trim()) return;
    setFetchingGoogleSheet(true);
    setErrorBanner(null);
    try {
      let csvUrl = googleSheetUrl.trim();
      if (csvUrl.includes('/edit')) {
        csvUrl = csvUrl.replace(/\/edit.*$/, '/export?format=csv');
      } else if (!csvUrl.includes('/export?format=csv')) {
        csvUrl = csvUrl.replace(/\/?$/, '/export?format=csv');
      }

      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Could not fetch sheet`);
      const text = await res.text();
      const wb = XLSX.read(text, { type: 'string' });
      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        throw new Error('Google Sheet has no sheets or content.');
      }

      const targetSheetName =
        wb.SheetNames.find((s) => s.trim().toLowerCase() === 'faculty loads') ||
        wb.SheetNames.find((s) => !s.trim().toLowerCase().includes('validation')) ||
        wb.SheetNames[0];

      const ws = wb.Sheets[targetSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: true });
      parseAndValidateData(rows, 'Google Sheet Export', `${(text.length / 1024).toFixed(1)} KB`);
    } catch (err) {
      setErrorBanner(
        `Failed to fetch Google Sheet: ${err instanceof Error ? err.message : String(err)}. Ensure the sheet is publicly viewable ("Anyone with the link can view").`
      );
    } finally {
      setFetchingGoogleSheet(false);
    }
  };

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsSubmitting(true);
    setErrorBanner(null);

    try {
      // 1. Gather all unique faculty names and batch names
      const facultyMap = new Map<string, string>();
      existingFaculty.forEach((f) => facultyMap.set(f.name.toLowerCase().trim(), f.id));

      const batchMap = new Map<string, string>();
      existingBatches.forEach((b) => batchMap.set(b.name.toLowerCase().trim(), b.id));

      const newFacultyNames = new Set<string>();
      const newBatchNames = new Set<string>();

      validRows.forEach((r) => {
        if (!facultyMap.has(r.facultyName.toLowerCase().trim())) {
          newFacultyNames.add(r.facultyName.trim());
        }
        r.batchNames.forEach((bn) => {
          if (!batchMap.has(bn.toLowerCase().trim())) {
            newBatchNames.add(bn.trim());
          }
        });
      });

      // 2. Create missing faculties
      let addedFacultyCount = 0;
      if (newFacultyNames.size > 0) {
        const { data: createdFaculties, error: facErr } = await supabase
          .from('faculty')
          .insert(Array.from(newFacultyNames).map((name) => ({ name, department: 'General' })))
          .select('id, name');

        if (facErr) throw facErr;
        (createdFaculties || []).forEach((f) => facultyMap.set(f.name.toLowerCase().trim(), f.id));
        addedFacultyCount = createdFaculties?.length || 0;
      }

      // 3. Create missing batches
      let addedBatchesCount = 0;
      if (newBatchNames.size > 0) {
        const { data: createdBatches, error: batErr } = await supabase
          .from('batches')
          .insert(Array.from(newBatchNames).map((name) => ({ name })))
          .select('id, name');

        if (batErr) throw batErr;
        (createdBatches || []).forEach((b) => batchMap.set(b.name.toLowerCase().trim(), b.id));
        addedBatchesCount = createdBatches?.length || 0;
      }

      // 4. Create loads (1 load per batch name in each valid row)
      const loadRecords: {
        faculty_id: string;
        batch_id: string;
        subject: string;
        day_of_week: string;
        start_time: string;
        end_time: string;
        start_date: string;
        end_date: string;
        room: string | null;
        start_mail_sent: boolean;
      }[] = [];

      for (const row of validRows) {
        const facId = facultyMap.get(row.facultyName.toLowerCase().trim());
        if (!facId) continue;

        for (const batchName of row.batchNames) {
          const batchId = batchMap.get(batchName.toLowerCase().trim());
          if (!batchId) continue;

          loadRecords.push({
            faculty_id: facId,
            batch_id: batchId,
            subject: row.subject,
            day_of_week: row.day,
            start_time: row.startTime,
            end_time: row.endTime,
            start_date: row.startDate,
            end_date: row.endDate,
            room: row.room.trim() || null,
            start_mail_sent: false,
          });
        }
      }

      if (loadRecords.length > 0) {
        const { error: loadErr } = await supabase.from('faculty_loads').insert(loadRecords);
        if (loadErr) throw loadErr;
      }

      onSuccess({
        addedLoads: loadRecords.length,
        addedFaculty: addedFacultyCount,
        addedBatches: addedBatchesCount,
      });

      handleModalClose();
    } catch (err) {
      setErrorBanner(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
      setIsSubmitting(false);
    }
  };

  const isNeedsBatchesOnly = (r: ParsedRow) => !r.isValid && r.batchNames.length === 0 && r.errors.length === 1;
  const isTrueError = (r: ParsedRow) => !r.isValid && !isNeedsBatchesOnly(r);

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const needsBatchesCount = parsedRows.filter(isNeedsBatchesOnly).length;
  const errorCount = parsedRows.filter(isTrueError).length;
  const totalLoadsToGenerate = parsedRows.filter((r) => r.isValid).reduce((acc, r) => acc + r.batchNames.length, 0);

  const displayedRows = parsedRows.filter((r) => {
    if (filterView === 'valid') return r.isValid;
    if (filterView === 'needs-batches') return isNeedsBatchesOnly(r);
    if (filterView === 'errors') return isTrueError(r);
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Bulk Upload Loads via Excel / CSV
              </h2>
              <p className="text-xs text-slate-500">
                Download sample template, fill details for multiple faculties, and import with clash detection
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Banner */}
        {errorBanner && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-800">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Error</p>
              <p className="text-xs text-red-700">{errorBanner}</p>
            </div>
            <button onClick={() => setErrorBanner(null)} className="text-red-400 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 'upload' ? (
            <>
              {/* Template Download Section */}
              <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Download Sample Template with Pre-filled Examples & Dropdowns
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                    Excel (.xlsx) file comes with <strong>3 pre-filled sample rows</strong> and dynamic dropdowns for <strong>Faculty Name</strong>, <strong>Batches</strong>, and <strong>Subject</strong>.
                    <br />
                    <span className="text-blue-700 font-semibold inline-block mt-0.5">💡 Multi-Batch Selection:</span> In Excel, you can pick 1 batch or leave Batches blank. When uploaded, you can comfortably tick multiple batches per row directly on the portal using the interactive checkbox dropdown!
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const facultyList = existingFaculty.map((f) => f.name);
                      const subjectList = Array.from(new Set(existingLoads.map((l) => l.subject).filter(Boolean)));
                      const batchList = existingBatches.map((b) => b.name);
                      downloadBlankTemplate('xlsx', { facultyList, subjectList, batchList });
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-blue-300 text-blue-700 text-xs font-semibold hover:bg-blue-600 hover:text-white hover:border-transparent transition-all shadow-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 group-hover:text-white" />
                    Download Sample (.xlsx)
                  </button>
                  <button
                    onClick={() => {
                      const facultyList = existingFaculty.map((f) => f.name);
                      const subjectList = Array.from(new Set(existingLoads.map((l) => l.subject).filter(Boolean)));
                      const batchList = existingBatches.map((b) => b.name);
                      downloadBlankTemplate('csv', { facultyList, subjectList, batchList });
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-800 hover:text-white hover:border-transparent transition-all shadow-sm"
                  >
                    <FileText className="w-4 h-4 text-blue-500" />
                    Download Sample (.csv)
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
                    : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100/70 hover:border-blue-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-105 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-900 mb-1">
                  Drag and drop your spreadsheet here, or <span className="text-blue-600 underline">browse</span>
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-medium text-slate-600 shadow-2xs">
                    Multiple Batches Supported (e.g. "SSC JE 1, SSC JE 2")
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-medium text-slate-600 shadow-2xs">
                    Auto-creates Missing Faculty & Batches
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-medium text-slate-600 shadow-2xs">
                    Auto-detects Clash Conflicts
                  </span>
                </div>
              </div>

              {/* Google Sheets Link Option */}
              <div className="rounded-xl border border-slate-200 p-4 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <LinkIcon className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-semibold text-slate-800">Or Import from Public Google Sheet</h4>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleFetchGoogleSheet}
                    disabled={fetchingGoogleSheet || !googleSheetUrl.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {fetchingGoogleSheet ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      'Fetch Sheet'
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ensure the sheet is shared as "Anyone with the link can view".
                </p>
              </div>

              {/* Standard Headers Reference */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-slate-500" />
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Template Column Structure & Validation Rules
                  </h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-blue-200 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-600">Col 1</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800">Dropdown</span>
                    </div>
                    <p className="font-semibold text-slate-800 mt-1">Faculty Name</p>
                    <p className="text-[11px] text-slate-500">From active portal faculty</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400">Col 2</span>
                    <p className="font-semibold text-slate-800 mt-1">Room (optional)</p>
                    <p className="text-[11px] text-slate-500">e.g. Hall A / Room 101</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-blue-200 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-600">Col 3</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800">Dropdown</span>
                    </div>
                    <p className="font-semibold text-slate-800 mt-1">Batches</p>
                    <p className="text-[11px] text-slate-500">Pick or comma-separate</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-blue-200 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-600">Col 4</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800">Dropdown</span>
                    </div>
                    <p className="font-semibold text-slate-800 mt-1">Subject</p>
                    <p className="text-[11px] text-slate-500">From portal subjects</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400">Col 5</span>
                    <p className="font-semibold text-slate-800 mt-1">Day (optional)</p>
                    <p className="text-[11px] text-slate-500">Auto from Start Date</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400">Col 6</span>
                    <p className="font-semibold text-slate-800 mt-1">Start Time</p>
                    <p className="text-[11px] text-slate-500">HH:mm (e.g. 08:00)</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400">Col 7</span>
                    <p className="font-semibold text-slate-800 mt-1">End Time</p>
                    <p className="text-[11px] text-slate-500">HH:mm (e.g. 09:15)</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400">Col 8</span>
                    <p className="font-semibold text-slate-800 mt-1">Start Date</p>
                    <p className="text-[11px] text-slate-500">YYYY-MM-DD</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400">Col 9</span>
                    <p className="font-semibold text-slate-800 mt-1">End Date</p>
                    <p className="text-[11px] text-slate-500">YYYY-MM-DD</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Step 2: Verification / Preview Table */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      File Loaded
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 truncate max-w-md">{fileName}</h3>
                    {fileSize && <span className="text-xs text-slate-400">({fileSize})</span>}
                  </div>
                  <p className="text-xs text-slate-500">
                    Review parsed rows below. Valid entries are ready to import; invalid rows can be reviewed or skipped.
                  </p>
                </div>

                <button
                  onClick={() => setStep('upload')}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors self-start sm:self-auto"
                >
                  Choose Different File
                </button>
              </div>

              {/* Summary Badges */}
              <div className={`grid grid-cols-2 ${needsBatchesCount > 0 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-3`}>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 font-medium">Filled Rows</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{parsedRows.length}</p>
                </div>
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-emerald-700 font-medium">Valid Rows</p>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-xl font-bold text-emerald-900 mt-0.5">{validCount}</p>
                </div>
                {needsBatchesCount > 0 && (
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-300">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-amber-800 font-medium">Needs Batches</p>
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    </div>
                    <p className="text-xl font-bold text-amber-900 mt-0.5">{needsBatchesCount}</p>
                  </div>
                )}
                <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-rose-700 font-medium">Invalid Rows</p>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  </div>
                  <p className="text-xl font-bold text-rose-900 mt-0.5">{errorCount}</p>
                </div>
                <div className="p-3.5 bg-indigo-50 rounded-xl border border-indigo-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-indigo-700 font-medium">Loads to Create</p>
                    <Layers className="w-4 h-4 text-indigo-600" />
                  </div>
                  <p className="text-xl font-bold text-indigo-900 mt-0.5">{totalLoadsToGenerate}</p>
                </div>
              </div>

              {/* Needs Batches Callout Banner */}
              {needsBatchesCount > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <p>
                      <span className="font-bold">{needsBatchesCount} row{needsBatchesCount !== 1 ? 's' : ''}</span> left with blank batches. Click the <strong>"Select Batches"</strong> button in the Batches column below to check one or multiple batches!
                    </p>
                  </div>
                  {filterView !== 'needs-batches' && (
                    <button
                      type="button"
                      onClick={() => setFilterView('needs-batches')}
                      className="px-3 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold transition-colors self-start sm:self-auto shrink-0 shadow-2xs"
                    >
                      Show Needs Batches ({needsBatchesCount})
                    </button>
                  )}
                </div>
              )}

              {/* Smart Filter Info Badge */}
              {skippedCount > 0 && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-xs text-blue-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p>
                    <span className="font-semibold">Smart Filter:</span> Automatically ignored{' '}
                    <span className="font-bold">{skippedCount}</span> blank / unselected template row{skippedCount !== 1 ? 's' : ''}. Only actively filled schedule entries are processed.
                  </p>
                </div>
              )}

              {/* Filter Tabs & Checkbox Hint */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilterView('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      filterView === 'all'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    All Filled Rows ({parsedRows.length})
                  </button>
                  <button
                    onClick={() => setFilterView('valid')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      filterView === 'valid'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Valid Only ({validCount})
                  </button>
                  {needsBatchesCount > 0 && (
                    <button
                      onClick={() => setFilterView('needs-batches')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        filterView === 'needs-batches'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                      }`}
                    >
                      Needs Batches ({needsBatchesCount})
                    </button>
                  )}
                  <button
                    onClick={() => setFilterView('errors')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      filterView === 'errors'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Errors Only ({errorCount})
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-blue-800 font-medium bg-blue-50/80 border border-blue-200 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Click any row's <strong>Batches</strong> cell to tick multiple batches with checkboxes</span>
                </div>
              </div>

              {/* Table of Parsed Rows */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 text-slate-600 font-semibold sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Row</th>
                        <th className="py-2.5 px-3">Faculty</th>
                        <th className="py-2.5 px-3">Subject</th>
                        <th className="py-2.5 px-3">Batches (Click to Check)</th>
                        <th className="py-2.5 px-3">Day</th>
                        <th className="py-2.5 px-3">Time</th>
                        <th className="py-2.5 px-3">Date Range</th>
                        <th className="py-2.5 px-3">Room</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {displayedRows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            No rows match the selected filter.
                          </td>
                        </tr>
                      ) : (
                        displayedRows.map((r) => (
                          <React.Fragment key={r.rowNum}>
                            <tr
                              className={`hover:bg-slate-50 transition-colors ${
                                !r.isValid
                                  ? isNeedsBatchesOnly(r)
                                    ? 'bg-amber-50/30'
                                    : 'bg-rose-50/30'
                                  : r.clashes.length > 0
                                  ? 'bg-amber-50/30'
                                  : ''
                              }`}
                            >
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {r.isValid ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Valid
                                  </span>
                                ) : isNeedsBatchesOnly(r) ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    Needs Batches
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                                    <AlertTriangle className="w-3 h-3" />
                                    Error
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-400 font-semibold">#{r.rowNum}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                                {r.facultyName || <span className="text-rose-500 italic">Empty</span>}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                                {r.subject || <span className="text-rose-500 italic">Empty</span>}
                              </td>
                              <td className="py-2.5 px-3">
                                <RowBatchSelector
                                  selectedBatches={r.batchNames}
                                  allBatches={existingBatches}
                                  onChange={(newBatches) => handleRowBatchesChange(r.rowNum, newBatches)}
                                />
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{r.day}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                                {r.startTime} - {r.endTime}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                {r.startDate} <span className="text-slate-300">to</span> {r.endDate}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{r.room || '-'}</td>
                            </tr>
                            {/* Error / Clash Row if present */}
                            {(r.errors.length > 0 || r.clashes.length > 0) && (
                              <tr className={isNeedsBatchesOnly(r) ? 'bg-amber-50/40' : !r.isValid ? 'bg-rose-50/50' : 'bg-amber-50/50'}>
                                <td colSpan={9} className="px-3 py-1.5 border-b border-slate-100">
                                  <div className="space-y-1 text-[11px]">
                                    {isNeedsBatchesOnly(r) ? (
                                      <p className="text-amber-800 flex items-center gap-1.5 font-medium">
                                        <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <span>Batches left blank in Excel. Click <strong>"Select Batches"</strong> in the column above to check one or multiple batches.</span>
                                      </p>
                                    ) : (
                                      r.errors.map((err, ei) => (
                                        <p key={ei} className="text-rose-700 flex items-center gap-1.5 font-medium">
                                          <AlertTriangle className="w-3 h-3 shrink-0" />
                                          {err}
                                        </p>
                                      ))
                                    )}
                                    {r.clashes.map((clash, ci) => (
                                      <p key={ci} className="text-amber-800 flex items-center gap-1.5">
                                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                        <span className="font-semibold">Timing conflict detected:</span> {clash}
                                      </p>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/70">
          <button
            onClick={handleModalClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>

          {step === 'preview' && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 hidden sm:inline">
                {validCount > 0
                  ? `Ready to create ${totalLoadsToGenerate} loads across ${validCount} valid row${validCount !== 1 ? 's' : ''}`
                  : 'No valid rows to import'}
              </span>
              <button
                onClick={handleConfirmImport}
                disabled={validCount === 0 || isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Processing & Importing...
                  </>
                ) : (
                  <>
                    <span>Confirm & Import ({validCount} Rows)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
