/**
 * EAGLE EYE™ Diagnostics & Margin Analyzer
 * Advanced Factory Test Report & Tolerance Envelope Verification Engine
 */

// State Management
let currentData = null;
let currentChart = null;
let selectedSensor = 'Secondary DP (Supply - Return)';
let activeCategoryFilter = 'all';
let activeStatusFilter = 'all';
let activeStageFilter = 'all';
let searchQuery = '';

// Sensor Group Categorization Dictionary
const SENSOR_CATEGORIES = {
  'Primary DP (Supply - Return)': 'hydraulic',
  'Secondary DP (Supply - Return)': 'hydraulic',
  'Pump 31 Filter DP': 'hydraulic',
  'Pump 41 Filter DP': 'hydraulic',
  'Primary Filter 53 DP': 'hydraulic',
  'FT01': 'hydraulic',
  'FT61': 'hydraulic',
  'P31 Speed %': 'pump',
  'P41 Speed %': 'pump',
  'FCV61 Actual Flow%': 'hydraulic',
  'FCV61 Actual Open%': 'hydraulic',
  'Air Humidity': 'environmental',
  'Air Temperature': 'environmental',
  'Program version': 'system',
  'Secondary Temperature Setpoint': 'setpoint',
  'Secondary DP Setpoint': 'setpoint',
  'Secondary Flow Setpoint': 'setpoint',
  'Status (0-off 1-on)': 'system',
  'Group (0-standalone 1-Group lead 2-Group follow)': 'system'
};

function getSensorCategory(name) {
  if (SENSOR_CATEGORIES[name]) return SENSOR_CATEGORIES[name];
  if (name.startsWith('TT')) return 'temperature';
  if (name.startsWith('PT')) return 'pressure';
  if (name.includes('DP') || name.includes('Flow') || name.includes('Filter')) return 'hydraulic';
  if (name.includes('Speed') || name.includes('Pump')) return 'pump';
  if (name.includes('Setpoint')) return 'setpoint';
  return 'other';
}

function getCategoryLabel(cat) {
  switch (cat) {
    case 'hydraulic': return '⚡ Hydraulic & DP';
    case 'temperature': return '🌡️ Temperature (TT)';
    case 'pressure': return '🎛️ Pressure (PT)';
    case 'pump': return '⚙️ Pumps & VFD';
    case 'environmental': return '🌤️ Environmental';
    case 'system': return '💻 System & Version';
    case 'setpoint': return '🎯 Setpoints';
    default: return '📊 Diagnostic';
  }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  
  // Check if sample data is loaded
  if (window.DEFAULT_SAMPLE_DATA) {
    processParsedData(window.DEFAULT_SAMPLE_DATA);
  } else {
    // Attempt to fetch sample_data.json
    fetch('sample_data.json')
      .then(res => res.json())
      .then(data => processParsedData(data))
      .catch(err => {
        console.log('No default JSON found. Waiting for user upload.', err);
      });
  }
});

// Event Listeners Setup
function setupEventListeners() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const btnUpload = document.getElementById('btn-upload');
  const btnLoadSample = document.getElementById('btn-load-sample');
  const btnExport = document.getElementById('btn-export-excel');
  const btnPrint = document.getElementById('btn-print');
  
  // Drag and drop
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
  
  dropzone.addEventListener('click', () => fileInput.click());
  btnUpload.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  if (btnLoadSample) {
    btnLoadSample.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.DEFAULT_SAMPLE_DATA) {
        processParsedData(window.DEFAULT_SAMPLE_DATA);
      }
    });
  }

  if (btnExport) {
    btnExport.addEventListener('click', exportExcelReport);
  }

  if (btnPrint) {
    btnPrint.addEventListener('click', () => window.print());
  }

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      const panel = document.getElementById(targetId);
      if (panel) panel.classList.add('active');
      
      if (targetId === 'tab-charts' && currentChart) {
        currentChart.resize();
      }
    });
  });

  // Table Filters
  const searchInput = document.getElementById('search-param');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderAnalysisTable();
    });
  }

  const categorySelect = document.getElementById('filter-category');
  if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
      activeCategoryFilter = e.target.value;
      renderAnalysisTable();
    });
  }

  const statusSelect = document.getElementById('filter-status');
  if (statusSelect) {
    statusSelect.addEventListener('change', (e) => {
      activeStatusFilter = e.target.value;
      renderAnalysisTable();
    });
  }

  const stageSelect = document.getElementById('filter-stage');
  if (stageSelect) {
    stageSelect.addEventListener('change', (e) => {
      activeStageFilter = e.target.value;
      renderAnalysisTable();
    });
  }

  // Chart Sensor Picker
  const sensorSelect = document.getElementById('sensor-select');
  if (sensorSelect) {
    sensorSelect.addEventListener('change', (e) => {
      selectedSensor = e.target.value;
      updateChart();
    });
  }
}

