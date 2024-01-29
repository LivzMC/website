import express from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import sharp from 'sharp';

const app = express.Router();

function capeScale(height: number = 32): number {
  if (height % 22 === 0) return height / 22;
  if (height % 17 === 0) return height / 17;
  if (height >= 32 && (height & (height - 1)) === 0) return height / 32;

  return Math.max(1, Math.floor(height / 17));
}

// OptiFine capes
app.get('/cape/OF/:capeId.png', async function (req, res) {
  try {
    const pathToDir = `${process.env.FILEPATH}/optifine_capes/${req.params.capeId}`;
    if (!fs.existsSync(pathToDir)) return res.sendStatus(404);
    // optifine capes are stored like this -> optifine_capes/capeId/uuid.png
    // this is because people can change the back colour, and the cape id is generated from the front of the image
    const path = (await fsp.readdir(pathToDir))[0];
    const buffer = await fsp.readFile(`${pathToDir}/${path}`);
    const sharpImage = sharp(buffer);
    const imageHeight = (await sharpImage.metadata()).height;
    // get the scale of the cape since banner designs, default designs and custom designs can vary in sizes
    const cs = capeScale(imageHeight);
    const image = await sharpImage
      .extract({ left: cs, top: cs, width: cs * 10, height: cs * 16 })
      .toBuffer();
    res.set('cache-control', 'public, max-age=604800');
    res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': image.length });
    res.end(image);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

// MinecraftCapesMod capes
app.get('/cape/MC/:capeId.png', async function (req, res) {
  try {
    const path = `${process.env.FILEPATH}/minecraft_capes/${req.params.capeId}.png`;
    if (!fs.existsSync(path)) return res.sendStatus(404);
    const buffer = await fsp.readFile(path);
    const sharpImage = sharp(buffer);
    const imageHeight = (await sharpImage.metadata()).height;
    const cs = capeScale(imageHeight);
    const image = await sharpImage
      .extract({ left: cs, top: cs, width: cs * 10, height: cs * 16 })
      .toBuffer();
    res.set('cache-control', 'public, max-age=604800');
    res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': image.length });
    res.end(image);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

// LabyMod capes
app.get('/cape/LB/:capeId.png', async function (req, res) {
  try {
    const path = `${process.env.FILEPATH}/laby_capes/${req.params.capeId}.png`;
    if (!fs.existsSync(path)) return res.sendStatus(404);
    const buffer = await fsp.readFile(path);
    const sharpImage = sharp(buffer);
    const imageHeight = (await sharpImage.metadata()).height;
    const cs = capeScale(imageHeight);
    const image = await sharpImage
      .extract({ left: cs, top: cs, width: cs * 10, height: cs * 16 })
      .toBuffer();
    res.set('cache-control', 'public, max-age=604800');
    res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': image.length });
    res.end(image);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

// vanilla Minecraft capes
app.get('/cape/:capeId.png', async function (req, res) {
  try {
    const path = `${process.env.FILEPATH}/capes/${req.params.capeId}.png`;
    if (!fs.existsSync(path)) return res.sendStatus(404);
    const buffer = await fsp.readFile(path);
    const sharpImage = sharp(buffer);
    const image = await sharpImage
      .extract({ left: 1, top: 1, width: 10, height: 16 })
      .toBuffer();
    res.set('cache-control', 'public, max-age=604800');
    res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': image.length });
    res.end(image);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

export default app;
