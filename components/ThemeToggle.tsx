import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { SunIcon, MoonIcon } from './shared/icons';

// This component can be a simple toggle switch or icon button
// depending on where it's used. For the mobile menu, we might
// want a switch, but an icon is fine for the sidebar.
export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center justify-center">
        <label htmlFor="theme-toggle" className="flex items-center cursor-pointer">
            <div className="relative">
                <input type="checkbox" id="theme-toggle" className="sr-only" checked={theme === 'dark'} onChange={toggleTheme} />
                <div className="block bg-slate-200 dark:bg-slate-700 w-12 h-6 rounded-full transition"></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </div>
        </label>
    </div>
  );
};