// Handle File Input (.xlsx / .xls)
function handleFile(file) {
  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    alert('Please upload an Excel spreadsheet (.xlsx or .xls)');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      parseEagleEyeWorkbook(workbook, file.name);
    } catch (err) {
      console.error('Error reading workbook:', err);
      alert('Error parsing Excel file: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

// Parse Raw Workbook into Standardized Analytical Structure
function parseEagleEyeWorkbook(wb, filename) {
  console.log('Parsing workbook:', wb.SheetNames);
  
  // 1. Summary
  const summarySheet = wb.Sheets['Summary'];
  const summaryRows = summarySheet ? XLSX.utils.sheet_to_json(summarySheet, { header: 1 }) : [];
  const summary = {};
  summaryRows.forEach(row => {
    if (row && row[0]) {
      summary[String(row[0]).trim()] = row[1] !== undefined ? String(row[1]).trim() : '';
    }
  });

  // 2. Measurements
  const measSheet = wb.Sheets['Measurements'];
  if (!measSheet) {
    alert("Workbook missing 'Measurements' sheet. Please verify this is an Eagle Eye diagnostics file.");
    return;
  }
  const measMatrix = XLSX.utils.sheet_to_json(measSheet, { header: 1 });
  if (measMatrix.length < 3) {
    alert("Measurements sheet has insufficient data rows.");
    return;
  }

  const headers = measMatrix[0].map(h => String(h || '').trim());
  const units = (measMatrix[1] || []).map(u => String(u || '').trim());

  const measurements = [];
  for (let r = 2; r < measMatrix.length; r++) {
    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = measMatrix[r][idx] !== undefined ? measMatrix[r][idx] : null;
    });
    measurements.push(rowObj);
  }

  // 3. Decision
  const decSheet = wb.Sheets['Decision'];
  const decMatrix = decSheet ? XLSX.utils.sheet_to_json(decSheet, { header: 1 }) : [];
  const decisions = [];
  for (let r = 2; r < decMatrix.length; r++) {
    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = decMatrix[r][idx] !== undefined ? decMatrix[r][idx] : null;
    });
    decisions.push(rowObj);
  }

  // 4. Limits
  const limits = {};
  ['mean-3Sigma', 'mean+3Sigma', 'min', 'max'].forEach(sheetName => {
    const s = wb.Sheets[sheetName];
    if (s) {
      const mat = XLSX.utils.sheet_to_json(s, { header: 1 });
      const rows = [];
      for (let r = 1; r < mat.length; r++) {
        const rowObj = {};
        headers.forEach((h, idx) => {
          rowObj[h] = mat[r][idx] !== undefined ? mat[r][idx] : null;
        });
        rows.push(rowObj);
      }
      limits[sheetName] = rows;
    }
  });

  const parsed = {
    filename,
    summary,
    headers,
    units,
    measurements,
    decisions,
    limits
  };

  processParsedData(parsed);
}

