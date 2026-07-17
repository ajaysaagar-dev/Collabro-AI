import { ThemeToggleProps } from 'modules/theme/presentation/theme-toggle-button';
import { useTheme } from 'shared/utils/theme';
import { useClient } from 'next/app/client';
import { PageProps } from 'apps/web/src/app/page';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { theme, toggleTheme } = useTheme();
  const client = useClient();

  const handleThemeToggle = useCallback(
    (newTheme: string) => {
      toggleTheme(newTheme);
      client.refresh();
    },
    [toggleTheme, client]
  );

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-gray-100 py-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-lg font-bold">App Name</h1>
          <ThemeToggleProps
            theme={theme}
            onToggle={handleThemeToggle}
            className="ml-4"
          />
        </div>
      </header>
      <main className="container mx-auto p-4">
        {children}
      </main>
    </div>
  );
};

export default Layout;