create table if not exists `linkedaccounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `accountId` char(30) NOT NULL,
  `createdAt` bigint DEFAULT NULL,
  `uuid` char(32) NOT NULL,
  `vanityUrl` char(32) DEFAULT NULL,
  `vanityClicks` bigint DEFAULT NULL,
  `prideBorder` char(255) DEFAULT NULL,
  `socials` text,
  `bio` text,
  `linked` tinyint(1) NOT NULL DEFAULT '1',
  `active` tinyint(1) NOT NULL DEFAULT '1',

  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `uuid` (`uuid`),
  KEY `accountId` (`accountId`)
)