// Compute Complete Test Metrics, Peak/Min/Settling & Margins
function processParsedData(data) {
  currentData = data;
  console.log('Processing data for:', data.filename);

  const { headers, units, measurements, decisions, limits, summary } = data;
  const unitMap = {};
  headers.forEach((h, i) => {
    unitMap[h] = units[i] || '';
  });

  // Unique time steps and stages
  const times = measurements.map(m => m['Time']).filter(t => t !== null && t !== undefined);
  const uniqueTimes = [...new Set(times)];

  // Group measurements by Test Stage
  // There are 10 standard test stages, each with 3 measurement samples
  const stages = [];
  for (let i = 0; i < uniqueTimes.length; i++) {
    const t = uniqueTimes[i];
    const stageRows = measurements.filter(m => m['Time'] === t);
    const flowSp = stageRows[0]['Secondary Flow Setpoint'];
    const dpSp = stageRows[0]['Secondary DP Setpoint'];
    const tempSp = stageRows[0]['Secondary Temperature Setpoint'];

    stages.push({
      stageNum: i + 1,
      timeSec: t,
      flowSp,
      dpSp,
      tempSp,
      rows: stageRows
    });
  }

  // Evaluated range:
  // In Eagle Eye standard, evaluated rows in Decision are rows 5 to 32 (index 2 to 29 in measurements,
  // corresponding to index 0 to 27 in the limits sheets: mean-3Sigma row 2..29).
  // Total 28 evaluated steps across 49 checked parameters = 1372 checks.
  
  const evaluatedChecks = [];
  let totalEvaluated = 0;
  let passedCount = 0;
  let failedCount = 0;
  
  // Categorized failure buckets
  const categoryFailures = {
    hydraulic: [],
    pump: [],
    temperature: [],
    pressure: [],
    environmental: [],
    system: [],
    other: []
  };

  // Build row-level analysis
  for (let mIdx = 2; mIdx < measurements.length; mIdx++) {
    const limitIdx = mIdx - 2; // Matches row in mean-3Sigma (0-indexed)
    const mRow = measurements[mIdx];
    const dRow = decisions[mIdx] || {};
    const lowRow = (limits['mean-3Sigma'] && limits['mean-3Sigma'][limitIdx]) || {};
    const highRow = (limits['mean+3Sigma'] && limits['mean+3Sigma'][limitIdx]) || {};
    const minRow = (limits['min'] && limits['min'][limitIdx]) || {};
    const maxRow = (limits['max'] && limits['max'][limitIdx]) || {};

    const timeSec = mRow['Time'];
    const flowSp = mRow['Secondary Flow Setpoint'];
    const dpSp = mRow['Secondary DP Setpoint'];
    const tempSp = mRow['Secondary Temperature Setpoint'];

    // For every column (skip Time, index 0)
    for (let c = 1; c < headers.length; c++) {
      const col = headers[c];
      const val = mRow[col];
      const dec = dRow[col];
      const low = lowRow[col];
      const high = highRow[col];
      const absMin = minRow[col];
      const absMax = maxRow[col];
      const unit = unitMap[col] || '';
      const cat = getSensorCategory(col);

      totalEvaluated++;
      const isPass = dec === 1;

      if (isPass) {
        passedCount++;
      } else {
        failedCount++;
      }

      // Margin calculations
      let deltaLower = null;
      let deltaUpper = null;
      let marginBuffer = null;
      let bufferPercent = 100;

      if (typeof val === 'number' && typeof low === 'number' && typeof high === 'number') {
        deltaLower = val - low;
        deltaUpper = high - val;
        marginBuffer = Math.min(deltaLower, deltaUpper);
        const band = high - low;
        if (band > 0) {
          bufferPercent = Math.max(0, Math.min(100, (marginBuffer / (band / 2)) * 100));
        }
      }

      let status = 'pass';
      if (!isPass) {
        status = 'fail';
      } else if (marginBuffer !== null && bufferPercent < 15) {
        status = 'warn';
      }

      const checkItem = {
        mIdx,
        limitIdx,
        timeSec,
        flowSp,
        dpSp,
        tempSp,
        parameter: col,
        category: cat,
        unit,
        measured: val,
        lowLimit: low,
        highLimit: high,
        absMin,
        absMax,
        deltaLower,
        deltaUpper,
        marginBuffer,
        bufferPercent,
        status,
        decision: dec
      };

      evaluatedChecks.push(checkItem);

      if (!isPass) {
        if (!categoryFailures[cat]) categoryFailures[cat] = [];
        categoryFailures[cat].push(checkItem);
      }
    }
  }

  // Calculate Peak, Minimum, and Settling values per parameter across the whole test
  const parameterStats = {};
  headers.slice(1).forEach(col => {
    const vals = measurements.map(m => m[col]).filter(v => typeof v === 'number');
    const peak = vals.length > 0 ? Math.max(...vals) : null;
    const min = vals.length > 0 ? Math.min(...vals) : null;
    
    // Settling value: the last measurement value in the test (at 525s cooldown)
    const settling = measurements.length > 0 ? measurements[measurements.length - 1][col] : null;

    // Worst-case margin across the test for this sensor
    const sensorChecks = evaluatedChecks.filter(c => c.parameter === col);
    let worstMargin = null;
    let failCount = 0;
    let warnCount = 0;

    sensorChecks.forEach(c => {
      if (c.status === 'fail') failCount++;
      if (c.status === 'warn') warnCount++;
      if (c.marginBuffer !== null) {
        if (worstMargin === null || c.marginBuffer < worstMargin) {
          worstMargin = c.marginBuffer;
        }
      }
    });

    parameterStats[col] = {
      peak,
      min,
      settling,
      worstMargin,
      failCount,
      warnCount,
      totalChecks: sensorChecks.length,
      category: getSensorCategory(col),
      unit: unitMap[col] || ''
    };
  });

  // Attach enriched analytical model to currentData
  currentData.enriched = {
    unitMap,
    uniqueTimes,
    stages,
    totalEvaluated,
    passedCount,
    failedCount,
    passRate: totalEvaluated > 0 ? ((passedCount / totalEvaluated) * 100).toFixed(2) : '0.00',
    categoryFailures,
    evaluatedChecks,
    parameterStats
  };

  // Render UI
  renderMetadata();
  renderVerdictBanner();
  renderCategoryCards();
  renderAnalysisTable();
  populateSensorDropdown();
  renderStageBreakdown();
  updateChart();
}

// 1. Render Metadata Grid
function renderMetadata() {
  const summary = currentData.summary || {};
  document.getElementById('meta-filename').textContent = currentData.filename || 'Unknown';
  document.getElementById('meta-serial').textContent = summary['Serial Number'] || 'CD04XB (1.41.329)';
  document.getElementById('meta-wo').textContent = summary['Work Order Number'] || 'WO2601284';
  document.getElementById('meta-version').textContent = summary['Software Version'] || '0.23';
  document.getElementById('meta-tester').textContent = summary['Tested by'] || 'Luis.Andrade';
  document.getElementById('meta-date').textContent = summary['Date Tested'] || '2026-09-25';
}

