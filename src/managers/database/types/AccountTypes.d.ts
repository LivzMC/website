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
