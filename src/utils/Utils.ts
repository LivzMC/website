// random misc utility functions
import fs from 'fs';
import fsp from 'fs/promises';
import { querySync } from '../managers/database/MySQLConnection';
import { UserNameHistory } from '../managers/database/types/UserTypes';

const DEFAULT_LANGUAGE = JSON.parse(fs.readFileSync('LivzMC/lang/en-us/core.json').toString());

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

    const format = `
    <div draggable="${!isBaseLayer}" data-id="${colour}${pattern}" id="${colour}${pattern}-${i}-container" class="border border-gray-100 dark:border-gray-900 px-4 text-center" draggable="false">
      <p draggable="false" class="text-gray-500 dark:text-gray-200">${isBaseLayer ? 'Base Layer | ' : ''}<%= getLayerColor(patt[i][0]) %></p>
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
