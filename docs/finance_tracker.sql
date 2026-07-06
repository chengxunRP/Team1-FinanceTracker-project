CREATE DATABASE  IF NOT EXISTS `finance_tracker` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `finance_tracker`;
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: finance_tracker
-- ------------------------------------------------------
-- Server version	8.4.6

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
-- Table structure for table `budget_rollover_overrides`
--

DROP TABLE IF EXISTS `budget_rollover_overrides`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `budget_rollover_overrides` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_budget_id` int NOT NULL,
  `reset_month` char(7) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'YYYY-MM',
  `override_rollover_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rollover_override_month` (`category_budget_id`,`reset_month`),
  KEY `idx_rollover_override_reset_month` (`reset_month`),
  CONSTRAINT `fk_rollover_override_category_budget` FOREIGN KEY (`category_budget_id`) REFERENCES `category_budgets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_rollover_overrides`
--

LOCK TABLES `budget_rollover_overrides` WRITE;
/*!40000 ALTER TABLE `budget_rollover_overrides` DISABLE KEYS */;
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
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'default-category',
  `color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon_image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Public path e.g. /uploads/category-icons/file.png',
  `is_custom` tinyint(1) NOT NULL DEFAULT '0',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Groceries','food','#ffffff',NULL,0,0,NULL,'2026-07-01 11:20:12','2026-07-02 09:55:47'),(2,'Auto & Transport','transport','#ffffff',NULL,0,0,NULL,'2026-07-01 11:20:12','2026-07-02 09:55:47'),(3,'Education','school','#ffffff',NULL,0,0,NULL,'2026-07-01 11:20:12','2026-07-02 09:55:47'),(4,'Shopping','shopping','#ffffff',NULL,0,0,NULL,'2026-07-01 11:20:12','2026-07-02 09:55:47'),(5,'Bills & Utilities','bills','#ffffff',NULL,0,0,NULL,'2026-07-01 11:20:12','2026-07-02 09:55:47'),(6,'Entertainment','entertainment','#ffffff',NULL,0,0,NULL,'2026-07-01 11:20:12','2026-07-02 09:55:47'),(9,'cx','default-category','#ec4899',NULL,1,1,'2026-07-05 00:55:08','2026-07-01 11:39:19','2026-07-04 16:55:08'),(10,'aden','default-category','#22c55e','/uploads/category-icons/category-1782906044585-438472174.png',1,1,'2026-07-02 20:52:21','2026-07-01 11:40:44','2026-07-02 12:52:21'),(11,'df','default-category','#000000',NULL,1,1,'2026-07-05 00:55:05','2026-07-01 11:59:21','2026-07-04 16:55:05'),(12,'me','default-category','#22c55e','/uploads/category-icons/category-1782907313354-288130968.jpg',1,1,'2026-07-01 20:02:30','2026-07-01 12:01:53','2026-07-01 12:02:30'),(14,'Business Services','business_services','#ffffff',NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(15,'Cash & ATM','cash_atm','#ffffff',NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(16,'Cheque','cheque','#ffffff',NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(17,'Clothing','clothing','#ffffff',NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(18,'Credit Card Payment','creditcard_payment','#ffffff',NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(19,'Eating Out','eatingout','#ffffff',NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(20,'Electronics & Software','electronics_software','#ffffff',NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(21,'Fees','fees','#ffffff',NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(22,'Gifts & Donation','gifts_donation','#ffffff',NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(23,'Health & Medical','health_medical','#ffffff',NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(24,'Home','home','#ffffff',NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(25,'Insurance','insurance','#ffffff',NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(26,'Investments','investments','#ffffff',NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(27,'Kid','kid','#ffffff',NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(28,'Loan','loan','#ffffff',NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(29,'Pets','pets','#ffffff',NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(30,'Sport & Fitness','sport_fitness','#ffffff',NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(31,'Travel','travel','#ffffff',NULL,0,0,NULL,'2026-07-02 09:22:05','2026-07-02 09:55:47'),(51,'aws','default-category','#22c55e','/uploads/category-icons/category-1782996972813-717426733.jpg',1,0,NULL,'2026-07-02 12:56:12','2026-07-02 12:56:12'),(52,'floorball','default-category','#22c55e','/uploads/category-icons/category-1783184668703-497272986.png',1,0,NULL,'2026-07-04 17:04:28','2026-07-04 17:04:28');
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
  `budget_limit` decimal(10,2) NOT NULL DEFAULT '0.00',
  `budget_month` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'YYYY-MM',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `rollover_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_category_budget` (`category_id`),
  KEY `idx_category_budgets_budget_month` (`budget_month`),
  KEY `idx_category_budgets_is_active` (`is_active`),
  CONSTRAINT `fk_category_budgets_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category_budgets`
