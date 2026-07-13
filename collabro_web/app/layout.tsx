import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { WorkspaceProvider } from './components/WorkspaceProvider';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ShaderBackground } from './components/ShaderBackground';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Collabro | AI OS & Workflow Dashboard',
  description: 'Orchestrate high-performance AI agents to build, deploy, and scale complex software ecosystems.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <head>
        {/* Load Google Material Symbols Outlined Icon Font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-on-surface overflow-x-hidden antialiased">
        <WorkspaceProvider>
          {/* WebGL Canvas Background */}
          <ShaderBackground />
          
          {/* Ambient grid overlay */}
          <div className="fixed inset-0 z-10 grid-overlay pointer-events-none"></div>
          
          {/* Navigation and Layout wrapper */}
          <div className="flex min-h-screen relative z-20">
            <Sidebar />
            
            <div className="flex-1 flex flex-col ml-24 min-h-screen relative z-30">
              <Header />
              
              <main className="flex-1 flex flex-col pt-16 min-h-[calc(100vh-64px)] w-full">
                {children}
              </main>
            </div>
          </div>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
