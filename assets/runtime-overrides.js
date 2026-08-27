(() => {
  const store = window.__JACKY_TRACKER__;
  if (!store || !Array.isArray(store.DATA) || !store.DATA.length) return;

  const DATA = store.DATA
    .filter(item => item && item.isoDate)
    .slice()
    .sort((a, b) => String(a.isoDate).localeCompare(String(b.isoDate)));

  const DAY_MS = 86400000;
  const toDate = iso => new Date(String(iso) + 'T00:00:00Z');
  const iso = date => date.toISOString().slice(0, 10);
  const shift = (date, days) => new Date(date.getTime() + days * DAY_MS);
  const thaiMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const shortDate = value => {
    const d = typeof value === 'string' ? toDate(value) : value;
    return Number.isNaN(d.getTime()) ? '—' : `${d.getUTCDate()} ${thaiMonths[d.getUTCMonth()]}`;
  };
  const mean = values => {
    const nums = values.map(Number).filter(Number.isFinite);
    return nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : null;
  };
  const fmt = (value, digits = 1) => Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—';
  const signed = (value, unit = '') => {
    if (!Number.isFinite(Number(value))) return '—';
    const n = Number(value);
    const prefix = n > 0 ? '+' : n < 0 ? '−' : '';
    return `${prefix}${Math.abs(n).toFixed(2)}${unit}`;
  };

  function removeAiCoach() {
    document.querySelectorAll('.s-verdict').forEach(node => node.remove());
  }

  function completedWeekWindow(latestIso) {
    const latest = toDate(latestIso);
    const day = latest.getUTCDay();
    const weekEnd = shift(latest, -day);
    const weekStart = shift(weekEnd, -6);
    const prevEnd = shift(weekStart, -1);
    const prevStart = shift(prevEnd, -6);
    return {weekStart, weekEnd, prevStart, prevEnd};
  }

  function between(start, end) {
    const a = iso(start);
    const b = iso(end);
    return DATA.filter(item => item.isoDate >= a && item.isoDate <= b);
  }

  function metricAverage(items, key) {
    return mean(items.map(item => item[key]));
  }

  function checkpointMarkup() {
    const latest = DATA.at(-1);
    const {weekStart, weekEnd, prevStart, prevEnd} = completedWeekWindow(latest.isoDate);
    const current = between(weekStart, weekEnd);
    const previous = between(prevStart, prevEnd);
    const currentFat = metricAverage(current, 'fat');
    const previousFat = metricAverage(previous, 'fat');
    const currentBf = metricAverage(current, 'bf');
    const previousBf = metricAverage(previous, 'bf');
    const currentMuscle = metricAverage(current, 'muscle');
    const previousMuscle = metricAverage(previous, 'muscle');
    const currentWeight = metricAverage(current, 'weight');
    const previousWeight = metricAverage(previous, 'weight');
    const enough = current.length >= 4 && previous.length >= 4;

    const fatDelta = currentFat != null && previousFat != null ? currentFat - previousFat : null;
    const bfDelta = currentBf != null && previousBf != null ? currentBf - previousBf : null;
    const muscleDelta = currentMuscle != null && previousMuscle != null ? currentMuscle - previousMuscle : null;
    const weightDelta = currentWeight != null && previousWeight != null ? currentWeight - previousWeight : null;

    let state = 'ข้อมูลยังไม่พอ';
    let stateClass = 'neutral';
    if (enough && fatDelta != null) {
      if (fatDelta <= -0.2) {
        state = 'ไขมันเฉลี่ยลดลง';
        stateClass = 'good';
      } else if (fatDelta >= 0.2) {
        state = 'ไขมันเฉลี่ยสูงขึ้น';
        stateClass = 'watch';
      } else {
        state = 'ไขมันเฉลี่ยทรงตัว';
        stateClass = 'neutral';
      }
    }

    const nextSunday = (() => {
      const latestDate = toDate(latest.isoDate);
      const day = latestDate.getUTCDay();
      return day === 0 ? shift(latestDate, 7) : shift(latestDate, 7 - day);
    })();

    return `
      <section class="s-weekly-checkpoint" aria-label="Weekly checkpoint">
        <div class="s-weekly-head">
          <div>
            <p>WEEKLY CHECKPOINT</p>
            <h2>${shortDate(weekStart)}–${shortDate(weekEnd)}</h2>
          </div>
          <span class="${stateClass}">${state}</span>
        </div>
        <div class="s-weekly-grid">
          <div><small>Fat avg</small><strong>${fmt(currentFat)} kg</strong><em>${signed(fatDelta, ' kg')} vs สัปดาห์ก่อน</em></div>
          <div><small>BF avg</small><strong>${fmt(currentBf)}%</strong><em>${signed(bfDelta, ' จุด')}</em></div>
          <div><small>Muscle avg</small><strong>${fmt(currentMuscle)} kg</strong><em>${signed(muscleDelta, ' kg')}</em></div>
          <div><small>Weight avg</small><strong>${fmt(currentWeight)} kg</strong><em>${signed(weightDelta, ' kg')}</em></div>
        </div>
        <div class="s-weekly-foot">
          <span>${current.length} ครั้งในสัปดาห์นี้ · ${previous.length} ครั้งสัปดาห์ก่อน${enough ? '' : ' · ความมั่นใจต่ำถ้าน้อยกว่า 4 ครั้ง/สัปดาห์'}</span>
          <strong>Checkpoint ถัดไป ${shortDate(nextSunday)}</strong>
        </div>
      </section>`;
  }

  function installCheckpoint() {
    const wrap = document.querySelector('#summary-app .summary-wrap');
    if (!wrap || wrap.querySelector('.s-weekly-checkpoint')) return;
    const header = wrap.querySelector('.s-header');
    if (!header) return;
    header.insertAdjacentHTML('afterend', checkpointMarkup());
  }

  function installStyles() {
    if (document.getElementById('runtime-overrides-style')) return;
    const style = document.createElement('style');
    style.id = 'runtime-overrides-style';
    style.textContent = `
      .s-weekly-checkpoint{margin:0 0 12px;padding:14px;border:1px solid #d8e4e1;border-radius:18px;background:#fff;box-shadow:0 8px 24px rgba(31,69,68,.04)}
      .s-weekly-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:11px}
      .s-weekly-head p{margin:0 0 3px;color:#147d7a;font-size:9px;font-weight:850;letter-spacing:.12em}
      .s-weekly-head h2{margin:0;color:#182326;font-size:17px;letter-spacing:-.03em}
      .s-weekly-head>span{padding:5px 9px;border-radius:999px;font-size:9px;font-weight:800;white-space:nowrap}
      .s-weekly-head>span.good{background:#e2f5f3;color:#147d7a}
      .s-weekly-head>span.watch{background:#fff0eb;color:#c26453}
      .s-weekly-head>span.neutral{background:#f1f4f3;color:#718084}
      .s-weekly-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
      .s-weekly-grid>div{min-width:0;padding:9px;border:1px solid #edf2f0;border-radius:12px;background:#f9fbfa}
      .s-weekly-grid small,.s-weekly-grid em{display:block;color:#718084;font-size:8px;font-style:normal}
      .s-weekly-grid strong{display:block;margin:3px 0;color:#182326;font-size:15px;letter-spacing:-.04em;white-space:nowrap}
      .s-weekly-foot{display:flex;justify-content:space-between;gap:10px;margin-top:9px;padding-top:8px;border-top:1px solid #edf2f0;color:#718084;font-size:8px;line-height:1.45}
      .s-weekly-foot strong{color:#147d7a;white-space:nowrap}
      @media(max-width:620px){
        .s-weekly-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        .s-weekly-foot{display:block}
        .s-weekly-foot strong{display:block;margin-top:4px}
      }
    `;
    document.head.appendChild(style);
  }

  function rollingPoints(items, key, windowDays) {
    return items.map(item => {
      const end = Number(item.daysFromStart);
      const start = end - windowDays + 1;
      const values = items
        .filter(candidate => Number(candidate.daysFromStart) >= start && Number(candidate.daysFromStart) <= end)
        .map(candidate => candidate[key]);
      return {x: end, y: mean(values)};
    }).filter(point => Number.isFinite(point.y));
  }

  function weeklyPoints(items, key) {
    const buckets = new Map();
    items.forEach(item => {
      const d = toDate(item.isoDate);
      if (Number.isNaN(d.getTime())) return;
      const day = d.getUTCDay();
      const end = iso(shift(d, day === 0 ? 0 : 7 - day));
      if (!buckets.has(end)) buckets.set(end, []);
      buckets.get(end).push(item);
    });
    return [...buckets.entries()].map(([weekEnd, rows]) => ({
      x: mean(rows.map(row => row.daysFromStart)),
      y: mean(rows.map(row => row[key])),
      label: weekEnd
    })).filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
  }

  function selectedRange() {
    const pressed = document.querySelector('.s-range-controls button[aria-pressed="true"]');
    return Number(pressed && pressed.dataset.range || 7);
  }

  function visibleRows(range) {
    const latestDay = Number(DATA.at(-1).daysFromStart);
    if (!Number.isFinite(latestDay)) return DATA;
    if (range >= 365) return DATA;
    const start = latestDay - Math.max(1, range) + 1;
    return DATA.filter(item => Number(item.daysFromStart) >= start);
  }

  function bounds(values) {
    const nums = values.map(Number).filter(Number.isFinite);
    if (!nums.length) return {};
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const span = Math.max(max - min, 0.5);
    const pad = Math.max(0.25, span * 0.2);
    return {
      min: Math.floor((min - pad) * 10) / 10,
      max: Math.ceil((max + pad) * 10) / 10
    };
  }

  function renderOneChart(canvasId, key, range, unit, target) {
    if (!window.Chart || typeof window.Chart.getChart !== 'function') return;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const chart = window.Chart.getChart(canvas);
    if (!chart) return;

    const rows = visibleRows(range).filter(item =>
      Number.isFinite(Number(item.daysFromStart)) && Number.isFinite(Number(item[key]))
    );
    if (!rows.length) return;

    const baseColor = key === 'fat' ? '#ef7c67' : '#2bb9b3';
    const raw = rows.map(item => ({x: Number(item.daysFromStart), y: Number(item[key])}));
    let main;
    let mainLabel;
    let rawVisible = true;

    if (range >= 90) {
      main = weeklyPoints(rows, key);
      mainLabel = 'ค่าเฉลี่ยรายสัปดาห์';
      rawVisible = false;
    } else if (range >= 30) {
      main = rollingPoints(rows, key, 7);
      mainLabel = 'ค่าเฉลี่ยเคลื่อนที่ 7 วัน';
    } else if (range >= 7) {
      main = rollingPoints(rows, key, 3);
      mainLabel = 'ค่าเฉลี่ยเคลื่อนที่ 3 วัน';
    } else {
      main = raw;
      mainLabel = key === 'fat' ? 'ไขมัน' : 'กล้ามเนื้อ';
      rawVisible = false;
    }

    const datasets = [];
    if (rawVisible) {
      datasets.push({
        label: 'ค่าที่วัดจริง',
        data: raw,
        borderColor: baseColor + '55',
        backgroundColor: 'transparent',
        borderWidth: 1.25,
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: .15,
        fill: false
      });
    }
    datasets.push({
      label: mainLabel,
      data: main,
      borderColor: baseColor,
      backgroundColor: key === 'fat' ? 'rgba(239,124,103,.10)' : 'rgba(43,185,179,.10)',
      borderWidth: 2.5,
      pointRadius: range >= 90 ? 2.5 : 0,
      pointHoverRadius: 4,
      tension: range >= 90 ? .2 : .28,
      fill: true
    });

    if (Number.isFinite(Number(target))) {
      datasets.push({
        label: 'เป้าหมาย',
        data: main.map(point => ({x: point.x, y: Number(target)})),
        borderColor: '#8a9899',
        borderDash: [4,4],
        borderWidth: 1.1,
        pointRadius: 0,
        fill: false
      });
    }

    chart.data.datasets = datasets;
    const allY = datasets.flatMap(dataset => dataset.data.map(point => point.y));
    const yBounds = bounds(allY);
    chart.options.scales.y.min = yBounds.min;
    chart.options.scales.y.max = yBounds.max;
    chart.options.scales.x.min = Math.min(...main.map(point => Number(point.x)));
    chart.options.scales.x.max = Math.max(...main.map(point => Number(point.x)));
    chart.update('none');

    const note = document.getElementById('s-range-note');
    if (note) {
      if (range >= 90) note.textContent = 'กราฟใช้ค่าเฉลี่ยรายสัปดาห์ เพื่อลด noise จากการวัดรายวัน';
      else if (range >= 30) note.textContent = 'จุดจางคือค่าที่วัดจริง · เส้นหลักคือค่าเฉลี่ยเคลื่อนที่ 7 วัน';
      else if (range >= 7) note.textContent = 'จุดจางคือค่าที่วัดจริง · เส้นหลักคือค่าเฉลี่ยเคลื่อนที่ 3 วัน';
    }
  }

  function renderCharts() {
    const range = selectedRange();
    renderOneChart('s-fat-chart', 'fat', range, 'kg', store.TARGET);
    renderOneChart('s-muscle-chart', 'muscle', range, 'kg', store.MUSCLE_TARGET);
  }

  function installChartOverrides() {
    document.querySelectorAll('.s-range-controls button').forEach(button => {
      button.addEventListener('click', () => setTimeout(renderCharts, 0));
    });
    setTimeout(renderCharts, 0);
  }

  function start() {
    removeAiCoach();
    installStyles();
    installCheckpoint();
    installChartOverrides();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {once: true});
  } else {
    start();
  }
})();
