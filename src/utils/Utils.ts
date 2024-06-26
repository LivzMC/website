// random misc utility functions
import fs from 'fs';
import fsp from 'fs/promises';
import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import { querySync } from '../managers/database/MySQLConnection';
import { UserNameHistory } from '../managers/database/types/UserTypes';
import { execSync } from 'child_process';

const DEFAULT_LANGUAGE = JSON.parse(fs.readFileSync('LivzMC/lang/en-us/core.json').toString());
const DEVMODE: boolean = process.env.DEVMODE?.toLowerCase() == 'true';
const FILEPATH: string = process.env.FILEPATH?.toString() || 'cache/files';

initFilePath();

export function isDevMode(): boolean {
  return DEVMODE;
}

export function getFilePath(): string {
  return FILEPATH;
}

function initFilePath(): void {
  if (FILEPATH === 'cache/files') console.warn('[WARN] File path is located inside the cache directory. The cache directory is supposed to be temporary.');
  if (!fs.existsSync(FILEPATH)) fs.mkdirSync(FILEPATH, { recursive: true });
  if (!fs.existsSync(FILEPATH + '/skins')) fs.mkdirSync(FILEPATH + '/skins', { recursive: true });
  if (!fs.existsSync(FILEPATH + '/capes')) fs.mkdirSync(FILEPATH + '/capes', { recursive: true });
}

/**
 * Converts the provided text into MD5
 */
export function generateRandomId(text: string, length: number = 8) {
  return crypto.createHash('md5').update(text).digest('hex').substring(32 - length);
}

/**
 * Checks if the provided file was created within a set amount of time
 */
export function isFileCacheExpired(path: string, seconds: number = 30): boolean {
  if (!path || !fs.existsSync(path)) return true;
  const stats = fs.statSync(path);
  const now = Date.now();
  const then = stats.mtime.setSeconds(stats.mtime.getSeconds() + seconds);

  return now > then;
}

export async function getLocaleString(languageName: string = 'en-us', fileName: string = 'core', key: string): Promise<string> {
  try {
    if (!key) return '';
    languageName = languageName.trim();
    fileName = fileName.trim();
    key = key.trim();
    const pathToFile = `LivzMC/lang/${languageName}/${fileName}.json`;
    if (!fs.existsSync(pathToFile)) return key;
    const file = JSON.parse((await fsp.readFile(pathToFile)).toString());
    if (!file[key]) return DEFAULT_LANGUAGE[key] || key;

    return file[key];
  } catch (e) {
    return key;
  }
}

export async function getUserNameIndex(username: string, uuid: string): Promise<number> {
  try {
    const usernames: UserNameHistory[] = await querySync('select username, uuid from profileNames where username = ?', [username]);
    return usernames.findIndex(name => name.uuid === uuid);
  } catch (e) {
    return 0;
  }
}

export function secondsToTime(seconds: number): string {
  if (isNaN(seconds)) seconds = new Date(0).getTime();
  const y = Math.floor(seconds / (3600 * (24 * 365)));
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor(seconds % (3600 * 24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = Math.floor(seconds % 60);

  const yDisplay: string = y > 0 ? y + 'y' : '';
  const dDisplay: string = d > 0 ? d + 'd ' : '';
  const hDisplay: string = h > 0 ? h + 'h ' : '';
  const mDisplay: string = m > 0 ? m + 'm ' : '';
  const sDisplay: string = s > 0 ? s + 's ' : '';

  if (y > 0) return yDisplay;
  if (d > 0) return dDisplay;
  if (h > 0) return hDisplay;
  if (m > 0) return mDisplay;
  if (s > 0) return sDisplay;

  return 'NULL';
}

export function encrypt(text: string, key: string | null = (process.env.KEY || null)): string {
  if (!key) throw new Error('Invalid encryption key!');
  return CryptoJS.AES.encrypt(text, key).toString();
}

export function decrypt(text: string, key: string | null = (process.env.KEY || null)): string {
  if (!key) throw new Error('Invalid encryption key!');
  return CryptoJS.AES.decrypt(text, key).toString(CryptoJS.enc.Utf8);
}

export function encodeMD5(text: string): string {
  return crypto.createHash('MD5').update(text).digest('hex').toString();
}

export function isUUID(text: string): boolean {
  return text.match(/([0-9a-f]{8})(?:-|)([0-9a-f]{4})(?:-|)(4[0-9a-f]{3})(?:-|)([89ab][0-9a-f]{3})(?:-|)([0-9a-f]{12})/g) !== null;
}

export async function fetchImage(url: string): Promise<Buffer | null> {
  if (!url || !url.startsWith('http')) return null;
  const response = await fetch(url);
  if (response.status !== 200) return null;
  const blob = await response.blob();
  return Buffer.from(await blob.arrayBuffer());
}

export async function clearCache(): Promise<void> {
  //clear default paths
  if (fs.existsSync('cache/email_verification')) {
    await fsp.rm('cache/email_verification', { recursive: true });
    await fsp.mkdir('cache/email_verification', { recursive: true });
  }

  if (fs.existsSync('cache/sessions')) {
    const sessions = await fsp.readdir('cache/sessions');
    for (let i = 0; i < sessions.length; i++) {
      const sessionName = sessions[i];
      if (isFileCacheExpired(`cache/sessions/${sessionName}`, (60 * 60) * 24)) {
        await fsp.rm(`cache/sessions/${sessionName}`);
      }
    }
  }
}

export function getGitInfo(): {
  hash: string,
  branchName: string,
  isDirty: boolean,
} {
  const hash = execSync(`git rev-parse HEAD`, { stdio: [] })?.toString() || 'UNKNOWN';
  const branchName = execSync('git rev-parse --abbrev-ref HEAD')?.toString().trim() || 'master';
  const isDirty = execSync('git status --short || echo true').toString().trim().length > 0;

  return {
    hash,
    branchName,
    isDirty,
  };
}
