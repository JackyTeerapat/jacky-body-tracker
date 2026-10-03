(() => {
  const DAY = 86400000;
  const day = s => new Date(s + 'T00:00:00Z');
  const iso = d => d.toISOString().slice(0,10);
  const shift = (d,n) => new Date(d.getTime() + n * DAY);
  const avg = xs => xs.length ? xs.reduce((a,b)=>a+b,0) / xs.length : null;
  const weekStart = s => {
    const d = day(s);
    const back = d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1;
    return shift(d,-back);
  };
  window.JackyRedEvaluator = function(data) {
    const rows = (data || []).filter(x => x && x.isoDate).slice().sort((a,b)=>a.isoDate.localeCompare(b.isoDate));
    const baselineRows = rows.filter(x => x.isoDate >= '2026-08-31' && x.isoDate <= '2026-09-06');
    if (baselineRows.length < 4) return {triggered:false, reason:'baseline'};
    const baseline = {
      muscle: avg(baselineRows.map(x=>Number(x.muscle)).filter(Number.isFinite)),
      water: avg(baselineRows.map(x=>Number(x.waterWeight)).filter(Number.isFinite))
    };
    const currentStart = weekStart(rows.at(-1).isoDate);
    const lastClosedEnd = shift(currentStart,-1);
    const weeks = [];
    for (let s = weekStart(rows[0].isoDate); s <= lastClosedEnd; s = shift(s,7)) {
      const e = shift(s,6);
      const r = rows.filter(x => x.isoDate >= iso(s) && x.isoDate <= iso(e));
      if (r.length < 4 || iso(s) <= '2026-09-06') continue;
      const muscle = avg(r.map(x=>Number(x.muscle)).filter(Number.isFinite));
      const water = avg(r.map(x=>Number(x.waterWeight)).filter(Number.isFinite));
      weeks.push({
        start: iso(s),
        end: iso(e),
        muscle,
        water,
        muscleDrop: baseline.muscle - muscle,
        waterDrop: baseline.water - water
      });
    }
    const lastTwo = weeks.slice(-2);
    const gate1 = lastTwo.length === 2 && lastTwo.every(w => w.muscleDrop >= 0.5);
    const latest = [...weeks].reverse().find(w => w.muscleDrop >= 0.5) || null;
    const waterGate = !!latest && (latest.waterDrop <= 0 || latest.waterDrop < latest.muscleDrop * 0.5);
    return {triggered: gate1 && waterGate, gate1, waterGate, baseline, weeks, latest};
  };
})();