// Run with the Vite dev server on localhost:3000 and Playwright installed.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://127.0.0.1:3000/tests/ux-fixture.html');
  const quantity = page.getByRole('spinbutton', { name: 'Quantity' });
  await quantity.focus();
  await quantity.fill('');
  assert.equal(await quantity.inputValue(), '');
  await quantity.fill('25.5');
  assert.equal(await page.locator('#numeric-value').textContent(), '25.5');
  await quantity.blur();
  assert.equal(await quantity.inputValue(), '25.5');

  await page.evaluate(() => { window.printCalls = 0; window.print = () => { window.printCalls++; }; });
  await page.locator('#print').evaluate(button => button.click());
  await page.waitForFunction(() => window.printCalls === 1);
  await page.locator('#print').evaluate(button => button.click());
  assert.equal(await page.evaluate(() => window.printCalls), 1);
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('#root').evaluate(el => getComputedStyle(el).display), 'none');
  assert.equal(await page.locator('#kiri-print-root .printable-area').evaluate(el => getComputedStyle(el).position), 'static');
  assert.equal(await page.locator('#kiri-print-root h1').count(), 1);
  assert.equal(await page.locator('#kiri-print-root').getByText('OTHER DOCUMENT MUST NOT PRINT').count(), 0);
  await page.pdf({ path: '/tmp/kiri-print-regression.pdf', format: 'A4' });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  assert.equal(await page.locator('#kiri-print-root').count(), 0);
  await page.emulateMedia({ media: 'screen' });
  // Remove the artificial print fixture overlay to exercise the real mobile form.
  await page.locator('#print').evaluate(el => el.closest('.fixed').remove());
  await page.getByRole('button', { name: /Tambah SKU/ }).first().click();
  const sku = page.getByRole('textbox', { name: 'Kode SKU barang' });
  assert.match(await sku.inputValue(), /^SKU-\d{5,}$/);
  await sku.fill('');
  assert.equal(await sku.inputValue(), '');
  await page.getByRole('button', { name: 'Buat SKU otomatis' }).click();
  assert.match(await sku.inputValue(), /^SKU-\d{5,}$/);
  const box = await sku.boundingBox();
  assert.ok(box.height >= 44 && box.x >= 0 && box.x + box.width <= 390);
  console.log('PASS: numeric clear/retype, print isolation/double-click/cleanup, mobile SKU');
} finally { await browser.close(); }
