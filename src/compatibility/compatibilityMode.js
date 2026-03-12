const DISTRICTS = [
  { id: 'capital-core', name: 'Capital Core', focus: 'Government', treasury: '+12k', stability: 74 },
  { id: 'commercial-center', name: 'Commercial Center', focus: 'Trade', treasury: '+20k', stability: 66 },
  { id: 'industrial-belt', name: 'Industrial Belt', focus: 'Production', treasury: '+16k', stability: 59 },
  { id: 'civic-services', name: 'Civic Services', focus: 'Health & Safety', treasury: '+9k', stability: 81 }
];

export function mountCompatibilityMode({ reason = '3D rendering is unavailable on this device.' } = {}) {
  ensureCompatibilityStyles();

  const canvas = document.getElementById('renderCanvas');
  if (canvas) {
    canvas.style.display = 'none';
  }

  const setupOverlay = document.getElementById('setupOverlay');
  if (setupOverlay) {
    setupOverlay.style.display = 'none';
  }

  const existing = document.getElementById('compatibilityMode');
  if (existing) {
    existing.remove();
  }

  const container = document.createElement('section');
  container.id = 'compatibilityMode';
  container.className = 'compat-mode';
  container.innerHTML = `
    <div class="compat-shell">
      <div class="compat-header">
        <div>
          <h2>Compatibility Command View</h2>
          <p>${reason}</p>
        </div>
        <div class="compat-stats">
          <div><span>Treasury</span><strong>$1,200,000</strong></div>
          <div><span>Approval</span><strong>62%</strong></div>
          <div><span>Legitimacy</span><strong>28</strong></div>
        </div>
      </div>
      <div class="compat-grid" id="compatDistrictGrid"></div>
      <p id="compatSelection" class="compat-selection">Select a district to review strategic data.</p>
    </div>
  `;

  document.body.appendChild(container);

  const grid = container.querySelector('#compatDistrictGrid');
  const selection = container.querySelector('#compatSelection');

  DISTRICTS.forEach((district) => {
    const card = document.createElement('button');
    card.className = 'compat-district';
    card.type = 'button';
    card.innerHTML = `
      <h3>${district.name}</h3>
      <p>${district.focus}</p>
      <div class="compat-row"><span>Income</span><strong>${district.treasury}</strong></div>
      <div class="compat-row"><span>Stability</span><strong>${district.stability}%</strong></div>
    `;

    card.addEventListener('click', () => {
      selection.textContent = `${district.name} selected • ${district.focus} focus • Stability ${district.stability}%.`;
    });

    grid.appendChild(card);
  });
}

function ensureCompatibilityStyles() {
  if (document.getElementById('compatibilityModeStyles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'compatibilityModeStyles';
  style.textContent = `
    .compat-mode {
      position: fixed;
      inset: 0;
      z-index: 11000;
      padding: 18px;
      background: linear-gradient(145deg, #05080d 0%, #08121f 50%, #111827 100%);
      color: #e2e8f0;
      overflow: auto;
    }
    .compat-shell {
      max-width: 980px;
      margin: 0 auto;
      background: rgba(2, 6, 23, .8);
      border: 1px solid rgba(148, 163, 184, .25);
      border-radius: 18px;
      padding: 18px;
    }
    .compat-header { display: flex; justify-content: space-between; gap: 18px; flex-wrap: wrap; }
    .compat-header h2 { margin: 0 0 6px; font-size: 28px; }
    .compat-header p { margin: 0; color: #93c5fd; max-width: 640px; }
    .compat-stats { display: flex; gap: 10px; flex-wrap: wrap; }
    .compat-stats > div {
      min-width: 120px;
      background: rgba(255,255,255,.05);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 10px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .compat-stats span { font-size: 11px; color: #94a3b8; }
    .compat-stats strong { font-size: 15px; }
    .compat-grid {
      margin-top: 18px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 10px;
    }
    .compat-district {
      text-align: left;
      border: 1px solid rgba(125, 211, 252, .25);
      border-radius: 12px;
      padding: 12px;
      background: rgba(12, 74, 110, .16);
      color: #e2e8f0;
      cursor: pointer;
    }
    .compat-district h3 { margin: 0 0 4px; font-size: 17px; }
    .compat-district p { margin: 0 0 8px; color: #a5f3fc; font-size: 12px; }
    .compat-row { display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px; }
    .compat-selection { margin-top: 12px; color: #cbd5e1; }
  `;

  document.head.appendChild(style);
}
