'use client';

import React, { useState, useEffect } from 'react';
import {
  Target,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Edit2,
  Save,
  RotateCw,
  Flame,
  Award,
  Sparkles,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { api } from '../lib/api';
import type { CodingGoal, RoutineItem } from '@streakforge/shared-types';

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export function CodingPlannerView() {
  const [planner, setPlanner] = useState<CodingGoal | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditingTargets, setIsEditingTargets] = useState<boolean>(false);
  const [dailyInput, setDailyInput] = useState<number>(3);
  const [weeklyInput, setWeeklyInput] = useState<number>(15);
  const [savingTargets, setSavingTargets] = useState<boolean>(false);
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [newRoutineTopic, setNewRoutineTopic] = useState<string>('');
  const [newRoutineTarget, setNewRoutineTarget] = useState<number>(2);
  const [newRoutineRevision, setNewRoutineRevision] = useState<number>(30);

  const fetchPlanner = async () => {
    try {
      setLoading(true);
      const res = await api.planner.get();
      const data = (res as any)?.data ?? res;
      if (data && (data.dailyTarget || data.weeklyTarget)) {
        setPlanner(data);
        const dt = data.dailyTarget || {};
        setDailyInput((dt.easy || 0) + (dt.medium || 0) + (dt.hard || 0) || 3);
        setWeeklyInput(data.weeklyTarget || 15);
      }
    } catch (err) {
      console.error('Failed to load coding planner:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanner();
  }, []);

  const handleSaveTargets = async () => {
    try {
      setSavingTargets(true);
      const res = await api.planner.updateTargets(
        { easy: 1, medium: Math.max(1, dailyInput - 1), hard: 0, revisionMinutes: 30 },
        weeklyInput
      );
      const data = (res as any)?.data ?? res;
      if (data) {
        setPlanner(data);
        setIsEditingTargets(false);
      }
    } catch (err) {
      console.error('Failed to update planner targets:', err);
    } finally {
      setSavingTargets(false);
    }
  };

  const handleAddRoutine = async () => {
    if (!planner || !newRoutineTopic.trim()) return;
    const currentRoutines = [...(planner.studyRoutines || [])];
    const dayIndex = currentRoutines.findIndex((r) => r.dayOfWeek.toLowerCase() === selectedDay.toLowerCase());

    const newItem: RoutineItem = {
      dayOfWeek: selectedDay,
      focusTopics: [newRoutineTopic.trim()],
      targetCount: Number(newRoutineTarget) || 2,
      revisionMinutes: Number(newRoutineRevision) || 30
    };

    if (dayIndex >= 0) {
      currentRoutines[dayIndex] = newItem;
    } else {
      currentRoutines.push(newItem);
    }

    try {
      const res = await api.planner.updateRoutines(currentRoutines);
      const data = (res as any)?.data ?? res;
      if (data) {
        setPlanner(data);
        setNewRoutineTopic('');
      }
    } catch (err) {
      console.error('Failed to add routine:', err);
    }
  };

  const handleRemoveRoutineItem = async (day: string) => {
    if (!planner) return;
    const currentRoutines = (planner.studyRoutines || []).filter(
      (r) => r.dayOfWeek.toLowerCase() !== day.toLowerCase()
    );

    try {
      const res = await api.planner.updateRoutines(currentRoutines);
      const data = (res as any)?.data ?? res;
      if (data) {
        setPlanner(data);
      }
    } catch (err) {
      console.error('Failed to remove routine item:', err);
    }
  };

  const totalDailyTarget = planner?.dailyTarget
    ? (planner.dailyTarget.easy || 0) + (planner.dailyTarget.medium || 0) + (planner.dailyTarget.hard || 0)
    : 3;
  const totalDailyCompleted = planner?.completedToday?.total ?? 0;

  const dailyProgress = Math.min(
    100,
    Math.round((totalDailyCompleted / (totalDailyTarget || 1)) * 100)
  );

  const weeklyProgress = planner
    ? Math.min(100, Math.round((planner.completedThisWeek / (planner.weeklyTarget || 1)) * 100))
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-[#30363d] bg-[#161b22]/70 backdrop-blur-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#f0f6fc]">Personal Coding Planner</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#388bfd]/10 text-[#58a6ff] border border-[#388bfd]/25 font-mono">
                Sprint 3.0
              </span>
            </div>
            <p className="text-xs text-[#8b949e] mt-1">
              Structure daily problem targets, weekly milestones, and personalized weekday curricula.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPlanner}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg transition flex items-center gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Target Progress Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Target Card */}
        <div className="p-5 rounded-xl border border-[#30363d] bg-[#161b22]/50 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse" />
              <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
                Today&apos;s Target
              </span>
            </div>
            {!isEditingTargets ? (
              <button
                onClick={() => setIsEditingTargets(true)}
                className="text-xs text-[#58a6ff] hover:underline flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                Edit Target
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveTargets}
                  disabled={savingTargets}
                  className="px-2 py-0.5 text-xs bg-[#238636] hover:bg-[#2ea043] text-white rounded font-medium flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  Save
                </button>
                <button
                  onClick={() => setIsEditingTargets(false)}
                  className="text-xs text-[#8b949e] hover:text-[#c9d1d9]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="text-3xl font-extrabold text-[#f0f6fc] font-mono">
                {totalDailyCompleted}
              </span>
              <span className="text-lg text-[#8b949e] font-mono">
                {' '}/ {isEditingTargets ? (
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={dailyInput}
                    onChange={(e) => setDailyInput(parseInt(e.target.value) || 1)}
                    className="w-14 px-1.5 py-0.5 bg-[#0d1117] border border-[#58a6ff] rounded text-sm text-[#f0f6fc] font-mono text-center inline-block ml-1"
                  />
                ) : (
                  totalDailyTarget
                )}
              </span>
              <span className="text-xs text-[#8b949e] ml-2">problems solved</span>
            </div>
            <span className="text-sm font-bold text-[#3fb950] font-mono">
              {dailyProgress}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-[#21262d] rounded-full overflow-hidden border border-[#30363d]/50">
            <div
              className="h-full bg-gradient-to-r from-[#238636] to-[#3fb950] transition-all duration-500 rounded-full"
              style={{ width: `${dailyProgress}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-[#8b949e]">
            <span>
              {dailyProgress >= 100 ? (
                <span className="text-[#3fb950] font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 inline" /> Goal accomplished for today!
                </span>
              ) : (
                `${Math.max(0, totalDailyTarget - totalDailyCompleted)} more to hit daily milestone`
              )}
            </span>
            <span className="font-mono">Paced: 1 problem ~ 25m</span>
          </div>
        </div>

        {/* Weekly Target Card */}
        <div className="p-5 rounded-xl border border-[#30363d] bg-[#161b22]/50 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#58a6ff]" />
              <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
                Weekly Sprint Progress
              </span>
            </div>
            <span className="text-xs text-[#8b949e] font-mono">
              7-Day Cadence
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="text-3xl font-extrabold text-[#f0f6fc] font-mono">
                {planner?.completedThisWeek ?? 0}
              </span>
              <span className="text-lg text-[#8b949e] font-mono">
                {' '}/ {isEditingTargets ? (
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={weeklyInput}
                    onChange={(e) => setWeeklyInput(parseInt(e.target.value) || 1)}
                    className="w-16 px-1.5 py-0.5 bg-[#0d1117] border border-[#58a6ff] rounded text-sm text-[#f0f6fc] font-mono text-center inline-block ml-1"
                  />
                ) : (
                  planner?.weeklyTarget ?? 15
                )}
              </span>
              <span className="text-xs text-[#8b949e] ml-2">problems solved</span>
            </div>
            <span className="text-sm font-bold text-[#58a6ff] font-mono">
              {weeklyProgress}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-[#21262d] rounded-full overflow-hidden border border-[#30363d]/50">
            <div
              className="h-full bg-gradient-to-r from-[#1f6feb] to-[#58a6ff] transition-all duration-500 rounded-full"
              style={{ width: `${weeklyProgress}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-[#8b949e]">
            <span>
              {weeklyProgress >= 100 ? (
                <span className="text-[#3fb950] font-medium flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 inline" /> Sprint target fully unlocked!
                </span>
              ) : (
                `${Math.max(0, (planner?.weeklyTarget ?? 15) - (planner?.completedThisWeek ?? 0))} solutions needed to close sprint`
              )}
            </span>
            <span className="font-mono">Resets every Sunday midnight</span>
          </div>
        </div>
      </div>

      {/* Weekday Study Routines */}
      <div className="rounded-xl border border-[#30363d] bg-[#161b22]/50 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#30363d]/70">
          <div>
            <h2 className="text-base font-bold text-[#f0f6fc] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#58a6ff]" />
              Weekly Curriculum &amp; Study Routines
            </h2>
            <p className="text-xs text-[#8b949e] mt-0.5">
              Structured study plan organized by day of week to prevent cognitive burnout.
            </p>
          </div>

          {/* Day selection tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition whitespace-nowrap ${
                  selectedDay.toLowerCase() === day.toLowerCase()
                    ? 'bg-[#388bfd] text-white shadow-sm'
                    : 'text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d]'
                }`}
              >
                {day.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Day Routine Items */}
        <div className="space-y-3">
          {(() => {
            const dayRoutine = (planner?.studyRoutines || []).find(
              (r) => r.dayOfWeek.toLowerCase() === selectedDay.toLowerCase()
            );

            if (!dayRoutine) {
              return (
                <div className="text-center py-8 border border-dashed border-[#30363d] rounded-lg">
                  <p className="text-xs text-[#8b949e]">
                    No study routine configured for {selectedDay}. Add a target topic below.
                  </p>
                </div>
              );
            }

            return (
              <div
                className="flex items-center justify-between p-3.5 rounded-lg border border-[#30363d]/80 bg-[#0d1117] hover:border-[#58a6ff]/40 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[#21262d] text-[#58a6ff]">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#f0f6fc]">
                      {(dayRoutine.focusTopics || []).join(', ') || 'General DSA'}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#8b949e] mt-0.5">
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3 text-[#3fb950]" />
                        {dayRoutine.targetCount} problems
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#f0883e]" />
                        {dayRoutine.revisionMinutes}m SRS revision
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveRoutineItem(selectedDay)}
                  className="text-xs text-[#8b949e] hover:text-[#f85149] px-2 py-1 rounded hover:bg-[#21262d] transition"
                  title="Remove routine item"
                >
                  Remove
                </button>
              </div>
            );
          })()}

          {/* Add New Routine Form */}
          <div className="mt-4 pt-4 border-t border-[#30363d]/50 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-[#8b949e] mb-1">
                Target Topic / Pattern
              </label>
              <input
                type="text"
                value={newRoutineTopic}
                onChange={(e) => setNewRoutineTopic(e.target.value)}
                placeholder="e.g. Sliding Window & Two Pointers"
                className="w-full px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8b949e] mb-1">
                Problems Target
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={newRoutineTarget}
                onChange={(e) => setNewRoutineTarget(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff]"
              />
            </div>
            <button
              onClick={handleAddRoutine}
              disabled={!newRoutineTopic.trim()}
              className="w-full py-2 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white border border-[#30363d] rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 text-[#58a6ff]" />
              Add to {selectedDay}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
