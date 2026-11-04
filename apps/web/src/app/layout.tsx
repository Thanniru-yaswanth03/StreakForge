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
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className="antialiased selection:bg-emerald-500 selection:text-white transition-colors duration-200">
        <ThemeProvider>
          <DataProvider>{children}</DataProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
