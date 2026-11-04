import { getLanguageMeta } from '@streakforge/config';
import type { Difficulty } from '@streakforge/shared-types';

export interface TemplateVariables {
  language: string;
  topic?: string;
  difficulty: Difficulty;
  questionId: string;
  questionSlug: string;
}

export interface ResolvedPaths {
  dirPath: string;
  codeFileName: string;
  codeFilePath: string;
  readmeFilePath: string;
}

export const DEFAULT_TEMPLATE = 'leetcode-solutions/{Language}/{Topic}/{id}_{slug}{ext}';

/**
 * Sanitizes a path segment to avoid invalid filename characters and path traversal
 */
export function sanitizeSegment(segment: string): string {
  return segment
    .replace(/[<>:"/\\|?*]+/g, '-')
    .replace(/\.+/g, '.')
    .replace(/^-+|-+$/g, '')
    .trim();
}

/**
 * Normalize topic name or fallback to "General"
 */
export function normalizeTopic(topic?: string): string {
  if (!topic || !topic.trim()) return 'General';
  return sanitizeSegment(
    topic
      .replace(/&/g, 'and')
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('-')
  );
}

/**
 * Resolves a template string into concrete code and README file paths
 */
export function resolveSolutionPath(
  template: string = DEFAULT_TEMPLATE,
  vars: TemplateVariables
): ResolvedPaths {
  const meta = getLanguageMeta(vars.language);
  const ext = meta.extension; // includes leading dot (e.g. '.py')
  const langName = meta.name === 'Python 3' ? 'Python' : sanitizeSegment(meta.name.replace(/\s+/g, '-'));
  const topicName = normalizeTopic(vars.topic);
  const diffName = vars.difficulty;
  const idStr = String(vars.questionId).padStart(3, '0');
  const slugStr = sanitizeSegment(vars.questionSlug);

  const rawPattern = template.trim() || DEFAULT_TEMPLATE;
  const isExplicitFilePattern = rawPattern.includes('{ext}') || /\.[a-zA-Z0-9]+$/.test(rawPattern);

  // Replace case-sensitive and case-insensitive tokens
  const replaced = rawPattern
    .replace(/\{Language\}/g, langName)
    .replace(/\{language\}/g, langName.toLowerCase())
    .replace(/\{Topic\}/g, topicName)
    .replace(/\{topic\}/g, topicName.toLowerCase())
    .replace(/\{Difficulty\}/g, diffName)
    .replace(/\{difficulty\}/g, diffName.toLowerCase())
    .replace(/\{id\}/g, idStr)
    .replace(/\{slug\}/g, slugStr)
    .replace(/\{ext\}/g, ext);

  // Normalize forward slashes
  const cleanPath = replaced.replace(/\\+/g, '/').replace(/\/+/g, '/').replace(/\/+$/, '');

  let dirPath = '';
  let codeFileName = '';

  if (isExplicitFilePattern) {
    const lastSlashIdx = cleanPath.lastIndexOf('/');
    if (lastSlashIdx !== -1) {
      dirPath = cleanPath.slice(0, lastSlashIdx);
      codeFileName = cleanPath.slice(lastSlashIdx + 1);
    } else {
      dirPath = '';
      codeFileName = cleanPath;
    }
  } else {
    // Treated as directory template (like solutions/{difficulty}/{id}-{slug})
    dirPath = cleanPath;
    codeFileName = `${slugStr}${ext}`;
  }

  const codeFilePath = dirPath ? `${dirPath}/${codeFileName}` : codeFileName;
  const readmeFilePath = dirPath ? `${dirPath}/README.md` : 'README.md';

  return {
    dirPath,
    codeFileName,
    codeFilePath,
    readmeFilePath
  };
}
