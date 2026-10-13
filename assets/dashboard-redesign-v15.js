(()=>{
const q=(s,r=document)=>r.querySelector(s);
function render(){
 const w=q('#summary-app .summary-wrap');if(!w)return;
 const head=q('.s-header',w),scan=q('.v9-latest',w),pair=q('.v14-coach-goal',w),weekly=q('.s-weekly-checkpoint',w),trend=q('.s-trend-card',w),history=q('.s-history',w);
 if(!head||!scan||!pair)return;
 w.classList.add('r15-layout');
 w.prepend(head);head.insertAdjacentElement('afterend',scan);scan.insertAdjacentElement('afterend',pair);
 // Single trainer recommendation; weekly numbers live in Weekly Performance.
 const trainer=q('.at-trainer',pair),goal=q('.s-goal-progress-section',pair);
 if(trainer){
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
 if(!performance){performance=document.createElement('section');performance.className='r15-performance';performance.innerHTML='<div class="r15-section-heading"><div><small>PROGRESS ANALYTICS</small><h2>Weekly Performance</h2><p>ค่าเฉลี่ยและแนวโน้มย้อนหลัง — แยกจากผลชั่งรายวัน</p></div></div><div class="r15-performance-content"></div>';}
 pair.insertAdjacentElement('afterend',performance);
 const area=q('.r15-performance-content',performance);
 if(weekly&&weekly.parentElement!==area)area.appendChild(weekly);
 if(trend&&trend.parentElement!==area)area.appendChild(trend);
 // Independent trend builders may inject controls outside .s-trend-card.
 const controls=q('.s-range-controls',w);
 const trendContainer=controls?.closest('.s-trend-card');
 if(trendContainer&&trendContainer.parentElement!==area)area.appendChild(trendContainer);
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
 '#summary-app .v14-coach-goal{display:grid!important;grid-template-columns:minmax(0,1.7fr) minmax(300px,1fr)!important;align-items:start!important;gap:16px!important;margin-bottom:20px!important}',
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