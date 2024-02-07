import { Request, Response } from 'express';

function getCookie(req: Request, cookieName: string, defaultValue: string | null): string | null {
  if (!req || !req.cookies) return defaultValue;
  const cookie: string | null = req.cookies[cookieName];
  return cookie || defaultValue;
}

export default function renderPage(req: Request, res: Response, path: string, options: any): void { // eslint-disable-line @typescript-eslint/no-explicit-any
  const theme = getCookie(req, 'theme', 'dark');
  const language = getCookie(req, 'language', 'en-us');
  // modify global options
  // stuff like theme, acc, language
  options.theme = theme;
  options.language = language;
  if (!options.currentPage) options.currentPage = req.path; // assume currentPage if none are supplied
  // render page
  res.render(path, options, (err, html) => {
    if (err) {
      const error = !req.app.locals.DEVMODE ? 'There was an unknown error that occured' : err.message.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/, '<br>').replace(/\r/, '<br>');

      return res.status(500).send(`
        <style>
          * {
            padding: 0;
            margin: 0;
          }

          body {
            padding: 10px;
            font-family: sans-serif;
            background-color: #222;
            color: white;
          }
        </style>
        <h1>There was an error that occured!</h1>
        <h2>Website launched in developer mode!</h2>
        <code>
          ${error}
        </code>
      `);
    }
    res.send(html);
  });
}
