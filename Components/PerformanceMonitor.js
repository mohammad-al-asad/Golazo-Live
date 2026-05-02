import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { smartDataManager } from '../Utils/smartDataManager';
import { getCacheStats } from '../Utils/apiFootball';
import { wp, hp, rs } from '../Utils/responsive';

const PerformanceMonitor = ({ visible, onClose }) => {
  const [stats, setStats] = useState({});
  const [apiStats, setApiStats] = useState({});
  const [asyncStats, setAsyncStats] = useState({});

  useEffect(() => {
    if (!visible) return;

    const updateStats = () => {
      setStats(smartDataManager.getCacheStats());
      setApiStats(getCacheStats());
      
      // AsyncStorage stats
      setAsyncStats({
        initialized: smartDataManager.isInitialized,
        lastSync: smartDataManager.lastSyncTime,
        startupPrefetchComplete: smartDataManager.startupPrefetchComplete,
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  const handleClearCache = () => {
    smartDataManager.clearCache();
    setStats(smartDataManager.getCacheStats());
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Performance Monitor</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Smart Data Manager</Text>
            <Text style={styles.stat}>Cache Size: {stats.total || 0}</Text>
            <Text style={styles.stat}>Valid Entries: {stats.valid || 0}</Text>
            <Text style={styles.stat}>Loading: {stats.loading || 0}</Text>
            <Text style={styles.stat}>Hit Rate: {stats.hitRate || '0%'}</Text>
            <Text style={[styles.stat, stats.isActivelyPrefetching && styles.activeStat]}>
              Prefetching: {stats.isActivelyPrefetching ? 'Yes' : 'No'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>API Cache</Text>
            <Text style={styles.stat}>Size: {apiStats.size || 0}</Text>
            <Text style={styles.stat}>Hits: {apiStats.hits || 0}</Text>
            <Text style={styles.stat}>Misses: {apiStats.misses || 0}</Text>
            <Text style={styles.stat}>Hit Rate: {apiStats.hitRate || '0%'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AsyncStorage Cache</Text>
            <Text style={[styles.stat, asyncStats.initialized ? styles.activeStat : {color: '#ff6b6b'}]}>
              Status: {asyncStats.initialized ? '✅ Initialized' : '⏳ Initializing...'}
            </Text>
            <Text style={styles.stat}>
              Last Sync: {asyncStats.lastSync ? new Date(asyncStats.lastSync).toLocaleString() : 'Never'}
            </Text>
            <Text style={[styles.stat, asyncStats.startupPrefetchComplete ? styles.activeStat : {color: '#ffa500'}]}>
              Startup Prefetch: {asyncStats.startupPrefetchComplete ? '✅ Complete' : '🔄 In Progress'}
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity onPress={handleClearCache} style={styles.button}>
              <Text style={styles.buttonText}>Clear Smart Cache</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: wp(4),
    padding: wp(6),
    width: wp(80),
    maxHeight: hp(70),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(3),
  },
  title: {
    color: '#ffffff',
    fontSize: rs(18),
    fontWeight: 'bold',
  },
  closeButton: {
    padding: wp(2),
  },
  closeText: {
    color: '#999',
    fontSize: rs(18),
  },
  section: {
    marginBottom: hp(3),
  },
  sectionTitle: {
    color: '#22C55E',
    fontSize: rs(16),
    fontWeight: '600',
    marginBottom: hp(1),
  },
  stat: {
    color: '#ffffff',
    fontSize: rs(14),
    marginBottom: hp(0.5),
  },
  activeStat: {
    color: '#22C55E',
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#22C55E',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderRadius: wp(2),
  },
  buttonText: {
    color: '#ffffff',
    fontSize: rs(14),
    fontWeight: '600',
  },
});

export default PerformanceMonitor;
