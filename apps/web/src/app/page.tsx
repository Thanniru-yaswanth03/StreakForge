'use client';

import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { OnboardingModal } from '../components/OnboardingModal';
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
import { LearningIntelligenceView } from '../views/LearningIntelligenceView';
import { CurriculumView } from '../views/CurriculumView';
import { RevisionQueueView } from '../views/RevisionQueueView';
import { ReadmeCatalogView } from '../views/ReadmeCatalogView';
import { ProfileBadgesView } from '../views/ProfileBadgesView';
import { SyncToast } from '../components/SyncToast';
import { useData } from '../context/DataContext';

export default function DashboardPage() {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(false);
  const { connectedRepos, githubRepos, refreshData } = useData();

  const renderActiveView = () => {
    switch (currentTab) {
      case 'overview':
        return <OverviewView />;
      case 'intelligence':
        return <LearningIntelligenceView onNavigate={setCurrentTab} />;
      case 'curriculum':
        return <CurriculumView />;
      case 'revision':
        return <RevisionQueueView />;
      case 'catalog':
        return <ReadmeCatalogView />;
      case 'badges':
        return <ProfileBadgesView />;
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
      <div className="flex-1 flex flex-col lg:pl-56 transition-all duration-200">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
          onTabChange={setCurrentTab}
          onOpenOnboarding={() => setOnboardingOpen(true)}
        />

        {/* Page View Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-7">
          {renderActiveView()}
        </main>

        {/* Global On-Screen Notification Toast */}
        <SyncToast />

        {/* Minimal Footer */}
        <footer className="border-t border-theme-border py-3.5 px-6 text-center text-[11px] text-theme-muted">
          StreakForge • Zero-Fabrication Authentic Coding Activity Synchronization
        </footer>
      </div>

      {/* Onboarding Wizard Modal */}
      <OnboardingModal
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
      />
    </div>
  );
}
