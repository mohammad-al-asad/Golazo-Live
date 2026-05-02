//this is where the app starts
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Dimensions, StatusBar, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { wp, hp, rs } from '../Utils/responsive'; // ADD
import GolazoLiveHeader from '../Components/GolazoLiveHeader';
import NewsThisWeek from '../Components/NewsThisWeek';
import LiveNow from '../Components/LiveNow';
import GolazoLiveScreen from './GolazoLiveScreen';
import MatchDetailsScreen from './MatchDetailsScreen';
import AllNewsScreen from './AllNewsScreen';
import NewsDetailScreen from './NewsDetailScreen';
import NotificationsScreen from './NotificationsScreen';

const Stack = createStackNavigator();

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Main Home Content Component
const HomeContent = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();

  // Backend-ready functions
  const handleSearch = () => {
    // TODO: Implement search functionality
    console.log('Search pressed');
  };

  const handleNotifications = () => {
    navigation.navigate('NotificationsScreen');
  };

  const handleLanguageChange = () => {
    // Toggle language for demo; backend-ready for user preference
    const nextLang = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(nextLang);
  };

  return (
    <SafeAreaView style={[styles.container, {  }]} edges={['top', 'bottom']}>
      
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>{t('golazo')}</Text>
          <Text style={styles.logoDot}>●</Text>
          <Text style={styles.logoLive}>{t('live')}</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton} onPress={handleSearch}>
            
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleNotifications}>
            <View style={styles.iconWrapper}>
              <Text style={styles.bellIcon}>🔔</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.languageButton} onPress={handleLanguageChange}>
            <View style={styles.flagContainer}>
              <Text style={styles.flag}>{i18n.language === 'en' ? '🇬🇧' : '🇪🇸'}</Text>
              <Text style={styles.languageText}>{(i18n.language || 'en').toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.componentContainer}>
          <GolazoLiveHeader />
        </View>
        <View style={styles.componentContainer}>
          <NewsThisWeek />
        </View>
        <View style={styles.componentContainer}>
          <LiveNow showSeeAll={true} />
        </View>
        
        {/* Add your other content here */}
        <View style={styles.footerSpace}>
          {/* Future sections will go here */}
        </View>
      </ScrollView>
      
    </SafeAreaView>
  );
};

// Home Screen with Stack Navigation
const HomeScreen = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeContent} />
      <Stack.Screen name="GolazoLive" component={GolazoLiveScreen} />
      <Stack.Screen name="MatchDetailsScreen" component={MatchDetailsScreen} />
      <Stack.Screen name="AllNewsScreen" component={AllNewsScreen} />
  <Stack.Screen name="NewsDetailScreen" component={NewsDetailScreen} />
  <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(5.3),
    paddingVertical: hp(1.8),
    backgroundColor: '#0F0F0F',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34, 197, 94, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minHeight: hp(4.5),
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    color: '#ffffff',
    fontSize: rs(24),
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  logoDot: {
    color: '#22C55E',
    fontSize: rs(16),
    fontWeight: 'bold',
    marginHorizontal: wp(0.5),
    position: 'relative',
    top: -2,
  },
  logoLive: {
    color: '#22C55E',
    fontSize: rs(24),
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: wp(3),
  },
  iconWrapper: {
    width: wp(9.6),
    height: wp(9.6),
    borderRadius: wp(4.8),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    fontSize: rs(16),
    color: '#ffffff',
  },
  bellIcon: {
    fontSize: rs(16),
    color: '#ffffff',
  },
  languageButton: {
    marginLeft: wp(3),
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: wp(3.2),
    paddingVertical: hp(0.7),
    borderRadius: wp(4.8),
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  flagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: rs(14),
    marginRight: wp(1.6),
  },
  languageText: {
    color: '#22C55E',
    fontSize: rs(12),
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  scrollContent: {
    paddingBottom: hp(4),
    flexGrow: 1,
  },
  componentContainer: {
    marginBottom: hp(-1.2),
  },
  footerSpace: {
    height: hp(2.5),
    paddingHorizontal: wp(5.3),
  },
});

export default HomeScreen;