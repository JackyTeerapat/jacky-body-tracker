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

  const dt = s => new Date(`${s}T00:00:00Z`);
  const shiftDays = (d, n) => new Date(d.getTime() + n * MS);
  const iso = d => d.toISOString().slice(0, 10);
  const avg = values => {
    const nums = values.map(Number).filter(Number.isFinite);
    return nums.length ? nums.reduce((sum, x) => sum + x, 0) / nums.length : null;
  };
  const fmt = (v, digits = 1) => Number.isFinite(+v) ? (+v).toFixed(digits) : '—';
  const daysInMonth = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const startMonth = d => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const startYear = d => new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const startWeek = d => shiftDays(d, -(d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1));
  const rowsBetween = (a, b) => D.filter(x => x.isoDate >= iso(a) && x.isoDate <= iso(b));

  function addMonths(d, n) {
    const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
    const last = daysInMonth(first.getUTCFullYear(), first.getUTCMonth());
    return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d.getUTCDate(), last)));
  }

  function shortDate(value, withYear = false) {
    const d = typeof value === 'string' ? dt(value) : value;
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${withYear ? ` ${d.getUTCFullYear()}` : ''}`;
  }

  function rangeLabel(a, b) {
    return a.getUTCFullYear() === b.getUTCFullYear()
      ? `${shortDate(a)}–${shortDate(b)} ${b.getUTCFullYear()}`
      : `${shortDate(a, true)}–${shortDate(b, true)}`;
  }

  const latestMonthKey = latest.isoDate.slice(0, 7);
  const now = new Date();
  const browserMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const latestMonthIsOpen = latestMonthKey === browserMonthKey;

  function monthBuckets(rows = D) {
    const groups = new Map();
    rows.forEach(row => {
      const key = row.isoDate.slice(0, 7);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    return [...groups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, rows]) => {
        const [year, month] = key.split('-').map(Number);
        const isMTD = key === latestMonthKey && latestMonthIsOpen;
        return { key, rows, isMTD, label: `${MONTHS[month - 1]} ${year}${isMTD ? ' MTD' : ''}` };
      });
  }

  function monthlyMean(rows, key) {
    return avg(monthBuckets(rows).map(bucket => avg(bucket.rows.map(x => x[key]))).filter(Number.isFinite));
  }

  function dailySeries(rows, key) {
    const groups = new Map();
    rows.forEach(row => {
      if (!groups.has(row.isoDate)) groups.set(row.isoDate, []);
      groups.get(row.isoDate).push(row);
    });
    return [...groups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, dayRows]) => ({ label: shortDate(date), value: avg(dayRows.map(x => x[key])) }))
      .filter(x => Number.isFinite(x.value));
  }

  function latestClosedSunday() {
    const ld = dt(latest.isoDate);
    return ld.getUTCDay() === 0 ? ld : shiftDays(startWeek(ld), -1);
  }

  function weeklySeries(start, end, key) {
    const closedEnd = latestClosedSunday();
    const groups = new Map();
    D.forEach(row => {
      const d = dt(row.isoDate);
      const ws = startWeek(d);
      const we = shiftDays(ws, 6);
      if (ws < start || we > end || we > closedEnd) return;
      const bucketKey = iso(ws);
      if (!groups.has(bucketKey)) groups.set(bucketKey, { start: ws, end: we, rows: [] });
      groups.get(bucketKey).rows.push(row);
    });
    return [...groups.values()]
      .sort((a, b) => a.start - b.start)
      .map(bucket => ({ label: rangeLabel(bucket.start, bucket.end), value: avg(bucket.rows.map(x => x[key])) }))
      .filter(x => Number.isFinite(x.value));
  }

  function monthlySeries(rows, key) {
    return monthBuckets(rows)
      .map(bucket => ({ label: bucket.label, value: avg(bucket.rows.map(x => x[key])), open: bucket.isMTD }))
      .filter(x => Number.isFinite(x.value));
  }

  function rangeName(r) {
    if (r === 1) return 'ครั้งก่อน';
    if (r === 7) return 'สัปดาห์';
    if (r === 30) return 'เดือนนี้';
    if (r >= 150 && r < 350) return '6 เดือน';
    if (r >= 350 && r < 1000) return 'ปีนี้';
    return 'ตั้งแต่เริ่ม';
  }

  function periodFor(r) {
    const ld = dt(latest.isoDate);
    if (r === 1) {
      const pair = D.slice(-2);
      return { range:r, title:'ผลล่าสุดเทียบครั้งก่อน', current:pair.slice(-1), previous:pair.slice(0,1), compare:pair.length===2?`${shortDate(pair[0].isoDate,true)} → ${shortDate(pair[1].isoDate,true)}`:'ข้อมูลยังไม่พอ', graphMode:'pair', graphRows:pair, graphNote:'กราฟผลวัด 2 ครั้งล่าสุด · ไม่มีการคาดการณ์อนาคต' };
    }
    if (r === 7) {
      const ce = latestClosedSunday(), cs = shiftDays(ce,-6), pe = shiftDays(ce,-7), ps = shiftDays(pe,-6);
      return { range:r, title:'ค่าเฉลี่ยรายสัปดาห์', current:rowsBetween(cs,ce), previous:rowsBetween(ps,pe), compare:`${rangeLabel(cs,ce)} เทียบกับ ${rangeLabel(ps,pe)}`, graphMode:'daily', graphRows:rowsBetween(ps,ce), graphNote:`กราฟค่าเฉลี่ยรายวัน · ${rangeLabel(ps,ce)}` };
    }
    if (r === 30) {
      const cs = startMonth(ld), ce = ld, ps = addMonths(cs,-1), pe = addMonths(ce,-1);
      return { range:r, title:'ค่าเฉลี่ยเดือนนี้', current:rowsBetween(cs,ce), previous:rowsBetween(ps,pe), compare:`${rangeLabel(cs,ce)} เทียบกับ ${rangeLabel(ps,pe)}`, graphMode:'daily', graphRows:rowsBetween(cs,ce), graphNote:`กราฟค่าเฉลี่ยรายวัน · ${rangeLabel(cs,ce)}${latestMonthIsOpen?' · MTD':''}` };
    }
    if (r >= 150 && r < 350) {
      const cs = addMonths(startMonth(ld),-5), ce = ld, ps = addMonths(cs,-6), pe = addMonths(ce,-6);
      return { range:r, title:'ค่าเฉลี่ย 6 เดือน', current:rowsBetween(cs,ce), previous:rowsBetween(ps,pe), compare:`${rangeLabel(cs,ce)} เทียบกับ ${rangeLabel(ps,pe)}`, summaryMode:'monthlyMean', graphMode:'weekly', graphStart:cs, graphEnd:ce, graphNote:`กราฟค่าเฉลี่ยรายสัปดาห์ · ${rangeLabel(cs,ce)}` };
    }
    if (r >= 350 && r < 1000) {
      const cs = startYear(ld), ce = ld;
      const ps = new Date(Date.UTC(ld.getUTCFullYear()-1,0,1));
      const pe = new Date(Date.UTC(ld.getUTCFullYear()-1,ld.getUTCMonth(),Math.min(ld.getUTCDate(),daysInMonth(ld.getUTCFullYear()-1,ld.getUTCMonth()))));
      return { range:r, title:'ค่าเฉลี่ยปีนี้', current:rowsBetween(cs,ce), previous:rowsBetween(ps,pe), compare:`${rangeLabel(cs,ce)} เทียบกับ ${rangeLabel(ps,pe)}`, summaryMode:'monthlyMean', graphMode:'weekly', graphStart:cs, graphEnd:ce, graphNote:`กราฟค่าเฉลี่ยรายสัปดาห์ · ${rangeLabel(cs,ce)}` };
    }
    const allMonths = monthBuckets(), closedMonths = allMonths.filter(x=>!x.isMTD), firstMonth = allMonths[0], lastClosed = closedMonths.at(-1);
    return { range:r, title:'ตั้งแต่เริ่ม · ค่าเฉลี่ยรายเดือน', current:lastClosed?.rows||[], previous:firstMonth&&lastClosed&&firstMonth.key!==lastClosed.key?firstMonth.rows:[], compare:firstMonth&&lastClosed&&firstMonth.key!==lastClosed.key?`${firstMonth.label.replace(' MTD','')} → ${lastClosed.label.replace(' MTD','')}`:'ข้อมูลรายเดือนยังไม่พอ', graphMode:'monthly', graphRows:D, graphNote:'กราฟค่าเฉลี่ยรายเดือนตั้งแต่เริ่ม · เดือนปัจจุบันแสดงเป็น MTD' };
  }

  function periodValues(period, key) {
    if (period.range === 1) return [Number(period.current.at(-1)?.[key]), Number(period.previous.at(-1)?.[key])];
    if (period.summaryMode === 'monthlyMean') return [monthlyMean(period.current,key), monthlyMean(period.previous,key)];
    return [avg(period.current.map(x=>x[key])), avg(period.previous.map(x=>x[key]))];
  }

  function deltaMeta(current, previous, lowerBetter) {
    if (!Number.isFinite(current) || !Number.isFinite(previous)) return {delta:null,pct:null,arrow:'→',cls:'neutral'};
    const delta = current-previous, pct = previous ? delta/previous*100 : null;
    const good = lowerBetter ? delta<0 : delta>0, bad = lowerBetter ? delta>0 : delta<0;
    return {delta,pct,arrow:delta>0?'↑':delta<0?'↓':'→',cls:Math.abs(delta)<1e-9?'neutral':good?'good':bad?'bad':'neutral'};
  }

  function deltaPill(meta, unit, isBF=false) {
    if (meta.delta == null) return '<i class="tr2-pill neutral">ข้อมูลไม่พอ</i>';
    const first = isBF ? `${Math.abs(meta.delta).toFixed(2)} จุด` : `${Math.abs(meta.delta).toFixed(2)} ${unit}`;
    const relative = Number.isFinite(meta.pct) ? ` · ${Math.abs(meta.pct).toFixed(1)}%` : '';
    return `<i class="tr2-pill ${meta.cls}">${meta.arrow} ${first}${relative}</i>`;
  }

  function graphSeries(period,key) {
    if (period.graphMode === 'pair') return period.graphRows.filter(x=>Number.isFinite(+x[key])).map(x=>({label:shortDate(x.isoDate,true),value:+x[key]}));
    if (period.graphMode === 'daily') return dailySeries(period.graphRows,key);
    if (period.graphMode === 'weekly') return weeklySeries(period.graphStart,period.graphEnd,key);
    return monthlySeries(period.graphRows,key);
  }

  function addStyles() {
    if (document.getElementById('trend-rebuild-v2-style')) return;
    const style = document.createElement('style');
    style.id = 'trend-rebuild-v2-style';
    style.textContent = `.tr2-hide{display:none!important}.tr2-root{margin-top:10px}.tr2-summary{padding:12px;border:1px solid #dfe9e6;border-radius:15px;background:#fbfcfc}.tr2-head{display:flex;justify-content:space-between;gap:10px;margin-bottom:9px}.tr2-head strong{font-size:13px;color:#182326}.tr2-head span{font-size:9px;color:${NEUTRAL};text-align:right}.tr2-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.tr2-metric{padding:9px;border:1px solid #edf2f0;border-radius:12px;background:#fff}.tr2-metric small{display:block;font-size:9px;color:#617579;font-weight:850}.tr2-metric b{display:block;margin:3px 0 5px;font-size:16px;color:#182326}.tr2-pill{display:inline-block;padding:3px 7px;border-radius:999px;font-size:9px;font-style:normal;font-weight:850;white-space:nowrap}.tr2-pill.good{color:${GOOD};background:#e8f7f5}.tr2-pill.bad{color:${BAD};background:#fff0eb}.tr2-pill.neutral{color:${NEUTRAL};background:#f1f4f3}.tr2-note{margin:10px 1px 8px;font-size:9px;color:${NEUTRAL}}.tr2-card{margin-bottom:12px;padding:12px;border:1px solid #dce8e5;border-radius:17px;background:#fff}.tr2-card.fat{border-color:#f2d2c9;background:#fffaf8}.tr2-card.muscle{border-color:#d3e7ed;background:#f9fcfd}.tr2-card-head{display:flex;justify-content:space-between;gap:10px}.tr2-card-head strong{font-size:15px;color:#182326}.tr2-card-head span{font-size:11px;font-weight:900}.tr2-card.fat .tr2-card-head span{color:#ef7c67}.tr2-card.muscle .tr2-card-head span{color:#318ba7}.tr2-readout{height:18px;text-align:right;font-size:9px;color:#617579;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tr2-canvas{height:210px}.tr2-empty{height:210px;display:flex;align-items:center;justify-content:center;text-align:center;color:${NEUTRAL};font-size:10px;line-height:1.5}.tr2-empty strong{display:block;color:#34484c;font-size:12px;margin-bottom:3px}@media(max-width:650px){.tr2-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.tr2-head{flex-direction:column}.tr2-head span{text-align:left}.tr2-canvas,.tr2-empty{height:190px}}`;
    document.head.appendChild(style);
  }

  function hideLegacyTrend() {
    ['s-fat-chart','s-muscle-chart'].forEach(id=>{
      const canvas=document.getElementById(id), card=canvas?.closest('.s-chart-card')||canvas?.parentElement?.parentElement;
      if(card&&!card.closest('.tr2-root')) card.classList.add('tr2-hide');
    });
    const note=document.getElementById('s-range-note'); if(note) note.classList.add('tr2-hide');
    document.querySelectorAll('#summary-app .s-period-compare,.tr-root').forEach(x=>x.classList.add('tr2-hide'));
    document.querySelectorAll('#summary-app .s-verdict').forEach(x=>x.remove());
  }

  function normalizeLegacyDetails(activeLabel) {
    const root=document.querySelector('#summary-app'); if(!root) return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT), edits=[];
    while(walker.nextNode()){
      const node=walker.currentNode;
      if(node.parentElement?.closest('.tr2-root,.s-range-controls')) continue;
      const text=node.nodeValue?.trim();
      if(text==='ตัวเลขตามช่วงที่เลือก') edits.push([node,'รายละเอียดผลสแกนล่าสุด']);
      else if(/^เทียบ\s+(?:1|7|30)\s*วัน$/.test(text||'')||/^เทียบ\s+(?:6 เดือน|ตั้งแต่เริ่ม)$/.test(text||'')) edits.push([node,'ผลล่าสุด']);
      else if(['ครั้งก่อน','สัปดาห์','เดือนนี้','6 เดือน','ปีนี้','ตั้งแต่เริ่ม'].includes(text||'')&&node.parentElement?.tagName!=='BUTTON') edits.push([node,activeLabel]);
    }
    edits.forEach(([node,replacement])=>{node.nodeValue=node.nodeValue.replace(node.nodeValue.trim(),replacement)});
  }

  function renameButtons() {
    const controls=document.querySelector('#summary-app .s-range-controls'); if(!controls) return null;
    controls.querySelectorAll('button[data-range]').forEach(button=>{const r=+button.dataset.range;if(Number.isFinite(r)){button.textContent=rangeName(r);button.disabled=false;button.removeAttribute('disabled')}});
    return controls;
  }

  let charts=[];
  function destroyCharts(){charts.forEach(chart=>{try{chart.destroy()}catch(_){}});charts=[]}

  function chartCard(kind,title,value,series){
    return `<div class="tr2-card ${kind}"><div class="tr2-card-head"><strong>${title}</strong><span>${fmt(value)} kg</span></div><div class="tr2-readout" id="tr2-read-${kind}"></div>${series.length<2?`<div class="tr2-empty"><div><strong>ข้อมูลยังไม่พอสำหรับดูแนวโน้ม</strong>มี ${series.length} จุด · ต้องมีอย่างน้อย 2 จุด</div></div>`:`<div class="tr2-canvas"><canvas id="tr2-${kind}"></canvas></div>`}</div>`;
  }

  function drawChart(kind,series){
    if(series.length<2) return;
    const canvas=document.getElementById(`tr2-${kind}`); if(!canvas) return;
    const color=kind==='fat'?'#ef7c67':'#318ba7', fill=kind==='fat'?'rgba(239,124,103,.10)':'rgba(49,139,167,.10)';
    const values=series.map(x=>x.value), minValue=Math.min(...values), maxValue=Math.max(...values), span=Math.max(maxValue-minValue,kind==='fat'?0.4:0.5), pad=Math.max(0.15,span*0.18);
    const chart=new Chart(canvas,{type:'line',data:{labels:series.map(x=>x.label),datasets:[{data:values,borderColor:color,backgroundColor:fill,borderWidth:2.6,pointRadius:series.length>45?2.2:series.length>24?3:4,pointHoverRadius:6,pointBackgroundColor:series.map(x=>x.open?'#fff':color),pointBorderColor:color,pointBorderWidth:series.map(x=>x.open?2.7:1.5),tension:series.length===2?0:0.18,fill:true}]},options:{responsive:true,maintainAspectRatio:false,animation:false,interaction:{mode:'nearest',intersect:false,axis:'x'},plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{grid:{display:false},ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:7,color:'#7c8d91',font:{size:9}}},y:{beginAtZero:false,min:Math.floor((minValue-pad)*10)/10,max:Math.ceil((maxValue+pad)*10)/10,ticks:{maxTicksLimit:5,color:'#7c8d91',font:{size:9}},grid:{color:'rgba(124,141,145,.16)'}}},onHover:(_event,active)=>{const hit=active?.[0],readout=document.getElementById(`tr2-read-${kind}`);if(readout)readout.textContent=hit?`${series[hit.index].label} · ${kind==='fat'?'ไขมัน':'กล้ามเนื้อ'} ${fmt(series[hit.index].value)} kg`:''}}});
    charts.push(chart);
  }

  function render(r){
    addStyles();
    const controls=renameButtons(); if(!controls) return false;
    const period=periodFor(r);
    controls.querySelectorAll('button[data-range]').forEach(button=>button.setAttribute('aria-pressed',String(+button.dataset.range===r)));
    hideLegacyTrend(); normalizeLegacyDetails(rangeName(r));
    let root=controls.parentElement?.querySelector(':scope > .tr2-root');
    if(!root){root=document.createElement('div');root.className='tr2-root';controls.insertAdjacentElement('afterend',root)}
    const metrics=[['weight','Weight',true,'kg',false],['fat','Fat',true,'kg',false],['bf','BF',true,'%',true],['muscle','Muscle',false,'kg',false]];
    const fatSeries=graphSeries(period,'fat'), muscleSeries=graphSeries(period,'muscle'), [fatCurrent]=periodValues(period,'fat'), [muscleCurrent]=periodValues(period,'muscle');
    destroyCharts();
    root.innerHTML=`<div class="tr2-summary"><div class="tr2-head"><strong>${period.title}</strong><span>${period.compare}</span></div><div class="tr2-grid">${metrics.map(([key,name,lowerBetter,unit,isBF])=>{const[current,previous]=periodValues(period,key),meta=deltaMeta(current,previous,lowerBetter);return`<div class="tr2-metric"><small>${name}${r===1?'':' avg'}</small><b>${fmt(current)}${isBF?'%':' kg'}</b>${deltaPill(meta,unit,isBF)}</div>`}).join('')}</div></div><div class="tr2-note">${period.graphNote}</div>${chartCard('fat','ไขมัน',fatCurrent,fatSeries)}${chartCard('muscle','กล้ามเนื้อ',muscleCurrent,muscleSeries)}`;
    drawChart('fat',fatSeries); drawChart('muscle',muscleSeries); return true;
  }

  function bind(){
    const controls=renameButtons(); if(!controls) return false;
    if(controls.dataset.trendRebuildV2Bound==='1') return true;
    controls.dataset.trendRebuildV2Bound='1';
    controls.addEventListener('click',event=>{const button=event.target.closest?.('button[data-range]');if(!button||!controls.contains(button))return;event.preventDefault();event.stopImmediatePropagation();const r=+button.dataset.range;if(Number.isFinite(r))render(r)},true);
    return true;
  }

  function start(){
    const run=()=>{if(!bind())return false;return render(1)};
    if(!run()) [120,350,800,1500].forEach(ms=>setTimeout(run,ms));
    else [200,700].forEach(ms=>setTimeout(()=>{hideLegacyTrend();normalizeLegacyDetails('ครั้งก่อน')},ms));
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();