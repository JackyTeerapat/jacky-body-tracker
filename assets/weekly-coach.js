(() => {
  const S = window.__JACKY_TRACKER__;
  const MS = 864e5;

  const TARGET_LOSS_MIN = 0.30;
  const TARGET_LOSS_MAX = 0.50;
  const MUSCLE_GOAL_MIN = 0.00;

  // Manual training/recovery context for the current week.
  // Body-composition metrics remain automatic from scan data.
  const WEEK_CONTEXT = {
    '2026-09-28': {
      recoveryConcern: true,
      note: 'Recovery ต่ำ: ขารอบ 2 และหลังรอบ 2 ทำไม่ไหว',
      action: 'ถ้ายังล้าค้าง ให้ลด volume เวทชั่วคราว 20–30% และไม่ชดเชย session ที่พลาด'
    }
  };

  const dt = s => new Date(`${s}T00:00:00Z`);
  const iso = d => d.toISOString().slice(0,10);
  const shift = (d,n) => new Date(d.getTime()+n*MS);
  const avg = values => {
    const xs = values.map(Number).filter(Number.isFinite);
    return xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : null;
  };
  const f2 = v => Number.isFinite(v) ? v.toFixed(2) : '—';
  const signed = (v,unit='kg') => Number.isFinite(v) ? `${v>0?'+':''}${v.toFixed(2)} ${unit}` : '—';
  const rows = () => (S?.DATA || []).filter(x=>x?.isoDate).slice().sort((a,b)=>String(a.isoDate).localeCompare(String(b.isoDate)));

  function weekStart(dateString){
    const d=dt(dateString);
    const back=d.getUTCDay()===0?6:d.getUTCDay()-1;
    return shift(d,-back);
  }

  function weekData(){
    const D=rows();
    if(!D.length) return null;
    const latest=D.at(-1);
    const start=weekStart(latest.isoDate);
    const end=shift(start,6);
    const prevEnd=shift(start,-1);
    const prevStart=shift(prevEnd,-6);
    const current=D.filter(x=>x.isoDate>=iso(start)&&x.isoDate<=latest.isoDate);
    const previous=D.filter(x=>x.isoDate>=iso(prevStart)&&x.isoDate<=iso(prevEnd));
    return {D,latest,start,end,prevStart,prevEnd,current,previous,closed:latest.isoDate>=iso(end)};
  }

  function stats(rows){
    return {
      weight:avg(rows.map(x=>x.weight)),
      fat:avg(rows.map(x=>x.fat)),
      bf:avg(rows.map(x=>x.bf)),
      muscle:avg(rows.map(x=>x.muscle)),
      water:avg(rows.map(x=>x.waterWeight))
    };
  }

  function meta(delta, mode){
    if(!Number.isFinite(delta)) return {cls:'neutral',label:'ข้อมูลไม่พอ'};
    if(mode==='loss'){
      const loss=-delta;
      if(loss>=TARGET_LOSS_MIN && loss<=TARGET_LOSS_MAX) return {cls:'good',label:'เข้าเป้า'};
      if(loss>TARGET_LOSS_MAX) return {cls:'warn',label:'เร็วกว่าเป้า'};
      if(loss>0) return {cls:'warn',label:'ช้ากว่าเป้า'};
      return {cls:'bad',label:'ยังไม่ลง'};
    }
    if(mode==='muscle'){
      if(delta>0.005) return {cls:'good',label:'บวก · ตรงเป้าหมาย'};
      if(delta>=MUSCLE_GOAL_MIN) return {cls:'good',label:'0 · ผ่านขั้นต่ำ'};
      if(delta>-0.20) return {cls:'warn',label:'ติดลบ · ต่ำกว่าเป้า'};
      return {cls:'bad',label:'ต้องเฝ้าระวัง'};
    }
    if(mode==='fat'){
      return delta<0 ? {cls:'good',label:'ลง'} : delta>0 ? {cls:'warn',label:'ขึ้น'} : {cls:'neutral',label:'ทรงตัว'};
    }
    return {cls:'neutral',label:'—'};
  }

  function statusFor(W,d){
    const ctx=WEEK_CONTEXT[iso(W.start)] || {};
    const weight=meta(d.weight,'loss');
    const muscle=meta(d.muscle,'muscle');

    // Red is intentionally reserved for a stronger multi-week confirmation rule;
    // one partial week cannot trigger it by itself.
    if(muscle.cls==='bad' || ctx.recoveryConcern) return {
      level:'yellow',
      icon:'🟡',
      title:'Muscle Preservation / Recovery',
      summary:'ลดน้ำหนักได้ตามแผน แต่กล้าม/การฟื้นตัวยังไม่ดีพอ จึงห้ามเพิ่ม deficit'
    };
    if(weight.cls==='good' && muscle.cls==='good') return {
      level:'green',
      icon:'🟢',
      title:'On Track',
      summary:'น้ำหนักลงในช่วงเป้าและกล้ามยังรักษาได้ ทำแผนเดิมต่อ'
    };
    return {
      level:'yellow',
      icon:'🟡',
      title:'Adjust, don’t accelerate',
      summary:'ยังไม่ครบทุกเงื่อนไขของสัปดาห์ที่ดี จึงยังไม่ควรเร่ง deficit'
    };
  }

  function addStyle(){
    if(document.getElementById('jacky-weekly-coach-style')) return;
    const s=document.createElement('style');
    s.id='jacky-weekly-coach-style';
    s.textContent=`
      .s-weekly-coach{margin:0 0 12px;padding:13px 14px;border:1px solid #eadfbd;border-radius:18px;background:#fffdf8}
      .s-weekly-coach.green{border-color:#cae5dd;background:#f8fdfb}
      .s-weekly-coach.red{border-color:#f0cdc6;background:#fff9f7}
      .s-coach-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:10px}
      .s-coach-copy p{margin:0 0 3px;color:#9b7228;font-size:9px;font-weight:900;letter-spacing:.12em}
      .s-weekly-coach.green .s-coach-copy p{color:#1d9e75}
      .s-weekly-coach.red .s-coach-copy p{color:#c55545}
      .s-coach-copy h2{margin:0;color:#182326;font-size:16px;line-height:1.15;letter-spacing:-.02em}
      .s-coach-copy small{display:block;margin-top:4px;color:#718084;font-size:9px;line-height:1.45}
      .s-coach-status{flex:0 0 auto;padding:6px 9px;border-radius:999px;background:#fff3d8;color:#87651f;font-size:9px;font-weight:900;white-space:nowrap}
      .s-weekly-coach.green .s-coach-status{background:#e8f7f3;color:#167f68}
      .s-weekly-coach.red .s-coach-status{background:#fff0eb;color:#b24b3b}
      .s-coach-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-bottom:9px}
      .s-coach-metric{padding:9px 10px;border:1px solid #eee8dc;border-radius:11px;background:#fff}
      .s-coach-metric small{display:block;color:#617579;font-size:9px;font-weight:850}
      .s-coach-metric strong{display:block;margin:3px 0 5px;color:#182326;font-size:16px;line-height:1.05;font-weight:950}
      .s-coach-pill{display:inline-block;padding:3px 7px;border-radius:999px;font-size:8px;font-weight:900}
      .s-coach-pill.good{background:#e8f7f3;color:#167f68}
      .s-coach-pill.warn{background:#fff3d8;color:#87651f}
      .s-coach-pill.bad{background:#fff0eb;color:#b24b3b}
      .s-coach-pill.neutral{background:#f1f4f3;color:#667477}
      .s-coach-plan{display:grid;grid-template-columns:1.05fr .95fr;gap:8px}
      .s-coach-box{padding:10px 11px;border:1px solid #ece8df;border-radius:12px;background:#fff}
      .s-coach-box h3{margin:0 0 6px;color:#34484b;font-size:10px;font-weight:950}
      .s-coach-box ul{margin:0;padding-left:16px;color:#5f7074;font-size:10px;line-height:1.65}
      .s-coach-rule{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:8px}
      .s-coach-rule div{padding:7px 8px;border-radius:9px;background:#f7f9f8;color:#667477;font-size:8px;line-height:1.35}
      .s-coach-rule b{display:block;margin-bottom:2px;color:#34484b;font-size:9px}
      .s-coach-foot{margin-top:7px;color:#7a8588;font-size:8px;line-height:1.45}
      @media(max-width:650px){
        .s-coach-head{align-items:flex-start}
        .s-coach-copy h2{font-size:15px}
        .s-coach-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
        .s-coach-plan{grid-template-columns:1fr}
        .s-coach-rule{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(s);
  }

  function render(){
    addStyle();
    const wrap=document.querySelector('#summary-app .summary-wrap');
    const checkpoint=wrap?.querySelector('.s-weekly-checkpoint');
    if(!wrap||!checkpoint) return false;

    const W=weekData();
    if(!W||!W.current.length||!W.previous.length) return false;
    const C=stats(W.current), P=stats(W.previous);
    const d={
      weight:C.weight-P.weight,
      fat:C.fat-P.fat,
      bf:C.bf-P.bf,
      muscle:C.muscle-P.muscle,
      water:C.water-P.water
    };
    const wm=meta(d.weight,'loss'), fm=meta(d.fat,'fat'), mm=meta(d.muscle,'muscle');
    const state=statusFor(W,d);
    const ctx=WEEK_CONTEXT[iso(W.start)]||{};

    let section=wrap.querySelector('.s-weekly-coach');
    if(!section){
      section=document.createElement('section');
      section.className='s-weekly-coach';
    }
    section.className=`s-weekly-coach ${state.level}`;

    const weekLabel=`${iso(W.start).slice(5).replace('-','/')}–${iso(W.end).slice(5).replace('-','/')}`;
    const periodLabel=W.closed?'ปิดสัปดาห์แล้ว':'Preview · สัปดาห์ยังไม่ปิด';

    section.innerHTML=`
      <div class="s-coach-head">
        <div class="s-coach-copy">
          <p>WEEKLY COACH · ${weekLabel}</p>
          <h2>${state.icon} ${state.title}</h2>
          <small>${state.summary}</small>
        </div>
        <span class="s-coach-status">${periodLabel}</span>
      </div>

      <div class="s-coach-metrics">
        <div class="s-coach-metric">
          <small>Weight avg</small>
          <strong>${f2(C.weight)} kg</strong>
          <span class="s-coach-pill ${wm.cls}">${signed(d.weight)} · ${wm.label}</span>
        </div>
        <div class="s-coach-metric">
          <small>Fat avg</small>
          <strong>${f2(C.fat)} kg</strong>
          <span class="s-coach-pill ${fm.cls}">${signed(d.fat)} · ${fm.label}</span>
        </div>
        <div class="s-coach-metric">
          <small>Muscle avg</small>
          <strong>${f2(C.muscle)} kg</strong>
          <span class="s-coach-pill ${mm.cls}">${signed(d.muscle)} · ${mm.label}</span>
        </div>
        <div class="s-coach-metric">
          <small>Water avg</small>
          <strong>${f2(C.water)} kg</strong>
          <span class="s-coach-pill neutral">${signed(d.water)}</span>
        </div>
      </div>

      <div class="s-coach-plan">
        <div class="s-coach-box">
          <h3>คำสั่งสัปดาห์ถัดไป</h3>
          <ul>
            <li><b>Calories:</b> คงเดิม — ไม่ลดเพิ่มในตอนนี้</li>
            <li><b>Protein:</b> 140–150 g/day</li>
            <li><b>Weight target:</b> ลดเฉลี่ย 0.30–0.50 kg/week</li>
            <li><b>Muscle target:</b> เป้าหมายคือ <b>บวก</b> · ขั้นต่ำที่ยอมรับได้คือ 0 (weekly avg)</li>
            <li><b>Training:</b> ${ctx.action || 'รักษา intensity แต่ไม่เพิ่ม fatigue ถ้า recovery ยังไม่เต็ม'}</li>
          </ul>
        </div>
        <div class="s-coach-box">
          <h3>เหตุผลของสถานะนี้</h3>
          <ul>
            <li>Weight avg เปลี่ยน ${signed(d.weight)} — ${wm.label}</li>
            <li>Fat avg เปลี่ยน ${signed(d.fat)} — ${fm.label}</li>
            <li>Muscle avg เปลี่ยน ${signed(d.muscle)} — เป้าหมายคือ > 0 · 0 = ผ่านขั้นต่ำ</li>
            <li>Water avg เปลี่ยน ${signed(d.water)}</li>
            ${ctx.note ? `<li><b>Recovery:</b> ${ctx.note}</li>` : ''}
          </ul>
        </div>
      </div>

      <div class="s-coach-rule">
        <div><b>🟢 GREEN</b>Weight −0.30 ถึง −0.50 kg/wk + Muscle ≥ 0 + recovery ปกติ · ถ้า Muscle > 0 ถือว่าได้ตามเป้าหมายเต็ม</div>
        <div><b>🟡 YELLOW</b>Muscle ติดลบ / recovery แย่ / น้ำหนักออกนอกช่วง → ห้ามเพิ่ม deficit</div>
        <div><b>🔴 RED</b>เข้าเกณฑ์ยืนยัน muscle loss ที่ล็อกไว้ → เพิ่มอาหาร/ลด fatigue และทบทวน cut</div>
      </div>

      <div class="s-coach-foot">เป้าลด 0.30–0.50 kg/week ใช้กับแนวโน้มน้ำหนักเฉลี่ย; Fat Mass จาก BIA ใช้เป็น trend ประกอบ ไม่บังคับว่าต้องลด 0.50 kg ไขมันทุกสัปดาห์ · Weekly Coach ใช้ค่าเฉลี่ยเทียบสัปดาห์ก่อน</div>
    `;

    checkpoint.insertAdjacentElement('beforebegin',section);
    return true;
  }

  function start(){
    [430,950,1750,3000].forEach(ms=>setTimeout(render,ms));
    document.addEventListener('click',e=>{
      if(e.target.closest?.('#summary-app .s-weekly-checkpoint,.s-range-controls button')){
        [100,320].forEach(ms=>setTimeout(render,ms));
      }
    });
  }

  document.readyState==='loading'
    ? document.addEventListener('DOMContentLoaded',start,{once:true})
    : start();
})();