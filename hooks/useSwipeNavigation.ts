
import { useRef, TouchEvent } from 'react';

interface SwipeConfig {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  threshold?: number;
  maxVerticalThreshold?: number;
}

/**
 * A custom hook to detect swipe gestures on touch devices.
 * @param {SwipeConfig} config - Configuration object with callbacks and thresholds.
 * @returns An object with `onTouchStart`, `onTouchMove`, and `onTouchEnd` event handlers.
 */
export const useSwipeNavigation = ({ 
  onSwipeLeft, 
  onSwipeRight, 
  threshold = 50, // Minimum horizontal distance for a swipe
  maxVerticalThreshold = 75 // Maximum vertical distance to differentiate from scrolling
}: SwipeConfig) => {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);

  // FIX: Use TouchEvent type from React import to resolve namespace error.
  const handleTouchStart = (e: TouchEvent) => {
    // Reset refs for new touch
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  // FIX: Use TouchEvent type from React import to resolve namespace error.
  const handleTouchMove = (e: TouchEvent) => {
    // Update end coordinates on move
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    const horizontalDiff = touchStartX.current - touchEndX.current;
    const verticalDiff = Math.abs(touchStartY.current - touchEndY.current);
    
    // Ignore if it's more of a vertical scroll
    if (verticalDiff > maxVerticalThreshold) {
        return;
    }

    // Swipe left (finger moved from right to left)
    if (horizontalDiff > threshold) {
      onSwipeLeft();
    }

    // Swipe right (finger moved from left to right)
    if (horizontalDiff < -threshold) {
      onSwipeRight();
    }
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};
