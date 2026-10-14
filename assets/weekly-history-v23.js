(()=>{
const N=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
const fmt=x=>x===null?'—':x.toFixed(2);
const pad=x=>String(x).padStart(2,'0');
function weeks(rows){
 const by=new Map();
 rows.filter(x=>x?.isoDate).forEach(r=>{
  const d=new Date(r.isoDate+'T00:00:00Z');if(!Number.isFinite(d.getTime()))return;
  d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
  const k=d.toISOString().slice(0,10);
  if(!by.has(k))by.set(k,[]);
  by.get(k).push(r);
 });
 return [...by.entries()].sort((a,b)=>b[0].localeCompare(a[0])).map(([start,list])=>{
  const end=new Date(Date.parse(start+'T00:00:00Z')+6*86400000).toISOString().slice(0,10);
  const mean=k=>{const nums=list.map(x=>N(x[k])).filter(x=>x!==null);return nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:null};
  return {start,end,count:list.length,weight:mean('weight'),fat:mean('fat'),bf:mean('bf'),muscle:mean('muscle'),heights:[...new Set(list.map(x=>N(x.height)).filter(x=>x!==null))]};
 });
}
function draw(){
 const w=document.querySelector('#summary-app .summary-wrap');
 const host=w?.querySelector('.r15-performance-content');
 const rows=window.__JACKY_TRACKER__?.DATA;
 if(!host||!Array.isArray(rows)||!rows.length)return;
 let details=host.querySelector('.r23-weekly-history');
 if(!details){details=document.createElement('details');details.className='r23-weekly-history';host.appendChild(details);}
 // Only refresh table, never reset disclosure state or duplicate it.
 const data=weeks(rows);
 const today=new Date();const localToday=new Date(today.getFullYear(),today.getMonth(),today.getDate());
 const stamp=d=>{const [y,m,day]=d.split('-').map(Number);return pad(day)+'/'+pad(m)+'/'+y;};
 details.innerHTML='<summary><span>ประวัติค่าเฉลี่ยรายสัปดาห์</span><small>'+data.length+' สัปดาห์ · จันทร์–อาทิตย์</small></summary>'+
 '<div class="r23-scroll"><table><thead><tr><th>สัปดาห์</th><th>ชั่ง</th><th>Weight</th><th>Fat</th><th>Body Fat</th><th>Muscle</th></tr></thead><tbody>'+
 data.map((x,i)=>'<tr><td><b>'+stamp(x.start)+' – '+stamp(x.end)+'</b>'+(i===0&&x.end>=localToday.toISOString().slice(0,10)?'<em>ยังไม่ครบสัปดาห์</em>':'')+(x.heights.length>1?'<em>ตั้งค่าส่วนสูงต่างกัน</em>':'')+'</td><td>'+x.count+'</td><td>'+fmt(x.weight)+'</td><td>'+fmt(x.fat)+'</td><td>'+fmt(x.bf)+'%</td><td>'+fmt(x.muscle)+'</td></tr>').join('')+
 '</tbody></table></div><p class="r23-note">Weight / Fat / Muscle หน่วย kg · เป็นค่าเฉลี่ยจากวันที่มีการชั่งจริง ไม่ใช่ครบ 7 วันทุกสัปดาห์ · การเปลี่ยนส่วนสูงเครื่องทำให้ BIA ข้ามช่วงเทียบกันไม่ได้โดยตรง</p>';
}
function start(){
 const css=document.createElement('style');css.textContent=[
 '#summary-app .r23-weekly-history{display:block;margin:22px 0 0;padding:0;border:1px solid #dbe9e2;border-radius:14px;background:#fff;overflow:hidden}',
 '#summary-app .r23-weekly-history summary{display:flex;justify-content:space-between;gap:10px;align-items:center;cursor:pointer;padding:16px;font:600 15px Kanit,system-ui,sans-serif;color:#245d49}',
 '#summary-app .r23-weekly-history summary small{font-size:11px;color:#789086;font-weight:400}',
 '#summary-app .r23-scroll{width:100%;overflow-x:auto;padding:0 14px 12px}',
 '#summary-app .r23-scroll table{width:100%;min-width:650px;border-collapse:collapse;text-align:right;font:400 13px Kanit,system-ui,sans-serif}',
 '#summary-app .r23-scroll th{text-align:right;background:#f3f8f5;color:#557467;font-weight:600}',
 '#summary-app .r23-scroll td,#summary-app .r23-scroll th{padding:11px 9px;border-bottom:1px solid #e5ede8}',
 '#summary-app .r23-scroll td:first-child,#summary-app .r23-scroll th:first-child{text-align:left}',
 '#summary-app .r23-scroll td em{display:block;font-style:normal;font-size:10px;color:#b17a36}',
 '#summary-app .r23-note{margin:0 14px 15px;color:#74887e;font-size:11px;line-height:1.6}',
 '@media(max-width:600px){#summary-app .r23-weekly-history summary{font-size:13px;padding:12px;flex-wrap:wrap}#summary-app .r23-scroll{padding:0 8px 8px}}'
 ].join('');document.head.appendChild(css);
 [700,1400,2800].forEach(t=>setTimeout(draw,t));
 document.addEventListener('click',e=>{if(e.target.closest?.('#summary-app .s-range-controls button'))setTimeout(draw,250)});
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();