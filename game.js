// ═══ CONSTANTS & DEFINITIONS ═══

const TICK_MS = 250;
const DT = TICK_MS / 1000;
const SAVE_KEY = 'bi-dashboard-v2';
const SETTINGS_KEY = 'bi-dashboard-settings';
const SPARKLINE_MAX = 60;
const SPARKLINE_INTERVAL_TICKS = 15;
const AUTOSAVE_TICKS = 120;
const MAX_OFFLINE_HOURS = 4;

const PRODUCERS = [
  // Tier 1 — produce Data Points/s
  { id: 0, tier: 1, name: 'Excel Analyst',  emoji: '📊', desc: 'Junior analyst manually crunching spreadsheets.',
    baseCost: 10,     costMult: 1.13, baseProduction: 0.1,  produces: 'dataPoints' },
  { id: 1, tier: 1, name: 'SQL Developer',  emoji: '🗄️', desc: 'Writes queries against transactional databases.',
    baseCost: 100,    costMult: 1.13, baseProduction: 0.5,  produces: 'dataPoints' },
  { id: 2, tier: 1, name: 'ETL Pipeline',   emoji: '⚙️', desc: 'Automated nightly data extraction and loading.',
    baseCost: 1100,   costMult: 1.13, baseProduction: 4,    produces: 'dataPoints' },
  { id: 3, tier: 1, name: 'Data Catalog',   emoji: '📁', desc: 'Classifies and indexes all data assets centrally.',
    baseCost: 12000,  costMult: 1.13, baseProduction: 20,   produces: 'dataPoints' },
  // Tier 2 — consume Data Points, produce Insights/s
  { id: 4, tier: 2, name: 'Power BI Dashboard', emoji: '📈', desc: 'Self-service analytics for business users.',
    baseCost: 8000,   costMult: 1.13, baseProduction: 0.2,  produces: 'insights',   consumeRate: 1,  consumeResource: 'dataPoints' },
  { id: 5, tier: 2, name: 'Data Warehouse',     emoji: '🏛️', desc: 'Centralised analytical store (Kimball schema).',
    baseCost: 75000,  costMult: 1.13, baseProduction: 1.5,  produces: 'insights',   consumeRate: 5,  consumeResource: 'dataPoints' },
  { id: 6, tier: 2, name: 'Data Lake',           emoji: '🌊', desc: 'Schema-on-read blob storage at petabyte scale.',
    baseCost: 500000, costMult: 1.13, baseProduction: 8,    produces: 'insights',   consumeRate: 20, consumeResource: 'dataPoints' },
  // Tier 3 — consume Insights, produce Revenue/s
  { id: 7, tier: 3, name: 'ML Model',              emoji: '🤖', desc: 'Predictive analytics packaged and sold.',
    baseCost: 200,    costMult: 1.13, baseProduction: 0.05, produces: 'revenue',    consumeRate: 0.5,consumeResource: 'insights', costResource: 'insights' },
  { id: 8, tier: 3, name: 'RT Analytics Engine',   emoji: '⚡', desc: 'Streaming pipeline — millions of events/s.',
    baseCost: 2000,   costMult: 1.13, baseProduction: 0.4,  produces: 'revenue',    consumeRate: 3,  consumeResource: 'insights', costResource: 'insights' },
  { id: 9, tier: 3, name: 'AI Insights Platform',  emoji: '✨', desc: 'GenAI co-pilot for C-suite recommendations.',
    baseCost: 20000,  costMult: 1.13, baseProduction: 3,    produces: 'revenue',    consumeRate: 15, consumeResource: 'insights', costResource: 'insights' },
  { id: 10, tier: 3, name: 'Strategic Advisory Firm', emoji: '🏢', desc: 'Top-tier consultancy generating enterprise value.',
    baseCost: 50000,  costMult: 1.13, baseProduction: 15,   produces: 'revenue',    consumeRate: 60, consumeResource: 'insights', costResource: 'insights', hidden: true },
];

const UPGRADES = [
  { id: 0,  name: 'Pivot Tables',          desc: 'Excel Analysts 2× production.',
    unlock: { type: 'owned', producerId: 0, count: 1 },
    cost: { resource: 'dataPoints', amount: 50 },     effect: { type: 'producerMultiplier', producerId: 0, multiplier: 2 } },
  { id: 1,  name: 'VLOOKUP Mastery',       desc: 'Excel Analysts 2× production.',
    unlock: { type: 'owned', producerId: 0, count: 5 },
    cost: { resource: 'dataPoints', amount: 200 },    effect: { type: 'producerMultiplier', producerId: 0, multiplier: 2 } },
  { id: 2,  name: 'Power Query',           desc: 'Excel Analysts 2× production.',
    unlock: { type: 'owned', producerId: 0, count: 25 },
    cost: { resource: 'dataPoints', amount: 5000 },   effect: { type: 'producerMultiplier', producerId: 0, multiplier: 2 } },
  { id: 3,  name: 'Query Optimization',    desc: 'SQL Developers 2× production.',
    unlock: { type: 'owned', producerId: 1, count: 1 },
    cost: { resource: 'dataPoints', amount: 500 },    effect: { type: 'producerMultiplier', producerId: 1, multiplier: 2 } },
  { id: 4,  name: 'Stored Procedures',     desc: 'SQL Developers 2× production.',
    unlock: { type: 'owned', producerId: 1, count: 5 },
    cost: { resource: 'dataPoints', amount: 2500 },   effect: { type: 'producerMultiplier', producerId: 1, multiplier: 2 } },
  { id: 5,  name: 'Incremental Load',      desc: 'ETL Pipelines 2× production.',
    unlock: { type: 'owned', producerId: 2, count: 1 },
    cost: { resource: 'dataPoints', amount: 5000 },   effect: { type: 'producerMultiplier', producerId: 2, multiplier: 2 } },
  { id: 6,  name: 'CDC Streaming',         desc: 'ETL Pipelines 2× production.',
    unlock: { type: 'owned', producerId: 2, count: 5 },
    cost: { resource: 'dataPoints', amount: 30000 },  effect: { type: 'producerMultiplier', producerId: 2, multiplier: 2 } },
  { id: 7,  name: 'Data Governance',       desc: 'All Tier 1 producers 1.5× production.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 500 },
    cost: { resource: 'dataPoints', amount: 1000 },   effect: { type: 'allTierMultiplier', tier: 1, multiplier: 1.5 } },
  { id: 8,  name: 'Cloud Migration',       desc: 'All Tier 1 producers 2× production.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 10000 },
    cost: { resource: 'dataPoints', amount: 8000 },   effect: { type: 'allTierMultiplier', tier: 1, multiplier: 2 } },
  { id: 9,  name: 'Star Schema Design',    desc: 'Power BI Dashboards 2× production.',
    unlock: { type: 'owned', producerId: 4, count: 1 },
    cost: { resource: 'dataPoints', amount: 6000 },   effect: { type: 'producerMultiplier', producerId: 4, multiplier: 2 } },
  { id: 10, name: 'Row-Level Security',    desc: 'Power BI Dashboards 2× production.',
    unlock: { type: 'owned', producerId: 4, count: 5 },
    cost: { resource: 'dataPoints', amount: 40000 },  effect: { type: 'producerMultiplier', producerId: 4, multiplier: 2 } },
  { id: 11, name: 'Columnar Storage',      desc: 'Data Warehouses 2× production.',
    unlock: { type: 'owned', producerId: 5, count: 1 },
    cost: { resource: 'dataPoints', amount: 60000 },  effect: { type: 'producerMultiplier', producerId: 5, multiplier: 2 } },
  { id: 12, name: 'Partitioning Strategy', desc: 'Data Warehouses 2× production.',
    unlock: { type: 'owned', producerId: 5, count: 5 },
    cost: { resource: 'dataPoints', amount: 400000 }, effect: { type: 'producerMultiplier', producerId: 5, multiplier: 2 } },
  { id: 13, name: 'Delta Lake Format',     desc: 'Data Lakes 2× production.',
    unlock: { type: 'owned', producerId: 6, count: 1 },
    cost: { resource: 'dataPoints', amount: 400000 }, effect: { type: 'producerMultiplier', producerId: 6, multiplier: 2 } },
  { id: 14, name: 'Feature Engineering',   desc: 'ML Models 2× production.',
    unlock: { type: 'owned', producerId: 7, count: 1 },
    cost: { resource: 'insights', amount: 150 },      effect: { type: 'producerMultiplier', producerId: 7, multiplier: 2 } },
  { id: 15, name: 'AutoML Pipeline',       desc: 'ML Models 2× + click power 2×.',
    unlock: { type: 'owned', producerId: 7, count: 5 },
    cost: { resource: 'insights', amount: 1500 },     effect: { type: 'combo', effects: [
      { type: 'producerMultiplier', producerId: 7, multiplier: 2 },
      { type: 'clickMultiplier', multiplier: 2 },
    ]} },
  { id: 16, name: 'Foundation Model',      desc: 'All producers 3× production.',
    unlock: { type: 'lifetimeEarned', resource: 'revenue', amount: 1000 },
    cost: { resource: 'revenue', amount: 5000 },      effect: { type: 'allMultiplier', multiplier: 3 } },
  { id: 17, name: 'Touch Typing',          desc: 'Click power 2×.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 10 },
    cost: { resource: 'dataPoints', amount: 75 },     effect: { type: 'clickMultiplier', multiplier: 2 } },
  { id: 18, name: 'Keyboard Shortcuts',    desc: 'Click power 2×.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 500 },
    cost: { resource: 'dataPoints', amount: 1500 },   effect: { type: 'clickMultiplier', multiplier: 2 } },
  { id: 19, name: 'Macro Recorder',        desc: 'Click power 3×.',
    unlock: { type: 'owned', producerId: 1, count: 5 },
    cost: { resource: 'dataPoints', amount: 12000 },  effect: { type: 'clickMultiplier', multiplier: 3 } },
  { id: 20, name: 'RPA Bot',               desc: 'Click power 5×.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 50000 },
    cost: { resource: 'dataPoints', amount: 40000 },  effect: { type: 'clickMultiplier', multiplier: 5 } },
  { id: 21, name: 'One-Click Reports',     desc: 'Click power 4×.',
    unlock: { type: 'owned', producerId: 4, count: 5 },
    cost: { resource: 'dataPoints', amount: 80000 },  effect: { type: 'clickMultiplier', multiplier: 4 } },
];

const UPGRADE_GROUPS = [
  { id: 'grp-t1',    label: 'Tier 1',  tag: 'T1',    css: 'tag-tier1', ids: [0,1,2,3,4,5,6,7,8] },
  { id: 'grp-t2',    label: 'Tier 2',  tag: 'T2',    css: 'tag-tier2', ids: [9,10,11,12,13] },
  { id: 'grp-t3',    label: 'Tier 3',  tag: 'T3',    css: 'tag-tier3', ids: [14,15,16] },
  { id: 'grp-click', label: 'Click',   tag: 'Click', css: 'tag-click', ids: [17,18,19,20,21] },
];

