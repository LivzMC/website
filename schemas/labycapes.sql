CREATE TABLE IF NOT EXISTS `livzmc`.`labycapes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `createdAt` bigint DEFAULT NULL,
  `capeId` char(255) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `removed` tinyint(1) NOT NULL DEFAULT '0',
  `hash` char(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hash` (`hash`)
);
