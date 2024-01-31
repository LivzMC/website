import express from 'express';
import renderPage from '../utils/RenderPage';
import ErrorManager from '../managers/ErrorManager';
import { querySync } from '../managers/database/MySQLConnection';
import { Badge } from '../managers/database/types/BadgesTypes';
import { User } from '../managers/database/types/UserTypes';

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
      from livzmc.badges
      join livzmc.badgeUsers on badges.badgeId = badgeUsers.badgeId
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
    const badge: Badge = (await querySync('select * from livzmc.badges where badgeId = ? and hidden = 0', [req.params.badgeId]))[0];
    if (!badge) return res.sendStatus(404);

    const users: User[] & { badgeUser_hidden: boolean; } =
      (await querySync(
        `
          select badgeUsers.hidden as badgeUser_hidden,
          profiles.*
          from livzmc.badgeUsers
          join livzmc.profiles on profiles.uuid = badgeUsers.uuid
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

export default app;
