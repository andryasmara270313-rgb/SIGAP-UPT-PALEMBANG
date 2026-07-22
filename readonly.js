document.addEventListener(
  'submit',
  (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (new URL(form.action, location.href).pathname === '/logout') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.alert(
      'Paket ini adalah snapshot produksi read-only. Tampilan dan data dapat dibuka, tetapi fungsi tambah, ubah, dan hapus memerlukan source backend serta database asli.'
    );
  },
  true
);
