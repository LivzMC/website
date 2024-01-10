export type Skin = {
  id: number,
  createdAt: number,
  url: string,
  skinId: string,
  enabled: boolean,
  model: boolean,
  userCount: number,
  hash: string,
};

export type SkinUsers = {
  id: number,
  skinId: string,
  uuid: string,
  cachedOn: number,
  applied: number,
  enabled: boolean,
  model: boolean,// true is slim ?
  hidden: boolean,
};
