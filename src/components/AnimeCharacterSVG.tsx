import React, { useState, useEffect } from 'react';
import type { AnimeThemeId } from '@/lib/animeThemes';

interface AnimeCharacterProps {
  themeId: AnimeThemeId;
  size?: number;
  action?: 'idle' | 'search' | 'alert' | 'clash' | 'mail' | 'sensei' | 'wizard' | 'student';
  showAura?: boolean;
  className?: string;
}

export function AnimeCharacterSVG({
  themeId,
  size = 120,
  action = 'idle',
  showAura = true,
  className = '',
}: AnimeCharacterProps) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 180);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  // Shared Action Accessories
  const renderActionOverlay = () => {
    switch (action) {
      case 'search':
        return (
          <g className="animate-pulse">
            <circle cx="102" cy="70" r="14" fill="none" stroke="#38bdf8" strokeWidth="3" />
            <line x1="112" y1="80" x2="124" y2="92" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
            <circle cx="98" cy="66" r="4" fill="white" opacity="0.6" />
          </g>
        );
      case 'alert':
        return (
          <g className="animate-bounce" style={{ transformOrigin: '105px 35px' }}>
            <polygon points="105,18 116,40 94,40" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />
            <rect x="103" y="25" width="4" height="8" rx="2" fill="white" />
            <circle cx="105" cy="36" r="2" fill="white" />
          </g>
        );
      case 'clash':
        return (
          <g className="animate-spin-slow" style={{ transformOrigin: '105px 75px' }}>
            <polygon points="105,58 110,72 124,70 112,80 118,94 105,84 92,94 98,80 86,70 100,72" fill="#ef4444" opacity="0.9" />
          </g>
        );
      case 'mail':
        return (
          <g className="animate-float">
            <rect x="90" y="85" width="26" height="18" rx="2" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
            <path d="M 90 87 L 103 97 L 116 87" fill="none" stroke="#2563eb" strokeWidth="2" />
          </g>
        );
      default:
        return null;
    }
  };

  /* ============================================================
     1. NARUTO UZUMAKI (Hidden Leaf Shinobi)
     ============================================================ */
  if (themeId === 'naruto') {
    return (
      <svg width={size} height={size * 1.25} viewBox="0 0 140 175" className={`overflow-visible select-none ${className}`}>
        {/* Rasengan / Chakra Aura */}
        {showAura && (
          <g className="animate-pulse">
            <circle cx="70" cy="85" r="55" fill="url(#narutoChakra)" opacity="0.35" />
            <circle cx="118" cy="115" r="16" fill="url(#rasenganGrad)" className="animate-spin" />
            <circle cx="118" cy="115" r="12" fill="#e0f2fe" opacity="0.9" />
            <circle cx="118" cy="115" r="6" fill="#ffffff" />
          </g>
        )}

        {/* Body - Orange Tracksuit Jacket */}
        <path d="M 40 120 L 30 170 L 110 170 L 100 120 Z" fill="#ea580c" />
        {/* Blue shoulder trim */}
        <path d="M 40 120 L 32 150 L 52 140 L 52 120 Z" fill="#1e3a8a" />
        <path d="M 100 120 L 108 150 L 88 140 L 88 120 Z" fill="#1e3a8a" />
        {/* White collar / zipper */}
        <path d="M 52 118 Q 70 130 88 118 L 88 128 Q 70 138 52 128 Z" fill="#f8fafc" />
        <line x1="70" y1="128" x2="70" y2="170" stroke="#f1f5f9" strokeWidth="3" />
        {/* Uzumaki Crest on jacket */}
        <circle cx="70" cy="148" r="8" fill="#dc2626" />
        <path d="M 70 144 A 4 4 0 0 1 73 148 A 3 3 0 0 1 70 151 A 2 2 0 0 1 68 148" fill="none" stroke="white" strokeWidth="1.2" />

        {/* Arms */}
        <path d="M 36 128 Q 20 142 22 162" stroke="#ea580c" strokeWidth="12" fill="none" strokeLinecap="round" />
        <circle cx="22" cy="162" r="6" fill="#fde68a" />
        {/* Right arm extending Rasengan */}
        <path d="M 104 128 Q 115 130 118 118" stroke="#ea580c" strokeWidth="12" fill="none" strokeLinecap="round" />
        <circle cx="118" cy="118" r="6" fill="#fde68a" />

        {/* Neck */}
        <rect x="62" y="105" width="16" height="18" fill="#fde68a" rx="3" />

        {/* Head Base */}
        <ellipse cx="70" cy="72" rx="30" ry="32" fill="#fef08a" opacity="0.3" />
        <ellipse cx="70" cy="74" rx="28" ry="30" fill="#fde68a" />

        {/* Cheeks Whisker Marks (3 lines on each side) */}
        <line x1="47" y1="75" x2="57" y2="76" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
        <line x1="46" y1="79" x2="56" y2="80" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
        <line x1="47" y1="83" x2="57" y2="83" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />

        <line x1="93" y1="75" x2="83" y2="76" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
        <line x1="94" y1="79" x2="84" y2="80" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
        <line x1="93" y1="83" x2="83" y2="83" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />

        {/* Eyes */}
        {blink ? (
          <>
            <line x1="52" y1="72" x2="62" y2="72" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
            <line x1="78" y1="72" x2="88" y2="72" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="57" cy="71" rx="4.5" ry="6" fill="#0284c7" />
            <ellipse cx="83" cy="71" rx="4.5" ry="6" fill="#0284c7" />
            <circle cx="57" cy="71" r="2.5" fill="#0f172a" />
            <circle cx="83" cy="71" r="2.5" fill="#0f172a" />
            <circle cx="55.5" cy="69" r="1.5" fill="white" />
            <circle cx="81.5" cy="69" r="1.5" fill="white" />
          </>
        )}

        {/* Big Grin / Smile */}
        <path d="M 60 88 Q 70 96 80 88 Z" fill="#ffffff" stroke="#991b1b" strokeWidth="1.5" />
        <path d="M 64 91 L 76 91" stroke="#cbd5e1" strokeWidth="1" />

        {/* Leaf Headband (Navy band + Metal plate + Konoha Leaf symbol) */}
        <rect x="38" y="44" width="64" height="15" rx="3" fill="#1e3a8a" />
        <rect x="50" y="45" width="40" height="13" rx="2" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
        {/* Screws on plate */}
        <circle cx="53" cy="51" r="1" fill="#475569" />
        <circle cx="87" cy="51" r="1" fill="#475569" />
        {/* Leaf Spiral Symbol */}
        <path d="M 68 53 A 3 3 0 1 1 72 50 L 75 48" fill="none" stroke="#1e293b" strokeWidth="1.6" strokeLinecap="round" />

        {/* Spiky Blonde Hair */}
        <path d="M 38 48 Q 25 35 32 20 Q 42 32 46 16 Q 58 28 66 10 Q 74 26 84 14 Q 92 30 102 22 Q 106 36 102 48 Z" fill="#facc15" stroke="#eab308" strokeWidth="2" />
        <path d="M 38 48 Q 30 58 35 68 Q 42 62 40 50 Z" fill="#facc15" />
        <path d="M 102 48 Q 110 58 105 68 Q 98 62 100 50 Z" fill="#facc15" />

        {renderActionOverlay()}

        <defs>
          <radialGradient id="narutoChakra">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#eab308" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="rasenganGrad">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  /* ============================================================
     2. SUNG JIN-WOO (Solo Leveling / Shadow Monarch)
     ============================================================ */
  if (themeId === 'solo-leveling') {
    return (
      <svg width={size} height={size * 1.25} viewBox="0 0 140 175" className={`overflow-visible select-none ${className}`}>
        {/* Rising Shadow Mist & Blue Flames */}
        {showAura && (
          <g className="animate-pulse">
            <circle cx="70" cy="85" r="58" fill="url(#shadowMonarchAura)" opacity="0.45" />
            <path d="M 30 160 Q 20 120 35 80 Q 25 110 40 140 Z" fill="#7c3aed" opacity="0.4" />
            <path d="M 110 160 Q 120 120 105 80 Q 115 110 100 140 Z" fill="#06b6d4" opacity="0.4" />
          </g>
        )}

        {/* Long Shadow Trenchcoat */}
        <path d="M 40 115 L 20 175 L 120 175 L 100 115 Z" fill="#090d16" />
        {/* Purple/Cyan inner lining glowing seam */}
        <path d="M 52 115 L 42 175 L 50 175 L 60 115 Z" fill="#581c87" opacity="0.7" />
        <path d="M 88 115 L 98 175 L 90 175 L 80 115 Z" fill="#0e7490" opacity="0.7" />
        {/* Inner black shirt */}
        <path d="M 60 115 L 70 135 L 80 115 Z" fill="#020617" />
        <line x1="70" y1="135" x2="70" y2="175" stroke="#38bdf8" strokeWidth="1.5" opacity="0.7" />

        {/* Arms holding Kasaka Dagger */}
        <path d="M 38 120 Q 22 138 25 158" stroke="#0f172a" strokeWidth="12" fill="none" strokeLinecap="round" />
        <circle cx="25" cy="158" r="5" fill="#fde68a" />
        {/* Shadow Dagger in right hand */}
        <path d="M 102 120 Q 116 135 112 152" stroke="#0f172a" strokeWidth="12" fill="none" strokeLinecap="round" />
        <circle cx="112" cy="152" r="5" fill="#fde68a" />
        {/* Dagger blade with blue energy glow */}
        <path d="M 112 145 L 128 115 L 122 142 Z" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" className="animate-pulse" />
        <line x1="114" y1="140" x2="126" y2="120" stroke="#ffffff" strokeWidth="1.5" />

        {/* Neck */}
        <rect x="63" y="102" width="14" height="18" fill="#fde68a" rx="2" />

        {/* Sharp V-Jaw Head */}
        <path d="M 46 65 Q 46 95 70 106 Q 94 95 94 65 Q 94 45 70 45 Q 46 45 46 65 Z" fill="#fde68a" />

        {/* Glowing Piercing Neon Blue Eyes */}
        {blink ? (
          <>
            <line x1="52" y1="72" x2="62" y2="72" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="78" y1="72" x2="88" y2="72" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />
          </>
        ) : (
          <g className="animate-pulse">
            {/* Eye glow aura */}
            <ellipse cx="58" cy="71" rx="7" ry="5" fill="#06b6d4" opacity="0.4" />
            <ellipse cx="82" cy="71" rx="7" ry="5" fill="#06b6d4" opacity="0.4" />
            {/* Sharp eyes */}
            <path d="M 52 70 Q 58 66 64 71 Q 58 75 52 70" fill="#020617" />
            <path d="M 76 71 Q 82 66 88 70 Q 82 75 76 71" fill="#020617" />
            <circle cx="58" cy="70" r="2.8" fill="#22d3ee" />
            <circle cx="82" cy="70" r="2.8" fill="#22d3ee" />
            <circle cx="58" cy="70" r="1.2" fill="#ffffff" />
            <circle cx="82" cy="70" r="1.2" fill="#ffffff" />
            {/* Blue energy trails leaking from eyes */}
            <path d="M 52 69 Q 44 65 38 68" stroke="#38bdf8" strokeWidth="1.5" fill="none" opacity="0.8" />
            <path d="M 88 69 Q 96 65 102 68" stroke="#38bdf8" strokeWidth="1.5" fill="none" opacity="0.8" />
          </g>
        )}

        {/* Calm, confident smirk */}
        <path d="M 64 88 Q 72 90 77 86" stroke="#475569" strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* Sleek messy dark hair with sharp bangs */}
        <path d="M 44 62 Q 40 35 70 30 Q 100 35 96 62 Q 88 45 74 44 Q 70 58 68 68 Q 66 52 60 48 Q 54 62 50 68 Q 48 54 44 62 Z" fill="#090d16" stroke="#1e293b" strokeWidth="1.5" />
        {/* Subtle purple hair highlights */}
        <path d="M 62 38 Q 66 48 64 56" stroke="#7c3aed" strokeWidth="1.2" fill="none" opacity="0.7" />
        <path d="M 76 38 Q 80 48 78 56" stroke="#06b6d4" strokeWidth="1.2" fill="none" opacity="0.7" />

        {renderActionOverlay()}

        <defs>
          <radialGradient id="shadowMonarchAura">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#090d16" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  /* ============================================================
     3. GOJO SATORU (Jujutsu Kaisen / Six Eyes)
     ============================================================ */
  if (themeId === 'jujutsu-kaisen') {
    return (
      <svg width={size} height={size * 1.25} viewBox="0 0 140 175" className={`overflow-visible select-none ${className}`}>
        {/* Infinite Void Domain Expansion Particles */}
        {showAura && (
          <g className="animate-pulse">
            <circle cx="70" cy="85" r="56" fill="url(#infiniteVoidAura)" opacity="0.4" />
            {/* Floating cursed energy orbs */}
            <circle cx="30" cy="50" r="5" fill="#3b82f6" opacity="0.7" className="animate-float" />
            <circle cx="110" cy="45" r="6" fill="#a855f7" opacity="0.7" className="animate-float" style={{ animationDelay: '1s' }} />
          </g>
        )}

        {/* High-collar dark Tokyo Jujutsu uniform */}
        <path d="M 38 120 L 25 175 L 115 175 L 102 120 Z" fill="#0f172a" />
        {/* High Standing Collar */}
        <path d="M 50 120 L 52 98 Q 70 106 88 98 L 90 120 Z" fill="#1e1b4b" stroke="#312e81" strokeWidth="1" />
        {/* Gold Swirl Button */}
        <circle cx="70" cy="126" r="3.5" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />

        {/* Domain Expansion Hand Sign (Crossed Fingers) */}
        <path d="M 100 125 Q 115 130 114 112" stroke="#0f172a" strokeWidth="11" fill="none" strokeLinecap="round" />
        <circle cx="114" cy="112" r="5" fill="#fde68a" />
        {/* Glowing Infinity Ring on hand */}
        <circle cx="114" cy="112" r="9" fill="none" stroke="#60a5fa" strokeWidth="2" className="animate-ping" opacity="0.7" />

        {/* Head */}
        <ellipse cx="70" cy="74" rx="27" ry="29" fill="#fde68a" />

        {/* Black Blindfold OR Six Eyes */}
        {/* Sleek black blindfold */}
        <path d="M 42 62 Q 70 59 98 62 L 98 76 Q 70 78 42 76 Z" fill="#090d16" stroke="#1e293b" strokeWidth="1" />
        {/* Six Eyes glowing through blindfold or edge */}
        <circle cx="58" cy="69" r="3.5" fill="#38bdf8" className="animate-pulse" opacity="0.9" />
        <circle cx="82" cy="69" r="3.5" fill="#38bdf8" className="animate-pulse" opacity="0.9" />
        <circle cx="58" cy="69" r="1.5" fill="#ffffff" />
        <circle cx="82" cy="69" r="1.5" fill="#ffffff" />

        {/* Iconic confident smile */}
        <path d="M 62 88 Q 70 94 78 88" stroke="#475569" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Spiky Snow-White Hair */}
        <path d="M 40 58 Q 30 42 36 24 Q 48 35 52 18 Q 62 30 70 12 Q 78 28 88 18 Q 94 32 104 25 Q 110 42 100 58 Q 96 48 70 46 Q 44 48 40 58 Z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />

        {renderActionOverlay()}

        <defs>
          <radialGradient id="infiniteVoidAura">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  /* ============================================================
     4. TANJIRO KAMADO (Demon Slayer / Hinokami)
     ============================================================ */
  if (themeId === 'demon-slayer') {
    return (
      <svg width={size} height={size * 1.25} viewBox="0 0 140 175" className={`overflow-visible select-none ${className}`}>
        {/* Water / Sun Breathing Aura */}
        {showAura && (
          <g className="animate-pulse">
            <circle cx="70" cy="85" r="56" fill="url(#breathingAura)" opacity="0.4" />
            {/* Water Wave Arc */}
            <path d="M 25 140 Q 20 80 60 40 Q 70 30 85 45" fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
            <path d="M 28 135 Q 24 85 62 48" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {/* Checkered Green & Black Haori Pattern */}
        <path d="M 38 120 L 25 175 L 115 175 L 102 120 Z" fill="#0f172a" />
        {/* Checkered Haori tiles */}
        <rect x="42" y="125" width="14" height="14" fill="#10b981" />
        <rect x="56" y="125" width="14" height="14" fill="#0f172a" />
        <rect x="70" y="125" width="14" height="14" fill="#10b981" />
        <rect x="84" y="125" width="14" height="14" fill="#0f172a" />

        <rect x="36" y="139" width="14" height="14" fill="#0f172a" />
        <rect x="50" y="139" width="14" height="14" fill="#10b981" />
        <rect x="64" y="139" width="14" height="14" fill="#0f172a" />
        <rect x="78" y="139" width="14" height="14" fill="#10b981" />
        <rect x="92" y="139" width="14" height="14" fill="#0f172a" />

        <rect x="30" y="153" width="14" height="14" fill="#10b981" />
        <rect x="44" y="153" width="14" height="14" fill="#0f172a" />
        <rect x="58" y="153" width="14" height="14" fill="#10b981" />
        <rect x="72" y="153" width="14" height="14" fill="#0f172a" />
        <rect x="86" y="153" width="14" height="14" fill="#10b981" />
        <rect x="100" y="153" width="14" height="14" fill="#0f172a" />

        {/* Head */}
        <ellipse cx="70" cy="74" rx="27" ry="29" fill="#fde68a" />

        {/* Forehead Flame Scar */}
        <path d="M 52 54 Q 56 46 60 52 Q 62 50 63 56 Q 58 60 54 58 Z" fill="#991b1b" opacity="0.9" />

        {/* Hanafuda Earrings (Dangling from ear) */}
        <g>
          <line x1="42" y1="74" x2="42" y2="80" stroke="#475569" strokeWidth="1" />
          <rect x="38" y="80" width="8" height="16" fill="#ffffff" stroke="#1e293b" strokeWidth="1" />
          <circle cx="42" cy="85" r="2.5" fill="#dc2626" />
          <line x1="39" y1="91" x2="45" y2="91" stroke="#1e293b" strokeWidth="1" />
        </g>

        {/* Eyes (Kind, determined burgundy eyes) */}
        {blink ? (
          <>
            <line x1="52" y1="72" x2="62" y2="72" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="78" y1="72" x2="88" y2="72" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="57" cy="72" rx="4.5" ry="6" fill="#831843" />
            <ellipse cx="83" cy="72" rx="4.5" ry="6" fill="#831843" />
            <circle cx="57" cy="72" r="2.5" fill="#1e1b4b" />
            <circle cx="83" cy="72" r="2.5" fill="#1e1b4b" />
            <circle cx="55.5" cy="70" r="1.5" fill="white" />
            <circle cx="81.5" cy="70" r="1.5" fill="white" />
          </>
        )}

        {/* Warm smile */}
        <path d="M 62 88 Q 70 94 78 88" stroke="#475569" strokeWidth="1.8" fill="none" strokeLinecap="round" />

        {/* Burgundy Brushed-Back Hair */}
        <path d="M 42 62 Q 35 44 45 28 Q 56 36 62 20 Q 72 32 80 18 Q 88 34 98 26 Q 102 44 98 62 Q 90 48 70 44 Q 50 48 42 62 Z" fill="#581c87" stroke="#3b0764" strokeWidth="1.5" />
        {/* Red edge highlights */}
        <path d="M 45 28 Q 56 36 62 20" stroke="#dc2626" strokeWidth="2" fill="none" />
        <path d="M 62 20 Q 72 32 80 18" stroke="#dc2626" strokeWidth="2" fill="none" />

        {renderActionOverlay()}

        <defs>
          <radialGradient id="breathingAura">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  /* ============================================================
     5. SON GOKU (Dragon Ball Z / Super Saiyan)
     ============================================================ */
  if (themeId === 'dragon-ball') {
    return (
      <svg width={size} height={size * 1.25} viewBox="0 0 140 175" className={`overflow-visible select-none ${className}`}>
        {/* Golden Ki Flame Aura */}
        {showAura && (
          <g className="animate-pulse">
            <circle cx="70" cy="85" r="58" fill="url(#saiyanKiAura)" opacity="0.5" />
            {/* Lightning Ki Sparks */}
            <path d="M 25 70 L 32 80 L 28 88 L 36 98" stroke="#38bdf8" strokeWidth="2" fill="none" />
            <path d="M 112 65 L 105 76 L 112 84 L 104 95" stroke="#38bdf8" strokeWidth="2" fill="none" />
          </g>
        )}

        {/* Red Martial Arts Gi (Kaioken / Super Saiyan God) */}
        <path d="M 40 120 L 25 175 L 115 175 L 100 120 Z" fill="#dc2626" />
        {/* Navy undershirt V-neck */}
        <path d="M 54 120 L 70 142 L 86 120 Z" fill="#1e3a8a" />
        {/* Blue sash belt */}
        <rect x="42" y="160" width="56" height="8" fill="#1e3a8a" />

        {/* Muscular arms & Blue wristbands */}
        <path d="M 38 124 Q 24 140 28 160" stroke="#fde68a" strokeWidth="12" fill="none" strokeLinecap="round" />
        <rect x="23" y="148" width="10" height="8" rx="2" fill="#1e3a8a" />
        <circle cx="28" cy="162" r="6" fill="#fde68a" />

        <path d="M 102 124 Q 116 140 112 160" stroke="#fde68a" strokeWidth="12" fill="none" strokeLinecap="round" />
        <rect x="107" y="148" width="10" height="8" rx="2" fill="#1e3a8a" />
        <circle cx="112" cy="162" r="6" fill="#fde68a" />

        {/* Head */}
        <ellipse cx="70" cy="74" rx="27" ry="29" fill="#fde68a" />

        {/* Fierce / Determined Super Saiyan Eyes (Turquoise) */}
        {blink ? (
          <>
            <line x1="52" y1="72" x2="62" y2="72" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
            <line x1="78" y1="72" x2="88" y2="72" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* Angry angled eyebrows */}
            <line x1="50" y1="67" x2="64" y2="70" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
            <line x1="90" y1="67" x2="76" y2="70" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="58" cy="73" rx="4" ry="5" fill="#06b6d4" />
            <ellipse cx="82" cy="73" rx="4" ry="5" fill="#06b6d4" />
            <circle cx="58" cy="73" r="2" fill="#0f172a" />
            <circle cx="82" cy="73" r="2" fill="#0f172a" />
            <circle cx="56.5" cy="71" r="1.2" fill="white" />
            <circle cx="80.5" cy="71" r="1.2" fill="white" />
          </>
        )}

        {/* Confident battle grin */}
        <path d="M 62 88 Q 70 94 78 88" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Super Saiyan Massive Spiky Hair */}
        <path d="M 40 58 Q 20 40 18 16 Q 32 30 42 12 Q 54 26 64 6 Q 74 24 84 8 Q 96 28 108 14 Q 116 34 122 18 Q 118 45 100 58 Q 90 44 70 42 Q 50 44 40 58 Z" fill="#ef4444" stroke="#dc2626" strokeWidth="2.5" />
        {/* Red hair streaks */}
        <path d="M 64 8 Q 68 28 66 40" stroke="#fca5a5" strokeWidth="2" fill="none" />
        <path d="M 84 10 Q 82 28 80 40" stroke="#fca5a5" strokeWidth="2" fill="none" />

        {renderActionOverlay()}

        <defs>
          <radialGradient id="saiyanKiAura">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#dc2626" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  /* ============================================================
     6. MONKEY D. LUFFY (One Piece / Straw Hat)
     ============================================================ */
  if (themeId === 'one-piece') {
    return (
      <svg width={size} height={size * 1.25} viewBox="0 0 140 175" className={`overflow-visible select-none ${className}`}>
        {/* Gear 5 / Pirate Grand Line Aura */}
        {showAura && (
          <g className="animate-pulse">
            <circle cx="70" cy="85" r="56" fill="url(#pirateAura)" opacity="0.4" />
            {/* Gear 5 Steam Clouds */}
            <ellipse cx="35" cy="115" rx="14" ry="8" fill="#ffffff" opacity="0.7" className="animate-float" />
            <ellipse cx="105" cy="115" rx="14" ry="8" fill="#ffffff" opacity="0.7" className="animate-float" style={{ animationDelay: '0.8s' }} />
          </g>
        )}

        {/* Red Sleeveless Vest */}
        <path d="M 40 120 L 28 175 L 112 175 L 100 120 Z" fill="#dc2626" />
        {/* Open Chest V-shape */}
        <path d="M 52 120 L 70 155 L 88 120 Z" fill="#fde68a" />
        {/* Yellow Sash Belt */}
        <rect x="42" y="162" width="56" height="8" fill="#f59e0b" />

        {/* Arms */}
        <path d="M 38 124 Q 22 140 26 160" stroke="#fde68a" strokeWidth="11" fill="none" strokeLinecap="round" />
        <circle cx="26" cy="162" r="5" fill="#fde68a" />
        <path d="M 102 124 Q 118 140 114 160" stroke="#fde68a" strokeWidth="11" fill="none" strokeLinecap="round" />
        <circle cx="114" cy="162" r="5" fill="#fde68a" />

        {/* Head */}
        <ellipse cx="70" cy="74" rx="27" ry="29" fill="#fde68a" />

        {/* Eye Scar under Left Eye (2 stitches) */}
        <path d="M 52 78 Q 58 82 58 84" stroke="#b91c1c" strokeWidth="1.5" fill="none" />
        <line x1="53" y1="81" x2="57" y2="79" stroke="#b91c1c" strokeWidth="1.2" />

        {/* Round big eyes */}
        {blink ? (
          <>
            <line x1="52" y1="72" x2="62" y2="72" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
            <line x1="78" y1="72" x2="88" y2="72" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="57" cy="72" r="4.5" fill="#0f172a" />
            <circle cx="83" cy="72" r="4.5" fill="#0f172a" />
            <circle cx="55.5" cy="70" r="1.5" fill="white" />
            <circle cx="81.5" cy="70" r="1.5" fill="white" />
          </>
        )}

        {/* Huge Toothy Pirate Grin */}
        <path d="M 54 88 Q 70 102 86 88 Z" fill="#ffffff" stroke="#1e293b" strokeWidth="2" />
        <line x1="62" y1="94" x2="78" y2="94" stroke="#94a3b8" strokeWidth="1.2" />
        <line x1="70" y1="89" x2="70" y2="99" stroke="#94a3b8" strokeWidth="1.2" />

        {/* Messy Black Hair */}
        <path d="M 42 62 Q 35 48 44 38 Q 70 34 96 38 Q 105 48 98 62 Q 90 52 70 50 Q 50 52 42 62 Z" fill="#0f172a" />

        {/* Iconic Straw Hat with Red Ribbon */}
        {/* Crown of Hat */}
        <ellipse cx="70" cy="38" rx="26" ry="16" fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" />
        {/* Red Ribbon */}
        <path d="M 46 44 Q 70 40 94 44 L 94 48 Q 70 44 46 48 Z" fill="#dc2626" />
        {/* Wide Brim */}
        <ellipse cx="70" cy="46" rx="46" ry="12" fill="#fde047" stroke="#ca8a04" strokeWidth="2" />

        {renderActionOverlay()}

        <defs>
          <radialGradient id="pirateAura">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  /* ============================================================
     7. LEVI ACKERMAN (Attack on Titan / Scout Regiment)
     ============================================================ */
  if (themeId === 'attack-on-titan') {
    return (
      <svg width={size} height={size * 1.25} viewBox="0 0 140 175" className={`overflow-visible select-none ${className}`}>
        {/* Wings of Freedom Aura */}
        {showAura && (
          <g className="animate-pulse">
            <circle cx="70" cy="85" r="56" fill="url(#titanAura)" opacity="0.4" />
          </g>
        )}

        {/* Green Survey Corps Cloak */}
        <path d="M 38 120 L 22 175 L 118 175 L 102 120 Z" fill="#15803d" />
        {/* Wings of Freedom Crest Shield on Cloak */}
        <path d="M 62 135 L 78 135 L 78 152 L 70 158 L 62 152 Z" fill="#f8fafc" stroke="#1e293b" strokeWidth="1" />
        <path d="M 65 138 L 75 148 M 75 138 L 65 148" stroke="#2563eb" strokeWidth="1.5" />

        {/* White Ascot Tie / Cravat */}
        <path d="M 64 112 L 76 112 L 73 126 L 67 126 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />

        {/* Dual ODM Gear Blades */}
        <line x1="20" y1="130" x2="10" y2="170" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
        <line x1="120" y1="130" x2="130" y2="170" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />

        {/* Head */}
        <ellipse cx="70" cy="74" rx="26" ry="28" fill="#fde68a" />

        {/* Sharp, Cold Levi Eyes */}
        {blink ? (
          <>
            <line x1="54" y1="72" x2="63" y2="72" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="77" y1="72" x2="86" y2="72" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* Narrow half-lidded glare */}
            <path d="M 52 70 Q 58 68 64 71" stroke="#1e293b" strokeWidth="2" fill="none" />
            <path d="M 76 71 Q 82 68 88 70" stroke="#1e293b" strokeWidth="2" fill="none" />
            <circle cx="58" cy="73" r="2.5" fill="#334155" />
            <circle cx="82" cy="73" r="2.5" fill="#334155" />
            <circle cx="57" cy="72" r="0.8" fill="white" />
            <circle cx="81" cy="72" r="0.8" fill="white" />
          </>
        )}

        {/* Stoic flat mouth */}
        <line x1="65" y1="88" x2="75" y2="88" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" />

        {/* Classic Clean Undercut Hair */}
        <path d="M 42 62 Q 38 42 48 32 Q 70 28 92 32 Q 102 42 98 62 Q 88 52 70 52 Q 52 52 42 62 Z" fill="#0f172a" />
        <path d="M 56 36 L 54 52 M 84 36 L 86 52" stroke="#1e293b" strokeWidth="1.5" />

        {renderActionOverlay()}

        <defs>
          <radialGradient id="titanAura">
            <stop offset="0%" stopColor="#15803d" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#78350f" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  /* ============================================================
     8. CYBERPUNK (Edgerunners / Sandevistan)
     ============================================================ */
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 140 175" className={`overflow-visible select-none ${className}`}>
      {/* Neon Grid Aura */}
      {showAura && (
        <g className="animate-pulse">
          <circle cx="70" cy="85" r="56" fill="url(#cyberAura)" opacity="0.4" />
          {/* Cyber HUD targeting ring */}
          <circle cx="70" cy="72" r="38" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="6 4" className="animate-spin-slow" />
        </g>
      )}

      {/* Neon Yellow EMT Jacket with Cyan Collar */}
      <path d="M 38 120 L 25 175 L 115 175 L 102 120 Z" fill="#facc15" />
      {/* Cyan High Collar & glowing trims */}
      <path d="M 50 120 L 52 98 Q 70 106 88 98 L 90 120 Z" fill="#0891b2" stroke="#06b6d4" strokeWidth="2" />
      <line x1="70" y1="120" x2="70" y2="175" stroke="#06b6d4" strokeWidth="3" />

      {/* Glowing Sandevistan Spine lights */}
      <circle cx="34" cy="135" r="2.5" fill="#06b6d4" className="animate-ping" />
      <circle cx="106" cy="135" r="2.5" fill="#ec4899" className="animate-ping" style={{ animationDelay: '0.5s' }} />

      {/* Head */}
      <ellipse cx="70" cy="74" rx="26" ry="28" fill="#fde68a" />

      {/* Cyber Reticle Ocular Implant on Left Eye */}
      <circle cx="58" cy="72" r="7" fill="none" stroke="#06b6d4" strokeWidth="1" strokeDasharray="3 2" />
      <circle cx="58" cy="72" r="3" fill="#22d3ee" />
      <circle cx="82" cy="72" r="3" fill="#ec4899" />
      <circle cx="58" cy="72" r="1.2" fill="#ffffff" />
      <circle cx="82" cy="72" r="1.2" fill="#ffffff" />

      {/* Confident street smirk */}
      <path d="M 64 88 Q 72 90 78 86" stroke="#475569" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Shaved sides Undercut with messy brown spikes */}
      <path d="M 44 60 Q 40 40 50 30 Q 70 24 90 30 Q 100 40 96 60 Q 86 48 70 48 Q 54 48 44 60 Z" fill="#78350f" stroke="#451a03" strokeWidth="1.5" />
      {/* Neon Cyber hair strand */}
      <path d="M 60 32 Q 66 44 64 52" stroke="#22d3ee" strokeWidth="2" fill="none" />

      {renderActionOverlay()}

      <defs>
        <radialGradient id="cyberAura">
          <stop offset="0%" stopColor="#facc15" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
