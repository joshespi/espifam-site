// Zoomable thumbnails. Triggers are <button>s in the markup, so keyboard and
// screen-reader users get the same affordance as a mouse click.
(() => {
  let overlay = null;
  let lastFocused = null;
  let inerted = [];
  let scrollLock = '';

  const close = () => {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    for (const node of inerted) node.inert = false;
    inerted = [];
    document.body.style.overflow = scrollLock;
    document.removeEventListener('keydown', onKey);
    lastFocused?.focus();
  };

  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') e.preventDefault();
  };

  const open = (trigger, img) => {
    close();
    lastFocused = document.activeElement;

    overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', img.alt || 'Enlarged image');

    // The page ships a small thumbnail; the full-size file is fetched only if
    // someone actually opens it.
    const big = document.createElement('img');
    big.src = trigger.dataset.full || img.currentSrc || img.src;
    big.alt = img.alt;
    big.className = 'lightbox-image';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Close';
    closeBtn.className = 'lightbox-close';

    overlay.append(big, closeBtn);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target === closeBtn) close();
    });

    document.body.appendChild(overlay);

    // aria-modal alone doesn't stop a screen reader's virtual cursor reaching
    // the page behind, and the Tab guard above only covers the keyboard.
    inerted = [...document.body.children].filter((node) => node !== overlay);
    for (const node of inerted) node.inert = true;
    scrollLock = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    document.addEventListener('keydown', onKey);
    closeBtn.focus();
  };

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-lightbox]');
    if (!trigger) return;
    const img = trigger.matches('img') ? trigger : trigger.querySelector('img');
    if (img) open(trigger, img);
  });
})();
