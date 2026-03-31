// ═══ CONSTANTS & DEFINITIONS ═══

const TICK_MS = 250;
const DT = TICK_MS / 1000; // seconds per tick
const SAVE_KEY = 'bi-dashboard-save';
const SETTINGS_KEY = 'bi-dashboard-settings';
const SPARKLINE_MAX = 60;
const SPARKLINE_INTERVAL_TICKS = 15; // push every 15 ticks (~3.75s)
const AUTOSAVE_TICKS = 120; // every 30s
const MAX_OFFLINE_HOURS = 4;

const PRODUCERS = [
  // Tier 1 — produce Data Points/s
  {
    id: 0, tier: 1, name: 'Excel Analyst', emoji: '📊',
    desc: 'Junior analyst manually crunching spreadsheets.',
    baseCost: 10, costMult: 1.13,
    baseProduction: 0.1, produces: 'dataPoints',
  },
  {
    id: 1, tier: 1, name: 'SQL Developer', emoji: '🗄️',
    desc: 'Writes queries against transactional databases.',
    baseCost: 100, costMult: 1.13,
    baseProduction: 0.5, produces: 'dataPoints',
  },
  {
    id: 2, tier: 1, name: 'ETL Pipeline', emoji: '⚙️',
    desc: 'Automated nightly data extraction and loading.',
    baseCost: 1100, costMult: 1.13,
    baseProduction: 4, produces: 'dataPoints',
  },
  {
    id: 3, tier: 1, name: 'Data Catalog', emoji: '📁',
    desc: 'Classifies and indexes all data assets centrally.',
    baseCost: 12000, costMult: 1.13,
    baseProduction: 20, produces: 'dataPoints',
  },
  // Tier 2 — consume Data Points, produce Insights/s
  {
    id: 4, tier: 2, name: 'Power BI Dashboard', emoji: '📈',
    desc: 'Self-service analytics for business users.',
    baseCost: 8000, costMult: 1.13,
    baseProduction: 0.2, produces: 'insights',
    consumeRate: 1, consumeResource: 'dataPoints',
  },
  {
    id: 5, tier: 2, name: 'Data Warehouse', emoji: '🏛️',
    desc: 'Centralised analytical store (Kimball schema).',
    baseCost: 75000, costMult: 1.13,
    baseProduction: 1.5, produces: 'insights',
    consumeRate: 5, consumeResource: 'dataPoints',
  },
  {
    id: 6, tier: 2, name: 'Data Lake', emoji: '🌊',
    desc: 'Schema-on-read blob storage at petabyte scale.',
    baseCost: 500000, costMult: 1.13,
    baseProduction: 8, produces: 'insights',
    consumeRate: 20, consumeResource: 'dataPoints',
  },
  // Tier 3 — consume Insights, produce Revenue/s
  {
    id: 7, tier: 3, name: 'ML Model', emoji: '🤖',
    desc: 'Predictive analytics packaged and sold to clients.',
    baseCost: 200, costMult: 1.13,
    baseProduction: 0.05, produces: 'revenue',
    consumeRate: 0.5, consumeResource: 'insights',
    costResource: 'insights',
  },
  {
    id: 8, tier: 3, name: 'RT Analytics Engine', emoji: '⚡',
    desc: 'Streaming pipeline processing millions of events/s.',
    baseCost: 2000, costMult: 1.13,
    baseProduction: 0.4, produces: 'revenue',
    consumeRate: 3, consumeResource: 'insights',
    costResource: 'insights',
  },
  {
    id: 9, tier: 3, name: 'AI Insights Platform', emoji: '✨',
    desc: 'GenAI co-pilot delivering C-suite recommendations.',
    baseCost: 20000, costMult: 1.13,
    baseProduction: 3, produces: 'revenue',
    consumeRate: 15, consumeResource: 'insights',
    costResource: 'insights',
  },
  // Hidden producer — unlocked via RP shop
  {
    id: 10, tier: 3, name: 'Strategic Advisory Firm', emoji: '🏢',
    desc: 'Top-tier consultancy generating enterprise value at scale.',
    baseCost: 50000, costMult: 1.13,
    baseProduction: 15, produces: 'revenue',
    consumeRate: 60, consumeResource: 'insights',
    costResource: 'insights',
    hidden: true,
  },
];

