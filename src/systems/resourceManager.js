/**
 * resourceManager.js — Global Resource & Economic System
 * ======================================================
 * Manages inter-district resource flow and global economy.
 * Coordinates supply chains between districts.
 */

/**
 * ResourceManager Class
 * Handles global resource economy and supply chains.
 */
export class ResourceManager {
  constructor(districtManager) {
    this.districtManager = districtManager;
    this.globalTreasury = 0;
    this.tradeRoutes = new Map(); // Supply chain routes
    this.tradingLog = [];

    // Initialize trade routes
    this.initializeTradeRoutes();
  }

  /**
   * Initialize supply chain routes between districts
   */
  initializeTradeRoutes() {
    // Define supply chain: producer -> consumer
    const routes = [
      // Industrial → Residential (materials for housing)
      {
        from: 'industrial-east',
        to: 'residential-north',
        resource: 'materials',
        amount: 10,
        efficiency: 0.8
      },
      {
        from: 'industrial-east',
        to: 'residential-south',
        resource: 'materials',
        amount: 10,
        efficiency: 0.8
      },
      // Rural → Residential (food)
      {
        from: 'rural-periphery',
        to: 'residential-north',
        resource: 'food',
        amount: 15,
        efficiency: 0.7
      },
      {
        from: 'rural-periphery',
        to: 'residential-south',
        resource: 'food',
        amount: 15,
        efficiency: 0.7
      },
      // Civic → Everywhere (government services)
      {
        from: 'civic-center',
        to: 'residential-north',
        resource: 'goods',
        amount: 8,
        efficiency: 0.9
      },
      {
        from: 'civic-center',
        to: 'residential-south',
        resource: 'goods',
        amount: 8,
        efficiency: 0.9
      },
      {
        from: 'civic-center',
        to: 'industrial-east',
        resource: 'goods',
        amount: 5,
        efficiency: 0.85
      },
      // Entertainment → Residential (services)
      {
        from: 'entertainment',
        to: 'residential-north',
        resource: 'goods',
        amount: 5,
        efficiency: 0.8
      },
      {
        from: 'entertainment',
        to: 'residential-south',
        resource: 'goods',
        amount: 5,
        efficiency: 0.8
      },
      // Rural → Industrial (raw materials)
      {
        from: 'rural-periphery',
        to: 'industrial-east',
        resource: 'materials',
        amount: 20,
        efficiency: 0.75
      }
    ];

    for (const route of routes) {
      this.tradeRoutes.set(`${route.from}->${route.to}`, route);
    }

    console.log(
      `[ResourceManager] Initialized ${this.tradeRoutes.size} trade routes`
    );
  }

  /**
   * Execute trades for a frame/turn
   * Moves resources between districts based on supply chains
   */
  executeTrades() {
    for (const [routeId, route] of this.tradeRoutes) {
      const fromDistrict = this.districtManager.getDistrict(route.from);
      const toDistrict = this.districtManager.getDistrict(route.to);

      if (!fromDistrict || !toDistrict) continue;
      if (!fromDistrict.isUnlocked || !toDistrict.isUnlocked) continue;

      // Check if source has resources to trade
      const availableResource = fromDistrict.resources[route.resource];
      if (availableResource < 20) continue; // Minimum to trade

      // Calculate trade amount (with efficiency loss)
      const tradeAmount = Math.min(route.amount, availableResource * 0.5);
      const deliveredAmount = tradeAmount * route.efficiency;

      // Execute trade
      fromDistrict.resources[route.resource] -= tradeAmount;
      toDistrict.resources[route.resource] = Math.min(
        100,
        toDistrict.resources[route.resource] + deliveredAmount * 0.01
      );

      // Log trade
      this.tradingLog.push({
        from: route.from,
        to: route.to,
        resource: route.resource,
        amount: Math.floor(deliveredAmount),
        timestamp: Date.now()
      });
    }

    // Keep log size manageable
    if (this.tradingLog.length > 100) {
      this.tradingLog = this.tradingLog.slice(-100);
    }
  }

  /**
   * Calculate global economy statistics
   * @returns {Object} Global economy summary
   */
  getGlobalStats() {
    const allDistricts = this.districtManager.getAllDistricts();

    let totalTaxRevenue = 0;
    let totalPopulation = 0;
    let totalHappiness = 0;
    let totalTreasury = 0;
    const resourceAverages = {
      food: 0,
      materials: 0,
      energy: 0,
      labor: 0,
      goods: 0
    };

    for (const district of allDistricts) {
      if (!district.isUnlocked) continue;

      totalTaxRevenue += district.taxRevenue;
      totalPopulation += district.population;
      totalHappiness += district.happiness;
      totalTreasury += Math.max(0, district.treasury);

      for (const [resource, level] of Object.entries(district.resources)) {
        resourceAverages[resource] += level;
      }
    }

    const count = allDistricts.filter(d => d.isUnlocked).length;
    const avgHappiness = count > 0 ? Math.floor(totalHappiness / count) : 0;

    // Calculate resource averages
    for (const resource in resourceAverages) {
      resourceAverages[resource] = Math.floor(
        count > 0 ? resourceAverages[resource] / count : 0
      );
    }

    return {
      totalTaxRevenue: Math.floor(totalTaxRevenue),
      totalPopulation: Math.floor(totalPopulation),
      averageHappiness: avgHappiness,
      totalTreasury: Math.floor(totalTreasury),
      resourceAverages,
      unlockedDistricts: count,
      totalDistricts: allDistricts.length
    };
  }

