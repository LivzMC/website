import express from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import wcmatch from 'wildcard-match';
import renderPage from '../../utils/RenderPage';
import NodeCache from 'node-cache';
import ErrorManager from '../../managers/ErrorManager';
import { querySync } from '../../managers/database/MySQLConnection';
import { isFileCacheExpired } from '../../utils/Utils';
import { Banner } from '../../managers/database/types/OptiFineCapeTypes';
import { Account } from '../../managers/database/types/AccountTypes';

const app = express.Router();

const BANNER_USER_LENGTH_CACHE = new NodeCache();
const SIMILAR_BANNERS_CACHE = new NodeCache();

type SearchOptions = {
  page: number,
  layers: number,
  url: string | null,
};

(async function () {
  if (!fs.existsSync('cache/banners.json') && isFileCacheExpired('cache/banners.json', (60 * 60) * 6)) { // cache for 6 hours
    try {
      const r: Banner[] = await querySync('select * from banners order by createdAt desc');
      fs.writeFileSync('cache/banners.json', JSON.stringify(r));
    } catch (e) {
      console.error(e);
    }
  }
})();

async function generateUsersCache(bannerId: string, path: string): Promise<void> {
  const profiles = await querySync(
    `
    select *
    from profileOFCapes
    join profiles on profiles.uuid = profileOFCapes.uuid
    where capeId = ?
    order by cachedOn desc
    limit 501
    `,
    [bannerId]);

  await fsp.writeFile(path, JSON.stringify(profiles));
}

async function findSimilarBanners(cleanUrl: string, isBanner: boolean = true): Promise<Banner[]> {
  if (cleanUrl.toLowerCase().startsWith('optifine ') || cleanUrl.toLowerCase().startsWith('custom ')) return [];
  const CACHE_KEY = cleanUrl + '-' + isBanner;
  if (SIMILAR_BANNERS_CACHE.has(CACHE_KEY)) return SIMILAR_BANNERS_CACHE.get(CACHE_KEY) as unknown as Banner[];

  const letters: string[] = [...cleanUrl.match(/.{1,2}/g) || ''];
  let layers = letters.length > 4 ? '%' : '';

  for (let i = letters.length > 4 ? 1 : 0; i < letters.length; i++) {
    layers = layers.concat(`_${letters[i][1]}`);
  }

  const banners: Banner[] = await querySync('select bannerId, cleanUrl from banners where isBanner = ? and removed = 0 and cleanUrl like binary ? limit 100', [isBanner ? '1' : '0', layers]);
  SIMILAR_BANNERS_CACHE.set(CACHE_KEY, banners, 60 * 15);
  return banners;
}

app.get('/', async function (req, res) {
  try {
    const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
    const layers = req.query.layers ? parseInt(req.query.layers.toString()) : 0;
    const url = req.query.url ? req.query.url.toString() : null;
    // don't use sync functions here for non-blocking reading
    // since this is probably a more popular page
    const data = fs.existsSync('cache/banners.json') ? await fsp.readFile('cache/banners.json') : [];
    const cachedBanners: Banner[] = JSON.parse(data.toString());
    const banners: Banner[][] = parseBanners(
      cachedBanners,
      {
        page,
        layers,
        url,
      }
    );

    renderPage(req, res, './capes/optifine', {
      banners,
      page,
      layers,
      url,
    });
  } catch (e) {
    console.error(e);
    new ErrorManager(req, res, e as Error).write();
  }
});

app.get('/:bannerId', async function (req, res) {
  try {
    const account: Account = res.locals.account;
    const banner: Banner = (await querySync('select * from banners where bannerId = ?', [req.params.bannerId]))[0];
    if (!banner || banner.removed) return res.status(404).send('Banner not found');
    const path = `cache/capes/banner/${banner.bannerId}-users.json`;
    const isCached = fs.existsSync(path); // cache for 5 minutes

    if (!isCached) await generateUsersCache(banner.bannerId, path);
    const length = BANNER_USER_LENGTH_CACHE.has(banner.bannerId) ? BANNER_USER_LENGTH_CACHE.get(banner.bannerId) : (await querySync('SELECT count(capeId) from profileOFCapes WHERE capeId = ? and hidden = 0', [banner.bannerId]))[0]['count(capeId)'];

    const data = await fsp.readFile(path);
    const profiles = JSON.parse(data.toString());
    const more = profiles.length > 500;
    if (more) profiles.length = 500;

    let similarBanners: Banner[] = [];
    if (banner.cleanUrl) {
      if (account && account.permission > 7) {
        similarBanners = similarBanners.concat(await findSimilarBanners(banner.cleanUrl, req.query.admin && req.query.admin.toString() === 'true' ? false : true));
      } else {
        if (banner.isBanner) {
          similarBanners = similarBanners.concat(await findSimilarBanners(banner.cleanUrl, true));
        }
      }
    }

    if (similarBanners.length > 0) {
      similarBanners = similarBanners.filter(c => c.bannerId !== banner.bannerId);
    }

    renderPage(req, res, './capes/view/optifine', {
      banner,
      profiles,
      more,
      length,
      similarBanners,
    });

    if (isCached && isFileCacheExpired(path, 60 * 5)) {
      await generateUsersCache(banner.bannerId, path);
    }

    if (!BANNER_USER_LENGTH_CACHE.has(banner.bannerId)) BANNER_USER_LENGTH_CACHE.set(banner.bannerId, length, 60 * 5);
  } catch (e) {
    console.error(e);
    new ErrorManager(req, res, e as Error).write();
  }
});

function parseBanners(banners: Banner[], options: SearchOptions): Banner[][] {
  const maxSize = 50;
  const maxLayers = 8;
  const maxRows = 5;
  const rows = [];

  if (options.url) {
    const isMatch = wcmatch(options.url);
    banners = banners.filter(b => {
      if (b.isBanner && b.cleanUrl) {
        if (options.url) {
          return isMatch(b.cleanUrl);
        }
      }
    });
  } else if (options.layers > 0 && options.layers <= maxLayers) {
    banners = banners.filter(b => b.isBanner && b.bannerIdLength && parseInt(b.bannerIdLength) == options.layers);
  }

  banners = banners.slice((options.page - 1) * maxSize, options.page * maxSize);

  for (let i = 0; i < banners.length; i += maxRows) {
    rows.push(banners.slice(i, i + maxRows));
  }

  return rows;
}

export default app;
