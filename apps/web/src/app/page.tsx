'use client';

import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { OverviewView } from '../views/OverviewView';
import { GitHubActivityView } from '../views/GitHubActivityView';
import { LeetCodeActivityView } from '../views/LeetCodeActivityView';
import { RepoManager } from '../components/RepoManager';
import { AutomationCenterView } from '../views/AutomationCenterView';
import { StreakCalendarView } from '../views/StreakCalendarView';
import { AnalyticsView } from '../views/AnalyticsView';
import { ActivityJournalView } from '../views/ActivityJournalView';
import { NotificationsView } from '../views/NotificationsView';
import { SettingsView } from '../views/SettingsView';
import { useData } from '../context/DataContext';

export default function DashboardPage() {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const { connectedRepos, githubRepos, refreshData } = useData();

  const renderActiveView = () => {
    switch (currentTab) {
      case 'overview':
        return <OverviewView />;
      case 'github':
        return <GitHubActivityView />;
      case 'leetcode':
        return <LeetCodeActivityView />;
      case 'repos':
        return (
          <RepoManager
            connected={connectedRepos}
            githubAvailable={githubRepos}
            onRefresh={refreshData}
          />
        );
      case 'automation':
        return <AutomationCenterView />;
      case 'calendar':
        return <StreakCalendarView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'journal':
        return <ActivityJournalView />;
      case 'notifications':
        return <NotificationsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg text-theme-primary flex flex-col font-sans transition-colors duration-200">
      {/* Sidebar (Desktop persistent + Mobile slide-over) */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-60 transition-all duration-200">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
          onTabChange={setCurrentTab}
        />

        {/* Page View Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {renderActiveView()}
        </main>

        {/* Minimal Footer */}
        <footer className="border-t border-theme-border py-4 px-6 text-center text-[11px] text-theme-muted">
          StreakForge • Zero-Fabrication Authentic Coding Activity Synchronization
        </footer>
      </div>
    </div>
  );
}
