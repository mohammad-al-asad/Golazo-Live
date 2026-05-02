//the second part of HomeScreen
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, PanResponder, Animated, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// No static fallback: rely solely on live API.

import { getFootballNews } from '../Utils/newsApi';
import { getTopNewsKeys } from '../Utils/topNewsStore';

const NewsThisWeek = () => {
  // Destructure i18n so we can read current language safely
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [articles, setArticles] = useState([]); // live articles only
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef(null);
  const translateX = useRef(new Animated.Value(0)).current;

  // Derive filtered list (exclude top news + items without images)
  const topKeys = getTopNewsKeys();
  const filteredArticles = articles.filter(a => {
    const key = a.id || a.uri || a.key || a.title;
    if (topKeys.has(key)) return false; // exclude if used in header
    if (!a.image) return false; // must have image
    return true;
  });
  const totalItems = filteredArticles.length;

  // Auto-play interval only when we have multiple filtered articles
  useEffect(() => {
    if (totalItems < 2) return; 
    const interval = setInterval(() => { goToNext(); }, 6000);
    return () => clearInterval(interval);
  }, [currentImageIndex, totalItems]);

  const loadArticles = useCallback(async (opts={}) => {
    try {
      if (!opts.silent) setLoading(true);
      setError(null);
  // Request more to mitigate filtering (image + top exclusion + keywords)
  const res = await getFootballNews({ lang: i18n.language, count: 25 });
      if (res.error) throw new Error(res.error);
      if (Array.isArray(res.articles)) setArticles(res.articles);
  setCurrentImageIndex(0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [i18n.language]);

  // Reload when language changes
  useEffect(() => { loadArticles(); }, [loadArticles]);

  // totalItems now derived above

  const goToPrevious = () => {
    if (!totalItems) return;
    const newIndex = currentImageIndex === 0 ? totalItems - 1 : currentImageIndex - 1;
    animateToIndex(newIndex);
  };

  const goToNext = () => {
    if (!totalItems) return;
    const newIndex = currentImageIndex === totalItems - 1 ? 0 : currentImageIndex + 1;
    animateToIndex(newIndex);
  };

  const animateToIndex = (index) => {
    setCurrentImageIndex(index);
    if (scrollViewRef.current) {
      // Use Animated.timing for slower, more controlled animation
      const targetX = index * (width - 40);
      
      Animated.timing(translateX, {
        toValue: targetX,
        duration: 800, // Slower animation - 800ms
        useNativeDriver: false,
      }).start();

      // Also animate the ScrollView for smoother transition
      scrollViewRef.current.scrollTo({
        x: targetX,
        animated: true,
      });
    }
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > 20;
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dx > 50) {
        // Swipe right - go to previous
        goToPrevious();
      } else if (gestureState.dx < -50) {
        // Swipe left - go to next
        goToNext();
      }
    },
  });

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / (width - 40));
    if (index !== currentImageIndex && index >= 0 && index < totalItems) {
      setCurrentImageIndex(index);
    }
  };

  const effectiveList = filteredArticles; // already filtered
  const mapToCard = (item, idx) => {
    if (item.image && typeof item.image === 'string') {
      return { key: item.id || idx, title: item.title, time: item.date || '', image: { uri: item.image }, description: item.description, fullContent: item.body, author: item.source || '', publishedDate: (item.date||'').slice(0,10), raw: item };
    }
    return { key: item.id || idx, title: item.title, time: item.date || '', image: item.image ? { uri: item.image } : null, description: item.description, fullContent: item.body, author: item.author || item.source || '—', publishedDate: (item.date||'').slice(0,10), raw: item };
  };

  const cards = effectiveList.map(mapToCard);

  const handleNewsPress = (card) => {
    navigation.navigate('NewsDetailScreen', { newsItem: card });
  };

  const handleSeeAllPress = () => { navigation.navigate('News', { articles: cards }); };

  const onRefresh = () => { setRefreshing(true); loadArticles({ silent: true }); };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('news_this_week')}</Text>
        <TouchableOpacity onPress={handleSeeAllPress}>
          <Text style={styles.seeAllText}>{t('see_all')}</Text>
        </TouchableOpacity>
      </View>

      {/* News Image Section with Carousel */}
      <View style={styles.carouselContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          snapToInterval={width - 40}
          snapToAlignment="start"
          decelerationRate="normal"
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl tintColor="#22C55E" refreshing={refreshing} onRefresh={onRefresh} />}
          {...panResponder.panHandlers}
        >
      {loading && !articles.length ? (
            <View style={[styles.imageContainer,{justifyContent:'center',alignItems:'center'}]}>
              <ActivityIndicator color="#22C55E" size="large" />
            </View>
          ) : null}
      {!loading && error ? (
            <View style={[styles.imageContainer,{justifyContent:'center',alignItems:'center'}]}>
              <Text style={{color:'#fff', textAlign:'center', paddingHorizontal:16}}>Failed to load news. Pull to retry.\n{error}</Text>
            </View>
          ) : null}
      {cards.map((card, index) => (
            <View key={card.id || card.key || index} style={styles.imageContainer}>
              <TouchableOpacity 
                style={styles.newsCard}
                onPress={() => handleNewsPress(card)}
                activeOpacity={0.9}
              >
        {card.image ? <Image source={card.image} style={styles.newsImage} /> : <View style={[styles.newsImage,{justifyContent:'center',alignItems:'center'}]}><Text style={{color:'#666'}}>No Image</Text></View>}
                <View style={styles.overlay}>
                  <View style={styles.newsInfo}>
                    <Text style={styles.matchTeams}>
                      {card.title}
                    </Text>
                    <Text style={styles.matchTime}>
                      {card.time}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* News Description & Category */}
      {cards.length && cards[currentImageIndex] ? (
        <View style={styles.newsDetails}>
          <Text style={styles.newsCategory}>
            {t(cards[currentImageIndex]?.raw?.category || 'news')}
          </Text>
          <Text style={styles.newsDescription}>
            {cards[currentImageIndex]?.description}
          </Text>
        </View>
      ) : !loading && !error ? (
        <Text style={{color:'#666', textAlign:'center', marginTop:12}}>No articles.</Text>
      ) : null}

      {/* Carousel Dots */}
      <View style={styles.dotsContainer}>
  {cards.map((_, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.dot,
              idx === currentImageIndex && styles.activeDot,
            ]}
            onPress={() => animateToIndex(idx)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F0F0F',
    paddingTop: 15,
    paddingBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  seeAllText: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
  },
  carouselContainer: {
    marginBottom: 10,
  },
  scrollContent: {
    paddingLeft: 20,
    paddingRight: 20,
  },
  imageContainer: {
    width: width - 40, // Show edges of other images
    marginRight: 15,
  },
  newsCard: {
    height: width * 0.4, // Responsive height
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  newsImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  newsInfo: {
    alignItems: 'flex-start',
  },
  matchTeams: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 18,
  },
  matchTime: {
    color: '#cccccc',
    fontSize: 12,
    opacity: 0.9,
  },
  newsDetails: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 8,
  },
  newsCategory: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  newsDescription: {
    color: '#cccccc',
    fontSize: 14,
    marginBottom: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#22C55E',
    width: 16,
  },
});

export default NewsThisWeek;