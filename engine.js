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
    reputationPoints: 0,
    prestigeCount: 0,
    lifetimeDP: 0,
    lifetimeInsights: 0,
    contracts: 0,
    lifetimeContracts: 0,
    owned: new Array(PRODUCERS.length).fill(0),
    upgrades: new Array(UPGRADES.length).fill(false),
    upgradeVisible: new Array(UPGRADES.length).fill(false),
    conquered: new Array(TERRITORIES.length).fill(false),
    worldUpgrades: new Array(WORLD_UPGRADES.length).fill(false),
    questsCompleted: new Array(QUESTS.length).fill(false),
    achievements: new Array(ACHIEVEMENTS.length).fill(false),
    treeNodes: new Array(TREE_NODES_DEF.length).fill(false),
    inChallenge: false,
    challengeId: -1,
    goalMet: false,
    totalClicks: 0,
    autoClickerEnabled: false,
    autoClickerRate: 1, // clicks per second
    lastSaveTime: Date.now(),
    tickCount: 0,
  };
}

let state = defaultState();
let sparklineData = [];
let activityLog = [];
let starvationFlags = new Array(PRODUCERS.length).fill(false);
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
    conquered: [...state.conquered],
    worldUpgrades: [...state.worldUpgrades],
    achievements: [...state.achievements],
    questsCompleted: [...state.questsCompleted],
    treeNodes: [...state.treeNodes],
    unlockedPanels: [...panelsUnlocked],
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
    state.conquered = padArray(state.conquered, TERRITORIES.length, false);
    state.worldUpgrades = padArray(state.worldUpgrades, WORLD_UPGRADES.length, false);
    state.achievements = padArray(state.achievements, ACHIEVEMENTS.length, false);
    state.questsCompleted = padArray(state.questsCompleted, QUESTS.length, false);
    state.treeNodes = padArray(state.treeNodes, TREE_NODES_DEF.length, false);

    // Re-populate panel unlocks from saved data
    if (saved.unlockedPanels) {
      for (const key of saved.unlockedPanels) panelsUnlocked.add(key);
    }

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

function producerCostN(p, n) {
  let total = 0;
  for (let i = 0; i < n; i++) {
    total += p.baseCost * Math.pow(p.costMult, state.owned[p.id] + i);
  }
  return total;
}

