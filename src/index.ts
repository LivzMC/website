import express from 'express';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config(); // init .env
import ejs from 'ejs';
import cookieParser from 'cookie-parser';
import { connectToDatabase, querySync } from './managers/database/MySQLConnection';
import {
  getLocaleString,
  getUserNameIndex,
} from './utils/Utils';
import { User } from './managers/database/types/UserTypes';
import SessionManager from './managers/SessionManager';
// routes
import HomeRoute from './routes/HomeRoute';
import SkinsRoute from './routes/SkinsRoute';
import MinecraftCapesRoute from './routes/capes/MinecraftCapesRoute';
import OptiFineCapesRoute from './routes/capes/OptiFineCapesRoute';
import UserRoute from './routes/user/UserRoute';
import SearchRoute from './routes/SearchRoute';
import BannerRoute from './routes/BannerRoute';
import AccountRoute from './routes/account/AccountRoute';
import BadgesRoute from './routes/BadgesRoute';
import Render2DRoute from './routes/api/Render2DRoute';
// constants
const HOSTNAME: string = process.env.HOSTNAME ?? 'localhost';
const DEVMODE: boolean = process.env.DEVMODE?.toLowerCase() == 'true';

if (!fs.existsSync('cache')) fs.mkdirSync('cache', { recursive: true });
if (!fs.existsSync('cache/skins')) fs.mkdirSync('cache/skins', { recursive: true });
if (!fs.existsSync('cache/capes')) fs.mkdirSync('cache/capes', { recursive: true });
if (!fs.existsSync('cache/capes/banner')) fs.mkdirSync('cache/capes/banner', { recursive: true });
if (!fs.existsSync('cache/users')) fs.mkdirSync('cache/users', { recursive: true });
if (!fs.existsSync('cache/sessions')) fs.mkdirSync('cache/sessions', { recursive: true });
if (!fs.existsSync('cache/email_verification')) fs.mkdirSync('cache/email_verification', { recursive: true });

connectToDatabase(); // connect to database

// create app
const app = express();

app.set('views', 'src/front-end');
app.set('view engine', 'ejs');
app.engine('ejs', async function (path, data, cb) {
  try {
    const html = await ejs.renderFile(path, data, { async: true });
    cb(null, html);
  } catch (e) {
    cb(e, '');
  }
});

// middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser());

app.use(async function (req, res, next) {
  try {
    // check ip address
    // if blocked, return 403

    // check hostname, if different then return 403
    if (req.hostname !== HOSTNAME) return res.status(403).send();

    const account = req.cookies && req.cookies.sessionId ? await SessionManager.getCachedSession(req.cookies.sessionId) : null;
    if (account) {
      const linkedAccounts = await querySync(
        `
          select
            profiles.uuid,
            profiles.username,
            profiles.enabledColor,
            profiles.enabledEmoji,
            profiles.enabledFont,
            skins.skinId,
            linkedAccounts.createdAt as linked_createdAt,
            linkedAccounts.linked as linked_linked,
            linkedAccounts.active as linked_active
          from
            livzmc.linkedAccounts
          join
            livzmc.profiles on profiles.uuid = linkedAccounts.uuid
          join
            livzmc.skins on skins.url = profiles.currentSkin 
          where accountId = ?
        `,
        [account.accountId]
      );

      res.locals.linkedAccounts = linkedAccounts;
    }

    res.locals.account = account;
    next();
  } catch (e) {
    console.error(e);
    return res.sendStatus(500);
  }
});
// locals
app.locals.DEVMODE = DEVMODE;
app.locals.getLocaleString = getLocaleString;
app.locals.getUserNameIndex = getUserNameIndex;
app.locals.LMCButton = 'rounded dark:bg-[#047857] bg-[#059669] text-white font-semibold px-2 py-1 hover:underline';
// create routes
app.use('/', HomeRoute);
app.use('/skins', SkinsRoute);
app.use('/minecraft-capes', MinecraftCapesRoute);
app.use('/optifine-capes', OptiFineCapesRoute);
app.use('/user', UserRoute);
app.use('/search', SearchRoute);
app.use('/banner', BannerRoute);
app.use('/account', AccountRoute);
app.use('/badges', BadgesRoute);
app.use('/api/render/2d', Render2DRoute);
//

async function findVanity(vanity: string): Promise<User | null> {
  const linkedProfile = (await querySync('select * from linkedAccounts where vanityUrl = ? and linked = 1', [vanity.toLowerCase()]))[0];
  if (!linkedProfile) return null;
  const user: User = (await querySync('select * from profiles where uuid = ? and banned = 0', [linkedProfile.uuid]))[0];

  return user;
}

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

app.all('*', (req, res) => {
  res.sendStatus(404);
});

app.listen(process.env.PORT || 80, () => {
  console.log('LivzMC is online!');
  if (DEVMODE) {
    console.warn('!!! Launched in developer mode !!!');
  }
});

// log uncaught errors
process.on('uncaughtException', (err) => {
  if (err.stack) {
    fs.writeFileSync(`crash-${Date.now()}.txt`, err.stack);
  }

  console.error(err);
  process.exit(1);
});
