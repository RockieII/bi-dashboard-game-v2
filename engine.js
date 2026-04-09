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
    insightMilestones: new Array(typeof INSIGHT_MILESTONES !== 'undefined' ? INSIGHT_MILESTONES.length : 8).fill(false),
    prestigeNodes: 0,
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
let activityLog = [];
let starvationFlags = new Array(PRODUCERS.length).fill(false);
let totalClickDP = 0;
let sessionStart = Date.now();
let challengeSnapshot = null;
let challengeSnapshotPanels = null;

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
    insightMilestones: [...(state.insightMilestones || [])],
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
    state.insightMilestones = padArray(state.insightMilestones || [], INSIGHT_MILESTONES.length, false);
    state.questsCompleted = padArray(state.questsCompleted, QUESTS.length, false);
    state.treeNodes = padArray(state.treeNodes, TREE_NODES_DEF.length, false);

    // Re-populate panel unlocks from saved data
    if (saved.unlockedPanels) {
      for (const key of saved.unlockedPanels) panelsUnlocked.add(key);
    }
    // Backfill mastery unlock for saves predating the phase system
    if (state.conquered.every(Boolean)) panelsUnlocked.add('mastery');

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

function insightMultiplier() {
  return Math.pow(1 + state.insights, 1.5);
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
  // New tree node effects (spine + branches)
  if (state.treeNodes[0]) mult *= 1.5;                             // Silver Cert: all ×1.5
  if (state.treeNodes[8]) mult *= 10;                              // Data Empire: all ×10

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
    // Quest "Insights Rush" restriction: skip all T1-phase upgrades
    if (skipT1Upgrades && (u.phase === 't1' || u.phase === 'mastery')) continue;
    applyEffectToProducer(u.effect, p.id, (m) => { mult *= m; });
  }

  // Insight milestone effects (doubled by T2 Accelerator node 7)
  if (state.insightMilestones) {
    const msBoost = state.treeNodes[7] ? 2 : 1;
    for (let i = 0; i < INSIGHT_MILESTONES.length; i++) {
      if (!state.insightMilestones[i]) continue;
      const eff = INSIGHT_MILESTONES[i].effect;
      if (eff.type === 'combo') {
        for (const e of eff.effects) applyEffectToProducer(e, p.id, (m) => { mult *= Math.pow(m, msBoost); });
      } else {
        applyEffectToProducer(eff, p.id, (m) => { mult *= Math.pow(m, msBoost); });
      }
    }
  }

  // Softcap: diminishing returns on extreme multipliers
  const scFactor = state.treeNodes[5] ? 100 : 1; // Softcap Breaker node
  const sc1 = 1e6 * scFactor;
  const sc2 = 1e12 * scFactor;
  if (mult > sc1) mult = sc1 * Math.pow(mult / sc1, 0.5);
  if (mult > sc2) mult = sc2 * Math.pow(mult / sc2, 0.3);

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
  if (state.treeNodes[2]) { power *= 5; }         // Turbo Click: click ×5
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
  // Insight milestone click effects
  if (state.insightMilestones) {
    for (let i = 0; i < INSIGHT_MILESTONES.length; i++) {
      if (!state.insightMilestones[i]) continue;
      const eff = INSIGHT_MILESTONES[i].effect;
      if (eff.type === 'combo') {
        for (const e of eff.effects) gatherClickMultiplier(e, (m) => { power *= m; });
      } else {
        gatherClickMultiplier(eff, (m) => { power *= m; });
      }
    }
  }
  power *= insightMultiplier(); // Insights multiplier
  // Click = % of production upgrades
  let pctBonus = 0;
  for (const u of UPGRADES) {
    if (!state.upgrades[u.id]) continue;
    if (u.effect && u.effect.type === 'clickPercentOfProduction') {
      pctBonus += u.effect.percent;
    }
  }
  if (pctBonus > 0) {
    const dpRate = calcTotalProduction('dataPoints') * insightMultiplier();
    power += dpRate * (pctBonus / 100);
  }
  // 150-tier achievements: add producer production to click
  const insightsMult = insightMultiplier();
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
  // Legacy — kept for compatibility, returns 0. Use canPrestige() instead.
  return 0;
}

function canPrestige() {
  const n = state.prestigeCount;
  const dpReq = 1e10 * Math.pow(100, n);
  const insReq = 0.1 * Math.pow(10, n);
  return state.lifetimeDP >= dpReq && state.lifetimeInsights >= insReq;
}

function getPrestigeRequirements() {
  const n = state.prestigeCount;
  return { dpReq: 1e10 * Math.pow(100, n), insReq: 0.1 * Math.pow(10, n) };
}

