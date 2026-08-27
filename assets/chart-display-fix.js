(() => {
  const S = window.__JACKY_TRACKER__;
  if (!S?.DATA?.length || !window.Chart) return;

  // Keep the chart focused on the actual trend. A far-away target flattens the
  // visible slope, so only draw it once the current value is within 2 kg.
  const TARGET_VISIBLE_GAP_KG = 2;
  const data = S.DATA.filter(x => x?.isoDate).slice().sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  const latest = data.at(-1);
  const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

  const latestStamp = () => {
    const match = String(latest?.measuredAt || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (match) return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]} · ${match[4]}:${match[5]}`;
    const d = String(latest?.isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return d ? `${Number(d[3])} ${MONTHS[Number(d[2]) - 1]} ${d[1]}` : (latest?.date || '—');
  };

  const updateHeader = () => {
    const header = document.querySelector('#summary-app .s-header');
    if (!header) return;
    const eyebrow = header.querySelector('.s-eyebrow');
    const title = header.querySelector('h1');
    const date = header.querySelector('.s-date');
    if (eyebrow) eyebrow.textContent = 'JACKY';
    if (title) title.textContent = 'BODY TRACKER';
    if (date) date.textContent = `อัปเดตล่าสุด · ${latestStamp()}`;
  };

  const ensureReadout = canvas => {
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
  };

  const formatHoverDate = point => {
    const day = Number(point?.raw?.x ?? point?.parsed?.x);
    if (!Number.isFinite(day)) return '';
    const row = data.reduce((best, item) => {
      const cur = Number(item.daysFromStart);
      if (!Number.isFinite(cur)) return best;
      if (!best || Math.abs(cur - day) < Math.abs(Number(best.daysFromStart) - day)) return item;
      return best;
    }, null);
    return row?.date || row?.isoDate || '';
  };

  const patchChart = (id, key, target) => {
    const canvas = document.getElementById(id);
    const chart = canvas && window.Chart.getChart ? window.Chart.getChart(canvas) : null;
    if (!chart) return;

    const current = Number(latest?.[key]);
    const goal = Number(target);
    const showTarget = Number.isFinite(current) && Number.isFinite(goal) && Math.abs(current - goal) <= TARGET_VISIBLE_GAP_KG;

    if (!showTarget) {
      chart.data.datasets = chart.data.datasets.filter(dataset => dataset.label !== 'เป้าหมาย');
    }

    const readout = ensureReadout(canvas);
    const originals = chart.data.datasets.map(dataset => ({
      borderWidth: dataset.borderWidth,
      pointRadius: dataset.pointRadius,
      pointHoverRadius: dataset.pointHoverRadius
    }));

    // No floating tooltip over the plot. Hovering a line shows only that line's
    // value in a compact readout above the chart and visually emphasizes it.
    chart.options.interaction = { mode: 'nearest', intersect: false, axis: 'xy' };
    chart.options.plugins = chart.options.plugins || {};
    chart.options.plugins.tooltip = {
      ...(chart.options.plugins.tooltip || {}),
      enabled: false
    };
    chart.options.onHover = (event, active) => {
      const hit = active?.[0];
      if (!hit) {
        if (readout) readout.textContent = '';
        chart.data.datasets.forEach((dataset, i) => {
          dataset.borderWidth = originals[i]?.borderWidth;
          dataset.pointRadius = originals[i]?.pointRadius;
          dataset.pointHoverRadius = originals[i]?.pointHoverRadius;
        });
        chart.update('none');
        return;
      }

      const dataset = chart.data.datasets[hit.datasetIndex];
      const value = Number(hit.element?.$context?.parsed?.y ?? hit.element?.$context?.raw?.y ?? hit.element?.$context?.raw);
      const label = dataset?.label || (key === 'fat' ? 'ไขมัน' : 'กล้ามเนื้อ');
      const unit = 'kg';
      const date = formatHoverDate(hit.element?.$context || hit);
      if (readout) readout.textContent = `${date}${date ? ' · ' : ''}${label} ${Number.isFinite(value) ? value.toFixed(1) : '—'} ${unit}`;

      chart.data.datasets.forEach((d, i) => {
        d.borderWidth = i === hit.datasetIndex ? 3.5 : 1;
        d.pointHoverRadius = i === hit.datasetIndex ? 5 : 0;
      });
      chart.update('none');
    };

    // Recalculate the Y scale from only the data that remains visible.
    const values = chart.data.datasets
      .flatMap(dataset => Array.isArray(dataset.data) ? dataset.data.map(point => Number(point?.y ?? point)) : [])
      .filter(Number.isFinite);

    if (values.length) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const span = Math.max(max - min, 0.5);
      const padding = Math.max(0.25, span * 0.2);
      chart.options.scales.y.min = Math.floor((min - padding) * 10) / 10;
      chart.options.scales.y.max = Math.ceil((max + padding) * 10) / 10;
    }

    chart.update('none');
  };

  const updateNote = () => {
    const range = +(document.querySelector('.s-range-controls button[aria-pressed="true"]')?.dataset.range || 7);
    const note = document.getElementById('s-range-note');
    if (!note) return;
    note.textContent = range >= 90
      ? 'ค่าเฉลี่ยรายสัปดาห์เพื่อลด noise'
      : range >= 30
        ? 'เส้นบาง = ค่าจริง · เส้นหลัก = ค่าเฉลี่ย 7 วัน'
        : range >= 7
          ? 'เส้นบาง = ค่าจริง · เส้นหลัก = ค่าเฉลี่ย 3 วัน'
          : 'ผลวัดล่าสุด';
  };

  const addStyle = () => {
    if (document.getElementById('chart-display-fix-style')) return;
    const style = document.createElement('style');
    style.id = 'chart-display-fix-style';
    style.textContent = '.s-chart-hover-readout{height:18px;margin:0 0 2px;text-align:right;color:#617579;font-size:10px;font-weight:700;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}';
    document.head.appendChild(style);
  };

  const apply = () => {
    updateHeader();
    addStyle();
    patchChart('s-fat-chart', 'fat', S.TARGET);
    patchChart('s-muscle-chart', 'muscle', S.MUSCLE_TARGET);
    updateNote();
  };

  const start = () => {
    updateHeader();
    addStyle();
    document.querySelectorAll('.s-range-controls button').forEach(button => {
      button.addEventListener('click', () => setTimeout(apply, 20));
    });
    setTimeout(apply, 20);
  };

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', start, { once: true })
    : start();
})();
