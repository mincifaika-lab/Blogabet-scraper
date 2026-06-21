const express = require('express');
const fetch = require('node-fetch');
const HttpsProxyAgent = require('https-proxy-agent');
const app = express();
app.use(express.json());

const CAPSOLVER_API_KEY = 'CAP-BB153D0E73534397DD8E52BE829F7BF15BC24A60632CC65357BE22F504354F1C';
const RECAPTCHA_SITE_KEY = '6LczfBcTAAAAAJUj9xaEanJHszjBkgr9kQQgyNPI';
const PROXY = 'http://vssl40kcbg:zcofkp7aqe@pr-eu.proxies.fo:13337

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/pick', async (req, res) => {
  const pickUrl = req.query.url;
  if (!pickUrl) return res.status(400).json({ error: 'No URL' });

  try {
    const createRes = await fetch('https://api.capsolver.com/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientKey: CAPSOLVER_API_KEY,
        task: {
          type: 'ReCaptchaV2TaskProxyLess',
          websiteURL: pickUrl,
          websiteKey: RECAPTCHA_SITE_KEY
        }
      })
    });

    const createData = await createRes.json();
    console.log('CapSolver create:', createData);

    if (createData.errorId !== 0) {
      return res.status(500).json({ error: createData.errorDescription });
    }

    const taskId = createData.taskId;
    await sleep(20000);

    let token = null;
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

      if (resultData.status === 'ready') {
        token = resultData.solution.gRecaptchaResponse;
        break;
      }

      if (resultData.status !== 'processing') {
        return res.status(500).json({ error: 'CAPTCHA failed' });
      }

      await sleep(5000);
    }

    if (!token) return res.status(500).json({ error: 'CAPTCHA timeout' });

    const agent = new HttpsProxyAgent(PROXY);
    const pageRes = await fetch(pickUrl + '?g-recaptcha-response=' + encodeURIComponent(token), {
      method: 'GET',
      agent: agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://blogabet.com/'
      }
    });

    const html = await pageRes.text();
    console.log('Response length:', html.length);
    console.log('HTML snippet:', html.substring(0, 300));

    const pick = parsePick(html, pickUrl);
    res.json({ success: true, pick: pick, html_length: html.length });

  } catch (e) {
    console.error('Error:', e);
    res.status(500).json({ error: e.message });
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));    }

    const taskId = createData.taskId;

    // Стъпка 2: Чакаме решението
    await sleep(20000);

    let token = null;
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

      if (resultData.status === 'ready') {
        token = resultData.solution.gRecaptchaResponse;
        break;
      }

      if (resultData.status !== 'processing') {
        return res.status(500).json({ error: 'CAPTCHA failed' });
      }

      await sleep(5000);
    }

    if (!token) return res.status(500).json({ error: 'CAPTCHA timeout' });

    // Стъпка 3: Fetch страницата с токена
    const pageRes = await fetch(pickUrl + '?g-recaptcha-response=' + encodeURIComponent(token), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://blogabet.com/'
      }
    });

    const html = await pageRes.text();
    console.log('Response length:', html.length);
    console.log('HTML snippet:', html.substring(0, 200));

    // Стъпка 4: Парсваме прогнозата
    const pick = parsePick(html, pickUrl);
    res.json({ success: true, pick: pick, html_length: html.length });

  } catch (e) {
    console.error('Error:', e);
    res.status(500).json({ error: e.message });
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
