CREATE TABLE IF NOT EXISTS `livzmc`.`profiles` (
  `uuid` char(255) NOT NULL,
  `username` char(255) NOT NULL,
  `createdAt` bigint DEFAULT NULL,
  `creationDate` bigint DEFAULT NULL,
  `banned` tinyint(1) NOT NULL DEFAULT '0',
  `currentCape` text NOT NULL,
  `currentSkin` text NOT NULL,
  `enabledColor` char(255) DEFAULT NULL,
  `enabledEmoji` char(255) DEFAULT NULL,
  `enabledFont` char(255) DEFAULT NULL,
  `lastSearched` bigint DEFAULT NULL,
  `hasCheckedDate` tinyint(1) NOT NULL DEFAULT '0',
  `deletedAccount` tinyint(1) NOT NULL DEFAULT '0',
  `optOut` tinyint NOT NULL DEFAULT '0',
  UNIQUE KEY `uuid` (`uuid`),
  KEY `username` (`username`)
);
