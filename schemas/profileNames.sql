create table if not exists `profilenames` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` char(32) NOT NULL,
  `username` char(32) DEFAULT NULL,
  `changedToAt` bigint DEFAULT NULL,
  `diff` bigint DEFAULT NULL,
  `removed` tinyint(1) NOT NULL DEFAULT '0',
  `hidden` tinyint(1) NOT NULL DEFAULT '0',

  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `uuid` (`uuid`),
  KEY `username` (`username`)
)