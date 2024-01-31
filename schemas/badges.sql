create table if not exists `livzmc`.`badges` (
  `id` int not null AUTO_INCREMENT,
  `createdAt` bigint default null,
  `badgeId` varchar(35) not null,
  `title` varchar(35) not null,
  `description` text,
  `image` varchar(255) not null,
  `hidden` tinyint(1) not null,

  primary key (`id`),
  unique key (`badgeId`)
)