import { useState } from 'react';

interface ThemeToggleProps {
  theme: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme }) => {
  const [isDarkMode, setIsDarkMode] = useState(theme === 'dark');

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <button className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-4 rounded" onClick={toggleTheme}>
      {isDarkMode ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
};

export default ThemeToggle;