(() => {
  const S = window.__JACKY_TRACKER__;
  if (!S?.DATA?.length || !window.Chart) return;

  const D = S.DATA
    .filter(x => x?.isoDate)
    .slice()
    .sort((a, b) => String(a.measuredAt || a.isoDate).localeCompare(String(b.measuredAt || b.isoDate)));

  const latest = D.at(-1);
  const MS = 864e5;
  const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const GOOD = '#147d7a';
  const BAD = '#c26453';
  const NEUTRAL = '#718084';
  const MODES = {
    1: { key: 'daily', label: 'รายวัน' },
    7: { key: 'weekly', label: 'รายสัปดาห์' },
    30: { key: 'monthly', label: 'รายเดือน' }
  };

  const dt = s => new Date(`${s}T00:00:00Z`);
  const shiftDays = (d, n) => new Date(d.getTime() + n * MS);
  const iso = d => d.toISOString().slice(0, 10);
  const avg = values => {
    const nums = values.map(Number).filter(Number.isFinite);
    return nums.length ? nums.reduce((sum, x) => sum + x, 0) / nums.length : null;
  };
  const fmt = (v, digits = 1) => Number.isFinite(+v) ? (+v).toFixed(digits) : '—';
  const daysInMonth = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const startWeek = d => shiftDays(d, -(d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1));

  function shortDate(value, withYear = false) {
    const d = typeof value === 'string' ? dt(value) : value;
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${withYear ? ` ${d.getUTCFullYear()}` : ''}`;
  }

  function rangeLabel(a, b) {
    return a.getUTCFullYear() === b.getUTCFullYear()
      ? `${shortDate(a)}–${shortDate(b)} ${b.getUTCFullYear()}`
      : `${shortDate(a, true)}–${shortDate(b, true)}`;
  }

  function groupBy(rows, keyFn) {
    const groups = new Map();
    rows.forEach(row => {
      const key = keyFn(row);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    return groups;
  }

  function dailyBuckets() {
    return [...groupBy(D, row => row.isoDate).entries()]
      .sort((a,b) => a[0].localeCompare(b[0]))
      .map(([key, rows]) => ({
        key,
        rows,
        label: shortDate(key, true),
        compactLabel: shortDate(key)
      }));
  }

  function latestClosedSunday() {
    const ld = dt(latest.isoDate);
    return ld.getUTCDay() === 0 ? ld : shiftDays(startWeek(ld), -1);
  }

  function weeklyBuckets() {
    const closedEnd = latestClosedSunday();
    const groups = new Map();
    D.forEach(row => {
      const ws = startWeek(dt(row.isoDate));
      const we = shiftDays(ws, 6);
      if (we > closedEnd) return;
      const key = iso(ws);
      if (!groups.has(key)) groups.set(key, { key, start: ws, end: we, rows: [] });
      groups.get(key).rows.push(row);
    });
    return [...groups.values()]
      .sort((a,b) => a.start - b.start)
      .map(bucket => ({ ...bucket, label: rangeLabel(bucket.start, bucket.end), compactLabel: `${shortDate(bucket.start)}–${shortDate(bucket.end)}` }));
  }

  function monthlyBuckets() {
    return [...groupBy(D, row => row.isoDate.slice(0,7)).entries()]
      .sort((a,b) => a[0].localeCompare(b[0]))
      .map(([key, rows]) => {
        const [year, month] = key.split('-').map(Number);
        const lastDate = rows.at(-1)?.isoDate;
        const open = key === latest.isoDate.slice(0,7) && dt(lastDate).getUTCDate() < daysInMonth(year, month - 1);
        return {
          key,
          rows,
          open,
          label: `${MONTHS[month - 1]} ${year}${open ? ' MTD' : ''}`,
          compactLabel: `${MONTHS[month - 1]} ${String(year).slice(-2)}${open ? '*' : ''}`
        };
      });
  }

  function bucketsFor(mode) {
    if (mode === 'weekly') return weeklyBuckets();
    if (mode === 'monthly') return monthlyBuckets();
    return dailyBuckets();
  }

  function monthlyComparisonRows(buckets) {
    const current = buckets.at(-1);
    const previous = buckets.at(-2);
    if (!current || !previous) return { current: current?.rows || [], previous: previous?.rows || [], compare: 'ข้อมูลยังไม่พอ' };

    if (!current.open) {
      return { current: current.rows, previous: previous.rows, compare: `${current.label} เทียบกับ ${previous.label}` };
    }

    const currentLastDay = Math.max(...current.rows.map(row => dt(row.isoDate).getUTCDate()));
    const priorRows = previous.rows.filter(row => dt(row.isoDate).getUTCDate() <= currentLastDay);
    return {
      current: current.rows,
      previous: priorRows,
      compare: `${current.label} เทียบ ${previous.label.replace(' MTD','')} 1–${currentLastDay}`
    };
  }

  function summaryFor(mode) {
    const buckets = bucketsFor(mode);
    if (mode === 'monthly') {
      const cmp = monthlyComparisonRows(buckets);
      return { title: 'ค่าเฉลี่ยรายเดือน', ...cmp };
    }
    const current = buckets.at(-1);
    const previous = buckets.at(-2);
    return {
      title: mode === 'weekly' ? 'ค่าเฉลี่ยรายสัปดาห์' : 'ค่าเฉลี่ยรายวัน',
      current: current?.rows || [],
      previous: previous?.rows || [],
      compare: current && previous ? `${current.label} เทียบกับ ${previous.label}` : 'ข้อมูลยังไม่พอ'
    };
  }

  function bucketSeries(mode, key) {
    return bucketsFor(mode)
      .map(bucket => ({
        label: bucket.compactLabel,
        fullLabel: bucket.label,
        value: avg(bucket.rows.map(x => x[key])),
        open: Boolean(bucket.open)
      }))
      .filter(x => Number.isFinite(x.value));
  }

  function modeName(r) {
    return MODES[r]?.label || 'รายวัน';
  }

  function periodValues(summary, key) {
    return [avg(summary.current.map(x=>x[key])), avg(summary.previous.map(x=>x[key]))];
  }

  function deltaMeta(current, previous, lowerBetter) {
    if (!Number.isFinite(current) || !Number.isFinite(previous)) return {delta:null,pct:null,arrow:'→',cls:'neutral'};
    const delta = current - previous;
    const pct = previous ? delta / previous * 100 : null;
    const good = lowerBetter ? delta < 0 : delta > 0;
    const bad = lowerBetter ? delta > 0 : delta < 0;
    return {
      delta,
      pct,
      arrow: delta > 0 ? '↑' : delta < 0 ? '↓' : '→',
      cls: Math.abs(delta) < 1e-9 ? 'neutral' : good ? 'good' : bad ? 'bad' : 'neutral'
    };
  }

  function deltaPill(meta, unit, isBF = false) {
    if (meta.delta == null) return '<i class="tr2-pill neutral">ข้อมูลไม่พอ</i>';
    const first = isBF ? `${Math.abs(meta.delta).toFixed(2)} จุด` : `${Math.abs(meta.delta).toFixed(2)} ${unit}`;
    const relative = Number.isFinite(meta.pct) ? ` · ${Math.abs(meta.pct).toFixed(1)}%` : '';
    return `<i class="tr2-pill ${meta.cls}">${meta.arrow} ${first}${relative}</i>`;
  }

  function addStyles() {
    if (document.getElementById('trend-rebuild-v3-style')) return;
    const style = document.createElement('style');
    style.id = 'trend-rebuild-v3-style';
    style.textContent = `
      .tr2-hide{display:none!important}
      .tr2-root{margin-top:10px}
      .tr2-summary{padding:12px;border:1px solid #dfe9e6;border-radius:15px;background:#fbfcfc}
      .tr2-head{display:flex;justify-content:space-between;gap:10px;margin-bottom:9px}
      .tr2-head strong{font-size:13px;color:#182326}.tr2-head span{font-size:9px;color:${NEUTRAL};text-align:right}
      .tr2-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
      .tr2-metric{padding:9px;border:1px solid #edf2f0;border-radius:12px;background:#fff}
      .tr2-metric small{display:block;font-size:9px;color:#617579;font-weight:850}.tr2-metric b{display:block;margin:3px 0 5px;font-size:16px;color:#182326}
      .tr2-pill{display:inline-block;padding:3px 7px;border-radius:999px;font-size:9px;font-style:normal;font-weight:850;white-space:nowrap}
      .tr2-pill.good{color:${GOOD};background:#e8f7f5}.tr2-pill.bad{color:${BAD};background:#fff0eb}.tr2-pill.neutral{color:${NEUTRAL};background:#f1f4f3}
      .tr2-note{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:10px 1px 8px;font-size:9px;color:${NEUTRAL}}
      .tr2-note b{font-weight:800;color:#50666a}
      .tr2-card{margin-bottom:12px;padding:12px;border:1px solid #dce8e5;border-radius:17px;background:#fff}
      .tr2-card.fat{border-color:#f2d2c9;background:#fffaf8}.tr2-card.muscle{border-color:#d3e7ed;background:#f9fcfd}
      .tr2-card-head{display:flex;justify-content:space-between;gap:10px;align-items:center}.tr2-card-head strong{font-size:15px;color:#182326}.tr2-card-head>span{font-size:11px;font-weight:900}
      .tr2-card.fat .tr2-card-head>span{color:#ef7c67}.tr2-card.muscle .tr2-card-head>span{color:#318ba7}
      .tr2-tools{display:flex;align-items:center;justify-content:flex-end;gap:5px;margin:7px 0 1px}
      .tr2-tools button{min-width:30px;height:27px;padding:0 8px;border:1px solid #d9e4e2;border-radius:8px;background:#fff;color:#50666a;font:800 10px/1 system-ui,sans-serif;cursor:pointer}
      .tr2-tools button:hover{border-color:#85cbc6;background:#f3faf9;color:${GOOD}}
      .tr2-readout{height:18px;text-align:right;font-size:9px;color:#617579;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .tr2-canvas{height:210px}.tr2-canvas canvas{touch-action:pan-y;cursor:grab}.tr2-canvas canvas.dragging{cursor:grabbing}
      .tr2-empty{height:210px;display:flex;align-items:center;justify-content:center;text-align:center;color:${NEUTRAL};font-size:10px;line-height:1.5}.tr2-empty strong{display:block;color:#34484c;font-size:12px;margin-bottom:3px}
      @media(max-width:650px){.tr2-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.tr2-head{flex-direction:column}.tr2-head span{text-align:left}.tr2-canvas,.tr2-empty{height:190px}.tr2-note{display:block}.tr2-note b{display:block;margin-top:3px}}
    `;
    document.head.appendChild(style);
  }

  function hideLegacyTrend() {
    ['s-fat-chart','s-muscle-chart'].forEach(id => {
      const canvas = document.getElementById(id);
      const card = canvas?.closest('.s-chart-card') || canvas?.parentElement?.parentElement;
      if (card && !card.closest('.tr2-root')) card.classList.add('tr2-hide');
    });
    const note = document.getElementById('s-range-note');
    if (note) note.classList.add('tr2-hide');
    document.querySelectorAll('#summary-app .s-period-compare,.tr-root').forEach(x => x.classList.add('tr2-hide'));
    document.querySelectorAll('#summary-app .s-verdict').forEach(x => x.remove());
  }

  function ensureControls() {
    const controls = document.querySelector('#summary-app .s-range-controls');
    if (!controls) return null;
    const defs = [[1,'รายวัน'],[7,'รายสัปดาห์'],[30,'รายเดือน']];
    let buttons = [...controls.querySelectorAll('button')];
    if (!buttons.length) return null;
    while (buttons.length < defs.length) {
      const clone = buttons[0].cloneNode(true);
      controls.appendChild(clone);
      buttons.push(clone);
    }
    buttons.forEach((button,index) => {
      if (index >= defs.length) { button.remove(); return; }
      const [range,label] = defs[index];
      button.dataset.range = String(range);
      button.dataset.trRange = String(range);
      button.textContent = label;
      button.disabled = false;
      button.removeAttribute('disabled');
    });
    return controls;
  }

  let charts = [];
  const chartStates = new Map();

  function destroyCharts() {
    charts.forEach(chart => { try { chart.destroy(); } catch (_) {} });
    charts = [];
    chartStates.clear();
  }

  function chartCard(kind, title, value, series) {
    const points = series.length;
    return `<div class="tr2-card ${kind}">
      <div class="tr2-card-head"><strong>${title}</strong><span>${fmt(value)} kg</span></div>
      ${points >= 2 ? `<div class="tr2-tools"><button type="button" data-chart="${kind}" data-zoom="out" title="Zoom out">−</button><button type="button" data-chart="${kind}" data-zoom="reset">ทั้งหมด</button><button type="button" data-chart="${kind}" data-zoom="in" title="Zoom in">+</button></div>` : ''}
      <div class="tr2-readout" id="tr2-read-${kind}"></div>
      ${points < 2
        ? `<div class="tr2-empty"><div><strong>ข้อมูลยังไม่พอสำหรับดูแนวโน้ม</strong>มี ${points} จุด · ต้องมีอย่างน้อย 2 จุด</div></div>`
        : `<div class="tr2-canvas"><canvas id="tr2-${kind}"></canvas></div>`}
    </div>`;
  }

  function setYRange(state) {
    const visible = state.series.slice(state.start, state.end + 1).map(x => x.value).filter(Number.isFinite);
    if (!visible.length) return;
    const minValue = Math.min(...visible);
    const maxValue = Math.max(...visible);
    const minSpan = state.kind === 'fat' ? 0.4 : 0.5;
    const span = Math.max(maxValue - minValue, minSpan);
    const pad = Math.max(0.15, span * 0.18);
    state.chart.options.scales.y.min = Math.floor((minValue - pad) * 10) / 10;
    state.chart.options.scales.y.max = Math.ceil((maxValue + pad) * 10) / 10;
  }

  function applyView(state, start, end) {
    const n = state.series.length;
    start = Math.max(0, Math.min(Math.round(start), n - 2));
    end = Math.min(n - 1, Math.max(Math.round(end), start + 1));
    state.start = start;
    state.end = end;
    state.chart.options.scales.x.min = start;
    state.chart.options.scales.x.max = end;
    setYRange(state);
    state.chart.update('none');
  }

  function zoomState(state, factor, center = null) {
    const n = state.series.length;
    if (n < 3) return;
    const oldSize = state.end - state.start + 1;
    const minSize = Math.min(4, n);
    const newSize = Math.max(minSize, Math.min(n, Math.round(oldSize * factor)));
    if (newSize === oldSize) return;
    const c = Number.isFinite(center) ? center : (state.start + state.end) / 2;
    let start = Math.round(c - (newSize - 1) / 2);
    start = Math.max(0, Math.min(start, n - newSize));
    applyView(state, start, start + newSize - 1);
  }

  function resetState(state) {
    applyView(state, 0, state.series.length - 1);
  }

  function bindChartGestures(state) {
    const canvas = state.chart.canvas;
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      const center = state.chart.scales.x.getValueForPixel(event.offsetX);
      zoomState(state, event.deltaY < 0 ? 0.78 : 1.28, Number(center));
    }, { passive: false });

    let drag = null;
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== undefined && event.button !== 0) return;
      drag = { x: event.clientX, start: state.start, end: state.end };
      canvas.classList.add('dragging');
      try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
    });
    canvas.addEventListener('pointermove', event => {
      if (!drag) return;
      const width = Math.max(1, state.chart.chartArea?.width || canvas.clientWidth || 1);
      const size = drag.end - drag.start + 1;
      const shift = Math.round((drag.x - event.clientX) / width * size);
      let start = drag.start + shift;
      start = Math.max(0, Math.min(start, state.series.length - size));
      applyView(state, start, start + size - 1);
    });
    const stop = event => {
      drag = null;
      canvas.classList.remove('dragging');
      try { canvas.releasePointerCapture(event.pointerId); } catch (_) {}
    };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
  }

  function drawChart(kind, series) {
    if (series.length < 2) return;
    const canvas = document.getElementById(`tr2-${kind}`);
    if (!canvas) return;
    const color = kind === 'fat' ? '#ef7c67' : '#318ba7';
    const fill = kind === 'fat' ? 'rgba(239,124,103,.10)' : 'rgba(49,139,167,.10)';
    const values = series.map(x => x.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const span = Math.max(maxValue - minValue, kind === 'fat' ? 0.4 : 0.5);
    const pad = Math.max(0.15, span * 0.18);

    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: series.map(x => x.label),
        datasets: [{
          data: values,
          borderColor: color,
          backgroundColor: fill,
          borderWidth: 2.6,
          pointRadius: series.length > 60 ? 1.8 : series.length > 30 ? 2.5 : 3.8,
          pointHoverRadius: 6,
          pointBackgroundColor: series.map(x => x.open ? '#fff' : color),
          pointBorderColor: color,
          pointBorderWidth: series.map(x => x.open ? 2.7 : 1.5),
          tension: 0.16,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'nearest', intersect: false, axis: 'x' },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 7, color: '#7c8d91', font: { size: 9 } }
          },
          y: {
            beginAtZero: false,
            min: Math.floor((minValue - pad) * 10) / 10,
            max: Math.ceil((maxValue + pad) * 10) / 10,
            ticks: { maxTicksLimit: 5, color: '#7c8d91', font: { size: 9 } },
            grid: { color: 'rgba(124,141,145,.16)' }
          }
        },
        onHover: (_event, active) => {
          const hit = active?.[0];
          const readout = document.getElementById(`tr2-read-${kind}`);
          if (!readout) return;
          readout.textContent = hit ? `${series[hit.index].fullLabel} · ${kind === 'fat' ? 'ไขมัน' : 'กล้ามเนื้อ'} ${fmt(series[hit.index].value)} kg` : '';
        }
      }
    });

    const state = { kind, chart, series, start: 0, end: series.length - 1 };
    chartStates.set(kind, state);
    charts.push(chart);
    bindChartGestures(state);
  }

  function bindZoomButtons(root) {
    root.querySelectorAll('button[data-chart][data-zoom]').forEach(button => {
      button.addEventListener('click', () => {
        const state = chartStates.get(button.dataset.chart);
        if (!state) return;
        if (button.dataset.zoom === 'in') zoomState(state, 0.7);
        else if (button.dataset.zoom === 'out') zoomState(state, 1.4);
        else resetState(state);
      });
    });
  }

  function render(r) {
    addStyles();
    const controls = ensureControls();
    if (!controls) return false;
    const mode = MODES[r]?.key || 'daily';
    const summary = summaryFor(mode);
    controls.querySelectorAll('button[data-range]').forEach(button => button.setAttribute('aria-pressed', String(+button.dataset.range === r)));
    hideLegacyTrend();

    let root = controls.parentElement?.querySelector(':scope > .tr2-root');
    if (!root) {
      root = document.createElement('div');
      root.className = 'tr2-root';
      controls.insertAdjacentElement('afterend', root);
    }

    const metrics = [
      ['weight','Weight',true,'kg',false],
      ['fat','Fat',true,'kg',false],
      ['bf','BF',true,'%',true],
      ['muscle','Muscle',false,'kg',false]
    ];
    const fatSeries = bucketSeries(mode, 'fat');
    const muscleSeries = bucketSeries(mode, 'muscle');
    const [fatCurrent] = periodValues(summary, 'fat');
    const [muscleCurrent] = periodValues(summary, 'muscle');
    const pointCount = Math.max(fatSeries.length, muscleSeries.length);

    destroyCharts();
    root.innerHTML = `
      <div class="tr2-summary">
        <div class="tr2-head"><strong>${summary.title}</strong><span>${summary.compare}</span></div>
        <div class="tr2-grid">
          ${metrics.map(([key,name,lowerBetter,unit,isBF]) => {
            const [current,previous] = periodValues(summary,key);
            const meta = deltaMeta(current,previous,lowerBetter);
            return `<div class="tr2-metric"><small>${name} avg</small><b>${fmt(current)}${isBF?'%':' kg'}</b>${deltaPill(meta,unit,isBF)}</div>`;
          }).join('')}
        </div>
      </div>
      <div class="tr2-note"><span>กราฟ${modeName(r)} · แสดงข้อมูลทั้งหมด ${pointCount} จุด</span><b>ลากเพื่อเลื่อน · scroll หรือปุ่ม +/− เพื่อ zoom</b></div>
      ${chartCard('fat','ไขมัน',fatCurrent,fatSeries)}
      ${chartCard('muscle','กล้ามเนื้อ',muscleCurrent,muscleSeries)}
    `;

    drawChart('fat', fatSeries);
    drawChart('muscle', muscleSeries);
    bindZoomButtons(root);
    return true;
  }

  function bind() {
    const controls = ensureControls();
    if (!controls) return false;
    if (controls.dataset.trendRebuildV3Bound === '1') return true;
    controls.dataset.trendRebuildV3Bound = '1';
    controls.addEventListener('click', event => {
      const button = event.target.closest?.('button[data-range]');
      if (!button || !controls.contains(button)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const r = +button.dataset.range;
      if (MODES[r]) render(r);
    }, true);
    return true;
  }

  function start() {
    const run = () => {
      if (!bind()) return false;
      return render(1);
    };
    if (!run()) [120,350,800,1500].forEach(ms => setTimeout(run,ms));
    else [200,700,1800].forEach(ms => setTimeout(hideLegacyTrend,ms));
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded',start,{once:true})
    : start();
})();
