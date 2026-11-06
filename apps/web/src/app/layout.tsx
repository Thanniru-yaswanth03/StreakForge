import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '../context/ThemeContext';
import { DataProvider } from '../context/DataContext';

export const metadata: Metadata = {
  title: 'StreakForge — Authentic Coding Activity & LeetCode Synchronization',
  description:
    'Maintain accurate coding activity records and synchronize genuine coding work across GitHub and LeetCode without fabrication.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <meta name="streakforge-api-url" content={apiUrl} />
      </head>
      <body className="antialiased selection:bg-emerald-500 selection:text-white transition-colors duration-200">
        <ThemeProvider>
          <DataProvider>{children}</DataProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
