import crypto from 'crypto';

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