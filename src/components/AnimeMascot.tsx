import React, { useEffect, useState } from 'react';
import { AnimeCharacterSVG } from '@/components/AnimeCharacterSVG';
import { ANIME_THEMES, type AnimeThemeId } from '@/lib/animeThemes';

export type MascotProps = {
  variant: 'sensei' | 'student' | 'search' | 'alert' | 'mail' | 'clash' | 'wizard' | 'ninja';
  color: string;
  size?: number;
  message?: string;
  pointing?: 'left' | 'right' | 'up';
  themeId?: AnimeThemeId;
};

export function AnimeMascot({
  variant,
  color,
  size = 120,
  message,
  pointing = 'right',
  themeId,
}: MascotProps) {
  const [showTip, setShowTip] = useState(false);
  const [activeTheme, setActiveTheme] = useState<AnimeThemeId>(() => {
    if (themeId) return themeId;
    const saved = localStorage.getItem('animeThemeId') as AnimeThemeId;
    return saved && ANIME_THEMES[saved] ? saved : 'naruto';
  });

  useEffect(() => {
    if (themeId) {
      setActiveTheme(themeId);
    } else {
      const handleStorage = () => {
        const saved = localStorage.getItem('animeThemeId') as AnimeThemeId;
        if (saved && ANIME_THEMES[saved]) setActiveTheme(saved);
      };
      window.addEventListener('storage', handleStorage);
      window.addEventListener('anime-theme-change', handleStorage);
      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('anime-theme-change', handleStorage);
      };
    }
  }, [themeId]);

  const currentTheme = ANIME_THEMES[activeTheme] || ANIME_THEMES.naruto;
  const displayMessage = message || currentTheme.quote;

  return (
    <div className="relative flex flex-col items-center select-none" style={{ width: size }}>
      <div
        className="relative cursor-pointer transition-transform duration-300 hover:scale-110 group"
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        onClick={() => setShowTip(!showTip)}
      >
        <div className="animate-float">
          <AnimeCharacterSVG
            themeId={activeTheme}
            size={size}
            action={variant as any}
            showAura={true}
          />
        </div>

        {displayMessage && showTip && (
          <div
            className="absolute top-0 z-50 whitespace-nowrap animate-pop-in"
            style={{
              left: pointing === 'left' ? 'auto' : '100%',
              right: pointing === 'left' ? '100%' : 'auto',
              marginLeft: pointing === 'left' ? '0' : '10px',
              marginRight: pointing === 'left' ? '10px' : '0',
            }}
          >
            <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/80 px-4 py-3 max-w-[240px] text-white">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold text-amber-400">
                  {currentTheme.characterName}
                </span>
                <span className="text-[9px] text-slate-400 font-medium">
                  • {currentTheme.rankLabel}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-200 whitespace-normal leading-relaxed">
                "{displayMessage}"
              </p>
              <div
                className={`absolute top-4 w-2.5 h-2.5 bg-slate-900 border-l border-b border-slate-700 transform rotate-45 ${
                  pointing === 'left'
                    ? 'right-[-5px] border-r-0 border-t-0'
                    : 'left-[-5px] border-r-0 border-t-0'
                }`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AnimeSectionHeader({
  title,
  icon: Icon,
  mascotVariant,
  mascotColor,
  mascotMessage,
  mascotPointing = 'left',
  themeId,
  children,
}: {
  title: string;
  icon: React.ElementType;
  mascotVariant: MascotProps['variant'];
  mascotColor: string;
  mascotMessage?: string;
  mascotPointing?: 'left' | 'right' | 'up';
  themeId?: AnimeThemeId;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3.5 mb-5 animate-slide-in-right">
      <AnimeMascot
        variant={mascotVariant}
        color={mascotColor}
        size={68}
        message={mascotMessage}
        pointing={mascotPointing}
        themeId={themeId}
      />
      <div className="flex-1">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md animate-energy-pulse"
            style={{
              background: `linear-gradient(135deg, ${mascotColor === 'blue' ? '#3b82f6, #06b6d4' : mascotColor === 'amber' ? '#f59e0b, #ea580c' : mascotColor === 'red' ? '#ef4444, #f43f5e' : '#10b981, #06b6d4'})`,
            }}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <span className="anime-title anime-title-glow">{title}</span>
        </h2>
        {children}
      </div>
    </div>
  );
}
