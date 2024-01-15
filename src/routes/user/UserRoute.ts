import express from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import renderPage from '../../utils/RenderPage';
import { querySync } from '../../managers/database/MySQLConnection';
import { User, UserNameHistory } from '../../managers/database/types/UserTypes';

const app = express.Router();

async function findUser(username: string, number: number): Promise<User | null> {
  if (number < 0) return null;
  const usernames: UserNameHistory[] = (await querySync('select * from profileNames where username = ?', [username])).filter((n: UserNameHistory) => !n.removed);
  if (!usernames[number - 1]) return null;

  return (await querySync('select * from profiles where uuid = ?', [usernames[number - 1].uuid]))[0];
}

function uuidToDashed(uuid: string): string {
  return `${uuid.substring(0, 8)}-${uuid.substring(8, 12)}-${uuid.substring(12, 16)}-${uuid.substring(16, 20)}-${uuid.substring(20)}`;
}

async function hasOptiFineEventModel(profile: User): Promise<boolean> {
  const isHalloween = false; // todo make this into config
  const isChristmas = false; // todo make this into config
  const type = isHalloween ? 'hat_jingy' : 'hat_santa';
  if (isHalloween || isChristmas) {
    const pathToFile = `${process.env.FILEPATH}/users/${profile.username}.cfg`;
    if (fs.existsSync(pathToFile)) {
      const models = JSON.parse((await fsp.readFile(pathToFile)).toString());
      if (models.items.filter((a: any) => a.type === type)[0]) return true;
    }
  }

  return false;
}

/**
 * @todo add profile views, badges and vanity clicks
 */
app.get('/:username.:number', async function (req, res) {
  try {
    console.time('username');
    const user = await findUser(req.params.username, parseInt(req.params.number));
    if (!user) return res.sendStatus(404);

    let names = await querySync('select username, changedToAt, diff, hidden from profileNames where uuid = ?', [user.uuid]);
    const nameLength = names.length;
    if (names) {
      names = names.filter((a: any) => !a.hidden);
      names = names.filter((a: any) => a.username != null);
      names = names.map((name: any) => {
        if (name.changedToAt) {
          if (name.diff != 0) {
            name.giveOrTake = (name.changedToAt - name.diff) / 1000;
          }

          name.formattedChanged = (Date.now() - name.changedToAt) / 1000;
        }

        return name;
      });

      names = names.sort((a: any, b: any) => {
        return b.changedToAt - a.changedToAt;
      });
    }
    const skins = await querySync('select skinId, cachedOn, model, enabled, hidden from profileSkins where uuid = ?', [user.uuid]);
    const capes = await querySync('select capeId, cachedOn, hidden from profileCapes where uuid = ?', [user.uuid]);
    const ofCapes = await querySync('select capeId, cachedOn, hidden, banners.removed, banners.isBanner, banners.cleanUrl from profileOFCapes join banners on profileOFCapes.capeId = banners.bannerId where uuid = ?', [user.uuid]);
    const lbCapes = await querySync('select capeId, cachedOn, hidden from profileLBCapes where uuid = ?', [user.uuid]);
    const mcCapes = await querySync('select capeId, cachedOn, hidden from profileMCCapes where uuid = ?', [user.uuid]);

    const profile = {
      ...user,
      names,
      skins,
      capes,
      ofCapes,
      lbCapes,
      mcCapes,
    };

    const hasOptiFineEvent = await hasOptiFineEventModel(user);

    renderPage(req, res, 'users/viewUser', {
      profile,
      nameLength,
      dashedUUID: uuidToDashed(user.uuid),
      hasOptiFineEvent,
    });
    console.timeEnd('username');
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

export default app;