--

LOCK TABLES `category_budgets` WRITE;
/*!40000 ALTER TABLE `category_budgets` DISABLE KEYS */;
INSERT INTO `category_budgets` VALUES (1,9,5.00,'2026-07',0,0,'2026-07-01 11:39:49','2026-07-01 11:50:31'),(2,10,2.00,'2026-07',0,0,'2026-07-01 11:40:54','2026-07-01 12:20:31'),(3,5,7.00,'2026-07',1,1,'2026-07-01 11:41:15','2026-07-03 07:07:19'),(4,11,15.00,'2026-07',0,0,'2026-07-01 11:59:29','2026-07-01 11:59:52'),(5,12,5.00,'2026-07',1,0,'2026-07-01 12:01:58','2026-07-01 12:01:58'),(6,2,10.00,'2026-07',1,1,'2026-07-01 14:20:14','2026-07-04 17:07:24'),(7,51,5.00,'2026-07',1,0,'2026-07-02 12:56:29','2026-07-02 12:56:29'),(8,52,5.00,'2026-07',0,0,'2026-07-04 17:05:05','2026-07-04 17:05:23');
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
  `sender` enum('user','bot') COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chat_messages_session_id` (`session_id`),
  KEY `idx_chat_messages_created_at` (`created_at`),
  CONSTRAINT `fk_chat_messages_session` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_messages`
--

