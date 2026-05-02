import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'favorite_competitions';
const FAVORITE_TEAMS_KEY = 'favorite_teams';

// Cache for frequent reads
let favoritesCache = null;
let teamsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function isCacheValid() {
  return Date.now() - cacheTimestamp < CACHE_TTL;
}

export async function getFavoriteCompetitions() {
  try {
    if (favoritesCache && isCacheValid()) {
      return favoritesCache;
    }
    
    const stored = await AsyncStorage.getItem(FAVORITES_KEY);
    const result = stored ? JSON.parse(stored) : [];
    
    favoritesCache = result;
    cacheTimestamp = Date.now();
    
    return result;
  } catch (error) {
    console.warn('Failed to load favorite competitions:', error);
    return [];
  }
}

export async function saveFavoriteCompetitions(favoriteIds) {
  try {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds));
    favoritesCache = favoriteIds;
    cacheTimestamp = Date.now();
  } catch (error) {
    console.warn('Failed to save favorite competitions:', error);
  }
}

export async function toggleCompetitionFavorite(competitionId) {
  const favorites = await getFavoriteCompetitions();
  const isCurrentlyFavorite = favorites.includes(competitionId);
  
  let newFavorites;
  if (isCurrentlyFavorite) {
    newFavorites = favorites.filter(id => id !== competitionId);
  } else {
    newFavorites = [...favorites, competitionId];
  }
  
  await saveFavoriteCompetitions(newFavorites);
  return newFavorites;
}

export async function getFavoriteTeams() {
  try {
    if (teamsCache && isCacheValid()) {
      return teamsCache;
    }
    
    const stored = await AsyncStorage.getItem(FAVORITE_TEAMS_KEY);
    const result = stored ? JSON.parse(stored) : [];
    
    teamsCache = result;
    cacheTimestamp = Date.now();
    
    return result;
  } catch (error) {
    console.warn('Failed to load favorite teams:', error);
    return [];
  }
}

export async function saveFavoriteTeams(favoriteIds) {
  try {
    await AsyncStorage.setItem(FAVORITE_TEAMS_KEY, JSON.stringify(favoriteIds));
    teamsCache = favoriteIds;
    cacheTimestamp = Date.now();
  } catch (error) {
    console.warn('Failed to save favorite teams:', error);
  }
}

export async function toggleTeamFavorite(teamId) {
  const favorites = await getFavoriteTeams();
  const isCurrentlyFavorite = favorites.includes(teamId);
  
  let newFavorites;
  if (isCurrentlyFavorite) {
    newFavorites = favorites.filter(id => id !== teamId);
  } else {
    newFavorites = [...favorites, teamId];
  }
  
  await saveFavoriteTeams(newFavorites);
  return newFavorites;
}

// Batch operations for better performance
export async function batchUpdateFavorites(competitions = [], teams = []) {
  try {
  const pairs = [];
  if (competitions.length) pairs.push([FAVORITES_KEY, JSON.stringify(competitions)]);
  if (teams.length) pairs.push([FAVORITE_TEAMS_KEY, JSON.stringify(teams)]);

  if (pairs.length) await AsyncStorage.multiSet(pairs);
    
    if (competitions.length) {
      favoritesCache = competitions;
    }
    if (teams.length) {
      teamsCache = teams;
    }
    cacheTimestamp = Date.now();
  } catch (error) {
    console.warn('Failed to batch update favorites:', error);
  }
}

// Clear cache (useful for logout/reset)
export function clearFavoritesCache() {
  favoritesCache = null;
  teamsCache = null;
  cacheTimestamp = 0;
}
