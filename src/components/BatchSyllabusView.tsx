import { useState, useEffect, useMemo, useRef } from 'react';
import type { Faculty, Batch, FacultyLoadWithDetails } from '@/lib/supabase';
import type { AnimeTheme } from '@/lib/animeThemes';
import {
  type SyllabusSubject,
  type BatchSyllabusCardData,
  fetchAllSyllabus,
  saveSyllabusSubject,
  deleteSyllabusSubject,
  deleteBatchSyllabus,
  groupSyllabusByBatch,
  exportSyllabusToExcel,
} from '@/lib/syllabusStorage';
import {
  BookOpen,
  GraduationCap,
  Clock,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  Download,
  CheckCircle2,
  Users,
  Sparkles,
  X,
  CalendarCheck,
  BookMarked,
  Layers,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';

const COMMON_SUBJECT_SUGGESTIONS = [
  'History',
  'Polity',
  'Geography',
  'Economics',
  'Current Affairs',
  'General Science',
  'Fluid Mechanics',
  'Strength of Materials (SOM)',
  'Thermodynamics',
  'Theory of Machines',
  'Surveying',
  'Soil Mechanics',
  'Environmental Engineering',
  'Basic Electrical Engineering',
  'Power Systems',
  'Analog Electronics',
  'Reasoning & Aptitude',
  'Quantitative Aptitude',
];

/* ==================== Searchable Batch Dropdown Component ==================== */

interface SearchableBatchDropdownProps {
  batches: Batch[];
  selectedBatchId: string;
  onSelect: (batchId: string, batchName: string) => void;
  placeholder?: string;
  configuredBatchIds?: Set<string>;
  showAllOption?: boolean;
  allOptionLabel?: string;
  size?: 'sm' | 'md';
}

function SearchableBatchDropdown({
  batches,
  selectedBatchId,
  onSelect,
  placeholder = 'Select Batch...',
  configuredBatchIds,
  showAllOption = false,
  allOptionLabel = 'All Batches',
  size = 'md',
}: SearchableBatchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const selectedBatch = useMemo(() => {
    return batches.find((b) => b.id === selectedBatchId);
  }, [batches, selectedBatchId]);

  const filteredBatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return batches;
    return batches.filter((b) => (b.name || '').toLowerCase().includes(q));
  }, [batches, search]);

  const isSmall = size === 'sm';

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border transition-all text-left font-medium ${
          isSmall
            ? 'px-3 py-2 text-xs bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100'
            : 'px-3.5 py-2.5 text-xs bg-white border-slate-300 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-2xs'
        } ${isOpen ? 'border-blue-500 ring-2 ring-blue-100' : ''}`}
      >
        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
          <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          {selectedBatch ? (
            <span className="font-bold text-slate-900 truncate">
              {selectedBatch.name}
            </span>
          ) : showAllOption && selectedBatchId === 'all' ? (
            <span className="font-bold text-slate-800 truncate">
              {allOptionLabel} ({batches.length})
            </span>
          ) : (
            <span className="text-slate-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedBatchId && selectedBatchId !== 'all' && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onSelect(showAllOption ? 'all' : '', '');
              }}
              className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full min-w-[240px] max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in-up">
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to search batch..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 font-medium text-slate-800 placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
            {showAllOption && (
              <button
                type="button"
                onClick={() => {
                  onSelect('all', allOptionLabel);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                  selectedBatchId === 'all'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>{allOptionLabel}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                  {batches.length}
                </span>
              </button>
            )}

            {filteredBatches.length === 0 ? (
              <div className="py-6 px-3 text-center text-slate-400">
                <p className="text-xs font-semibold text-slate-600">Koi batch match nahi hua</p>
                <p className="text-[11px] text-slate-400 mt-0.5">"{search}" ke liye koi result nahi mila</p>
              </div>
            ) : (
              filteredBatches.map((b) => {
                const isSelected = selectedBatchId === b.id;
                const hasPlan = configuredBatchIds?.has(b.id);

                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      onSelect(b.id, b.name);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left group ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? 'text-blue-600' : 'text-slate-300 group-hover:text-slate-400'
                        }`}
                      />
                      <span className="truncate">{b.name}</span>
                    </div>

                    {hasPlan && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shrink-0">
                        Plan Added
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[10px] text-slate-400">
            <span>{filteredBatches.length} of {batches.length} batches</span>
            {search && <span className="truncate max-w-[120px]">Matches: "{search}"</span>}
          </div>
        </div>
      )}
    </div>
  );
}

