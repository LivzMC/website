import express from 'express';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config(); // init .env
import ejs from 'ejs';
import cookieParser from 'cookie-parser';
import { connectToDatabase } from './managers/database/MySQLConnection';
import {
  getLocaleString,
} from './utils/Utils';
// routes
import HomeRoute from './routes/HomeRoute';
import SkinsRoute from './routes/SkinsRoute';
import MinecraftCapesRoute from './routes/capes/MinecraftCapesRoute';
import OptiFineCapesRoute from './routes/capes/OptiFineCapesRoute';
import BannerRoute from './routes/BannerRoute';
// constants
const HOSTNAME: string = process.env.HOSTNAME ?? 'localhost';
const DEVMODE: boolean = process.env.DEVMODE?.toLowerCase() == 'true';

if (!fs.existsSync('cache')) fs.mkdirSync('cache', { recursive: true });
if (!fs.existsSync('cache/skins')) fs.mkdirSync('cache/skins', { recursive: true });
if (!fs.existsSync('cache/capes')) fs.mkdirSync('cache/capes', { recursive: true });
if (!fs.existsSync('cache/banner')) fs.mkdirSync('cache/capes/banner', { recursive: true });

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
// create routes
app.use('/', HomeRoute);
app.use('/skins', SkinsRoute);
app.use('/minecraft-capes', MinecraftCapesRoute);
app.use('/optifine-capes', OptiFineCapesRoute);
app.use('/banner', BannerRoute);
//

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
