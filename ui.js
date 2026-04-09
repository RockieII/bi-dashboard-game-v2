// ═══ KPI RENDER ═══

let prevDPRate = 0;

function renderKPI() {
  const dpRate = calcTotalProduction('dataPoints');

  setText('kpi-dp-value', fmtRaw(state.dataPoints));
  setText('kpi-dp-rate', `${fmtDec(dpRate)} DP/s`);

  const delta = dpRate - prevDPRate;
  const deltaEl = document.getElementById('kpi-dp-delta');
  if (deltaEl && Math.abs(delta) > 0.001) {
    deltaEl.className = delta > 0 ? 'delta-up' : 'delta-down';
    deltaEl.textContent = (delta > 0 ? '▲' : '▼') + ' ' + fmtDec(Math.abs(delta)) + '/s';
  } else if (deltaEl) deltaEl.textContent = '';
  prevDPRate = dpRate;

  // Section-based KPI visibility
  const kpiMap = [
    { id: 'kpi-contracts-card', key: 'wm' },
    { id: 'kpi-ins-card',      key: 't2' },
    // quests deferred for now
    { id: 'kpi-rp-card',       key: 'prestige' },
  ];
  for (const k of kpiMap) {
    const el = document.getElementById(k.id);
    if (el) el.style.display = panelsUnlocked.has(k.key) ? '' : 'none';
  }

  setText('kpi-contracts-value', fmtRaw(state.contracts));
  setText('kpi-contracts-rate', `${fmtDec(calcContractsRate())}/s`);
  const insMult = 1 + state.insights;
  setText('kpi-ins-value', '×' + (insMult >= 1000 ? fmt(insMult) : insMult.toFixed(3)));
  setText('kpi-ins-rate', `+${fmtDec(calcTotalProduction('insights'))}/s`);
  const questsDone = state.questsCompleted.filter(Boolean).length;
  setText('kpi-quests-value', `${questsDone}/${QUESTS.length}`);
  setText('kpi-rp-value', `${state.reputationPoints} RP`);
  setText('kpi-rp-sub', `${state.prestigeCount} reset${state.prestigeCount !== 1 ? 's' : ''}`);

  // Click area
  setText('click-value', fmtRaw(state.dataPoints));
  setText('click-rate', `${fmtDec(dpRate)} DP/s · Click: +${fmt(clickPower())}`);
}

// ═══ BUILD: TOP-LEVEL ═══

function buildKPIBar() {
  const bar = document.getElementById('kpi-bar');
  bar.innerHTML = `
    <div class="kpi-card" id="kpi-dp-card">
      <div class="kpi-label">Data Points</div>
      <div class="kpi-value blue" id="kpi-dp-value">0</div>
      <div class="kpi-sub"><span id="kpi-dp-rate">0 DP/s</span> <span id="kpi-dp-delta"></span></div>
    </div>
    <div class="kpi-card" id="kpi-contracts-card" style="display:none">
      <div class="kpi-label">Contracts</div>
      <div class="kpi-value amber" id="kpi-contracts-value">0</div>
      <div class="kpi-sub" id="kpi-contracts-rate">0/s</div>
    </div>
    <div class="kpi-card" id="kpi-ins-card" style="display:none">
      <div class="kpi-label">DP Multiplier</div>
      <div class="kpi-value teal" id="kpi-ins-value">×1.000</div>
      <div class="kpi-sub" id="kpi-ins-rate">+0/s</div>
    </div>
    <div class="kpi-card" id="kpi-quests-card" style="display:none">
      <div class="kpi-label">Quests</div>
      <div class="kpi-value amber" id="kpi-quests-value">0/5</div>
      <div class="kpi-sub">Completed</div>
    </div>
    <div class="kpi-card" id="kpi-rp-card" style="display:none">
      <div class="kpi-label">Reputation</div>
      <div class="kpi-value gold" id="kpi-rp-value">0 RP</div>
      <div class="kpi-sub" id="kpi-rp-sub">0 resets</div>
    </div>
  `;
}

