import assert from 'node:assert/strict';
import { chromium } from 'playwright';

export async function verifyTechnicalLibrary({ executablePath } = {}) {
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    // Isolated UI tests: no real account, customer data, or Drive writes.
    await context.route(/supabase|\/auth\.js/, route => route.fulfill({ contentType: 'application/javascript', body: '' }));
    await context.route('https://drive.google.com/**', route => route.fulfill({ contentType: 'text/html', body: '<p>External viewer fixture</p>' }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(new URL('../biblioteca-tecnica.html', import.meta.url).href);
    assert.equal(await page.locator('.reference-card').count(), 23);
    assert.equal(await page.locator('#drive-viewer').getAttribute('src'), null, 'Viewer loads only after user action');

    await page.locator('#search').fill('diesel');
    assert.equal(await page.locator('.reference-card').count(), 3, 'Search ignores accents');
    await page.locator('#search').fill('kia');
    assert.equal(await page.locator('.reference-card').count(), 2);
    await page.locator('#category').selectOption('Diagnóstico');
    assert.equal(await page.locator('.reference-card').count(), 1);
    await page.locator('.reference-card .icon-button').click();
    await page.reload();
    await page.locator('#favorites-only').check();
    assert.equal(await page.locator('.reference-card').count(), 1, 'Favorites survive reload');
    await page.getByRole('button', { name: 'Consultar', exact: true }).click();
    assert.equal(await page.locator('#folder-browser').isVisible(), true);
    assert.equal(await page.locator('#drive-viewer').getAttribute('src'), null);

    await page.locator('#add-reference').click();
    await page.locator('#reference-form [name=title]').fill('Manual de prueba');
    await page.locator('#reference-form [name=url]').fill('https://drive.google.com.evil.example/file/d/123456789012/view');
    await page.getByRole('button', { name: 'Guardar en este navegador', exact: true }).click();
    assert.match(await page.locator('#form-error').textContent(), /drive.google.com/);
    assert.equal(await page.locator('dialog[open]').count(), 1);

    const title = '<img src=x onerror=alert(1)> Manual de prueba';
    await page.locator('#reference-form [name=title]').fill(title);
    await page.locator('#reference-form [name=url]').fill('https://drive.google.com/file/d/12345678901234567890/view?resourcekey=test-key');
    await page.locator('#reference-form [name=vehicle]').fill('Kia Sportage 2019');
    await page.getByRole('button', { name: 'Guardar en este navegador', exact: true }).click();
    assert.equal(await page.locator('.reference-card').count(), 24);
    assert.equal(await page.locator('#catalog img').count(), 0, 'User text is never interpreted as HTML');
    await page.reload();
    await page.locator('#search').fill('sportage 2019');
    assert.equal(await page.locator('.reference-card').count(), 1, 'Saved vehicle metadata is searchable');
    await page.getByRole('button', { name: 'Consultar', exact: true }).click();
    assert.equal(await page.locator('#drive-viewer').getAttribute('src'), 'https://drive.google.com/file/d/12345678901234567890/preview?resourcekey=test-key');
    await page.locator('#assistant-form [name=make]').fill('Kia');
    await page.locator('#assistant-form [name=model]').fill('Sportage');
    await page.locator('#assistant-form [name=year]').fill('2019');
    await page.locator('#question').fill('¿Cuál es el diagrama del sensor?');
    await page.getByRole('button', { name: 'Preparar consulta', exact: true }).click();
    const prompt = await page.locator('#prompt-output').inputValue();
    assert.ok(prompt.includes('Kia Sportage') && prompt.includes('2019') && prompt.includes(title));
    assert.ok(prompt.includes('manual y la página') && prompt.includes('Si no puedes acceder'));
    await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.testClipboard = text; } } }); });
    await page.locator('#copy-prompt').click();
    assert.equal(await page.evaluate(() => window.testClipboard), prompt);
    await page.locator('#question').fill('Nueva consulta');
    assert.equal(await page.locator('#prepared').isVisible(), false, 'Edits invalidate the old prompt');
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Quitar', exact: true }).click();
    assert.equal(await page.locator('.reference-card').count(), 0);
    await page.locator('#search').fill('');
    assert.equal(await page.locator('.reference-card').count(), 23, 'Removing a local reference preserves Drive folders');

    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal page overflow on mobile');
    assert.equal(await page.locator('#assistant-form').isVisible(), true);
    assert.deepEqual(errors, []);
    return ['23 real folder shortcuts', 'Search and category filters', 'Persistent favorites and references', 'Unsafe URLs rejected and text safely rendered', 'Folder/file previews with resource keys', 'Prompt preparation and clipboard', 'Stale prompt invalidation', 'Local-only removal', 'Mobile layout without overflow', 'No JavaScript errors'];
  } finally { await browser.close(); }
}
