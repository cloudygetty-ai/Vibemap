'use strict';

/**
 * Unit tests for the pure validation/rate-limiter logic extracted from index.js.
 * Run with: npm test
 */

const assert = require('node:assert/strict');
const { describe, it, beforeEach } = require('node:test');

// ── Inline the helpers (same code as index.js) so tests have no side-effects ──

function isValidCoord(lat, lng) {
  return (
    typeof lat === 'number' && isFinite(lat) && lat >= -90 && lat <= 90 &&
    typeof lng === 'number' && isFinite(lng) && lng >= -180 && lng <= 180
  );
}

const VALID_VIBE_TYPES = new Set(['chill', 'intense', 'busy']);

function makeRateLimiter(maxPerSecond) {
  const counts = new Map();
  return {
    allow(socketId) {
      const now = Date.now();
      let entry = counts.get(socketId);
      if (!entry || now >= entry.resetAt) {
        entry = { count: 1, resetAt: now + 1000 };
        counts.set(socketId, entry);
        return true;
      }
      if (entry.count >= maxPerSecond) return false;
      entry.count++;
      return true;
    },
    remove(socketId) { counts.delete(socketId); },
    _counts: counts,
  };
}

// ── isValidCoord ──────────────────────────────────────────────────────────────

describe('isValidCoord', () => {
  it('accepts valid NYC coordinates', () => {
    assert.ok(isValidCoord(40.75, -73.98));
  });

  it('accepts boundary values', () => {
    assert.ok(isValidCoord(90, 180));
    assert.ok(isValidCoord(-90, -180));
    assert.ok(isValidCoord(0, 0));
  });

  it('rejects lat > 90', () => {
    assert.ok(!isValidCoord(91, 0));
  });

  it('rejects lat < -90', () => {
    assert.ok(!isValidCoord(-91, 0));
  });

  it('rejects lng > 180', () => {
    assert.ok(!isValidCoord(0, 181));
  });

  it('rejects lng < -180', () => {
    assert.ok(!isValidCoord(0, -181));
  });

  it('rejects NaN', () => {
    assert.ok(!isValidCoord(NaN, 0));
    assert.ok(!isValidCoord(0, NaN));
  });

  it('rejects Infinity', () => {
    assert.ok(!isValidCoord(Infinity, 0));
    assert.ok(!isValidCoord(0, -Infinity));
  });

  it('rejects string inputs', () => {
    assert.ok(!isValidCoord('40.75', -73.98));
    assert.ok(!isValidCoord(40.75, '-73.98'));
  });

  it('rejects null / undefined', () => {
    assert.ok(!isValidCoord(null, 0));
    assert.ok(!isValidCoord(0, undefined));
  });
});

// ── VALID_VIBE_TYPES ──────────────────────────────────────────────────────────

describe('VALID_VIBE_TYPES', () => {
  it('accepts known vibe types', () => {
    assert.ok(VALID_VIBE_TYPES.has('chill'));
    assert.ok(VALID_VIBE_TYPES.has('intense'));
    assert.ok(VALID_VIBE_TYPES.has('busy'));
  });

  it('rejects unknown vibe types', () => {
    assert.ok(!VALID_VIBE_TYPES.has('evil'));
    assert.ok(!VALID_VIBE_TYPES.has(''));
    assert.ok(!VALID_VIBE_TYPES.has(null));
    assert.ok(!VALID_VIBE_TYPES.has(undefined));
  });

  it('is case-sensitive', () => {
    assert.ok(!VALID_VIBE_TYPES.has('Chill'));
    assert.ok(!VALID_VIBE_TYPES.has('BUSY'));
  });
});

// ── makeRateLimiter ───────────────────────────────────────────────────────────

describe('makeRateLimiter', () => {
  it('allows requests up to the limit', () => {
    const lim = makeRateLimiter(3);
    assert.ok(lim.allow('s1'));
    assert.ok(lim.allow('s1'));
    assert.ok(lim.allow('s1'));
  });

  it('blocks the request that exceeds the limit', () => {
    const lim = makeRateLimiter(2);
    lim.allow('s1');
    lim.allow('s1');
    assert.ok(!lim.allow('s1'));
  });

  it('tracks different sockets independently', () => {
    const lim = makeRateLimiter(1);
    assert.ok(lim.allow('s1'));
    assert.ok(!lim.allow('s1'));
    // s2 is a fresh socket — should still be allowed
    assert.ok(lim.allow('s2'));
  });

  it('cleans up state on remove()', () => {
    const lim = makeRateLimiter(1);
    lim.allow('s1');
    assert.ok(!lim.allow('s1'));
    lim.remove('s1');
    assert.ok(!lim._counts.has('s1'));
    // After removal a new window starts
    assert.ok(lim.allow('s1'));
  });

  it('resets the window after 1 second', async () => {
    const lim = makeRateLimiter(1);
    lim.allow('s1');
    assert.ok(!lim.allow('s1'));
    // Manually expire the window
    lim._counts.get('s1').resetAt = Date.now() - 1;
    assert.ok(lim.allow('s1'));
  });
});
