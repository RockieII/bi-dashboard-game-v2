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
    baseCost: 100,    costMult: 1.13, baseProduction: 1,    produces: 'dataPoints' },
  { id: 2, tier: 1, name: 'ETL Pipeline',   emoji: '⚙️', desc: 'Automated nightly data extraction and loading.',
    baseCost: 1100,   costMult: 1.13, baseProduction: 4,    produces: 'dataPoints' },
  { id: 3, tier: 1, name: 'Data Catalog',   emoji: '📁', desc: 'Classifies and indexes all data assets centrally.',
    baseCost: 12000,  costMult: 1.13, baseProduction: 20,   produces: 'dataPoints' },
  // Tier 2 — produce Insights/s (passive multiplier to DP, costs DP to buy)
  { id: 4, tier: 2, name: 'Power BI Dashboard', emoji: '📈', desc: 'Self-service analytics — passive DP multiplier.',
    baseCost: 1e10,       costMult: 1.3,  baseProduction: 0.001, produces: 'insights' },
  { id: 5, tier: 2, name: 'Data Warehouse',     emoji: '🏛️', desc: 'Centralised analytical store — stronger multiplier.',
    baseCost: 1e12,       costMult: 1.3,  baseProduction: 0.01,  produces: 'insights' },
  { id: 6, tier: 2, name: 'Data Lake',           emoji: '🌊', desc: 'Petabyte-scale storage — major multiplier.',
    baseCost: 1e14,       costMult: 1.3,  baseProduction: 0.05,  produces: 'insights' },
];

