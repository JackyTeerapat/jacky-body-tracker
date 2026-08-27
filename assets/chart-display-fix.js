(() => {
  const S = window.__JACKY_TRACKER__;
  if (!S?.DATA?.length || !window.Chart) return;

  const D = S.DATA.filter(x => x?.isoDate).slice().sort((a,b) => String(a.measuredAt || a.isoDate).localeCompare(String(b.measuredAt || b.isoDate)));
  const latest = D.at(-1), MS = 864e5;
  const M = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const GOOD = '#147d7a', BAD = '#c26453', NEUTRAL = '#718084', TARGET_GAP = 2;
  const dt = s => new Date(`${s}T00:00:00Z`), sh = (d,n) => new Date(d.getTime()+n*MS), iso = d => d.toISOString().slice(0,10);
  const avg = a => { const n=a.map(Number).filter(Number.isFinite); return n.length?n.reduce((s,x)=>s+x,0)/n.length:null; };
  const f1 = x => Number.isFinite(+x)?(+x).toFixed(1):'—';
  const sd = v => { const d=typeof v==='string'?dt(v):v; return Number.isNaN(d.getTime())?'—':`${d.getUTCDate()} ${M[d.getUTCMonth()]}`; };
  const sign = (x,d=2,u='') => { if(!Number.isFinite(+x))return '—'; const n=+x; return `${n>0?'+':n<0?'−':''}${Math.abs(n).toFixed(d)}${u}`; };
  const meta = (c,p,lowerBetter) => {
    if(!Number.isFinite(c)||!Number.isFinite(p)) return {delta:null,pct:null,arrow:'→',cls:'neutral'};
    const delta=c-p,pct=p?(delta/p)*100:null,arrow=delta>0?'↑':delta<0?'↓':'→';
    const good=lowerBetter?delta<0:delta>0,bad=lowerBetter?delta>0:delta<0;
    return {delta,pct,arrow,cls:Math.abs(delta)<1e-9?'neutral':good?'good':bad?'bad':'neutral'};
  };

  function addStyle(){
    if(document.getElementById('jacky-chart-fix-style')) return;
    const s=document.createElement('style'); s.id='jacky-chart-fix-style';
    s.textContent=`
      .jacky-good{color:${GOOD}!important}.jacky-bad{color:${BAD}!important}.jacky-neutral{color:${NEUTRAL}!important}
      .s-weekly-checkpoint{margin:0 0 12px;padding:14px;border:1px solid #d8e4e1;border-radius:18px;background:#fff}
      .s-weekly-head{margin-bottom:11px}.s-weekly-head p{margin:0 0 4px;color:${GOOD};font-size:9px;font-weight:850;letter-spacing:.12em}
      .s-checkpoint-picker{position:relative;display:inline-block}.s-checkpoint-trigger{display:inline-flex;align-items:center;gap:12px;min-width:230px;padding:8px 12px;border:1px solid #cfe1dd;border-radius:12px;background:#f9fbfa;color:#182326;font:800 16px/1.15 system-ui,sans-serif;cursor:pointer;text-align:left}
      .s-checkpoint-trigger:hover,.s-checkpoint-trigger[aria-expanded="true"]{border-color:#67c5bf;background:#f1faf8}.s-checkpoint-trigger b{margin-left:auto;color:${GOOD};font-size:12px}.s-checkpoint-trigger[aria-expanded="true"] b{transform:rotate(180deg)}
      .s-checkpoint-menu{position:absolute;z-index:30;top:calc(100% + 6px);left:0;min-width:100%;max-height:240px;overflow:auto;padding:5px;border:1px solid #cfe1dd;border-radius:12px;background:#fff;box-shadow:0 12px 30px rgba(24,35,38,.12)}.s-checkpoint-menu[hidden]{display:none}
      .s-checkpoint-option{display:block;width:100%;padding:8px 10px;border:0;border-radius:9px;background:transparent;color:#34484c;font:700 12px/1.25 system-ui,sans-serif;text-align:left;cursor:pointer;white-space:nowrap}.s-checkpoint-option:hover,.s-checkpoint-option.active{background:#eaf7f5;color:${GOOD}}
      .s-weekly-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.s-weekly-grid>div{padding:10px 11px;border:1px solid #edf2f0;border-radius:12px;background:#f9fbfa}
      .s-weekly-grid small{display:block;color:#617579;font-size:10px;font-weight:850}.s-weekly-grid strong{display:block;margin:4px 0 3px;color:#182326;font-size:18px;line-height:1.05;font-weight:900}
      .s-weekly-grid em{display:inline-block;padding:3px 6px;border-radius:7px;font-size:9px;font-style:normal;font-weight:850}.s-weekly-grid em.good{color:${GOOD};background:#e8f7f5}.s-weekly-grid em.bad{color:${BAD};background:#fff0eb}.s-weekly-grid em.neutral{color:${NEUTRAL};background:#f1f4f3}
      .s-weekly-foot{display:flex;justify-content:space-between;gap:10px;margin-top:9px;padding-top:8px;border-top:1px solid #edf2f0;color:#718084;font-size:8px}.s-weekly-foot strong{color:${GOOD};white-space:nowrap}
      .s-chart-hover-readout{height:18px;margin:0 0 2px;text-align:right;color:#617579;font-size:10px;font-weight:700;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      @media(max-width:620px){.s-weekly-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.s-weekly-foot{display:block}.s-weekly-foot strong{display:block;margin-top:4px}.s-checkpoint-trigger{min-width:0;max-width:100%;font-size:15px}}
    `; document.head.appendChild(s);
  }

  function updateHeader(){
    const h=document.querySelector('#summary-app .s-header'); if(!h)return;
    const m=String(latest?.measuredAt||'').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    const stamp=m?`${+m[3]} ${M[+m[2]-1]} ${m[1]} · ${m[4]}:${m[5]}`:`${sd(latest.isoDate)} ${String(latest.isoDate).slice(0,4)}`;
    const e=h.querySelector('.s-eyebrow'),t=h.querySelector('h1'),d=h.querySelector('.s-date'); if(e)e.textContent='JACKY'; if(t)t.textContent='BODY TRACKER'; if(d)d.textContent=`อัปเดตล่าสุด · ${stamp}`;
  }

  const weekEnds=()=>{ const ld=dt(latest.isoDate),done=sh(ld,-ld.getUTCDay()),set=new Set(); D.forEach(r=>{const d=dt(r.isoDate),sun=sh(d,d.getUTCDay()?7-d.getUTCDay():0); if(sun<=done)set.add(iso(sun));}); return [...set].sort().reverse(); };
  const weekRows=end=>{const e=dt(end),s=sh(e,-6); return D.filter(r=>r.isoDate>=iso(s)&&r.isoDate<=end);};
  const weekLabel=end=>{const e=dt(end); return `${sd(sh(e,-6))}–${sd(e)} ${e.getUTCFullYear()}`;};
  const metricDelta=(m,u,d=2,rel=true)=>m.delta==null?'<em class="neutral">—</em>':`<em class="${m.cls}">${m.arrow} ${sign(m.delta,d,u)}${rel&&Number.isFinite(m.pct)?` · ${sign(m.pct,1,'%')}`:''}</em>`;

  function renderCheckpoint(card,selected){
    const weeks=weekEnds(); if(!weeks.length){card.remove();return;} selected=weeks.includes(selected)?selected:weeks[0];
    const prev=iso(sh(dt(selected),-7)),c=weekRows(selected),p=weekRows(prev),A=(r,k)=>avg(r.map(x=>x[k]));
    const cf=A(c,'fat'),pf=A(p,'fat'),cb=A(c,'bf'),pb=A(p,'bf'),cm=A(c,'muscle'),pm=A(p,'muscle'),cw=A(c,'weight'),pw=A(p,'weight');
    const fm=meta(cf,pf,true),bm=meta(cb,pb,true),mm=meta(cm,pm,false),wm=meta(cw,pw,true);
    card.innerHTML=`<div class="s-weekly-head"><div class="s-checkpoint-picker"><p>WEEKLY CHECKPOINT</p><button type="button" class="s-checkpoint-trigger" aria-expanded="false"><span>${weekLabel(selected)}</span><b>⌄</b></button><div class="s-checkpoint-menu" hidden>${weeks.map(w=>`<button type="button" class="s-checkpoint-option${w===selected?' active':''}" data-week="${w}">${weekLabel(w)}</button>`).join('')}</div></div></div>
      <div class="s-weekly-grid"><div><small>Fat avg</small><strong>${f1(cf)} kg</strong>${metricDelta(fm,' kg')}</div><div><small>BF avg</small><strong>${f1(cb)}%</strong>${metricDelta(bm,'%',2,false)}</div><div><small>Muscle avg</small><strong>${f1(cm)} kg</strong>${metricDelta(mm,' kg')}</div><div><small>Weight avg</small><strong>${f1(cw)} kg</strong>${metricDelta(wm,' kg')}</div></div>
      <div class="s-weekly-foot"><span>${c.length} ครั้งในสัปดาห์นี้</span><strong>${selected===weeks[0]?`Checkpoint ถัดไป ${sd(sh(dt(weeks[0]),7))}`:'กำลังดูย้อนหลัง'}</strong></div>`;
    const tr=card.querySelector('.s-checkpoint-trigger'),menu=card.querySelector('.s-checkpoint-menu');
    tr?.addEventListener('click',e=>{e.stopPropagation();const open=tr.getAttribute('aria-expanded')==='true';tr.setAttribute('aria-expanded',String(!open));menu.hidden=open;});
    card.querySelectorAll('.s-checkpoint-option').forEach(o=>o.addEventListener('click',e=>{e.stopPropagation();renderCheckpoint(card,o.dataset.week);}));
    document.addEventListener('click',()=>{if(tr?.isConnected&&menu?.isConnected){tr.setAttribute('aria-expanded','false');menu.hidden=true;}},{once:true});
  }
  function setupCheckpoint(){ const w=document.querySelector('#summary-app .summary-wrap'),h=w?.querySelector('.s-header'); if(!w||!h)return false; let c=w.querySelector('.s-weekly-checkpoint'); if(!c){c=document.createElement('section');c.className='s-weekly-checkpoint';h.insertAdjacentElement('afterend',c);} renderCheckpoint(c,weekEnds()[0]); return true; }

  function selectedRange(){return +document.querySelector('#summary-app .s-range-controls button[aria-pressed="true"]')?.dataset.range||7;}
  function renamePrevious(){const b=document.querySelector('#summary-app .s-range-controls button[data-range="1"]');if(b)b.textContent='ครั้งก่อน';const root=b?.closest('section')||document.querySelector('#summary-app');if(!root)return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),a=[];while(w.nextNode())if(w.currentNode.nodeValue.trim()==='1 วัน')a.push(w.currentNode);a.forEach(n=>n.nodeValue=n.nodeValue.replace('1 วัน','ครั้งก่อน'));}
  function rangeRows(r){if(r===1)return D.slice(-2);const last=+latest.daysFromStart;if(!Number.isFinite(last)||r>=365)return D;return D.filter(x=>+x.daysFromStart>=last-r+1);}
  const rolling=(rows,k,n)=>rows.map(x=>{const e=+x.daysFromStart;return{x:e,y:avg(rows.filter(y=>+y.daysFromStart>=e-n+1&&+y.daysFromStart<=e).map(y=>y[k]))};}).filter(x=>Number.isFinite(x.y));
  function weekly(rows,k){const g=new Map();rows.forEach(x=>{const d=dt(x.isoDate),e=iso(sh(d,d.getUTCDay()?7-d.getUTCDay():0));if(!g.has(e))g.set(e,[]);g.get(e).push(x);});return[...g.values()].map(a=>({x:avg(a.map(x=>x.daysFromStart)),y:avg(a.map(x=>x[k]))})).filter(x=>Number.isFinite(x.x)&&Number.isFinite(x.y));}
  function nearest(day){return D.reduce((b,x)=>{const v=+x.daysFromStart;return!Number.isFinite(v)?b:!b||Math.abs(v-day)<Math.abs(+b.daysFromStart-day)?x:b;},null);}
  function readout(canvas){const host=canvas.closest('.s-chart-card')||canvas.parentElement?.parentElement;if(!host)return null;let el=host.querySelector('.s-chart-hover-readout');if(!el){el=document.createElement('div');el.className='s-chart-hover-readout';canvas.parentElement?.insertAdjacentElement('beforebegin',el);}return el;}

  function patchChart(id,k,target,r){
    const canvas=document.getElementById(id),c=canvas&&Chart.getChart?.(canvas);if(!c)return false;
    const rows=rangeRows(r).filter(x=>Number.isFinite(+x[k]));if(!rows.length)return false;const compare=r===1,color=k==='fat'?'#ef7c67':'#2bb9b3';
    const raw=compare?rows.map((x,i)=>({x:i,y:+x[k]})):rows.filter(x=>Number.isFinite(+x.daysFromStart)).map(x=>({x:+x.daysFromStart,y:+x[k]}));
    let main=raw,label='ค่าที่วัดจริง',showRaw=false;if(r>=90){main=weekly(rows,k);label='ค่าเฉลี่ยรายสัปดาห์';}else if(r>=30){main=rolling(rows,k,7);label='ค่าเฉลี่ย 7 วัน';showRaw=true;}else if(r>=7){main=rolling(rows,k,3);label='ค่าเฉลี่ย 3 วัน';showRaw=true;}
    const ds=[];if(showRaw)ds.push({label:'ค่าที่วัดจริง',data:raw,borderColor:`${color}55`,backgroundColor:'transparent',borderWidth:1.2,pointRadius:2,pointHoverRadius:5,tension:.15,fill:false});
    ds.push({label,data:main,borderColor:color,backgroundColor:k==='fat'?'rgba(239,124,103,.10)':'rgba(43,185,179,.10)',borderWidth:2.5,pointRadius:compare?4.5:r>=90?3:0,pointHoverRadius:5,tension:compare?0:.25,fill:true});
    const cur=+latest[k],goal=+target,showTarget=!compare&&Number.isFinite(cur)&&Number.isFinite(goal)&&Math.abs(cur-goal)<=TARGET_GAP;if(showTarget)ds.push({label:'เป้าหมาย',data:main.map(p=>({x:p.x,y:goal})),borderColor:'#8a9899',borderDash:[4,4],borderWidth:1.1,pointRadius:0,fill:false});
    c.data.datasets=ds;c.options.plugins=c.options.plugins||{};c.options.plugins.tooltip={...(c.options.plugins.tooltip||{}),enabled:false};if(c.options.plugins.annotation)delete c.options.plugins.annotation;c.options.interaction={mode:'nearest',intersect:false,axis:'xy'};
    c.options.scales.x.type='linear';c.options.scales.x.ticks=c.options.scales.x.ticks||{};c.options.scales.x.ticks.callback=v=>{if(compare){const row=rows[Math.round(+v)];return row?sd(row.isoDate):'';}const row=nearest(+v);return row?sd(row.isoDate):'';};
    if(compare){c.options.scales.x.min=-.15;c.options.scales.x.max=Math.max(1,raw.length-1)+.15;c.options.scales.x.ticks.stepSize=1;c.options.scales.x.ticks.maxTicksLimit=2;}else{const xs=main.map(p=>+p.x).filter(Number.isFinite);c.options.scales.x.min=Math.min(...xs);c.options.scales.x.max=Math.max(...xs);delete c.options.scales.x.ticks.stepSize;c.options.scales.x.ticks.maxTicksLimit=r>=90?6:7;}
    const vals=ds.filter(d=>d.label!=='เป้าหมาย').flatMap(d=>d.data.map(p=>+p.y)).filter(Number.isFinite);if(showTarget)vals.push(goal);if(vals.length){const mn=Math.min(...vals),mx=Math.max(...vals),span=Math.max(mx-mn,k==='fat'?.4:.5),pad=Math.max(k==='fat'?.15:.2,span*.18),mid=(mn+mx)/2,half=span/2+pad;c.options.scales.y.beginAtZero=false;c.options.scales.y.min=Math.floor((mid-half)*10)/10;c.options.scales.y.max=Math.ceil((mid+half)*10)/10;delete c.options.scales.y.suggestedMin;delete c.options.scales.y.suggestedMax;}
    const ro=readout(canvas),widths=ds.map(d=>d.borderWidth||1);c.$jackyHover=null;c.options.onHover=(_e,a)=>{const h=a?.[0];if(!h){if(ro)ro.textContent='';if(c.$jackyHover!==null){c.data.datasets.forEach((d,i)=>d.borderWidth=widths[i]);c.$jackyHover=null;c.update('none');}return;}const idx=h.datasetIndex,dataset=c.data.datasets[idx],ctx=h.element?.$context,val=+(ctx?.parsed?.y??ctx?.raw?.y??ctx?.raw),x=+(ctx?.raw?.x??ctx?.parsed?.x),row=compare?rows[Math.round(x)]:nearest(x);if(ro)ro.textContent=`${row?sd(row.isoDate)+' · ':''}${dataset.label} ${Number.isFinite(val)?val.toFixed(1):'—'} kg`;if(c.$jackyHover!==idx){c.data.datasets.forEach((d,i)=>d.borderWidth=i===idx?Math.max(3.5,widths[i]):.8);c.$jackyHover=idx;c.update('none');}};
    c.update('none');return true;
  }
  function patchCharts(){const r=selectedRange(),a=patchChart('s-fat-chart','fat',S.TARGET,r),b=patchChart('s-muscle-chart','muscle',S.MUSCLE_TARGET,r),n=document.getElementById('s-range-note');if(n)n.textContent=r===1?'ผลครั้งก่อน → ผลล่าสุด':r>=90?'ใช้ค่าเฉลี่ยรายสัปดาห์เพื่อลด noise':r>=30?'เส้นบาง = ค่าจริง · เส้นหลัก = ค่าเฉลี่ย 7 วัน':'เส้นบาง = ค่าจริง · เส้นหลัก = ค่าเฉลี่ย 3 วัน';renamePrevious();return a&&b;}

  function parseDelta(t){const m=String(t).replace(/,/g,'').match(/([+−-])\s*(\d+(?:\.\d+)?)/);if(!m)return null;return(m[1]==='+'?1:-1)*+m[2];}
  function cls(metric,v){if(!Number.isFinite(v)||Math.abs(v)<1e-9)return'jacky-neutral';const lower=['Weight','Fat Mass','Body Fat','ไขมัน','น้ำหนัก'].some(x=>metric.includes(x)),higher=['Muscle Mass','Skeletal Muscle','กล้ามเนื้อ'].some(x=>metric.includes(x));if(!lower&&!higher)return'jacky-neutral';return(lower?v<0:v>0)?'jacky-good':'jacky-bad';}
  function semantic(){
    const metrics=['Weight','Fat Mass','Body Fat','Muscle Mass','Skeletal Muscle','Body Water'];
    document.querySelectorAll('body *').forEach(label=>{const name=label.textContent?.trim();if(!metrics.includes(name)||label.children.length)return;let row=label.parentElement;for(let d=0;row&&d<5;d++,row=row.parentElement){const all=row.textContent||'';if(!all.includes(name)||!/[()]/.test(all))continue;[...row.querySelectorAll('*')].filter(el=>el.children.length===0&&/^\s*\([+−-]\s*\d/.test(el.textContent||'')).forEach(el=>{const v=parseDelta(el.textContent);el.classList.remove('jacky-good','jacky-bad','jacky-neutral');el.classList.add(cls(name,v));el.style.fontWeight='800';});break;}});
    document.querySelectorAll('body *').forEach(el=>{const t=el.textContent?.trim()||'';if(el.children.length||!/^ช่วงนี้\s*[+−-]/.test(t))return;let n=el.parentElement;for(let d=0;n&&d<5;d++,n=n.parentElement){const all=n.textContent||'';let metric='';if(all.includes('กล้ามเนื้อ'))metric='กล้ามเนื้อ';else if(all.includes('ไขมัน'))metric='ไขมัน';else if(all.includes('น้ำหนัก'))metric='น้ำหนัก';if(!metric)continue;const v=parseDelta(t);el.classList.remove('jacky-good','jacky-bad','jacky-neutral');el.classList.add(cls(metric,v));break;}});
  }
  function bind(){document.querySelectorAll('#summary-app .s-range-controls button').forEach(b=>{if(b.dataset.jackyBound)return;b.dataset.jackyBound='1';b.addEventListener('click',()=>[0,60,160].forEach(ms=>setTimeout(()=>{renamePrevious();patchCharts();semantic();},ms)));});}
  function start(){addStyle();updateHeader();setupCheckpoint();renamePrevious();bind();semantic();let i=0;const go=()=>{i++;const ok=patchCharts();semantic();if(!ok&&i<15)setTimeout(go,100);};setTimeout(go,30);}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
