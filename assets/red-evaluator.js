(() => {
  const DAY=86400000;
  const day=s=>new Date(s+'T00:00:00Z');
  const iso=d=>d.toISOString().slice(0,10);
  const shift=(d,n)=>new Date(d.getTime()+n*DAY);
  const avg=x=>x.length?x.reduce((a,b)=>a+b,0)/x.length:null;
  const monday=s=>{const d=day(s),n=d.getUTCDay();return shift(d,-(n===0?6:n-1));};
  // Context is deliberately opt-in: never assume poor recovery or performance from BIA.
  window.JackyRedEvaluator=function(data,context={}){
    const rows=(data||[]).filter(x=>x?.isoDate).slice().sort((a,b)=>a.isoDate.localeCompare(b.isoDate));
    if(!rows.length)return {triggered:false,gate1:false,waterGate:false,reason:'no rows'};
    const current=monday(rows.at(-1).isoDate), weeks=[];
    for(let s=monday(rows[0].isoDate);s<current;s=shift(s,7)){
      const end=shift(s,6),rr=rows.filter(x=>x.isoDate>=iso(s)&&x.isoDate<=iso(end));
      if(rr.length<4)continue;
      const h=[...new Set(rr.map(x=>Number(x.height)))];
      weeks.push({start:iso(s),end:iso(end),height:h.length===1?h[0]:null,muscle:avg(rr.map(x=>Number(x.muscle)).filter(Number.isFinite)),water:avg(rr.map(x=>Number(x.waterWeight)).filter(Number.isFinite))});
    }
    const era=[];
    if(weeks.length&&weeks.at(-1).height!==null){
      for(let i=weeks.length-1;i>=0;i--){
        const w=weeks[i];if(w.height!==weeks.at(-1).height||w.height===null)break;era.unshift(w);
      }
    }
    const baselineWeeks=era.slice(0,Math.max(0,era.length-2));
    const baseline=baselineWeeks.length>=2?{muscle:avg(baselineWeeks.map(w=>w.muscle)),water:avg(baselineWeeks.map(w=>w.water))}:null;
    const lastTwo=era.slice(-2).filter(Boolean);
    const gate1=!!baseline&&lastTwo.length===2&&lastTwo.every(w=>baseline.muscle-w.muscle>=0.5);
    const waterGate=!!baseline&&lastTwo.length===2&&lastTwo.every(w=>baseline.water-w.water<(baseline.muscle-w.muscle)*0.5);
    const corroborated=!!(context.performanceDecline&&context.recoveryConcern);
    return {triggered:gate1&&waterGate&&corroborated,gate1,waterGate,corroborated,baseline,weeks,latest:lastTwo.at(-1)||null,reason:!baseline?'await comparable completed weeks':!corroborated?'await independent performance and recovery corroboration':'evaluated'};
  };
})();