const UPGRADES = [
  { id: 0,  name: 'Pivot Tables',          desc: 'Excel Analysts 2× production.',
    unlock: { type: 'owned', producerId: 0, count: 1 },
    cost: { resource: 'dataPoints', amount: 25 },     effect: { type: 'producerMultiplier', producerId: 0, multiplier: 2 } },
  { id: 1,  name: 'VLOOKUP Mastery',       desc: 'Excel Analysts 2× production.',
    unlock: { type: 'owned', producerId: 0, count: 5 },
    cost: { resource: 'dataPoints', amount: 100 },    effect: { type: 'producerMultiplier', producerId: 0, multiplier: 2 } },
  { id: 2,  name: 'Power Query',           desc: 'Excel Analysts 2× production.',
    unlock: { type: 'owned', producerId: 0, count: 25 },
    cost: { resource: 'dataPoints', amount: 2500 },   effect: { type: 'producerMultiplier', producerId: 0, multiplier: 2 } },
  { id: 3,  name: 'Query Optimization',    desc: 'SQL Developers 2× production.',
    unlock: { type: 'owned', producerId: 1, count: 1 },
    cost: { resource: 'dataPoints', amount: 250 },    effect: { type: 'producerMultiplier', producerId: 1, multiplier: 2 } },
  { id: 4,  name: 'Stored Procedures',     desc: 'SQL Developers 2× production.',
    unlock: { type: 'owned', producerId: 1, count: 5 },
    cost: { resource: 'dataPoints', amount: 1200 },   effect: { type: 'producerMultiplier', producerId: 1, multiplier: 2 } },
  { id: 5,  name: 'Incremental Load',      desc: 'ETL Pipelines 2× production.',
    unlock: { type: 'owned', producerId: 2, count: 1 },
    cost: { resource: 'dataPoints', amount: 2500 },   effect: { type: 'producerMultiplier', producerId: 2, multiplier: 2 } },
  { id: 6,  name: 'CDC Streaming',         desc: 'ETL Pipelines 2× production.',
    unlock: { type: 'owned', producerId: 2, count: 5 },
    cost: { resource: 'dataPoints', amount: 15000 },  effect: { type: 'producerMultiplier', producerId: 2, multiplier: 2 } },
  { id: 7,  name: 'Data Governance',       desc: 'All Tier 1 producers 1.5× production.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 300 },
    cost: { resource: 'dataPoints', amount: 500 },    effect: { type: 'allTierMultiplier', tier: 1, multiplier: 1.5 } },
  { id: 8,  name: 'Cloud Migration',       desc: 'All Tier 1 producers 2× production.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 5000 },
    cost: { resource: 'dataPoints', amount: 4000 },   effect: { type: 'allTierMultiplier', tier: 1, multiplier: 2 } },
  { id: 9,  name: 'Star Schema Design',    desc: 'Power BI Dashboards 2× production.',
    unlock: { type: 'owned', producerId: 4, count: 1 },
    cost: { resource: 'dataPoints', amount: 5e10 },       effect: { type: 'producerMultiplier', producerId: 4, multiplier: 2 } },
  { id: 10, name: 'Row-Level Security',    desc: 'Power BI Dashboards 2× production.',
    unlock: { type: 'owned', producerId: 4, count: 5 },
    cost: { resource: 'dataPoints', amount: 5e11 },       effect: { type: 'producerMultiplier', producerId: 4, multiplier: 2 } },
  { id: 11, name: 'Columnar Storage',      desc: 'Data Warehouses 2× production.',
    unlock: { type: 'owned', producerId: 5, count: 1 },
    cost: { resource: 'dataPoints', amount: 5e12 },       effect: { type: 'producerMultiplier', producerId: 5, multiplier: 2 } },
  { id: 12, name: 'Partitioning Strategy', desc: 'Data Warehouses 2× production.',
    unlock: { type: 'owned', producerId: 5, count: 5 },
    cost: { resource: 'dataPoints', amount: 5e13 },       effect: { type: 'producerMultiplier', producerId: 5, multiplier: 2 } },
  { id: 13, name: 'Delta Lake Format',     desc: 'Data Lakes 2× production.',
    unlock: { type: 'owned', producerId: 6, count: 1 },
    cost: { resource: 'dataPoints', amount: 5e14 },       effect: { type: 'producerMultiplier', producerId: 6, multiplier: 2 } },
  // Click upgrades (ids 14-18)
  { id: 14, name: 'Touch Typing',          desc: 'Click power 2×.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 10 },
    cost: { resource: 'dataPoints', amount: 30 },     effect: { type: 'clickMultiplier', multiplier: 2 } },
  { id: 15, name: 'Keyboard Shortcuts',    desc: 'Click power 2×.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 300 },
    cost: { resource: 'dataPoints', amount: 500 },    effect: { type: 'clickMultiplier', multiplier: 2 } },
  { id: 16, name: 'Macro Recorder',        desc: 'Click power 3×.',
    unlock: { type: 'owned', producerId: 1, count: 5 },
    cost: { resource: 'dataPoints', amount: 5000 },   effect: { type: 'clickMultiplier', multiplier: 3 } },
  { id: 17, name: 'RPA Bot',               desc: 'Click power 5×.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 25000 },
    cost: { resource: 'dataPoints', amount: 15000 },  effect: { type: 'clickMultiplier', multiplier: 5 } },
  { id: 18, name: 'One-Click Reports',     desc: 'Click power 4×.',
    unlock: { type: 'owned', producerId: 4, count: 5 },
    cost: { resource: 'dataPoints', amount: 30000 },  effect: { type: 'clickMultiplier', multiplier: 4 } },
  // Click = 1% of production upgrades (ids 33-37, spread across game phases)
  { id: 33, name: 'Data Sampling',         desc: 'Click +1% of DP/s.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 500 },
    cost: { resource: 'dataPoints', amount: 500 },        effect: { type: 'clickPercentOfProduction', percent: 1 } },
  { id: 34, name: 'Smart Clipboard',       desc: 'Click +1% of DP/s.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 50000 },
    cost: { resource: 'dataPoints', amount: 50000 },      effect: { type: 'clickPercentOfProduction', percent: 1 } },
  { id: 35, name: 'Batch Processor',       desc: 'Click +1% of DP/s.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 500000 },
    cost: { resource: 'dataPoints', amount: 500000 },     effect: { type: 'clickPercentOfProduction', percent: 1 } },
  { id: 36, name: 'Stream Tap',            desc: 'Click +1% of DP/s.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 10000000 },
    cost: { resource: 'dataPoints', amount: 10000000 },   effect: { type: 'clickPercentOfProduction', percent: 1 } },
  { id: 37, name: 'Neural Harvester',      desc: 'Click +1% of DP/s.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 500000000 },
    cost: { resource: 'dataPoints', amount: 500000000 },  effect: { type: 'clickPercentOfProduction', percent: 1 } },
  // Additional T1 upgrades (ids 19-25)
  { id: 19, name: 'VBA Macros',             desc: 'Excel Analysts 3× production.',
    unlock: { type: 'owned', producerId: 0, count: 50 },
    cost: { resource: 'dataPoints', amount: 12000 },  effect: { type: 'producerMultiplier', producerId: 0, multiplier: 3 } },
  { id: 20, name: 'Materialized Views',     desc: 'SQL Developers 3× production.',
    unlock: { type: 'owned', producerId: 1, count: 25 },
    cost: { resource: 'dataPoints', amount: 25000 },  effect: { type: 'producerMultiplier', producerId: 1, multiplier: 3 } },
  { id: 21, name: 'Parallel Processing',    desc: 'ETL Pipelines 3× production.',
    unlock: { type: 'owned', producerId: 2, count: 25 },
    cost: { resource: 'dataPoints', amount: 100000 }, effect: { type: 'producerMultiplier', producerId: 2, multiplier: 3 } },
  { id: 22, name: 'Metadata Indexing',      desc: 'Data Catalogs 2× production.',
    unlock: { type: 'owned', producerId: 3, count: 1 },
    cost: { resource: 'dataPoints', amount: 8000 },   effect: { type: 'producerMultiplier', producerId: 3, multiplier: 2 } },
  { id: 23, name: 'Data Lineage Tracking',  desc: 'Data Catalogs 2× production.',
    unlock: { type: 'owned', producerId: 3, count: 5 },
    cost: { resource: 'dataPoints', amount: 40000 },  effect: { type: 'producerMultiplier', producerId: 3, multiplier: 2 } },
  { id: 24, name: 'Data Mesh Architecture', desc: 'All Tier 1 producers 3× production.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 50000 },
    cost: { resource: 'dataPoints', amount: 35000 },  effect: { type: 'allTierMultiplier', tier: 1, multiplier: 3 } },
  { id: 25, name: 'Lakehouse Unification',  desc: 'All Tier 1 producers 2× production.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 250000 },
    cost: { resource: 'dataPoints', amount: 150000 }, effect: { type: 'allTierMultiplier', tier: 1, multiplier: 2 } },
  // Additional T2 upgrades (ids 26-32)
  { id: 26, name: 'Advanced DAX',          desc: 'Power BI Dashboards 3× production.',
    unlock: { type: 'owned', producerId: 4, count: 15 },
    cost: { resource: 'dataPoints', amount: 1e12 },       effect: { type: 'producerMultiplier', producerId: 4, multiplier: 3 } },
  { id: 27, name: 'Snowflake Migration',   desc: 'Data Warehouses 3× production.',
    unlock: { type: 'owned', producerId: 5, count: 10 },
    cost: { resource: 'dataPoints', amount: 1e14 },       effect: { type: 'producerMultiplier', producerId: 5, multiplier: 3 } },
  { id: 28, name: 'Lakehouse Architecture',desc: 'Data Lakes 3× production.',
    unlock: { type: 'owned', producerId: 6, count: 5 },
    cost: { resource: 'dataPoints', amount: 1e16 },       effect: { type: 'producerMultiplier', producerId: 6, multiplier: 3 } },
  { id: 29, name: 'DP Accelerator',        desc: 'All T1 producers 2× production.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 1e11 },
    cost: { resource: 'dataPoints', amount: 1e11 },       effect: { type: 'allTierMultiplier', tier: 1, multiplier: 2 } },
  { id: 30, name: 'Contract Optimizer',    desc: 'Contracts rate ×2.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 5e11 },
    cost: { resource: 'dataPoints', amount: 5e11 },       effect: { type: 'contractsMultiplier', multiplier: 2 } },
  { id: 31, name: 'Insight Analytics',     desc: 'All T2 producers 2× production.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 1e13 },
    cost: { resource: 'dataPoints', amount: 1e13 },       effect: { type: 'allTierMultiplier', tier: 2, multiplier: 2 } },
  { id: 32, name: 'Enterprise Data Fabric',desc: 'All producers 2× production.',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 1e15 },
    cost: { resource: 'dataPoints', amount: 1e15 },       effect: { type: 'allMultiplier', multiplier: 2 } },
];

