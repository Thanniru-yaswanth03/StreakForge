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
  const [codeScratchpad, setCodeScratchpad] = useState<string>('# Write your solution here\ndef solution():\n    pass\n');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python3');
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
      }
    } catch (err) {
      console.error('Failed to start interview:', err);
    } finally {
      setStarting(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-[#30363d] bg-[#161b22]/70 backdrop-blur-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-[#f0883e]/10 text-[#f0883e] border border-[#f0883e]/20">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#f0f6fc]">Mock Interview Practice Arena</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f0883e]/10 text-[#f0883e] border border-[#f0883e]/25 font-mono">
                Real-Time Simulation
              </span>
            </div>
            <p className="text-xs text-[#8b949e] mt-1">
              Simulate rigorous real-world technical interviews with strict time limits, realistic problem sets, and post-session performance grading.
            </p>
          </div>
        </div>

        {activeSession?.status === 'IN_PROGRESS' && (
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-lg bg-[#0d1117] border border-[#f0883e]/50 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#f0883e] animate-pulse" />
              <span className="text-base font-extrabold text-[#f0f6fc] font-mono">
                {formatTimer(secondsRemaining)}
              </span>
            </div>
            <button
              onClick={handleSubmitSession}
              disabled={completing}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] rounded-lg transition"
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
            <div className="p-6 rounded-xl border border-[#30363d] bg-[#161b22]/60 relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-[#30363d]">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-[#238636]/15 text-[#3fb950] border border-[#3fb950]/30">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#f0f6fc]">
                      Interview Session Completed
                    </h2>
                    <p className="text-xs text-[#8b949e]">
                      Track: {activeSession.track} &bull; Difficulty: {activeSession.difficulty}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-3xl font-extrabold text-[#3fb950] font-mono">
                    {activeSession.scorePercent}%
                  </span>
                  <div className="text-xs text-[#8b949e]">
                    Time spent: {Math.round((activeSession.timeSpentSeconds || 0) / 60)} min
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-lg bg-[#0d1117] border border-[#30363d]/60">
                <span className="text-xs font-semibold text-[#58a6ff] block mb-1">
                  Interviewer Assessment:
                </span>
                <p className="text-xs text-[#c9d1d9] leading-relaxed">
                  {activeSession.feedback}
                </p>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setActiveSession(null)}
                  className="px-4 py-1.5 text-xs font-medium text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] rounded-lg transition"
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
              className={`p-5 rounded-xl border cursor-pointer transition ${
                selectedDifficulty === 'EASY'
                  ? 'border-[#3fb950] bg-[#161b22]'
                  : 'border-[#30363d] bg-[#161b22]/40 hover:border-[#30363d]/80'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#3fb950] uppercase tracking-wider">
                  Warmup Session
                </span>
                <span className="text-xs text-[#8b949e] font-mono">30 Min</span>
              </div>
              <h3 className="text-base font-bold text-[#f0f6fc] mb-1">Easy Difficulty</h3>
              <p className="text-xs text-[#8b949e] leading-relaxed mb-4">
                1 algorithmic problem focusing on fundamental data structures, array traversal, and two pointers.
              </p>
              <div className="text-[11px] text-[#3fb950] font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ideal for daily momentum
              </div>
            </div>

            {/* MEDIUM */}
            <div
              onClick={() => setSelectedDifficulty('MEDIUM')}
              className={`p-5 rounded-xl border cursor-pointer transition ${
                selectedDifficulty === 'MEDIUM'
                  ? 'border-[#f0883e] bg-[#161b22]'
                  : 'border-[#30363d] bg-[#161b22]/40 hover:border-[#30363d]/80'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#f0883e] uppercase tracking-wider">
                  Industry Standard
                </span>
                <span className="text-xs text-[#8b949e] font-mono">45 Min</span>
              </div>
              <h3 className="text-base font-bold text-[#f0f6fc] mb-1">Medium Difficulty</h3>
              <p className="text-xs text-[#8b949e] leading-relaxed mb-4">
                2 paired problems reflecting typical FAANG/Tier-1 screening rounds (BFS, Sliding Window, DP).
              </p>
              <div className="text-[11px] text-[#f0883e] font-medium flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> High Signal Interview Match
              </div>
            </div>

            {/* HARD */}
            <div
              onClick={() => setSelectedDifficulty('HARD')}
              className={`p-5 rounded-xl border cursor-pointer transition ${
                selectedDifficulty === 'HARD'
                  ? 'border-[#f85149] bg-[#161b22]'
                  : 'border-[#30363d] bg-[#161b22]/40 hover:border-[#30363d]/80'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#f85149] uppercase tracking-wider">
                  Senior / Staff
                </span>
                <span className="text-xs text-[#8b949e] font-mono">60 Min</span>
              </div>
              <h3 className="text-base font-bold text-[#f0f6fc] mb-1">Hard Difficulty</h3>
              <p className="text-xs text-[#8b949e] leading-relaxed mb-4">
                2 complex problems testing topological sorting, monotonic queues, and multi-dimensional dynamic programming.
              </p>
              <div className="text-[11px] text-[#f85149] font-medium flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5" /> Advanced Engineering Test
              </div>
            </div>
          </div>

          {/* Track selector & Launch button */}
          <div className="p-5 rounded-xl border border-[#30363d] bg-[#161b22]/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[#8b949e]">Select Problem Pool:</span>
              <div className="flex items-center gap-1">
                {['Blind 75', 'NeetCode 150', 'Top Interview 150'].map((track) => (
                  <button
                    key={track}
                    onClick={() => setSelectedTrack(track)}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                      selectedTrack === track
                        ? 'bg-[#21262d] text-[#58a6ff] border border-[#58a6ff]/30'
                        : 'text-[#8b949e] hover:text-[#c9d1d9]'
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
              className="px-6 py-2.5 text-xs font-bold text-white bg-[#238636] hover:bg-[#2ea043] rounded-lg transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              {starting ? 'Configuring Session...' : `Start ${selectedDifficulty} Interview`}
            </button>
          </div>

          {/* Past Sessions History Table */}
          <div className="rounded-xl border border-[#30363d] bg-[#161b22]/50 p-5">
            <h3 className="text-sm font-bold text-[#f0f6fc] mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#58a6ff]" />
              Recent Interview History
            </h3>
            {sessions.length === 0 ? (
              <p className="text-xs text-[#8b949e] py-4 text-center">
                No past interview sessions logged yet. Complete your first timed session above!
              </p>
            ) : (
              <div className="space-y-2">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-3 rounded-lg border border-[#30363d]/60 bg-[#0d1117] flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#f0f6fc]">
                          {sess.track} &bull; {sess.difficulty}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.2 rounded-full font-mono ${
                            sess.scorePercent === 100
                              ? 'text-[#3fb950] bg-[#238636]/15'
                              : sess.scorePercent >= 50
                              ? 'text-[#f0883e] bg-[#f0883e]/15'
                              : 'text-[#f85149] bg-[#da3633]/15'
                          }`}
                        >
                          Score: {sess.scorePercent}%
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8b949e] mt-0.5">
                        {sess.problems.length} problems &bull; {Math.round(sess.timeSpentSeconds / 60)} min spent &bull; {new Date(sess.startedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="text-xs text-[#8b949e] font-mono">
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
            <div className="flex items-center gap-2 pb-2 border-b border-[#30363d]">
              {activeSession.problems.map((p, idx) => {
                const isSelected = currentProblemIdx === idx;
                const isSolved = Boolean(problemSolvedState[p.slug]);
                return (
                  <button
                    key={p.slug}
                    onClick={() => setCurrentProblemIdx(idx)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#21262d] text-[#58a6ff] border border-[#58a6ff]/30'
                        : 'text-[#8b949e] hover:text-[#c9d1d9]'
                    }`}
                  >
                    <span>Problem {idx + 1}</span>
                    {isSolved && <CheckCircle2 className="w-3.5 h-3.5 text-[#3fb950]" />}
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
                <div className="p-5 rounded-xl border border-[#30363d] bg-[#161b22]/50 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-[#f0f6fc]">
                          {currentProb.title}
                        </h2>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                            currentProb.difficulty === 'Easy'
                              ? 'text-[#3fb950] bg-[#238636]/15'
                              : currentProb.difficulty === 'Medium'
                              ? 'text-[#f0883e] bg-[#f0883e]/15'
                              : 'text-[#f85149] bg-[#da3633]/15'
                          }`}
                        >
                          {currentProb.difficulty}
                        </span>
                      </div>
                      <span className="text-xs text-[#8b949e] font-mono">
                        Question #{currentProb.id || (currentProblemIdx + 1)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleSolved(currentProb.slug)}
                      className={`px-3 py-1 text-xs rounded-lg font-semibold transition flex items-center gap-1.5 ${
                        isSolved
                          ? 'bg-[#238636] text-white'
                          : 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d] border border-[#30363d]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isSolved ? 'Marked Solved' : 'Mark Solved'}
                    </button>
                  </div>

                  <div className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d]/60 text-xs text-[#c9d1d9] leading-relaxed">
                    <p className="font-semibold text-[#f0f6fc] mb-1.5">
                      Interview Task:
                    </p>
                    <p className="mb-3">
                      Design an optimal algorithm to solve &ldquo;{currentProb.title}&rdquo; within time constraints. Explain your time and space complexity trade-offs clearly.
                    </p>
                    <div className="pt-2 border-t border-[#30363d]/40 flex items-center gap-2 text-[11px] text-[#8b949e]">
                      <HelpCircle className="w-3.5 h-3.5 text-[#58a6ff]" />
                      <span>Aim for optimal Big-O: Avoid quadratic iterations where linear or logarithmic algorithms apply.</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`https://leetcode.com/problems/${currentProb.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#58a6ff] hover:underline flex items-center gap-1"
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
            <div className="flex items-center justify-between pb-2 border-b border-[#30363d]">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-[#58a6ff]" />
                <span className="text-xs font-semibold text-[#f0f6fc]">
                  Solution Scratchpad
                </span>
              </div>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="px-2 py-1 bg-[#0d1117] border border-[#30363d] rounded text-xs text-[#f0f6fc] font-mono focus:outline-none"
              >
                <option value="python3">Python 3</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="typescript">TypeScript</option>
              </select>
            </div>

            <textarea
              value={codeScratchpad}
              onChange={(e) => setCodeScratchpad(e.target.value)}
              rows={18}
              placeholder="Draft your algorithmic code here..."
              className="w-full p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-[#f0f6fc] font-mono leading-relaxed focus:outline-none focus:border-[#58a6ff]"
            />

            <div className="p-3 rounded-lg bg-[#161b22]/50 border border-[#30363d]/50 flex items-center justify-between text-xs text-[#8b949e]">
              <span>Tip: Practice writing clean code without IDE autocomplete.</span>
              <span className="font-mono">Time Remaining: {formatTimer(secondsRemaining)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
