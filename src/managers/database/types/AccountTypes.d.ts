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
