import { CONFIG } from '../config.js';
import { createGameState } from '../state/gameState.js';
import { createFallbackLayout } from './layoutData.js';

const INFO_LAYERS = ['economy', 'politics', 'infrastructure'];

export function mountCompatibilityMode({ reason = '3D mode is unavailable on this device.' } = {}) {
  const state = createGameState();
  state.playerName = 'Commander';
  const layout = createFallbackLayout(state);

  suppress3DSurfaces();
  ensureCompatibilityStyles();

  const previous = document.getElementById('compatibilityMode');
  if (previous) previous.remove();

  const root = document.createElement('section');
  root.id = 'compatibilityMode';
  root.className = 'compat-mode';
  root.innerHTML = `
    <div class="compat-topbar">
      <div class="compat-brand">
        <strong>ASCENT EMPIRE // COMPATIBILITY COMMAND</strong>
        <small>${reason}</small>
      </div>
      <button id="retry3dButton" class="compat-btn">Retry 3D Mode</button>
    </div>

    <div class="compat-hud" id="compatHud"></div>

    <div class="compat-content">
      <div class="compat-map-wrap">
        <canvas id="compatMap" width="920" height="560" aria-label="Top-down strategic city map"></canvas>
      </div>
      <aside class="compat-side">
        <div class="compat-tabs" id="compatTabs"></div>
        <div class="compat-card" id="districtCard"></div>
        <div class="compat-actions" id="districtActions"></div>
      </aside>
    </div>
  `;

  document.body.appendChild(root);

  const canvas = root.querySelector('#compatMap');
  const ctx = canvas.getContext('2d', { alpha: false });
  const hudEl = root.querySelector('#compatHud');
  const tabsEl = root.querySelector('#compatTabs');
  const districtCard = root.querySelector('#districtCard');
  const actionsEl = root.querySelector('#districtActions');
  const retryButton = root.querySelector('#retry3dButton');

  const model = {
    state,
    layout,
    selectedDistrictId: layout.districts[0].id,
    activeLayer: INFO_LAYERS[0]
  };

  retryButton.addEventListener('click', () => window.location.reload());

  tabsEl.innerHTML = INFO_LAYERS
    .map((layer) => `<button class="compat-tab ${layer === model.activeLayer ? 'active' : ''}" data-layer="${layer}">${capitalize(layer)}</button>`)
    .join('');

  tabsEl.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-layer]');
    if (!button) return;
    model.activeLayer = button.dataset.layer;
    for (const tab of tabsEl.querySelectorAll('.compat-tab')) {
      tab.classList.toggle('active', tab.dataset.layer === model.activeLayer);
    }
    renderAll();
  });

  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    const district = layout.districts.find((entry) => pointInRect(x, y, entry.rect));
    if (!district) return;
    model.selectedDistrictId = district.id;
    renderAll();
  });

  actionsEl.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const district = selectedDistrict(model);
    if (!district) return;

    if (button.dataset.action === 'build') {
      applyBuildAction(model.state, district);
    }

    if (button.dataset.action === 'upgrade') {
      applyUpgradeAction(model.state, district);
    }

    renderAll();
  });

  renderAll();

  function renderAll() {
    renderHUD(hudEl, model.state, layout.overlays);
    renderMap(ctx, canvas, model);
    renderDistrictCard(districtCard, model);
    renderActions(actionsEl, model);
  }
}

function suppress3DSurfaces() {
  const canvas = document.getElementById('renderCanvas');
  if (canvas) canvas.style.display = 'none';

  const setupOverlay = document.getElementById('setupOverlay');
  if (setupOverlay) setupOverlay.style.display = 'none';
}

function renderHUD(target, state, overlays) {
  target.innerHTML = `
    <div class="hud-pill"><span>Nation</span><strong>${overlays.nationName}</strong></div>
    <div class="hud-pill"><span>Cash</span><strong>$${Math.round(state.cash).toLocaleString()}</strong></div>
    <div class="hud-pill"><span>Approval</span><strong>${Math.round(state.approval)}%</strong></div>
    <div class="hud-pill"><span>Influence</span><strong>${Math.round(state.influence)}</strong></div>
    <div class="hud-pill"><span>Legitimacy</span><strong>${Math.round(state.legitimacy)}</strong></div>
    <div class="hud-pill"><span>Mode</span><strong>${overlays.coastal ? 'Coastal Strategy' : 'Inland Strategy'}</strong></div>
  `;
}

function renderMap(ctx, canvas, model) {
  if (!ctx) return;

  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawRoadGrid(ctx, canvas, model.layout.roadBands);

  model.layout.districts.forEach((district) => {
    const selected = district.id === model.selectedDistrictId;
    ctx.fillStyle = district.color;
    ctx.globalAlpha = selected ? 0.9 : 0.68;
    ctx.fillRect(district.rect.x, district.rect.y, district.rect.width, district.rect.height);

    ctx.globalAlpha = 1;
    ctx.strokeStyle = selected ? '#22d3ee' : '#334155';
    ctx.lineWidth = selected ? 3 : 1.5;
    ctx.strokeRect(district.rect.x, district.rect.y, district.rect.width, district.rect.height);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 14px Inter, sans-serif';
    ctx.fillText(district.name, district.rect.x + 10, district.rect.y + 24);

    drawDistrictOverlay(ctx, district, model.activeLayer);
  });
}

