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

const app = express.Router();
const BannerUserLengthCache = new NodeCache();

type SearchOptions = {
  page: number,
  layers: number,
  url: string | null,
};

(async function () {
  if (!fs.existsSync('cache/banners.json') && isFileCacheExpired('cache/banners.json', (60 * 60) * 6)) { // cache for 6 hours
    try {
      const r: Banner[] = await querySync('select * from livzmc.banners order by createdAt desc');
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
    from livzmc.profileOFCapes
    join profiles on profiles.uuid = profileOFCapes.uuid
    where capeId = ?
    order by cachedOn desc
    limit 501
    `,
    [bannerId]);

  await fsp.writeFile(path, JSON.stringify(profiles));
}

app.get('/', async function (req, res) {
  try {
    const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
    const layers = req.query.layers ? parseInt(req.query.layers.toString()) : 0;
    const url = req.query.url ? req.query.url.toString() : null;
    // don't use sync functions here for non-blocking reading
    // since this is probably a more popular page
    const data = await fsp.readFile('cache/banners.json');
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
    const banner: Banner = (await querySync('select * from livzmc.banners where bannerId = ?', [req.params.bannerId]))[0];
    if (!banner || banner.removed) return res.status(404).send('Banner not found');
    const path = `cache/capes/banner/${banner.bannerId}-users.json`;
    const isCached = fs.existsSync(path); // cache for 5 minutes

    if (!isCached) await generateUsersCache(banner.bannerId, path);
    const length = BannerUserLengthCache.has(banner.bannerId) ? BannerUserLengthCache.get(banner.bannerId) : (await querySync('SELECT count(capeId) from livzmc.profileOFCapes WHERE capeId = ? and hidden = 0', [banner.bannerId]))[0]['count(capeId)'];

    const data = await fsp.readFile(path);
    const profiles = JSON.parse(data.toString());
    let hasMore = false;
    if (profiles.length > 500) {
      hasMore = true;
      profiles.length = 500;
    }

    renderPage(req, res, './capes/view/optifine', {
      banner,
      profiles,
      hasMore,
      length,
    });

    if (isCached && isFileCacheExpired(path, 60 * 5)) {
      await generateUsersCache(banner.bannerId, path);
    }

    if (!BannerUserLengthCache.has(banner.bannerId)) BannerUserLengthCache.set(banner.bannerId, length, 60 * 5);
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
