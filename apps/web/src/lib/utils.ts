import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getResolvedApiUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    const isLocal =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
        return 'https://streakforge-api-5uhs.onrender.com/api/v1';
      }
    }
  }
  return (
    envUrl ||
    (process.env.NODE_ENV === 'production'
      ? 'https://streakforge-api-5uhs.onrender.com/api/v1'
      : 'http://localhost:4000/api/v1')
  ).replace(/\/+$/, '');
}

export const API_BASE_URL = getResolvedApiUrl();

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  const local = localStorage.getItem('streakforge_token');
  if (local) return local;

  const match = document.cookie.match(/(?:^|;\s*)streakforge_token=([^;]+)/);
  if (match && match[1]) {
    try {
      localStorage.setItem('streakforge_token', match[1]);
    } catch {
      // ignore
    }
    return match[1];
  }

  return null;
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('streakforge_token', token);
  } catch {
    // ignore
  }
  document.cookie = `streakforge_token=${token}; path=/; max-age=604800; SameSite=Lax`;
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('streakforge_token');
  } catch {
    // ignore
  }
  document.cookie = 'streakforge_token=; path=/; max-age=0; SameSite=Lax';
}