function drawRoadGrid(ctx, canvas, bands) {
  const mapMin = 40;
  const mapMaxX = canvas.width - 40;
  const mapMaxY = canvas.height - 40;

  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 11;

  bands.forEach((band) => {
    const normalized = (band + 300) / 600;
    const x = mapMin + normalized * (mapMaxX - mapMin);
    const y = mapMin + normalized * (mapMaxY - mapMin);

    ctx.beginPath();
    ctx.moveTo(x, mapMin);
    ctx.lineTo(x, mapMaxY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(mapMin, y);
    ctx.lineTo(mapMaxX, y);
    ctx.stroke();
  });
}

function drawDistrictOverlay(ctx, district, layer) {
  const value = district.resources[layer === 'economy' ? 'growth' : layer === 'politics' ? 'order' : 'infrastructure'];
  ctx.fillStyle = '#f8fafc';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText(`${capitalize(layer)}: ${value}`, district.rect.x + 10, district.rect.y + district.rect.height - 12);
}

function renderDistrictCard(target, model) {
  const district = selectedDistrict(model);
  if (!district) {
    target.innerHTML = '<h3>No district selected</h3>';
    return;
  }

  target.innerHTML = `
    <h3>${district.name}</h3>
    <p>Focus: ${district.focus}</p>
    <ul>
      ${district.buildings.map((building) => `<li>${building}</li>`).join('')}
    </ul>
  `;
}

function renderActions(target, model) {
  const district = selectedDistrict(model);
  if (!district) return;

  const buildCost = CONFIG.economy.housingCost;
  const upgradeCost = CONFIG.economy.schoolCost;

  target.innerHTML = `
    <button data-action="build" class="compat-btn" ${model.state.cash < buildCost ? 'disabled' : ''}>Build Structure ($${buildCost})</button>
    <button data-action="upgrade" class="compat-btn" ${model.state.cash < upgradeCost ? 'disabled' : ''}>Upgrade District ($${upgradeCost})</button>
    <div class="compat-note">Selected: ${district.name}</div>
  `;
}

function applyBuildAction(state, district) {
  const cost = CONFIG.economy.housingCost;
  if (state.cash < cost) return;
  state.cash -= cost;
  state.influence += 1;
  state.approval = Math.min(100, state.approval + 1);
  district.resources.growth = Math.min(100, district.resources.growth + 3);
  district.buildings.push(`🏗️ New Block ${district.buildings.length + 1}`);
}

function applyUpgradeAction(state, district) {
  const cost = CONFIG.economy.schoolCost;
  if (state.cash < cost) return;
  state.cash -= cost;
  state.legitimacy += 1;
  state.approval = Math.min(100, state.approval + 2);
  district.resources.infrastructure = Math.min(100, district.resources.infrastructure + 5);
  district.resources.order = Math.min(100, district.resources.order + 2);
}

function selectedDistrict(model) {
  return model.layout.districts.find((district) => district.id === model.selectedDistrictId);
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function ensureCompatibilityStyles() {
  if (document.getElementById('compatibilityModeStyles')) return;

  const style = document.createElement('style');
  style.id = 'compatibilityModeStyles';
  style.textContent = `
    .compat-mode {
      position: fixed;
      inset: 0;
      z-index: 11000;
      background: radial-gradient(circle at 40% 10%, #0f172a, #020617 70%);
      color: #e2e8f0;
      padding: 14px;
      overflow: auto;
      font-family: Inter, sans-serif;
    }
    .compat-topbar, .compat-hud, .compat-content { max-width: 1260px; margin: 0 auto; }
    .compat-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 14px;
      padding: 12px;
      background: rgba(15, 23, 42, .7);
    }
    .compat-brand strong { letter-spacing: .07em; font-size: 13px; }
    .compat-brand small { display: block; color: #93c5fd; margin-top: 4px; }
    .compat-hud {
      margin-top: 10px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
      gap: 8px;
    }
    .hud-pill {
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 11px;
      padding: 8px;
      background: rgba(148, 163, 184, .08);
      display: flex;
      flex-direction: column;
    }
    .hud-pill span { font-size: 11px; color: #94a3b8; }
    .hud-pill strong { font-size: 16px; }
    .compat-content {
      margin-top: 10px;
      display: grid;
      grid-template-columns: 1.4fr .8fr;
      gap: 10px;
    }
    .compat-map-wrap {
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 14px;
      padding: 8px;
      background: rgba(15, 23, 42, .66);
    }
    #compatMap {
      width: 100%;
      height: auto;
      border-radius: 10px;
      display: block;
    }
    .compat-side {
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 14px;
      padding: 10px;
      background: rgba(15, 23, 42, .66);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .compat-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
    .compat-tab {
      border: 1px solid rgba(255,255,255,.18);
      border-radius: 10px;
      background: #111827;
      color: #e2e8f0;
      padding: 8px 10px;
      cursor: pointer;
      font-weight: 700;
      font-size: 12px;
    }
    .compat-tab.active { background: #0c4a6e; border-color: #22d3ee; color: #a5f3fc; }
    .compat-card {
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 10px;
      padding: 10px;
      min-height: 170px;
      background: rgba(255,255,255,.03);
    }
    .compat-card h3 { margin: 0 0 6px; }
    .compat-card p { margin: 0 0 6px; color: #cbd5e1; }
    .compat-card ul { margin: 0; padding-left: 17px; color: #e2e8f0; }
    .compat-card li { margin-bottom: 4px; font-size: 13px; }
    .compat-actions { display: grid; gap: 8px; }
    .compat-btn {
      border: 1px solid rgba(125, 211, 252, .4);
      border-radius: 10px;
      background: #0f172a;
      color: #e0f2fe;
      padding: 10px;
      font-weight: 700;
      cursor: pointer;
    }
    .compat-btn:disabled { opacity: .5; cursor: not-allowed; }
    .compat-note { font-size: 12px; color: #93c5fd; }
    @media (max-width: 980px) {
      .compat-content { grid-template-columns: 1fr; }
    }
  `;

  document.head.appendChild(style);
}
