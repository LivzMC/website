CREATE TABLE IF NOT EXISTS `livzmc`.`banners` (
  `id` int NOT NULL AUTO_INCREMENT,
  `createdAt` bigint DEFAULT NULL,
  `updated_on` bigint DEFAULT NULL,
  `url` char(255) DEFAULT NULL,
  `bannerId` char(255) NOT NULL,
  `cleanUrl` char(255) DEFAULT NULL,
  `bannerIdLength` char(255) DEFAULT NULL,
  `isBanner` tinyint(1) DEFAULT NULL,
  `removed` tinyint(1) NOT NULL DEFAULT '0',
  `hash` char(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hash` (`hash`),
  KEY `bannerId` (`bannerId`),
  KEY `createdAt` (`createdAt`)
);
