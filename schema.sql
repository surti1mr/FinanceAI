-- FinanceAI Database Schema
-- Run this to set up the database manually
-- OR just run the FastAPI server and SQLAlchemy creates tables automatically

CREATE DATABASE IF NOT EXISTS financeai;
USE financeai;

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) NOT NULL,
  `date` varchar(64) NOT NULL,
  `amount` float NOT NULL,
  `category` varchar(255) NOT NULL,
  `description` varchar(1024) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `ix_transactions_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
