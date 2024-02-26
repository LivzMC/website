export type Account = {
  id: number,
  accountId: string,
  uniqueId: string,
  email: string,
  password: string,
  createdAt: number,
  discord: string,
  banned: boolean,
  removed: boolean,
  emailVerified: boolean,
  donator: boolean,
  permission: number,
  '2FA': string,
};

export type LinkedAccount = {
  accountId: string,
  createdAt: number,
  uuid: string,
  vanityUrl: string | null,
  vanityClicks: number,
  prideBorder: string | null,
  socials: string | null,
  bio: string | null,
  linked: boolean,
  active: boolean,
};

export type LinkedProfile = {
  uuid: string,
  username: string,
  enabledColor: string | null,
  enabledEmoji: string | null,
  enabledFont: string | null,
  skinId: string,
  linked_bio: string,
  linked_vanityUrl: string,
  linked_prideBorder: string,
  linked_createdAt: number,
  linked_linked: boolean,
  linked_active: boolean,
};
