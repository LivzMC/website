CREATE TABLE IF NOT EXISTS `livzmc`.`skins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `createdAt` bigint DEFAULT NULL,
  `url` char(255) DEFAULT NULL,
  `skinId` char(255) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `model` tinyint(1) NOT NULL DEFAULT '0',
  `userCount` int NOT NULL DEFAULT '0',
  `hash` char(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hash` (`hash`),
  KEY `skinId` (`skinId`),
  KEY `createdAt` (`createdAt`),
  KEY `url` (`url`)
);