const TERRITORIES = [
  { id: 'na', name: 'North America', emoji: '🌎', need: 5,   rate: 0.1, color: '#4a9eff',
    d: 'M30,14 L88,10 L108,28 L102,52 L88,72 L72,92 L56,98 L38,80 L22,56 L26,32 Z' },
  { id: 'sa', name: 'South America', emoji: '🌎', need: 15,  rate: 0.3, color: '#56b6c2',
    d: 'M80,90 L120,86 L123,100 L118,120 L108,148 L90,155 L76,144 L74,120 L78,96 Z' },
  { id: 'eu', name: 'Europe',        emoji: '🌍', need: 30,  rate: 0.8, color: '#c678dd',
    d: 'M136,38 L152,20 L172,24 L182,34 L178,52 L164,62 L145,62 L132,50 Z' },
  { id: 'af', name: 'Africa',        emoji: '🌍', need: 50,  rate: 1.5, color: '#e5c07b',
    d: 'M138,55 L180,50 L192,68 L188,98 L178,128 L160,150 L144,150 L128,132 L125,102 L130,72 Z' },
  { id: 'as', name: 'Asia',          emoji: '🌏', need: 75,  rate: 3.0, color: '#e06c75',
    d: 'M155,15 L230,8 L270,18 L278,30 L274,56 L258,74 L228,84 L192,80 L165,66 L148,45 L152,22 Z' },
  { id: 'oc', name: 'Oceania',       emoji: '🌏', need: 100, rate: 6.0, color: '#3fb950',
    d: 'M247,93 L270,90 L278,108 L276,135 L260,148 L244,145 L234,128 L238,108 Z' },
];

const WORLD_UPGRADES = [
  { id: 0, name: 'Regional Office',        cost: 5,    desc: 'All producers 1.5×'  },
  { id: 1, name: 'Data Embassy',           cost: 20,   desc: 'Click power 3×'       },
  { id: 2, name: 'International Pipeline', cost: 50,   desc: 'All Tier 1 2×'        },
  { id: 3, name: 'Cross-Border Analytics', cost: 120,  desc: 'All Tier 2 2×'        },
  { id: 4, name: 'Global Data Standard',   cost: 300,  desc: 'All producers 2×'     },
  { id: 5, name: 'World Domination',       cost: 1000, desc: 'All producers 5×'     },
];

const QUESTS = [
  { id: 0, name: 'Startup Mode',   restriction: 'Max 5 producers total',
    goalResource: 'lifetimeDP',       goalAmount: 2000,  reward: 'All T1 +100% base',   rewardType: 't1bonus' },
  { id: 1, name: 'Analyst Only',   restriction: 'Only Excel Analysts produce',
    goalResource: 'lifetimeDP',       goalAmount: 10000, reward: 'Click power ×3',       rewardType: 'clickx3' },
  { id: 2, name: 'No Shortcuts',   restriction: 'ETL Pipelines & Catalogs disabled',
    goalResource: 'lifetimeDP',       goalAmount: 50000, reward: 'All T1 ×2',            rewardType: 't1x2'    },
  { id: 3, name: 'Insights Rush',  restriction: 'No T1 upgrades apply',
    goalResource: 'lifetimeInsights', goalAmount: 500,   reward: 'All T2 ×2',            rewardType: 't2x2'    },
  { id: 4, name: 'Revenue Sprint', restriction: 'Max 3 of each T3 producer',
    goalResource: 'lifetimeRevenue',  goalAmount: 100,   reward: 'All producers ×1.5',   rewardType: 'allx15'  },
];

// 0-indexed (id 0 = node 1 displayed as "1")
const TREE_NODES_DEF = [
  { id: 0, name: 'Silver Certification', cost: 5,   desc: 'All producers 1.5×',             parent: null },
  { id: 1, name: 'Click Mastery',        cost: 15,  desc: 'Click power ×5',                 parent: 0    },
  { id: 2, name: 'Platinum Partner',     cost: 30,  desc: 'Unlock Strategic Advisory Firm', parent: 0    },
  { id: 3, name: 'Automation Expert',    cost: 60,  desc: 'All T1 producers ×3',            parent: 1    },
  { id: 4, name: 'Enterprise License',   cost: 80,  desc: 'All producers ×2',               parent: 2    },
  { id: 5, name: 'AI Automation',        cost: 150, desc: 'All producers ×2 + click ×2',    parent: 4    },
  { id: 6, name: 'Global Expansion',     cost: 120, desc: 'Contracts rate ×3',              parent: 4    },
  { id: 7, name: 'Market Leader',        cost: 300, desc: 'All T3 producers ×5',            parent: 6    },
  { id: 8, name: 'Data Empire',          cost: 800, desc: 'All producers ×10',              parent: 7    },
];

// SVG node positions — viewBox "0 0 180 390"
const NODE_POS = [
  { cx: 90,  cy: 28  }, // 0 → node 1 (root)
  { cx: 45,  cy: 95  }, // 1 → node 2
  { cx: 135, cy: 95  }, // 2 → node 3
  { cx: 45,  cy: 162 }, // 3 → node 4
  { cx: 135, cy: 162 }, // 4 → node 5
  { cx: 88,  cy: 229 }, // 5 → node 6
  { cx: 138, cy: 229 }, // 6 → node 7
  { cx: 138, cy: 296 }, // 7 → node 8
  { cx: 138, cy: 363 }, // 8 → node 9
];

// ═══ SETTINGS ═══

let settings = {
  numberFormat: 'general',
  theme: 'dark',
  accent: 'blue',
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) settings = { ...settings, ...JSON.parse(raw) };
  } catch (e) {}
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function applyTheme() {
  document.body.classList.remove('theme-light', 'theme-dark');
  document.body.classList.add(settings.theme === 'light' ? 'theme-light' : 'theme-dark');
  document.body.classList.remove('accent-blue', 'accent-purple', 'accent-teal', 'accent-orange', 'accent-pink');
  document.body.classList.add(`accent-${settings.accent}`);
}

// ═══ GAME STATE ═══

function defaultState() {
  return {
    dataPoints: 0,
    insights: 0,
    revenue: 0,
    reputationPoints: 0,
    prestigeCount: 0,
    lifetimeDP: 0,
    lifetimeInsights: 0,
    lifetimeRevenue: 0,
    contracts: 0,
    lifetimeContracts: 0,
    owned: new Array(PRODUCERS.length).fill(0),
    upgrades: new Array(UPGRADES.length).fill(false),
    upgradeVisible: new Array(UPGRADES.length).fill(false),
    worldUpgrades: new Array(WORLD_UPGRADES.length).fill(false),
    questsCompleted: new Array(QUESTS.length).fill(false),
    treeNodes: new Array(TREE_NODES_DEF.length).fill(false),
    inChallenge: false,
    challengeId: -1,
    goalMet: false,
    lastSaveTime: Date.now(),
    tickCount: 0,
  };
}

let state = defaultState();
let sparklineData = [];
let activityLog = [];
let starvationFlags = new Array(PRODUCERS.length).fill(false);
let totalClicks = 0;
let totalClickDP = 0;
let sessionStart = Date.now();
let challengeSnapshot = null;

// Panel unlock tracking
const panelsUnlocked = new Set(['t1', 'click']);

// ═══ SAVE / LOAD ═══

function saveGame() {
  const saveObj = {
    ...state,
    owned: [...state.owned],
    upgrades: [...state.upgrades],
    upgradeVisible: [...state.upgradeVisible],
    worldUpgrades: [...state.worldUpgrades],
    questsCompleted: [...state.questsCompleted],
    treeNodes: [...state.treeNodes],
    lastSaveTime: Date.now(),
    // Never save challenge snapshot
    inChallenge: false,
    challengeId: -1,
    goalMet: false,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(saveObj));
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    state = { ...defaultState(), ...saved };
    state.owned = padArray(state.owned, PRODUCERS.length, 0);
    state.upgrades = padArray(state.upgrades, UPGRADES.length, false);
    state.upgradeVisible = padArray(state.upgradeVisible, UPGRADES.length, false);
    state.worldUpgrades = padArray(state.worldUpgrades, WORLD_UPGRADES.length, false);
    state.questsCompleted = padArray(state.questsCompleted, QUESTS.length, false);
    state.treeNodes = padArray(state.treeNodes, TREE_NODES_DEF.length, false);

    // Re-populate panel unlocks from loaded state
    if (state.lifetimeDP >= 5000 || (state.worldUpgrades && state.worldUpgrades.some(Boolean)))
      panelsUnlocked.add('wm');
    if (state.lifetimeInsights >= 50) panelsUnlocked.add('t2');
    if (state.lifetimeContracts > 0)  panelsUnlocked.add('quests');
    if (calcRPGain() >= 5)            panelsUnlocked.add('prestige');

    const offlineSec = Math.min((Date.now() - (saved.lastSaveTime || Date.now())) / 1000, MAX_OFFLINE_HOURS * 3600);
    if (offlineSec > 10) {
      const dpEarned = calcTotalProduction('dataPoints') * offlineSec;
      state.dataPoints += dpEarned;
      state.lifetimeDP += dpEarned;
      const contractsEarned = calcContractsRate() * offlineSec;
      state.contracts += contractsEarned;
      state.lifetimeContracts += contractsEarned;
      if (dpEarned > 0) {
        addLog(`Welcome back! Generated ${fmt(dpEarned)} DP while away.`, 'info');
        showToast(`+${fmt(dpEarned)} Data Points (offline)`, 'info');
      }
    }
  } catch (e) {
    console.warn('Save load failed', e);
  }
}

function padArray(arr, len, fill) {
  const out = arr ? [...arr] : [];
  while (out.length < len) out.push(fill);
  return out.slice(0, len);
}

// ═══ MATH & PRODUCTION ═══

function producerCost(p) {
  return p.baseCost * Math.pow(p.costMult, state.owned[p.id]);
}

function applyQuestRestriction(p) {
  if (!state.inChallenge) return 1;
  const id = state.challengeId;
  if (id === 1) return p.id === 0 ? 1 : 0; // Analyst Only
  if (id === 2) return (p.id === 2 || p.id === 3) ? 0 : 1; // No Shortcuts
  return 1;
}

