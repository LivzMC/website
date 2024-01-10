export type Banner = {
  id: number,
  createdAt: number,
  updated_on: number,
  url: string | null,
  bannerId: string,
  bannerIdLength: string | null,
  cleanUrl: string | null,
  isBanner: boolean,
  removed: boolean,
  hash: string,
};

export type BannerUser = {
  id: number,
  capeId: string,
  uuid: string,
  cachedOn: number,
  applied: number,
  enabled: boolean,
  hidden: boolean,
};
