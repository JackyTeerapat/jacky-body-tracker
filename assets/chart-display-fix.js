(() => {
  const S = window.__JACKY_TRACKER__;
  if (!S?.DATA?.length || !window.Chart) return;

  const D = S.DATA.filter(x => x?.isoDate).slice().sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  const latest = D.at(-1);
  const MS = 864e5;
  const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const TARGET_VISIBLE_GAP_KG = 2;
  const dt = s => new Date(s + 'T00:00:00Z');
  const sh = (d, n) => new Date(d.getTime() + n * MS);
  const iso = d => d.toISOString().slice(0, 10);
  const avg = values => {
    const nums = values.map(Number).filter(Number.isFinite);
    return nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : null;
  };
  const one = value => Number.isFinite(Number(value)) ? Number(value).toFixed(1) : '—';
  const two = value => Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '—';
  const pct = value => Number.isFinite(Number(value)) ? Math.abs(Number(value)).toFixed(1) + '%' : '—';
  const shortDate = value => {
    const d = typeof value === 'string' ? dt(value) : value;
    return Number.isNaN(d.getTime()) ? '—' : `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  };
  const weekLabel = end => {
    const start = sh(end, -6);
    return `${shortDate(start)}–${shortDate(end)} ${end.getUTCFullYear()}`;
  };

  const latestStamp = () => {
    const match = String(latest?.measuredAt || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (match) return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]} · ${match[4]}:${match[5]}`;
    const d = String(latest?.isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return d ? `${Number(d[3])} ${MONTHS[Number(d[2]) - 1]} ${d[1]}` : (latest?.date || '—');
  };

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

  function weekEndFor(date) {
    const day = date.getUTCDay();
    return sh(date, day === 0 ? 0 : 7 - day);
  }

  function availableWeekEnds() {
    const lastDate = dt(latest.isoDate);
    const completedEnd = sh(lastDate, -lastDate.getUTCDay());
    const set = new Set();
    D.forEach(row => {
      const end = weekEndFor(dt(row.isoDate));
      if (end <= completedEnd) set.add(iso(end));
    });
    return [...set].sort().reverse();
  }

  function weekRows(end) {
    const start = sh(end, -6);
    return D.filter(row => row.isoDate >= iso(start) && row.isoDate <= iso(end));
  }

  function deltaMeta(current, previous, goodWhenDown) {
    if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
      return {delta: null, percent: null, arrow: '—', cls: 'neutral'};
    }
    const delta = current - previous;
    const percent = (delta / previous) * 100;
    const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
    const good = goodWhenDown ? delta < 0 : delta > 0;
    const bad = goodWhenDown ? delta > 0 : delta < 0;
    return {delta, percent, arrow, cls: Math.abs(delta) < 0.001 ? 'neutral' : good ? 'good' : bad ? 'watch' : 'neutral'};
  }

  function checkpointMarkup(selectedEndIso) {
    const end = dt(selectedEndIso);
    const prevEnd = sh(end, -7);
    const current = weekRows(end);
    const previous = weekRows(prevEnd);
    const A = (rows, key) => avg(rows.map(row => row[key]));

    const cf = A(current, 'fat'), pf = A(previous, 'fat');
    const cb = A(current, 'bf'), pb = A(previous, 'bf');
    const cm = A(current, 'muscle'), pm = A(previous, 'muscle');
    const cw = A(current, 'weight'), pw = A(previous, 'weight');
    const fat = deltaMeta(cf, pf, true);
    const muscle = deltaMeta(cm, pm, false);
    const weight = deltaMeta(cw, pw, true);
    const enough = current.length >= 4 && previous.length >= 4;

    const ends = availableWeekEnds();
    const options = ends.map(value => {
      const selected = value === selectedEndIso ? ' selected' : '';
      return `<option value="${value}"${selected}>${weekLabel(dt(value))}</option>`;
    }).join('');

    const fatStatus = enough && fat.percent != null
      ? `ไขมันเฉลี่ย ${fat.arrow} ${pct(fat.percent)}`
      : 'ไขมัน · ข้อมูลยังไม่พอ';
    const muscleStatus = enough && muscle.percent != null
      ? `กล้ามเนื้อเฉลี่ย ${muscle.arrow} ${pct(muscle.percent)}`
      : 'กล้ามเนื้อ · ข้อมูลยังไม่พอ';

    const metricDelta = (meta, unit, includePct = false) => {
      if (meta.delta == null) return '—';
      const sign = meta.delta > 0 ? '+' : meta.delta < 0 ? '−' : '';
      const amount = `${sign}${two(Math.abs(meta.delta))}${unit}`;
      return includePct ? `${meta.arrow} ${amount} · ${pct(meta.percent)}` : `${meta.arrow} ${amount}`;
    };

    const bfDelta = cb != null && pb != null ? cb - pb : null;
    const bfText = bfDelta == null ? '—' : `${bfDelta > 0 ? '↑ +' : bfDelta < 0 ? '↓ −' : '→ '}${two(Math.abs(bfDelta))}%`;
    const latestCompleted = ends[0];
    const next = sh(dt(latestCompleted), 7);
    const footerRight = selectedEndIso === latestCompleted ? `Checkpoint ถัดไป ${shortDate(next)}` : 'กำลังดูย้อนหลัง';

    return `<div class="s-weekly-head s-weekly-head-clean">
      <div>
        <p>WEEKLY CHECKPOINT</p>
        <select class="s-checkpoint-select" aria-label="เลือกสัปดาห์ย้อนหลัง">${options}</select>
      </div>
      <div class="s-checkpoint-statuses">
        <span class="${fat.cls}">${fatStatus}</span>
        <span class="${muscle.cls}">${muscleStatus}</span>
      </div>
    </div>
    <div class="s-weekly-grid">
      <div><small>Fat avg</small><strong>${one(cf)} kg</strong><em>${metricDelta(fat, ' kg', true)}</em></div>
      <div><small>BF avg</small><strong>${one(cb)}%</strong><em>${bfText}</em></div>
      <div><small>Muscle avg</small><strong>${one(cm)} kg</strong><em>${metricDelta(muscle, ' kg', true)}</em></div>
      <div><small>Weight avg</small><strong>${one(cw)} kg</strong><em>${metricDelta(weight, ' kg', true)}</em></div>
    </div>
    <div class="s-weekly-foot">
      <span>${current.length} ครั้งในสัปดาห์นี้${enough ? '' : ' · confidence ต่ำ'}</span>
      <strong>${footerRight}</strong>
    </div>`;
  }

  function setupCheckpoint() {
    const card = document.querySelector('#summary-app .s-weekly-checkpoint');
    if (!card) return false;
    const weeks = availableWeekEnds();
    if (!weeks.length) {
      card.remove();
      return true;
    }
    const currentSelection = card.querySelector('.s-checkpoint-select')?.value;
    const selected = weeks.includes(currentSelection) ? currentSelection : weeks[0];
    card.innerHTML = checkpointMarkup(selected);
    const select = card.querySelector('.s-checkpoint-select');
    if (select) {
      select.addEventListener('change', () => {
        card.innerHTML = checkpointMarkup(select.value);
        setupCheckpoint();
      }, {once: true});
    }
    return true;
  }

  function renamePreviousRange() {
    const root = document.querySelector('#summary-app');
    if (!root) return;
    const button = root.querySelector('.s-range-controls button[data-range="1"]');
    if (button) button.textContent = 'ครั้งก่อน';
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue.trim() === '1 วัน') nodes.push(walker.currentNode);
    }
    nodes.forEach(node => { node.nodeValue = node.nodeValue.replace('1 วัน', 'ครั้งก่อน'); });
  }

  const rolling = (rows, key, days) => rows.map(row => {
    const end = Number(row.daysFromStart);
    const values = rows
      .filter(item => Number(item.daysFromStart) >= end - days + 1 && Number(item.daysFromStart) <= end)
      .map(item => item[key]);
    return {x: end, y: avg(values)};
  }).filter(point => Number.isFinite(point.y));

  const weekly = (rows, key) => {
    const groups = new Map();
    rows.forEach(row => {
      const end = iso(weekEndFor(dt(row.isoDate)));
      if (!groups.has(end)) groups.set(end, []);
      groups.get(end).push(row);
    });
    return [...groups.values()].map(group => ({
      x: avg(group.map(row => row.daysFromStart)),
      y: avg(group.map(row => row[key]))
    })).filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
  };

  function selectedRange() {
    return Number(document.querySelector('.s-range-controls button[aria-pressed="true"]')?.dataset.range || 7);
  }

  function rowsForRange(range) {
    if (range === 1) return D.slice(-2);
    const last = Number(D.at(-1)?.daysFromStart);
    if (!Number.isFinite(last) || range >= 365) return D;
    return D.filter(row => Number(row.daysFromStart) >= last - range + 1);
  }

  function ensureReadout(canvas) {
    const wrap = canvas.parentElement;
    const host = wrap?.parentElement;
    if (!wrap || !host) return null;
    let readout = host.querySelector(':scope > .s-chart-hover-readout');
    if (!readout) {
      readout = document.createElement('div');
      readout.className = 's-chart-hover-readout';
      readout.setAttribute('aria-live', 'polite');
      wrap.insertAdjacentElement('beforebegin', readout);
    }
    return readout;
  }

  function nearestDate(day) {
    if (!Number.isFinite(day)) return '';
    const row = D.reduce((best, item) => {
      const current = Number(item.daysFromStart);
      if (!Number.isFinite(current)) return best;
      return !best || Math.abs(current - day) < Math.abs(Number(best.daysFromStart) - day) ? item : best;
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
    const raw = rows.map(row => ({x: Number(row.daysFromStart), y: Number(row[key])}));
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
        label: 'ค่าที่วัดจริง', data: raw, borderColor: color + '55', backgroundColor: 'transparent',
        borderWidth: 1.2, pointRadius: 2, pointHoverRadius: 5, tension: .15, fill: false
      });
    }
    datasets.push({
      label, data: main, borderColor: color,
      backgroundColor: key === 'fat' ? 'rgba(239,124,103,.10)' : 'rgba(43,185,179,.10)',
      borderWidth: 2.5, pointRadius: range === 1 ? 4 : (range >= 90 ? 2.5 : 0), pointHoverRadius: 5,
      tension: range === 1 ? 0 : .25, fill: true
    });

    const current = Number(latest?.[key]);
    const goal = Number(target);
    const showTarget = Number.isFinite(current) && Number.isFinite(goal) && Math.abs(current - goal) <= TARGET_VISIBLE_GAP_KG;
    if (showTarget && main.length) {
      datasets.push({
        label: 'เป้าหมาย', data: main.map(point => ({x: point.x, y: goal})), borderColor: '#8a9899',
        borderDash: [4,4], borderWidth: 1.1, pointRadius: 0, pointHoverRadius: 0, fill: false
      });
    }

    chart.data.datasets = datasets;
    chart.options.interaction = {mode: 'nearest', intersect: false, axis: 'xy'};
    chart.options.plugins = chart.options.plugins || {};
    chart.options.plugins.tooltip = {...(chart.options.plugins.tooltip || {}), enabled: false};

    const readout = ensureReadout(canvas);
    const originalWidths = datasets.map(dataset => dataset.borderWidth);
    chart.options.onHover = (_event, active) => {
      const hit = active?.[0];
      if (!hit) {
        if (readout) readout.textContent = '';
        chart.data.datasets.forEach((dataset, index) => { dataset.borderWidth = originalWidths[index] || 1; });
        chart.update('none');
        return;
      }
      const dataset = chart.data.datasets[hit.datasetIndex];
      const context = hit.element?.$context;
      const value = Number(context?.parsed?.y ?? context?.raw?.y ?? context?.raw);
      const day = Number(context?.raw?.x ?? context?.parsed?.x);
      const date = nearestDate(day);
      if (readout) readout.textContent = `${date}${date ? ' · ' : ''}${dataset.label} ${Number.isFinite(value) ? value.toFixed(1) : '—'} kg`;
      chart.data.datasets.forEach((item, index) => { item.borderWidth = index === hit.datasetIndex ? 3.5 : .8; });
      chart.update('none');
    };

    const xs = main.map(point => Number(point.x)).filter(Number.isFinite);
    const xMin = xs.length === 1 ? xs[0] - .6 : Math.min(...xs);
    const xMax = xs.length === 1 ? xs[0] + .6 : Math.max(...xs);
    const values = datasets.flatMap(dataset => dataset.data.map(point => Number(point?.y ?? point))).filter(Number.isFinite);
    const min = Math.min(...values), max = Math.max(...values), span = Math.max(max - min, .5), padding = Math.max(.25, span * .2);
    chart.options.scales.y.min = Math.floor((min - padding) * 10) / 10;
    chart.options.scales.y.max = Math.ceil((max + padding) * 10) / 10;
    chart.options.scales.x.min = xMin;
    chart.options.scales.x.max = xMax;
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
      .s-weekly-head-clean{align-items:flex-start!important}
      .s-checkpoint-select{margin:1px 0 0;padding:2px 24px 2px 0;border:0;background:transparent;color:#182326;font:800 17px/1.25 system-ui,sans-serif;cursor:pointer;outline:none}
      .s-checkpoint-statuses{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
      .s-checkpoint-statuses span{padding:6px 9px;border-radius:999px;font-size:9px;font-weight:800;white-space:nowrap}
      .s-checkpoint-statuses .good{background:#e2f5f3;color:#147d7a}.s-checkpoint-statuses .watch{background:#fff0eb;color:#c26453}.s-checkpoint-statuses .neutral{background:#f1f4f3;color:#718084}
      .s-weekly-checkpoint .s-weekly-fat-compare{display:none!important}
      @media(max-width:620px){.s-weekly-head-clean{display:block!important}.s-checkpoint-statuses{justify-content:flex-start;margin-top:8px}.s-checkpoint-select{font-size:16px;max-width:100%}}
    `;
    document.head.appendChild(style);
  }

  function apply() {
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

    document.querySelectorAll('.s-range-controls button').forEach(button => {
      button.addEventListener('click', () => {
        setTimeout(renamePreviousRange, 10);
        setTimeout(apply, 80);
      });
    });

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      const ready = apply();
      if (ready || attempts >= 24) clearInterval(timer);
    }, 125);

    const root = document.querySelector('#summary-app');
    if (root) {
      const observer = new MutationObserver(() => {
        renamePreviousRange();
        if (!root.querySelector('.s-checkpoint-select')) setupCheckpoint();
      });
      observer.observe(root, {childList: true, subtree: true, characterData: true});
      setTimeout(() => observer.disconnect(), 5000);
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', start, {once: true})
    : start();
})();
