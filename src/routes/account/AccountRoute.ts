import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import renderPage from '../../utils/RenderPage';
import { Account } from '../../managers/database/types/AccountTypes';
import { querySync } from '../../managers/database/MySQLConnection';
import { decrypt, encodeMD5, encrypt, generateRandomId } from '../../utils/Utils';
import SessionManager from '../../managers/SessionManager';
import ErrorManager from '../../managers/ErrorManager';
import EmailManager from '../../managers/EmailManager';

const app = express.Router();

const emailRegex = /^[a-zA-Z0-9]+([._-](?![._-])[a-zA-Z0-9]+)*\+?@[a-zA-Z0-9]+([._-](?![._-])[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/g;
const clientSecret = process.env.DISCORD_SECRET?.toString() || 'NULL';
const clientId = process.env.DISCORD_ID?.toString() || 'NULL';

type DiscordData = {
  id: string,
  username: string,
  avatar: string | null,
  discriminator: string | null,
  public_flags: number,
  premium_type: number,
  flags: number,
  banner: string | null,
  accent_color: string | null,
  global_name: string | null,
  avatar_decoration_data: string | null,
  banner_color: string | null,
  mfa_enabled: boolean,
  locale: string,
  email: string,
  verified: boolean,
  has_bounced_email: boolean,
};

async function getDiscordData(code: string, redirectUri: string): Promise<DiscordData | null> {
  const token_response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      scope: 'identity email',
    }),
  });
  if (token_response.status !== 200) return null;
  const token = (await token_response.json()).access_token;

  const user_response = await fetch('https://discord.com/api/users/@me', {
    method: 'get',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (user_response.status !== 200) return null;
  const user = await user_response.json();
  if (!user || user.message || !user.email) return null;

  return user;
}

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

app.get('/login/discord', async function (req, res) {
  try {
    if (clientId == 'NULL' || clientSecret == 'NULL') return res.status(500).send('Invalid clientId or clientSecret');
    const redirectUri = `${req.hostname == 'localhost' ? 'http' : 'https'}://${req.hostname}/account/login/discord`;
    const { code } = req.query;
    if (!code) return res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20email`);

    const user = await getDiscordData(code as string, redirectUri);
    if (!user) return res.status(401).send('Unable to authorize discord user');

    const uniqueId = generateRandomId(user.email.toLowerCase());
    const account = (await querySync('select * from accounts where uniqueId = ? and removed = 0', [uniqueId]))[0];
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

app.get('/register', (req, res) => {
  renderPage(req, res, 'account/register', {
    error: null,
  });
});

app.get('/register/discord', async function (req, res) {
  try {
    if (clientId == 'NULL' || clientSecret == 'NULL') return res.status(500).send('Invalid clientId or clientSecret');
    const redirectUri = `${req.hostname == 'localhost' ? 'http' : 'https'}://${req.hostname}/account/register/discord`;
    const { code } = req.query;
    if (!code) return res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20email`);

    const user = await getDiscordData(code as string, redirectUri);
    if (!user) return res.status(401).send('Unable to authorize discord user');
    if (!user.verified || user.has_bounced_email) {
      return renderPage(req, res, 'account/register', {
        error: 'Email is not verified',
      });
    }

    const uniqueId = generateRandomId(user.email.toLowerCase());
    const checkEmail = (await querySync('select * from accounts where uniqueId = ? and removed = 0', [uniqueId]))[0];
    if (checkEmail) {
      return renderPage(req, res, 'account/register', {
        error: 'Account already exists',
      });
    }

    const id = generateRandomId(Date.now().toString());
    await querySync(
      `
        insert into accounts
        (
          accountId,
          uniqueId,
          email,
          password,
          createdAt,
          discord,
          emailVerified
        ) values
        (
          ?,
          ?,
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
        encrypt(user.email.toLowerCase()),
        '',
        Date.now().toString(),
        JSON.stringify({ id: user.id, username: user.username, discriminator: user.discriminator }),
        '1',
      ]
    );

    const randomToken = crypto.randomUUID().replace(/-/g, '');
    const account = (await querySync('select * from accounts where accountId = ?', [id]))[0];
    new SessionManager(randomToken, account);
    res.cookie('sessionId', randomToken);
    res.redirect('/account');
  } catch (e) {
    console.error(e);
    new ErrorManager(req, res, e as Error).write();
  }
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

    await querySync('update accounts set emailVerified = 1 where accountId = ?', [account.accountId]);
    await fsp.rm(path);

    await SessionManager.refreshSession(req.cookies.sessionId);

    renderPage(req, res, 'account/verifiedEmail', {
    });
  } catch (e) {
    console.error(e);
    new ErrorManager(req, res, e as Error).write();
  }
});

app.get('/deleted', (req, res) => {
  renderPage(req, res, 'account/deleted', {});
});

app.get('/forgot-password', (req, res) => {
  renderPage(req, res, 'account/forgot-password', {
    stage: 0,
    error: null,
    message: null,
  });
});

