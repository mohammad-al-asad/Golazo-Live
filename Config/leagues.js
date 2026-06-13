// Centralized list of leagues you care about (v3 IDs)
// You can edit this list anytime; screens will update automatically.
export const LEAGUES = [
  // Top European + Global
  { key: 'premier-league', id: 39,  name: 'Premier League',       flag: '🏴', logo: 'https://media.api-sports.io/football/leagues/39.png' },  // England
  { key: 'la-liga',        id: 140, name: 'La Liga',               flag: '🇪🇸', logo: 'https://media.api-sports.io/football/leagues/140.png' }, // Spain
  { key: 'serie-a',        id: 135, name: 'Serie A',               flag: '🇮🇹', logo: 'https://media.api-sports.io/football/leagues/135.png' }, // Italy
  { key: 'bundesliga',     id: 78,  name: 'Bundesliga',            flag: '🇩🇪', logo: 'https://media.api-sports.io/football/leagues/78.png' }, // Germany
  { key: 'ligue-1',        id: 61,  name: 'Ligue 1',               flag: '🇫🇷', logo: 'https://media.api-sports.io/football/leagues/61.png' }, // France
  { key: 'saudi-pro-league', id: 307, name: 'Saudi Pro League',    flag: '🇸🇦', logo: 'https://media.api-sports.io/football/leagues/307.png' }, // Saudi Arabia

  // Europe tournaments
  { key: 'ucl',            id: 2,   name: 'UEFA Champions League', flag: '🏆', logo: 'https://media.api-sports.io/football/leagues/2.png' },
  { key: 'uel',            id: 3,   name: 'UEFA Europa League',    flag: '🥈', logo: 'https://media.api-sports.io/football/leagues/3.png' },
  { key: 'ucl-w',          id: 525, name: 'UCL Women',             flag: '👑', logo: 'https://media.api-sports.io/football/leagues/525.png' },

  // Americas
  { key: 'mls',            id: 253, name: 'MLS',                   flag: '🇺🇸', logo: 'https://media.api-sports.io/football/leagues/253.png' },
  { key: 'mls-next-pro',   id: 909, name: 'MLS Next Pro',          flag: '🧪', logo: 'https://media.api-sports.io/football/leagues/909.png' },
  { key: 'liga-mx',        id: 262, name: 'Liga MX',               flag: '🇲🇽', logo: 'https://media.api-sports.io/football/leagues/262.png' },
  { key: 'liga-profesional-argentina', id: 128, name: 'Liga Profesional Argentina', flag: '🇦🇷', logo: 'https://media.api-sports.io/football/leagues/128.png' },
  { key: 'colombia-primera-a', id: 239, name: 'Colombia Primera A', flag: '🇨🇴', logo: 'https://media.api-sports.io/football/leagues/239.png' },
  { key: 'copa-argentina', id: 130, name: 'Copa Argentina',        flag: '🇦🇷', category: 'cup', season: 2024, logo: 'https://media.api-sports.io/football/leagues/130.png' },
  { key: 'copa-colombia',  id: 241, name: 'Copa Colombia',         flag: '🇨🇴', category: 'cup', season: 2024, logo: 'https://media.api-sports.io/football/leagues/241.png' },

  // Brazil
  { key: 'brasil-serie-a', id: 71,  name: 'Brazil Serie A',        flag: '🇧🇷', logo: 'https://media.api-sports.io/football/leagues/71.png' },
  

  // Austria
  { key: 'aut-bundesliga', id: 218, name: 'Austrian Bundesliga',   flag: '🇦🇹', logo: 'https://media.api-sports.io/football/leagues/218.png' },

  // World cups
  { key: 'world-cup',      id: 1,   name: 'FIFA World Cup',        flag: '🏆', category: 'international', season: 2026, logo: 'https://media.api-sports.io/football/leagues/1.png', localLogo: require('../assets/world_cup_logo.png') },
  { key: 'club-world-cup', id: 15,  name: 'FIFA Club World Cup',   flag: '🌍', logo: 'https://media.api-sports.io/football/leagues/15.png' },

  // International tournaments
  { key: 'euro-2024',                id: 4,    name: 'UEFA Euro 2024',                 flag: '🇪🇺', category: 'international', season: 2024, logo: 'https://media.api-sports.io/football/leagues/4.png' },
  { key: 'afcon-2025',               id: 6,    name: 'Africa Cup of Nations 2025',     flag: '🌍', category: 'international', season: 2025, logo: 'https://media.api-sports.io/football/leagues/6.png' },
  { key: 'asian-cup-2023',           id: 7,    name: 'AFC Asian Cup 2023',             flag: '🌏', category: 'international', season: 2023, logo: 'https://media.api-sports.io/football/leagues/7.png' },
  { key: 'fifa-intercontinental-2024', id: 1168, name: 'FIFA Intercontinental Cup 2024', flag: '🌐', category: 'international', season: 2024, logo: 'https://media.api-sports.io/football/leagues/1168.png' },
  { key: 'copa-america-2024',       id: 9,    name: 'Copa America 2024',          flag: '🌎', category: 'international', season: 2024, logo: 'https://media.api-sports.io/football/leagues/9.png' },
];

// Keep global seasons for competitions without an explicit season; tournaments above can override this.
export const SEASONS = [2025, 2024, 2023, 2022]; // fetch 2025 first, then 2024, then 2023, then 2022
export const DEFAULT_TIMEZONE =
  typeof Intl !== 'undefined' && Intl.DateTimeFormat
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'UTC';

