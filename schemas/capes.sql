CREATE TABLE IF NOT EXISTS `livzmc`.`capes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `createdAt` bigint DEFAULT NULL,
  `url` char(255) DEFAULT NULL,
  `capeId` char(255) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `removed` tinyint(1) NOT NULL DEFAULT '0',
  `capeType` char(255) NOT NULL,
  `title` text NOT NULL,
  `description` text NOT NULL,
  `users` bigint NOT NULL DEFAULT '0',
  `category` char(255) DEFAULT NULL,
  `hash` char(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hash` (`hash`),
  KEY `capeId` (`capeId`),
  KEY `createdAt` (`createdAt`)
);
