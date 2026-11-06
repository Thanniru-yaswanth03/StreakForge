import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { WeaknessDetectorService } from '../services/weaknessDetectorService.js';
import { PlannerService } from '../services/plannerService.js';
import { MultiPlatformService } from '../services/multiPlatformService.js';
import { GamificationService } from '../services/gamificationService.js';
import { SolutionAnalyzerService } from '../services/solutionAnalyzerService.js';
import { MockInterviewService } from '../services/mockInterviewService.js';
import { KnowledgeVaultService } from '../services/knowledgeVaultService.js';
import { WeeklyReportService } from '../services/weeklyReportService.js';
import { PatternService } from '../services/patternService.js';
import { CareerReadinessService } from '../services/careerReadinessService.js';
import { PublicProfileService } from '../services/publicProfileService.js';
import type { PeriodType, InterviewDifficulty } from '@streakforge/shared-types';

export const streakForge3Router: Router = Router();

// ==========================================
// 1. CODING CONSISTENCY INTELLIGENCE
// ==========================================
streakForge3Router.get(
  '/analytics/consistency',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const period = (req.query.period as PeriodType) || 'weekly';
      const days = period === 'daily' ? 7 : period === 'monthly' ? 30 : period === 'yearly' ? 365 : 14;

      const cadence = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const label = period === 'yearly' ? d.toLocaleDateString('en-US', { month: 'short' }) : dayNames[d.getDay()];
        cadence.push({
          label,
          count: Math.floor(Math.random() * 4) + 1,
          genuineCommits: Math.floor(Math.random() * 3) + 1,
          leetCodeSolves: Math.floor(Math.random() * 2),
          codeforcesSolves: 0
        });
      }

      res.json({
        success: true,
        data: {
          consistencyScore: 92,
          streakDays: 2,
          longestStreakDays: 15,
          activeDaysPastYear: 37,
          weeklyAverageSolves: 4.8,
          mostProductiveDay: 'Wednesday',
          activityCadence: cadence.slice(-14),
          trend: 'UPWARD'
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// 2. DSA WEAKNESS DETECTOR & RECOMMENDATIONS
// ==========================================
streakForge3Router.get(
  '/learning/weaknesses',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const report = await WeaknessDetectorService.analyzeWeaknesses(req.userId!);
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// 3. PERSONAL CODING PLANNER
// ==========================================
streakForge3Router.get(
  '/planner',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const planner = await PlannerService.getPlanner(req.userId!);
      res.json({ success: true, data: planner });
    } catch (err) {
      next(err);
    }
  }
);

streakForge3Router.post(
  '/planner/targets',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { dailyTarget, weeklyTarget } = req.body;
      const updated = await PlannerService.updateTargets(req.userId!, dailyTarget, weeklyTarget);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

streakForge3Router.post(
  '/planner/routines',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { studyRoutines } = req.body;
      const updated = await PlannerService.updateRoutines(req.userId!, studyRoutines);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// 4. MULTI-PLATFORM ACTIVITY TRACKER
// ==========================================
streakForge3Router.get(
  '/platforms/profiles',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const data = await MultiPlatformService.getPlatformProfiles(req.userId!);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

streakForge3Router.post(
  '/platforms/connect',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { platform, handle } = req.body;
      await MultiPlatformService.connectPlatform(req.userId!, platform, handle);
      const data = await MultiPlatformService.getPlatformProfiles(req.userId!);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// 5. XP, DEVELOPER LEVELS & ACHIEVEMENTS
// ==========================================
streakForge3Router.get(
  '/gamification/profile',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const profile = await GamificationService.getGamificationProfile(req.userId!);
      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// 6. SOLUTION QUALITY ANALYZER
// ==========================================
streakForge3Router.get(
  '/solutions/:slug',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const record = await SolutionAnalyzerService.getSolutionRecord(req.userId!, String(req.params.slug));
      res.json({ success: true, data: record });
    } catch (err) {
      next(err);
    }
  }
);

streakForge3Router.post(
  '/solutions/:slug/approaches',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const updated = await SolutionAnalyzerService.addApproach(req.userId!, String(req.params.slug), req.body);
      res.status(201).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// 7. MOCK INTERVIEW PRACTICE MODE
// ==========================================
streakForge3Router.post(
  '/interview/start',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const difficulty = (req.body.difficulty as InterviewDifficulty) || 'MEDIUM';
      const track = req.body.track || 'Blind 75';
      const session = await MockInterviewService.startSession(req.userId!, difficulty, track);
      res.status(201).json({ success: true, data: session });
    } catch (err) {
      next(err);
    }
  }
);

streakForge3Router.post(
  '/interview/complete',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { sessionId, timeSpentSeconds, problemResults } = req.body;
      const session = await MockInterviewService.completeSession(sessionId, timeSpentSeconds, problemResults);
      res.json({ success: true, data: session });
    } catch (err) {
      next(err);
    }
  }
);

streakForge3Router.get(
  '/interview/sessions',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const sessions = await MockInterviewService.getSessions(req.userId!);
      res.json({ success: true, data: sessions });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// 8. PERSONAL DSA KNOWLEDGE VAULT
// ==========================================
streakForge3Router.get(
  '/vault/notes',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const tag = req.query.tag as string;
      const folder = req.query.folder as string;
      const search = req.query.search as string;
      const notes = await KnowledgeVaultService.listNotes(req.userId!, tag, folder, search);
      res.json({ success: true, data: notes });
    } catch (err) {
      next(err);
    }
  }
);

streakForge3Router.post(
  '/vault/notes',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const note = await KnowledgeVaultService.createNote(req.userId!, req.body);
      res.status(201).json({ success: true, data: note });
    } catch (err) {
      next(err);
    }
  }
);

streakForge3Router.put(
  '/vault/notes/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const updated = await KnowledgeVaultService.updateNote(req.userId!, String(req.params.id), req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

streakForge3Router.delete(
  '/vault/notes/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      await KnowledgeVaultService.deleteNote(req.userId!, String(req.params.id));
      res.json({ success: true, message: 'Note deleted' });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// 9. WEEKLY DEVELOPER REPORT
// ==========================================
streakForge3Router.get(
  '/reports/weekly',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const report = await WeeklyReportService.generateWeeklyReport(req.userId!);
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// 10. PATTERN RECOGNITION ENGINE
// ==========================================
streakForge3Router.get(
  '/patterns/overview',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const patterns = await PatternService.getPatternsOverview(req.userId!);
      res.json({ success: true, data: patterns });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// 11. CAREER READINESS DASHBOARD
// ==========================================
streakForge3Router.get(
  '/career/readiness',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const readiness = await CareerReadinessService.calculateReadiness(req.userId!);
      res.json({ success: true, data: readiness });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// 12. DEVELOPER PUBLIC PROFILE (NO AUTH REQUIRED)
// ==========================================
streakForge3Router.get(
  '/public/u/:username',
  async (req, res: Response, next) => {
    try {
      const profile = await PublicProfileService.getPublicProfile(String(req.params.username));
      if (!profile) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Public profile not found or set to private.' }
        });
        return;
      }
      res.set('Cache-Control', 'public, max-age=60, s-maxage=300');
      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }
);
