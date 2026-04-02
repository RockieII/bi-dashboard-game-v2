// ═══ BUILD ALL ═══

function buildAll() {
  buildKPIBar();
  buildDashboard();
  buildAchievementsModal();
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
  document.getElementById('achieve-btn').addEventListener('click', openAchievements);
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
