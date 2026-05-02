import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { getStoredNotifications, clearNotifications } from '../Utils/notificationStore';
import { useNavigation } from '@react-navigation/native';

const NotificationsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const list = await getStoredNotifications();
    setItems(list);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handlePress = (n) => {
    if (n.article) {
      navigation.navigate('NewsDetailScreen', { newsItem: n.article });
    }
  };

  const handleClear = async () => {
    await clearNotifications();
    setItems([]);
  };

  const renderItem = ({ item }) => {
    const date = new Date(item.receivedAt);
    return (
      <TouchableOpacity onPress={() => handlePress(item)} style={styles.card} activeOpacity={0.8}>
        <View style={styles.cardRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            {!!item.body && <Text style={styles.body} numberOfLines={3}>{item.body}</Text>}
            <Text style={styles.time}>{date.toLocaleString()}</Text>
          </View>
          {item.article && <Text style={styles.chevron}>›</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('Notifications') || 'Notifications'}</Text>
        </View>
        <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
          <Text style={styles.clearText}>{t('clear') || 'Clear'}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item, idx) => item.id || String(idx)}
        renderItem={renderItem}
        contentContainerStyle={items.length ? { padding: 16 } : { flex:1, padding:16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}><Text style={styles.emptyBell}>🔔</Text></View>
            
            
            <TouchableOpacity onPress={onRefresh} style={styles.emptyRefreshBtn}>
              <Text style={styles.emptyRefreshText}>{t('refresh') || 'Refresh'}</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex:1, backgroundColor:'#0F0F0F' },
  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:12 },
  backBtn: { padding:6, marginRight:8 },
  backArrow: { color:'#fff', fontSize:28, lineHeight:28 },
  headerCenter: { flex:1, alignItems:'center' },
  headerTitle: { color:'#fff', fontSize:18, fontWeight:'bold' },
  clearBtn: { padding:6 },
  clearText: { color:'#22C55E', fontSize:14, fontWeight:'600' },
  card: { backgroundColor:'#1a1a1a', borderRadius:12, padding:14, marginBottom:12 },
  cardRow: { flexDirection:'row' },
  title: { color:'#fff', fontSize:15, fontWeight:'600', marginBottom:4 },
  body: { color:'#bbb', fontSize:13, marginBottom:6 },
  time: { color:'#666', fontSize:11 },
  chevron: { color:'#22C55E', fontSize:28, lineHeight:28, paddingLeft:8 },
  emptyWrap: { flex:1, justifyContent:'center', alignItems:'center', paddingHorizontal:24 },
  emptyIconCircle: { width:72, height:72, borderRadius:36, backgroundColor:'rgba(34,197,94,0.12)', justifyContent:'center', alignItems:'center', marginBottom:20 },
  emptyBell: { fontSize:34, color:'#22C55E' },
  emptyTitle: { color:'#fff', fontSize:18, fontWeight:'700', marginBottom:8 },
  emptySubtitle: { color:'#888', fontSize:14, textAlign:'center', lineHeight:20, marginBottom:24 },
  emptyRefreshBtn: { backgroundColor:'#22C55E', paddingHorizontal:24, paddingVertical:10, borderRadius:24 },
  emptyRefreshText: { color:'#0F0F0F', fontWeight:'600', fontSize:14 },
});

export default NotificationsScreen;