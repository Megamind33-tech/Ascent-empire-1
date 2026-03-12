/**
 * districtManager.js — Interactive District Management System
 * ===========================================================
 * Manages district state, unlocking, upgrades, and gameplay mechanics.
 * Coordinates with economy and event systems for dynamic gameplay.
 */

/**
 * DistrictManager Class
 * Handles all district-level game state and interactions.
 */
export class DistrictManager {
  constructor(districtPlanner) {
    this.planner = districtPlanner;
    this.districts = new Map();
    this.selectedDistrict = null;

    // Initialize district game state
    this.initializeDistrictState();
  }

  /**
   * Initialize game state for each district
   */
  initializeDistrictState() {
    const plannerDistricts = this.planner.getAllDistricts();

    for (const district of plannerDistricts) {
      const gameState = {
        id: district.id,
        name: district.name,
        type: district.type,

        // Unlock/Upgrade
        isUnlocked: district.id === 'civic-center', // Only civic center starts unlocked
        upgradeLevel: 0,
        unlockProgress: 0, // 0-100, progress towards unlock
        unlockRequirements: this._getUnlockRequirements(district.id),

        // Stats
        happiness: 50, // 0-100
        efficiency: 75, // 0-100, affected by resources
        morale: 60, // 0-100

        // Population & Economics
        population: this._getInitialPopulation(district),
        taxRevenue: 0,
        maintenanceCost: this._getMaintenanceCost(district),
        treasury: 1000, // Starting funds

        // Resources (0-100 for each)
        resources: {
          food: 50,
          materials: 40,
          energy: 50,
          labor: 60,
          goods: 30
        },

        // Production/Consumption
        production: this._getProduction(district),
        consumption: this._getConsumption(district),

        // Events
        activeEvents: [],
        crisisLevel: 0, // 0-100
        disasterCooldown: 0, // Frames until next disaster possible

        // Gameplay
        buildingsCount: 0,
        lastUpdateFrame: 0
      };

      this.districts.set(district.id, gameState);
    }

    // Civic center starts with resources
    const civic = this.districts.get('civic-center');
    if (civic) {
      civic.treasury = 5000;
      civic.resources.labor = 80;
      civic.resources.materials = 60;
    }
  }

  /**
   * Get unlock requirements for a district
   * @private
   */
  _getUnlockRequirements(districtId) {
    const requirements = {
      'civic-center': { tax_revenue: 0 }, // Always unlocked
      'residential-north': { tax_revenue: 500, treasury: 1000 },
      'residential-south': { tax_revenue: 500, treasury: 1000 },
      'industrial-east': { tax_revenue: 1500, population: 2000 },
      'entertainment': { tax_revenue: 1000, happiness: 60 },
      'rural-periphery': { tax_revenue: 800, materials: 50 }
    };

    return requirements[districtId] || {};
  }

  /**
   * Get initial population for district type
   * @private
   */
  _getInitialPopulation(district) {
    switch (district.type) {
      case 'civic':
        return 500;
      case 'residential':
        return 800;
      case 'industrial':
        return 300;
      case 'entertainment':
        return 200;
      case 'rural':
        return 400;
      default:
        return 0;
    }
  }

  /**
   * Get maintenance cost for district
   * @private
   */
  _getMaintenanceCost(district) {
    const baseCost = {
      civic: 500,
      residential: 300,
      industrial: 600,
      entertainment: 400,
      rural: 200
    };
    return baseCost[district.type] || 200;
  }

  /**
   * Get production rates for district
   * @private
   */
  _getProduction(district) {
    const production = {
      food: 0,
      materials: 0,
      energy: 0,
      labor: 0,
      goods: 0
    };

    switch (district.type) {
      case 'civic':
        production.goods = 30; // Government services
        break;
      case 'residential':
        production.labor = 50; // Population generates labor
        break;
      case 'industrial':
        production.materials = 80; // Raw material production
        production.energy = 40;
        break;
      case 'entertainment':
        production.goods = 40; // Entertainment/services
        break;
      case 'rural':
        production.food = 70; // Food production
        production.materials = 20;
        break;
    }

    return production;
  }

