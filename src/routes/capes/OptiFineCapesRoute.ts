import express from 'express';
import fs from 'fs';
import wcmatch from 'wildcard-match';
import renderPage from '../../utils/RenderPage';
import NodeCache from 'node-cache';
import { querySync } from '../../managers/database/MySQLConnection';
import { isFileCacheExpired } from '../../utils/Utils';
import { Banner, BannerUser } from '../../managers/database/types/OptiFineCapeTypes';
import { User } from '../../managers/database/types/UserTypes';

const app = express.Router();
const BannerUserLengthCache = new NodeCache();

type SearchOptions = {
  page: number,
  layers: number,
  url: string | null,
};

(function () {
  if (!fs.existsSync('cache/banners.json') && isFileCacheExpired('cache/banners.json', (60 * 60) * 6)) { // cache for 6 hours
    querySync('select * from livzmc.banners order by createdAt desc').then((r: Banner[]) => {
      fs.writeFileSync('cache/banners.json', JSON.stringify(r));
    });
  }
})();

async function generateUsersCache(bannerId: string, path: string): Promise<void> {
  let profiles = await querySync('select * from livzmc.profileOFCapes where capeId = ? order by cachedOn desc limit 501', [bannerId]);
  profiles = await Promise.all(
    profiles.map(async function (p: BannerUser) {
      const profile: User = (await querySync('select * from livzmc.profiles where uuid = ?', [p.uuid]))[0];
      return { ...profile, bannerData: p };
    }).filter((a: BannerUser) => a != undefined)
  );

  fs.writeFileSync(path, JSON.stringify(profiles));
}

app.get('/', async function (req, res) {
  try {
    const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
    const layers = req.query.layers ? parseInt(req.query.layers.toString()) : 0;
    const url = req.query.url ? req.query.url.toString() : null;
    // don't use sync functions here for non-blocking reading
    // since this is probably a more popular page
    fs.readFile('cache/banners.json', async (err, data) => {
      if (err) {
        console.error(err);
        return res.status(500).send('There was an unknown error');
      }

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
    });
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
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

    fs.readFile(path, (err, data) => {
      if (err) {
        console.error(err);
        return res.status(500).send('There was an error reading banner information');
      }
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
    });

    if (isCached && isFileCacheExpired(path, 60 * 5)) {
      await generateUsersCache(banner.bannerId, path);
    }

    if (!BannerUserLengthCache.has(banner.bannerId)) BannerUserLengthCache.set(banner.bannerId, length, 60 * 5);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
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
