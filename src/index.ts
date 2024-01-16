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
// routes
import HomeRoute from './routes/HomeRoute';
import SkinsRoute from './routes/SkinsRoute';
import MinecraftCapesRoute from './routes/capes/MinecraftCapesRoute';
import OptiFineCapesRoute from './routes/capes/OptiFineCapesRoute';
import UserRoute from './routes/user/UserRoute';
import SearchRoute from './routes/SearchRoute';
import BannerRoute from './routes/BannerRoute';
// constants
const HOSTNAME: string = process.env.HOSTNAME ?? 'localhost';
const DEVMODE: boolean = process.env.DEVMODE?.toLowerCase() == 'true';

if (!fs.existsSync('cache')) fs.mkdirSync('cache', { recursive: true });
if (!fs.existsSync('cache/skins')) fs.mkdirSync('cache/skins', { recursive: true });
if (!fs.existsSync('cache/capes')) fs.mkdirSync('cache/capes', { recursive: true });
if (!fs.existsSync('cache/capes/banner')) fs.mkdirSync('cache/capes/banner', { recursive: true });
if (!fs.existsSync('cache/users')) fs.mkdirSync('cache/users', { recursive: true });

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
app.use(function (req, res, next) {
  // check ip address
  // if blocked, return 403

  // check hostname, if different then return 403
  if (req.hostname !== HOSTNAME) return res.status(403).send();
  next();
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser());
// locals
app.locals.DEVMODE = DEVMODE;
app.locals.getLocaleString = getLocaleString;
app.locals.getUserNameIndex = getUserNameIndex;
// create routes
app.use('/', HomeRoute);
app.use('/skins', SkinsRoute);
app.use('/minecraft-capes', MinecraftCapesRoute);
app.use('/optifine-capes', OptiFineCapesRoute);
app.use('/user', UserRoute);
app.use('/search', SearchRoute);
app.use('/banner', BannerRoute);
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
