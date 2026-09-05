(() => {
  const MODES = [
    { range: 1, label: 'รายวัน' },
    { range: 7, label: 'รายสัปดาห์' },
    { range: 30, label: 'รายเดือน' }
  ];

  function normalize() {
    const controls = document.querySelector('#summary-app .s-range-controls');
    if (!controls) return false;

    let buttons = [...controls.querySelectorAll('button')];
    if (!buttons.length) return false;

    while (buttons.length < MODES.length) {
      const clone = buttons[0].cloneNode(true);
      controls.appendChild(clone);
      buttons.push(clone);
    }

    buttons.forEach((button, index) => {
      if (index >= MODES.length) {
        button.remove();
        return;
      }
      const mode = MODES[index];
      button.dataset.range = String(mode.range);
      button.dataset.trRange = String(mode.range);
      button.textContent = mode.label;
      button.disabled = false;
      button.removeAttribute('disabled');
      button.setAttribute('aria-disabled', 'false');
      button.setAttribute('aria-label', `ดูแนวโน้ม${mode.label}`);
    });

    controls.dataset.resolutionControls = '1';
    return true;
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
