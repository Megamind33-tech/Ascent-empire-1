export const CONFIG = {
  world: { size: 1800, fogStart: 300, fogEnd: 950, waterLevel: 4, roadHalfWidth: 12, buildPadSize: 20 },
  mobile: { hardwareScalingMin: 1, hardwareScalingMax: 1.7, shadowMapSize: 1024, maxDynamicCars: 18, maxAgents: 24, skylineDensity: 0.64 },
  economy: { housingCost: 1400, schoolCost: 2200, storeCost: 2000, policeCost: 2500, accCost: 3400, decCost: 3200, researchCost: 1800, campaignCost: 2600, mineCost: 4200, refineryCost: 5200, barracksCost: 4500, baseCost: 7800, stadiumCost: 6800 },
  politics: { 
    offices: ['Nobody','Councilor','Mayor','MP','Vice President','President'], 
    passportThreshold: 18, 
    diplomaticPassportThreshold: 72 
  },
  careerStandards: [
    { title: 'Councilor', reqLegitimacy: 10, reqInfluence: 5,  campaignCost: 2000, unlockMessage: "You can now run for Local Council. Secure your starting seat." },
    { title: 'Mayor',     reqLegitimacy: 25, reqInfluence: 15, campaignCost: 8000, unlockMessage: "Ambition calls. The city needs a Mayor. Ready to lead?" },
    { title: 'MP',        reqLegitimacy: 45, reqInfluence: 35, campaignCost: 25000, unlockMessage: "National Parliament awaits. Become a Voice of the people." },
    { title: 'Vice Pres', reqLegitimacy: 70, reqInfluence: 65, campaignCost: 60000, unlockMessage: "The shadow of power. One step from the top." },
    { title: 'President', reqLegitimacy: 90, reqInfluence: 120, campaignCost: 150000, unlockMessage: "The ultimate goal. Take the highest office by force of will." }
  ],
  laws: [
    { id: 'SECURITY_ACT', title: 'Public Security Act', desc: 'Increases police presence but reduces individual liberties.', effects: { security: 15, legitimacy: -8, corruption: -5 }, cost: 5000, duration: 240 },
    { id: 'SOCIAL_GRANTS', title: 'Universal Social Grants', desc: 'Financial support for the poor. Massive approval boost.', effects: { approval: 20, cashDelta: -50, education: 5 }, cost: 12000 },
    { id: 'TRADE_LIBERAL', title: 'Market Liberalization', desc: 'Reduces taxes to attract corporations. Boosts cash flow.', effects: { cashDelta: 80, approval: -5, influence: 5 }, cost: 8000 },
    { id: 'ENVIRONMENT_TAX', title: 'Carbon Tax Initiative', desc: 'Taxes heavy industry. Increases legitimacy globally.', effects: { legitimacy: 15, steel: -4, cashDelta: 30 }, cost: 6000 },
    { id: 'MARTIAL_LAW', title: 'Emergency Martial Law', desc: 'Absolute security control. Extreme suppression.', effects: { security: 30, approval: -25, legitimacy: -20, corruption: 10 }, cost: 20000, duration: 120 }
  ],
  nations: [
    { name:'Zambria', coastal:false, seed:11, tone:[0.44,0.47,0.43] },
    { name:'Kitala', coastal:true, seed:19, tone:[0.41,0.45,0.49] },
    { name:'Nembia', coastal:false, seed:27, tone:[0.45,0.43,0.40] },
    { name:'Karumo', coastal:true, seed:35, tone:[0.42,0.46,0.45] },
    { name:'Tazeko', coastal:true, seed:43, tone:[0.39,0.44,0.47] },
    { name:'Belvar', coastal:false, seed:51, tone:[0.46,0.45,0.41] },
    { name:'Sundoro', coastal:true, seed:59, tone:[0.43,0.47,0.44] },
    { name:'Marenga', coastal:false, seed:67, tone:[0.47,0.44,0.40] },
    { name:'Orun', coastal:true, seed:75, tone:[0.40,0.46,0.48] },
    { name:'Velis', coastal:false, seed:83, tone:[0.45,0.46,0.43] }
  ]
};