import express from 'express';
import renderPage from '../utils/RenderPage';
import { querySync } from '../managers/database/MySQLConnection';
import { User } from '../managers/database/types/UserTypes';
import { getUserNameIndex } from '../utils/Utils';

const app = express.Router();

app.get('/', async function (req, res) {
  try {
    if (!req.query.u || req.query.u.toString().trim() == '') return res.sendStatus(404);
    const searchedName: string = req.query.u.toString();
    if (searchedName == '-') return res.sendStatus(404);

    const start = performance.now();

    let searches: (User & { profileNames_removed: boolean, profileSkins_skinId: string, index: number; })[] = await querySync(`
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
      limit 100;`,
      [searchedName]);

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

    const end = performance.now();

    renderPage(req, res, 'search', {
      currentUsers,
      pastUsers,
      searchedName,
      timeMs: (end - start).toFixed(2),
    });
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

export default app;
