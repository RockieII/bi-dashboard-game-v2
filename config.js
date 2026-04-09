// ═══ CONSTANTS & DEFINITIONS ═══

const TICK_MS = 250;
const DT = TICK_MS / 1000;
const SAVE_KEY = 'bi-dashboard-v2';
const SETTINGS_KEY = 'bi-dashboard-settings';
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
    baseCost: 1e10,       costMult: 1.35, baseProduction: 0.0002, produces: 'insights' },
  { id: 5, tier: 2, name: 'Data Warehouse',     emoji: '🏛️', desc: 'Centralised analytical store — stronger multiplier.',
    baseCost: 1e13,       costMult: 1.35, baseProduction: 0.002,  produces: 'insights' },
  { id: 6, tier: 2, name: 'Data Lake',           emoji: '🌊', desc: 'Petabyte-scale storage — major multiplier.',
    baseCost: 1e16,       costMult: 1.35, baseProduction: 0.01,  produces: 'insights' },
];

// Each upgrade has: phase ('t1' | 't2' | 'mastery' | 'quest') controls visibility gate;
// category ('producer' | 'click' | 'global' | 'contracts') controls which panel renders it.
const UPGRADES = [
  { id: 0,  name: 'Pivot Tables',          desc: 'Excel Analysts 2× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'owned', producerId: 0, count: 1 },
    cost: { resource: 'dataPoints', amount: 25 },     effect: { type: 'producerMultiplier', producerId: 0, multiplier: 2 } },
  { id: 1,  name: 'VLOOKUP Mastery',       desc: 'Excel Analysts 2× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'owned', producerId: 0, count: 5 },
    cost: { resource: 'dataPoints', amount: 100 },    effect: { type: 'producerMultiplier', producerId: 0, multiplier: 2 } },
  { id: 2,  name: 'Power Query',           desc: 'Excel Analysts 2× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'owned', producerId: 0, count: 25 },
    cost: { resource: 'dataPoints', amount: 2500 },   effect: { type: 'producerMultiplier', producerId: 0, multiplier: 2 } },
  { id: 3,  name: 'Query Optimization',    desc: 'SQL Developers 2× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'owned', producerId: 1, count: 1 },
    cost: { resource: 'dataPoints', amount: 250 },    effect: { type: 'producerMultiplier', producerId: 1, multiplier: 2 } },
  { id: 4,  name: 'Stored Procedures',     desc: 'SQL Developers 2× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'owned', producerId: 1, count: 5 },
    cost: { resource: 'dataPoints', amount: 1200 },   effect: { type: 'producerMultiplier', producerId: 1, multiplier: 2 } },
  { id: 5,  name: 'Incremental Load',      desc: 'ETL Pipelines 2× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'owned', producerId: 2, count: 1 },
    cost: { resource: 'dataPoints', amount: 2500 },   effect: { type: 'producerMultiplier', producerId: 2, multiplier: 2 } },
  { id: 6,  name: 'CDC Streaming',         desc: 'ETL Pipelines 2× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'owned', producerId: 2, count: 5 },
    cost: { resource: 'dataPoints', amount: 15000 },  effect: { type: 'producerMultiplier', producerId: 2, multiplier: 2 } },
  { id: 7,  name: 'Data Governance',       desc: 'All Tier 1 producers 1.5× production.',
    phase: 't1', category: 'global',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 300 },
    cost: { resource: 'dataPoints', amount: 500 },    effect: { type: 'allTierMultiplier', tier: 1, multiplier: 1.5 } },
  { id: 8,  name: 'Cloud Migration',       desc: 'All Tier 1 producers 2× production.',
    phase: 't1', category: 'global',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 5000 },
    cost: { resource: 'dataPoints', amount: 4000 },   effect: { type: 'allTierMultiplier', tier: 1, multiplier: 2 } },
  { id: 9,  name: 'Star Schema Design',    desc: 'Power BI Dashboards 2× production.',
    phase: 't2', category: 'producer',
    unlock: { type: 'owned', producerId: 4, count: 1 },
    cost: { resource: 'dataPoints', amount: 5e10 },       effect: { type: 'producerMultiplier', producerId: 4, multiplier: 2 } },
  { id: 10, name: 'Row-Level Security',    desc: 'Power BI Dashboards 2× production.',
    phase: 't2', category: 'producer',
    unlock: { type: 'owned', producerId: 4, count: 5 },
    cost: { resource: 'dataPoints', amount: 5e11 },       effect: { type: 'producerMultiplier', producerId: 4, multiplier: 2 } },
  { id: 11, name: 'Columnar Storage',      desc: 'Data Warehouses 2× production.',
    phase: 't2', category: 'producer',
    unlock: { type: 'owned', producerId: 5, count: 1 },
    cost: { resource: 'dataPoints', amount: 5e13 },       effect: { type: 'producerMultiplier', producerId: 5, multiplier: 2 } },
  { id: 12, name: 'Partitioning Strategy', desc: 'Data Warehouses 2× production.',
    phase: 't2', category: 'producer',
    unlock: { type: 'owned', producerId: 5, count: 5 },
    cost: { resource: 'dataPoints', amount: 5e14 },       effect: { type: 'producerMultiplier', producerId: 5, multiplier: 2 } },
  { id: 13, name: 'Delta Lake Format',     desc: 'Data Lakes 2× production.',
    phase: 't2', category: 'producer',
    unlock: { type: 'owned', producerId: 6, count: 1 },
    cost: { resource: 'dataPoints', amount: 5e16 },       effect: { type: 'producerMultiplier', producerId: 6, multiplier: 2 } },
  // Click upgrades (ids 14-18)
  { id: 14, name: 'Touch Typing',          desc: 'Click power 2×.',
    phase: 't1', category: 'click',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 10 },
    cost: { resource: 'dataPoints', amount: 30 },     effect: { type: 'clickMultiplier', multiplier: 2 } },
  { id: 15, name: 'Keyboard Shortcuts',    desc: 'Click power 2×.',
    phase: 't1', category: 'click',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 300 },
    cost: { resource: 'dataPoints', amount: 500 },    effect: { type: 'clickMultiplier', multiplier: 2 } },
  { id: 16, name: 'Macro Recorder',        desc: 'Click power 3×.',
    phase: 't1', category: 'click',
    unlock: { type: 'owned', producerId: 1, count: 5 },
    cost: { resource: 'dataPoints', amount: 5000 },   effect: { type: 'clickMultiplier', multiplier: 3 } },
  { id: 17, name: 'RPA Bot',               desc: 'Click power 5×.',
    phase: 't1', category: 'click',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 25000 },
    cost: { resource: 'dataPoints', amount: 15000 },  effect: { type: 'clickMultiplier', multiplier: 5 } },
  { id: 18, name: 'One-Click Reports',     desc: 'Click power 4×.',
    phase: 't2', category: 'click',
    unlock: { type: 'owned', producerId: 4, count: 5 },
    cost: { resource: 'dataPoints', amount: 30000 },  effect: { type: 'clickMultiplier', multiplier: 4 } },
  // Click = 1% of production upgrades (ids 33-37)
  { id: 33, name: 'Data Sampling',         desc: 'Click +1% of DP/s.',
    phase: 't1', category: 'click',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 500 },
    cost: { resource: 'dataPoints', amount: 500 },        effect: { type: 'clickPercentOfProduction', percent: 1 } },
  { id: 34, name: 'Smart Clipboard',       desc: 'Click +1% of DP/s.',
    phase: 't1', category: 'click',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 50000 },
    cost: { resource: 'dataPoints', amount: 50000 },      effect: { type: 'clickPercentOfProduction', percent: 1 } },
  { id: 35, name: 'Batch Processor',       desc: 'Click +1% of DP/s.',
    phase: 't1', category: 'click',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 500000 },
    cost: { resource: 'dataPoints', amount: 500000 },     effect: { type: 'clickPercentOfProduction', percent: 1 } },
  { id: 36, name: 'Stream Tap',            desc: 'Click +1% of DP/s.',
    phase: 't2', category: 'click',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 10000000 },
    cost: { resource: 'dataPoints', amount: 10000000 },   effect: { type: 'clickPercentOfProduction', percent: 1 } },
  { id: 37, name: 'Neural Harvester',      desc: 'Click +1% of DP/s.',
    phase: 't2', category: 'click',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 500000000 },
    cost: { resource: 'dataPoints', amount: 500000000 },  effect: { type: 'clickPercentOfProduction', percent: 1 } },
  // Additional T1 upgrades (ids 19-25)
  { id: 19, name: 'VBA Macros',             desc: 'Excel Analysts 3× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'owned', producerId: 0, count: 50 },
    cost: { resource: 'dataPoints', amount: 12000 },  effect: { type: 'producerMultiplier', producerId: 0, multiplier: 3 } },
  { id: 20, name: 'Materialized Views',     desc: 'SQL Developers 3× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'owned', producerId: 1, count: 25 },
    cost: { resource: 'dataPoints', amount: 25000 },  effect: { type: 'producerMultiplier', producerId: 1, multiplier: 3 } },
  { id: 21, name: 'Parallel Processing',    desc: 'ETL Pipelines 3× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'owned', producerId: 2, count: 25 },
    cost: { resource: 'dataPoints', amount: 100000 }, effect: { type: 'producerMultiplier', producerId: 2, multiplier: 3 } },
  { id: 22, name: 'Metadata Indexing',      desc: 'Data Catalogs 2× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'owned', producerId: 3, count: 5 },
    cost: { resource: 'dataPoints', amount: 50000 },  effect: { type: 'producerMultiplier', producerId: 3, multiplier: 2 } },
  { id: 23, name: 'Data Lineage Tracking',  desc: 'Data Catalogs 2× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'owned', producerId: 3, count: 25 },
    cost: { resource: 'dataPoints', amount: 500000 }, effect: { type: 'producerMultiplier', producerId: 3, multiplier: 2 } },
  { id: 24, name: 'Data Mesh Architecture', desc: 'All Tier 1 producers 3× production.',
    phase: 't1', category: 'global',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 50000 },
    cost: { resource: 'dataPoints', amount: 35000 },  effect: { type: 'allTierMultiplier', tier: 1, multiplier: 3 } },
  { id: 25, name: 'Lakehouse Unification',  desc: 'All Tier 1 producers 2× production.',
    phase: 't1', category: 'global',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 250000 },
    cost: { resource: 'dataPoints', amount: 150000 }, effect: { type: 'allTierMultiplier', tier: 1, multiplier: 2 } },
  // Asia-unlocked T1 upgrades (ids 38-41, visible only after conquering Asia)
  { id: 38, name: 'Neural Spreadsheets',   desc: 'Excel Analysts 5× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'territory', territoryIdx: 4 },
    cost: { resource: 'dataPoints', amount: 1e7 },   effect: { type: 'producerMultiplier', producerId: 0, multiplier: 5 } },
  { id: 39, name: 'Quantum Queries',       desc: 'SQL Developers 5× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'territory', territoryIdx: 4 },
    cost: { resource: 'dataPoints', amount: 5e7 },   effect: { type: 'producerMultiplier', producerId: 1, multiplier: 5 } },
  { id: 40, name: 'AI Orchestration',      desc: 'ETL Pipelines 5× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'territory', territoryIdx: 4 },
    cost: { resource: 'dataPoints', amount: 2e8 },   effect: { type: 'producerMultiplier', producerId: 2, multiplier: 5 } },
  { id: 41, name: 'Autonomous Cataloging', desc: 'Data Catalogs 5× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'territory', territoryIdx: 4 },
    cost: { resource: 'dataPoints', amount: 1e9 },   effect: { type: 'producerMultiplier', producerId: 3, multiplier: 5 } },
  // Additional T2 upgrades (ids 26-32)
  { id: 26, name: 'Advanced DAX',          desc: 'Power BI Dashboards 3× production.',
    phase: 't2', category: 'producer',
    unlock: { type: 'owned', producerId: 4, count: 15 },
    cost: { resource: 'dataPoints', amount: 1e12 },       effect: { type: 'producerMultiplier', producerId: 4, multiplier: 3 } },
  { id: 27, name: 'Snowflake Migration',   desc: 'Data Warehouses 3× production.',
    phase: 't2', category: 'producer',
    unlock: { type: 'owned', producerId: 5, count: 10 },
    cost: { resource: 'dataPoints', amount: 1e15 },       effect: { type: 'producerMultiplier', producerId: 5, multiplier: 3 } },
  { id: 28, name: 'Lakehouse Architecture',desc: 'Data Lakes 3× production.',
    phase: 't2', category: 'producer',
    unlock: { type: 'owned', producerId: 6, count: 5 },
    cost: { resource: 'dataPoints', amount: 1e18 },       effect: { type: 'producerMultiplier', producerId: 6, multiplier: 3 } },
  { id: 29, name: 'DP Accelerator',        desc: 'All T1 producers 2× production.',
    phase: 't2', category: 'global',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 1e11 },
    cost: { resource: 'dataPoints', amount: 1e11 },       effect: { type: 'allTierMultiplier', tier: 1, multiplier: 2 } },
  { id: 30, name: 'Contract Optimizer',    desc: 'Contracts rate ×2.',
    phase: 't2', category: 'contracts',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 5e11 },
    cost: { resource: 'dataPoints', amount: 5e11 },       effect: { type: 'contractsMultiplier', multiplier: 2 } },
  { id: 31, name: 'Insight Analytics',     desc: 'All T2 producers 2× production.',
    phase: 't2', category: 'global',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 1e13 },
    cost: { resource: 'dataPoints', amount: 1e14 },       effect: { type: 'allTierMultiplier', tier: 2, multiplier: 2 } },
  { id: 32, name: 'Enterprise Data Fabric',desc: 'All producers 2× production.',
    phase: 't2', category: 'global',
    unlock: { type: 'lifetimeEarned', resource: 'dataPoints', amount: 1e17 },
    cost: { resource: 'dataPoints', amount: 1e17 },       effect: { type: 'allMultiplier', multiplier: 2 } },
  // ═══ T08: T1 LADDER EXPANSION (ids 42-49) ═══
  // Fills the uniform 1/5/25/50/75 milestone ladder for all 4 T1 producers.
  // Excel: had 1/5/25/50 → adding 75
  { id: 42, name: 'Macro-First Workflow',  desc: 'Excel Analysts 1.5× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'owned', producerId: 0, count: 75 },
    cost: { resource: 'dataPoints', amount: 50000 },     effect: { type: 'producerMultiplier', producerId: 0, multiplier: 1.5 } },
  // SQL: had 1/5/25 → adding 50, 75
  { id: 43, name: 'Index Whisperer',       desc: 'SQL Developers 3× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'owned', producerId: 1, count: 50 },
    cost: { resource: 'dataPoints', amount: 120000 },    effect: { type: 'producerMultiplier', producerId: 1, multiplier: 3 } },
  { id: 44, name: 'Execution Plan Mastery', desc: 'SQL Developers 1.5× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'owned', producerId: 1, count: 75 },
    cost: { resource: 'dataPoints', amount: 500000 },    effect: { type: 'producerMultiplier', producerId: 1, multiplier: 1.5 } },
  // ETL: had 1/5/25 → adding 50, 75
  { id: 45, name: 'Pipeline Choreography', desc: 'ETL Pipelines 3× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'owned', producerId: 2, count: 50 },
    cost: { resource: 'dataPoints', amount: 500000 },    effect: { type: 'producerMultiplier', producerId: 2, multiplier: 3 } },
  { id: 46, name: 'Schema Drift Mastery',  desc: 'ETL Pipelines 1.5× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'owned', producerId: 2, count: 75 },
    cost: { resource: 'dataPoints', amount: 2.5e6 },     effect: { type: 'producerMultiplier', producerId: 2, multiplier: 1.5 } },
  // Catalog: had 5/25 → adding 1, 50, 75
  { id: 47, name: 'Tagging Discipline',    desc: 'Data Catalogs 2× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'owned', producerId: 3, count: 1 },
    cost: { resource: 'dataPoints', amount: 30000 },     effect: { type: 'producerMultiplier', producerId: 3, multiplier: 2 } },
  { id: 48, name: 'Glossary Federation',   desc: 'Data Catalogs 3× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'owned', producerId: 3, count: 50 },
    cost: { resource: 'dataPoints', amount: 5e6 },       effect: { type: 'producerMultiplier', producerId: 3, multiplier: 3 } },
  { id: 49, name: 'Catalog Hegemony',      desc: 'Data Catalogs 1.5× production.',
    phase: 't1', category: 'producer',
    unlock: { type: 'owned', producerId: 3, count: 75 },
    cost: { resource: 'dataPoints', amount: 25e6 },      effect: { type: 'producerMultiplier', producerId: 3, multiplier: 1.5 } },
  // ═══ T08: T1 MASTERY TIER (ids 50-61) ═══
  // Gated by 'mastery' phase (all 6 territories conquered).
  // Per producer: ×2 at 100, ×3 at 125, ×5 at 150.
  // Excel
  { id: 50, name: 'Spreadsheet Sage',      desc: 'Excel Analysts 2× production.',
    phase: 'mastery', category: 'producer',
    unlock: { type: 'owned', producerId: 0, count: 100 },
    cost: { resource: 'dataPoints', amount: 250000 },    effect: { type: 'producerMultiplier', producerId: 0, multiplier: 2 } },
  { id: 51, name: 'Excel Demiurge',        desc: 'Excel Analysts 3× production.',
    phase: 'mastery', category: 'producer',
    unlock: { type: 'owned', producerId: 0, count: 125 },
    cost: { resource: 'dataPoints', amount: 2e6 },       effect: { type: 'producerMultiplier', producerId: 0, multiplier: 3 } },
  { id: 52, name: 'Spreadsheet Singularity', desc: 'Excel Analysts 5× production.',
    phase: 'mastery', category: 'producer',
    unlock: { type: 'owned', producerId: 0, count: 150 },
    cost: { resource: 'dataPoints', amount: 20e6 },      effect: { type: 'producerMultiplier', producerId: 0, multiplier: 5 } },
  // SQL
  { id: 53, name: 'Query Sovereign',       desc: 'SQL Developers 2× production.',
    phase: 'mastery', category: 'producer',
    unlock: { type: 'owned', producerId: 1, count: 100 },
    cost: { resource: 'dataPoints', amount: 2.5e6 },     effect: { type: 'producerMultiplier', producerId: 1, multiplier: 2 } },
  { id: 54, name: 'Schema Demiurge',       desc: 'SQL Developers 3× production.',
    phase: 'mastery', category: 'producer',
    unlock: { type: 'owned', producerId: 1, count: 125 },
    cost: { resource: 'dataPoints', amount: 20e6 },      effect: { type: 'producerMultiplier', producerId: 1, multiplier: 3 } },
  { id: 55, name: 'Database Omniscience',  desc: 'SQL Developers 5× production.',
    phase: 'mastery', category: 'producer',
    unlock: { type: 'owned', producerId: 1, count: 150 },
    cost: { resource: 'dataPoints', amount: 200e6 },     effect: { type: 'producerMultiplier', producerId: 1, multiplier: 5 } },
  // ETL
  { id: 56, name: 'Pipeline Sovereign',    desc: 'ETL Pipelines 2× production.',
    phase: 'mastery', category: 'producer',
    unlock: { type: 'owned', producerId: 2, count: 100 },
    cost: { resource: 'dataPoints', amount: 12e6 },      effect: { type: 'producerMultiplier', producerId: 2, multiplier: 2 } },
  { id: 57, name: 'Pipeline Demiurge',     desc: 'ETL Pipelines 3× production.',
    phase: 'mastery', category: 'producer',
    unlock: { type: 'owned', producerId: 2, count: 125 },
    cost: { resource: 'dataPoints', amount: 100e6 },     effect: { type: 'producerMultiplier', producerId: 2, multiplier: 3 } },
  { id: 58, name: 'Data Plumbing Singularity', desc: 'ETL Pipelines 5× production.',
    phase: 'mastery', category: 'producer',
    unlock: { type: 'owned', producerId: 2, count: 150 },
    cost: { resource: 'dataPoints', amount: 1e9 },       effect: { type: 'producerMultiplier', producerId: 2, multiplier: 5 } },
  // Catalog
  { id: 59, name: 'Catalog Sovereign',     desc: 'Data Catalogs 2× production.',
    phase: 'mastery', category: 'producer',
    unlock: { type: 'owned', producerId: 3, count: 100 },
    cost: { resource: 'dataPoints', amount: 120e6 },     effect: { type: 'producerMultiplier', producerId: 3, multiplier: 2 } },
  { id: 60, name: 'Catalog Demiurge',      desc: 'Data Catalogs 3× production.',
    phase: 'mastery', category: 'producer',
    unlock: { type: 'owned', producerId: 3, count: 125 },
    cost: { resource: 'dataPoints', amount: 1e9 },       effect: { type: 'producerMultiplier', producerId: 3, multiplier: 3 } },
  { id: 61, name: 'Catalog Omniscience',   desc: 'Data Catalogs 5× production.',
    phase: 'mastery', category: 'producer',
    unlock: { type: 'owned', producerId: 3, count: 150 },
    cost: { resource: 'dataPoints', amount: 10e9 },      effect: { type: 'producerMultiplier', producerId: 3, multiplier: 5 } },
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

