import express from 'express';
import renderPage from '../utils/RenderPage';
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

app.get('/', (req, res) => {
  const pattern: string = parsePattern(req.url);
  const valign = req.query.valign || 's';
  const colTop = req.query.colTop || '404040';
  const colBottom = req.query.colBottom || '202020';
  const skin = req.query.skin || null;

  const formattedPatterns = generateBannerPatterns(pattern);

  renderPage(req, res, 'banner', {
    pattern,
    valign,
    colTop,
    colBottom,
    skin,
    formattedPatterns,
  });
});

export default app;
