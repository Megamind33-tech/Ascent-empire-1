/**
 * eventManager.js — Dynamic Event & Disaster System
 * =================================================
 * Manages district-level events, disasters, and dynamic gameplay mechanics.
 */

/**
 * EventManager Class
 * Handles all dynamic events affecting districts.
 */
export class EventManager {
  constructor(districtManager, resourceManager) {
    this.districtManager = districtManager;
    this.resourceManager = resourceManager;
    this.eventLog = [];
    this.activeEvents = new Map();
    this.eventWeights = this._initializeEventWeights();
    this.frameCounter = 0;

    // Initialize base event probabilities
    this.eventCheckInterval = 60; // Check every 60 frames (~1 second at 60fps)
  }

  /**
   * Initialize event probability weights
   * @private
   */
  _initializeEventWeights() {
    return {
      prosperity: 15, // Positive event
      drought: 10,
      plague: 8,
      strike: 12,
      construction_boom: 10,
      population_influx: 8,
      recession: 10,
      resource_abundance: 12
    };
  }

  /**
   * Get event definition
   * @private
   */
  _getEventDefinition(eventType) {
    const definitions = {
      prosperity: {
        name: 'Prosperity',
        duration: 300, // 5 seconds at 60fps
        effects: {
          happiness: 15,
          tax_revenue_multiplier: 1.3,
          population_multiplier: 1.2
        },
        emoji: '📈'
      },
      drought: {
        name: 'Drought',
        duration: 240,
        effects: {
          food_production: -60,
          happiness: -15,
          population_change: -100
        },
        emoji: '🏜️'
      },
      plague: {
        name: 'Epidemic',
        duration: 180,
        effects: {
          population_change: -200,
          happiness: -20,
          labor: -30
        },
        emoji: '🦠'
      },
      strike: {
        name: 'Labor Strike',
        duration: 120,
        effects: {
          labor: -50,
          happiness: -10,
          efficiency: -30
        },
        emoji: '🪧'
      },
      construction_boom: {
        name: 'Construction Boom',
        duration: 240,
        effects: {
          materials_consumption: 1.5,
          jobs: 50,
          population_multiplier: 1.15
        },
        emoji: '🏗️'
      },
      population_influx: {
        name: 'Population Influx',
        duration: 180,
        effects: {
          population_change: 150,
          labor: 30,
          resource_demand: 1.2
        },
        emoji: '👥'
      },
      recession: {
        name: 'Economic Recession',
        duration: 300,
        effects: {
          tax_revenue_multiplier: 0.6,
          happiness: -10,
          treasury_penalty: 500
        },
        emoji: '📉'
      },
      resource_abundance: {
        name: 'Resource Abundance',
        duration: 200,
        effects: {
          food: 40,
          materials: 40,
          energy: 30,
          happiness: 10
        },
        emoji: '🌾'
      }
    };

    return definitions[eventType];
  }

  /**
   * Trigger an event in a district
   * @param {string} districtId
   * @param {string} eventType
   * @returns {boolean} Event triggered successfully
   */
  triggerEvent(districtId, eventType) {
    const district = this.districtManager.getDistrict(districtId);
    if (!district || !district.isUnlocked) return false;

    const definition = this._getEventDefinition(eventType);
    if (!definition) return false;

    // Check if district already has similar active events
    const eventKey = `${districtId}-${eventType}`;
    if (this.activeEvents.has(eventKey)) {
      return false; // Event already active
    }

    // Create event instance
    const event = {
      id: eventKey,
      type: eventType,
      districtId,
      name: definition.name,
      startFrame: this.frameCounter,
      duration: definition.duration,
      effects: definition.effects,
      emoji: definition.emoji,
      active: true
    };

    // Add to tracking
    this.activeEvents.set(eventKey, event);
    district.activeEvents.push(eventType);

    // Apply initial effects
    this._applyEventEffects(district, event, true);

    // Log event
    this.eventLog.push({
      type: eventType,
      district: districtId,
      timestamp: Date.now(),
      frame: this.frameCounter
    });

    console.log(`[EventManager] Event triggered: ${definition.name} in ${district.name}`);

    return true;
  }

  /**
   * Apply event effects to a district
   * @private
   */
  _applyEventEffects(district, event, isActivation = false) {
    const effects = event.effects;

    // Resource changes
    if (effects.food) {
      district.resources.food = Math.min(
        100,
        district.resources.food + effects.food
      );
    }
    if (effects.materials) {
      district.resources.materials = Math.min(
        100,
        district.resources.materials + effects.materials
      );
    }
    if (effects.energy) {
      district.resources.energy = Math.min(100, district.resources.energy + effects.energy);
    }
    if (effects.labor) {
      district.resources.labor = Math.max(0, district.resources.labor + effects.labor);
    }

    // Happiness changes
    if (effects.happiness) {
      district.happiness = Math.max(0, Math.min(100, district.happiness + effects.happiness));
    }

    // Efficiency changes
    if (effects.efficiency) {
      district.efficiency = Math.max(0, Math.min(100, district.efficiency + effects.efficiency));
    }

    // Population changes
    if (effects.population_change) {
      district.population = Math.max(0, district.population + effects.population_change);
    }

    // Treasury penalties
    if (effects.treasury_penalty) {
      district.treasury = Math.max(0, district.treasury - effects.treasury_penalty);
    }
  }