function buildDashboard() {
  const dash = document.getElementById('dashboard');
  dash.innerHTML = '';

  const panels = [
    { id: 'panel-t1',          unlock: 't1',      fn: buildT1Panel },
    { id: 'panel-click',       unlock: 'click',   fn: buildClickPanel },
    { id: 'panel-quests',      unlock: 'quests',   fn: buildQuestsPanel },
    { id: 'panel-prestige',    unlock: 'prestige',fn: buildPrestigeTreePanel },
    { id: 'panel-wm-upgrades', unlock: 'wm',      fn: buildWorldUpgradesPanel },
    { id: 'panel-wm-map',      unlock: 'wm',      fn: buildWorldMapPanel },
    { id: 'panel-t2',          unlock: 't2',      fn: buildT2Panel },
  ];

  for (const p of panels) {
    const el = document.createElement('div');
    el.className = 'dash-panel';
    el.id = p.id;
    dash.appendChild(el);
    if (panelsUnlocked.has(p.unlock)) {
      p.fn();
    }
  }
  updateLockedPanelVisibility();
}

function getNextUnlockKey() {
  for (const c of UNLOCK_ORDER) {
    if (!panelsUnlocked.has(c.key)) return c.key;
  }
  return null;
}

function updateLockedPanelVisibility() {
  const panelUnlockMap = {
    wm:      ['panel-wm-upgrades', 'panel-wm-map'],
    t2:      ['panel-t2'],
    quests:  ['panel-quests'],
    prestige:['panel-prestige'],
  };

  for (const [key, ids] of Object.entries(panelUnlockMap)) {
    if (panelsUnlocked.has(key)) continue;
    const entry = UNLOCK_ORDER.find(c => c.key === key);
    // Show panel if visible() (or ready() as fallback) is true
    const shouldShow = entry && (entry.visible ? entry.visible() : entry.ready());
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (shouldShow) {
        el.classList.remove('hidden-panel');
        if (!el.querySelector('.locked-placeholder')) {
          buildLockedPlaceholder(el, key);
        }
      } else {
        el.classList.add('hidden-panel');
        el.innerHTML = '';
      }
    }
  }
}

function buildLockedPlaceholder(el, unlockKey) {
  const entry = UNLOCK_ORDER.find(c => c.key === unlockKey);
  if (!entry) return;
  const clickable = entry.cost !== null; // cost >= 0 means clickable (including 0 = free)
  const progress = entry.progressFn();
  el.innerHTML = `
    <div class="locked-placeholder ${clickable ? 'purchasable' : ''}">
      <div class="locked-progress">${progress}</div>
    </div>
  `;
  if (clickable) {
    el.querySelector('.locked-placeholder').addEventListener('click', () => tryPurchaseUnlock(unlockKey));
  }
}

function updateLockedProgress() {
  const panelUnlockMap = {
    wm:      ['panel-wm-upgrades', 'panel-wm-map'],
    t2:      ['panel-t2'],
    quests:  ['panel-quests'],
    prestige:['panel-prestige'],
  };
  for (const c of UNLOCK_ORDER) {
    if (panelsUnlocked.has(c.key)) continue;
    const isVisible = c.visible ? c.visible() : c.ready();
    if (!isVisible) continue;
    // Update progress text for this locked panel
    const ids = panelUnlockMap[c.key] || [];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const prog = el.querySelector('.locked-progress');
      if (prog) prog.textContent = c.progressFn();
      const ph = el.querySelector('.locked-placeholder.purchasable');
      if (ph) {
        const canAfford = c.cost === 0 ? c.ready() : (c.cost > 0 && state.dataPoints >= c.cost);
        ph.classList.toggle('affordable', canAfford);
      }
    }
  }
}

// ═══ BUILD: T1 PANEL ═══