// Upgrade effect types:
// producerMultiplier: multiply a specific producer's output
// allTierMultiplier: multiply all producers of a tier
// allMultiplier: multiply all producers
// clickMultiplier: multiply click power
const UPGRADES = [
  {
    id: 0, name: 'Pivot Tables',
    desc: 'Excel Analysts 2× production.',
    flavor: 'You discovered Pivot Tables. The analysts are amazed.',
    unlock: { type: 'owned', producerId: 0, count: 1 },
    cost: { resource: 'dataPoints', amount: 50 },
    effect: { type: 'producerMultiplier', producerId: 0, multiplier: 2 },
  },
  {
    id: 1, name: 'VLOOKUP Mastery',
    desc: 'Excel Analysts 2× production.',
    flavor: 'The team masters VLOOKUP at scale.',
    unlock: { type: 'owned', producerId: 0, count: 5 },
    cost: { resource: 'dataPoints', amount: 200 },
    effect: { type: 'producerMultiplier', producerId: 0, multiplier: 2 },
  },
  {
    id: 2, name: 'Power Query',
    desc: 'Excel Analysts 2× production.',
    flavor: 'M language transforms the spreadsheet game.',
    unlock: { type: 'owned', producerId: 0, count: 25 },
    cost: { resource: 'dataPoints', amount: 5000 },
    effect: { type: 'producerMultiplier', producerId: 0, multiplier: 2 },
  },
  {
    id: 3, name: 'Query Optimization',
    desc: 'SQL Developers 2× production.',
    flavor: 'Execution plans are now a thing of beauty.',
    unlock: { type: 'owned', producerId: 1, count: 1 },
    cost: { resource: 'dataPoints', amount: 500 },
    effect: { type: 'producerMultiplier', producerId: 1, multiplier: 2 },
  },
  {
    id: 4, name: 'Stored Procedures',
    desc: 'SQL Developers 2× production.',
    flavor: 'Encapsulating business logic server-side.',
    unlock: { type: 'owned', producerId: 1, count: 5 },
    cost: { resource: 'dataPoints', amount: 2500 },
    effect: { type: 'producerMultiplier', producerId: 1, multiplier: 2 },
  },
  {
    id: 5, name: 'Incremental Load',
    desc: 'ETL Pipelines 2× production.',
    flavor: 'Only delta records — a true engineering upgrade.',
    unlock: { type: 'owned', producerId: 2, count: 1 },
    cost: { resource: 'dataPoints', amount: 5000 },
    effect: { type: 'producerMultiplier', producerId: 2, multiplier: 2 },
  },
  {
    id: 6, name: 'CDC Streaming',
    desc: 'ETL Pipelines 2× production.',
    flavor: 'Change Data Capture eliminates batch windows.',
    unlock: { type: 'owned', producerId: 2, count: 5 },
    cost: { resource: 'dataPoints', amount: 30000 },
    effect: { type: 'producerMultiplier', producerId: 2, multiplier: 2 },
  },
  {
    id: 7, name: 'Data Governance Policy',
    desc: 'All Tier 1 producers 1.5× production.',
    flavor: 'Compliance unlocks efficiency. The board is pleased.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 500 },
    cost: { resource: 'dataPoints', amount: 1000 },
    effect: { type: 'allTierMultiplier', tier: 1, multiplier: 1.5 },
  },
  {
    id: 8, name: 'Cloud Migration',
    desc: 'All Tier 1 producers 2× production.',
    flavor: 'Moving to the cloud was the right call.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 10000 },
    cost: { resource: 'dataPoints', amount: 8000 },
    effect: { type: 'allTierMultiplier', tier: 1, multiplier: 2 },
  },
  {
    id: 9, name: 'Star Schema Design',
    desc: 'Power BI Dashboards 2× production.',
    flavor: 'Fact tables sing in harmony with dimensions.',
    unlock: { type: 'owned', producerId: 4, count: 1 },
    cost: { resource: 'dataPoints', amount: 6000 },
    effect: { type: 'producerMultiplier', producerId: 4, multiplier: 2 },
  },
  {
    id: 10, name: 'Row-Level Security',
    desc: 'Power BI Dashboards 2× production.',
    flavor: 'Every user sees exactly what they should.',
    unlock: { type: 'owned', producerId: 4, count: 5 },
    cost: { resource: 'dataPoints', amount: 40000 },
    effect: { type: 'producerMultiplier', producerId: 4, multiplier: 2 },
  },
  {
    id: 11, name: 'Columnar Storage',
    desc: 'Data Warehouses 2× production.',
    flavor: 'Parquet files and columnar reads. Blazingly fast.',
    unlock: { type: 'owned', producerId: 5, count: 1 },
    cost: { resource: 'dataPoints', amount: 60000 },
    effect: { type: 'producerMultiplier', producerId: 5, multiplier: 2 },
  },
  {
    id: 12, name: 'Partitioning Strategy',
    desc: 'Data Warehouses 2× production.',
    flavor: 'Query pruning at scale. The DBA is grateful.',
    unlock: { type: 'owned', producerId: 5, count: 5 },
    cost: { resource: 'dataPoints', amount: 400000 },
    effect: { type: 'producerMultiplier', producerId: 5, multiplier: 2 },
  },
  {
    id: 13, name: 'Delta Lake Format',
    desc: 'Data Lakes 2× production.',
    flavor: 'ACID transactions on the lake. A new era.',
    unlock: { type: 'owned', producerId: 6, count: 1 },
    cost: { resource: 'dataPoints', amount: 400000 },
    effect: { type: 'producerMultiplier', producerId: 6, multiplier: 2 },
  },
  {
    id: 14, name: 'Feature Engineering',
    desc: 'ML Models 2× production.',
    flavor: 'The right features are 80% of the model.',
    unlock: { type: 'owned', producerId: 7, count: 1 },
    cost: { resource: 'insights', amount: 150 },
    effect: { type: 'producerMultiplier', producerId: 7, multiplier: 2 },
  },
  {
    id: 15, name: 'AutoML Pipeline',
    desc: 'ML Models 2× + click power 2×.',
    flavor: 'Automated model selection and hyperparameter tuning.',
    unlock: { type: 'owned', producerId: 7, count: 5 },
    cost: { resource: 'insights', amount: 1500 },
    effect: { type: 'combo', effects: [
      { type: 'producerMultiplier', producerId: 7, multiplier: 2 },
      { type: 'clickMultiplier', multiplier: 2 },
    ]},
  },
  {
    id: 16, name: 'Foundation Model',
    desc: 'All producers 3× production.',
    flavor: 'The AI singularity arrives — for your dashboard.',
    unlock: { type: 'lifetimeEarned', resource: 'revenue', amount: 1000 },
    cost: { resource: 'revenue', amount: 5000 },
    effect: { type: 'allMultiplier', multiplier: 3 },
  },
  // Click power upgrades
  {
    id: 17, name: 'Touch Typing',
    desc: 'Click power 2×.',
    flavor: 'Your WPM just hit 120. The data flows freely.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 10 },
    cost: { resource: 'dataPoints', amount: 75 },
    effect: { type: 'clickMultiplier', multiplier: 2 },
  },
  {
    id: 18, name: 'Keyboard Shortcuts',
    desc: 'Click power 2×.',
    flavor: "Ctrl+C, Ctrl+V — the analyst's two best friends.",
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 500 },
    cost: { resource: 'dataPoints', amount: 1500 },
    effect: { type: 'clickMultiplier', multiplier: 2 },
  },
  {
    id: 19, name: 'Macro Recorder',
    desc: 'Click power 3×.',
    flavor: 'One button. One macro. Infinite leverage.',
    unlock: { type: 'owned', producerId: 1, count: 5 },
    cost: { resource: 'dataPoints', amount: 12000 },
    effect: { type: 'clickMultiplier', multiplier: 3 },
  },
  {
    id: 20, name: 'RPA Bot',
    desc: 'Click power 5×.',
    flavor: 'Robotic Process Automation handles the clicking itself.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 50000 },
    cost: { resource: 'dataPoints', amount: 40000 },
    effect: { type: 'clickMultiplier', multiplier: 5 },
  },
  {
    id: 21, name: 'One-Click Reports',
    desc: 'Click power 4×.',
    flavor: 'A single click generates a full board-ready report.',
    unlock: { type: 'owned', producerId: 4, count: 5 },
    cost: { resource: 'dataPoints', amount: 80000 },
    effect: { type: 'clickMultiplier', multiplier: 4 },
  },
];