// Lookup maps — use these instead of UPGRADES[id] to decouple id from array index
const UPGRADE_MAP = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

// ═══ ACHIEVEMENTS ═══

const ACHIEVEMENTS = [
  { id: 0,  name: 'Spreadsheet Squad',     desc: 'Own 10 Excel Analysts',        check: () => state.owned[0] >= 10,  reward: 'Excel Analysts +25%',       effect: { type: 'producerMultiplier', producerId: 0, multiplier: 1.25 } },
  { id: 1,  name: 'Excel Army',            desc: 'Own 25 Excel Analysts',        check: () => state.owned[0] >= 25,  reward: 'Excel Analysts +50%',       effect: { type: 'producerMultiplier', producerId: 0, multiplier: 1.5 } },
  { id: 2,  name: 'Query Club',            desc: 'Own 10 SQL Developers',        check: () => state.owned[1] >= 10,  reward: 'SQL Developers +25%',       effect: { type: 'producerMultiplier', producerId: 1, multiplier: 1.25 } },
  { id: 3,  name: 'Database Division',     desc: 'Own 25 SQL Developers',        check: () => state.owned[1] >= 25,  reward: 'SQL Developers +50%',       effect: { type: 'producerMultiplier', producerId: 1, multiplier: 1.5 } },
  { id: 4,  name: 'Pipeline Crew',         desc: 'Own 10 ETL Pipelines',         check: () => state.owned[2] >= 10,  reward: 'ETL Pipelines +25%',        effect: { type: 'producerMultiplier', producerId: 2, multiplier: 1.25 } },
  { id: 5,  name: 'Catalog Corps',         desc: 'Own 10 Data Catalogs',         check: () => state.owned[3] >= 10,  reward: 'Data Catalogs +25%',        effect: { type: 'producerMultiplier', producerId: 3, multiplier: 1.25 } },
  { id: 6,  name: 'Data Workforce',        desc: 'Own 50 T1 producers total',    check: () => PRODUCERS.filter(p=>p.tier===1).reduce((s,p)=>s+state.owned[p.id],0) >= 50,  reward: 'All T1 +15%', effect: { type: 'allTierMultiplier', tier: 1, multiplier: 1.15 } },
  { id: 7,  name: 'Data Factory',          desc: 'Own 100 T1 producers total',   check: () => PRODUCERS.filter(p=>p.tier===1).reduce((s,p)=>s+state.owned[p.id],0) >= 100, reward: 'All T1 +25%', effect: { type: 'allTierMultiplier', tier: 1, multiplier: 1.25 } },
  { id: 8,  name: 'Click Enthusiast',      desc: 'Click 100 times',              check: () => state.totalClicks >= 100,    reward: 'Click power +50%',    effect: { type: 'clickMultiplier', multiplier: 1.5 } },
  { id: 9,  name: 'Click Addict',          desc: 'Click 1,000 times',            check: () => state.totalClicks >= 1000,   reward: 'Click power +100%',   effect: { type: 'clickMultiplier', multiplier: 2 } },
  { id: 10, name: 'First Million',         desc: 'Earn 1M lifetime Data Points', check: () => state.lifetimeDP >= 1e6, reward: 'All producers +10%',     effect: { type: 'allMultiplier', multiplier: 1.1 } },
  { id: 11, name: 'Data Tycoon',           desc: 'Earn 10M lifetime Data Points',check: () => state.lifetimeDP >= 1e7, reward: 'All producers +20%',     effect: { type: 'allMultiplier', multiplier: 1.2 } },
  { id: 12, name: 'Excel Empire',          desc: 'Own 50 Excel Analysts',        check: () => state.owned[0] >= 50,  reward: 'Excel Analysts +100%',  effect: { type: 'producerMultiplier', producerId: 0, multiplier: 2 } },
  { id: 13, name: 'Spreadsheet God',       desc: 'Own 100 Excel Analysts',       check: () => state.owned[0] >= 100, reward: 'Excel Analysts +200%',  effect: { type: 'producerMultiplier', producerId: 0, multiplier: 3 } },
  { id: 14, name: 'SQL Syndicate',         desc: 'Own 50 SQL Developers',        check: () => state.owned[1] >= 50,  reward: 'SQL Developers +100%',  effect: { type: 'producerMultiplier', producerId: 1, multiplier: 2 } },
  { id: 15, name: 'Query Overlord',        desc: 'Own 100 SQL Developers',       check: () => state.owned[1] >= 100, reward: 'SQL Developers +200%',  effect: { type: 'producerMultiplier', producerId: 1, multiplier: 3 } },
  { id: 16, name: 'Pipeline Empire',       desc: 'Own 50 ETL Pipelines',         check: () => state.owned[2] >= 50,  reward: 'ETL Pipelines +100%',   effect: { type: 'producerMultiplier', producerId: 2, multiplier: 2 } },
  { id: 17, name: 'Pipeline Overlord',     desc: 'Own 100 ETL Pipelines',        check: () => state.owned[2] >= 100, reward: 'ETL Pipelines +200%',   effect: { type: 'producerMultiplier', producerId: 2, multiplier: 3 } },
  { id: 18, name: 'Catalog Empire',        desc: 'Own 50 Data Catalogs',         check: () => state.owned[3] >= 50,  reward: 'Data Catalogs +100%',   effect: { type: 'producerMultiplier', producerId: 3, multiplier: 2 } },
  { id: 19, name: 'Catalog Overlord',      desc: 'Own 100 Data Catalogs',        check: () => state.owned[3] >= 100, reward: 'Data Catalogs +200%',   effect: { type: 'producerMultiplier', producerId: 3, multiplier: 3 } },
  { id: 20, name: '100K Club',             desc: 'Earn 100K lifetime DP',        check: () => state.lifetimeDP >= 1e5, reward: 'All producers +15%',   effect: { type: 'allMultiplier', multiplier: 1.15 } },
  { id: 21, name: 'Billionaire',           desc: 'Earn 1B lifetime DP',          check: () => state.lifetimeDP >= 1e9, reward: 'All producers +30%',   effect: { type: 'allMultiplier', multiplier: 1.3 } },
  { id: 22, name: 'First Conquest',        desc: 'Conquer 1 territory',          check: () => state.conquered.filter(Boolean).length >= 1, reward: 'All producers +10%', effect: { type: 'allMultiplier', multiplier: 1.1 } },
  { id: 23, name: 'Three Continents',      desc: 'Conquer 3 territories',        check: () => state.conquered.filter(Boolean).length >= 3, reward: 'All producers +20%', effect: { type: 'allMultiplier', multiplier: 1.2 } },
  { id: 24, name: 'World Conqueror',       desc: 'Conquer all 6 territories',    check: () => state.conquered.every(Boolean), reward: 'All producers +50%', effect: { type: 'allMultiplier', multiplier: 1.5 } },
  // T2 achievements
  { id: 25, name: 'Dashboard Starter',     desc: 'Own 5 Power BI Dashboards',    check: () => state.owned[4] >= 5,   reward: 'PBI Dashboards +25%',  effect: { type: 'producerMultiplier', producerId: 4, multiplier: 1.25 } },
  { id: 26, name: 'Dashboard Pro',         desc: 'Own 25 Power BI Dashboards',   check: () => state.owned[4] >= 25,  reward: 'PBI Dashboards +100%', effect: { type: 'producerMultiplier', producerId: 4, multiplier: 2 } },
  { id: 27, name: 'Warehouse Founder',     desc: 'Own 5 Data Warehouses',        check: () => state.owned[5] >= 5,   reward: 'Data Warehouses +25%', effect: { type: 'producerMultiplier', producerId: 5, multiplier: 1.25 } },
  { id: 28, name: 'Warehouse King',        desc: 'Own 25 Data Warehouses',       check: () => state.owned[5] >= 25,  reward: 'Data Warehouses +100%',effect: { type: 'producerMultiplier', producerId: 5, multiplier: 2 } },
  { id: 29, name: 'Lake Pioneer',          desc: 'Own 5 Data Lakes',             check: () => state.owned[6] >= 5,   reward: 'Data Lakes +25%',      effect: { type: 'producerMultiplier', producerId: 6, multiplier: 1.25 } },
  { id: 30, name: 'Lake Titan',            desc: 'Own 25 Data Lakes',            check: () => state.owned[6] >= 25,  reward: 'Data Lakes +100%',     effect: { type: 'producerMultiplier', producerId: 6, multiplier: 2 } },
  { id: 31, name: 'Insight Spark',         desc: 'Reach ×1.01 DP multiplier',    check: () => state.insights >= 0.01, reward: 'All producers +10%',  effect: { type: 'allMultiplier', multiplier: 1.1 } },
  { id: 32, name: 'Insight Engine',        desc: 'Reach ×1.1 DP multiplier',     check: () => state.insights >= 0.1,  reward: 'All producers +20%',  effect: { type: 'allMultiplier', multiplier: 1.2 } },
  { id: 33, name: 'Insight Overflow',      desc: 'Reach ×2.0 DP multiplier',     check: () => state.insights >= 1.0,  reward: 'All producers +50%',  effect: { type: 'allMultiplier', multiplier: 1.5 } },
  { id: 34, name: 'T2 Workforce',          desc: 'Own 50 T2 producers total',    check: () => PRODUCERS.filter(p=>p.tier===2).reduce((s,p)=>s+state.owned[p.id],0) >= 50, reward: 'All T2 +25%', effect: { type: 'allTierMultiplier', tier: 2, multiplier: 1.25 } },
  // 150-tier: add producer production to click power
  { id: 35, name: 'Excel Overlord',        desc: 'Own 150 Excel Analysts',       check: () => state.owned[0] >= 150, reward: '+100% Excel prod to click', effect: { type: 'clickPercentOfProducerProduction', producerId: 0 } },
  { id: 36, name: 'SQL Mastermind',        desc: 'Own 150 SQL Developers',       check: () => state.owned[1] >= 150, reward: '+100% SQL prod to click',   effect: { type: 'clickPercentOfProducerProduction', producerId: 1 } },
  { id: 37, name: 'Pipeline Titan',        desc: 'Own 150 ETL Pipelines',        check: () => state.owned[2] >= 150, reward: '+100% ETL prod to click',   effect: { type: 'clickPercentOfProducerProduction', producerId: 2 } },
  { id: 38, name: 'Catalog Overlord',      desc: 'Own 150 Data Catalogs',        check: () => state.owned[3] >= 150, reward: '+100% Catalog prod to click', effect: { type: 'clickPercentOfProducerProduction', producerId: 3 } },
];