function buildT1Panel() {
  const el = document.getElementById('panel-t1');
  if (!el) return;

  const t1Producers = PRODUCERS.filter(p => p.tier === 1);
  const t1Upgrades = getUpgradesForPanel('t1');

  el.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">T1 Producers</span>
      <span class="panel-badge blue">Data Points</span>
    </div>
    <div class="panel-body" id="t1-body">
      <div class="panel-sub" id="t1-prod-sub">
        <div class="section-divider">Producers</div>
        <div id="t1-prod-list"></div>
      </div>
      <div class="panel-sub" id="t1-upg-sub" style="display:none">
        <div class="sub-header">
          <span class="section-divider">Upgrades</span>
          <button class="filter-btn" id="t1-filter">All</button>
        </div>
        <div id="t1-upg-list"></div>
      </div>
    </div>
  `;

  // Producer rows
  const prodList = document.getElementById('t1-prod-list');
  for (const p of t1Producers) {
    prodList.appendChild(makeProducerRow(p));
  }

  // Upgrade pills
  buildUpgradePillsInto('t1-upg-list', t1Upgrades);
  document.getElementById('t1-filter').addEventListener('click', () => cycleUpgradeFilter('t1-upg-list', 't1-filter'));
}

function renderT1Panel() {
  if (!document.getElementById('t1-prod-list')) return;
  const t1 = PRODUCERS.filter(p => p.tier === 1);
  for (const p of t1) updateProducerRow(p);
  const t1Upgrades = getUpgradesForPanel('t1');
  updateUpgradePills('t1-upg-list', t1Upgrades);
  applyUpgradeFilter('t1-upg-list');
  // Show upgrades sub-container if any are visible
  const t1UpgVisible = t1Upgrades.some(u => state.upgradeVisible[u.id]);
  const upgSub = document.getElementById('t1-upg-sub');
  if (upgSub) upgSub.style.display = t1UpgVisible ? '' : 'none';
}

// ═══ BUILD: T2 PANEL ═══

function buildT2Panel() {
  const el = document.getElementById('panel-t2');
  if (!el) return;

  el.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">T2 — Insights</span>
      <span class="panel-badge teal">DP Multiplier</span>
    </div>
    <div class="panel-body" id="t2-body">
      <div class="panel-sub">
        <div class="section-divider">Tier 2 — Analytics</div>
        <div id="t2-prod-list"></div>
      </div>
      <div class="panel-sub" id="t2-upg-sub" style="display:none">
        <div class="sub-header">
          <span class="section-divider">Upgrades</span>
          <button class="filter-btn" id="t2-filter">All</button>
        </div>
        <div id="t2-upg-list"></div>
      </div>
    </div>
  `;

  const t2List = document.getElementById('t2-prod-list');
  for (const p of PRODUCERS.filter(q => q.tier === 2)) {
    t2List.appendChild(makeProducerRow(p));
  }

  buildUpgradePillsInto('t2-upg-list', getUpgradesForPanel('t2'));
  document.getElementById('t2-filter').addEventListener('click', () => cycleUpgradeFilter('t2-upg-list', 't2-filter'));
}

function renderT2Panel() {
  if (!document.getElementById('t2-prod-list')) return;
  const t2 = PRODUCERS.filter(p => p.tier === 2);
  for (const p of t2) updateProducerRow(p);
  const t2Upgrades = getUpgradesForPanel('t2');
  updateUpgradePills('t2-upg-list', t2Upgrades);
  applyUpgradeFilter('t2-upg-list');
  const anyUpgVisible = t2Upgrades.some(u => state.upgradeVisible[u.id]);
  const upgSub = document.getElementById('t2-upg-sub');
  if (upgSub) upgSub.style.display = anyUpgVisible ? '' : 'none';
}

// ═══ PRODUCER ROW HELPERS ═══

