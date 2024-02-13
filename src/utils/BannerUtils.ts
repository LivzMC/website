import { getLocaleString } from './Utils';

export function getColourNameFromId(colourId: string): string {
  const COLOUR_ARRAY = [
    { id: 'a', colour: 'colour.black', coord: [0, 0] },
    { id: 'i', colour: 'colour.dark_gray', coord: [400, 0] },
    { id: 'h', colour: 'colour.light_gray', coord: [500, 0] },
    { id: 'p', colour: 'colour.white', coord: [600, 320] },
    { id: 'j', colour: 'colour.pink', coord: [300, 320] },
    { id: 'n', colour: 'colour.light_purple', coord: [100, 320] },
    { id: 'f', colour: 'colour.purple', coord: [400, 320] },
    { id: 'e', colour: 'colour.blue', coord: [100, 0] },
    { id: 'g', colour: 'colour.cyan', coord: [300, 0] },
    { id: 'm', colour: 'colour.light_blue', coord: [700, 0] },
    { id: 'c', colour: 'colour.green', coord: [600, 0] },
    { id: 'k', colour: 'colour.light_green', coord: [0, 320] },
    { id: 'l', colour: 'colour.yellow', coord: [700, 320] },
    { id: 'o', colour: 'colour.orange', coord: [200, 320] },
    { id: 'd', colour: 'colour.brown', coord: [200, 0] },
    { id: 'b', colour: 'colour.red', coord: [500, 320] },
    { id: ';', colour: 'colour.transparent', coord: [1000, 1000] }
  ];

  return COLOUR_ARRAY.filter(a => a.id === colourId.toLowerCase())[0]?.colour;
}

export async function getColourNameTranslated(locale: string, colourName: string): Promise<string> {
  return await getLocaleString(locale, 'banner', colourName);
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

    const format = `
    <div draggable="${!isBaseLayer}" data-id="${colour}${pattern}" id="${colour}${pattern}-${i}-container" class="border border-gray-100 dark:border-gray-900 px-4 text-center" draggable="false">
      <p draggable="false" class="text-gray-500 dark:text-gray-200">${isBaseLayer ? 'Base Layer | ' : ''}${await getColourNameTranslated(language, getColourNameFromId(colour))}</p>
      <div class="grid grid-cols-3">
        <div class="flex items-center justify-center">
          <div data-changeColor="changeColorText" class="modal-change_colour_modal-open" onclick="changeColorInit(this)">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><path fill="#ffffff" d="M17.5 12a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 17.5 9a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5m-3-4A1.5 1.5 0 0 1 13 6.5A1.5 1.5 0 0 1 14.5 5A1.5 1.5 0 0 1 16 6.5A1.5 1.5 0 0 1 14.5 8m-5 0A1.5 1.5 0 0 1 8 6.5A1.5 1.5 0 0 1 9.5 5A1.5 1.5 0 0 1 11 6.5A1.5 1.5 0 0 1 9.5 8m-3 4A1.5 1.5 0 0 1 5 10.5A1.5 1.5 0 0 1 6.5 9A1.5 1.5 0 0 1 8 10.5A1.5 1.5 0 0 1 6.5 12M12 3a9 9 0 0 0-9 9a9 9 0 0 0 9 9a1.5 1.5 0 0 0 1.5-1.5c0-.39-.15-.74-.39-1c-.23-.27-.38-.62-.38-1a1.5 1.5 0 0 1 1.5-1.5H16a5 5 0 0 0 5-5c0-4.42-4.03-8-9-8"></path></svg>
          </div>
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
