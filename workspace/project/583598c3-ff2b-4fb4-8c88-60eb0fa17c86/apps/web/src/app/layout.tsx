import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata = {
  title: 'Task Management',
  description: 'A comprehensive task management application',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="flex flex-col min-h-screen">
          <header className="flex-shrink-0">
            <nav className="container mx-auto px-4 py-4" aria-label="Main navigation">
              <div className="flex items-center justify-between">
                <a href="/" className="text-2xl font-bold text-primary" aria-label="Task Management Home">
                  Task Manager
                </a>
                <div className="hidden md:flex items-center space-x-6">
                  <a href="/tasks" className="text-muted-foreground hover:text-foreground transition-colors" tabIndex={0}>
                    Tasks
                  </a>
                  <a href="/profile" className="text-muted-foreground hover:text-foreground transition-colors" tabIndex={0}>
                    Profile
                  </a>
                </div>
              </div>
            </nav>
          </header>
          <main className="flex-grow container mx-auto px-4 py-8" tabIndex={-1}>
            {children}
          </main>
          <footer className="flex-shrink-0 bg-muted py-6 mt-12 border-t">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} Task Management. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}