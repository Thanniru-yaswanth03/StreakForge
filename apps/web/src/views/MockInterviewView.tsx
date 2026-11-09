'use client';

import React, { useState, useEffect } from 'react';
import {
  Timer,
  Play,
  CheckCircle2,
  AlertCircle,
  Award,
  Clock,
  RotateCw,
  Code,
  FileCode,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Terminal,
  Zap
} from 'lucide-react';
import { api } from '../lib/api';
import type { MockInterviewSession, InterviewDifficulty } from '@streakforge/shared-types';
import {
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  getProblemBoilerplate
} from '../lib/boilerplates';

export function MockInterviewView() {
  const [activeSession, setActiveSession] = useState<MockInterviewSession | null>(null);
  const [sessions, setSessions] = useState<MockInterviewSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [starting, setStarting] = useState<boolean>(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<InterviewDifficulty>('MEDIUM');
  const [selectedTrack, setSelectedTrack] = useState<string>('Blind 75');

  // Active Session state
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [currentProblemIdx, setCurrentProblemIdx] = useState<number>(0);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('python3');
  const [codeScratchpad, setCodeScratchpad] = useState<string>('');
  const [codeStore, setCodeStore] = useState<Record<string, string>>({});
  const [problemSolvedState, setProblemSolvedState] = useState<Record<string, boolean>>({});
  const [problemNotes, setProblemNotes] = useState<Record<string, string>>({});
  const [completing, setCompleting] = useState<boolean>(false);

  const fetchPastSessions = async () => {
    try {
      setLoading(true);
      const res = await api.interview.getSessions();
      const data = (res as any)?.data ?? res;
      if (Array.isArray(data)) {
        setSessions(data);
      }
    } catch (err) {
      console.error('Failed to load past sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPastSessions();
  }, []);

  // Timer countdown hook
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'IN_PROGRESS' || secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession, secondsRemaining]);

  // Auto-hydrate boilerplate when active problem or language changes
  useEffect(() => {
    if (!activeSession || !activeSession.problems || activeSession.problems.length === 0) return;
    const currentProb = activeSession.problems[currentProblemIdx];
    if (!currentProb) return;

    const key = `${currentProb.slug}__${selectedLanguage}`;
    if (codeStore[key] !== undefined) {
      setCodeScratchpad(codeStore[key]);
    } else {
      const freshBoilerplate = getProblemBoilerplate(
        currentProb.slug,
        currentProb.title,
        currentProb.category || '',
        selectedLanguage
      );
      setCodeStore((prev) => ({ ...prev, [key]: freshBoilerplate }));
      setCodeScratchpad(freshBoilerplate);
    }
  }, [activeSession, currentProblemIdx, selectedLanguage]);

  const handleStartInterview = async () => {
    try {
      setStarting(true);
      const res = await api.interview.start(selectedDifficulty, selectedTrack);
      const session = (res as any)?.data ?? res;
      if (session && (session.id || session.problems)) {
        setActiveSession(session);
        setSecondsRemaining((session.timeLimitMinutes || 45) * 60);
        setCurrentProblemIdx(0);
        setProblemSolvedState({});
        setProblemNotes({});
        if (session.problems && session.problems.length > 0) {
          const p0 = session.problems[0];
          const initialCode = getProblemBoilerplate(
            p0.slug,
            p0.title,
            p0.category || '',
            selectedLanguage
          );
          const key = `${p0.slug}__${selectedLanguage}`;
          setCodeStore({ [key]: initialCode });
          setCodeScratchpad(initialCode);
        }
      }
    } catch (err) {
      console.error('Failed to start interview:', err);
    } finally {
      setStarting(false);
    }
  };

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    if (!activeSession || !activeSession.problems) {
      setSelectedLanguage(newLang);
      return;
    }
    const currentProb = activeSession.problems[currentProblemIdx];
    if (!currentProb) {
      setSelectedLanguage(newLang);
      return;
    }

    const oldKey = `${currentProb.slug}__${selectedLanguage}`;
    const newKey = `${currentProb.slug}__${newLang}`;

    const nextCode = codeStore[newKey] ?? getProblemBoilerplate(
      currentProb.slug,
      currentProb.title,
      currentProb.category || '',
      newLang
    );

    setCodeStore((prev) => ({
      ...prev,
      [oldKey]: codeScratchpad,
      [newKey]: nextCode
    }));
    setCodeScratchpad(nextCode);
    setSelectedLanguage(newLang);
  };

  const handleSelectProblem = (newIdx: number) => {
    if (!activeSession || !activeSession.problems) return;
    const currentProb = activeSession.problems[currentProblemIdx];
    const nextProb = activeSession.problems[newIdx];
    if (!nextProb) return;

    const oldKey = currentProb ? `${currentProb.slug}__${selectedLanguage}` : '';
    const newKey = `${nextProb.slug}__${selectedLanguage}`;

    const nextCode = codeStore[newKey] ?? getProblemBoilerplate(
      nextProb.slug,
      nextProb.title,
      nextProb.category || '',
      selectedLanguage
    );

    setCodeStore((prev) => ({
      ...prev,
      ...(oldKey ? { [oldKey]: codeScratchpad } : {}),
      [newKey]: nextCode
    }));
    setCodeScratchpad(nextCode);
    setCurrentProblemIdx(newIdx);
  };

  const handleResetBoilerplate = () => {
    if (!activeSession || !activeSession.problems) return;
    const currentProb = activeSession.problems[currentProblemIdx];
    if (!currentProb) return;

    const fresh = getProblemBoilerplate(
      currentProb.slug,
      currentProb.title,
      currentProb.category || '',
      selectedLanguage
    );
    const key = `${currentProb.slug}__${selectedLanguage}`;
    setCodeStore((prev) => ({ ...prev, [key]: fresh }));
    setCodeScratchpad(fresh);
  };

  const handleCodeChange = (val: string) => {
    setCodeScratchpad(val);
    if (activeSession && activeSession.problems) {
      const currentProb = activeSession.problems[currentProblemIdx];
      if (currentProb) {
        const key = `${currentProb.slug}__${selectedLanguage}`;
        setCodeStore((prev) => ({ ...prev, [key]: val }));
      }
    }
  };

  const handleToggleSolved = (slug: string) => {
    setProblemSolvedState((prev) => ({
      ...prev,
      [slug]: !prev[slug]
    }));
  };

  const handleAutoSubmit = () => {
    handleSubmitSession();
  };

  const handleSubmitSession = async () => {
    if (!activeSession) return;
    try {
      setCompleting(true);
      const timeSpent = activeSession.timeLimitMinutes * 60 - secondsRemaining;
      const results = activeSession.problems.map((p) => ({
        slug: p.slug,
        solved: Boolean(problemSolvedState[p.slug]),
        notes: problemNotes[p.slug] || ''
      }));

      const res = await api.interview.complete(activeSession.id, timeSpent, results);
      const completed = (res as any)?.data ?? res;
      if (completed) {
        setActiveSession(completed);
        fetchPastSessions();
      }
    } catch (err) {
      console.error('Failed to complete interview:', err);
    } finally {
      setCompleting(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-theme-border bg-theme-surface shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-theme-primary">Mock Interview Practice Arena</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 font-mono">
                Real-Time Simulation
              </span>
            </div>
            <p className="text-xs text-theme-muted mt-1">
              Simulate rigorous real-world technical interviews with strict time limits, realistic problem sets, and post-session performance grading.
            </p>
          </div>
        </div>

        {activeSession?.status === 'IN_PROGRESS' && (
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-lg bg-theme-elevated border border-amber-500/50 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
              <span className="text-base font-extrabold text-theme-primary font-mono">
                {formatTimer(secondsRemaining)}
              </span>
            </div>
            <button
              onClick={handleSubmitSession}
              disabled={completing}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition"
            >
              {completing ? 'Submitting...' : 'End & Grade Session'}
            </button>
          </div>
        )}
      </div>

      {/* Main Viewport: Either Active Session, Completed Score, or Setup Screen */}
      {!activeSession || activeSession.status === 'COMPLETED' ? (
        <div className="space-y-6">
          {/* If there is a just-completed session, show summary card */}
          {activeSession && activeSession.status === 'COMPLETED' && (
            <div className="p-6 rounded-xl border border-theme-border bg-theme-surface shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-theme-border">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-theme-primary">
                      Interview Session Completed
                    </h2>
                    <p className="text-xs text-theme-muted">
                      Track: {activeSession.track} &bull; Difficulty: {activeSession.difficulty}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                    {activeSession.scorePercent}%
                  </span>
                  <div className="text-xs text-theme-muted">
                    Time spent: {Math.round((activeSession.timeSpentSeconds || 0) / 60)} min
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-lg bg-theme-elevated border border-theme-border">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 block mb-1">
                  Interviewer Assessment:
                </span>
                <p className="text-xs text-theme-secondary leading-relaxed">
                  {activeSession.feedback}
                </p>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setActiveSession(null)}
                  className="px-4 py-1.5 text-xs font-medium text-theme-secondary hover:text-theme-primary bg-theme-elevated hover:bg-theme-surface border border-theme-border rounded-lg transition"
                >
                  Start Another Session
                </button>
              </div>
            </div>
          )}

          {/* New Session Launcher */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* EASY */}
            <div
              onClick={() => setSelectedDifficulty('EASY')}
              className={`p-5 rounded-xl border cursor-pointer transition shadow-xs ${
                selectedDifficulty === 'EASY'
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-theme-surface'
                  : 'border-theme-border bg-theme-surface hover:border-theme-border-strong'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Warmup Session
                </span>
                <span className="text-xs text-theme-muted font-mono">30 Min</span>
              </div>
              <h3 className="text-base font-bold text-theme-primary mb-1">Easy Difficulty</h3>
              <p className="text-xs text-theme-muted leading-relaxed mb-4">
                1 algorithmic problem focusing on fundamental data structures, array traversal, and two pointers.
              </p>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ideal for daily momentum
              </div>
            </div>

            {/* MEDIUM */}
            <div
              onClick={() => setSelectedDifficulty('MEDIUM')}
              className={`p-5 rounded-xl border cursor-pointer transition shadow-xs ${
                selectedDifficulty === 'MEDIUM'
                  ? 'border-amber-500 ring-2 ring-amber-500/20 bg-theme-surface'
                  : 'border-theme-border bg-theme-surface hover:border-theme-border-strong'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Industry Standard
                </span>
                <span className="text-xs text-theme-muted font-mono">45 Min</span>
              </div>
              <h3 className="text-base font-bold text-theme-primary mb-1">Medium Difficulty</h3>
              <p className="text-xs text-theme-muted leading-relaxed mb-4">
                2 paired problems reflecting typical FAANG/Tier-1 screening rounds (BFS, Sliding Window, DP).
              </p>
              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> High Signal Interview Match
              </div>
            </div>

            {/* HARD */}
            <div
              onClick={() => setSelectedDifficulty('HARD')}
              className={`p-5 rounded-xl border cursor-pointer transition shadow-xs ${
                selectedDifficulty === 'HARD'
                  ? 'border-rose-500 ring-2 ring-rose-500/20 bg-theme-surface'
                  : 'border-theme-border bg-theme-surface hover:border-theme-border-strong'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                  Senior / Staff
                </span>
                <span className="text-xs text-theme-muted font-mono">60 Min</span>
              </div>
              <h3 className="text-base font-bold text-theme-primary mb-1">Hard Difficulty</h3>
              <p className="text-xs text-theme-muted leading-relaxed mb-4">
                2 complex problems testing topological sorting, monotonic queues, and multi-dimensional dynamic programming.
              </p>
              <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5" /> Advanced Engineering Test
              </div>
            </div>
          </div>

          {/* Track selector & Launch button */}
          <div className="p-5 rounded-xl border border-theme-border bg-theme-surface shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-theme-muted">Select Problem Pool:</span>
              <div className="flex items-center gap-1">
                {['Blind 75', 'NeetCode 150', 'Top Interview 150'].map((track) => (
                  <button
                    key={track}
                    onClick={() => setSelectedTrack(track)}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition cursor-pointer ${
                      selectedTrack === track
                        ? 'bg-theme-elevated text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold shadow-xs'
                        : 'text-theme-muted hover:text-theme-primary hover:bg-theme-elevated/50'
                    }`}
                  >
                    {track}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStartInterview}
              disabled={starting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              {starting ? 'Configuring Session...' : `Start ${selectedDifficulty} Interview`}
            </button>
          </div>

          {/* Past Sessions History Table */}
          <div className="rounded-xl border border-theme-border bg-theme-surface shadow-xs p-5">
            <h3 className="text-sm font-bold text-theme-primary mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Recent Interview History
            </h3>
            {sessions.length === 0 ? (
              <p className="text-xs text-theme-muted py-4 text-center">
                No past interview sessions logged yet. Complete your first timed session above!
              </p>
            ) : (
              <div className="space-y-2">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-3 rounded-lg border border-theme-border bg-theme-elevated flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-theme-primary">
                          {sess.track} &bull; {sess.difficulty}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.2 rounded-full font-mono ${
                            sess.scorePercent === 100
                              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15'
                              : sess.scorePercent >= 50
                              ? 'text-amber-600 dark:text-amber-400 bg-amber-500/15'
                              : 'text-rose-600 dark:text-rose-400 bg-rose-500/15'
                          }`}
                        >
                          Score: {sess.scorePercent}%
                        </span>
                      </div>
                      <div className="text-[11px] text-theme-muted mt-0.5">
                        {sess.problems.length} problems &bull; {Math.round(sess.timeSpentSeconds / 60)} min spent &bull; {new Date(sess.startedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="text-xs text-theme-muted font-mono">
                      {sess.problems.filter((p) => p.solved).length}/{sess.problems.length} Solved
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Active Interview In-Progress Arena */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[600px]">
          {/* Left Column: Problem Details & Problem Tabs */}
          <div className="lg:col-span-6 space-y-4">
            {/* Problem Navigation Tabs */}
            <div className="flex items-center gap-2 pb-2 border-b border-theme-border">
              {activeSession.problems.map((p, idx) => {
                const isSelected = currentProblemIdx === idx;
                const isSolved = Boolean(problemSolvedState[p.slug]);
                return (
                  <button
                    key={p.slug}
                    onClick={() => handleSelectProblem(idx)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-theme-elevated text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold shadow-xs'
                        : 'text-theme-muted hover:text-theme-primary'
                    }`}
                  >
                    <span>Problem {idx + 1}</span>
                    {isSolved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                  </button>
                );
              })}
            </div>

            {/* Current Problem Card */}
            {(() => {
              const currentProb = activeSession.problems[currentProblemIdx];
              if (!currentProb) return null;
              const isSolved = Boolean(problemSolvedState[currentProb.slug]);

              return (
                <div className="p-5 rounded-xl border border-theme-border bg-theme-surface shadow-xs space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-theme-primary">
                          {currentProb.title}
                        </h2>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                            currentProb.difficulty === 'Easy'
                              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15'
                              : currentProb.difficulty === 'Medium'
                              ? 'text-amber-600 dark:text-amber-400 bg-amber-500/15'
                              : 'text-rose-600 dark:text-rose-400 bg-rose-500/15'
                          }`}
                        >
                          {currentProb.difficulty}
                        </span>
                      </div>
                      <span className="text-xs text-theme-muted font-mono">
                        Question #{currentProb.id || (currentProblemIdx + 1)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleSolved(currentProb.slug)}
                      className={`px-3 py-1 text-xs rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                        isSolved
                          ? 'bg-emerald-600 text-white'
                          : 'bg-theme-elevated text-theme-secondary hover:text-theme-primary hover:bg-theme-surface border border-theme-border'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isSolved ? 'Marked Solved' : 'Mark Solved'}
                    </button>
                  </div>

                  <div className="p-4 rounded-lg bg-theme-elevated border border-theme-border text-xs text-theme-secondary leading-relaxed">
                    <p className="font-semibold text-theme-primary mb-1.5">
                      Interview Task:
                    </p>
                    <p className="mb-3">
                      Design an optimal algorithm to solve &ldquo;{currentProb.title}&rdquo; within time constraints. Explain your time and space complexity trade-offs clearly.
                    </p>
                    <div className="pt-2 border-t border-theme-border flex items-center gap-2 text-[11px] text-theme-muted">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                      <span>Aim for optimal Big-O: Avoid quadratic iterations where linear or logarithmic algorithms apply.</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`https://leetcode.com/problems/${currentProb.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Full LeetCode Problem Spec
                    </a>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Right Column: Code Scratchpad & Solution Notes */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-theme-border">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-semibold text-theme-primary">
                  Solution Scratchpad
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetBoilerplate}
                  title="Reset code to fresh language starter boilerplate"
                  className="px-2 py-1 bg-theme-elevated hover:bg-theme-surface border border-theme-border rounded text-[11px] text-theme-muted hover:text-theme-primary flex items-center gap-1 transition cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Reset Starter</span>
                </button>
                <select
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
                  className="px-2.5 py-1 bg-theme-surface border border-theme-border rounded text-xs text-theme-primary font-mono focus:outline-none focus:border-blue-500"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <textarea
              value={codeScratchpad}
              onChange={(e) => handleCodeChange(e.target.value)}
              rows={18}
              placeholder="Draft your algorithmic code here..."
              className="w-full p-3.5 bg-theme-surface border border-theme-border rounded-xl text-xs text-theme-primary font-mono leading-relaxed focus:outline-none focus:border-blue-500"
            />

            <div className="p-3 rounded-lg bg-theme-elevated border border-theme-border flex items-center justify-between text-xs text-theme-muted">
              <span>Tip: Practice writing clean code without IDE autocomplete.</span>
              <span className="font-mono">Time Remaining: {formatTimer(secondsRemaining)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
