import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../tasador.html', import.meta.url), 'utf8');

assert.match(html, /data-testid="print-client-report"/);
assert.match(html, /generateClientReport\(\)/);

const clientTemplate = html.match(/<!-- INFORME PDF CLIENTE -->([\s\S]*?)<!-- FIN INFORME PDF CLIENTE -->/);
assert.ok(clientTemplate, 'Debe existir una plantilla independiente para el cliente');
assert.match(clientTemplate[1], /calculateSuggestedOffer/);
assert.doesNotMatch(clientTemplate[1], /commercialValue|calculateRepairCost|deduction|\$|CLP|pesos/i);

console.log('Tasador client report RED checks passed');
