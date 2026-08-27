(() => {
  const S = window.__JACKY_TRACKER__;
  if (!S?.DATA?.length || !window.Chart) return;

  // Keep the chart focused on the actual trend. A far-away target flattens the
  // visible slope, so only draw it once the current value is within 2 kg.
  const TARGET_VISIBLE_GAP_KG = 2;
  const latest = S.DATA.filter(x => x?.isoDate).slice().sort((a, b) => a.isoDate.localeCompare(b.isoDate)).at(-1);

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
      ? 'กราฟใช้ค่าเฉลี่ยรายสัปดาห์เพื่อลด noise'
      : range >= 30
        ? 'จุดจาง = ค่าจริง · เส้นหลัก = ค่าเฉลี่ยเคลื่อนที่ 7 วัน'
        : range >= 7
          ? 'จุดจาง = ค่าจริง · เส้นหลัก = ค่าเฉลี่ยเคลื่อนที่ 3 วัน'
          : 'จุดใหญ่ = ผลวัดล่าสุด';
  };

  const apply = () => {
    patchChart('s-fat-chart', 'fat', S.TARGET);
    patchChart('s-muscle-chart', 'muscle', S.MUSCLE_TARGET);
    updateNote();
  };

  const start = () => {
    document.querySelectorAll('.s-range-controls button').forEach(button => {
      button.addEventListener('click', () => setTimeout(apply, 20));
    });
    setTimeout(apply, 20);
  };

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', start, { once: true })
    : start();
})();