app.get('/forgot-password/:resetToken', async function (req, res) {
  try {
    const path = `cache/email_verification/${req.params.resetToken}.txt`;
    if (!fs.existsSync(path)) return res.sendStatus(404);
    const uniqueId = (await fsp.readFile(path)).toString();
    await fsp.rm(path);

    renderPage(req, res, 'account/forgot-password', {
      stage: 1,
      error: null,
      message: null,
      uniqueId,
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

    if (req.body.password.length < 8) {
      return renderPage(req, res, 'account/register', {
        error: 'Password is too short. Minimum amount of charcters is 8',
      });
    }

    const uniqueId = generateRandomId(req.body.user.toLowerCase());
    const checkEmail = await querySync('select accountId from accounts where uniqueId = ? and removed = 0', [uniqueId]);
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
        insert into accounts
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
    const account = (await querySync('select * from accounts where accountId = ?', [id]))[0];
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
          If you did not sign up with LivzMC.net or do not wish to be with us any longer, you can request a password reset, then delete the account on the account panel:
          <a href="https://livzmc.net/account/forgot-password">PASSWORD RESET</a>
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

app.post('/delete', async function (req, res) {
  try {
    const account: Account = res.locals.account;
    if (!account) return res.redirect('/account/login');
    const { password } = req.body;
    if (!account.discord) {
      if (!password || password.length < 8) return res.status(400).send('Invalid password');
      if (!(await bcrypt.compare(password, account.password))) return res.status(403).send('Password does not match');
    }
    if (account.permission !== 0) return res.status(403).send('Account has too much power to be deleted');
    const deletedCount = (await querySync('select accountId from accounts where removed = 1')).length + 1;
    // This is used so that if there are any issues with deletion I can still verify account ownership and possibly revert account deletions
    const hashedEmail = encrypt(encodeMD5(decrypt(account.email) + '@deleted'));
    await querySync('update accounts set password = "", email = ?, 2FA = null, discord = null, removed = 1, uniqueId = ? where accountId = ?', [
      hashedEmail,
      `deleted-${account.uniqueId}-${deletedCount}`,
      account.accountId,
    ]);

    SessionManager.deleteCachedSession(req.cookies.sessionId);
    res.clearCookie('sessionId');
    res.redirect('/account/deleted');
  } catch (e) {
    console.error(e);
    new ErrorManager(req, res, e as Error).write();
  }
});

// todo: add ratelimit
app.post('/forgot-password', async function (req, res) {
  try {
    const { stage } = req.query;
    if (!stage) return renderPage(req, res, 'account/forgot-password', {
      stage: 0,
      error: 'Missing stage',
      message: null,
    });

    switch (stage) {
      case '0': {
        const { email } = req.body;
        if (!email) return renderPage(req, res, 'account/forgot-password', {
          stage: 0,
          error: 'Missing email',
          message: null,
        });

        const uniqueId = generateRandomId(email.toLowerCase());
        const account: Account | null = (await querySync('select * from accounts where uniqueId = ?', [uniqueId]))[0];
        const successMessage = 'Sent a password reset. If there was an account with this email, check it\'s inbox.';
        if (!account) return renderPage(req, res, 'account/forgot-password', {
          stage: 0,
          error: null,
          message: successMessage,
        });

        const randomToken = crypto.randomUUID().replace(/-/g, '');
        const linkUrl = `${req.hostname == 'localhost' ? 'http' : 'https'}://${req.hostname}/account/forgot-password/${randomToken}`;
        const sendEmail = new EmailManager(email);
        sendEmail.setTitle('LivzMC - Password Reset');
        sendEmail.setBody(
          `
            <h1>Hey ${email.split('@')[0].toLowerCase()}</h1>
            <p>
              To continue the process of resetting your password, click the link and enter the new password.
              <a href="${linkUrl}" target="__">${linkUrl}</a>
            </p>
            <small style="color: #444;">
              If you did not sign up with LivzMC.net or do not wish to be with us any longer, you can request a password reset, then delete the account on the account panel:
              <a href="https://livzmc.net/account/forgot-password">PASSWORD RESET</a>
            </small>
          `
        );

        const emailResponse = await sendEmail.send();
        if (!emailResponse || emailResponse.rejected.length > 0) return;
        await fsp.writeFile(`cache/email_verification/${randomToken}.txt`, account.uniqueId);

        renderPage(req, res, 'account/forgot-password', {
          stage: 0,
          error: null,
          message: successMessage,
        });
        break;
      }
      case '1': {
        const { password, conf_password } = req.body;
        if ((!password || !conf_password) || (password !== conf_password) || !req.body.id) return renderPage(req, res, 'account/forgot-password', {
          stage: 1,
          error: 'Passwords do not match',
          message: null,
          uniqueId: req.body.id,
        });

        if (password.length < 8) {
          return renderPage(req, res, 'account/forgot-password', {
            stage: 1,
            error: 'Password is too short. Minimum amount of charcters is 8',
            message: null,
            uniqueId: req.body.id,
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await querySync('update accounts set password = ? where uniqueId = ?', [hashedPassword, req.body.id]);
        SessionManager.deleteCachedSession(req.cookies.sessionId);
        res.clearCookie('sessionId');

        renderPage(req, res, 'account/forgot-password', {
          stage: 2,
          error: null,
          message: 'Password changed',
        });
        break;
      }
      default:
        renderPage(req, res, 'account/forgot-password', {
          stage: 0,
          error: 'Invalid stage',
        });
        break;
    }
  } catch (e) {
    console.error(e);
    new ErrorManager(req, res, e as Error).write();
  }
});

export default app;