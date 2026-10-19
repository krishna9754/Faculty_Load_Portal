export type AnimeThemeId =
  | 'naruto'
  | 'solo-leveling'
  | 'jujutsu-kaisen'
  | 'demon-slayer'
  | 'dragon-ball'
  | 'one-piece'
  | 'attack-on-titan'
  | 'cyberpunk';

export interface AnimeTheme {
  id: AnimeThemeId;
  name: string;
  colorName: string; // e.g., 'Yellow', 'Red', 'Purple', 'Blue', 'Green', 'Orange', 'Teal', 'Cyan'
  colorEmoji: string; // e.g., '🟡', '🔴', '🟣', '🔵', '🟢', '🟠', '🌲', '⚡'
  japaneseTitle: string; // Used as English universe subtitle
  characterName: string;
  characterTitle: string;
  series: string;
  quote: string;
  japaneseQuote: string; // Used as English secondary tagline
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgGlow: string;
  cardGlow: string;
  borderGlow: string;
  badgeBg: string;
  badgeText: string;
  sidebarGradient: string;
  headerGradient: string;
  activeNavGradient: string;
  primaryButtonClass: string;
  tagline: string;
  rankLabel: string;
}

export const ANIME_THEMES: Record<AnimeThemeId, AnimeTheme> = {
  naruto: {
    id: 'naruto',
    name: 'Naruto Shippuden',
    colorName: 'Yellow',
    colorEmoji: '🟡',
    japaneseTitle: 'Hidden Leaf Village',
    characterName: 'Naruto Uzumaki',
    characterTitle: 'Seventh Hokage • Nine-Tails Jinchuriki',
    series: 'Hidden Leaf Village (Konoha)',
    quote: 'I never go back on my word, that is my ninja way! Believe it!',
    japaneseQuote: 'Never give up, no matter what obstacles stand in your way.',
    primaryColor: '#eab308', // Bright Yellow
    secondaryColor: '#ca8a04', // Golden Amber
    accentColor: '#fef08a', // Pale Yellow
    bgGlow: 'radial-gradient(ellipse at top, rgba(234,179,8,0.22), transparent 65%), radial-gradient(ellipse at bottom right, rgba(202,138,4,0.14), transparent 65%)',
    cardGlow: '0 0 35px rgba(234,179,8,0.25)',
    borderGlow: 'rgba(234,179,8,0.45)',
    badgeBg: 'bg-yellow-100 text-yellow-900 border-yellow-300',
    badgeText: 'LEAF VILLAGE • YELLOW CHAKRA',
    sidebarGradient: 'from-yellow-500/25 via-amber-500/10 to-transparent',
    headerGradient: 'from-amber-500 via-yellow-400 to-amber-500',
    activeNavGradient: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-extrabold shadow-lg shadow-amber-400/35',
    primaryButtonClass: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-bold shadow-md shadow-amber-400/30',
    tagline: 'Believe it! Managing faculty schedules like a true Hokage.',
    rankLabel: 'Yellow Hokage Grade',
  },
  'dragon-ball': {
    id: 'dragon-ball',
    name: 'Dragon Ball Z',
    colorName: 'Red',
    colorEmoji: '🔴',
    japaneseTitle: 'Super Saiyan Universe',
    characterName: 'Son Goku',
    characterTitle: 'Kaioken Warrior • Super Saiyan God',
    series: 'Turtle Hermit Martial Arts',
    quote: 'I am the hope of the universe! Ka... me... ha... me... HA!',
    japaneseQuote: 'Unleashing immense Ki energy beyond all known limits.',
    primaryColor: '#ef4444', // Fiery Red
    secondaryColor: '#dc2626', // Crimson Red
    accentColor: '#fca5a5', // Light Rose Red
    bgGlow: 'radial-gradient(ellipse at top, rgba(239,68,68,0.22), transparent 65%), radial-gradient(ellipse at bottom right, rgba(220,38,38,0.15), transparent 65%)',
    cardGlow: '0 0 35px rgba(239,68,68,0.28)',
    borderGlow: 'rgba(239,68,68,0.45)',
    badgeBg: 'bg-red-100 text-red-900 border-red-300',
    badgeText: 'DRAGON BALL • KAIOKEN RED',
    sidebarGradient: 'from-red-600/25 via-rose-600/10 to-transparent',
    headerGradient: 'from-red-600 via-rose-600 to-amber-500',
    activeNavGradient: 'bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white font-extrabold shadow-lg shadow-red-500/35',
    primaryButtonClass: 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold shadow-md shadow-red-500/30',
    tagline: 'Power level over 9000! Unshakable class timetable.',
    rankLabel: 'Super Saiyan Red',
  },
  'solo-leveling': {
    id: 'solo-leveling',
    name: 'Solo Leveling',
    colorName: 'Purple',
    colorEmoji: '🟣',
    japaneseTitle: 'Shadow Monarch Domain',
    characterName: 'Sung Jin-Woo',
    characterTitle: 'The Shadow Monarch • S-Rank Hunter',
    series: 'Shadow Army Vanguard',
    quote: 'From now on, you will serve as my shadow army. ARISE!',
    japaneseQuote: 'Commanding shadows with unstoppable authority and power.',
    primaryColor: '#8b5cf6', // Violet
    secondaryColor: '#7c3aed', // Deep Violet
    accentColor: '#c4b5fd', // Light Violet
    bgGlow: 'radial-gradient(ellipse at top, rgba(139,92,246,0.22), transparent 65%), radial-gradient(ellipse at bottom right, rgba(124,58,237,0.14), transparent 65%)',
    cardGlow: '0 0 35px rgba(139,92,246,0.25)',
    borderGlow: 'rgba(139,92,246,0.45)',
    badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
    badgeText: 'SHADOW MONARCH • PURPLE AURA',
    sidebarGradient: 'from-purple-600/25 via-indigo-600/10 to-transparent',
    headerGradient: 'from-purple-600 via-indigo-600 to-violet-600',
    activeNavGradient: 'bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 text-white font-extrabold shadow-lg shadow-purple-500/35',
    primaryButtonClass: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold shadow-md shadow-purple-500/30',
    tagline: 'Solo Workload Leveling. Command your academic shadows!',
    rankLabel: 'Monarch S-Rank',
  },
  'jujutsu-kaisen': {
    id: 'jujutsu-kaisen',
    name: 'Jujutsu Kaisen',
    colorName: 'Blue',
    colorEmoji: '🔵',
    japaneseTitle: 'Tokyo Jujutsu High',
    characterName: 'Gojo Satoru',
    characterTitle: 'The Strongest • Six Eyes & Limitless',
    series: 'Tokyo Jujutsu High Sorcerers',
    quote: "Don't worry, I'm the strongest. Domain Expansion: Infinite Void!",
    japaneseQuote: 'Unlimited cursed energy bending space and time.',
    primaryColor: '#2563eb', // Royal Blue
    secondaryColor: '#0ea5e9', // Sky Blue
    accentColor: '#93c5fd', // Light Blue
    bgGlow: 'radial-gradient(ellipse at top, rgba(37,99,235,0.22), transparent 65%), radial-gradient(ellipse at bottom right, rgba(14,165,233,0.14), transparent 65%)',
    cardGlow: '0 0 35px rgba(37,99,235,0.25)',
    borderGlow: 'rgba(37,99,235,0.45)',
    badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
    badgeText: 'LIMITLESS • INFINITE BLUE',
    sidebarGradient: 'from-blue-600/25 via-sky-500/10 to-transparent',
    headerGradient: 'from-blue-600 via-indigo-600 to-cyan-500',
    activeNavGradient: 'bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 text-white font-extrabold shadow-lg shadow-blue-500/35',
    primaryButtonClass: 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold shadow-md shadow-blue-500/30',
    tagline: 'Zero Clashes with Limitless Domain Expansion.',
    rankLabel: 'Special Grade Blue',
  },
  'demon-slayer': {
    id: 'demon-slayer',
    name: 'Demon Slayer',
    colorName: 'Green',
    colorEmoji: '🟢',
    japaneseTitle: 'Demon Slayer Corps',
    characterName: 'Tanjiro Kamado',
    characterTitle: 'Sun Breathing • Demon Slayer Corps',
    series: 'Demon Slayer Corps',
    quote: 'Set your heart ablaze! Never let anyone break your spirit!',
    japaneseQuote: 'Total concentration breathing bringing precision and harmony.',
    primaryColor: '#059669', // Emerald Green
    secondaryColor: '#10b981', // Mint Green
    accentColor: '#6ee7b7', // Pale Green
    bgGlow: 'radial-gradient(ellipse at top, rgba(5,150,105,0.22), transparent 65%), radial-gradient(ellipse at bottom right, rgba(16,185,129,0.14), transparent 65%)',
    cardGlow: '0 0 35px rgba(5,150,105,0.25)',
    borderGlow: 'rgba(5,150,105,0.45)',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    badgeText: 'SUN BREATHING • EMERALD GREEN',
    sidebarGradient: 'from-emerald-600/25 via-teal-500/10 to-transparent',
    headerGradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    activeNavGradient: 'bg-gradient-to-r from-emerald-600 via-green-600 to-teal-500 text-white font-extrabold shadow-lg shadow-emerald-500/35',
    primaryButtonClass: 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-bold shadow-md shadow-emerald-500/30',
    tagline: 'Total Concentration: Academic Workload Breathing, First Form!',
    rankLabel: 'Hashira Pillar Green',
  },
  'one-piece': {
    id: 'one-piece',
    name: 'One Piece',
    colorName: 'Orange',
    colorEmoji: '🟠',
    japaneseTitle: 'Grand Line Pirates',
    characterName: 'Monkey D. Luffy',
    characterTitle: 'Captain of Straw Hat Pirates • Emperor',
    series: 'Straw Hat Grand Fleet',
    quote: "I'm gonna be King of the Pirates! Gomu Gomu no...",
    japaneseQuote: 'Sailing the high seas towards unmatched freedom and glory.',
    primaryColor: '#ea580c', // Flame Orange
    secondaryColor: '#f97316', // Orange
    accentColor: '#fdba74', // Peach
    bgGlow: 'radial-gradient(ellipse at top, rgba(234,88,12,0.22), transparent 65%), radial-gradient(ellipse at bottom right, rgba(249,115,22,0.14), transparent 65%)',
    cardGlow: '0 0 35px rgba(234,88,12,0.25)',
    borderGlow: 'rgba(234,88,12,0.45)',
    badgeBg: 'bg-orange-100 text-orange-900 border-orange-300',
    badgeText: 'STRAW HAT • GRAND LINE ORANGE',
    sidebarGradient: 'from-orange-600/25 via-amber-500/10 to-transparent',
    headerGradient: 'from-orange-600 via-red-600 to-amber-500',
    activeNavGradient: 'bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white font-extrabold shadow-lg shadow-orange-500/35',
    primaryButtonClass: 'bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white font-bold shadow-md shadow-orange-500/30',
    tagline: 'Sail across schedules with Straw Hat freedom!',
    rankLabel: 'Emperor of the Sea',
  },
  'attack-on-titan': {
    id: 'attack-on-titan',
    name: 'Attack on Titan',
    colorName: 'Teal',
    colorEmoji: '🌲',
    japaneseTitle: 'Scout Regiment',
    characterName: 'Levi Ackerman',
    characterTitle: "Humanity's Strongest Soldier • Survey Corps",
    series: 'Scout Regiment Special Ops',
    quote: 'Dedicate your hearts! Eradicate every clash and conflict!',
    japaneseQuote: 'Stand fearless and make choices with zero regrets.',
    primaryColor: '#0f766e', // Scout Teal
    secondaryColor: '#115e59', // Dark Teal
    accentColor: '#5eead4', // Mint
    bgGlow: 'radial-gradient(ellipse at top, rgba(15,118,110,0.22), transparent 65%), radial-gradient(ellipse at bottom right, rgba(17,94,89,0.14), transparent 65%)',
    cardGlow: '0 0 35px rgba(15,118,110,0.25)',
    borderGlow: 'rgba(15,118,110,0.45)',
    badgeBg: 'bg-teal-100 text-teal-900 border-teal-300',
    badgeText: 'SCOUT REGIMENT • MILITARY TEAL',
    sidebarGradient: 'from-teal-800/25 via-emerald-800/10 to-transparent',
    headerGradient: 'from-teal-700 via-emerald-800 to-stone-800',
    activeNavGradient: 'bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-800 text-white font-extrabold shadow-lg shadow-teal-700/35',
    primaryButtonClass: 'bg-gradient-to-r from-teal-700 to-emerald-800 hover:from-teal-800 hover:to-emerald-900 text-white font-bold shadow-md shadow-teal-700/30',
    tagline: 'Wings of Freedom: Defending academic schedules against chaos.',
    rankLabel: 'Captain Ackerman',
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Edgerunners',
    colorName: 'Cyan',
    colorEmoji: '⚡',
    japaneseTitle: 'Night City Legend',
    characterName: 'David Martinez',
    characterTitle: 'Sandevistan User • Night City Legend',
    series: 'Night City Underground',
    quote: "I'm built different. I will take us all the way to the moon!",
    japaneseQuote: 'Chrome cyberware overclocked to legendary high speeds.',
    primaryColor: '#06b6d4', // Neon Cyan
    secondaryColor: '#ec4899', // Hot Pink
    accentColor: '#67e8f9', // Cyan
    bgGlow: 'radial-gradient(ellipse at top, rgba(6,182,212,0.22), transparent 65%), radial-gradient(ellipse at bottom right, rgba(236,72,153,0.14), transparent 65%)',
    cardGlow: '0 0 40px rgba(6,182,212,0.28)',
    borderGlow: 'rgba(6,182,212,0.5)',
    badgeBg: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    badgeText: 'SANDEVISTAN • NEON CYAN',
    sidebarGradient: 'from-cyan-500/25 via-pink-500/10 to-transparent',
    headerGradient: 'from-cyan-400 via-sky-500 to-pink-500',
    activeNavGradient: 'bg-gradient-to-r from-cyan-500 via-sky-500 to-pink-500 text-white font-extrabold shadow-lg shadow-cyan-400/35',
    primaryButtonClass: 'bg-gradient-to-r from-cyan-500 via-sky-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 text-white font-bold shadow-md shadow-cyan-500/30',
    tagline: 'Overclock your workload with Sandevistan speed!',
    rankLabel: 'Night City Legend',
  },
};
