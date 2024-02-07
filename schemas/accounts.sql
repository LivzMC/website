CREATE TABLE IF NOT EXISTS `accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `accountId` char(30) NOT NULL,
  `uniqueId` char(30) NOT NULL,
  `email` text NOT NULL,
  `password` text NOT NULL,
  `createdAt` bigint DEFAULT NULL,
  `discord` text,
  `banned` tinyint(1) NOT NULL DEFAULT '0',
  `removed` tinyint(1) NOT NULL DEFAULT '0',
  `emailVerified` tinyint(1) NOT NULL DEFAULT '0',
  `permission` int NOT NULL DEFAULT '0',
  `2FA` char(255) DEFAULT NULL,
  `donator` tinyint(1) NOT NULL DEFAULT '0',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uniqueId` (`uniqueId`),
  KEY `accountId_uniqueId` (`accountId`,`uniqueId`)
);
