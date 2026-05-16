(() => {
  const KEY = 'espifam-theme';
  const root = document.body;

  const stored = localStorage.getItem(KEY);
  if (stored === 'light' || stored === 'dark') {
    root.dataset.theme = stored;
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme-toggle]');
    if (!btn) return;
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    localStorage.setItem(KEY, next);
  });
})();
