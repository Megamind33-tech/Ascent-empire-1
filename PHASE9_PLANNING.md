# PHASE 9: INTERACTIVE DISTRICTS & GAMEPLAY MECHANICS - PLANNING & DESIGN

**Date:** March 12, 2026
**Status:** Planning Phase
**Target Timeline:** 15-20 hours
**Foundation:** Phase 7 + 8 + Visual Quality Fixes (Complete)

---

## EXECUTIVE SUMMARY

Phase 9 transforms Ascent Empire from a **beautiful, static city** into an **interactive, gameplay-driven world** where:

- 🎮 **Districts unlock and evolve** - Gameplay progression tied to districts
- 💰 **Economic simulation** - Supply chains between industrial/residential/civic
- 🏗️ **Player agency** - Build, manage, and develop districts
- 🎯 **Dynamic goals** - District-specific missions and objectives
- ⚡ **Interactive mechanics** - Click buildings, trigger events, manage resources

**Goal:** Create engaging gameplay that builds on the immersive visual foundation from Phases 7-8.

---

## PHASE STRUCTURE (9A → 9B → 9C → 9D)

### Phase 9A: Interactive District System Design
Create clickable districts with unlock/upgrade mechanics.

**Deliverables:**
- District interaction system
- Unlock/upgrade mechanics
- UI for district management
- District state tracking

**Technical Approach:**
- Extend DistrictPlanner with interactive properties
- Create DistrictManager for game state
- Implement click detection on buildings
- Build district UI overlay system

**Estimated Time:** 4-5 hours

---

### Phase 9B: Economic & Supply Chain System
Implement inter-district resource flow and economy.

**Deliverables:**
- Resource system (production, consumption)
- Supply chains between districts
- Economic simulation
- Trade mechanics

**Technical Approach:**
- Create ResourceManager class
- Define supply chain graph
- Implement economy update loop
- Build resource UI displays

**Estimated Time:** 5-6 hours

---

### Phase 9C: Gameplay Events & Dynamic Systems
Add interactive events, disasters, and dynamic mechanics.

**Deliverables:**
- Event system (prosperity, disasters, etc.)
- District-specific gameplay mechanics
- Dynamic difficulty adjustments
- Player feedback systems

**Technical Approach:**
- Create EventManager with event triggers
- Implement disaster simulation
- Build feedback UI (notifications, alerts)
- Add consequence systems

**Estimated Time:** 4-5 hours

---

### Phase 9D: Testing, Integration & Polish
Complete testing with gameplay validation.

**Deliverables:**
- Comprehensive gameplay testing
- Integration testing (all systems together)
- Performance optimization
- Final Polish

**Estimated Time:** 2-3 hours

---

## TECHNICAL ARCHITECTURE

### District Interaction System

```javascript
// Enhanced District with interactive properties
{
  id: 'civic-center',
  name: 'Civic Center',

  // NEW: Interactive properties
  isUnlocked: true,
  upgradeLevel: 1,
  happiness: 75,
  efficiency: 80,

  // NEW: Resources
  population: 1500,
  tax_revenue: 5000,
  maintenance_cost: 2000,

  // NEW: Events
  active_events: ['prosperity', 'construction'],
  crisis_level: 0,

  // NEW: Gameplay
  production: {
    government_services: 100,
    education: 80
  },
  consumption: {
    food: 500,
    materials: 200
  }
}
```

### Resource Flow Example

```
Industrial East (produces)
  → Raw materials (coal, ore, wood)
  → Processed goods (steel, lumber)
       ↓
Residential (consumes)
  → Uses materials for housing
  ↓
Civic Center (provides services)
  → Schools, hospitals, police
       ↓
Everyone benefits
```

### Click Interaction Flow

```
Player clicks building
  → Detect which district
  → Open district panel
  → Show options: View stats, Upgrade, Manage resources
  → Execute chosen action
  → Update UI/economy
```

---

## KEY GAMEPLAY MECHANICS

### 1. District Unlocking
- Districts start locked except Civic Center
- Unlock by reaching resource thresholds
- Progression feels earned, not arbitrary

### 2. Upgrade System
- Each district has 5 upgrade levels
- Upgrades increase efficiency, capacity, happiness
- Cost scales with level
- Rewards scale with investment

### 3. Resource Management
- 5 resource types (Food, Materials, Energy, Labor, Goods)
- Districts produce/consume differently
- Supply chains create interdependencies
- Shortages = reduced efficiency

