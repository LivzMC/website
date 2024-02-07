CREATE TABLE IF NOT EXISTS `mccapes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `createdAt` bigint DEFAULT NULL,
  `capeId` char(36) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `removed` tinyint(1) NOT NULL DEFAULT '0',
  `ears` tinyint(1) NOT NULL DEFAULT '0',
  `animated` tinyint(1) NOT NULL DEFAULT '0',
  `hash` char(32) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hash` (`hash`)
);
