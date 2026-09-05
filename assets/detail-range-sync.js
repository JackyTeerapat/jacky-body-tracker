(() => {
  const S = window.__JACKY_TRACKER__;
  if (!S?.DATA?.length) return;

  const D = S.DATA
    .filter(x => x?.isoDate)
    .slice()
    .sort((a,b) => String(a.measuredAt || a.isoDate).localeCompare(String(b.measuredAt || b.isoDate)));
  if (!D.length) return;

  const latest = D.at(-1);
  const reference = D.length >= 2 ? D.at(-2) : null;

  const metricDefs = [
    {labels:['Weight','น้ำหนัก'], key:'weight', unit:'kg', digits:1, direction:'lower'},
    {labels:['Fat Mass','Fat mass','ไขมัน'], key:'fat', unit:'kg', digits:1, direction:'lower'},
    {labels:['Body Fat','Body fat'], key:'bf', unit:'จุด', digits:1, direction:'lower'},
    {labels:['Muscle Mass','Muscle mass','กล้ามเนื้อ'], key:'muscle', unit:'kg', digits:1, direction:'higher'},
    {labels:['Skeletal Muscle','Skeletal muscle','กล้ามเนื้อโครงร่าง'], key:'skeletalMuscle', unit:'kg', digits:1, direction:'higher'},
    {labels:['Body Water','Body water','น้ำในร่างกาย'], key:'waterWeight', unit:'kg', digits:1, direction:'neutral'},
    {labels:['BMI'], key:'bmi', unit:'', digits:1, direction:'neutral'},
    {labels:['Visceral Fat','Visceral fat'], key:'vis', unit:'', digits:0, direction:'lower'},
    {labels:['BMR'], key:'bmr', unit:'kcal', digits:0, direction:'neutral'},
    {labels:['Body Age','Body age'], key:'bodyAge', unit:'ปี', digits:0, direction:'lower'},
    {labels:['Bone Mass','Bone mass'], key:'boneMass', unit:'kg', digits:1, direction:'neutral'},
    {labels:['Protein Mass','Protein mass'], key:'proteinMass', unit:'kg', digits:1, direction:'neutral'},
    {labels:['Fat Free Mass','Fat-free Mass','Fat-free mass'], key:'fatFreeMass', unit:'kg', digits:1, direction:'neutral'},
    {labels:['Subcutaneous Fat','Subcutaneous fat'], key:'subcutaneousFat', unit:'%', digits:1, direction:'lower'},
    {labels:['ASMI'], key:'asmi', unit:'', digits:1, direction:'higher'},
    {labels:['WHR'], key:'whr', unit:'', digits:2, direction:'lower'},
    {labels:['Score','คะแนน'], key:'score', unit:'', digits:0, direction:'higher'}
  ];

  function semanticClass(def, delta){
    if (!Number.isFinite(delta) || Math.abs(delta) < 1e-9 || def.direction === 'neutral') return 'jacky-neutral';
    const good = def.direction === 'lower' ? delta < 0 : delta > 0;
    return good ? 'jacky-good' : 'jacky-bad';
  }

  function deltaText(def, current, previous){
    if (!Number.isFinite(current) || !Number.isFinite(previous)) return '(—)';
    const delta = current - previous;
    const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
    return `(${sign}${Math.abs(delta).toFixed(def.digits)}${def.unit ? ` ${def.unit}` : ''})`;
  }

  function findDeltaLeaf(start){
    let row = start;
    for (let level=0; row && level<7; level++, row=row.parentElement) {
      const leaves = [...row.querySelectorAll('*')].filter(el => el.children.length === 0);
      const hit = leaves.find(el => /^\(\s*[+−-]?\s*\d/.test((el.textContent || '').trim()) || /^\(—\)$/.test((el.textContent || '').trim()));
      if (hit) return hit;
    }
    return null;
  }

  function updateMetricDiffs(){
    if (!reference) return;
    const root = document.querySelector('#summary-app');
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement?.closest('.tr2-root,.s-range-controls,.s-weekly-checkpoint,.s-this-week-preview,.s-goal-progress-section')) continue;
      const text = node.nodeValue?.trim();
      const def = metricDefs.find(item => item.labels.includes(text));
      if (def) nodes.push({def,start:node.parentElement});
    }

    const seen = new Set();
    nodes.forEach(({def,start}) => {
      if (seen.has(def.key)) return;
      const leaf = findDeltaLeaf(start);
      if (!leaf) return;
      const current = Number(latest[def.key]);
      const previous = Number(reference[def.key]);
      if (!Number.isFinite(current) || !Number.isFinite(previous)) return;
      const delta = current - previous;
      leaf.textContent = deltaText(def,current,previous);
      leaf.classList.remove('jacky-good','jacky-bad','jacky-neutral');
      leaf.classList.add(semanticClass(def,delta));
      leaf.style.fontWeight = '800';
      seen.add(def.key);
    });
  }

  function updateLabels(){
    const root = document.querySelector('#summary-app');
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const edits = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement?.closest('.tr2-root,.s-range-controls,.s-weekly-checkpoint,.s-this-week-preview,.s-goal-progress-section')) continue;
      const text = node.nodeValue?.trim();
      if (!text) continue;
      if (text === 'ตัวเลขตามช่วงที่เลือก') edits.push([node,'รายละเอียดผลสแกนล่าสุด']);
      else if (/^เทียบ\s+(?:ครั้งก่อน|1 วัน|7 วัน|30 วัน|6 เดือน|1 ปี|ตั้งแต่เริ่ม|สัปดาห์|เดือนนี้|ปีนี้|ผลล่าสุด|รายวัน|รายสัปดาห์|รายเดือน)$/.test(text)) edits.push([node,'เทียบผลวัดก่อนหน้า']);
    }
    edits.forEach(([node,replacement]) => {
      const old = node.nodeValue;
      node.nodeValue = old.replace(old.trim(), replacement);
    });
  }

  function sync(){
    updateLabels();
    updateMetricDiffs();
  }

  function start(){
    [50,250,800,1600,3200].forEach(ms => setTimeout(sync,ms));
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded',start,{once:true})
    : start();
})();
