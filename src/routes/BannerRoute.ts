import express from 'express';
import renderPage from '../utils/RenderPage';
import ErrorManager from '../managers/ErrorManager';
import { generateBannerPatterns, getColourNameTranslated } from '../utils/BannerUtils';

const app = express.Router();

function parsePattern(url: string): string {
  let raw = new URLSearchParams(url).get('/?');
  if (!raw || raw.includes('capes')) return 'pa'; // There seems to be a bot that is sending a ton of requests using ?=/capes/<username>.png for some reason
  raw = raw.replace(/[0-9]/g, '');
  raw = raw.replace(/\W/g, '');

  if (raw.length < 2) return 'pa';

  return raw;
}

app.get('/', async function (req, res) {
  try {
    const pattern: string = parsePattern(req.url);
    const valign = req.query.valign || 's';
    const colTop = req.query.colTop || '404040';
    const colBottom = req.query.colBottom || '202020';
    const skin = req.query.skin || null;

    const formattedPatterns = await generateBannerPatterns(pattern, req.cookies?.language ?? 'en-us');

    renderPage(req, res, 'banner', {
      pattern,
      valign,
      colTop,
      colBottom,
      skin,
      formattedPatterns,
    });
  } catch (e) {
    console.error(e);
    new ErrorManager(req, res, e as Error).write();
  }
});

app.get('/locale', async function (req, res) {
  try {
    if (!req.query.colour || Array.isArray(req.query.colour)) return res.status(404).send(req.query.colour);
    res.send(await getColourNameTranslated(req.cookies?.language ?? 'en-us', req.query.colour.toString()));
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

app.post('/search_optifine', async function (req, res) {
  try {
    if (!req.body || !req.body.username || !req.body.show) return res.status(400).send();
    if (req.body.username.length < 3 || req.body.username.length > 32) return res.status(400).send();
    if (req.body.username.match(/\W/g)) return res.status(400).send();

    const response = await fetch('https://optifine.net/banners', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://livzmc.net/banner/search_optifine',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'User-Agent': 'LivzMC.net',
      },
      body: `username=${req.body.username}&show=+Show+`,
      method: 'POST',
    });

    if (!response.url.includes('?format=')) return res.status(404).send();
    res.write(response.url.split('?format=')[1].split('&')[0]);
    res.send();
  } catch (e) {
    console.error(e);
    new ErrorManager(req, res, e as Error).write();
  }
});

export default app;
