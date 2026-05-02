import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

const { width: screenWidth } = Dimensions.get('window');

const getResponsiveWidth = (percentage) => (screenWidth * percentage) / 100;
const getResponsiveHeight = (percentage) => (screenWidth * percentage) / 100;
const getResponsiveFontSize = (size) => {
  const scale = screenWidth / 375;
  return Math.round(size * scale);
};

const NewsDetailScreen = ({ route }) => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { newsItem } = route.params;
  const imageSource = newsItem?.image ? (typeof newsItem.image === 'string' ? { uri: newsItem.image } : newsItem.image) : null;

  const handleBack = () => {
    navigation.goBack();
  };

  const handleShare = () => {
    // Backend-ready: Implement share functionality
    console.log('Share news:', newsItem.title);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('news_detail')}</Text>
        </View>
        
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* News Image */}
  {imageSource ? <Image source={imageSource} style={styles.newsImage} /> : <View style={[styles.newsImage,{justifyContent:'center',alignItems:'center'}]}><Text style={{color:'#666'}}>No Image</Text></View>}
        
        {/* News Content */}
        <View style={styles.contentContainer}>
          {/* Category */}
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryText}>{t(newsItem.category || 'news')}</Text>
          </View>

          {/* Title */}
          <Text style={styles.newsTitle}>{newsItem.title}</Text>

          {/* Meta Info */}
          <View style={styles.metaContainer}>
            <Text style={styles.authorText}>{t('by')} {newsItem.author || newsItem.source || ''}</Text>
            <Text style={styles.dateText}>{newsItem.publishedDate || (newsItem.date || '').slice(0,10)}</Text>
          </View>

          {/* Description */}
          {newsItem.description ? <Text style={styles.descriptionText}>{newsItem.description}</Text> : null}

          {/* Full Content */}
          <Text style={styles.fullContentText}>{newsItem.fullContent || newsItem.body}</Text>

          {/* Tags */}
          <View style={styles.tagsContainer}>
            <Text style={styles.tagsTitle}>{t('related_tags')}:</Text>
            <View style={styles.tagsRow}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{t(newsItem.category)}</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{t('football')}</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{t('sports')}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
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
  shareButton: {
    padding: getResponsiveWidth(2),
  },
  shareIcon: {
    fontSize: getResponsiveFontSize(20),
  },
  scrollView: {
    flex: 1,
  },
  newsImage: {
    width: '100%',
    height: getResponsiveHeight(65),
    resizeMode: 'cover',
  },
  contentContainer: {
    padding: getResponsiveWidth(5.3),
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: getResponsiveWidth(3),
    paddingVertical: getResponsiveHeight(1.5),
    borderRadius: getResponsiveWidth(2),
    marginBottom: getResponsiveHeight(4),
  },
  categoryText: {
    color: '#22C55E',
    fontSize: getResponsiveFontSize(12),
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  newsTitle: {
    color: '#fff',
    fontSize: getResponsiveFontSize(24),
    fontWeight: 'bold',
    lineHeight: getResponsiveFontSize(32),
    marginBottom: getResponsiveHeight(4),
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveHeight(5),
    paddingBottom: getResponsiveHeight(4),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  authorText: {
    color: '#22C55E',
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
  },
  dateText: {
    color: '#888',
    fontSize: getResponsiveFontSize(14),
  },
  descriptionText: {
    color: '#cccccc',
    fontSize: getResponsiveFontSize(16),
    lineHeight: getResponsiveFontSize(24),
    marginBottom: getResponsiveHeight(5),
    fontWeight: '600',
  },
  fullContentText: {
    color: '#ffffff',
    fontSize: getResponsiveFontSize(16),
    lineHeight: getResponsiveFontSize(26),
    marginBottom: getResponsiveHeight(8),
  },
  tagsContainer: {
    marginTop: getResponsiveHeight(4),
    paddingTop: getResponsiveHeight(4),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  tagsTitle: {
    color: '#fff',
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    marginBottom: getResponsiveHeight(3),
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: getResponsiveWidth(3),
    paddingVertical: getResponsiveHeight(1.5),
    borderRadius: getResponsiveWidth(5),
    marginRight: getResponsiveWidth(2.5),
    marginBottom: getResponsiveHeight(2.5),
  },
  tagText: {
    color: '#cccccc',
    fontSize: getResponsiveFontSize(12),
    fontWeight: '500',
  },
});

export default NewsDetailScreen;