const UPGRADE_GROUPS = [
  { id: 'grp-t1',    label: 'Tier 1',  tag: 'T1',    css: 'tag-tier1', ids: [0,1,2,3,4,5,6,7,8,19,20,21,22,23,24,25] },
  { id: 'grp-t2',    label: 'Tier 2',  tag: 'T2',    css: 'tag-tier2', ids: [9,10,11,12,13,26,27,28,29,30,31,32] },
  { id: 'grp-click', label: 'Click',   tag: 'Click', css: 'tag-click', ids: [14,15,16,17,18,33,34,35,36,37] },
];

const TERRITORIES = [
  { id: 'na', idx: 0, name: 'North America', emoji: '🌎', need: 40,  rate: 0.2, color: '#4a9eff',
    boost: { type: 'producerMultiplier', producerId: 3, multiplier: 10, desc: 'Data Catalog production ×10' },
    d: 'M25 8 L30 6 L35 8 L33 12 L28 11 L22 14 L18 18 L15 22 L12 28 L10 35 L12 38 L15 36 L20 33 L25 30 L30 28 L35 25 L40 22 L45 20 L50 18 L55 17 L60 18 L65 20 L70 22 L75 25 L78 28 L80 32 L82 36 L85 38 L90 36 L93 33 L95 30 L97 28 L100 30 L102 34 L100 38 L95 42 L90 45 L85 48 L82 52 L80 56 L78 60 L80 63 L82 66 L80 68 L76 70 L72 72 L68 70 L65 66 L62 62 L58 58 L55 55 L50 53 L45 52 L40 54 L35 58 L30 62 L28 66 L25 70 L22 72 L18 70 L15 65 L12 60 L10 55 L8 50 L7 45 L8 40 L10 35 L13 30 L16 25 L20 20 L24 15 L27 10 Z' },
  { id: 'sa', idx: 1, name: 'South America', emoji: '🌎', need: 80,  rate: 0.5, color: '#56b6c2',
    boost: { type: 'clickMultiplier', multiplier: 10, desc: 'Click power ×10' },
    d: 'M72 80 L76 78 L80 79 L84 80 L88 82 L91 85 L93 88 L94 92 L93 96 L92 100 L90 104 L88 108 L86 112 L84 115 L82 118 L80 122 L78 126 L76 130 L74 134 L72 138 L70 141 L68 144 L66 146 L64 148 L62 149 L60 150 L58 148 L59 145 L60 142 L62 138 L63 134 L64 130 L65 126 L66 122 L66 118 L65 114 L64 110 L63 106 L62 102 L62 98 L63 94 L64 90 L66 86 L68 83 L70 81 Z' },
  { id: 'eu', idx: 2, name: 'Europe',        emoji: '🌍', need: 140, rate: 1.0, color: '#c678dd',
    boost: { type: 'instantContracts', amount: 1000, desc: '+1,000 Contracts on conquest' },
    d: 'M128 18 L131 14 L134 10 L137 8 L140 6 L144 5 L148 7 L152 10 L155 8 L158 6 L160 8 L162 12 L165 10 L168 12 L170 15 L172 18 L170 22 L168 25 L165 28 L162 30 L160 32 L157 34 L155 36 L152 38 L150 40 L148 42 L145 43 L142 42 L140 40 L138 38 L136 40 L134 43 L132 41 L130 38 L128 35 L126 32 L127 28 L128 24 L129 20 Z' },
  { id: 'af', idx: 3, name: 'Africa',        emoji: '🌍', need: 220, rate: 2.0, color: '#e5c07b',
    boost: null,
    d: 'M135 44 L138 43 L142 44 L146 45 L150 46 L154 48 L158 50 L162 52 L165 55 L168 58 L170 62 L172 66 L173 70 L174 74 L173 78 L172 82 L170 86 L168 90 L166 94 L164 98 L162 102 L160 106 L157 110 L154 114 L151 118 L148 122 L146 125 L144 128 L142 130 L140 132 L138 133 L136 132 L135 129 L134 126 L133 122 L132 118 L131 114 L130 110 L130 106 L130 102 L131 98 L132 94 L132 90 L131 86 L130 82 L128 78 L126 74 L125 70 L125 66 L126 62 L128 58 L130 54 L132 50 L134 47 Z' },
  { id: 'as', idx: 4, name: 'Asia',          emoji: '🌏', need: 350, rate: 4.0, color: '#e06c75',
    boost: null,
    d: 'M172 5 L176 3 L180 4 L185 6 L190 5 L195 4 L200 3 L206 4 L212 5 L218 4 L224 3 L230 4 L236 6 L242 5 L248 4 L254 5 L260 7 L266 6 L272 8 L278 10 L282 12 L286 10 L289 13 L288 17 L285 20 L282 22 L278 24 L274 26 L270 28 L266 30 L262 32 L258 34 L254 32 L250 30 L246 32 L242 35 L238 38 L234 40 L230 42 L226 44 L222 46 L218 48 L214 50 L210 52 L206 55 L202 58 L198 62 L195 66 L192 70 L190 74 L188 78 L186 75 L184 71 L182 67 L180 63 L178 60 L176 64 L174 68 L172 72 L170 76 L168 72 L170 68 L172 64 L174 60 L175 56 L174 52 L172 48 L170 44 L168 40 L166 36 L168 32 L170 28 L172 24 L174 20 L175 16 L174 12 L173 8 Z' },
  { id: 'oc', idx: 5, name: 'Oceania',       emoji: '🌏', need: 550, rate: 8.0, color: '#3fb950',
    boost: null,
    d: 'M238 95 L242 92 L248 91 L254 92 L260 93 L265 95 L269 98 L272 101 L274 104 L275 108 L274 112 L272 116 L269 119 L266 122 L262 124 L258 126 L254 128 L250 130 L246 131 L242 132 L238 131 L236 128 L234 124 L233 120 L234 116 L236 112 L235 108 L234 104 L236 100 L238 97 Z' },
];

