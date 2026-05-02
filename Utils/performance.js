// Performance monitoring and optimization utilities

let performanceMetrics = {
  apiCalls: 0,
  cacheHits: 0,
  cacheMisses: 0,
  averageResponseTime: 0,
  slowQueries: [],
  memoryUsage: 0,
  lastReset: Date.now()
};

const SLOW_QUERY_THRESHOLD = 2000; // 2 seconds
const MAX_SLOW_QUERIES = 20;

export function trackApiCall(endpoint, duration, cached = false) {
  performanceMetrics.apiCalls++;
  
  if (cached) {
    performanceMetrics.cacheHits++;
  } else {
    performanceMetrics.cacheMisses++;
    
    // Update average response time
    const totalCalls = performanceMetrics.apiCalls - performanceMetrics.cacheHits;
    performanceMetrics.averageResponseTime = 
      (performanceMetrics.averageResponseTime * (totalCalls - 1) + duration) / totalCalls;
  }
  
  // Track slow queries
  if (duration > SLOW_QUERY_THRESHOLD) {
    performanceMetrics.slowQueries.push({
      endpoint,
      duration,
      timestamp: Date.now()
    });
    
    // Keep only recent slow queries
    if (performanceMetrics.slowQueries.length > MAX_SLOW_QUERIES) {
      performanceMetrics.slowQueries = performanceMetrics.slowQueries.slice(-MAX_SLOW_QUERIES);
    }
  }
}

export function updateMemoryUsage(usage) {
  performanceMetrics.memoryUsage = usage;
}

export function getPerformanceStats() {
  const cacheHitRate = performanceMetrics.apiCalls > 0 
    ? (performanceMetrics.cacheHits / performanceMetrics.apiCalls * 100).toFixed(2)
    : 0;
    
  return {
    ...performanceMetrics,
    cacheHitRate: `${cacheHitRate}%`,
    uptime: Date.now() - performanceMetrics.lastReset
  };
}

export function resetMetrics() {
  performanceMetrics = {
    apiCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageResponseTime: 0,
    slowQueries: [],
    memoryUsage: 0,
    lastReset: Date.now()
  };
}

// Debounced function utility for performance
export function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Throttle function utility
export function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return function (...args) {
    if (!lastRan) {
      func.apply(this, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(this, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

// Memory monitoring (React Native specific)
export function getMemoryInfo() {
  if (__DEV__ && global.performance?.memory) {
    return {
      used: global.performance.memory.usedJSHeapSize,
      total: global.performance.memory.totalJSHeapSize,
      limit: global.performance.memory.jsHeapSizeLimit
    };
  }
  return null;
}

// Component render time tracking
export function withPerformanceTracking(Component, componentName) {
  return function PerformanceTrackedComponent(props) {
    const startTime = Date.now();
    
    React.useEffect(() => {
      const renderTime = Date.now() - startTime;
      if (renderTime > 100) { // Track renders taking more than 100ms
        console.log(`[Performance] ${componentName} render time: ${renderTime}ms`);
      }
    });
    
    return React.createElement(Component, props);
  };
}
