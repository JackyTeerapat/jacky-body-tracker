(() => {
  const S = window.__JACKY_TRACKER__;
  if (!S?.DATA?.length) return;

  const D = S.DATA
    .filter(x => x?.isoDate)
    .slice()
    .sort((a,b) => String(a.measuredAt || a.isoDate).localeCompare(String(b.measuredAt || b.isoDate)));
  const latest = D.at(-1);
  const MS = 864e5;

  const dt = s => new Date(`${s}T00:00:00Z`);
  const sh = (d,n) => new Date(d.getTime() + n*MS);
  const iso = d => d.toISOString().slice(0,10);
  const avg = values => {
    const n = values.map(Number).filter(Number.isFinite);
    return n.length ? n.reduce((sum,x) => sum+x,0) / n.length : null;
  };
  const f1 = x => Number.isFinite(+x) ? (+x).toFixed(1) : '—';
  const startWeek = d => sh(d, -(d.getUTCDay() === 0 ? 6 : d.getUTCDay()-1));

  function latestClosedWeek(){
    const ld = dt(latest.isoDate);
    const end = ld.getUTCDay() === 0 ? ld : sh(startWeek(ld), -1);
    const start = sh(end, -6);
    return {start,end,rows:D.filter(r => r.isoDate >= iso(start) && r.isoDate <= iso(end))};
  }

  function weeklySeries(key){
    const last = latestClosedWeek().end;
    const groups = new Map();
    D.forEach(r => {
      const end = sh(startWeek(dt(r.isoDate)), 6);
      if (end > last) return;
      const k = iso(end);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    });
    return [...groups.entries()]
      .sort((a,b) => a[0].localeCompare(b[0]))
      .map(([end,rows]) => ({end,value:avg(rows.map(x => x[key]))}))
      .filter(x => Number.isFinite(x.value));
  }

  function recentTrendPerWeek(key){
    const s = weeklySeries(key).slice(-4);
    if (s.length < 2) return null;
    const n = s.length;
    const xm = (n-1)/2;
    const ym = avg(s.map(x => x.value));
    let num = 0, den = 0;
    s.forEach((p,i) => {
      num += (i-xm) * (p.value-ym);
      den += (i-xm) * (i-xm);
    });
    return den ? num/den : null;
  }

  function etaText(key, remain, mode){
    if (!Number.isFinite(remain)) return 'ข้อมูลยังไม่พอ';
    if (remain <= 0.05) return 'ถึงเป้าหมายแล้ว';
    const slope = recentTrendPerWeek(key);
    const favorable = mode === 'lower' ? -(slope ?? 0) : (slope ?? 0);
    if (!Number.isFinite(favorable) || favorable <= 0.01) return 'ยังประเมินเวลาไม่ได้';
    const weeks = remain / favorable;
    if (!Number.isFinite(weeks) || weeks > 260) return 'ยังประเมินเวลาไม่ได้';
    if (weeks < 8) return `คาดว่าอีก ~${Math.max(1,Math.round(weeks))} สัปดาห์`;
    const months = weeks / 4.345;
    if (months < 18) return `คาดว่าอีก ~${Math.max(1,Math.round(months))} เดือน`;
    return `คาดว่าอีก ~${(months/12).toFixed(1)} ปี`;
  }

  function style(){
    if (document.getElementById('jacky-goal-v2-style')) return;
    const el = document.createElement('style');
    el.id = 'jacky-goal-v2-style';
    el.textContent = `
      .s-goal-target{margin-top:4px;color:#718084;font-size:9px;font-weight:800}
      .s-goal-progress-summary,.s-goal-progress-week{display:flex;justify-content:space-between;gap:8px;margin-top:6px;font-size:8px;font-weight:750}
      .s-goal-progress-summary{color:#617579}
      .s-goal-progress-week{padding-top:6px;border-top:1px solid #edf2f0;color:#718084}
      .s-goal-progress-summary span:last-child,.s-goal-progress-week span:last-child{text-align:right}
      .s-goal-week-good{color:#147d7a;font-weight:900}.s-goal-week-bad{color:#c26453;font-weight:900}.s-goal-week-neutral{color:#718084;font-weight:900}
      @media(max-width:650px){.s-goal-progress-summary,.s-goal-progress-week{font-size:9px}}
    `;
    document.head.appendChild(el);
  }

  function weeklyChangeText(series, mode){
    if (series.length < 2) return {text:'สัปดาห์ล่าสุด —', cls:'s-goal-week-neutral'};
    const d = series.at(-1).value - series.at(-2).value;
    if (!Number.isFinite(d) || Math.abs(d) < 0.005) return {text:'สัปดาห์ล่าสุด → 0.00 kg/สัปดาห์', cls:'s-goal-week-neutral'};
    const favorable = mode === 'lower' ? d < 0 : d > 0;
    return {
      text:`สัปดาห์ล่าสุด ${d < 0 ? '↓' : '↑'} ${Math.abs(d).toFixed(2)} kg/สัปดาห์`,
      cls:favorable ? 's-goal-week-good' : 's-goal-week-bad'
    };
  }

  function render(){
    const section = document.querySelector('#summary-app .s-goal-progress-section');
    const compact = section?.querySelector('.s-goal-remaining-grid');
    if (!section || !compact) return false;

    style();
    const P = latestClosedWeek();
    const current = key => avg(P.rows.map(x => x[key]));
    const weightTarget = Number(S.WEIGHT_TARGET ?? latest.targetWeight ?? 73.7);
    const configs = [
      {key:'weight',name:'น้ำหนัก',target:weightTarget,mode:'lower',className:'weight'},
      {key:'fat',name:'ไขมัน',target:Number(S.TARGET ?? 9.0),mode:'lower',className:'fat'},
      {key:'muscle',name:'กล้ามเนื้อ',target:Number(S.MUSCLE_TARGET ?? 63.0),mode:'higher',className:'muscle'}
    ];

    compact.innerHTML = configs.map(cfg => {
      const cur = current(cfg.key);
      const series = weeklySeries(cfg.key);
      const startValue = series[0]?.value;
      if (!Number.isFinite(cur) || !Number.isFinite(cfg.target)) {
        return `<div class="s-goal-remaining-card ${cfg.className}"><small>${cfg.name}</small><div class="s-goal-target">เป้า —</div><strong class="s-goal-no-data">ข้อมูลยังไม่พอ</strong></div>`;
      }

      const remainRaw = cfg.mode === 'lower' ? cur-cfg.target : cfg.target-cur;
      const remain = Math.max(0, remainRaw);
      const done = remainRaw <= 0.05;
      const action = done ? 'ถึงเป้าแล้ว' : cfg.mode === 'lower' ? 'ลดอีก' : 'เพิ่มอีก';
      const value = done ? '✓' : `${f1(remain)} kg`;

      let achieved = null, progress = 0;
      if (Number.isFinite(startValue) && startValue !== cfg.target) {
        achieved = cfg.mode === 'lower' ? startValue-cur : cur-startValue;
        const totalNeed = cfg.mode === 'lower' ? startValue-cfg.target : cfg.target-startValue;
        if (Number.isFinite(totalNeed) && totalNeed > 0) progress = Math.max(0, Math.min(1, achieved/totalNeed));
      }
      const achievedText = Number.isFinite(achieved)
        ? `${cfg.mode === 'lower' ? 'ลดแล้ว' : 'เพิ่มแล้ว'} ${Math.max(0,achieved).toFixed(1)} kg`
        : 'จากเริ่ม —';
      const week = weeklyChangeText(series,cfg.mode);
      const eta = etaText(cfg.key,remain,cfg.mode);

      return `<div class="s-goal-remaining-card ${cfg.className}${done?' done':''}">
        <small>${cfg.name}</small>
        <div class="s-goal-target">เป้า ${f1(cfg.target)} kg</div>
        <strong>${action} ${value}</strong>
        <div class="s-goal-progress-track"><i class="s-goal-progress-fill" style="width:${(progress*100).toFixed(0)}%"></i></div>
        <div class="s-goal-progress-summary"><span>${achievedText}</span><span>ไปแล้ว ${(progress*100).toFixed(0)}%</span></div>
        <div class="s-goal-progress-week"><span class="${week.cls}">${week.text}</span><span>${eta}</span></div>
      </div>`;
    }).join('');

    return true;
  }

  function start(){
    let tries = 0;
    const boot = () => {
      tries += 1;
      const ok = render();
      if ((!ok || tries < 12) && tries < 20) setTimeout(boot, 400);
    };
    boot();
    [1500,3000,6000].forEach(ms => setTimeout(render,ms));
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded',start,{once:true})
    : start();
})();
