import express from 'express';
import renderPage from '../utils/RenderPage';
import ErrorManager from '../managers/ErrorManager';
import { querySync } from '../managers/database/MySQLConnection';
import { Badge } from '../managers/database/types/BadgesTypes';
import { User } from '../managers/database/types/UserTypes';
import { Account } from '../managers/database/types/AccountTypes';
import { generateRandomId } from '../utils/Utils';

const app = express.Router();

app.get('/', async function (req, res) {
  try {
    const badges: Badge[] = await querySync(
      `
      select badges.title,
      badges.image,
      badges.badgeId,
      badges.hidden,
      badges.createdAt,
      count(badgeUsers.uuid) as user_count
      from badges
      left join badgeUsers on badges.badgeId = badgeUsers.badgeId
      where badges.hidden = 0
      group by badges.badgeId
      `
    );

    renderPage(req, res, 'badges', {
      badges,
    });
  } catch (e) {
    console.error(e);
    new ErrorManager(req, res, e as Error).write();
  }
});

app.get('/:badgeId', async function (req, res) {
  try {
    const badge: Badge = (await querySync('select * from badges where badgeId = ?', [req.params.badgeId]))[0];
    if (!badge) return res.sendStatus(404);

    const users: User[] & { badgeUser_hidden: boolean; } =
      (await querySync(
        `
          select badgeUsers.hidden as badgeUser_hidden,
          profiles.*
          from badgeUsers
          join profiles on profiles.uuid = badgeUsers.uuid
          where badgeId = ?
        `, [badge.badgeId]
      )).filter((user: { badgeUser_hidden: boolean; }) => !user.badgeUser_hidden);

    renderPage(req, res, 'badges/viewBadge', {
      badge,
      users,
    });
  } catch (e) {
    console.error(e);
    new ErrorManager(req, res, e as Error).write();
  }
});

app.put('/:badgeTitle', async function (req, res) {
  try {
    const account: Account = res.locals.account;
    if (!account || account.permission !== 11) return res.sendStatus(401);

    const checkName: Badge = (await querySync('select badgeId from badges where title = ?', [req.params.badgeTitle]))[0];
    if (checkName) return res.sendStatus(403);

    const badgeId = generateRandomId(req.params.badgeTitle);

    try {
      // make sure the provided image URL is a valid one.
      // probably should also check if it's a valid image, but since I am the only person that can do this, it's probably fine.
      new URL(req.body.badgeImage);
    } catch (ignored) {
      return res.sendStatus(403);
    }

    await querySync(
      `
        insert into badges (
          createdAt,
          badgeId,
          title,
          description,
          image,
          hidden
        ) values (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?
        )
      `,
      [
        Date.now(),
        badgeId,
        req.body.badgeName,
        req.body.badgeDescription,
        req.body.badgeImage,
        0
      ]
    );

    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    new ErrorManager(req, res, e as Error).write();
  }
});

app.delete('/:badgeId', async function (req, res) {
  try {
    const account: Account = res.locals.account;
    if (!account || account.permission !== 11) return res.sendStatus(401);

    const badge: Badge = (await querySync('select * from badges where badgeId = ?', [req.params.badgeId]))[0];
    if (!badge) return res.sendStatus(403);

    // todo: make proper type for badgeUsers
    const checkUsers: Badge[] = await querySync('select uuid from badgeUsers where badgeId = ?', [badge.badgeId]);
    if (checkUsers.length > 0) {
      // todo:
      // users have had this badge before, need to handle this
      // probably needs to hide the badge?
      // not sure
    } else {
      // no user has had this badge so, it's safe to delete entirely from the database
      await querySync('delete from badges where badgeId = ?', [badge.badgeId]);
    }

    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    new ErrorManager(req, res, e as Error).write();
  }
});

export default app;
