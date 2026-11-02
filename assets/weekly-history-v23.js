(()=>{
'use strict';
// Weekly review: completed weeks, daily deduplication and conservative adjustments.
const N=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const f=(x,n=2)=>Number.isFinite(x)?x.toFixed(n):'—';
const signed=(x,n=2)=>Number.isFinite(x)?(x>0?'+':'')+x.toFixed(n):'—';
const pad=x=>String(x).padStart(2,'0');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;':'&quot;',"'":'&#39;'}[c]));
const dt=s=>new Date(s+'T00:00:00Z');
const iso=d=>d.toISOString().slice(0,10);
const add=(date,days)=>iso(new Date(dt(date).getTime()+days*86400000));
const mon=date=>add(date,-(dt(date).getUTCDay()+6)%7);
const stamp=s=>{const[y,m,d]=s.split('-');return d+'/'+m+'/'+y;};
const today=()=>new Date(Date.now()+7*3600000).toISOString().slice(0,10);
const TARGET={weightMin:.30,weightMax:.50,fatMin:.20,fatMax:.40,muscleFloor:0};
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
 const w=all[index],p=all[index-1],p2=all[index-2],a=adherence(w);
 const valid=comparable(w,p);
 const d=valid?{weight:w.weight-p.weight,fat:w.fat-p.fat,muscle:w.muscle-p.muscle,water:w.water-p.water}:null;
 const priorValid=comparable(p,p2);
 const prior=priorValid?{weight:p.weight-p2.weight,water:p.water-p2.water}:null;
 const waterShift=d&&Number.isFinite(d.water)&&Math.abs(d.water)>=.5;
 const priorWaterShift=prior&&Number.isFinite(prior.water)&&Math.abs(prior.water)>=.5;
 const stall=!!(d&&prior&&d.weight>-.20&&prior.weight>-.20&&!waterShift&&!priorWaterShift);
 let label='ติดตามข้อมูล',tone='neutral',reason='',action='',targetStatus='',muscleStatus='';
 if(!w.closed){
  label='สัปดาห์ยังไม่ปิด';reason='ใช้เป็นตัวอย่างระหว่างสัปดาห์ ยังไม่ตัดสินว่าผ่านหรือไม่ผ่านเป้า';action='ชั่งต่อจนจบสัปดาห์แล้วค่อยรีวิว';tone='neutral';
 }else if(!p){
  label='กำหนดค่าตั้งต้น';reason='ยังไม่มีสัปดาห์ก่อนหน้าไว้เปรียบเทียบค่าเฉลี่ย';action='คงแผนและสะสมข้อมูลสัปดาห์ถัดไป';
 }else if(!valid){
  label='ยังประเมินไม่ได้';reason=(!good(w)||!good(p))?'ต้องมีอย่างน้อย 4 วันชั่งในแต่ละสัปดาห์ จึงเปรียบเทียบแบบมั่นใจได้':'ตั้งค่าส่วนสูงของเครื่องต่างกันหรือเปลี่ยนระหว่างสัปดาห์ จึงไม่เทียบ BIA ข้ามช่วง';
  action='คงแผน เก็บข้อมูลให้ครบอย่างน้อย 4 วัน/สัปดาห์ และติดตามแรงยก';
 }else{
  const loss=-d.weight;
  targetStatus=loss>=TARGET.weightMin&&loss<=TARGET.weightMax?'เข้าเป้าน้ำหนัก':loss<TARGET.weightMin?'น้ำหนักลดช้ากว่าเป้า':'น้ำหนักลดเร็วกว่าเป้า';
  muscleStatus=d.muscle>=-.15?'กล้าม BIA ใกล้เคียงเดิม':d.muscle<-.30?'กล้าม BIA ลด ต้องตรวจความพร้อม':'กล้าม BIA ลดเล็กน้อย';
  if(waterShift){
   label='รอข้อมูลยืนยัน';tone='neutral';reason='น้ำในร่างกายเฉลี่ยเปลี่ยน '+signed(d.water)+' kg; การแยกน้ำ/ไขมัน/กล้ามจาก BIA ยังไม่น่าเชื่อถือพอ';action='คงแผนเดิมและวัดเวลาใกล้กัน หลังดื่มน้ำ/อาหารในรูปแบบใกล้เคียงกัน';
  }else if(d.weight<-.65||d.muscle<-.30){
   label='เน้นรักษากล้าม';tone='watch';reason=(d.weight<-.65?'น้ำหนักลดเร็วกว่ากรอบที่ตั้งไว้':'กล้าม BIA มีแนวโน้มลด')+'; BIA ยังไม่ยืนยันว่ากล้ามเนื้อหายจริง';action='ยังไม่เพิ่ม Cardio/ลดอาหาร ตรวจความแข็งแรง การฟื้นตัว และโปรตีนก่อน';
  }else if(loss>=TARGET.weightMin&&loss<=TARGET.weightMax){
   label='ตอบสนองตามเป้า';tone='good';reason='น้ำหนักเฉลี่ยลดอยู่ในกรอบ −0.30 ถึง −0.50 kg/สัปดาห์; ใช้ไขมัน BIA เป็นตัวประกอบ';action='คงอาหาร เวท และ Cardio เท่าเดิมอีก 1 สัปดาห์';
  }else if(loss>TARGET.weightMax){
   label='ลดค่อนข้างเร็ว';tone='watch';reason='น้ำหนักเฉลี่ยลดเร็วกว่ากรอบ แม้ค่า BIA ดูดี ก็ไม่ควรเร่ง Cut';action='คงหรือผ่อน Cardio ตามการฟื้นตัว ตรวจความหิวและแรงยก ไม่ลดแคลอรีเพิ่ม';
  }else if(a.status==='no'){
   label='กลับมาทำแผนให้ครบ';tone='watch';reason='ผลน้ำหนักช้ากว่าเป้า และมีบันทึกว่าทำตามแผนไม่ครบ';action='ทำตามส่วนที่ขาดก่อน'+(a.missed.length?': '+a.missed.map(x=>missedNames[x]||x).join(', '):'')+' · ไม่เพิ่ม Cardio หรือหักแคลอรีซ้ำ';
  }else if(stall&&a.status==='yes'&&adherence(p).status==='yes'){
   label='ปรับ Cardio เล็กน้อย';tone='adjust';reason='น้ำหนักเฉลี่ยลดช้ากว่าเป้าต่อเนื่อง 2 ช่วงที่เทียบได้ และบันทึกว่าทำตามแผนครบทั้ง 2 สัปดาห์';
   action='สัปดาห์ถัดไปเพิ่ม Zone 2 อีก 10 นาที/วัน ใน 4 วันที่ทำ Cardio (รวม +40 นาที/สัปดาห์) คงอาหารและเวทเดิม แล้วติดตาม 2 สัปดาห์';
  }else if(stall){
   label='ช้าต่อเนื่อง · ตรวจแผน';tone='watch';reason='น้ำหนักเฉลี่ยลดช้ากว่าเป้า 2 ช่วงต่อเนื่อง แต่ยังไม่ยืนยันการทำตามแผนครบทั้ง 2 สัปดาห์';
   action='บันทึกอาหารจริง การเดิน และ Cardio ให้ครบ; หากทำตามครบทั้ง 2 สัปดาห์และฟื้นตัวดี จึงพิจารณาเพิ่ม Zone 2 วันละ 10 นาที ใน 4 วัน/สัปดาห์';
  }else{
   label='ช้ากว่าเป้า · เฝ้าดู';tone='watch';reason='สัปดาห์นี้น้ำหนักเฉลี่ยลดต่ำกว่า 0.30 kg; 1 สัปดาห์ยังไม่พอพิสูจน์ว่าแผนใช้ไม่ได้';
   action='คงอาหารและ Cardio ก่อน ตรวจการทำตามแผนและติดตามอีกสัปดาห์ หากช้าต่อเนื่องค่อยปรับทีละอย่าง';
  }
  if(d.fat!==null&&Math.abs(d.fat)>.01)reason+=' · ไขมัน BIA '+signed(d.fat)+' kg';
 }
 return {w,p,d,label,tone,reason,action,targetStatus,muscleStatus,adherence:a,valid};
}
function stepHtml(x){
 const w=x.w,d=x.d;
 const row=(key,target,value,hint)=>'<div class="r24-metric"><small>'+esc(key)+'</small><b>'+esc(value)+'</b><span>'+esc(target)+'</span>'+(hint?'<em>'+esc(hint)+'</em>':'')+'</div>';
 const fatHint=!x.valid?'ยังไม่เทียบค่า BIA':Number.isFinite(d.fat)?'เทียบสัปดาห์ก่อน '+signed(d.fat)+' kg':'—';
 const muscleHint=!x.valid?'ยังไม่เทียบค่า BIA':Number.isFinite(d.muscle)?'เทียบสัปดาห์ก่อน '+signed(d.muscle)+' kg':'—';
 return '<div class="r24-metrics">'+
 row('WEIGHT AVG','เป้า −0.30 ถึง −0.50 kg/สัปดาห์',f(w.weight)+' kg',x.valid?'เปลี่ยน '+signed(d.weight)+' kg':'ไม่มีคู่เทียบที่มั่นใจ')+
 row('FAT MASS · BIA','เป้าหมายระยะยาวคือแนวโน้มลด',f(w.fat)+' kg',fatHint)+
 row('MUSCLE · BIA','Cut: รักษากล้าม/แรงยก ไม่บังคับเพิ่มทุกสัปดาห์',f(w.muscle)+' kg',muscleHint)+'</div>';
}
function detailsHtml(x,isLatest){
 const w=x.w;
 const a=x.adherence.status==='yes'?'ทำตามแผนครบ':x.adherence.status==='no'?'บันทึกว่าทำไม่ครบ':'ยังไม่มีบันทึกการทำตามแผน';
 return '<details class="r24-week '+(isLatest?'r24-latest':'')+'" '+(isLatest?'open':'')+'><summary><span><b>'+stamp(w.start)+' – '+stamp(w.end)+'</b><small>'+w.count+'/7 วันชั่ง · '+esc(a)+'</small></span><strong class="r24-status '+x.tone+'">'+esc(x.label)+'</strong></summary>'+
 '<div class="r24-body">'+stepHtml(x)+
 '<p class="r24-evidence"><b>ประเมิน:</b> '+esc(x.targetStatus?x.targetStatus+' · '+x.muscleStatus+' · '+x.reason:x.reason)+'</p>'+
 '<div class="r24-next"><small>แผนสัปดาห์ถัดไป</small><b>'+esc(x.action)+'</b></div>'+
 '</div></details>';
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
 board.innerHTML='<div class="r24-heading"><div><small>WEEKLY RESPONSE · เป้าหมาย vs ผลจริง</small><h3>ร่างกายตอบสนองต่อแผน Cut อย่างไร?</h3><p>ประเมินจากค่าเฉลี่ยรายสัปดาห์ ไม่ใช่ผลชั่งวันเดียว</p></div></div>'+
 (last?detailsHtml(assess(data,last.i),true):'<p>ยังไม่มีสัปดาห์ที่ปิดรอบ</p>')+
 (items.length>1?'<details class="r24-past" '+(wasOpen?'open':'')+'><summary>รีวิวย้อนหลัง '+(items.length-1)+' สัปดาห์ <small>เลือกเปิดดูคำแนะนำแต่ละสัปดาห์</small></summary><div class="r24-history">'+items.slice(1).map(x=>detailsHtml(assess(data,x.i),false)).join('')+'</div></details>':'')+
 '<p class="r24-foot">เกณฑ์น้ำหนักเฉลี่ย −0.30 ถึง −0.50 kg/สัปดาห์ เป็นเป้าเบื้องต้น; BIA เป็นค่าประมาณที่ไวต่อระดับน้ำและการตั้งค่าส่วนสูง · ข้อมูลการกิน Cardio และแรงยกยังไม่ได้เชื่อมอัตโนมัติ จึงใช้การบันทึกทำตามแผนร่วมด้วย · รีวิวประวัติเป็นการประเมินย้อนหลังด้วยกฎปัจจุบัน ไม่ได้แปลว่าเคยทำตามคำแนะนำนั้นจริง</p>';
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
 document.addEventListener('click',e=>{if(e.target.closest?.('#summary-app .v20-options button'))setTimeout(draw,120)});
 document.addEventListener('change',e=>{if(e.target.closest?.('#summary-app .v20-missed input'))setTimeout(draw,120)});
}
window.JackyWeeklyResponse={weeks,assess,TARGET};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();