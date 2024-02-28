import crypto from 'crypto';
import Jimp from 'jimp';

const PIXEL_LENGTH = 4;

function px(pixels: Buffer, width: number, x: number, y: number): number {
  return pixels[width * PIXEL_LENGTH * y + x * PIXEL_LENGTH];
}

function binaryToHex(s: string): string {
  let output = '';
  for (let i = 0; i < s.length; i += 4) {
    const bytes = s.substr(i, 4);
    const decimal = parseInt(bytes, 2);
    const hex = decimal.toString(16);
    output += hex.toUpperCase();
  }

  return output;
}

export function generateImageHash(data: Buffer, width: number = 64, height: number = 64, slight_transparent: boolean = false): string {
  if (slight_transparent) {
    // When making all of the cape hashes, for some reason I decided to add a slight transparency to it.
    // Not sure why, at all
    for (let pixel = 3; pixel < data.length; pixel += 4) {
      if (data[pixel] === 0) {
        data[pixel - 3] = 245;
        data[pixel - 2] = 245;
        data[pixel - 1] = 245;
      }
    }
  }

  const sha256 = crypto.createHash('sha256');
  const header = Buffer.alloc(8);

  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, slight_transparent ? 0 : 4); // and this...
  sha256.update(header);
  sha256.update(data);

  return sha256.digest('hex').substring(0, 32);
}

export async function generateDHash(data: Jimp): Promise<string> {
  const height = 8;
  const width = height + 1;
  const pixels = data.greyscale().resize(width, height).bitmap.data;

  let difference = '';
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < height; col++) { // height is not a mistake here...
      const left = px(pixels, width, col, row);
      const right = px(pixels, width, col + 1, row);
      difference += left < right ? 1 : 0;
    }
  }

  return binaryToHex(difference).substring(0, 16);
}
