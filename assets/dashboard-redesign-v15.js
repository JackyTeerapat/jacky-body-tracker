(()=>{
const q=(s,r=document)=>r.querySelector(s);
function render(){
 const w=q('#summary-app .summary-wrap');if(!w)return;
 const head=q('.s-header',w),scan=q('.v9-latest',w),pair=q('.v14-coach-goal',w),weekly=q('.s-weekly-checkpoint',w),trend=q('.s-trend-card',w),history=q('.s-history',w);
 if(!head||!scan||!pair)return;
 w.classList.add('r15-layout');
 w.prepend(head);head.insertAdjacentElement('afterend',scan);scan.insertAdjacentElement('afterend',pair);
 // Single trainer recommendation; weekly numbers live in Weekly Performance.
 // Recover the Trainer if legacy scripts moved it ahead of Weekly Performance.
 const trainer=q('.at-trainer',w),goal=q('.s-goal-progress-section',w);
 if(trainer&&trainer.parentElement!==pair){pair.prepend(trainer);}
 if(goal&&trainer&&!trainer.contains(goal)){
   const phases=q('.at-phases',trainer);
   if(phases)phases.insertAdjacentElement('afterend',goal);
   else trainer.appendChild(goal);
 }
 if(trainer){
   let phaseInfo=q('.r17-phase-info',trainer);
   if(!phaseInfo){phaseInfo=document.createElement('section');phaseInfo.className='r17-phase-info';}
   const phase=trainer.querySelector('.at-phases');
   const src=window.__JACKY_TRACKER__;
   const data=src?.DATA?.slice()?.filter(x=>x?.isoDate)?.sort((a,b)=>a.isoDate.localeCompare(b.isoDate))||[];
   const last=data.at(-1), bf=Number(last?.bf), fat=Number(last?.fat), targetFat=Number(src?.TARGET);
   const bfLeft=Number.isFinite(bf)?Math.max(0,bf-13):null;
   const fatLeft=Number.isFinite(fat)&&Number.isFinite(targetFat)?Math.max(0,fat-targetFat):null;
   phaseInfo.innerHTML='<div class="r17-phase-header"><strong>เมื่อไหร่ถึงเปลี่ยน Phase?</strong><span>เป้าหมาย Cut → Maintenance</span></div>'+
     '<div class="r17-phase-numbers"><div><small>Body Fat เป้าหมาย</small><b>12–13%</b><small>ยังเหลือ '+(bfLeft===null?'—':bfLeft.toFixed(1)+' จุดเปอร์เซ็นต์')+' ถึง 13%</small></div><div><small>Fat Mass เป้าหมาย</small><b>'+ (Number.isFinite(targetFat)?targetFat.toFixed(1)+' kg':'—')+'</b><small>เหลือลดประมาณ '+(fatLeft===null?'—':fatLeft.toFixed(1)+' kg')+'</small></div></div>'+
     '<p>จบ Cut เมื่อแนวโน้มไขมันเข้าใกล้ 12–13% อย่างต่อเนื่อง พร้อมตรวจแรงยกและการฟื้นตัว ก่อนเข้าสู่ Maintenance แล้วจึง Lean Bulk · การเปลี่ยน Phase ต้องยืนยัน ไม่อิง BIA ครั้งเดียว</p>';
   if(phase&&phaseInfo.previousElementSibling!==phase)phase.insertAdjacentElement('afterend',phaseInfo);
   const stats=q('.at-numbers',trainer);if(stats)stats.classList.add('r15-secondary-stats');
   const notes=q('.at-reason',trainer);if(notes)notes.classList.add('r15-coach-reason');
   const insight=q('.v9-insight',trainer);if(insight)insight.classList.add('r15-coach-insight');
   const step=q('.at-phases',trainer);if(step)step.classList.add('r15-stage');
   const label=q('.at-eyebrow',trainer);if(label)label.textContent='PERSONAL TRAINER';
 }
 if(goal){
   const phases=trainer?.querySelector('.at-phases');if(phases&&goal.previousElementSibling!==phases)phases.insertAdjacentElement('afterend',goal);
   const h=q('.s-goal-section-head h2',goal);if(h)h.textContent='เป้าหมายลดไขมัน';
   const t=q('.s-goal-section-head small',goal);if(t)t.textContent='ติดตามด้วยค่าเฉลี่ยรายสัปดาห์';
   const ff=q('.v9-advanced',goal);
   if(ff){const summary=q('summary',ff);if(summary)summary.textContent='FFMI · MUSCLE ROADMAP';}
 }
 // A single trends and weekly-performance zone, followed by deep history.
 let performance=q('.r15-performance',w);
 if(!performance){performance=document.createElement('section');performance.className='r15-performance';performance.innerHTML='<div class="r15-section-heading"><div><small>PROGRESS ANALYTICS</small><h2>BODY PERFORMANCE</h2><p>ข้อมูลย้อนหลังในจุดเดียว · เลือกรายวัน รายสัปดาห์ หรือรายเดือน</p></div></div><div class="r15-performance-content"></div>';}
 pair.insertAdjacentElement('afterend',performance);
 const area=q('.r15-performance-content',performance);
 if(weekly&&weekly.parentElement!==area)area.appendChild(weekly);
 if(weekly)weekly.classList.add('r16-legacy-weekly');
 if(trend&&trend.parentElement!==area)area.appendChild(trend);
 // Independent trend builders may inject controls outside .s-trend-card.
 const controls=q('.s-range-controls',w);
 const trendContainer=controls?.closest('.s-trend-card');
 if(trendContainer&&trendContainer.parentElement!==area)area.appendChild(trendContainer);
 // Keep time controls and charts in the SAME responsive flow, no side columns.
 if(trendContainer){trendContainer.classList.add('r17-trend-full');}
 const selector=trendContainer?.querySelector('.s-period-selector');
 if(selector)selector.classList.add('r17-period-bar');
 const graph=trendContainer?.querySelector('.tr2-root');
 if(graph)graph.classList.add('r17-chart-root');
 const legacyCoach=trainer?.querySelector('.at-review');if(legacyCoach)legacyCoach.remove();
 const previews=w.querySelectorAll('.s-this-week-preview,.s-metric-goal-grid,.s-verdict');previews.forEach(el=>el.classList.add('r15-hide'));
 if(history){history.classList.add('r15-history');}
}
function boot(){
 const style=document.createElement('style');style.id='r15-style';
 style.textContent=[
 '@import url("https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap");',
 '#summary-app{font-family:Kanit,system-ui,sans-serif!important;background:#f6f8f7;color:#20352f}',
 '#summary-app *{box-sizing:border-box}',
 '#summary-app .summary-wrap{width:min(1160px,calc(100% - 36px));max-width:1160px!important;margin:0 auto!important}',
 '#summary-app .r15-hide,#summary-app .v9-hide{display:none!important}',
 '#summary-app .s-header{border-radius:20px!important;padding:20px 24px!important;margin:24px 0 16px!important}',
 '#summary-app .s-header .s-eyebrow{font-size:12px!important}',
 '#summary-app .s-header h1{font-size:30px!important;letter-spacing:-.03em!important}',
 '#summary-app .s-header .s-date{font-size:12px!important}',
 '#summary-app .v9-latest{border-radius:20px!important;padding:24px!important;margin-bottom:16px!important}',
 '#summary-app .v9-label{font-size:12px!important}',
 '#summary-app .v9-head strong{font-size:42px!important}',
 '#summary-app .v9-head>div:last-child strong{font-size:35px!important}',
 '#summary-app .v9-grid{gap:12px!important}',
 '#summary-app .v9-grid>div{padding:14px!important;border:1px solid #e4eeea!important}',
 '#summary-app .v9-grid small{font-size:12px!important}',
 '#summary-app .v9-grid b{font-size:19px!important}',
 '#summary-app .v9-scan{margin-top:18px!important}',
 '#summary-app .v9-scan summary{font-size:14px!important}',
 '#summary-app .v14-coach-goal{display:block!important;margin-bottom:20px!important}',
 '#summary-app .v14-coach-goal>.at-trainer{width:100%!important;max-width:none!important;margin:0!important}',
 '#summary-app .v14-coach-goal .at-trainer>.s-goal-progress-section{margin:14px 0!important;padding:18px!important;background:#f7faf8!important;border:1px solid #dce9e2!important;border-radius:16px!important;box-shadow:none!important}',
 '#summary-app .v14-coach-goal .at-trainer>.s-goal-progress-section .s-goal-section-head h2{font-size:20px!important}',
 '#summary-app .v14-coach-goal .at-trainer>.s-goal-progress-section .s-goal-remaining-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important}',
 '#summary-app .v14-coach-goal .at-trainer>.s-goal-progress-section .s-goal-remaining-card{background:#fff!important;min-width:0!important}',
 '#summary-app .v14-coach-goal .at-trainer>.s-goal-progress-section .v9-advanced{background:#fff!important}',
 '@media(max-width:650px){#summary-app .v14-coach-goal .at-trainer>.s-goal-progress-section .s-goal-remaining-grid{grid-template-columns:1fr!important}}',
 '#summary-app .v14-coach-goal{display:block!important;grid-template-columns:none!important;width:100%!important;min-width:0!important;margin-bottom:20px!important}',
 '#summary-app .v14-coach-goal>.at-trainer,#summary-app .v14-coach-goal>.s-goal-progress-section{border:1px solid #dfe9e5!important;background:#fff!important;border-radius:20px!important;padding:22px!important;box-shadow:none!important}',
 '#summary-app .at-head h2{font-size:24px!important}',
 '#summary-app .at-eyebrow,#summary-app .s-goal-section-head p{font-size:12px!important;letter-spacing:.06em!important}',
 '#summary-app .at-phases span{font-size:11px!important}',
 '#summary-app .at-action{padding:18px!important;border-radius:14px!important;margin:16px 0!important}',
 '#summary-app .at-action strong{font-size:18px!important;line-height:1.65!important}',
 '#summary-app .r15-secondary-stats{display:none!important}',
 '#summary-app .r15-coach-reason{font-size:12px!important;line-height:1.6!important;color:#536b60!important}',
 '#summary-app .v9-insight{padding:15px!important;border-radius:13px!important}',
 '#summary-app .v9-plan{padding:17px!important;border-radius:14px!important}',
 '#summary-app .v9-plan-grid{gap:14px!important}',
 '#summary-app .v9-plan-grid strong{font-size:16px!important}',
 '#summary-app .s-goal-section-head h2{font-size:22px!important}',
 '#summary-app .v14-goal-panel .s-goal-remaining-grid{grid-template-columns:1fr!important}',
 '#summary-app .v14-goal-panel .s-goal-remaining-card{padding:15px!important}',
 '#summary-app .v14-goal-panel .v9-advanced{border-radius:13px!important;margin-top:14px!important}',
 '#summary-app .r15-performance .r15-performance-content,#summary-app .r15-performance .r17-trend-full,#summary-app .r15-performance .r17-chart-root{display:block!important;width:100%!important;max-width:none!important;min-width:0!important;float:none!important;position:static!important;margin-left:0!important;margin-right:0!important}',
 '#summary-app .r15-performance .r17-trend-full{grid-column:1/-1!important;flex:1 1 100%!important;overflow:visible!important}',
 '#summary-app .r15-performance .r17-period-bar{display:flex!important;width:100%!important;justify-content:flex-start!important;align-items:center!important;flex-wrap:wrap!important;margin:0 0 16px!important;padding:0!important}',
 '#summary-app .r15-performance .r17-period-bar .s-range-controls{display:flex!important;flex-wrap:wrap!important;width:auto!important;gap:8px!important;position:static!important}',
 '#summary-app .r15-performance .tr2-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important}',
 '#summary-app .r15-performance .tr2-card{display:block!important;width:100%!important;max-width:none!important;min-width:0!important}',
 '#summary-app .r15-performance canvas{max-width:100%!important}',
 '#summary-app .r17-phase-info{padding:17px;margin:15px 0;border:1px solid #dce9e2;border-radius:14px;background:#f5faf7}',
 '#summary-app .r17-phase-header{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap}',
 '#summary-app .r17-phase-header strong{font-size:15px}',
 '#summary-app .r17-phase-header span{font-size:11px;color:#698579}',
 '#summary-app .r17-phase-numbers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}',
 '#summary-app .r17-phase-numbers>div{background:#fff;border:1px solid #e5eee9;border-radius:10px;padding:12px}',
 '#summary-app .r17-phase-numbers small{display:block;color:#73847a;font-size:11px}',
 '#summary-app .r17-phase-numbers b{display:block;font-size:21px;color:#205f50;margin:3px 0}',
 '#summary-app .r17-phase-info p{font-size:11px;color:#6d8479;line-height:1.7;margin:12px 0 0}',
 '@media(max-width:700px){#summary-app .r15-performance .tr2-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}#summary-app .r17-phase-numbers{grid-template-columns:1fr}#summary-app .r15-performance .r17-period-bar{align-items:flex-start!important}}',
 '#summary-app .r16-legacy-weekly,#summary-app .at-numbers,#summary-app .at-review{display:none!important}',
 '#summary-app .r15-performance .s-trend-head{display:none!important}',
 '#summary-app .r15-performance .s-period-selector{margin:0 0 16px!important;display:flex!important;gap:12px!important;align-items:center;flex-wrap:wrap}',
 '#summary-app .r15-performance .tr2-root{margin-top:12px!important}',
 '#summary-app .r15-performance .tr2-summary{background:#f7faf8!important;border:1px solid #e1eae5!important;padding:17px!important}',
 '#summary-app .r15-performance .tr2-grid{gap:12px!important}',
 '#summary-app .r15-performance .tr2-metric{background:#fff!important;border:1px solid #e5ece9!important;border-radius:12px!important;padding:14px!important}',
 '#summary-app .r15-performance .tr2-metric b{font-size:21px!important}',
 '#summary-app .r15-performance .tr2-head{font-size:13px!important}',
 '#summary-app .r15-performance{background:#fff;border:1px solid #dfe9e5;border-radius:20px;padding:24px;margin:0 0 20px}',
 '#summary-app .r15-section-heading{margin-bottom:18px}',
 '#summary-app .r15-section-heading small{font-size:11px;color:#2b8a69;font-weight:700;letter-spacing:.09em}',
 '#summary-app .r15-section-heading h2{font-size:26px;font-weight:700;margin:4px 0}',
 '#summary-app .r15-section-heading p{font-size:13px;color:#778a80;margin:0}',
 '#summary-app .r15-performance .s-weekly-checkpoint{box-shadow:none!important;border-radius:14px!important}',
 '#summary-app .r15-performance .s-trend-card{border:0!important;box-shadow:none!important;padding:0!important}',
 '#summary-app .r15-performance .tr2-card{border-radius:14px!important}',
 '#summary-app .r15-history{border:1px solid #dfe9e5!important;border-radius:16px!important;background:#fff!important;padding:15px!important;margin-bottom:20px!important}',
 '@media(max-width:900px){#summary-app .v14-coach-goal{grid-template-columns:1fr!important}}',
 '@media(max-width:600px){#summary-app .summary-wrap{width:calc(100% - 20px)}#summary-app .s-header{margin-top:10px!important;padding:15px!important}#summary-app .s-header h1{font-size:23px!important}#summary-app .v9-latest,#summary-app .r15-performance{padding:15px!important}#summary-app .v9-head strong{font-size:32px!important}#summary-app .v9-head>div:last-child strong{font-size:27px!important}#summary-app .v9-grid>div{padding:8px!important}#summary-app .v9-grid b{font-size:14px!important}#summary-app .v9-grid small{font-size:10px!important}#summary-app .v14-coach-goal>.at-trainer,#summary-app .v14-coach-goal>.s-goal-progress-section{padding:15px!important}#summary-app .r15-section-heading h2{font-size:21px!important}}'
 ].join('');document.head.appendChild(style);
 [600,1300,2400,4200].forEach(t=>setTimeout(render,t));
 document.addEventListener('click',e=>{if(e.target.closest?.('#summary-app .s-range-controls button,#summary-app .s-weekly-checkpoint'))setTimeout(render,250);});
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();