// Phase + category replaces UPGRADE_GROUPS. Filter dynamically.
// panel: 't1' | 't2' | 'click'
function getUpgradesForPanel(panel) {
  switch (panel) {
    case 't1':
      // T1 producer panel: t1 + mastery phase, producer + global categories
      return UPGRADES.filter(u =>
        (u.phase === 't1' || u.phase === 'mastery') &&
        (u.category === 'producer' || u.category === 'global'));
    case 't2':
      // T2 panel: t2 phase, producer + global + contracts categories
      return UPGRADES.filter(u =>
        u.phase === 't2' &&
        (u.category === 'producer' || u.category === 'global' || u.category === 'contracts'));
    case 'click':
      // Click panel: any phase, click category
      return UPGRADES.filter(u => u.category === 'click');
  }
  return [];
}

// Visual tag for an upgrade pill (replaces UPGRADE_GROUPS tag/css fields)
function getUpgradeTagInfo(u) {
  if (u.category === 'click') return { tag: 'Click', css: 'tag-click' };
  if (u.phase === 'mastery')  return { tag: 'M',     css: 'tag-tier3' };
  if (u.phase === 't2')       return { tag: 'T2',    css: 'tag-tier2' };
  return                            { tag: 'T1',    css: 'tag-tier1' };
}

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
    boost: { type: 'contractsMultiplier', multiplier: 5, desc: 'Contracts production ×5' },
    d: 'M135 44 L138 43 L142 44 L146 45 L150 46 L154 48 L158 50 L162 52 L165 55 L168 58 L170 62 L172 66 L173 70 L174 74 L173 78 L172 82 L170 86 L168 90 L166 94 L164 98 L162 102 L160 106 L157 110 L154 114 L151 118 L148 122 L146 125 L144 128 L142 130 L140 132 L138 133 L136 132 L135 129 L134 126 L133 122 L132 118 L131 114 L130 110 L130 106 L130 102 L131 98 L132 94 L132 90 L131 86 L130 82 L128 78 L126 74 L125 70 L125 66 L126 62 L128 58 L130 54 L132 50 L134 47 Z' },
  { id: 'as', idx: 4, name: 'Asia',          emoji: '🌏', need: 350, rate: 4.0, color: '#e06c75',
    boost: { type: 'unlockUpgrades', desc: 'Unlock new T1 upgrades' },
    d: 'M172 5 L176 3 L180 4 L185 6 L190 5 L195 4 L200 3 L206 4 L212 5 L218 4 L224 3 L230 4 L236 6 L242 5 L248 4 L254 5 L260 7 L266 6 L272 8 L278 10 L282 12 L286 10 L289 13 L288 17 L285 20 L282 22 L278 24 L274 26 L270 28 L266 30 L262 32 L258 34 L254 32 L250 30 L246 32 L242 35 L238 38 L234 40 L230 42 L226 44 L222 46 L218 48 L214 50 L210 52 L206 55 L202 58 L198 62 L195 66 L192 70 L190 74 L188 78 L186 75 L184 71 L182 67 L180 63 L178 60 L176 64 L174 68 L172 72 L170 76 L168 72 L170 68 L172 64 L174 60 L175 56 L174 52 L172 48 L170 44 L168 40 L166 36 L168 32 L170 28 L172 24 L174 20 L175 16 L174 12 L173 8 Z' },
  { id: 'oc', idx: 5, name: 'Oceania',       emoji: '🌏', need: 550, rate: 8.0, color: '#3fb950',
    boost: { type: 'allTierMultiplier', tier: 1, multiplier: 5, desc: 'All T1 production ×5' },
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

// ═══ INSIGHT MILESTONES ═══

const INSIGHT_MILESTONES = [
  { threshold: 0.01,  reward: 'All T1 ×1.5',            effect: { type: 'allTierMultiplier', tier: 1, multiplier: 1.5 } },
  { threshold: 0.05,  reward: 'Click power ×3',          effect: { type: 'clickMultiplier', multiplier: 3 } },
  { threshold: 0.1,   reward: 'Contracts rate ×2',       effect: { type: 'contractsMultiplier', multiplier: 2 } },
  { threshold: 0.25,  reward: 'All T2 ×2',               effect: { type: 'allTierMultiplier', tier: 2, multiplier: 2 } },
  { threshold: 0.5,   reward: 'All producers ×2',        effect: { type: 'allMultiplier', multiplier: 2 } },
  { threshold: 1.5,   reward: 'All T1 ×3 + Click ×5',   effect: { type: 'combo', effects: [{ type: 'allTierMultiplier', tier: 1, multiplier: 3 }, { type: 'clickMultiplier', multiplier: 5 }] } },
  { threshold: 4.0,   reward: 'All producers ×5',        effect: { type: 'allMultiplier', multiplier: 5 } },
  { threshold: 15.0,  reward: 'All producers ×10',       effect: { type: 'allMultiplier', multiplier: 10 } },
];

// ═══ PRESTIGE TREE ═══
// Main spine: 0 → 1 → 3 → 5 → 6 → 8
// Branches: 2 (off 1), 4 (off 3), 7 (off 6)
// No cost — 1 node point per prestige, pick which to activate

const TREE_NODES_DEF = [
  { id: 0, name: 'Silver Certification', desc: 'All producers ×1.5',                      parent: null, type: 'spine' },
  { id: 1, name: 'Auto-Clicker',        desc: 'Enables autoclicker (1 click/s)',           parent: 0,    type: 'spine' },
  { id: 2, name: 'Turbo Click',         desc: 'Auto-clicker ×10 + click power ×5',        parent: 1,    type: 'branch' },
  { id: 3, name: 'Insight Boost',       desc: 'Insight gain ×3',                           parent: 1,    type: 'spine' },
  { id: 4, name: 'Contract Engine',     desc: 'Contracts rate ×5 + start with 100 C',     parent: 3,    type: 'branch' },
  { id: 5, name: 'Softcap Breaker',     desc: 'Softcap threshold ×100',                   parent: 3,    type: 'spine' },
  { id: 6, name: 'Auto-Buyer',          desc: 'Auto-buy cheapest T1 every 5s',             parent: 5,    type: 'spine' },
  { id: 7, name: 'T2 Accelerator',      desc: 'Insight milestones give 2× bonus',          parent: 6,    type: 'branch' },
  { id: 8, name: 'Data Empire',         desc: 'All producers ×10 + start with 1e6 DP',    parent: 6,    type: 'spine' },
];

// SVG node positions — viewBox "0 0 180 390"
// Spine runs down center (cx=90), branches fork left/right
const NODE_POS = [
  { cx: 90,  cy: 28  }, // 0 — Silver Cert (spine)
  { cx: 90,  cy: 85  }, // 1 — Auto-Clicker (spine)
  { cx: 40,  cy: 120 }, // 2 — Turbo Click (branch left)
  { cx: 90,  cy: 150 }, // 3 — Insight Boost (spine)
  { cx: 140, cy: 185 }, // 4 — Contract Engine (branch right)
  { cx: 90,  cy: 215 }, // 5 — Softcap Breaker (spine)
  { cx: 90,  cy: 280 }, // 6 — Auto-Buyer (spine)
  { cx: 40,  cy: 315 }, // 7 — T2 Accelerator (branch left)
  { cx: 90,  cy: 363 }, // 8 — Data Empire (spine)
];

// ═══ PANEL UNLOCK ORDER ═══

// Unlock order: wm → t2 → quests → prestige
// cost: DP cost to purchase (0 = free click, null = auto-unlock)
// ready: prerequisite to show the locked panel
const UNLOCK_ORDER = [
  { key: 'wm',       cost: 100000, ready: () => true,                             progressFn: () => `${fmt(state.dataPoints)} / ${fmt(100000)} DP`,  label: 'Unlock World Map' },
  { key: 't2',       cost: 0,      visible: () => panelsUnlocked.has('wm'),       ready: () => state.conquered.every(Boolean),   progressFn: () => `${state.conquered.filter(Boolean).length} / ${TERRITORIES.length} Territories`, label: 'Unlock Tier 2' },
  { key: 'quests',   cost: 1e18,   ready: () => panelsUnlocked.has('t2'),         progressFn: () => `${fmt(state.dataPoints)} / ${fmt(1e18)} DP`,    label: 'Unlock Quests' },
  { key: 'prestige', cost: 0,      visible: () => panelsUnlocked.has('quests'),   ready: () => state.questsCompleted.every(Boolean), progressFn: () => `${state.questsCompleted.filter(Boolean).length} / ${QUESTS.length} Quests Completed`, label: 'Unlock Prestige' },
];

