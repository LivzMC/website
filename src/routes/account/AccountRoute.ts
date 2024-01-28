import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import renderPage from '../../utils/RenderPage';
import { Account } from '../../managers/database/types/AccountTypes';
import { querySync } from '../../managers/database/MySQLConnection';
import { generateRandomId } from '../../utils/Utils';
import SessionManager from '../../managers/SessionManager';

const app = express.Router();

app.get('/', async function (req, res) {
  try {
    const account: Account = res.locals.account;
    res.send(account);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

app.get('/login', async function (req, res) {
  try {
    renderPage(req, res, 'account/login', {
      error: null,
    });
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

// todo: add request limit
app.post('/login', async function (req, res) {
  try {
    if (!req.body) return res.sendStatus(400);
    if (!req.body.user || !req.body.user.includes('@')) {
      return renderPage(req, res, 'account/login', {
        error: 'Missing Email',
      });
    }

    if (!req.body.password) {
      return renderPage(req, res, 'account/login', {
        error: 'Missing Password'
      });
    }

    const uniqueId = generateRandomId(req.body.user.toLowerCase());
    // there can be multiple accounts with the same email logged in the database
    // deleted accounts are removed except for the uniqueId
    const accounts: Account[] = (await querySync('select * from accounts where uniqueId = ?', [uniqueId])).filter((account: Account) => !account.removed && !account.banned);
    if (accounts.length === 0) {
      // could not find account
      return renderPage(req, res, 'account/login', {
        error: 'Could not find account',
      });
    }

    const account: Account | undefined = (await Promise.all(
      accounts.map(async (account) => {
        if (await bcrypt.compare(req.body.password, account.password)) {
          return account;
        }
      }).filter(a => a != undefined)
    ))[0];

    if (!account) {
      // could not find account
      return renderPage(req, res, 'account/login', {
        error: 'Could not find account',
      });
    }

    const randomToken = crypto.randomUUID().replace(/-/g, '');

    new SessionManager(randomToken, account);
    res.cookie('sessionId', randomToken);
    res.redirect('/account');
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

export default app;