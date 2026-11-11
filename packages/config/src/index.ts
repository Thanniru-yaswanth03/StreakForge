// ========================================================
// StreakForge Shared Configurations & Constants
// ========================================================

/**
 * Mapping from LeetCode language identifier to file extension and human name
 */
export interface LanguageMeta {
  extension: string;
  name: string;
  commentPrefix: string;
}

export const LANGUAGE_MAP: Record<string, LanguageMeta> = {
  python: { extension: '.py', name: 'Python', commentPrefix: '#' },
  python3: { extension: '.py', name: 'Python 3', commentPrefix: '#' },
  cpp: { extension: '.cpp', name: 'C++', commentPrefix: '//' },
  c: { extension: '.c', name: 'C', commentPrefix: '//' },
  java: { extension: '.java', name: 'Java', commentPrefix: '//' },
  typescript: { extension: '.ts', name: 'TypeScript', commentPrefix: '//' },
  javascript: { extension: '.js', name: 'JavaScript', commentPrefix: '//' },
  golang: { extension: '.go', name: 'Go', commentPrefix: '//' },
  rust: { extension: '.rs', name: 'Rust', commentPrefix: '//' },
  csharp: { extension: '.cs', name: 'C#', commentPrefix: '//' },
  ruby: { extension: '.rb', name: 'Ruby', commentPrefix: '#' },
  swift: { extension: '.swift', name: 'Swift', commentPrefix: '//' },
  kotlin: { extension: '.kt', name: 'Kotlin', commentPrefix: '//' },
  scala: { extension: '.scala', name: 'Scala', commentPrefix: '//' },
  php: { extension: '.php', name: 'PHP', commentPrefix: '//' },
  dart: { extension: '.dart', name: 'Dart', commentPrefix: '//' },
  elixir: { extension: '.ex', name: 'Elixir', commentPrefix: '#' },
  erlang: { extension: '.erl', name: 'Erlang', commentPrefix: '%' },
  racket: { extension: '.rkt', name: 'Racket', commentPrefix: ';' },
  mysql: { extension: '.sql', name: 'MySQL', commentPrefix: '--' },
  mssql: { extension: '.sql', name: 'MS SQL Server', commentPrefix: '--' },
  oraclesql: { extension: '.sql', name: 'Oracle SQL', commentPrefix: '--' },
  postgresql: { extension: '.sql', name: 'PostgreSQL', commentPrefix: '--' },
  pandas: { extension: '.py', name: 'Pandas', commentPrefix: '#' },
  pythondata: { extension: '.py', name: 'Python Data', commentPrefix: '#' },
  bash: { extension: '.sh', name: 'Bash', commentPrefix: '#' }
};

export function getLanguageMeta(lang: string): LanguageMeta {
  const normalized = lang.toLowerCase().trim();
  return (
    LANGUAGE_MAP[normalized] || {
      extension: '.txt',
      name: lang,
      commentPrefix: '//'
    }
  );
}

/**
 * High-risk file patterns and names that must never be auto-committed.
 */
export const FORBIDDEN_FILE_PATTERNS = [
  /^\.env/i,
  /\.env\..+/i,
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /id_rsa/i,
  /id_ed25519/i,
  /credentials\.json$/i,
  /secrets\.json$/i,
  /service-account.*\.json$/i,
  /client_secret.*\.json$/i,
  /\.npmrc$/i,
  /\.dockercfg$/i,
  /node_modules/i,
  /\.git/i,
  /\.next/i,
  /dist[\/\\]/i,
  /build[\/\\]/i,
  /coverage[\/\\]/i,
  /\.DS_Store$/i,
  /Thumbs\.db$/i
];

/**
 * Secret tokens and API key regular expressions for content scanning.
 */
