import { CONFIG } from '../config.js';

const ROAD_BANDS = [-240, -120, 0, 120, 240];

export function createFallbackLayout(state) {
  const nation = state?.nations?.[state.currentNationIndex] || CONFIG.nations[0];

  return {
    worldSize: CONFIG.world.size,
    roadBands: ROAD_BANDS,
    districts: [
      {
        id: 'government-core',
        name: 'Government Core',
        color: '#334155',
        rect: { x: 330, y: 110, width: 240, height: 150 },
        buildings: ['🏛️ Parliament', '⚖️ High Court', '🏢 Cabinet Office'],
        resources: { order: 72, growth: 48, infrastructure: 66 },
        focus: 'Politics'
      },
      {
        id: 'commercial-center',
        name: 'Commercial Center',
        color: '#14532d',
        rect: { x: 70, y: 100, width: 220, height: 160 },
        buildings: ['🏬 Store Blocks', '🏦 Trade Hub', '📡 Media House'],
        resources: { order: 58, growth: 81, infrastructure: 54 },
        focus: 'Economy'
      },
      {
        id: 'industrial-belt',
        name: 'Industrial Belt',
        color: '#78350f',
        rect: { x: 80, y: 300, width: 250, height: 170 },
        buildings: ['⛏️ Mines', '🏭 Refinery', '🛢️ Storage Yards'],
        resources: { order: 45, growth: 74, infrastructure: 71 },
        focus: 'Infrastructure'
      },
      {
        id: 'civic-services',
        name: 'Civic Services',
        color: '#1e3a8a',
        rect: { x: 360, y: 290, width: 220, height: 180 },
        buildings: ['🏫 School Complex', '🚓 Police Station', '🏟️ Stadium'],
        resources: { order: 82, growth: 50, infrastructure: 63 },
        focus: 'Social'
      }
    ],
    overlays: {
      nationName: nation.name,
      coastal: nation.coastal
    }
  };
}