function producerEffectiveRate(p) {
  if (state.owned[p.id] === 0) return 0;
  if (applyQuestRestriction(p) === 0) return 0;

  let mult = 1;

  // Tree node effects
  if (state.treeNodes[0]) mult *= 1.5;                             // Silver Cert: all ×1.5
  if (state.treeNodes[3] && p.tier === 1) mult *= 3;              // Automation Expert: T1 ×3
  if (state.treeNodes[4]) mult *= 2;                              // Enterprise License: all ×2
  if (state.treeNodes[5]) mult *= 2;                              // AI Automation: all ×2
  if (state.treeNodes[7] && p.tier === 3) mult *= 5;             // Market Leader: T3 ×5
  if (state.treeNodes[8]) mult *= 10;                             // Data Empire: all ×10

  // World upgrade effects
  if (state.worldUpgrades[0]) mult *= 1.5;                        // Regional Office: all ×1.5
  if (state.worldUpgrades[2] && p.tier === 1) mult *= 2;         // Int'l Pipeline: T1 ×2
  if (state.worldUpgrades[3] && p.tier === 2) mult *= 2;         // Cross-Border: T2 ×2
  if (state.worldUpgrades[4]) mult *= 2;                         // Global Standard: all ×2
  if (state.worldUpgrades[5]) mult *= 5;                         // World Domination: all ×5

  // Quest reward effects (permanent)
  if (state.questsCompleted[0] && p.tier === 1) mult *= 2;       // Startup Mode reward: T1 ×2
  if (state.questsCompleted[2] && p.tier === 1) mult *= 2;       // No Shortcuts reward: T1 ×2
  if (state.questsCompleted[3] && p.tier === 2) mult *= 2;       // Insights Rush reward: T2 ×2
  if (state.questsCompleted[4]) mult *= 1.5;                     // Revenue Sprint reward: all ×1.5

  // Quest 4 restriction: no T1 upgrades apply
  const skipT1Upgrades = state.inChallenge && state.challengeId === 3;

  // Per-producer upgrade multipliers
  for (let i = 0; i < UPGRADES.length; i++) {
    if (!state.upgrades[i]) continue;
    const u = UPGRADES[i];
    if (skipT1Upgrades) {
      const grp = UPGRADE_GROUPS.find(g => g.ids.includes(i));
      if (grp && grp.id === 'grp-t1') continue;
    }
    applyEffectToProducer(u.effect, p.id, (m) => { mult *= m; });
  }

  return p.baseProduction * state.owned[p.id] * mult;
}

function applyEffectToProducer(effect, producerId, cb) {
  if (!effect) return;
  if (effect.type === 'producerMultiplier' && effect.producerId === producerId) {
    cb(effect.multiplier);
  } else if (effect.type === 'allTierMultiplier') {
    const p = PRODUCERS[producerId];
    if (p && p.tier === effect.tier) cb(effect.multiplier);
  } else if (effect.type === 'allMultiplier') {
    cb(effect.multiplier);
  } else if (effect.type === 'combo') {
    for (const e of effect.effects) applyEffectToProducer(e, producerId, cb);
  }
}

function calcTotalProduction(resource) {
  let total = 0;
  for (const p of PRODUCERS) {
    if (p.produces !== resource) continue;
    if (p.hidden && !state.treeNodes[2]) continue;
    total += producerEffectiveRate(p);
  }
  return total;
}

function clickPower() {
  let power = 1;
  if (state.treeNodes[1]) power *= 5;            // Click Mastery ×5
  if (state.treeNodes[5]) power *= 2;            // AI Automation click ×2
  if (state.worldUpgrades[1]) power *= 3;        // Data Embassy ×3
  if (state.questsCompleted[1]) power *= 3;      // Analyst Only reward ×3
  for (let i = 0; i < UPGRADES.length; i++) {
    if (!state.upgrades[i]) continue;
    gatherClickMultiplier(UPGRADES[i].effect, (m) => { power *= m; });
  }
  return power;
}

function gatherClickMultiplier(effect, cb) {
  if (!effect) return;
  if (effect.type === 'clickMultiplier') cb(effect.multiplier);
  if (effect.type === 'combo') for (const e of effect.effects) gatherClickMultiplier(e, cb);
}

function calcRPGain() {
  return Math.floor(Math.pow(state.lifetimeRevenue / 1000, 0.6) * 7);
}

function calcContractsRate() {
  const totalOwned = state.owned.reduce((s, n) => s + n, 0);
  let rate = TERRITORIES
    .filter(t => totalOwned >= t.need)
    .reduce((s, t) => s + t.rate, 0);
  if (state.treeNodes[6]) rate *= 3; // Global Expansion: contracts ×3
  return rate;
}

function getConqueredSet() {
  const totalOwned = state.owned.reduce((s, n) => s + n, 0);
  return new Set(TERRITORIES.filter(t => totalOwned >= t.need).map(t => t.id));
}

// ═══ TICK ═══

function tick() {
  state.tickCount++;

  // Tier 1: produce Data Points
  for (const p of PRODUCERS) {
    if (p.tier !== 1) continue;
    if (state.owned[p.id] === 0) continue;
    const produced = producerEffectiveRate(p) * DT;
    state.dataPoints += produced;
    state.lifetimeDP += produced;
  }

  // Tier 2: consume DP, produce Insights
  const insightProducers = PRODUCERS.filter(p => p.tier === 2 && state.owned[p.id] > 0);
  let totalInsightDemand = insightProducers.reduce((s, p) => s + p.consumeRate * state.owned[p.id] * DT, 0);
  const insightRatio = totalInsightDemand > 0 ? Math.min(1, state.dataPoints / totalInsightDemand) : 1;
  for (const p of insightProducers) {
    const consume = p.consumeRate * state.owned[p.id] * DT * insightRatio;
    const produce = producerEffectiveRate(p) * DT * insightRatio;
    state.dataPoints -= consume;
    state.insights += produce;
    state.lifetimeInsights += produce;
    starvationFlags[p.id] = insightRatio < 0.99;
  }

  // Tier 3: consume Insights, produce Revenue
  const revProducers = PRODUCERS.filter(p =>
    p.tier === 3 && state.owned[p.id] > 0 && (!p.hidden || state.treeNodes[2]));
  let totalRevDemand = revProducers.reduce((s, p) => s + p.consumeRate * state.owned[p.id] * DT, 0);
  const revRatio = totalRevDemand > 0 ? Math.min(1, state.insights / totalRevDemand) : 1;
  for (const p of revProducers) {
    const consume = p.consumeRate * state.owned[p.id] * DT * revRatio;
    const produce = producerEffectiveRate(p) * DT * revRatio;
    state.insights -= consume;
    state.revenue += produce;
    state.lifetimeRevenue += produce;
    starvationFlags[p.id] = revRatio < 0.99;
  }

  // Contracts
  const contractsEarned = calcContractsRate() * DT;
  state.contracts += contractsEarned;
  state.lifetimeContracts += contractsEarned;

  // Clamp negatives
  state.dataPoints = Math.max(0, state.dataPoints);
  state.insights   = Math.max(0, state.insights);

  checkUpgradeUnlocks();
  checkMilestones();
  checkPanelUnlocks();

  if (state.inChallenge) checkQuestGoal();

  if (state.tickCount % SPARKLINE_INTERVAL_TICKS === 0) {
    sparklineData.push(state.dataPoints);
    if (sparklineData.length > SPARKLINE_MAX) sparklineData.shift();
    drawSparkline();
  }

  if (state.tickCount % AUTOSAVE_TICKS === 0) saveGame();

  // Render
  renderKPI();
  renderT1Panel();
  renderT2Panel();
  renderClickPanel();
  renderWorldMap();
  renderWorldUpgradesPanel();
  renderQuestsPanel();
  renderPrestigeTree();
}

// ═══ CLICK HANDLER ═══

function handleClick(e) {
  const power = clickPower();
  state.dataPoints += power;
  state.lifetimeDP += power;
  totalClicks++;
  totalClickDP += power;

  const el = document.getElementById('click-target');
  el.classList.remove('bounce');
  void el.offsetWidth;
  el.classList.add('bounce');

  const rect = el.getBoundingClientRect();
  const fx = Math.random() * (rect.width * 0.6) + rect.width * 0.2;
  const fy = Math.random() * (rect.height * 0.4) + rect.height * 0.2;
  const span = document.createElement('span');
  span.className = 'float-up';
  span.textContent = `+${fmt(power)}`;
  span.style.left = fx + 'px';
  span.style.top = fy + 'px';
  el.appendChild(span);
  setTimeout(() => span.remove(), 900);

  renderKPI();
}

// ═══ BUY PRODUCER ═══

function buyProducer(id) {
  const p = PRODUCERS[id];
  const cost = producerCost(p);
  const resource = p.costResource || 'dataPoints';
  if (state[resource] < cost) return;

  // Quest restrictions
  if (state.inChallenge) {
    const totalOwned = state.owned.reduce((s, n) => s + n, 0);
    if (state.challengeId === 0 && totalOwned >= 5) {
      showToast('Quest restriction: Max 5 producers!', 'info'); return;
    }
    if (state.challengeId === 4 && p.tier === 3 && state.owned[id] >= 3) {
      showToast('Quest restriction: Max 3 of each T3 producer!', 'info'); return;
    }
  }

  state[resource] -= cost;
  state.owned[id]++;
  addLog(`Hired: ${p.name} (now ${state.owned[id]}) — ${fmt(cost)} ${resourceLabel(resource)}`, 'buy');
  checkUpgradeUnlocks();
}

// ═══ BUY UPGRADE ═══

function buyUpgrade(id) {
  const u = UPGRADES[id];
  if (state.upgrades[id]) return;
  const resource = u.cost.resource;
  if (state[resource] < u.cost.amount) return;
  state[resource] -= u.cost.amount;
  state.upgrades[id] = true;
  addLog(`Researched: ${u.name}`, 'buy');
  showToast(`Unlocked: ${u.name}`, 'mile');
}

// ═══ BUY WORLD UPGRADE ═══

function buyWorldUpgrade(id) {
  const u = WORLD_UPGRADES[id];
  if (state.worldUpgrades[id]) return;
  if (state.contracts < u.cost) return;
  state.contracts -= u.cost;
  state.worldUpgrades[id] = true;
  addLog(`World Upgrade: ${u.name}`, 'buy');
  showToast(`World Upgrade: ${u.name}`, 'mile');
  // Rebuild panel if advisory firm is now unlocked
  if (id === 6) buildT2Panel();
}

// ═══ BUY TREE NODE ═══

function buyTreeNode(id) {
  const node = TREE_NODES_DEF[id];
  if (state.treeNodes[id]) return;
  if (node.parent !== null && !state.treeNodes[node.parent]) return;
  if (state.reputationPoints < node.cost) return;
  state.reputationPoints -= node.cost;
  state.treeNodes[id] = true;
  addLog(`Skill unlocked: ${node.name}`, 'pres');
  showToast(`Permanent: ${node.name}`, 'pres');
  // Node 2: Platinum Partner — rebuild T2 panel to show Strategic Advisory Firm
  if (id === 2) buildT2Panel();
  closeNodePopup();
  renderPrestigeTree();
  renderKPI();
}

// ═══ PRESTIGE ═══

