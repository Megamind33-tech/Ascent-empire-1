/**
 * eventBus.js — Lightweight pub/sub event system.
 * All game systems (economy, politics, NPC) emit and listen through here.
 * This decouples trigger logic from reaction logic entirely.
 *
 * USAGE:
 *   import { emit, on } from './eventBus.js';
 *   on('FOOD_CRISIS', ({ severity }) => { ... });
 *   emit('FOOD_CRISIS', { severity: 0.8 });
 */

const _listeners = {};
const _history   = []; // Last 32 events, readable by NPCs for memory
const _handlerErrors = {}; // Track errors per event type

/** Subscribe to an event type */
export function on(eventType, fn) {
  if (!_listeners[eventType]) _listeners[eventType] = [];
  _listeners[eventType].push(fn);
}

/** Unsubscribe a specific handler */
export function off(eventType, fn) {
  if (!_listeners[eventType]) return;
  _listeners[eventType] = _listeners[eventType].filter(f => f !== fn);
}

/** Fire an event to all subscribers */
export function emit(eventType, payload = {}) {
  const entry = { type: eventType, payload, tick: Date.now() };
  _history.push(entry);
  if (_history.length > 32) _history.shift();

  const handlers = _listeners[eventType] || [];
  let errorCount = 0;

  handlers.forEach((fn, index) => {
    try {
      fn(payload);
    } catch (e) {
      errorCount++;
      // Log full error with context for debugging
      console.error(`[EventBus] Handler #${index} failed on event "${eventType}":`, e.message);
      console.error(`[EventBus] Stack:`, e.stack);

      // Track error rates per event type
      if (!_handlerErrors[eventType]) {
        _handlerErrors[eventType] = { count: 0, lastError: null };
      }
      _handlerErrors[eventType].count++;
      _handlerErrors[eventType].lastError = e;

      // Warning if too many handlers fail
      if (errorCount > 2) {
        console.warn(`[EventBus] Multiple handler failures on "${eventType}" (${errorCount} of ${handlers.length} failed)`);
      }
    }
  });

  // Continue processing other handlers even if some fail (graceful degradation)
}

/** NPCs can query recent event history to inform decisions */
export function getRecentEvents(withinMs = 30000) {
  const now = Date.now();
  return _history.filter(e => now - e.tick < withinMs);
}

/** Get handler error statistics (for debugging) */
export function getHandlerErrors() {
  return _handlerErrors;
}

/**
 * REGISTERED EVENT TYPES (documentation only — not enforced)
 *
 * FOOD_CRISIS        { severity: 0–1 }
 * SCANDAL            { sourceRival: string|null, severity: 0–1 }
 * ELECTION_CYCLE     { daysRemaining: number }
 * PROTEST            { district: string, size: 'small'|'large' }
 * BORDER_TENSION     { nationIndex: number, relation: number }
 * ECONOMIC_BOOM      { cashAmount: number }
 * BLACK_MARKET       { rivalName: string }
 * RIVAL_BETRAYAL     { rivalName: string, impact: number }
 * ASSASSINATION_PLOT { rivalName: string }
 * FACTION_OFFER      { faction: 'cartel'|'mafia', deal: string, cost: number }
 * RIVAL_SETBACK      { rivalName: string }
 * DISTRICT_UNREST    { level: number }
 * BUILDING_SABOTAGE  { buildingType: string }
 * CASCADE_TRIGGER    { chain: string[] }
 */
