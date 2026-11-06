import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

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

