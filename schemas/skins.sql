CREATE TABLE IF NOT EXISTS `skins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `createdAt` bigint DEFAULT NULL,
  `url` char(255) DEFAULT NULL,
  `skinId` char(36) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `model` tinyint(1) NOT NULL DEFAULT '0',
  `userCount` int NOT NULL DEFAULT '0',
  `hash` char(32) NOT NULL,
  `dhash` char(16) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hash` (`hash`),
  KEY `skinId` (`skinId`),
  KEY `createdAt` (`createdAt`),
  KEY `url` (`url`),
  KEY `dhash` (`dhash`)
);