function doPrestige() {
  const rp = calcRPGain();
  if (rp < 5) return;
  state.reputationPoints += rp;
  addLog(`Fiscal Year Reset! Gained ${rp} Reputation Points.`, 'pres');
  showToast(`Year closed. +${rp} RP earned.`, 'pres');
  state.prestigeCount++;

  state.dataPoints = 0;
  state.insights = 0;
  state.revenue = 0;
  state.contracts = 0;
  state.lifetimeDP = 0;
  state.lifetimeInsights = 0;
  state.lifetimeRevenue = 0;
  state.lifetimeContracts = 0;
  state.owned = new Array(PRODUCERS.length).fill(0);
  state.upgrades = new Array(UPGRADES.length).fill(false);
  state.upgradeVisible = new Array(UPGRADES.length).fill(false);
  state.worldUpgrades = new Array(WORLD_UPGRADES.length).fill(false);
  state.inChallenge = false;
  state.challengeId = -1;
  state.goalMet = false;
  challengeSnapshot = null;
  sparklineData = [];
  milestonesFired.clear();

  // Re-lock panels except t1, click, prestige
  panelsUnlocked.clear();
  panelsUnlocked.add('t1');
  panelsUnlocked.add('click');
  panelsUnlocked.add('prestige'); // keep prestige unlocked post-reset

  saveGame();
  buildDashboard();
}

// ═══ QUEST SYSTEM ═══

function enterChallenge(id) {
  if (state.inChallenge) return;
  if (state.questsCompleted[id]) return;
  if (id > 0 && !state.questsCompleted[id - 1]) return;

  challengeSnapshot = JSON.parse(JSON.stringify(state));

  // Soft-reset: keep RP, prestige, tree, world, quests
  const keepRP       = state.reputationPoints;
  const keepPrestige = state.prestigeCount;
  const keepTree     = [...state.treeNodes];
  const keepWorld    = [...state.worldUpgrades];
  const keepQuests   = [...state.questsCompleted];

  state = defaultState();
  state.reputationPoints = keepRP;
  state.prestigeCount    = keepPrestige;
  state.treeNodes        = keepTree;
  state.worldUpgrades    = keepWorld;
  state.questsCompleted  = keepQuests;
  state.inChallenge      = true;
  state.challengeId      = id;
  state.goalMet          = false;

  sparklineData = [];
  starvationFlags = new Array(PRODUCERS.length).fill(false);

  addLog(`Quest entered: ${QUESTS[id].name}`, 'mile');
  showToast(`Challenge started: ${QUESTS[id].name}`, 'mile');
  renderQuestsPanel();
}

function exitChallenge() {
  if (!state.inChallenge || !challengeSnapshot) return;
  const id = state.challengeId;
  state = JSON.parse(JSON.stringify(challengeSnapshot));
  challengeSnapshot = null;
  sparklineData = [];
  starvationFlags = new Array(PRODUCERS.length).fill(false);
  addLog(`Quest exited: ${QUESTS[id].name} (no reward)`, 'info');
  showToast('Challenge exited. No reward.', 'info');
  renderQuestsPanel();
  renderKPI();
}

function claimQuest() {
  if (!state.inChallenge || !state.goalMet || !challengeSnapshot) return;
  const id = state.challengeId;
  state = JSON.parse(JSON.stringify(challengeSnapshot));
  challengeSnapshot = null;
  state.questsCompleted[id] = true;
  state.inChallenge = false;
  state.challengeId = -1;
  state.goalMet = false;
  sparklineData = [];
  starvationFlags = new Array(PRODUCERS.length).fill(false);
  addLog(`Quest complete: ${QUESTS[id].name}! Reward: ${QUESTS[id].reward}`, 'mile');
  showToast(`Quest ${id + 1} complete! ${QUESTS[id].reward}`, 'mile');
  renderQuestsPanel();
  renderKPI();
}

function checkQuestGoal() {
  if (!state.inChallenge || state.goalMet) return;
  const q = QUESTS[state.challengeId];
  const current = state[q.goalResource] || 0;
  if (current >= q.goalAmount) {
    state.goalMet = true;
    showToast('Goal reached! Click Claim to collect your reward.', 'mile');
  }
}

// ═══ PANEL UNLOCK SYSTEM ═══

function checkPanelUnlocks() {
  const checks = [
    { key: 'wm',      test: () => state.lifetimeDP >= 5000 },
    { key: 't2',      test: () => state.lifetimeInsights >= 50 },
    { key: 'quests',  test: () => state.lifetimeContracts > 0 },
    { key: 'prestige',test: () => calcRPGain() >= 5 },
  ];
  for (const c of checks) {
    if (panelsUnlocked.has(c.key)) continue;
    if (c.test()) {
      panelsUnlocked.add(c.key);
      unlockPanelsByKey(c.key);
    }
  }
}

function unlockPanelsByKey(key) {
  const map = {
    wm:      [{ id: 'panel-wm-upgrades', fn: buildWorldUpgradesPanel },
               { id: 'panel-wm-map',     fn: buildWorldMapPanel }],
    t2:      [{ id: 'panel-t2',          fn: buildT2Panel }],
    quests:  [{ id: 'panel-quests',      fn: buildQuestsPanel }],
    prestige:[{ id: 'panel-prestige',    fn: buildPrestigeTreePanel }],
  };
  for (const entry of (map[key] || [])) {
    const el = document.getElementById(entry.id);
    if (!el) continue;
    el.innerHTML = '';
    el.classList.add('unlocking');
    entry.fn();
    setTimeout(() => el.classList.remove('unlocking'), 500);
  }
}

// ═══ UPGRADE UNLOCK CHECKS ═══

function checkUpgradeUnlocks() {
  for (let i = 0; i < UPGRADES.length; i++) {
    if (state.upgradeVisible[i]) continue;
    const u = UPGRADES[i];
    const c = u.unlock;
    let unlocked = false;
    if (c.type === 'owned') {
      unlocked = state.owned[c.producerId] >= c.count;
    } else if (c.type === 'lifetimeEarned') {
      const map = { dataPoints: state.lifetimeDP, insights: state.lifetimeInsights, revenue: state.lifetimeRevenue };
      unlocked = (map[c.resource] || 0) >= c.amount;
    }
    if (unlocked) state.upgradeVisible[i] = true;
  }
}

// ═══ MILESTONES ═══

const MILESTONES = [
  { id: 'm0', check: () => state.lifetimeDP >= 1000,      msg: 'Your practice is growing. 1K Data Points processed.', type: 'mile' },
  { id: 'm1', check: () => state.lifetimeDP >= 10000,     msg: '10K Data Points — clients are taking notice.', type: 'mile' },
  { id: 'm2', check: () => state.owned[4] >= 1,           msg: 'First Power BI Dashboard deployed! Insights unlocked.', type: 'mile' },
  { id: 'm3', check: () => state.lifetimeInsights >= 100, msg: '100 Insights generated — the board is impressed.', type: 'mile' },
  { id: 'm4', check: () => state.owned[7] >= 1,           msg: 'First ML Model in production! Revenue stream opened.', type: 'mile' },
  { id: 'm5', check: () => state.lifetimeRevenue >= 50,   msg: 'Revenue incoming! The business case is validated.', type: 'mile' },
  { id: 'm6', check: () => calcRPGain() >= 5,             msg: 'Ready for a Fiscal Year Reset. Check the Prestige panel.', type: 'mile' },
  { id: 'm7', check: () => state.prestigeCount >= 1,      msg: 'Year closed. Your reputation precedes you.', type: 'pres' },
  { id: 'm8', check: () => getConqueredSet().size >= 1,   msg: 'First territory conquered! Contracts flowing in.', type: 'mile' },
  { id: 'm9', check: () => getConqueredSet().size >= 6,   msg: 'World domination complete! All territories conquered.', type: 'mile' },
];

const milestonesFired = new Set();

function checkMilestones() {
  for (const m of MILESTONES) {
    if (milestonesFired.has(m.id)) continue;
    if (m.check()) {
      milestonesFired.add(m.id);
      addLog(m.msg, m.type);
      showToast(m.msg, m.type);
    }
  }
}

// ═══ NUMBER FORMATTING ═══

function fmt(n) {
  if (!isFinite(n) || isNaN(n)) return '0';
  if (n < 0) return '-' + fmt(-n);
  switch (settings.numberFormat) {
    case 'scientific':  return fmtScientific(n);
    case 'engineering': return fmtEngineering(n);
    case 'letters':     return fmtLetters(n);
    case 'full':        return fmtFull(n);
    default:            return fmtGeneral(n);
  }
}

function fmtGeneral(n) {
  if (n >= 1e18) return (n / 1e18).toFixed(2) + 'Qi';
  if (n >= 1e15) return (n / 1e15).toFixed(2) + 'Qa';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(2)  + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(2)  + 'M';
  if (n >= 1e3)  return (n / 1e3).toFixed(2)  + 'K';
  return Math.floor(n).toString();
}

function fmtScientific(n) {
  if (n < 1000) return Math.floor(n).toString();
  return n.toExponential(2).replace('e+', 'e');
}

function fmtEngineering(n) {
  if (n < 1000) return Math.floor(n).toString();
  const exp = Math.floor(Math.log10(Math.abs(n)));
  const engExp = Math.floor(exp / 3) * 3;
  return (n / Math.pow(10, engExp)).toFixed(2) + 'e' + engExp;
}

function fmtLetters(n) {
  const s = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  let val = n, idx = 0;
  while (val >= 1000 && idx < s.length - 1) { val /= 1000; idx++; }
  return idx === 0 ? Math.floor(n).toString() : val.toFixed(2) + s[idx];
}

function fmtFull(n) {
  if (n >= 1e15) return fmtScientific(n);
  return Math.floor(n).toLocaleString();
}

function fmtDec(n) {
  if (n >= 1000) return fmt(n);
  if (n >= 100) return n.toFixed(1);
  return n.toFixed(2);
}

function resourceLabel(r) {
  return { dataPoints: 'DP', insights: 'Insights', revenue: 'Revenue', contracts: 'Contracts' }[r] || r;
}

// ═══ SPARKLINE ═══

function drawSparkline() {
  const canvas = document.getElementById('sparkline');
  if (!canvas || sparklineData.length < 2) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const minV = Math.min(...sparklineData), maxV = Math.max(...sparklineData);
  const range = maxV - minV || 1;
  const pts = sparklineData.map((v, i) => ({
    x: (i / (sparklineData.length - 1)) * W,
    y: H - ((v - minV) / range) * (H - 6) - 3,
  }));
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(63,185,80,0.35)');
  grad.addColorStop(1, 'rgba(63,185,80,0)');
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.strokeStyle = '#3fb950'; ctx.lineWidth = 1.5; ctx.stroke();
}

function resizeSparkline() {
  const canvas = document.getElementById('sparkline');
  if (!canvas) return;
  canvas.width = canvas.offsetWidth || 300;
  drawSparkline();
}

// ═══ ACTIVITY LOG ═══

let gameStartTime = Date.now();

function addLog(msg, type = 'info') {
  const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
  const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  activityLog.unshift({ msg, type, ts: `${h}:${m}:${s}` });
  if (activityLog.length > 50) activityLog.pop();
  renderActivityLog();
}