function producerMaxAffordable(p) {
  const resource = p.costResource || 'dataPoints';
  let budget = state[resource];
  let count = 0;
  let cost = producerCost(p);
  while (budget >= cost) {
    budget -= cost;
    count++;
    cost = p.baseCost * Math.pow(p.costMult, state.owned[p.id] + count);
  }
  return count;
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
  if (state.treeNodes[2] && p.tier === 2) mult *= 2;              // Platinum Partner: T2 ×2
  if (state.treeNodes[3] && p.tier === 1) mult *= 3;              // Automation Expert: T1 ×3
  if (state.treeNodes[4]) mult *= 2;                              // Enterprise License: all ×2
  if (state.treeNodes[5]) mult *= 2;                              // AI Automation: all ×2
  if (state.treeNodes[7] && p.tier === 2) mult *= 5;             // Market Leader: T2 ×5
  if (state.treeNodes[8]) mult *= 10;                             // Data Empire: all ×10

  // World upgrade effects (only DP-type boosts affect producers)
  for (const wu of WORLD_UPGRADES) {
    if (state.worldUpgrades[wu.id] && wu.type === 'dp') mult *= wu.mult;
  }

  // Territory conquest boosts
  for (const t of TERRITORIES) {
    if (!state.conquered[t.idx] || !t.boost) continue;
    if (t.boost.type === 'producerMultiplier' && t.boost.producerId === p.id) mult *= t.boost.multiplier;
    if (t.boost.type === 'allTierMultiplier' && p.tier === t.boost.tier) mult *= t.boost.multiplier;
  }

  // Quest reward effects (permanent)
  if (state.questsCompleted[0] && p.tier === 1) mult *= 2;       // Startup Mode reward: T1 ×2
  if (state.questsCompleted[2] && p.tier === 1) mult *= 2;       // No Shortcuts reward: T1 ×2
  if (state.questsCompleted[3] && p.tier === 2) mult *= 2;       // Insights Rush reward: T2 ×2

  // Achievement effects
  for (let i = 0; i < ACHIEVEMENTS.length; i++) {
    if (!state.achievements[i]) continue;
    applyEffectToProducer(ACHIEVEMENTS[i].effect, p.id, (m) => { mult *= m; });
  }

  // Quest 4 restriction: no T1 upgrades apply
  const skipT1Upgrades = state.inChallenge && state.challengeId === 3;

  // Per-producer upgrade multipliers
  for (const u of UPGRADES) {
    if (!state.upgrades[u.id]) continue;
    if (skipT1Upgrades) {
      const grp = UPGRADE_GROUPS.find(g => g.ids.includes(u.id));
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
    total += producerEffectiveRate(p);
  }
  return total;
}

function clickPower() {
  let power = 1;
  if (state.treeNodes[1]) power *= 5;            // Click Mastery ×5
  if (state.treeNodes[5]) power *= 2;            // AI Automation click ×2
  if (state.questsCompleted[1]) power *= 3;      // Analyst Only reward ×3
  // Territory conquest click boosts
  for (const t of TERRITORIES) {
    if (state.conquered[t.idx] && t.boost && t.boost.type === 'clickMultiplier') {
      power *= t.boost.multiplier;
    }
  }
  for (const u of UPGRADES) {
    if (!state.upgrades[u.id]) continue;
    gatherClickMultiplier(u.effect, (m) => { power *= m; });
  }
  for (let i = 0; i < ACHIEVEMENTS.length; i++) {
    if (!state.achievements[i]) continue;
    gatherClickMultiplier(ACHIEVEMENTS[i].effect, (m) => { power *= m; });
  }
  power *= (1 + state.insights); // Insights multiplier
  // Click = % of production upgrades
  let pctBonus = 0;
  for (const u of UPGRADES) {
    if (!state.upgrades[u.id]) continue;
    if (u.effect && u.effect.type === 'clickPercentOfProduction') {
      pctBonus += u.effect.percent;
    }
  }
  if (pctBonus > 0) {
    const dpRate = calcTotalProduction('dataPoints') * (1 + state.insights);
    power += dpRate * (pctBonus / 100);
  }
  // 150-tier achievements: add producer production to click
  const insightsMult = 1 + state.insights;
  for (const a of ACHIEVEMENTS) {
    if (!state.achievements[a.id]) continue;
    if (a.effect && a.effect.type === 'clickPercentOfProducerProduction') {
      const p = PRODUCERS[a.effect.producerId];
      if (p) power += producerEffectiveRate(p) * insightsMult;
    }
  }
  return power;
}

function gatherClickMultiplier(effect, cb) {
  if (!effect) return;
  if (effect.type === 'clickMultiplier') cb(effect.multiplier);
  if (effect.type === 'combo') for (const e of effect.effects) gatherClickMultiplier(e, cb);
}

function calcRPGain() {
  return Math.floor(Math.pow(state.lifetimeInsights / 100, 0.6) * 5);
}

function calcContractsRate() {
  let rate = TERRITORIES
    .filter(t => state.conquered[t.idx])
    .reduce((s, t) => s + t.rate, 0);
  // World upgrade contracts boosts
  for (const wu of WORLD_UPGRADES) {
    if (state.worldUpgrades[wu.id] && wu.type === 'contracts') rate *= wu.mult;
  }
  if (state.treeNodes[6]) rate *= 3; // Global Expansion: contracts ×3
  // Territory contracts boosts
  for (const t of TERRITORIES) {
    if (state.conquered[t.idx] && t.boost && t.boost.type === 'contractsMultiplier') {
      rate *= t.boost.multiplier;
    }
  }
  // Upgrade contracts boosts
  for (const u of UPGRADES) {
    if (state.upgrades[u.id] && u.effect && u.effect.type === 'contractsMultiplier') {
      rate *= u.effect.multiplier;
    }
  }
  return rate;
}

function getConqueredSet() {
  return new Set(TERRITORIES.filter(t => state.conquered[t.idx]).map(t => t.id));
}

function conquerTerritory(idx) {
  const t = TERRITORIES[idx];
  if (state.conquered[idx]) return;
  const totalOwned = state.owned.reduce((s, n) => s + n, 0);
  if (totalOwned < t.need) {
    showToast(`Need ${t.need} producers (you have ${totalOwned})`, 'info');
    return;
  }
  state.conquered[idx] = true;
  // Apply territory boost
  if (t.boost) {
    if (t.boost.type === 'instantContracts') {
      state.contracts += t.boost.amount;
      state.lifetimeContracts += t.boost.amount;
    }
    addLog(`Territory conquered: ${t.name}! +${t.rate}/s Contracts. Bonus: ${t.boost.desc}`, 'mile');
    showToast(`${t.emoji} ${t.name} conquered! ${t.boost.desc}`, 'mile');
  } else {
    addLog(`Territory conquered: ${t.name}! +${t.rate}/s Contracts`, 'mile');
    showToast(`${t.emoji} ${t.name} conquered!`, 'mile');
  }
  renderWorldMap();
  checkPanelUnlocks();
}

// ═══ TICK ═══

function tick() {
  state.tickCount++;

  // Tier 1: produce Data Points (multiplied by Insights)
  const insightsMult = 1 + state.insights;
  for (const p of PRODUCERS) {
    if (p.tier !== 1) continue;
    if (state.owned[p.id] === 0) continue;
    const produced = producerEffectiveRate(p) * DT * insightsMult;
    state.dataPoints += produced;
    state.lifetimeDP += produced;
  }

  // Tier 2: produce Insights (passive, no consumption)
  for (const p of PRODUCERS) {
    if (p.tier !== 2) continue;
    if (state.owned[p.id] === 0) continue;
    const produced = producerEffectiveRate(p) * DT;
    state.insights += produced;
    state.lifetimeInsights += produced;
  }

  // Contracts
  const contractsEarned = calcContractsRate() * DT;
  state.contracts += contractsEarned;
  state.lifetimeContracts += contractsEarned;

  // Clamp negatives
  state.dataPoints = Math.max(0, state.dataPoints);
  state.insights   = Math.max(0, state.insights);

  checkUpgradeUnlocks();
  checkAchievements();
  checkPanelUnlocks();

  if (state.inChallenge) checkQuestGoal();

  if (state.tickCount % SPARKLINE_INTERVAL_TICKS === 0) {
    sparklineData.push(state.dataPoints);
    if (sparklineData.length > SPARKLINE_MAX) sparklineData.shift();
    drawSparkline();
  }

  // Autoclicker (if unlocked via prestige)
  if (state.autoClickerEnabled) {
    const power = clickPower();
    const autoDP = power * state.autoClickerRate * DT;
    state.dataPoints += autoDP;
    state.lifetimeDP += autoDP;
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
  state.totalClicks++;
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

function buyProducer(id, amount) {
  const p = PRODUCERS[id];
  const resource = p.costResource || 'dataPoints';
  let count = amount === 'max' ? producerMaxAffordable(p) : amount;
  if (count <= 0) return;

  // Quest restrictions
  if (state.inChallenge) {
    const totalOwned = state.owned.reduce((s, n) => s + n, 0);
    if (state.challengeId === 0) {
      count = Math.min(count, 5 - totalOwned);
      if (count <= 0) { showToast('Quest restriction: Max 5 producers!', 'info'); return; }
    }
  }

  const totalCost = producerCostN(p, count);
  if (state[resource] < totalCost) {
    count = producerMaxAffordable(p);
    if (count <= 0) return;
  }
  const finalCost = producerCostN(p, count);
  state[resource] -= finalCost;
  state.owned[id] += count;
  addLog(`Hired: ${count}× ${p.name} (now ${state.owned[id]}) — ${fmt(finalCost)} ${resourceLabel(resource)}`, 'buy');
  checkUpgradeUnlocks();
}

// ═══ BUY UPGRADE ═══

function buyUpgrade(id) {
  const u = UPGRADE_MAP[id];
  if (!u || state.upgrades[id]) return;
  const resource = u.cost.resource;
  if (state[resource] < u.cost.amount) return;
  state[resource] -= u.cost.amount;
  state.upgrades[id] = true;
  addLog(`Researched: ${u.name}`, 'buy');
  showToast(`Unlocked: ${u.name}`, 'mile');
}

// ═══ BUY WORLD UPGRADE ═══

function buyWorldUpgrade(id) {
  const u = WORLD_UPGRADE_MAP[id];
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
  state.contracts = 0;
  state.lifetimeDP = 0;
  state.lifetimeInsights = 0;
  state.lifetimeContracts = 0;
  state.owned = new Array(PRODUCERS.length).fill(0);
  state.upgrades = new Array(UPGRADES.length).fill(false);
  state.upgradeVisible = new Array(UPGRADES.length).fill(false);
  state.conquered = new Array(TERRITORIES.length).fill(false);
  state.worldUpgrades = new Array(WORLD_UPGRADES.length).fill(false);
  state.inChallenge = false;
  state.challengeId = -1;
  state.goalMet = false;
  challengeSnapshot = null;
  sparklineData = [];

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
  for (const c of UNLOCK_ORDER) {
    if (panelsUnlocked.has(c.key)) continue;
    // Auto-unlock (no cost): unlock when ready
    if (!c.cost && c.ready()) {
      panelsUnlocked.add(c.key);
      unlockPanelsByKey(c.key);
      updateLockedPanelVisibility();
      renderKPI();
    }
    break; // Only process the next unlock in order
  }
  updateLockedPanelVisibility();
  updateLockedProgress();
}

function tryPurchaseUnlock(key) {
  const entry = UNLOCK_ORDER.find(c => c.key === key);
  if (!entry || entry.cost === null) return;
  if (panelsUnlocked.has(key)) return;
  if (!entry.ready()) return;
  if (entry.cost > 0 && state.dataPoints < entry.cost) {
    showToast(`Need ${fmt(entry.cost)} DP to unlock`, 'info');
    return;
  }
  if (entry.cost > 0) state.dataPoints -= entry.cost;
  panelsUnlocked.add(key);
  unlockPanelsByKey(key);
  updateLockedPanelVisibility();
  renderKPI();
  addLog(`Unlocked: ${entry.label}!${entry.cost > 0 ? ` (−${fmt(entry.cost)} DP)` : ''}`, 'mile');
  showToast(`${entry.label} unlocked!`, 'mile');
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

// ═══ ACHIEVEMENT CHECKS ═══

function checkAchievements() {
  for (let i = 0; i < ACHIEVEMENTS.length; i++) {
    if (state.achievements[i]) continue;
    if (ACHIEVEMENTS[i].check()) {
      state.achievements[i] = true;
      addLog(`Achievement: ${ACHIEVEMENTS[i].name} — ${ACHIEVEMENTS[i].reward}`, 'mile');
      showToast(`Achievement: ${ACHIEVEMENTS[i].name}!`, 'mile');
    }
  }
}

// ═══ UPGRADE UNLOCK CHECKS ═══

function checkUpgradeUnlocks() {
  for (const u of UPGRADES) {
    const i = u.id;
    if (state.upgradeVisible[i]) continue;
    // Territory-gated upgrades: only visible after conquering the territory
    if (u.unlock && u.unlock.type === 'territory') {
      if (!state.conquered[u.unlock.territoryIdx]) continue;
    }
    const resource = u.cost.resource;
    const threshold = u.cost.amount * 0.9;
    if (state[resource] >= threshold || state.lifetimeDP >= threshold) {
      state.upgradeVisible[i] = true;
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
  return { dataPoints: 'DP', insights: 'Insights', contracts: 'Contracts' }[r] || r;
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

// ═══ UPGRADE FILTER ═══

const upgradeFilters = {}; // listId → 'all' | 'bought' | 'available'

function cycleUpgradeFilter(listId, btnId) {
  const modes = ['all', 'available', 'bought'];
  const current = upgradeFilters[listId] || 'all';
  const next = modes[(modes.indexOf(current) + 1) % modes.length];
  upgradeFilters[listId] = next;
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.textContent = next === 'all' ? 'All' : next === 'available' ? 'On Sale' : 'Bought';
  }
  applyUpgradeFilter(listId);
}

function applyUpgradeFilter(listId) {
  const container = document.getElementById(listId);
  if (!container) return;
  const mode = upgradeFilters[listId] || 'all';
  container.querySelectorAll('.upg-pill').forEach(el => {
    const purchased = el.classList.contains('purchased');
    if (mode === 'all') el.style.display = '';
    else if (mode === 'bought') el.style.display = purchased ? '' : 'none';
    else if (mode === 'available') el.style.display = purchased ? 'none' : '';
  });
}
