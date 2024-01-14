// random misc utility functions
import fs from 'fs';

export function generateBannerPatterns(pattern: string): string {
  const matchedPatterns = pattern.match(/(..)/g);
  if (!matchedPatterns || matchedPatterns.length == 0) return '';
  const formatted = [];

  for (let i = 0; i < matchedPatterns.length; i++) {
    const match = matchedPatterns[i];
    const colour = match[0];
    const pattern = match[1];
    const isBaseLayer = i == 0;
    const format = `
    <div draggable="${!isBaseLayer}" data-id="${colour}${pattern}" id="${colour}${pattern}-${i}-container" class="border border-gray-100 dark:border-gray-900 px-4 text-center" draggable="false">
      <p draggable="false" class="text-gray-500 dark:text-gray-200">${isBaseLayer ? 'Base Layer | ' : ''}<%= getLayerColor(patt[i][0]) %></p>
      <div class="grid grid-cols-3">
        <div class="flex items-center justify-center">
          <div data-changeColor="changeColorText" class="modal-open" onclick="changeColorInit(this)"><%= getLocaleString(language, 'banner', 'change.colour') %></div>
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
