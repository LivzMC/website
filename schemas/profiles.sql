CREATE TABLE IF NOT EXISTS `profiles` (
  `uuid` char(32) NOT NULL,
  `username` char(32) NOT NULL,
  `createdAt` bigint DEFAULT NULL,
  `creationDate` bigint DEFAULT NULL,
  `banned` tinyint(1) NOT NULL DEFAULT '0',
  `currentCape` text NOT NULL,
  `currentSkin` text NOT NULL,
  `enabledColor` char(64) DEFAULT NULL,
  `enabledEmoji` char(64) DEFAULT NULL,
  `enabledFont` char(64) DEFAULT NULL,
  `lastSearched` bigint DEFAULT NULL,
  `hasCheckedDate` tinyint(1) NOT NULL DEFAULT '0',
  `deletedAccount` tinyint(1) NOT NULL DEFAULT '0',
  `optOut` tinyint NOT NULL DEFAULT '0',

  UNIQUE KEY `uuid` (`uuid`),
  KEY `username` (`username`)
);
