import express from 'express';
import renderPage from '../utils/RenderPage';
import { User } from '../managers/database/types/UserTypes';
import { querySync } from '../managers/database/MySQLConnection';

const app = express.Router();

async function findVanity(vanity: string): Promise<User | null> {
  const linkedProfile = (await querySync('select * from linkedAccounts where vanityUrl = ? and linked = 1', [vanity.toLowerCase()]))[0];
  if (!linkedProfile) return null;
  const user: User = (await querySync('select * from profiles where uuid = ? and banned = 0', [linkedProfile.uuid]))[0];

  return user;
}

app.get('/', (req, res) => {
  renderPage(req, res, 'home', {});
});

app.get('/contact', (req, res) => {
  res.write('You can contact me at these places:\n');
  res.write('Discord: https://discord.gg/ytrKev7xZD\n');
  res.write('Email: support@livzmc.net\n');
  res.send();
});

// legacy vanity urls
app.get('/v/:vanity', async function (req, res) {
  try {
    const user = await findVanity(req.params.vanity);
    if (!user) return res.sendStatus(404);
    res.send(user);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

app.get('/:vanity', async function (req, res) {
  try {
    const user = await findVanity(req.params.vanity);
    if (!user) return res.sendStatus(404);
    res.send(user);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

export default app;
