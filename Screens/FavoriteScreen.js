import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { wp, hp, rs } from '../Utils/responsive';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Competition from '../Components/Competition';
import Teams from '../Components/Teams';
import Player from '../Components/Player';
import CompetitionScreen from './CompetitionScreen';
import TeamDetailsScreen from './TeamDetailsScreen';
import PlayerDetailsScreen from '../Components/PlayerDetailsScreen';

const Stack = createStackNavigator();

// responsive helpers (wp: width %, hp: height %, rs: responsive size)

const TABS = [
  { key: 'Competition', label: 'Competition' },
  { key: 'Teams', label: 'Team' },
  { key: 'Player', label: 'Player' },
];

const FavoriteMainScreen = () => {
  const [activeTab, setActiveTab] = useState('Competition');
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();

  const topInset = insets.top || (Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0);

  const handleNotifications = () => {
    navigation.navigate('NotificationsScreen');
  };

  const handleLanguageChange = () => {
    const nextLang = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(nextLang);
  };

  const onTabPress = useCallback((key) => setActiveTab(key), [setActiveTab]);

  const TabButtons = useMemo(() => (
    <View style={styles.tabsRow}>
      {TABS.map(tab => (
        <TouchableOpacity
          key={tab.key}
          onPress={() => onTabPress(tab.key)}
          style={styles.tabButton}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.tabText,
            activeTab === tab.key && styles.activeTabText
          ]}>
            {t(tab.label)}
          </Text>
          {activeTab === tab.key && <View style={styles.activeTabUnderline} />}
        </TouchableOpacity>
      ))}
    </View>
  ), [activeTab, onTabPress, t]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar translucent={false} backgroundColor="#0F0F0F" barStyle="light-content" />

      {/* Header (styled same as LiveScreen) */}
      <View style={[styles.header, { paddingTop: topInset + 4 }]}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>{t('golazo')}</Text>
          <Text style={styles.logoDot}>●</Text>
          <Text style={styles.logoLive}>{t('Favorite')}</Text>
        </View>
        
      </View>

  {/* Tabs Row */}
  {TabButtons}

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'Competition' && <Competition />}
        {activeTab === 'Teams' && <Teams />}
        {activeTab === 'Player' && <Player />}
      </View>
    </SafeAreaView>
  );
};

// Main FavoriteScreen with Stack Navigation
const FavoriteScreen = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="FavoriteMain" component={FavoriteMainScreen} />
      <Stack.Screen name="CompetitionScreen" component={CompetitionScreen} />
      <Stack.Screen name="TeamDetailsScreen" component={TeamDetailsScreen} />
      <Stack.Screen name="PlayerDetailsScreen" component={PlayerDetailsScreen} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F0F0F' },
  header: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingBottom: hp(1)
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    color: '#ffffff',
    fontSize: rs(24),
    fontWeight: 'bold',
  },
  logoDot: {
    color: '#22C55E',
    fontSize: rs(24),
    fontWeight: 'bold',
    marginHorizontal: wp(1),
  },
  logoLive: {
    color: '#ffffff',
    fontSize: rs(24),
    fontWeight: 'bold',
  },

  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  iconButton: { padding: wp(1) },
  iconWrapper: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellIcon: { fontSize: rs(16) },
  languageButton: { padding: wp(1) },
  flagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2),
    borderRadius: rs(12),
    gap: wp(1),
  },
  flag: { fontSize: rs(16) },
  languageText: { color: '#ffffff', fontSize: rs(12), fontWeight: '600' },

  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34, 197, 94, 0.1)',
    marginHorizontal: wp(4),
    marginBottom: hp(1.2),
    paddingTop: hp(1.2),
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: hp(1.2),
    position: 'relative',
  },
  tabText: { color: '#cccccc', fontSize: rs(15), fontWeight: 'bold' },
  activeTabText: { color: '#22C55E' },
  activeTabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#22C55E',
    borderRadius: 2,
  },
  content: { flex: 1, backgroundColor: '#0F0F0F', paddingHorizontal: wp(4), paddingTop: hp(1.2) },
});

export default FavoriteScreen;