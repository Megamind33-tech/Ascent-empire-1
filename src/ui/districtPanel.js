/**
 * districtPanel.js — District Management UI Panel
 * ================================================
 * Handles UI display for selected districts including stats and controls.
 */

/**
 * DistrictPanel Class
 * Manages the district info panel UI overlay.
 */
export class DistrictPanel {
  constructor(scene, districtManager, interactionHandler) {
    this.scene = scene;
    this.districtManager = districtManager;
    this.interactionHandler = interactionHandler;
    this.isVisible = false;
    this.selectedDistrictId = null;
    this.panelElement = null;
    this.updateCounter = 0;

    // Create the panel element
    this._createPanel();
  }

  /**
   * Create the HTML panel element
   * @private
   */
  _createPanel() {
    // Create panel div
    const panel = document.createElement('div');
    panel.id = 'district-panel';
    panel.style.cssText = `
      position: fixed;
      right: 20px;
      top: 20px;
      width: 350px;
      background: rgba(20, 20, 30, 0.95);
      border: 2px solid #4a9eff;
      border-radius: 8px;
      padding: 16px;
      font-family: Arial, sans-serif;
      color: #e0e0e0;
      z-index: 1000;
      display: none;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      max-height: 80vh;
      overflow-y: auto;
    `;

    // Create panel content
    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #4a9eff; padding-bottom: 12px;">
        <h2 id="panel-title" style="margin: 0; font-size: 20px; color: #4a9eff;">District</h2>
        <button id="panel-close" style="background: none; border: none; color: #4a9eff; font-size: 24px; cursor: pointer;">✕</button>
      </div>

      <div id="panel-stats" style="margin-bottom: 16px; font-size: 14px; line-height: 1.6;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div><strong>Population:</strong> <span id="stat-population">0</span></div>
          <div><strong>Happiness:</strong> <span id="stat-happiness">0</span>%</div>
          <div><strong>Efficiency:</strong> <span id="stat-efficiency">0</span>%</div>
          <div><strong>Treasury:</strong> $<span id="stat-treasury">0</span></div>
          <div><strong>Tax Revenue:</strong> $<span id="stat-tax">0</span></div>
          <div><strong>Morale:</strong> <span id="stat-morale">0</span>%</div>
        </div>
      </div>

      <div id="panel-resources" style="margin-bottom: 16px;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #4a9eff; text-transform: uppercase;">Resources</h3>
        <div id="resource-bars" style="display: flex; flex-direction: column; gap: 8px;">
          <!-- Resource bars will be populated here -->
        </div>
      </div>

      <div id="panel-events" style="margin-bottom: 16px;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #4a9eff; text-transform: uppercase;">Active Events</h3>
        <div id="events-list" style="background: rgba(0, 0, 0, 0.3); padding: 8px; border-radius: 4px; min-height: 30px; font-size: 12px;">
          <span style="color: #888;">No active events</span>
        </div>
      </div>

      <div id="panel-unlock" style="margin-bottom: 16px; padding: 12px; background: rgba(74, 158, 255, 0.1); border-radius: 4px; display: none;">
        <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #4a9eff;">Unlock Progress</h3>
        <div style="background: rgba(0, 0, 0, 0.3); height: 20px; border-radius: 4px; overflow: hidden;">
          <div id="unlock-bar" style="height: 100%; background: linear-gradient(90deg, #4a9eff, #2ecc71); width: 0%;"></div>
        </div>
        <div id="unlock-text" style="font-size: 11px; color: #aaa; margin-top: 4px;"></div>
      </div>

      <div id="panel-actions" style="display: flex; gap: 8px;">
        <button id="panel-upgrade" style="flex: 1; padding: 10px; background: #2ecc71; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Upgrade</button>
      </div>
    `;

    document.body.appendChild(panel);
    this.panelElement = panel;

    // Set up event listeners
    document.getElementById('panel-close').addEventListener('click', () => this.hide());
    document.getElementById('panel-upgrade').addEventListener('click', () => this._handleUpgrade());
  }

  /**
   * Show the panel for a selected district
   * @param {string} districtId
   */
  show(districtId) {
    this.selectedDistrictId = districtId;
    this.isVisible = true;
    this.panelElement.style.display = 'block';
    this.update(0);
  }

  /**
   * Hide the panel
   */
  hide() {
    this.selectedDistrictId = null;
    this.isVisible = false;
    this.panelElement.style.display = 'none';
  }

  /**
   * Update the panel display
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    if (!this.isVisible || !this.selectedDistrictId) return;

    // Update every 30 frames to reduce DOM manipulation
    this.updateCounter++;
    if (this.updateCounter % 30 !== 0) return;

    const district = this.districtManager.getDistrict(this.selectedDistrictId);
    if (!district) {
      this.hide();
      return;
    }

    // Update title
    document.getElementById('panel-title').textContent = district.name;

    // Update stats
    document.getElementById('stat-population').textContent = Math.floor(district.population);
    document.getElementById('stat-happiness').textContent = Math.floor(district.happiness);
    document.getElementById('stat-efficiency').textContent = Math.floor(district.efficiency);
    document.getElementById('stat-treasury').textContent = Math.floor(district.treasury);
    document.getElementById('stat-tax').textContent = Math.floor(district.taxRevenue);
    document.getElementById('stat-morale').textContent = Math.floor(district.morale);

    // Update resource bars
    this._updateResourceBars(district);

    // Update active events
    this._updateEvents(district);

    // Update unlock info if not unlocked
    if (!district.isUnlocked) {
      this._updateUnlockProgress(district);
    }

    // Update upgrade button
    this._updateUpgradeButton(district);
  }

  /**
   * Update resource bars display
   * @private
   */
  _updateResourceBars(district) {
    const resourcesDiv = document.getElementById('resource-bars');
    resourcesDiv.innerHTML = '';

    const resources = district.resources;
    const resourceNames = Object.keys(resources);

    for (const name of resourceNames) {
      const level = resources[name];
      const barHtml = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 60px; font-size: 12px; text-transform: capitalize;">${name}</span>
          <div style="flex: 1; background: rgba(0, 0, 0, 0.3); height: 16px; border-radius: 3px; overflow: hidden;">
            <div style="height: 100%; background: ${this._getResourceColor(name)}; width: ${level}%; transition: width 0.2s;"></div>
          </div>
          <span style="width: 30px; font-size: 12px; text-align: right;">${Math.floor(level)}%</span>
        </div>
      `;
      resourcesDiv.innerHTML += barHtml;
    }
  }

  /**
   * Get color for a resource bar
   * @private
   */
  _getResourceColor(resourceName) {
    const colors = {
      food: '#8FBC8F',
      materials: '#D2B48C',
      energy: '#FFD700',
      labor: '#87CEEB',
      goods: '#DDA0DD'
    };
    return colors[resourceName] || '#4a9eff';
  }

  /**
   * Update events display
   * @private
   */
  _updateEvents(district) {
    const eventsList = document.getElementById('events-list');

    if (!district.activeEvents || district.activeEvents.length === 0) {
      eventsList.innerHTML = '<span style="color: #888;">No active events</span>';
      return;
    }

    let html = '';
    for (const eventType of district.activeEvents) {
      html += `<div style="margin: 4px 0; padding: 4px; background: rgba(255, 100, 100, 0.2); border-left: 3px solid #ff6464; border-radius: 2px;">📌 ${eventType}</div>`;
    }
    eventsList.innerHTML = html;
  }

  /**
   * Update unlock progress display
   * @private
   */
  _updateUnlockProgress(district) {
    const unlockDiv = document.getElementById('panel-unlock');
    unlockDiv.style.display = 'block';

    const bar = document.getElementById('unlock-bar');
    bar.style.width = `${Math.min(100, district.unlockProgress)}%`;

    const text = document.getElementById('unlock-text');
    if (district.unlockRequirements) {
      text.textContent = `Progress: ${Math.floor(district.unlockProgress)}% - ${Object.entries(district.unlockRequirements).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
    }
  }

  /**
   * Update upgrade button state
   * @private
   */
  _updateUpgradeButton(district) {
    const upgradeBtn = document.getElementById('panel-upgrade');

    if (!district.isUnlocked) {
      upgradeBtn.disabled = true;
      upgradeBtn.style.background = '#555';
      upgradeBtn.textContent = 'Unlock District First';
      return;
    }

    const cost = this.districtManager._getUpgradeCost(district);
    if (district.treasury >= cost && district.upgradeLevel < 5) {
      upgradeBtn.disabled = false;
      upgradeBtn.style.background = '#2ecc71';
      upgradeBtn.textContent = `Upgrade (Lvl ${district.upgradeLevel}) - $${Math.floor(cost)}`;
    } else if (district.upgradeLevel >= 5) {
      upgradeBtn.disabled = true;
      upgradeBtn.style.background = '#555';
      upgradeBtn.textContent = 'Max Level Reached';
    } else {
      upgradeBtn.disabled = true;
      upgradeBtn.style.background = '#555';
      upgradeBtn.textContent = `Need $${Math.floor(cost - district.treasury)} more`;
    }
  }

  /**
   * Handle upgrade button click
   * @private
   */
  _handleUpgrade() {
    if (this.selectedDistrictId) {
      this.interactionHandler.handleUpgrade();
      this.update(0);
    }
  }

  /**
   * Destroy the panel
   */
  destroy() {
    if (this.panelElement && this.panelElement.parentNode) {
      this.panelElement.parentNode.removeChild(this.panelElement);
    }
    this.panelElement = null;
  }
}

/**
 * Factory function to create DistrictPanel
 * @param {Scene} scene Babylon.js scene
 * @param {DistrictManager} districtManager
 * @param {InteractionHandler} interactionHandler
 * @returns {DistrictPanel} New instance
 */
export function createDistrictPanel(scene, districtManager, interactionHandler) {
  return new DistrictPanel(scene, districtManager, interactionHandler);
}
