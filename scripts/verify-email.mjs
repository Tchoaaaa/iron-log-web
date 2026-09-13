import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });
  const html = await readFile(new URL('../emails/confirm-signup.html', import.meta.url), 'utf8');
  await page.setContent(html.replaceAll('{{ .ConfirmationURL }}', 'https://example.invalid/confirm'));
  const output = fileURLToPath(new URL('../verification/', import.meta.url));
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: `${output}11-confirmation-email.png`, fullPage: true });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Email overflows mobile viewport');
  console.log('PASS: email template renders at 390px without horizontal overflow. No email sent.');
} finally { await browser.close(); }
