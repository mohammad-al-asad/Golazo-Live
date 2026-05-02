import React, { useState, useCallback, useMemo, memo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  SafeAreaView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import UpcomingOptimized from '../Components/UpcomingOptimized';
import ScoreOptimized from '../Components/ScoreOptimized';
import PerformanceMonitor from '../Components/PerformanceMonitor';

const { width: screenWidth } = Dimensions.get('window');
const getResponsiveFontSize = (size) => Math.round(size * (screenWidth / 375));
const hp = (percentage) => (Dimensions.get('window').height * percentage) / 100;
const wp = (percentage) => (Dimensions.get('window').width * percentage) / 100;
const rs = (size) => Math.round(size * (screenWidth / 375));

const GolazoLiveScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const topInset = insets.top || (Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0);

  // Calendar state management - exactly like LiveScreen
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [refreshAll, setRefreshAll] = useState(0);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  
  // Window calendar helpers - exact same as LiveScreen
  const WINDOW_RADIUS = 1; // one day each side (center + prev + next)

  const shiftDay = useCallback((delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  }, [selectedDate]);

  // Header element - stable via useMemo
  const HeaderElement = useMemo(() => (
    <View style={[styles.header, { paddingTop: topInset + 4 }]}>
      <Text style={styles.logo}>
        {t('golazo')} <Text style={styles.dot}>●</Text> {t('live')}
      </Text>
      {__DEV__ && (
        <TouchableOpacity 
          onPress={() => setShowPerformanceMonitor(true)}
          style={styles.debugButton}
        >
          <Text style={styles.debugText}>📊</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [topInset, t, __DEV__]);

  const onSelectDate = useCallback((key) => setSelectedDate(key), []);

  // Date window calculation - exact same logic as LiveScreen
  const dateWindow = useMemo(() => {
    const baseDate = new Date(selectedDate);
    const baseTime = baseDate.getTime();
    const arr = [];
    for (let i = -WINDOW_RADIUS; i <= WINDOW_RADIUS; i++) {
      const dayTime = baseTime + (i * 24 * 60 * 60 * 1000);
      const d = new Date(dayTime);
      const key = d.toISOString().slice(0, 10);
      const label = key === todayKey ? 'Today' : `${d.toLocaleDateString([], { weekday: 'short' })} ${d.getDate()}`;
      arr.push({ key, offset: i, label });
    }
    return arr;
  }, [selectedDate, todayKey]);

  // Calendar Row element - stable via useMemo
  const CalendarRowElement = useMemo(() => (
    <View style={styles.windowCalendarContainer}>
      <TouchableOpacity 
        onPress={() => shiftDay(-1)} 
        style={styles.arrowBtn} 
        hitSlop={{top:10,bottom:10,left:10,right:10}}
      >
        <Text style={styles.arrowText}>{'<'}</Text>
      </TouchableOpacity>
      <View style={styles.windowDatesRow}>
        {dateWindow.map(d => {
          const center = d.offset === 0;
          const isToday = d.key === todayKey;
          return (
            <TouchableOpacity
              key={d.key}
              onPress={() => {
                if (d.offset === 0) return; // already selected
                if (d.offset === -1) return shiftDay(-1);
                if (d.offset === 1) return shiftDay(1);
                return d.offset < 0 ? shiftDay(-1) : shiftDay(1);
              }}
              activeOpacity={0.85}
              style={styles.windowDateWrap}
            >
              <View style={[
                styles.windowChip, 
                center && styles.windowChipCenter, 
                isToday && !center && styles.todayOutline
              ]}>
                <Text style={[
                  styles.windowChipText, 
                  center && styles.windowChipTextCenter, 
                  isToday && !center && styles.todayText
                ]}>
                  {d.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
        <View pointerEvents="none" style={styles.fixedCenterHighlight} />
      </View>
      <TouchableOpacity 
        onPress={() => shiftDay(1)} 
        style={styles.arrowBtn} 
        hitSlop={{top:10,bottom:10,left:10,right:10}}
      >
        <Text style={styles.arrowText}>{'>'}</Text>
      </TouchableOpacity>
    </View>
  ), [dateWindow, todayKey, shiftDay]);

  // Tab bar element - stable via useMemo
  const TabsElement = useMemo(() => (
    <View style={styles.tabsRow}>
      {['Upcoming', 'Score'].map(tab => {
        const active = activeTab === tab;
        return (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabBtn, active && styles.tabBtnActive]}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  ), [activeTab]);

  const listHeader = useMemo(() => (
    <View>
      {HeaderElement}
      {CalendarRowElement}
      {TabsElement}
    </View>
  ), [HeaderElement, CalendarRowElement, TabsElement]);

  const handleListDidRefresh = useCallback(() => {
    setRefreshAll(k => k + 1);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      {activeTab === 'Upcoming' ? (
        <UpcomingOptimized
          selectedDate={selectedDate}
          maxPerLeague={0}
          ListHeaderComponent={listHeader}
          onDidRefresh={handleListDidRefresh}
        />
      ) : (
        <ScoreOptimized
          selectedDate={selectedDate}
          maxPerLeague={0}
          ListHeaderComponent={listHeader}
          onDidRefresh={handleListDidRefresh}
        />
      )}
      
      {__DEV__ && (
        <PerformanceMonitor
          visible={showPerformanceMonitor}
          onClose={() => setShowPerformanceMonitor(false)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: '#0F0F0F' 
  },
  
  // Header styles - matching LiveScreen exactly
  header: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(5), 
    paddingBottom: hp(1)
  },
  logo: { color: '#fff', fontSize: getResponsiveFontSize(28), fontWeight: 'bold' },
  dot: { color: '#22C55E' },
  debugButton: {
    padding: wp(2),
  },
  debugText: {
    fontSize: rs(16),
  },

  // Calendar styles - exact same as LiveScreen
  windowCalendarContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: hp(1), 
    paddingHorizontal: wp(3), 
    justifyContent: 'space-between' 
  },
  arrowBtn: { 
    paddingHorizontal: wp(2), 
    paddingVertical: hp(0.5) 
  },
  arrowText: { 
    color: '#fff', 
    fontSize: rs(18), 
    fontWeight: '600' 
  },
  windowDatesRow: { 
    flexDirection: 'row', 
    flex: 1, 
    justifyContent: 'space-around', 
    position: 'relative', 
    marginHorizontal: wp(2) 
  },
  windowDateWrap: { 
    alignItems: 'center' 
  },
  windowChip: { 
    backgroundColor: '#1E1E1E', 
    width: wp(12), 
    height: wp(8), 
    borderRadius: wp(2), 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  windowChipCenter: { 
    backgroundColor: '#22C55E' 
  },
  windowChipText: { 
    color: '#aaa', 
    fontSize: rs(13), 
    fontWeight: '600', 
    textAlign: 'center' 
  },
  windowChipTextCenter: { 
    color: '#fff', 
    fontWeight: '700' 
  },
  todayOutline: { 
    borderWidth: 1, 
    borderColor: '#2563EB' 
  },
  todayText: { 
    color: '#2563EB', 
    fontWeight: '700' 
  },
  fixedCenterHighlight: { 
    position: 'absolute', 
    width: wp(12), 
    height: wp(8), 
    borderRadius: wp(2), 
    left: '50%', 
    marginLeft: -wp(6), 
    top: 0 
  },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
  },
  tabBtn: {
    backgroundColor: '#1E1E1E',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
  },
  tabBtnActive: { backgroundColor: '#22C55E' },
  tabText: { color: '#aaa', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
});

export default GolazoLiveScreen;