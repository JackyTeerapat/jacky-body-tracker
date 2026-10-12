(() => {
  // Read-only retrospective decision simulation. It never asserts the user followed advice.
  const S = window.__JACKY_TRACKER__;
  const DAY = 86400000;
  const date = s => new Date(s + 'T00:00:00Z');
  const iso = d => d.toISOString().slice(0,10);
  const shift = (d,n) => new Date(d.getTime()+n*DAY);
  const monday = s => {const d=date(s),k=d.getUTCDay();return shift(d,-(k===0?6:k-1));};
  const avg = a => a.length?a.reduce((s,n)=>s+n,0)/a.length:null;
  const f = n => Number.isFinite(n)?n.toFixed(2):'—';
  const slope = a => {
    if(a.length<2)return null;
    const x=(a.length-1)/2,y=avg(a);
    return a.reduce((s,v,i)=>s+(i-x)*(v-y),0)/a.reduce((s,_,i)=>s+(i-x)**2,0);
  };
  function build(data){
    const D=data.filter(x=>x?.isoDate&&Number.isFinite(Number(x.weight))).slice().sort((a,b)=>a.isoDate.localeCompare(b.isoDate));
    if(!D.length)return null;
    const currentStart=monday(D.at(-1).isoDate);
    const weeks=[];
    for(let d=monday(D[0].isoDate);d<currentStart;d=shift(d,7)){
      const start=iso(d),end=iso(shift(d,6));
      const rows=D.filter(x=>x.isoDate>=start&&x.isoDate<=end);
      if(rows.length<4)continue;
      const heights=[...new Set(rows.map(x=>Number(x.height)))];
      weeks.push({start,end,n:rows.length,weight:avg(rows.map(x=>Number(x.weight))),fat:avg(rows.map(x=>Number(x.fat))),muscle:avg(rows.map(x=>Number(x.muscle))),water:avg(rows.map(x=>Number(x.waterWeight))),height:heights.length===1?heights[0]:null});
    }
    if(weeks.length<2)return null;
    let previous=null;
    const log=weeks.map((w,i)=>{
      // Independent analysis FIRST, without consulting a previous decision.
      const history=weeks.slice(Math.max(0,i-5),i+1);
      const weightSlope=slope(history.map(x=>x.weight));
      const prior=weeks[i-1];
      const sameHeight=!!prior&&prior.height!==null&&prior.height===w.height;
      const fatDelta=sameHeight?w.fat-prior.fat:null;
      const muscleDelta=sameHeight?w.muscle-prior.muscle:null;
      let id,action,reason;
      if(weightSlope===null){
        id='ESTABLISH';action='คงตารางเวทและเริ่มบันทึกอาหาร/กิจกรรมจริง';reason='ใช้สัปดาห์นี้เป็นฐานเปรียบเทียบย้อนหลัง';
      }else if(weightSlope < -0.50 || (muscleDelta!==null&&muscleDelta < -0.30)){
        id='RECOVER';action='ตรวจแรงยกและการฟื้นตัว คงโปรตีน และอย่าเร่งลดอาหาร';reason='น้ำหนักลดเร็วหรือค่ากล้ามเนื้อ BIA ลด ต้องปกป้องกล้ามเนื้อ';
      }else if(weightSlope<=-0.30){
        id='KEEP';action='คงแผนการกินและการฝึกเดิม';reason='น้ำหนักเฉลี่ยย้อนหลังลดอยู่ในเป้าหมาย';
      }else{
        id='TRACK';action='เริ่มบันทึกอาหารและเครื่องดื่ม 7 วัน พร้อมคงเวท';reason='แนวโน้มน้ำหนักลดช้าหรือทรงตัว ต้องหาสาเหตุจากอาหารจริง';
      }
      // Next, evaluate A against measurements; without execution evidence there
      // is no causal claim that A succeeded or failed.
      let evaluation='ไม่มีคำแนะนำก่อนหน้าในชุดจำลอง';
      let comparison='Initial recommendation';
      if(previous){
        const delta=w.weight-prior.weight;
        const improved=delta<=-0.30&&delta>=-0.50;
        const slower=delta>-0.30;
        evaluation='น้ำหนักเฉลี่ยเปลี่ยน '+(delta>=0?'+':'')+f(delta)+' kg ต่อสัปดาห์';
        if(sameHeight)evaluation+=' · ไขมัน BIA '+(fatDelta>=0?'+':'')+f(fatDelta)+' kg · กล้าม BIA '+(muscleDelta>=0?'+':'')+f(muscleDelta)+' kg';
        else evaluation+=' · ไม่เทียบ BIA ข้าม calibration';
        comparison=previous.id===id?'คง A (A → A)':improved&&previous.id==='TRACK'?'แนวโน้มเข้าเป้า; เปลี่ยนเป็นคงแผน (A → B)':slower&&previous.id==='KEEP'?'ออกนอกเป้า; ปรับเป็นติดตามอาหาร (A → B)':'ปรับคำแนะนำตามแนวโน้ม (A → B)';
      }
      const entry={start:w.start,end:w.end,days:w.n,weight:w.weight,weightSlope,fat:w.fat,muscle:w.muscle,water:w.water,id,action,reason,evaluation,comparison,previousAction:previous?.action||null};
      previous=entry;
      return entry;
    });
    return {log,currentStart:iso(currentStart)};
  }
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(){
    const wrap=document.querySelector('#summary-app .summary-wrap');
    const coach=wrap?.querySelector('.s-weekly-coach');
    const result=build(S?.DATA||[]);
    if(!coach||!result)return;
    const log=result.log,last=log.at(-1);
    const details=log.slice(-6).reverse().map(x=>`
      <details style="border-top:1px solid #e4e9e7;padding:9px 0">
        <summary style="cursor:pointer;font-weight:800;font-size:11px">${esc(x.start)}–${esc(x.end)} · ${esc(x.id)} · ${esc(x.comparison)}</summary>
        <div style="font-size:11px;line-height:1.7;padding-top:6px">
          <div><b>วิเคราะห์อิสระ:</b> น้ำหนักเฉลี่ย ${f(x.weight)} kg · Trend ${f(x.weightSlope)} kg/week (${x.days} วันชั่ง)</div>
          <div><b>คำแนะนำเดิม A:</b> ${esc(x.previousAction||'ไม่มี')}</div>
          <div><b>ผลที่เกิดขึ้น:</b> ${esc(x.evaluation)}</div>
          <div><b>คำแนะนำใหม่ B:</b> ${esc(x.action)}</div>
          <div><b>เหตุผล:</b> ${esc(x.reason)}</div>
        </div>
      </details>`).join('');
    let box=wrap.querySelector('.s-coach-feedback');
    if(!box){box=document.createElement('section');box.className='s-coach-feedback';}
    box.style.cssText='border:1px solid #dce6e2;border-radius:15px;background:#fff;padding:14px;margin:0 0 12px;color:#29383c';
    box.innerHTML=`
      <div style="font-size:10px;font-weight:900;letter-spacing:.08em;color:#607c73">COACH FEEDBACK LOOP · EXPERIMENTAL</div>
      <h3 style="font-size:15px;margin:6px 0">วิเคราะห์อดีต → ทบทวน A → เลือก B สำหรับวันนี้</h3>
      <p style="font-size:11px;line-height:1.6;margin:5px 0"><b>คำแนะนำวันนี้จากข้อมูลปิดสัปดาห์:</b> ${esc(last.action)}</p>
      <p style="font-size:10px;line-height:1.6;color:#63746f;margin:5px 0">${esc(last.reason)} · ย้อนดู ${log.length} สัปดาห์ที่มีอย่างน้อย 4 วันชั่ง</p>
      <p style="font-size:10px;line-height:1.6;color:#856222;margin:7px 0">ประวัติด้านล่างเป็นการจำลองย้อนหลังด้วยกฎปัจจุบัน ไม่ใช่คำแนะนำที่เคยส่งจริง และยังไม่ได้ยืนยันว่าทำตาม A; ผลที่เห็นไม่ใช่หลักฐานว่า A เป็นสาเหตุ</p>
      <div style="font-size:11px;font-weight:900;margin-top:10px">Review A → B · ย้อนหลัง 6 สัปดาห์</div>
      ${details}`;
    coach.insertAdjacentElement('afterend',box);
  }
  function start(){
    [650,1450,2900].forEach(t=>setTimeout(render,t));
    document.addEventListener('click',e=>{
      if(e.target.closest?.('#summary-app .s-weekly-checkpoint,.s-range-controls button'))setTimeout(render,330);
    });
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();