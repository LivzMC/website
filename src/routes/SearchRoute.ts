import express from 'express';
import renderPage from '../utils/RenderPage';
import ErrorManager from '../managers/ErrorManager';
import { querySync } from '../managers/database/MySQLConnection';
import { User } from '../managers/database/types/UserTypes';
import { getUserNameIndex, isUUID } from '../utils/Utils';
import { createProfile, updateProfile, usernameToUUID } from '../managers/UpdateProfileManager';

const app = express.Router();

function parseQuery(string: string): string {
  string = string.replace(/_/g, '\\_');
  string = string.replace(/%/g, '');
  string = string.replace(/\*/g, '');

  return string;
}

app.get('/', async function (req, res) {
  try {
    if (!req.query.u || req.query.u.toString().trim() == '') return res.sendStatus(404);
    let searchedName: string = req.query.u.toString();
    if (searchedName == '-') return res.sendStatus(404);

    const start = performance.now();
    if (isUUID(searchedName)) {
      const findUUIDProfile = (await querySync('select username from profiles where uuid = ?', [searchedName]))[0];
      if (findUUIDProfile) searchedName = findUUIDProfile.username;
    }

    let searches: (User & { profileNames_removed: boolean, profileSkins_skinId: string, index: number; })[] =
      await querySync(
        `
          select distinct 
              profileNames.removed as profileNames_removed,
              profileNames.uuid,
              profiles.*,
              profileSkins.skinId as profileSkins_skinId
          from
              profileNames
                  inner join
              profiles ON profileNames.uuid = profiles.uuid
                  inner join
              profileSkins on profileNames.uuid = profileSkins.uuid
          where
              profileNames.username = ? and profileNames.hidden = 0
              and profileSkins.enabled = 1
          limit 100;
          `,
        [searchedName]
      );

    searches = searches.sort((a, b) => b.createdAt - a.createdAt);

    searches = await Promise.all(
      searches.map(async function (search) {
        search.index = await getUserNameIndex(search.username, search.uuid);

        return search;
      })
    );

    const currentUsers = searches.filter(s => {
      if (s.username.toLowerCase() == searchedName.toLowerCase()) return s;
    });

    const pastUsers = searches.filter(s => {
      if (s.username.toLowerCase() !== searchedName.toLowerCase()) return s;
    });

    if (currentUsers.length === 0) {
      /*
        Is this really a good way of handling this?
        Don't update past users, only ones with the current name
        If there are no profiles recorded with the searched name, then go through Mojang and get the id and check if it already exists in the database
        If it does not exist, then create a new record
        If it does, then update that profile and create a new name
      */
      const id = await usernameToUUID(req.query.u.toString());
      if (id !== null) {
        const exists: User = (await querySync('select username, uuid from profiles where uuid = ?', [id]))[0];
        if (!exists) {
          await createProfile(id);
          const currentUser = (await querySync(
            `
            select distinct 
                profileNames.removed as profileNames_removed,
                profileNames.uuid,
                profiles.*,
                profileSkins.skinId as profileSkins_skinId
            from
                profileNames
                    inner join
                profiles ON profileNames.uuid = profiles.uuid
                    inner join
                profileSkins on profileNames.uuid = profileSkins.uuid
            where
                profileNames.uuid = ?
                and profileSkins.enabled = 1
            `, [id]
          ))[0];

          currentUser.index = await getUserNameIndex(currentUser.username, currentUser.uuid);
          currentUsers.push(currentUser);
        } else {
          await updateProfile(exists);
          const currentUser = (await querySync(
            `
            select distinct 
                profileNames.removed as profileNames_removed,
                profileNames.uuid,
                profiles.*,
                profileSkins.skinId as profileSkins_skinId
            from
                profileNames
                    inner join
                profiles ON profileNames.uuid = profiles.uuid
                    inner join
                profileSkins on profileNames.uuid = profileSkins.uuid
            where
                profileNames.uuid = ?
                and profileSkins.enabled = 1
            `, [id]
          ))[0];

          currentUser.index = await getUserNameIndex(currentUser.username, currentUser.uuid);
          currentUsers.push(currentUser);
        }
      }
    }

    const end = performance.now();

    renderPage(req, res, 'search', {
      currentUsers,
      pastUsers,
      searchedName,
      timeMs: (end - start).toFixed(2),
    });
  } catch (e) {
    console.error(e);
    new ErrorManager(req, res, e as Error).write();
  }
});

app.get('/query', async function (req, res) {
  try {
    if (!req.query.u) return res.status(400).json({ ok: false });
    const username = parseQuery(req.query.u.toString());

    const profiles = await querySync(
      `
        select 
          profiles.username,
          profiles.uuid,
          profiles.enabledColor,
          profiles.enabledColor,
          profiles.enabledColor,
          profileSkins.skinId
        from
          profiles
        join
          profileSkins on profiles.uuid = profileSkins.uuid
        where
          username like ?
          and profileSkins.enabled = 1
          and profileSkins.hidden = 0
        limit 8
      `,
      [
        `${username}%`,
      ]
    );

    res.json(profiles);
  } catch (e) {
    console.error(e);
    new ErrorManager(req, res, e as Error).json();
  }
});

export default app;