function makeProducerRow(p) {
  const resource = p.costResource || 'dataPoints';
  const cost = producerCost(p);
  const canAfford = state[resource] >= cost;

  const row = document.createElement('div');
  row.className = 'prod-row';
  row.id = `prod-row-${p.id}`;
  row.innerHTML = `
    <div class="prod-emoji">${p.emoji}</div>
    <div class="prod-info">
      <div class="prod-name">
        ${p.name}
        <span class="starvation-badge" id="starv-${p.id}" style="display:none">Starved</span>
      </div>
      <div class="prod-subline" id="prod-sub-${p.id}">+${fmtDec(p.baseProduction)} ${resourceLabel(p.produces)}/s each</div>
    </div>
    <div class="prod-right">
      <span class="prod-cost ${canAfford ? 'affordable' : 'cant-afford'}" id="prod-cost-${p.id}">${fmt(cost)} ${resourceLabel(resource)}</span>
      <div class="buy-btns" id="buy-btns-${p.id}">
        <button class="buy-btn" data-id="${p.id}" data-n="1">×1</button>
        <button class="buy-btn" data-id="${p.id}" data-n="10">×10</button>
        <button class="buy-btn" data-id="${p.id}" data-n="next" title="Buy until next milestone unlocks">→</button>
        <button class="buy-btn" data-id="${p.id}" data-n="max">MAX</button>
      </div>
    </div>
    <span class="owned-badge" id="prod-badge-${p.id}">${state.owned[p.id]}</span>
  `;
  row.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const n = btn.dataset.n;
      if (n === 'max') {
        buyProducer(p.id, 'max');
      } else if (n === 'next') {
        buyProducerToNextMilestone(p.id);
      } else {
        buyProducer(p.id, parseInt(n));
      }
    });
  });
  return row;
}

function updateProducerRow(p) {
  const row = document.getElementById(`prod-row-${p.id}`);
  if (!row) return;

  const resource = p.costResource || 'dataPoints';
  const cost = producerCost(p);
  const canAfford = state[resource] >= cost;

  const costEl = document.getElementById(`prod-cost-${p.id}`);
  if (costEl) {
    costEl.textContent = `${fmt(cost)} ${resourceLabel(resource)}`;
    costEl.className = `prod-cost ${canAfford ? 'affordable' : 'cant-afford'}`;
  }

  const badge = document.getElementById(`prod-badge-${p.id}`);
  if (badge) badge.textContent = state.owned[p.id];

  // Update buy button affordability
  const btns = document.getElementById(`buy-btns-${p.id}`);
  if (btns) {
    btns.querySelectorAll('.buy-btn').forEach(btn => {
      const n = btn.dataset.n;
      const count = n === 'max' ? producerMaxAffordable(p) : parseInt(n);
      const affordable = count > 0 && state[resource] >= producerCostN(p, Math.min(count, n === 'max' ? count : parseInt(n)));
      btn.classList.toggle('cant-buy', !affordable);
    });
  }

  const starv = document.getElementById(`starv-${p.id}`);
  if (starv) starv.style.display = starvationFlags[p.id] ? 'inline-block' : 'none';

  const sub = document.getElementById(`prod-sub-${p.id}`);
  if (sub) {
    if (state.owned[p.id] > 0) {
      const totalRate = producerEffectiveRate(p);
      const typeTotal = calcTotalProduction(p.produces);
      const pct = typeTotal > 0 ? (totalRate / typeTotal * 100) : 0;
      sub.textContent = `${fmtDec(totalRate)} ${resourceLabel(p.produces)}/s · ${pct.toFixed(0)}%`;
    } else {
      sub.textContent = `+${fmtDec(p.baseProduction)} ${resourceLabel(p.produces)}/s each`;
    }
  }
}

// ═══ UPGRADE PILL HELPERS ═══

