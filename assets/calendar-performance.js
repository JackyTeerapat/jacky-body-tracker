(() => {
  const S = window.__JACKY_TRACKER__;
  if (!S?.DATA?.length || !window.Chart) return;

  const D = S.DATA
    .filter(x => x?.isoDate)
    .slice()
    .sort((a,b) => String(a.measuredAt || a.isoDate).localeCompare(String(b.measuredAt || b.isoDate)));
  const latest = D.at(-1);
  const MS = 864e5;
  const M = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const GOOD = '#147d7a', BAD = '#c26453', NEUTRAL = '#718084', TARGET_GAP = 2;
  const chartById = new Map();
  let activeRange = 1;

  const dt = s => new Date(`${s}T00:00:00Z`);
  const sh = (d,n) => new Date(d.getTime()+n*MS);
  const iso = d => d.toISOString().slice(0,10);
  const avg = a => {
    const n=a.map(Number).filter(Number.isFinite);
    return n.length ? n.reduce((s,x)=>s+x,0)/n.length : null;
  };
  const fmt = (v,d=1) => Number.isFinite(+v) ? (+v).toFixed(d) : '—';
  const sd = v => {
    const d=typeof v==='string' ? dt(v) : v;
    return Number.isNaN(d.getTime()) ? '—' : `${d.getUTCDate()} ${M[d.getUTCMonth()]}`;
  };
  const daysInMonth = (y,m) => new Date(Date.UTC(y,m+1,0)).getUTCDate();
  const addMonths = (d,n) => {
    const first=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+n,1));
    const last=daysInMonth(first.getUTCFullYear(),first.getUTCMonth());
    return new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),Math.min(d.getUTCDate(),last)));
  };
  const startWeek = d => sh(d,-(d.getUTCDay()===0 ? 6 : d.getUTCDay()-1));
  const startMonth = d => new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1));
  const startYear = d => new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const rowsBetween = (a,b) => D.filter(r => r.isoDate>=iso(a) && r.isoDate<=iso(b));

  const latestMonthKey = latest.isoDate.slice(0,7);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  const latestMonthIsOpen = latestMonthKey===todayKey;

  function rangeLabel(a,b){
    const ay=a.getUTCFullYear(), by=b.getUTCFullYear();
    return ay===by ? `${sd(a)}–${sd(b)} ${by}` : `${sd(a)} ${ay}–${sd(b)} ${by}`;
  }

  function meta(c,p,lowerBetter){
    if(!Number.isFinite(c)||!Number.isFinite(p)) return {delta:null,pct:null,arrow:'→',cls:'neutral'};
    const delta=c-p, pct=p ? delta/p*100 : null;
    const good=lowerBetter ? delta<0 : delta>0;
    const bad=lowerBetter ? delta>0 : delta<0;
    return {
      delta,pct,
      arrow:delta>0?'↑':delta<0?'↓':'→',
      cls:Math.abs(delta)<1e-9?'neutral':good?'good':bad?'bad':'neutral'
    };
  }

  function addStyle(){
    if(document.getElementById('jacky-calendar-performance-style')) return;
    const s=document.createElement('style');
    s.id='jacky-calendar-performance-style';
    s.textContent=`
      .s-period-compare{margin:10px 0 12px;padding:10px 12px;border:1px solid #e0e9e7;border-radius:14px;background:#fbfcfc}
      .s-period-compare-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:8px}
      .s-period-compare-head strong{color:#182326;font-size:12px;font-weight:900}
      .s-period-compare-head span{color:#718084;font-size:9px;text-align:right}
      .s-period-compare-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
      .s-period-metric{min-width:0;padding:8px 9px;border:1px solid #edf2f0;border-radius:11px;background:#fff}
      .s-period-metric small{display:block;color:#617579;font-size:9px;font-weight:850}
      .s-period-metric b{display:block;margin:3px 0 5px;color:#182326;font-size:14px;line-height:1.05}
      .s-delta-pill{display:inline-block;width:max-content;max-width:100%;padding:3px 7px;border-radius:999px;font-size:9px;line-height:1.15;font-weight:850;white-space:nowrap}
      .s-delta-pill.good{color:${GOOD};background:#e8f7f5}.s-delta-pill.bad{color:${BAD};background:#fff0eb}.s-delta-pill.neutral{color:${NEUTRAL};background:#f1f4f3}
      .s-chart-empty{display:flex;min-height:190px;align-items:center;justify-content:center;padding:16px;text-align:center;color:#718084;font-size:11px;line-height:1.5}
      .s-chart-empty strong{display:block;margin-bottom:3px;color:#34484c;font-size:12px}
      .s-chart-hover-readout{height:18px;margin:0 0 2px;text-align:right;color:#617579;font-size:10px;font-weight:700;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      @media(max-width:650px){
        .s-period-compare-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        .s-period-compare-head{align-items:flex-start;flex-direction:column;gap:2px}.s-period-compare-head span{text-align:left}
        .s-chart-empty{min-height:150px}
      }
    `;
    document.head.appendChild(s);
  }

  function labelFor(r){
    if(r===1) return 'ครั้งก่อน';
    if(r===7) return 'สัปดาห์';
    if(r===30) return 'เดือนนี้';
    if(r>=150 && r<350) return '6 เดือน';
    if(r>=350 && r<1000) return 'ปีนี้';
    return 'ตั้งแต่เริ่ม';
  }

  function controls(){ return document.querySelector('#summary-app .s-range-controls'); }

  function setRange(r){
    activeRange=Number.isFinite(+r) ? +r : 1;
    const root=controls();
    if(!root) return;
    root.querySelectorAll('button[data-range]').forEach(b=>{
      const on=+b.dataset.range===activeRange;
      b.setAttribute('aria-pressed',String(on));
      b.textContent=labelFor(+b.dataset.range);
    });
  }

  function monthBuckets(rows=D){
    const g=new Map();
    rows.forEach(r=>{
      const key=r.isoDate.slice(0,7);
      if(!g.has(key)) g.set(key,[]);
      g.get(key).push(r);
    });
    return [...g.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([key,rows])=>{
      const [y,m]=key.split('-').map(Number);
      const isMTD=key===latestMonthKey && latestMonthIsOpen;
      return {key,rows,isMTD,label:`${M[m-1]} ${y}${isMTD?' MTD':''}`};
    });
  }

  function monthlyMean(rows,key){
    return avg(monthBuckets(rows).map(b=>avg(b.rows.map(x=>x[key]))).filter(Number.isFinite));
  }

  function periodFor(r){
    const ld=dt(latest.isoDate);
    if(r===1){
      const pair=D.slice(-2);
      return {
        mode:'pair',aggregate:'raw',current:pair.slice(-1),previous:pair.slice(0,1),
        title:'ผลล่าสุดเทียบครั้งก่อน',
        compare:pair.length===2?`${sd(pair[0].isoDate)} → ${sd(pair[1].isoDate)}`:'ข้อมูลยังไม่พอ',
        chartKind:'pair',chartRows:pair
      };
    }
    if(r===7){
      const ce=sh(startWeek(ld),-1), cs=sh(ce,-6), pe=sh(ce,-7), ps=sh(pe,-6);
      return {
        mode:'avg',aggregate:'raw',current:rowsBetween(cs,ce),previous:rowsBetween(ps,pe),
        title:'ค่าเฉลี่ยรายสัปดาห์',compare:`${rangeLabel(cs,ce)} เทียบกับ ${rangeLabel(ps,pe)}`,
        chartKind:'weekCompare',bounds:{cs,ce,ps,pe}
      };
    }
    if(r===30){
      const cs=startMonth(ld), ce=ld, ps=addMonths(cs,-1), pe=addMonths(ce,-1);
      return {
        mode:'avg',aggregate:'raw',current:rowsBetween(cs,ce),previous:rowsBetween(ps,pe),
        title:'ค่าเฉลี่ยเดือนนี้',compare:`${rangeLabel(cs,ce)} เทียบกับ ${rangeLabel(ps,pe)}`,
        chartKind:'monthCompare',bounds:{cs,ce,ps,pe}
      };
    }
    if(r>=150 && r<350){
      const cs=addMonths(startMonth(ld),-5), ce=ld, ps=addMonths(cs,-6), pe=addMonths(ce,-6);
      return {
        mode:'avg',aggregate:'monthlyMean',current:rowsBetween(cs,ce),previous:rowsBetween(ps,pe),
        title:'ค่าเฉลี่ย 6 เดือน',compare:`${rangeLabel(cs,ce)} เทียบกับ ${rangeLabel(ps,pe)}`,
        chartKind:'monthly',chartRows:rowsBetween(cs,ce)
      };
    }
    if(r>=350 && r<1000){
      const cs=startYear(ld), ce=ld;
      const ps=new Date(Date.UTC(ld.getUTCFullYear()-1,0,1));
      const pe=new Date(Date.UTC(ld.getUTCFullYear()-1,ld.getUTCMonth(),Math.min(ld.getUTCDate(),daysInMonth(ld.getUTCFullYear()-1,ld.getUTCMonth()))));
      return {
        mode:'avg',aggregate:'monthlyMean',current:rowsBetween(cs,ce),previous:rowsBetween(ps,pe),
        title:'ค่าเฉลี่ยปีนี้',compare:`${rangeLabel(cs,ce)} เทียบกับ ${rangeLabel(ps,pe)}`,
        chartKind:'monthly',chartRows:rowsBetween(cs,ce)
      };
    }

    const months=monthBuckets(D);
    const closed=months.filter(x=>!x.isMTD);
    const first=months[0], lastClosed=closed.at(-1);
    return {
      mode:'avg',aggregate:'raw',current:lastClosed?.rows||[],
      previous:first&&lastClosed&&first.key!==lastClosed.key?first.rows:[],
      title:'ตั้งแต่เริ่ม · ค่าเฉลี่ยรายเดือน',
      compare:first&&lastClosed&&first.key!==lastClosed.key?`${first.label.replace(' MTD','')} → ${lastClosed.label.replace(' MTD','')}`:'ข้อมูลรายเดือนยังไม่พอ',
      chartKind:'monthly',chartRows:D,sinceStart:true
    };
  }

  function values(P,key){
    if(P.mode!=='avg') return [+P.current.at(-1)?.[key],+P.previous.at(-1)?.[key]];
    if(P.aggregate==='monthlyMean') return [monthlyMean(P.current,key),monthlyMean(P.previous,key)];
    return [avg(P.current.map(x=>x[key])),avg(P.previous.map(x=>x[key]))];
  }

  function deltaHtml(m,unit,bf=false){
    if(m.delta==null) return '<span class="s-delta-pill neutral">ข้อมูลไม่พอ</span>';
    const primary=bf?`${Math.abs(m.delta).toFixed(2)} จุด`:`${Math.abs(m.delta).toFixed(2)}${unit}`;
    const rel=Number.isFinite(m.pct)?` · ${Math.abs(m.pct).toFixed(1)}%`:'';
    return `<span class="s-delta-pill ${m.cls}">${m.arrow} ${primary}${rel}</span>`;
  }

  function renderSummary(){
    const root=controls();
    if(!root) return false;
    const P=periodFor(activeRange);
    let box=root.parentElement?.querySelector(':scope > .s-period-compare');
    if(!box){ box=document.createElement('div'); box.className='s-period-compare'; root.insertAdjacentElement('afterend',box); }
    const cfg=[['weight','Weight',true,' kg',false],['fat','Fat',true,' kg',false],['bf','BF',true,'%',true],['muscle','Muscle',false,' kg',false]];
    box.innerHTML=`<div class="s-period-compare-head"><strong>${P.title}</strong><span>${P.compare}</span></div><div class="s-period-compare-grid">${cfg.map(([key,name,lower,unit,bf])=>{
      const [c,p]=values(P,key), m=meta(c,p,lower), suffix=key==='bf'?'%':' kg';
      return `<div class="s-period-metric"><small>${name}${P.mode==='avg'?' avg':''}</small><b>${fmt(c,1)}${suffix}</b>${deltaHtml(m,unit,bf)}</div>`;
    }).join('')}</div>`;
    return true;
  }

  function monthlySeries(rows,key){
    return monthBuckets(rows).map(b=>({label:b.label,y:avg(b.rows.map(x=>x[key])),isMTD:b.isMTD})).filter(x=>Number.isFinite(x.y));
  }

  function seriesFor(P,key){
    if(P.chartKind==='pair') return P.chartRows.filter(x=>Number.isFinite(+x[key])).map(x=>({label:sd(x.isoDate),y:+x[key]}));
    if(P.chartKind==='weekCompare'){
      const {cs,ce,ps,pe}=P.bounds;
      return [
        {label:rangeLabel(ps,pe),y:avg(P.previous.map(x=>x[key]))},
        {label:rangeLabel(cs,ce),y:avg(P.current.map(x=>x[key]))}
      ].filter(x=>Number.isFinite(x.y));
    }
    if(P.chartKind==='monthCompare'){
      const {cs,ce,ps,pe}=P.bounds;
      return [
        {label:rangeLabel(ps,pe),y:avg(P.previous.map(x=>x[key]))},
        {label:rangeLabel(cs,ce),y:avg(P.current.map(x=>x[key])),isMTD:latestMonthIsOpen}
      ].filter(x=>Number.isFinite(x.y));
    }
    return monthlySeries(P.chartRows,key);
  }

  function readout(canvas){
    const host=canvas.closest('.s-chart-card')||canvas.parentElement?.parentElement;
    if(!host) return null;
    let el=host.querySelector('.s-chart-hover-readout');
    if(!el){ el=document.createElement('div'); el.className='s-chart-hover-readout'; canvas.parentElement?.insertAdjacentElement('beforebegin',el); }
    return el;
  }

  function emptyState(canvas,count,unitLabel){
    const host=canvas.parentElement;
    if(!host) return null;
    let el=host.querySelector(':scope > .s-chart-empty');
    if(!el){ el=document.createElement('div'); el.className='s-chart-empty'; host.appendChild(el); }
    el.innerHTML=`<div><strong>ข้อมูลยังไม่พอสำหรับดูแนวโน้ม</strong>มีค่าเฉลี่ย ${count} ${unitLabel} · ต้องมีอย่างน้อย 2 ช่วงเวลา</div>`;
    return el;
  }

  function destroyChart(id,canvas){
    const ours=chartById.get(id);
    if(ours){ try{ours.destroy();}catch{} chartById.delete(id); }
    const existing=Chart.getChart?.(canvas);
    if(existing){ try{existing.destroy();}catch{} }
  }

  function renderChart(id,key,target,P){
    const canvas=document.getElementById(id);
    if(!canvas) return false;
    const series=seriesFor(P,key);
    const unitLabel=P.chartKind==='monthly'?'เดือน':P.chartKind==='weekCompare'?'สัปดาห์':'ช่วง';
    const empty=emptyState(canvas,series.length,unitLabel);
    destroyChart(id,canvas);

    if(series.length<2){
      canvas.style.display='none';
      if(empty) empty.hidden=false;
      const ro=readout(canvas); if(ro) ro.textContent='';
      return true;
    }

    canvas.style.display='';
    if(empty) empty.hidden=true;
    const color=key==='fat'?'#ef7c67':'#2bb9b3';
    const cur=series.at(-1).y, goal=+target;
    const showTarget=Number.isFinite(goal)&&Math.abs(cur-goal)<=TARGET_GAP;
    const values=series.map(x=>x.y).concat(showTarget?[goal]:[]);
    const mn=Math.min(...values), mx=Math.max(...values), span=Math.max(mx-mn,key==='fat'?.4:.5), pad=Math.max(key==='fat'?.15:.2,span*.18);
    const yMin=Math.floor((mn-pad)*10)/10, yMax=Math.ceil((mx+pad)*10)/10;
    const ro=readout(canvas);

    const datasets=[{
      label:P.chartKind==='pair'?'ค่าที่วัดจริง':P.chartKind==='monthly'?'ค่าเฉลี่ยรายเดือน':'ค่าเฉลี่ย',
      data:series.map(x=>x.y),borderColor:color,
      backgroundColor:key==='fat'?'rgba(239,124,103,.08)':'rgba(43,185,179,.08)',
      borderWidth:2.5,pointRadius:4,pointHoverRadius:6,tension:P.chartKind==='pair'?0:.2,fill:true,
      pointBackgroundColor:series.map(x=>x.isMTD?'#fff':color),
      pointBorderColor:series.map(()=>color),pointBorderWidth:series.map(x=>x.isMTD?2.5:1.5)
    }];
    if(showTarget) datasets.push({label:'เป้าหมาย',data:series.map(()=>goal),borderColor:'#8a9899',borderDash:[4,4],borderWidth:1.1,pointRadius:0,fill:false});

    const chart=new Chart(canvas.getContext('2d'),{
      type:'line',
      data:{labels:series.map(x=>x.label),datasets},
      options:{
        responsive:true,maintainAspectRatio:false,animation:false,
        interaction:{mode:'nearest',intersect:false,axis:'x'},
        plugins:{legend:{display:false},tooltip:{enabled:false}},
        scales:{
          x:{type:'category',offset:true,grid:{display:false},ticks:{autoSkip:true,maxTicksLimit:P.chartKind==='monthly'?7:4,maxRotation:0}},
          y:{beginAtZero:false,min:yMin,max:yMax,ticks:{maxTicksLimit:5}}
        },
        onHover:(_event,active,chartRef)=>{
          const h=active?.[0];
          if(!h){ if(ro) ro.textContent=''; return; }
          const i=h.index, ds=chartRef.data.datasets[h.datasetIndex], val=+ds.data[i];
          const label=series[i]?.label||'';
          if(ro) ro.textContent=`${label}${label?' · ':''}${ds.label} ${Number.isFinite(val)?val.toFixed(1):'—'} kg`;
        }
      }
    });
    chartById.set(id,chart);
    return true;
  }

  function renderCharts(){
    const P=periodFor(activeRange);
    const a=renderChart('s-fat-chart','fat',S.TARGET,P);
    const b=renderChart('s-muscle-chart','muscle',S.MUSCLE_TARGET,P);
    const note=document.getElementById('s-range-note');
    if(note){
      if(activeRange===1) note.textContent='2 จุด = ผลครั้งก่อน / ผลล่าสุด';
      else if(activeRange===7) note.textContent='2 จุด = ค่าเฉลี่ยสัปดาห์ก่อน / สัปดาห์ล่าสุดที่ปิดแล้ว';
      else if(activeRange===30) note.textContent=`2 จุด = ค่าเฉลี่ยช่วงวันเดียวกันของเดือนก่อน / เดือนนี้${latestMonthIsOpen?' (MTD)':''}`;
      else if(activeRange>=150&&activeRange<350) note.textContent=`แต่ละจุด = ค่าเฉลี่ยรายเดือนในช่วง 6 เดือน${latestMonthIsOpen?' · เดือนปัจจุบันเป็น MTD':''}`;
      else if(activeRange>=350&&activeRange<1000) note.textContent=`แต่ละจุด = ค่าเฉลี่ยรายเดือนของปีนี้${latestMonthIsOpen?' · เดือนปัจจุบันเป็น MTD':''}`;
      else note.textContent=`แต่ละจุด = ค่าเฉลี่ยรายเดือนตั้งแต่เริ่ม${latestMonthIsOpen?' · เดือนปัจจุบันเป็น MTD':''}`;
    }
    return a&&b;
  }

  function apply(){
    if(!controls()) return false;
    addStyle();
    setRange(activeRange);
    renderSummary();
    renderCharts();
    return true;
  }

  function start(){
    activeRange=1;
    let tries=0;
    const boot=()=>{
      tries++;
      if(apply()||tries>20) return;
      setTimeout(boot,100);
    };
    boot();

    document.addEventListener('click',e=>{
      const b=e.target.closest?.('#summary-app .s-range-controls button[data-range]');
      if(!b) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      setRange(+b.dataset.range);
      renderSummary();
      renderCharts();
    },true);
  }

  window.__JACKY_CALENDAR_OWNS_CHARTS__=true;
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();