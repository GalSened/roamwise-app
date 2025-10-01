import { SugBus } from './suggestion-types.js';

// ---- Bandit Memory Type ----
/**
 * @typedef {Object} BanditMem
 * @property {Record<string, number>} accept - Acceptance counts per kind
 * @property {Record<string, number>} reject - Rejection counts per kind
 * @property {Record<string, number>} cooldown - Suggestion id -> nextAllowedTs
 */

// ---- Constants ----
const COOLDOWN_MS = 8 * 60 * 1000; // 8 minutes
const MAX_SUGGESTIONS = 2;
const EMIT_INTERVAL = 30000; // 30 seconds

// ---- localStorage Helpers ----
function loadMem() {
  try {
    const data = localStorage.getItem('copilot_bandit');
    if (!data) return { accept: {}, reject: {}, cooldown: {} };
    return JSON.parse(data);
  } catch {
    return { accept: {}, reject: {}, cooldown: {} };
  }
}

function saveMem(mem) {
  try {
    localStorage.setItem('copilot_bandit', JSON.stringify(mem));
  } catch (err) {
    console.warn('[Recommender] Failed to save bandit memory:', err);
  }
}

// ---- Recommender Class ----
export class Recommender {
  /**
   * @param {import('./context-engine.js').ContextEngine} contextEngine
   */
  constructor(contextEngine) {
    this.engine = contextEngine;
    this.bus = new SugBus();
    this.mem = loadMem();
    this.lastEmit = 0;
    this.unsubscribe = null;
  }

  /**
   * Register a listener for suggestions
   * @param {import('./suggestion-types.js').SugListener} fn
   * @returns {function(): void} Unsubscribe function
   */
  on(fn) {
    return this.bus.on(fn);
  }

  /**
   * Start listening to context frames
   * @returns {function(): void} Unsubscribe function
   */
  start() {
    if (this.unsubscribe) {
      console.warn('[Recommender] Already started');
      return this.unsubscribe;
    }

    // Subscribe to context frames using on() which returns unsubscribe function
    this.handleFrame = this.handleFrame.bind(this);
    this.unsubscribe = this.engine.on(this.handleFrame);

    console.info('[Recommender] Started listening to context frames');
    return this.unsubscribe;
  }

  /**
   * Accept a suggestion
   * @param {string} id - Suggestion ID
   * @param {string} kind - Suggestion kind
   */
  accept(id, kind) {
    this.mem.accept[kind] = (this.mem.accept[kind] || 0) + 1;
    this.mem.cooldown[id] = Date.now() + COOLDOWN_MS;
    saveMem(this.mem);
    console.info(`[Recommender] Accepted ${kind} (id: ${id})`);
  }

  /**
   * Decline a suggestion
   * @param {string} id - Suggestion ID
   * @param {string} kind - Suggestion kind
   */
  decline(id, kind) {
    this.mem.reject[kind] = (this.mem.reject[kind] || 0) + 1;
    this.mem.cooldown[id] = Date.now() + COOLDOWN_MS;
    saveMem(this.mem);
    console.info(`[Recommender] Declined ${kind} (id: ${id})`);
  }

  /**
   * Handle incoming context frame
   * @private
   * @param {import('./context-types.js').ContextFrame} frame
   */
  handleFrame(frame) {
    const now = Date.now();

    // Throttle: only emit suggestions every ~30s
    if (now - this.lastEmit < EMIT_INTERVAL) {
      return;
    }

    // Generate candidates and rank them
    const candidates = generateCandidates(frame);
    const ranked = this.rank(candidates, this.mem, now);
    const suggestions = ranked.slice(0, MAX_SUGGESTIONS);

    if (suggestions.length > 0) {
      this.lastEmit = now;
      this.bus.emit(suggestions);
    }
  }

  /**
   * Rank candidates using UCB-inspired scoring
   * @private
   * @param {import('./suggestion-types.js').Suggestion[]} candidates
   * @param {BanditMem} mem
   * @param {number} now
   * @returns {import('./suggestion-types.js').Suggestion[]}
   */
  rank(candidates, mem, now) {
    // Filter out cooled down suggestions
    const filtered = candidates.filter((c) => (mem.cooldown[c.id] || 0) <= now);

    // Score = base + (accept - reject) * 0.5 + exploration noise
    return filtered
      .map((c) => {
        const accept = mem.accept[c.kind] || 0;
        const reject = mem.reject[c.kind] || 0;
        const score = 1 + (accept - reject) * 0.5 + Math.random() * 0.05;
        return { score, suggestion: c };
      })
      .sort((a, b) => b.score - a.score)
      .map((x) => x.suggestion);
  }
}

// ---- Candidate Generators (Rule-Based) ----

/**
 * Generate suggestion candidates based on context frame
 * @param {import('./context-types.js').ContextFrame} frame
 * @returns {import('./suggestion-types.js').Suggestion[]}
 */
function generateCandidates(frame) {
  const out = [];
  const now = Date.now();
  const fix = frame.fix;

  if (!fix) return out;

  // Determine if user is moving (speed > 8 km/h ~ walking speed)
  const moving = (fix.speedKph || 0) > 8;

  // Example 1: Rest stop every ~2h of driving
  if (moving && (fix.speedKph || 0) > 40) {
    const bucket = Math.floor(now / (2 * 60 * 60 * 1000)); // 2h bucket
    out.push({
      id: `rest_${bucket}`,
      ts: now,
      kind: 'rest',
      title: 'Consider a short rest stop soon',
      reason: "You've been driving for a while",
      expiresAt: now + 20 * 60 * 1000,
      acceptAction: { type: 'FIND_NEARBY', payload: { category: 'rest' } },
      declineAction: { type: 'SNOOZE', payload: { minutes: 30 } },
    });
  }

  // Example 2: Pace adjust if crawling (< 15 km/h)
  if (moving && (fix.speedKph || 0) < 15) {
    out.push({
      id: `pace_${Math.floor(now / 300000)}`, // 5m bucket
      ts: now,
      kind: 'pace_adjust',
      title: 'Heavy traffic — consider adjusting schedule',
      reason: 'Low speed for several minutes',
      expiresAt: now + 10 * 60 * 1000,
      acceptAction: { type: 'SHIFT_SCHEDULE', payload: { minutes: 20 } },
      declineAction: { type: 'IGNORE' },
    });
  }

  // Example 3: Scenic whisper if moving
  if (moving) {
    out.push({
      id: `scenic_${Math.floor(now / 900000)}`, // 15m bucket
      ts: now,
      kind: 'scenic',
      title: 'Scenic detour nearby (check when safe)',
      reason: 'Periodic scenic check',
      expiresAt: now + 15 * 60 * 1000,
      acceptAction: { type: 'SHOW_SCENIC', payload: {} },
      declineAction: { type: 'SNOOZE', payload: { minutes: 30 } },
    });
  }

  return out;
}
