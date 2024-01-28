import NodeCache from 'node-cache';
import fs from 'fs';
import fsp from 'fs/promises';
import { Account } from './database/types/AccountTypes';

const SessionIDCache = new NodeCache();

export default class SessionManager {
  private sessionId: string;
  private account: Account;

  constructor(sessionId: string, account: Account) {
    this.sessionId = sessionId;
    this.account = account;

    SessionManager.createCachedSession(sessionId, account);
  }

  public static async getCachedSession(sessionId: string): Promise<Account | null> {
    if (!SessionIDCache.has(sessionId)) {
      // load from disk then save in memory
      const path = `cache/sessions/${sessionId}.json`;
      if (!fs.existsSync(path)) return null;
      const account: Account = JSON.parse((await fsp.readFile(path)).toString());
      this.createCachedSession(sessionId, account);
      return account;
    }

    const account: Account | undefined = SessionIDCache.get(sessionId);
    return account || null;
  }

  private static createCachedSession(sessionId: string, account: Account): void {
    SessionIDCache.set(sessionId, account, 60 * 10); // save in memory for 10 minutes
    fsp.writeFile(`cache/sessions/${sessionId}.json`, JSON.stringify(account));
  }

  public getSessionId() {
    return this.sessionId;
  }

  public getAccount() {
    return this.account;
  }
}
