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
  racket: { extension: '.rkt', name: 'Racket', commentPrefix: ';' }
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

/**
 * Default System Configurations
 */
export const DEFAULT_CONFIG = {
  DEFAULT_IDLE_MINUTES: 15,
  DEFAULT_STREAK_GOAL_PER_DAY: 1,
  DEFAULT_SOLUTION_PATH: 'solutions/{difficulty}/{id}-{slug}',
  DEFAULT_BRANCH: 'main',
  API_RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 mins
  API_RATE_LIMIT_MAX: 100,
  HEARTBEAT_INTERVAL_MS: 60 * 1000 // 1 minute
} as const;

