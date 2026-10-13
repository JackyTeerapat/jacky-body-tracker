(()=>{
const S=window.__JACKY_TRACKER__;if(!S?.DATA?.length)return;
const D=S.DATA.filter(x=>x?.isoDate).slice().sort((a,b)=>a.isoDate.localeCompare(b.isoDate)),d=D.at(-1),p=D.at(-2);
const f=(x,k=1)=>Number.isFinite(+x)?(+x).toFixed(k):'—';
const dif=(a,b)=>Number.isFinite(+a)&&Number.isFinite(+b)?((a-b)>0?'+':'')+(a-b).toFixed(1):'—';
const txt=x=>String(x??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function update(){
const w=document.querySelector('#summary-app .summary-wrap');if(!w)return;
let hero=w.querySelector('.v9-latest');
if(!hero){hero=document.createElement('section');hero.className='v9-latest';w.prepend(hero);}
if(!hero.dataset.ready){
hero.innerHTML='<div class="v9-label">JACKY BODY TRACKER · ผลชั่งล่าสุด</div><div class="v9-head"><div><strong>'+f(d.weight)+' <small>kg</small></strong><div class="v9-muted">'+txt(d.isoDate)+' · '+dif(d.weight,p?.weight)+' kg จากครั้งก่อน</div></div><div><small>Body Fat</small><strong>'+f(d.bf)+'%</strong><small>'+dif(d.bf,p?.bf)+' จุด</small></div></div>'+
'<div class="v9-grid">'+[['ไขมัน',d.fat,'kg'],['กล้ามเนื้อ',d.muscle,'kg'],['น้ำในร่างกาย',d.waterWeight,'kg']].map(a=>'<div><small>'+a[0]+'</small><b>'+f(a[1])+' '+a[2]+'</b></div>').join('')+'</div>'+
'<details class="v9-scan"><summary>รายละเอียดผลสแกนล่าสุด ▾</summary><div class="v9-grid">'+[['BMI',d.bmi,''],['มวลไร้ไขมัน',d.fatFreeMass,'kg'],['กล้ามโครงร่าง',d.skeletalMuscle,'kg'],['ไขมันช่องท้อง',d.vis,''],['BMR',d.bmr,'kcal'],['Bone Mass',d.boneMass,'kg'],['Protein Mass',d.proteinMass,'kg'],['ASMI',d.asmi,''],['WHR',d.whr,'']].map(a=>'<div><small>'+a[0]+'</small><b>'+f(a[1],a[0]==='BMR'?0:1)+' '+a[2]+'</b></div>').join('')+'</div><p class="v9-muted">BIA ใช้ติดตามแนวโน้ม ไม่ใช่การวัดมวลไขมัน/กล้ามโดยตรง</p></details>';hero.dataset.ready='1';
}
const trainer=w.querySelector('.at-trainer'),goal=w.querySelector('.s-goal-progress-section'),ffmi=w.querySelector('.s-ffmi-section');
if(!trainer||!goal)return;
w.prepend(hero);hero.insertAdjacentElement('afterend',trainer);trainer.insertAdjacentElement('afterend',goal);
w.querySelector('.s-this-week-preview')?.classList.add('v9-hide');
const sm=d.sm||{},arm=Math.abs((+sm.ra||0)-(+sm.la||0)),leg=Math.abs((+sm.rl||0)-(+sm.ll||0));
let insight=trainer.querySelector('.v9-insight');if(!insight){insight=document.createElement('section');insight.className='v9-insight';(trainer.querySelector('.at-action')||trainer).insertAdjacentElement('afterend',insight);}
insight.innerHTML='<b>วิเคราะห์กล้ามเนื้อรายส่วน</b><p>'+(arm<.2&&leg<.3?'แขนและขาทั้งสองข้างค่อนข้างสมดุลตามค่า BIA':'พบค่ากล้ามสองข้างต่างกัน ควรตรวจแนวโน้มและแรงยกก่อนปรับการฝึก')+' · แขนต่าง '+f(arm)+' kg · ขาต่าง '+f(leg)+' kg</p><small>ไม่สั่งเพิ่มเซตจากผล BIA ครั้งเดียว และไม่ใช้ไขมันเฉพาะจุดสั่งท่าออกกำลังกาย</small>';
trainer.querySelector('.at-review')?.remove();
let plan=trainer.querySelector('.v9-plan');if(!plan){plan=document.createElement('section');plan.className='v9-plan';plan.innerHTML='<b>แผนสัปดาห์นี้ · เป้าหมายเริ่มต้น</b><div class="v9-plan-grid">'+[['Cardio Zone 2','250 นาที/สัปดาห์'],['Protein','150 g/วัน'],['Carbs','230 g/วัน'],['Fat','70 g/วัน'],['Calories','2,150 kcal/วัน']].map(x=>'<div><span>'+x[0]+'</span><strong>'+x[1]+'</strong></div>').join('')+'</div><small>เป้าหมายอาหารสำหรับประเมินเบื้องต้น ยังไม่ได้ยืนยันว่ากินจริง · 150×4 + 230×4 + 70×9 = 2,150 kcal</small>';insight.insertAdjacentElement('afterend',plan);}

let compliance=trainer.querySelector('.v9-compliance');if(!compliance){compliance=document.createElement('div');compliance.className='v9-compliance';compliance.innerHTML='<b>สัปดาห์ที่แล้วทำตามแผนหรือไม่?</b><div><button type="button" data-answer="yes">ทำครบ</button><button type="button" data-answer="no">ทำไม่ครบ</button></div><p class="v9-response">เลือกเพื่อดูคำแนะนำที่เหมาะสม (ยังไม่บันทึก)</p>';trainer.appendChild(compliance);compliance.addEventListener('click',e=>{const b=e.target.closest('button[data-answer]');if(!b)return;compliance.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));try{localStorage.setItem('jacky-trainer-compliance:'+d.isoDate.slice(0,7)+':'+d.isoDate.slice(8),b.dataset.answer)}catch(_){}compliance.querySelector('.v9-response').textContent=b.dataset.answer==='yes'?'ทำครบ: ถ้าผลยังช้ากว่าเป้าต่อเนื่อง จึงค่อยปรับอาหารหรือ Cardio ทีละอย่าง':'ทำไม่ครบ: กลับไปทำแผนเดิมให้ครบก่อน ยังไม่ต้องเพิ่มความหนักหรือลดแคลอรีเพิ่ม';});}
if(ffmi){let advanced=w.querySelector('.v9-advanced');if(!advanced){advanced=document.createElement('details');advanced.className='v9-advanced';advanced.innerHTML='<summary>FFMI · Muscle Roadmap (กดดูเพิ่มเติม)</summary><div class="v9-advanced-inner"></div>';}advanced.querySelector('.v9-advanced-inner').appendChild(ffmi);goal.insertAdjacentElement('afterend',advanced);}
}
function start(){
const style=document.createElement('style');style.textContent=[
'#summary-app .v9-latest{background:#fff;border:1px solid #dbe7e1;border-radius:18px;padding:16px;margin-bottom:13px}',
'#summary-app .v9-label{font-size:10px;font-weight:850;color:#4e8a71;letter-spacing:.08em}',
'#summary-app .v9-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:10px 0 15px}',
'#summary-app .v9-head>div:last-child{text-align:right}',
'#summary-app .v9-head strong{display:block;font-size:30px;line-height:1.2}',
'#summary-app .v9-head strong small{font-size:14px}',
'#summary-app .v9-head>div:last-child strong{font-size:25px;color:#ed816e}',
'#summary-app .v9-head small,#summary-app .v9-muted{font-size:10px;color:#778781}',
'#summary-app .v9-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}',
'#summary-app .v9-grid>div{background:#f3f7f5;border-radius:10px;padding:10px}',
'#summary-app .v9-grid small{display:block;font-size:10px;color:#73847c}',
'#summary-app .v9-grid b{display:block;font-size:14px;margin-top:4px}',
'#summary-app .v9-scan{border-top:1px solid #e6ede9;margin-top:13px;padding-top:12px}',
'#summary-app .v9-scan summary,#summary-app .v9-advanced summary{cursor:pointer;font-size:12px;font-weight:850;color:#346a53}',
'#summary-app .v9-scan .v9-grid{margin-top:12px}',
'#summary-app .v9-hide{display:none!important}',
'#summary-app .v9-insight{margin:12px 0;border:1px solid #daebe1;border-radius:11px;padding:12px;background:#f5faf7}',
'#summary-app .v9-insight b,#summary-app .v9-compliance b{font-size:12px}',
'#summary-app .v9-insight p,#summary-app .v9-insight small,#summary-app .v9-compliance p{font-size:11px;line-height:1.6}',
'#summary-app .v9-insight small{color:#74867d}',
'#summary-app .v9-plan{background:#f8faf9;border:1px solid #dcebe2;border-radius:12px;padding:12px;margin:12px 0}', '#summary-app .v9-plan>b{font-size:12px}', '#summary-app .v9-plan-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:10px 0}', '#summary-app .v9-plan-grid div{display:flex;justify-content:space-between;gap:6px;font-size:11px}', '#summary-app .v9-plan small{font-size:10px;color:#78877e}',
'#summary-app .v9-compliance{border-top:1px solid #e5ece8;padding-top:12px;margin-top:12px}',
'#summary-app .v9-compliance button{margin:8px 8px 0 0;padding:9px 16px;border:1px solid #cfe1d7;border-radius:9px;background:#fff;cursor:pointer;font-weight:800;font-size:12px}',
'#summary-app .v9-compliance button.on{background:#daf2e5;border-color:#5ba981}',
'#summary-app .v9-advanced{background:#fff;border:1px solid #dce8e2;border-radius:16px;padding:14px;margin-bottom:13px}',
'#summary-app .v9-advanced-inner{padding-top:12px}',
'@media(max-width:600px){#summary-app .v9-latest{padding:12px}#summary-app .v9-head strong{font-size:26px}#summary-app .v9-grid{gap:5px}#summary-app .v9-grid>div{padding:7px}#summary-app .v9-grid b{font-size:12px}}'
].join('');document.head.appendChild(style);
[600,1400,2700,4300].forEach(ms=>setTimeout(update,ms));
document.addEventListener('click',e=>{if(e.target.closest?.('#summary-app .s-range-controls button,#summary-app .s-weekly-checkpoint'))setTimeout(update,300);});
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();