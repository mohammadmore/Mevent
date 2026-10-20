import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('BODY:', bodyText);
  await browser.close();
})();
