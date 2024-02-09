import NodeCache from 'node-cache';
import fs from 'fs';
import fsp from 'fs/promises';
import Jimp from 'jimp';
import { getFilePath, isDevMode } from '../utils/Utils';
import { generateImageHash } from '../utils/Hash';
import { Skin, SkinUsers } from './database/types/SkinTypes';
import { querySync } from './database/MySQLConnection';
import { Cape, CapeUser } from './database/types/CapeTypes';
import { User } from './database/types/UserTypes';

const USERNAME_UUID = new NodeCache();
const RECENTLY_UPDATED_USERS = new NodeCache();
const IS_UPDATING_PROFILE: Map<string, boolean> = new Map();
const RATELIMITTED_SEARCHES: Set<string> = new Set(); // todo: add a queue to go through the profiles that were searched but were denied due to ratelimit
let IS_RATELIMITTED: boolean = false;
let LAST_SEARCH = 0;

// public helper funcitons

/**
 * Calls Mojang's API to get a uuid from a username.
 * This is a cached function which uses the username as a cache key.
 */
export async function usernameToUUID(username: string): Promise<string | null> {
  let ret = null;
  if (USERNAME_UUID.has(username)) return USERNAME_UUID.get(username) as string | null;

  try {
    if (IS_RATELIMITTED) {
      // the ratelimit lasts about a minute, so do 70 seconds
      const now = Date.now();
      const then = new Date(LAST_SEARCH).setSeconds(new Date(LAST_SEARCH).getSeconds() + 70);
      if (now < then) {
        RATELIMITTED_SEARCHES.add(username);
        return null;
      }
    }

    const f = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
    LAST_SEARCH = Date.now();
    if (f.status === 200) {
      const res: { name: string, id: string; } = await f.json();
      ret = res.id;
      IS_RATELIMITTED = false;
    } else if (f.status === 429) {
      IS_RATELIMITTED = true;
      console.warn('[WARN] Ratelimitted from api.mojang.com');
      RATELIMITTED_SEARCHES.add(username);
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
  if (IS_UPDATING_PROFILE.get(uuid)) return;
  IS_UPDATING_PROFILE.set(uuid, true);
  const profile = await parseProfileFromMojangAPI(uuid);
  if (!profile) return;
  const isDev = isDevMode();
  const time_start = performance.now();

  // skin
  const skinData: SkinData | null = await getSkinData(profile.skin.url);

  if (skinData) {
    const now = performance.now();
    let skin: Skin = (await querySync('select * from skins where hash = ?', [skinData.hash]))[0];
    if (!skin) {
      // skin does not exist, so create a new row
      await querySync('insert into skins (createdAt, url, skinId, userCount, hash) values (?, ?, ?, ?, ?)', [Date.now().toString(), skinData.url, skinData.hash.substring(20), '1', skinData.hash]);
      skin = (await querySync('select * from skins where hash = ?', [skinData.hash]))[0];
    }

    const skinUser: SkinUsers = (await querySync('select * from profileSkins where skinId = ? and uuid = ?', [skin.skinId, profile.uuid]))[0];
    if (!skinUser) {
      await querySync('insert into profileSkins (skinId, uuid, cachedOn, model) values (?, ?, ?, ?)', [skin.skinId, profile.uuid, Date.now().toString(), profile.skin.slim ? '1' : '0']);
    } else {
      await querySync('update profileSkins set enabled = 1 where skinId = ? and uuid = ?', [skin.skinId, profile.uuid]);
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
      let cape: Cape = (await querySync('select * from capes where hash = ?', [capeData.hash]))[0];
      if (!cape) {
        // cape does not exist, create a new row
        await querySync(`insert into capes (
          createdAt,
          url,
          capeId,
          capeType,
          title,
          description,
          users,
          category,
          hash
        ) values (
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
        cape = (await querySync('select * from capes where hash = ?', [capeData.hash]))[0];
      }

      const capeUser: CapeUser = (await querySync('select * from profileCapes where capeId = ? and uuid = ?', [cape.capeId, profile.uuid]))[0];
      if (!capeUser) {
        await querySync('insert into profileCapes (capeId, uuid, cachedOn) values (?, ?, ?)', [cape.capeId, profile.uuid, Date.now().toString()]);
      } else {
        await querySync('update profileCapes set enabled = 1 where capeId = ? and uuid = ?', [cape.capeId, profile.uuid]);
      }

      const end = performance.now();
      if (isDev) console.log(`[DEBUG] update cape: ${(end - now).toFixed(2)}ms`);
    }
  }
  //
  // profile
  await querySync(
    `
      insert into profiles (
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

  await querySync('insert into profileNames (uuid, username) values (?, ?)', [profile.uuid, profile.username]);
  //

  const time_end = performance.now();
  if (isDev) console.log(`[DEBUG] Creating profile: ${(time_end - time_start).toFixed(2)}ms`);
  IS_UPDATING_PROFILE.delete(uuid);
}

export async function updateProfile(user: User): Promise<void> {
  if (RECENTLY_UPDATED_USERS.has(user.uuid)) return;
  if (user.banned || user.optOut) return;
  const parsedProfile = await parseProfileFromMojangAPI(user.uuid);
  if (!parsedProfile) return;

  if (user.currentSkin !== parsedProfile.skin.url) {
    // skin has changed
    await updateSkin(user, parsedProfile);
  }

  if (parsedProfile.cape) {
    if (user.currentCape !== parsedProfile.cape.url) {
      // cape has changed
      await updateCape(user, parsedProfile);
    }
  } else {
    if (user.currentCape !== 'none') {
      // cape disabled
      await querySync(
        `
          update profileCapes pc, profiles p
          set pc.enabled = 0, p.currentCape = 'none'
          where pc.uuid = ? and p.uuid = ?
        `,
        [user.uuid, user.uuid]
      );
    }
  }

  if (parsedProfile.username !== user.username) {
    // name has changed
    await querySync('update profiles set username = ? where uuid = ?', [parsedProfile.username, user.uuid]);
    await querySync(
      `
        insert into profileNames (
          uuid,
          username,
          changedToAt,
          diff
        ) values (
          ?,
          ?,
          ?,
          ?
        )
      `,
      [
        parsedProfile.uuid,
        parsedProfile.username,
        Date.now().toString(),
        user.lastSearched.toString() || '0',
      ]
    );
  }

  await querySync('update profiles set lastSearched = ? where uuid = ?', [Date.now().toString(), user.uuid]);
  RECENTLY_UPDATED_USERS.set(user.uuid, true, 15);
  return;
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
      cape: json_profile.textures.CAPE ?
        {
          url: json_profile.textures.CAPE.url
        } : null,
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
  const hash = generateImageHash(image.bitmap.data, width, height, true);
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

async function getSkinData(url: string): Promise<SkinData | null> {
  const skinDataPath = `cache/skins/data/${url.substring('http://textures.minecraft.net/texture/'.length)}.json`;
  let skinData = null;

  if (!fs.existsSync(skinDataPath)) {
    skinData = await generateSkinData(url);
    await fsp.writeFile(skinDataPath, JSON.stringify(skinData));
  } else {
    skinData = JSON.parse((await fsp.readFile(skinDataPath)).toString());
  }

  return skinData;
}

async function getCapeData(url: string, type: 'mc' | 'of' | 'lb' | 'mcm'): Promise<CapeData | null> {
  // todo: add other types of paths
  const capeDataPath = `cache/capes/data/${url.substring('http://textures.minecraft.net/texture/'.length)}.json`;
  let capeData = null;

  if (!fs.existsSync(capeDataPath)) {
    capeData = await generateCapeData(url, type);
    await fsp.writeFile(capeDataPath, JSON.stringify(capeData));
  } else {
    capeData = JSON.parse((await fsp.readFile(capeDataPath)).toString());
  }

  return capeData;
}

async function updateSkin(user: User, parsedProfile: ParsedProfile): Promise<void> {
  const skinData: SkinData | null = await getSkinData(parsedProfile.skin.url);
  if (!skinData) return;
  await querySync('update profileSkins set enabled = 0 where uuid = ?', [user.uuid]); // disable all existing skins

  let skin: Skin = (await querySync('select * from skins where hash = ?', [skinData.hash]))[0];
  if (!skin) {
    // skin does not exist, so create a new row
    await querySync('insert into skins (createdAt, url, skinId, userCount, hash) values (?, ?, ?, ?, ?)', [Date.now().toString(), skinData.url, skinData.hash.substring(20), '1', skinData.hash]);
    skin = (await querySync('select * from skins where hash = ?', [skinData.hash]))[0];
    if (!skin) return; // this shouldn't ever happen, but just in case
  }

  const skinUser: SkinUsers = (await querySync('select * from profileSkins where skinId = ? and uuid = ?', [skin.skinId, user.uuid]))[0];
  if (!skinUser) {
    await querySync('insert into profileSkins (skinId, uuid, cachedOn, model) values (?, ?, ?, ?)', [skin.skinId, user.uuid, Date.now().toString(), parsedProfile.skin.slim ? '1' : '0']);
  } else {
    await querySync('update profileSkins set enabled = 1 where skinId = ? and uuid = ?', [skin.skinId, user.uuid]);
  }

  await querySync('update profiles set currentSkin = ? where uuid = ?', [parsedProfile.skin.url, parsedProfile.uuid]);
}

async function updateCape(user: User, parsedProfile: ParsedProfile): Promise<void> {
  if (!parsedProfile.cape) return;
  const capeData: CapeData | null = await getCapeData(parsedProfile.cape.url, 'mc');
  if (!capeData) return;
  await querySync('update profileCapes set enabled = 0 where uuid = ?', [user.uuid]); // disable all existing capes

  let cape: Cape = (await querySync('select * from capes where hash = ?', [capeData.hash]))[0];
  if (!cape) {
    // cape does not exist, create a new row
    await querySync(
      `
        insert into capes (
          createdAt,
          url,
          capeId,
          capeType,
          title,
          description,
          users,
          category,
          hash
        ) values (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?
        )
      `,
      [
        Date.now().toString(),
        parsedProfile.cape.url,
        capeData.hash.substring(20),
        'UNKNOWN',
        'Unknown',
        '',
        '1',
        'UNKNOWN',
        capeData.hash,
      ]
    );
    cape = (await querySync('select * from capes where hash = ?', [capeData.hash]))[0];
    if (!cape) return; // this shouldn't ever happen, but just in case
  }

  const capeUser: CapeUser = (await querySync('select * from profileCapes where capeId = ? and uuid = ?', [cape.capeId, user.uuid]))[0];
  if (!capeUser) {
    await querySync('insert into profileCapes (capeId, uuid, cachedOn) values (?, ?, ?)', [cape.capeId, parsedProfile.uuid, Date.now().toString()]);
  } else {
    await querySync('update profileCapes set enabled = 1 where capeId = ? and uuid = ?', [cape.capeId, user.uuid]);
  }

  await querySync('update profiles set currentCape = ? where uuid = ?', [parsedProfile.cape.url, parsedProfile.uuid]);
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
