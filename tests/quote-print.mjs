import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

// Uses a fresh browser profile and blocks authentication/cloud scripts so these
// checks never read or save customer records. Optional CDN files allow offline QA.
export async function verifyQuotePrint({ executablePath, dependencyFiles = {} } = {}) {
    const browser = await chromium.launch({ headless: true, executablePath });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const results = [];
    try {
        await context.route(/\/(auth|supabase-client|jasg-cloud)\.js|supabase-js/, route =>
            route.fulfill({ contentType: 'application/javascript', body: '' }));
        for (const [url, path] of Object.entries(dependencyFiles)) {
            await context.route(url, route => route.fulfill({ path }));
        }
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(new URL('../index.html', import.meta.url).href);
        await page.waitForFunction(() => window.Alpine && !document.body.hasAttribute('x-cloak'));
        await page.evaluate(() => document.fonts.ready);
        const originalTitle = await page.title();

        async function setQuote(count, terms = false, photos = false) {
            await page.evaluate(async ({ count, terms, photos }) => {
                const app = Alpine.$data(document.body);
                app.activeTab = 'preview';
                app.client.name = 'Cliente De Prueba';
                app.client.email = 'cliente@example.com';
                app.client.idNumber = 'RUT de prueba';
                Object.assign(app.vehicle, { make: 'MAZDA', model: '3', year: '2019', plate: 'LL-HG-37', mileage: '75.000' });
                app.items = Array.from({ length: count }, (_, index) => ({
                    ...app.catalog[index % app.catalog.length], id: index + 1, quantity: 1
                }));
                app.showTermsInPrint = terms;
                app.showImagesInPrint = photos;
                app.images = [{ data: new URL('assets/jasg-logo.jpeg', location.href).href }];
                await Alpine.nextTick();
            }, { count, terms, photos });
        }

        async function checkAlignment() {
            const boxes = await page.evaluate(() => {
                const bounds = selector => {
                    const { top, bottom, width } = document.querySelector(selector).getBoundingClientRect();
                    return { top, bottom, width };
                };
                return {
                    bank: bounds('.bank-details-card'), total: bounds('.quote-total-card'),
                    workshop: bounds('.print-signatures > div:first-child > div'),
                    client: bounds('.print-signatures > div:last-child > div')
                };
            });
            for (const edge of ['top', 'bottom', 'width']) {
                assert.ok(Math.abs(boxes.bank[edge] - boxes.total[edge]) < 0.5, `Cards differ at ${edge}`);
            }
            assert.ok(Math.abs(boxes.workshop.top - boxes.client.top) < 0.5, 'Signature lines must align');
        }

        async function printAndInspect(format) {
            const scenario = await page.evaluate(() => {
                const app = Alpine.$data(document.body);
                return `${app.items.length} items, terms=${app.showTermsInPrint}, photos=${app.showImagesInPrint}`;
            });
            // Exercise the actual button handler; Playwright supplies the print
            // backend and dispatches the real beforeprint/afterprint events.
            await page.evaluate(() => {
                window.print = () => {};
                Alpine.$data(document.body).preparePrint();
            });
            assert.match(await page.title(), /^JASG-Cotizacion-/);
            assert.ok(!(await page.title()).includes('COT-'), 'No internal number in PDF filename');
            const bytes = await page.pdf({ format, printBackground: true, preferCSSPageSize: true });
            const document = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
            const pages = [];
            try {
                for (let number = 1; number <= document.numPages; number++) {
                    const pdfPage = await document.getPage(number);
                    const { items } = await pdfPage.getTextContent();
                    const text = items.map(item => item.str).join(' ');
                    assert.ok(text.trim().length > 100, `${format}, ${scenario}: page ${number} is blank or contains only signatures (${text.trim()})`);
                    pages.push({ text, items, height: pdfPage.view[3] });
                }
            } finally {
                await document.destroy();
            }
            assert.equal(await page.title(), originalTitle, 'Restore the app title after printing');
            assert.equal(await page.locator('.cotizador-editor .terms-page').count(), 1, 'Restore optional terms');
            const text = pages.map(page => page.text).join(' ');
            assert.equal((text.match(/Firma \/ Sello Taller/g) || []).length, 1, 'Workshop signature must appear once');
            assert.equal((text.match(/Conformidad Cliente/g) || []).length, 1, 'Client signature must appear once');
            assert.ok(!text.includes('COT-'), 'No internal number in printed content');
            const signedPage = pages.find(page => page.text.includes('Firma / Sello Taller'));
            const workshop = signedPage.items.find(item => item.str === 'Firma / Sello Taller');
            const client = signedPage.items.find(item => item.str === 'Conformidad Cliente');
            assert.ok(Math.abs(workshop.transform[5] - client.transform[5]) < 0.5, 'PDF signature baselines must align');
            return { pages, signedPage, signatureY: workshop.transform[5] };
        }

        await setQuote(2);
        await checkAlignment();
        results.push('Desktop preview: equal card dimensions and aligned signatures');

        for (const format of ['A4', 'Letter']) {
            for (const count of [1, 2, 13]) {
                await setQuote(count);
                await page.emulateMedia({ media: 'print' });
                await checkAlignment();
                const { pages, signatureY } = await printAndInspect(format);
                assert.equal(pages.length, 1, `${format}, ${count} items must fit on one page`);
                assert.ok(signatureY > 10 && signatureY < 65, 'Signatures must sit at the foot of the page');
                results.push(`${format}, ${count} items: 1 page, one aligned signature pair at the foot`);
            }
        }

        for (const terms of [true, false, true, false]) {
            await setQuote(2, terms);
            const { pages } = await printAndInspect('A4');
            assert.equal(pages.length, terms ? 2 : 1);
            assert.equal(pages.some(page => page.text.includes('TÉRMINOS Y CONDICIONES')), terms, `Terms checkbox ${terms}`);
            if (terms) assert.ok(!pages[1].text.includes('Conformidad Cliente'));
        }
        results.push('Terms checkbox: repeated on/off printing adds only the requested terms page');

        for (const photos of [true, false]) {
            await setQuote(2, false, photos);
            const { pages } = await printAndInspect('A4');
            assert.equal(pages.length, 1);
            assert.equal(pages[0].text.toLocaleLowerCase('es-CL').includes('registro fotográfico adjunto'), photos, `Photo checkbox ${photos}`);
        }
        results.push('Photo checkbox: checked photos included, unchecked photos omitted');

        await setQuote(40);
        const { pages } = await printAndInspect('A4');
        assert.equal(pages.length, 2, 'Long quote continues on a second content page');
        assert.ok(pages[0].text.includes('Reparacion'), 'Items must start on the first page');
        assert.ok(pages[1].text.includes('Conformidad Cliente'));
        results.push('40 items: 2 populated pages, signatures only once on the last page');

        await page.setViewportSize({ width: 390, height: 844 });
        await setQuote(2);
        await checkAlignment();
        assert.equal((await printAndInspect('A4')).pages.length, 1);
        results.push('Mobile-width print: aligned cards, 1 page');
        assert.deepEqual(errors, [], 'No JavaScript errors during print or restoration');
        return results;
    } finally {
        await browser.close();
    }
}
