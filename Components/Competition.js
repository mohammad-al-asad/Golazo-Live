import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { LEAGUES } from '../Config/leagues';
import RemoteLogo from './RemoteLogo';
import { getFavoriteCompetitions, toggleCompetitionFavorite } from '../Utils/favoriteStorage';

// Build competitions from LEAGUES config - memoized for performance
const buildInitialCompetitions = () => {
  return LEAGUES.map(l => ({
    id: l.id,
    key: l.key,
    name: l.name,
    flag: l.flag,
    logo: l.logo,
    favorite: false,
    category: l.category || 'league',
    season: l.season || null,
  }));
};

// Memoized competition item component for better performance
const CompetitionItem = React.memo(({ comp, onPress, onToggleFavorite }) => (
  <TouchableOpacity 
    style={styles.competitionCard} 
    onPress={() => onPress(comp)}
    activeOpacity={0.8}
  >
    <View style={styles.cardContent}>
      <RemoteLogo
        kind="league"
        leagueId={comp.id}
        leagueName={comp.name}
        style={styles.competitionLogo}
        fallback={<Text style={styles.flagFallback}>{comp.flag}</Text>}
      />
      <View style={styles.competitionInfo}>
        <Text style={styles.competitionName} numberOfLines={2}>{comp.name}</Text>
      </View>
      <TouchableOpacity 
        style={[styles.followButton, comp.favorite && styles.followButtonActive]}
        onPress={() => onToggleFavorite(comp.id)}
        activeOpacity={0.7}
      >
        <Text style={[styles.followButtonText, comp.favorite && styles.followButtonTextActive]}>
          {comp.favorite ? '✓' : '+'}
        </Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
));

const Competition = () => {
  const navigation = useNavigation();
  const [competitions, setCompetitions] = useState(buildInitialCompetitions());
  const { t } = useTranslation();
  const [favoriteIds, setFavoriteIds] = useState([]);

  // Load favorite competitions when component mounts or comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadFavorites();
    }, [])
  );

  const loadFavorites = useCallback(async () => {
    const favIds = await getFavoriteCompetitions();
    setFavoriteIds(favIds);
    setCompetitions(prev => 
      prev.map(comp => ({
        ...comp,
        favorite: favIds.includes(comp.id)
      }))
    );
  }, []);

  const toggleFavorite = useCallback(async (id) => {
    const newFavoriteIds = await toggleCompetitionFavorite(id);
    setFavoriteIds(newFavoriteIds);
    setCompetitions(prev => 
      prev.map(comp => ({
        ...comp,
        favorite: newFavoriteIds.includes(comp.id)
      }))
    );
  }, []);

  const openCompetition = useCallback((comp) => {
    navigation.navigate('CompetitionScreen', {
      leagueId: comp.id,
      leagueName: comp.name,
      leagueKey: comp.key,
      flag: comp.flag,
      season: comp.season, // Pass the specific season for international tournaments
    });
  }, [navigation]);

  // Memoized filtered competitions
  const { core, intl } = useMemo(() => ({
    core: competitions.filter(c => c.category !== 'international'),
    intl: competitions.filter(c => c.category === 'international')
  }), [competitions]);

  return (
    <SafeAreaView style={styles.container}>
  <Text style={styles.title}>{t('Competitions') || 'Competitions'}</Text>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={styles.grid}>
          {core.map(comp => (
            <View key={comp.id} style={styles.cardContainer}>
              <TouchableOpacity
                style={[styles.card, comp.favorite && styles.cardFav]}
                onPress={() => openCompetition(comp)}
                activeOpacity={0.8}
              >
                <RemoteLogo kind="league" leagueId={comp.id} leagueName={comp.name} logoUrl={comp.logo} size={42} style={{ marginBottom: 6 }} />
                <Text style={styles.name} numberOfLines={2}>{t(comp.name) || comp.name}</Text>
                <Text style={styles.countryFlag}>{comp.flag}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.followButton, comp.favorite && styles.followingButton]}
                onPress={() => toggleFavorite(comp.id)}
              >
                <Text style={[styles.followButtonText, comp.favorite && styles.followingButtonText]}>
                  {comp.favorite ? '★ Following' : '+ Follow'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {intl.length > 0 && (
          <View style={styles.intlSection}>
            <View style={styles.intlDividerRow}>
              <View style={styles.line} />
              <Text style={styles.intlLabel}>{t('International Cups')}</Text>
              <View style={styles.line} />
            </View>
            <View style={styles.grid}>
              {intl.map(comp => (
                <View key={comp.id} style={styles.cardContainer}>
                  <TouchableOpacity
                    style={[styles.card, styles.intlCard, comp.favorite && styles.cardFav]}
                    onPress={() => openCompetition(comp)}
                    activeOpacity={0.8}
                  >
                    <RemoteLogo kind="league" leagueId={comp.id} leagueName={comp.name} logoUrl={comp.logo} size={42} style={{ marginBottom: 6 }} />
                    <Text style={styles.name} numberOfLines={2}>{t(comp.name) || comp.name}</Text>
                    <Text style={styles.countryFlag}>{comp.flag}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.followButton, comp.favorite && styles.followingButton]}
                    onPress={() => toggleFavorite(comp.id)}
                  >
                    <Text style={[styles.followButtonText, comp.favorite && styles.followingButtonText]}>
                      {comp.favorite ? '★ Following' : '+ Follow'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
      <Text style={styles.hint}>Tap a card to open, or Follow to add to favorites.</Text>
      <Text style={styles.hint}>Version 6.0.2</Text>
    </SafeAreaView>
  );
};

export default Competition;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F', paddingHorizontal: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginVertical: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 4, paddingBottom: 12 },
  cardContainer: {
    width: '33.333%',
    paddingHorizontal: 4,
    marginBottom: 18,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    minHeight: 130,
  },
  intlSection: { marginTop: 24 },
  intlDividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  intlLabel: { color: '#22C55E', fontSize: 14, fontWeight: '700', marginHorizontal: 8 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(34,197,94,0.4)' },
  intlCard: { backgroundColor: '#222' },
  cardFav: {
    borderColor: '#22C55E',
    borderWidth: 1,
  },
  name: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center', minHeight: 32 },
  countryFlag: { fontSize: 14, marginTop: 4 },
  seasonTag: { marginTop: 4, color: '#ccc', fontSize: 10, fontWeight: '600' },
  followButton: {
    marginTop: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#22C55E',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#22C55E',
  },
  followButtonText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '700',
  },
  followingButtonText: {
    color: '#fff',
  },
  hint: { color: '#666', fontSize: 12, textAlign: 'center', paddingVertical: 8 },
});