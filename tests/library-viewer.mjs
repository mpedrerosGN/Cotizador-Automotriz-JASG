import assert from 'node:assert/strict';
import { chromium } from 'playwright';

export async function verifyLibraryViewer({ executablePath } = {}) {
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.route(/supabase|\/auth\.js/, route => route.fulfill({ body: '' }));
    await context.route('https://drive.google.com/**', route => route.fulfill({ contentType: 'text/html', body: '<p>PDF preview fixture</p>' }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(new URL('../biblioteca-tecnica.html', import.meta.url).href);
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
    await page.reload();
    await page.locator('#explore-root').click();
    assert.equal(await page.locator('#folder-browser').isVisible(), true, 'Folders need native navigation, not a Google folder iframe');
    await page.locator('#folder-entries').getByRole('button', { name: 'Manuales de taller', exact: true }).click();
    await page.locator('#folder-entries').getByRole('button', { name: 'Manuales de Taller', exact: true }).click();
    await page.locator('#folder-entries').getByRole('button', { name: 'MAZDA', exact: true }).click();
    await page.locator('#folder-filter').fill('Mazda-3-2004');
    await page.locator('#folder-entries').getByRole('button', { name: 'Mazda-3-2004', exact: true }).click();
    await page.locator('#folder-entries').getByRole('button', { name: 'Mazda 3 2004.pdf', exact: true }).click();
    assert.equal(await page.locator('#drive-viewer').getAttribute('src'), 'https://drive.google.com/file/d/1rubNN91Hqk1IpUMF48tSQFRDM_5h-ZU6/preview');
    assert.equal(context.pages().length, 1, 'PDF opens inside the module');
    await page.locator('#expand-viewer').click();
    assert.equal(await page.locator('#viewer-section').evaluate(el => el.classList.contains('expanded')), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#viewer-section').evaluate(el => el.classList.contains('expanded')), false);
    await page.locator('#viewer-back').click();
    assert.equal(await page.locator('#drive-viewer').isVisible(), false);
    assert.equal(await page.locator('#drive-viewer').getAttribute('src'), null, 'Leaving PDF unloads the frame');
    await page.locator('#folder-filter').fill('nonexistent manual');
    assert.equal(await page.locator('#folder-empty').isVisible(), true);
    await page.locator('#explore-root').click();
    await page.locator('#folder-filter').fill('kia');
    assert.equal(await page.locator('#folder-entries button').count(), 2);
    await page.locator('#folder-entries').getByRole('button', { name: 'Base de datos · Kia', exact: true }).click();
    assert.equal(await page.locator('#folder-entries').getByRole('button', { name: 'G. D.S -KIA', exact: true }).count(), 1);
    await page.locator('#folder-path').getByRole('button', { name: 'Manuales y diagramas', exact: true }).click();
    assert.equal(await page.locator('#folder-entries button').count(), 23);
    await page.locator('#browse-pdfs').click();
    await page.locator('#folder-filter').fill('Mazda 3 2004');
    await page.locator('#folder-entries').getByRole('button', { name: 'Mazda 3 2004.pdf', exact: true }).click();
    assert.match(await page.locator('#drive-viewer').getAttribute('src'), /1rubNN91Hqk1IpUMF48tSQFRDM_5h-ZU6\/preview$/);
    await page.locator('#question').fill('¿Qué manual seleccioné?');
    await page.getByRole('button', { name: 'Preparar consulta', exact: true }).click();
    assert.ok((await page.locator('#prompt-output').inputValue()).includes('1rubNN91Hqk1IpUMF48tSQFRDM_5h-ZU6'));
    await page.locator('#add-reference').click();
    await page.locator('#reference-form [name=title]').fill('Carpeta fuera del índice');
    await page.locator('#reference-form [name=url]').fill('https://drive.google.com/drive/folders/unknownfolder12345?resourcekey=test-key');
    await page.getByRole('button', { name: 'Guardar en este navegador', exact: true }).click();
    await page.locator('#search').fill('Carpeta fuera del índice');
    await page.getByRole('button', { name: 'Consultar', exact: true }).click();
    assert.match(await page.locator('#folder-status').textContent(), /aún no está indexada/);
    assert.match(await page.locator('#drive-viewer').getAttribute('src'), /unknownfolder12345&resourcekey=test-key/);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    const coverage = await page.coverage.stopJSCoverage();
    const navigationCoverage = coverage.filter(entry => entry.url.includes('biblioteca-navegacion.js')).map(entry => {
      const functions = entry.functions;
      const ranges = functions.flatMap(fn => fn.ranges);
      const boundaries = [...new Set(ranges.flatMap(range => [range.startOffset, range.endOffset]))].sort((a, b) => a - b);
      let used = 0;
      let total = 0;
      for (let index = 0; index < boundaries.length - 1; index++) {
        const start = boundaries[index];
        const end = boundaries[index + 1];
        const containing = ranges.filter(range => range.startOffset <= start && range.endOffset >= end).sort((a, b) => (a.endOffset - a.startOffset) - (b.endOffset - b.startOffset));
        if (containing.length) { total += end - start; if (containing[0].count > 0) used += end - start; }
      }
      return { functions: functions.filter(fn => fn.ranges[0].count > 0).length / functions.length * 100, executedBytes: Number((used / total * 100).toFixed(1)) };
    });
    assert.ok(navigationCoverage.every(result => result.functions >= 80 && result.executedBytes >= 80));
    return { passed: ['Native folders', 'Nested navigation', 'Folder search', 'Inline PDF', 'No new tab', 'Expanded view and Escape', 'Return and unload', 'Empty results', 'Kia folders', 'PDF catalog', 'Selected PDF in assistant prompt', 'Unindexed folder fallback with resource key', 'Mobile overflow'], coverage: navigationCoverage };
  } finally { await browser.close(); }
}
