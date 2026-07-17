import { useThemeToggle } from '../theme/application/theme-toggle-button-commands';
import { ThemeToggleButtonProps } from '../theme/application/theme-toggle-button-commands';
import { Theme } from '../shared/utils/theme';

const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({
  theme,
  onToggleTheme,
}) => {
  const toggleTheme = useThemeToggle(theme, onToggleTheme);
  return (
    <button
      className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-4 rounded"
      onClick={toggleTheme}
    >
      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
};

export default ThemeToggleButton;