import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiveScreen from '../Screens/LiveScreen';
import FavoriteScreen from '../Screens/FavoriteScreen';
import AllNewsScreen from '../Screens/AllNewsScreen';
import NewsDetailScreen from '../Screens/NewsDetailScreen';
import { createStackNavigator } from '@react-navigation/stack';

// Create a stable News stack component so we don't pass an inline function to Tab.Screen
const NewsStack = createStackNavigator();
function NewsStackScreen() {
  return (
    <NewsStack.Navigator screenOptions={{ headerShown: false }}>
      <NewsStack.Screen name="AllNewsScreen" component={AllNewsScreen} />
      <NewsStack.Screen name="NewsDetailScreen" component={NewsDetailScreen} />
    </NewsStack.Navigator>
  );
}

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#2a2a2a',
          borderTopWidth: 1,
          height: 70 + insets.bottom,
          paddingBottom: insets.bottom + 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#22C55E',
        tabBarInactiveTintColor: '#666666',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
          marginTop: 5,
        },
      }}
    >
      <Tab.Screen
        name="Live"
        component={LiveScreen}
        options={{
          tabBarLabel: t('Live'),
          tabBarIcon: ({ color }) => (
            <Image
              source={require('../icons/Live_icon.png')}
              style={{ width: 24, height: 24, tintColor: color }}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Favorite"
        component={FavoriteScreen}
        options={{
          tabBarLabel: t('Favorite'),
          tabBarIcon: ({ color }) => (
            <Image
              source={require('../icons/Fav_icon.png')}
              style={{ width: 24, height: 24, tintColor: color }}
            />
          ),
        }}
      />

      {/* News tab uses a dedicated stack; use a stable component instead of inline function */}
      <Tab.Screen
        name="News"
        component={NewsStackScreen}
        options={{
          tabBarLabel: t('News'),
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="newspaper" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;