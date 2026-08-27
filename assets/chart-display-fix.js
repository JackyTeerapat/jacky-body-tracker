(() => {
  const S = window.__JACKY_TRACKER__;
  if (!S?.DATA?.length || !window.Chart) return;

  const D = S.DATA
    .filter(row => row?.isoDate)
    .slice()
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  const latest = D.at(-1);
  const MS = 864e5;
  const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const TARGET_VISIBLE_GAP_KG = 2;

  const dt = value => new Date(`${value}T00:00:00Z`);
  const shift = (date, days) => new Date(date.getTime() + days * MS);
  const iso = date => date.toISOString().slice(0, 10);
  const avg = values => {
    const nums = values.map(Number).filter(Number.isFinite);
    return nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : null;
  };
  const one = value => Number.isFinite(Number(value)) ? Number(value).toFixed(1) : '—';
  const two = value => Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '—';
  const shortDate = value => {
    const date = typeof value === 'string' ? dt(value) : value;
    return Number.isNaN(date.getTime()) ? '—' : `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
  };
  const signedPct = value => {
    if (!Number.isFinite(Number(value))) return '—';
    const n = Number(value);
    const sign = n > 0 ? '+' : n < 0 ? '−' : '';
    return `${sign}${Math.abs(n).toFixed(1)}%`;
  };
  const signed = (value, unit = '') => {
    if (!Number.isFinite(Number(value))) return '—';
    const n = Number(value);
    const sign = n > 0 ? '+' : n < 0 ? '−' : '';
    return `${sign}${Math.abs(n).toFixed(2)}${unit}`;
  };

  function latestStamp() {
    const match = String(latest?.measuredAt || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (match) return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]} · ${match[4]}:${match[5]}`;
    const matchDate = String(latest?.isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return matchDate ? `${Number(matchDate[3])} ${MONTHS[Number(matchDate[2]) - 1]} ${matchDate[1]}` : (latest?.date || '—');
  }

  function updateHeader() {
    const header = document.querySelector('#summary-app .s-header');
    if (!header) return;
    const eyebrow = header.querySelector('.s-eyebrow');
    const title = header.querySelector('h1');
    const date = header.querySelector('.s-date');
    if (eyebrow) eyebrow.textContent = 'JACKY';
    if (title) title.textContent = 'BODY TRACKER';
    if (date) date.textContent = `อัปเดตล่าสุด · ${latestStamp()}`;
  }

  function completedWeekEnds() {
    const latestDate = dt(latest.isoDate);
    const latestCompletedSunday = shift(latestDate, -latestDate.getUTCDay());
    const seen = new Set();
    D.forEach(row => {
      const d = dt(row.isoDate);
      const sunday = shift(d, d.getUTCDay() === 0 ? 0 : 7 - d.getUTCDay());
      if (sunday <= latestCompletedSunday) seen.add(iso(sunday));
    });
    return [...seen].sort().reverse();
  }

  function rowsForWeek(endIso) {
    const end = dt(endIso);
    const start = shift(end, -6);
    return D.filter(row => row.isoDate >= iso(start) && row.isoDate <= endIso);
  }

  function weekLabel(endIso) {
    const end = dt(endIso);
    const start = shift(end, -6);
    return `${shortDate(start)}–${shortDate(end)} ${end.getUTCFullYear()}`;
  }

  function changeMeta(current, previous, lowerIsBetter) {
    if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
      return { delta: null, percent: null, arrow: '→', cls: 'neutral' };
    }
    const delta = current - previous;
    const percent = (delta / previous) * 100;
    const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
    const good = lowerIsBetter ? delta < 0 : delta > 0;
    const bad = lowerIsBetter ? delta > 0 : delta < 0;
    return { delta, percent, arrow, cls: Math.abs(delta) < 0.001 ? 'neutral' : good ? 'good' : bad ? 'watch' : 'neutral' };
  }

  function renderCheckpoint(card, selectedEndIso) {
    const weeks = completedWeekEnds();
    if (!weeks.length) return;
    const selected = weeks.includes(selectedEndIso) ? selectedEndIso : weeks[0];
    const previousEndIso = iso(shift(dt(selected), -7));
    const current = rowsForWeek(selected);
    const previous = rowsForWeek(previousEndIso);
    const A = (rows, key) => avg(rows.map(row => row[key]));

    const cf = A(current, 'fat');
    const pf = A(previous, 'fat');
    const cb = A(current, 'bf');
    const pb = A(previous, 'bf');
    const cm = A(current, 'muscle');
    const pm = A(previous, 'muscle');
    const cw = A(current, 'weight');
    const pw = A(previous, 'weight');

    const fat = changeMeta(cf, pf, true);
    const muscle = changeMeta(cm, pm, false);
    const weight = changeMeta(cw, pw, true);
    const bfDelta = Number.isFinite(cb) && Number.isFinite(pb) ? cb - pb : null;
    const enough = current.length >= 4 && previous.length >= 4;

    const options = weeks.map(value => `<option value="${value}"${value === selected ? ' selected' : ''}>${weekLabel(value)}</option>`).join('');
    const statusText = (label, meta) => enough && meta.percent != null
      ? `${label} ${meta.arrow} ${signedPct(meta.percent).replace(/^\+/, '')}`
      : `${label} · ข้อมูลยังไม่พอ`;
    const metricText = (meta, unit) => meta.delta == null ? '—' : `${meta.arrow} ${signed(meta.delta, unit)} · ${signedPct(meta.percent)}`;
    const bfText = bfDelta == null ? '—' : `${bfDelta > 0 ? '↑' : bfDelta < 0 ? '↓' : '→'} ${signed(bfDelta, '%')}`;
    const latestWeek = weeks[0];
    const footerRight = selected === latestWeek ? `Checkpoint ถัดไป ${shortDate(shift(dt(latestWeek), 7))}` : 'กำลังดูย้อนหลัง';

    card.innerHTML = `
      <div class="s-weekly-head s-weekly-head-v2">
        <div>
          <p>WEEKLY CHECKPOINT</p>
          <select class="s-checkpoint-select" aria-label="เลือกสัปดาห์ย้อนหลัง">${options}</select>
        </div>
        <div class="s-checkpoint-statuses">
          <span class="${fat.cls}">${statusText('ไขมันเฉลี่ย', fat)}</span>
          <span class="${muscle.cls}">${statusText('กล้ามเนื้อเฉลี่ย', muscle)}</span>
        </div>
      </div>
      <div class="s-weekly-grid">
        <div><small>Fat avg</small><strong>${one(cf)} kg</strong><em>${metricText(fat, ' kg')}</em></div>
        <div><small>BF avg</small><strong>${one(cb)}%</strong><em>${bfText}</em></div>
        <div><small>Muscle avg</small><strong>${one(cm)} kg</strong><em>${metricText(muscle, ' kg')}</em></div>
        <div><small>Weight avg</small><strong>${one(cw)} kg</strong><em>${metricText(weight, ' kg')}</em></div>
      </div>
      <div class="s-weekly-foot">
        <span>${current.length} ครั้งในสัปดาห์นี้${enough ? '' : ' · confidence ต่ำ'}</span>
        <strong>${footerRight}</strong>
      </div>`;

    const select = card.querySelector('.s-checkpoint-select');
    if (select) select.addEventListener('change', event => renderCheckpoint(card, event.target.value));
  }

  function setupCheckpoint() {
    const card = document.querySelector('#summary-app .s-weekly-checkpoint');
    if (!card || card.dataset.jackyCheckpointReady === '1') return;
    card.dataset.jackyCheckpointReady = '1';
    renderCheckpoint(card, completedWeekEnds()[0]);
  }

  function renamePreviousRange() {
    const button = document.querySelector('#summary-app .s-range-controls button[data-range="1"]');
    if (button) button.textContent = 'ครั้งก่อน';
  }

  function selectedRange() {
    return Number(document.querySelector('#summary-app .s-range-controls button[aria-pressed="true"]')?.dataset.range || 7);
  }

  function rowsForRange(range) {
    if (range === 1) return D.slice(-2);
    const lastDay = Number(D.at(-1)?.daysFromStart);
    if (!Number.isFinite(lastDay) || range >= 365) return D;
    return D.filter(row => Number(row.daysFromStart) >= lastDay - range + 1);
  }

  function rolling(rows, key, days) {
    return rows.map(row => {
      const end = Number(row.daysFromStart);
      const values = rows
        .filter(item => Number(item.daysFromStart) >= end - days + 1 && Number(item.daysFromStart) <= end)
        .map(item => item[key]);
      return { x: end, y: avg(values) };
    }).filter(point => Number.isFinite(point.y));
  }

  function weekly(rows, key) {
    const groups = new Map();
    rows.forEach(row => {
      const date = dt(row.isoDate);
      const sunday = shift(date, date.getUTCDay() === 0 ? 0 : 7 - date.getUTCDay());
      const endIso = iso(sunday);
      if (!groups.has(endIso)) groups.set(endIso, []);
      groups.get(endIso).push(row);
    });
    return [...groups.values()].map(group => ({
      x: avg(group.map(row => row.daysFromStart)),
      y: avg(group.map(row => row[key]))
    })).filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
  }

  function ensureReadout(canvas) {
    const card = canvas.closest('.s-chart-card') || canvas.parentElement?.parentElement;
    if (!card) return null;
    let readout = card.querySelector('.s-chart-hover-readout');
    if (!readout) {
      readout = document.createElement('div');
      readout.className = 's-chart-hover-readout';
      readout.setAttribute('aria-live', 'polite');
      const canvasWrap = canvas.parentElement;
      canvasWrap?.insertAdjacentElement('beforebegin', readout);
    }
    return readout;
  }

  function nearestDate(day) {
    if (!Number.isFinite(day)) return '';
    const row = D.reduce((best, item) => {
      const current = Number(item.daysFromStart);
      if (!Number.isFinite(current)) return best;
      if (!best) return item;
      return Math.abs(current - day) < Math.abs(Number(best.daysFromStart) - day) ? item : best;
    }, null);
    return row?.date || row?.isoDate || '';
  }

  function patchChart(id, key, target) {
    const canvas = document.getElementById(id);
    const chart = canvas && window.Chart.getChart ? window.Chart.getChart(canvas) : null;
    if (!chart) return false;

    const range = selectedRange();
    const rows = rowsForRange(range).filter(row => Number.isFinite(Number(row.daysFromStart)) && Number.isFinite(Number(row[key])));
    if (!rows.length) return false;

    const color = key === 'fat' ? '#ef7c67' : '#2bb9b3';
    const raw = rows.map(row => ({ x: Number(row.daysFromStart), y: Number(row[key]) }));
    let main = raw;
    let label = key === 'fat' ? 'ไขมัน' : 'กล้ามเนื้อ';
    let showRaw = false;

    if (range >= 90) {
      main = weekly(rows, key);
      label = 'ค่าเฉลี่ยรายสัปดาห์';
    } else if (range >= 30) {
      main = rolling(rows, key, 7);
      label = 'ค่าเฉลี่ย 7 วัน';
      showRaw = true;
    } else if (range >= 7) {
      main = rolling(rows, key, 3);
      label = 'ค่าเฉลี่ย 3 วัน';
      showRaw = true;
    } else if (range === 1) {
      label = 'ค่าที่วัดจริง';
    }

    const datasets = [];
    if (showRaw) {
      datasets.push({
        label: 'ค่าที่วัดจริง',
        data: raw,
        borderColor: `${color}55`,
        backgroundColor: 'transparent',
        borderWidth: 1.2,
        pointRadius: 2,
        pointHoverRadius: 5,
        tension: .15,
        fill: false
      });
    }

    datasets.push({
      label,
      data: main,
      borderColor: color,
      backgroundColor: key === 'fat' ? 'rgba(239,124,103,.10)' : 'rgba(43,185,179,.10)',
      borderWidth: 2.5,
      pointRadius: range === 1 ? 4 : (range >= 90 ? 2.5 : 0),
      pointHoverRadius: 5,
      tension: range === 1 ? 0 : .25,
      fill: true
    });

    const current = Number(latest?.[key]);
    const goal = Number(target);
    const showTarget = Number.isFinite(current) && Number.isFinite(goal) && Math.abs(current - goal) <= TARGET_VISIBLE_GAP_KG;
    if (showTarget && main.length) {
      datasets.push({
        label: 'เป้าหมาย',
        data: main.map(point => ({ x: point.x, y: goal })),
        borderColor: '#8a9899',
        borderDash: [4, 4],
        borderWidth: 1.1,
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false
      });
    }

    chart.data.datasets = datasets;
    chart.options.plugins = chart.options.plugins || {};
    chart.options.plugins.tooltip = { ...(chart.options.plugins.tooltip || {}), enabled: false };
    chart.options.interaction = { mode: 'nearest', intersect: false, axis: 'xy' };

    const readout = ensureReadout(canvas);
    const baseWidths = datasets.map(dataset => dataset.borderWidth || 1);
    chart.$jackyHoverDataset = null;
    chart.options.onHover = (_event, active) => {
      const hit = active?.[0];
      if (!hit) {
        if (readout) readout.textContent = '';
        if (chart.$jackyHoverDataset !== null) {
          chart.data.datasets.forEach((dataset, index) => { dataset.borderWidth = baseWidths[index]; });
          chart.$jackyHoverDataset = null;
          chart.update('none');
        }
        return;
      }

      const datasetIndex = hit.datasetIndex;
      const dataset = chart.data.datasets[datasetIndex];
      const context = hit.element?.$context;
      const value = Number(context?.parsed?.y ?? context?.raw?.y ?? context?.raw);
      const day = Number(context?.raw?.x ?? context?.parsed?.x);
      const date = nearestDate(day);
      if (readout) readout.textContent = `${date}${date ? ' · ' : ''}${dataset.label} ${Number.isFinite(value) ? value.toFixed(1) : '—'} kg`;

      if (chart.$jackyHoverDataset !== datasetIndex) {
        chart.data.datasets.forEach((item, index) => {
          item.borderWidth = index === datasetIndex ? Math.max(3.5, baseWidths[index]) : Math.min(.8, baseWidths[index]);
        });
        chart.$jackyHoverDataset = datasetIndex;
        chart.update('none');
      }
    };

    const xs = main.map(point => Number(point.x)).filter(Number.isFinite);
    if (xs.length) {
      chart.options.scales.x.min = xs.length === 1 ? xs[0] - .6 : Math.min(...xs);
      chart.options.scales.x.max = xs.length === 1 ? xs[0] + .6 : Math.max(...xs);
    }

    const values = datasets
      .filter(dataset => dataset.label !== 'เป้าหมาย')
      .flatMap(dataset => dataset.data.map(point => Number(point?.y ?? point)))
      .filter(Number.isFinite);
    if (values.length) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const span = Math.max(max - min, .5);
      const padding = Math.max(.25, span * .2);
      chart.options.scales.y.min = Math.floor((min - padding) * 10) / 10;
      chart.options.scales.y.max = Math.ceil((max + padding) * 10) / 10;
    }

    chart.update('none');
    return true;
  }

  function updateRangeNote() {
    const range = selectedRange();
    const note = document.getElementById('s-range-note');
    if (!note) return;
    note.textContent = range === 1
      ? 'เทียบผลครั้งก่อนกับผลล่าสุด'
      : range >= 90
        ? 'ค่าเฉลี่ยรายสัปดาห์เพื่อลด noise'
        : range >= 30
          ? 'เส้นบาง = ค่าจริง · เส้นหลัก = ค่าเฉลี่ย 7 วัน'
          : 'เส้นบาง = ค่าจริง · เส้นหลัก = ค่าเฉลี่ย 3 วัน';
  }

  function addStyle() {
    if (document.getElementById('chart-display-fix-style')) return;
    const style = document.createElement('style');
    style.id = 'chart-display-fix-style';
    style.textContent = `
      .s-chart-hover-readout{height:18px;margin:0 0 2px;text-align:right;color:#617579;font-size:10px;font-weight:700;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .s-weekly-head-v2{align-items:flex-start!important}
      .s-checkpoint-select{margin:1px 0 0;padding:2px 24px 2px 0;border:0;background:transparent;color:#182326;font:800 17px/1.25 system-ui,sans-serif;cursor:pointer;outline:none}
      .s-checkpoint-statuses{display:grid;grid-template-columns:1fr 1fr;gap:6px;min-width:280px}
      .s-checkpoint-statuses span{padding:7px 9px;border-radius:999px;font-size:9px;font-weight:800;white-space:nowrap;text-align:center}
      .s-checkpoint-statuses .good{background:#e2f5f3;color:#147d7a}
      .s-checkpoint-statuses .watch{background:#fff0eb;color:#c26453}
      .s-checkpoint-statuses .neutral{background:#f1f4f3;color:#718084}
      .s-weekly-checkpoint .s-weekly-fat-compare{display:none!important}
      @media(max-width:620px){
        .s-weekly-head-v2{display:block!important}
        .s-checkpoint-statuses{min-width:0;margin-top:8px}
        .s-checkpoint-select{font-size:16px;max-width:100%}
      }`;
    document.head.appendChild(style);
  }

  function patchAll() {
    updateHeader();
    addStyle();
    renamePreviousRange();
    setupCheckpoint();
    const fatReady = patchChart('s-fat-chart', 'fat', S.TARGET);
    const muscleReady = patchChart('s-muscle-chart', 'muscle', S.MUSCLE_TARGET);
    updateRangeNote();
    return fatReady && muscleReady;
  }

  function start() {
    updateHeader();
    addStyle();
    renamePreviousRange();
    setupCheckpoint();

    document.querySelectorAll('#summary-app .s-range-controls button').forEach(button => {
      if (button.dataset.jackyBound === '1') return;
      button.dataset.jackyBound = '1';
      button.addEventListener('click', () => setTimeout(patchAll, 80));
    });

    let attempts = 0;
    const tryPatch = () => {
      attempts += 1;
      const ready = patchAll();
      if (!ready && attempts < 20) setTimeout(tryPatch, 100);
    };
    setTimeout(tryPatch, 40);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', start, { once: true })
    : start();
})();