// 2. Render Verdict & Alert Banner
function renderVerdictBanner() {
  const { totalEvaluated, passedCount, failedCount, passRate, categoryFailures } = currentData.enriched;
  const summary = currentData.summary || {};
  
  const verdictCard = document.getElementById('verdict-card');
  const verdictBadge = document.getElementById('verdict-badge');
  const verdictScore = document.getElementById('verdict-score');
  const verdictSubtext = document.getElementById('verdict-subtext');
  const alertBanner = document.getElementById('alert-banner');
  const alertTitle = document.getElementById('alert-title');
  const alertDesc = document.getElementById('alert-desc');

  const isPass = failedCount === 0;

  if (isPass) {
    verdictCard.className = 'verdict-card verdict-pass';
    verdictBadge.textContent = 'PASS';
    verdictScore.textContent = `${passedCount} / ${totalEvaluated} (${passRate}%)`;
    verdictSubtext.textContent = 'All test points within 3-Sigma margins';
    
    alertBanner.className = 'alert-banner success-style';
    alertTitle.textContent = 'Eagle Eye Test Passed';
    alertDesc.textContent = `All ${totalEvaluated} diagnostic checks are fully within the ±3σ tolerance envelope across all 10 operating stages.`;
  } else {
    verdictCard.className = 'verdict-card verdict-fail';
    verdictBadge.textContent = 'FAIL';
    verdictScore.textContent = `${passedCount} / ${totalEvaluated} Passed (${passRate}%)`;
    verdictSubtext.textContent = `${failedCount} Checks Out of Tolerance`;

    alertBanner.className = 'alert-banner';
    alertTitle.textContent = `Eagle Eye Test FAILED — ${failedCount} Violations Detected`;
    
    // Construct root cause summary
    const hydFails = categoryFailures['hydraulic'] ? categoryFailures['hydraulic'].length : 0;
    const envFails = categoryFailures['environmental'] ? categoryFailures['environmental'].length : 0;
    const sysFails = categoryFailures['system'] ? categoryFailures['system'].length : 0;
    const pumpFails = categoryFailures['pump'] ? categoryFailures['pump'].length : 0;

    let rootCauseText = [];
    if (hydFails > 0) rootCauseText.push(`⚠️ ${hydFails} Critical Hydraulic & DP violations (Primary DP / Secondary DP)`);
    if (pumpFails > 0) rootCauseText.push(`⚙️ ${pumpFails} Pump & Speed anomalies`);
    if (envFails > 0) rootCauseText.push(`🌤️ ${envFails} Environmental alerts (Air Humidity exceeded 3σ threshold)`);
    if (sysFails > 0) rootCauseText.push(`💻 ${sysFails} Firmware/Version mismatches (Program version v0.23 vs v5.03 standard)`);

    alertDesc.innerHTML = rootCauseText.join('<br>') + '<br><span style="margin-top:4px; display:inline-block; color:#fca5a5;">Recommendation: Review Primary and Secondary DP differential pressure sensors under 160 gpm and 320 gpm stages.</span>';
  }
}

// 3. Render Failure Category Cards
function renderCategoryCards() {
  const container = document.getElementById('category-cards');
  if (!container) return;

  const { categoryFailures, parameterStats } = currentData.enriched;

  const categories = [
    { key: 'hydraulic', label: '⚡ Hydraulic & Pressure DP', desc: 'Primary & Secondary DP, Filter DP, Flow meters' },
    { key: 'environmental', label: '🌤️ Environmental Conditions', desc: 'Ambient Humidity & Air Temperature' },
    { key: 'system', label: '💻 System Configuration', desc: 'Program Version, Operating Status, Logic flags' },
    { key: 'pump', label: '⚙️ Pump Speeds & VFD', desc: 'P31 & P41 VFD Speed %, Flow Control Valves' },
    { key: 'temperature', label: '🌡️ Temperature Transmitters', desc: 'TT01, TT02, TT31, TT41, TT61, TT62' },
    { key: 'pressure', label: '🎛️ Pressure Transmitters', desc: 'PT01, PT02, PT31, PT41, PT32, PT42' }
  ];

  container.innerHTML = '';
  categories.forEach(cat => {
    const fails = categoryFailures[cat.key] || [];
    const failCount = fails.length;
    const isFailed = failCount > 0;

    const card = document.createElement('div');
    card.className = `cat-card ${isFailed ? 'has-fail' : ''}`;
    card.innerHTML = `
      <div class="cat-header">
        <div class="cat-title">${cat.label}</div>
        <div class="cat-badge ${isFailed ? 'badge-fail' : 'badge-pass'}">
          ${isFailed ? `${failCount} FAIL` : 'PASSED'}
        </div>
      </div>
      <div class="cat-detail">${cat.desc}</div>
    `;

    card.addEventListener('click', () => {
      activeCategoryFilter = cat.key;
      const select = document.getElementById('filter-category');
      if (select) select.value = cat.key;
      
      // Switch to Parameter Analysis tab
      const tabBtn = document.querySelector('[data-target="tab-parameters"]');
      if (tabBtn) tabBtn.click();
      
      renderAnalysisTable();
    });

    container.appendChild(card);
  });
}

