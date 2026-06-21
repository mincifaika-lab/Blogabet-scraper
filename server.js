const express = require('express');
const fetch = require('node-fetch');
const app = express();

const CAPSOLVER_API_KEY = 'CAP-BB153D0E73534397DD8E52BE829F7BF15BC24A60632CC65357BE22F504354F1C';
const RECAPTCHA_SITE_KEY = '6LczfBcTAAAAAJUj9xaEanJHszjBkgr9kQQgyNPI';
const BROWSERLESS_TOKEN = '2UkNSTbHkrO0CZmbda02b20e6178bf72749d4767d2ac001b1';

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/pick', async (req, res) => {
  const pickUrl = req.query.url;
  if (!pickUrl) return res.status(400).json({ error: 'No URL' });

  try {
    // Browserless отваря страницата и връща HTML след CAPTCHA
    const response = await fetch(
      'https://chrome.browserless.io/content?token=' + BROWSERLESS_TOKEN,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: pickUrl,
          waitFor: 5000,
          gotoOptions: { waitUntil: 'networkidle2' }
        })
      }
    );

    const html = await response.text();
    console.log('Response length:', html.length);
    console.log('HTML snippet:', html.substring(0, 300));

    if (html.includes('Restricted access')) {
      // Трябва CAPTCHA - решаваме я и пращаме отново
      const token = await solveCaptcha(pickUrl);
      if (!token) return res.status(500).json({ error: 'CAPTCHA failed' });

      const response2 = await fetch(
        'https://chrome.browserless.io/content?token=' + BROWSERLESS_TOKEN,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: pickUrl + '?g-recaptcha-response=' + encodeURIComponent(token),
            waitFor: 5000,
            gotoOptions: { waitUntil: 'networkidle2' }
          })
        }
      );

      const html2 = await response2.text();
      console.log('Response2 length:', html2.length);
      console.log('HTML2 snippet:', html2.substring(0, 300));

      const pick = parsePick(html2, pickUrl);
      return res.json({ success: true, pick: pick, html_length: html2.length });
    }

    const pick = parsePick(html, pickUrl);
    res.json({ success: true, pick: pick, html_length: html.length });

  } catch (e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

async function solveCaptcha(pageUrl) {
  const createRes = await fetch('https://api.capsolver.com/createTask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientKey: CAPSOLVER_API_KEY,
      task: {
        type: 'ReCaptchaV2TaskProxyLess',
        websiteURL: pageUrl,
        websiteKey: RECAPTCHA_SITE_KEY
      }
    })
  });

  const createData = await createRes.json();
  if (createData.errorId !== 0) return null;

  const taskId = createData.taskId;
  await sleep(20000);

  for (let i = 0; i < 20; i++) {
    const resultRes = await fetch('https://api.capsolver.com/getTaskResult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientKey: CAPSOLVER_API_KEY,
        taskId: taskId
      })
    });

    const resultData = await resultRes.json();
    if (resultData.status === 'ready') return resultData.solution.gRecaptchaResponse;
    if (resultData.status !== 'processing') return null;
    await sleep(5000);
  }
  return null;
}

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
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
