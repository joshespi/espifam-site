// Thumbnails are <button data-lightbox data-full="..."><img></button>; a native
// <dialog> handles focus trapping, Escape and returning focus to the button.
(() => {
  let dialog = null;

  const getDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'lightbox';
    dialog.append(document.createElement('img'));
    dialog.addEventListener('click', () => dialog.close());
    document.body.append(dialog);
    return dialog;
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lightbox]');
    if (!btn) return;
    const thumb = btn.querySelector('img');
    const d = getDialog();
    const big = d.querySelector('img');
    big.src = btn.dataset.full || thumb.currentSrc || thumb.src;
    big.alt = thumb.alt;
    d.setAttribute('aria-label', thumb.alt || 'Image preview');
    d.showModal();
  });
})();
