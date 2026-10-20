import { useState, useEffect, useCallback, useMemo, useRef, Component, type ReactNode, type ErrorInfo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Faculty, Batch, FacultyLoadWithDetails, MailTrackerGroup, LoadBatchManager, ExtraClassWithDetails, RescheduledClassWithDetails, CancelledClassWithDetails } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { ExtraRescheduleView } from '@/components/ExtraReschedule';
import { FacultyAvailabilityView } from '@/components/FacultyAvailabilityView';
import { BatchSyllabusView } from '@/components/BatchSyllabusView';
import { AnimeMascot, AnimeSectionHeader } from '@/components/AnimeMascot';
import animeBackground from '@/components/12161.gif';
import sittingAnimeGirl from '@/assets/sitting-anime-girl.gif';
import { BulkUploadModal } from '@/components/BulkUploadModal';
import { downloadSampleTemplate } from '@/lib/templateUtils';
import { AnimeThemeSelectorModal } from '@/components/AnimeThemeSelectorModal';
import { AnimeCharacterSVG } from '@/components/AnimeCharacterSVG';
import { ANIME_THEMES, type AnimeThemeId, type AnimeTheme } from '@/lib/animeThemes';
import { AIAssistant } from '@/components/AIAssistant';

import {
  GraduationCap,
  Users,
  UserCheck,
  CalendarClock,
  CalendarPlus,
  RefreshCw,
  Search,
  AlertTriangle,
  Plus,
  Trash2,
  Clock,
  X,
  CheckCircle2,
  Building2,
  BookOpen,
  Layers,
  Upload,
  FileText,
  FileSpreadsheet,
  Bell,
  Pencil,
  ChevronDown,
  Link as LinkIcon,
  Menu,
  Filter,
  Mail,
  MailCheck,
  Download,
  Save,
  Zap,
  Sparkles,
  Palette,
} from 'lucide-react';

