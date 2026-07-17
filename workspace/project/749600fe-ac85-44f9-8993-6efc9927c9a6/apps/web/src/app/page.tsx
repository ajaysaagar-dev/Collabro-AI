import { useTheme } from 'next-themes';
import { ThemeToggle } from 'modules/theme/presentation/theme-toggle-button';
import { useTheme as useSharedTheme } from 'shared/utils/theme';
import Layout from 'apps/web/src/app/layout';

export default function Page() {
  const { theme, setTheme } = useTheme();
  const { isDarkMode } = useSharedTheme();

  const handleThemeToggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <Layout>
      <main className="max-w-7xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Welcome to our app</h1>
        <ThemeToggle
          isDarkMode={isDarkMode}
          onToggle={handleThemeToggle}
          className="mb-4"
        />
        <p className="text-lg mb-4">
          This is a sample page with a theme toggle button.
        </p>
      </main>
    </Layout>
  );
}