  /**
   * Get consumption rates for district
   * @private
   */
  _getConsumption(district) {
    const consumption = {
      food: 0,
      materials: 0,
      energy: 0,
      labor: 0,
      goods: 0
    };

    switch (district.type) {
      case 'civic':
        consumption.labor = 40;
        consumption.energy = 30;
        break;
      case 'residential':
        consumption.food = 60;
        consumption.goods = 40;
        consumption.materials = 20;
        break;
      case 'industrial':
        consumption.labor = 60;
        consumption.materials = 30; // Raw materials for processing
        consumption.energy = 50;
        break;
      case 'entertainment':
        consumption.labor = 30;
        consumption.goods = 20;
        break;
      case 'rural':
        consumption.labor = 40;
        consumption.materials = 10;
        break;
    }

    return consumption;
  }

  /**
   * Get district by ID
   * @param {string} districtId
   * @returns {Object} District game state
   */
  getDistrict(districtId) {
    return this.districts.get(districtId);
  }

  /**
   * Get all districts
   * @returns {Array} All district game states
   */
  getAllDistricts() {
    return Array.from(this.districts.values());
  }

  /**
   * Select a district for interaction
   * @param {string} districtId
   */
  selectDistrict(districtId) {
    const district = this.getDistrict(districtId);
    if (district) {
      this.selectedDistrict = districtId;
      return true;
    }
    return false;
  }

  /**
   * Get selected district
   * @returns {Object|null} Selected district or null
   */
  getSelectedDistrict() {
    if (!this.selectedDistrict) return null;
    return this.getDistrict(this.selectedDistrict);
  }

  /**
   * Upgrade a district to next level
   * @param {string} districtId
   * @returns {boolean} Success
   */
  upgradeDistrict(districtId) {
    const district = this.getDistrict(districtId);
    if (!district) return false;

    if (!district.isUnlocked) return false;

    // Calculate upgrade cost (scales with level)
    const upgradeCost = 1000 + (district.upgradeLevel * 500);

    if (district.treasury < upgradeCost) return false;

    // Apply upgrade
    district.treasury -= upgradeCost;
    district.upgradeLevel++;
    district.efficiency = Math.min(100, district.efficiency + 10);

    console.log(
      `[DistrictManager] Upgraded ${district.name} to level ${district.upgradeLevel}`
    );

    return true;
  }

  /**
   * Check if district should unlock
   * @private
   */
  _checkUnlock(districtId, globalStats) {
    const district = this.getDistrict(districtId);
    if (!district || district.isUnlocked) return;

    const requirements = district.unlockRequirements;
    const civic = this.getDistrict('civic-center');

    // Check all requirements
    let canUnlock = true;
    for (const [key, value] of Object.entries(requirements)) {
      if (key === 'tax_revenue' && civic.taxRevenue < value) canUnlock = false;
      if (key === 'treasury' && civic.treasury < value) canUnlock = false;
      if (key === 'population' && civic.population < value) canUnlock = false;
      if (key === 'happiness' && civic.happiness < value) canUnlock = false;
      if (key === 'materials' && civic.resources.materials < value) canUnlock = false;
    }

    if (canUnlock) {
      district.isUnlocked = true;
      console.log(`[DistrictManager] Unlocked district: ${district.name}`);
      return true;
    }

    return false;
  }

  /**
   * Update district state (called each frame/turn)
   * @param {number} deltaTime Time since last update
   * @param {Object} globalStats Global game statistics
   */
  updateDistricts(deltaTime, globalStats = {}) {
    for (const district of this.getAllDistricts()) {
      if (!district.isUnlocked) {
        // Check unlock conditions
        this._checkUnlock(district.id, globalStats);
        continue;
      }

      // Update economics
      this._updateDistrrictEconomics(district);

      // Update resources
      this._updateResources(district);

      // Update happiness
      this._updateHappiness(district);

      // Decay active events
      district.disasterCooldown = Math.max(0, district.disasterCooldown - 1);
    }
  }

