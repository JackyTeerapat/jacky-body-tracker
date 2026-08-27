(() => {
  const S=window.__JACKY_TRACKER__; if(!S?.DATA?.length) return;
  const D=S.DATA.filter(x=>x?.isoDate).slice().sort((a,b)=>a.isoDate.localeCompare(b.isoDate));
  const MS=864e5, M=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const dt=s=>new Date(s+'T00:00:00Z'), iso=d=>d.toISOString().slice(0,10), sh=(d,n)=>new Date(d.getTime()+n*MS);
  const sd=v=>{const d=typeof v==='string'?dt(v):v;return Number.isNaN(d.getTime())?'—':`${d.getUTCDate()} ${M[d.getUTCMonth()]}`};
  const avg=a=>{const n=a.map(Number).filter(Number.isFinite);return n.length?n.reduce((s,x)=>s+x,0)/n.length:null};
  const f=x=>Number.isFinite(Number(x))?Number(x).toFixed(1):'—';
  const sg=x=>Number.isFinite(Number(x))?(x>0?'+':x<0?'−':'')+Math.abs(x).toFixed(2):'—';

  function checkpoint(){
    const latest=D.at(-1), ld=dt(latest.isoDate), end=sh(ld,-ld.getUTCDay()), start=sh(end,-6), pe=sh(start,-1), ps=sh(pe,-6);
    const rows=(a,b)=>D.filter(x=>x.isoDate>=iso(a)&&x.isoDate<=iso(b)), c=rows(start,end), p=rows(ps,pe);
    const A=(r,k)=>avg(r.map(x=>x[k])), cf=A(c,'fat'), pf=A(p,'fat'), cb=A(c,'bf'), pb=A(p,'bf'), cm=A(c,'muscle'), pm=A(p,'muscle'), cw=A(c,'weight'), pw=A(p,'weight');
    const df=cf!=null&&pf!=null?cf-pf:null, enough=c.length>=4&&p.length>=4;
    let state='ข้อมูลยังไม่พอ', cls='neutral'; if(enough&&df!=null){if(df<=-.2){state='ไขมันเฉลี่ยลดลง';cls='good'}else if(df>=.2){state='ไขมันเฉลี่ยสูงขึ้น';cls='watch'}else state='ไขมันเฉลี่ยทรงตัว'}
    const ns=ld.getUTCDay()===0?sh(ld,7):sh(ld,7-ld.getUTCDay());
    return `<section class="s-weekly-checkpoint"><div class="s-weekly-head"><div><p>WEEKLY CHECKPOINT</p><h2>${sd(start)}–${sd(end)}</h2></div><span class="${cls}">${state}</span></div><div class="s-weekly-grid">
      <div><small>Fat avg</small><strong>${f(cf)} kg</strong><em>${sg(cf-pf)} kg vs ก่อน</em></div>
      <div><small>BF avg</small><strong>${f(cb)}%</strong><em>${sg(cb-pb)} จุด</em></div>
      <div><small>Muscle avg</small><strong>${f(cm)} kg</strong><em>${sg(cm-pm)} kg</em></div>
      <div><small>Weight avg</small><strong>${f(cw)} kg</strong><em>${sg(cw-pw)} kg</em></div>
    </div><div class="s-weekly-foot"><span>${c.length} ครั้ง · สัปดาห์ก่อน ${p.length} ครั้ง${enough?'':' · confidence ต่ำถ้าน้อยกว่า 4 ครั้ง/สัปดาห์'}</span><strong>Checkpoint ถัดไป ${sd(ns)}</strong></div></section>`;
  }

  function style(){
    if(document.getElementById('runtime-overrides-style'))return; const s=document.createElement('style');s.id='runtime-overrides-style';s.textContent=`
    .s-weekly-checkpoint{margin:0 0 12px;padding:14px;border:1px solid #d8e4e1;border-radius:18px;background:#fff}.s-weekly-head{display:flex;justify-content:space-between;gap:10px;margin-bottom:11px}.s-weekly-head p{margin:0 0 3px;color:#147d7a;font-size:9px;font-weight:850;letter-spacing:.12em}.s-weekly-head h2{margin:0;color:#182326;font-size:17px}.s-weekly-head>span{padding:5px 9px;border-radius:999px;font-size:9px;font-weight:800;white-space:nowrap}.s-weekly-head .good{background:#e2f5f3;color:#147d7a}.s-weekly-head .watch{background:#fff0eb;color:#c26453}.s-weekly-head .neutral{background:#f1f4f3;color:#718084}.s-weekly-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.s-weekly-grid>div{padding:9px;border:1px solid #edf2f0;border-radius:12px;background:#f9fbfa}.s-weekly-grid small,.s-weekly-grid em{display:block;color:#718084;font-size:8px;font-style:normal}.s-weekly-grid strong{display:block;margin:3px 0;color:#182326;font-size:15px}.s-weekly-foot{display:flex;justify-content:space-between;gap:10px;margin-top:9px;padding-top:8px;border-top:1px solid #edf2f0;color:#718084;font-size:8px}.s-weekly-foot strong{color:#147d7a;white-space:nowrap}@media(max-width:620px){.s-weekly-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.s-weekly-foot{display:block}.s-weekly-foot strong{display:block;margin-top:4px}}`;document.head.appendChild(s)
  }

  const roll=(r,k,n)=>r.map(x=>{const e=+x.daysFromStart,a=r.filter(y=>+y.daysFromStart>=e-n+1&&+y.daysFromStart<=e).map(y=>y[k]);return{x:e,y:avg(a)}}).filter(x=>Number.isFinite(x.y));
  const weekly=(r,k)=>{const m=new Map;for(const x of r){const d=dt(x.isoDate), e=iso(sh(d,d.getUTCDay()?7-d.getUTCDay():0));(m.get(e)||m.set(e,[]).get(e)).push(x)}return[...m.values()].map(a=>({x:avg(a.map(x=>x.daysFromStart)),y:avg(a.map(x=>x[k]))})).filter(x=>Number.isFinite(x.x)&&Number.isFinite(x.y))};
  const range=()=>+(document.querySelector('.s-range-controls button[aria-pressed="true"]')?.dataset.range||7);
  const rows=r=>{const l=+D.at(-1).daysFromStart;if(!Number.isFinite(l)||r>=365)return D;return D.filter(x=>+x.daysFromStart>=l-r+1)};
  function chart(id,k,r,target){
    const c=window.Chart?.getChart?.(document.getElementById(id)); if(!c)return;
    const a=rows(r).filter(x=>Number.isFinite(+x.daysFromStart)&&Number.isFinite(+x[k])); if(!a.length)return;
    const color=k==='fat'?'#ef7c67':'#2bb9b3', raw=a.map(x=>({x:+x.daysFromStart,y:+x[k]}));
    let main,label,showRaw=true;if(r>=90){main=weekly(a,k);label='ค่าเฉลี่ยรายสัปดาห์';showRaw=false}else if(r>=30){main=roll(a,k,7);label='ค่าเฉลี่ยเคลื่อนที่ 7 วัน'}else if(r>=7){main=roll(a,k,3);label='ค่าเฉลี่ยเคลื่อนที่ 3 วัน'}else{main=raw;label=k==='fat'?'ไขมัน':'กล้ามเนื้อ';showRaw=false}
    const ds=[];if(showRaw)ds.push({label:'ค่าที่วัดจริง',data:raw,borderColor:color+'55',backgroundColor:'transparent',borderWidth:1.25,pointRadius:2,tension:.15,fill:false});
    ds.push({label,data:main,borderColor:color,backgroundColor:k==='fat'?'rgba(239,124,103,.10)':'rgba(43,185,179,.10)',borderWidth:2.5,pointRadius:r>=90?2.5:0,tension:.25,fill:true});
    if(Number.isFinite(+target))ds.push({label:'เป้าหมาย',data:main.map(x=>({x:x.x,y:+target})),borderColor:'#8a9899',borderDash:[4,4],borderWidth:1.1,pointRadius:0,fill:false});
    c.data.datasets=ds;const yy=ds.flatMap(d=>d.data.map(x=>+x.y)).filter(Number.isFinite), mn=Math.min(...yy),mx=Math.max(...yy),sp=Math.max(mx-mn,.5),pad=Math.max(.25,sp*.2);
    c.options.scales.y.min=Math.floor((mn-pad)*10)/10;c.options.scales.y.max=Math.ceil((mx+pad)*10)/10;c.options.scales.x.min=Math.min(...main.map(x=>+x.x));c.options.scales.x.max=Math.max(...main.map(x=>+x.x));c.update('none');
    const n=document.getElementById('s-range-note');if(n)n.textContent=r>=90?'กราฟใช้ค่าเฉลี่ยรายสัปดาห์เพื่อลด noise':r>=30?'จุดจาง = ค่าจริง · เส้นหลัก = ค่าเฉลี่ยเคลื่อนที่ 7 วัน':r>=7?'จุดจาง = ค่าจริง · เส้นหลัก = ค่าเฉลี่ยเคลื่อนที่ 3 วัน':n.textContent;
  }
  const charts=()=>{const r=range();chart('s-fat-chart','fat',r,S.TARGET);chart('s-muscle-chart','muscle',r,S.MUSCLE_TARGET)};

  function start(){
    document.querySelectorAll('.s-verdict').forEach(x=>x.remove()); style();
    const w=document.querySelector('#summary-app .summary-wrap'),h=w?.querySelector('.s-header');if(w&&h&&!w.querySelector('.s-weekly-checkpoint'))h.insertAdjacentHTML('afterend',checkpoint());
    document.querySelectorAll('.s-range-controls button').forEach(b=>b.addEventListener('click',()=>setTimeout(charts,0)));setTimeout(charts,0);
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();