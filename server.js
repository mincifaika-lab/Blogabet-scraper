const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/pick', async (req, res) => {
  const pickUrl = req.query.url;
  if (!pickUrl) return res.status(400).json({ error: 'No URL' });

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    console.log('Opening URL:', pickUrl);
    await page.goto(pickUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Чакаме CAPTCHA да се зареди
    await new Promise(r => setTimeout(r, 3000));

    const title = await page.title();
    console.log('Page title:', title);

    // Проверяваме дали има CAPTCHA
    const hasCaptcha = await page.$('#pickValidationRecaptcha');
    console.log('Has captcha:', !!hasCaptcha);

    if (hasCaptcha) {
      // Кликаме checkbox-а
      const frame = page.frames().find(f => f.url().includes('recaptcha'));
      if (frame) {
        await frame.click('#recaptcha-anchor');
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    // Вземаме HTML след CAPTCHA
    const html = await page.content();
    console.log('HTML length:', html.length);
    console.log('HTML snippet:', html.substring(0, 300));

    const pick = parsePick(html, pickUrl);
    res.json({ success: true, pick: pick, html_length: html.length });

  } catch (e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  } finally {
    if (browser) await browser.close();
  }
});

function parsePick(html, url) {
  let text = '🎯 НОВА ПРОГНОЗА\n\n';
  text += '🔗 ' + url + '\n\n';

  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const clean = h1[1].replace(/<[^>]+>/g, '').trim();
    text += '⚽ ' + clean + '\n';
  }

  const oddsAt = html.match(/@\s*([\d\.]+)/);
  if (oddsAt) {
    text += '💰 Коеф: ' + oddsAt[1] + '\n';
  }

  if (!h1 && !oddsAt) {
    text += '⚠️ DEBUG:\n' + html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 500);
  }

  return text;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
