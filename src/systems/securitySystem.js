/**
 * securitySystem.js — Data Integrity & Protection
 * ===============================================
 * Provides utilities to sign and verify game data to prevent 
 * simple JSON manipulation by users. 
 */

const SECRET_SALT = 'ascent-realms-v2-integrity-check';

/**
 * Creates a simple but unique hash for a string payload.
 * This is not cryptographically secure against professionals, 
 * but prevents 99% of casual JSON editing.
 */
function createChecksum(payload) {
    let hash = 0;
    const combined = payload + SECRET_SALT;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(36);
}

/**
 * Wraps a payload with an integrity signature.
 */
export function signData(data) {
    const json = JSON.stringify(data);
    const sig  = createChecksum(json);
    return JSON.stringify({ d: data, s: sig });
}

/**
 * Verifies and unwraps data. Returns null if tampered.
 */
export function verifyData(signedJson) {
    try {
        if (!signedJson || typeof signedJson !== 'string') {
            console.error('[Security] Invalid signed JSON - not a string:', typeof signedJson);
            return null;
        }

        const envelope = JSON.parse(signedJson);
        if (!envelope || typeof envelope !== 'object') {
            console.error('[Security] Invalid envelope structure');
            return null;
        }

        if (!envelope.d || envelope.s === undefined) {
            console.error('[Security] Envelope missing data (d) or signature (s)');
            return null;
        }

        const json = JSON.stringify(envelope.d);
        const expected = createChecksum(json);

        if (envelope.s !== expected) {
            console.error('[Security] Save data integrity check failed! Expected:', expected, 'Got:', envelope.s);
            return null;
        }

        return envelope.d;
    } catch (e) {
        console.error('[Security] Failed to parse or verify signed data:', e.message);
        return null;
    }
}
