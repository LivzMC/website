CREATE TABLE IF NOT EXISTS `capes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `createdAt` bigint DEFAULT NULL,
  `url` char(255) DEFAULT NULL,
  `capeId` char(36) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `removed` tinyint(1) NOT NULL DEFAULT '0',
  `capeType` char(32) NOT NULL,
  `title` text NOT NULL,
  `description` text NOT NULL,
  `users` bigint NOT NULL DEFAULT '0',
  `category` char(32) DEFAULT NULL,
  `hash` char(32) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `hash` (`hash`),
  KEY `capeId` (`capeId`),
  KEY `createdAt` (`createdAt`)
);
