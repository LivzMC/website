create table if not exists `badgeusers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `createdAt` bigint DEFAULT NULL,
  `badgeId` char(36) NOT NULL,
  `uuid` char(32) NOT NULL,
  `hidden` tinyint(1) NOT NULL DEFAULT '0',

  PRIMARY KEY (`id`),
  UNIQUE KEY `badgeId` (`badgeId`,`uuid`),
  KEY `uuid` (`uuid`)
)