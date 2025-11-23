
import { useState, useEffect, Dispatch, SetStateAction, useRef } from 'react';

function getInitialValue<T>(key: string, defaultValue: T): T {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(error);
      return defaultValue;
    }
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  // Use a ref to track if the key has actually changed to avoid unnecessary re-renders/loops
  const keyRef = useRef(key);

  const [storedValue, setStoredValue] = useState<T>(() => {
    return getInitialValue(key, initialValue);
  });

  // If the key changes (e.g., user switching), we need to re-read from localStorage
  useEffect(() => {
    if (keyRef.current !== key) {
        setStoredValue(getInitialValue(key, initialValue));
        keyRef.current = key;
    }
  }, [key, initialValue]);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
