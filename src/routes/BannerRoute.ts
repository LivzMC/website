import express from 'express';
import renderPage from '../utils/RenderPage';
import ErrorManager from '../managers/ErrorManager';
import { generateBannerPatterns } from '../utils/Utils';

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

export default app;