  /**
   * Apply global economic tax (distributed to all districts)
   * @param {number} amount Tax amount from central treasury
   */
  applyGlobalTax(amount) {
    const allDistricts = this.districtManager.getAllDistricts();
    const unlockedCount = allDistricts.filter(d => d.isUnlocked).length;

    if (unlockedCount === 0) return;

    const taxPerDistrict = amount / unlockedCount;

    for (const district of allDistricts) {
      if (!district.isUnlocked) continue;
      district.treasury -= taxPerDistrict;
    }

    this.globalTreasury += amount;
  }

  /**
   * Distribute global funds (from central treasury to districts)
   * Priority-based distribution
   */
  distributeFunds(amount) {
    const allDistricts = this.districtManager.getAllDistricts().sort((a, b) => {
      // Priority: unlocked, low treasury, low happiness
      if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? -1 : 1;
      if (a.treasury !== b.treasury) return a.treasury - b.treasury;
      return a.happiness - b.happiness;
    });

    let remaining = amount;
    for (const district of allDistricts) {
      if (!district.isUnlocked || remaining <= 0) continue;

      const share = Math.min(remaining, 500); // Max 500 per district
      district.treasury += share;
      remaining -= share;
    }

    this.globalTreasury -= (amount - remaining);
  }

  /**
   * Handle deficit in a district (bankruptcy)
   * @param {string} districtId
   * @returns {boolean} Handled successfully
   */
  handleDeficit(districtId) {
    const district = this.districtManager.getDistrict(districtId);
    if (!district || district.treasury >= 0) return false;

    console.log(`[ResourceManager] ${district.name} in deficit: $${Math.floor(district.treasury)}`);

    // Try to borrow from global treasury
    if (this.globalTreasury > -district.treasury) {
      const borrowed = -district.treasury;
      this.globalTreasury -= borrowed;
      district.treasury += borrowed;
      district.happiness -= 10; // Penalty for going into debt
      return true;
    }

    // Otherwise, apply austerity
    district.efficiency = Math.max(0, district.efficiency - 20);
    district.happiness -= 20;
    return false;
  }

  /**
   * Get recent trades log
   * @param {number} count Number of recent trades to return
   * @returns {Array} Recent trades
   */
  getRecentTrades(count = 10) {
    return this.tradingLog.slice(-count).reverse();
  }

  /**
   * Check resource shortage (< 30% in any resource)
   * @param {string} districtId
   * @returns {Array} Resources with low levels
   */
  getResourceShortages(districtId) {
    const district = this.districtManager.getDistrict(districtId);
    if (!district) return [];

    const shortages = [];
    for (const [resource, level] of Object.entries(district.resources)) {
      if (level < 30) {
        shortages.push({
          resource,
          level: Math.floor(level),
          deficit: 30 - Math.floor(level)
        });
      }
    }

    return shortages;
  }

  /**
   * Get all resource shortages across all districts
   * @returns {Object} Shortages by district
   */
  getAllShortages() {
    const shortages = {};

    for (const district of this.districtManager.getAllDistricts()) {
      if (!district.isUnlocked) continue;

      const districtShortages = this.getResourceShortages(district.id);
      if (districtShortages.length > 0) {
        shortages[district.id] = districtShortages;
      }
    }

    return shortages;
  }

  /**
   * Get economy health score (0-100)
   * @returns {number} Overall economy health
   */
  getEconomyHealth() {
    const stats = this.getGlobalStats();

    let health = 100;

    // Reduce for low happiness
    health -= (100 - stats.averageHappiness) * 0.3;

    // Reduce for resource shortages
    const avgResources =
      Object.values(stats.resourceAverages).reduce((a, b) => a + b, 0) /
      Object.keys(stats.resourceAverages).length;
    health -= (100 - avgResources) * 0.2;

    // Reduce for negative treasury
    if (stats.totalTreasury < 0) {
      health -= 20;
    }

    return Math.max(0, Math.floor(health));
  }

  /**
   * Reset economy (for new game)
   */
  reset() {
    this.globalTreasury = 0;
    this.tradeRoutes.clear();
    this.tradingLog = [];
    this.initializeTradeRoutes();
  }
}

/**
 * Factory function to create ResourceManager
 * @param {DistrictManager} districtManager
 * @returns {ResourceManager} New instance
 */
export function createResourceManager(districtManager) {
  return new ResourceManager(districtManager);
}