export const HIGH_ENTROPY_SECRET_PATTERNS = [
  /ghp_[a-zA-Z0-9]{36}/,                           // GitHub Personal Access Token
  /gho_[a-zA-Z0-9]{36}/,                           // GitHub OAuth Token
  /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/,    // GitHub Fine-grained PAT
  /AKIA[0-9A-Z]{16}/,                              // AWS Access Key ID
  /xox[baprs]-[0-9a-zA-Z]{10,48}/,                 // Slack Token
  /AIza[0-9A-Za-z-_]{35}/,                         // Google API Key
  /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/,   // Private Key Block
  /(?:postgres|postgresql|mongodb|mongodb\+srv|mysql|redis):\/\/[a-zA-Z0-9_-]+:[^@\s]+@[a-zA-Z0-9.-]+/i, // DB connection string
  /(?:api_key|secret_key|client_secret|db_password)\s*[:=]\s*['"][a-zA-Z0-9_-]{12,}['"]/i // Explicit assignment
];

export interface SolutionStructurePreset {
  id: string;
  label: string;
  folderPattern: string;
  fileNamingPattern: string;
  example: string;
}

export const SOLUTION_STRUCTURE_PRESETS: SolutionStructurePreset[] = [
  {
    id: 'difficulty-padded-solution',
    label: 'Difficulty / Padded ID / solution.ext',
    folderPattern: '{Difficulty}/{id4}-{slug}',
    fileNamingPattern: 'solution{ext}',
    example: 'Easy/0001-two-sum/solution.java'
  },
  {
    id: 'difficulty-slug',
    label: 'solutions / Difficulty / ID-slug',
    folderPattern: 'solutions/{difficulty}/{id}-{slug}',
    fileNamingPattern: '{slug}{ext}',
    example: 'solutions/Easy/1-two-sum/two-sum.ts'
  },
  {
    id: 'language-topic',
    label: 'leetcode-solutions / Language / Topic / id_slug',
    folderPattern: 'leetcode-solutions/{Language}/{Topic}',
    fileNamingPattern: '{id}_{slug}{ext}',
    example: 'leetcode-solutions/Java/Algorithms/1_two-sum.java'
  },
  {
    id: 'language-difficulty',
    label: 'Language / Difficulty / Padded ID-slug',
    folderPattern: '{Language}/{Difficulty}/{id4}-{slug}',
    fileNamingPattern: 'solution{ext}',
    example: 'Java/Easy/0001-two-sum/solution.java'
  },
  {
    id: 'flat-padded',
    label: 'problems / Padded ID-slug',
    folderPattern: 'problems',
    fileNamingPattern: '{id4}-{slug}{ext}',
    example: 'problems/0001-two-sum.java'
  }
];

export interface DashboardModuleDefinition {
  id: string;
  label: string;
  group: 'Core' | 'Study & DSA' | 'GitHub & Portfolio' | 'Automation & System';
  core?: boolean;
  defaultEnabled: boolean;
}

export const DEFAULT_DASHBOARD_MODULES: DashboardModuleDefinition[] = [
  { id: 'overview', label: 'Overview', group: 'Core', core: true, defaultEnabled: true },
  { id: 'leetcode', label: 'LeetCode Sync', group: 'Core', core: true, defaultEnabled: true },
  { id: 'repos', label: 'Repositories', group: 'GitHub & Portfolio', core: true, defaultEnabled: true },
  { id: 'github', label: 'GitHub Activity', group: 'GitHub & Portfolio', defaultEnabled: true },
  { id: 'automation', label: 'Automations', group: 'Automation & System', defaultEnabled: true },
  { id: 'calendar', label: 'Streak Calendar', group: 'Core', defaultEnabled: true },
  { id: 'reports', label: 'Reports', group: 'Core', defaultEnabled: true },
  { id: 'catalog', label: 'README Catalog', group: 'GitHub & Portfolio', defaultEnabled: true },
  { id: 'curriculum', label: 'DSA Curriculum', group: 'Study & DSA', defaultEnabled: true },
  { id: 'revision', label: 'Revision Queue', group: 'Study & DSA', defaultEnabled: true },
  { id: 'patterns', label: 'DSA Patterns', group: 'Study & DSA', defaultEnabled: true },
  { id: 'vault', label: 'Solution Vault', group: 'Study & DSA', defaultEnabled: true },
  { id: 'intelligence', label: 'Topic & Weakness', group: 'Study & DSA', defaultEnabled: true },
  { id: 'planner', label: 'Daily Planner', group: 'Study & DSA', defaultEnabled: true },
  { id: 'mock', label: 'Mock Interview', group: 'Study & DSA', defaultEnabled: true },
  { id: 'platforms', label: 'Platforms', group: 'GitHub & Portfolio', defaultEnabled: true },
  { id: 'profile', label: 'Public Profile', group: 'GitHub & Portfolio', defaultEnabled: true },
  { id: 'career', label: 'Career Readiness', group: 'GitHub & Portfolio', defaultEnabled: true },
  { id: 'achievements', label: 'XP & Badges', group: 'GitHub & Portfolio', defaultEnabled: true },
  { id: 'badges', label: 'SVG Badges', group: 'GitHub & Portfolio', defaultEnabled: true },
  { id: 'settings', label: 'Settings', group: 'Automation & System', core: true, defaultEnabled: true }
];

export const DEFAULT_UI_ENABLED_MODULES: string[] = DEFAULT_DASHBOARD_MODULES
  .filter((m) => m.defaultEnabled)
  .map((m) => m.id);

export const DEFAULT_SIDEBAR_ORDER: string[] = DEFAULT_DASHBOARD_MODULES.map((m) => m.id);

/**
 * Default System Configurations
 */
export const DEFAULT_CONFIG = {
  DEFAULT_IDLE_MINUTES: 15,
  DEFAULT_STREAK_GOAL_PER_DAY: 1,
  DEFAULT_SOLUTION_PATH: 'solutions/{difficulty}/{id}-{slug}',
  DEFAULT_FILE_NAMING_PATTERN: '{slug}{ext}',
  DEFAULT_BRANCH: 'main',
  API_RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 mins
  API_RATE_LIMIT_MAX: 100,
  HEARTBEAT_INTERVAL_MS: 60 * 1000 // 1 minute
} as const;

