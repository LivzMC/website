import express from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import renderPage from '../utils/RenderPage';
import NodeCache from 'node-cache';
import ErrorManager from '../managers/ErrorManager';
import Jimp from 'jimp';
import { querySync } from '../managers/database/MySQLConnection';
import { Skin, SkinUsers } from '../managers/database/types/SkinTypes';
import { isFileCacheExpired } from '../utils/Utils';
import { generateDHash } from '../utils/Hash';

const app = express.Router();
const MAX_LIMIT = 501;
const skinsCache = new NodeCache();

type SkinsPageTypes = {
  recentUser: {
    username: string,
    uuid: string,
  } | undefined,
};

async function generateSkinUserCache(skinId: string, filePath: string): Promise<void> {
  const skinUsers: SkinUsers[] = await querySync(`
    SELECT 
      profileSkins.hidden,
      profileSkins.model,
      profiles.uuid as profiles_uuid,
      profiles.username as profiles_username,
      profiles.banned as profiles_banned
    FROM
      profileSkins
          INNER JOIN
      profiles ON profileSkins.uuid = profiles.uuid
    WHERE
      skinId = ?
      ORDER BY profileSkins.id DESC
    LIMIT ${MAX_LIMIT};
  `, [skinId]);

  await fsp.writeFile(filePath, JSON.stringify(skinUsers)); // cache on disk
}

// This is stupid
// probably don't even need to do this as getting random skins are performant
// I just don't want to send a lot of calls to the database
(async function generateRandomSkinsCache(): Promise<void> {
  if (fs.existsSync('cache/skins.json')) {
    if (!isFileCacheExpired('cache/skins.json', 60 * 60)) return;// check if file exists and it was created over an hour before
    fs.rmSync('cache/skins.json');
  }

  const skinsCache: Skin[][] = [];

  for (let i = 0; i < 100; i++) {
    try {
      const skins: Skin[] = await querySync(`
        select * from skins as t1 join (
          select id from skins order by rand() limit 32
        )
        as t2 on t1.id = t2.id
        where enabled = 1
      `);

      skinsCache.push(skins);
    } catch (e) {
      console.error(e);
    }
  }

  fs.writeFileSync('cache/skins.json', JSON.stringify(skinsCache));
})();

(async function () {
  const skins: Skin[] = await querySync('select * from skins where dhash is null and url is not null limit 10000');
  for (let i = 0; i < skins.length; i++) {
    try {
      const skin = skins[i];
      const image = await Jimp.read(skin.url);
      const dhash = await generateDHash(image);

      await querySync('update skins set dhash = ? where skinId = ?', [dhash, skin.skinId]);
      console.log(`updated ${skin.skinId} with dhash '${dhash}', ${skins.length - i} remain`);
    } catch (e) {
      console.error(e);
    }
  }
});//();

app.get('/', (req, res) => res.redirect('/skins/new'));

app.get('/new', async function (req, res) {
  try {
    const page = Math.max(parseInt(req.query.page?.toString() || '1') || 1, 1);
    const nPerPage = 35;
    if (page > 100) return res.redirect('/skins/new?page=100');

    if (skinsCache.has(page)) {
      const skins: Skin[] | undefined = skinsCache.get(page);
      if (skins) {
        return renderPage(req, res, './skins/index', {
          skins,
          number: page,
          skipped: ((page - 1) * nPerPage),
          currentPage: '/skins',
          random: false,
        });
      }
    }

    const skinsDb = await querySync(`select * from skins where enabled = 1 order by createdAt desc limit ${(page - 1) * nPerPage}, ${nPerPage}`);
    const skins: Skin[] & SkinsPageTypes[] = await Promise.all(
      skinsDb.map(async function (skin: Skin & SkinsPageTypes) {
        skin.recentUser = (await querySync('select uuid from profileSkins where skinId = ? and hidden = 0', [skin.skinId]))[0];
        if (skin.recentUser) {
          skin.recentUser = (await querySync('select username, uuid from profiles where uuid = ?', [skin.recentUser.uuid]))[0];
        }
        return skin;
      })
    );

    renderPage(req, res, './skins/index', {
      skins,
      number: page,
      skipped: ((page - 1) * nPerPage),
      currentPage: '/skins',
      random: false,
    });

    skinsCache.set(page, skins, 10); // cache database response for 10 seconds
  } catch (e) {
    console.error(e);
    new ErrorManager(req, res, e as Error).write();
  }
});

