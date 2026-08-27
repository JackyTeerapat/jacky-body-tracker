(() => {
  const start = () => {
    document.querySelectorAll('.s-verdict').forEach(el => el.remove());
  };
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', start, { once: true })
    : start();
})();
