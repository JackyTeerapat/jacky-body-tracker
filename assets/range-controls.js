(() => {
  const CANONICAL = [1, 7, 30, 180, 365, 10000];

  function cleanLabel(button) {
    return String(button?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function canonicalFromLabel(label) {
    if (/^(ครั้งก่อน|1 วัน)$/.test(label)) return 1;
    if (/^(สัปดาห์|สัปดาห์นี้|7 วัน)$/.test(label)) return 7;
    if (/^(เดือนนี้|30 วัน)$/.test(label)) return 30;
    if (/^6 เดือน$/.test(label)) return 180;
    if (/^(ปีนี้|1 ปี)$/.test(label)) return 365;
    if (/^ตั้งแต่เริ่ม$/.test(label)) return 10000;
    return null;
  }

  function canonicalFromRaw(raw) {
    if (raw == null || raw === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    if (n === 1 || n === 7 || n === 30) return n;
    if (n >= 150 && n < 350) return 180;
    if (n >= 350 && n < 1000) return 365;
    if (n >= 1000 || n === 0) return 10000;
    return null;
  }

  function canonicalLabel(range) {
    if (range === 1) return 'ครั้งก่อน';
    if (range === 7) return 'สัปดาห์';
    if (range === 30) return 'เดือนนี้';
    if (range === 180) return '6 เดือน';
    if (range === 365) return 'ปีนี้';
    return 'ตั้งแต่เริ่ม';
  }

  function normalize() {
    const controls = document.querySelector('#summary-app .s-range-controls');
    if (!controls) return false;

    const buttons = [...controls.querySelectorAll('button')];
    buttons.forEach((button, index) => {
      const range = canonicalFromLabel(cleanLabel(button))
        ?? canonicalFromRaw(button.dataset.range)
        ?? CANONICAL[index]
        ?? null;
      if (!Number.isFinite(range)) return;

      const value = String(range);
      const label = canonicalLabel(range);
      if (button.dataset.range !== value) button.dataset.range = value;
      if (button.dataset.trRange !== value) button.dataset.trRange = value;
      if (cleanLabel(button) !== label) button.textContent = label;
      if (button.disabled) button.disabled = false;
      if (button.hasAttribute('disabled')) button.removeAttribute('disabled');
      if (button.getAttribute('aria-disabled') !== 'false') button.setAttribute('aria-disabled', 'false');
    });

    return buttons.length >= CANONICAL.length;
  }

  function start() {
    let attempts = 0;
    const boot = () => {
      attempts += 1;
      if (!normalize() && attempts < 60) setTimeout(boot, 100);
    };
    boot();
    [250, 800, 1800, 3200, 5200].forEach(ms => setTimeout(normalize, ms));
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', start, { once: true })
    : start();
})();
