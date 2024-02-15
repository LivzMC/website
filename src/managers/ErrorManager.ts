import path from 'path';
import fsp from 'fs/promises';
import { Request, Response } from 'express';
import { generateRandomId } from '../utils/Utils';

export default class ErrorManager {
  private req: Request;
  private res: Response;
  private error: string;
  private log: string;
  private saveFile: boolean;

  constructor(req: Request, res: Response, error: Error, saveFile: boolean = true) {
    this.req = req;
    this.res = res;
    this.error = this.formatError(error);
    this.saveFile = saveFile;
    this.log = this.logError();
  }

  public json(): Response | null {
    try {
      if (this.res.headersSent) return null;
      return this.res.status(500).json({
        message: 'There was an error loading this page! Please contact me with this error code',
        ERROR: this.log,
        contact: 'Email: support@livzmc.net || Discord: https://discord.com/invite/ytrKev7xZD'
      });
    } catch (e) {
      return null;
    }
  }

  public renderPage(): void {
    try {
      if (this.res.headersSent) return;
      return this.res.status(500).render('error', {
        theme: this.req.cookies.theme,
        acc: null,
        language: 'en-us',
        e: 'There was an error loading this page.<br><span class="text-sm">Email: support@livzmc.net<br>Discord: https://discord.com/invite/ytrKev7xZD</span>',
        errorCode: `ERROR-${this.log}`
      });
    } catch (e) {
      return;
    }
  }

  public write(): Response | null {
    try {
      if (this.res.headersSent) return null;
      this.res.write('There was an error loading this page! Please contact me with this error code\n');
      this.res.write(`ERROR-${this.log}\n\n`);
      this.res.write('Email: support@livzmc.net\nDiscord: https://discord.com/invite/ytrKev7xZD');
      return this.res.status(500).send();
    } catch (e) {
      return null;
    }
  }

  private formatError(err: Error): string {
    if (!err.stack) return 'UNKNOWN';
    const formatted = [err.message];

    const fileRegex = new RegExp(`${path.parse(process.cwd()).root}\\[^,]+\\d+:\\d+`);
    const traceRegex = /(?<=at\s)[^\r\n\t\f\v(< ]+/;
    const evalRegex = /(?<=<anonymous>):\d+:\d+/;

    for (const line of err.stack.split('\n')) {
      if (line.startsWith('node_modules')) break;
      const fileMatch = line.match(fileRegex);
      const traceMatch = line.match(traceRegex);
      const evalMatch = line.match(evalRegex);
      if (!fileMatch) continue;

      const file = fileMatch[0];
      const trace = traceMatch ? traceMatch[0] : null;
      const eval_ = evalMatch ? evalMatch[0] : null;

      let string = '';
      const fileshort = file.replace(process.cwd(), '~');

      if (trace && trace !== file) {
        if (trace === 'eval') {
          string += trace + eval_;
          formatted.push(string);
          formatted.push(fileshort);
        } else if (eval_) {
          string += `${trace} (at eval${eval_}, ${fileshort})`;
          formatted.push(string);
        } else {
          string += `${trace} (${fileshort})`;
          formatted.push(string);
        }
      } else {
        string += fileshort;
        formatted.push(string);
      }
    }

    return [...new Set(formatted)].join('\n   at ');
  }

  private logError(): string {
    const errorId = generateRandomId(this.error);
    if (this.saveFile) {
      fsp.writeFile(`${errorId}-error.txt`, this.error);
    }
    return errorId;
  }
}