function calcContractsRate() {
  let rate = TERRITORIES
    .filter(t => state.conquered[t.idx])
    .reduce((s, t) => s + t.rate, 0);
  // World upgrade contracts boosts
  for (const wu of WORLD_UPGRADES) {
    if (state.worldUpgrades[wu.id] && wu.type === 'contracts') rate *= wu.mult;
  }
  if (state.treeNodes[4]) rate *= 5; // Contract Engine node
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
  // Mastery phase unlock: all 6 territories conquered
  if (state.conquered.every(Boolean) && !panelsUnlocked.has('mastery')) {
    panelsUnlocked.add('mastery');
    addLog('Mastery upgrades unlocked! Master your craft.', 'mile');
    showToast('Mastery tier unlocked!', 'mile');
  }
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
  const insightsMult = insightMultiplier();
  for (const p of PRODUCERS) {
    if (p.tier !== 1) continue;
    if (state.owned[p.id] === 0) continue;
    const produced = producerEffectiveRate(p) * DT * insightsMult;
    state.dataPoints += produced;
    state.lifetimeDP += produced;
  }

  // Tier 2: produce Insights (passive, no consumption)
  const insightGainMult = state.treeNodes[3] ? 3 : 1; // Insight Boost node
  for (const p of PRODUCERS) {
    if (p.tier !== 2) continue;
    if (state.owned[p.id] === 0) continue;
    const produced = producerEffectiveRate(p) * DT * insightGainMult;
    state.insights += produced;
    state.lifetimeInsights += produced;
  }

  // Check insight milestones
  checkInsightMilestones();

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

  // Autoclicker (via prestige tree node 1)
  if (state.treeNodes[1]) {
    const power = clickPower();
    let rate = 1; // 1 click/s base
    if (state.treeNodes[2]) rate *= 10; // Turbo Click: ×10
    const autoDP = power * rate * DT;
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
  applyTreeNodeStartBonus(id);
  addLog(`Skill unlocked: ${node.name}`, 'pres');
  showToast(`Permanent: ${node.name}`, 'pres');
  closeNodePopup();
  renderPrestigeTree();
  renderKPI();
}

// One-shot start bonuses for tree nodes that grant resources on activation.
// Called when a node is activated (mid-run grant) AND on prestige reset for
// auto-activated nodes. Safe to call multiple times: each invocation grants once.
function applyTreeNodeStartBonus(id) {
  if (id === 4) {
    // Contract Engine: start with 100 contracts
    state.contracts += 100;
    state.lifetimeContracts += 100;
  }
  if (id === 8) {
    // Data Empire: start with 1e6 DP
    state.dataPoints += 1e6;
    state.lifetimeDP += 1e6;
  }
}

// ═══ PRESTIGE ═══

function doPrestige() {
  if (!canPrestige()) return;
  state.prestigeCount++;
  state.prestigeNodes = (state.prestigeNodes || 0) + 1;
  addLog(`Fiscal Year Reset! Earned node point #${state.prestigeNodes}.`, 'pres');
  showToast(`Year closed. +1 node point earned.`, 'pres');

  // Reset everything except prestige progress and quests
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
  state.achievements = new Array(ACHIEVEMENTS.length).fill(false);
  state.insightMilestones = new Array(INSIGHT_MILESTONES ? INSIGHT_MILESTONES.length : 0).fill(false);
  state.inChallenge = false;
  state.challengeId = -1;
  state.goalMet = false;
  challengeSnapshot = null;
  totalClickDP = 0;

  // Deactivate all tree nodes — player re-picks on prestige screen
  state.treeNodes = new Array(TREE_NODES_DEF.length).fill(false);

  // First prestige: auto-activate node 0
  if (state.prestigeNodes === 1) {
    state.treeNodes[0] = true;
    applyTreeNodeStartBonus(0);
  }

  // Re-lock panels except t1, click, prestige
  panelsUnlocked.clear();
  panelsUnlocked.add('t1');
  panelsUnlocked.add('click');
  panelsUnlocked.add('prestige');

  saveGame();
  buildDashboard();
}

// ═══ QUEST SYSTEM ═══

function enterChallenge(id) {
  if (state.inChallenge) return;
  if (state.questsCompleted[id]) return;
  if (id > 0 && !state.questsCompleted[id - 1]) return;

  // Snapshot EVERYTHING for restore on exit/claim
  challengeSnapshot = JSON.parse(JSON.stringify(state));
  challengeSnapshotPanels = [...panelsUnlocked];

  // Full fresh reset — like a brand new game
  const keepQuests   = [...state.questsCompleted];
  const keepPrestige = state.prestigeCount;
  const keepNodes    = state.prestigeNodes || 0;

  state = defaultState();
  state.questsCompleted  = keepQuests;
  state.prestigeCount    = keepPrestige;
  state.prestigeNodes    = keepNodes;
  // No tree nodes active, no achievements, no upgrades, no territories
  state.inChallenge      = true;
  state.challengeId      = id;
  state.goalMet          = false;

  activityLog = [];
  starvationFlags = new Array(PRODUCERS.length).fill(false);
  totalClickDP = 0;

  // Lock all panels except T1, Click, Quests
  panelsUnlocked.clear();
  panelsUnlocked.add('t1');
  panelsUnlocked.add('click');
  panelsUnlocked.add('quests');

  addLog(`Quest entered: ${QUESTS[id].name}`, 'mile');
  showToast(`Challenge started: ${QUESTS[id].name}`, 'mile');
  buildDashboard();
}

function exitChallenge() {
  if (!state.inChallenge || !challengeSnapshot) return;
  const id = state.challengeId;
  state = JSON.parse(JSON.stringify(challengeSnapshot));
  challengeSnapshot = null;
  if (challengeSnapshotPanels) {
    panelsUnlocked.clear();
    for (const k of challengeSnapshotPanels) panelsUnlocked.add(k);
    challengeSnapshotPanels = null;
  }
  starvationFlags = new Array(PRODUCERS.length).fill(false);
  addLog(`Quest exited: ${QUESTS[id].name} (no reward)`, 'info');
  showToast('Challenge exited. No reward.', 'info');
  buildDashboard();
}

function claimQuest() {
  if (!state.inChallenge || !state.goalMet || !challengeSnapshot) return;
  const id = state.challengeId;
  state = JSON.parse(JSON.stringify(challengeSnapshot));
  challengeSnapshot = null;
  if (challengeSnapshotPanels) {
    panelsUnlocked.clear();
    for (const k of challengeSnapshotPanels) panelsUnlocked.add(k);
    challengeSnapshotPanels = null;
  }
  state.questsCompleted[id] = true;
  state.inChallenge = false;
  state.challengeId = -1;
  state.goalMet = false;
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
    // Auto-unlock (cost === null): unlock when ready. cost === 0 still requires click.
    if (c.cost === null && c.ready()) {
      panelsUnlocked.add(c.key);
      unlockPanelsByKey(c.key);
      updateLockedPanelVisibility();
      renderKPI();
    }
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

// ═══ INSIGHT MILESTONE CHECKS ═══

function checkInsightMilestones() {
  if (typeof INSIGHT_MILESTONES === 'undefined') return;
  if (!state.insightMilestones) state.insightMilestones = new Array(INSIGHT_MILESTONES.length).fill(false);
  for (let i = 0; i < INSIGHT_MILESTONES.length; i++) {
    if (state.insightMilestones[i]) continue;
    if (state.insights >= INSIGHT_MILESTONES[i].threshold) {
      state.insightMilestones[i] = true;
      addLog(`Insight Milestone: ${INSIGHT_MILESTONES[i].reward}`, 'mile');
      showToast(`Insight: ${INSIGHT_MILESTONES[i].reward}`, 'mile');
    }
  }
}

// ═══ UPGRADE UNLOCK CHECKS ═══

// Map cost.resource -> lifetime field name for lifetimeEarned unlock checks
const LIFETIME_FIELD = { dataPoints: 'lifetimeDP', insights: 'lifetimeInsights', contracts: 'lifetimeContracts' };

function checkUpgradeUnlocks() {
  for (const u of UPGRADES) {
    const i = u.id;
    let visible = true;

    // Phase gate: 't1' is always on; others require panelsUnlocked membership
    if (u.phase && u.phase !== 't1' && !panelsUnlocked.has(u.phase)) {
      visible = false;
    }

    // Condition gate (all unlock types honored — no 90% cost threshold)
    if (visible && u.unlock) {
      switch (u.unlock.type) {
        case 'owned':
          if ((state.owned[u.unlock.producerId] || 0) < u.unlock.count) visible = false;
          break;
        case 'lifetimeEarned': {
          const field = LIFETIME_FIELD[u.unlock.resource];
          if (!field || (state[field] || 0) < u.unlock.amount) visible = false;
          break;
        }
        case 'territory':
          if (!state.conquered[u.unlock.territoryIdx]) visible = false;
          break;
      }
    }

    state.upgradeVisible[i] = visible;
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
