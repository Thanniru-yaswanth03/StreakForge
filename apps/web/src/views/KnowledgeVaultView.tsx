'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Folder,
  Tag,
  Search,
  Plus,
  Pin,
  Trash2,
  Edit3,
  ExternalLink,
  RotateCw,
  FileText,
  Sparkles,
  Check,
  X
} from 'lucide-react';
import { api } from '../lib/api';
import type { KnowledgeNote } from '@streakforge/shared-types';

const CANONICAL_FOLDERS = [
  'All',
  'Arrays & Hashing',
  'Two Pointers',
  'Dynamic Programming',
  'Trees & Graphs',
  'System Design',
  'General'
];

export function KnowledgeVaultView() {
  const [notes, setNotes] = useState<KnowledgeNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFolder, setSelectedFolder] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeNote, setActiveNote] = useState<KnowledgeNote | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // Edit/Create form state
  const [formTitle, setFormTitle] = useState<string>('');
  const [formContent, setFormContent] = useState<string>('');
  const [formFolder, setFormFolder] = useState<string>('General');
  const [formTags, setFormTags] = useState<string>('');
  const [formSlug, setFormSlug] = useState<string>('');
  const [formPinned, setFormPinned] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await api.vault.list(
        undefined,
        selectedFolder === 'All' ? undefined : selectedFolder,
        searchQuery.trim() || undefined
      );
      const data = (res as any)?.data ?? res;
      if (Array.isArray(data)) {
        setNotes(data);
        if (data.length > 0 && !activeNote) {
          setActiveNote(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [selectedFolder]);

  const handleStartCreate = () => {
    setFormTitle('');
    setFormContent('# New Note\n\n- Key intuition:\n- Edge cases:\n- Big-O analysis:');
    setFormFolder(selectedFolder === 'All' ? 'General' : selectedFolder);
    setFormTags('dsa, notes');
    setFormSlug('');
    setFormPinned(false);
    setIsCreatingNew(true);
    setIsEditing(false);
  };

  const handleStartEdit = (note: KnowledgeNote) => {
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormFolder(note.folder || 'General');
    setFormTags(note.tags.join(', '));
    setFormSlug(note.linkedProblemSlug || '');
    setFormPinned(note.isPinned || false);
    setIsEditing(true);
    setIsCreatingNew(false);
  };

  const handleSaveNote = async () => {
    if (!formTitle.trim()) return;
    setIsSaving(true);
    try {
      const tagsArray = formTags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      if (isCreatingNew) {
        const res = await api.vault.create({
          title: formTitle,
          content: formContent,
          folder: formFolder,
          tags: tagsArray,
          linkedProblemSlug: formSlug.trim() || undefined,
          isPinned: formPinned
        });
        const note = (res as any)?.data ?? res;
        if (note && note.id) {
          setNotes([note, ...notes]);
          setActiveNote(note);
          setIsCreatingNew(false);
        }
      } else if (isEditing && activeNote) {
        const res = await api.vault.update(activeNote.id, {
          title: formTitle,
          content: formContent,
          folder: formFolder,
          tags: tagsArray,
          linkedProblemSlug: formSlug.trim() || undefined,
          isPinned: formPinned
        });
        const note = (res as any)?.data ?? res;
        if (note && note.id) {
          setNotes(notes.map((n) => (n.id === activeNote.id ? note : n)));
          setActiveNote(note);
          setIsEditing(false);
        }
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await api.vault.delete(noteId);
      const remaining = notes.filter((n) => n.id !== noteId);
      setNotes(remaining);
      setActiveNote(remaining[0] || null);
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-[#30363d] bg-[#161b22]/70 backdrop-blur-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-[#bc8cff]/10 text-[#bc8cff] border border-[#bc8cff]/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#f0f6fc]">DSA Knowledge Vault</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#bc8cff]/10 text-[#bc8cff] border border-[#bc8cff]/25 font-mono">
                Markdown Engine
              </span>
            </div>
            <p className="text-xs text-[#8b949e] mt-1">
              Curate canonical problem insights, algorithmic cheat-sheets, time-space trade-offs, and interview notes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleStartCreate}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] rounded-lg transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Note
          </button>
          <button
            onClick={fetchNotes}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg transition flex items-center gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Explorer Left, Note Viewer/Editor Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[600px]">
        {/* Left Sidebar: Folders, Search & Note List */}
        <div className="lg:col-span-4 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8b949e] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchNotes()}
              placeholder="Search notes or keywords..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff]"
            />
          </div>

          {/* Folder Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {CANONICAL_FOLDERS.map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFolder(f)}
                className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition whitespace-nowrap ${
                  selectedFolder === f
                    ? 'bg-[#21262d] text-[#58a6ff] border border-[#388bfd]/30'
                    : 'text-[#8b949e] hover:text-[#c9d1d9]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Notes list cards */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {notes.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-[#30363d] rounded-xl">
                <FileText className="w-8 h-8 text-[#8b949e] mx-auto mb-2 opacity-50" />
                <p className="text-xs text-[#8b949e]">No notes found in this category.</p>
              </div>
            ) : (
              notes.map((note) => {
                const isSelected = activeNote?.id === note.id && !isCreatingNew;
                return (
                  <div
                    key={note.id}
                    onClick={() => {
                      setActiveNote(note);
                      setIsEditing(false);
                      setIsCreatingNew(false);
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition text-left relative ${
                      isSelected
                        ? 'border-[#58a6ff] bg-[#161b22]'
                        : 'border-[#30363d]/70 bg-[#0d1117] hover:border-[#30363d]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {note.isPinned && (
                          <Pin className="w-3 h-3 text-[#f0883e] flex-shrink-0" />
                        )}
                        <h3 className="text-xs font-semibold text-[#f0f6fc] truncate">
                          {note.title}
                        </h3>
                      </div>
                      <span className="text-[10px] text-[#8b949e] font-mono flex-shrink-0">
                        {new Date(note.updatedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#8b949e] line-clamp-2 mt-1 leading-relaxed">
                      {note.content.replace(/[#*`]/g, '')}
                    </p>

                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#21262d] text-[#58a6ff] font-mono">
                        {note.folder}
                      </span>
                      {note.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Markdown Reader or Form Editor */}
        <div className="lg:col-span-8 rounded-xl border border-[#30363d] bg-[#161b22]/50 p-5 flex flex-col justify-between">
          {isCreatingNew || isEditing ? (
            /* Note Editor Form */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
                <h2 className="text-sm font-bold text-[#f0f6fc]">
                  {isCreatingNew ? 'Create New Note' : 'Edit Note'}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsCreatingNew(false);
                      setIsEditing(false);
                    }}
                    className="px-2.5 py-1 text-xs text-[#8b949e] hover:text-[#c9d1d9]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNote}
                    disabled={isSaving || !formTitle.trim()}
                    className="px-3.5 py-1 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] rounded-md transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save Note
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#8b949e] mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Sliding Window Invariants & Edge Cases"
                    className="w-full px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8b949e] mb-1">
                    Folder
                  </label>
                  <select
                    value={formFolder}
                    onChange={(e) => setFormFolder(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff]"
                  >
                    {CANONICAL_FOLDERS.filter((f) => f !== 'All').map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#8b949e] mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="arrays, two-pointers, leetcode"
                    className="w-full px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#8b949e] mb-1">
                    Linked Problem Slug (Optional)
                  </label>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="e.g. two-sum"
                    className="w-full px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8b949e] mb-1">
                  Markdown Content
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={14}
                  className="w-full p-3 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-[#f0f6fc] font-mono leading-relaxed focus:outline-none focus:border-[#58a6ff]"
                />
              </div>
            </div>
          ) : activeNote ? (
            /* Note Viewer */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
                <div>
                  <div className="flex items-center gap-2">
                    {activeNote.isPinned && (
                      <Pin className="w-4 h-4 text-[#f0883e]" />
                    )}
                    <h2 className="text-base font-bold text-[#f0f6fc]">
                      {activeNote.title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#8b949e] mt-1">
                    <span className="px-2 py-0.5 rounded bg-[#21262d] text-[#58a6ff] font-mono text-[10px]">
                      {activeNote.folder}
                    </span>
                    <span>Updated {new Date(activeNote.updatedAt).toLocaleDateString()}</span>
                    {activeNote.linkedProblemSlug && (
                      <a
                        href={`https://leetcode.com/problems/${activeNote.linkedProblemSlug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#58a6ff] hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {activeNote.linkedProblemSlug}
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartEdit(activeNote)}
                    className="px-2.5 py-1 text-xs text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-md transition flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3 text-[#58a6ff]" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteNote(activeNote.id)}
                    className="p-1 text-[#8b949e] hover:text-[#f85149] rounded hover:bg-[#21262d] transition"
                    title="Delete Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Note Content display */}
              <div className="prose prose-invert max-w-none text-xs text-[#c9d1d9] leading-relaxed whitespace-pre-wrap font-mono p-4 rounded-lg bg-[#0d1117] border border-[#30363d]/60 max-h-[500px] overflow-y-auto">
                {activeNote.content}
              </div>

              {/* Tags footer */}
              {activeNote.tags && activeNote.tags.length > 0 && (
                <div className="flex items-center gap-1.5 pt-2">
                  <Tag className="w-3 h-3 text-[#8b949e]" />
                  {activeNote.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[#21262d] text-[#8b949e] font-mono border border-[#30363d]/50"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-[#8b949e]">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Select a note from the left or create a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
