(() => {
  const S = window.__JACKY_TRACKER__;
  if (!S?.DATA?.length) return;

  const D = S.DATA.filter(x => x?.isoDate).slice().sort((a,b) => String(a.measuredAt || a.isoDate).localeCompare(String(b.measuredAt || b.isoDate)));
  const latest = D.at(-1), MS = 864e5;
  const M = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const GOOD = '#147d7a', BAD = '#c26453', NEUTRAL = '#718084';
  const dt = s => new Date(`${s}T00:00:00Z`);
  const sh = (d,n) => new Date(d.getTime() + n*MS);
  const iso = d => d.toISOString().slice(0,10);
  const avg = a => { const n=a.map(Number).filter(Number.isFinite); return n.length ? n.reduce((s,x)=>s+x,0)/n.length : null; };
  const f1 = x => Number.isFinite(+x) ? (+x).toFixed(1) : '—';
  const sd = v => { const d=typeof v==='string'?dt(v):v; return Number.isNaN(d.getTime())?'—':`${d.getUTCDate()} ${M[d.getUTCMonth()]}`; };
  const startWeek = d => sh(d,-(d.getUTCDay()===0?6:d.getUTCDay()-1));

  function meta(c,p,lowerBetter){
    if(!Number.isFinite(c)||!Number.isFinite(p)) return {delta:null,pct:null,arrow:'→',cls:'neutral'};
    const delta=c-p, pct=p ? delta/p*100 : null, arrow=delta>0?'↑':delta<0?'↓':'→';
    const good=lowerBetter ? delta<0 : delta>0;
    const bad=lowerBetter ? delta>0 : delta<0;
    return {delta,pct,arrow,cls:Math.abs(delta)<1e-9?'neutral':good?'good':bad?'bad':'neutral'};
  }

  function currentWeek(){
    const ld=dt(latest.isoDate), start=startWeek(ld), end=sh(start,6);
    const current=D.filter(r=>r.isoDate>=iso(start)&&r.isoDate<=latest.isoDate);
    const elapsed=Math.round((ld-start)/MS)+1;
    return {start,end,current,left:Math.max(0,7-elapsed)};
  }

  function latestClosedWeek(){
    const ld=dt(latest.isoDate);
    const end=ld.getUTCDay()===0 ? ld : sh(startWeek(ld),-1);
    const start=sh(end,-6);
    return {start,end,rows:D.filter(r=>r.isoDate>=iso(start)&&r.isoDate<=iso(end))};
  }

  function deltaHtml(c,p,lower,unit,bf=false){
    const m=meta(c,p,lower);
    if(m.delta==null) return '';
    const primary=bf ? `${Math.abs(m.delta).toFixed(2)} จุด` : `${Math.abs(m.delta).toFixed(2)} ${unit}`;
    const rel=Number.isFinite(m.pct)?` · ${Math.abs(m.pct).toFixed(1)}%`:'';
    return `<em class="s-preview-pill ${m.cls}">${m.arrow} ${primary}${rel}</em>`;
  }

  function addStyle(){
    if(document.getElementById('jacky-layout-hierarchy-style')) return;
    const s=document.createElement('style');
    s.id='jacky-layout-hierarchy-style';
    s.textContent=`
      #summary-app .s-wtd-head{display:none!important}
      #summary-app .s-metric-goal-top>em{display:none!important}

      #summary-app .s-weekly-checkpoint{margin:0 0 12px!important;border-color:#c7ddd8!important;box-shadow:0 7px 24px rgba(24,35,38,.045)}
      #summary-app .s-weekly-head p{font-size:10px!important;font-weight:950!important;letter-spacing:.13em!important}
      .s-weekly-purpose{display:block;margin-top:6px;color:#718084;font-size:9px;font-weight:700}

      .s-this-week-preview,.s-goal-progress-section{margin:0 0 12px;padding:13px 14px;border:1px solid #d8e4e1;border-radius:18px;background:#fff}
      .s-this-week-preview{background:#fbfcfc;border-color:#dfeae7}
      .s-this-week-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
      .s-this-week-copy p,.s-goal-section-head p{margin:0 0 3px;color:${GOOD};font-size:9px;font-weight:900;letter-spacing:.12em}
      .s-this-week-copy h2,.s-goal-section-head h2{margin:0;color:#182326;font-size:16px;line-height:1.15;letter-spacing:-.02em}
      .s-this-week-copy small,.s-goal-section-head small{display:block;margin-top:4px;color:#718084;font-size:9px}
      .s-this-week-badge{flex:0 0 auto;padding:6px 9px;border-radius:999px;background:#eef5f3;color:#58706f;font-size:9px;font-weight:850;white-space:nowrap}
      .s-this-week-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
      .s-this-week-metric{padding:9px 10px;border:1px solid #edf2f0;border-radius:11px;background:#fff}
      .s-this-week-metric small{display:block;color:#617579;font-size:9px;font-weight:850}
      .s-this-week-metric strong{display:block;margin:3px 0 5px;color:#182326;font-size:16px;line-height:1.05;font-weight:900}
      .s-preview-pill{display:inline-block;padding:3px 7px;border-radius:999px;font-size:9px;line-height:1.15;font-style:normal;font-weight:850;white-space:nowrap}
      .s-preview-pill.good{color:${GOOD};background:#e8f7f5}.s-preview-pill.bad{color:${BAD};background:#fff0eb}.s-preview-pill.neutral{color:${NEUTRAL};background:#f1f4f3}
      .s-this-week-foot{margin-top:8px;color:#718084;font-size:8px}

      .s-goal-section-head{margin:0 2px 10px;padding:0 1px}
      #summary-app .s-goal-progress-section .s-metric-goal-grid{margin:0!important}
      #summary-app .s-goal-progress-section .s-metric-goal{box-shadow:none!important}
      #summary-app .s-metric-goal-values .s-goal-official small{font-weight:850;color:#617579}

      @media(max-width:650px){
        .s-this-week-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        .s-this-week-head{align-items:flex-start}
        .s-this-week-copy h2,.s-goal-section-head h2{font-size:15px}
        .s-this-week-badge{font-size:8px}
      }
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
      purpose.textContent='ผลสัปดาห์ที่ปิดแล้ว · เทียบกับสัปดาห์ก่อน';
    }
    const grid=card.querySelector('.s-weekly-grid');
    if(grid){
      const byName=new Map([...grid.children].map(el=>[el.querySelector('small')?.textContent?.trim(),el]));
      ['Weight avg','Fat avg','BF avg','Muscle avg'].forEach(name=>{ const el=byName.get(name); if(el) grid.appendChild(el); });
    }
    return true;
  }

  function renderThisWeek(){
    const wrap=document.querySelector('#summary-app .summary-wrap');
    const checkpoint=wrap?.querySelector('.s-weekly-checkpoint');
    if(!wrap||!checkpoint) return false;

    const W=currentWeek(), P=latestClosedWeek();
    const A=(rows,k)=>avg(rows.map(x=>x[k]));
    const metrics=[
      ['Weight avg','weight','kg',true,false],
      ['Fat avg','fat','kg',true,false],
      ['BF avg','bf','%',true,true],
      ['Muscle avg','muscle','kg',false,false]
    ];

    let preview=wrap.querySelector('.s-this-week-preview');
    if(!preview){ preview=document.createElement('section'); preview.className='s-this-week-preview'; }
    preview.innerHTML=`
      <div class="s-this-week-head">
        <div class="s-this-week-copy">
          <p>THIS WEEK · PREVIEW</p>
          <h2>ค่าเฉลี่ยสัปดาห์นี้ · ${sd(W.start)}–${sd(latest.isoDate)}</h2>
          <small>ยังไม่ปิดรอบ · เทียบ Weekly Performance ${sd(P.start)}–${sd(P.end)}</small>
        </div>
        <span class="s-this-week-badge">${W.left?`เหลืออีก ${W.left} วัน`:'ครบสัปดาห์แล้ว'}</span>
      </div>
      <div class="s-this-week-grid">${metrics.map(([name,key,unit,lower,bf])=>{
        const cur=A(W.current,key), prev=A(P.rows,key);
        return `<div class="s-this-week-metric"><small>${name}</small><strong>${f1(cur)}${unit==='%'?'%':' kg'}</strong>${deltaHtml(cur,prev,lower,unit,bf)}</div>`;
      }).join('')}</div>
      <div class="s-this-week-foot">Preview ใช้ดูทิศทางระหว่างสัปดาห์ · การตัดสินใจหลักใช้ Weekly Performance หลังปิดวันอาทิตย์</div>`;
    checkpoint.insertAdjacentElement('beforebegin',preview);
    return true;
  }

  function setupGoalProgress(){
    const wrap=document.querySelector('#summary-app .summary-wrap');
    const checkpoint=wrap?.querySelector('.s-weekly-checkpoint');
    const grid=wrap?.querySelector('.s-metric-goal-grid');
    if(!wrap||!checkpoint||!grid) return false;

    const P=latestClosedWeek();
    const A=k=>avg(P.rows.map(x=>x[k]));
    let section=wrap.querySelector('.s-goal-progress-section');
    if(!section){ section=document.createElement('section'); section.className='s-goal-progress-section'; }
    checkpoint.insertAdjacentElement('afterend',section);

    let head=wrap.querySelector('.s-goal-section-head')||section.querySelector('.s-goal-section-head');
    if(!head){ head=document.createElement('div'); head.className='s-goal-section-head'; }
    head.innerHTML=`<p>GOAL PROGRESS</p><h2>ระยะถึงเป้าหมาย</h2><small>อิง Weekly Performance ล่าสุด · ${sd(P.start)}–${sd(P.end)}</small>`;
    section.appendChild(head);
    section.appendChild(grid);

    const configs=[
      {key:'weight',target:+S.WEIGHT_TARGET||73.7,lower:true,remaining:v=>`ลดอีก ${f1(v-(+S.WEIGHT_TARGET||73.7))} kg`},
      {key:'fat',target:+S.TARGET,lower:true,remaining:v=>`ลดอีก ${f1(v-(+S.TARGET))} kg`},
      {key:'muscle',target:+S.MUSCLE_TARGET,lower:false,remaining:v=>`เพิ่มอีก ${f1((+S.MUSCLE_TARGET)-v)} kg`}
    ];

    [...grid.querySelectorAll('.s-metric-goal')].slice(0,3).forEach((card,i)=>{
      const cfg=configs[i]; if(!cfg) return;
      const cur=A(cfg.key);
      const currentBox=card.querySelector('.s-metric-goal-values')?.children?.[0];
      if(currentBox){
        currentBox.classList.add('s-goal-official');
        const small=currentBox.querySelector('small'),strong=currentBox.querySelector('strong');
        if(small) small.textContent='Weekly avg';
        if(strong) strong.innerHTML=`${f1(cur)} <i>kg</i>`;
      }
      const remain=card.querySelector('.s-metric-goal-foot strong');
      if(remain&&Number.isFinite(cur)&&Number.isFinite(cfg.target)) remain.textContent=cfg.remaining(cur);
      const startValue=+D[0]?.[cfg.key],bar=card.querySelector('.s-goal-bar i'),progressText=card.querySelector('.s-metric-goal-foot span');
      if(Number.isFinite(startValue)&&Number.isFinite(cur)&&Number.isFinite(cfg.target)&&startValue!==cfg.target){
        const raw=cfg.lower?(startValue-cur)/(startValue-cfg.target):(cur-startValue)/(cfg.target-startValue);
        const progress=Math.max(0,Math.min(1,raw));
        if(bar) bar.style.width=`${(progress*100).toFixed(0)}%`;
        if(progressText) progressText.textContent=`ไปแล้ว ${(progress*100).toFixed(0)}%`;
      }
    });
    return true;
  }

  function apply(){ addStyle(); labelWeeklyPerformance(); renderThisWeek(); setupGoalProgress(); }
  function start(){
    [280,760,1500].forEach(ms=>setTimeout(apply,ms));
    document.addEventListener('click',e=>{
      if(e.target.closest?.('#summary-app .s-weekly-checkpoint')) [90,280].forEach(ms=>setTimeout(apply,ms));
    });
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();