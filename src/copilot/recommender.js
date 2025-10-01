import { SugBus } from './suggestion-types.js';
import { generateCandidates } from './candidates.js';

// ---- Bandit Memory Type ----
/**
 * @typedef {Object} BanditMem
 * @property {Record<string, number>} accept - Acceptance counts per kind
 * @property {Record<string, number>} reject - Rejection counts per kind
 * @property {Record<string, number>} cooldown - Suggestion id -> nextAllowedTs
 * @property {number} [lastEmitTs] - Last emission timestamp for global rate limiting
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

// ---- Safety Gate Helper ----
/**
 * Check if suggestion passes safety gates
 * @param {import('./suggestion-types.js').Suggestion} suggestion
 * @param {import('./context-types.js').ContextFrame} frame
 * @param {boolean} visible
 * @returns {boolean}
 */
function gate(suggestion, frame, visible) {
  const safety = suggestion.safety;
  if (!safety) return true; // No gates = always pass

  const speedKph = frame.fix?.speedKph ?? 0;

  // Check visibility gate
  if (safety.visibleOnly && !visible) return false;

  // Check speed gates
  if (safety.minSpeedKph != null && speedKph < safety.minSpeedKph) return false;
  if (safety.maxSpeedKph != null && speedKph > safety.maxSpeedKph) return false;

  return true;
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
    this.visible = !document.hidden;

    // Track visibility changes
    document.addEventListener(
      'visibilitychange',
      () => {
        this.visible = !document.hidden;
      },
      { passive: true }
    );
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

    // Global rate limit: only emit suggestions every ~30s
    if ((this.mem.lastEmitTs ?? 0) + EMIT_INTERVAL > now) {
      return;
    }

    // Generate candidates
    const candidates = generateCandidates(frame, this.visible);

    // Filter by cooldown
    const ready = candidates.filter((c) => (this.mem.cooldown[c.id] || 0) <= now);

    // Filter by safety gates
    const gated = ready.filter((c) => gate(c, frame, this.visible));

    // Filter by TTL (expiresAt)
    const valid = gated.filter((c) => (c.expiresAt ?? now + 1) > now);

    if (valid.length === 0) return;

    // Rank and take top MAX_SUGGESTIONS
    const ranked = this.rank(valid, this.mem);
    const suggestions = ranked.slice(0, MAX_SUGGESTIONS);

    if (suggestions.length > 0) {
      this.mem.lastEmitTs = now;
      saveMem(this.mem);
      this.bus.emit(suggestions);
    }
  }

  /**
   * Rank candidates using UCB-inspired scoring
   * @private
   * @param {import('./suggestion-types.js').Suggestion[]} candidates
   * @param {BanditMem} mem
   * @returns {import('./suggestion-types.js').Suggestion[]}
   */
  rank(candidates, mem) {
    // Score = base + (accept - reject) * 0.6 + exploration noise
    return candidates
      .map((c) => {
        const accept = mem.accept[c.kind] || 0;
        const reject = mem.reject[c.kind] || 0;
        const score = 1 + (accept - reject) * 0.6 + Math.random() * 0.03;
        return { score, suggestion: c };
      })
      .sort((a, b) => b.score - a.score)
      .map((x) => x.suggestion);
  }
}
