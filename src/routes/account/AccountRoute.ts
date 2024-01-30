import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import renderPage from '../../utils/RenderPage';
import { Account } from '../../managers/database/types/AccountTypes';
import { querySync } from '../../managers/database/MySQLConnection';
import { decrypt, encrypt, generateRandomId } from '../../utils/Utils';
import SessionManager from '../../managers/SessionManager';
import ErrorManager from '../../managers/ErrorManager';
import EmailManager from '../../managers/EmailManager';

const app = express.Router();

const emailRegex = /^[a-zA-Z0-9]+([._-](?![._-])[a-zA-Z0-9]+)*\+?@[a-zA-Z0-9]+([._-](?![._-])[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/g;

app.get('/', async function (req, res) {
  try {
    const account: Account = res.locals.account;
    if (!account) return res.redirect('/account/login');
    const email = decrypt(account.email);
    const discord = JSON.parse(account.discord);
    // todo: add transaction history
    renderPage(req, res, 'account', {
      email,
      discord,
    });
  } catch (e) {
    console.error(e);
    new ErrorManager(req, res, e as Error).write();
  }
});

app.get('/login', (req, res) => {
  renderPage(req, res, 'account/login', {
    error: null,
  });
});

app.get('/register', (req, res) => {
  renderPage(req, res, 'account/register', {
    error: null,
  });
});

app.get('/logout', (req, res) => {
  SessionManager.deleteCachedSession(req.cookies.sessionId);
  res.clearCookie('sessionId');
  res.redirect('/');
});

app.get('/verifyEmail/:emailToken', async function (req, res) {
  try {
    const account: Account = res.locals.account;
    if (!account) return res.redirect('/account/login?redirect=/account/verifyEmail/' + req.params.emailToken);
    if (account.emailVerified) return res.sendStatus(404);

    const path = `cache/email_verification/${req.params.emailToken}.txt`;
    if (!fs.existsSync(path)) return res.sendStatus(404);
    const accountToVerifyId = (await fsp.readFile(path)).toString();
    if (!accountToVerifyId || accountToVerifyId !== account.accountId) return res.sendStatus(404);

    await querySync('update livzmc.accounts set emailVerified = 1 where accountId = ?', [account.accountId]);
    await fsp.rm(path);

    await SessionManager.refreshSession(req.cookies.sessionId);

    renderPage(req, res, 'account/verifiedEmail', {
    });
  } catch (e) {
    console.error(e);
    new ErrorManager(req, res, e as Error).write();
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
    new ErrorManager(req, res, e as Error).write();
  }
});

app.post('/register', async function (req, res) {
  try {
    if (!req.body || !req.body.user || !req.body.password || !req.body.confirm_pass) {
      return renderPage(req, res, 'account/register', {
        error: 'Missing required fields'
      });
    }

    if (!req.body.privacy) {
      return renderPage(req, res, 'account/register', {
        error: 'You must accept the privacy policy before creating an account'
      });
    }

    if (req.body.password !== req.body.confirm_pass) {
      return renderPage(req, res, 'account/register', {
        error: 'Password does not match'
      });
    }

    if (req.body.user.length > 256) {
      return renderPage(req, res, 'account/register', {
        error: 'Email is too long. The max amount of characters allowed is 256',
      });
    }

    if (!emailRegex.test(req.body.user)) {
      return renderPage(req, res, 'account/register', {
        error: 'Invalid email format',
      });
    }

    if (req.body.password.length < 7) {
      return renderPage(req, res, 'account/register', {
        error: 'Password is too short. Minimum amount of charcters is 8',
      });
    }

    const uniqueId = generateRandomId(req.body.user.toLowerCase());
    const checkEmail = await querySync('select accountId from livzmc.accounts where uniqueId = ? and removed = 0', [uniqueId]);
    if (checkEmail.length > 0) {
      // todo: find a better error message for this
      //       it's not really smart to tell a user if an email exists due to security
      return renderPage(req, res, 'account/register', {
        error: 'Account already exists',
      });
    }

    const id = generateRandomId(Date.now().toString());
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    await querySync(
      `
        insert into livzmc.accounts
        (
          accountId,
          uniqueId,
          email,
          password,
          createdAt
        ) values
        (
          ?,
          ?,
          ?,
          ?,
          ?
        )
      `,
      [
        id,
        uniqueId,
        encrypt(req.body.user.toLowerCase()),
        hashedPassword,
        Date.now().toString(),
      ]
    );

    const randomToken = crypto.randomUUID().replace(/-/g, '');
    const account = (await querySync('select * from livzmc.accounts where accountId = ?', [id]))[0];
    new SessionManager(randomToken, account);
    res.cookie('sessionId', randomToken);
    res.redirect('/account');
    const randomEmailVerifyToken = crypto.randomUUID().replace(/-/g, '');
    const linkUrl = `${req.hostname == 'localhost' ? 'http' : 'https'}://${req.hostname}/account/verifyEmail/${randomEmailVerifyToken}`;
    const email = new EmailManager(req.body.user);
    email.setTitle('LivzMC - Email Verification required');
    email.setBody(
      `
        <h1>Hey ${req.body.user.split('@')[0].toLowerCase()}</h1>
        <p>
          Thank you for signing up with us. To complete the process, please click the following link.
          <a href="${linkUrl}" target="__">${linkUrl}</a>
        </p>
        <small style="color: #444;">
          If you did not sign up with LivzMC.net or do not wish to be with us any longer, you can request to delete your data here:
          <a href="https://livzmc.net/account/delete">DATA DELETION</a>
        </small>
        `
    );

    const emailResponse = await email.send();
    if (!emailResponse || emailResponse.rejected.length > 0) return;
    await fsp.writeFile(`cache/email_verification/${randomEmailVerifyToken}.txt`, id);
  } catch (e) {
    console.error(e);
    new ErrorManager(req, res, e as Error).write();
  }
});

export default app;