const WORLD_UPGRADES = [
  { id: 0, name: 'Regional Office',      cost: 10,   desc: 'Contracts rate +25%',  type: 'contracts', mult: 1.25 },
  { id: 1, name: 'Supply Chain Hub',     cost: 35,   desc: 'DP production +25%',   type: 'dp',        mult: 1.25 },
  { id: 2, name: 'Trade Agreement',      cost: 100,  desc: 'Contracts rate +50%',  type: 'contracts', mult: 1.5  },
  { id: 3, name: 'Global Network',       cost: 250,  desc: 'DP production +50%',   type: 'dp',        mult: 1.5  },
  { id: 4, name: 'Data Standard',        cost: 600,  desc: 'Contracts rate +75%',  type: 'contracts', mult: 1.75 },
  { id: 5, name: 'World Domination',     cost: 1500, desc: 'DP production +100%',  type: 'dp',        mult: 2    },
  // Extended WM upgrades (T2 phase)
  { id: 6,  name: 'Logistics Network',  cost: 3000,   desc: 'Contracts rate +50%',  type: 'contracts', mult: 1.5  },
  { id: 7,  name: 'DP Outsourcing',     cost: 5000,   desc: 'DP production +75%',   type: 'dp',        mult: 1.75 },
  { id: 8,  name: 'Free Trade Zone',    cost: 10000,  desc: 'Contracts rate +100%', type: 'contracts', mult: 2    },
  { id: 9,  name: 'Data Silk Road',     cost: 20000,  desc: 'DP production +150%',  type: 'dp',        mult: 2.5  },
  { id: 10, name: 'Global Monopoly',    cost: 50000,  desc: 'Contracts rate +200%', type: 'contracts', mult: 3    },
  { id: 11, name: 'Planetary Dominion', cost: 100000, desc: 'DP production +300%',  type: 'dp',        mult: 4    },
];