interface BatchSyllabusViewProps {
  batches: Batch[];
  faculty: Faculty[];
  loads: FacultyLoadWithDetails[];
  animeTheme: AnimeTheme;
  onNavigateToAddLoad?: () => void;
}

export function BatchSyllabusView({
  batches,
  faculty,
  loads,
  animeTheme,
  onNavigateToAddLoad,
}: BatchSyllabusViewProps) {
  const [syllabusList, setSyllabusList] = useState<SyllabusSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('all');
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'hours' | 'subjects'>('name');

  // Modal States
  const [isAddBatchModalOpen, setIsAddBatchModalOpen] = useState(false);
  const [isEditSubjectModalOpen, setIsEditSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SyllabusSubject | null>(null);

  // Quick In-Card Add State
  const [activeInlineBatchId, setActiveInlineBatchId] = useState<string | null>(null);
  const [inlineForm, setInlineForm] = useState({
    subject: '',
    faculty_id: '',
    allocated_hours: 45,
    start_date: '',
    end_date: '',
    notes: '',
  });

  // Add Batch Syllabus Form Modal State (ONLY allows selecting from existing batches)
  const [newBatchForm, setNewBatchForm] = useState({
    batch_id: '',
    batch_name: '',
    subjects: [
      { subject: '', faculty_id: '', allocated_hours: 40, start_date: '', end_date: '', notes: '' },
    ],
  });

  // Load syllabus data on mount and clean any legacy mock seeds
  const loadData = async () => {
    setLoading(true);
    // Clean legacy mock items if any exist
    try {
      const local = localStorage.getItem('faculty_load_batch_syllabus_v1');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((item) => item && !String(item.id).startsWith('syl-kt-'));
          if (cleaned.length !== parsed.length) {
            localStorage.setItem('faculty_load_batch_syllabus_v1', JSON.stringify(cleaned));
          }
        }
      }
    } catch {
      // ignore
    }

    const data = await fetchAllSyllabus(batches, faculty);
    setSyllabusList(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [batches, faculty]);

  // Group syllabus items into single unified cards per batch
  const batchCards = useMemo(() => {
    return groupSyllabusByBatch(syllabusList, loads);
  }, [syllabusList, loads]);

  // Sorted list of existing batches for the select dropdown
  const sortedBatches = useMemo(() => {
    return [...batches].sort((a, b) => a.name.localeCompare(b.name));
  }, [batches]);

  // Batches that already have a syllabus card
  const configuredBatchIds = useMemo(() => {
    return new Set(batchCards.map((c) => c.batch_id));
  }, [batchCards]);

  // Filter and sort batch cards
  const filteredCards = useMemo(() => {
    return batchCards
      .filter((card) => {
        // Batch filter
        if (selectedBatchFilter !== 'all' && card.batch_id !== selectedBatchFilter) {
          return false;
        }

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchBatch = card.batch_name.toLowerCase().includes(q);
          const matchSubject = card.subjects.some((s) => s.subject.toLowerCase().includes(q));
          const matchFaculty = card.faculty_names.some((f) => f.toLowerCase().includes(q));
          if (!matchBatch && !matchSubject && !matchFaculty) return false;
        }

        // Faculty filter
        if (selectedFacultyFilter !== 'all') {
          const hasFaculty = card.subjects.some((s) => s.faculty_id === selectedFacultyFilter);
          if (!hasFaculty) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'hours') {
          return b.total_allocated_hours - a.total_allocated_hours;
        }
        if (sortBy === 'subjects') {
          return b.subjects.length - a.subjects.length;
        }
        return a.batch_name.localeCompare(b.batch_name);
      });
  }, [batchCards, searchQuery, selectedBatchFilter, selectedFacultyFilter, sortBy]);

  // Overall Metrics
  const totalBatches = batchCards.length;
  const totalSubjects = batchCards.reduce((acc, c) => acc + c.subjects.length, 0);
  const totalAllocatedHours = batchCards.reduce((acc, c) => acc + c.total_allocated_hours, 0);
  const allUniqueFaculties = Array.from(
    new Set(syllabusList.map((s) => s.faculty_name).filter(Boolean))
  );

  // Open Add Batch Modal
  const handleOpenAddBatchModal = (prefillBatchId?: string) => {
    let chosenBatch = prefillBatchId ? batches.find((b) => b.id === prefillBatchId) : undefined;
    if (!chosenBatch) {
      // Find first batch that doesn't have a syllabus yet, or first batch
      chosenBatch = sortedBatches.find((b) => !configuredBatchIds.has(b.id)) || sortedBatches[0];
    }

    setNewBatchForm({
      batch_id: chosenBatch ? chosenBatch.id : '',
      batch_name: chosenBatch ? chosenBatch.name : '',
      subjects: [
        {
          subject: '',
          faculty_id: faculty[0]?.id || '',
          allocated_hours: 45,
          start_date: '',
          end_date: '',
          notes: '',
        },
      ],
    });
    setIsAddBatchModalOpen(true);
  };

  const handleAddSubjectRowToNewBatch = () => {
    setNewBatchForm((prev) => ({
      ...prev,
      subjects: [
        ...prev.subjects,
        { subject: '', faculty_id: faculty[0]?.id || '', allocated_hours: 45, start_date: '', end_date: '', notes: '' },
      ],
    }));
  };

  const handleRemoveSubjectRowFromNewBatch = (index: number) => {
    setNewBatchForm((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((_, idx) => idx !== index),
    }));
  };

  const handleSaveNewBatchSyllabus = async () => {
    if (!newBatchForm.batch_id) {
      alert('Kripya list me se koi ek batch select karein.');
      return;
    }

    const selectedBatch = batches.find((b) => b.id === newBatchForm.batch_id);
    const resolvedBatchName = selectedBatch ? selectedBatch.name : newBatchForm.batch_name;

    const validSubjects = newBatchForm.subjects.filter((s) => s.subject.trim() && s.faculty_id);
    if (validSubjects.length === 0) {
      alert('Kam se kam 1 subject name aur assigned faculty select karein.');
      return;
    }

    // Save each subject to storage
    for (const sub of validSubjects) {
      const fac = faculty.find((f) => f.id === sub.faculty_id);
      await saveSyllabusSubject({
        batch_id: newBatchForm.batch_id,
        batch_name: resolvedBatchName,
        subject: sub.subject.trim(),
        faculty_id: sub.faculty_id,
        faculty_name: fac ? fac.name : 'Faculty Member',
        allocated_hours: Number(sub.allocated_hours) || 40,
        start_date: sub.start_date || undefined,
        end_date: sub.end_date || undefined,
        notes: sub.notes.trim(),
        status: 'in_progress',
      });
    }

    await loadData();
    setIsAddBatchModalOpen(false);
  };

  // Quick inline add on a specific batch card
  const handleSaveInlineSubject = async (batchId: string, batchName: string) => {
    if (!inlineForm.subject.trim()) {
      alert('Kripya subject name enter karein.');
      return;
    }
    const resolvedFacultyId = inlineForm.faculty_id || faculty[0]?.id;
    if (!resolvedFacultyId) {
      alert('Kripya assigned faculty select karein.');
      return;
    }
    const fac = faculty.find((f) => f.id === resolvedFacultyId);

    await saveSyllabusSubject({
      batch_id: batchId,
      batch_name: batchName,
      subject: inlineForm.subject.trim(),
      faculty_id: resolvedFacultyId,
      faculty_name: fac ? fac.name : 'Faculty Member',
      allocated_hours: Number(inlineForm.allocated_hours) || 40,
      start_date: inlineForm.start_date || undefined,
      end_date: inlineForm.end_date || undefined,
      notes: inlineForm.notes.trim(),
      status: 'in_progress',
    });

    setInlineForm({ subject: '', faculty_id: '', allocated_hours: 45, start_date: '', end_date: '', notes: '' });
    setActiveInlineBatchId(null);
    await loadData();
  };

  const handleEditSubject = (item: SyllabusSubject) => {
    setEditingSubject(item);
    setIsEditSubjectModalOpen(true);
  };

  const handleSaveEditedSubject = async () => {
    if (!editingSubject) return;
    const fac = faculty.find((f) => f.id === editingSubject.faculty_id);

    await saveSyllabusSubject({
      id: editingSubject.id,
      batch_id: editingSubject.batch_id,
      batch_name: editingSubject.batch_name,
      subject: editingSubject.subject.trim(),
      faculty_id: editingSubject.faculty_id,
      faculty_name: fac ? fac.name : editingSubject.faculty_name,
      allocated_hours: Number(editingSubject.allocated_hours) || 40,
      start_date: editingSubject.start_date || undefined,
      end_date: editingSubject.end_date || undefined,
      notes: editingSubject.notes || '',
      status: editingSubject.status,
    });

    setIsEditSubjectModalOpen(false);
    setEditingSubject(null);
    await loadData();
  };

  const formatDateSpan = (startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) return null;
    const formatPill = (d: string) => {
      try {
        const [y, m, day] = d.split('-');
        if (!y || !m || !day) return d;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mName = months[parseInt(m, 10) - 1] || m;
        return `${parseInt(day, 10)} ${mName} ${y}`;
      } catch {
        return d;
      }
    };

    if (startDate && endDate) {
      return `${formatPill(startDate)} → ${formatPill(endDate)}`;
    }
    if (startDate) return `From ${formatPill(startDate)}`;
    return `Till ${formatPill(endDate!)}`;
  };

  const handleDeleteSubject = async (id: string, subjectName: string) => {
    if (confirm(`Kya aap "${subjectName}" ko is batch syllabus se hatana chahte hain?`)) {
      await deleteSyllabusSubject(id);
      await loadData();
    }
  };

  const handleDeleteBatch = async (batchId: string, batchName: string) => {
    if (confirm(`Kya aap "${batchName}" ka pura syllabus card delete karna chahte hain?`)) {
      await deleteBatchSyllabus(batchId);
      await loadData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Planner
            </h1>
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${animeTheme.primaryColor}18`,
                color: animeTheme.primaryColor,
              }}
            >
              1 Card Per Batch
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Apne pehle se add kiye huye batches ko select karein aur unke subjects, assigned faculty, hours aur dates ek hi single card mein plan karein.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {batchCards.length > 0 && (
            <button
              onClick={() => exportSyllabusToExcel(filteredCards, 'Batch_Planner.xlsx')}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all active:scale-95"
              title="Download formatted Excel planner report"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Export to Excel</span>
            </button>
          )}

          <button
            onClick={() => handleOpenAddBatchModal()}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all ${animeTheme.primaryButtonClass}`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Planner</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold">Configured Batches</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{totalBatches}</p>
          <span className="text-[11px] text-slate-400 font-mono">Batches in planner</span>
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <BookOpen className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-semibold">Total Subjects</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{totalSubjects}</p>
          <span className="text-[11px] text-slate-400 font-mono">Mapped subjects</span>
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold">Total Syllabus Hours</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{totalAllocatedHours} hrs</p>
          <span className="text-[11px] text-slate-400 font-mono">Planned teaching hours</span>
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <GraduationCap className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold">Assigned Faculties</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{allUniqueFaculties.length}</p>
          <span className="text-[11px] text-slate-400 font-mono">Active teachers in syllabus</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {batchCards.length > 0 && (
        <div className="bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject or faculty..."
                className="w-full pl-10 pr-9 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-900 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Batch Search Dropdown */}
            <div className="w-full sm:w-64 shrink-0">
              <SearchableBatchDropdown
                batches={sortedBatches}
                selectedBatchId={selectedBatchFilter}
                onSelect={(bId) => setSelectedBatchFilter(bId || 'all')}
                showAllOption={true}
                allOptionLabel="All Batches"
                placeholder="Search / Filter Batch..."
                configuredBatchIds={configuredBatchIds}
                size="sm"
              />
            </div>

            {/* Faculty Filter */}
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={selectedFacultyFilter}
                onChange={(e) => setSelectedFacultyFilter(e.target.value)}
                className="text-xs py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold focus:outline-none focus:border-blue-400"
              >
                <option value="all">All Faculties ({faculty.length})</option>
                {faculty.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.department || 'AE/JE'})
                  </option>
                ))}
              </select>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold focus:outline-none focus:border-blue-400"
              >
                <option value="name">Sort: Batch Name (A-Z)</option>
                <option value="hours">Sort: Total Hours (High to Low)</option>
                <option value="subjects">Sort: Subject Count</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {(selectedBatchFilter !== 'all' || selectedFacultyFilter !== 'all' || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Filters:</span>
              {selectedBatchFilter !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200">
                  <Layers className="w-3 h-3 text-blue-600" />
                  Batch: {batches.find((b) => b.id === selectedBatchFilter)?.name || selectedBatchFilter}
                  <button
                    type="button"
                    onClick={() => setSelectedBatchFilter('all')}
                    className="hover:text-blue-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedFacultyFilter !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  <GraduationCap className="w-3 h-3 text-emerald-600" />
                  Faculty: {faculty.find((f) => f.id === selectedFacultyFilter)?.name || selectedFacultyFilter}
                  <button
                    type="button"
                    onClick={() => setSelectedFacultyFilter('all')}
                    className="hover:text-emerald-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                  Query: "{searchQuery}"
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="hover:text-slate-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedBatchFilter('all');
                  setSelectedFacultyFilter('all');
                  setSearchQuery('');
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-red-600 underline ml-auto"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Content: Single Unified Card per Batch */}
      {batchCards.length === 0 ? (
        /* Clean Empty State when no syllabus has been created yet */
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-10 sm:p-14 text-center border-2 border-dashed border-slate-200 shadow-xs max-w-3xl mx-auto">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white shadow-md"
            style={{ backgroundColor: animeTheme.primaryColor }}
          >
            <BookMarked className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-black text-slate-900 tracking-tight">
            Koi Batch Plan Add Nahi Hai
          </h3>
          <p className="text-xs text-slate-600 max-w-lg mx-auto mt-2 leading-relaxed">
            Aapne pehle jo batches add kiye hain ({batches.length} batches available), unme se kisi bhi batch ko select karke uska subjects, assigned faculty, hours aur dates set karein. Har batch ka pura plan ek single unified card mein dikhega.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => handleOpenAddBatchModal()}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all ${animeTheme.primaryButtonClass}`}
            >
              <Plus className="w-4 h-4" />
              <span>Select Batch & Add Plan</span>
            </button>
          </div>

          {/* Quick picker from existing batches */}
          {sortedBatches.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-100 text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                Quick Select From Your Batches ({sortedBatches.length} Batches Added):
              </p>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                {sortedBatches.slice(0, 12).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleOpenAddBatchModal(b.id)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 font-medium transition-all flex items-center gap-1.5 group"
                  >
                    <span>{b.name}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-10 text-center border border-dashed border-slate-300">
          <BookMarked className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No Batches Match Your Search</h3>
          <p className="text-xs text-slate-500 mt-1">"{searchQuery}" se match karta koi batch ya subject nahi mila.</p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-3 text-xs font-bold text-blue-600 hover:underline"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCards.map((card) => {
            const isInlineActive = activeInlineBatchId === card.batch_id;

            // Progress percentage between scheduled hours and allocated hours
            const progressPercent = card.total_allocated_hours > 0
              ? Math.min(100, Math.round((card.total_scheduled_hours / card.total_allocated_hours) * 100))
              : 0;

            return (
              <div
                key={card.batch_id}
                className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 hover:border-slate-300 transition-all duration-300 shadow-xs hover:shadow-md"
              >
                {/* 1 SINGLE UNIFIED CARD HEADER */}
                <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3.5 rounded-t-2xl bg-gradient-to-r from-slate-50/70 via-white to-white">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs text-white"
                      style={{
                        background: `linear-gradient(135deg, ${animeTheme.primaryColor}, ${animeTheme.secondaryColor})`,
                      }}
                    >
                      <BookOpen className="w-5 h-5" />
                    </div>

                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                        {card.batch_name}
                      </h2>

                      {/* Header Sub-pills: Subjects Count, Total Hours, Faculties */}
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-600">
                        <span className="font-semibold px-2 py-0.5 bg-slate-100 rounded-md text-slate-700">
                          📚 {card.subjects.length} Subjects
                        </span>
                        <span className="font-bold px-2 py-0.5 bg-amber-50 rounded-md text-amber-800 border border-amber-200">
                          ⏱️ {card.total_allocated_hours} hrs Total Syllabus
                        </span>
                        <span className="font-semibold px-2 py-0.5 bg-blue-50 rounded-md text-blue-700 border border-blue-200">
                          👨‍🏫 {card.unique_faculties_count} Assigned Faculty
                        </span>

                        {card.total_scheduled_hours > 0 && (
                          <span className="font-semibold px-2 py-0.5 bg-emerald-50 rounded-md text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CalendarCheck className="w-3.5 h-3.5" />
                            {card.total_scheduled_hours} hrs in timetable ({progressPercent}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top Right Card Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                    <button
                      onClick={() => {
                        setActiveInlineBatchId(isInlineActive ? null : card.batch_id);
                        setInlineForm({
                          subject: '',
                          faculty_id: faculty[0]?.id || '',
                          allocated_hours: 45,
                          notes: '',
                        });
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isInlineActive
                          ? 'bg-slate-800 text-white'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                      title="Add a subject directly to this batch"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isInlineActive ? 'Close Form' : 'Add Subject'}</span>
                    </button>

                    <button
                      onClick={() => exportSyllabusToExcel([card], `${card.batch_name.replace(/\s+/g, '_')}_Syllabus.xlsx`)}
                      className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-200"
                      title="Export this batch syllabus to Excel"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteBatch(card.batch_id, card.batch_name)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all border border-transparent hover:border-red-200"
                      title="Delete entire syllabus for this batch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Ribbon */}
                {card.total_scheduled_hours > 0 && (
                  <div className="w-full bg-slate-100 h-1.5">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.max(5, progressPercent)}%` }}
                      title={`${progressPercent}% of syllabus hours scheduled in timetable`}
                    />
                  </div>
                )}

                {/* SINGLE CARD BODY: LIST OF SUBJECTS, ASSIGNED FACULTY & ALLOCATED HOURS */}
                <div className="p-4 sm:p-5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/70 text-[11px] font-black uppercase tracking-wider text-slate-500">
                          <th className="py-2.5 px-3">Subject Name</th>
                          <th className="py-2.5 px-3">Assigned Faculty</th>
                          <th className="py-2.5 px-3 text-center">Allocated Hours</th>
                          <th className="py-2.5 px-3">Date Duration (Start - End)</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {card.subjects.map((sub, sIdx) => {
                          const statusColor =
                            sub.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : sub.status === 'in_progress'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200';

                          return (
                            <tr
                              key={sub.id}
                              className="group hover:bg-slate-50/80 transition-colors"
                            >
                              {/* Subject Column */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                                    {sIdx + 1}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                      {sub.subject}
                                    </p>
                                    {sub.notes && (
                                      <p className="text-[11px] text-slate-500 font-normal line-clamp-1 mt-0.5">
                                        {sub.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Faculty Column */}
                              <td className="py-3 px-3">
                                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80">
                                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                                    {sub.faculty_name.charAt(0)}
                                  </div>
                                  <span className="font-bold text-slate-800">
                                    {sub.faculty_name}
                                  </span>
                                </div>
                              </td>

                              {/* Allocated Hours Column */}
                              <td className="py-3 px-3 text-center">
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>{sub.allocated_hours} hrs</span>
                                </span>
                              </td>

                              {/* Date Duration (Start - End) Column */}
                              <td className="py-3 px-3">
                                {sub.start_date || sub.end_date ? (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50/70 border border-amber-200/80 text-amber-950 font-bold text-[11px] shadow-2xs whitespace-nowrap">
                                    <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>{formatDateSpan(sub.start_date, sub.end_date)}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px] italic">Dates not set</span>
                                )}
                              </td>

                              {/* Status Column */}
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusColor}`}
                                >
                                  {sub.status === 'completed'
                                    ? 'Completed'
                                    : sub.status === 'in_progress'
                                    ? 'In Progress'
                                    : 'Planned'}
                                </span>
                              </td>

                              {/* Actions Column */}
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                                  <button
                                    onClick={() => handleEditSubject(sub)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                    title="Edit Subject, Faculty or Hours"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSubject(sub.id, sub.subject)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                    title="Delete this subject"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* INLINE QUICK ADD ROW (Inside the single card) */}
                  {isInlineActive && (
                    <div className="mt-4 p-4 rounded-xl bg-slate-50/90 border border-slate-200 animate-fade-in-up space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-emerald-600" />
                          Add Subject to {card.batch_name}
                        </span>
                        <button
                          onClick={() => setActiveInlineBatchId(null)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                        <div className="sm:col-span-1">
                          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                            Subject Name *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. History, SOM, FM"
                            value={inlineForm.subject}
                            onChange={(e) => setInlineForm({ ...inlineForm, subject: e.target.value })}
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
                          />
                        </div>

                        <div className="sm:col-span-1">
                          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                            Assigned Faculty *
                          </label>
                          <select
                            value={inlineForm.faculty_id || faculty[0]?.id}
                            onChange={(e) => setInlineForm({ ...inlineForm, faculty_id: e.target.value })}
                            className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
                          >
                            {faculty.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name} ({f.department || 'AE/JE'})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-1">
                          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                            Allocated Hours *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="300"
                            value={inlineForm.allocated_hours}
                            onChange={(e) => setInlineForm({ ...inlineForm, allocated_hours: Number(e.target.value) })}
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white font-bold"
                          />
                        </div>

                        <div className="sm:col-span-1">
                          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                            Dates (Start → End)
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              title="Start Date (Kis date se)"
                              value={inlineForm.start_date}
                              onChange={(e) => setInlineForm({ ...inlineForm, start_date: e.target.value })}
                              className="w-1/2 text-[11px] px-1.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
                            />
                            <span className="text-slate-400 text-xs">→</span>
                            <input
                              type="date"
                              title="End Date (Kis date tak)"
                              value={inlineForm.end_date}
                              onChange={(e) => setInlineForm({ ...inlineForm, end_date: e.target.value })}
                              className="w-1/2 text-[11px] px-1.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-1 flex items-end">
                          <button
                            onClick={() => handleSaveInlineSubject(card.batch_id, card.batch_name)}
                            className={`w-full py-2 px-3 rounded-lg text-xs font-bold shadow-xs hover:scale-102 active:scale-98 transition-all ${animeTheme.primaryButtonClass}`}
                          >
                            + Add to Card
                          </button>
                        </div>
                      </div>

                      {/* Quick subject suggestion chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Quick picks:</span>
                        {COMMON_SUBJECT_SUGGESTIONS.slice(0, 6).map((sugg) => (
                          <button
                            key={sugg}
                            type="button"
                            onClick={() => setInlineForm({ ...inlineForm, subject: sugg })}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                          >
                            + {sugg}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Single Card Footer */}
                  {!isInlineActive && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          Total Syllabus: <strong className="text-slate-800">{card.total_allocated_hours} hrs</strong>
                        </span>
                        <span>•</span>
                        <span className="font-medium">
                          Faculties: <strong className="text-slate-800">{card.faculty_names.join(', ')}</strong>
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setActiveInlineBatchId(card.batch_id);
                          setInlineForm({
                            subject: '',
                            faculty_id: faculty[0]?.id || '',
                            allocated_hours: 45,
                            notes: '',
                          });
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Another Subject</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: ADD BATCH SYLLABUS (ONLY SELECT FROM EXISTING BATCHES) */}
      {isAddBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-scale-up">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
                  style={{ backgroundColor: animeTheme.primaryColor }}
                >
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Add Batch Plan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dropdown se apna batch select karein aur uske subjects, faculty, hours aur dates assign karein.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAddBatchModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Step 1: Select Batch (SEARCHABLE BATCH DROPDOWN) */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5 flex items-center justify-between">
                  <span>1. Select Batch (Searchable Dropdown from your added batches) *</span>
                  <span className="text-[11px] text-blue-600 font-semibold">
                    {sortedBatches.length} batches available
                  </span>
                </label>
                <SearchableBatchDropdown
                  batches={sortedBatches}
                  selectedBatchId={newBatchForm.batch_id}
                  onSelect={(bId, bName) => {
                    setNewBatchForm({
                      ...newBatchForm,
                      batch_id: bId,
                      batch_name: bName,
                    });
                  }}
                  placeholder="-- Click or type to search batch --"
                  configuredBatchIds={configuredBatchIds}
                  size="md"
                />
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  * Sirf wahi batches aayenge jo aapne portal mein pehle se add kiye huye hain. Aap type karke turant search kar sakte hain.
                </p>
              </div>

              {/* Step 2: Define Subjects, Faculty & Hours */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    2. Subjects, Faculty & Hours for this Batch ({newBatchForm.subjects.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSubjectRowToNewBatch}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Another Subject</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {newBatchForm.subjects.map((sub, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 relative group space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase text-slate-500">
                          Subject #{idx + 1}
                        </span>
                        {newBatchForm.subjects.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSubjectRowFromNewBatch(idx)}
                            className="text-slate-400 hover:text-red-600 transition-colors"
                            title="Remove this subject"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Subject Name */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            Subject Name *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. History, Polity, Fluid Mechanics"
                            value={sub.subject}
                            onChange={(e) => {
                              const updated = [...newBatchForm.subjects];
                              updated[idx].subject = e.target.value;
                              setNewBatchForm({ ...newBatchForm, subjects: updated });
                            }}
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white font-medium"
                          />
                        </div>

                        {/* Assigned Faculty */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            Assigned Faculty *
                          </label>
                          <select
                            value={sub.faculty_id}
                            onChange={(e) => {
                              const updated = [...newBatchForm.subjects];
                              updated[idx].faculty_id = e.target.value;
                              setNewBatchForm({ ...newBatchForm, subjects: updated });
                            }}
                            className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white font-medium"
                          >
                            <option value="">-- Choose Faculty --</option>
                            {faculty.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name} ({f.department || 'AE/JE'})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Allocated Hours */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            Total Hours *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="300"
                            value={sub.allocated_hours}
                            onChange={(e) => {
                              const updated = [...newBatchForm.subjects];
                              updated[idx].allocated_hours = Number(e.target.value);
                              setNewBatchForm({ ...newBatchForm, subjects: updated });
                            }}
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white font-bold"
                          />
                        </div>
                      </div>

                      {/* Date Duration: Start Date to End Date */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-600" />
                            Start Date (Kis date se shuru hogi)
                          </label>
                          <input
                            type="date"
                            value={sub.start_date || ''}
                            onChange={(e) => {
                              const updated = [...newBatchForm.subjects];
                              updated[idx].start_date = e.target.value;
                              setNewBatchForm({ ...newBatchForm, subjects: updated });
                            }}
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white font-medium"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-600" />
                            End Date (Kis date tak chalegi)
                          </label>
                          <input
                            type="date"
                            value={sub.end_date || ''}
                            onChange={(e) => {
                              const updated = [...newBatchForm.subjects];
                              updated[idx].end_date = e.target.value;
                              setNewBatchForm({ ...newBatchForm, subjects: updated });
                            }}
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white font-medium"
                          />
                        </div>
                      </div>

                      {/* Optional Notes */}
                      <div>
                        <input
                          type="text"
                          placeholder="Optional remarks: e.g. Theory + PYQs + Revision"
                          value={sub.notes}
                          onChange={(e) => {
                            const updated = [...newBatchForm.subjects];
                            updated[idx].notes = e.target.value;
                            setNewBatchForm({ ...newBatchForm, subjects: updated });
                          }}
                          className="w-full text-[11px] px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 bg-white text-slate-600"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Subject Suggestions */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Quick picks:</span>
                  {COMMON_SUBJECT_SUGGESTIONS.slice(0, 8).map((sugg) => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => {
                        const lastIndex = newBatchForm.subjects.length - 1;
                        if (!newBatchForm.subjects[lastIndex].subject) {
                          const updated = [...newBatchForm.subjects];
                          updated[lastIndex].subject = sugg;
                          setNewBatchForm({ ...newBatchForm, subjects: updated });
                        } else {
                          setNewBatchForm({
                            ...newBatchForm,
                            subjects: [
                              ...newBatchForm.subjects,
                              { subject: sugg, faculty_id: faculty[0]?.id || '', allocated_hours: 45, notes: '' },
                            ],
                          });
                        }
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-600 transition-colors text-slate-600"
                    >
                      + {sugg}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 rounded-b-3xl flex items-center justify-end gap-3 sticky bottom-0">
              <button
                type="button"
                onClick={() => setIsAddBatchModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewBatchSyllabus}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all ${animeTheme.primaryButtonClass}`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Batch Plan Card</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT SUBJECT MODAL */}
      {isEditSubjectModalOpen && editingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 animate-scale-up">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Edit Subject Plan</h3>
                <p className="text-xs text-slate-500">{editingSubject.batch_name}</p>
              </div>
              <button
                onClick={() => {
                  setIsEditSubjectModalOpen(false);
                  setEditingSubject(null);
                }}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  value={editingSubject.subject}
                  onChange={(e) =>
                    setEditingSubject({ ...editingSubject, subject: e.target.value })
                  }
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                  Assigned Faculty *
                </label>
                <select
                  value={editingSubject.faculty_id}
                  onChange={(e) => {
                    const fId = e.target.value;
                    const f = faculty.find((item) => item.id === fId);
                    setEditingSubject({
                      ...editingSubject,
                      faculty_id: fId,
                      faculty_name: f ? f.name : editingSubject.faculty_name,
                    });
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 font-semibold bg-white"
                >
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.department || 'AE/JE'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Allocated Hours *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={editingSubject.allocated_hours}
                    onChange={(e) =>
                      setEditingSubject({
                        ...editingSubject,
                        allocated_hours: Number(e.target.value),
                      })
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Status
                  </label>
                  <select
                    value={editingSubject.status}
                    onChange={(e) =>
                      setEditingSubject({
                        ...editingSubject,
                        status: e.target.value as any,
                      })
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 font-semibold bg-white"
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="planned">Planned</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    Start Date (Kis date se)
                  </label>
                  <input
                    type="date"
                    value={editingSubject.start_date || ''}
                    onChange={(e) =>
                      setEditingSubject({
                        ...editingSubject,
                        start_date: e.target.value,
                      })
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 font-semibold bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    End Date (Kis date tak)
                  </label>
                  <input
                    type="date"
                    value={editingSubject.end_date || ''}
                    onChange={(e) =>
                      setEditingSubject({
                        ...editingSubject,
                        end_date: e.target.value,
                      })
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 font-semibold bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                  Notes & Remarks
                </label>
                <textarea
                  rows={2}
                  value={editingSubject.notes || ''}
                  onChange={(e) =>
                    setEditingSubject({ ...editingSubject, notes: e.target.value })
                  }
                  placeholder="e.g. Theory complete, revision classes pending"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5 rounded-b-3xl">
              <button
                type="button"
                onClick={() => {
                  setIsEditSubjectModalOpen(false);
                  setEditingSubject(null);
                }}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditedSubject}
                className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs ${animeTheme.primaryButtonClass}`}
              >
                Update Subject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
