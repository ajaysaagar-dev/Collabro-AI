'use client';

import { useState, useEffect } from 'react';
import { ThemeService } from '../application/ThemeService';

interface ThemeButtonProps {
  className?: string;
}

export const ThemeButton = ({ className = '' }: ThemeButtonProps) => {
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initTheme = async () => {
      const theme = await ThemeService.getCurrentTheme();
      setCurrentTheme(theme);
    };
    initTheme();
  }, []);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const newTheme = await ThemeService.toggleTheme();
      setCurrentTheme(newTheme);
    } catch (error) {
      console.error('Failed to toggle theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getThemeIcon = () => {
    return currentTheme === 'dark' ? (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2a8 8 0 00-8 8c0 3.5 2.3 6.5 5.5 7.5v-5.5l-2-2 2-2 4 4-4 4-2-2v6a8 8 0 008-8c0-2.2-1-4.2-2.6-5.5l-5.5 5.5A8 8 0 0010 2z" />
      </svg>
    ) : (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2a1 1 0 011 1v2a1 1 0 01-2 0V3a1 1 0 011-1zm0 14a1 1 0 011 1v2a1 1 0 01-2 0v-2a1 1 0 011-1zm6.293-6.293a1 1 0 010 1.414l-1.414 1.414a1 1 0 01-1.414-1.414l1.414-1.414a1 1 0 011.414 0zM4.293 4.293a1 1 0 010 1.414L2.879 7.121a1 1 0 01-1.414-1.414l1.414-1.414a1 1 0 011.414 0zM14.95 10.95a1 1 0 01-1.414 0l-1.414-1.414a1 1 0 00-1.414 1.414l1.414 1.414a1 1 0 001.414-1.414zM6.05 6.05a1 1 0 01-1.414 0L3.223 4.636a1 1 0 00-1.414 1.414l1.414 1.414a1 1 0 001.414-1.414zM10 12a2 2 0 100-4 2 2 0 000 4z" />
      </svg>
    );
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      aria-label={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
      className={`
        flex items-center justify-center w-10 h-10 rounded-full 
        transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
        ${currentTheme === 'dark' 
          ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700 focus:ring-yellow-500' 
          : 'bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-500'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        getThemeIcon()
      )}
    </button>
  );
};