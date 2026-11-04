import { describe, it, expect } from 'vitest';
import { getDateStringInTimezone, getHoursUntilMidnight } from './services/streakService.js';

describe('Streak & Timezone Logic', () => {
  it('formats dates accurately for different timezones', () => {
    // 2026-11-04T00:30:00Z is 2026-11-04 in UTC, but 2026-11-03 in New York (UTC-5)
    const testDate = new Date('2026-11-04T00:30:00Z');

    const utcDate = getDateStringInTimezone(testDate, 'UTC');
    const nyDate = getDateStringInTimezone(testDate, 'America/New_York');
    const tokyoDate = getDateStringInTimezone(testDate, 'Asia/Tokyo');

    expect(utcDate).toBe('2026-11-04');
    expect(nyDate).toBe('2026-11-03');
    expect(tokyoDate).toBe('2026-11-04');
  });

  it('calculates remaining hours until midnight properly', () => {
    const hours = getHoursUntilMidnight('UTC');
    expect(hours).toBeGreaterThanOrEqual(0);
    expect(hours).toBeLessThanOrEqual(24);
  });
});

