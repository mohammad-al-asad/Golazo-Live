import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { getFootballNews } from '../Utils/newsApi';

const { width: screenWidth } = Dimensions.get('window');

const getResponsiveWidth = (percentage) => (screenWidth * percentage) / 100;
const getResponsiveHeight = (percentage) => (screenWidth * percentage) / 100;
const getResponsiveFontSize = (size) => {
  const scale = screenWidth / 375;
  return Math.round(size * scale);
};

const AllNewsScreen = ({ route }) => {
  const navigation = useNavigation();
  // Include i18n to access current language for API requests
  const { t, i18n } = useTranslation();
  const incomingArticles = route?.params?.articles || [];
  const [articles, setArticles] = useState(incomingArticles);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Normalize incoming raw articles to a consistent shape with a stable id
  const mapped = (arr=[]) => arr.map((a, idx) => ({
    // Prefer backend id; fall back to uri/key; lastly derive from date+title+index to avoid collisions
    id: a.id || a.uri || a.key || `${a.date || 'd'}-${(a.title||'t').slice(0,30)}-${idx}`,
    title: a.title,
    description: a.description || a.body || '',
    image: a.image && typeof a.image === 'string' ? { uri: a.image } : a.image || null,
    author: a.author || a.source || '',
    publishedDate: (a.date || '').slice(0,10),
    category: (a.concepts && a.concepts[0]?.label) || 'news',
    fullContent: a.body || a.fullContent || a.description || '',
  }));

  const load = useCallback(async (nextPage = 1, opts={}) => {
    if (loading) return;
    try {
      if (!opts.silent) setLoading(true);
      setError(null);
      const res = await getFootballNews({ lang: i18n.language, page: nextPage, count: 20 });
      if (res.error) throw new Error(res.error);
      setPage(res.page);
      setPages(res.pages);
      const newMapped = mapped(res.articles);
      setArticles(prev => {
        if (nextPage === 1) return newMapped; // fresh load
        // Deduplicate by id preserving first occurrence
        const existingIds = new Set(prev.map(a => a.id));
        const filtered = newMapped.filter(a => !existingIds.has(a.id));
        return [...prev, ...filtered];
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading, i18n.language]);

  useEffect(() => {
    load(1);
  }, [i18n.language, load]);

  const onRefresh = () => { setRefreshing(true); load(1, { silent: true }); };

  const onEndReached = () => { if (!loading && page < pages) load(page + 1, { silent: true }); };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleNewsPress = (newsItem) => { navigation.navigate('NewsDetailScreen', { newsItem }); };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('news_this_week')}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* News List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" />}
        onMomentumScrollEnd={(e) => {
          const { layoutMeasurement, contentSize, contentOffset } = e.nativeEvent;
          const paddingToBottom = 80;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) onEndReached();
        }}
      >
        <View style={styles.newsContainer}>
      {articles.map((newsItem, idx) => (
            <TouchableOpacity
        // Key: ensure uniqueness even if backend sends duplicates
        key={newsItem.id || `fallback-${idx}`}
              style={styles.newsCard}
              onPress={() => handleNewsPress(newsItem)}
              activeOpacity={0.9}
            >
              {newsItem.image ? <Image source={newsItem.image} style={styles.newsImage} /> : <View style={[styles.newsImage,{justifyContent:'center',alignItems:'center'}]}><Text style={{color:'#666'}}>No Image</Text></View>}
              <View style={styles.newsContent}>
                <View style={styles.categoryContainer}>
                  <Text style={styles.categoryText}>{t(newsItem.category)}</Text>
                </View>
                <Text style={styles.newsTitle} numberOfLines={2}>
                  {newsItem.title}
                </Text>
                <Text style={styles.newsDescription} numberOfLines={3}>
                  {newsItem.description}
                </Text>
                <View style={styles.newsFooter}>
                  <Text style={styles.newsAuthor}>{newsItem.author}</Text>
                  <Text style={styles.newsDate}>{newsItem.publishedDate}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
          {loading && <ActivityIndicator style={{marginVertical:24}} color="#22C55E" />}
          {error && !articles.length && <Text style={{color:'#fff', textAlign:'center', marginVertical:16}}>Failed to load news: {error}</Text>}
        </View>
      </ScrollView>
      <Text style={{color: '#311a0f', alignSelf: 'flex-end'}}>1.2.1</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveWidth(5.3),
    paddingVertical: getResponsiveHeight(4),
    paddingTop: getResponsiveHeight(12),
    backgroundColor: '#0F0F0F',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34, 197, 94, 0.1)',
  },
  backButton: {
    marginRight: getResponsiveWidth(4),
  },
  backArrow: {
    color: '#fff',
    fontSize: getResponsiveFontSize(30),
    fontWeight: 'bold',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
  },
  headerRight: {
    width: getResponsiveWidth(8),
  },
  scrollView: {
    flex: 1,
  },
  newsContainer: {
    paddingHorizontal: getResponsiveWidth(5.3),
    paddingTop: getResponsiveHeight(5),
  },
  newsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: getResponsiveWidth(4),
    marginBottom: getResponsiveHeight(5),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  newsImage: {
    width: '100%',
    height: getResponsiveHeight(50),
    resizeMode: 'cover',
  },
  newsContent: {
    padding: getResponsiveWidth(4),
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: getResponsiveWidth(2.5),
    paddingVertical: getResponsiveHeight(1),
    borderRadius: getResponsiveWidth(1.5),
    marginBottom: getResponsiveHeight(2.5),
  },
  categoryText: {
    color: '#22C55E',
    fontSize: getResponsiveFontSize(12),
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  newsTitle: {
    color: '#fff',
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    marginBottom: getResponsiveHeight(2.5),
    lineHeight: getResponsiveFontSize(24),
  },
  newsDescription: {
    color: '#cccccc',
    fontSize: getResponsiveFontSize(14),
    lineHeight: getResponsiveFontSize(20),
    marginBottom: getResponsiveHeight(3),
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsAuthor: {
    color: '#22C55E',
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
  },
  newsDate: {
    color: '#888',
    fontSize: getResponsiveFontSize(12),
  },
});

export default AllNewsScreen;