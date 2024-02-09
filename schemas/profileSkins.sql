create table if not exists `profileSkins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `skinId` char(36) NOT NULL,
  `uuid` char(32) NOT NULL,
  `cachedOn` bigint DEFAULT NULL,
  `applied` bigint NOT NULL DEFAULT '1',
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `model` tinyint(1) NOT NULL DEFAULT '0',
  `hidden` tinyint(1) NOT NULL DEFAULT '0',

  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `uuid` (`uuid`),
  KEY `skinId` (`skinId`),
  KEY `cachedOn` (`cachedOn` DESC)
)