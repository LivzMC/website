CREATE TABLE IF NOT EXISTS `banners` (
  `id` int NOT NULL AUTO_INCREMENT,
  `createdAt` bigint DEFAULT NULL,
  `updated_on` bigint DEFAULT NULL,
  `url` char(255) DEFAULT NULL,
  `bannerId` char(36) NOT NULL,
  `cleanUrl` char(255) DEFAULT NULL,
  `bannerIdLength` char(2) DEFAULT NULL,
  `isBanner` tinyint(1) DEFAULT NULL,
  `removed` tinyint(1) NOT NULL DEFAULT '0',
  `hash` char(32) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `hash` (`hash`),
  KEY `bannerId` (`bannerId`),
  KEY `createdAt` (`createdAt`)
);
