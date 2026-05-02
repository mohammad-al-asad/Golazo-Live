//once in a lifetime, just when installed the app
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import React, { useState } from 'react';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: 1,
    image: require('../Images/Onboarding_1.png'),
    title: 'Easy Streaming',
    description: 'Choose your plan to watch live match your favourite club.',
  },
  {
    id: 2,
    image: require('../Images/Onboarding_2.png'),
    title: 'Always Uptodate',
    description: 'Stay updated with match highlight, preview and hot news',
  },
  {
    id: 3,
    image: require('../Images/Onboarding_3.png'),
    title: 'Get Amazing Reward',
    description: 'Redeem your points to get an amazing reward',
  },
];

const Onboarding = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete(); // Complete onboarding
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const skipOnboarding = () => {
    onComplete(); // Skip to main app
  };

  return (
    <View style={styles.container}>
      {/* Image */}
      <Image source={slides[currentSlide].image} style={styles.image} />
      
      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{slides[currentSlide].title}</Text>
        <Text style={styles.description}>{slides[currentSlide].description}</Text>
        
        {/* Dots indicator */}
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentSlide && styles.activeDot
              ]}
            />
          ))}
        </View>
        
        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.nextButton} onPress={nextSlide}>
            <Text style={styles.nextButtonText}>
              {currentSlide === slides.length - 1 ? "Let's Get Started" : "Next"}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.skipButton} 
            onPress={currentSlide === 0 ? skipOnboarding : prevSlide}
          >
            <Text style={styles.skipButtonText}>
              {currentSlide === 0 ? "Skip" : "Back"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181A20',
  },
  image: {
    width: width,
    height: 320,
    resizeMode: 'cover',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#555555',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  nextButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    borderRadius: 25,
    marginBottom: 12,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  skipButton: {
    backgroundColor: '#555555',
    paddingVertical: 16,
    borderRadius: 25,
  },
  skipButtonText: {
    color: '#CCCCCC',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default Onboarding;