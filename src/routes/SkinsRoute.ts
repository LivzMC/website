import express from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import renderPage from '../utils/RenderPage';
import NodeCache from 'node-cache';
import { querySync } from '../managers/database/MySQLConnection';
import { Skin, SkinUsers } from '../managers/database/types/SkinTypes';
import { isFileCacheExpired } from '../utils/Utils';

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
    const skins: Skin[] = await querySync(`
      select * from livzmc.skins as t1 join (
        select id from livzmc.skins order by rand() limit 32
      )
      as t2 on t1.id = t2.id
      where enabled = 1
    `);

    skinsCache.push(skins);
  }

  fs.writeFileSync('cache/skins.json', JSON.stringify(skinsCache));
})();

app.get('/', (req, res) => res.redirect('/skins/new'));

app.get('/new', async function (req, res) {
  try {
    const page = parseInt(req.query.page?.toString() || '1');
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

    const skinsDb = await querySync(`select * from livzmc.skins where enabled = 1 order by createdAt desc limit ${(page - 1) * nPerPage}, ${nPerPage}`);
    const skins: Skin[] & SkinsPageTypes[] = await Promise.all(
      skinsDb.map(async function (skin: Skin & SkinsPageTypes) {
        skin.recentUser = (await querySync('select uuid from livzmc.profileSkins where skinId = ? and hidden = 0', [skin.skinId]))[0];
        if (skin.recentUser) {
          skin.recentUser = (await querySync('select username, uuid from livzmc.profiles where uuid = ?', [skin.recentUser.uuid]))[0];
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
    return res.sendStatus(500);
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
    res.sendStatus(500);
  }
});

app.get('/:skinId', async function (req, res) {
  try {
    const skin: Skin = (await querySync('select * from livzmc.skins where skinId = ?', [req.params.skinId]))[0];
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

    renderPage(req, res, './skins/skin', {
      skin,
      users,
      hasMoreUsers,
    });

    // check if the users are cached and if they are expired. Re-generate them after the page is loaded
    if (cached && isFileCacheExpired(filePath, 60 * 10)) {
      await generateSkinUserCache(req.params.skinId, filePath);
    }
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

export default app;
