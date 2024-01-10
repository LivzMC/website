export type User = {
  uuid: string,
  username: string,
  createdAt: number,
  creationDate: number | null,
  banned: boolean,
  currentCape: string,
  currentSkin: string,
  lastSearched: number,
  hasCheckedDate: boolean,
  deletedAccount: boolean,
  optOut: boolean,
};
