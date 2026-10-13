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
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    const coverage = await page.coverage.stopJSCoverage();
    return { passed: ['Native folders', 'Nested navigation', 'Folder search', 'Inline PDF', 'No new tab', 'Expanded view and Escape', 'Return and unload', 'Empty results', 'Kia folders', 'Mobile overflow'], coverage: coverage.filter(entry => entry.url.includes('biblioteca-navegacion.js')).map(entry => ({ url: entry.url, bytes: entry.source?.length, functions: entry.functions.map(fn => ({ name: fn.functionName, called: fn.ranges[0].count > 0 })) })) };
  } finally { await browser.close(); }
}
