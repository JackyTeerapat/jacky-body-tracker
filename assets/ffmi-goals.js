(() => {
  const S = window.__JACKY_TRACKER__;
  const HEIGHT_M = 1.78;
  const HEIGHT_CM = 178;
  const CUT_BASELINE_FFMI = 19.9;
  const ATHLETIC_FFMI = 21.5;
  const ADVANCED_FFMI = 22.5;
  const BF_LOW = 0.12;
  const BF_HIGH = 0.13;

  const f1 = v => Number.isFinite(v) ? v.toFixed(1) : '—';
  const ffmFor = ffmi => ffmi * HEIGHT_M * HEIGHT_M;
  const weightRangeFor = ffm => [ffm / (1 - BF_LOW), ffm / (1 - BF_HIGH)];
  const latest = () => S?.DATA?.length ? S.DATA[S.DATA.length - 1] : null;
  const ffmOf = d => {
    if (!d) return null;
    if (Number.isFinite(+d.fatFreeMass)) return +d.fatFreeMass;
    if (Number.isFinite(+d.weight) && Number.isFinite(+d.fat)) return +d.weight - +d.fat;
    return null;
  };

  function addStyle() {
    if (document.getElementById('jacky-ffmi-goals-style')) return;
    const style = document.createElement('style');
    style.id = 'jacky-ffmi-goals-style';
    style.textContent = `
      #summary-app .s-goal-remaining-card.muscle{display:none!important}
      #summary-app .s-goal-remaining-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      .s-ffmi-section{margin:0 0 12px;padding:13px 14px;border:1px solid #d8e4e1;border-radius:18px;background:#fff}
      .s-ffmi-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:10px}
      .s-ffmi-head p{margin:0 0 3px;color:#1d9e75;font-size:9px;font-weight:900;letter-spacing:.12em}
      .s-ffmi-head h2{margin:0;color:#182326;font-size:16px;line-height:1.15;letter-spacing:-.02em}
      .s-ffmi-head small{display:block;margin-top:4px;color:#718084;font-size:9px}
      .s-ffmi-height{flex:0 0 auto;padding:6px 9px;border-radius:999px;background:#eef5f3;color:#58706f;font-size:9px;font-weight:850;white-space:nowrap}
      .s-ffmi-cut{display:grid;grid-template-columns:1.15fr .85fr;gap:8px;margin-bottom:9px}
      .s-ffmi-cut-main,.s-ffmi-cut-weight{padding:11px 12px;border-radius:13px;border:1px solid #d5e7e2;background:#f7fbfa}
      .s-ffmi-cut-main small,.s-ffmi-cut-weight small,.s-ffmi-stage small{display:block;color:#617579;font-size:9px;font-weight:850}
      .s-ffmi-cut-main strong,.s-ffmi-cut-weight strong{display:block;margin-top:3px;color:#182326;font-size:18px;line-height:1.08;font-weight:950}
      .s-ffmi-status{display:inline-block;margin-top:6px;padding:3px 7px;border-radius:999px;font-size:9px;font-weight:850}
      .s-ffmi-status.ok{color:#167f68;background:#e8f7f3}
      .s-ffmi-status.warn{color:#b24b3b;background:#fff0eb}
      .s-ffmi-ladder{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .s-ffmi-stage{position:relative;padding:11px 12px;border:1px solid #e1e9e7;border-radius:13px;background:#fbfcfc;min-width:0}
      .s-ffmi-stage.current{border-color:#d5e7e2;background:#f7fbfa}
      .s-ffmi-stage.athletic{border-color:#cfe3ee;background:#f8fbfd}
      .s-ffmi-stage.advanced{border-color:#ded9ef;background:#fbf9ff}
      .s-ffmi-stage b{display:block;margin-top:3px;color:#182326;font-size:22px;line-height:1;font-weight:950}
      .s-ffmi-stage em{display:block;margin-top:4px;color:#607477;font-size:9px;line-height:1.45;font-style:normal}
      .s-ffmi-stage .s-ffmi-delta{margin-top:7px;padding-top:7px;border-top:1px solid #e6ecea;color:#566b6e;font-size:9px;font-weight:800}
      .s-ffmi-note{margin-top:8px;color:#718084;font-size:8px;line-height:1.45}
      @media(max-width:650px){
        #summary-app .s-goal-remaining-grid{grid-template-columns:1fr!important}
        .s-ffmi-head{align-items:flex-start}
        .s-ffmi-head h2{font-size:15px}
        .s-ffmi-cut{grid-template-columns:1fr}
        .s-ffmi-ladder{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function render() {
    addStyle();
    const wrap = document.querySelector('#summary-app .summary-wrap');
    const goal = wrap?.querySelector('.s-goal-progress-section');
    const d = latest();
    if (!wrap || !goal || !d) return false;

    const ffm = ffmOf(d);
    if (!Number.isFinite(ffm)) return false;
    const currentFfmi = ffm / (HEIGHT_M * HEIGHT_M);
    const cutWeights = weightRangeFor(ffm);
    const athleticFfm = ffmFor(ATHLETIC_FFMI);
    const advancedFfm = ffmFor(ADVANCED_FFMI);
    const athleticWeights = weightRangeFor(athleticFfm);
    const advancedWeights = weightRangeFor(advancedFfm);
    const baselineOk = currentFfmi >= CUT_BASELINE_FFMI - 0.05;

    let section = wrap.querySelector('.s-ffmi-section');
    if (!section) {
      section = document.createElement('section');
      section.className = 's-ffmi-section';
    }

    section.innerHTML = `
      <div class="s-ffmi-head">
        <div>
          <p>FFMI · MUSCLE ROADMAP</p>
          <h2>รักษากล้ามตอน cut → ค่อยไต่ระดับ Athletic</h2>
          <small>ใช้ Fat-Free Mass ปรับตามส่วนสูง แทนการล็อก Muscle Mass จาก BIA เพียงค่าเดียว</small>
        </div>
        <span class="s-ffmi-height">${HEIGHT_CM} cm</span>
      </div>

      <div class="s-ffmi-cut">
        <div class="s-ffmi-cut-main">
          <small>CUT PHASE · BASELINE TO PRESERVE</small>
          <strong>FFMI ${f1(currentFfmi)} · FFM ${f1(ffm)} kg</strong>
          <span class="s-ffmi-status ${baselineOk ? 'ok' : 'warn'}">${baselineOk ? 'อยู่เหนือ baseline 19.9' : 'ต่ำกว่า baseline 19.9 · ต้องเฝ้าระวังกล้าม'}</span>
        </div>
        <div class="s-ffmi-cut-weight">
          <small>ถ้ารักษา FFM นี้จน BF 12–13%</small>
          <strong>${f1(cutWeights[0])}–${f1(cutWeights[1])} kg</strong>
        </div>
      </div>

      <div class="s-ffmi-ladder">
        <div class="s-ffmi-stage current">
          <small>CURRENT</small>
          <b>${f1(currentFfmi)}</b>
          <em>FFM ${f1(ffm)} kg<br>BF ${f1(+d.bf)}% · Weight ${f1(+d.weight)} kg</em>
          <div class="s-ffmi-delta">ช่วง cut: เป้าคือรักษาระดับนี้ไว้</div>
        </div>
        <div class="s-ffmi-stage athletic">
          <small>ATHLETIC TARGET</small>
          <b>${ATHLETIC_FFMI.toFixed(1)}</b>
          <em>FFM ${f1(athleticFfm)} kg<br>Weight ${f1(athleticWeights[0])}–${f1(athleticWeights[1])} kg @ BF 12–13%</em>
          <div class="s-ffmi-delta">ต้องเพิ่ม FFM อีก ~${f1(Math.max(0, athleticFfm - ffm))} kg</div>
        </div>
        <div class="s-ffmi-stage advanced">
          <small>ADVANCED MUSCULAR</small>
          <b>${ADVANCED_FFMI.toFixed(1)}</b>
          <em>FFM ${f1(advancedFfm)} kg<br>Weight ${f1(advancedWeights[0])}–${f1(advancedWeights[1])} kg @ BF 12–13%</em>
          <div class="s-ffmi-delta">ต้องเพิ่ม FFM อีก ~${f1(Math.max(0, advancedFfm - ffm))} kg</div>
        </div>
      </div>

      <div class="s-ffmi-note">FFMI 21.5 และ 22.5 เป็น milestone สำหรับ roadmap ไม่ใช่เกณฑ์ทางการแพทย์ว่า “ต้องถึงจึงเป็นนักกีฬา” · เป้าระยะนี้ยังคงเป็นลดไขมันโดยรักษา FFMI/แรงยกก่อน</div>
    `;

    goal.insertAdjacentElement('afterend', section);
    return true;
  }

  function start() {
    [360, 850, 1600, 2800].forEach(ms => setTimeout(render, ms));
    document.addEventListener('click', e => {
      if (e.target.closest?.('#summary-app .s-weekly-checkpoint,.s-range-controls button')) {
        [120, 360].forEach(ms => setTimeout(render, ms));
      }
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', start, {once:true})
    : start();
})();