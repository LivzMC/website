create table if not exists `profileOFCapes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `capeId` char(36) NOT NULL,
  `uuid` char(32) NOT NULL,
  `cachedOn` bigint DEFAULT NULL,
  `applied` bigint NOT NULL DEFAULT '1',
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `hidden` tinyint(1) NOT NULL DEFAULT '0',

  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `capeId` (`capeId`,`uuid`),
  KEY `uuid` (`uuid`),
  KEY `capeId_hidden` (`capeId`,`hidden`),
  KEY `cachedOn` (`cachedOn`),
  KEY `capeId_cachedOn` (`capeId`,`cachedOn`)
)