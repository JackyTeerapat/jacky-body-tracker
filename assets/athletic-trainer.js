(() => {
 const D=86400000,dt=s=>new Date(s+'T00:00:00Z'),iso=x=>x.toISOString().slice(0,10);
 const shift=(d,n)=>new Date(d.getTime()+n*D);
 const mon=s=>{let d=dt(s),w=d.getUTCDay();return shift(d,w===0?-6:1-w);};
 const mean=a=>a.length?a.reduce((v,x)=>v+x,0)/a.length:null;
 const f=n=>Number.isFinite(n)?n.toFixed(2):'—';
 const sign=n=>Number.isFinite(n)?(n>0?'+':'')+f(n):'—';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function getWeeks(data){
  const rows=(data||[]).filter(x=>x?.isoDate&&Number.isFinite(Number(x.weight))).slice().sort((a,b)=>a.isoDate.localeCompare(b.isoDate));
  if(!rows.length)return {weeks:[],current:[]};
  const thisMon=mon(rows.at(-1).isoDate),weeks=[];
  for(let d=mon(rows[0].isoDate);d<thisMon;d=shift(d,7)){
   const start=iso(d),end=iso(shift(d,6)),r=rows.filter(x=>x.isoDate>=start&&x.isoDate<=end);
   if(r.length<4)continue;
   const heights=[...new Set(r.map(x=>Number(x.height)))];
   const a=k=>mean(r.map(x=>Number(x[k])).filter(Number.isFinite));
   weeks.push({start,end,days:r.length,weight:a('weight'),fat:a('fat'),muscle:a('muscle'),water:a('waterWeight'),height:heights.length===1?heights[0]:null});
  }
  return {weeks,current:rows.filter(x=>x.isoDate>=iso(thisMon))};
 }
 function slope(weeks){
  if(weeks.length<2)return null;
  const xx=weeks.map(w=>dt(w.start).getTime()/D/7),cx=mean(xx),cy=mean(weeks.map(w=>w.weight));
  const den=xx.reduce((z,x)=>z+(x-cx)**2,0);
  return den?xx.reduce((z,x,i)=>z+(x-cx)*(weeks[i].weight-cy),0)/den:null;
 }
 function assess(weeks){
  const now=weeks.at(-1);if(!now)return null;
  const recent=weeks.slice(-8),rate=slope(recent),prior=weeks.at(-2);
  const comparable=prior&&now.height!==null&&now.height===prior.height;
  const fatDelta=comparable?now.fat-prior.fat:null;
  const muscleDelta=comparable?now.muscle-prior.muscle:null;
  const era=[];for(let i=weeks.length-1;i>=0;i--){if(weeks[i].height===null||weeks[i].height!==now.height)break;era.unshift(weeks[i]);}
  const fatSlope=era.length>=2?(era.at(-1).fat-era[0].fat)/(era.length-1):null;
  const muscleSlope=era.length>=2?(era.at(-1).muscle-era[0].muscle)/(era.length-1):null;
  let label='ทบทวนแผน',title='',action='',reason='',id='',green=false;
  if(rate!==null&&rate<-.50 || muscleSlope!==null&&muscleSlope<-.25){
   id='PROTECT';title='รักษากล้ามก่อนเร่ง Cut';action='คงเวทและโปรตีน ตรวจแรงยกกับการฟื้นตัว อย่าเร่งลดอาหาร';reason='น้ำหนักลดเร็ว หรือกล้าม BIA มีแนวโน้มลด';
  }else if(fatSlope!==null&&fatSlope>.15){
   id='FAT';title='ไขมันสวนทางกับน้ำหนัก';action='บันทึกอาหารจริง 7 วัน วัดรอบเอว และคงเวท/คาร์ดิโอที่ฟื้นตัวได้';reason='แม้น้ำหนักอาจลด แต่แนวโน้มไขมัน BIA ภายใต้การตั้งค่าเดียวกันเพิ่ม';
  }else if(rate!==null&&rate<=-.30&&rate>=-.50){
   id='KEEP';green=true;label='ตามเป้าหมาย';title='คงแผน Cut';action='ทำแผนอาหารและการฝึกเดิมต่อ รักษาแรงยก ไม่ต้องเร่ง Cardio';reason='แนวโน้มน้ำหนักลดตามเป้า ไม่มีสัญญาณสวนทางจากข้อมูลที่เทียบกันได้';
  }else{
   id='AUDIT';title='ตรวจอาหารก่อนปรับแผน';action='เริ่มจดอาหาร น้ำมัน ของว่างและเครื่องดื่มครบ 7 วันตั้งแต่วันนี้; คงเวท';reason='แนวโน้มลดช้ากว่าเป้า หรือยังไม่ได้อธิบายด้วยข้อมูลที่มี';
  }
  return {now,prior,rate,fatDelta,muscleDelta,fatSlope,muscleSlope,recent:recent.length,id,label,title,action,reason,green};
 }
 function html(weeks,current){
  if(!weeks.length)return '';
  const d=assess(weeks),last=d.now;
  const h=weeks.map((week,i)=>{
   const currentDecision=assess(weeks.slice(0,i+1)),prev=i?assess(weeks.slice(0,i)):null;
   if(!currentDecision)return '';
   const outcome=prev?'น้ำหนักเฉลี่ยเปลี่ยน '+sign(week.weight-weeks[i-1].weight)+' kg'+(currentDecision.fatDelta===null?' · ค่า BIA ไม่เทียบข้าม calibration':' · ไขมัน BIA '+sign(currentDecision.fatDelta)+' kg'):'สัปดาห์แรก';
   return '<details class="at-log"><summary>'+esc(week.start)+' – '+esc(week.end)+' · '+(prev?.id===currentDecision.id?'คง A':'ทบทวน A → B')+'</summary><p><b>วิเคราะห์อิสระ:</b> '+esc(currentDecision.reason)+'</p><p><b>A ก่อนหน้า:</b> '+esc(prev?.action||'ไม่มี')+'</p><p><b>ผล:</b> '+esc(outcome)+'</p><p><b>ทำตามจริง:</b> ยังไม่มีข้อมูลยืนยัน</p><p><b>ตัดสินใจใหม่:</b> '+esc(currentDecision.action)+'</p></details>';
  }).slice(-6).reverse().join('');
  const fatContext=d.fatDelta===null?'สัปดาห์ก่อนเปลี่ยนการตั้งค่าเครื่อง จึงไม่เทียบค่า BIA ข้ามช่วง':'ไขมันเฉลี่ยเทียบสัปดาห์ก่อน '+sign(d.fatDelta)+' kg';
  return '<div class="at-head"><div><div class="at-eyebrow">PERSONAL TRAINER</div><h2>'+esc(d.title)+'</h2><small>ตรวจแนวโน้มย้อนหลัง '+d.recent+' สัปดาห์ · สรุปถึง '+last.end+'</small></div><span class="at-badge '+(d.green?'ok':'')+'">'+esc(d.label)+'</span></div>'
    +'<div class="at-phases"><span class="active">1 CUT</span><span>2 MAINTENANCE</span><span>3 LEAN BULK</span></div>'
    +'<div class="at-action"><small>สิ่งที่ควรทำตั้งแต่วันนี้</small><strong>'+esc(d.action)+'</strong></div>'
    +'<div class="at-numbers"><div><small>น้ำหนักเฉลี่ย</small><b>'+f(last.weight)+' kg</b><small>'+sign(d.rate)+' kg/สัปดาห์</small></div><div><small>ไขมัน BIA</small><b>'+f(last.fat)+' kg</b><small>'+(d.fatDelta===null?'เทียบสัปดาห์ก่อนไม่ได้ · ตั้งค่าเครื่องต่างกัน':sign(d.fatDelta)+' kg จากสัปดาห์ก่อน')+'</small></div><div><small>กล้าม BIA</small><b>'+f(last.muscle)+' kg</b><small>'+(d.muscleDelta===null?'เทียบสัปดาห์ก่อนไม่ได้ · ตั้งค่าเครื่องต่างกัน':sign(d.muscleDelta)+' kg จากสัปดาห์ก่อน')</small></div></div>'
    +'<p class="at-reason"><b>ทำไมถึงแนะนำแบบนี้:</b> '+esc(d.reason)+' · '+esc(fatContext)+'</p>'
    +'<details class="at-review"><summary>ดูการทบทวนคำแนะนำ A → B และข้อมูลย้อนหลัง</summary><p class="at-caveat">เป็นการจำลองการตัดสินใจย้อนหลังด้วยกฎปัจจุบัน ไม่ใช่ประวัติคำแนะนำที่เคยให้จริง และยังไม่ทราบว่าทำตามหรือไม่</p>'+h+'</details>';
 }
 function render(){
  const wrap=document.querySelector('#summary-app .summary-wrap'),point=wrap?.querySelector('.s-weekly-checkpoint'),data=window.__JACKY_TRACKER__?.DATA;
  if(!wrap||!point||!Array.isArray(data))return;
  const result=getWeeks(data),content=html(result.weeks,result.current);if(!content)return;
  let card=wrap.querySelector('.at-trainer');if(!card){card=document.createElement('section');card.className='at-trainer';}
  card.innerHTML=content;point.insertAdjacentElement('beforebegin',card);
 }
 function boot(){
  const css=document.createElement('style');css.textContent=[
  '#summary-app .s-weekly-coach,#summary-app .s-coach-feedback{display:none!important}',
  '#summary-app .at-trainer{background:#fff;border:1px solid #dce6e1;border-radius:18px;padding:16px;margin:0 0 13px;color:#243631}',
  '#summary-app .at-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}',
  '#summary-app .at-eyebrow{font-size:10px;letter-spacing:.08em;color:#568272;font-weight:800}',
  '#summary-app .at-head h2{font-size:19px;line-height:1.3;margin:5px 0;font-weight:900}',
  '#summary-app .at-head small,#summary-app .at-reason{font-size:11px;color:#667a72;line-height:1.6}',
  '#summary-app .at-badge{font-size:10px;white-space:nowrap;padding:6px 9px;border-radius:20px;background:#fff0d8;color:#8d6424;font-weight:800}',
  '#summary-app .at-badge.ok{background:#e2f5ea;color:#14694b}',
  '#summary-app .at-phases{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:14px 0}',
  '#summary-app .at-phases span{text-align:center;padding:10px 4px;border-radius:9px;background:#f1f4f2;color:#87948e;font-size:10px;font-weight:800}',
  '#summary-app .at-phases .active{background:#dcefe5;color:#176b4e}',
  '#summary-app .at-action{border:1px solid #cfe8dc;background:#f2faf5;padding:13px;border-radius:12px}',
  '#summary-app .at-action small,#summary-app .at-numbers small{display:block;font-size:10px;color:#6b8178}',
  '#summary-app .at-action strong{display:block;font-size:14px;line-height:1.5;margin-top:5px}',
  '#summary-app .at-numbers{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:12px 0}',
  '#summary-app .at-numbers>div{padding:10px;border:1px solid #e6eeea;border-radius:11px;min-width:0}',
  '#summary-app .at-numbers b{display:block;font-size:15px;margin:5px 0}',
  '#summary-app .at-review{border-top:1px solid #e5ece8;padding-top:11px;margin-top:10px}',
  '#summary-app .at-review summary{font-size:12px;font-weight:800;cursor:pointer}',
  '#summary-app .at-log{border-bottom:1px solid #ecf0ed;padding:8px 0}',
  '#summary-app .at-log summary,#summary-app .at-log p,#summary-app .at-caveat{font-size:11px;line-height:1.6}',
  '#summary-app .at-caveat{color:#9c7123}',
  '@media(max-width:650px){#summary-app .at-trainer{padding:12px}#summary-app .at-head h2{font-size:16px}#summary-app .at-numbers>div{padding:7px}#summary-app .at-numbers b{font-size:13px}}'
  ].join('');document.head.appendChild(css);
  [450,1100,2300,3500].forEach(t=>setTimeout(render,t));
  document.addEventListener('click',e=>{if(e.target.closest?.('#summary-app .s-weekly-checkpoint,#summary-app .s-range-controls button'))setTimeout(render,280);});
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();