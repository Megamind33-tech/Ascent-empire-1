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
        // Prepare envelope
        const envelope = signData(value);
        
        try {
            // Future-proofing: @capacitor/preferences usually exposes a Capacitor global
            if (window.Capacitor && window.Capacitor.Plugins.Preferences) {
                await window.Capacitor.Plugins.Preferences.set({ key, value: envelope });
            } else {
                localStorage.setItem(key, envelope);
            }
        } catch (e) {
            localStorage.setItem(key, envelope);
        }
    },
    
    async get(key) {
        let raw = null;
        try {
            if (window.Capacitor && window.Capacitor.Plugins.Preferences) {
                const result = await window.Capacitor.Plugins.Preferences.get({ key });
                raw = result.value;
            } else {
                raw = localStorage.getItem(key);
            }
        } catch (e) {
            raw = localStorage.getItem(key);
        }
        
        if (!raw) return null;
        return verifyData(raw);
    }
};

export async function saveGame(state) {
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
}

export async function loadGame(state) {
    const data = await Storage.get(KEY);
    if (!data) {
        setMessage('No valid save found.');
        return false;
    }
    
    // Hydrate non-worldRefs fields only — worldRefs holds live Babylon/Rapier objects
    const { worldRefs, ...restorable } = data;
    Object.assign(state, restorable);
    setMessage('Save verified & loaded.');
    return true;
}

export function startAutoCheckpoints(state) {
    let acc = 0;
    return {
        update(dt) {
            acc += dt;
            if (acc >= 45) { // Slower autosave for security/performance
                acc = 0;
                saveGame(state);
            }
        }
    };
}