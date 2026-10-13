(()=>{
function lastWeekKey(){
 const data=window.__JACKY_TRACKER__?.DATA||[];
 const last=data.filter(x=>x?.isoDate).map(x=>x.isoDate).sort().at(-1);
 if(!last)return 'unknown';
 const t=new Date(last+'T00:00:00Z'),dow=(t.getUTCDay()+6)%7;
 t.setUTCDate(t.getUTCDate()-dow-7);
 return t.toISOString().slice(0,10);
}
const misses=[['cardio','Cardio Zone 2'],['protein','Protein'],['weights','Weight Training'],['calories','Calories / อาหาร']];
function apply(){
 const trainer=document.querySelector('#summary-app .at-trainer');
 const slot=trainer?.querySelector('.v9-compliance');
 if(!slot||slot.dataset.revised==='1')return;
 const key='jacky-trainer-adherence-v2:'+lastWeekKey();
 const oldKey='jacky-trainer-compliance:'+lastWeekKey();
 let saved={status:null,missed:[]};
 try{
  const v=JSON.parse(localStorage.getItem(key)||'null');
  if(v&&['yes','no'].includes(v.status)){saved.status=v.status;saved.missed=Array.isArray(v.missed)?v.missed:[];}
  else {const legacy=localStorage.getItem(oldKey);if(legacy==='yes'||legacy==='no')saved.status=legacy;}
 }catch(_){}
 slot.dataset.revised='1';slot.classList.add('v20-adherence');
 slot.innerHTML='<div class="v20-top"><div><b>สัปดาห์ที่แล้วทำตามแผนหรือไม่?</b><small>บันทึกการทำตามแผน เพื่อให้ Trainer แนะนำได้เหมาะขึ้น</small></div><span class="v20-tag">สัปดาห์ '+lastWeekKey()+'</span></div><div class="v20-options" role="group" aria-label="การทำตามแผน"><button type="button" data-a="yes">✓ ทำครบตามแผน</button><button type="button" data-a="no">ทำไม่ครบ</button></div><div class="v20-detail" aria-live="polite"></div>';
 const options=slot.querySelector('.v20-options'),details=slot.querySelector('.v20-detail');
 function save(){try{localStorage.setItem(key,JSON.stringify(saved));}catch(_){}}
 function draw(){
  options.querySelectorAll('button').forEach(b=>{const on=b.dataset.a===saved.status;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  if(saved.status==='yes'){
    details.innerHTML='<div class="v20-advice"><b>Trainer แนะนำ</b><p>ทำตามแผนได้ครบแล้ว ให้ติดตามน้ำหนักเฉลี่ย แรงยก และการฟื้นตัว หากผลช้ากว่าเป้าต่อเนื่องค่อยปรับอาหารหรือ Cardio ทีละอย่าง</p></div>';
  }else if(saved.status==='no'){
    details.innerHTML='<div class="v20-missed"><b>ส่วนไหนที่ทำไม่ครบ?</b><div class="v20-checks">'+misses.map(([id,label])=>'<label><input type="checkbox" data-miss="'+id+'" '+(saved.missed.includes(id)?'checked':'')+'><span>'+label+'</span></label>').join('')+'</div></div><div class="v20-advice"><b>Trainer แนะนำ</b><p>'+(saved.missed.length?'กลับมาทำส่วนที่ขาดให้ครบก่อน: '+misses.filter(([id])=>saved.missed.includes(id)).map(x=>x[1]).join(', ')+' · ยังไม่ต้องเร่งลดแคลอรีหรือเพิ่ม Cardio':'เลือกส่วนที่ทำไม่ครบ เพื่อให้คำแนะนำตรงกับสิ่งที่พลาด · ยังไม่ควรเพิ่มความหนักหรือเร่งลดแคลอรี')+'</p></div>';
  }else{details.innerHTML='<p class="v20-hint">เลือกผลการทำตามแผนด้านบน (ยังไม่ได้ประเมิน)</p>';}
 }
 options.addEventListener('click',e=>{const b=e.target.closest('button[data-a]');if(!b)return;saved.status=b.dataset.a;if(saved.status==='yes')saved.missed=[];save();draw();});
 details.addEventListener('change',e=>{const input=e.target.closest('input[data-miss]');if(!input)return;const id=input.dataset.miss;saved.missed=input.checked?[...new Set([...saved.missed,id])]:saved.missed.filter(x=>x!==id);save();draw();});
 draw();
}
function boot(){
 const style=document.createElement('style');style.id='v20-adherence-css';style.textContent=[
 '#summary-app .v20-adherence{border-top:1px solid #e1eae6!important;padding-top:20px!important;margin-top:20px!important}',
 '#summary-app .v20-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}',
 '#summary-app .v20-top b{display:block;font-size:17px!important;color:#243e32}',
 '#summary-app .v20-top small{display:block;margin-top:5px;font-size:12px;color:#6d8077}',
 '#summary-app .v20-tag{font-size:11px;background:#f2f7f4;border-radius:999px;padding:5px 9px;color:#587365;white-space:nowrap}',
 '#summary-app .v20-options{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}',
 '#summary-app .v20-options button{margin:0!important;padding:13px 14px!important;border-radius:12px!important;border:1px solid #cfded5!important;background:#fff!important;font:600 14px Kanit,system-ui,sans-serif!important;color:#416455!important;cursor:pointer}',
 '#summary-app .v20-options button.active{background:#e5f5eb!important;border:2px solid #339871!important;color:#136144!important}',
 '#summary-app .v20-detail{margin-top:13px}',
 '#summary-app .v20-missed{padding:15px;background:#f8faf9;border-radius:12px;border:1px solid #dfe8e2}',
 '#summary-app .v20-missed>b{display:block;font-size:14px;margin-bottom:11px}',
 '#summary-app .v20-checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
 '#summary-app .v20-checks label{display:flex;gap:9px;align-items:center;padding:9px 10px;background:white;border:1px solid #e1eae6;border-radius:9px;font-size:13px;cursor:pointer}',
 '#summary-app .v20-checks input{width:16px;height:16px;accent-color:#248968;flex:none}',
 '#summary-app .v20-advice{padding:13px 15px;margin-top:12px;background:#ecf6f0;border-radius:12px;color:#305c48}',
 '#summary-app .v20-advice b{font-size:13px}',
 '#summary-app .v20-advice p{font-size:12px;line-height:1.75;margin:5px 0 0}',
 '#summary-app .v20-hint{font-size:12px;color:#79867d}',
 '@media(max-width:580px){#summary-app .v20-options{grid-template-columns:1fr}#summary-app .v20-checks{grid-template-columns:1fr}#summary-app .v20-top{flex-direction:column}#summary-app .v20-tag{font-size:10px}}'
 ].join('');document.head.appendChild(style);
 [750,1600,2900,4500].forEach(t=>setTimeout(apply,t));
 document.addEventListener('click',e=>{if(e.target.closest?.('#summary-app .s-weekly-checkpoint,#summary-app .s-range-controls button'))setTimeout(apply,350);});
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();