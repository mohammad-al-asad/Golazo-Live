import './i18n';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, SafeAreaView, Alert, Platform } from 'react-native';
import React, { useEffect, useState } from 'react';
import mobileAds, { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import Onboarding from './Screens/Onboarding';
import TabNavigator from './Navigation/TabNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import { getFavoriteCompetitions } from './Utils/favoriteStorage';
import { LEAGUES, SEASONS } from './Config/leagues';
import { fetchTeamsByLeague, fetchLeagueLogo } from './Utils/apiFootball';
import { preWarmLogos } from './Components/RemoteLogo';
import { AppState } from 'react-native';
import { showToast } from './Utils/toast';
import { scheduleTwiceDailyRandomNews, rescheduleForTomorrowIfNeeded, ensureNotificationPermission } from './Utils/notifications';

const AD_UNIT_ID = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : Platform.select({
      ios: process.env.EXPO_PUBLIC_IOS_BANNER_AD_UNIT_ID || TestIds.ADAPTIVE_BANNER,
      android: process.env.EXPO_PUBLIC_ANDROID_BANNER_AD_UNIT_ID || TestIds.ADAPTIVE_BANNER,
      default: TestIds.ADAPTIVE_BANNER,
    });

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Initialize Google Mobile Ads SDK
    mobileAds()
      .initialize()
      .then(adapterStatuses => {
        console.log('[AdMob] SDK initialized successfully');
      })
      .catch(error => {
        console.log('[AdMob] SDK initialization failed:', error);
      });

    checkOnboardingStatus();
    checkForUpdates(); // Add this
    // Confirm env keys are embedded without printing secrets.
    try {
      console.log('[ENV] EXPO_PUBLIC_NEWS_API_KEY loaded:', Boolean(process.env.EXPO_PUBLIC_NEWS_API_KEY));
      console.log('[ENV] EXPO_PUBLIC_FOOTBALL_API_KEY loaded:', Boolean(process.env.EXPO_PUBLIC_FOOTBALL_API_KEY));
    } catch (e) {}
    // Notification scheduling + Android 13 permission flow
    (async () => {
      try {
        await rescheduleForTomorrowIfNeeded();
        // Ask permission explicitly before scheduling (handles Android 13 POST_NOTIFICATIONS)
        const ok = await ensureNotificationPermission();
        if (ok) await scheduleTwiceDailyRandomNews();
      } catch (e) {
        console.log('Notification schedule failed', e);
      }
    })();
  }, []);

  // Prefetch logos (favorites + league/team assets) after initial loading (non-blocking)
  useEffect(() => {
    if (isLoading || showOnboarding) return;

    // Skip team prefetching in Expo Go for faster development
    if (__DEV__ && !process.env.NODE_ENV) {
      console.log('[App] Skipping team prefetch in Expo Go for faster development');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const favLeagueIds = await getFavoriteCompetitions();
        if (!favLeagueIds.length) return;

        // Limit to first 2 favorite leagues for faster startup
        const limitedFavLeagues = LEAGUES.filter(l => favLeagueIds.includes(l.id)).slice(0, 2);
        const season = SEASONS[0];
        const warmEntries = [];

        // League logos (fast)
        for (const lg of limitedFavLeagues) {
          try {
            const logo = await fetchLeagueLogo({ leagueId: lg.id });
            if (logo) warmEntries.push({ kind: 'league', leagueId: lg.id, leagueName: lg.name, logoUrl: logo });
          } catch {}
        }

        // Team logos - only for 1 league at startup, others later
        if (limitedFavLeagues.length > 0) {
          const firstLeague = limitedFavLeagues[0];
          try {
            const leagueSeason = firstLeague.season || season;
            const teams = await fetchTeamsByLeague(firstLeague.id, leagueSeason);
            // Limit to 20 teams per league for faster startup
            for (const t of teams.slice(0, 20)) {
              if (t.logo) warmEntries.push({ kind: 'team', teamId: t.id, teamName: t.name, logoUrl: t.logo });
            }
          } catch {}
        }

        if (!cancelled && warmEntries.length) await preWarmLogos(warmEntries);

        // Schedule remaining leagues for later (non-blocking)
        if (limitedFavLeagues.length > 1) {
          setTimeout(async () => {
            if (cancelled) return;
            try {
              const remainingLeagues = LEAGUES.filter(l => favLeagueIds.includes(l.id)).slice(1);
              const moreWarmEntries = [];

              for (const lg of remainingLeagues.slice(0, 3)) { // Max 3 more leagues
                try {
                  const leagueSeason = lg.season || season;
                  const teams = await fetchTeamsByLeague(lg.id, leagueSeason);
                  for (const t of teams.slice(0, 15)) { // Fewer teams for later loads
                    if (t.logo) moreWarmEntries.push({ kind: 'team', teamId: t.id, teamName: t.name, logoUrl: t.logo });
                  }
                } catch {}
              }

              if (!cancelled && moreWarmEntries.length) await preWarmLogos(moreWarmEntries);
            } catch {}
          }, 5000); // 5 seconds delay
        }

      } catch {}
    })();
    return () => { cancelled = true; };
  }, [isLoading, showOnboarding]);

  useEffect(() => {
  // Previously had a debug-only global cache-clear hook. Removed to eliminate debug surface.
  // If you want to clear memory cache on background, we can call an internal function here.
  return undefined;
  }, []);

  const checkForUpdates = async () => {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert(
          'Update Available',
          'A new version of the app is available. Would you like to update now?',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Update',
              onPress: async () => {
                await Updates.fetchUpdateAsync();
                Updates.reloadAsync();
              },
            },
          ],
          { cancelable: false }
        );
      }
    } catch (error) {
      console.log('Update check failed:', error);
    }
  };

  const checkOnboardingStatus = async () => {
    try {
      // Check if onboarding was completed before
      const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
      
      if (onboardingCompleted === null) {
        // First time user - show onboarding
        setShowOnboarding(true);
      } else {
        // User has seen onboarding - go to main app
        setShowOnboarding(false);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // Default to showing onboarding if error occurs
      setShowOnboarding(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      // Mark onboarding as completed
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      setShowOnboarding(false);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  // Show loading spinner while checking AsyncStorage
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  // Show onboarding or main app based on AsyncStorage
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <View style={styles.mainContainer}>
          <TabNavigator />
          <View style={styles.adContainer}>
            <BannerAd
              unitId={AD_UNIT_ID}
              size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
              requestOptions={{
                requestNonPersonalizedAdsOnly: true,
              }}
            />
          </View>
        </View>
        <StatusBar style="light" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  adContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    width: '100%',
    paddingBottom: 2,
  },
});