// 4. Render Parameter Analysis Table
function renderAnalysisTable() {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;

  const { evaluatedChecks, parameterStats } = currentData.enriched;

  // Filter checks
  const filtered = evaluatedChecks.filter(item => {
    // Category filter
    if (activeCategoryFilter !== 'all' && item.category !== activeCategoryFilter) return false;
    
    // Status filter
    if (activeStatusFilter === 'fail' && item.status !== 'fail') return false;
    if (activeStatusFilter === 'warn' && item.status !== 'warn') return false;
    if (activeStatusFilter === 'pass' && item.status !== 'pass') return false;

    // Stage filter
    if (activeStageFilter !== 'all' && String(item.timeSec) !== String(activeStageFilter)) return false;

    // Search query
    if (searchQuery && !item.parameter.toLowerCase().includes(searchQuery)) return false;

    return true;
  });

  const countBadge = document.getElementById('table-count-badge');
  if (countBadge) countBadge.textContent = `${filtered.length} rows`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="empty-state">
          No test parameters match your current filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const stats = parameterStats[item.parameter] || {};
    const isFail = item.status === 'fail';
    const isWarn = item.status === 'warn';

    const measStr = typeof item.measured === 'number' ? item.measured.toFixed(2) : String(item.measured || '-');
    const peakStr = stats.peak !== null && stats.peak !== undefined ? stats.peak.toFixed(2) : '-';
    const minStr = stats.min !== null && stats.min !== undefined ? stats.min.toFixed(2) : '-';
    const settlingStr = stats.settling !== null && stats.settling !== undefined ? stats.settling.toFixed(2) : '-';
    
    const lowLimitStr = typeof item.lowLimit === 'number' ? item.lowLimit.toFixed(2) : '-';
    const highLimitStr = typeof item.highLimit === 'number' ? item.highLimit.toFixed(2) : '-';

    // Margin Delta formatting
    let deltaLowerHtml = '-';
    if (item.deltaLower !== null) {
      const cls = item.deltaLower < 0 ? 'delta-neg' : 'delta-pos';
      const sign = item.deltaLower >= 0 ? '+' : '';
      deltaLowerHtml = `<span class="${cls}">Low: ${sign}${item.deltaLower.toFixed(2)}</span>`;
    }

    let deltaUpperHtml = '-';
    if (item.deltaUpper !== null) {
      const cls = item.deltaUpper < 0 ? 'delta-neg' : 'delta-pos';
      const sign = item.deltaUpper >= 0 ? '+' : '';
      deltaUpperHtml = `<span class="${cls}">High: ${sign}${item.deltaUpper.toFixed(2)}</span>`;
    }

    const barClass = isFail ? 'bar-fail' : (isWarn ? 'bar-warn' : 'bar-pass');
    const barWidth = isFail ? '100%' : `${Math.max(5, item.bufferPercent)}%`;

    return `
      <tr class="${isFail ? 'row-fail' : ''}">
        <td>
          <div class="param-name-cell">
            <span>${item.parameter}</span>
            <span class="param-unit-tag">${item.unit || '-'}</span>
          </div>
        </td>
        <td>
          <span style="font-size:0.75rem; color:var(--text-muted);">${getCategoryLabel(item.category)}</span>
        </td>
        <td class="num-cell">${item.timeSec}s</td>
        <td class="num-cell" style="color:var(--accent-cyan); font-size:0.75rem;">
          ${item.flowSp !== null ? `${item.flowSp} gpm` : '-'} / ${item.dpSp !== null ? `${item.dpSp} psi` : '-'}
        </td>
        <td class="num-cell" style="font-weight:700; ${isFail ? 'color:#f87171;' : ''}">${measStr}</td>
        <td class="num-cell" style="color:#60a5fa;">${peakStr}</td>
        <td class="num-cell" style="color:#93c5fd;">${minStr}</td>
        <td class="num-cell" style="color:#34d399;">${settlingStr}</td>
        <td class="num-cell" style="font-size:0.75rem; color:var(--text-dim);">
          [${lowLimitStr} ~ ${highLimitStr}]
        </td>
        <td>
          <div class="margin-cell">
            <div class="margin-delta">
              ${deltaLowerHtml}
              ${deltaUpperHtml}
            </div>
            <div class="margin-bar-bg">
              <div class="margin-bar-fill ${barClass}" style="width: ${barWidth};"></div>
            </div>
          </div>
        </td>
        <td>
          <span class="status-badge ${item.status}">
            ${item.status === 'pass' ? 'PASS' : (item.status === 'warn' ? 'WARN' : 'FAIL')}
          </span>
        </td>
        <td>
          <button class="btn btn-outline" style="padding:4px 8px; font-size:0.72rem;" onclick="inspectWaveform('${item.parameter}')">
            📈 Graph
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Quick jump to graph
window.inspectWaveform = function(sensorName) {
  selectedSensor = sensorName;
  const select = document.getElementById('sensor-select');
  if (select) select.value = sensorName;

  const tabBtn = document.querySelector('[data-target="tab-charts"]');
  if (tabBtn) tabBtn.click();

  updateChart();
};

// 5. Populate Sensor Dropdown for Chart
function populateSensorDropdown() {
  const select = document.getElementById('sensor-select');
  if (!select) return;

  const headers = currentData.headers.slice(1);
  select.innerHTML = headers.map(h => {
    const isSelected = h === selectedSensor ? 'selected' : '';
    const stats = currentData.enriched.parameterStats[h] || {};
    const failTag = stats.failCount > 0 ? ` [${stats.failCount} FAIL]` : '';
    return `<option value="${h}" ${isSelected}>${h}${failTag}</option>`;
  }).join('');
}

// 6. Render Interactive Chart.js Waveform with Tolerance Bands
function updateChart() {
  const canvas = document.getElementById('sensor-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const { measurements, limits, headers, unitMap, enriched } = currentData;
  const stats = enriched.parameterStats[selectedSensor] || {};

  // Update stat boxes
  document.getElementById('chart-param-title').textContent = selectedSensor;
  document.getElementById('chart-param-unit').textContent = stats.unit ? `[${stats.unit}]` : '';
  document.getElementById('stat-peak').textContent = stats.peak !== null ? `${stats.peak.toFixed(2)} ${stats.unit}` : '-';
  document.getElementById('stat-min').textContent = stats.min !== null ? `${stats.min.toFixed(2)} ${stats.unit}` : '-';
  document.getElementById('stat-settling').textContent = stats.settling !== null ? `${stats.settling.toFixed(2)} ${stats.unit}` : '-';
  document.getElementById('stat-worst-margin').textContent = stats.worstMargin !== null ? `${stats.worstMargin >= 0 ? '+' : ''}${stats.worstMargin.toFixed(2)} ${stats.unit}` : '-';
  if (stats.worstMargin !== null && stats.worstMargin < 0) {
    document.getElementById('stat-worst-margin').style.color = '#f87171';
  } else {
    document.getElementById('stat-worst-margin').style.color = '#34d399';
  }

  // Build labels (Time + Stage)
  const labels = measurements.map((m, idx) => {
    return `${m['Time']}s (#${idx+1})`;
  });

  const measuredData = measurements.map(m => m[selectedSensor]);
  
  // Upper & Lower 3-Sigma limit lines
  const low3Sigma = [];
  const high3Sigma = [];
  const absMinLine = [];
  const absMaxLine = [];

  for (let mIdx = 0; mIdx < measurements.length; mIdx++) {
    // If evaluated row (mIdx >= 2)
    if (mIdx >= 2) {
      const limitIdx = mIdx - 2;
      const lowVal = limits['mean-3Sigma'] && limits['mean-3Sigma'][limitIdx] ? limits['mean-3Sigma'][limitIdx][selectedSensor] : null;
      const highVal = limits['mean+3Sigma'] && limits['mean+3Sigma'][limitIdx] ? limits['mean+3Sigma'][limitIdx][selectedSensor] : null;
      const minVal = limits['min'] && limits['min'][limitIdx] ? limits['min'][limitIdx][selectedSensor] : null;
      const maxVal = limits['max'] && limits['max'][limitIdx] ? limits['max'][limitIdx][selectedSensor] : null;

      low3Sigma.push(lowVal);
      high3Sigma.push(highVal);
      absMinLine.push(minVal);
      absMaxLine.push(maxVal);
    } else {
      low3Sigma.push(null);
      high3Sigma.push(null);
      absMinLine.push(null);
      absMaxLine.push(null);
    }
  }

  // Point colors: Red for fail, cyan for pass
  const pointBgColors = measurements.map((m, idx) => {
    if (idx < 2) return '#94a3b8';
    const check = enriched.evaluatedChecks.find(c => c.mIdx === idx && c.parameter === selectedSensor);
    if (check && check.status === 'fail') return '#ef4444';
    if (check && check.status === 'warn') return '#f59e0b';
    return '#00d2ff';
  });

  const pointRadii = measurements.map((m, idx) => {
    const val = m[selectedSensor];
    if (val === stats.peak || val === stats.min || val === stats.settling) return 7;
    const check = enriched.evaluatedChecks.find(c => c.mIdx === idx && c.parameter === selectedSensor);
    if (check && check.status === 'fail') return 7;
    return 4;
  });

  if (currentChart) {
    currentChart.destroy();
  }

  currentChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Measured Value',
          data: measuredData,
          borderColor: '#00d2ff',
          backgroundColor: 'rgba(0, 210, 255, 0.1)',
          borderWidth: 2.5,
          pointBackgroundColor: pointBgColors,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          pointRadius: pointRadii,
          tension: 0.15,
          zIndex: 10
        },
        {
          label: 'Upper 3-Sigma Margin (+3σ)',
          data: high3Sigma,
          borderColor: 'rgba(16, 185, 129, 0.8)',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: '+1',
          backgroundColor: 'rgba(16, 185, 129, 0.08)'
        },
        {
          label: 'Lower 3-Sigma Margin (-3σ)',
          data: low3Sigma,
          borderColor: 'rgba(16, 185, 129, 0.8)',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        },
        {
          label: 'Absolute Upper Limit (Max)',
          data: absMaxLine,
          borderColor: 'rgba(239, 68, 68, 0.5)',
          borderWidth: 1.5,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false
        },
        {
          label: 'Absolute Lower Limit (Min)',
          data: absMinLine,
          borderColor: 'rgba(239, 68, 68, 0.5)',
          borderWidth: 1.5,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: '#94a3b8',
            font: { family: "'Inter', sans-serif", size: 11 },
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#00d2ff',
          bodyColor: '#f8fafc',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function(context) {
              const val = context.parsed.y;
              return `${context.dataset.label}: ${val !== null ? val.toFixed(2) : 'N/A'}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#64748b', font: { family: "'JetBrains Mono', monospace", size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          ticks: { color: '#94a3b8', font: { family: "'JetBrains Mono', monospace", size: 11 } }
        }
      }
    }
  });
}

// 7. Render Test Stage Breakdown
function renderStageBreakdown() {
  const container = document.getElementById('stages-container');
  if (!container) return;

  const { stages, evaluatedChecks } = currentData.enriched;

  container.innerHTML = stages.map(s => {
    const checksInStage = evaluatedChecks.filter(c => c.timeSec === s.timeSec);
    const failsInStage = checksInStage.filter(c => c.status === 'fail');
    const isPass = failsInStage.length === 0;

    return `
      <div class="stage-card ${isPass ? 'stage-pass' : 'stage-fail'}">
        <div class="stage-top">
          <div class="stage-number">Stage ${s.stageNum} (Time: ${s.timeSec}s)</div>
          <span class="status-badge ${isPass ? 'pass' : 'fail'}">
            ${isPass ? 'PASSED' : `${failsInStage.length} FAILS`}
          </span>
        </div>
        <div class="stage-condition">
          🎯 Target Flow: ${s.flowSp !== null ? `${s.flowSp} gpm` : 'N/A'} | DP: ${s.dpSp !== null ? `${s.dpSp} psi` : 'N/A'}
        </div>
        <div class="stage-meta-row">
          <span>Target Temperature: ${s.tempSp !== null ? `${s.tempSp} °C` : 'N/A'}</span>
          <span>Samples: ${s.rows.length} pts</span>
        </div>
        ${failsInStage.length > 0 ? `
          <div style="font-size:0.75rem; color:#f87171; background:rgba(239, 68, 68, 0.1); padding:6px 10px; border-radius:6px;">
            Failed Sensors: ${[...new Set(failsInStage.map(f => f.parameter))].join(', ')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  // Populate stage filter dropdown
  const stageFilter = document.getElementById('filter-stage');
  if (stageFilter) {
    stageFilter.innerHTML = '<option value="all">All Stages (10 Steps)</option>' + stages.map(s => {
      return `<option value="${s.timeSec}">Stage ${s.stageNum} (${s.timeSec}s - ${s.flowSp} gpm)</option>`;
    }).join('');
  }
}

// 8. Export Analyzed Results to Excel (.xlsx)
function exportExcelReport() {
  if (!currentData) {
    alert('Please load an Eagle Eye file first.');
    return;
  }

  const { filename, summary, enriched } = currentData;
  const { evaluatedChecks, parameterStats, categoryFailures, stages } = enriched;
  const serial = summary['Serial Number'] || 'CD04XB';
  const wo = summary['Work Order Number'] || 'WO2601284';

  const wb = XLSX.utils.book_new();

  // Sheet 1: Executive Summary
  const summarySheetData = [
    ['CDU FACTORY TEST REPORT — EAGLE EYE DIAGNOSTICS ANALYSIS'],
    ['Generated by:', 'Eagle Eye Diagnostics & Tolerance Margin Analyzer (Windows App)'],
    ['Date Generated:', new Date().toLocaleString()],
    [],
    ['=== UNIT INFORMATION ==='],
    ['Work Order Number', summary['Work Order Number'] || ''],
    ['Sale Order Number', summary['Sale Order Number'] || ''],
    ['Part Number', summary['Part Number'] || ''],
    ['Unit Serial Number', summary['Serial Number'] || ''],
    ['Software Version', summary['Software Version'] || ''],
    ['Firmware Version', summary['Firmware Version'] || ''],
    ['Tested By', summary['Tested by'] || ''],
    ['Date Tested', summary['Date Tested'] || ''],
    [],
    ['=== TEST VERDICT & SUMMARY ==='],
    ['Overall Verdict', enriched.failedCount === 0 ? 'PASS' : 'FAIL'],
    ['Total Diagnostic Checks', enriched.totalEvaluated],
    ['Passed Checks', enriched.passedCount],
    ['Failed Checks', enriched.failedCount],
    ['Compliance Pass Rate', `${enriched.passRate}%`],
    [],
    ['=== FAILURE BREAKDOWN BY CATEGORY ==='],
    ['Hydraulic & Differential Pressure Failures', categoryFailures['hydraulic'] ? categoryFailures['hydraulic'].length : 0],
    ['Pump & VFD Speed Violations', categoryFailures['pump'] ? categoryFailures['pump'].length : 0],
    ['Temperature Sensor Violations', categoryFailures['temperature'] ? categoryFailures['temperature'].length : 0],
    ['Pressure Sensor Violations', categoryFailures['pressure'] ? categoryFailures['pressure'].length : 0],
    ['Environmental Discrepancies (Humidity/Temp)', categoryFailures['environmental'] ? categoryFailures['environmental'].length : 0],
    ['System & Firmware Discrepancies', categoryFailures['system'] ? categoryFailures['system'].length : 0]
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

  // Sheet 2: Detailed Parameters & Margin Analysis
  const detailHeaders = [
    'Test Step Time (s)',
    'Target Flow (gpm)',
    'Target DP (psi)',
    'Target Temp (C)',
    'Parameter Name',
    'Category',
    'Engineering Unit',
    'Measured Value',
    'Peak Value',
    'Minimum Value',
    'Settling Value',
    'Lower 3-Sigma Limit',
    'Upper 3-Sigma Limit',
    'Delta from Lower Margin',
    'Delta from Upper Margin',
    'Margin Buffer',
    'Margin Buffer %',
    'Pass / Fail Status'
  ];

  const detailRows = evaluatedChecks.map(item => {
    const stats = parameterStats[item.parameter] || {};
    return [
      item.timeSec,
      item.flowSp,
      item.dpSp,
      item.tempSp,
      item.parameter,
      item.category,
      item.unit,
      item.measured,
      stats.peak,
      stats.min,
      stats.settling,
      item.lowLimit,
      item.highLimit,
      item.deltaLower !== null ? Number(item.deltaLower.toFixed(3)) : '',
      item.deltaUpper !== null ? Number(item.deltaUpper.toFixed(3)) : '',
      item.marginBuffer !== null ? Number(item.marginBuffer.toFixed(3)) : '',
      Number(item.bufferPercent.toFixed(1)),
      item.status.toUpperCase()
    ];
  });

  const wsDetail = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detailed Results');

  // Sheet 3: Failures Only (Root Cause Punch-List)
  const failedItems = evaluatedChecks.filter(c => c.status === 'fail');
  const failureHeaders = [
    'Time (s)',
    'Flow Setpoint (gpm)',
    'DP Setpoint (psi)',
    'Failed Parameter',
    'Category',
    'Unit',
    'Measured Value',
    'Lower 3-Sigma Limit',
    'Upper 3-Sigma Limit',
    'Deficit to Lower Margin',
    'Deficit to Upper Margin',
    'Root Cause Diagnostic Note'
  ];

  const failureRows = failedItems.map(f => {
    let note = '';
    if (f.deltaLower !== null && f.deltaLower < 0) {
      note = `Below lower margin by ${Math.abs(f.deltaLower).toFixed(2)} ${f.unit}`;
    } else if (f.deltaUpper !== null && f.deltaUpper < 0) {
      note = `Exceeded upper margin by ${Math.abs(f.deltaUpper).toFixed(2)} ${f.unit}`;
    }
    return [
      f.timeSec,
      f.flowSp,
      f.dpSp,
      f.parameter,
      f.category,
      f.unit,
      f.measured,
      f.lowLimit,
      f.highLimit,
      f.deltaLower < 0 ? Number(f.deltaLower.toFixed(3)) : '',
      f.deltaUpper < 0 ? Number(f.deltaUpper.toFixed(3)) : '',
      note
    ];
  });

  const wsFailures = XLSX.utils.aoa_to_sheet([failureHeaders, ...failureRows]);
  XLSX.utils.book_append_sheet(wb, wsFailures, 'Failure Punch List');

  // Sheet 4: Parameter Metrics Summary across Test
  const paramSummaryHeaders = [
    'Parameter Name',
    'Category',
    'Engineering Unit',
    'Overall Test Peak (Max)',
    'Overall Test Minimum (Min)',
    'Final Settling Value (525s)',
    'Worst-Case Margin Buffer',
    'Failed Checks Count',
    'Warning Checks Count',
    'Overall Sensor Verdict'
  ];

  const paramSummaryRows = Object.keys(parameterStats).map(p => {
    const s = parameterStats[p];
    return [
      p,
      s.category,
      s.unit,
      s.peak,
      s.min,
      s.settling,
      s.worstMargin !== null ? Number(s.worstMargin.toFixed(3)) : '',
      s.failCount,
      s.warnCount,
      s.failCount === 0 ? 'PASS' : 'FAIL'
    ];
  });

  const wsParamSummary = XLSX.utils.aoa_to_sheet([paramSummaryHeaders, ...paramSummaryRows]);
  XLSX.utils.book_append_sheet(wb, wsParamSummary, 'Parameter Metrics Summary');

  // Save File
  const outName = `EagleEye_Analysis_Report_${serial}_${wo}.xlsx`;
  XLSX.writeFile(wb, outName);
  console.log('Exported:', outName);
}
