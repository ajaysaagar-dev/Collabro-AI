import { useTheme } from 'next-themes';
import { ThemeButton } from 'modules/theme/presentation/ThemeButton';
import { Layout } from 'apps/web/src/app/layout';

export default function Page() {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
  };

  return (
    <Layout>
      <main className="max-w-7xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Theme Toggle</h1>
        <ThemeButton
          theme={theme}
          onThemeChange={handleThemeChange}
          darkModeSupport
          lightModeSupport
        />
      </main>
    </Layout>
  );
}