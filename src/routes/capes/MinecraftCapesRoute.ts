import express from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import NodeCache from 'node-cache';
import renderPage from '../../utils/RenderPage';
import { isFileCacheExpired } from '../../utils/Utils';
import { querySync } from '../../managers/database/MySQLConnection';
import { Cape, CapeUser } from '../../managers/database/types/CapeTypes';

const app = express.Router();
if (!fs.existsSync('cache/capes/mc')) fs.mkdirSync('cache/capes/mc', { recursive: true });
const userLengthCache = new NodeCache();

async function generateCapesCache(): Promise<void> {
  const capes = await querySync('select * from livzmc.capes');
  await fsp.writeFile('cache/capes.json', JSON.stringify(capes));
}

async function generateCapeUsersCache(capeId: string, filePath: string): Promise<void> {
  const users: CapeUser[] = await querySync(
    `
    select profileCapes.id,
    profileCapes.capeId,
    profileCapes.applied,
    profileCapes.enabled,
    profileCapes.hidden,
    profiles.username,
    profiles.uuid
    from livzmc.profileCapes
    join profiles on profiles.uuid = profileCapes.uuid
    where capeId = ?
    order by cachedOn desc
    limit 500
    `,
    [capeId]
  );

  await fsp.writeFile(filePath, JSON.stringify(users));
}

app.get('/', async function (req, res) {
  try {
    const cached = fs.existsSync('cache/capes.json');
    if (!cached) await generateCapesCache();

    const capes: Cape[] = JSON.parse(fs.readFileSync('cache/capes.json').toString()).filter((cape: Cape) => cape.enabled);

    renderPage(req, res, './capes/minecraft', {
      currentPage: '/minecraft-capes',
      capes,
    });

    // check if the file was created over 5 minutes prior
    if (isFileCacheExpired('cache/capes.json', 60 * 5)) await generateCapesCache();
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

app.get('/:capeId', async function (req, res) {
  try {
    const cape: Cape = (await querySync('select * from livzmc.capes where capeId = ?', [req.params.capeId]))[0];
    if (!cape || !cape.enabled) return res.status(404).send('Could not find cape');

    const filePath = `cache/capes/${cape.capeId}-users.json`;
    const cached = fs.existsSync(filePath);

    if (!cached) {
      await generateCapeUsersCache(cape.capeId, filePath);
    }

    const users: CapeUser[] = JSON.parse((await fsp.readFile(filePath)).toString());
    const userLength: number = userLengthCache.has(cape.capeId) ? userLengthCache.get(cape.capeId) : (await querySync('select count(capeId) from livzmc.profileCapes where capeId = ? and hidden = 0', [cape.capeId]))[0]['count(capeId)'];

    renderPage(req, res, './capes/view/minecraft', {
      cape,
      users,
      userLength,
      more: userLength > users.length,
    });

    // check if the users are cached and if they are expired. Re-generate them after the page is loaded
    if (cached && isFileCacheExpired(filePath, 60 * 10)) {
      await generateCapeUsersCache(cape.capeId, filePath);
    }

    if (!userLengthCache.has(cape.capeId)) {
      userLengthCache.set(cape.capeId, userLength, 60 * 10);
    }
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

export default app;