LOCK TABLES `chat_messages` WRITE;
/*!40000 ALTER TABLE `chat_messages` DISABLE KEYS */;
INSERT INTO `chat_messages` VALUES (1,1,'bot','Hey! I am FinBot, your finance assistant. Ask about spending, your budget, or whether a purchase fits your plan.','2026-07-01 13:46:47'),(5,3,'bot','Hi, I\'m FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.','2026-07-04 15:20:10'),(6,4,'bot','Hi, I\'m FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.','2026-07-04 15:23:29'),(23,5,'bot','Hi, I\'m FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.','2026-07-04 16:19:40'),(24,5,'user','hi','2026-07-04 16:19:40'),(25,5,'bot','Hello. I\'m FinBot, your friendly personal finance assistant. How can I assist you with your finances today?','2026-07-04 16:19:41'),(29,6,'bot','Hi, I\'m FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.','2026-07-04 16:30:24'),(35,7,'bot','Hi, I\'m FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.','2026-07-05 05:11:59'),(36,8,'bot','Hi, I\'m FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.','2026-07-05 05:11:59'),(37,7,'user','Tell me a joke.','2026-07-05 05:11:59'),(38,8,'user','hi','2026-07-05 05:11:59'),(39,7,'bot','Sorry, I\'m designed to help with your spending, budgets, expenses, and finance decisions in spendWise. Try asking me something like \'How much have I spent this month?\' or \'Can I buy a $50 item?\'','2026-07-05 05:11:59'),(40,8,'bot','Hi, I\'m FinBot. I can help you with spending, budgets, expenses, and purchase decisions in spendWise.','2026-07-05 05:11:59'),(66,2,'bot','Hi, I\'m FinBot. I can help you understand your spending, budgets, and whether a purchase is safe.','2026-07-05 06:02:58');
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
  `session_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_chat_sessions_session_id` (`session_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_sessions`
--

LOCK TABLES `chat_sessions` WRITE;
/*!40000 ALTER TABLE `chat_sessions` DISABLE KEYS */;
INSERT INTO `chat_sessions` VALUES (1,'83b6d00c-ffad-4f24-b7eb-5dea00802f4a','2026-07-01 13:46:47','2026-07-01 13:46:47'),(2,'52b0c362-d7c3-43c6-89da-2df86fc37cf0','2026-07-04 14:30:40','2026-07-04 14:30:40'),(3,'f3d85af1-3fc4-4706-b9a7-4bb5f8ae6a9c','2026-07-04 15:20:10','2026-07-04 15:20:10'),(4,'908b1af2-9c90-4ef8-9036-444340387404','2026-07-04 15:23:29','2026-07-04 15:23:29'),(5,'8c6a3b40-9669-4ecd-afbc-7bf3e4755b7e','2026-07-04 16:19:40','2026-07-04 16:19:40'),(6,'d52be38a-af6d-41d1-abd1-d657f1bf356f','2026-07-04 16:30:24','2026-07-04 16:30:24'),(7,'45c8c0e2-7902-42cb-a9bf-6dcbdfabaab5','2026-07-05 05:11:59','2026-07-05 05:11:59'),(8,'073c682f-4d8a-4e01-97a1-116b92dffb53','2026-07-05 05:11:59','2026-07-05 05:11:59');
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
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `merchant_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category_id` int NOT NULL,
  `expense_date` date NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `image_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Public path e.g. /uploads/expenses/file.png',
  `is_excluded_from_budget` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_expenses_category_id` (`category_id`),
  KEY `idx_expenses_expense_date` (`expense_date`),
  KEY `idx_expenses_title` (`title`),
  CONSTRAINT `fk_expenses_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expenses`
--

LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
INSERT INTO `expenses` VALUES (1,'Chicken rice',7.00,NULL,1,'2026-07-01','test',NULL,0,'2026-07-01 12:20:06','2026-07-03 16:16:17'),(2,'you',5.00,NULL,2,'2026-07-01','',NULL,0,'2026-07-01 12:29:47','2026-07-04 16:32:29'),(3,'you123',6.00,NULL,5,'2023-07-01','',NULL,0,'2026-07-01 12:30:08','2026-07-04 13:20:46'),(4,'Chicken rice',5.00,NULL,1,'2026-07-01','lunch','/uploads/expenses/expense-1783168218785-650258348.png',0,'2026-07-01 13:08:55','2026-07-04 12:30:18'),(5,'fries',5.00,NULL,2,'2026-06-01','',NULL,0,'2026-07-01 14:42:08','2026-07-01 14:42:08'),(6,'mrt',7.00,NULL,2,'2026-07-01','',NULL,0,'2026-07-01 15:05:02','2026-07-01 15:05:02'),(7,'bus',10.00,NULL,2,'2026-07-02','','/uploads/expenses/expense-1783156843218-518683068.png',0,'2026-07-01 16:06:51','2026-07-04 09:20:43'),(8,'chicken',2.00,NULL,2,'2026-07-02','','/uploads/expenses/expense-1783158635700-357347675.png',0,'2026-07-01 16:49:47','2026-07-04 09:50:35');
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
  `amount` decimal(10,2) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `monthly_budget`
--

LOCK TABLES `monthly_budget` WRITE;
/*!40000 ALTER TABLE `monthly_budget` DISABLE KEYS */;
INSERT INTO `monthly_budget` VALUES (1,500.00,'2026-07-01 11:20:12');
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
  `reset_month` char(7) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'YYYY-MM',
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
  `budget_amount` decimal(10,2) NOT NULL,
  `rollover_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_overall_monthly_budgets_active` (`is_active`),
  KEY `idx_overall_monthly_budgets_deleted_at` (`deleted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `overall_monthly_budgets`
--

LOCK TABLES `overall_monthly_budgets` WRITE;
/*!40000 ALTER TABLE `overall_monthly_budgets` DISABLE KEYS */;
INSERT INTO `overall_monthly_budgets` VALUES (1,5.00,1,0,'2026-07-03 11:30:14','2026-07-02 15:47:31','2026-07-03 03:30:14'),(2,67.00,1,1,NULL,'2026-07-03 03:30:26','2026-07-03 08:03:07');
/*!40000 ALTER TABLE `overall_monthly_budgets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'finance_tracker'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-05 18:13:54
