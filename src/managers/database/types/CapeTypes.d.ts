export type Cape = {
  id: number,
  createdAt: number,
  url: string,
  capeId: string,
  enabled: boolean,
  removed: boolean,
  capeType: string,
  title: string,
  description: string,
  users: number,
  category: string,
  hash: string,
};

export type CapeUser = {
  id: number,
  capeId: string,
  uuid: string,
  applied: boolean,
  enabled: boolean,
  hidden: boolean,
};