function renderActivityLog() {
  const el = document.getElementById('activity-log');
  if (!el) return;
  el.innerHTML = '';
  for (const entry of activityLog) {
    const div = document.createElement('div');
    div.className = `log-entry log-${entry.type}`;
    div.innerHTML = `<span class="ts">[${entry.ts}]</span> ${entry.msg}`;
    el.appendChild(div);
  }
}

// ═══ TOAST ═══

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ═══ KPI RENDER ═══

let prevDPRate = 0;

function renderKPI() {
  const dpRate = calcTotalProduction('dataPoints');

  setText('kpi-dp-value', fmt(state.dataPoints));
  setText('kpi-dp-rate', `${fmtDec(dpRate)} DP/s`);

  const delta = dpRate - prevDPRate;
  const deltaEl = document.getElementById('kpi-dp-delta');
  if (deltaEl && Math.abs(delta) > 0.001) {
    deltaEl.className = delta > 0 ? 'delta-up' : 'delta-down';
    deltaEl.textContent = (delta > 0 ? '▲' : '▼') + ' ' + fmtDec(Math.abs(delta)) + '/s';
  } else if (deltaEl) deltaEl.textContent = '';
  prevDPRate = dpRate;

  setText('kpi-ins-value', fmt(state.insights));
  setText('kpi-rev-value', fmt(state.revenue));
  setText('kpi-rp-value', `${state.reputationPoints} RP`);
  setText('kpi-rp-sub', `${state.prestigeCount} reset${state.prestigeCount !== 1 ? 's' : ''}`);

  // Contracts card — show when WM unlocked
  const contractCard = document.getElementById('kpi-contracts-card');
  if (contractCard) {
    if (panelsUnlocked.has('wm')) contractCard.style.display = '';
    setText('kpi-contracts-value', fmt(state.contracts));
    setText('kpi-contracts-rate', `${fmtDec(calcContractsRate())}/s`);
  }

  // Click area
  setText('click-value', fmt(state.dataPoints));
  setText('click-rate', `${fmtDec(dpRate)} DP/s · Click: +${fmt(clickPower())}`);
}

// ═══ BUILD: TOP-LEVEL ═══

function buildKPIBar() {
  const bar = document.getElementById('kpi-bar');
  bar.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">Data Points</div>
      <div class="kpi-value blue" id="kpi-dp-value">0</div>
      <div class="kpi-sub"><span id="kpi-dp-rate">0 DP/s</span> <span id="kpi-dp-delta"></span></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Insights</div>
      <div class="kpi-value teal" id="kpi-ins-value">0</div>
      <div class="kpi-sub">Processed analytics</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Revenue</div>
      <div class="kpi-value" id="kpi-rev-value">0</div>
      <div class="kpi-sub">Enterprise value</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Reputation</div>
      <div class="kpi-value gold" id="kpi-rp-value">0 RP</div>
      <div class="kpi-sub" id="kpi-rp-sub">0 resets</div>
    </div>
    <div class="kpi-card" id="kpi-contracts-card" style="display:none">
      <div class="kpi-label">Contracts</div>
      <div class="kpi-value amber" id="kpi-contracts-value">0</div>
      <div class="kpi-sub" id="kpi-contracts-rate">0/s</div>
    </div>
  `;
}

function buildDashboard() {
  const dash = document.getElementById('dashboard');
  dash.innerHTML = '';

  const panels = [
    { id: 'panel-t1',          style: 'grid-column:1/3;grid-row:1',  unlock: 't1',      fn: buildT1Panel,          hint: '' },
    { id: 'panel-click',       style: 'grid-column:3;grid-row:1',    unlock: 'click',   fn: buildClickPanel,       hint: '' },
    { id: 'panel-quests',      style: 'grid-column:4;grid-row:1',    unlock: 'quests',  fn: buildQuestsPanel,      hint: 'Earn your first Contract' },
    { id: 'panel-prestige',    style: 'grid-column:5;grid-row:1/3',  unlock: 'prestige',fn: buildPrestigeTreePanel,hint: 'Need ~5 RP from Revenue' },
    { id: 'panel-wm-upgrades', style: 'grid-column:1;grid-row:2',    unlock: 'wm',      fn: buildWorldUpgradesPanel,hint: 'Reach 5,000 lifetime DP' },
    { id: 'panel-wm-map',      style: 'grid-column:2/4;grid-row:2',  unlock: 'wm',      fn: buildWorldMapPanel,    hint: 'Reach 5,000 lifetime DP' },
    { id: 'panel-t2',          style: 'grid-column:4;grid-row:2',    unlock: 't2',      fn: buildT2Panel,          hint: 'Earn 50 lifetime Insights' },
  ];

  for (const p of panels) {
    const el = document.createElement('div');
    el.className = 'dash-panel';
    el.id = p.id;
    el.style.cssText = p.style;
    dash.appendChild(el);
    if (panelsUnlocked.has(p.unlock)) {
      p.fn();
    } else {
      buildLockedPlaceholder(el, p.hint);
    }
  }
}

function buildLockedPlaceholder(el, hint) {
  el.innerHTML = `
    <div class="locked-placeholder">
      <div class="locked-icon">🔒</div>
      <div class="locked-hint">${hint}</div>
    </div>
  `;
}

// ═══ BUILD: T1 PANEL ═══

function buildT1Panel() {
  const el = document.getElementById('panel-t1');
  if (!el) return;

  const t1Producers = PRODUCERS.filter(p => p.tier === 1);
  const t1UpgradeGroups = UPGRADE_GROUPS.filter(g => g.id === 'grp-t1');
  const clickUpgradeGroups = UPGRADE_GROUPS.filter(g => g.id === 'grp-click');

  el.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">T1 Producers</span>
      <span class="panel-badge blue">Data Points</span>
    </div>
    <div class="panel-body" id="t1-body">
      <div id="t1-prod-list"></div>
      <div class="section-divider" id="t1-upg-header" style="display:none">T1 Upgrades</div>
      <div id="t1-upg-list"></div>
      <div class="section-divider" id="click-upg-header" style="display:none">Click Upgrades</div>
      <div id="click-upg-list"></div>
    </div>
  `;

  // Producer rows
  const prodList = document.getElementById('t1-prod-list');
  for (const p of t1Producers) {
    const row = makeProducerRow(p);
    prodList.appendChild(row);
  }

  // Upgrade pills
  buildUpgradePillsInto('t1-upg-list', t1UpgradeGroups);
  buildUpgradePillsInto('click-upg-list', clickUpgradeGroups);
}

function renderT1Panel() {
  if (!document.getElementById('t1-prod-list')) return;
  const t1 = PRODUCERS.filter(p => p.tier === 1);
  for (const p of t1) updateProducerRow(p);
  updateUpgradePills('t1-upg-list', UPGRADE_GROUPS.find(g => g.id === 'grp-t1'));
  updateUpgradePills('click-upg-list', UPGRADE_GROUPS.find(g => g.id === 'grp-click'));
  // Show upgrade headers if any are visible
  const t1UpgVisible = UPGRADE_GROUPS.find(g => g.id === 'grp-t1').ids.some(i => state.upgradeVisible[i]);
  const clkUpgVisible = UPGRADE_GROUPS.find(g => g.id === 'grp-click').ids.some(i => state.upgradeVisible[i]);
  const t1Hdr = document.getElementById('t1-upg-header');
  const clkHdr = document.getElementById('click-upg-header');
  if (t1Hdr) t1Hdr.style.display = t1UpgVisible ? '' : 'none';
  if (clkHdr) clkHdr.style.display = clkUpgVisible ? '' : 'none';
}

// ═══ BUILD: T2 PANEL ═══