  /**
   * Update all active events
   * Called each frame to manage event duration
   */
  updateEvents() {
    const toRemove = [];

    for (const [eventKey, event] of this.activeEvents) {
      const elapsed = this.frameCounter - event.startFrame;

      if (elapsed >= event.duration) {
        // Event expired
        const district = this.districtManager.getDistrict(event.districtId);
        if (district) {
          const idx = district.activeEvents.indexOf(event.type);
          if (idx > -1) {
            district.activeEvents.splice(idx, 1);
          }
        }

        toRemove.push(eventKey);
      }
    }

    // Remove expired events
    for (const eventKey of toRemove) {
      this.activeEvents.delete(eventKey);
    }

    // Check for new events
    if (this.frameCounter % this.eventCheckInterval === 0) {
      this._checkForRandomEvents();
    }

    this.frameCounter++;
  }

  /**
   * Check for random events to trigger
   * @private
   */
  _checkForRandomEvents() {
    const districts = this.districtManager
      .getAllDistricts()
      .filter(d => d.isUnlocked && d.crisisLevel < 50); // Only healthy districts

    // 30% chance each district gets an event per check interval
    for (const district of districts) {
      if (Math.random() > 0.3) continue;

      // Select random event type based on weights
      const eventType = this._selectWeightedEvent(district);
      if (eventType) {
        this.triggerEvent(district.id, eventType);
      }
    }
  }

  /**
   * Select event type based on weights and district conditions
   * @private
   */
  _selectWeightedEvent(district) {
    const weights = { ...this.eventWeights };

    // Adjust weights based on district conditions
    if (district.happiness < 40) {
      weights.strike += 10;
      weights.plague += 5;
    }

    if (district.resources.food < 40) {
      weights.drought += 10;
    }

    if (district.treasury > 10000) {
      weights.prosperity += 10;
      weights.construction_boom += 8;
    }

    if (district.population > 3000) {
      weights.population_influx += 8;
    }

    // Random weighted selection
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (const [eventType, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        return eventType;
      }
    }

    return null;
  }

  /**
   * Get active events in a district
   * @param {string} districtId
   * @returns {Array} Active events
   */
  getDistrictEvents(districtId) {
    const events = [];

    for (const [, event] of this.activeEvents) {
      if (event.districtId === districtId && event.active) {
        events.push({
          type: event.type,
          name: event.name,
          emoji: event.emoji,
          framesRemaining: Math.max(
            0,
            event.duration - (this.frameCounter - event.startFrame)
          )
        });
      }
    }

    return events;
  }

  /**
   * Get all active events across districts
   * @returns {Object} Events by district
   */
  getAllActiveEvents() {
    const result = {};

    for (const district of this.districtManager.getAllDistricts()) {
      const events = this.getDistrictEvents(district.id);
      if (events.length > 0) {
        result[district.id] = events;
      }
    }

    return result;
  }

  /**
   * Get event history
   * @param {number} count Number of recent events
   * @returns {Array} Recent events
   */
  getEventHistory(count = 20) {
    return this.eventLog.slice(-count).reverse();
  }

  /**
   * Check if event occurred during period
   * @param {string} eventType
   * @param {number} frameWindow Frames to look back
   * @returns {number} Count of event occurrences
   */
  getEventCount(eventType, frameWindow = 3600) {
    const minFrame = this.frameCounter - frameWindow;
    return this.eventLog.filter(
      e => e.type === eventType && e.frame >= minFrame
    ).length;
  }

  /**
   * Trigger specific disaster for testing
   * @param {string} districtId
   * @param {string} eventType
   * @returns {boolean}
   */
  triggerDisaster(districtId, eventType) {
    return this.triggerEvent(districtId, eventType);
  }

  /**
   * Get event definitions for UI
   * @returns {Object} All event definitions
   */
  getEventDefinitions() {
    const result = {};

    for (const eventType of Object.keys(this.eventWeights)) {
      const definition = this._getEventDefinition(eventType);
      if (definition) {
        result[eventType] = definition;
      }
    }

    return result;
  }

  /**
   * Reset event manager (for new game)
   */
  reset() {
    this.eventLog = [];
    this.activeEvents.clear();
    this.frameCounter = 0;
  }
}

/**
 * Factory function to create EventManager
 * @param {DistrictManager} districtManager
 * @param {ResourceManager} resourceManager
 * @returns {EventManager} New instance
 */
export function createEventManager(districtManager, resourceManager) {
  return new EventManager(districtManager, resourceManager);
}
