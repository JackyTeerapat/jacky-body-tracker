(() => {
  const S = window.__JACKY_TRACKER__;
  if (!S?.DATA?.length) return;

  const D = S.DATA
    .filter(x => x?.isoDate)
    .slice()
    .sort((a,b) => String(a.measuredAt || a.isoDate).localeCompare(String(b.measuredAt || b.isoDate)));

  const latest = D.at(-1);
  const MS = 864e5;
  const M = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const GOOD = '#147d7a', BAD = '#c26453', NEUTRAL = '#718084';

  const dt = s => new Date(`${s}T00:00:00Z`);
  const sh = (d,n) => new Date(d.getTime() + n*MS);
  const iso = d => d.toISOString().slice(0,10);
  const avg = a => {
    const n = a.map(Number).filter(Number.isFinite);
    return n.length ? n.reduce((s,x) => s+x,0) / n.length : null;
  };
  const f1 = x => Number.isFinite(+x) ? (+x).toFixed(1) : '—';
  const sd = v => {
    const d = typeof v === 'string' ? dt(v) : v;
    return Number.isNaN(d.getTime()) ? '—' : `${d.getUTCDate()} ${M[d.getUTCMonth()]}`;
  };

  function meta(c,p,lowerBetter){
    if(!Number.isFinite(c) || !Number.isFinite(p)) return {delta:null,pct:null,arrow:'→',cls:'neutral'};
    const delta = c-p;
    const pct = p ? delta/p*100 : null;
    const arrow = delta>0 ? '↑' : delta<0 ? '↓' : '→';
    const good = lowerBetter ? delta<0 : delta>0;
    const bad = lowerBetter ? delta>0 : delta<0;
    return {delta,pct,arrow,cls:Math.abs(delta)<1e-9 ? 'neutral' : good ? 'good' : bad ? 'bad' : 'neutral'};
  }

  function addStyle(){
    if(document.getElementById('jacky-base-ui-style')) return;
    const s = document.createElement('style');
    s.id = 'jacky-base-ui-style';
    s.textContent = `
      #summary-app .s-verdict{display:none!important}
      .jacky-good{color:${GOOD}!important}.jacky-bad{color:${BAD}!important}.jacky-neutral{color:${NEUTRAL}!important}
      .s-weekly-checkpoint{margin:0 0 12px;padding:14px;border:1px solid #d8e4e1;border-radius:18px;background:#fff}
      .s-weekly-head{margin-bottom:11px}.s-weekly-head p{margin:0 0 4px;color:${GOOD};font-size:10px;font-weight:950;letter-spacing:.13em}
      .s-checkpoint-picker{position:relative;display:inline-block}
      .s-checkpoint-trigger{display:inline-flex;align-items:center;gap:12px;min-width:230px;padding:8px 12px;border:1px solid #cfe1dd;border-radius:12px;background:#f9fbfa;color:#182326;font:800 16px/1.15 system-ui,sans-serif;cursor:pointer;text-align:left}
      .s-checkpoint-trigger:hover,.s-checkpoint-trigger[aria-expanded="true"]{border-color:#67c5bf;background:#f1faf8}
      .s-checkpoint-trigger b{margin-left:auto;color:${GOOD};font-size:12px}.s-checkpoint-trigger[aria-expanded="true"] b{transform:rotate(180deg)}
      .s-checkpoint-menu{position:absolute;z-index:30;top:calc(100% + 6px);left:0;min-width:100%;max-height:240px;overflow:auto;padding:5px;border:1px solid #cfe1dd;border-radius:12px;background:#fff;box-shadow:0 12px 30px rgba(24,35,38,.12)}
      .s-checkpoint-menu[hidden]{display:none}
      .s-checkpoint-option{display:block;width:100%;padding:8px 10px;border:0;border-radius:9px;background:transparent;color:#34484c;font:700 12px/1.25 system-ui,sans-serif;text-align:left;cursor:pointer;white-space:nowrap}
      .s-checkpoint-option:hover,.s-checkpoint-option.active{background:#eaf7f5;color:${GOOD}}
      .s-weekly-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
      .s-weekly-grid>div{padding:10px 11px;border:1px solid #edf2f0;border-radius:12px;background:#f9fbfa}
      .s-weekly-grid small{display:block;color:#617579;font-size:11px;font-weight:900}
      .s-weekly-grid strong{display:block;margin:4px 0 3px;color:#182326;font-size:19px;line-height:1.05;font-weight:900}
      .s-weekly-grid em{display:inline-block;padding:3px 6px;border-radius:999px;font-size:9px;font-style:normal;font-weight:850}
      .s-weekly-grid em.good{color:${GOOD};background:#e8f7f5}.s-weekly-grid em.bad{color:${BAD};background:#fff0eb}.s-weekly-grid em.neutral{color:${NEUTRAL};background:#f1f4f3}
      .s-weekly-foot{display:flex;justify-content:space-between;gap:10px;margin-top:9px;padding-top:8px;border-top:1px solid #edf2f0;color:#718084;font-size:8px}
      .s-weekly-foot strong{color:${GOOD};white-space:nowrap}
      .s-chart-hover-readout{height:18px;margin:0 0 2px;text-align:right;color:#617579;font-size:10px;font-weight:700;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      @media(max-width:620px){
        .s-weekly-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        .s-weekly-foot{display:block}.s-weekly-foot strong{display:block;margin-top:4px}
        .s-checkpoint-trigger{min-width:0;max-width:100%;font-size:15px}
      }
    `;
    document.head.appendChild(s);
  }

  function updateHeader(){
    const h = document.querySelector('#summary-app .s-header');
    if(!h) return false;
    const m = String(latest?.measuredAt || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    const stamp = m ? `${+m[3]} ${M[+m[2]-1]} ${m[1]} · ${m[4]}:${m[5]}` : `${sd(latest.isoDate)} ${String(latest.isoDate).slice(0,4)}`;
    const e = h.querySelector('.s-eyebrow'), t = h.querySelector('h1'), d = h.querySelector('.s-date');
    if(e && e.textContent !== 'JACKY') e.textContent = 'JACKY';
    if(t && t.textContent !== 'BODY TRACKER') t.textContent = 'BODY TRACKER';
    const dateText = `อัปเดตล่าสุด · ${stamp}`;
    if(d && d.textContent !== dateText) d.textContent = dateText;
    return true;
  }

  const weekEnds = () => {
    const ld = dt(latest.isoDate);
    const done = sh(ld,-ld.getUTCDay());
    const set = new Set();
    D.forEach(r => {
      const d = dt(r.isoDate);
      const sunday = sh(d,d.getUTCDay() ? 7-d.getUTCDay() : 0);
      if(sunday <= done) set.add(iso(sunday));
    });
    return [...set].sort().reverse();
  };

  const weekRows = end => {
    const e = dt(end), s = sh(e,-6);
    return D.filter(r => r.isoDate >= iso(s) && r.isoDate <= end);
  };

  const weekLabel = end => {
    const e = dt(end), s = sh(e,-6);
    const sameYear = s.getUTCFullYear() === e.getUTCFullYear();
    return sameYear
      ? `${sd(s)}–${sd(e)} ${e.getUTCFullYear()}`
      : `${sd(s)} ${s.getUTCFullYear()}–${sd(e)} ${e.getUTCFullYear()}`;
  };

  function deltaHtml(c,p,lowerBetter,unit,{bf=false}={}){
    const m = meta(c,p,lowerBetter);
    if(m.delta == null) return '<em class="neutral">—</em>';
    const primary = bf
      ? `${Math.abs(m.delta).toFixed(2)} จุด`
      : `${Math.abs(m.delta).toFixed(2)} ${unit}`;
    const rel = Number.isFinite(m.pct) ? ` · ${Math.abs(m.pct).toFixed(1)}%` : '';
    return `<em class="${m.cls}">${m.arrow} ${primary}${rel}</em>`;
  }

  function renderCheckpoint(card,selected){
    const weeks = weekEnds();
    if(!weeks.length){ card.remove(); return; }
    selected = weeks.includes(selected) ? selected : weeks[0];

    const prev = iso(sh(dt(selected),-7));
    const c = weekRows(selected), p = weekRows(prev);
    const A = (rows,key) => avg(rows.map(x => x[key]));

    const cw=A(c,'weight'), pw=A(p,'weight');
    const cf=A(c,'fat'), pf=A(p,'fat');
    const cb=A(c,'bf'), pb=A(p,'bf');
    const cm=A(c,'muscle'), pm=A(p,'muscle');

    card.innerHTML = `
      <div class="s-weekly-head">
        <div class="s-checkpoint-picker">
          <p>WEEKLY PERFORMANCE</p>
          <button type="button" class="s-checkpoint-trigger" aria-expanded="false"><span>${weekLabel(selected)}</span><b>⌄</b></button>
          <div class="s-checkpoint-menu" hidden>
            ${weeks.map(w=>`<button type="button" class="s-checkpoint-option${w===selected?' active':''}" data-week="${w}">${weekLabel(w)}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="s-weekly-grid">
        <div><small>Weight avg</small><strong>${f1(cw)} kg</strong>${deltaHtml(cw,pw,true,'kg')}</div>
        <div><small>Fat avg</small><strong>${f1(cf)} kg</strong>${deltaHtml(cf,pf,true,'kg')}</div>
        <div><small>BF avg</small><strong>${f1(cb)}%</strong>${deltaHtml(cb,pb,true,'%',{bf:true})}</div>
        <div><small>Muscle avg</small><strong>${f1(cm)} kg</strong>${deltaHtml(cm,pm,false,'kg')}</div>
      </div>
      <div class="s-weekly-foot">
        <span>วัด ${c.length} ครั้งในช่วงนี้</span>
        <strong>${selected===weeks[0] ? `Checkpoint ถัดไป ${sd(sh(dt(weeks[0]),7))}` : 'กำลังดูย้อนหลัง'}</strong>
      </div>`;

    card.dataset.jackyReady = '1';
    const tr = card.querySelector('.s-checkpoint-trigger');
    const menu = card.querySelector('.s-checkpoint-menu');
    tr?.addEventListener('click',e => {
      e.stopPropagation();
      const open = tr.getAttribute('aria-expanded') === 'true';
      tr.setAttribute('aria-expanded',String(!open));
      menu.hidden = open;
    });
    card.querySelectorAll('.s-checkpoint-option').forEach(o => o.addEventListener('click',e => {
      e.stopPropagation();
      renderCheckpoint(card,o.dataset.week);
    }));
  }

  function setupCheckpoint(){
    const wrap = document.querySelector('#summary-app .summary-wrap');
    const h = wrap?.querySelector('.s-header');
    if(!wrap || !h) return false;
    let card = wrap.querySelector('.s-weekly-checkpoint');
    if(!card){
      card = document.createElement('section');
      card.className = 's-weekly-checkpoint';
      h.insertAdjacentElement('afterend',card);
    }
    if(card.dataset.jackyReady !== '1' || !card.querySelector('.s-weekly-grid')){
      const active = card.querySelector('.s-checkpoint-option.active[data-week]')?.dataset.week;
      renderCheckpoint(card,active || weekEnds()[0]);
    }
    return true;
  }

  function parseDelta(t){
    const m = String(t).replace(/,/g,'').match(/([+−-])\s*(\d+(?:\.\d+)?)/);
    return m ? (m[1] === '+' ? 1 : -1) * +m[2] : null;
  }

  function semanticClass(metric,v){
    if(!Number.isFinite(v) || Math.abs(v)<1e-9) return 'jacky-neutral';
    const lower = ['Weight','Fat Mass','Body Fat'].includes(metric);
    const higher = ['Muscle Mass','Skeletal Muscle'].includes(metric);
    if(!lower && !higher) return 'jacky-neutral';
    return (lower ? v<0 : v>0) ? 'jacky-good' : 'jacky-bad';
  }

  function paintDetails(){
    const root = document.querySelector('#summary-app');
    if(!root) return;
    const names = ['Weight','Fat Mass','Body Fat','Muscle Mass','Skeletal Muscle','Body Water'];
    const walker = document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const labels = [];
    while(walker.nextNode()){
      const t = walker.currentNode.nodeValue?.trim();
      if(names.includes(t)) labels.push([t,walker.currentNode.parentElement]);
    }
    labels.forEach(([metric,start]) => {
      let row = start;
      for(let i=0; row && i<6; i++,row=row.parentElement){
        if(!/\([+−-]\s*\d/.test(row.textContent || '')) continue;
        [...row.querySelectorAll('*')]
          .filter(n => n.children.length===0 && /\([+−-]\s*\d/.test(n.textContent || ''))
          .forEach(n => {
            const v = parseDelta(n.textContent);
            n.classList.remove('jacky-good','jacky-bad','jacky-neutral');
            n.classList.add(semanticClass(metric,v));
            n.style.fontWeight='800';
          });
        break;
      }
    });
  }

  function apply(){
    addStyle();
    document.querySelectorAll('#summary-app .s-verdict').forEach(e=>e.remove());
    updateHeader();
    setupCheckpoint();
    paintDetails();
  }

  function start(){
    [0,100,250,500,900,1400,2200,3500,5200,7500].forEach(ms=>setTimeout(apply,ms));
    window.addEventListener('load',()=>setTimeout(apply,50),{once:true});
    document.addEventListener('click',e=>{
      if(e.target.closest?.('.s-checkpoint-option')) [30,140].forEach(ms=>setTimeout(apply,ms));
    });
  }

  document.readyState==='loading'
    ? document.addEventListener('DOMContentLoaded',start,{once:true})
    : start();
})();
