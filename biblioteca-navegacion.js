/* Native navigation over a read-only snapshot; no third-party HTML is injected. */
window.createLibraryNavigation = function ({ roots, root, onSelect, onUnknownFolder }) {
  const $ = id => document.getElementById(id);
  const snapshot = window.JASG_DRIVE_INDEX?.folders || {};
  const rootId = root.url.split('/').pop();
  const path = [];
  let current = null;
  const normalized = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const isFolder = ref => ref.url.includes('/drive/folders/');

  function children(ref) {
    if (ref.id === 'pdf-index') {
      const seen = new Set();
      return Object.values(snapshot).flat().filter(item => item.type === 'file' && /\.pdf$/i.test(item.title) && /^[\w-]{10,200}$/.test(item.id) && !seen.has(item.id) && seen.add(item.id))
        .map(item => ({ id: item.id, title: item.title, category: 'Manuales', vehicle: '', url: `https://drive.google.com/file/d/${item.id}/view` }));
    }
    const id = ref.id === root.id ? rootId : ref.url.split('/').pop().split('?')[0];
    if (id === rootId) return roots;
    if (!Object.hasOwn(snapshot, id)) return null;
    return snapshot[id].flatMap(item => {
      if (!/^[\w-]{10,200}$/.test(item.id) || typeof item.title !== 'string' || !['file', 'folder'].includes(item.type)) return [];
      return [{ id: item.id, title: item.title, category: ref.category || 'Manuales', vehicle: '', url: `https://drive.google.com/${item.type === 'folder' ? 'drive/folders/' : 'file/d/'}${item.id}${item.type === 'file' ? '/view' : ''}` }];
    });
  }

  function clearFrame() {
    $('drive-viewer').hidden = true;
    $('drive-viewer').removeAttribute('src');
    $('expand-viewer').hidden = true;
  }

  function render() {
    const items = children(current);
    $('folder-path').replaceChildren();
    path.forEach((ref, index) => {
      const button = document.createElement('button');
      button.className = 'button secondary';
      button.textContent = ref.title;
      button.addEventListener('click', () => { path.splice(index + 1); openFolder(ref, false); });
      $('folder-path').append(button);
    });
    $('folder-entries').replaceChildren();
    const words = normalized($('folder-filter').value.trim()).split(/\s+/).filter(Boolean);
    const filtered = (items || []).filter(ref => words.every(word => normalized(ref.title).includes(word)));
    for (const ref of filtered) {
      const row = document.createElement('div');
      row.className = 'document-row';
      const button = document.createElement('button');
      button.className = 'document-link';
      button.textContent = ref.title;
      button.addEventListener('click', () => isFolder(ref) ? openFolder(ref) : openDocument(ref));
      const badge = document.createElement('span');
      badge.textContent = isFolder(ref) ? 'Carpeta →' : /\.pdf$/i.test(ref.title) ? 'PDF · Leer aquí' : 'Archivo · Vista previa';
      row.append(button, badge);
      $('folder-entries').append(row);
    }
    $('folder-empty').hidden = items === null || filtered.length > 0;
    $('folder-status').textContent = items === null
      ? 'Esta carpeta aún no está indexada. Se muestra el listado de Google; sus enlaces pueden abrir otra pestaña. También puedes guardar el enlace de un PDF para leerlo aquí.'
      : `${filtered.length} elementos · Selecciona un PDF para leerlo en este recuadro.`;
  }

  function openFolder(ref, append = true) {
    current = ref;
    if (append) path.push(ref);
    clearFrame();
    $('folder-filter').value = '';
    $('folder-browser').hidden = false;
    $('viewer-back').hidden = true;
    $('viewer-placeholder').hidden = true;
    onSelect(ref);
    render();
    if (children(ref) === null) onUnknownFolder(ref);
  }

  function openDocument(ref) {
    $('folder-browser').hidden = true;
    $('viewer-back').hidden = !current;
    $('expand-viewer').hidden = false;
    onSelect(ref, true);
  }

  function collapse() {
    $('viewer-section').classList.remove('expanded');
    $('expand-viewer').textContent = 'Ampliar visor';
    $('expand-viewer').setAttribute('aria-expanded', 'false');
  }
  $('folder-filter').addEventListener('input', render);
  $('browse-pdfs').addEventListener('click', () => {
    collapse();
    path.length = 0;
    path.push(root);
    openFolder({ ...root, id: 'pdf-index', title: 'PDFs disponibles · Índice parcial' });
    $('viewer-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('viewer-back').addEventListener('click', () => { collapse(); if (current) openFolder(current, false); });
  $('expand-viewer').addEventListener('click', () => {
    const expanded = $('viewer-section').classList.toggle('expanded');
    $('expand-viewer').textContent = expanded ? 'Reducir visor' : 'Ampliar visor';
    $('expand-viewer').setAttribute('aria-expanded', String(expanded));
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') collapse(); });
  return {
    show(ref) {
      collapse();
      if (isFolder(ref)) { path.length = 0; if (ref.id !== root.id) path.push(root); openFolder(ref); }
      else openDocument(ref);
    }
  };
};
