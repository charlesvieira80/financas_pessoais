import { useRef, TouchEvent, useCallback } from 'react';

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
  const isSwipeCancelled = useRef(false);

  // FIX: Use TouchEvent type from React import to resolve namespace error.
  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Reset refs for new touch
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
    isSwipeCancelled.current = false;
  }, []);

  // FIX: Use TouchEvent type from React import to resolve namespace error.
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isSwipeCancelled.current) return;

    const currentY = e.targetTouches[0].clientY;
    const verticalDiff = Math.abs(touchStartY.current - currentY);

    // If it becomes more of a vertical scroll, cancel the gesture for this touch session
    if (verticalDiff > maxVerticalThreshold) {
      isSwipeCancelled.current = true;
      return;
    }
    
    // Update end coordinates on move
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  }, [maxVerticalThreshold]);

  const handleTouchEnd = useCallback(() => {
    if (isSwipeCancelled.current) return;

    const horizontalDiff = touchStartX.current - touchEndX.current;

    // Swipe left (finger moved from right to left)
    if (horizontalDiff > threshold) {
      onSwipeLeft();
    }

    // Swipe right (finger moved from left to right)
    if (horizontalDiff < -threshold) {
      onSwipeRight();
    }
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};