function buildT2Panel() {
  const el = document.getElementById('panel-t2');
  if (!el) return;

  el.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">T2 / T3 Producers</span>
      <span class="panel-badge teal">Insights & Revenue</span>
    </div>
    <div class="panel-body" id="t2-body">
      <div class="section-divider">Tier 2 — Analytics</div>
      <div id="t2-prod-list"></div>
      <div class="section-divider">Tier 3 — Revenue</div>
      <div id="t3-prod-list"></div>
      <div class="section-divider" id="t2-upg-header" style="display:none">T2 Upgrades</div>
      <div id="t2-upg-list"></div>
      <div class="section-divider" id="t3-upg-header" style="display:none">T3 Upgrades</div>
      <div id="t3-upg-list"></div>
    </div>
  `;

  const t2List = document.getElementById('t2-prod-list');
  const t3List = document.getElementById('t3-prod-list');

  for (const p of PRODUCERS.filter(q => q.tier === 2)) {
    t2List.appendChild(makeProducerRow(p));
  }
  for (const p of PRODUCERS.filter(q => q.tier === 3 && (!q.hidden || state.treeNodes[2]))) {
    t3List.appendChild(makeProducerRow(p));
  }

  buildUpgradePillsInto('t2-upg-list', UPGRADE_GROUPS.filter(g => g.id === 'grp-t2'));
  buildUpgradePillsInto('t3-upg-list', UPGRADE_GROUPS.filter(g => g.id === 'grp-t3'));
}

function renderT2Panel() {
  if (!document.getElementById('t2-prod-list')) return;
  const t23 = PRODUCERS.filter(p => (p.tier === 2 || p.tier === 3) && (!p.hidden || state.treeNodes[2]));
  for (const p of t23) updateProducerRow(p);
  updateUpgradePills('t2-upg-list', UPGRADE_GROUPS.find(g => g.id === 'grp-t2'));
  updateUpgradePills('t3-upg-list', UPGRADE_GROUPS.find(g => g.id === 'grp-t3'));
  const t2V = UPGRADE_GROUPS.find(g => g.id === 'grp-t2').ids.some(i => state.upgradeVisible[i]);
  const t3V = UPGRADE_GROUPS.find(g => g.id === 'grp-t3').ids.some(i => state.upgradeVisible[i]);
  const h2 = document.getElementById('t2-upg-header'), h3 = document.getElementById('t3-upg-header');
  if (h2) h2.style.display = t2V ? '' : 'none';
  if (h3) h3.style.display = t3V ? '' : 'none';
}

// ═══ PRODUCER ROW HELPERS ═══

function makeProducerRow(p) {
  const resource = p.costResource || 'dataPoints';
  const cost = producerCost(p);
  const canAfford = state[resource] >= cost;

  const row = document.createElement('div');
  row.className = `prod-row${canAfford ? '' : ' unaffordable'}`;
  row.id = `prod-row-${p.id}`;
  row.innerHTML = `
    <div class="prod-emoji">${p.emoji}</div>
    <div class="prod-info">
      <div class="prod-name">
        ${p.name}
        <span class="starvation-badge" id="starv-${p.id}" style="display:none">Starved</span>
      </div>
      <div class="prod-subline" id="prod-sub-${p.id}">${fmtDec(p.baseProduction)} ${resourceLabel(p.produces)}/s base</div>
    </div>
    <div class="prod-right">
      <span class="owned-badge" id="prod-badge-${p.id}">${state.owned[p.id]}</span>
      <span class="prod-cost ${canAfford ? 'affordable' : 'cant-afford'}" id="prod-cost-${p.id}">${fmt(cost)} ${resourceLabel(resource)}</span>
    </div>
  `;
  row.addEventListener('click', () => buyProducer(p.id));
  return row;
}

function updateProducerRow(p) {
  const row = document.getElementById(`prod-row-${p.id}`);
  if (!row) return;

  const resource = p.costResource || 'dataPoints';
  const cost = producerCost(p);
  const canAfford = state[resource] >= cost;

  row.classList.toggle('unaffordable', !canAfford);

  const costEl = document.getElementById(`prod-cost-${p.id}`);
  if (costEl) {
    costEl.textContent = `${fmt(cost)} ${resourceLabel(resource)}`;
    costEl.className = `prod-cost ${canAfford ? 'affordable' : 'cant-afford'}`;
  }

  const badge = document.getElementById(`prod-badge-${p.id}`);
  if (badge) badge.textContent = state.owned[p.id];

  const starv = document.getElementById(`starv-${p.id}`);
  if (starv) starv.style.display = starvationFlags[p.id] ? 'inline-block' : 'none';

  const sub = document.getElementById(`prod-sub-${p.id}`);
  if (sub && state.owned[p.id] > 0) {
    const totalRate = producerEffectiveRate(p);
    const perUnit = totalRate / state.owned[p.id];
    const typeTotal = calcTotalProduction(p.produces);
    const pct = typeTotal > 0 ? (totalRate / typeTotal * 100) : 0;
    sub.textContent = `${fmtDec(perUnit)}/s ea · ${fmtDec(totalRate)}/s total · ${pct.toFixed(0)}%`;
  }
}

// ═══ UPGRADE PILL HELPERS ═══

function buildUpgradePillsInto(containerId, groups) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  for (const grp of groups) {
    for (const i of grp.ids) {
      const u = UPGRADES[i];
      const purchased = state.upgrades[i];
      const resource = u.cost.resource;
      const canAfford = !purchased && state[resource] >= u.cost.amount;

      const pill = document.createElement('div');
      pill.className = `upg-pill${purchased ? ' purchased' : (!canAfford ? ' unaffordable' : '')}`;
      pill.id = `upg-pill-${i}`;
      pill.style.display = state.upgradeVisible[i] ? '' : 'none';
      pill.innerHTML = `
        <div class="upg-pill-info">
          <div class="upg-pill-name">
            <span class="upg-tag ${grp.css}">${grp.tag}</span>
            ${u.name}
          </div>
          <div class="upg-pill-effect">${u.desc}</div>
        </div>
        <span class="upg-pill-cost ${purchased ? 'done' : (canAfford ? 'affordable' : 'cant-afford')}" id="upg-cost-${i}">
          ${purchased ? '✓' : `${fmt(u.cost.amount)} ${resourceLabel(resource)}`}
        </span>
      `;
      pill.addEventListener('click', () => buyUpgrade(i));
      container.appendChild(pill);
    }
  }
}

function updateUpgradePills(containerId, grp) {
  if (!grp) return;
  for (const i of grp.ids) {
    const pill = document.getElementById(`upg-pill-${i}`);
    if (!pill) continue;
    pill.style.display = state.upgradeVisible[i] ? '' : 'none';
    if (!state.upgradeVisible[i]) continue;

    const u = UPGRADES[i];
    const purchased = state.upgrades[i];
    const resource = u.cost.resource;
    const canAfford = !purchased && state[resource] >= u.cost.amount;

    pill.classList.toggle('purchased', purchased);
    pill.classList.toggle('unaffordable', !purchased && !canAfford);

    const costEl = document.getElementById(`upg-cost-${i}`);
    if (costEl) {
      costEl.textContent = purchased ? '✓' : `${fmt(u.cost.amount)} ${resourceLabel(resource)}`;
      costEl.className = `upg-pill-cost ${purchased ? 'done' : (canAfford ? 'affordable' : 'cant-afford')}`;
    }
  }
}

// ═══ BUILD: CLICK/INGEST PANEL ═══

function buildClickPanel() {
  const el = document.getElementById('panel-click');
  if (!el) return;
  el.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">Data Ingestion</span>
      <span class="panel-badge blue">Click</span>
    </div>
    <div class="panel-body">
      <div id="click-target">
        <div id="click-label">Click to Collect Data Points</div>
        <div id="click-value">0</div>
        <div id="click-rate">0 DP/s · Click: +1</div>
      </div>
      <div id="sparkline-wrap">
        <div id="sparkline-title">Data Points — Live Feed</div>
        <canvas id="sparkline"></canvas>
      </div>
    </div>
  `;
  document.getElementById('click-target').addEventListener('click', handleClick);
  resizeSparkline();
  window.addEventListener('resize', resizeSparkline);
}

function renderClickPanel() {
  // click-value and click-rate are updated via renderKPI
}

// ═══ BUILD: WORLD MAP PANEL ═══