app.get('/random', async function (req, res) {
  try {
    if (!fs.existsSync('cache/skins.json')) return res.status(500).send('Invalid skins cache');
    const cachedSkins: Skin[][] = JSON.parse(fs.readFileSync('cache/skins.json').toString());
    const skins: Skin[] = cachedSkins[Math.floor(Math.random() * cachedSkins.length)];
    const page = parseInt(req.query.page?.toString() || '1');
    const nPerPage = 32;

    renderPage(req, res, './skins/index', {
      skins,
      number: page,
      skipped: ((page - 1) * nPerPage),
      currentPage: '/skins',
      random: true,
    });
  } catch (e) {
    console.error(e);
    new ErrorManager(req, res, e as Error).write();
  }
});

app.get('/similar', async function (req, res) {
  try {
    if (!req.query || !req.query.dh) return res.status(400).send('missing required queries');
    const page = Math.max(parseInt(req.query.page?.toString() || '1') || 1, 1);
    const nPerPage = 32;
    const skins: Skin[] = await querySync(`select * from skins where dhash like ? order by createdAt desc limit ${(page - 1) * nPerPage}, ${nPerPage}`, [`${req.query.dh.toString()}%`]);
    const count = (await querySync(`select skinId from skins where dhash like ? limit ${page * nPerPage}, ${nPerPage}`, [`${req.query.dh.toString()}%`])).length;
    if (skins.length === 0) {
      res.write('no skins');
      return res.status(404).send();
    }

    renderPage(req, res, './skins/index', {
      skins,
      number: page,
      skipped: ((page - 1) * nPerPage),
      currentPage: '/skins',
      random: false,
      ads: false,
      dh: req.query.dh,
      hasNextPage: count > 0,
    });
  } catch (e) {
    console.error(e);
    new ErrorManager(req, res, e as Error).write();
  }
});

app.get('/:skinId', async function (req, res) {
  try {
    const skin: Skin = (await querySync('select * from skins where skinId = ?', [req.params.skinId]))[0];
    if (!skin) return res.status(404).send('Not found'); // todo: update this
    const filePath = `cache/skins/${skin.skinId}-users.json`;
    const cached = fs.existsSync(filePath);

    if (!cached) {
      await generateSkinUserCache(req.params.skinId, filePath);
    }

    const users = JSON.parse((await fsp.readFile(filePath)).toString());
    let hasMoreUsers = false;
    if (users.length > (MAX_LIMIT - 1)) {
      users.length = (MAX_LIMIT - 1);
      hasMoreUsers = true;
    }

    let similarSkins: Skin[] = [];
    if (skin.dhash) {
      similarSkins = await querySync('select skinId, url, enabled from skins where dhash like ? limit 20', [`${skin.dhash.slice(0, 8)}%`]);
      if (similarSkins.length > 0) {
        similarSkins = similarSkins.filter(s => s.skinId !== skin.skinId);
      }
    }

    renderPage(req, res, './skins/skin', {
      skin,
      users,
      hasMoreUsers,
      similarSkins,
    });

    // check if the users are cached and if they are expired. Re-generate them after the page is loaded
    if (cached && isFileCacheExpired(filePath, 60 * 10)) {
      await generateSkinUserCache(req.params.skinId, filePath);
    }

    if (!skin.dhash) {
      // if (true) {
      const image = await Jimp.read(skin.url);
      const dhash = await generateDHash(image);

      await querySync('update skins set dhash = ? where skinId = ?', [dhash, skin.skinId]);
    }
  } catch (e) {
    console.error(e);
    new ErrorManager(req, res, e as Error).write();
  }
});

export default app;
