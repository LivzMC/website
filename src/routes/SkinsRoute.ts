import express from "express";
import fs from 'fs';
import renderPage from '../utils/RenderPage';
import NodeCache from 'node-cache';
import { querySync } from "../managers/database/MySQLConnection";
import { Skin, SkinUsers } from "../managers/database/types/SkinTypes";
import { isFileCacheExpired } from "../utils/Utils";

const app = express.Router();
const skinsCache = new NodeCache();

interface SkinsPageTypes extends Skin {
  recentUser: {
    username: string,
    uuid: string,
  },
}

async function generateSkinUserCache(skinId: string, filePath: string): Promise<void> {
  const MAX_LIMIT = 501; // limit to 501 instead of 500 so that the front-end can display '...' 
  // use an index here: (skinId, skinId, 'desc')
  const skinUsers: SkinUsers[] = await querySync('select * from livzmc.profileSkins where skinId = ? order by cachedOn desc limit ' + MAX_LIMIT, [skinId]);
  const users = await Promise.all(
    skinUsers.map(async function (skinUser) {
      if (skinUser.hidden) return undefined;
      const user = (await querySync('select username, uuid, banned from livzmc.profiles where uuid = ?', [skinUser.uuid]))[0];
      if (user.banned) return undefined;
      user.skinData = skinUser;

      return user;
    }).filter(skin => skin != undefined)
  );

  fs.writeFileSync(filePath, JSON.stringify(users)); // cache on disk
}

// This is stupid
// probably don't even need to do this as getting random skins are performant
// I just don't want to send a lot of calls to the database
(async function generateRandomSkinsCache(): Promise<void> {
  if (fs.existsSync('cache/skins.json')) {
    if (!isFileCacheExpired('cache/skins.json', 60 * 60)) return;// check if file exists and it was created over an hour before
    fs.rmSync('cache/skins.json');
  }

  const skinsCache: any[][] = [];

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

    const skinsDb: Skin[] = await querySync(`select * from livzmc.skins where enabled = 1 order by createdAt desc limit ${(page - 1) * nPerPage}, ${nPerPage}`);
    const skins: SkinsPageTypes[] = await Promise.all(
      skinsDb.map(async function (skin: any) {
        skin.recentUser = (await querySync('select uuid from livzmc.profileSkins where skinId = ? and hidden = 0 and enabled = 1', [skin.skinId]))[0];
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

    const users = JSON.parse(fs.readFileSync(filePath).toString());
    let hasMoreUsers = false;
    if (users.length > 500) {
      users.length = 500;
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
