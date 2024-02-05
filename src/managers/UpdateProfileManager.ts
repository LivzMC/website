import NodeCache from 'node-cache';
import fs from 'fs';
import fsp from 'fs/promises';
import Jimp from 'jimp';
import { getFilePath, isDevMode } from '../utils/Utils';
import { generateImageHash } from '../utils/Hash';
import { Skin, SkinUsers } from './database/types/SkinTypes';
import { querySync } from './database/MySQLConnection';
import { Cape, CapeUser } from './database/types/CapeTypes';

const USERNAME_UUID = new NodeCache();
const IS_CREATING_PROFILE: Map<string, boolean> = new Map();

// public helper funcitons

/**
 * Calls Mojang's API to get a uuid from a username.
 * This is a cached function which uses the username as a cache key.
 */
export async function usernameToUUID(username: string): Promise<string | null> {
  let ret = null;
  if (USERNAME_UUID.has(username)) return USERNAME_UUID.get(username) as string | null;

  try {
    const f = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
    if (f.status === 200) {
      const res: { name: string, id: string; } = await f.json();
      ret = res.id;
    }
  } catch (e) {
    console.error(e);
  }

  // can this be more heavily cached? It's not like people are searching their name then changing it immediately 
  USERNAME_UUID.set(username, ret, 10);
  return ret;
}

/**
 * Only called if there is not a profile row found with the provided uuid
 * This assumes that the provided UUID does not have an existing profile.
 * If it does, then it will error out though the unique key from mysql
 */
export async function createProfile(uuid: string): Promise<void> {
  if (IS_CREATING_PROFILE.get(uuid)) return;
  IS_CREATING_PROFILE.set(uuid, true);
  const profile = await parseProfileFromMojangAPI(uuid);
  if (!profile) return;
  const isDev = isDevMode();
  const time_start = performance.now();

  // skin
  const skinDataPath = `cache/skins/data/${profile.skin.url.substring('http://textures.minecraft.net/texture/'.length)}.json`;
  let skinData: SkinData | null = null;
  if (!fs.existsSync(skinDataPath)) {
    skinData = await generateSkinData(profile.skin.url);
    await fsp.writeFile(skinDataPath, JSON.stringify(skinData));
  } else {
    skinData = JSON.parse((await fsp.readFile(skinDataPath)).toString());
  }

  if (skinData) {
    const now = performance.now();
    let skin: Skin = (await querySync('select * from livzmc.skins where hash = ?', [skinData.hash]))[0];
    if (!skin) {
      // skin does not exist, so create a new row
      await querySync('insert into livzmc.skins (createdAt, url, skinId, userCount, hash) values (?, ?, ?, ?, ?)', [Date.now().toString(), skinData.url, skinData.hash.substring(20), '1', skinData.hash]);
      skin = (await querySync('select * from livzmc.skins where hash = ?', [skinData.hash]))[0];
    }

    const skinUser: SkinUsers = (await querySync('select * from livzmc.profileSkins where skinId = ? and uuid = ?', [skin.skinId, profile.uuid]))[0];
    if (!skinUser) {
      await querySync('insert into livzmc.profileSkins (skinId, uuid, cachedOn, model) values (?, ?, ?, ?)', [skin.skinId, profile.uuid, Date.now().toString(), profile.skin.slim ? '1' : '0']);
    } else {
      await querySync('update livzmc.profileSkins set enabled = 1 where skinId = ? and uuid = ?', [skin.skinId, profile.uuid]);
    }

    const end = performance.now();
    if (isDev) console.log(`[DEBUG] update skin: ${(end - now).toFixed(2)}ms`);
  }
  //
  // cape
  if (profile.cape !== null) {
    const capeDataPath = `cache/capes/data/${profile.skin.url.substring('http://textures.minecraft.net/texture/'.length)}.json`;
    let capeData: CapeData | null = null;
    if (!fs.existsSync(capeDataPath)) {
      capeData = await generateCapeData(profile.cape.url, 'mc');
      await fsp.writeFile(capeDataPath, JSON.stringify(capeData));
    } else {
      capeData = JSON.parse((await fsp.readFile(capeDataPath)).toString());
    }

    if (capeData) {
      const now = performance.now();
      let cape: Cape = (await querySync('select * from livzmc.capes where hash = ?', [capeData.hash]))[0];
      if (!cape) {
        // cape does not exist, create a new row
        await querySync(`insert into livzmc.capes (
          createdAt,
          url,
          capeId,
          capeType,
          title,
          description,
          users,
          category,
          hash
        ) vales (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?
        )`,
          [
            Date.now().toString(),
            profile.cape.url,
            capeData.hash.substring(20),
            'UNKNOWN',
            'Unknown',
            '',
            '1',
            'UNKNOWN',
            capeData.hash,
          ]
        );
        cape = (await querySync('select * from livzmc.capes where hash = ?', [capeData.hash]))[0];
      }

      const capeUser: CapeUser = (await querySync('select * from livzmc.profileCapes where capeId = ? and uuid = ?', [cape.capeId, profile.uuid]))[0];
      if (!capeUser) {
        await querySync('insert into livzmc.profileCapes (capeId, uuid, createdAt) values (?, ?, ?)', [cape.capeId, profile.uuid, Date.now().toString()]);
      } else {
        await querySync('update livzmc.profileCapes set enabled = 1 where capeId = ? and uuid = ?', [cape.capeId, profile.uuid]);
      }

      const end = performance.now();
      if (isDev) console.log(`[DEBUG] update cape: ${(end - now).toFixed(2)}ms`);
    }
  }
  //
  // profile
  await querySync(
    `
      insert into livzmc.profiles (
        uuid,
        username,
        createdAt,
        currentCape,
        currentSkin        
      ) values (
        ?,
        ?,
        ?,
        ?,
        ?
      )
    `,
    [
      profile.uuid,
      profile.username,
      Date.now().toString(),
      profile.skin.url,
      profile.cape ? profile.cape.url : 'none',
    ]
  );

  await querySync('insert into livzmc.profileNames (uuid, username) values (?, ?)', [profile.uuid, profile.username]);
  //

  const time_end = performance.now();
  if (isDev) console.log(`[DEBUG] Creating profile: ${(time_end - time_start).toFixed(2)}ms`);
  IS_CREATING_PROFILE.delete(uuid);
}

