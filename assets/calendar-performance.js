(() => {
  const S = window.__JACKY_TRACKER__;
  if (!S?.DATA?.length || !window.Chart) return;

  const D = S.DATA.filter(x => x?.isoDate).slice().sort((a,b) => String(a.measuredAt || a.isoDate).localeCompare(String(b.measuredAt || b.isoDate)));
  const latest = D.at(-1), MS = 864e5;
  const M = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const GOOD = '#147d7a', BAD = '#c26453', NEUTRAL = '#718084', TARGET_GAP = 2;
  const dt = s => new Date(`${s}T00:00:00Z`);
  const iso = d => d.toISOString().slice(0,10);
  const sh = (d,n) => new Date(d.getTime()+n*MS);
  const avg = a => { const n=a.map(Number).filter(Number.isFinite); return n.length?n.reduce((s,x)=>s+x,0)/n.length:null; };
  const fmt = (v,d=1) => Number.isFinite(+v)?(+v).toFixed(d):'—';
  const sd = v => { const d=typeof v==='string'?dt(v):v; return Number.isNaN(d.getTime())?'—':`${d.getUTCDate()} ${M[d.getUTCMonth()]}`; };
  const rowsBetween = (a,b) => D.filter(r=>r.isoDate>=iso(a)&&r.isoDate<=iso(b));
  const daysInMonth = (y,m) => new Date(Date.UTC(y,m+1,0)).getUTCDate();
  const addMonths = (d,n) => {
    const first=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+n,1));
    const last=daysInMonth(first.getUTCFullYear(),first.getUTCMonth());
    return new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),Math.min(d.getUTCDate(),last)));
  };
  const startWeek = d => sh(d,-(d.getUTCDay()===0?6:d.getUTCDay()-1));
  const startMonth = d => new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1));
  const startYear = d => new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const monthKey = d => `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
  const latestMonthKey = latest.isoDate.slice(0,7);

  function meta(c,p,lowerBetter){
    if(!Number.isFinite(c)||!Number.isFinite(p)) return {delta:null,pct:null,arrow:'→',cls:'neutral'};
    const delta=c-p,pct=p?delta/p*100:null,arrow=delta>0?'↑':delta<0?'↓':'→';
    const good=lowerBetter?delta<0:delta>0,bad=lowerBetter?delta>0:delta<0;
    return {delta,pct,arrow,cls:Math.abs(delta)<1e-9?'neutral':good?'good':bad?'bad':'neutral'};
  }

  function addStyle(){
    if(document.getElementById('jacky-calendar-performance-style')) return;
    const s=document.createElement('style'); s.id='jacky-calendar-performance-style';
    s.textContent=`
      .s-period-compare{margin:10px 0 12px;padding:10px 12px;border:1px solid #e0e9e7;border-radius:14px;background:#fbfcfc}
      .s-period-compare-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:8px}
      .s-period-compare-head strong{color:#182326;font-size:12px;font-weight:900}.s-period-compare-head span{color:#718084;font-size:9px;text-align:right}
      .s-period-compare-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
      .s-period-metric{min-width:0;padding:8px 9px;border:1px solid #edf2f0;border-radius:11px;background:#fff}
      .s-period-metric small{display:block;color:#617579;font-size:9px;font-weight:850}.s-period-metric b{display:block;margin:3px 0 5px;color:#182326;font-size:14px;line-height:1.05}
      .s-delta-pill,.jacky-delta-pill{display:inline-block!important;width:max-content;max-width:100%;padding:3px 7px!important;border-radius:999px!important;font-size:9px!important;line-height:1.15!important;font-weight:850!important;white-space:nowrap}
      .s-delta-pill.good,.jacky-delta-pill.jacky-good{color:${GOOD}!important;background:#e8f7f5!important}
      .s-delta-pill.bad,.jacky-delta-pill.jacky-bad{color:${BAD}!important;background:#fff0eb!important}
      .s-delta-pill.neutral,.jacky-delta-pill.jacky-neutral{color:${NEUTRAL}!important;background:#f1f4f3!important}
      .s-chart-empty{display:flex;min-height:190px;align-items:center;justify-content:center;padding:16px;text-align:center;color:#718084;font-size:11px;line-height:1.5}
      .s-chart-empty strong{display:block;margin-bottom:3px;color:#34484c;font-size:12px}
      @media(max-width:650px){.s-period-compare-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.s-period-compare-head{align-items:flex-start;flex-direction:column;gap:2px}.s-period-compare-head span{text-align:left}.s-chart-empty{min-height:150px}}
    `;
    document.head.appendChild(s);
  }

  function selectedRange(){ return +document.querySelector('#summary-app .s-range-controls button[aria-pressed="true"]')?.dataset.range || 7; }
  function labelFor(r){ if(r===1)return'ครั้งก่อน'; if(r===7)return'สัปดาห์'; if(r===30)return'เดือนนี้'; if(r>=150&&r<350)return'6 เดือน'; if(r>=350&&r<1000)return'ปีนี้'; return'ตั้งแต่เริ่ม'; }
  function renameRangeLabels(){
    const root=document.querySelector('#summary-app'); if(!root)return;
    root.querySelectorAll('.s-range-controls button').forEach(b=>{const r=+b.dataset.range;if(Number.isFinite(r))b.textContent=labelFor(r);});
    const map={'1 วัน':'ครั้งก่อน','7 วัน':'สัปดาห์','สัปดาห์นี้':'สัปดาห์','30 วัน':'เดือนนี้','1 ปี':'ปีนี้'};
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
    while(w.nextNode()){const t=w.currentNode.nodeValue?.trim();if(map[t])nodes.push([w.currentNode,map[t]]);}
    nodes.forEach(([n,v])=>n.nodeValue=n.nodeValue.replace(n.nodeValue.trim(),v));
  }

  function monthBuckets(rows=D){
    const g=new Map();
    rows.forEach(r=>{const k=r.isoDate.slice(0,7);if(!g.has(k))g.set(k,[]);g.get(k).push(r);});
    return [...g.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([key,rows])=>{
      const [y,m]=key.split('-').map(Number);
      return {key,rows,year:y,month:m-1,isMTD:key===latestMonthKey,label:`${M[m-1]} ${y}${key===latestMonthKey?' MTD':''}`};
    });
  }

  function periodFor(r){
    const ld=dt(latest.isoDate);
    if(r===1){
      const pair=D.slice(-2);
      return {mode:'pair',current:pair.slice(-1),previous:pair.slice(0,1),title:'ผลล่าสุดเทียบครั้งก่อน',compare:'ผลวัดครั้งก่อน → ผลล่าสุด',chartKind:'pair',chartRows:pair};
    }
    if(r===7){
      const ce=sh(startWeek(ld),-1),cs=sh(ce,-6),pe=sh(ce,-7),ps=sh(pe,-6);
      return {mode:'avg',current:rowsBetween(cs,ce),previous:rowsBetween(ps,pe),title:'ค่าเฉลี่ยรายสัปดาห์',compare:`${sd(cs)}–${sd(ce)} เทียบ ${sd(ps)}–${sd(pe)}`,chartKind:'weekCompare',bounds:{cs,ce,ps,pe}};
    }
    if(r===30){
      const cs=startMonth(ld),ce=ld,ps=addMonths(cs,-1),pe=addMonths(ce,-1);
      return {mode:'avg',current:rowsBetween(cs,ce),previous:rowsBetween(ps,pe),title:`เดือนนี้ · ${sd(cs)}–${sd(ce)}`,compare:`เทียบ ${sd(ps)}–${sd(pe)}`,chartKind:'monthCompare',bounds:{cs,ce,ps,pe}};
    }
    if(r>=150&&r<350){
      const cs=addMonths(startMonth(ld),-5),ce=ld,ps=addMonths(cs,-6),pe=addMonths(ce,-6);
      return {mode:'avg',current:rowsBetween(cs,ce),previous:rowsBetween(ps,pe),title:`6 เดือน · ${sd(cs)}–${sd(ce)}`,compare:`เทียบ ${sd(ps)}–${sd(pe)}`,chartKind:'monthly',chartRows:rowsBetween(cs,ce)};
    }
    if(r>=350&&r<1000){
      const cs=startYear(ld),ce=ld,ps=new Date(Date.UTC(ld.getUTCFullYear()-1,0,1)),pe=new Date(Date.UTC(ld.getUTCFullYear()-1,ld.getUTCMonth(),Math.min(ld.getUTCDate(),daysInMonth(ld.getUTCFullYear()-1,ld.getUTCMonth()))));
      return {mode:'avg',current:rowsBetween(cs,ce),previous:rowsBetween(ps,pe),title:`ปีนี้ · 1 ม.ค.–${sd(ce)}`,compare:`เทียบ 1 ม.ค.–${sd(pe)} ${pe.getUTCFullYear()}`,chartKind:'monthly',chartRows:rowsBetween(cs,ce)};
    }

    const months=monthBuckets(D),closed=months.filter(x=>x.key<latestMonthKey);
    const first=months[0],lastClosed=closed.at(-1);
    const current=lastClosed?.rows||[],previous=first&&lastClosed&&first.key!==lastClosed.key?first.rows:[];
    return {
      mode:'avg',current,previous,title:'ตั้งแต่เริ่ม · ค่าเฉลี่ยรายเดือน',
      compare:first&&lastClosed?`${first.label.replace(' MTD','')} → ${lastClosed.label.replace(' MTD','')}`:'ข้อมูลรายเดือนยังไม่พอ',
      chartKind:'monthly',chartRows:D,sinceStart:true
    };
  }

  const values=(P,key)=>P.mode==='avg'?[avg(P.current.map(x=>x[key])),avg(P.previous.map(x=>x[key]))]:[+P.current.at(-1)?.[key],+P.previous.at(-1)?.[key]];
  function deltaHtml(m,unit,dec=2,bf=false){
    if(m.delta==null)return '<span class="s-delta-pill neutral">ข้อมูลไม่พอ</span>';
    const primary=bf?`${Math.abs(m.delta).toFixed(dec)} จุด`:`${Math.abs(m.delta).toFixed(dec)}${unit}`;
    const rel=Number.isFinite(m.pct)?` · ${Math.abs(m.pct).toFixed(1)}%`:'';
    return `<span class="s-delta-pill ${m.cls}">${m.arrow} ${primary}${rel}</span>`;
  }

  function renderPeriodSummary(){
    const controls=document.querySelector('#summary-app .s-range-controls'); if(!controls)return false;
    const P=periodFor(selectedRange());
    let box=controls.parentElement?.querySelector(':scope > .s-period-compare');
    if(!box){box=document.createElement('div');box.className='s-period-compare';controls.insertAdjacentElement('afterend',box);}
    const cfg=[['weight','Weight',true,' kg',2,false],['fat','Fat',true,' kg',2,false],['bf','BF',true,'%',2,true],['muscle','Muscle',false,' kg',2,false]];
    box.innerHTML=`<div class="s-period-compare-head"><strong>${P.title}</strong><span>${P.compare}</span></div><div class="s-period-compare-grid">${cfg.map(([key,name,lower,unit,dec,bf])=>{const[c,p]=values(P,key),m=meta(c,p,lower),suffix=key==='bf'?'%':' kg';return `<div class="s-period-metric"><small>${name}${P.mode==='avg'?' avg':''}</small><b>${fmt(c,1)}${suffix}</b>${deltaHtml(m,unit,dec,bf)}</div>`;}).join('')}</div>`;
    return true;
  }

  function markExistingPills(){
    document.querySelectorAll('#summary-app .jacky-good,#summary-app .jacky-bad,#summary-app .jacky-neutral').forEach(el=>{const t=el.textContent?.trim()||'';if(/^[↑↓→]/.test(t)||/^\([+−-]/.test(t))el.classList.add('jacky-delta-pill');});
  }

  function monthlySeries(rows,key){
    return monthBuckets(rows).map(b=>({label:b.label,y:avg(b.rows.map(x=>x[key])),isMTD:b.isMTD})).filter(p=>Number.isFinite(p.y));
  }

  function seriesFor(P,key){
    if(P.chartKind==='pair') return P.chartRows.filter(x=>Number.isFinite(+x[key])).map(x=>({label:sd(x.isoDate),y:+x[key]}));
    if(P.chartKind==='weekCompare'){
      const {cs,ce,ps,pe}=P.bounds;
      return [
        {label:`${sd(ps)}–${sd(pe)}`,y:avg(P.previous.map(x=>x[key]))},
        {label:`${sd(cs)}–${sd(ce)}`,y:avg(P.current.map(x=>x[key]))}
      ].filter(p=>Number.isFinite(p.y));
    }
    if(P.chartKind==='monthCompare'){
      const {cs,ce,ps,pe}=P.bounds;
      return [
        {label:`${sd(ps)}–${sd(pe)}`,y:avg(P.previous.map(x=>x[key]))},
        {label:`${sd(cs)}–${sd(ce)}`,y:avg(P.current.map(x=>x[key])),isMTD:true}
      ].filter(p=>Number.isFinite(p.y));
    }
    return monthlySeries(P.chartRows,key);
  }

  function readout(canvas){
    const host=canvas.closest('.s-chart-card')||canvas.parentElement?.parentElement;if(!host)return null;
    let el=host.querySelector('.s-chart-hover-readout');
    if(!el){el=document.createElement('div');el.className='s-chart-hover-readout';canvas.parentElement?.insertAdjacentElement('beforebegin',el);}
    return el;
  }

  function emptyState(canvas,count,unitLabel){
    const host=canvas.parentElement;if(!host)return null;
    let el=host.querySelector(':scope > .s-chart-empty');
    if(!el){el=document.createElement('div');el.className='s-chart-empty';host.appendChild(el);}
    el.innerHTML=`<div><strong>ข้อมูลยังไม่พอสำหรับดูแนวโน้ม</strong>มีค่าเฉลี่ย ${count} ${unitLabel} · ต้องมีอย่างน้อย 2 ช่วงเวลา</div>`;
    return el;
  }

  function patchChart(id,key,target,r,P){
    const canvas=document.getElementById(id),c=canvas&&Chart.getChart?.(canvas);if(!c)return false;
    const series=seriesFor(P,key);
    const unitLabel=P.chartKind==='monthly'?'เดือน':P.chartKind==='weekCompare'?'สัปดาห์':'ช่วง';
    const empty=emptyState(canvas,series.length,unitLabel);
    if(series.length<2){canvas.style.display='none';if(empty)empty.hidden=false;const ro=readout(canvas);if(ro)ro.textContent='';return true;}
    canvas.style.display='';if(empty)empty.hidden=true;

    const color=key==='fat'?'#ef7c67':'#2bb9b3',cur=series.at(-1)?.y,goal=+target;
    const showTarget=Number.isFinite(cur)&&Number.isFinite(goal)&&Math.abs(cur-goal)<=TARGET_GAP;
    const main={label:P.chartKind==='pair'?'ค่าที่วัดจริง':P.chartKind==='monthly'?'ค่าเฉลี่ยรายเดือน':'ค่าเฉลี่ย',data:series.map(p=>p.y),borderColor:color,backgroundColor:key==='fat'?'rgba(239,124,103,.10)':'rgba(43,185,179,.10)',borderWidth:2.5,pointRadius:4,pointHoverRadius:6,tension:P.chartKind==='pair'?0:.2,fill:true};
    const ds=[main];
    if(showTarget)ds.push({label:'เป้าหมาย',data:series.map(()=>goal),borderColor:'#8a9899',borderDash:[4,4],borderWidth:1.1,pointRadius:0,fill:false});

    c.data.labels=series.map(p=>p.label);
    c.data.datasets=ds;
    c.options.plugins=c.options.plugins||{};
    c.options.plugins.tooltip={...(c.options.plugins.tooltip||{}),enabled:false};
    if(c.options.plugins.annotation)delete c.options.plugins.annotation;
    c.options.interaction={mode:'nearest',intersect:false,axis:'xy'};
    c.options.scales.x.type='category';
    c.options.scales.x.min=undefined;c.options.scales.x.max=undefined;
    c.options.scales.x.ticks=c.options.scales.x.ticks||{};
    c.options.scales.x.ticks.maxTicksLimit=P.chartKind==='monthly'?7:4;

    const vals=ds.filter(d=>d.label!=='เป้าหมาย').flatMap(d=>d.data).map(Number).filter(Number.isFinite);if(showTarget)vals.push(goal);
    if(vals.length){const mn=Math.min(...vals),mx=Math.max(...vals),span=Math.max(mx-mn,key==='fat'?.4:.5),pad=Math.max(key==='fat'?.15:.2,span*.18),mid=(mn+mx)/2,half=span/2+pad;c.options.scales.y.beginAtZero=false;c.options.scales.y.min=Math.floor((mid-half)*10)/10;c.options.scales.y.max=Math.ceil((mid+half)*10)/10;delete c.options.scales.y.suggestedMin;delete c.options.scales.y.suggestedMax;}

    const ro=readout(canvas),widths=ds.map(d=>d.borderWidth||1);c.$calendarHover=null;
    c.options.onHover=(_e,a)=>{
      const h=a?.[0];
      if(!h){if(ro)ro.textContent='';if(c.$calendarHover!==null){c.data.datasets.forEach((d,i)=>d.borderWidth=widths[i]);c.$calendarHover=null;c.update('none');}return;}
      const idx=h.datasetIndex,point=h.index,dataset=c.data.datasets[idx],val=+dataset.data[point],label=series[point]?.label||'';
      if(ro)ro.textContent=`${label}${label?' · ':''}${dataset.label} ${Number.isFinite(val)?val.toFixed(1):'—'} kg`;
      if(c.$calendarHover!==idx){c.data.datasets.forEach((d,i)=>d.borderWidth=i===idx?Math.max(3.5,widths[i]):.8);c.$calendarHover=idx;c.update('none');}
    };
    c.update('none');return true;
  }

  function patchCharts(){
    const r=selectedRange(),P=periodFor(r);
    const a=patchChart('s-fat-chart','fat',S.TARGET,r,P),b=patchChart('s-muscle-chart','muscle',S.MUSCLE_TARGET,r,P);
    const note=document.getElementById('s-range-note');
    if(note){
      note.textContent=r===1?'ผลครั้งก่อน → ผลล่าสุด':r===7?'จุด = ค่าเฉลี่ยสัปดาห์ก่อน / สัปดาห์ล่าสุด':r===30?'จุด = ค่าเฉลี่ยช่วงวันเดียวกันของเดือนก่อน / เดือนนี้':r>=150&&r<350?'จุด = ค่าเฉลี่ยรายเดือนในช่วง 6 เดือน · เดือนปัจจุบันเป็น MTD':r>=350&&r<1000?'จุด = ค่าเฉลี่ยรายเดือนของปีนี้ · เดือนปัจจุบันเป็น MTD':'จุด = ค่าเฉลี่ยรายเดือนตั้งแต่เริ่ม · เดือนปัจจุบันเป็น MTD';
    }
    return a&&b;
  }

  function apply(){addStyle();renameRangeLabels();renderPeriodSummary();patchCharts();setTimeout(markExistingPills,30);}
  function start(){[220,650,1300].forEach(ms=>setTimeout(apply,ms));document.addEventListener('click',e=>{if(e.target.closest?.('#summary-app .s-range-controls button'))[180,380].forEach(ms=>setTimeout(apply,ms));});}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();