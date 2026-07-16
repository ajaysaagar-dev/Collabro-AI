import { SessionProvider } from './providers/SessionProvider';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider>
      <div className="bg-gray-100 min-h-screen flex flex-col justify-center items-center">
        {children}
      </div>
    </SessionProvider>
  );
};

export default Layout;