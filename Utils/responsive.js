import { Dimensions, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');
const BASE_WIDTH = 375;   // iPhone X baseline
const BASE_HEIGHT = 812;

export const wp = (p) => (width * p) / 100;   // width percent
export const hp = (p) => (height * p) / 100;  // height percent

// responsive scale for fonts/borders/icons, tuned to preserve look
export const rs = (size, factor = 0.5) => {
  const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(size + (newSize - size) * factor));
};