function buildUpgradePillsInto(containerId, upgrades) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const sorted = [...upgrades].sort((a, b) => a.cost.amount - b.cost.amount);
  for (const u of sorted) {
    const i = u.id;
    const purchased = state.upgrades[i];
    const resource = u.cost.resource;
    const canAfford = !purchased && state[resource] >= u.cost.amount;
    const tagInfo = getUpgradeTagInfo(u);

    const pill = document.createElement('div');
    pill.className = `upg-pill${purchased ? ' purchased' : (!canAfford ? ' unaffordable' : '')}`;
    pill.id = `upg-pill-${i}`;
    pill.style.display = state.upgradeVisible[i] ? '' : 'none';
    pill.innerHTML = `
      <div class="upg-pill-info">
        <div class="upg-pill-name">
          <span class="upg-tag ${tagInfo.css}">${tagInfo.tag}</span>
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

function updateUpgradePills(containerId, upgrades) {
  if (!upgrades) return;
  for (const u of upgrades) {
    const i = u.id;
    const pill = document.getElementById(`upg-pill-${i}`);
    if (!pill) continue;
    pill.style.display = state.upgradeVisible[i] ? '' : 'none';
    if (!state.upgradeVisible[i]) continue;

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
  const clickUpgrades = getUpgradesForPanel('click');

  el.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">Data Ingestion</span>
      <span class="panel-badge blue">Click</span>
    </div>
    <div class="panel-body">
      <div class="panel-sub" id="click-target">
        <div id="click-label">Click to Collect Data Points</div>
        <div id="click-value">0</div>
        <div id="click-rate">0 DP/s · Click: +1</div>
      </div>
      <div class="panel-sub" id="click-upg-sub" style="display:none">
        <div class="sub-header">
          <span class="section-divider">Click Upgrades</span>
          <button class="filter-btn" id="click-filter">All</button>
        </div>
        <div id="click-upg-list"></div>
      </div>
    </div>
  `;
  document.getElementById('click-target').addEventListener('click', handleClick);
  buildUpgradePillsInto('click-upg-list', clickUpgrades);
  document.getElementById('click-filter').addEventListener('click', () => cycleUpgradeFilter('click-upg-list', 'click-filter'));
}

function renderClickPanel() {
  const clickUpgrades = getUpgradesForPanel('click');
  updateUpgradePills('click-upg-list', clickUpgrades);
  applyUpgradeFilter('click-upg-list');
  const clkUpgVisible = clickUpgrades.some(u => state.upgradeVisible[u.id]);
  const upgSub = document.getElementById('click-upg-sub');
  if (upgSub) upgSub.style.display = clkUpgVisible ? '' : 'none';
}

// ═══ BUILD: WORLD MAP PANEL ═══

