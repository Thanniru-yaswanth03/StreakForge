'use client';

import React from 'react';
import type { HeatmapDay } from '@streakforge/shared-types';
import { GitHubContributionGraph } from './GitHubContributionGraph';

interface HeatmapCalendarProps {
  heatmapData: HeatmapDay[];
}

export function HeatmapCalendar({ heatmapData }: HeatmapCalendarProps) {
  return <GitHubContributionGraph heatmapData={heatmapData} />;
}