type Tab = 'dashboard' | 'faculty' | 'batches' | 'addLoad' | 'search' | 'facultyAvailability' | 'batchSyllabus' | 'clashes' | 'alerts' | 'mailTracker' | 'extraReschedule';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class TabErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Tab crash caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50/90 border border-red-200 rounded-2xl text-center space-y-4 max-w-lg mx-auto mt-6 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
            ⚠️
          </div>
          <h3 className="text-lg font-bold text-red-900">
            {this.props.fallbackTitle || "Something went wrong loading this section"}
          </h3>
          <p className="text-sm text-red-600 font-mono text-left bg-white p-3 rounded-lg border border-red-200 overflow-auto max-h-36">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [animeThemeId, setAnimeThemeId] = useState<AnimeThemeId>(() => {
    const saved = localStorage.getItem('animeThemeId') as AnimeThemeId;
    return saved && ANIME_THEMES[saved] ? saved : 'naruto';
  });
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const animeTheme = ANIME_THEMES[animeThemeId] || ANIME_THEMES.naruto;

  const handleSelectAnimeTheme = (themeId: AnimeThemeId) => {
    setAnimeThemeId(themeId);
    localStorage.setItem('animeThemeId', themeId);
    window.dispatchEvent(new Event('anime-theme-change'));
  };

  const cycleAnimeTheme = () => {
    const themeKeys = Object.keys(ANIME_THEMES) as AnimeThemeId[];
    const currentIndex = themeKeys.indexOf(animeThemeId);
    const nextThemeId = themeKeys[(currentIndex + 1) % themeKeys.length];
    handleSelectAnimeTheme(nextThemeId);
  };

  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loads, setLoads] = useState<FacultyLoadWithDetails[]>([]);
  const [batchManagers, setBatchManagers] = useState<LoadBatchManager[]>([]);
  const [extraClasses, setExtraClasses] = useState<ExtraClassWithDetails[]>([]);
  const [rescheduledClasses, setRescheduledClasses] = useState<RescheduledClassWithDetails[]>([]);
  const [cancelledClasses, setCancelledClasses] = useState<CancelledClassWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [toast, setToast] = useState<{ title: string; desc: string; type: 'success' | 'error' } | null>(null);

  const handleBulkSuccess = (summary: { addedLoads: number; addedFaculty: number; addedBatches: number }) => {
    fetchAll();
    const parts = [`Added ${summary.addedLoads} load entries.`];
    if (summary.addedFaculty > 0) parts.push(`${summary.addedFaculty} new faculties created.`);
    if (summary.addedBatches > 0) parts.push(`${summary.addedBatches} new batches created.`);
    setToast({
      title: 'Bulk Upload Successful!',
      desc: parts.join(' '),
      type: 'success',
    });
    setTimeout(() => setToast(null), 7000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [facRes, batchRes, loadRes, bmRes, ecRes, rcRes, ccRes] = await Promise.all([
      supabase.from('faculty').select('*').order('name'),
      supabase.from('batches').select('*').order('name'),
      supabase
        .from('faculty_loads')
        .select('*, faculty:faculty_id(name, department, branch), batch:batch_id(name)')
        .order('created_at', { ascending: false }),
      supabase.from('load_batch_managers').select('*').order('start_date', { ascending: true }),
      supabase
        .from('extra_classes')
        .select('*, faculty:faculty_id(name, department, branch), batch:batch_id(name)')
        .order('date', { ascending: false }),
      supabase
        .from('rescheduled_classes')
        .select('*, faculty:faculty_id(name, department, branch), batch:batch_id(name)')
        .order('new_date', { ascending: false }),
      supabase
        .from('cancelled_classes')
        .select('*, faculty:faculty_id(name, department, branch), batch:batch_id(name)')
        .order('date', { ascending: false }),
    ]);

    if (facRes.data) setFaculty(facRes.data as Faculty[]);
    if (batchRes.data) setBatches(batchRes.data as Batch[]);
    if (loadRes.data) setLoads(loadRes.data as unknown as FacultyLoadWithDetails[]);
    if (bmRes.data) setBatchManagers(bmRes.data as LoadBatchManager[]);
    if (ecRes.data) setExtraClasses(ecRes.data as unknown as ExtraClassWithDetails[]);
    if (rcRes.data) setRescheduledClasses(rcRes.data as unknown as RescheduledClassWithDetails[]);
    if (ccRes.data) setCancelledClasses(ccRes.data as unknown as CancelledClassWithDetails[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const clashes = detectClashes(loads);
  const alerts = detectDateAlerts(loads);
  const mailGroups = groupMailTracker(loads);
  const mailedCount = mailGroups.filter(g => g.allMailed).length;
  const pendingMailCount = mailGroups.filter(g => !g.allMailed).length;

  const navItems: { id: Tab; label: string; icon: typeof GraduationCap; mascotColor: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers, mascotColor: 'blue' },
    { id: 'addLoad', label: 'Add Load', icon: Plus, mascotColor: 'emerald' },
    { id: 'search', label: 'Faculty Load Search', icon: Search, mascotColor: 'cyan' },
    { id: 'facultyAvailability', label: 'Faculty Free Slots', icon: UserCheck, mascotColor: 'cyan' },
    { id: 'batchSyllabus', label: 'Planner', icon: BookOpen, mascotColor: 'amber' },
    { id: 'clashes', label: 'Clash Alerts', icon: AlertTriangle, mascotColor: 'red' },
    { id: 'alerts', label: 'Date Alerts', icon: Bell, mascotColor: 'amber' },
    { id: 'mailTracker', label: 'Mail Tracker', icon: Mail, mascotColor: 'blue' },
    { id: 'extraReschedule', label: 'Extra & Reschedule', icon: CalendarPlus, mascotColor: 'emerald' },
    { id: 'faculty', label: 'Faculty', icon: GraduationCap, mascotColor: 'blue' },
    { id: 'batches', label: 'Batches', icon: Users, mascotColor: 'cyan' },
  ];

  const navigate = (tab: Tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const sidebarContent = (
    <div
      className="relative flex flex-col h-full overflow-hidden bg-white/80"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.9) 52%, ${animeTheme.primaryColor}15 100%), url(${animeBackground})`,
        backgroundPosition: 'center, bottom center',
        backgroundSize: 'cover, 100% auto',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200/60 bg-gradient-to-r from-white via-slate-50 to-white">
        <div
          className="relative w-11 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md overflow-hidden cursor-pointer hover:scale-105 transition-transform"
          onClick={() => setThemeModalOpen(true)}
          style={{
            background: `linear-gradient(135deg, ${animeTheme.primaryColor}33, ${animeTheme.secondaryColor}44)`,
            border: `1px solid ${animeTheme.primaryColor}66`,
          }}
          title="Click to Switch Anime Theme"
        >
          <AnimeCharacterSVG themeId={animeThemeId} size={38} showAura={false} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-black uppercase tracking-wider truncate px-1.5 py-0.5 rounded"
              style={{
                color: animeTheme.primaryColor,
                backgroundColor: `${animeTheme.primaryColor}18`,
              }}
            >
              {animeTheme.colorEmoji} {animeTheme.colorName} Theme
            </span>
          </div>
          <h1 className="text-sm font-bold leading-tight truncate anime-title anime-title-glow">
            Faculty Load Portal
          </h1>
          <p className="text-[11px] text-slate-500 leading-tight truncate font-mono">
            {animeTheme.characterName}
          </p>
        </div>
        <button
          onClick={() => setThemeModalOpen(true)}
          title={`Anime Theme: ${animeTheme.name} (${animeTheme.colorName}) - Click to switch`}
          className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:scale-110 shadow-xs transition-all flex items-center justify-center shrink-0"
          style={{ color: animeTheme.primaryColor }}
        >
          <Sparkles className="w-4 h-4 animate-sparkle" style={{ color: animeTheme.primaryColor }} />
        </button>
      </div>

      <nav className="flex-1 px-3 pt-6 pb-4 space-y-1 overflow-y-auto">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const mc = item.mascotColor;
          const iconGradient = mc === 'blue' ? 'from-blue-400 to-blue-600' : mc === 'emerald' ? 'from-emerald-400 to-emerald-600' : mc === 'cyan' ? 'from-cyan-400 to-cyan-600' : mc === 'red' ? 'from-red-400 to-red-600' : mc === 'amber' ? 'from-amber-400 to-amber-600' : 'from-blue-400 to-blue-600';
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              style={{ animationDelay: `${idx * 40}ms` }}
              className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 animate-slide-in ${
                isActive
                  ? `${animeTheme.activeNavGradient}`
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className={`relative w-8 h-8 rounded-lg bg-gradient-to-br ${iconGradient} flex items-center justify-center shrink-0 transition-all duration-300 ${isActive ? 'scale-110 shadow-lg' : 'shadow-md group-hover:scale-125 group-hover:rotate-6 group-hover:-translate-y-0.5'}`} style={{ boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.4)' : '0 2px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.35)' }}>
                <Icon className="w-4.5 h-4.5 text-white drop-shadow-sm" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))' }} />
              </div>
              <span className="flex-1 text-left font-semibold truncate">{item.label}</span>
              {item.id === 'clashes' && clashes.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold transition-transform ${
                  isActive ? (animeTheme.id === 'naruto' ? 'bg-black/20 text-slate-950' : 'bg-white/20 text-white') : 'bg-red-100 text-red-700 group-hover:scale-110'
                }`}>
                  {clashes.length}
                </span>
              )}
              {item.id === 'alerts' && alerts.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold transition-transform ${
                  isActive ? (animeTheme.id === 'naruto' ? 'bg-black/20 text-slate-950' : 'bg-white/20 text-white') : 'bg-amber-100 text-amber-700 group-hover:scale-110'
                }`}>
                  {alerts.length}
                </span>
              )}
              {item.id === 'mailTracker' && pendingMailCount > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold transition-transform ${
                  isActive ? (animeTheme.id === 'naruto' ? 'bg-black/20 text-slate-950' : 'bg-white/20 text-white') : 'bg-blue-100 text-blue-700 group-hover:scale-110'
                }`}>
                  {pendingMailCount}
                </span>
              )}

              {/* Sitting Anime Girl GIF on active section - perched on right side corner */}
              {isActive && (
                <div className="absolute -top-4.5 right-2 w-7 h-7 pointer-events-none z-30 animate-fade-in select-none">
                  <img
                    src={sittingAnimeGirl}
                    alt="Anime Girl Sitting"
                    className="w-full h-full object-contain select-none transition-transform duration-300 group-hover:scale-115"
                    style={{
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))',
                    }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div
      className={`min-h-screen flex transition-colors duration-500 anime-theme-${animeTheme.colorName.toLowerCase()}`}
      style={{
        background: `${animeTheme.bgGlow}, #f8fafc`,
      }}
    >
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white/80 backdrop-blur-lg border-r border-slate-200/60 flex-col fixed inset-y-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-white/95 backdrop-blur-lg border-r border-slate-200/60 flex flex-col animate-slide-in">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Universal Top Header */}
        <header className="glass border-b border-slate-200/60 sticky top-0 z-20 backdrop-blur-md bg-white/75">
          <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md transition-all duration-300"
                style={{
                  background: `linear-gradient(135deg, ${animeTheme.primaryColor}, ${animeTheme.secondaryColor})`,
                  boxShadow: `0 3px 10px ${animeTheme.primaryColor}35`,
                }}
              >
                <GraduationCap className={`w-4.5 h-4.5 ${animeTheme.id === 'naruto' ? 'text-slate-950' : 'text-white'}`} />
              </div>
              <div>
                <h1 className="text-base font-bold anime-title anime-title-glow leading-tight">
                  Faculty Load Portal
                </h1>
                <p className="text-[10px] text-slate-500 hidden sm:block leading-tight font-mono">
                  {animeTheme.series}
                </p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setThemeModalOpen(true)}
                title={`Anime Theme: ${animeTheme.name} (${animeTheme.colorName}) - Click to switch`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold hover:bg-slate-800 shadow-sm transition-all hover:scale-105 active:scale-95"
                style={{ color: animeTheme.primaryColor }}
              >
                <Sparkles className="w-3.5 h-3.5 animate-sparkle" style={{ color: animeTheme.primaryColor }} />
                <span>{animeTheme.colorEmoji} {animeTheme.name.split(' ')[0]} ({animeTheme.colorName})</span>
              </button>
              <button
                onClick={() => setBulkModalOpen(true)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-105 active:scale-95 ${animeTheme.primaryButtonClass}`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Bulk</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-6 anime-radial-bg rounded-3xl">
              <AnimeMascot variant="wizard" color="blue" size={100} pointing="up" />
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <div className="absolute inset-3 border-4 border-cyan-200 border-b-cyan-500 rounded-full animate-spin-slow" />
              </div>
              <p className="text-sm font-medium text-slate-500 animate-pulse">Summoning your data...</p>
            </div>
          ) : (
            <div className="animate-fade-in-up">
              {activeTab === 'dashboard' && (
                <Dashboard
                  facultyCount={faculty.length}
                  batchCount={batches.length}
                  loadCount={loads.length}
                  clashCount={clashes.length}
                  alertCount={alerts.length}
                  mailedCount={mailedCount}
                  pendingMailCount={pendingMailCount}
                  recentLoads={loads.slice(0, 5)}
                  loads={loads}
                  faculty={faculty}
                  onNavigate={navigate}
                  onDeleteLoad={fetchAll}
                  animeTheme={animeTheme}
                  onSelectTheme={handleSelectAnimeTheme}
                  onOpenThemeModal={() => setThemeModalOpen(true)}
                />
              )}
              {activeTab === 'faculty' && (
                <TabErrorBoundary fallbackTitle="Faculty Section">
                  <FacultyManager
                    faculty={faculty}
                    loads={loads}
                    extraClasses={extraClasses}
                    rescheduledClasses={rescheduledClasses}
                    cancelledClasses={cancelledClasses}
                    onChange={fetchAll}
                  />
                </TabErrorBoundary>
              )}
              {activeTab === 'batches' && (
                <BatchManager batches={batches} onChange={fetchAll} />
              )}
              {activeTab === 'addLoad' && (
                <AddLoadForm
                  faculty={faculty}
                  batches={batches}
                  existingLoads={loads}
                  onSaved={fetchAll}
                  onOpenBulkModal={() => setBulkModalOpen(true)}
                />
              )}
              {activeTab === 'search' && (
                <SearchView loads={loads} faculty={faculty} batches={batches} batchManagers={batchManagers} onDelete={fetchAll} />
              )}
              {activeTab === 'clashes' && (
                <ClashView clashes={clashes} />
              )}
              {activeTab === 'alerts' && (
                <AlertsView alerts={alerts} onChange={fetchAll} />
              )}
              {activeTab === 'mailTracker' && (
                <MailTrackerView groups={mailGroups} onChange={fetchAll} />
              )}
              {activeTab === 'extraReschedule' && (
                <ExtraRescheduleView
                  faculty={faculty}
                  batches={batches}
                  loads={loads}
                  extraClasses={extraClasses}
                  rescheduledClasses={rescheduledClasses}
                  cancelledClasses={cancelledClasses}
                  onChange={fetchAll}
                />
              )}
              {activeTab === 'facultyAvailability' && (
                <FacultyAvailabilityView
                  faculty={faculty}
                  loads={loads}
                  rescheduledClasses={rescheduledClasses}
                  extraClasses={extraClasses}
                  cancelledClasses={cancelledClasses}
                  animeTheme={animeTheme}
                  onRefresh={fetchAll}
                />
              )}
              {activeTab === 'batchSyllabus' && (
                <BatchSyllabusView
                  batches={batches}
                  faculty={faculty}
                  loads={loads}
                  animeTheme={animeTheme}
                  onNavigateToAddLoad={() => navigate('addLoad')}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full p-4 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-800 flex items-start gap-3 animate-slide-in">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white">{toast.title}</h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.desc}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        existingFaculty={faculty}
        existingBatches={batches}
        existingLoads={loads}
        onSuccess={handleBulkSuccess}
      />

      {/* Anime Theme Selector Modal */}
      <AnimeThemeSelectorModal
        isOpen={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
        currentThemeId={animeThemeId}
        onSelectTheme={handleSelectAnimeTheme}
      />

      {/* AI Assistant Kabir (Hinglish Buddy with Real Male Voice) */}
      <AIAssistant
        faculty={faculty}
        batches={batches}
        loads={loads}
        batchManagers={batchManagers}
        extraClasses={extraClasses}
        rescheduledClasses={rescheduledClasses}
        cancelledClasses={cancelledClasses}
        onNavigateTab={(tab) => setActiveTab(tab as Tab)}
      />
    </div>
  );
}

/* ==================== DASHBOARD ==================== */

function Dashboard({
  facultyCount,
  batchCount,
  loadCount,
  clashCount,
  alertCount,
  mailedCount,
  pendingMailCount,
  recentLoads,
  loads,
  faculty,
  onNavigate,
  onDeleteLoad,
  animeTheme,
  onSelectTheme,
  onOpenThemeModal,
}: {
  facultyCount: number;
  batchCount: number;
  loadCount: number;
  clashCount: number;
  alertCount: number;
  mailedCount: number;
  pendingMailCount: number;
  recentLoads: FacultyLoadWithDetails[];
  loads: FacultyLoadWithDetails[];
  faculty: Faculty[];
  onNavigate: (tab: Tab) => void;
  onDeleteLoad: () => void;
  animeTheme: AnimeTheme;
  onSelectTheme: (id: AnimeThemeId) => void;
  onOpenThemeModal: () => void;
}) {
  const deleteLoad = async (id: string) => {
    await supabase.from('faculty_loads').delete().eq('id', id);
    onDeleteLoad();
  };

  const [exportFaculty, setExportFaculty] = useState<string[]>([]);
  const [alertSearch, setAlertSearch] = useState('');
  const [alertStatusFilter, setAlertStatusFilter] = useState<'all' | 'pending' | 'running' | 'expired'>('all');

  // Deduplicate by subject + time + start/end date so multi-batch entries count as 1
  const uniqueLoads = (() => {
    const seen = new Set<string>();
    return loads.filter(l => {
      const key = `${l.subject}|${l.start_time}|${l.end_time}|${l.start_date}|${l.end_date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  const pendingCount = uniqueLoads.filter(l => getLoadStatus(l.start_date, l.end_date) === 'pending').length;
  const runningCount = uniqueLoads.filter(l => getLoadStatus(l.start_date, l.end_date) === 'running').length;
  const expiredCount = uniqueLoads.filter(l => getLoadStatus(l.start_date, l.end_date) === 'expired').length;

  const stats = [
    { label: 'Total Faculty', sub: 'Sensei & Shinobi', value: facultyCount, icon: GraduationCap, color: 'blue', tab: 'faculty' as Tab },
    { label: 'Total Batches', sub: 'Shadow Batches', value: batchCount, icon: Users, color: 'cyan', tab: 'batches' as Tab },
    { label: 'Pending Missions', sub: 'Active Timetable', value: pendingCount, icon: CalendarClock, color: 'amber', tab: 'search' as Tab },
    { label: 'Active Clashes', sub: 'Schedule Conflicts', value: clashCount, icon: AlertTriangle, color: 'red', tab: 'clashes' as Tab },
  ];

  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600 text-blue-600 bg-blue-50',
    cyan: 'from-cyan-500 to-cyan-600 text-cyan-600 bg-cyan-50',
    emerald: 'from-emerald-500 to-emerald-600 text-emerald-600 bg-emerald-50',
    red: 'from-red-500 to-red-600 text-red-600 bg-red-50',
    amber: 'from-amber-500 to-amber-600 text-amber-600 bg-amber-50',
  };

  return (
    <div className="space-y-6 rounded-3xl p-1">
      {/* Clean Dashboard Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Dashboard Overview
            </h1>
            <button
              onClick={onOpenThemeModal}
              title="Click to Switch Theme"
              className="text-xs px-3 py-1 rounded-full font-bold border flex items-center gap-1.5 shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
              style={{
                backgroundColor: `${animeTheme.primaryColor}18`,
                color: animeTheme.primaryColor,
                borderColor: `${animeTheme.primaryColor}40`,
              }}
            >
              <span>{animeTheme.colorEmoji}</span>
              <span>{animeTheme.name} ({animeTheme.colorName} Theme)</span>
              <Sparkles className="w-3.5 h-3.5 animate-sparkle" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Faculty workload distribution, class conflict alerts, and schedule metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('addLoad')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md hover:scale-105 active:scale-95 ${animeTheme.primaryButtonClass}`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Load</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          const colors = colorMap[stat.color].split(' ');
          return (
            <button
              key={stat.label}
              onClick={() => onNavigate(stat.tab)}
              style={{ animationDelay: `${idx * 80}ms` }}
              className="anime-card bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/60 hover:border-slate-300 text-left group animate-bounce-in opacity-0"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[0]} ${colors[1]} flex items-center justify-center mb-3 shadow-md group-hover:scale-125 group-hover:rotate-6 transition-all duration-300`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-slate-900 group-hover:gradient-text transition-all">{stat.value}</p>
              <p className="text-sm text-slate-800 mt-1 font-bold">{stat.label}</p>
              <p className="text-[11px] text-slate-400 font-mono">{stat.sub}</p>
            </button>
          );
        })}
      </div>

      {/* Quick Feature Banners: Faculty Free Slots & Batch Syllabus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div
          className="p-4 rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 group hover:border-cyan-300 transition-all cursor-pointer"
          onClick={() => onNavigate('facultyAvailability')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
                  Live & Free Slots Tracker
                </span>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">• Real-time</span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 mt-0.5">
                Check who is busy in class & daily free breaks
              </h3>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 -rotate-90 text-slate-400 group-hover:text-cyan-600 transition-colors shrink-0" />
        </div>

        <div
          className="p-4 rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 group hover:border-amber-300 transition-all cursor-pointer"
          onClick={() => onNavigate('batchSyllabus')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Batch Planner
                </span>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">• 1 Card per Batch</span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 mt-0.5">
                Batchwise subjects, faculty, hours & dates in 1 card
              </h3>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 -rotate-90 text-slate-400 group-hover:text-amber-600 transition-colors shrink-0" />
        </div>
      </div>

      {/* Recent Loads */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 overflow-hidden anime-card">
        <div className="px-6 py-4 border-b border-slate-100/80 flex items-center gap-3">
          <AnimeMascot variant="student" color="blue" size={48} pointing="right" />
          <h2 className="text-base font-bold text-slate-900">Recent Load Entries</h2>
        </div>
        {recentLoads.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No load entries yet. Click "Add Load" to get started.</p>
            <button
              onClick={() => onNavigate('addLoad')}
              className={`mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md hover:scale-105 active:scale-95 ${animeTheme.primaryButtonClass}`}
            >
              <Plus className="w-4 h-4" />
              Add Load Entry
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100/80">
            {recentLoads.map((load) => (
              <div key={load.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{load.subject}</p>
                    <p className="text-sm text-slate-500">
                      {load.faculty.name} • {load.batch.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">
                      {load.start_time} - {load.end_time}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDate(load.start_date)} to {formatDate(load.end_date)}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteLoad(load.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 hover:scale-110"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Alert Summary - replaces total load */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 overflow-hidden anime-card">
        <div className="px-6 py-4 border-b border-slate-100/80 flex items-center gap-3">
          <AnimeMascot variant="alert" color="amber" size={48} pointing="right" />
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Data Alert Summary
          </h2>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-100/80">
          <div className="p-5 text-center group cursor-default">
            <p className="text-3xl font-bold text-amber-600 group-hover:scale-110 transition-transform duration-200">{pendingCount}</p>
            <p className="text-sm text-slate-500 mt-1">Pending Subjects</p>
          </div>
          <div className="p-5 text-center group cursor-default">
            <p className="text-3xl font-bold text-emerald-600 group-hover:scale-110 transition-transform duration-200">{runningCount}</p>
            <p className="text-sm text-slate-500 mt-1">Running Subjects</p>
          </div>
          <div className="p-5 text-center group cursor-default">
            <p className="text-3xl font-bold text-slate-400 group-hover:scale-110 transition-transform duration-200">{expiredCount}</p>
            <p className="text-sm text-slate-500 mt-1">Expired Subjects</p>
          </div>
        </div>
        {/* Per-subject breakdown */}
        {loads.length > 0 && (
          <div className="border-t border-slate-100">
            {/* Search & Filter Bar */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search subject or faculty..."
                  value={alertSearch}
                  onChange={(e) => setAlertSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 anime-input"
                />
                {alertSearch && (
                  <button onClick={() => setAlertSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200 hover:scale-110">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex gap-1.5">
                {([
                  { id: 'all' as const, label: 'All' },
                  { id: 'pending' as const, label: 'Pending' },
                  { id: 'running' as const, label: 'Running' },
                  { id: 'expired' as const, label: 'Expired' },
                ]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setAlertStatusFilter(tab.id)}
                    className={`anime-tab px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                      alertStatusFilter === tab.id
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 hover:scale-105'
                        : 'bg-white border border-slate-200/60 text-slate-600 hover:bg-slate-50 hover:scale-105'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {(() => {
                const q = alertSearch.toLowerCase().trim();
                const allSubjects = Array.from(new Set(loads.map(l => l.subject)));
                const filteredSubjects = allSubjects.filter(subject => {
                  const subLoads = uniqueLoads.filter(l => l.subject === subject);
                  if (alertStatusFilter !== 'all') {
                    const hasStatus = subLoads.some(l => getLoadStatus(l.start_date, l.end_date) === alertStatusFilter);
                    if (!hasStatus) return false;
                  }
                  if (!q) return true;
                  const matchesSubject = subject.toLowerCase().includes(q);
                  const matchesFaculty = subLoads.some(l => l.faculty.name.toLowerCase().includes(q));
                  return matchesSubject || matchesFaculty;
                });
                if (filteredSubjects.length === 0) {
                  return (
                    <div className="px-6 py-8 text-center">
                      <p className="text-sm text-slate-400">No subjects match your search.</p>
                    </div>
                  );
                }
                return filteredSubjects.map(subject => {
                  let subLoads = uniqueLoads.filter(l => l.subject === subject);
                  if (alertStatusFilter !== 'all') {
                    subLoads = subLoads.filter(l => getLoadStatus(l.start_date, l.end_date) === alertStatusFilter);
                  }
                  const sPending = subLoads.filter(l => getLoadStatus(l.start_date, l.end_date) === 'pending').length;
                  const sRunning = subLoads.filter(l => getLoadStatus(l.start_date, l.end_date) === 'running').length;
                  const sExpired = subLoads.filter(l => getLoadStatus(l.start_date, l.end_date) === 'expired').length;
                  return (
                    <div key={subject} className="px-6 py-3 border-b border-slate-50 hover:bg-slate-50 transition-all duration-200 hover:translate-x-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="text-sm font-bold text-slate-800">{subject}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {sPending > 0 && <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700 anime-badge">{sPending} Pending</span>}
                          {sRunning > 0 && <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700 anime-badge">{sRunning} Running</span>}
                          {sExpired > 0 && <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-600 anime-badge">{sExpired} Expired</span>}
                        </div>
                      </div>
                      <div className="ml-6 space-y-0.5">
                        {subLoads.map((load, i) => {
                          const st = getLoadStatus(load.start_date, load.end_date);
                          return (
                            <div key={i} className="flex items-center gap-3 text-xs text-slate-500">
                              <GraduationCap className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="font-medium text-slate-600">{load.faculty.name}</span>
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{load.start_time} - {load.end_time}</span>
                              <CalendarClock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{formatDate(load.start_date)} - {formatDate(load.end_date)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Excel Export Section */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6 anime-card">
        <div className="flex items-center gap-3 mb-4">
          <AnimeMascot variant="wizard" color="cyan" size={48} pointing="right" />
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Export to Excel
          </h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Download faculty load data with status (pending, running, expired). Each faculty gets their own sub-sheet.
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Select Faculty (leave empty to export all)
            </label>
            <MultiSelect
              items={faculty.map(f => ({ id: f.id, name: f.name }))}
              selectedIds={exportFaculty}
              onChange={setExportFaculty}
              placeholder="Select faculty..."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportToExcel(loads, faculty, exportFaculty)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              {exportFaculty.length > 0 ? `Export ${exportFaculty.length} Faculty` : 'Export All Faculty'}
            </button>
            {exportFaculty.length > 0 && (
              <button
                onClick={() => setExportFaculty([])}
                className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-300 transition-colors"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mail Tracker Banner */}
      {pendingMailCount > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200/60 rounded-2xl p-5 flex items-center justify-between animate-bounce-in anime-glow-blue">
          <div className="flex items-center gap-3">
            <AnimeMascot variant="mail" color="blue" size={56} pointing="right" />
            <div>
              <p className="font-semibold text-blue-900">
                {pendingMailCount} pending start-date mail{pendingMailCount > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-blue-700">
                {mailedCount} already marked as mailed. Review and mark remaining.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('mailTracker')}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200"
          >
            View Mail Tracker
          </button>
        </div>
      )}

      {/* Clash Warning Banner */}
      {clashCount > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/60 rounded-2xl p-5 flex items-center justify-between animate-bounce-in anime-glow-red">
          <div className="flex items-center gap-3">
            <AnimeMascot variant="clash" color="red" size={56} pointing="right" />
            <div>
              <p className="font-semibold text-red-900">
                {clashCount} clash{clashCount > 1 ? 'es' : ''} detected
              </p>
              <p className="text-sm text-red-700">
                Some classes are overlapping. Review and resolve them.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('clashes')}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200"
          >
            View Clashes
          </button>
        </div>
      )}

      {/* Date Alert Banner */}
      {alertCount > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/60 rounded-2xl p-5 flex items-center justify-between animate-bounce-in anime-glow-amber">
          <div className="flex items-center gap-3">
            <AnimeMascot variant="alert" color="amber" size={56} pointing="right" />
            <div>
              <p className="font-semibold text-amber-900">
                {alertCount} date alert{alertCount > 1 ? 's' : ''} — classes starting or ending within 3 days
              </p>
              <p className="text-sm text-amber-700">
                Review and adjust dates as needed.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('alerts')}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-200"
          >
            View Alerts
          </button>
        </div>
      )}
    </div>
  );
}

/* ==================== SCROLLABLE SELECT DROPDOWN ==================== */

function ScrollableSelect({
  value,
  onChange,
  options,
  placeholder,
  maxItems = 10,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  maxItems?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find((o) => o.value === value);
  const itemHeight = 38;
  const maxH = itemHeight * maxItems;

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white cursor-pointer flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-y-auto" style={{ maxHeight: `${maxH}px` }}>
            <button
              key="__all__"
              onClick={() => { onChange(''); setOpen(false); }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors ${!selected ? 'bg-blue-50 font-medium' : ''}`}
            >
              {placeholder}
            </button>
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors ${opt.value === value ? 'bg-blue-50 font-medium' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== SEARCHABLE MULTI-SELECT DROPDOWN ==================== */

function MultiSelect({
  items,
  selectedIds,
  onChange,
  placeholder,
}: {
  items: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = items.filter((b) =>
    b.name.toLowerCase().includes(query.toLowerCase())
  );

  const selectedBatches = items.filter((b) => selectedIds.includes(b.id));

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className="w-full min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 text-sm bg-white cursor-pointer flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <div className="flex flex-wrap gap-1.5 flex-1">
          {selectedBatches.length === 0 ? (
            <span className="text-slate-400">{placeholder}</span>
          ) : (
            selectedBatches.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-medium"
                onClick={(e) => { e.stopPropagation(); toggle(b.id); }}
              >
                {b.name}
                <X className="w-3 h-3" />
              </span>
            ))
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search batches..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100">
            <button
              type="button"
              onClick={() => onChange(items.map((b) => b.id))}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium"
            >
              Clear
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.slice(0, 5).map((b) => {
              const selected = selectedIds.includes(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggle(b.id)}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-blue-50 transition-colors ${
                    selected ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    selected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                  }`}>
                    {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  {b.name}
                </button>
              );
            })}
            {filtered.length > 5 && (
              <div className="overflow-y-auto flex-1 max-h-40">
                {filtered.slice(5).map((b) => {
                  const selected = selectedIds.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => toggle(b.id)}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-blue-50 transition-colors ${
                        selected ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        selected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                      }`}>
                        {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      {b.name}
                    </button>
                  );
                })}
              </div>
            )}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-sm text-slate-400 text-center">No items found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== FACULTY MANAGER ==================== */

function FacultyManager({
  faculty = [],
  loads = [],
  extraClasses = [],
  rescheduledClasses = [],
  cancelledClasses = [],
  onChange,
}: {
  faculty?: Faculty[];
  loads?: FacultyLoadWithDetails[];
  extraClasses?: ExtraClassWithDetails[];
  rescheduledClasses?: RescheduledClassWithDetails[];
  cancelledClasses?: CancelledClassWithDetails[];
  onChange: () => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [branch, setBranch] = useState('');
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ added: number; errors: string[] } | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'none'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', department: '', branch: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const BRANCHES = ['Civil', 'Mechanical', 'Electronic', 'Electrical', 'EE/ECE', 'Chemical', 'CS/IT', 'CS/DA', 'DS/AI'];

  const categories = Array.from(new Set((faculty || []).map((f) => f?.department).filter(Boolean))).sort();

  // Deduplicate live/running classes by (subject + day + time) so multi-batch classes at same time count as 1 session
  const facultyRunningMetrics = useMemo(() => {
    const map = new Map<
      string,
      {
        count: number;
        totalHours: number;
        sessions: {
          subject: string;
          day_of_week: string;
          start_time: string;
          end_time: string;
          room: string | null;
          durationHours: number;
          batchNames: string[];
        }[];
      }
    >();

    const safeFaculty = Array.isArray(faculty) ? faculty : [];
    const safeLoads = Array.isArray(loads) ? loads : [];
    const safeExtra = Array.isArray(extraClasses) ? extraClasses : [];
    const safeRescheduled = Array.isArray(rescheduledClasses) ? rescheduledClasses : [];
    const safeCancelled = Array.isArray(cancelledClasses) ? cancelledClasses : [];

    const now = new Date();
    const isTodaySunday = now.getDay() === 0;
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    safeFaculty.forEach((f) => {
      if (!f || !f.id) return;
      const sessionMap = new Map<
        string,
        {
          subject: string;
          day_of_week: string;
          start_time: string;
          end_time: string;
          room: string | null;
          durationHours: number;
          batchNames: string[];
        }
      >();

      const addSession = (sTime: string, eTime: string, subject: string, bName: string, roomStr: string | null) => {
        const cleanSt = String(sTime || '').trim();
        const cleanEt = String(eTime || '').trim();
        const normSub = String(subject || '').trim().toLowerCase();
        if (!cleanSt || !cleanEt) return;

        const key = `${cleanSt}__${cleanEt}__${normSub}`;
        const existing = sessionMap.get(key);
        if (existing) {
          if (bName && !existing.batchNames.includes(bName)) {
            existing.batchNames.push(bName);
          }
          if (roomStr && (!existing.room || !existing.room.includes(roomStr))) {
            existing.room = existing.room ? `${existing.room}, ${roomStr}` : roomStr;
          }
        } else {
          const [sh, sm] = cleanSt.split(':').map(Number);
          const [eh, em] = cleanEt.split(':').map(Number);
          const startMin = (Number(sh) || 0) * 60 + (Number(sm) || 0);
          const endMin = (Number(eh) || 0) * 60 + (Number(em) || 0);
          const durationHours = Math.max(0, (endMin - startMin) / 60) || 0;

          sessionMap.set(key, {
            subject: subject || 'Untitled',
            day_of_week: '',
            start_time: cleanSt,
            end_time: cleanEt,
            room: roomStr,
            durationHours,
            batchNames: [bName],
          });
        }
      };

      // 1. Regular routine loads (Only active Monday - Saturday; Sunday is OFF for routine classes)
      if (!isTodaySunday) {
        const facCancelled = safeCancelled.filter((cc) => cc.faculty_id === f.id && cc.date === todayStr);
        const facRescheduledAway = safeRescheduled.filter((rc) => rc.faculty_id === f.id && rc.original_date === todayStr);

        const facLoads = safeLoads.filter((l) => l && l.faculty_id === f.id);
        facLoads.forEach((load) => {
          if (!load || !load.start_date || !load.end_date) return;
          try {
            if (getLoadStatus(load.start_date, load.end_date) !== 'running') return;
          } catch {
            return;
          }

          // Check if cancelled today
          const isCancelled = facCancelled.some(
            (cc) =>
              cc.batch_id === load.batch_id &&
              cc.subject.toLowerCase() === (load.subject || '').toLowerCase()
          );
          if (isCancelled) return;

          // Check if shifted away from today
          const isShiftedAway = facRescheduledAway.some(
            (rc) =>
              rc.original_load_id === load.id ||
              (rc.batch_id === load.batch_id && rc.subject.toLowerCase() === (load.subject || '').toLowerCase())
          );
          if (isShiftedAway) return;

          const bName = load.batch?.name ? String(load.batch.name) : 'Batch';
          const roomStr = load.room != null ? String(load.room).trim() : null;
          addSession(load.start_time, load.end_time, load.subject, bName, roomStr);
        });
      }

      // 2. Rescheduled classes shifted TO today (including on Sunday!)
      const incomingReschedules = safeRescheduled.filter(
        (rc) => rc.faculty_id === f.id && rc.new_date === todayStr
      );
      incomingReschedules.forEach((rc) => {
        const bName = rc.batch?.name ? String(rc.batch.name) : 'Batch';
        const roomStr = rc.room != null ? String(rc.room).trim() : null;
        addSession(rc.new_start_time, rc.new_end_time, rc.subject, bName, roomStr);
      });

      // 3. Extra classes on today (including on Sunday!)
      const facExtra = safeExtra.filter((ec) => ec.faculty_id === f.id && ec.date === todayStr);
      facExtra.forEach((ec) => {
        const bName = ec.batch?.name ? String(ec.batch.name) : 'Batch';
        const roomStr = ec.room != null ? String(ec.room).trim() : null;
        addSession(ec.start_time, ec.end_time, ec.subject, bName, roomStr);
      });

      const sessions = Array.from(sessionMap.values());
      const count = sessions.length;
      const totalHours = sessions.reduce((acc, s) => acc + (s.durationHours || 0), 0);

      map.set(f.id, { count, totalHours, sessions });
    });

    return map;
  }, [faculty, loads, extraClasses, rescheduledClasses, cancelledClasses]);

  const facultyWithRunning = (faculty || []).filter((f) => f && (facultyRunningMetrics.get(f.id)?.count || 0) > 0);
  const totalLiveSessions = Array.from(facultyRunningMetrics.values()).reduce((acc, m) => acc + (m.count || 0), 0);
  const totalLiveHours = Array.from(facultyRunningMetrics.values()).reduce((acc, m) => acc + (m.totalHours || 0), 0);

  const addFaculty = async () => {
    if (!name.trim() || !category.trim()) return;
    const dup = (faculty || []).some(f =>
      f &&
      String(f.name || '').toLowerCase() === name.trim().toLowerCase() &&
      String(f.department || '').toLowerCase() === category.trim().toLowerCase()
    );
    if (dup) {
      setBulkResult({ added: 0, errors: [`Faculty "${name.trim()}" with category "${category.trim()}" already exists.`] });
      return;
    }
    setSaving(true);
    await supabase.from('faculty').insert({ name: name.trim(), department: category.trim(), branch: branch.trim() || null });
    setName('');
    setCategory('');
    setBranch('');
    setSaving(false);
    onChange();
  };

  const deleteFaculty = async (id: string) => {
    await supabase.from('faculty').delete().eq('id', id);
    onChange();
  };

  const startEdit = (f: Faculty) => {
    setEditingId(f.id);
    setEditForm({ name: f.name || '', department: f.department || '', branch: f.branch || '' });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.name.trim() || !editForm.department.trim()) return;
    setSavingEdit(true);
    await supabase.from('faculty').update({
      name: editForm.name.trim(),
      department: editForm.department.trim(),
      branch: editForm.branch.trim() || null,
    }).eq('id', id);
    setSavingEdit(false);
    setEditingId(null);
    onChange();
  };

  const deleteAllFaculty = async () => {
    await supabase.from('faculty').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setConfirmDeleteAll(false);
    onChange();
  };

  const handleBulkUpload = async () => {
    const rows = parseSheetText(bulkText);
    if (rows.length === 0) return;
    const { headerMap, dataRows } = mapColumns(rows, {
      name: ['name', 'faculty', 'faculty_name', 'faculty name'],
      category: ['category', 'department', 'dept'],
    });
    const records: { name: string; department: string }[] = [];
    const errors: string[] = [];
    const existingKeys = new Set((faculty || []).map(f => `${String(f?.name || '').toLowerCase()}|${String(f?.department || '').toLowerCase()}`));
    const seenInBatch = new Set<string>();
    let skipped = 0;
    dataRows.forEach((row, i) => {
      const nameVal = (row[headerMap.name ?? 0] || '').trim();
      const catVal = (row[headerMap.category ?? 1] || '').trim();
      if (!nameVal) {
        errors.push(`Row ${i + 2}: Missing name`);
        return;
      }
      if (!catVal) {
        errors.push(`Row ${i + 2}: Missing category`);
        return;
      }
      const key = `${nameVal.toLowerCase()}|${catVal.toLowerCase()}`;
      if (existingKeys.has(key) || seenInBatch.has(key)) {
        skipped++;
        return;
      }
      seenInBatch.add(key);
      records.push({ name: nameVal, department: catVal });
    });
    if (records.length === 0) {
      errors.push(skipped > 0 ? `${skipped} duplicate(s) skipped.` : 'No valid rows found.');
      setBulkResult({ added: 0, errors });
      return;
    }
    setBulkUploading(true);
    const { error } = await supabase.from('faculty').insert(records);
    setBulkUploading(false);
    if (error) {
      errors.push(error.message);
    }
    if (skipped > 0) errors.push(`${skipped} duplicate(s) skipped.`);
    setBulkResult({ added: records.length, errors });
    setBulkText('');
    onChange();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        setBulkText(XLSX.utils.sheet_to_csv(ws));
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => setBulkText(String(ev.target?.result || ''));
      reader.readAsText(file);
    }
  };

  const handleGoogleSheetLink = async () => {
    const url = prompt('Paste your Google Sheet link:');
    if (!url) return;
    setBulkUploading(true);
    try {
      const csvUrl = url.includes('/edit')
        ? url.replace('/edit', '/export?format=csv')
        : url.includes('output://') ? url.replace('output://', 'https://') : url;
      const res = await fetch(csvUrl);
      const text = await res.text();
      setBulkText(text);
    } catch {
      setBulkResult({ added: 0, errors: ['Could not fetch the Google Sheet. Make sure it is shared publicly.'] });
    }
    setBulkUploading(false);
  };

  const filteredFaculty = (faculty || []).filter((f) => {
    if (!f) return false;
    const q = (searchQuery || '').toLowerCase().trim();
    const fName = String(f.name || '').toLowerCase();
    const fDept = String(f.department || '').toLowerCase();
    const fBranch = String(f.branch || '').toLowerCase();

    const matchesSearch = !q || fName.includes(q) || fDept.includes(q) || fBranch.includes(q);
    const matchesCategory = !filterCategory || f.department === filterCategory;
    const matchesBranch = !filterBranch || f.branch === filterBranch;
    const metrics = facultyRunningMetrics.get(f.id);
    const hasRunning = (metrics?.count || 0) > 0;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'running' && hasRunning) || (statusFilter === 'none' && !hasRunning);
    return matchesSearch && matchesCategory && matchesBranch && matchesStatus;
  });

  return (
    <div className="space-y-6 anime-radial-bg rounded-3xl p-1">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 anime-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md animate-energy-pulse">
              <Plus className="w-5 h-5 text-white" />
            </div>
            Add New Faculty
          </h2>
          <button
            onClick={() => { setBulkOpen(!bulkOpen); setBulkResult(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </button>
        </div>

        {bulkOpen && (
          <div className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <p className="text-sm font-medium text-slate-700">Bulk Upload Faculty (CSV / Excel / Google Sheet)</p>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Format: <code className="bg-slate-200 px-1 rounded">name,category</code> — one per line. Header row optional.
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                onChange={handleFileUpload}
                className="block flex-1 text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-sm file:font-medium hover:file:bg-blue-700"
              />
              <button
                onClick={handleGoogleSheetLink}
                disabled={bulkUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors whitespace-nowrap"
              >
                <LinkIcon className="w-4 h-4" />
                Google Sheet
              </button>
            </div>
            <textarea
              placeholder="name,category&#10;John Smith,Computer Science&#10;Jane Doe,Mathematics"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {bulkResult && (
              <div className={`mt-3 p-3 rounded-lg text-sm ${bulkResult.errors.length > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                <p className="font-medium">Added {bulkResult.added} faculty member{bulkResult.added !== 1 ? 's' : ''}.</p>
                {bulkResult.errors.length > 0 && (
                  <ul className="mt-1 text-xs">
                    {bulkResult.errors.map((err, i) => <li key={i}>• {err}</li>)}
                  </ul>
                )}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleBulkUpload}
                disabled={bulkUploading || !bulkText.trim()}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 disabled:opacity-50"
              >
                {bulkUploading ? 'Uploading...' : 'Upload'}
              </button>
              <button
                onClick={() => { setBulkOpen(false); setBulkText(''); setBulkResult(null); }}
                className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Faculty name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addFaculty()}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Category (e.g. Professor)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addFaculty()}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Select Branch</option>
            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <button
            onClick={addFaculty}
            disabled={saving || !name.trim() || !category.trim()}
            className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Adding...' : 'Add Faculty'}
          </button>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 anime-card overflow-hidden">
        {/* Top Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50/80 border-b border-slate-100">
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">Total Faculty</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{(faculty || []).length}</p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-sm">
            <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              With Live Classes
            </p>
            <p className="text-xl font-bold text-emerald-700 mt-0.5">{facultyWithRunning.length}</p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-sm">
            <p className="text-xs font-semibold text-blue-600">Total Live Classes</p>
            <p className="text-xl font-bold text-blue-700 mt-0.5">{totalLiveSessions || 0}</p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-sm">
            <p className="text-xs font-semibold text-purple-600">Live Teaching Hours</p>
            <p className="text-xl font-bold text-purple-700 mt-0.5">{(totalLiveHours || 0).toFixed(1)} hrs/wk</p>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <AnimeMascot variant="sensei" color="blue" size={44} pointing="right" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  All Faculty ({faculty.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Multi-batch classes at same time counted as 1 live class with exact running hours
                </p>
              </div>
            </div>

            {/* Quick Status Filter Pills */}
            <div className="flex gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                All ({faculty.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('running')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'running'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                🟢 Running Only ({facultyWithRunning.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('none')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'none'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                ⚪ No Live Class ({faculty.length - facultyWithRunning.length})
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search faculty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-44 anime-input"
              />
            </div>
            {categories.length > 0 && (
              <div className="relative">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full sm:w-44 anime-input"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full sm:w-40 anime-input"
            >
              <option value="">All Branches</option>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            {faculty.length > 0 && (
              <button
                onClick={() => setConfirmDeleteAll(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors anime-btn"
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </button>
            )}
          </div>
        </div>
        {confirmDeleteAll && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
            <p className="text-sm text-red-700 font-medium">
              Delete ALL {faculty.length} faculty? This also deletes their load entries.
            </p>
            <div className="flex gap-2">
              <button
                onClick={deleteAllFaculty}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
              >
                Yes, Delete All
              </button>
              <button
                onClick={() => setConfirmDeleteAll(false)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50/80 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {faculty.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <AnimeMascot variant="sensei" color="blue" size={80} pointing="up" message="Add your first faculty member!" />
            <p className="text-slate-500 mt-3">No faculty added yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100/80">
            {filteredFaculty.map((f) => {
              const isEditing = editingId === f.id;
              const metrics = facultyRunningMetrics.get(f.id);
              const runningCount = metrics?.count || 0;
              const runningHours = metrics?.totalHours || 0;

              return (
              <div key={f.id} className="px-6 py-4 hover:bg-slate-50/80 transition-all duration-300 hover:translate-x-1">
                {isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Category</label>
                      <input
                        type="text"
                        value={editForm.department}
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Branch</label>
                      <select
                        value={editForm.branch}
                        onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">No Branch</option>
                        {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(f.id)}
                        disabled={savingEdit}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {savingEdit ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm shadow-md transition-transform duration-300 hover:scale-125 hover:rotate-6 shrink-0 mt-0.5">
                        {String(f.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <p className="font-bold text-slate-900 text-base">{f.name || 'Unnamed Faculty'}</p>
                          {runningCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              {runningCount} {runningCount === 1 ? 'Live Class' : 'Live Classes'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                              0 Live Classes
                            </span>
                          )}
                          {runningCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                              <Clock className="w-3.5 h-3.5 text-blue-500" />
                              {(runningHours || 0).toFixed(1)} hrs/wk
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                            <Layers className="w-3 h-3 text-slate-400" />
                            {f.department || 'General'}
                          </span>
                          {f.branch && (
                            <span className="text-xs text-blue-600 flex items-center gap-1 font-medium">
                              <Building2 className="w-3 h-3 text-blue-400" />
                              {f.branch}
                            </span>
                          )}
                        </div>

                        {metrics && metrics.sessions && metrics.sessions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-slate-100/80">
                            {metrics.sessions.map((sess, sIdx) => (
                              <span
                                key={sIdx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200/80 transition-colors shadow-sm"
                              >
                                <BookOpen className="w-3 h-3 text-blue-600 shrink-0" />
                                <strong className="text-slate-900">{sess.subject || 'Class'}</strong>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-600">{sess.start_time}-{sess.end_time}</span>
                                {sess.room && (
                                  <>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-slate-500">Room: {sess.room}</span>
                                  </>
                                )}
                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono">
                                  {(sess.batchNames || []).length} {(sess.batchNames || []).length === 1 ? 'batch' : 'batches'}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(f)}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 hover:scale-110"
                        title="Edit Faculty"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteFaculty(f.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 hover:scale-110"
                        title="Delete Faculty"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              );
            })}
            {filteredFaculty.length === 0 && (
              <div className="px-6 py-12 text-center">
                <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No faculty match your search.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ==================== BATCH MANAGER ==================== */

function BatchManager({
  batches,
  onChange,
}: {
  batches: Batch[];
  onChange: () => void;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ added: number; errors: string[] } | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const addBatch = async () => {
    if (!name.trim()) return;
    if (batches.some(b => b.name.toLowerCase() === name.trim().toLowerCase())) {
      setBulkResult({ added: 0, errors: [`Batch "${name.trim()}" already exists.`] });
      return;
    }
    setSaving(true);
    await supabase.from('batches').insert({ name: name.trim() });
    setName('');
    setSaving(false);
    onChange();
  };

  const deleteBatch = async (id: string) => {
    await supabase.from('batches').delete().eq('id', id);
    onChange();
  };

  const deleteAllBatches = async () => {
    await supabase.from('batches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setConfirmDeleteAll(false);
    onChange();
  };

  const handleBulkUpload = async () => {
    const rows = parseSheetText(bulkText);
    if (rows.length === 0) return;
    const { headerMap, dataRows } = mapColumns(rows, {
      name: ['name', 'batch', 'batch_name', 'batch name'],
    });
    const records: { name: string }[] = [];
    const errors: string[] = [];
    const existingNames = new Set(batches.map(b => b.name.toLowerCase()));
    const seenInBatch = new Set<string>();
    let skipped = 0;
    dataRows.forEach((row, i) => {
      const nameVal = (row[headerMap.name ?? 0] || '').trim();
      if (!nameVal) {
        errors.push(`Row ${i + (headerMap ? 2 : 1)}: Missing name`);
        return;
      }
      const lower = nameVal.toLowerCase();
      if (existingNames.has(lower) || seenInBatch.has(lower)) {
        skipped++;
        return;
      }
      seenInBatch.add(lower);
      records.push({ name: nameVal });
    });
    if (records.length === 0) {
      errors.push(skipped > 0 ? `${skipped} duplicate(s) skipped.` : 'No valid rows found.');
      setBulkResult({ added: 0, errors });
      return;
    }
    setBulkUploading(true);
    const { error } = await supabase.from('batches').insert(records);
    setBulkUploading(false);
    if (error) errors.push(error.message);
    if (skipped > 0) errors.push(`${skipped} duplicate(s) skipped.`);
    setBulkResult({ added: records.length, errors });
    setBulkText('');
    onChange();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        setBulkText(XLSX.utils.sheet_to_csv(ws));
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => setBulkText(String(ev.target?.result || ''));
      reader.readAsText(file);
    }
  };

  const handleGoogleSheetLink = async () => {
    const url = prompt('Paste your Google Sheet link:');
    if (!url) return;
    setBulkUploading(true);
    try {
      const csvUrl = url.includes('/edit')
        ? url.replace('/edit', '/export?format=csv')
        : url.includes('output://') ? url.replace('output://', 'https://') : url;
      const res = await fetch(csvUrl);
      const text = await res.text();
      setBulkText(text);
    } catch {
      setBulkResult({ added: 0, errors: ['Could not fetch the Google Sheet. Make sure it is shared publicly.'] });
    }
    setBulkUploading(false);
  };

  const filteredBatches = batches.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 anime-radial-bg rounded-3xl p-1">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 anime-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-md animate-energy-pulse">
              <Plus className="w-5 h-5 text-white" />
            </div>
            Add New Batch
          </h2>
          <button
            onClick={() => { setBulkOpen(!bulkOpen); setBulkResult(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </button>
        </div>

        {bulkOpen && (
          <div className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <p className="text-sm font-medium text-slate-700">Bulk Upload Batches (CSV / Excel / Google Sheet)</p>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Format: <code className="bg-slate-200 px-1 rounded">name</code> — one per line. Header row optional.
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                onChange={handleFileUpload}
                className="block flex-1 text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-sm file:font-medium hover:file:bg-blue-700"
              />
              <button
                onClick={handleGoogleSheetLink}
                disabled={bulkUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors whitespace-nowrap"
              >
                <LinkIcon className="w-4 h-4" />
                Google Sheet
              </button>
            </div>
            <textarea
              placeholder="name&#10;CS-2023&#10;EE-2024&#10;ME-2025"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {bulkResult && (
              <div className={`mt-3 p-3 rounded-lg text-sm ${bulkResult.errors.length > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                <p className="font-medium">Added {bulkResult.added} batch{bulkResult.added !== 1 ? 'es' : ''}.</p>
                {bulkResult.errors.length > 0 && (
                  <ul className="mt-1 text-xs">
                    {bulkResult.errors.map((err, i) => <li key={i}>• {err}</li>)}
                  </ul>
                )}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleBulkUpload}
                disabled={bulkUploading || !bulkText.trim()}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 disabled:opacity-50"
              >
                {bulkUploading ? 'Uploading...' : 'Upload'}
              </button>
              <button
                onClick={() => { setBulkOpen(false); setBulkText(''); setBulkResult(null); }}
                className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Batch name (e.g., CS-2023)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addBatch()}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={addBatch}
            disabled={saving || !name.trim()}
            className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Adding...' : 'Add Batch'}
          </button>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 anime-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <AnimeMascot variant="student" color="cyan" size={44} pointing="right" />
            <h2 className="text-base font-bold text-slate-900">
              All Batches ({batches.length})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search batches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 anime-input" />
            </div>
            {batches.length > 0 && (
              <button
                onClick={() => setConfirmDeleteAll(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </button>
            )}
          </div>
        </div>
        {confirmDeleteAll && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
            <p className="text-sm text-red-700 font-medium">
              Delete ALL {batches.length} batches? This also deletes their load entries.
            </p>
            <div className="flex gap-2">
              <button
                onClick={deleteAllBatches}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
              >
                Yes, Delete All
              </button>
              <button
                onClick={() => setConfirmDeleteAll(false)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {batches.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <AnimeMascot variant="student" color="cyan" size={80} pointing="up" message="Add your first batch!" />
            <p className="text-slate-500 mt-3">No batches added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
            {filteredBatches.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/60 hover:border-slate-300 anime-card transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-md transition-transform duration-300 hover:scale-125 hover:rotate-6">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-medium text-slate-900">{b.name}</p>
                </div>
                <button
                  onClick={() => deleteBatch(b.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 hover:scale-110"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {filteredBatches.length === 0 && (
              <div className="col-span-full py-8 text-center">
                <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No batches match "{searchQuery}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ==================== ADD LOAD FORM ==================== */

function AddLoadForm({
  faculty,
  batches,
  existingLoads,
  onSaved,
  onOpenBulkModal,
}: {
  faculty: Faculty[];
  batches: Batch[];
  existingLoads: FacultyLoadWithDetails[];
  onSaved: () => void;
  onOpenBulkModal?: () => void;
}) {
  const [form, setForm] = useState({
    faculty_id: '',
    batch_ids: [] as string[],
    subject: '',
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '10:00',
    start_date: '',
    end_date: '',
    room: '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [subjectMode, setSubjectMode] = useState<'manual' | 'existing'>('manual');
  const existingSubjects = Array.from(new Set(existingLoads.map((l) => l.subject))).sort();

  const checkClash = () => {
    if (!form.faculty_id || form.batch_ids.length === 0 || !form.start_date || !form.end_date) {
      setWarnings([]);
      return;
    }
    const selectedFaculty = faculty.find((f) => f.id === form.faculty_id);
    if (!selectedFaculty) {
      setWarnings([]);
      return;
    }

    const newWarnings: string[] = [];
    for (const existing of existingLoads) {
      if (!dateRangeOverlap(form.start_date, form.end_date, existing.start_date, existing.end_date)) continue;
      if (!timeOverlap(form.start_time, form.end_time, existing.start_time, existing.end_time)) continue;

      if (form.faculty_id === existing.faculty_id && !form.batch_ids.includes(existing.batch_id)) {
        newWarnings.push(
          `Faculty clash: ${selectedFaculty.name} is already teaching batch ${existing.batch.name} at ${existing.start_time}-${existing.end_time} (${formatDate(existing.start_date)} to ${formatDate(existing.end_date)})`
        );
      }
      for (const bid of form.batch_ids) {
        const selectedBatch = batches.find((b) => b.id === bid);
        if (bid === existing.batch_id && form.faculty_id !== existing.faculty_id && selectedBatch) {
          newWarnings.push(
            `Batch clash: Batch ${selectedBatch.name} already has ${existing.faculty.name} at ${existing.start_time}-${existing.end_time} (${formatDate(existing.start_date)} to ${formatDate(existing.end_date)})`
          );
        }
      }
    }
    setWarnings(newWarnings);
  };

  useEffect(() => {
    checkClash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const handleSubmit = async () => {
    if (!form.faculty_id || form.batch_ids.length === 0 || !form.subject.trim() || !form.start_date || !form.end_date) return;
    setSaving(true);
    const records = form.batch_ids.map((bid) => ({
      faculty_id: form.faculty_id,
      batch_id: bid,
      subject: form.subject.trim(),
      day_of_week: 'Monday', // Routine daily schedule; stores valid day string for DB check constraint
      start_time: form.start_time,
      end_time: form.end_time,
      start_date: form.start_date,
      end_date: form.end_date,
      room: form.room.trim() || null,
    }));
    await supabase.from('faculty_loads').insert(records);
    setSaving(false);
    setSuccess(true);
    setForm({
      faculty_id: '',
      batch_ids: [],
      subject: '',
      day_of_week: 'Monday',
      start_time: '09:00',
      end_time: '10:00',
      start_date: '',
      end_date: '',
      room: '',
    });
    onSaved();
    setTimeout(() => setSuccess(false), 3000);
  };

  const isValid = form.faculty_id && form.batch_ids.length > 0 && form.subject.trim() && form.start_date && form.end_date;

  if (faculty.length === 0 || batches.length === 0) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-12 text-center anime-card anime-radial-bg">
        <AnimeMascot variant="alert" color="amber" size={100} pointing="up" message="Add faculty and batches first!" />
        <h2 className="text-lg font-bold text-slate-900 mb-2 mt-3">Setup Required</h2>
        <p className="text-slate-500">
          You need to add at least one faculty member and one batch before creating load entries.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 anime-radial-bg rounded-3xl p-1">
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 animate-bounce-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 animate-pulse" />
          <p className="text-emerald-800 font-medium">Load entries saved successfully!</p>
        </div>
      )}

      {/* Bulk Upload Feature Banner */}
      <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm anime-card">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-400 text-white flex items-center justify-center shrink-0 shadow-md mt-0.5">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Bulk Upload Loads via Excel / CSV</h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Upload a single sheet with loads for multiple faculties. Pre-filled sample template with dropdowns, preview, and clash checks included.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() =>
                  downloadSampleTemplate('xlsx', {
                    facultyList: faculty.map((f) => f.name),
                    subjectList: Array.from(new Set(existingLoads.map((l) => l.subject).filter(Boolean))),
                    batchList: batches.map((b) => b.name),
                  })
                }
                className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 hover:underline"
              >
                <Download className="w-3 h-3 text-emerald-600" />
                Download Sample Template (.xlsx)
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() =>
                  downloadSampleTemplate('csv', {
                    facultyList: faculty.map((f) => f.name),
                    subjectList: Array.from(new Set(existingLoads.map((l) => l.subject).filter(Boolean))),
                    batchList: batches.map((b) => b.name),
                  })
                }
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 hover:underline"
              >
                <Download className="w-3 h-3 text-blue-500" />
                Download Sample Template (.csv)
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenBulkModal}
          className="anime-btn flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-xs font-bold transition-all shadow-md shrink-0 whitespace-nowrap active:scale-95"
        >
          <Upload className="w-4 h-4" />
          Upload Sheet
        </button>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6 anime-card">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <AnimeMascot variant="sensei" color="blue" size={56} pointing="right" message="Fill in the schedule details!" />
            <h2 className="text-lg font-bold text-slate-900">Add Faculty Load Entry</h2>
          </div>
          <button
            type="button"
            onClick={onOpenBulkModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Bulk Upload Sheet
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Assign a faculty member to teach batches with schedule details.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Faculty */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Faculty Member</label>
            <select
              value={form.faculty_id}
              onChange={(e) => setForm({ ...form, faculty_id: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Select faculty...</option>
              {faculty.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.department})
                </option>
              ))}
            </select>
          </div>

          {/* Batch — Searchable Multi-select Dropdown */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Batches <span className="text-slate-400 font-normal">(select one or more)</span>
            </label>
            <MultiSelect
              items={batches}
              selectedIds={form.batch_ids}
              onChange={(ids) => setForm({ ...form, batch_ids: ids })}
              placeholder="Select batches..."
            />
            {form.batch_ids.length > 0 && (
              <p className="mt-1.5 text-xs text-blue-600">
                {form.batch_ids.length} batch{form.batch_ids.length > 1 ? 'es' : ''} selected — one load entry will be created per batch.
              </p>
            )}
          </div>

          {/* Subject */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setSubjectMode('manual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${subjectMode === 'manual' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Type New
              </button>
              <button
                type="button"
                onClick={() => setSubjectMode('existing')}
                disabled={existingSubjects.length === 0}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${subjectMode === 'existing' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                Select Existing{existingSubjects.length > 0 ? ` (${existingSubjects.length})` : ''}
              </button>
            </div>
            {subjectMode === 'manual' ? (
              <input
                type="text"
                placeholder="e.g., Data Structures, Calculus, etc."
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <select
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Select a subject...</option>
                {existingSubjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </div>

          {/* Room */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Room (optional)</label>
            <input
              type="text"
              placeholder="e.g., Room 101"
              value={form.room}
              onChange={(e) => setForm({ ...form, room: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Time</label>
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">End Time</label>
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">End Date</label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Clash Warnings */}
        {warnings.length > 0 && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="font-semibold text-red-900">Clash Detected!</p>
            </div>
            <ul className="space-y-1.5">
              {warnings.map((w, i) => (
                <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-red-600 mt-3">
              You can still save this entry, but please review the conflict.
            </p>
          </div>
        )}

        {warnings.length === 0 && isValid && form.start_date && form.end_date && (
          <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <p className="text-sm text-emerald-700">No clashes detected for this schedule.</p>
          </div>
        )}

        {/* Submit */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!isValid || saving}
            className="anime-btn px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-bold hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Load Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==================== SEARCH VIEW ==================== */

type SearchCard = {
  key: string;
  loadIds: string[];
  faculty_id: string;
  faculty_name: string;
  department: string;
  subject: string;
  start_time: string;
  end_time: string;
  start_date: string;
  end_date: string;
  day_of_week: string;
  room: string | null;
  batchNames: string[];
};

function SearchView({
  loads,
  faculty,
  batches,
  batchManagers,
  onDelete,
}: {
  loads: FacultyLoadWithDetails[];
  faculty: Faculty[];
  batches: Batch[];
  batchManagers: LoadBatchManager[];
  onDelete: () => void;
}) {
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [searchFaculty, setSearchFaculty] = useState('');
  const [searchSubject, setSearchSubject] = useState('');
  const [searchBatch, setSearchBatch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'running' | 'expired'>('all');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    subject: '', start_time: '', end_time: '', start_date: '', end_date: '', room: '', day_of_week: 'Monday',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [bmModalKey, setBmModalKey] = useState<string | null>(null);
  const [bmForm, setBmForm] = useState({ bm_name: '', bm_phone: '', start_date: '', end_date: '' });
  const [bmSaving, setBmSaving] = useState(false);
  const [editingBmId, setEditingBmId] = useState<string | null>(null);

  const deleteCard = async (card: SearchCard) => {
    setDeletingKey(card.key);
    await supabase.from('faculty_loads').delete().in('id', card.loadIds);
    setDeletingKey(null);
    onDelete();
  };

  const startEdit = (card: SearchCard) => {
    setEditingKey(card.key);
    setEditForm({
      subject: card.subject,
      start_time: card.start_time,
      end_time: card.end_time,
      start_date: card.start_date,
      end_date: card.end_date,
      room: card.room || '',
      day_of_week: card.day_of_week,
    });
  };

  const saveEdit = async (card: SearchCard) => {
    setSavingEdit(true);
    await supabase.from('faculty_loads').update({
      subject: editForm.subject.trim(),
      start_time: editForm.start_time,
      end_time: editForm.end_time,
      start_date: editForm.start_date,
      end_date: editForm.end_date,
      room: editForm.room.trim() || null,
      day_of_week: editForm.day_of_week,
    }).in('id', card.loadIds);
    setSavingEdit(false);
    setEditingKey(null);
    onDelete();
  };

  const openBmModal = (card: SearchCard) => {
    setBmModalKey(card.key);
    setEditingBmId(null);
    setBmForm({ bm_name: '', bm_phone: '', start_date: card.start_date, end_date: card.end_date });
  };

  const closeBmModal = () => {
    setBmModalKey(null);
    setEditingBmId(null);
    setBmForm({ bm_name: '', bm_phone: '', start_date: '', end_date: '' });
  };

  const saveBm = async (card: SearchCard) => {
    if (!bmForm.bm_name.trim() || !bmForm.start_date || !bmForm.end_date) return;
    setBmSaving(true);
    if (editingBmId) {
      await supabase.from('load_batch_managers').update({
        bm_name: bmForm.bm_name.trim(),
        bm_phone: bmForm.bm_phone.trim() || null,
        start_date: bmForm.start_date,
        end_date: bmForm.end_date,
      }).eq('id', editingBmId);
    } else {
      const rows = card.loadIds.map(loadId => ({
        load_id: loadId,
        bm_name: bmForm.bm_name.trim(),
        bm_phone: bmForm.bm_phone.trim() || null,
        start_date: bmForm.start_date,
        end_date: bmForm.end_date,
      }));
      await supabase.from('load_batch_managers').insert(rows);
    }
    setBmSaving(false);
    closeBmModal();
    onDelete();
  };

  const editBm = (bm: LoadBatchManager, card: SearchCard) => {
    setEditingBmId(bm.id);
    setBmForm({ bm_name: bm.bm_name, bm_phone: bm.bm_phone || '', start_date: bm.start_date, end_date: bm.end_date });
    setBmModalKey(card.key);
  };

  const deleteBm = async (bmId: string) => {
    await supabase.from('load_batch_managers').delete().eq('id', bmId);
    onDelete();
  };

  const filtered = loads.filter((load) => {
    if (searchFaculty && load.faculty_id !== searchFaculty) return false;
    if (searchSubject && load.subject !== searchSubject) return false;
    if (searchBatch && load.batch_id !== searchBatch) return false;
    if (statusFilter !== 'all') {
      const status = getLoadStatus(load.start_date, load.end_date);
      if (status !== statusFilter) return false;
    }
    return true;
  });

  // Group by faculty + subject + time + date so multi-batch entries become one card
  const cards: SearchCard[] = (() => {
    const map = new Map<string, SearchCard>();
    for (const load of filtered) {
      const key = `${load.faculty_id}-${load.subject}-${load.start_time}-${load.end_time}-${load.start_date}-${load.end_date}`;
      const existing = map.get(key);
      if (existing) {
        if (!existing.batchNames.includes(load.batch.name)) existing.batchNames.push(load.batch.name);
        if (!existing.loadIds.includes(load.id)) existing.loadIds.push(load.id);
      } else {
        map.set(key, {
          key,
          loadIds: [load.id],
          faculty_id: load.faculty_id,
          faculty_name: load.faculty.name,
          department: load.faculty.department,
          subject: load.subject,
          start_time: load.start_time,
          end_time: load.end_time,
          start_date: load.start_date,
          end_date: load.end_date,
          day_of_week: load.day_of_week,
          room: load.room,
          batchNames: [load.batch.name],
        });
      }
    }
    return Array.from(map.values());
  })();

  const totalHours = (() => {
    let sum = 0;
    for (const card of cards) {
      const [sh, sm] = card.start_time.split(':').map(Number);
      const [eh, em] = card.end_time.split(':').map(Number);
      sum += (eh * 60 + em - sh * 60 - sm) / 60;
    }
    return sum;
  })();

  const subjectOptions = Array.from(new Set(loads.map((load) => load.subject))).sort((a, b) => a.localeCompare(b));
  const hasFilters = searchFaculty || searchSubject || searchBatch || statusFilter !== 'all';

  const statusStyles: Record<string, string> = {
    running: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    expired: 'bg-slate-200 text-slate-600',
  };

  const headerBg: Record<string, string> = {
    running: 'bg-emerald-50',
    pending: 'bg-amber-50',
    expired: 'bg-slate-50',
  };

  return (
    <div className="space-y-6 anime-radial-bg rounded-3xl p-1">
      {/* Filters */}
      <div className="search-filter-card relative z-20 bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6 anime-card">
        <div className="flex items-center gap-3 mb-4">
          <AnimeMascot variant="search" color="blue" size={48} pointing="right" message="Filter and find loads!" />
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Search & Filter
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Faculty</label>
            <ScrollableSelect
              value={searchFaculty}
              onChange={setSearchFaculty}
              placeholder="All Faculty"
              options={faculty.map((f) => ({ value: f.id, label: f.name }))}
              maxItems={10}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
            <ScrollableSelect
              value={searchSubject}
              onChange={setSearchSubject}
              placeholder="All Subjects"
              options={subjectOptions.map((subject) => ({ value: subject, label: subject }))}
              maxItems={10}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Batch</label>
            <ScrollableSelect
              value={searchBatch}
              onChange={setSearchBatch}
              placeholder="All Batches"
              options={batches.map((b) => ({ value: b.id, label: b.name }))}
              maxItems={10}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <ScrollableSelect
              value={statusFilter !== 'all' ? statusFilter : ''}
              onChange={(v) => setStatusFilter((v || 'all') as 'all' | 'pending' | 'running' | 'expired')}
              placeholder="All Status"
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'running', label: 'Running' },
                { value: 'expired', label: 'Expired' },
              ]}
              maxItems={10}
            />
          </div>
        </div>

        {hasFilters && (
          <button
            onClick={() => {
              setSearchFaculty('');
              setSearchSubject('');
              setSearchBatch('');
              setStatusFilter('all');
            }}
            className="mt-3 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
            Clear filters
          </button>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center gap-4 flex-wrap">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{cards.length}</span> card{cards.length === 1 ? '' : 's'} found
        </p>
        <span className="text-slate-300">|</span>
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{totalHours.toFixed(1)}</span> total teaching hours
        </p>
      </div>

      {/* Results - Individual Cards */}
      {cards.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-12 text-center anime-card">
          <AnimeMascot variant="search" color="blue" size={80} pointing="up" message="No results found!" />
          <p className="text-slate-500 mt-3">No results found. Try adjusting your filters or add a new load entry.</p>
          <p className="text-slate-400 text-sm mt-1">Each load entry you save gets its own card here.</p>
        </div>
      ) : (
        <div className="space-y-3 animate-card-stagger">
          {cards.map((card) => {
            const status = getLoadStatus(card.start_date, card.end_date);
            const isEditing = editingKey === card.key;
            const isDeleting = deletingKey === card.key;
            return (
              <div key={card.key} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 overflow-hidden anime-card">
                {/* Card Header */}
                <div className={`px-6 py-3 flex items-center justify-between anime-header-bar ${headerBg[status]}`}>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-bold text-slate-900">{card.faculty_name}</span>
                    <span className="text-xs text-slate-500">({card.department})</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusStyles[status]} anime-badge`}>
                      {status === 'running' ? 'Running' : status === 'pending' ? 'Pending' : 'Expired'}
                    </span>
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(card)}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 hover:scale-125 hover:rotate-6"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteCard(card)}
                        disabled={isDeleting}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 hover:scale-125 hover:rotate-6 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-6">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
                          <input
                            type="text"
                            placeholder="Subject"
                            value={editForm.subject}
                            onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Start Time</label>
                          <input
                            type="time"
                            value={editForm.start_time}
                            onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">End Time</label>
                          <input
                            type="time"
                            value={editForm.end_time}
                            onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={editForm.start_date}
                            onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
                          <input
                            type="date"
                            value={editForm.end_date}
                            onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-slate-600 mb-1">Room</label>
                          <input
                            type="text"
                            placeholder="Room"
                            value={editForm.room}
                            onChange={(e) => setEditForm({ ...editForm, room: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(card)}
                          disabled={savingEdit}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                          {savingEdit ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={() => setEditingKey(null)}
                          className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center transition-transform duration-300 hover:scale-125 hover:rotate-6">
                          <BookOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{card.subject}</p>
                          <p className="text-sm text-slate-500">
                            {card.start_time}-{card.end_time}
                            {card.room && ` • ${card.room}`}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                          <p className="text-xs text-slate-500 mb-0.5">Start Date</p>
                          <p className="text-sm font-bold text-slate-900">{formatDate(card.start_date)}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                          <p className="text-xs text-slate-500 mb-0.5">End Date</p>
                          <p className="text-sm font-bold text-slate-900">{formatDate(card.end_date)}</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <p className="text-xs font-bold text-slate-500 mb-1">
                          Batches ({card.batchNames.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {card.batchNames.map((bn, i) => (
                            <span key={i} style={{ animationDelay: `${i * 50}ms` }} className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-bold animate-pop-in anime-badge">
                              {bn}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Batch Manager Section */}
                      <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-blue-200 anime-glow-blue">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                            <Users className="w-4 h-4" />
                            Batch Manager (BM)
                          </p>
                          <button
                            onClick={() => openBmModal(card)}
                            className="anime-btn flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add BM
                          </button>
                        </div>
                        {(() => {
                          const allBms = batchManagers.filter(bm => card.loadIds.includes(bm.load_id));
                          const seenBm = new Set<string>();
                          const cardBms = allBms.filter(bm => {
                            const key = `${bm.bm_name}|${bm.start_date}|${bm.end_date}`;
                            if (seenBm.has(key)) return false;
                            seenBm.add(key);
                            return true;
                          });
                          if (cardBms.length === 0) {
                            return (
                              <p className="text-xs text-slate-500 italic">No batch manager assigned yet.</p>
                            );
                          }
                          return (
                            <div className="space-y-2">
                              {cardBms.map((bm) => {
                                const bmStatus = getLoadStatus(bm.start_date, bm.end_date);
                                return (
                                  <div key={bm.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-semibold text-xs">
                                        {bm.bm_name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-slate-900">{bm.bm_name}</p>
                                        {bm.bm_phone && (
                                          <p className="text-xs text-blue-600">{bm.bm_phone}</p>
                                        )}
                                        <p className="text-xs text-slate-500">
                                          {formatDate(bm.start_date)} — {formatDate(bm.end_date)}
                                        </p>
                                      </div>
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        bmStatus === 'running' ? 'bg-emerald-100 text-emerald-700'
                                          : bmStatus === 'pending' ? 'bg-amber-100 text-amber-700'
                                          : 'bg-slate-200 text-slate-600'
                                      }`}>
                                        {bmStatus === 'running' ? 'Active' : bmStatus === 'pending' ? 'Upcoming' : 'Past'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => editBm(bm, card)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => deleteBm(bm.id)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BM Modal */}
      {bmModalKey && cards.find(c => c.key === bmModalKey) && (
        (() => {
          const card = cards.find(c => c.key === bmModalKey)!;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeBmModal} />
              <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl w-full max-w-md p-6 animate-bounce-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <AnimeMascot variant="student" color="blue" size={40} pointing="right" />
                    {editingBmId ? 'Edit Batch Manager' : 'Add Batch Manager'}
                  </h3>
                  <button onClick={closeBmModal} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-all duration-200 hover:scale-125 hover:rotate-90">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Class: {card.subject} • {card.faculty_name} • {formatDate(card.start_date)} — {formatDate(card.end_date)}
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">BM Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Aman"
                      value={bmForm.bm_name}
                      onChange={(e) => setBmForm({ ...bmForm, bm_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">BM Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={bmForm.bm_phone}
                      onChange={(e) => setBmForm({ ...bmForm, bm_phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">From Date</label>
                      <input
                        type="date"
                        value={bmForm.start_date}
                        onChange={(e) => setBmForm({ ...bmForm, start_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">To Date</label>
                      <input
                        type="date"
                        value={bmForm.end_date}
                        onChange={(e) => setBmForm({ ...bmForm, end_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    The BM will be shown as managing this class from the From Date to the To Date.
                  </p>
                </div>
                <div className="flex gap-2 mt-5">
                  <button
                    onClick={() => saveBm(card)}
                    disabled={bmSaving || !bmForm.bm_name.trim() || !bmForm.start_date || !bmForm.end_date}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {bmSaving ? 'Saving...' : editingBmId ? 'Update BM' : 'Add BM'}
                  </button>
                  <button
                    onClick={closeBmModal}
                    className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}

/* ==================== DATE ALERTS ==================== */

type DateAlert = {
  load: FacultyLoadWithDetails;
  type: 'starting' | 'ending';
  date: string;
  daysUntil: number;
  batchNames: string[];
};

function detectDateAlerts(loads: FacultyLoadWithDetails[]): DateAlert[] {
  const groups = new Map<string, { load: FacultyLoadWithDetails; batchNames: string[] }>();
  for (const load of loads) {
    const startKey = `start-${load.faculty_id}-${load.subject}-${load.start_time}-${load.end_time}-${load.start_date}-${load.end_date}`;
    const endKey = `end-${load.faculty_id}-${load.subject}-${load.start_time}-${load.end_time}-${load.start_date}-${load.end_date}`;
    for (const key of [startKey, endKey]) {
      if (!groups.has(key)) {
        groups.set(key, { load, batchNames: [load.batch.name] });
      } else {
        const g = groups.get(key)!;
        if (!g.batchNames.includes(load.batch.name)) {
          g.batchNames.push(load.batch.name);
        }
      }
    }
  }

  const alerts: DateAlert[] = [];
  for (const [key, group] of groups) {
    const isStart = key.startsWith('start-');
    const date = isStart ? group.load.start_date : group.load.end_date;
    const days = daysUntil(date);
    if (days >= 0 && days <= 3) {
      alerts.push({
        load: group.load,
        type: isStart ? 'starting' : 'ending',
        date,
        daysUntil: days,
        batchNames: group.batchNames,
      });
    }
  }
  alerts.sort((a, b) => a.daysUntil - b.daysUntil);
  return alerts;
}

/* ==================== CLASH DETECTION ==================== */

type ClashAlert = {
  load1: FacultyLoadWithDetails;
  load2: FacultyLoadWithDetails;
  type: 'faculty' | 'batch';
  message: string;
};

function detectClashes(loads: FacultyLoadWithDetails[]): ClashAlert[] {
  const clashes: ClashAlert[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < loads.length; i++) {
    for (let j = i + 1; j < loads.length; j++) {
      const a = loads[i];
      const b = loads[j];

      if (!dateRangeOverlap(a.start_date, a.end_date, b.start_date, b.end_date)) continue;
      if (!timeOverlap(a.start_time, a.end_time, b.start_time, b.end_time)) continue;

      if (a.faculty_id === b.faculty_id && a.batch_id !== b.batch_id && a.subject !== b.subject) {
        const key = `faculty-${a.id}-${b.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          clashes.push({
            load1: a,
            load2: b,
            type: 'faculty',
            message: `Faculty "${a.faculty.name}" has overlapping classes in batch ${a.batch.name} and ${b.batch.name} (${a.start_time}-${a.end_time} vs ${b.start_time}-${b.end_time}) between ${formatDate(a.start_date)} and ${formatDate(a.end_date)}`,
          });
        }
      }

      if (a.batch_id === b.batch_id && a.faculty_id !== b.faculty_id) {
        const key = `batch-${a.id}-${b.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          clashes.push({
            load1: a,
            load2: b,
            type: 'batch',
            message: `Batch "${a.batch.name}" has overlapping classes by ${a.faculty.name} and ${b.faculty.name} (${a.start_time}-${a.end_time} vs ${b.start_time}-${b.end_time}) between ${formatDate(a.start_date)} and ${formatDate(a.end_date)}`,
          });
        }
      }
    }
  }

  return clashes;
}

/* ==================== CLASH VIEW ==================== */

function ClashView({ clashes }: { clashes: ReturnType<typeof detectClashes> }) {
  if (clashes.length === 0) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-12 text-center anime-card anime-radial-bg">
        <AnimeMascot variant="clash" color="emerald" size={100} pointing="up" message="All clear! No clashes!" />
        <h2 className="text-lg font-bold text-slate-900 mb-2 mt-3">No Clashes Detected</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          All schedules are clean. No faculty or batch has overlapping classes at the same time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 anime-radial-bg rounded-3xl p-1">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 anime-glow-red animate-bounce-in">
        <AnimeMascot variant="clash" color="red" size={56} pointing="right" message="Fix these clashes!" />
        <div>
          <p className="font-bold text-red-900">
            {clashes.length} clash{clashes.length > 1 ? 'es' : ''} detected
          </p>
          <p className="text-sm text-red-700">
            These schedules overlap. Review and adjust times or dates to resolve conflicts.
          </p>
        </div>
      </div>

      {clashes.map((clash, idx) => (
        <div
          key={idx}
          className={`bg-white/90 backdrop-blur-sm rounded-2xl border-2 overflow-hidden anime-card animate-impact ${
            clash.type === 'faculty' ? 'border-red-300' : 'border-amber-300'
          }`}
        >
          <div
            className={`anime-header-bar px-6 py-3 flex items-center gap-2 ${
              clash.type === 'faculty' ? 'bg-red-50' : 'bg-amber-50'
            }`}
          >
            {clash.type === 'faculty' ? (
              <GraduationCap className="w-5 h-5 text-red-600" />
            ) : (
              <Users className="w-5 h-5 text-amber-600" />
            )}
            <span
              className={`text-sm font-semibold ${
                clash.type === 'faculty' ? 'text-red-900' : 'text-amber-900'
              }`}
            >
              {clash.type === 'faculty' ? 'Faculty Time Clash' : 'Batch Time Clash'}
            </span>
          </div>

          <div className="p-6">
            <p className="text-sm text-slate-700 mb-4">{clash.message}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[clash.load1, clash.load2].map((load, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                  <p className="font-medium text-slate-900 mb-2">{load.subject}</p>
                  <div className="space-y-1 text-sm text-slate-600">
                    <p className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-slate-400" />
                      {load.faculty.name}
                    </p>
                    <p className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      {load.batch.name}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {load.start_time}-{load.end_time}
                    </p>
                    <p className="flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-slate-400" />
                      {formatDate(load.start_date)} to {formatDate(load.end_date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ==================== ALERTS VIEW ==================== */

function AlertsView({
  alerts,
  onChange,
}: {
  alerts: DateAlert[];
  onChange: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'starting' | 'ending'>('all');

  const startEdit = (alert: DateAlert) => {
    setEditingId(alert.load.id);
    setEditForm({ start_date: alert.load.start_date, end_date: alert.load.end_date });
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    await supabase.from('faculty_loads').update({
      start_date: editForm.start_date,
      end_date: editForm.end_date,
    }).eq('id', id);
    setSaving(false);
    setEditingId(null);
    onChange();
  };

  const deleteLoad = async (id: string) => {
    setDeletingId(id);
    await supabase.from('faculty_loads').delete().eq('id', id);
    setDeletingId(null);
    onChange();
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filterType !== 'all' && alert.type !== filterType) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      alert.load.subject.toLowerCase().includes(q) ||
      alert.load.faculty.name.toLowerCase().includes(q) ||
      alert.load.day_of_week.toLowerCase().includes(q) ||
      alert.batchNames.some((bn) => bn.toLowerCase().includes(q)) ||
      (alert.load.room || '').toLowerCase().includes(q)
    );
  });

  if (alerts.length === 0) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-12 text-center anime-card anime-radial-bg">
        <AnimeMascot variant="alert" color="emerald" size={100} pointing="up" message="All caught up!" />
        <h2 className="text-lg font-bold text-slate-900 mb-2 mt-3">No Upcoming Date Alerts</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          No classes are starting or ending within the next 3 days. You're all caught up!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 anime-radial-bg rounded-3xl p-1">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 anime-glow-amber animate-bounce-in">
        <AnimeMascot variant="alert" color="amber" size={56} pointing="right" message="Check these dates!" />
        <div>
          <p className="font-bold text-amber-900">
            {alerts.length} date alert{alerts.length > 1 ? 's' : ''} — classes starting or ending within 3 days
          </p>
          <p className="text-sm text-amber-700">
            Review and adjust dates as needed. You can edit or delete entries directly from here.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 anime-card">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by subject, faculty, batch, day, room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 anime-input"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200 hover:scale-110">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {([
              { id: 'all' as const, label: 'All' },
              { id: 'starting' as const, label: 'Starting' },
              { id: 'ending' as const, label: 'Ending' },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`anime-tab px-3 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                  filterType === tab.id
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 hover:scale-105'
                    : 'bg-white/80 border border-slate-200/60 text-slate-600 hover:bg-white hover:scale-105'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {(searchQuery || filterType !== 'all') && (
          <p className="text-xs text-slate-500 mt-2 font-medium">
            Showing {filteredAlerts.length} of {alerts.length} alerts
          </p>
        )}
      </div>

      <div className="space-y-3 animate-card-stagger">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-12 text-center anime-card">
            <AnimeMascot variant="search" color="amber" size={80} pointing="up" message="No matching alerts!" />
            <p className="text-slate-500 mt-3">No alerts match your search. Try different keywords.</p>
          </div>
        ) : (
          <>
        {filteredAlerts.map((alert, idx) => {
          const isStarting = alert.type === 'starting';
          const isEditing = editingId === alert.load.id;
          return (
            <div key={`${alert.type}-${alert.load.id}-${idx}`} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 overflow-hidden anime-card">
              <div className={`anime-header-bar px-6 py-3 flex items-center justify-between ${isStarting ? 'bg-blue-50' : 'bg-amber-50'}`}>
                <div className="flex items-center gap-2">
                  {isStarting ? (
                    <CalendarClock className="w-5 h-5 text-blue-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  )}
                  <span className={`text-sm font-bold ${isStarting ? 'text-blue-900' : 'text-amber-900'}`}>
                    {isStarting ? 'Class Starting Soon' : 'Class Ending Soon'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold anime-badge ${
                    alert.daysUntil === 0
                      ? 'bg-red-100 text-red-700'
                      : isStarting
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}>
                    {alert.daysUntil === 0 ? 'Today!' : `in ${alert.daysUntil} day${alert.daysUntil > 1 ? 's' : ''}`}
                  </span>
                </div>
                {!isEditing && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(alert)}
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 hover:scale-125 hover:rotate-6"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteLoad(alert.load.id)}
                      disabled={deletingId === alert.load.id}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 hover:scale-125 hover:rotate-6 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center transition-transform duration-300 hover:scale-125 hover:rotate-6">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{alert.load.subject}</p>
                    <p className="text-sm text-slate-500">
                      {alert.load.faculty.name} • {alert.load.start_time}-{alert.load.end_time}
                    </p>
                  </div>
                </div>

                {alert.batchNames.length > 1 && (
                  <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 mb-1">Batches ({alert.batchNames.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {alert.batchNames.map((bn, i) => (
                        <span key={i} style={{ animationDelay: `${i * 50}ms` }} className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-bold animate-pop-in anime-badge">
                          {bn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={editForm.start_date}
                          onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
                        <input
                          type="date"
                          value={editForm.end_date}
                          onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(alert.load.id)}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                      <p className="text-xs text-slate-500 mb-0.5">Start Date</p>
                      <p className="text-sm font-medium text-slate-900">{formatDate(alert.load.start_date)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                      <p className="text-xs text-slate-500 mb-0.5">End Date</p>
                      <p className="text-sm font-medium text-slate-900">{formatDate(alert.load.end_date)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
          </>
        )}
      </div>
    </div>
  );
}

/* ==================== HELPERS ==================== */

function parseSheetText(text: string): string[][] {
  return parseCSV(text);
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    rows.push(cells);
  }
  return rows;
}

function dateRangeOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const d1s = new Date(s1).getTime();
  const d1e = new Date(e1).getTime();
  const d2s = new Date(s2).getTime();
  const d2e = new Date(e2).getTime();
  return d1s <= d2e && d2s <= d1e;
}

function timeOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  return toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getLoadStatus(startDate: string, endDate: string): 'pending' | 'running' | 'expired' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const s = new Date(startDate);
  s.setHours(0, 0, 0, 0);
  const e = new Date(endDate);
  e.setHours(0, 0, 0, 0);
  if (today < s) return 'pending';
  if (today > e) return 'expired';
  return 'running';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.toLocaleDateString('en-GB', { day: '2-digit' });
  const month = d.toLocaleDateString('en-GB', { month: 'short' });
  const year = d.toLocaleDateString('en-GB', { year: 'numeric' });
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
  return `${day} ${month} ${year}, ${weekday}`;
}

function mapColumns(
  rows: string[][],
  fieldMap: Record<string, string[]>
): { headerMap: Record<string, number | null>; dataRows: string[][] } {
  const headerMap: Record<string, number | null> = {};
  if (rows.length === 0) return { headerMap, dataRows: rows };
  const firstRow = rows[0].map(c => c.toLowerCase().trim());
  let hasHeader = false;
  for (const [field, aliases] of Object.entries(fieldMap)) {
    let foundIdx: number | null = null;
    for (let i = 0; i < firstRow.length; i++) {
      if (aliases.includes(firstRow[i])) {
        foundIdx = i;
        hasHeader = true;
        break;
      }
    }
    headerMap[field] = foundIdx;
  }
  const dataRows = hasHeader ? rows.slice(1) : rows;
  return { headerMap, dataRows };
}

function groupMailTracker(loads: FacultyLoadWithDetails[]): MailTrackerGroup[] {
  const groups = new Map<string, MailTrackerGroup>();
  for (const load of loads) {
    const key = `${load.faculty_id}-${load.subject}-${load.start_time}-${load.end_time}-${load.start_date}-${load.end_date}`;
    const existing = groups.get(key);
    if (existing) {
      if (!existing.batchNames.includes(load.batch.name)) existing.batchNames.push(load.batch.name);
      if (!existing.loadIds.includes(load.id)) existing.loadIds.push(load.id);
      if (!load.start_mail_sent) existing.allMailed = false;
    } else {
      groups.set(key, {
        faculty_id: load.faculty_id,
        faculty_name: load.faculty.name,
        department: load.faculty.department,
        subject: load.subject,
        start_time: load.start_time,
        end_time: load.end_time,
        start_date: load.start_date,
        end_date: load.end_date,
        day_of_week: load.day_of_week,
        room: load.room,
        batchNames: [load.batch.name],
        loadIds: [load.id],
        allMailed: load.start_mail_sent,
      });
    }
  }
  return Array.from(groups.values());
}

/* ==================== MAIL TRACKER VIEW ==================== */

function exportToExcel(
  loads: FacultyLoadWithDetails[],
  faculty: Faculty[],
  selectedFacultyIds: string[]
) {
  const targetFaculty = selectedFacultyIds.length > 0
    ? faculty.filter(f => selectedFacultyIds.includes(f.id))
    : faculty;

  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData: (string | number)[][] = [['Faculty Name', 'Category', 'Branch', 'Pending', 'Running', 'Expired', 'Total Loads']];
  for (const fac of targetFaculty) {
    const facLoads = loads.filter(l => l.faculty_id === fac.id);
    const pending = facLoads.filter(l => getLoadStatus(l.start_date, l.end_date) === 'pending').length;
    const running = facLoads.filter(l => getLoadStatus(l.start_date, l.end_date) === 'running').length;
    const expired = facLoads.filter(l => getLoadStatus(l.start_date, l.end_date) === 'expired').length;
    summaryData.push([fac.name, fac.department, fac.department, pending, running, expired, facLoads.length]);
  }
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  // Per-faculty sub-sheets
  for (const fac of targetFaculty) {
    const facLoads = loads.filter(l => l.faculty_id === fac.id);
    const data: (string | number)[][] = [['Subject', 'Batch', 'Day', 'Start Time', 'End Time', 'Start Date', 'End Date', 'Room', 'Status']];
    for (const load of facLoads) {
      const status = getLoadStatus(load.start_date, load.end_date);
      data.push([
        load.subject,
        load.batch.name,
        load.day_of_week,
        load.start_time,
        load.end_time,
        formatDate(load.start_date),
        formatDate(load.end_date),
        load.room || '',
        status === 'running' ? 'Running' : status === 'pending' ? 'Pending' : 'Expired',
      ]);
    }
    if (facLoads.length === 0) {
      data.push(['No load entries', '', '', '', '', '', '', '', '']);
    }
    const sheetName = fac.name.substring(0, 28).replace(/[\\\/\?\*\[\]:]/g, '_');
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Faculty');
  }

  XLSX.writeFile(wb, `faculty_load_export_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function MailTrackerView({
  groups,
  onChange,
}: {
  groups: MailTrackerGroup[];
  onChange: () => void;
}) {
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [mailTab, setMailTab] = useState<'all' | 'sent' | 'pending'>('all');

  const markMailed = async (group: MailTrackerGroup) => {
    setMarkingId(group.loadIds.join(','));
    await supabase
      .from('faculty_loads')
      .update({ start_mail_sent: true })
      .in('id', group.loadIds);
    setMarkingId(null);
    onChange();
  };

  const markAllMailed = async () => {
    setMarkingAll(true);
    const pendingIds = groups.filter(g => !g.allMailed).flatMap(g => g.loadIds);
    if (pendingIds.length > 0) {
      await supabase
        .from('faculty_loads')
        .update({ start_mail_sent: true })
        .in('id', pendingIds);
    }
    setMarkingAll(false);
    onChange();
  };

  if (groups.length === 0) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-12 text-center anime-card anime-radial-bg">
        <AnimeMascot variant="mail" color="blue" size={100} pointing="up" message="No mail entries yet!" />
        <h2 className="text-lg font-bold text-slate-900 mb-2 mt-3">No Mail Entries</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          No faculty load entries found. Add load entries first to track start-date mails.
        </p>
      </div>
    );
  }

  const pending = groups.filter(g => !g.allMailed);
  const mailed = groups.filter(g => g.allMailed);
  const visibleGroups = mailTab === 'all' ? groups : mailTab === 'sent' ? mailed : pending;

  return (
    <div className="space-y-6 anime-radial-bg rounded-3xl p-1">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 flex items-center justify-between anime-card">
        <div className="flex items-center gap-4">
          <AnimeMascot variant="mail" color="blue" size={44} pointing="right" message="Track your mails here!" />
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-slate-900">{pending.length} Pending</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-2">
            <MailCheck className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-slate-900">{mailed.length} Mailed</span>
          </div>
        </div>
        {pending.length > 0 && (
          <button
            onClick={markAllMailed}
            disabled={markingAll}
            className="anime-btn px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-bold hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 disabled:opacity-50 hover:scale-105 active:scale-95"
          >
            {markingAll ? 'Marking...' : 'Mark All as Mailed'}
          </button>
        )}
      </div>

      {/* Mail Tabs */}
      <div className="flex gap-2">
        {([
          { id: 'all' as const, label: `All Mail (${groups.length})` },
          { id: 'sent' as const, label: `Mail Sent (${mailed.length})` },
          { id: 'pending' as const, label: `Mail Pending (${pending.length})` },
        ]).map((tab, idx) => (
          <button
            key={tab.id}
            style={{ animationDelay: `${idx * 80}ms` }}
            onClick={() => setMailTab(tab.id)}
            className={`anime-tab px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 animate-bounce-in ${
              mailTab === tab.id
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25 anime-glow-blue hover:scale-105'
                : 'bg-white/80 backdrop-blur-sm border border-slate-200/60 text-slate-600 hover:bg-white hover:scale-105'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3 animate-card-stagger">
        {visibleGroups.map((group, idx) => {
          const status = getLoadStatus(group.start_date, group.end_date);
          const isMarking = markingId === group.loadIds.join(',');
          return (
            <div
              key={idx}
              className={`bg-white/90 backdrop-blur-sm rounded-2xl border-2 overflow-hidden anime-card ${
                group.allMailed ? 'border-emerald-200' : 'border-slate-200/60'
              }`}
            >
              <div className={`anime-header-bar px-6 py-3 flex items-center justify-between ${
                group.allMailed ? 'bg-emerald-50' : 'bg-slate-50'
              }`}>
                <div className="flex items-center gap-2">
                  {group.allMailed ? (
                    <MailCheck className="w-5 h-5 text-emerald-600 animate-sparkle" />
                  ) : (
                    <Mail className="w-5 h-5 text-blue-600" />
                  )}
                  <span className={`text-sm font-bold ${
                    group.allMailed ? 'text-emerald-900' : 'text-slate-900'
                  }`}>
                    {group.allMailed ? 'Mail Sent' : 'Mail Pending'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold anime-badge ${
                    status === 'running' ? 'bg-emerald-100 text-emerald-700'
                      : status === 'pending' ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {status === 'running' ? 'Running' : status === 'pending' ? 'Pending' : 'Expired'}
                  </span>
                </div>
                {!group.allMailed && (
                  <button
                    onClick={() => markMailed(group)}
                    disabled={isMarking}
                    className="anime-btn px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold hover:shadow-lg transition-all duration-300 disabled:opacity-50 hover:scale-105 active:scale-95"
                  >
                    {isMarking ? 'Marking...' : 'Mark as Mailed'}
                  </button>
                )}
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center transition-transform duration-300 hover:scale-125 hover:rotate-6">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{group.subject}</p>
                    <p className="text-sm text-slate-500">
                      {group.faculty_name} ({group.department}) • {group.start_time}-{group.end_time}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                    <p className="text-xs text-slate-500 mb-0.5">Start Date</p>
                    <p className="text-sm font-bold text-slate-900">{formatDate(group.start_date)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                    <p className="text-xs text-slate-500 mb-0.5">End Date</p>
                    <p className="text-sm font-bold text-slate-900">{formatDate(group.end_date)}</p>
                  </div>
                  {group.room && (
                    <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                      <p className="text-xs text-slate-500 mb-0.5">Room</p>
                      <p className="text-sm font-bold text-slate-900">{group.room}</p>
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 mb-1">Batches ({group.batchNames.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.batchNames.map((bn, i) => (
                      <span key={i} style={{ animationDelay: `${i * 50}ms` }} className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-bold animate-pop-in anime-badge">
                        {bn}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
