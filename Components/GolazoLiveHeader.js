import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

const GolazoLiveHeader = () => {
  const { t } = useTranslation();

  return (
    <></>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F0F0F',
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default GolazoLiveHeader;