### 4. Dynamic Events
- **Prosperity:** Population +20%, tax +30%
- **Drought:** Food production -50%
- **Strike:** Labor shortage -40%
- **Epidemic:** Population -10%, morale down
- **Construction Boom:** building potential increases

### 5. Happiness System
- Affects efficiency and tax revenue
- Increased by: services, resources, events
- Decreased by: shortages, disasters, taxes
- Feeds back into resource production

---

## PLAYER PROGRESSION FLOW

### Early Game (Hours 1-3)
1. Civic Center unlocks automatically
2. Generate government services
3. Tax revenue accumulates
4. Learn basic mechanics
5. Unlock first residential district

### Mid Game (Hours 3-8)
1. Residential districts unlock
2. Population grows, tax revenue increases
3. Unlock Industrial district
4. Learn supply chain mechanics
5. First economy crisis requires management

### Late Game (Hours 8+)
1. All districts unlocked
2. Complex economy simulation
3. Random events create challenges
4. Player optimizes for max efficiency
5. End-game goals (100% happiness, etc.)

---

## INTEGRATION WITH EXISTING SYSTEMS

### With CityPlanner
- Buildings are now clickable
- Building metadata includes district info
- Click handlers attached during world creation

### With DistrictLighting/Audio
- Resource state affects lighting (poor = dim)
- Events trigger audio cues
- Happiness affects ambience

### With Physics/Collision
- Building click detection uses raycasting
- No physics changes needed
- Use Babylon.js picking system

### With UI System
- District panels overlay on 3D world
- Resource displays in HUD
- Event notifications in corner

---

## SUCCESS CRITERIA

- ✅ All 6 districts fully interactive
- ✅ Click buildings to open district panel
- ✅ Unlock/upgrade system working
- ✅ Resource economy simulating correctly
- ✅ 5+ event types implemented
- ✅ Happiness system functioning
- ✅ UI responsive and intuitive
- ✅ Zero performance regression
- ✅ 100% test pass rate
- ✅ Gameplay is engaging and fun

---

## ESTIMATED TIMELINE

| Phase | Task | Hours | Status |
|-------|------|-------|--------|
| 9A | Interactive Districts | 4-5 | Pending |
| 9B | Economic System | 5-6 | Pending |
| 9C | Gameplay Events | 4-5 | Pending |
| 9D | Testing & Polish | 2-3 | Pending |
| **Total** | **Phase 9** | **15-20** | **Ready to start** |

---

## RISK MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Gameplay too complex | Medium | Player confusion | Implement tutorial, easy mode |
| Performance issues | Low | Low FPS | Profile early, optimize hot paths |
| Economy imbalance | Medium | Unfun gameplay | Iterate on resource values |
| UI overcrowded | Medium | UX confusion | Test with fresh eyes regularly |
| Breaking existing systems | Low | Regressions | Test all interactions thoroughly |

---

## FILES TO CREATE/MODIFY

### New Implementation Files
1. `src/systems/districtManager.js` - District game state
2. `src/systems/resourceManager.js` - Economy simulation
3. `src/systems/eventManager.js` - Event system
4. `src/systems/interactionHandler.js` - Click detection
5. `src/ui/districtPanel.js` - UI overlay system

### Modified Files
1. `src/world/cityPlanner.js` - Add click handlers
2. `src/world/createNationWorld.js` - Initialize managers
3. `src/ui/hud.js` - Integrate district UI
4. `src/systems/gameLoop.js` - Economy update tick

---

## PHASE 9 DELIVERABLES

### Implementation Files (500+ lines)
- districtManager.js
- resourceManager.js
- eventManager.js
- interactionHandler.js
- districtPanel.js

### Integration Changes
- cityPlanner.js
- createNationWorld.js
- hud.js
- gameLoop.js

### Documentation Files
- PHASE9_TECHNICAL_SPECS.md
- PHASE9_TESTING_VALIDATION.md
- PHASE9_SUMMARY.md

---

## NEXT PHASE HANDOFF (TO PHASE 10)

### What Phase 10 Receives
- Interactive, gameplay-rich city
- Functional economy system
- Event-driven mechanics
- Player progression system

### Phase 10 Scope
- Advanced AI for NPCs
- Multiplayer/competitive mechanics
- Modding system
- End-game content

---

**Planning Status:** ✅ READY FOR DEVELOPMENT
**Next Step:** Begin Phase 9A - Interactive District System

