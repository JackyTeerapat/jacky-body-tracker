(() => {
  const S = window.__JACKY_TRACKER__;
  if (!S?.DATA?.length) return;

  const D = S.DATA.filter(x => x?.isoDate).slice().sort((a,b) => String(a.measuredAt || a.isoDate).localeCompare(String(b.measuredAt || b.isoDate)));
  const latest = D.at(-1), MS = 864e5;
  const M = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const dt = s => new Date(`${s}T00:00:00Z`);
  const sh = (d,n) => new Date(d.getTime() + n*MS);
  const iso = d => d.toISOString().slice(0,10);
  const avg = a => { const n=a.map(Number).filter(Number.isFinite); return n.length ? n.reduce((s,x)=>s+x,0)/n.length : null; };
  const f1 = x => Number.isFinite(+x) ? (+x).toFixed(1) : '—';
  const sd = v => { const d=typeof v==='string'?dt(v):v; return Number.isNaN(d.getTime())?'—':`${d.getUTCDate()} ${M[d.getUTCMonth()]}`; };
  const startWeek = d => sh(d,-(d.getUTCDay()===0?6:d.getUTCDay()-1));

  function currentWeek(){
    const ld=dt(latest.isoDate), start=startWeek(ld), end=sh(start,6);
    const current=D.filter(r=>r.isoDate>=iso(start)&&r.isoDate<=latest.isoDate);
    const elapsed=Math.round((ld-start)/MS)+1;
    return {start,end,current,left:Math.max(0,7-elapsed)};
  }

  function addStyle(){
    if(document.getElementById('jacky-layout-hierarchy-style')) return;
    const s=document.createElement('style');
    s.id='jacky-layout-hierarchy-style';
    s.textContent=`
      #summary-app .s-wtd-head{display:none!important}
      #summary-app .s-metric-goal-top>em{display:none!important}
      #summary-app .s-weekly-checkpoint{border-color:#c7ddd8!important;box-shadow:0 7px 24px rgba(24,35,38,.045)}
      #summary-app .s-weekly-head p{font-size:10px!important;font-weight:950!important;letter-spacing:.13em!important}
      .s-weekly-purpose{display:block;margin-top:6px;color:#718084;font-size:9px;font-weight:700}
      .s-this-week-preview{margin:0 0 12px;padding:12px 14px;border:1px solid #dfeae7;border-radius:16px;background:#fbfcfc}
      .s-this-week-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
      .s-this-week-copy p,.s-goal-section-head p{margin:0 0 3px;color:#147d7a;font-size:9px;font-weight:900;letter-spacing:.12em}
      .s-this-week-copy h2,.s-goal-section-head h2{margin:0;color:#182326;font-size:16px;line-height:1.15;letter-spacing:-.02em}
      .s-this-week-copy small,.s-goal-section-head small{display:block;margin-top:4px;color:#718084;font-size:9px}
      .s-this-week-badge{flex:0 0 auto;padding:6px 9px;border-radius:999px;background:#eef5f3;color:#58706f;font-size:9px;font-weight:850;white-space:nowrap}
      .s-this-week-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
      .s-this-week-metric{padding:9px 10px;border:1px solid #edf2f0;border-radius:11px;background:#fff}
      .s-this-week-metric small{display:block;color:#617579;font-size:9px;font-weight:850}.s-this-week-metric strong{display:block;margin-top:3px;color:#182326;font-size:16px;line-height:1.05;font-weight:900}
      .s-this-week-foot{margin-top:8px;color:#718084;font-size:8px}
      .s-goal-section-head{margin:1px 2px 9px;padding:0 1px}
      #summary-app .s-metric-goal-grid{margin-top:0!important}
      @media(max-width:650px){.s-this-week-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.s-this-week-head{align-items:flex-start}.s-this-week-copy h2,.s-goal-section-head h2{font-size:15px}.s-this-week-badge{font-size:8px}}
    `;
    document.head.appendChild(s);
  }

  function labelWeeklyPerformance(){
    const card=document.querySelector('#summary-app .s-weekly-checkpoint');
    if(!card) return false;
    const label=card.querySelector('.s-weekly-head p');
    if(label) label.textContent='WEEKLY PERFORMANCE';
    const picker=card.querySelector('.s-checkpoint-picker');
    if(picker){
      let purpose=picker.querySelector('.s-weekly-purpose');
      if(!purpose){ purpose=document.createElement('small'); purpose.className='s-weekly-purpose'; picker.appendChild(purpose); }
      purpose.textContent='ผลสัปดาห์ที่ปิดแล้ว · ใช้เป็น checkpoint หลัก';
    }
    return true;
  }

  function renderThisWeek(){
    const wrap=document.querySelector('#summary-app .summary-wrap');
    const checkpoint=wrap?.querySelector('.s-weekly-checkpoint');
    const grid=wrap?.querySelector('.s-metric-goal-grid');
    if(!wrap||!checkpoint||!grid) return false;

    const W=currentWeek();
    const A=k=>avg(W.current.map(x=>x[k]));
    const metrics=[
      ['Weight avg',A('weight'),' kg'],
      ['Fat avg',A('fat'),' kg'],
      ['BF avg',A('bf'),'%'],
      ['Muscle avg',A('muscle'),' kg']
    ];

    let preview=wrap.querySelector('.s-this-week-preview');
    if(!preview){ preview=document.createElement('section'); preview.className='s-this-week-preview'; }
    preview.innerHTML=`
      <div class="s-this-week-head">
        <div class="s-this-week-copy"><p>THIS WEEK · PREVIEW</p><h2>ค่าเฉลี่ยสัปดาห์นี้ · ${sd(W.start)}–${sd(latest.isoDate)}</h2><small>ยังไม่ปิดรอบ · ใช้ดูแนวโน้มเท่านั้น</small></div>
        <span class="s-this-week-badge">${W.left?`เหลืออีก ${W.left} วัน`:'ครบสัปดาห์แล้ว'}</span>
      </div>
      <div class="s-this-week-grid">${metrics.map(([name,val,unit])=>`<div class="s-this-week-metric"><small>${name}</small><strong>${f1(val)}${unit}</strong></div>`).join('')}</div>
      <div class="s-this-week-foot">ผล Weekly Performance จะสรุปเมื่อจบวันอาทิตย์</div>`;
    checkpoint.insertAdjacentElement('afterend',preview);

    let goalHead=wrap.querySelector('.s-goal-section-head');
    if(!goalHead){ goalHead=document.createElement('div'); goalHead.className='s-goal-section-head'; }
    goalHead.innerHTML='<p>GOAL PROGRESS</p><h2>ระยะถึงเป้าหมาย</h2><small>อิงค่าเฉลี่ยสัปดาห์นี้เพื่อลดความแกว่งของ BIA</small>';
    grid.insertAdjacentElement('beforebegin',goalHead);
    return true;
  }

  function apply(){ addStyle(); labelWeeklyPerformance(); renderThisWeek(); }
  function start(){
    [260,720,1450].forEach(ms=>setTimeout(apply,ms));
    document.addEventListener('click',e=>{
      if(e.target.closest?.('#summary-app .s-weekly-checkpoint')) [80,260].forEach(ms=>setTimeout(apply,ms));
    });
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();