const WORLD_UPGRADE_MAP = Object.fromEntries(WORLD_UPGRADES.map(u => [u.id, u]));

const QUESTS = [
  { id: 0, name: 'Startup Mode',   restriction: 'Max 5 producers total',
    goalResource: 'lifetimeDP',       goalAmount: 2000,  reward: 'All T1 +100% base',   rewardType: 't1bonus' },
  { id: 1, name: 'Analyst Only',   restriction: 'Only Excel Analysts produce',
    goalResource: 'lifetimeDP',       goalAmount: 10000, reward: 'Click power ×3',       rewardType: 'clickx3' },
  { id: 2, name: 'No Shortcuts',   restriction: 'ETL Pipelines & Catalogs disabled',
    goalResource: 'lifetimeDP',       goalAmount: 50000, reward: 'All T1 ×2',            rewardType: 't1x2'    },
  { id: 3, name: 'Insights Rush',  restriction: 'No T1 upgrades apply',
    goalResource: 'lifetimeInsights', goalAmount: 500,   reward: 'All T2 ×2',            rewardType: 't2x2'    },
];

// 0-indexed (id 0 = node 1 displayed as "1")
const TREE_NODES_DEF = [
  { id: 0, name: 'Silver Certification', cost: 5,   desc: 'All producers 1.5×',             parent: null },
  { id: 1, name: 'Click Mastery',        cost: 15,  desc: 'Click power ×5',                 parent: 0    },
  { id: 2, name: 'Platinum Partner',     cost: 30,  desc: 'All T2 producers ×2',            parent: 0    },
  { id: 3, name: 'Automation Expert',    cost: 60,  desc: 'All T1 producers ×3',            parent: 1    },
  { id: 4, name: 'Enterprise License',   cost: 80,  desc: 'All producers ×2',               parent: 2    },
  { id: 5, name: 'AI Automation',        cost: 150, desc: 'All producers ×2 + click ×2',    parent: 4    },
  { id: 6, name: 'Global Expansion',     cost: 120, desc: 'Contracts rate ×3',              parent: 4    },
  { id: 7, name: 'Market Leader',        cost: 300, desc: 'All T2 producers ×5',            parent: 6    },
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

// ═══ PANEL UNLOCK ORDER ═══

// Unlock order: wm → t2 → quests → prestige
// cost: DP cost to purchase (0 = free click, null = auto-unlock)
// ready: prerequisite to show the locked panel
const UNLOCK_ORDER = [
  { key: 'wm',       cost: 100000, ready: () => true,                             progressFn: () => `${fmt(state.dataPoints)} / ${fmt(100000)} DP`,  label: 'Unlock World Map' },
  { key: 't2',       cost: 1e10,   ready: () => state.conquered.every(Boolean),   progressFn: () => `${state.conquered.filter(Boolean).length} / ${TERRITORIES.length} Territories`, label: 'Unlock Tier 2' },
  { key: 'quests',   cost: 1e15,   ready: () => panelsUnlocked.has('t2'),         progressFn: () => `${fmt(state.dataPoints)} / ${fmt(1e15)} DP`,    label: 'Unlock Quests' },
  { key: 'prestige', cost: 0,      ready: () => panelsUnlocked.has('quests'),     progressFn: () => `${state.questsCompleted.filter(Boolean).length} / ${QUESTS.length} Quests Completed`, label: 'Unlock Prestige' },
];

