(()=>{
'use strict';
// Weekly review: completed weeks, daily deduplication and conservative adjustments.
const N=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const f=(x,n=2)=>Number.isFinite(x)?x.toFixed(n):'—';
const signed=(x,n=2)=>Number.isFinite(x)?(x>0?'+':'')+x.toFixed(n):'—';
const pad=x=>String(x).padStart(2,'0');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dt=s=>new Date(s+'T00:00:00Z');
const iso=d=>d.toISOString().slice(0,10);
const add=(date,days)=>iso(new Date(dt(date).getTime()+days*86400000));
const mon=date=>add(date,-(dt(date).getUTCDay()+6)%7);
const stamp=s=>{const[y,m,d]=s.split('-');return d+'/'+m+'/'+y;};
const today=()=>new Date(Date.now()+7*3600000).toISOString().slice(0,10);
const TARGET={weightMin:.30,weightMax:.50,muscleFloor:0,firstWeekCardioMinutes:10,cardioDays:4};
function weeks(input){
 const unique=new Map();
 (input||[]).filter(x=>x?.isoDate).forEach(row=>{
  const prev=unique.get(row.isoDate);
  if(!prev||String(row.measuredAt||'')>=String(prev.measuredAt||''))unique.set(row.isoDate,row);
 });
 const by=new Map();
 [...unique.values()].forEach(row=>{
  const start=mon(row.isoDate);
  if(!by.has(start))by.set(start,[]);
  by.get(start).push(row);
 });
 return [...by.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([start,list])=>{
  const a=k=>mean(list.map(x=>N(x[k])).filter(x=>x!==null));
  const heights=[...new Set(list.map(x=>N(x.height)).filter(x=>x!==null))];
  const end=add(start,6);
  return {start,end,count:list.length,closed:end<today()||(end===today()&&list.some(x=>x.isoDate===end)),height:heights.length===1?heights[0]:null,
   heightMixed:heights.length!==1,weight:a('weight'),fat:a('fat'),bf:a('bf'),muscle:a('muscle'),water:a('waterWeight')};
 });
}
const good=w=>!!w&&w.closed&&w.count>=4&&Number.isFinite(w.weight)&&!w.heightMixed;
const comparable=(a,b)=>good(a)&&good(b)&&a.height===b.height;
function adherence(w){
 if(!w)return {status:null,missed:[]};
 try{
  const val=JSON.parse(localStorage.getItem('jacky-trainer-adherence-v2:'+w.start)||'null');
  if(val&&['yes','no'].includes(val.status))return {status:val.status,missed:Array.isArray(val.missed)?val.missed:[]};
  const old=localStorage.getItem('jacky-trainer-compliance:'+w.start);
  if(['yes','no'].includes(old))return {status:old,missed:[]};
 }catch(_){}
 return {status:null,missed:[]};
}
const missedNames={cardio:'Cardio',protein:'Protein',weights:'เวท',calories:'อาหาร'};
function assess(all,index){
 const w=all[index],p=all[index-1];
 const sameHeight=!!p&&w.height!==null&&p.height===w.height;
 const dw=p&&Number.isFinite(p.weight)&&Number.isFinite(w.weight)?w.weight-p.weight:null;
 const d=dw===null?null:{weight:dw,fat:sameHeight?w.fat-p.fat:null,muscle:sameHeight?w.muscle-p.muscle:null,water:sameHeight?w.water-p.water:null};
 const enough=!!(p&&w.count>=4&&p.count>=2);
 const valid=!!(enough&&p.count>=4);
 const provisional=!!(enough&&!valid);
 const waterShift=d&&Number.isFinite(d.water)&&Math.abs(d.water)>=.5;
 const muscleDrop=d&&Number.isFinite(d.muscle)&&d.muscle<-.3;
 let label='กำลังติดตาม',tone='neutral',reason='',action='';
 if(!w.closed){
  label='สัปดาห์ยังไม่สิ้นสุด';
  reason='ผลระหว่างสัปดาห์ยังไม่นำมาตัดสินใจปรับแผน';
  action='ติดตามค่าเฉลี่ยเมื่อสิ้นสุดสัปดาห์';
 }else if(!p||!Number.isFinite(dw)){
  label='สัปดาห์ฐาน';
  reason='ยังไม่มีค่าเฉลี่ยสัปดาห์ก่อนหน้า';
  action='ชั่งอย่างสม่ำเสมอเพื่อเริ่มเปรียบเทียบ';
 }else if(w.count<4){
  label='รอผลค่าเฉลี่ย';
  reason='สัปดาห์นี้ชั่งเพียง '+w.count+' วัน';
  action='ยังไม่ปรับจากข้อมูลชุดนี้; ชั่งอย่างน้อย 4 วันในสัปดาห์ถัดไป';
 }else if(p.count<2){
  label='ผลเทียบยังไม่นิ่ง';
  reason='สัปดาห์ก่อนมีเพียง '+p.count+' วันชั่ง';
  action='ยังไม่ปรับจากข้อมูลชุดนี้; ใช้สัปดาห์นี้เป็นฐานเทียบครั้งต่อไป';
 }else if(waterShift||muscleDrop||dw<-.65){
  label='ดูการฟื้นตัวก่อน';
  tone='watch';
  reason=dw<-.65?'น้ำหนักลดเร็วกว่ากรอบเป้าหมาย':muscleDrop?'กล้าม BIA ลดลงชัดเจน':'น้ำในร่างกาย BIA แกว่งมาก';
  action='รักษาอาหารและเวท ตรวจแรงยกและการฟื้นตัวก่อนเพิ่ม Cardio';
 }else if(dw>-.30){
  label='ลดช้ากว่าเป้า';
  tone='adjust';
  reason='น้ำหนักเฉลี่ยเปลี่ยน '+signed(dw)+' kg เทียบเป้า −0.30 ถึง −0.50 kg/สัปดาห์';
  action='เพิ่ม Zone 2 อีก 10 นาที/ครั้ง × 4 วัน/สัปดาห์ (+40 นาที/สัปดาห์) โดยคงอาหารและเวทเดิม';
 }else if(dw>=-.50){
  label='ลดตามเป้า';
  tone='good';
  reason='น้ำหนักเฉลี่ยลดอยู่ในกรอบเป้าหมาย';
  action='คงอาหาร เวท และ Cardio ตามเดิม';
 }else{
  label='ลดเร็วกว่าเป้า';
  tone='watch';
  reason='น้ำหนักลดเร็วกว่ากรอบเป้าหมาย';
  action='ยังไม่เพิ่ม Cardio; ตรวจความหิว แรงยก และการฟื้นตัว';
 }
 if(provisional)reason+=' · สัปดาห์ก่อนมี '+p.count+' วันชั่ง (ผลเปรียบเทียบเบื้องต้น)';
 if(d&&!sameHeight)reason+=' · ไม่เทียบ BIA ข้ามการตั้งค่าส่วนสูง';
 return {w,p,d,label,tone,reason,action,valid,provisional};
}
function stepHtml(x){
 const w=x.w,d=x.d;
 const row=(key,target,value,hint)=>'<div class="r24-metric"><small>'+esc(key)+'</small><b>'+esc(value)+'</b><span>'+esc(target)+'</span>'+(hint?'<em>'+esc(hint)+'</em>':'')+'</div>';
 const fatHint=!d||!Number.isFinite(d.fat)?'ไม่เทียบค่า BIA':'เทียบสัปดาห์ก่อน '+signed(d.fat)+' kg';
 const muscleHint=!d||!Number.isFinite(d.muscle)?'ไม่เทียบค่า BIA':'เทียบสัปดาห์ก่อน '+signed(d.muscle)+' kg';
 return '<div class="r24-metrics">'+
 row('WEIGHT AVG','เป้า −0.30 ถึง −0.50 kg/สัปดาห์',f(w.weight)+' kg',d?'เปลี่ยน '+signed(d.weight)+' kg'+(!x.valid?' · ประเมินเบื้องต้น':''):'ไม่เทียบข้ามการตั้งค่าส่วนสูง')+
 row('FAT MASS · BIA','เป้าหมายระยะยาวคือแนวโน้มลด',f(w.fat)+' kg',fatHint)+
 row('MUSCLE · BIA','Cut: รักษากล้าม/แรงยก ไม่บังคับเพิ่มทุกสัปดาห์',f(w.muscle)+' kg',muscleHint)+'</div>';
}
function detailsHtml(x){
 const w=x.w;
 return '<details class="r24-week" data-week-key="'+esc(w.start)+'"><summary><span><b>'+stamp(w.start)+' – '+stamp(w.end)+'</b><small>'+w.count+'/7 วันชั่ง</small></span><strong class="r24-status '+x.tone+'">'+esc(x.label)+'</strong></summary>'+
 '<div class="r24-body">'+stepHtml(x)+
 '<p class="r24-evidence">'+esc(x.reason)+'</p>'+
 '<div class="r24-next"><small>คำแนะนำสัปดาห์นั้น</small><b>'+esc(x.action)+'</b></div>'+
 '</div></details>';
}
function trainerSummary(review){
 const w=review.w,d=review.d;
 const sampleNote=(review.p?'เทียบ '+review.p.count+' วันชั่งของสัปดาห์ก่อน':'สัปดาห์เริ่มต้น')+(review.provisional?' · ประเมินเบื้องต้น':'');
 const risk=review.provisional||review.tone==='adjust'?'ถ้าเพิ่งป่วยหรือแรงยกยังไม่ฟื้น ให้รอจนฟื้นตัวก่อนเพิ่ม Cardio':'';
 return '<div class="r25-summary-head"><small>ค่าเฉลี่ย '+stamp(w.start)+' – '+stamp(w.end)+'</small><b>'+esc(review.label)+'</b></div>'+
 '<div class="r25-summary-stats">'+
 '<div><small>น้ำหนักเฉลี่ย</small><b>'+f(w.weight)+' kg</b><em>'+(d?signed(d.weight)+' kg / สัปดาห์':'—')+' · เป้า −0.30 ถึง −0.50</em></div>'+
 '<div><small>ไขมัน BIA</small><b>'+f(w.fat)+' kg</b><em>'+(d&&Number.isFinite(d.fat)?signed(d.fat)+' kg':'ยังไม่เทียบ')+'</em></div>'+
 '<div><small>กล้ามเนื้อ BIA</small><b>'+f(w.muscle)+' kg</b><em>'+(d&&Number.isFinite(d.muscle)?signed(d.muscle)+' kg':'ยังไม่เทียบ')+'</em></div>'+
 '</div>'+
 '<div class="r25-prescription"><small>สิ่งที่ควรทำตั้งแต่วันนี้</small><strong>'+esc(review.action)+'</strong></div>'+
 '<p class="r25-context">'+esc(review.reason)+(risk?' · '+esc(risk):'')+'</p>';
}
function draw(){
 const host=document.querySelector('#summary-app .r15-performance-content');
 const rows=window.__JACKY_TRACKER__?.DATA;
 if(!host||!Array.isArray(rows)||!rows.length)return;
 const data=weeks(rows);if(!data.length)return;
 const closed=data.map((w,i)=>({w,i})).filter(x=>x.w.closed);
 const last=closed.at(-1);
 const items=last?closed.slice(-8).reverse():[];
 let board=host.querySelector('.r24-response');
 if(!board){board=document.createElement('section');board.className='r24-response';host.prepend(board);}
 const existing=board.querySelector('details.r24-past');
 const wasOpen=!!existing?.open;
 const openedWeeks=new Set([...board.querySelectorAll('details.r24-week[open]')].map(x=>x.dataset.weekKey));
 board.innerHTML=(items.length>1
 ?'<details class="r24-past" '+(wasOpen?'open':'')+'><summary>รีวิวย้อนหลัง '+(items.length-1)+' สัปดาห์</summary><div class="r24-history">'+items.slice(1).map(x=>detailsHtml(assess(data,x.i))).join('')+'</div></details>'
 :'')+
 '<p class="r24-foot">ประวัติรายสัปดาห์เป็นการประเมินย้อนหลัง ไม่ใช่การยืนยันว่าเคยปรับแผนจริง</p>';
 board.querySelectorAll('details.r24-week').forEach(x=>{if(openedWeeks.has(x.dataset.weekKey))x.open=true});
 const personal=document.querySelector('#summary-app .at-trainer');
 if(personal&&last){
  const review=assess(data,last.i);
  const h=personal.querySelector('.at-head h2');
  const actionCard=personal.querySelector('.at-action');
  const note=personal.querySelector('.at-reason');
  const badge=personal.querySelector('.at-badge');
  if(h)h.textContent='คำแนะนำสัปดาห์ล่าสุด';
  if(actionCard){actionCard.classList.add('r25-trainer-summary');actionCard.innerHTML=trainerSummary(review);}
  if(note)note.remove();
  if(badge)badge.remove();
 }
 // Keep the existing numeric table for people who want raw averages.
 let history=host.querySelector('.r23-weekly-history');
 if(!history){history=document.createElement('details');history.className='r23-weekly-history';host.appendChild(history);}
 const historyOpen=history.open;const sorted=data.slice().reverse();
 history.innerHTML='<summary><span>ตารางค่าเฉลี่ยทุกสัปดาห์</span><small>'+data.length+' สัปดาห์ · จันทร์–อาทิตย์</small></summary>'+
 '<div class="r23-scroll"><table><thead><tr><th>สัปดาห์</th><th>ชั่ง</th><th>Weight</th><th>Fat</th><th>Body Fat</th><th>Muscle</th></tr></thead><tbody>'+
 sorted.map(w=>'<tr><td><b>'+stamp(w.start)+' – '+stamp(w.end)+'</b>'+(w.closed?'':'<em>สัปดาห์ยังไม่ปิด</em>')+(w.heightMixed?'<em>ส่วนสูงต่างกัน</em>':'')+'</td><td>'+w.count+'</td><td>'+f(w.weight)+'</td><td>'+f(w.fat)+'</td><td>'+f(w.bf)+'%</td><td>'+f(w.muscle)+'</td></tr>').join('')+'</tbody></table></div>'+
 '<p class="r23-note">Weight / Fat / Muscle หน่วย kg · ค่าเฉลี่ยจากวันที่ชั่งจริง ไม่ใช่ครบ 7 วันเสมอ · หากการตั้งค่าส่วนสูงเปลี่ยน ห้ามเทียบค่า BIA ข้ามช่วง</p>';
 history.open=historyOpen;
}
function boot(){
 const css=document.createElement('style');css.id='r24-weekly-review-style';css.textContent=[
 '#summary-app .r24-response{border:1px solid #dce8e0;border-radius:16px;background:#fff;padding:18px;margin:4px 0 20px;font-family:Kanit,system-ui,sans-serif;color:#2a3e35}',
 '#summary-app .r24-heading small{font-size:10px;color:#47846d;letter-spacing:.07em;font-weight:700}',
 '#summary-app .r24-heading h3{margin:5px 0 2px;font-size:19px;line-height:1.35}',
 '#summary-app .r24-heading p{margin:0 0 14px;font-size:12px;color:#708279}',
 '#summary-app .r24-week{border:1px solid #dce8e1;border-radius:13px;background:#fff;margin:9px 0;overflow:hidden}',
 '#summary-app .r24-latest{background:#f9fcfa}',
 '#summary-app .r24-week>summary{list-style:none;display:flex;gap:12px;align-items:center;justify-content:space-between;cursor:pointer;padding:13px 15px}',
 '#summary-app .r24-week>summary::-webkit-details-marker{display:none}',
 '#summary-app .r24-week>summary b{font-size:14px}',
 '#summary-app .r24-week>summary small{display:block;font-size:10px;color:#80928a;font-weight:400}',
 '#summary-app .r24-status{border-radius:999px;padding:5px 9px;font-size:11px;color:#50665b;background:#eef2ef;white-space:nowrap}',
 '#summary-app .r24-status.good{color:#177153;background:#e5f4e9}',
 '#summary-app .r24-status.watch{color:#92631f;background:#fff1d7}',
 '#summary-app .r24-status.adjust{color:#1d658a;background:#e8f4fc}',
 '#summary-app .r24-body{padding:0 14px 15px}',
 '#summary-app .r24-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}',
 '#summary-app .r24-metric{padding:11px;background:#f6f9f7;border:1px solid #e6eeea;border-radius:10px;min-width:0}',
 '#summary-app .r24-metric small{display:block;color:#74897e;font-size:10px}',
 '#summary-app .r24-metric b{display:block;color:#244638;font-size:18px;margin:2px 0}',
 '#summary-app .r24-metric span{display:block;font-size:10px;line-height:1.5;color:#61776d}',
 '#summary-app .r24-metric em{display:block;font-size:10px;font-style:normal;color:#5c8270;margin-top:5px}',
 '#summary-app .r24-evidence{font-size:12px;color:#5b7066;line-height:1.8;margin:12px 0}',
 '#summary-app .r24-next{background:#edf7f0;border-radius:11px;padding:12px 14px;line-height:1.65}',
 '#summary-app .r24-next small{display:block;font-size:10px;color:#547f6a}',
 '#summary-app .r24-next b{font-size:13px;color:#214e39}',
 '#summary-app .r24-change{background:#eaf3fb}',
 '#summary-app .r24-change b{color:#235e87}',
 '#summary-app .r25-trainer-summary{background:#fff!important;border:1px solid #dce7df!important;padding:16px!important}',
 '#summary-app .r25-summary-head{display:flex;flex-direction:column;gap:3px;margin-bottom:12px}',
 '#summary-app .r25-summary-head small{font-size:11px;color:#6f887a}',
 '#summary-app .r25-summary-head>b{font-size:17px;color:#234a37}',
 '#summary-app .r25-summary-head>span{font-size:11px;color:#84918a}',
 '#summary-app .r25-summary-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}',
 '#summary-app .r25-summary-stats>div{background:#f6faf7;border:1px solid #e3ece6;border-radius:10px;padding:12px;min-width:0}',
 '#summary-app .r25-summary-stats small{display:block;font-size:10px;color:#698477}',
 '#summary-app .r25-summary-stats b{display:block;font-size:17px;color:#28513b}',
 '#summary-app .r25-summary-stats em{display:block;font-size:10px;font-style:normal;color:#658678;line-height:1.6}',
 '#summary-app .r25-prescription{margin:12px 0 5px;padding:12px 14px;border-radius:11px;background:#eaf4ef}',
 '#summary-app .r25-prescription small{display:block;font-size:11px;color:#54806b}',
 '#summary-app .r25-prescription strong{display:block;font-size:14px!important;color:#24533e!important;line-height:1.6}',
 '#summary-app .r25-context{font-size:11px;line-height:1.6;color:#698075;margin:7px 0}',
 '@media(max-width:650px){#summary-app .r25-summary-stats{grid-template-columns:1fr}#summary-app .r25-summary-stats>div{padding:9px}}',
 '#summary-app .r24-check{margin-top:13px;padding:12px;border:1px solid #e2ece5;border-radius:11px;background:#fff}',
 '#summary-app .r24-check>span{font-size:12px;font-weight:600;display:block}',
 '#summary-app .r24-buttons{display:flex;gap:8px;margin:8px 0}',
 '#summary-app .r24-buttons button{border:1px solid #bdd9c9;background:#fff;color:#336a50;padding:8px 14px;border-radius:9px;cursor:pointer;font:500 12px Kanit,system-ui,sans-serif}',
 '#summary-app .r24-buttons button[aria-pressed="true"]{background:#dff2e8;border:2px solid #23875a;color:#145e40}',
 '#summary-app .r24-check>small{display:block;color:#798a81;font-size:10px}',
 '#summary-app .r24-past{border-top:1px solid #e8eee9;padding-top:12px;margin-top:15px}',
 '#summary-app .r24-past>summary{font-weight:600;font-size:13px;cursor:pointer}',
 '#summary-app .r24-past>summary small{font-weight:400;color:#7e8e85;font-size:11px}',
 '#summary-app .r24-history{margin-top:10px}',
 '#summary-app .r24-foot{margin:13px 1px 0;font-size:10px;line-height:1.7;color:#7b8982}',
 '#summary-app .r23-weekly-history{display:block;margin:14px 0 0;border:1px solid #dbe9e2;border-radius:14px;background:#fff;overflow:hidden}',
 '#summary-app .r23-weekly-history>summary{display:flex;justify-content:space-between;gap:10px;align-items:center;cursor:pointer;padding:16px;font:600 14px Kanit,system-ui,sans-serif;color:#245d49}',
 '#summary-app .r23-weekly-history summary small{font-size:11px;color:#789086;font-weight:400}',
 '#summary-app .r23-scroll{width:100%;overflow-x:auto;padding:0 14px 12px}',
 '#summary-app .r23-scroll table{width:100%;min-width:650px;border-collapse:collapse;text-align:right;font:400 13px Kanit,system-ui,sans-serif}',
 '#summary-app .r23-scroll th{text-align:right;background:#f3f8f5;color:#557467;font-weight:600}',
 '#summary-app .r23-scroll td,#summary-app .r23-scroll th{padding:11px 9px;border-bottom:1px solid #e5ede8}',
 '#summary-app .r23-scroll td:first-child,#summary-app .r23-scroll th:first-child{text-align:left}',
 '#summary-app .r23-scroll td em{display:block;font-style:normal;font-size:10px;color:#b17a36}',
 '#summary-app .r23-note{margin:0 14px 15px;color:#74887e;font-size:11px;line-height:1.6}',
 '@media(max-width:680px){#summary-app .r24-response{padding:12px}#summary-app .r24-metrics{grid-template-columns:1fr}#summary-app .r24-week>summary{padding:12px 10px;flex-wrap:wrap}#summary-app .r24-status{font-size:10px}#summary-app .r24-metric{padding:10px}#summary-app .r23-weekly-history>summary{font-size:13px;padding:12px;flex-wrap:wrap}#summary-app .r23-scroll{padding:0 8px 8px}}'
 ].join('');document.head.appendChild(css);
 [650,1300,2500,4200].forEach(t=>setTimeout(draw,t));
 document.addEventListener('click',e=>{if(e.target.closest?.('#summary-app .s-range-controls button'))setTimeout(draw,250)});

}
window.JackyWeeklyResponse={weeks,assess,TARGET};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();