// private helper functions

/**
 * Helper function that parses the raw session profile into something that can be used
 * Mojang's API responds with an encoded base64 string.
 */
async function parseProfileFromMojangAPI(uuid: string): Promise<ParsedProfile | null> {
  try {
    // should I cache the parsed response? If so, how long? Skins / capes can change frequently
    // sessionserver has a lower ratelimit, so maybe can be ignored for now
    const time_start = performance.now();
    const raw_profile_response = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
    if (raw_profile_response.status !== 200) return null;
    const raw_profile = await raw_profile_response.json();
    if (!raw_profile.properties[0]) return null;
    const json_profile = JSON.parse(Buffer.from(raw_profile.properties[0].value, 'base64').toString());
    const time_end = performance.now();
    if (isDevMode()) console.log(`[DEBUG] Parsing profile: ${(time_end - time_start).toFixed(2)}ms`);

    return {
      uuid: json_profile.profileId,
      username: json_profile.profileName,
      skin: {
        url: json_profile.textures.SKIN.url,
        // metadata field only displays for skins that are slim
        // mojang could eventually change the metadata field to have something else, so need to add extra check
        slim: json_profile.textures.SKIN?.metadata !== undefined && json_profile.textures.SKIN?.metadata?.model === 'slim',
      },
      cape: null,
    };
  } catch (e) {
    console.error(e);
    return null;
  }
}

/**
 * Generates and caches skin data from the Mojang texture server.
 * The data consists of the following image data:
 * width, height, hash, url
 */
async function generateSkinData(url: string): Promise<SkinData | null> {
  /*
  const image = await fetchImage(url);
  if (!image) return null;

  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  const hash = generateImageHash(image, width, height);
  */
  const image = await Jimp.read(url);
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  const hash = generateImageHash(image.bitmap.data, width, height);
  await fsp.writeFile(`${getFilePath()}/skins/${hash.substring(20)}.png`, await image.getBufferAsync('image/png'));

  return {
    width,
    height,
    hash,
    url,
  };
}

/**
 * Generates and caches cape data from the respective texture server.
 */
async function generateCapeData(url: string, type: 'mc' | 'of' | 'lb' | 'mcm'): Promise<CapeData | null> {
  const image = await Jimp.read(url);
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  const hash = generateImageHash(image.bitmap.data, width, height);
  switch (type) {
    case 'mc':
      await fsp.writeFile(`${getFilePath()}/capes/${hash.substring(20)}.png`, await image.getBufferAsync('image/png'));
      break;
    default:
      break;
  }

  return {
    width,
    height,
    hash,
    url,
    type,
  };
}

// private types

type ParsedProfile = {
  uuid: string,
  username: string,
  skin: {
    url: string,
    slim: boolean,
  },
  cape: null | {
    url: string,
  },
};

type SkinData = {
  width: number,
  height: number,
  hash: string,
  url: string,
};

type CapeData = {
  width: number,
  height: number,
  hash: string,
  url: string,
  type: 'mc' | 'of' | 'lb' | 'mcm',
};
