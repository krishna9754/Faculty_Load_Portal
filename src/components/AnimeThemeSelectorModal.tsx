import React, { useState } from 'react';
import { ANIME_THEMES, type AnimeThemeId, type AnimeTheme } from '@/lib/animeThemes';
import { AnimeCharacterSVG } from '@/components/AnimeCharacterSVG';
import {
  X,
  Sparkles,
  CheckCircle2,
  Zap,
  Flame,
  Search,
  Palette,
  Sword,
  Shield,
  Star,
} from 'lucide-react';

interface AnimeThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId: AnimeThemeId;
  onSelectTheme: (themeId: AnimeThemeId) => void;
}

export function AnimeThemeSelectorModal({
  isOpen,
  onClose,
  currentThemeId,
  onSelectTheme,
}: AnimeThemeSelectorModalProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'shonen' | 'dark' | 'supernatural'>('all');

  if (!isOpen) return null;

  const themesList = Object.values(ANIME_THEMES);

  const filteredThemes = themesList.filter((theme) => {
    const matchesSearch =
      theme.name.toLowerCase().includes(search.toLowerCase()) ||
      theme.characterName.toLowerCase().includes(search.toLowerCase()) ||
      theme.japaneseTitle.includes(search) ||
      theme.series.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategory === 'shonen') {
      return ['naruto', 'dragon-ball', 'one-piece'].includes(theme.id);
    }
    if (selectedCategory === 'dark') {
      return ['solo-leveling', 'attack-on-titan', 'cyberpunk'].includes(theme.id);
    }
    if (selectedCategory === 'supernatural') {
      return ['jujutsu-kaisen', 'demon-slayer', 'solo-leveling'].includes(theme.id);
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl text-white overflow-hidden z-10 my-auto flex flex-col max-h-[90vh]">
        {/* Header with Anime Aesthetic */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-center justify-between overflow-hidden">
          {/* Background Watermark */}
          <div className="absolute right-12 top-1/2 -translate-y-1/2 text-7xl font-black text-white/[0.03] select-none pointer-events-none tracking-widest">
            ANIME THEMES
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-500/20 animate-energy-pulse">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">Select Anime Universe</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  8 Themes Available
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose your favorite character theme to customize the entire faculty portal!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="px-6 py-3.5 bg-slate-900/90 border-b border-slate-800/80 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search anime or character..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Universes' },
              { id: 'shonen', label: '🔥 Shonen Epic' },
              { id: 'dark', label: '⚔️ Dark Monarch' },
              { id: 'supernatural', label: '⚡ Supernatural' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredThemes.map((theme) => {
            const isSelected = theme.id === currentThemeId;
            return (
              <div
                key={theme.id}
                onClick={() => {
                  onSelectTheme(theme.id);
                  onClose();
                }}
                className={`group relative rounded-2xl border transition-all duration-300 p-4 cursor-pointer overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800/90 border-blue-500 shadow-xl'
                    : 'bg-slate-800/40 border-slate-700/70 hover:border-slate-500 hover:bg-slate-800/70'
                }`}
                style={{
                  boxShadow: isSelected ? theme.cardGlow : undefined,
                }}
              >
                {/* Active Indicator Badge */}
                {isSelected && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/50 text-blue-300 text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Equipped</span>
                  </div>
                )}

                <div>
                  <div className="flex items-start gap-3.5">
                    {/* Animated Character Avatar */}
                    <div
                      className="w-16 h-20 shrink-0 rounded-2xl flex items-center justify-center p-1 relative overflow-hidden transition-transform group-hover:scale-105"
                      style={{
                        background: `linear-gradient(135deg, ${theme.primaryColor}22, ${theme.secondaryColor}33)`,
                        border: `1px solid ${theme.primaryColor}55`,
                      }}
                    >
                      <AnimeCharacterSVG themeId={theme.id} size={56} showAura={false} />
                    </div>

                    <div className="flex-1 min-w-0 pr-12">
                      <div className="flex items-center gap-2 justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">
                          {theme.series}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                          style={{
                            backgroundColor: `${theme.primaryColor}25`,
                            color: theme.primaryColor,
                            border: `1px solid ${theme.primaryColor}60`,
                          }}
                        >
                          {theme.colorEmoji} {theme.colorName}
                        </span>
                      </div>
                      <h4 className="text-base font-extrabold text-white truncate mt-0.5">
                        {theme.name}
                      </h4>
                      <p className="text-xs font-semibold text-slate-300 truncate">
                        {theme.characterName}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                        {theme.japaneseTitle}
                      </p>
                    </div>
                  </div>

                  {/* Character Quote */}
                  <div className="mt-3.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <p className="text-[11px] text-slate-300 italic line-clamp-2">
                      "{theme.quote}"
                    </p>
                    <p className="text-[10px] text-slate-400 font-normal mt-1 truncate">
                      {theme.japaneseQuote}
                    </p>
                  </div>
                </div>

                {/* Footer with Colors and Select Button */}
                <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                  {/* Color Swatches */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-medium">Aura:</span>
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs"
                      style={{ backgroundColor: theme.primaryColor }}
                    />
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs"
                      style={{ backgroundColor: theme.secondaryColor }}
                    />
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs"
                      style={{ backgroundColor: theme.accentColor }}
                    />
                    <span className="text-[10px] font-bold text-slate-300 ml-1">
                      {theme.badgeText.split(' • ')[1] || theme.rankLabel}
                    </span>
                  </div>

                  {/* Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTheme(theme.id);
                      onClose();
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-700 text-slate-200 hover:bg-slate-600 group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3" />
                        <span>Equip Theme</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Theme auto-saves to your browser preferences</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
