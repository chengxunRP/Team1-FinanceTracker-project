-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: tokaido.proxy.rlwy.net    Database: railway
-- ------------------------------------------------------
-- Server version	9.4.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `budget_email_alert_logs`
--

DROP TABLE IF EXISTS `budget_email_alert_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `budget_email_alert_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `budget_month` varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `alert_key` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` enum('warning','danger') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `alert_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sent_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_budget_email_alert_logs_user_month_key_severity` (`user_id`,`budget_month`,`alert_key`,`severity`),
  KEY `idx_budget_email_alert_logs_user_month` (`user_id`,`budget_month`),
  CONSTRAINT `fk_budget_email_alert_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_email_alert_logs`
--

LOCK TABLES `budget_email_alert_logs` WRITE;
/*!40000 ALTER TABLE `budget_email_alert_logs` DISABLE KEYS */;
INSERT INTO `budget_email_alert_logs` VALUES (1,2,'2026-07','category-1','danger','Groceries','2026-07-07 23:57:44','2026-07-07 23:57:44'),(2,2,'2026-07','overall','danger','All Categories Budget','2026-07-07 23:57:48','2026-07-07 23:57:48'),(3,2,'2026-07','category-2','danger','Auto & Transport','2026-07-07 23:57:48','2026-07-07 23:57:48'),(4,2,'2026-07','category-4','danger','Shopping','2026-07-07 23:57:48','2026-07-07 23:57:48'),(5,2,'2026-07','category-6','danger','Entertainment','2026-07-07 23:57:48','2026-07-07 23:57:48'),(6,2,'2026-07','category-3','danger','Education','2026-07-07 23:57:48','2026-07-07 23:57:48'),(7,10,'2026-07','category-58','danger','cx12','2026-07-08 00:04:30','2026-07-08 00:04:30'),(8,10,'2026-07','category-5','danger','Bills & Utilities','2026-07-08 00:04:30','2026-07-08 00:04:30'),(9,10,'2026-07','category-1','warning','Groceries','2026-07-08 00:04:30','2026-07-08 00:04:30'),(10,2,'2026-07','category-5','danger','Bills & Utilities','2026-07-08 00:19:00','2026-07-08 00:19:00'),(11,2,'2026-07','category-6','warning','Entertainment','2026-07-08 00:22:26','2026-07-08 00:22:26'),(12,2,'2026-07','category-14','danger','Business Services','2026-07-08 00:49:54','2026-07-08 00:49:54'),(13,10,'2026-07','overall','warning','All Categories Budget','2026-07-08 00:51:12','2026-07-08 00:51:12'),(14,10,'2026-07','overall','danger','All Categories Budget','2026-07-08 01:21:45','2026-07-08 01:21:45'),(15,10,'2026-07','category-53','danger','Car','2026-07-08 01:21:45','2026-07-08 01:21:45'),(16,11,'2026-07','category-1','danger','Groceries','2026-07-08 12:30:24','2026-07-08 12:30:24'),(17,2,'2026-08','category-2','danger','Auto & Transport','2026-07-08 20:15:53','2026-07-08 20:15:53'),(18,2,'2026-07','category-66','danger','me','2026-07-08 21:28:39','2026-07-08 21:28:39'),(19,13,'2026-07','category-19','danger','Eating Out','2026-07-08 23:13:36','2026-07-08 23:13:36'),(20,13,'2026-07','category-19','warning','Eating Out','2026-07-08 23:19:14','2026-07-08 23:19:14'),(21,13,'2026-07','overall','danger','All Categories Budget','2026-07-08 23:25:41','2026-07-08 23:25:41'),(22,14,'2026-07','overall','danger','All Categories Budget','2026-07-09 09:50:17','2026-07-09 09:50:17'),(23,14,'2026-07','category-5','danger','Bills & Utilities','2026-07-09 09:51:06','2026-07-09 09:51:06'),(24,2,'2026-07','category-19','danger','Eating Out','2026-07-09 18:33:59','2026-07-09 18:33:59'),(25,2,'2026-07','category-17','danger','Clothing','2026-07-11 12:26:05','2026-07-11 12:26:05'),(26,2,'2026-08','category-6','danger','Entertainment','2026-07-11 13:32:45','2026-07-11 13:32:45'),(27,15,'2026-07','category-5','danger','Bills & Utilities','2026-07-11 14:58:12','2026-07-11 14:58:12'),(28,15,'2026-07','category-1','danger','Groceries','2026-07-11 14:58:24','2026-07-11 14:58:24'),(29,15,'2026-07','overall','danger','All Categories Budget','2026-07-11 15:01:11','2026-07-11 15:01:11'),(30,15,'2026-07','category-2','danger','Auto & Transport','2026-07-11 15:40:22','2026-07-11 15:40:22'),(31,15,'2026-07','category-6','danger','Entertainment','2026-07-11 20:17:49','2026-07-11 20:17:49'),(32,15,'2026-07','category-4','danger','Shopping','2026-07-11 20:32:09','2026-07-11 20:32:09'),(33,15,'2026-07','category-19','danger','Eating Out','2026-07-11 20:39:07','2026-07-11 20:39:07'),(34,15,'2026-07','category-3','danger','Education','2026-07-11 21:06:19','2026-07-11 21:06:19'),(35,15,'2026-07','category-20','danger','Electronics & Software','2026-07-11 22:26:32','2026-07-11 22:26:32'),(36,15,'2026-07','category-14','danger','Business Services','2026-07-11 22:30:28','2026-07-11 22:30:28'),(37,15,'2026-07','category-14','warning','Business Services','2026-07-11 22:32:48','2026-07-11 22:32:48'),(38,15,'2026-07','category-15','danger','Cash & ATM','2026-07-11 22:46:52','2026-07-11 22:46:52'),(39,15,'2026-07','category-26','danger','Investments','2026-07-11 23:04:13','2026-07-11 23:04:13'),(40,15,'2026-07','category-27','danger','Kid','2026-07-12 01:12:12','2026-07-12 01:12:12'),(41,15,'2026-07','category-30','danger','Sport & Fitness','2026-07-12 01:15:28','2026-07-12 01:15:28'),(42,15,'2026-07','category-30','warning','Sport & Fitness','2026-07-12 01:24:47','2026-07-12 01:24:47'),(43,15,'2026-07','category-5','warning','Bills & Utilities','2026-07-12 17:53:21','2026-07-12 17:53:21'),(44,16,'2026-07','overall','danger','All Categories Budget','2026-07-13 10:47:13','2026-07-13 10:47:13'),(45,16,'2026-07','category-5','danger','Bills & Utilities','2026-07-13 10:49:56','2026-07-13 10:49:56'),(46,15,'2026-07','category-22','danger','Gifts & Donation','2026-07-13 14:15:11','2026-07-13 14:15:11'),(47,15,'2026-08','category-24','danger','Home','2026-07-13 16:37:43','2026-07-13 16:37:43'),(48,15,'2026-07','category-25','danger','Insurance','2026-07-14 12:09:26','2026-07-14 12:09:26'),(49,15,'2026-07','category-29','danger','Pets','2026-07-14 12:09:41','2026-07-14 12:09:41'),(50,15,'2026-07','category-31','danger','Travel','2026-07-14 12:19:41','2026-07-14 12:19:41');
/*!40000 ALTER TABLE `budget_email_alert_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budget_rollover_overrides`
--

DROP TABLE IF EXISTS `budget_rollover_overrides`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `budget_rollover_overrides` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_budget_id` int NOT NULL,
  `reset_month` char(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'YYYY-MM',
  `override_rollover_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rollover_override_month` (`category_budget_id`,`reset_month`),
  KEY `idx_rollover_override_reset_month` (`reset_month`),
  CONSTRAINT `fk_rollover_override_category_budget` FOREIGN KEY (`category_budget_id`) REFERENCES `category_budgets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_rollover_overrides`
--

LOCK TABLES `budget_rollover_overrides` WRITE;
/*!40000 ALTER TABLE `budget_rollover_overrides` DISABLE KEYS */;
INSERT INTO `budget_rollover_overrides` VALUES (15,39,'2026-09',0.00,'2026-07-08 04:22:58','2026-07-08 04:22:58'),(19,41,'2026-08',0.00,'2026-07-08 15:20:57','2026-07-08 15:20:57'),(20,20,'2026-08',0.00,'2026-07-11 05:34:13','2026-07-11 05:34:13');
/*!40000 ALTER TABLE `budget_rollover_overrides` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'default-category',
  `color` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` int unsigned DEFAULT NULL,
  `icon_image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Public path e.g. /uploads/category-icons/file.png',
  `is_custom` tinyint(1) NOT NULL DEFAULT '0',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_categories_user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Groceries','food','#ffffff',NULL,NULL,0,0,NULL,'2026-07-01 11:20:12','2026-07-02 09:55:47'),(2,'Auto & Transport','transport','#ffffff',NULL,NULL,0,0,NULL,'2026-07-01 11:20:12','2026-07-02 09:55:47'),(3,'Education','school','#ffffff',NULL,NULL,0,0,NULL,'2026-07-01 11:20:12','2026-07-02 09:55:47'),(4,'Shopping','shopping','#ffffff',NULL,NULL,0,0,NULL,'2026-07-01 11:20:12','2026-07-02 09:55:47'),(5,'Bills & Utilities','bills','#ffffff',NULL,NULL,0,0,NULL,'2026-07-01 11:20:12','2026-07-02 09:55:47'),(6,'Entertainment','entertainment','#ffffff',NULL,NULL,0,0,NULL,'2026-07-01 11:20:12','2026-07-02 09:55:47'),(9,'cx','default-category','#ec4899',NULL,NULL,1,1,'2026-07-05 00:55:08','2026-07-01 11:39:19','2026-07-04 16:55:08'),(10,'aden','default-category','#22c55e',NULL,'/uploads/category-icons/category-1782906044585-438472174.png',1,1,'2026-07-02 20:52:21','2026-07-01 11:40:44','2026-07-02 12:52:21'),(11,'df','default-category','#000000',NULL,NULL,1,1,'2026-07-05 00:55:05','2026-07-01 11:59:21','2026-07-04 16:55:05'),(12,'me','default-category',NULL,10,NULL,1,0,NULL,'2026-07-01 12:01:53','2026-07-07 14:39:31'),(14,'Business Services','business_services','#ffffff',NULL,NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(15,'Cash & ATM','cash_atm','#ffffff',NULL,NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(16,'Cheque','cheque','#ffffff',NULL,NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(17,'Clothing','clothing','#ffffff',NULL,NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(18,'Credit Card Payment','creditcard_payment','#ffffff',NULL,NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(19,'Eating Out','eatingout','#ffffff',NULL,NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(20,'Electronics & Software','electronics_software','#ffffff',NULL,NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(21,'Fees','fees','#ffffff',NULL,NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(22,'Gifts & Donation','gifts_donation','#ffffff',NULL,NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(23,'Health & Medical','health_medical','#ffffff',NULL,NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(24,'Home','home','#ffffff',NULL,NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(25,'Insurance','insurance','#ffffff',NULL,NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(26,'Investments','investments','#ffffff',NULL,NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(27,'Kid','kid','#ffffff',NULL,NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(28,'Loan','loan','#ffffff',NULL,NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(29,'Pets','pets','#ffffff',NULL,NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(30,'Sport & Fitness','sport_fitness','#ffffff',NULL,NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(31,'Travel','travel','#ffffff',NULL,NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(51,'aws','default-category','#22c55e',NULL,'/uploads/category-icons/category-1782996972813-717426733.jpg',1,0,NULL,'2026-07-02 12:56:12','2026-07-02 12:56:12'),(52,'floorball','default-category','#22c55e',NULL,'/uploads/category-icons/category-1783184668703-497272986.png',1,0,NULL,'2026-07-04 17:04:28','2026-07-04 17:04:28'),(53,'Car','default-category','#000000',10,NULL,1,0,NULL,'2026-07-07 14:13:58','2026-07-07 14:13:58'),(55,'me2','default-category',NULL,10,NULL,1,0,NULL,'2026-07-07 14:17:56','2026-07-07 14:17:56'),(58,'cx12','default-category','#ec4899',10,NULL,1,0,NULL,'2026-07-07 14:21:19','2026-07-07 14:21:19'),(66,'me','default-category',NULL,2,NULL,1,1,'2026-07-11 13:28:53','2026-07-08 13:27:53','2026-07-11 05:28:53'),(67,'me','default-category','#8b5cf6',13,NULL,1,0,NULL,'2026-07-08 15:27:48','2026-07-08 15:27:48'),(69,'popmart','default-category','#fdba74',16,NULL,1,0,NULL,'2026-07-13 02:41:38','2026-07-13 02:41:38');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `category_budgets`
--

DROP TABLE IF EXISTS `category_budgets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category_budgets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `user_id` int unsigned DEFAULT NULL,
  `budget_limit` decimal(10,2) NOT NULL DEFAULT '0.00',
  `budget_month` varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'YYYY-MM',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `rollover_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_category_budget_user` (`category_id`,`user_id`),
  KEY `idx_category_budgets_budget_month` (`budget_month`),
  KEY `idx_category_budgets_is_active` (`is_active`),
  KEY `idx_category_budgets_user_id` (`user_id`),
  CONSTRAINT `fk_category_budgets_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category_budgets`
--

LOCK TABLES `category_budgets` WRITE;
/*!40000 ALTER TABLE `category_budgets` DISABLE KEYS */;
INSERT INTO `category_budgets` VALUES (1,9,2,25.00,'2026-07',1,0,'2026-07-07 13:07:43','2026-07-07 13:07:43'),(2,10,2,15.00,'2026-07',1,0,'2026-07-07 13:12:02','2026-07-07 13:12:02'),(3,5,2,99.00,'2026-07',0,0,'2026-07-07 13:09:06','2026-07-09 10:12:21'),(4,11,2,15.00,'2026-07',1,0,'2026-07-07 13:12:02','2026-07-07 13:12:02'),(5,12,2,30.00,'2026-07',1,1,'2026-07-07 13:08:22','2026-07-07 13:08:22'),(6,2,2,5.00,'2026-07',1,1,'2026-07-07 09:49:41','2026-07-09 10:30:20'),(7,51,2,40.00,'2026-07',1,0,'2026-07-07 13:10:41','2026-07-07 13:10:41'),(8,52,2,15.00,'2026-07',1,0,'2026-07-07 13:12:02','2026-07-07 13:12:02'),(9,1,2,20.00,'2026-07',0,1,'2026-07-05 15:12:41','2026-07-09 10:33:05'),(10,3,2,89.00,'2026-07',0,0,'2026-07-05 16:09:58','2026-07-09 10:12:17'),(15,4,2,5.00,'2026-07',0,0,'2026-07-07 10:21:14','2026-07-07 17:00:42'),(20,6,2,5.00,'2026-07',1,1,'2026-07-11 05:30:07','2026-07-11 05:33:55'),(33,1,3,55.00,'2026-07',1,0,'2026-07-07 13:16:52','2026-07-07 13:16:52'),(34,5,10,50.00,'2026-07',1,1,'2026-07-07 13:20:39','2026-07-07 13:20:39'),(35,1,10,100.00,'2026-07',1,1,'2026-07-07 13:22:51','2026-07-07 13:31:35'),(36,58,10,800.00,'2026-07',1,0,'2026-07-07 14:56:24','2026-07-14 12:52:24'),(37,14,2,5.00,'2026-07',0,0,'2026-07-07 16:49:31','2026-07-09 10:12:08'),(38,53,10,67.00,'2026-07',1,1,'2026-07-07 17:21:17','2026-07-07 17:21:17'),(39,1,11,10.00,'2026-07',1,1,'2026-07-08 04:14:29','2026-07-08 04:19:25'),(40,66,2,5.00,'2026-07',0,0,'2026-07-08 13:28:15','2026-07-09 10:12:01'),(41,19,13,6.00,'2026-07',1,1,'2026-07-08 15:10:42','2026-07-08 15:20:52'),(42,5,14,5.00,'2026-07',1,0,'2026-07-09 01:50:12','2026-07-09 01:50:12'),(43,19,2,10.00,'2026-07',1,1,'2026-07-09 10:33:32','2026-07-09 10:33:32'),(44,17,2,67.00,'2026-07',1,1,'2026-07-11 04:25:41','2026-07-11 04:25:41'),(45,5,15,5.00,'2026-07',1,1,'2026-07-12 16:32:30','2026-07-13 06:13:57'),(46,1,15,5.00,'2026-07',0,0,'2026-07-12 08:19:54','2026-07-12 08:23:10'),(47,2,15,5.00,'2026-07',0,0,'2026-07-11 07:37:38','2026-07-11 09:03:34'),(48,6,15,50.00,'2026-07',0,0,'2026-07-12 02:16:38','2026-07-12 04:21:02'),(49,4,15,5.00,'2026-07',0,1,'2026-07-11 12:32:05','2026-07-11 12:37:31'),(50,19,15,5.00,'2026-07',0,0,'2026-07-11 12:39:03','2026-07-11 12:55:49'),(51,3,15,5.00,'2026-07',0,1,'2026-07-11 13:06:15','2026-07-11 14:24:14'),(52,20,15,5.00,'2026-07',0,0,'2026-07-11 14:26:28','2026-07-11 14:27:54'),(53,14,15,5.00,'2026-07',0,1,'2026-07-11 14:30:25','2026-07-11 14:38:56'),(54,15,15,5.00,'2026-07',0,1,'2026-07-11 14:46:47','2026-07-11 14:55:01'),(55,26,15,5.00,'2026-07',0,1,'2026-07-11 15:04:10','2026-07-11 17:09:33'),(56,27,15,5.00,'2026-07',0,0,'2026-07-11 17:12:08','2026-07-11 17:13:43'),(57,30,15,5.00,'2026-07',0,1,'2026-07-12 05:10:08','2026-07-12 05:21:26'),(58,5,16,7.00,'2026-07',1,1,'2026-07-13 02:46:49','2026-07-13 02:48:53'),(59,22,15,5.00,'2026-07',1,1,'2026-07-13 06:14:57','2026-07-13 08:37:13'),(60,24,15,5.00,'2026-07',1,0,'2026-07-13 08:37:29','2026-07-13 08:37:29'),(61,28,2,3.70,'2026-07',1,0,'2026-07-14 07:04:32','2026-07-14 07:04:32'),(62,25,2,3.70,'2026-07',1,0,'2026-07-14 11:49:23','2026-07-14 11:49:23'),(63,25,15,5.00,'2026-07',1,0,'2026-07-14 11:49:56','2026-07-14 11:49:56'),(64,29,15,5.00,'2026-07',1,0,'2026-07-14 12:09:26','2026-07-14 12:09:26'),(65,31,15,5.00,'2026-07',1,0,'2026-07-14 12:19:29','2026-07-14 12:19:29');
/*!40000 ALTER TABLE `category_budgets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_messages`
--

DROP TABLE IF EXISTS `chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `sender` enum('user','bot') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chat_messages_session_id` (`session_id`),
  KEY `idx_chat_messages_created_at` (`created_at`),
  CONSTRAINT `fk_chat_messages_session` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=225 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_messages`
--

LOCK TABLES `chat_messages` WRITE;
/*!40000 ALTER TABLE `chat_messages` DISABLE KEYS */;
INSERT INTO `chat_messages` VALUES (1,1,'bot','Hey! I am FinBot, your finance assistant. Ask about spending, your budget, or whether a purchase fits your plan.','2026-07-01 13:46:47'),(5,3,'bot','Hi, I\'m FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.','2026-07-04 15:20:10'),(6,4,'bot','Hi, I\'m FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.','2026-07-04 15:23:29'),(23,5,'bot','Hi, I\'m FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.','2026-07-04 16:19:40'),(24,5,'user','hi','2026-07-04 16:19:40'),(25,5,'bot','Hello. I\'m FinBot, your friendly personal finance assistant. How can I assist you with your finances today?','2026-07-04 16:19:41'),(29,6,'bot','Hi, I\'m FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.','2026-07-04 16:30:24'),(35,7,'bot','Hi, I\'m FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.','2026-07-05 05:11:59'),(36,8,'bot','Hi, I\'m FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.','2026-07-05 05:11:59'),(37,7,'user','Tell me a joke.','2026-07-05 05:11:59'),(38,8,'user','hi','2026-07-05 05:11:59'),(39,7,'bot','Sorry, I\'m designed to help with your spending, budgets, expenses, and finance decisions in spendWise. Try asking me something like \'How much have I spent this month?\' or \'Can I buy a $50 item?\'','2026-07-05 05:11:59'),(40,8,'bot','Hi, I\'m FinBot. I can help you with spending, budgets, expenses, and purchase decisions in spendWise.','2026-07-05 05:11:59'),(66,2,'bot','Hi, I\'m FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.','2026-07-05 06:02:58'),(67,9,'bot','Hey! I am FinBot, your finance assistant. Ask about spending, your budget, or whether a purchase fits your plan.','2026-07-05 11:54:16'),(73,11,'bot','Hi, I\'m FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.','2026-07-07 17:31:12'),(74,11,'user','what is my budget','2026-07-07 17:31:36'),(75,11,'bot','**Category Budgets:**\n- Category budget total: $306\n- Remaining in category budgets: $-83\n\n**All Transactions:**\n- All Transactions budget (available): $2000\n- All Transactions remaining: $-67','2026-07-07 17:31:37'),(76,11,'user','any improvement?','2026-07-07 17:31:48'),(77,11,'bot','Sorry, I\'m designed to help with your spending, budgets, expenses, and finance decisions in spendWise. Try asking me something like \'How much have I spent this month?\' or \'Can I buy a $50 item?\'','2026-07-07 17:31:48'),(78,12,'bot','Hi, I\'m FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.','2026-07-08 04:23:15'),(79,12,'user','hi what can you do?','2026-07-08 04:23:27'),(80,12,'bot','I\'m FinBot, your friendly personal finance assistant. I can help you with:\n\n- **Budget tracking**: I can provide you with information about your current spending and remaining budget.\n- **Spending advice**: I can give you tips on managing your finances and making the most of your budget.\n- **Purchase-check**: I can help you decide if a purchase is safe, risky, or not recommended based on your current budget and spending.\n- **Saving tips**: I can offer suggestions on how to save money and stay within your budget.\n\nWhat would you like to know or discuss?','2026-07-08 04:23:36'),(81,12,'user','what is the current president of Singapore','2026-07-08 04:24:28'),(82,12,'bot','I focus on spendWise finance help — spending, budgets, expenses, savings, and purchase decisions. Try asking \"Is there any improvement I can do?\" or \"How much budget do I have left?\"','2026-07-08 04:24:28'),(83,12,'user','how much money I have now?','2026-07-08 04:24:45'),(84,12,'bot','**All Transactions Remaining:** \nYou have $0 remaining.\n\n**Category Budget Remaining:** \nYou have $5 remaining in your category budgets.','2026-07-08 04:24:46'),(85,12,'user','what did I spend on?','2026-07-08 04:25:04'),(86,12,'bot','**Spending Details**\n\n- You spent $5 on Groceries.\n- The specific expense was chicken rice.\n\n**Category Spending**\n\n- You have spent $5 out of $5 in the Groceries category.\n- You have $0 remaining in the Groceries category.\n- You have used 100% of your budget in the Groceries category.','2026-07-08 04:25:19'),(87,12,'user','what is my account name?','2026-07-08 04:36:25'),(88,12,'bot','Unfortunately, I don\'t have information about your account name.','2026-07-08 04:36:25'),(89,12,'user','if I spend 10 dollar today and saved 5 dollar tommorrow how much money will I have tommorrow?','2026-07-08 04:37:24'),(90,12,'bot','You spent $1261105 in total this month across all transactions (July 2026).','2026-07-08 04:37:24'),(91,12,'user','give me advice for my spending from my previouse prmopt','2026-07-08 04:38:10'),(92,12,'bot','Yes. Based on your current budget (July 2026), here is what I suggest:\n\n- Focus on these categories first: Groceries (exceeded: $1111105 of $10).\n\nAdvice:\n- Pause non-essential spending until stressed categories are back under control.\n- Lower spending in Groceries first — it is your most pressured budget category.\n- Use Don\'t Count only for transactions that should not affect your budget totals.','2026-07-08 04:38:10'),(93,12,'user','I need advice on my spending, I have 1000 dollar income per month, how much should I spend for my groceries every day?','2026-07-08 04:38:59'),(94,12,'bot','Yes. Based on your current budget (July 2026), here is what I suggest:\n\n- Focus on these categories first: Groceries (exceeded: $1111105 of $10).\n\nAdvice:\n- Pause non-essential spending until stressed categories are back under control.\n- Lower spending in Groceries first — it is your most pressured budget category.\n- Use Don\'t Count only for transactions that should not affect your budget totals.','2026-07-08 04:38:59'),(95,12,'user','give me some saving tips?','2026-07-08 04:40:50'),(96,12,'bot','Here is how you can save more (July 2026):\n\n- Category budgets remaining: $-1111095 ($1111105 spent of $10).\n- Cut back in Groceries first.\n- Delay non-essential purchases until next month.\n- Use Don\'t Count only when a transaction should not affect budget totals.','2026-07-08 04:40:50'),(97,12,'user','give me savings tip','2026-07-08 04:41:05'),(98,12,'bot','I can help with that. Based on your spendWise data, try asking:\n- \"Is there any improvement I can do?\"\n- \"What category should I reduce?\"\n- \"How much budget do I have left?\"\n- \"Can I buy a $50 item?\"\n\nYou spent $1261105 across all transactions (July 2026).','2026-07-08 04:41:05'),(99,12,'user','is there any improvement I can do?','2026-07-08 04:41:26'),(100,12,'bot','Yes. Based on your current budget (July 2026), here is what I suggest:\n\n- Focus on these categories first: Groceries (exceeded: $1111105 of $10).\n\nAdvice:\n- Pause non-essential spending until stressed categories are back under control.\n- Lower spending in Groceries first — it is your most pressured budget category.\n- Use Don\'t Count only for transactions that should not affect your budget totals.','2026-07-08 04:41:26'),(101,12,'user','can I buy a $50 item','2026-07-08 04:41:52'),(102,12,'bot','Overall Budget Not Set.\nCreate an All Categories Budget on Spending & Budgets to check purchases against your overall monthly spending limit.\nYou have category budgets totaling $10, but that is not the same as an overall monthly budget.\nSelect a category with a budget on the Purchase Checker page for a category-specific check.','2026-07-08 04:41:52'),(103,12,'user','can I buy $50 item in groceries?','2026-07-08 04:42:53'),(104,12,'bot','Overall Budget Not Set.\nCreate an All Categories Budget on Spending & Budgets to check purchases against your overall monthly spending limit.\nYou have category budgets totaling $10, but that is not the same as an overall monthly budget.\nSelect a category with a budget on the Purchase Checker page for a category-specific check.','2026-07-08 04:42:53'),(105,11,'user','I spend $10 this month and save $5 next month how much will i have left?','2026-07-08 10:43:49'),(106,11,'bot','I can\'t provide information on your personal finances.','2026-07-08 10:43:50'),(107,11,'user','any improvement for my spending?','2026-07-08 11:16:57'),(108,11,'bot','**Stressed Categories:**\n\n* Groceries: You\'ve spent 80% of your $100 budget, which is a warning sign.\n* Bills & Utilities: You\'ve exceeded your $50 budget by $1.\n* Car: You\'ve exceeded your $67 budget by $1.\n* cx12: You\'ve exceeded your $89 budget by $101.\n\n**Spending Summary:**\n\n* You have spent $2067 out of $2000 in All Transactions.\n* You have $0 remaining in All Transactions.\n* You have used 103% of your All Transactions budget.\n\n**Main Insight:**\n\n* Your highest spending category overall is Cheque with $1500.\n\n**Advice:**\n\n* Review your Cheque category and see if there are any unnecessary expenses.\n* Consider adjusting your Bills & Utilities budget to avoid exceeding it in the future.\n* You may need to cut back on your Car expenses to stay within budget.\n* Be mindful of your cx12 spending and try to reduce it to avoid exceeding the budget.','2026-07-08 11:16:58'),(109,11,'user','what can I do to imrpovement my spending can u give clear and specific examples','2026-07-08 11:17:57'),(110,11,'bot','**Improvement Areas:**\n\n* **Groceries:** You\'ve spent 80% of your $100 budget, which is a warning sign. Consider meal planning, making a grocery list, and sticking to it to avoid unnecessary purchases.\n* **Bills & Utilities:** You\'ve exceeded your $50 budget by $1. Review your utility bills and see if you can negotiate a better rate or adjust your usage to reduce costs.\n* **Car:** You\'ve exceeded your $67 budget by $1. Look for ways to reduce your car expenses, such as carpooling, using public transportation, or finding cheaper parking options.\n* **cx12:** You\'ve exceeded your $89 budget by $101. Review your cx12 spending and see if there are any unnecessary expenses. Consider cutting back on non-essential purchases in this category.\n\n**General Tips:**\n\n* **Track your expenses:** Keep a record of every purchase, no matter how small, to identify areas where you can cut back.\n* **Create a budget plan:** Set realistic financial goals and allocate your money accordingly.\n* **Avoid impulse buys:** Think twice before making non-essential purchases, and ask yourself if they align with your financial goals.\n\n**Category-Specific Tips:**\n\n* **Cheque:** Review your Cheque category and see if there are any unnecessary expenses. Consider consolidating bills or finding cheaper alternatives.\n* **Everything Else (unbudgeted categories):** You\'ve spent $1678 in unbudgeted categories. Consider allocating a portion of your budget to these categories to avoid overspending.','2026-07-08 11:17:58'),(111,13,'bot','Hi, I\'m FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.','2026-07-08 15:28:01'),(112,13,'user','what item did I spend','2026-07-09 01:46:17'),(113,13,'bot','**Recent Transaction:**\n- Item: Fish\n- Category: Eating Out\n- Amount: $5','2026-07-09 01:46:18'),(116,10,'bot','Hi, I\'m FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.','2026-07-09 15:54:19'),(117,10,'user','How much have I spent this month?','2026-07-09 15:54:22'),(118,10,'bot','**Total Spent This Month**\n\nYou have spent a total of **$330** this month.\n\n**Breakdown**\n\nThis includes spending across all categories, such as bills, groceries, entertainment, and more.','2026-07-09 15:54:23'),(119,10,'user','What category should I reduce?','2026-07-09 15:54:48'),(120,10,'bot','**Stressed Categories**\n\nYou have exceeded your budget in the following categories:\n\n- **Auto & Transport**: You\'ve spent $14, but your budget is only $5. You\'ve used 180% of your budget in this category.\n- **Eating Out**: You\'ve spent $15, but your budget is only $10. You\'ve used 150% of your budget in this category.\n\n**Budget Reduction Tips**\n\nTo get back on track, consider reducing spending in these categories. Here are some tips:\n\n- **Auto & Transport**: Review your transportation costs and see if there are any ways to reduce them, such as carpooling, using public transportation, or finding a more affordable ride-sharing service.\n- **Eating Out**: Try to limit your dining out expenses by cooking at home more often or finding cheaper alternatives, such as packing your lunch or trying a new recipe.','2026-07-09 15:54:49'),(121,10,'user','tell me a joke','2026-07-11 04:44:32'),(122,10,'bot','I focus on spendWise finance help — spending, budgets, expenses, savings, and purchase decisions. Try asking \"Is there any improvement I can do?\" or \"How much budget do I have left?\"','2026-07-11 04:44:32'),(123,10,'user','if I spent $10 this month and save $5 next month how much will I have left in total','2026-07-11 04:45:37'),(124,10,'bot','**Current Situation**\n\nYou have spent $10 this month.\n\n**Future Savings**\n\nYou plan to save $5 next month.\n\n**Calculation**\n\nTo find the total remaining, we need to subtract the amount spent this month from the initial amount and then add the savings next month.\n\nInitial amount: (not provided, so we\'ll assume it\'s the same as the user\'s total spent this month, which is $330)\nSpent this month: $10\nRemaining after this month: $330 - $10 = $320\nSavings next month: $5\nRemaining after next month: $320 + $5 = $325\n\nHowever, since the initial amount is not provided, we can\'t accurately calculate the total remaining. If you provide the initial amount, I can give you a more accurate answer.','2026-07-11 04:45:38'),(125,10,'user','no u dont need to related to finanance data what is 10 - 5','2026-07-11 04:46:11'),(126,10,'bot','**Simple Math**\n\nTo find the answer, we subtract 5 from 10:\n\n10 - 5 = 5','2026-07-11 04:46:12'),(203,14,'bot','Hi, I\'m FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.','2026-07-12 16:36:10'),(204,14,'user','how much have I spent','2026-07-12 16:36:32'),(205,14,'bot','**Spent this Month:**\nYou have spent $21 in total across all transactions.\n\n**Spent in Budget Categories:**\nYou have spent $7 in budgeted categories only.\n\n**Remaining Budget:**\nYou have $-16 remaining in your overall budget and $-2 remaining in your category budgets.','2026-07-12 16:36:32'),(206,15,'bot','Hi, I\'m FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.','2026-07-13 02:51:26'),(207,15,'user','how much have I spent','2026-07-13 02:51:51'),(208,15,'bot','**Spent this month:**\n- You have spent $19 across all transactions.\n\n**Category spending:**\n- You have spent $9 in budgeted categories only.\n\n**Remaining budget:**\n- You have $-12 remaining across all transactions.\n- You have $-2 remaining in category budgets.','2026-07-13 02:51:52'),(209,15,'user','Can u help me create a $5 expense','2026-07-13 02:52:35'),(210,15,'bot','**Create a $5 expense:**\n\nYou can create a new expense by adding a transaction in the app. Here\'s how:\n\n* Open the app and navigate to the \'Add transaction\' section.\n* Select the category you want to add the expense to (e.g., \'Miscellaneous\' or \'Entertainment\').\n* Enter the amount: $5.\n* Add a description for the expense (e.g., \'Personal expense\').\n* Save the transaction.\n\nThis will update your total spent and remaining budget in the app.\n\n**New expense details:**\n\n* Category: (choose a category)\n* Item price: $5\n* New total spent: $24 (previous $19 + $5)\n* Remaining after purchase: $-7 (previous $-12 + $5)\n* Budget used after purchase: 100% (previous 63% + 37%)','2026-07-13 02:52:35'),(211,10,'user','what is 20 - 5','2026-07-14 07:07:40'),(212,10,'bot','I can help with that. Based on your spendWise data, try asking:\n- \"Is there any improvement I can do?\"\n- \"What category should I reduce?\"\n- \"How much budget do I have left?\"\n- \"Can I buy a $50 item?\"\n\nYou spent SGD 172.80 across all transactions (July 2026).','2026-07-14 07:07:40'),(213,10,'user','no u dont need to related to finanance data what is 20 - 5','2026-07-14 07:08:01'),(214,10,'bot','I can help with that. Based on your spendWise data, try asking:\n- \"Is there any improvement I can do?\"\n- \"What category should I reduce?\"\n- \"How much budget do I have left?\"\n- \"Can I buy a $50 item?\"\n\nYou spent SGD 172.80 across all transactions (July 2026).','2026-07-14 07:08:01'),(215,10,'user','how much have I spent','2026-07-14 07:08:51'),(216,10,'bot','You spent SGD 172.80 in total this month across all transactions (July 2026).','2026-07-14 07:08:51'),(217,10,'user','give me advice base on my spending','2026-07-14 07:09:44'),(218,10,'bot','Yes. Based on your current budget (July 2026), here is what I suggest:\n\n- Focus on these categories first: Loan (exceeded: SGD 13.50 of SGD 5.00); Entertainment (80% used).\n\nAdvice:\n- Pause non-essential spending until stressed categories are back under control.\n- Lower spending in Loan first — it is your most pressured budget category.\n- Use Don\'t Count only for transactions that should not affect your budget totals.\n- Protect your remaining SGD 103.55 across category budgets.','2026-07-14 07:09:44'),(219,11,'user','test','2026-07-14 12:51:50'),(220,11,'bot','There is no specific question or request in your message. If you would like to ask about your spending, budgets, or finance, I\'m here to help.','2026-07-14 12:51:50'),(221,11,'user','about your spending, budgets, or finance','2026-07-14 12:52:02'),(222,11,'bot','**Spending Summary:**\n\n* You have spent $2,007.00 out of $0.00 in All Transactions.\n* You have $0.00 remaining in All Transactions.\n* You have used 100% of your All Transactions budget.\n\n**Category Budgets:**\n\n* You have spent $389.00 out of $306.00 in budgeted categories only.\n* You have -$83.00 remaining in category budgets.\n* You have used 127% of your category budget total.\n\n**Stressed Categories:**\n\n* **Groceries:** You\'ve spent 80% of your $100 budget, which is a warning sign. Consider meal planning, making a grocery list, and sticking to it to avoid unnecessary purchases.\n* **Bills & Utilities:** You\'ve exceeded your $50 budget by $1. Review your utility bills and see if you can negotiate a better rate or adjust your usage to reduce costs.\n* **Car:** You\'ve exceeded your $67 budget by $1. Look for ways to reduce your car expenses, such as carpooling, using public transportation, or finding cheaper parking options.\n* **cx12:** You\'ve exceeded your $89 budget by $101. Review your cx12 spending and see if there are any unnecessary expenses. Consider cutting back on non-essential purchases in this category.\n\n**Highest Spending Category:**\n\n* Your highest spending category overall is **Cheque** with $1,500.00.\n\n**Savings:**\n\n* No savings goal data available.\n\n**General Tips:**\n\n* **Track your expenses:** Keep a record of every purchase, no matter how small, to identify areas where you can cut back.\n* **Create a budget plan:** Set realistic financial goals','2026-07-14 12:52:03'),(223,11,'user','oh','2026-07-14 12:52:09'),(224,11,'bot','There is no specific question or request in your message. If you would like to ask about your spending, budgets, or finance, I\'m here to help.','2026-07-14 12:52:10');
/*!40000 ALTER TABLE `chat_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_sessions`
--

DROP TABLE IF EXISTS `chat_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_chat_sessions_session_id` (`session_id`),
  KEY `idx_chat_sessions_user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_sessions`
--

LOCK TABLES `chat_sessions` WRITE;
/*!40000 ALTER TABLE `chat_sessions` DISABLE KEYS */;
INSERT INTO `chat_sessions` VALUES (1,'83b6d00c-ffad-4f24-b7eb-5dea00802f4a',NULL,'2026-07-01 13:46:47','2026-07-01 13:46:47'),(2,'52b0c362-d7c3-43c6-89da-2df86fc37cf0',NULL,'2026-07-04 14:30:40','2026-07-04 14:30:40'),(3,'f3d85af1-3fc4-4706-b9a7-4bb5f8ae6a9c',NULL,'2026-07-04 15:20:10','2026-07-04 15:20:10'),(4,'908b1af2-9c90-4ef8-9036-444340387404',NULL,'2026-07-04 15:23:29','2026-07-04 15:23:29'),(5,'8c6a3b40-9669-4ecd-afbc-7bf3e4755b7e',NULL,'2026-07-04 16:19:40','2026-07-04 16:19:40'),(6,'d52be38a-af6d-41d1-abd1-d657f1bf356f',NULL,'2026-07-04 16:30:24','2026-07-04 16:30:24'),(7,'45c8c0e2-7902-42cb-a9bf-6dcbdfabaab5',NULL,'2026-07-05 05:11:59','2026-07-05 05:11:59'),(8,'073c682f-4d8a-4e01-97a1-116b92dffb53',NULL,'2026-07-05 05:11:59','2026-07-05 05:11:59'),(9,'38ead2b7-e8d1-4921-9d64-a3e7a611094f',NULL,'2026-07-05 11:54:16','2026-07-05 11:54:16'),(10,'user-2',2,'2026-07-05 14:46:42','2026-07-05 14:46:42'),(11,'user-10',10,'2026-07-07 17:31:12','2026-07-07 17:31:12'),(12,'user-11',11,'2026-07-08 04:23:15','2026-07-08 04:23:15'),(13,'user-13',13,'2026-07-08 15:28:01','2026-07-08 15:28:01'),(14,'user-15',15,'2026-07-11 08:16:35','2026-07-11 08:16:35'),(15,'user-16',16,'2026-07-13 02:51:26','2026-07-13 02:51:26');
/*!40000 ALTER TABLE `chat_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `merchant_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category_id` int NOT NULL,
  `user_id` int unsigned DEFAULT NULL,
  `expense_date` date NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `image_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Public path e.g. /uploads/expenses/file.png',
  `is_excluded_from_budget` tinyint(1) NOT NULL DEFAULT '0',
  `is_excluded_from_all_budget` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_expenses_category_id` (`category_id`),
  KEY `idx_expenses_expense_date` (`expense_date`),
  KEY `idx_expenses_title` (`title`),
  KEY `idx_expenses_user_id` (`user_id`),
  CONSTRAINT `fk_expenses_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=111 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expenses`
--

LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
INSERT INTO `expenses` VALUES (1,'Chicken rice',7.00,NULL,1,NULL,'2026-07-01','test',NULL,0,0,'2026-07-01 12:20:06','2026-07-03 16:16:17'),(2,'you',5.00,NULL,2,NULL,'2026-07-01','',NULL,0,0,'2026-07-01 12:29:47','2026-07-04 16:32:29'),(3,'you123',6.00,NULL,5,NULL,'2023-07-01','',NULL,0,0,'2026-07-01 12:30:08','2026-07-04 13:20:46'),(4,'Chicken rice',5.00,NULL,1,NULL,'2026-07-01','lunch','/uploads/expenses/expense-1783168218785-650258348.png',0,0,'2026-07-01 13:08:55','2026-07-04 12:30:18'),(5,'fries',5.00,NULL,2,NULL,'2026-06-01','',NULL,0,0,'2026-07-01 14:42:08','2026-07-01 14:42:08'),(6,'mrt',7.00,NULL,2,NULL,'2026-07-01','',NULL,0,0,'2026-07-01 15:05:02','2026-07-01 15:05:02'),(7,'bus',10.00,NULL,2,NULL,'2026-07-02','','/uploads/expenses/expense-1783156843218-518683068.png',0,0,'2026-07-01 16:06:51','2026-07-04 09:20:43'),(8,'chicken',2.00,NULL,2,NULL,'2026-07-02','','/uploads/expenses/expense-1783158635700-357347675.png',0,0,'2026-07-01 16:49:47','2026-07-04 09:50:35'),(18,'Groceries',45.00,'NTUC',15,2,'2026-07-06','',NULL,0,0,'2026-07-05 16:06:47','2026-07-06 13:38:18'),(44,'netflix',4.00,NULL,6,2,'2026-07-07','',NULL,0,0,'2026-07-07 11:33:09','2026-07-07 16:22:37'),(45,'game',2.00,NULL,6,2,'2026-07-07','',NULL,1,1,'2026-07-07 12:27:56','2026-07-11 05:34:37'),(51,'water',25.00,NULL,5,10,'2026-07-07','',NULL,0,0,'2026-07-07 14:20:34','2026-07-07 14:20:34'),(52,'cx3344',123.00,NULL,58,10,'2026-07-07','',NULL,0,0,'2026-07-07 14:21:33','2026-07-07 14:21:33'),(54,'me123',51.00,NULL,12,10,'2026-07-07','','/uploads/expenses/expense-1783435441217-467317500.png',0,0,'2026-07-07 14:44:01','2026-07-07 14:44:01'),(56,'meeee',67.00,NULL,58,10,'2026-07-07','','/uploads/expenses/expense-1783435925448-476484226.jpg',0,0,'2026-07-07 14:52:05','2026-07-07 14:52:05'),(57,'shirt',67.00,NULL,3,10,'2026-07-07','',NULL,0,0,'2026-07-07 14:52:42','2026-07-07 14:52:42'),(58,'elec',26.00,NULL,5,10,'2026-07-07','',NULL,0,0,'2026-07-07 14:58:21','2026-07-07 14:58:21'),(59,'crab',80.00,NULL,1,10,'2026-07-08','',NULL,0,0,'2026-07-07 16:04:27','2026-07-07 16:04:27'),(64,'gayslut',1500.00,NULL,16,10,'2026-07-08','','/uploads/expenses/expense-1783443070795-435274319.png',0,0,'2026-07-07 16:51:09','2026-07-07 16:51:09'),(66,'lambo dick',68.00,NULL,53,10,'2026-07-08','',NULL,0,0,'2026-07-07 17:21:41','2026-07-07 17:21:41'),(67,'chicken rice',5.00,NULL,1,11,'2026-07-08','',NULL,0,0,'2026-07-08 04:18:46','2026-07-08 04:18:46'),(68,'GTA6',150000.00,NULL,6,11,'2026-07-08','blablabla',NULL,0,0,'2026-07-08 04:26:53','2026-07-08 04:26:53'),(69,'crypto',1000.00,NULL,1,11,'2026-07-08','wqd',NULL,0,0,'2026-07-08 04:28:26','2026-07-08 04:30:05'),(70,'hi',100.00,NULL,1,11,'2026-07-08','fgfhg',NULL,0,0,'2026-07-08 04:31:28','2026-07-08 04:31:28'),(71,'hfjf',10000.00,NULL,1,11,'2026-07-08','',NULL,0,0,'2026-07-08 04:32:21','2026-07-08 04:32:21'),(72,'j;lio',100000.00,NULL,1,11,'2026-07-08','fuck',NULL,0,0,'2026-07-08 04:32:44','2026-07-08 04:32:44'),(73,'jgjg',1000000.00,NULL,1,11,'2026-07-08','rere',NULL,0,0,'2026-07-08 04:33:15','2026-07-08 04:33:15'),(74,'airpods',67.00,NULL,5,10,'2026-06-08','',NULL,0,0,'2026-07-08 10:50:41','2026-07-08 10:50:41'),(77,'chicken rice',5.00,NULL,19,13,'2026-07-08','',NULL,0,0,'2026-07-08 15:09:00','2026-07-08 15:09:00'),(78,'Fish',5.00,NULL,19,13,'2026-07-08','',NULL,1,1,'2026-07-08 15:13:33','2026-07-08 15:19:12'),(79,'Macdonald',25.00,NULL,19,13,'2026-05-08','',NULL,0,0,'2026-07-08 15:17:30','2026-07-08 15:17:30'),(80,'Netflix',25.00,NULL,6,13,'2026-07-08','',NULL,0,0,'2026-07-08 15:24:03','2026-07-08 15:24:03'),(81,'nike shoes',40.00,NULL,4,13,'2026-07-08','',NULL,0,0,'2026-07-08 15:25:38','2026-07-08 15:25:38'),(82,'bag',7.00,NULL,3,14,'2026-07-09','',NULL,0,0,'2026-07-09 01:49:28','2026-07-09 01:49:28'),(83,'water',6.00,NULL,5,14,'2026-07-09','',NULL,0,0,'2026-07-09 01:51:01','2026-07-09 01:51:01'),(86,'wubo',5.00,NULL,6,2,'2026-08-11','',NULL,1,1,'2026-07-11 05:32:41','2026-07-11 05:33:00'),(87,'snp500',67.00,NULL,26,2,'2026-07-11','',NULL,0,0,'2026-07-11 06:37:52','2026-07-11 06:37:52'),(88,'water bills',7.00,NULL,5,15,'2026-07-11','',NULL,0,0,'2026-07-11 06:56:33','2026-07-12 16:34:44'),(89,'brocolli',3.00,NULL,1,15,'2026-07-11','',NULL,0,0,'2026-07-11 06:58:21','2026-07-12 05:25:25'),(90,'taxi',5.00,NULL,2,15,'2026-07-11','',NULL,0,0,'2026-07-11 07:40:18','2026-07-11 07:40:18'),(101,'dumbell',6.00,NULL,30,15,'2026-07-12','',NULL,0,0,'2026-07-11 17:14:09','2026-07-12 05:12:43'),(102,'b',5.00,NULL,69,16,'2026-07-13','','/uploads/expenses/expense-1783910624475-126943771.png',0,0,'2026-07-13 02:43:08','2026-07-13 02:43:44'),(103,'taxi',5.00,NULL,2,16,'2026-07-13','',NULL,0,0,'2026-07-13 02:45:48','2026-07-13 02:45:48'),(104,'cash',9.00,NULL,5,16,'2026-07-13','',NULL,0,0,'2026-07-13 02:48:09','2026-07-13 02:49:51'),(105,'me',7.00,NULL,22,15,'2026-07-13','',NULL,0,0,'2026-07-13 06:15:07','2026-07-13 08:37:10'),(106,'gg',7.00,NULL,24,15,'2026-08-01','',NULL,0,0,'2026-07-13 08:37:40','2026-07-13 08:37:40'),(107,'lend money',10.00,NULL,28,2,'2026-07-14','',NULL,0,0,'2026-07-14 07:04:49','2026-07-14 07:04:49'),(108,'life',7.00,NULL,25,15,'2026-07-14','',NULL,0,0,'2026-07-14 11:50:07','2026-07-14 11:50:07'),(109,'dog',7.00,NULL,29,15,'2026-07-14','',NULL,0,0,'2026-07-14 12:09:41','2026-07-14 12:09:41'),(110,'sg',7.00,NULL,31,15,'2026-07-14','',NULL,0,0,'2026-07-14 12:19:41','2026-07-14 12:19:41');
/*!40000 ALTER TABLE `expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `monthly_budget`
--

DROP TABLE IF EXISTS `monthly_budget`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `monthly_budget` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_monthly_budget_user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `monthly_budget`
--

LOCK TABLES `monthly_budget` WRITE;
/*!40000 ALTER TABLE `monthly_budget` DISABLE KEYS */;
INSERT INTO `monthly_budget` VALUES (1,NULL,500.00,'2026-07-01 11:20:12');
/*!40000 ALTER TABLE `monthly_budget` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `overall_budget_rollover_resets`
--

DROP TABLE IF EXISTS `overall_budget_rollover_resets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `overall_budget_rollover_resets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `overall_budget_id` int NOT NULL,
  `reset_month` char(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'YYYY-MM',
  `override_rollover_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_overall_rollover_reset_month` (`overall_budget_id`,`reset_month`),
  KEY `idx_overall_rollover_resets_month` (`reset_month`),
  CONSTRAINT `fk_overall_rollover_resets_budget` FOREIGN KEY (`overall_budget_id`) REFERENCES `overall_monthly_budgets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `overall_budget_rollover_resets`
--

LOCK TABLES `overall_budget_rollover_resets` WRITE;
/*!40000 ALTER TABLE `overall_budget_rollover_resets` DISABLE KEYS */;
/*!40000 ALTER TABLE `overall_budget_rollover_resets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `overall_monthly_budgets`
--

DROP TABLE IF EXISTS `overall_monthly_budgets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `overall_monthly_budgets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned DEFAULT NULL,
  `budget_amount` decimal(10,2) NOT NULL,
  `rollover_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_overall_monthly_budgets_active` (`is_active`),
  KEY `idx_overall_monthly_budgets_deleted_at` (`deleted_at`),
  KEY `idx_overall_monthly_budgets_user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `overall_monthly_budgets`
--

LOCK TABLES `overall_monthly_budgets` WRITE;
/*!40000 ALTER TABLE `overall_monthly_budgets` DISABLE KEYS */;
INSERT INTO `overall_monthly_budgets` VALUES (1,NULL,5.00,1,0,'2026-07-03 11:30:14','2026-07-02 15:47:31','2026-07-03 03:30:14'),(2,NULL,67.00,1,1,NULL,'2026-07-03 03:30:26','2026-07-03 08:03:07'),(3,2,67.00,0,0,'2026-07-06 20:16:21','2026-07-05 16:04:30','2026-07-06 12:16:21'),(4,2,6.00,0,0,'2026-07-06 21:02:29','2026-07-06 12:24:49','2026-07-06 13:02:29'),(5,2,100.00,1,0,'2026-07-06 21:09:51','2026-07-06 13:09:23','2026-07-06 13:09:51'),(6,2,67.00,1,0,'2026-07-06 22:48:14','2026-07-06 13:09:56','2026-07-06 14:48:14'),(7,2,87.00,0,0,'2026-07-08 00:48:00','2026-07-06 16:38:07','2026-07-07 16:48:00'),(8,10,2000.00,1,0,'2026-07-08 18:55:14','2026-07-07 13:33:56','2026-07-08 10:55:14'),(9,2,60.00,0,0,'2026-07-08 21:29:40','2026-07-07 16:48:08','2026-07-08 13:29:40'),(10,13,60.00,1,1,NULL,'2026-07-08 15:21:58','2026-07-08 15:21:58'),(11,14,5.00,0,1,NULL,'2026-07-09 01:48:38','2026-07-09 01:48:38'),(12,2,50.00,1,0,'2026-07-11 12:49:51','2026-07-09 10:13:26','2026-07-11 04:49:51'),(13,15,5.00,0,0,'2026-07-11 17:03:40','2026-07-11 07:01:08','2026-07-11 09:03:40'),(14,15,5.00,1,0,'2026-07-11 20:01:48','2026-07-11 11:56:09','2026-07-11 12:01:48'),(15,15,5.00,0,0,'2026-07-11 20:27:53','2026-07-11 12:17:15','2026-07-11 12:27:53'),(16,15,5.00,0,0,'2026-07-11 20:37:34','2026-07-11 12:32:34','2026-07-11 12:37:34'),(17,15,5.00,0,0,'2026-07-11 20:55:51','2026-07-11 12:39:40','2026-07-11 12:55:51'),(18,15,10.00,0,0,'2026-07-11 22:24:18','2026-07-11 13:06:48','2026-07-11 14:24:18'),(19,15,5.00,0,0,'2026-07-11 22:39:00','2026-07-11 14:30:43','2026-07-11 14:39:00'),(20,15,5.00,0,0,'2026-07-11 22:55:04','2026-07-11 14:46:21','2026-07-11 14:55:04'),(21,15,5.00,0,0,'2026-07-12 01:10:13','2026-07-11 15:04:30','2026-07-11 17:10:13'),(22,15,10.00,0,0,'2026-07-12 01:14:14','2026-07-11 17:12:28','2026-07-11 17:14:14'),(23,15,5.00,0,0,'2026-07-12 01:18:38','2026-07-11 17:15:47','2026-07-11 17:18:38'),(24,15,6.00,0,0,'2026-07-12 13:08:18','2026-07-11 17:22:19','2026-07-12 05:08:18'),(25,15,5.00,0,0,'2026-07-12 13:21:30','2026-07-12 05:10:30','2026-07-12 05:21:30'),(26,15,5.00,0,0,'2026-07-12 16:19:03','2026-07-12 05:23:21','2026-07-12 08:19:03'),(27,15,5.00,0,0,'2026-07-12 16:27:52','2026-07-12 08:25:14','2026-07-12 08:27:52'),(28,15,5.00,0,0,'2026-07-12 16:32:25','2026-07-12 08:29:09','2026-07-12 08:32:25'),(29,15,5.00,0,0,'2026-07-12 16:50:07','2026-07-12 08:41:44','2026-07-12 08:50:07'),(30,15,5.00,0,0,'2026-07-12 16:55:31','2026-07-12 08:53:21','2026-07-12 08:55:31'),(31,15,5.00,0,0,'2026-07-12 17:08:07','2026-07-12 08:56:51','2026-07-12 09:08:07'),(32,15,5.00,0,0,'2026-07-12 17:15:11','2026-07-12 09:09:29','2026-07-12 09:15:11'),(33,15,5.00,0,0,'2026-07-12 17:17:05','2026-07-12 09:16:27','2026-07-12 09:17:05'),(34,15,5.00,0,0,'2026-07-12 17:19:45','2026-07-12 09:18:27','2026-07-12 09:19:45'),(35,15,5.00,0,0,'2026-07-12 17:44:33','2026-07-12 09:24:07','2026-07-12 09:44:33'),(36,15,5.00,0,0,'2026-07-12 17:57:23','2026-07-12 09:51:07','2026-07-12 09:57:23'),(37,15,5.00,0,0,'2026-07-12 19:36:02','2026-07-12 09:58:41','2026-07-12 11:36:02'),(38,15,5.00,0,0,'2026-07-12 19:55:49','2026-07-12 11:51:41','2026-07-12 11:55:49'),(39,15,4.00,0,0,'2026-07-12 20:05:12','2026-07-12 11:57:14','2026-07-12 12:05:12'),(40,15,5.00,0,0,'2026-07-12 20:08:02','2026-07-12 12:07:20','2026-07-12 12:08:02'),(41,15,5.00,0,0,'2026-07-12 20:12:41','2026-07-12 12:09:36','2026-07-12 12:12:41'),(42,15,5.00,0,0,'2026-07-12 20:16:14','2026-07-12 12:15:23','2026-07-12 12:16:14'),(43,15,5.00,0,0,'2026-07-12 21:14:01','2026-07-12 12:17:41','2026-07-12 13:14:01'),(44,15,5.00,0,0,'2026-07-12 21:18:21','2026-07-12 13:17:41','2026-07-12 13:18:21'),(45,15,5.00,0,0,'2026-07-12 21:24:44','2026-07-12 13:20:50','2026-07-12 13:24:44'),(46,15,5.00,0,0,'2026-07-12 21:51:51','2026-07-12 13:26:15','2026-07-12 13:51:51'),(47,15,5.00,0,0,'2026-07-12 22:00:14','2026-07-12 13:59:31','2026-07-12 14:00:14'),(48,15,5.00,0,0,'2026-07-12 22:04:28','2026-07-12 14:03:29','2026-07-12 14:04:28'),(49,15,5.00,0,0,'2026-07-12 22:07:19','2026-07-12 14:05:40','2026-07-12 14:07:19'),(50,15,5.00,0,0,'2026-07-12 22:31:43','2026-07-12 14:08:30','2026-07-12 14:31:43'),(51,15,5.00,0,0,'2026-07-12 22:42:37','2026-07-12 14:42:14','2026-07-12 14:42:37'),(52,15,5.00,0,0,'2026-07-12 22:46:29','2026-07-12 14:44:06','2026-07-12 14:46:29'),(53,15,5.00,0,0,'2026-07-12 22:57:10','2026-07-12 14:47:45','2026-07-12 14:57:10'),(54,15,5.00,0,0,'2026-07-12 22:59:20','2026-07-12 14:58:50','2026-07-12 14:59:20'),(55,15,5.00,0,0,'2026-07-12 23:02:39','2026-07-12 15:00:37','2026-07-12 15:02:39'),(56,15,5.00,0,0,'2026-07-12 23:04:25','2026-07-12 15:03:53','2026-07-12 15:04:25'),(57,15,5.00,0,0,'2026-07-12 23:06:48','2026-07-12 15:06:11','2026-07-12 15:06:48'),(58,15,5.00,0,0,'2026-07-12 23:16:24','2026-07-12 15:08:21','2026-07-12 15:16:24'),(59,15,5.00,0,0,'2026-07-13 00:05:43','2026-07-12 16:00:47','2026-07-12 16:05:43'),(60,15,5.00,0,0,'2026-07-13 00:12:26','2026-07-12 16:06:57','2026-07-12 16:12:26'),(61,15,5.00,0,0,'2026-07-13 00:15:30','2026-07-12 16:15:02','2026-07-12 16:15:30'),(62,15,5.00,0,0,'2026-07-13 00:26:16','2026-07-12 16:25:00','2026-07-12 16:26:16'),(63,15,5.00,0,0,'2026-07-13 00:31:35','2026-07-12 16:30:45','2026-07-12 16:31:35'),(64,15,100.00,0,1,NULL,'2026-07-12 16:32:46','2026-07-13 07:04:37'),(65,16,7.00,0,1,NULL,'2026-07-13 02:47:08','2026-07-13 02:47:08');
/*!40000 ALTER TABLE `overall_monthly_budgets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL COMMENT 'Owner of this reset request; matches users.id',
  `token_hash` char(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SHA-256 hex hash of the emailed reset token',
  `expires_at` datetime NOT NULL COMMENT 'Token is invalid after this time',
  `used_at` datetime DEFAULT NULL COMMENT 'Set when password is successfully reset',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_password_reset_tokens_token_hash` (`token_hash`),
  KEY `idx_password_reset_tokens_user_id` (`user_id`),
  KEY `idx_password_reset_tokens_expires_at` (`expires_at`),
  CONSTRAINT `fk_password_reset_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
INSERT INTO `password_reset_tokens` VALUES (1,2,'c21e60c1cfc2a763947112d7381e7cbd8a24903582d354a02e5408f37a4e4b3c','2026-07-08 20:34:59','2026-07-08 20:05:45','2026-07-08 20:04:59'),(2,2,'0a92ab4604c06ac2a951be0061fe533cdf3c8d23b330e79b717c1f88e0313085','2026-07-08 20:38:43','2026-07-08 20:09:27','2026-07-08 20:08:43'),(3,13,'d7dc77ed629ef29e1e50d49a4b76bc572e5796324d6b1184ac9d0fb2866940f5','2026-07-08 23:37:12',NULL,'2026-07-08 23:07:12'),(4,2,'bc96bc20e18be44f2a6cd12f725ba28eb006c91f52116d1cfdc58a0a03a78a7d','2026-07-09 18:40:40','2026-07-09 18:11:07','2026-07-09 18:10:40'),(5,2,'b53b3fabf68ebb8fe6c31c1c8bf1a00abbbde1d9f2c95a5a41d584eb68f9eb27','2026-07-11 12:53:39','2026-07-11 12:24:15','2026-07-11 12:23:39'),(6,15,'7edfc836f45a8b665cb546b7832ece5694d3224f949ae5564b67065dfd3627c6','2026-07-11 15:57:56','2026-07-11 15:28:42','2026-07-11 15:27:56'),(7,16,'a44b8324616ba302a9a9b839875a6f3bb1ecb233bcde74c49f3164f75fecf4a9','2026-07-13 11:09:05','2026-07-13 10:39:36','2026-07-13 10:39:05'),(8,15,'5fa12531e3cc03080e3f44d286bf992a32b6f4ea45e223e8ecc37c191adfb9e6','2026-07-13 17:04:12','2026-07-13 16:34:45','2026-07-13 16:34:12'),(9,15,'4c0131144a4419c2a4979ab9a20e7771954be24b072b12c9221e79853cfb3849','2026-07-13 17:05:26','2026-07-13 16:36:14','2026-07-13 16:35:26'),(10,2,'675b30d3eb775679e6967923d5cd61dedeb49195982eddc9ca93c0a37c139ab5','2026-07-14 07:33:19','2026-07-14 07:03:58','2026-07-14 07:03:19'),(11,2,'8adc6ece02a66845b73f57b5c348e4ed7bf8d54b19bdf0b76cd944375d93db83','2026-07-14 07:33:58','2026-07-14 07:20:11','2026-07-14 07:03:58'),(12,2,'285dc852a0f7176ad3db607122326c2b264fd2bcbc3cecfbaf0dc997888e78d6','2026-07-14 07:50:11','2026-07-14 07:25:39','2026-07-14 07:20:11'),(13,2,'7670b85e85e1b276604235a0997b17c118f15c67dbacfa1e90cc4a9cea230fab','2026-07-14 07:55:39','2026-07-14 07:29:42','2026-07-14 07:25:39'),(14,2,'76f054a4d201e711eb16b3ba5e99fdab4a0e93635234d78d3b546effe5f9f829','2026-07-14 07:59:42','2026-07-14 08:27:31','2026-07-14 07:29:42'),(15,2,'bc6515cf5226ab6bc8c1bb93537a24355fca56753a45e9a735b386f5f3869bf9','2026-07-14 08:57:31','2026-07-14 08:31:51','2026-07-14 08:27:31'),(16,2,'a8a40f089e9f2c0fd70c70b6e11cb955f5cb244f3e4ce10da747c552fa68d586','2026-07-14 09:01:51','2026-07-14 08:45:12','2026-07-14 08:31:51'),(17,2,'d16a7370219905159f831ff9a236a7560879325884b8ee44bb8ec10ee5086983','2026-07-14 09:15:12','2026-07-14 09:10:09','2026-07-14 08:45:12'),(18,2,'cfca39da8ede2ecb754deabb7262711ca1ebb18c8ad1d2840e9cd86d8820078f','2026-07-14 09:40:09','2026-07-14 09:18:15','2026-07-14 09:10:09'),(19,2,'45ea6c58ea4de788aff311d0d8df9359fc222f8eef1611f4da7f03d8434815f3','2026-07-14 09:48:15','2026-07-14 09:18:22','2026-07-14 09:18:15'),(20,2,'461f1fd1adf0b78acd3b339f4cd62a3d6963d37a0d425b52de9159846bc9aa42','2026-07-14 09:48:22','2026-07-14 09:30:43','2026-07-14 09:18:22'),(21,2,'f5176fce0634b04a921b9cfd8d19fe98eb38cc180d8bd02aaaab56cb56ef5db9','2026-07-14 10:00:43','2026-07-14 09:31:23','2026-07-14 09:30:43'),(22,15,'c34d7f47b42600a2ff5c312e94361d5b84dd6c1bef1f9846bb0342114c4c55d7','2026-07-14 10:02:23','2026-07-14 09:33:11','2026-07-14 09:32:23'),(23,15,'06865c73f7b21778a1fe3604ba1d19703b9e579b9c662f4c0b82afea4950a252','2026-07-14 10:03:11','2026-07-14 11:45:45','2026-07-14 09:33:11'),(24,2,'dc5054758296a985fbf0fe7c17fe1ce92c9f8460da5b391d8ce281629cb747ce','2026-07-14 10:03:40','2026-07-14 11:45:16','2026-07-14 09:33:40'),(25,2,'c2e4157d0c65fd56c56204273fd64966d1a3a0201707f7213c65def803bf1c1b','2026-07-14 12:15:16',NULL,'2026-07-14 11:45:16'),(26,15,'85fa4ca62423d9478fe7dc9af7623ccde388247fcce34189c972ad1f2ebe2802','2026-07-14 12:15:45','2026-07-14 11:46:20','2026-07-14 11:45:45'),(27,10,'9e07ca09fa1275992917c6b334ff0f173f409d3a857ae4d7bdf8c7547ddb54c5','2026-07-14 13:17:49','2026-07-14 12:47:52','2026-07-14 12:47:49'),(28,10,'edec618ae9faade57c8e59d0395df0560a2653c4f64dbd1611700850629fbd77','2026-07-14 13:17:52','2026-07-14 12:48:14','2026-07-14 12:47:52'),(29,10,'9ba1fd92286bd98a2b1bb70ba7ae149e271f2559fdec08ddb271ed738ae76cc6','2026-07-14 13:18:59','2026-07-14 12:49:43','2026-07-14 12:48:59'),(30,15,'8a12ecf50f258189e79003852f4a3fca18aa63d8b1e5288f3a4f94469ab8ea68','2026-07-20 00:30:30','2026-07-20 01:40:52','2026-07-20 00:00:30'),(31,15,'8e8825d00d13b21102437e27df939c3180b7596ae1ed6db60e0d2997813f581e','2026-07-20 02:10:52',NULL,'2026-07-20 01:40:52');
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `savings_goals`
--

DROP TABLE IF EXISTS `savings_goals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `savings_goals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned DEFAULT NULL,
  `goal_name` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Savings goal',
  `target_amount` decimal(10,2) NOT NULL,
  `current_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `goal_month` char(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'YYYY-MM',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_savings_goals_user_month` (`user_id`,`goal_month`),
  KEY `idx_savings_goals_goal_month` (`goal_month`),
  KEY `idx_savings_goals_user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `savings_goals`
--

LOCK TABLES `savings_goals` WRITE;
/*!40000 ALTER TABLE `savings_goals` DISABLE KEYS */;
INSERT INTO `savings_goals` VALUES (1,NULL,'500',300.00,0.00,'2026-07','2026-07-06 00:56:37','2026-07-06 00:56:37'),(2,2,'Monthly saving',2000.00,1802.50,'2026-07','2026-07-06 01:14:26','2026-07-07 17:19:53'),(3,4,'Emergency fund',500.00,117.00,'2026-07','2026-07-06 01:17:34','2026-07-06 01:34:55'),(5,3,'Rich',189.00,67.00,'2026-07','2026-07-06 01:37:54','2026-07-06 01:53:14'),(11,11,'cake',5000.00,5000.00,'2026-07','2026-07-08 04:49:39','2026-07-08 04:51:36'),(13,13,'Emergency',1000.00,400.00,'2026-07','2026-07-09 01:42:52','2026-07-09 01:43:23'),(15,16,'Laptop',1000.00,250.00,'2026-07','2026-07-13 02:55:33','2026-07-13 02:55:48');
/*!40000 ALTER TABLE `savings_goals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `monthly_income` decimal(10,2) DEFAULT NULL,
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `default_budget` decimal(10,2) DEFAULT NULL,
  `email_alerts_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `alert_email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `budget_alert_warning_month` varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `budget_alert_danger_month` varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'PR Updated','prtest1783252455639@example.com','$2b$10$UzW8nxp5BPabloV6vIJBHO8Jc06GKXRBbyLzv6UpJg57CUG2U0oO6',5000.00,'SGD',2000.00,0,NULL,NULL,NULL,'2026-07-05 11:54:15','2026-07-05 11:54:16'),(2,'chengxun','yongchengxun27@gmail.com','$2b$10$yecaPD9.w5lsM.W4C.cN7u/kArU1F1hUMRS/9A7J6OlcWAgo66qUG',3000.00,'SGD',78.00,1,NULL,'2026-07','2026-07','2026-07-05 13:40:26','2026-07-14 09:31:23'),(3,'javier','javierongkailun22@gmail.com','$2b$10$ttLPE2h1tAmjKU9I1JfNe.oPzw.q0.AaR8nuKe0vqhPNcw68QkO02',6000.00,'AUD',0.00,0,NULL,NULL,NULL,'2026-07-05 13:42:10','2026-07-13 07:43:43'),(4,'me','me@gmail.com','$2b$10$WDukEelQBDEpdscjoR/IG.leqH7RodGtJc6xtIhXMV8Kfi1L.zLLq',NULL,'USD',NULL,0,NULL,NULL,NULL,'2026-07-05 14:04:26','2026-07-05 14:04:26'),(5,'you','you@gmail.com','$2b$10$PuwdaiMDXLlxgy.FsumMWOXdW9u/ZBcN6I36yEO7lAqbRd.oNvG/e',NULL,'USD',NULL,0,NULL,NULL,NULL,'2026-07-05 14:25:19','2026-07-05 14:25:19'),(6,'CHAN LEE PENG','yvonne@gmail.com','$2b$10$DpaxD/ViGvlJnnJznTaCXOuplSlYj4wFWYPq0igUVwa9tgUUITqsm',NULL,'USD',NULL,0,NULL,NULL,NULL,'2026-07-05 14:38:26','2026-07-05 14:38:26'),(7,'chengxunnn','daddy@gmail.com','$2b$10$YwR.uVQC1QgzvoZO/OVqJe3JqnGuM9CLpbydP5sSE3LkvibeZVaRq',NULL,'USD',NULL,0,NULL,NULL,NULL,'2026-07-06 14:56:04','2026-07-06 14:56:04'),(8,'raine','raine123@gmail.com','$2b$10$q/mMsrgWtGr2s7ozI1OnUelHSal5PTmhbyQNF3pQNrxwoxVKZQ85e',NULL,'USD',NULL,0,NULL,NULL,NULL,'2026-07-06 15:05:51','2026-07-06 15:05:51'),(9,'bob','bob@gmail.com','$2b$10$k2IXfhPDu3rcZ0CI8htB8.RubUHJ32bPlue1zD0ElV76h8WZN1yNK',NULL,'USD',NULL,0,NULL,NULL,NULL,'2026-07-06 16:01:55','2026-07-06 16:01:55'),(10,'Zhenyu','78zhenyu@gmail.com','$2b$10$sE2rSFhYvAsRGqnxd/Rfx.dpm9oewgcDjCkd9WEintLZWjLHdvPY6',NULL,'USD',NULL,1,NULL,'2026-07','2026-07','2026-07-07 12:39:24','2026-07-14 12:49:43'),(11,'kaiwen','kaiwenhow@gmail.com','$2b$10$byZx9PlGznBhABxqD018d./Vh4uYtUpMQJSXV/90m2MPKJqlS6IWe',NULL,'USD',NULL,1,NULL,NULL,NULL,'2026-07-08 04:09:29','2026-07-08 04:29:23'),(12,'yong','yong@gmail.com','$2b$10$poj/ZT0KUU75izmRcjCBRO.omFV4Y4GV4VveHQnv15.exwT2MVcaq',NULL,'USD',NULL,0,NULL,NULL,NULL,'2026-07-08 09:49:32','2026-07-08 09:49:32'),(13,'Koby','kobyang07@gmail.com','$2b$10$f3tXn1W8T/Lu3DYn4E/rI.bf30x5qinOtFAANX7gN4e.nBiXR6bGK',NULL,'USD',NULL,1,NULL,NULL,NULL,'2026-07-08 15:06:52','2026-07-08 15:12:27'),(14,'bob','leejunxian122@gmail.com','$2b$10$4.lKPzPz5JCgpkOjK3kP0.jYQHLb0yNzPuQu1Jg6jUUfoKvH2gCMq',NULL,'USD',NULL,1,NULL,NULL,NULL,'2026-07-09 01:48:25','2026-07-09 01:49:33'),(15,'demo','testingfordemoc207@gmail.com','$2b$10$clOspSnNfGROO4UoznEnlebZiwWqL3i6ho8dGknHuErT3aDXz3Y.y',0.00,'USD',0.00,1,NULL,NULL,NULL,'2026-07-11 06:56:06','2026-07-14 11:46:20'),(16,'Team','team1financec207@gmail.com','$2b$10$oZDpU/4OXivMKr/Sh7a29uBOGNyYcRdgYdMDmf1DnTWdrwF5ud3wm',6000.00,'SGD',4000.00,1,NULL,NULL,NULL,'2026-07-13 02:37:30','2026-07-13 02:46:21');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'railway'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-27 16:29:11
