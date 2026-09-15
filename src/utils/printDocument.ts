let printing = false;

/** Print one document in normal flow, outside fixed/scrolling modal ancestors. */
export async function printDocument(button: HTMLElement) {
  if (printing) return;
  const source = button.closest('.fixed')?.querySelector<HTMLElement>('.printable-area');
  if (!source) return;
  printing = true;
  const root = document.createElement('div');
  root.id = 'kiri-print-root';
  root.append(source.cloneNode(true));
  document.body.append(root);
  const cleanup = () => {
    root.remove();
    printing = false;
    window.removeEventListener('afterprint', cleanup);
  };
  try {
    await document.fonts.ready;
    await Promise.all(Array.from(root.querySelectorAll('img')).map(img =>
      img.decode().catch(() => undefined)
    ));
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
  } catch (error) {
    cleanup();
    console.error('Print failed', error);
    window.alert('Dokumen belum dapat dicetak. Silakan coba lagi.');
  }
}
