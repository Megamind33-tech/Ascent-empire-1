import { setMessage } from '../ui/hud.js';
import { signData, verifyData } from './securitySystem.js';

const KEY = 'ascent-realms-save';

/**
 * Storage Wrapper
 * Tries to use Capacitor Preferences (via window global or try/catch)
 * falls back to localStorage.
 */
const Storage = {
    async set(key, value) {
        try {
            // Prepare envelope
            const envelope = signData(value);

            // Validate envelope was created
            if (!envelope) {
                console.error('[Storage] Failed to sign data');
                throw new Error('Failed to sign game data');
            }

            try {
                // Future-proofing: @capacitor/preferences usually exposes a Capacitor global
                if (window.Capacitor && window.Capacitor.Plugins.Preferences) {
                    await window.Capacitor.Plugins.Preferences.set({ key, value: envelope });
                    console.log('[Storage] Data saved via Capacitor');
                    return;
                }
            } catch (capacitorErr) {
                console.warn('[Storage] Capacitor save failed, falling back to localStorage:', capacitorErr.message);
            }

            // Fallback to localStorage
            localStorage.setItem(key, envelope);
            console.log('[Storage] Data saved to localStorage');
        } catch (e) {
            console.error('[Storage] Critical error during save:', e.message);
            throw e;
        }
    },

    async get(key) {
        let raw = null;
        try {
            try {
                if (window.Capacitor && window.Capacitor.Plugins.Preferences) {
                    const result = await window.Capacitor.Plugins.Preferences.get({ key });
                    raw = result?.value;
                    if (raw) console.log('[Storage] Data loaded from Capacitor');
                }
            } catch (capacitorErr) {
                console.warn('[Storage] Capacitor load failed, trying localStorage:', capacitorErr.message);
            }

            // Fallback to localStorage
            if (!raw) {
                raw = localStorage.getItem(key);
                if (raw) console.log('[Storage] Data loaded from localStorage');
            }
        } catch (e) {
            console.error('[Storage] Error accessing storage:', e.message);
            return null;
        }

        if (!raw) {
            console.warn('[Storage] No save data found');
            return null;
        }

        const verified = verifyData(raw);
        if (!verified) {
            console.error('[Storage] Save data verification failed - data may be corrupted');
            return null;
        }

        return verified;
    }
};

export async function saveGame(state) {
    try {
        // Validate state has required properties
        if (!state || typeof state !== 'object') {
            console.error('[SaveGame] Invalid state object');
            setMessage('Error: Invalid game state');
            return false;
        }

        const data = {
            playerName: state.playerName,
            startDistrict: state.startDistrict,
            cash: state.cash,
            approval: state.approval,
            influence: state.influence,
            officeIndex: state.officeIndex,
            population: state.population,
            food: state.food,
            steel: state.steel,
            fuel: state.fuel,
            research: state.research,
            sportsPrestige: state.sportsPrestige,
            legitimacy: state.legitimacy,
            corruption: state.corruption,
            security: state.security,
            education: state.education,
            diplomaticAccess: state.diplomaticAccess,
            passportLevel: state.passportLevel,
            currentNationIndex: state.currentNationIndex,
            unlockedTravel: state.unlockedTravel,
            buildings: state.buildings,
            nations: state.nations,
            rivals: state.rivals,
            factions: state.factions,
            // Simulation fields — required for a correct restore
            enactedLaws: state.enactedLaws,
            activeModifiers: { ...state.activeModifiers },
            electionTimer: state.electionTimer,
            activeEvents: [...state.activeEvents],
            elapsedGameTime: state.elapsedGameTime,
        };

        await Storage.set(KEY, data);
        setMessage('Game saved & encrypted.');
        return true;
    } catch (err) {
        console.error('[SaveGame] Error saving game:', err.message);
        setMessage('Error saving game');
        return false;
    }
}

export async function loadGame(state) {
    try {
        const data = await Storage.get(KEY);
        if (!data) {
            setMessage('No valid save found.');
            return false;
        }

        // Hydrate non-worldRefs fields only — worldRefs holds live Babylon/Rapier objects
        // Note: saved data doesn't include worldRefs, so we just restore what we can
        const restorable = {
            playerName: data.playerName,
            startDistrict: data.startDistrict,
            cash: data.cash,
            approval: data.approval,
            influence: data.influence,
            officeIndex: data.officeIndex,
            population: data.population,
            food: data.food,
            steel: data.steel,
            fuel: data.fuel,
            research: data.research,
            sportsPrestige: data.sportsPrestige,
            legitimacy: data.legitimacy,
            corruption: data.corruption,
            security: data.security,
            education: data.education,
            diplomaticAccess: data.diplomaticAccess,
            passportLevel: data.passportLevel,
            currentNationIndex: data.currentNationIndex,
            unlockedTravel: data.unlockedTravel,
            buildings: data.buildings,
            nations: data.nations,
            rivals: data.rivals,
            factions: data.factions,
            enactedLaws: data.enactedLaws,
            activeModifiers: data.activeModifiers,
            electionTimer: data.electionTimer,
            activeEvents: data.activeEvents,
            elapsedGameTime: data.elapsedGameTime
        };

        Object.assign(state, restorable);
        setMessage('Save verified & loaded.');
        return true;
    } catch (err) {
        console.error('[SaveSystem] Error loading game:', err);
        setMessage('Error loading save.');
        return false;
    }
}

export function startAutoCheckpoints(state) {
    let acc = 0;
    let saveCount = 0;
    return {
        update(dt) {
            acc += dt;
            if (acc >= 45) { // Slower autosave for security/performance
                acc = 0;
                saveGame(state)
                    .then(success => {
                        if (success) {
                            saveCount++;
                            console.log(`[AutoSave] Checkpoint #${saveCount} saved`);
                        }
                    })
                    .catch(err => {
                        console.error('[AutoSave] Checkpoint failed:', err.message);
                    });
            }
        }
    };
}