function buildWorldMapPanel() {
  const el = document.getElementById('panel-wm-map');
  if (!el) return;

  const conquered = getConqueredSet();
  const rate = calcContractsRate();

  const totalOwned = state.owned.reduce((s, n) => s + n, 0);

  const paths = TERRITORIES.map(t => {
    const isConquered = conquered.has(t.id);
    const canConquer = !isConquered && totalOwned >= t.need;
    return `<path id="territory-${t.id}" d="${t.d}"
      class="${isConquered ? 'conquered' : (canConquer ? 'conquerable' : 'locked')}"
      fill="${isConquered ? t.color : (canConquer ? t.color : 'var(--text-muted)')}"
      data-idx="${t.idx}">
      <title>${t.name} — ${isConquered ? `${t.rate}/s Contracts` : `${totalOwned}/${t.need} producers`}${t.boost ? ` | Bonus: ${t.boost.desc}` : ''}</title>
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

  // Click handlers for conquest
  for (const t of TERRITORIES) {
    const path = document.getElementById(`territory-${t.id}`);
    if (path) path.addEventListener('click', () => conquerTerritory(t.idx));
  }
}

function renderWorldMap() {
  const svg = document.getElementById('wm-map-svg');
  if (!svg) return;

  const conquered = getConqueredSet();
  const totalOwned = state.owned.reduce((s, n) => s + n, 0);
  let changed = false;

  for (const t of TERRITORIES) {
    const path = document.getElementById(`territory-${t.id}`);
    if (!path) continue;
    const isConquered = conquered.has(t.id);
    const canConquer = !isConquered && totalOwned >= t.need;
    const prevClass = path.getAttribute('class');
    const newClass = isConquered ? 'conquered' : (canConquer ? 'conquerable' : 'locked');
    if (prevClass !== newClass) {
      path.setAttribute('class', newClass);
      path.setAttribute('fill', isConquered ? t.color : (canConquer ? t.color : 'var(--text-muted)'));
      changed = true;
    }
    // Update tooltip with current producer count
    let title = path.querySelector('title');
    if (!title) { title = document.createElementNS('http://www.w3.org/2000/svg', 'title'); path.appendChild(title); }
    const boostText = t.boost ? ` | Bonus: ${t.boost.desc}` : '';
    title.textContent = isConquered ? `${t.name} — ${t.rate}/s Contracts${boostText}` : `${t.name} — ${totalOwned}/${t.need} producers${boostText}`;
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

  const sorted = [...WORLD_UPGRADES].sort((a, b) => a.cost - b.cost);

  el.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">WM Upgrades</span>
      <span class="panel-badge amber">Contracts</span>
    </div>
    <div class="panel-body">
      <div class="panel-sub">
        <div class="sub-header">
          <span class="section-divider">Upgrades</span>
          <button class="filter-btn" id="wm-upg-filter">All</button>
        </div>
        <div id="wm-upg-list"></div>
      </div>
    </div>
  `;

  const list = document.getElementById('wm-upg-list');
  for (const u of sorted) {
    const purchased = state.worldUpgrades[u.id];
    const canAfford = !purchased && state.contracts >= u.cost;
    const pill = document.createElement('div');
    pill.className = `upg-pill${purchased ? ' purchased' : (!canAfford ? ' unaffordable' : '')}`;
    pill.id = `wm-upg-${u.id}`;
    pill.innerHTML = `
      <div class="upg-pill-info">
        <div class="upg-pill-name">
          <span class="upg-tag tag-tier2">WM</span>
          ${u.name}
        </div>
        <div class="upg-pill-effect">${u.desc}</div>
      </div>
      <span class="upg-pill-cost ${purchased ? 'done' : (canAfford ? 'affordable' : 'cant-afford')}" id="wm-upg-cost-${u.id}">
        ${purchased ? '✓' : `${fmt(u.cost)} C`}
      </span>
    `;
    pill.addEventListener('click', () => buyWorldUpgrade(u.id));
    list.appendChild(pill);
  }

  document.getElementById('wm-upg-filter').addEventListener('click', () => cycleUpgradeFilter('wm-upg-list', 'wm-upg-filter'));
}

function renderWorldUpgradesPanel() {
  for (const u of WORLD_UPGRADES) {
    const pill = document.getElementById(`wm-upg-${u.id}`);
    if (!pill) continue;
    const purchased = state.worldUpgrades[u.id];
    const canAfford = !purchased && state.contracts >= u.cost;
    pill.classList.toggle('purchased', purchased);
    pill.classList.toggle('unaffordable', !purchased && !canAfford);
    const costEl = document.getElementById(`wm-upg-cost-${u.id}`);
    if (costEl) {
      costEl.textContent = purchased ? '✓' : `${fmt(u.cost)} C`;
      costEl.className = `upg-pill-cost ${purchased ? 'done' : (canAfford ? 'affordable' : 'cant-afford')}`;
    }
  }
  applyUpgradeFilter('wm-upg-list');
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
      <div id="prestige-next">${eligible ? `Next reset: +${rpGain} RP` : 'Need more Insights'}</div>
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
  if (nextEl) nextEl.textContent = eligible ? `Next reset: +${rpGain} RP` : 'Need more Insights';

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

// ═══ ACHIEVEMENTS MODAL ═══

function buildAchievementsModal() {
  const existing = document.getElementById('achieve-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'achieve-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div id="achieve-modal">
      <div id="achieve-header">
        <span id="achieve-title">Achievements</span>
        <span id="achieve-count"></span>
        <button id="achieve-close">✕</button>
      </div>
      <div id="achieve-body"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#achieve-close').addEventListener('click', closeAchievements);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAchievements(); });
}

function openAchievements() {
  renderAchievementsBody();
  document.getElementById('achieve-overlay').classList.add('open');
}

function closeAchievements() {
  document.getElementById('achieve-overlay').classList.remove('open');
}

function renderAchievementsBody() {
  const body = document.getElementById('achieve-body');
  if (!body) return;
  const earned = state.achievements.filter(Boolean).length;
  setText('achieve-count', `${earned} / ${ACHIEVEMENTS.length}`);
  body.innerHTML = ACHIEVEMENTS.map(a => {
    const done = state.achievements[a.id];
    return `<div class="achieve-row ${done ? 'done' : ''}">
      <span class="achieve-icon">${done ? '✓' : '○'}</span>
      <div class="achieve-info">
        <div class="achieve-name">${a.name}</div>
        <div class="achieve-desc">${a.desc}</div>
      </div>
      <div class="achieve-reward">${a.reward}</div>
    </div>`;
  }).join('');
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
  const t1Rate  = PRODUCERS.filter(p => p.tier === 1).reduce((s, p) => s + producerEffectiveRate(p), 0);
  const t2Rate  = PRODUCERS.filter(p => p.tier === 2).reduce((s, p) => s + producerEffectiveRate(p), 0);
  const totalOwned = state.owned.reduce((s, n) => s + n, 0);
  const upgBought = state.upgrades.filter(Boolean).length;
  const rpGain = calcRPGain();
  const conquered = getConqueredSet();

  const producerRows = PRODUCERS
    .filter(p => state.owned[p.id] > 0)
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
    </div>

    <div class="status-section">
      <div class="status-section-title">All-Time Production</div>
      <div class="status-row"><span class="status-row-label">Data Points generated</span><span class="status-row-value accent">${fmt(state.lifetimeDP)}</span></div>
      <div class="status-row"><span class="status-row-label">Insights generated</span><span class="status-row-value teal">${fmt(state.lifetimeInsights)}</span></div>
      <div class="status-row"><span class="status-row-label">Contracts earned</span><span class="status-row-value">${fmt(state.lifetimeContracts)}</span></div>
    </div>

    <div class="status-section">
      <div class="status-section-title">Current Rates</div>
      <div class="status-row"><span class="status-row-label">Data Points / s</span><span class="status-row-value accent">${fmtDec(dpRate)}</span></div>
      <div class="status-row"><span class="status-row-label">  ↳ Tier 1 contribution</span><span class="status-row-value">${fmtDec(t1Rate)}/s</span></div>
      <div class="status-row"><span class="status-row-label">Insights / s</span><span class="status-row-value teal">${fmtDec(insRate)}</span></div>
      <div class="status-row"><span class="status-row-label">  ↳ Tier 2 contribution</span><span class="status-row-value">${fmtDec(t2Rate)}/s</span></div>
      <div class="status-row"><span class="status-row-label">Contracts / s</span><span class="status-row-value">${fmtDec(calcContractsRate())}</span></div>
    </div>

    <div class="status-section">
      <div class="status-section-title">Click Stats</div>
      <div class="status-row"><span class="status-row-label">Total clicks this session</span><span class="status-row-value">${state.totalClicks.toLocaleString()}</span></div>
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
  activityLog = [];
  starvationFlags = new Array(PRODUCERS.length).fill(false);
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
