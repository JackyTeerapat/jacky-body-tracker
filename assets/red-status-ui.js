(() => {
  function apply() {
    const data=window.__JACKY_TRACKER__?.DATA;
    const evalFn=window.JackyRedEvaluator;
    const card=document.querySelector('#summary-app .s-weekly-coach');
    if(!Array.isArray(data) || typeof evalFn!=='function' || !card) return;

    const r=evalFn(data);
    let line=card.querySelector('.s-red-status-line');
    if(!line){
      line=document.createElement('div');
      line.className='s-red-status-line';
      line.style.marginTop='8px';
      line.style.fontSize='9px';
      line.style.fontWeight='800';
      line.style.color='#667477';
      card.appendChild(line);
    }
    line.textContent='RED CHECK: Gate 1 '+(r.gate1?'PASS':'WAIT')+' · Gate 2 '+(r.waterGate?'PASS':'WAIT');

    if(r.triggered){
      card.classList.remove('green','yellow');
      card.classList.add('red');
      const h=card.querySelector('.s-coach-copy h2');
      if(h) h.textContent='🔴 Red';
    }
  }
  [650,1400,2600,4200].forEach(ms=>setTimeout(apply,ms));
})();