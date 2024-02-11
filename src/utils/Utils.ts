// random misc utility functions
import fs from 'fs';
import fsp from 'fs/promises';
import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import { querySync } from '../managers/database/MySQLConnection';
import { UserNameHistory } from '../managers/database/types/UserTypes';

const DEFAULT_LANGUAGE = JSON.parse(fs.readFileSync('LivzMC/lang/en-us/core.json').toString());
const DEVMODE: boolean = process.env.DEVMODE?.toLowerCase() == 'true';
const FILEPATH: string = process.env.FILEPATH?.toString() || 'cache/files';

export function isDevMode(): boolean {
  return DEVMODE;
}

export function getFilePath(): string {
  return FILEPATH;
}

export async function generateBannerPatterns(pattern: string, language: string): Promise<string> {
  const matchedPatterns = pattern.match(/(..)/g);
  if (!matchedPatterns || matchedPatterns.length == 0) return '';
  const formatted = [];

  for (let i = 0; i < matchedPatterns.length; i++) {
    const match = matchedPatterns[i];
    const colour = match[0];
    const pattern = match[1];
    const isBaseLayer = i == 0;

    const colourLocale = await getLocaleString(language, 'banner', 'change.colour');

    function getColourName(colourId: string): string {
      const COLOUR_ARRAY = [
        { id: 'a', colour: 'BLACK', coord: [0, 0] },
        { id: 'i', colour: 'DARK_GRAY', coord: [400, 0] },
        { id: 'h', colour: 'LIGHT_GRAY', coord: [500, 0] },
        { id: 'p', colour: 'WHITE', coord: [600, 320] },
        { id: 'j', colour: 'PINK', coord: [300, 320] },
        { id: 'n', colour: 'LIGHT_PURPLE', coord: [100, 320] },
        { id: 'f', colour: 'PURPLE', coord: [400, 320] },
        { id: 'e', colour: 'BLUE', coord: [100, 0] },
        { id: 'g', colour: 'CYAN', coord: [300, 0] },
        { id: 'm', colour: 'LIGHT_BLUE', coord: [700, 0] },
        { id: 'c', colour: 'GREEN', coord: [600, 0] },
        { id: 'k', colour: 'LIGHT_GREEN', coord: [0, 320] },
        { id: 'l', colour: 'YELLOW', coord: [700, 320] },
        { id: 'o', colour: 'ORANGE', coord: [200, 320] },
        { id: 'd', colour: 'BROWN', coord: [200, 0] },
        { id: 'b', colour: 'RED', coord: [500, 320] },
        { id: ';', colour: 'TRANSPARENT', coord: [1000, 1000] }
      ];

      const colour = COLOUR_ARRAY.filter(a => a.id === colourId.toLowerCase())[0]?.colour;
      return colour ? colour[0] + colour.slice(1).toLowerCase() : 'unknown';
    }

    const format = `
    <div draggable="${!isBaseLayer}" data-id="${colour}${pattern}" id="${colour}${pattern}-${i}-container" class="border border-gray-100 dark:border-gray-900 px-4 text-center" draggable="false">
      <p draggable="false" class="text-gray-500 dark:text-gray-200">${isBaseLayer ? 'Base Layer | ' : ''}${getColourName(colour)}</p>
      <div class="grid grid-cols-3">
        <div class="flex items-center justify-center">
          <div data-changeColor="changeColorText" class="modal-open" onclick="changeColorInit(this)">${colourLocale}</div>
        </div>
        <div class="flex items-center justify-center">
          <div id="${colour}${pattern}-${i}" draggable="false" class="w-min mt-1 text-gray-900 sm:mt-0 sm:col-span-2 dark:text-gray-300 py-1 pattern">
            <div class="tbc" draggable="false" style="pointer-events: none;">
              <img alt="Pattern ${isBaseLayer ? `${colour}a` : `${colour}${pattern}`}" draggable="false" class="bg-gray-400 dark:bg-gray-600" style="height: 80px;" data-id_2="format=${isBaseLayer ? `${colour}a` : `;a${colour}${pattern}`}" />
            </div>
          </div>
        </div>
        ${isBaseLayer ? '' : `
          <div class="flex items-center justify-center">
            <span class="hover:underline cursor-pointer text-2xl text-red-500" onclick="deleteLayer(this)">x</span>
          </div>
        `}
      </div>
    </div>
    `;

    formatted.push(format);
  }

  return formatted.join('');
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
