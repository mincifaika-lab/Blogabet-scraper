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
    const token = await solveCaptcha(pickUrl);
    if (!token) return res.status(500).json({ error: 'CAPTCHA failed' });

    console.log('Token received, injecting into page...');

    const code = `
      module.exports = async ({ page, context }) => {
        const { url, token } = context;
        
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        await page.evaluate((t) => {
          const textareas = document.querySelectorAll('textarea[name="g-recaptcha-response"]');
          textareas.forEach(ta => { ta.value = t; });
          
          if (typeof pickValidateRecaptchaCallback === 'function') {
            pickValidateRecaptchaCallback();
          } else if (window.$ ) {
            $.ajax({
              type: 'get',
              url: window.location.pathname + '?g-recaptcha-response=' + encodeURIComponent(t)
            }).done(function(html) {
              document.body.innerHTML = html;
            });
          }
        }, token);
        
        await new Promise(r => setTimeout(r, 5000));
        
        const html = await page.content();
        return { data: html };
      };
    `;

    const response = await fetch(
      'https://chrome.browserless.io/function?token=' + BROWSERLESS_TOKEN,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          context: { url: pickUrl, token: token }
        })
      }
    );

    const result = await response.json();
    console.log('Result keys:', Object.keys(result || {}));

    const html = result.data || JSON.stringify(result);
    console.log('HTML length:', html.length);
    console.log('HTML snippet:', html.substring(0, 500));

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
  console.log('CapSolver create:', JSON.stringify(createData));
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
    console.log('Poll', i + 1, ':', resultData.status);
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
