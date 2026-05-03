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
    const current = root.dataset.theme === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    localStorage.setItem(KEY, next);
  });
})();