  /**
   * Update district economics
   * @private
   */
  _updateDistrrictEconomics(district) {
    // Calculate tax revenue from population
    const baseRevenue = district.population * 0.1;
    const happinessMultiplier = district.happiness / 100;
    const efficiencyMultiplier = district.efficiency / 100;

    district.taxRevenue = Math.floor(
      baseRevenue * happinessMultiplier * efficiencyMultiplier
    );

    // Apply maintenance cost
    const maintenanceWithUpgrades =
      district.maintenanceCost * (1 + district.upgradeLevel * 0.2);
    district.treasury += district.taxRevenue - maintenanceWithUpgrades;

    // Cap treasury growth
    district.treasury = Math.min(district.treasury, 50000);
  }

  /**
   * Update resource levels
   * @private
   */
  _updateResources(district) {
    // Apply production
    for (const [resource, production] of Object.entries(district.production)) {
      const productionAdjusted = production * (district.efficiency / 100);
      district.resources[resource] = Math.min(
        100,
        district.resources[resource] + productionAdjusted * 0.01
      );
    }

    // Apply consumption
    for (const [resource, consumption] of Object.entries(district.consumption)) {
      const consumptionAdjusted = consumption * (district.population / 1000);
      district.resources[resource] = Math.max(
        0,
        district.resources[resource] - consumptionAdjusted * 0.01
      );
    }

    // Calculate efficiency based on resource availability
    let resourceScore = 0;
    for (const [, level] of Object.entries(district.resources)) {
      resourceScore += level;
    }
    const avgResource = resourceScore / Object.keys(district.resources).length;
    district.efficiency = Math.floor(avgResource * 0.8 + district.upgradeLevel * 5);
  }

  /**
   * Update happiness
   * @private
   */
  _updateHappiness(district) {
    let happinessChange = 0;

    // Resource availability affects happiness
    const avgResource =
      Object.values(district.resources).reduce((a, b) => a + b, 0) /
      Object.keys(district.resources).length;

    if (avgResource > 70) happinessChange += 2;
    else if (avgResource < 30) happinessChange -= 3;

    // Services help happiness (civic district)
    if (district.type === 'civic') happinessChange += 1;

    // Active events affect happiness
    for (const event of district.activeEvents) {
      if (event === 'prosperity') happinessChange += 3;
      if (event === 'drought') happinessChange -= 2;
      if (event === 'epidemic') happinessChange -= 4;
    }

    district.happiness = Math.max(0, Math.min(100, district.happiness + happinessChange));
  }

  /**
   * Get district summary for UI
   * @param {string} districtId
   * @returns {Object} Summary data
   */
  getDistrictSummary(districtId) {
    const district = this.getDistrict(districtId);
    if (!district) return null;

    return {
      id: district.id,
      name: district.name,
      isUnlocked: district.isUnlocked,
      upgradeLevel: district.upgradeLevel,
      happiness: Math.floor(district.happiness),
      efficiency: Math.floor(district.efficiency),
      population: Math.floor(district.population),
      taxRevenue: Math.floor(district.taxRevenue),
      treasury: Math.floor(district.treasury),
      resources: Object.fromEntries(
        Object.entries(district.resources).map(([k, v]) => [k, Math.floor(v)])
      ),
      activeEvents: district.activeEvents
    };
  }

  /**
   * Get all districts summary for global view
   * @returns {Array} All district summaries
   */
  getAllDistrictsSummary() {
    return this.getAllDistricts().map(d => this.getDistrictSummary(d.id));
  }

  /**
   * Reset manager (for new game)
   */
  reset() {
    this.districts.clear();
    this.selectedDistrict = null;
    this.initializeDistrictState();
  }
}

/**
 * Factory function to create DistrictManager
 * @param {DistrictPlanner} districtPlanner
 * @returns {DistrictManager} New instance
 */
export function createDistrictManager(districtPlanner) {
  return new DistrictManager(districtPlanner);
}
