// The initial theme is applied by an inline script in <head> (see partials/head.html)
// so there's no flash; this only handles toggling and label state afterwards.
(() => {
  const KEY = 'espifam-theme';
  const root = document.documentElement;

  const sync = () => {
    const isLight = root.dataset.theme === 'light';
    for (const btn of document.querySelectorAll('[data-theme-toggle]')) {
      btn.setAttribute('aria-pressed', String(isLight));
      btn.textContent = isLight ? 'Switch to dark theme' : 'Switch to light theme';
    }
  };

  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-theme-toggle]')) return;
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(KEY, root.dataset.theme); } catch { /* private mode */ }
    sync();
  });

  // Follow the OS only while the visitor hasn't picked a theme themselves.
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    try { if (localStorage.getItem(KEY)) return; } catch { /* private mode */ }
    root.dataset.theme = e.matches ? 'light' : 'dark';
    sync();
  });

  sync();
})();
