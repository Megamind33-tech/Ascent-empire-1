/**
 * audioManager.js — Audio & Soundscape Management
 * ===============================================
 * Manages district-specific audio ambience and atmospheric sounds.
 */

/**
 * AudioManager Class
 * Handles audio playback for district atmospheres and ambient effects.
 */
export class AudioManager {
  constructor(scene) {
    this.scene = scene;
    this.sounds = new Map();
    this.activeSounds = new Map();
    this.audioEnabled = true;

    // Initialize audio configurations
    this.initializeAudioConfigs();
  }

  /**
   * Define audio/sound characteristics for each district
   */
  initializeAudioConfigs() {
    this.configs = {
      'civic-center': {
        name: 'Civic Center',
        ambience: 'civic_ambience',
        baseVolume: 0.4,
        layers: [
          { sound: 'traffic_distant', volume: 0.15 },
          { sound: 'people_talking', volume: 0.2 },
          { sound: 'wind_urban', volume: 0.1 }
        ]
      },

      'residential-north': {
        name: 'North Residential',
        ambience: 'residential_ambience',
        baseVolume: 0.35,
        layers: [
          { sound: 'birds_chirping', volume: 0.25 },
          { sound: 'wind_gentle', volume: 0.15 },
          { sound: 'distant_traffic', volume: 0.1 }
        ]
      },

      'residential-south': {
        name: 'South Residential',
        ambience: 'residential_ambience',
        baseVolume: 0.35,
        layers: [
          { sound: 'birds_chirping', volume: 0.25 },
          { sound: 'wind_gentle', volume: 0.15 },
          { sound: 'distant_traffic', volume: 0.1 }
        ]
      },

      'industrial-east': {
        name: 'Industrial East',
        ambience: 'industrial_ambience',
        baseVolume: 0.4,
        layers: [
          { sound: 'machinery_hum', volume: 0.3 },
          { sound: 'mechanical_sounds', volume: 0.2 },
          { sound: 'wind_industrial', volume: 0.1 }
        ]
      },

      'entertainment': {
        name: 'Entertainment District',
        ambience: 'entertainment_ambience',
        baseVolume: 0.45,
        layers: [
          { sound: 'crowd_chatter', volume: 0.25 },
          { sound: 'upbeat_music_distant', volume: 0.2 },
          { sound: 'traffic_urban', volume: 0.15 }
        ]
      },

      'rural-periphery': {
        name: 'Rural Periphery',
        ambience: 'nature_ambience',
        baseVolume: 0.3,
        layers: [
          { sound: 'birds_forest', volume: 0.3 },
          { sound: 'wind_rustling', volume: 0.2 },
          { sound: 'water_flowing', volume: 0.15 }
        ]
      }
    };
  }

  /**
   * Get audio config for a district
   * @param {string} districtId
   * @returns {Object} Audio configuration
   */
  getConfig(districtId) {
    return this.configs[districtId] || this.configs['civic-center'];
  }

  /**
   * Play audio for a specific district
   * @param {string} districtId
   * @returns {Object} Playback information
   */
  playDistrictAudio(districtId) {
    if (!this.audioEnabled) {
      return { status: 'disabled' };
    }

    const config = this.getConfig(districtId);

    // Track active audio for this district
    if (!this.activeSounds.has(districtId)) {
      this.activeSounds.set(districtId, {
        district: districtId,
        name: config.name,
        baseVolume: config.baseVolume,
        layers: config.layers.length,
        startTime: Date.now()
      });
    }

    return {
      districtId,
      name: config.name,
      baseVolume: config.baseVolume,
      layers: config.layers.length,
      status: 'playing'
    };
  }

  /**
   * Stop audio for a specific district
   * @param {string} districtId
   */
  stopDistrictAudio(districtId) {
    this.activeSounds.delete(districtId);
  }

  /**
   * Set audio volume
   * @param {number} volume 0-1
   */
  setVolume(volume) {
    volume = Math.max(0, Math.min(1, volume));
    // In real implementation, would adjust all active sounds
    for (const [, soundInfo] of this.activeSounds) {
      soundInfo.currentVolume = soundInfo.baseVolume * volume;
    }
  }

  /**
   * Enable/disable audio
   * @param {boolean} enabled
   */
  setAudioEnabled(enabled) {
    this.audioEnabled = enabled;
    if (!enabled) {
      this.activeSounds.clear();
    }
  }

  /**
   * Get all active audio
   * @returns {Map} Map of districtId -> audio info
   */
  getActiveSounds() {
    return new Map(this.activeSounds);
  }

  /**
   * Get audio summary for all districts
   * @returns {Object} Summary of audio setup
   */
  getSummary() {
    const summary = {
      audioEnabled: this.audioEnabled,
      activeSounds: this.activeSounds.size,
      districts: []
    };

    for (const [districtId, soundInfo] of this.activeSounds) {
      summary.districts.push({
        id: districtId,
        name: soundInfo.name,
        baseVolume: soundInfo.baseVolume,
        layers: soundInfo.layers
      });
    }

    return summary;
  }

  /**
   * Log audio information to console
   */
  logAudio() {
    console.log('[AudioManager] ============ AUDIO SETUP ============');
    console.log(`[AudioManager] Audio Enabled: ${this.audioEnabled}`);
    console.log(`[AudioManager] Active Districts: ${this.activeSounds.size}`);

    for (const [districtId, soundInfo] of this.activeSounds) {
      console.log(`[AudioManager] ${soundInfo.name}`);
      console.log(`[AudioManager]   Volume: ${soundInfo.baseVolume}`);
      console.log(`[AudioManager]   Audio Layers: ${soundInfo.layers}`);
    }
  }

  /**
   * Reset audio to default state
   */
  reset() {
    this.activeSounds.clear();
  }
}

/**
 * Factory function to create AudioManager
 * @param {Scene} scene Babylon.js scene
 * @returns {AudioManager} New instance
 */
export function createAudioManager(scene) {
  return new AudioManager(scene);
}
