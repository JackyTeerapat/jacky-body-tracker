(() => {
  const S = window.__JACKY_TRACKER__;
  if (!S?.DATA?.length || !window.Chart) return;

  const D = S.DATA
    .filter(row => row?.isoDate)
    .slice()
    .sort((a, b) => {
      const at = String(a.measuredAt || a.isoDate);
      const bt = String(b.measuredAt || b.isoDate);
      return at.localeCompare(bt);
    });
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
  const signed = (value, digits = 2, suffix = '') => {
    if (!Number.isFinite(Number(value))) return '—';
    const n = Number(value);
    const sign = n > 0 ? '+' : n < 0 ? '−' : '';
    return `${sign}${Math.abs(n).toFixed(digits)}${suffix}`;
  };
  const shortDate = value => {
    const date = typeof value === 'string' ? dt(value) : value;
    return Number.isNaN(date.getTime()) ? '—' : `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
  };
  const displayDate = row => row?.date || shortDate(row?.isoDate);

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
      const date = dt(row.isoDate);
      const sunday = shift(date, date.getUTCDay() === 0 ? 0 : 7 - date.getUTCDay());
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
    return `${shortDate(shift(end, -6))}–${shortDate(end)} ${end.getUTCFullYear()}`;
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
    return {
      delta,
      percent,
      arrow,
      cls: Math.abs(delta) < 0.001 ? 'neutral' : good ? 'good' : bad ? 'bad' : 'neutral'
    };
  }

  function statusMarkup(label, meta) {
    if (meta.percent == null) return '';
    return `<span class="${meta.cls}">${label} ${meta.arrow} ${Math.abs(meta.percent).toFixed(1)}%</span>`;
  }

  function metricDelta(meta, unit) {
    if (meta.delta == null) return '<em class="neutral">—</em>';
    return `<em class="${meta.cls}">${meta.arrow} ${signed(meta.delta, 2, unit)} · ${Math.abs(meta.percent).toFixed(1)}%</em>`;
  }

  function renderCheckpoint(card, selectedEndIso) {
    const weeks = completedWeekEnds();
    if (!weeks.length) {
      card.style.display = 'none';
      return;
    }
    card.style.display = '';
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
    const bf = changeMeta(cb, pb, true);

    const statuses = [
      statusMarkup('ไขมันเฉลี่ย', fat),
      statusMarkup('กล้ามเนื้อเฉลี่ย', muscle)
    ].filter(Boolean).join('');

    const menuItems = weeks.map(value =>
      `<button type="button" class="s-checkpoint-option${value === selected ? ' active' : ''}" data-week="${value}" role="option" aria-selected="${value === selected}">
        ${weekLabel(value)}
      </button>`
    ).join('');

    const latestWeek = weeks[0];
    const footerRight = selected === latestWeek
      ? `Checkpoint ถัดไป ${shortDate(shift(dt(latestWeek), 7))}`
      : 'กำลังดูย้อนหลัง';

    card.innerHTML = `
      <div class="s-weekly-head s-weekly-head-v3">
        <div class="s-checkpoint-picker">
          <p>WEEKLY CHECKPOINT</p>
          <button type="button" class="s-checkpoint-trigger" aria-haspopup="listbox" aria-expanded="false">
            <span>${weekLabel(selected)}</span><b aria-hidden="true">⌄</b>
          </button>
          <div class="s-checkpoint-menu" role="listbox" hidden>${menuItems}</div>
        </div>
        ${statuses ? `<div class="s-checkpoint-statuses">${statuses}</div>` : ''}
      </div>
      <div class="s-weekly-grid">
        <div><small>Fat avg</small><strong>${one(cf)} kg</strong>${metricDelta(fat, ' kg')}</div>
        <div><small>BF avg</small><strong>${one(cb)}%</strong>${metricDelta(bf, '%')}</div>
        <div><small>Muscle avg</small><strong>${one(cm)} kg</strong>${metricDelta(muscle, ' kg')}</div>
        <div><small>Weight avg</small><strong>${one(cw)} kg</strong>${metricDelta(weight, ' kg')}</div>
      </div>
      <div class="s-weekly-foot">
        <span>${current.length} ครั้งในสัปดาห์นี้${current.length < 4 ? ' · confidence ต่ำ' : ''}</span>
        <strong>${footerRight}</strong>
      </div>`;

    const trigger = card.querySelector('.s-checkpoint-trigger');
    const menu = card.querySelector('.s-checkpoint-menu');
    if (trigger && menu) {
      trigger.addEventListener('click', event => {
        event.stopPropagation();
        const open = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', String(!open));
        menu.hidden = open;
      });
      menu.querySelectorAll('.s-checkpoint-option').forEach(option => {
        option.addEventListener('click', event => {
          event.stopPropagation();
          renderCheckpoint(card, option.dataset.week);
        });
      });
    }
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
      return { x: end, y: avg(values), date: displayDate(row) };
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
    return [...groups.entries()].map(([endIso, group]) => ({
      x: avg(group.map(row => row.daysFromStart)),
      y: avg(group.map(row => row[key])),
      date: weekLabel(endIso)
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
      canvas.parentElement?.insertAdjacentElement('beforebegin', readout);
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
    return displayDate(row);
  }

  function makePointRows(rows, key, comparePrevious) {
    if (comparePrevious) {
      return rows.map((row, index) => ({
        x: index,
        y: Number(row[key]),
        date: displayDate(row)
      }));
    }
    return rows.map(row => ({
      x: Number(row.daysFromStart),
      y: Number(row[key]),
      date: displayDate(row)
    }));
  }

  function patchChart(id, key, target) {
    const canvas = document.getElementById(id);
    const chart = canvas && window.Chart.getChart ? window.Chart.getChart(canvas) : null;
    if (!chart) return false;

    const range = selectedRange();
    const rows = rowsForRange(range).filter(row =>
      Number.isFinite(Number(row[key])) &&
      (range === 1 || Number.isFinite(Number(row.daysFromStart)))
    );
    if (!rows.length) return false;

    const comparePrevious = range === 1;
    const color = key === 'fat' ? '#ef7c67' : '#2bb9b3';
    const raw = makePointRows(rows, key, comparePrevious);
    let main = raw;
    let label = 'ค่าที่วัดจริง';
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
    }

    const datasets = [];
    if (showRaw) {
      datasets.push({
        label: 'ค่าที่วัดจริง',
        data: raw,
        borderColor: `${color}55`,
        backgroundColor: 'transparent',
        borderWidth: 1.2,
        pointRadius: 2.2,
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
      pointRadius: comparePrevious ? 4.5 : (range >= 90 ? 2.8 : 0),
      pointHoverRadius: 5,
      tension: comparePrevious ? 0 : .25,
      fill: true
    });

    const current = Number(latest?.[key]);
    const goal = Number(target);
    const showTarget = !comparePrevious &&
      Number.isFinite(current) &&
      Number.isFinite(goal) &&
      Math.abs(current - goal) <= TARGET_VISIBLE_GAP_KG;

    if (showTarget && main.length) {
      datasets.push({
        label: 'เป้าหมาย',
        data: main.map(point => ({ x: point.x, y: goal, date: point.date })),
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
    chart.options.scales = chart.options.scales || {};
    chart.options.scales.x = chart.options.scales.x || {};
    chart.options.scales.y = chart.options.scales.y || {};
    chart.options.scales.x.type = 'linear';

    if (comparePrevious) {
      chart.options.scales.x.min = -.15;
      chart.options.scales.x.max = Math.max(1.15, rows.length - 1 + .15);
      chart.options.scales.x.ticks = {
        ...(chart.options.scales.x.ticks || {}),
        stepSize: 1,
        autoSkip: false,
        callback: value => {
          const index = Math.round(Number(value));
          return Math.abs(Number(value) - index) < .001 && rows[index] ? displayDate(rows[index]) : '';
        }
      };
    } else {
      const xs = main.map(point => Number(point.x)).filter(Number.isFinite);
      if (xs.length) {
        chart.options.scales.x.min = xs.length === 1 ? xs[0] - .6 : Math.min(...xs);
        chart.options.scales.x.max = xs.length === 1 ? xs[0] + .6 : Math.max(...xs);
      }
      chart.options.scales.x.ticks = {
        ...(chart.options.scales.x.ticks || {}),
        autoSkip: true,
        callback: value => nearestDate(Number(value))
      };
    }

    const readout = ensureReadout(canvas);
    const baseWidths = datasets.map(dataset => dataset.borderWidth || 1);
    chart.$jackyHoverDataset = null;
    chart.options.onHover = (_event, active) => {
      const hit = active?.[0];
      if (!hit) {
        if (readout) readout.textContent = '';
        if (chart.$jackyHoverDataset !== null) {
          chart.data.datasets.forEach((dataset, index) => {
            dataset.borderWidth = baseWidths[index];
          });
          chart.$jackyHoverDataset = null;
          chart.update('none');
        }
        return;
      }

      const datasetIndex = hit.datasetIndex;
      const dataset = chart.data.datasets[datasetIndex];
      const context = hit.element?.$context;
      const rawPoint = context?.raw;
      const value = Number(context?.parsed?.y ?? rawPoint?.y ?? rawPoint);
      const date = rawPoint?.date || (comparePrevious ? rows[Number(rawPoint?.x)] && displayDate(rows[Number(rawPoint.x)]) : nearestDate(Number(rawPoint?.x)));
      if (readout) {
        readout.textContent = `${date || ''}${date ? ' · ' : ''}${dataset.label} ${Number.isFinite(value) ? value.toFixed(1) : '—'} kg`;
      }

      if (chart.$jackyHoverDataset !== datasetIndex) {
        chart.data.datasets.forEach((item, index) => {
          item.borderWidth = index === datasetIndex
            ? Math.max(3.5, baseWidths[index])
            : Math.min(.8, baseWidths[index]);
        });
        chart.$jackyHoverDataset = datasetIndex;
        chart.update('none');
      }
    };

    const values = datasets
      .filter(dataset => dataset.label !== 'เป้าหมาย')
      .flatMap(dataset => dataset.data.map(point => Number(point?.y ?? point)))
      .filter(Number.isFinite);

    if (values.length) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const span = Math.max(max - min, key === 'fat' ? .35 : .25);
      const padding = Math.max(key === 'fat' ? .15 : .12, span * .22);
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
      ? 'ครั้งก่อน → ล่าสุด'
      : range >= 90
        ? 'ค่าเฉลี่ยรายสัปดาห์เพื่อลด noise'
        : range >= 30
          ? 'เส้นบาง = ค่าจริง · เส้นหลัก = ค่าเฉลี่ย 7 วัน'
          : 'เส้นบาง = ค่าจริง · เส้นหลัก = ค่าเฉลี่ย 3 วัน';
  }

  function applySemanticColors() {
    const root = document.querySelector('#summary-app');
    if (!root) return;

    const candidates = [...root.querySelectorAll('*')].filter(element => {
      if (element.children.length) return false;
      return /^ช่วงนี้\s*[+\-−]?\s*\d/.test((element.textContent || '').trim());
    });

    candidates.forEach(element => {
      const match = (element.textContent || '').match(/ช่วงนี้\s*([+\-−]?)\s*(\d+(?:\.\d+)?)/);
      if (!match) return;
      let value = Number(match[2]);
      if (match[1] === '-' || match[1] === '−') value *= -1;

      let metric = null;
      let node = element.parentElement;
      for (let depth = 0; node && depth < 6; depth += 1, node = node.parentElement) {
        const text = node.innerText || '';
        const hasFat = text.includes('ไขมัน');
        const hasMuscle = text.includes('กล้ามเนื้อ');
        if (hasFat !== hasMuscle) {
          metric = hasFat ? 'fat' : 'muscle';
          break;
        }
      }
      if (!metric) return;

      const good = metric === 'fat' ? value < 0 : value > 0;
      const bad = metric === 'fat' ? value > 0 : value < 0;
      element.classList.toggle('jacky-good', good);
      element.classList.toggle('jacky-bad', bad);
      element.classList.toggle('jacky-neutral', !good && !bad);
    });
  }

  function addStyle() {
    if (document.getElementById('chart-display-fix-style')) return;
    const style = document.createElement('style');
    style.id = 'chart-display-fix-style';
    style.textContent = `
      .s-chart-hover-readout{
        height:18px;margin:0 0 2px;text-align:right;color:#617579;
        font-size:10px;font-weight:700;line-height:18px;white-space:nowrap;
        overflow:hidden;text-overflow:ellipsis
      }
      .s-weekly-head-v3{align-items:flex-start!important}
      .s-checkpoint-picker{position:relative;min-width:220px}
      .s-checkpoint-trigger{
        display:flex;align-items:center;justify-content:space-between;gap:12px;
        min-width:220px;margin:1px 0 0;padding:7px 10px;
        border:1px solid #d8e4e1;border-radius:11px;background:#f8fbfa;
        color:#182326;font:800 16px/1.25 system-ui,sans-serif;cursor:pointer
      }
      .s-checkpoint-trigger:hover{border-color:#a9cbc6;background:#f2f9f7}
      .s-checkpoint-trigger b{color:#147d7a;font-size:15px}
      .s-checkpoint-menu{
        position:absolute;z-index:30;left:0;top:calc(100% + 6px);
        width:min(310px,calc(100vw - 48px));max-height:250px;overflow:auto;
        padding:6px;border:1px solid #d8e4e1;border-radius:12px;background:#fff;
        box-shadow:0 14px 35px rgba(26,50,48,.14)
      }
      .s-checkpoint-option{
        display:block;width:100%;padding:9px 10px;border:0;border-radius:8px;
        background:transparent;color:#334346;text-align:left;
        font:700 13px/1.25 system-ui,sans-serif;cursor:pointer
      }
      .s-checkpoint-option:hover{background:#edf8f6;color:#147d7a}
      .s-checkpoint-option.active{background:#e2f5f3;color:#147d7a}
      .s-checkpoint-statuses{
        display:grid;grid-template-columns:1fr 1fr;gap:6px;min-width:280px
      }
      .s-checkpoint-statuses span{
        padding:7px 9px;border-radius:999px;font-size:9px;font-weight:800;
        white-space:nowrap;text-align:center
      }
      .s-checkpoint-statuses .good,
      .s-weekly-grid em.good,
      .jacky-good{color:#147d7a!important}
      .s-checkpoint-statuses .good{background:#e2f5f3}
      .s-checkpoint-statuses .bad,
      .s-weekly-grid em.bad,
      .jacky-bad{color:#c95f4f!important}
      .s-checkpoint-statuses .bad{background:#fff0eb}
      .s-checkpoint-statuses .neutral,
      .s-weekly-grid em.neutral,
      .jacky-neutral{color:#718084!important}
      .s-checkpoint-statuses .neutral{background:#f1f4f3}
      .s-weekly-grid em{font-style:normal}
      .s-weekly-checkpoint .s-weekly-fat-compare{display:none!important}
      @media(max-width:620px){
        .s-weekly-head-v3{display:block!important}
        .s-checkpoint-statuses{min-width:0;margin-top:8px}
        .s-checkpoint-trigger{min-width:0;width:100%;font-size:15px}
        .s-checkpoint-picker{min-width:0}
      }`;
    document.head.appendChild(style);

    document.addEventListener('click', event => {
      document.querySelectorAll('.s-checkpoint-menu:not([hidden])').forEach(menu => {
        if (!menu.parentElement?.contains(event.target)) {
          menu.hidden = true;
          const trigger = menu.parentElement?.querySelector('.s-checkpoint-trigger');
          trigger?.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  function patchAll() {
    updateHeader();
    addStyle();
    renamePreviousRange();
    setupCheckpoint();
    applySemanticColors();
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
    applySemanticColors();

    document.querySelectorAll('#summary-app .s-range-controls button').forEach(button => {
      if (button.dataset.jackyBound === '1') return;
      button.dataset.jackyBound = '1';
      button.addEventListener('click', () => setTimeout(patchAll, 80));
    });

    let attempts = 0;
    const tryPatch = () => {
      attempts += 1;
      const ready = patchAll();
      if (!ready && attempts < 18) setTimeout(tryPatch, 120);
    };
    setTimeout(tryPatch, 50);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', start, { once: true })
    : start();
})();