(() => {
  const S=window.__JACKY_TRACKER__;
  if(!S?.DATA?.length) return;

  const D=S.DATA.filter(x=>x?.isoDate).slice().sort((a,b)=>String(a.measuredAt||a.isoDate).localeCompare(String(b.measuredAt||b.isoDate)));
  const latest=D.at(-1), MS=864e5;
  const M=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const GOOD='#147d7a',BAD='#c26453',NEUTRAL='#718084';
  const dt=s=>new Date(`${s}T00:00:00Z`),sh=(d,n)=>new Date(d.getTime()+n*MS),iso=d=>d.toISOString().slice(0,10);
  const avg=a=>{const n=a.map(Number).filter(Number.isFinite);return n.length?n.reduce((s,x)=>s+x,0)/n.length:null;};
  const f1=x=>Number.isFinite(+x)?(+x).toFixed(1):'—';
  const sd=v=>{const d=typeof v==='string'?dt(v):v;return Number.isNaN(d.getTime())?'—':`${d.getUTCDate()} ${M[d.getUTCMonth()]}`;};
  const startWeek=d=>sh(d,-(d.getUTCDay()===0?6:d.getUTCDay()-1));

  function localTodayUTC(){const n=new Date();return new Date(Date.UTC(n.getFullYear(),n.getMonth(),n.getDate()));}
  function meta(c,p,lower){
    if(!Number.isFinite(c)||!Number.isFinite(p)) return {delta:null,pct:null,arrow:'→',cls:'neutral'};
    const delta=c-p,pct=p?delta/p*100:null,good=lower?delta<0:delta>0,bad=lower?delta>0:delta<0;
    return {delta,pct,arrow:delta>0?'↑':delta<0?'↓':'→',cls:Math.abs(delta)<1e-9?'neutral':good?'good':bad?'bad':'neutral'};
  }

  function updateHeader(){
    const h=document.querySelector('#summary-app .s-header');if(!h)return;
    const m=String(latest.measuredAt||'').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    const stamp=m?`${+m[3]} ${M[+m[2]-1]} ${m[1]} · ${m[4]}:${m[5]}`:`${sd(latest.isoDate)} ${latest.isoDate.slice(0,4)}`;
    const e=h.querySelector('.s-eyebrow'),t=h.querySelector('h1'),d=h.querySelector('.s-date');
    if(e)e.textContent='JACKY';if(t)t.textContent='BODY TRACKER';if(d)d.textContent=`อัปเดตล่าสุด · ${stamp}`;
  }

  function latestClosedWeek(){
    const ld=dt(latest.isoDate),end=ld.getUTCDay()===0?ld:sh(startWeek(ld),-1),start=sh(end,-6);
    return {start,end,rows:D.filter(r=>r.isoDate>=iso(start)&&r.isoDate<=iso(end))};
  }
  function currentWeek(){
    const ld=dt(latest.isoDate),start=startWeek(ld),end=sh(start,6),current=D.filter(r=>r.isoDate>=iso(start)&&r.isoDate<=latest.isoDate);
    const today=localTodayUTC(),clock=today>=start&&today<=end&&today>=ld?today:ld;
    return {start,end,current,left:Math.max(0,Math.round((end-clock)/MS))};
  }
  function weekEnds(){
    const last=latestClosedWeek().end,set=new Set();
    D.forEach(r=>{const d=dt(r.isoDate),end=sh(startWeek(d),6);if(end<=last)set.add(iso(end));});
    return [...set].sort().reverse();
  }
  function weekRows(end){const e=dt(end),s=sh(e,-6);return D.filter(r=>r.isoDate>=iso(s)&&r.isoDate<=end);}
  function weekLabel(end){const e=dt(end);return `${sd(sh(e,-6))}–${sd(e)} ${e.getUTCFullYear()}`;}

  function weeklySeries(key){
    return weekEnds().slice().reverse().map(end=>({end,value:avg(weekRows(end).map(x=>x[key]))})).filter(x=>Number.isFinite(x.value));
  }
  function trendPerWeek(key){
    const s=weeklySeries(key).slice(-4);if(s.length<2)return null;
    const xm=(s.length-1)/2,ym=avg(s.map(x=>x.value));let num=0,den=0;
    s.forEach((p,i)=>{num+=(i-xm)*(p.value-ym);den+=(i-xm)*(i-xm);});
    return den?num/den:null;
  }
  function etaText(key,remain,mode){
    if(!Number.isFinite(remain))return'ข้อมูลยังไม่พอ';if(remain<=.05)return'ถึงเป้าหมายแล้ว';
    const slope=trendPerWeek(key),rate=mode==='lower'?-(slope??0):(slope??0);
    if(!Number.isFinite(rate)||rate<=.01)return'ยังประเมินเวลาไม่ได้';
    const weeks=remain/rate;if(!Number.isFinite(weeks)||weeks>260)return'ยังประเมินเวลาไม่ได้';
    if(weeks<8)return`คาดว่าอีก ~${Math.max(1,Math.round(weeks))} สัปดาห์`;
    const months=weeks/4.345;if(months<18)return`คาดว่าอีก ~${Math.max(1,Math.round(months))} เดือน`;
    return`คาดว่าอีก ~${(months/12).toFixed(1)} ปี`;
  }

  function deltaHtml(c,p,lower,unit,bf=false){
    const m=meta(c,p,lower);if(m.delta==null)return'<em class="s-preview-pill neutral">ข้อมูลไม่พอ</em>';
    const main=bf?`${Math.abs(m.delta).toFixed(2)} จุด`:`${Math.abs(m.delta).toFixed(2)} ${unit}`,rel=Number.isFinite(m.pct)?` · ${Math.abs(m.pct).toFixed(1)}%`:'';
    return`<em class="s-preview-pill ${m.cls}">${m.arrow} ${main}${rel}</em>`;
  }

  function addStyle(){
    if(document.getElementById('jacky-layout-hierarchy-style'))return;
    const s=document.createElement('style');s.id='jacky-layout-hierarchy-style';s.textContent=`
      #summary-app .s-wtd-head,#summary-app .s-metric-goal-grid{display:none!important}
      .s-this-week-preview,.s-weekly-checkpoint,.s-goal-progress-section{margin:0 0 12px;padding:13px 14px;border:1px solid #d8e4e1;border-radius:18px;background:#fff}
      .s-this-week-preview{background:#fbfcfc;border-color:#dfeae7}.s-weekly-checkpoint{border-color:#c7ddd8;box-shadow:0 7px 24px rgba(24,35,38,.045)}
      .s-this-week-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
      .s-this-week-copy p,.s-weekly-head p,.s-goal-section-head p{margin:0 0 3px;color:${GOOD};font-size:9px;font-weight:950;letter-spacing:.12em}
      .s-this-week-copy h2,.s-goal-section-head h2{margin:0;color:#182326;font-size:16px;line-height:1.15;letter-spacing:-.02em}
      .s-this-week-copy small,.s-goal-section-head small,.s-weekly-purpose{display:block;margin-top:4px;color:#718084;font-size:9px;font-weight:700}
      .s-this-week-badge{flex:0 0 auto;padding:6px 9px;border-radius:999px;background:#eef5f3;color:#58706f;font-size:9px;font-weight:850;white-space:nowrap}
      .s-this-week-grid,.s-weekly-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
      .s-this-week-metric,.s-weekly-grid>div{padding:9px 10px;border:1px solid #edf2f0;border-radius:11px;background:#fff}
      .s-this-week-metric small,.s-weekly-grid small{display:block;color:#617579;font-size:9px;font-weight:850}
      .s-this-week-metric strong,.s-weekly-grid strong{display:block;margin:3px 0 5px;color:#182326;font-size:16px;line-height:1.05;font-weight:900}
      .s-preview-pill,.s-weekly-grid em{display:inline-block;padding:3px 7px;border-radius:999px;font-size:9px;line-height:1.15;font-style:normal;font-weight:850;white-space:nowrap}
      .s-preview-pill.good,.s-weekly-grid em.good{color:${GOOD};background:#e8f7f5}.s-preview-pill.bad,.s-weekly-grid em.bad{color:${BAD};background:#fff0eb}.s-preview-pill.neutral,.s-weekly-grid em.neutral{color:${NEUTRAL};background:#f1f4f3}
      .s-this-week-foot,.s-weekly-foot{margin-top:8px;padding-top:7px;border-top:1px solid #edf2f0;color:#718084;font-size:8px}.s-weekly-foot{display:flex;justify-content:space-between;gap:8px}.s-weekly-foot strong{color:${GOOD}}
      .s-checkpoint-picker{position:relative;display:inline-block;margin-bottom:10px}.s-checkpoint-trigger{display:inline-flex;align-items:center;gap:12px;min-width:230px;padding:8px 12px;border:1px solid #cfe1dd;border-radius:12px;background:#f9fbfa;color:#182326;font:800 16px/1.15 system-ui,sans-serif;cursor:pointer;text-align:left}.s-checkpoint-trigger b{margin-left:auto;color:${GOOD}}
      .s-checkpoint-menu{position:absolute;z-index:30;top:calc(100% + 6px);left:0;min-width:100%;max-height:240px;overflow:auto;padding:5px;border:1px solid #cfe1dd;border-radius:12px;background:#fff;box-shadow:0 12px 30px rgba(24,35,38,.12)}.s-checkpoint-menu[hidden]{display:none}
      .s-checkpoint-option{display:block;width:100%;padding:8px 10px;border:0;border-radius:9px;background:transparent;color:#34484c;font:700 12px/1.25 system-ui,sans-serif;text-align:left;cursor:pointer;white-space:nowrap}.s-checkpoint-option:hover,.s-checkpoint-option.active{background:#eaf7f5;color:${GOOD}}
      .s-goal-section-head{margin:0 2px 10px}.s-goal-remaining-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .s-goal-remaining-card{padding:12px 13px;border:1px solid #e1e9e7;border-radius:13px;background:#fbfcfc;min-width:0}.s-goal-remaining-card.fat{border-color:#f3d6cf;background:#fffaf8}.s-goal-remaining-card.muscle{border-color:#d4e7ee;background:#f8fcfd}
      .s-goal-remaining-card small{display:block;color:#617579;font-size:10px;font-weight:850}.s-goal-remaining-card strong{display:block;margin-top:4px;color:#182326;font-size:20px;line-height:1.05;font-weight:950}.s-goal-remaining-card.fat strong{color:${BAD}}.s-goal-remaining-card.muscle strong{color:#2f86a2}.s-goal-remaining-card.done strong{color:${GOOD}}
      .s-goal-progress-track{height:7px;margin-top:10px;border-radius:999px;background:#e7efed;overflow:hidden}.s-goal-progress-fill{display:block;height:100%;border-radius:999px;background:#31b8b0}.s-goal-remaining-card.fat .s-goal-progress-fill{background:#ef7c67}.s-goal-remaining-card.muscle .s-goal-progress-fill{background:#3c94b0}
      .s-goal-progress-meta{display:flex;justify-content:space-between;gap:8px;margin-top:6px;color:#718084;font-size:8px;font-weight:700}.s-goal-progress-meta span:last-child{text-align:right}
      @media(max-width:650px){.s-this-week-grid,.s-weekly-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.s-goal-remaining-grid{grid-template-columns:1fr}.s-this-week-copy h2,.s-goal-section-head h2{font-size:15px}.s-checkpoint-trigger{min-width:0;max-width:100%;font-size:15px}.s-weekly-foot{display:block}.s-weekly-foot strong{display:block;margin-top:4px}}
    `;document.head.appendChild(s);
  }

  function renderCheckpoint(selected){
    const wrap=document.querySelector('#summary-app .summary-wrap'),header=wrap?.querySelector('.s-header');if(!wrap||!header)return false;
    const weeks=weekEnds();let card=wrap.querySelector('.s-weekly-checkpoint');
    if(!card){card=document.createElement('section');card.className='s-weekly-checkpoint';header.insertAdjacentElement('afterend',card);}
    if(!weeks.length){card.innerHTML='<div class="s-weekly-head"><p>WEEKLY PERFORMANCE</p><small class="s-weekly-purpose">ข้อมูลยังไม่พอสำหรับปิดสัปดาห์</small></div>';return true;}
    selected=weeks.includes(selected)?selected:(card.dataset.selectedWeek&&weeks.includes(card.dataset.selectedWeek)?card.dataset.selectedWeek:weeks[0]);card.dataset.selectedWeek=selected;
    const prev=iso(sh(dt(selected),-7)),c=weekRows(selected),p=weekRows(prev),A=(rows,k)=>avg(rows.map(x=>x[k]));
    const metrics=[['Weight avg','weight',true,'kg',false],['Fat avg','fat',true,'kg',false],['BF avg','bf',true,'%',true],['Muscle avg','muscle',false,'kg',false]];
    card.innerHTML=`<div class="s-weekly-head"><div class="s-checkpoint-picker"><p>WEEKLY PERFORMANCE</p><button type="button" class="s-checkpoint-trigger" aria-expanded="false"><span>${weekLabel(selected)}</span><b>⌄</b></button><div class="s-checkpoint-menu" hidden>${weeks.map(w=>`<button type="button" class="s-checkpoint-option${w===selected?' active':''}" data-week="${w}">${weekLabel(w)}</button>`).join('')}</div><small class="s-weekly-purpose">ผลสัปดาห์ที่ปิดแล้ว · เทียบกับสัปดาห์ก่อน</small></div></div><div class="s-weekly-grid">${metrics.map(([name,key,lower,unit,bf])=>{const cur=A(c,key),old=A(p,key);return`<div><small>${name}</small><strong>${f1(cur)}${unit==='%'?'%':' kg'}</strong>${deltaHtml(cur,old,lower,unit,bf)}</div>`;}).join('')}</div><div class="s-weekly-foot"><span>${c.length} ครั้งในสัปดาห์นี้</span><strong>${selected===weeks[0]?`Checkpoint ถัดไป ${sd(sh(dt(weeks[0]),7))}`:'กำลังดูย้อนหลัง'}</strong></div>`;
    const trigger=card.querySelector('.s-checkpoint-trigger'),menu=card.querySelector('.s-checkpoint-menu');
    trigger?.addEventListener('click',e=>{e.stopPropagation();const open=trigger.getAttribute('aria-expanded')==='true';trigger.setAttribute('aria-expanded',String(!open));menu.hidden=open;});
    card.querySelectorAll('.s-checkpoint-option').forEach(o=>o.addEventListener('click',e=>{e.stopPropagation();renderCheckpoint(o.dataset.week);}));
    return true;
  }

  function renderThisWeek(){
    const wrap=document.querySelector('#summary-app .summary-wrap'),checkpoint=wrap?.querySelector('.s-weekly-checkpoint');if(!wrap||!checkpoint)return false;
    const W=currentWeek(),P=latestClosedWeek(),A=(rows,k)=>avg(rows.map(x=>x[k]));
    const metrics=[['Weight avg','weight','kg',true,false],['Fat avg','fat','kg',true,false],['BF avg','bf','%',true,true],['Muscle avg','muscle','kg',false,false]];
    let section=wrap.querySelector('.s-this-week-preview');if(!section){section=document.createElement('section');section.className='s-this-week-preview';}
    section.innerHTML=`<div class="s-this-week-head"><div class="s-this-week-copy"><p>THIS WEEK · PREVIEW</p><h2>ค่าเฉลี่ยสัปดาห์นี้ · ${sd(W.start)}–${sd(latest.isoDate)}</h2><small>ยังไม่ปิดรอบ · เทียบ Weekly Performance ${sd(P.start)}–${sd(P.end)}</small></div><span class="s-this-week-badge">${W.left?`เหลืออีก ${W.left} วัน`:'ครบสัปดาห์แล้ว'}</span></div><div class="s-this-week-grid">${metrics.map(([name,key,unit,lower,bf])=>{const cur=A(W.current,key),old=A(P.rows,key);return`<div class="s-this-week-metric"><small>${name}</small><strong>${f1(cur)}${unit==='%'?'%':' kg'}</strong>${deltaHtml(cur,old,lower,unit,bf)}</div>`;}).join('')}</div><div class="s-this-week-foot">Preview ใช้ดูทิศทางระหว่างสัปดาห์ · การตัดสินใจหลักใช้ Weekly Performance หลังปิดวันอาทิตย์</div>`;
    checkpoint.insertAdjacentElement('beforebegin',section);return true;
  }

  function renderGoal(){
    const wrap=document.querySelector('#summary-app .summary-wrap'),checkpoint=wrap?.querySelector('.s-weekly-checkpoint');if(!wrap||!checkpoint)return false;
    const P=latestClosedWeek(),A=k=>avg(P.rows.map(x=>x[k]));
    const cfg=[
      {key:'weight',name:'น้ำหนัก',target:Number.isFinite(+S.WEIGHT_TARGET)?+S.WEIGHT_TARGET:73.7,mode:'lower',cls:'weight'},
      {key:'fat',name:'ไขมัน',target:+S.TARGET,mode:'lower',cls:'fat'},
      {key:'muscle',name:'กล้ามเนื้อ',target:+S.MUSCLE_TARGET,mode:'higher',cls:'muscle'}
    ];
    let section=wrap.querySelector('.s-goal-progress-section');if(!section){section=document.createElement('section');section.className='s-goal-progress-section';}
    section.innerHTML=`<div class="s-goal-section-head"><p>GOAL PROGRESS</p><h2>เหลืออีกเท่าไรถึงเป้าหมาย</h2><small>อิงค่าเฉลี่ย Weekly Performance ที่ปิดแล้ว</small></div><div class="s-goal-remaining-grid">${cfg.map(x=>{
      const cur=A(x.key),remain=x.mode==='lower'?cur-x.target:x.target-cur,done=Number.isFinite(remain)&&remain<=.05,series=weeklySeries(x.key),start=series[0]?.value;
      let progress=0;if(Number.isFinite(start)&&Number.isFinite(cur)&&Number.isFinite(x.target)&&start!==x.target){const raw=x.mode==='lower'?(start-cur)/(start-x.target):(cur-start)/(x.target-start);progress=Math.max(0,Math.min(1,raw));}
      const action=done?'ถึงเป้าแล้ว':x.mode==='lower'?'ลดอีก':'เพิ่มอีก',value=done?'✓':Number.isFinite(remain)?`${f1(Math.max(0,remain))} kg`:'—';
      return`<div class="s-goal-remaining-card ${x.cls}${done?' done':''}"><small>${x.name}</small><strong>${action} ${value}</strong><div class="s-goal-progress-track"><i class="s-goal-progress-fill" style="width:${(progress*100).toFixed(0)}%"></i></div><div class="s-goal-progress-meta"><span>ไปแล้ว ${(progress*100).toFixed(0)}%</span><span>${etaText(x.key,Math.max(0,remain),x.mode)}</span></div></div>`;
    }).join('')}</div>`;
    checkpoint.insertAdjacentElement('afterend',section);return true;
  }

  function apply(){addStyle();updateHeader();renderCheckpoint();renderThisWeek();renderGoal();}
  function start(){[80,300,800].forEach(ms=>setTimeout(apply,ms));document.addEventListener('click',e=>{if(!e.target.closest?.('.s-checkpoint-picker')){const menu=document.querySelector('.s-checkpoint-menu'),trigger=document.querySelector('.s-checkpoint-trigger');if(menu)menu.hidden=true;if(trigger)trigger.setAttribute('aria-expanded','false');}});}
  window.__JACKY_LAYOUT_OWNS_WEEKLY__=true;
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();