const RP_UPGRADES = [
  {
    id: 0, name: 'Silver Certification',
    desc: 'All producers permanently start at 1.5× base production.',
    cost: 5,
  },
  {
    id: 1, name: 'Gold Certification',
    desc: 'Click power permanently ×5.',
    cost: 25,
  },
  {
    id: 2, name: 'Platinum Partner',
    desc: 'Unlock the Strategic Advisory Firm — a hidden Tier 3 producer.',
    cost: 100,
  },
];

// ═══ SETTINGS ═══

let settings = {
  numberFormat: 'general', // general | scientific | engineering | letters | full
  theme: 'dark',           // dark | light
  accent: 'blue',          // blue | purple | teal | orange | pink
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
    owned: new Array(PRODUCERS.length).fill(0),
    upgrades: new Array(UPGRADES.length).fill(false),
    upgradeVisible: new Array(UPGRADES.length).fill(false),
    rpUpgrades: new Array(RP_UPGRADES.length).fill(false),
    lastSaveTime: Date.now(),
    tickCount: 0,
  };
}

let state = defaultState();
let sparklineData = [];
let activityLog = [];
let starvationFlags = new Array(PRODUCERS.length).fill(false);

// ═══ SAVE / LOAD ═══

function saveGame() {
  const saveObj = {
    ...state,
    owned: [...state.owned],
    upgrades: [...state.upgrades],
    upgradeVisible: [...state.upgradeVisible],
    rpUpgrades: [...state.rpUpgrades],
    lastSaveTime: Date.now(),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(saveObj));
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    state = { ...defaultState(), ...saved };
    // Ensure arrays are correct length
    state.owned = padArray(state.owned, PRODUCERS.length, 0);
    state.upgrades = padArray(state.upgrades, UPGRADES.length, false);
    state.upgradeVisible = padArray(state.upgradeVisible, UPGRADES.length, false);
    state.rpUpgrades = padArray(state.rpUpgrades, RP_UPGRADES.length, false);

    // Offline progress
    const offlineSec = Math.min((Date.now() - (saved.lastSaveTime || Date.now())) / 1000, MAX_OFFLINE_HOURS * 3600);
    if (offlineSec > 10) {
      const dpRate = calcTotalProduction('dataPoints');
      const earned = dpRate * offlineSec;
      state.dataPoints += earned;
      state.lifetimeDP += earned;
      if (earned > 0) {
        addLog(`Welcome back! Generated ${fmt(earned)} Data Points while away.`, 'info');
        showToast(`+${fmt(earned)} Data Points (offline)`, 'info');
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

function producerEffectiveRate(p) {
  if (state.owned[p.id] === 0) return 0;
  let mult = 1;
  // RP: silver certification
  if (state.rpUpgrades[0]) mult *= 1.5;
  // Per-producer upgrade multipliers
  for (let i = 0; i < UPGRADES.length; i++) {
    if (!state.upgrades[i]) continue;
    const u = UPGRADES[i];
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
    if (p.produces === resource && !p.hidden) {
      total += producerEffectiveRate(p);
    }
  }
  // Hidden producer (id 10) if unlocked via RP
  if (state.rpUpgrades[2]) {
    const hp = PRODUCERS[10];
    if (hp.produces === resource) total += producerEffectiveRate(hp);
  }
  return total;
}

function clickPower() {
  let power = 1;
  if (state.rpUpgrades[1]) power *= 5;
  for (let i = 0; i < UPGRADES.length; i++) {
    if (!state.upgrades[i]) continue;
    const u = UPGRADES[i];
    gatherClickMultiplier(u.effect, (m) => { power *= m; });
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

// ═══ TICK ═══

function tick() {
  state.tickCount++;

  // Tier 1: produce Data Points
  for (const p of PRODUCERS) {
    if (p.tier !== 1) continue;
    if (state.owned[p.id] === 0) continue;
    const rate = producerEffectiveRate(p);
    const produced = rate * DT;
    state.dataPoints += produced;
    state.lifetimeDP += produced;
  }

  // Tier 2: consume DP, produce Insights
  let totalInsightDemand = 0;
  const insightProducers = PRODUCERS.filter(p => p.tier === 2 && state.owned[p.id] > 0);
  for (const p of insightProducers) {
    totalInsightDemand += p.consumeRate * state.owned[p.id] * DT;
  }
  const insightRatio = totalInsightDemand > 0
    ? Math.min(1, state.dataPoints / totalInsightDemand)
    : 1;
  for (const p of insightProducers) {
    const consume = p.consumeRate * state.owned[p.id] * DT * insightRatio;
    const produce = producerEffectiveRate(p) * DT * insightRatio;
    state.dataPoints -= consume;
    state.insights += produce;
    state.lifetimeInsights += produce;
    starvationFlags[p.id] = insightRatio < 0.99;
  }

  // Tier 3: consume Insights, produce Revenue
  let totalRevenueDemand = 0;
  const revProducers = PRODUCERS.filter(p => p.tier === 3 && state.owned[p.id] > 0
    && (!p.hidden || state.rpUpgrades[2]));
  for (const p of revProducers) {
    totalRevenueDemand += p.consumeRate * state.owned[p.id] * DT;
  }
  const revRatio = totalRevenueDemand > 0
    ? Math.min(1, state.insights / totalRevenueDemand)
    : 1;
  for (const p of revProducers) {
    const consume = p.consumeRate * state.owned[p.id] * DT * revRatio;
    const produce = producerEffectiveRate(p) * DT * revRatio;
    state.insights -= consume;
    state.revenue += produce;
    state.lifetimeRevenue += produce;
    starvationFlags[p.id] = revRatio < 0.99;
  }

  // Ensure no negatives
  state.dataPoints = Math.max(0, state.dataPoints);
  state.insights = Math.max(0, state.insights);

  // Unlock checks
  checkUpgradeUnlocks();
  checkMilestones();

  // Sparkline
  if (state.tickCount % SPARKLINE_INTERVAL_TICKS === 0) {
    sparklineData.push(state.dataPoints);
    if (sparklineData.length > SPARKLINE_MAX) sparklineData.shift();
    drawSparkline();
  }

  // Autosave
  if (state.tickCount % AUTOSAVE_TICKS === 0) saveGame();

  // DOM update
  renderKPI();
  renderProducers();
  renderUpgrades();
  renderPrestige();
}

// ═══ CLICK HANDLER ═══

function handleClick(e) {
  const power = clickPower();
  state.dataPoints += power;
  state.lifetimeDP += power;

  // Bounce animation
  const el = document.getElementById('click-target');
  el.classList.remove('bounce');
  void el.offsetWidth; // reflow
  el.classList.add('bounce');

  // Float-up text
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
  state[resource] -= cost;
  state.owned[id]++;
  addLog(`Hired: ${p.name} (now ${state.owned[id]}) — cost ${fmt(cost)} ${resourceLabel(resource)}`, 'buy');
  checkUpgradeUnlocks();
  renderProducers();
  renderKPI();
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
  renderUpgrades();
  renderKPI();
}

// ═══ BUY RP UPGRADE ═══

function buyRPUpgrade(id) {
  const u = RP_UPGRADES[id];
  if (state.rpUpgrades[id]) return;
  if (state.reputationPoints < u.cost) return;
  state.reputationPoints -= u.cost;
  state.rpUpgrades[id] = true;
  addLog(`RP Upgrade: ${u.name}`, 'pres');
  showToast(`Permanent unlock: ${u.name}`, 'pres');
  renderPrestige();
  renderProducers();
  renderKPI();
  // Rebuild sidebar to show hidden producer if Platinum bought
  if (id === 2) buildProducerCards();
}

// ═══ PRESTIGE ═══

function doPrestige() {
  const rp = calcRPGain();
  if (rp < 5) return;
  state.reputationPoints += rp;
  addLog(`Fiscal Year Reset! Gained ${rp} Reputation Points.`, 'pres');
  showToast(`Year closed. +${rp} RP earned.`, 'pres');
  state.prestigeCount++;
  // Reset
  state.dataPoints = 0;
  state.insights = 0;
  state.revenue = 0;
  state.lifetimeDP = 0;
  state.lifetimeInsights = 0;
  state.lifetimeRevenue = 0;
  state.owned = new Array(PRODUCERS.length).fill(0);
  state.upgrades = new Array(UPGRADES.length).fill(false);
  state.upgradeVisible = new Array(UPGRADES.length).fill(false);
  sparklineData = [];
  milestonesFired.clear();
  saveGame();
  buildAll();
}

// ═══ UNLOCK CHECKS ═══

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
    if (unlocked) {
      state.upgradeVisible[i] = true;
      const card = document.getElementById(`upgrade-card-${i}`);
      if (card) card.style.display = '';
    }
  }
}

// ═══ MILESTONES ═══

const MILESTONES = [
  { id: 'm0', check: () => state.lifetimeDP >= 1000,    msg: 'Your practice is growing. 1K Data Points processed.', type: 'mile' },
  { id: 'm1', check: () => state.lifetimeDP >= 10000,   msg: '10K Data Points — clients are taking notice.', type: 'mile' },
  { id: 'm2', check: () => state.owned[4] >= 1,         msg: 'First Power BI Dashboard deployed! Insights unlocked.', type: 'mile' },
  { id: 'm3', check: () => state.lifetimeInsights >= 100, msg: '100 Insights generated — the board is impressed.', type: 'mile' },
  { id: 'm4', check: () => state.owned[7] >= 1,         msg: 'First ML Model in production! Revenue stream opened.', type: 'mile' },
  { id: 'm5', check: () => state.lifetimeRevenue >= 50,  msg: 'Revenue incoming! The business case is validated.', type: 'mile' },
  { id: 'm6', check: () => calcRPGain() >= 5,           msg: 'Ready for a Fiscal Year Reset. Check the Prestige tab.', type: 'mile' },
  { id: 'm7', check: () => state.prestigeCount >= 1,    msg: 'Year closed. Your reputation precedes you.', type: 'pres' },
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
    case 'scientific':   return fmtScientific(n);
    case 'engineering':  return fmtEngineering(n);
    case 'letters':      return fmtLetters(n);
    case 'full':         return fmtFull(n);
    default:             return fmtGeneral(n);
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
  const mantissa = n / Math.pow(10, engExp);
  return mantissa.toFixed(2) + 'e' + engExp;
}

function fmtLetters(n) {
  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  let val = n, idx = 0;
  while (val >= 1000 && idx < suffixes.length - 1) { val /= 1000; idx++; }
  if (idx === 0) return Math.floor(n).toString();
  return val.toFixed(2) + suffixes[idx];
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
  return { dataPoints: 'DP', insights: 'Insights', revenue: 'Revenue' }[r] || r;
}

// ═══ SPARKLINE CANVAS ═══

function drawSparkline() {
  const canvas = document.getElementById('sparkline');
  if (!canvas || sparklineData.length < 2) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const minV = Math.min(...sparklineData);
  const maxV = Math.max(...sparklineData);
  const range = maxV - minV || 1;

  const pts = sparklineData.map((v, i) => ({
    x: (i / (sparklineData.length - 1)) * W,
    y: H - ((v - minV) / range) * (H - 8) - 4,
  }));

  // Fill
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(63,185,80,0.35)');
  grad.addColorStop(1, 'rgba(63,185,80,0)');
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.strokeStyle = '#3fb950';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function resizeSparkline() {
  const canvas = document.getElementById('sparkline');
  if (!canvas) return;
  canvas.width = canvas.offsetWidth || 400;
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
  if (activityLog.length > 8) activityLog.pop();
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

// ═══ TOAST NOTIFICATIONS ═══

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ═══ DOM RENDER (KPI) ═══

let prevDPRate = 0;

function renderKPI() {
  const dpRate = calcTotalProduction('dataPoints');

  setText('kpi-dp-value', fmt(state.dataPoints));
  setText('kpi-dp-rate', `${fmtDec(dpRate)} DP/s`);

  const delta = dpRate - prevDPRate;
  const deltaEl = document.getElementById('kpi-dp-delta');
  if (deltaEl) {
    if (Math.abs(delta) > 0.001) {
      deltaEl.className = delta > 0 ? 'delta-up' : 'delta-down';
      deltaEl.textContent = (delta > 0 ? '▲' : '▼') + ' ' + fmtDec(Math.abs(delta)) + '/s';
    } else {
      deltaEl.textContent = '';
    }
  }
  prevDPRate = dpRate;

  setText('kpi-ins-value', fmt(state.insights));
  setText('kpi-rev-value', fmt(state.revenue));
  setText('kpi-rp-value', `${state.reputationPoints} RP`);
  setText('kpi-rp-sub', `${state.prestigeCount} reset${state.prestigeCount !== 1 ? 's' : ''}`);

  // Click area
  setText('click-value', fmt(state.dataPoints));
  setText('click-rate', `${fmtDec(dpRate)} DP/s · Click: +${fmt(clickPower())}`);
}

// ═══ DOM RENDER (PRODUCERS) ═══

function renderProducers() {
  for (const p of PRODUCERS) {
    if (p.hidden && !state.rpUpgrades[2]) continue;
    const card = document.getElementById(`producer-card-${p.id}`);
    if (!card) continue;

    const resource = p.costResource || 'dataPoints';
    const cost = producerCost(p);
    const canAfford = state[resource] >= cost;

    card.classList.toggle('unaffordable', !canAfford);

    const costEl = card.querySelector('.producer-cost');
    if (costEl) {
      costEl.textContent = `${fmt(cost)} ${resourceLabel(resource)}`;
      costEl.className = `producer-cost ${canAfford ? 'affordable' : 'cant-afford'}`;
    }

    const badge = card.querySelector('.owned-badge');
    if (badge) badge.textContent = state.owned[p.id];

    const starvEl = card.querySelector('.starvation-badge');
    if (starvEl) starvEl.style.display = starvationFlags[p.id] ? 'inline-block' : 'none';

    // Production stats
    const statsEl = document.getElementById(`pstat-${p.id}`);
    if (statsEl) {
      const owned = state.owned[p.id];
      if (owned === 0) {
        statsEl.innerHTML = '';
      } else {
        const totalRate = producerEffectiveRate(p);
        const perUnit = totalRate / owned;
        const typeTotal = calcTotalProduction(p.produces);
        const pct = typeTotal > 0 ? (totalRate / typeTotal * 100) : 0;
        const upgradeBoost = p.baseProduction > 0 ? (perUnit / p.baseProduction) : 1;
        const boostLabel = upgradeBoost > 1.005 ? ` <span class="stat-boost">(×${upgradeBoost.toFixed(1)} upgrades)</span>` : '';
        statsEl.innerHTML = `
          <div class="pstat-row">
            <span class="pstat-item">Per unit: <b>${fmtDec(perUnit)}/s</b>${boostLabel}</span>
            <span class="pstat-item">Total: <b class="pstat-total">${fmtDec(totalRate)}/s</b></span>
            <span class="pstat-item pstat-pct">${pct.toFixed(1)}% of ${resourceLabel(p.produces)}</span>
          </div>
        `;
      }
    }
  }
}

// ═══ DOM RENDER (UPGRADES) ═══

function renderUpgrades() {
  for (let i = 0; i < UPGRADES.length; i++) {
    const card = document.getElementById(`upgrade-card-${i}`);
    if (!card) continue;

    if (!state.upgradeVisible[i]) {
      card.style.display = 'none';
      continue;
    }
    card.style.display = '';

    const u = UPGRADES[i];
    const purchased = state.upgrades[i];
    const resource = u.cost.resource;
    const canAfford = !purchased && state[resource] >= u.cost.amount;

    card.classList.toggle('purchased', purchased);
    card.classList.toggle('unaffordable', !purchased && !canAfford);

    const costEl = card.querySelector('.upgrade-cost');
    if (costEl) {
      if (purchased) {
        costEl.textContent = 'Purchased';
        costEl.className = 'upgrade-cost';
      } else {
        costEl.textContent = `${fmt(u.cost.amount)} ${resourceLabel(resource)}`;
        costEl.className = `upgrade-cost ${canAfford ? 'affordable' : 'cant-afford'}`;
      }
    }

    const check = card.querySelector('.checkmark');
    if (check) check.style.display = purchased ? 'inline' : 'none';
  }

  // Show/hide section headers based on whether any card in group is visible
  for (const grp of UPGRADE_GROUPS) {
    const header = document.getElementById(grp.id);
    if (!header) continue;
    const anyVisible = grp.ids.some(i => state.upgradeVisible[i]);
    header.style.display = anyVisible ? '' : 'none';
  }
}

// ═══ DOM RENDER (PRESTIGE) ═══

function renderPrestige() {
  const rpGain = calcRPGain();
  const eligible = rpGain >= 5;

  setText('rp-gain-preview', eligible
    ? `+${rpGain} Reputation Points`
    : `Not enough Revenue yet (need ~400 lifetime Revenue)`);

  const btn = document.getElementById('prestige-btn');
  if (btn) btn.disabled = !eligible;
  setText('rp-available', state.reputationPoints);

  // RP upgrades
  for (let i = 0; i < RP_UPGRADES.length; i++) {
    const card = document.getElementById(`rp-upg-card-${i}`);
    if (!card) continue;
    const u = RP_UPGRADES[i];
    const purchased = state.rpUpgrades[i];
    const canAfford = !purchased && state.reputationPoints >= u.cost;

    card.classList.toggle('purchased', purchased);
    card.classList.toggle('unaffordable', !purchased && !canAfford);

    const costEl = card.querySelector('.rp-cost');
    if (costEl) {
      if (purchased) {
        costEl.textContent = 'Active';
        costEl.className = 'rp-cost';
      } else {
        costEl.textContent = `${u.cost} RP`;
        costEl.className = `rp-cost ${canAfford ? '' : 'cant-afford'}`;
      }
    }
  }
}

// ═══ BUILD DOM ═══

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
    <button id="settings-btn" title="Settings">⚙</button>
  `;
  document.getElementById('settings-btn').addEventListener('click', openSettings);
}

function buildMainPanel() {
  const main = document.getElementById('main-panel');
  main.innerHTML = `
    <div id="click-target">
      <div id="click-label">Data Ingestion — Click to Collect</div>
      <div id="click-value">0</div>
      <div id="click-rate">0 DP/s · Click: +1</div>
    </div>
    <div id="sparkline-wrap">
      <div id="sparkline-title">Data Points — Live Feed</div>
      <canvas id="sparkline"></canvas>
    </div>
    <div id="activity-wrap">
      <div id="activity-title">Activity Log</div>
      <div id="activity-log"></div>
    </div>
  `;
  document.getElementById('click-target').addEventListener('click', handleClick);
  resizeSparkline();
  window.addEventListener('resize', resizeSparkline);
}

function buildSidebar() {
  const sidebar = document.getElementById('shop-sidebar');
  sidebar.innerHTML = `
    <div id="shop-tabs">
      <div class="shop-tab active" data-tab="producers">Producers</div>
      <div class="shop-tab" data-tab="upgrades">Upgrades</div>
      <div class="shop-tab" data-tab="prestige">Prestige</div>
    </div>
    <div class="tab-panel active" id="tab-producers"></div>
    <div class="tab-panel" id="tab-upgrades"></div>
    <div class="tab-panel" id="tab-prestige">
      <div id="prestige-panel"></div>
    </div>
  `;

  // Tab switching
  sidebar.querySelectorAll('.shop-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      sidebar.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
      sidebar.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
  });

  buildProducerCards();
  buildUpgradeCards();
  buildPrestigePanel();
}

const TIER_LABELS = { 1: 'Tier 1', 2: 'Tier 2', 3: 'Tier 3' };

function buildProducerCards() {
  const container = document.getElementById('tab-producers');
  container.innerHTML = '';
  let lastTier = 0;
  for (const p of PRODUCERS) {
    if (p.hidden && !state.rpUpgrades[2]) continue;
    // Tier section header
    if (p.tier !== lastTier) {
      lastTier = p.tier;
      const header = document.createElement('div');
      header.className = `producer-tier-header tier${p.tier}`;
      header.textContent = TIER_LABELS[p.tier];
      container.appendChild(header);
    }
    const resource = p.costResource || 'dataPoints';
    const cost = producerCost(p);
    const canAfford = state[resource] >= cost;

    const card = document.createElement('div');
    card.className = `producer-card${canAfford ? '' : ' unaffordable'}`;
    card.id = `producer-card-${p.id}`;
    card.innerHTML = `
      <div class="producer-header">
        <div class="producer-name">${p.emoji} ${p.name} <span class="starvation-badge" style="display:none">Starved</span></div>
        <span class="owned-badge">${state.owned[p.id]}</span>
      </div>
      <div class="producer-desc">${p.desc}</div>
      <div class="producer-footer">
        <span class="producer-cost ${canAfford ? 'affordable' : 'cant-afford'}">${fmt(cost)} ${resourceLabel(resource)}</span>
        <span class="producer-rate">${fmtDec(p.baseProduction)} ${resourceLabel(p.produces)}/s base</span>
      </div>
      <div class="producer-stats" id="pstat-${p.id}"></div>
    `;
    card.addEventListener('click', () => buyProducer(p.id));
    container.appendChild(card);
  }
}

const UPGRADE_GROUPS = [
  { id: 'grp-t1',    label: 'Tier 1 — Data Collection', tag: 'T1', css: 'tag-tier1', ids: [0,1,2,3,4,5,6,7,8] },
  { id: 'grp-t2',    label: 'Tier 2 — Analytics',       tag: 'T2', css: 'tag-tier2', ids: [9,10,11,12,13] },
  { id: 'grp-t3',    label: 'Tier 3 — Revenue',         tag: 'T3', css: 'tag-tier3', ids: [14,15,16] },
  { id: 'grp-click', label: 'Click Power',               tag: 'Click', css: 'tag-click', ids: [17,18,19,20,21] },
];

function buildUpgradeCards() {
  const container = document.getElementById('tab-upgrades');
  container.innerHTML = '';

  for (const grp of UPGRADE_GROUPS) {
    // Section header — hidden until at least one card in group unlocks
    const header = document.createElement('div');
    header.className = 'upgrade-section-header';
    header.id = grp.id;
    header.style.display = 'none';
    header.innerHTML = `<span class="upg-tag ${grp.css}">${grp.tag}</span> ${grp.label}`;
    container.appendChild(header);

    for (const i of grp.ids) {
      const u = UPGRADES[i];
      const purchased = state.upgrades[i];
      const resource = u.cost.resource;
      const canAfford = !purchased && state[resource] >= u.cost.amount;

      const card = document.createElement('div');
      card.className = `upgrade-card${purchased ? ' purchased' : (!canAfford ? ' unaffordable' : '')}`;
      card.id = `upgrade-card-${i}`;
      card.dataset.group = grp.id;
      card.style.display = state.upgradeVisible[i] ? '' : 'none';
      card.innerHTML = `
        <div class="upgrade-header">
          <div class="upgrade-name">
            <span class="upg-tag ${grp.css}">${grp.tag}</span>
            ${u.name}
          </div>
          <span class="checkmark" style="display:${purchased ? 'inline' : 'none'}">✓</span>
        </div>
        <div class="upgrade-effect">${u.desc}</div>
        <div class="upgrade-cost ${purchased ? '' : (canAfford ? 'affordable' : 'cant-afford')}">
          ${purchased ? 'Purchased' : `${fmt(u.cost.amount)} ${resourceLabel(resource)}`}
        </div>
      `;
      card.addEventListener('click', () => buyUpgrade(i));
      container.appendChild(card);
    }
  }
}

function buildPrestigePanel() {
  const panel = document.getElementById('prestige-panel');
  const rpGain = calcRPGain();
  const eligible = rpGain >= 5;

  panel.innerHTML = `
    <div id="prestige-info">
      <h3>Fiscal Year Reset</h3>
      <p>Close the books on this fiscal year. Sacrifice all progress — staff, tools, data — in exchange for permanent <strong style="color:var(--gold)">Reputation Points</strong>.</p>
      <p>Reputation Points multiply all future earnings and unlock permanent upgrades.</p>
      <div id="rp-gain-preview">${eligible ? `+${rpGain} Reputation Points` : 'Not enough Revenue yet (need ~400 lifetime Revenue)'}</div>
      <button id="prestige-btn" ${eligible ? '' : 'disabled'}>Close Fiscal Year</button>
    </div>
    <div id="rp-shop-section">
      <h3>Reputation Shop — <span id="rp-available">${state.reputationPoints}</span> RP available</h3>
      ${RP_UPGRADES.map((u, i) => {
        const purchased = state.rpUpgrades[i];
        const canAfford = !purchased && state.reputationPoints >= u.cost;
        return `
          <div class="rp-upgrade-card${purchased ? ' purchased' : (!canAfford ? ' unaffordable' : '')}" id="rp-upg-card-${i}">
            <div class="rp-name">${u.name}</div>
            <div class="rp-desc">${u.desc}</div>
            <div class="rp-cost ${canAfford ? '' : (purchased ? '' : 'cant-afford')}">${purchased ? 'Active' : u.cost + ' RP'}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  document.getElementById('prestige-btn').addEventListener('click', () => {
    if (confirm('Close the fiscal year? All current progress will be reset in exchange for Reputation Points.')) {
      doPrestige();
    }
  });

  for (let i = 0; i < RP_UPGRADES.length; i++) {
    document.getElementById(`rp-upg-card-${i}`).addEventListener('click', () => buyRPUpgrade(i));
  }
}

// ═══ SETTINGS MODAL ═══

function buildSettingsModal() {
  const existing = document.getElementById('settings-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'settings-overlay';
  overlay.style.display = 'none';
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
          <label class="settings-option"><input type="radio" name="numformat" value="letters"><span>Letters <em>1.23K / Qa / Qi / Sx…</em></span></label>
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

  // Close button
  overlay.querySelector('#settings-close').addEventListener('click', closeSettings);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSettings(); });

  // Number format radios
  overlay.querySelectorAll('input[name="numformat"]').forEach(radio => {
    if (radio.value === settings.numberFormat) radio.checked = true;
    radio.addEventListener('change', () => {
      settings.numberFormat = radio.value;
      saveSettings();
    });
  });

  // Theme buttons
  overlay.querySelectorAll('.settings-theme-btn').forEach(btn => {
    if (btn.dataset.theme === settings.theme) btn.classList.add('active');
    btn.addEventListener('click', () => {
      settings.theme = btn.dataset.theme;
      saveSettings();
      applyTheme();
      overlay.querySelectorAll('.settings-theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === settings.theme));
    });
  });

  // Accent swatches
  overlay.querySelectorAll('.accent-swatch').forEach(btn => {
    if (btn.dataset.accent === settings.accent) btn.classList.add('active');
    btn.addEventListener('click', () => {
      settings.accent = btn.dataset.accent;
      saveSettings();
      applyTheme();
      overlay.querySelectorAll('.accent-swatch').forEach(b => b.classList.toggle('active', b.dataset.accent === settings.accent));
    });
  });

  // Wipe button
  overlay.querySelector('#wipe-btn').addEventListener('click', () => {
    if (confirm('Wipe ALL game data and start over? This cannot be undone.')) {
      wipeData();
      closeSettings();
    }
  });
}

function openSettings() {
  document.getElementById('settings-overlay').style.display = 'flex';
}

function closeSettings() {
  document.getElementById('settings-overlay').style.display = 'none';
}

function wipeData() {
  localStorage.removeItem(SAVE_KEY);
  state = defaultState();
  sparklineData = [];
  activityLog = [];
  starvationFlags = new Array(PRODUCERS.length).fill(false);
  milestonesFired.clear();
  gameStartTime = Date.now();
  addLog('Save wiped. Fresh start.', 'info');
  buildAll();
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
  buildMainPanel();
  buildSidebar();
  buildSettingsModal();
  renderKPI();
  renderProducers();
  renderUpgrades();
  renderPrestige();
  renderActivityLog();
}

// ═══ INIT ═══

loadSettings();
applyTheme();
loadGame();
gameStartTime = Date.now();
addLog('You opened a new spreadsheet. Time to build a data empire.', 'info');
buildAll();
setInterval(tick, TICK_MS);
