(() => {
  let overlay = null;

  const close = () => {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.removeEventListener('keydown', onKey);
  };

  const onKey = (e) => { if (e.key === 'Escape') close(); };

  document.addEventListener('click', (e) => {
    const img = e.target.closest('img[data-lightbox]');
    if (!img) return;
    e.preventDefault();

    overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 cursor-zoom-out';
    const big = document.createElement('img');
    big.src = img.currentSrc || img.src;
    big.alt = img.alt;
    big.className = 'max-w-full max-h-full object-contain';
    overlay.appendChild(big);
    overlay.addEventListener('click', close);
    document.body.appendChild(overlay);
    document.addEventListener('keydown', onKey);
  });
})();