function buildWorldMapPanel() {
  const el = document.getElementById('panel-wm-map');
  if (!el) return;

  const conquered = getConqueredSet();
  const rate = calcContractsRate();

  const paths = TERRITORIES.map(t => {
    const isConquered = conquered.has(t.id);
    return `<path id="territory-${t.id}" d="${t.d}"
      class="${isConquered ? 'conquered' : 'locked'}"
      fill="${isConquered ? t.color : 'var(--text-muted)'}"
      data-territory="${t.id}">
      <title>${t.name} — ${isConquered ? `${t.rate}/s Contracts` : `Need ${t.need} producers`}</title>
    </path>`;
  }).join('');

  const legendItems = TERRITORIES.map(t => {
    const isConquered = conquered.has(t.id);
    return `<div class="wm-territory${isConquered ? ' conquered' : ''}" style="${isConquered ? 'color:' + t.color : ''}">
      <div class="wm-territory-dot" style="background:${isConquered ? t.color : 'var(--text-muted)'}"></div>
      ${t.emoji} ${t.name}${isConquered ? ` +${t.rate}/s` : ` (${t.need})`}
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">World Map</span>
      <span class="panel-badge amber" id="wm-rate-badge">${fmtDec(rate)}/s</span>
    </div>
    <div id="wm-map-svg-wrap">
      <svg id="wm-map-svg" viewBox="0 0 300 160" preserveAspectRatio="xMidYMid meet">${paths}</svg>
    </div>
    <div class="wm-legend" id="wm-legend">${legendItems}</div>
  `;
}

function renderWorldMap() {
  const svg = document.getElementById('wm-map-svg');
  if (!svg) return;

  const conquered = getConqueredSet();
  let changed = false;

  for (const t of TERRITORIES) {
    const path = document.getElementById(`territory-${t.id}`);
    if (!path) continue;
    const isConquered = conquered.has(t.id);
    const wasConquered = path.classList.contains('conquered');
    if (isConquered !== wasConquered) {
      path.classList.toggle('conquered', isConquered);
      path.classList.toggle('locked', !isConquered);
      path.setAttribute('fill', isConquered ? t.color : 'var(--text-muted)');
      changed = true;
    }
  }

  if (changed) {
    // Rebuild legend
    const legend = document.getElementById('wm-legend');
    if (legend) {
      legend.innerHTML = TERRITORIES.map(t => {
        const isConq = conquered.has(t.id);
        return `<div class="wm-territory${isConq ? ' conquered' : ''}" style="${isConq ? 'color:' + t.color : ''}">
          <div class="wm-territory-dot" style="background:${isConq ? t.color : 'var(--text-muted)'}"></div>
          ${t.emoji} ${t.name}${isConq ? ` +${t.rate}/s` : ` (${t.need})`}
        </div>`;
      }).join('');
    }
  }

  const rateBadge = document.getElementById('wm-rate-badge');
  if (rateBadge) rateBadge.textContent = `${fmtDec(calcContractsRate())}/s`;
}

// ═══ BUILD: WORLD UPGRADES PANEL ═══

function buildWorldUpgradesPanel() {
  const el = document.getElementById('panel-wm-upgrades');
  if (!el) return;

  el.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">WM Upgrades</span>
      <span class="panel-badge amber">Contracts</span>
    </div>
    <div class="panel-body" id="wm-upg-body">
      ${WORLD_UPGRADES.map(u => {
        const purchased = state.worldUpgrades[u.id];
        const canAfford = !purchased && state.contracts >= u.cost;
        return `<div class="wm-upg-card${purchased ? ' purchased' : (!canAfford ? ' unaffordable' : '')}" id="wm-upg-${u.id}">
          <div class="wm-upg-name">${u.name}</div>
          <div class="wm-upg-effect">${u.desc}</div>
          <div class="wm-upg-cost ${purchased ? 'done' : (canAfford ? 'affordable' : 'cant-afford')}" id="wm-upg-cost-${u.id}">
            ${purchased ? 'Active' : `${fmt(u.cost)} Contracts`}
          </div>
        </div>`;
      }).join('')}
    </div>
  `;

  for (const u of WORLD_UPGRADES) {
    const card = document.getElementById(`wm-upg-${u.id}`);
    if (card) card.addEventListener('click', () => buyWorldUpgrade(u.id));
  }
}

function renderWorldUpgradesPanel() {
  for (const u of WORLD_UPGRADES) {
    const card = document.getElementById(`wm-upg-${u.id}`);
    if (!card) continue;
    const purchased = state.worldUpgrades[u.id];
    const canAfford = !purchased && state.contracts >= u.cost;
    card.classList.toggle('purchased', purchased);
    card.classList.toggle('unaffordable', !purchased && !canAfford);
    const costEl = document.getElementById(`wm-upg-cost-${u.id}`);
    if (costEl) {
      costEl.textContent = purchased ? 'Active' : `${fmt(u.cost)} Contracts`;
      costEl.className = `wm-upg-cost ${purchased ? 'done' : (canAfford ? 'affordable' : 'cant-afford')}`;
    }
  }
}

// ═══ BUILD: QUESTS PANEL ═══

function buildQuestsPanel() {
  const el = document.getElementById('panel-quests');
  if (!el) return;

  el.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">Quests</span>
      <span class="panel-badge amber">Challenges</span>
    </div>
    <div class="panel-body" id="quests-body"></div>
  `;

  renderQuestsPanel();
}

function renderQuestsPanel() {
  const body = document.getElementById('quests-body');
  if (!body) return;
  body.innerHTML = '';

  for (let i = 0; i < QUESTS.length; i++) {
    const q = QUESTS[i];
    const completed = state.questsCompleted[i];
    const isActive = state.inChallenge && state.challengeId === i;
    const locked = !completed && i > 0 && !state.questsCompleted[i - 1];
    const goalResource = q.goalResource;
    const current = isActive ? (state[goalResource] || 0) : (completed ? q.goalAmount : 0);
    const pct = Math.min(100, (current / q.goalAmount) * 100);

    let actionsHtml = '';
    if (completed) {
      actionsHtml = `<div class="quest-actions"><button class="quest-btn" disabled>Completed ✓</button></div>`;
    } else if (locked) {
      actionsHtml = `<div class="quest-actions"><button class="quest-btn" disabled>Complete previous quest first</button></div>`;
    } else if (isActive) {
      const claimClass = state.goalMet ? 'claim' : 'exit';
      actionsHtml = `<div class="quest-actions">
        <button class="quest-btn exit" onclick="exitChallenge()">Exit</button>
        <button class="quest-btn ${claimClass}" onclick="claimQuest()" ${state.goalMet ? '' : 'disabled'}>Claim!</button>
      </div>`;
    } else {
      actionsHtml = `<div class="quest-actions"><button class="quest-btn enter" onclick="enterChallenge(${i})">Enter</button></div>`;
    }

    const card = document.createElement('div');
    card.className = `quest-card${isActive ? ' active' : ''}${completed ? ' completed' : ''}`;
    card.id = `quest-card-${i}`;
    card.innerHTML = `
      <div class="quest-name">
        Quest ${i + 1}: ${q.name}
        ${completed ? '<span class="quest-done-icon">✓</span>' : ''}
      </div>
      <div class="quest-restriction">${q.restriction}</div>
      <div class="quest-goal">Goal: ${fmt(current)} / ${fmt(q.goalAmount)} ${resourceLabel(goalResource)}</div>
      <div class="quest-progress-wrap">
        <div class="quest-progress-bar${pct >= 100 ? ' done' : ''}" style="width:${pct}%"></div>
      </div>
      <div class="quest-reward">Reward: ${q.reward}</div>
      ${actionsHtml}
    `;
    body.appendChild(card);
  }
}

// ═══ BUILD: PRESTIGE TREE PANEL ═══

function buildPrestigeTreePanel() {
  const el = document.getElementById('panel-prestige');
  if (!el) return;

  const rpGain = calcRPGain();
  const eligible = rpGain >= 5;

  el.innerHTML = `
    <div id="prestige-top">
      <div id="rp-counter">${state.reputationPoints}</div>
      <div id="rp-counter-label">Reputation Points</div>
      <button id="prestige-btn" ${eligible ? '' : 'disabled'}>Close Fiscal Year</button>
      <div id="prestige-next">${eligible ? `Next reset: +${rpGain} RP` : 'Need more Revenue'}</div>
    </div>
    <div id="prestige-tree-wrap">
      <svg id="tree-svg" viewBox="0 0 180 390" width="100%"></svg>
      <div id="node-popup"></div>
    </div>
  `;

  document.getElementById('prestige-btn').addEventListener('click', () => {
    if (confirm('Close the fiscal year? All current progress resets in exchange for Reputation Points.')) {
      doPrestige();
    }
  });

  buildTreeSVG();
  renderPrestigeTree();

  // Close popup on outside click
  document.addEventListener('click', onDocClickClosePopup);
}

function buildTreeSVG() {
  const svg = document.getElementById('tree-svg');
  if (!svg) return;
  svg.innerHTML = '';

  const ns = 'http://www.w3.org/2000/svg';

  // Draw edges (lines) first
  for (const node of TREE_NODES_DEF) {
    if (node.parent === null) continue;
    const from = NODE_POS[node.parent];
    const to   = NODE_POS[node.id];
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', from.cx);
    line.setAttribute('y1', from.cy);
    line.setAttribute('x2', to.cx);
    line.setAttribute('y2', to.cy);
    line.id = `tree-line-${node.id}`;
    line.setAttribute('class', 'tree-line');
    svg.appendChild(line);
  }

  // Draw nodes (circles)
  for (const node of TREE_NODES_DEF) {
    const pos = NODE_POS[node.id];

    const g = document.createElementNS(ns, 'g');
    g.id = `tree-node-${node.id}`;
    g.setAttribute('class', 'tree-node');
    g.addEventListener('click', (e) => { e.stopPropagation(); openNodePopup(node.id); });

    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', pos.cx);
    circle.setAttribute('cy', pos.cy);
    circle.setAttribute('r', 10);
    circle.id = `tree-circle-${node.id}`;

    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', pos.cx);
    text.setAttribute('y', pos.cy + 4);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '9');
    text.setAttribute('font-weight', '700');
    text.setAttribute('pointer-events', 'none');
    text.id = `tree-num-${node.id}`;
    text.textContent = node.id + 1;

    g.appendChild(circle);
    g.appendChild(text);
    svg.appendChild(g);
  }
}

function renderPrestigeTree() {
  const rpGain = calcRPGain();
  const eligible = rpGain >= 5;

  const counter = document.getElementById('rp-counter');
  if (counter) counter.textContent = state.reputationPoints;

  const btn = document.getElementById('prestige-btn');
  if (btn) btn.disabled = !eligible;

  const nextEl = document.getElementById('prestige-next');
  if (nextEl) nextEl.textContent = eligible ? `Next reset: +${rpGain} RP` : 'Need more Revenue';

  for (const node of TREE_NODES_DEF) {
    const circle = document.getElementById(`tree-circle-${node.id}`);
    const numEl  = document.getElementById(`tree-num-${node.id}`);
    const lineEl = document.getElementById(`tree-line-${node.id}`);
    if (!circle) continue;

    const purchased = state.treeNodes[node.id];
    const parentOk  = node.parent === null || state.treeNodes[node.parent];
    const affordable = parentOk && !purchased && state.reputationPoints >= node.cost;

    if (purchased) {
      circle.setAttribute('fill', 'var(--teal)');
      circle.setAttribute('stroke', 'var(--teal)');
      circle.setAttribute('stroke-width', '2');
      if (numEl) { numEl.setAttribute('fill', '#fff'); }
    } else if (affordable) {
      circle.setAttribute('fill', 'var(--gold)');
      circle.setAttribute('stroke', 'var(--gold)');
      circle.setAttribute('stroke-width', '2');
      if (numEl) { numEl.setAttribute('fill', '#000'); }
    } else {
      circle.setAttribute('fill', 'var(--bg)');
      circle.setAttribute('stroke', 'var(--text-muted)');
      circle.setAttribute('stroke-width', '1.5');
      if (numEl) { numEl.setAttribute('fill', 'var(--text-muted)'); }
    }

    if (lineEl) {
      lineEl.setAttribute('stroke', purchased || parentOk ? 'var(--text-muted)' : 'var(--border)');
      lineEl.setAttribute('stroke-opacity', purchased || parentOk ? '0.6' : '0.3');
    }
  }
}

// ═══ NODE POPUP ═══

let openPopupId = -1;

function openNodePopup(id) {
  if (openPopupId === id) { closeNodePopup(); return; }
  openPopupId = id;

  const node = TREE_NODES_DEF[id];
  const pos  = NODE_POS[id];
  const purchased = state.treeNodes[id];
  const parentOk  = node.parent === null || state.treeNodes[node.parent];
  const canBuy    = parentOk && !purchased && state.reputationPoints >= node.cost;

  const popup = document.getElementById('node-popup');
  if (!popup) return;

  const costClass = purchased ? 'purchased' : (!canBuy ? 'cant-afford' : '');
  const costText  = purchased ? 'Purchased' : `${node.cost} RP`;

  popup.innerHTML = `
    <div class="popup-name">Node ${id + 1}: ${node.name}</div>
    <div class="popup-desc">${node.desc}</div>
    <div class="popup-cost ${costClass}">${costText}</div>
    <button class="popup-buy" ${purchased || !canBuy ? 'disabled' : ''} onclick="buyTreeNode(${id})">
      ${purchased ? 'Owned' : 'Buy'}
    </button>
  `;

  // Position relative to prestige-tree-wrap
  const wrap = document.getElementById('prestige-tree-wrap');
  if (!wrap) return;
  const wrapRect = wrap.getBoundingClientRect();
  const svg = document.getElementById('tree-svg');
  const svgRect = svg.getBoundingClientRect();

  // Convert SVG coords to panel-relative coords
  const scaleX = svgRect.width / 180;
  const scaleY = svgRect.height / 390;
  const dotX = svgRect.left - wrapRect.left + pos.cx * scaleX;
  const dotY = svgRect.top  - wrapRect.top  + pos.cy * scaleY + wrap.scrollTop;

  popup.style.top  = (dotY - 16) + 'px';
  popup.style.left = (dotX + 14) + 'px';
  popup.style.display = 'block';
}

function closeNodePopup() {
  openPopupId = -1;
  const popup = document.getElementById('node-popup');
  if (popup) popup.style.display = 'none';
}

function onDocClickClosePopup(e) {
  const popup = document.getElementById('node-popup');
  if (popup && popup.style.display !== 'none') {
    if (!popup.contains(e.target)) closeNodePopup();
  }
}

// ═══ ACTIVITY LOG MODAL ═══

function buildActivityLogModal() {
  const existing = document.getElementById('log-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'log-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div id="log-modal">
      <div id="log-header">
        <span id="log-title">Activity Log</span>
        <button id="log-close">✕</button>
      </div>
      <div id="log-body">
        <div id="activity-log"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#log-close').addEventListener('click', closeActivityLog);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeActivityLog(); });
}

function openActivityLog() {
  renderActivityLog();
  document.getElementById('log-overlay').classList.add('open');
}

function closeActivityLog() {
  document.getElementById('log-overlay').classList.remove('open');
}

// ═══ STATUS MODAL ═══

function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function buildStatusModal() {
  const existing = document.getElementById('status-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'status-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div id="status-modal">
      <div id="status-header">
        <span id="status-title">Status Report</span>
        <button id="status-close">✕</button>
      </div>
      <div id="status-body"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#status-close').addEventListener('click', closeStatus);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeStatus(); });
}

function openStatus() {
  renderStatusBody();
  document.getElementById('status-overlay').classList.add('open');
}

function closeStatus() {
  document.getElementById('status-overlay').classList.remove('open');
}

function renderStatusBody() {
  const body = document.getElementById('status-body');
  if (!body) return;

  const sessionMs = Date.now() - sessionStart;
  const dpRate  = calcTotalProduction('dataPoints');
  const insRate = calcTotalProduction('insights');
  const revRate = calcTotalProduction('revenue');
  const t1Rate  = PRODUCERS.filter(p => p.tier === 1).reduce((s, p) => s + producerEffectiveRate(p), 0);
  const t2Rate  = PRODUCERS.filter(p => p.tier === 2).reduce((s, p) => s + producerEffectiveRate(p), 0);
  const t3Rate  = PRODUCERS.filter(p => p.tier === 3 && (!p.hidden || state.treeNodes[2])).reduce((s, p) => s + producerEffectiveRate(p), 0);
  const totalOwned = state.owned.reduce((s, n) => s + n, 0);
  const upgBought = state.upgrades.filter(Boolean).length;
  const rpGain = calcRPGain();
  const milestonesReached = MILESTONES.filter(m => milestonesFired.has(m.id)).length;
  const conquered = getConqueredSet();

  const producerRows = PRODUCERS
    .filter(p => (!p.hidden || state.treeNodes[2]) && state.owned[p.id] > 0)
    .map(p => `<div class="status-row">
      <span class="status-row-label">${p.emoji} ${p.name}</span>
      <span class="status-row-value">${state.owned[p.id]} owned · ${fmtDec(producerEffectiveRate(p))}/s</span>
    </div>`).join('');

  const boughtUpgrades = UPGRADES
    .filter((u, i) => state.upgrades[i])
    .map(u => `<span class="status-upgrade-pill">${u.name}</span>`)
    .join('');

  const treeOwned = state.treeNodes.filter(Boolean).length;

  body.innerHTML = `
    <div class="status-section">
      <div class="status-section-title">Session</div>
      <div class="status-row"><span class="status-row-label">Session time</span><span class="status-row-value">${fmtDuration(sessionMs)}</span></div>
      <div class="status-row"><span class="status-row-label">Fiscal year resets</span><span class="status-row-value">${state.prestigeCount}</span></div>
      <div class="status-row"><span class="status-row-label">Milestones reached</span><span class="status-row-value">${milestonesReached} / ${MILESTONES.length}</span></div>
    </div>

    <div class="status-section">
      <div class="status-section-title">All-Time Production</div>
      <div class="status-row"><span class="status-row-label">Data Points generated</span><span class="status-row-value accent">${fmt(state.lifetimeDP)}</span></div>
      <div class="status-row"><span class="status-row-label">Insights generated</span><span class="status-row-value teal">${fmt(state.lifetimeInsights)}</span></div>
      <div class="status-row"><span class="status-row-label">Revenue generated</span><span class="status-row-value">${fmt(state.lifetimeRevenue)}</span></div>
      <div class="status-row"><span class="status-row-label">Contracts earned</span><span class="status-row-value">${fmt(state.lifetimeContracts)}</span></div>
    </div>

    <div class="status-section">
      <div class="status-section-title">Current Rates</div>
      <div class="status-row"><span class="status-row-label">Data Points / s</span><span class="status-row-value accent">${fmtDec(dpRate)}</span></div>
      <div class="status-row"><span class="status-row-label">  ↳ Tier 1 contribution</span><span class="status-row-value">${fmtDec(t1Rate)}/s</span></div>
      <div class="status-row"><span class="status-row-label">Insights / s</span><span class="status-row-value teal">${fmtDec(insRate)}</span></div>
      <div class="status-row"><span class="status-row-label">  ↳ Tier 2 contribution</span><span class="status-row-value">${fmtDec(t2Rate)}/s</span></div>
      <div class="status-row"><span class="status-row-label">Revenue / s</span><span class="status-row-value">${fmtDec(revRate)}</span></div>
      <div class="status-row"><span class="status-row-label">  ↳ Tier 3 contribution</span><span class="status-row-value">${fmtDec(t3Rate)}/s</span></div>
      <div class="status-row"><span class="status-row-label">Contracts / s</span><span class="status-row-value">${fmtDec(calcContractsRate())}</span></div>
    </div>

    <div class="status-section">
      <div class="status-section-title">Click Stats</div>
      <div class="status-row"><span class="status-row-label">Total clicks this session</span><span class="status-row-value">${totalClicks.toLocaleString()}</span></div>
      <div class="status-row"><span class="status-row-label">DP earned from clicks</span><span class="status-row-value accent">${fmt(totalClickDP)}</span></div>
      <div class="status-row"><span class="status-row-label">Current click power</span><span class="status-row-value">+${fmt(clickPower())} DP</span></div>
    </div>

    <div class="status-section">
      <div class="status-section-title">Workforce — ${totalOwned} total</div>
      ${producerRows || '<div class="status-empty">No producers hired yet.</div>'}
    </div>

    <div class="status-section">
      <div class="status-section-title">Upgrades — ${upgBought}/${UPGRADES.length} purchased</div>
      <div class="status-upgrade-pills">${boughtUpgrades || '<span class="status-empty">None yet.</span>'}</div>
    </div>

    <div class="status-section">
      <div class="status-section-title">World Map — ${conquered.size}/6 territories</div>
      ${TERRITORIES.map(t => `<div class="status-row">
        <span class="status-row-label">${t.emoji} ${t.name}</span>
        <span class="status-row-value" style="color:${conquered.has(t.id) ? t.color : 'var(--text-muted)'}">
          ${conquered.has(t.id) ? `Conquered · ${t.rate}/s` : `Need ${t.need} producers`}
        </span>
      </div>`).join('')}
    </div>

    <div class="status-section">
      <div class="status-section-title">Prestige</div>
      <div class="status-row"><span class="status-row-label">Reputation Points</span><span class="status-row-value gold">${state.reputationPoints} RP</span></div>
      <div class="status-row"><span class="status-row-label">Next reset would give</span><span class="status-row-value gold">${rpGain >= 5 ? '+' + rpGain + ' RP' : 'Not eligible'}</span></div>
      <div class="status-row"><span class="status-row-label">Skill tree nodes owned</span><span class="status-row-value">${treeOwned} / ${TREE_NODES_DEF.length}</span></div>
    </div>

    <div class="status-section">
      <div class="status-section-title">Quests</div>
      ${QUESTS.map((q, i) => `<div class="status-row milestone-row ${state.questsCompleted[i] ? 'done' : 'locked'}">
        <span class="milestone-icon">${state.questsCompleted[i] ? '✓' : '○'}</span>
        <span class="status-row-label">${q.name} — ${q.reward}</span>
      </div>`).join('')}
    </div>

    <div class="status-section">
      <div class="status-section-title">Milestones</div>
      ${MILESTONES.map(m => `<div class="status-row milestone-row ${milestonesFired.has(m.id) ? 'done' : 'locked'}">
        <span class="milestone-icon">${milestonesFired.has(m.id) ? '✓' : '○'}</span>
        <span class="status-row-label">${m.msg}</span>
      </div>`).join('')}
    </div>
  `;
}

// ═══ SETTINGS MODAL ═══

function buildSettingsModal() {
  const existing = document.getElementById('settings-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'settings-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div id="settings-modal">
      <div id="settings-header">
        <span id="settings-title">Settings</span>
        <button id="settings-close">✕</button>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">Number Format</div>
        <div class="settings-options" id="format-options">
          <label class="settings-option"><input type="radio" name="numformat" value="general"><span>General <em>1.23K / 4.56M</em></span></label>
          <label class="settings-option"><input type="radio" name="numformat" value="scientific"><span>Scientific <em>1.23e3 / 4.56e6</em></span></label>
          <label class="settings-option"><input type="radio" name="numformat" value="engineering"><span>Engineering <em>1.23e3 / 4.56e6</em></span></label>
          <label class="settings-option"><input type="radio" name="numformat" value="letters"><span>Letters <em>1.23K / Qa / Qi…</em></span></label>
          <label class="settings-option"><input type="radio" name="numformat" value="full"><span>Full <em>1,234 / 4,567,890</em></span></label>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">Theme</div>
        <div class="settings-btn-row">
          <button class="settings-theme-btn" data-theme="dark">Dark</button>
          <button class="settings-theme-btn" data-theme="light">Light</button>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">Accent Color</div>
        <div class="settings-accent-row">
          <button class="accent-swatch" data-accent="blue"   style="--swatch:#1f6feb" title="Blue"></button>
          <button class="accent-swatch" data-accent="purple" style="--swatch:#8b5cf6" title="Purple"></button>
          <button class="accent-swatch" data-accent="teal"   style="--swatch:#0891b2" title="Teal"></button>
          <button class="accent-swatch" data-accent="orange" style="--swatch:#ea580c" title="Orange"></button>
          <button class="accent-swatch" data-accent="pink"   style="--swatch:#db2777" title="Pink"></button>
        </div>
      </div>
      <div class="settings-section settings-danger">
        <div class="settings-section-title">Danger Zone</div>
        <p class="settings-danger-text">Permanently deletes all game progress. Settings are kept.</p>
        <button id="wipe-btn">Wipe All Data & Start Over</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#settings-close').addEventListener('click', closeSettings);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSettings(); });

  overlay.querySelectorAll('input[name="numformat"]').forEach(radio => {
    if (radio.value === settings.numberFormat) radio.checked = true;
    radio.addEventListener('change', () => { settings.numberFormat = radio.value; saveSettings(); });
  });

  overlay.querySelectorAll('.settings-theme-btn').forEach(btn => {
    if (btn.dataset.theme === settings.theme) btn.classList.add('active');
    btn.addEventListener('click', () => {
      settings.theme = btn.dataset.theme;
      saveSettings(); applyTheme();
      overlay.querySelectorAll('.settings-theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === settings.theme));
    });
  });

  overlay.querySelectorAll('.accent-swatch').forEach(btn => {
    if (btn.dataset.accent === settings.accent) btn.classList.add('active');
    btn.addEventListener('click', () => {
      settings.accent = btn.dataset.accent;
      saveSettings(); applyTheme();
      overlay.querySelectorAll('.accent-swatch').forEach(b => b.classList.toggle('active', b.dataset.accent === settings.accent));
    });
  });

  overlay.querySelector('#wipe-btn').addEventListener('click', () => {
    if (confirm('Wipe ALL game data and start over? This cannot be undone.')) {
      wipeData(); closeSettings();
    }
  });
}

function openSettings() {
  document.getElementById('settings-overlay').classList.add('open');
}

function closeSettings() {
  document.getElementById('settings-overlay').classList.remove('open');
}

function wipeData() {
  localStorage.removeItem(SAVE_KEY);
  state = defaultState();
  sparklineData = [];
  activityLog = [];
  starvationFlags = new Array(PRODUCERS.length).fill(false);
  milestonesFired.clear();
  panelsUnlocked.clear();
  panelsUnlocked.add('t1');
  panelsUnlocked.add('click');
  challengeSnapshot = null;
  gameStartTime = Date.now();
  addLog('Save wiped. Fresh start.', 'info');
  buildDashboard();
  showToast('All data wiped. Starting over.', 'info');
}

// ═══ HELPERS ═══

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ═══ BUILD ALL ═══

function buildAll() {
  buildKPIBar();
  buildDashboard();
  buildActivityLogModal();
  buildStatusModal();
  buildSettingsModal();
  renderKPI();
  renderT1Panel();
  renderT2Panel();
  renderWorldMap();
  renderWorldUpgradesPanel();
  renderQuestsPanel();
  renderPrestigeTree();
  renderActivityLog();

  // Wire up top bar buttons
  document.getElementById('log-btn').addEventListener('click', openActivityLog);
  document.getElementById('status-btn').addEventListener('click', openStatus);
  document.getElementById('settings-btn').addEventListener('click', openSettings);
}

// ═══ INIT ═══

loadSettings();
applyTheme();
loadGame();
gameStartTime = Date.now();
addLog('You opened a new spreadsheet. Time to build a data empire.', 'info');
buildAll();
setInterval(tick, TICK_MS);
