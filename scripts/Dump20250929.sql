CREATE DATABASE  IF NOT EXISTS `estimular` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `estimular`;
-- MySQL dump 10.13  Distrib 8.0.39, for Linux (x86_64)
--
-- Host: localhost    Database: estimular
-- ------------------------------------------------------
-- Server version	8.0.42-0ubuntu0.20.04.1

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
-- Table structure for table `asistencia`
--

DROP TABLE IF EXISTS `asistencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asistencia` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `turno_id` bigint NOT NULL,
  `profesional_id` int NOT NULL,
  `paciente_presente` tinyint(1) DEFAULT '0',
  `ingreso_en` datetime DEFAULT NULL,
  `salida_en` datetime DEFAULT NULL,
  `notas` text COLLATE utf8mb4_unicode_ci,
  `registrado_por` int DEFAULT NULL,
  `registrado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `turno_id` (`turno_id`),
  KEY `profesional_id` (`profesional_id`),
  KEY `registrado_por` (`registrado_por`),
  CONSTRAINT `asistencia_ibfk_1` FOREIGN KEY (`turno_id`) REFERENCES `turnos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `asistencia_ibfk_2` FOREIGN KEY (`profesional_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `asistencia_ibfk_3` FOREIGN KEY (`registrado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asistencia`
--

LOCK TABLES `asistencia` WRITE;
/*!40000 ALTER TABLE `asistencia` DISABLE KEYS */;
/*!40000 ALTER TABLE `asistencia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `consultorios`
--

DROP TABLE IF EXISTS `consultorios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consultorios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ubicacion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `consultorios`
--

LOCK TABLES `consultorios` WRITE;
/*!40000 ALTER TABLE `consultorios` DISABLE KEYS */;
INSERT INTO `consultorios` VALUES (1,'\'Consultorio 1\'','\'Ala Norte\''),(2,'\'Consultorio 2\'','\'Ala Norte\''),(3,'\'Consultorio 3\'','\'Ala Sur\''),(4,'\'Consultorio 4\'','\'Ala Sur\''),(5,'\'Consultorio 5\'','\'Ala Oeste\''),(6,'\'Sala de Terapia Ocupacional\'','\'Planta Baja\''),(7,'\'Sala de Fonoaudiología\'','\'Planta Baja\''),(8,'\'Consultorio 8\'','\'Primer Piso\''),(9,'\'Consultorio 9\'','\'Primer Piso\''),(10,'\'Consultorio 10\'','\'Primer Piso\''),(11,'\'Sala de Grupos\'','\'Anexo\'');
/*!40000 ALTER TABLE `consultorios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departamentos`
--

DROP TABLE IF EXISTS `departamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departamentos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departamentos`
--

LOCK TABLES `departamentos` WRITE;
/*!40000 ALTER TABLE `departamentos` DISABLE KEYS */;
INSERT INTO `departamentos` VALUES (1,'psico','Psicología'),(2,'fono','Fonoaudiología'),(3,'to','Terapia Ocupacional'),(4,'psicop','Psicopedagogía');
/*!40000 ALTER TABLE `departamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `disponibilidades`
--

DROP TABLE IF EXISTS `disponibilidades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `disponibilidades` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `profesional_id` int NOT NULL,
  `inicio` datetime NOT NULL,
  `fin` datetime NOT NULL,
  `tipo` enum('disponible','bloqueado') COLLATE utf8mb4_unicode_ci DEFAULT 'disponible',
  `nota` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_por` int DEFAULT NULL,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `profesional_id` (`profesional_id`),
  KEY `creado_por` (`creado_por`),
  CONSTRAINT `disponibilidades_ibfk_1` FOREIGN KEY (`profesional_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `disponibilidades_ibfk_2` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `disponibilidades`
--

LOCK TABLES `disponibilidades` WRITE;
/*!40000 ALTER TABLE `disponibilidades` DISABLE KEYS */;
/*!40000 ALTER TABLE `disponibilidades` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documentos`
--

DROP TABLE IF EXISTS `documentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documentos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `paciente_id` int DEFAULT NULL,
  `turno_id` bigint DEFAULT NULL,
  `nombre_archivo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ruta_archivo` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mime` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subido_por` int DEFAULT NULL,
  `subido_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `paciente_id` (`paciente_id`),
  KEY `turno_id` (`turno_id`),
  KEY `subido_por` (`subido_por`),
  CONSTRAINT `documentos_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`),
  CONSTRAINT `documentos_ibfk_2` FOREIGN KEY (`turno_id`) REFERENCES `turnos` (`id`),
  CONSTRAINT `documentos_ibfk_3` FOREIGN KEY (`subido_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documentos`
--

LOCK TABLES `documentos` WRITE;
/*!40000 ALTER TABLE `documentos` DISABLE KEYS */;
/*!40000 ALTER TABLE `documentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lista_espera`
--

DROP TABLE IF EXISTS `lista_espera`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lista_espera` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `servicio_id` int DEFAULT NULL,
  `profesional_preferido_id` int DEFAULT NULL,
  `solicitado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `notificado` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `paciente_id` (`paciente_id`),
  KEY `servicio_id` (`servicio_id`),
  KEY `profesional_preferido_id` (`profesional_preferido_id`),
  CONSTRAINT `lista_espera_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`),
  CONSTRAINT `lista_espera_ibfk_2` FOREIGN KEY (`servicio_id`) REFERENCES `servicios` (`id`),
  CONSTRAINT `lista_espera_ibfk_3` FOREIGN KEY (`profesional_preferido_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lista_espera`
--

LOCK TABLES `lista_espera` WRITE;
/*!40000 ALTER TABLE `lista_espera` DISABLE KEYS */;
/*!40000 ALTER TABLE `lista_espera` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notificaciones`
--

DROP TABLE IF EXISTS `notificaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificaciones` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `profesional_id` int NOT NULL,
  `mensaje` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `turno_id` bigint DEFAULT NULL,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `profesional_id` (`profesional_id`),
  KEY `turno_id` (`turno_id`),
  CONSTRAINT `notificaciones_ibfk_1` FOREIGN KEY (`profesional_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notificaciones_ibfk_2` FOREIGN KEY (`turno_id`) REFERENCES `turnos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificaciones`
--

LOCK TABLES `notificaciones` WRITE;
/*!40000 ALTER TABLE `notificaciones` DISABLE KEYS */;
INSERT INTO `notificaciones` VALUES (1,1,'El estado del turno para undefined ha cambiado a: CONFIRMADO',18,'2025-09-17 14:28:58'),(2,1,'El estado del turno para undefined ha cambiado a: PENDIENTE',16,'2025-09-17 14:29:04'),(3,1,'El estado del turno para undefined ha cambiado a: COMPLETADO',18,'2025-09-17 14:29:24'),(4,1,'El estado del turno para undefined ha cambiado a: CONFIRMADO',18,'2025-09-17 14:29:53'),(5,1,'El estado del turno para undefined ha cambiado a: COMPLETADO',16,'2025-09-17 14:30:22'),(6,1,'El estado del turno para undefined ha cambiado a: CONFIRMADO',19,'2025-09-17 14:30:40'),(7,1,'El estado del turno para Lucas ha cambiado a: COMPLETADO',18,'2025-09-17 14:59:12'),(8,1,'El estado del turno para Mateo ha cambiado a: CONFIRMADO',16,'2025-09-17 21:05:20'),(9,1,'El estado del turno para Mateo ha cambiado a: COMPLETADO',16,'2025-09-17 21:05:47'),(10,1,'El estado del turno para Lucas ha cambiado a: CONFIRMADO',18,'2025-09-17 21:08:53'),(11,1,'El estado del turno para Lucas ha cambiado a: NO_PRESENTO',18,'2025-09-17 21:09:38'),(12,1,'El estado del turno para Sofía ha cambiado a: COMPLETADO',17,'2025-09-17 21:10:01'),(13,1,'El estado del turno para Mateo ha cambiado a: CONFIRMADO',16,'2025-09-17 21:10:09'),(14,1,'El estado del turno para Mateo ha cambiado a: COMPLETADO',16,'2025-09-17 21:10:23'),(15,1,'El estado del turno para Sofía ha cambiado a: CANCELADO',17,'2025-09-17 21:15:25'),(16,1,'El estado del turno para Sofía ha cambiado a: PENDIENTE',17,'2025-09-17 21:15:37'),(17,1,'Llego Valentina Fernandez',19,'2025-09-17 21:33:08'),(18,1,'El estado del turno para Valentina Fernandez ha cambiado a: CONFIRMADO',19,'2025-09-17 21:33:21'),(19,1,'Llego Valentina Fernandez',19,'2025-09-18 09:10:28'),(20,1,'El estado del turno para Valentina Fernandez ha cambiado a: CONFIRMADO',19,'2025-09-18 09:11:33'),(21,1,'Llego Valentina Fernandez',19,'2025-09-18 09:36:40'),(22,1,'El estado del turno para Valentina Fernandez ha cambiado a: CONFIRMADO',19,'2025-09-18 09:37:07'),(23,1,'Llego Valentina Fernandez',19,'2025-09-18 10:08:35'),(24,1,'El estado del turno para Valentina Fernandez ha cambiado a: CONFIRMADO',19,'2025-09-18 10:08:53'),(25,1,'Llego Valentina Fernandez',19,'2025-09-18 10:09:12'),(26,1,'El estado del turno para Valentina Fernandez ha cambiado a: CONFIRMADO',19,'2025-09-18 10:10:29'),(27,1,'El estado del turno para Mateo González ha cambiado a: CONFIRMADO',16,'2025-09-26 10:38:58'),(28,1,'Llego Valentina Fernandez',19,'2025-09-26 11:26:08'),(29,1,'Llego Mateo González',16,'2025-09-29 01:33:38'),(30,1,'El estado del turno para Mateo González ha cambiado a: CONFIRMADO',16,'2025-09-29 01:33:44'),(31,1,'Llego Mateo González',16,'2025-09-29 02:19:13'),(32,1,'El estado del turno para Mateo González ha cambiado a: CONFIRMADO',16,'2025-09-29 02:19:22'),(33,1,'Llego Mateo González',16,'2025-09-29 03:16:43'),(34,1,'El estado del turno para Mateo González ha cambiado a: CONFIRMADO',16,'2025-09-29 03:16:55');
/*!40000 ALTER TABLE `notificaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pacientes`
--

DROP TABLE IF EXISTS `pacientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pacientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `apellido` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `dni` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cud` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `titular_nombre` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `obra_social` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pacientes`
--

LOCK TABLES `pacientes` WRITE;
/*!40000 ALTER TABLE `pacientes` DISABLE KEYS */;
INSERT INTO `pacientes` VALUES (1,'Mateo','González','2018-05-14','55123456',NULL,'3815550101','mateo.gonzalez@email.com','Carlos González','Osde','2025-09-11 10:04:18','2025-09-11 10:04:18'),(2,'Sofía','Rodriguez','2019-02-20','56234567','CERT-1234','3815550102','sofia.rodriguez@email.com','Laura Rodriguez','Swiss Medical','2025-09-11 10:04:18','2025-09-11 10:04:18'),(3,'Lucas','Gomez','2017-11-30','54345678',NULL,'3815550103','lucas.gomez@email.com','Fernando Gomez','Galeno','2025-09-11 10:04:18','2025-09-11 10:04:18'),(4,'Valentina','Fernandez','2020-01-15','57456789',NULL,'3815550104','valentina.fernandez@email.com','Maria Fernandez','Osde','2025-09-11 10:04:18','2025-09-11 10:04:18'),(5,'Benjamín','Lopez','2018-08-19','55567890',NULL,'3815550105','benjamin.lopez@email.com','Javier Lopez','Swiss Medical','2025-09-11 10:04:18','2025-09-11 10:04:18'),(6,'Julieta','Diaz','2019-07-25','56678901','CERT-5678','3815550106','julieta.diaz@email.com','Ana Diaz','Galeno','2025-09-11 10:04:18','2025-09-11 10:04:18'),(7,'Bautista','Martinez','2017-04-12','54789012',NULL,'3815550107','bautista.martinez@email.com','Pedro Martinez','Osde','2025-09-11 10:04:18','2025-09-11 10:04:18'),(8,'Isabella','Perez','2020-03-05','57890123',NULL,'3815550108','isabella.perez@email.com','Lucia Perez','Swiss Medical','2025-09-11 10:04:18','2025-09-11 10:04:18'),(9,'Felipe','Sanchez','2018-12-01','55901234',NULL,'3815550109','felipe.sanchez@email.com','Marcos Sanchez','Galeno','2025-09-11 10:04:18','2025-09-11 10:04:18'),(10,'Catalina','Romero','2019-09-10','56012345',NULL,'3815550110','catalina.romero@email.com','Gabriela Romero','Osde','2025-09-11 10:04:18','2025-09-11 10:04:18'),(11,'Thiago','Garcia','2017-06-22','54123456','CERT-1111','3815550111','thiago.garcia@email.com','Diego Garcia','Swiss Medical','2025-09-11 10:04:18','2025-09-11 10:04:18'),(12,'Emma','Sosa','2020-04-18','57234567',NULL,'3815550112','emma.sosa@email.com','Valeria Sosa','Galeno','2025-09-11 10:04:18','2025-09-11 10:04:18'),(13,'Santino','Torres','2018-03-11','55345678',NULL,'3815550113','santino.torres@email.com','Andres Torres','Osde','2025-09-11 10:04:18','2025-09-11 10:04:18'),(14,'Olivia','Ruiz','2019-11-02','56456789',NULL,'3815550114','olivia.ruiz@email.com','Paula Ruiz','Swiss Medical','2025-09-11 10:04:18','2025-09-11 10:04:18'),(15,'Joaquín','Ramirez','2017-10-08','54567890',NULL,'3815550115','joaquin.ramirez@email.com','Esteban Ramirez','Galeno','2025-09-11 10:04:18','2025-09-11 10:04:18'),(16,'Martina','Alvarez','2020-06-29','57678901','CERT-2222','3815550116','martina.alvarez@email.com','Silvia Alvarez','Osde','2025-09-11 10:04:18','2025-09-11 10:04:18'),(17,'Lautaro','Benitez','2018-01-03','55789012',NULL,'3815550117','lautaro.benitez@email.com','Roberto Benitez','Swiss Medical','2025-09-11 10:04:18','2025-09-11 10:04:18'),(18,'Mía','Flores','2019-08-14','56890123',NULL,'3815550118','mia.flores@email.com','Carolina Flores','Galeno','2025-09-11 10:04:18','2025-09-11 10:04:18'),(19,'Agustín','Acosta','2017-02-25','54901234',NULL,'3815550119','agustin.acosta@email.com','Gustavo Acosta','Osde','2025-09-11 10:04:18','2025-09-11 10:04:18'),(20,'Alma','Medina','2020-07-21','57012345',NULL,'3815550120','alma.medina@email.com','Adriana Medina','Swiss Medical','2025-09-11 10:04:18','2025-09-11 10:04:18'),(21,'Dante','Herrera','2018-09-09','55112233',NULL,'3815550121','dante.herrera@email.com','Hernan Herrera','Galeno','2025-09-11 10:04:18','2025-09-11 10:04:18'),(22,'Helena','Suarez','2019-04-03','56223344','CERT-3333','3815550122','helena.suarez@email.com','Sofia Suarez','Osde','2025-09-11 10:04:18','2025-09-11 10:04:18'),(23,'Ignacio','Gimenez','2017-08-17','54334455',NULL,'3815550123','ignacio.gimenez@email.com','Ivan Gimenez','Swiss Medical','2025-09-11 10:04:18','2025-09-11 10:04:18'),(24,'Ambar','Molina','2020-09-12','57445566',NULL,'3815550124','ambar.molina@email.com','Monica Molina','Galeno','2025-09-11 10:04:18','2025-09-11 10:04:18'),(25,'Nicolás','Castro','2018-07-07','55556677',NULL,'3815550125','nicolas.castro@email.com','Natalia Castro','Osde','2025-09-11 10:04:18','2025-09-11 10:04:18'),(26,'Juana','Ortiz','2019-01-28','56667788',NULL,'3815550126','juana.ortiz@email.com','Julia Ortiz','Swiss Medical','2025-09-11 10:04:18','2025-09-11 10:04:18'),(27,'León','Silva','2017-12-13','54778899','CERT-4444','3815550127','leon.silva@email.com','Leonardo Silva','Galeno','2025-09-11 10:04:18','2025-09-11 10:04:18'),(28,'Regina','Rojas','2020-10-30','57889900',NULL,'3815550128','regina.rojas@email.com','Raquel Rojas','Osde','2025-09-11 10:04:18','2025-09-11 10:04:18'),(29,'Bruno','Nuñez','2018-10-24','55990011',NULL,'3815550129','bruno.nunez@email.com','Beatriz Nuñez','Swiss Medical','2025-09-11 10:04:18','2025-09-11 10:04:18'),(30,'Renata','Luna','2019-05-09','56001122',NULL,'3815550130','renata.luna@email.com','Romina Luna','Galeno','2025-09-11 10:04:18','2025-09-11 10:04:18');
/*!40000 ALTER TABLE `pacientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pagos`
--

DROP TABLE IF EXISTS `pagos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pagos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `turno_id` bigint DEFAULT NULL,
  `paciente_id` int NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  `moneda` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'ARS',
  `metodo` enum('efectivo','tarjeta','transferencia','mercadopago','otro') COLLATE utf8mb4_unicode_ci DEFAULT 'efectivo',
  `estado` enum('pendiente','completado','fallido','reembolsado') COLLATE utf8mb4_unicode_ci DEFAULT 'completado',
  `comprobante` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_por` int DEFAULT NULL,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `turno_id` (`turno_id`),
  KEY `paciente_id` (`paciente_id`),
  KEY `creado_por` (`creado_por`),
  CONSTRAINT `pagos_ibfk_1` FOREIGN KEY (`turno_id`) REFERENCES `turnos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pagos_ibfk_2` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`),
  CONSTRAINT `pagos_ibfk_3` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pagos`
--

LOCK TABLES `pagos` WRITE;
/*!40000 ALTER TABLE `pagos` DISABLE KEYS */;
INSERT INTO `pagos` VALUES (1,16,1,2500.00,'ARS','efectivo','completado',NULL,NULL,'2025-09-16 10:33:29'),(2,17,2,2500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(3,18,3,2500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(4,19,4,2500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(5,20,5,2500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(6,21,6,2500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(7,22,7,2500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(8,23,8,2500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(9,24,9,2500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(10,25,10,2500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(11,26,11,2200.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(12,27,12,2200.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(13,28,13,2200.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(14,29,14,2200.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(15,30,15,2200.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(16,31,16,2200.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(17,32,17,2200.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(18,33,18,2200.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(19,34,19,2200.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(20,35,20,2200.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(21,36,21,2800.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(22,37,22,2800.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(23,38,23,2800.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(24,39,24,2800.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(25,40,25,2800.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(26,41,26,2800.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(27,42,27,2800.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(28,43,28,2800.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(29,44,29,2800.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(30,45,30,2800.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(31,46,1,3000.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(32,47,2,3000.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(33,48,3,3000.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(34,49,4,3000.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(35,50,5,3000.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(36,51,6,3000.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(37,52,7,3000.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(38,53,8,3000.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(39,54,9,3000.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(40,55,10,3000.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(41,56,11,3500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(42,57,12,3500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(43,58,13,3500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(44,59,14,3500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(45,60,15,3500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(46,61,16,3500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(47,62,17,3500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(48,63,18,3500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(49,64,19,3500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(50,65,20,3500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 10:33:29'),(51,1,1,2500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 11:22:44'),(52,2,2,2200.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 11:22:44'),(53,3,3,3500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 11:22:44'),(54,4,4,3000.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 11:22:44'),(55,5,5,2800.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 11:22:44'),(56,6,6,2200.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 11:22:44'),(57,7,7,2500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 11:22:44'),(58,8,8,3000.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 11:22:44'),(59,9,9,4000.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 11:22:44'),(60,10,10,2800.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 11:22:44'),(61,11,11,2500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 11:22:44'),(62,12,12,2200.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 11:22:44'),(63,13,13,3000.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 11:22:44'),(64,14,14,2800.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 11:22:44'),(65,15,15,2500.00,'ARS','efectivo','pendiente',NULL,NULL,'2025-09-16 11:22:44');
/*!40000 ALTER TABLE `pagos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `profesionales`
--

DROP TABLE IF EXISTS `profesionales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `profesionales` (
  `id` int NOT NULL,
  `departamento_id` int DEFAULT NULL,
  `matricula` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `departamento_id` (`departamento_id`),
  CONSTRAINT `profesionales_ibfk_1` FOREIGN KEY (`id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `profesionales_ibfk_2` FOREIGN KEY (`departamento_id`) REFERENCES `departamentos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `profesionales`
--

LOCK TABLES `profesionales` WRITE;
/*!40000 ALTER TABLE `profesionales` DISABLE KEYS */;
INSERT INTO `profesionales` VALUES (1,1,'PS-1122',NULL),(2,2,'FO-2233',NULL),(3,4,'PP-3344',NULL),(4,3,'TO-4455',NULL),(5,1,'PS-5566',NULL),(6,2,'FO-6677',NULL),(7,4,'PP-7788',NULL),(8,3,'TO-8899',NULL),(9,1,'PS-9900',NULL),(10,2,'FO-0011',NULL),(11,4,'PP-1123',NULL),(12,3,'TO-2234',NULL),(13,1,'PS-3345',NULL),(14,2,'FO-4456',NULL),(15,4,'PP-5567',NULL),(16,3,'TO-6678',NULL);
/*!40000 ALTER TABLE `profesionales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `registros_auditoria`
--

DROP TABLE IF EXISTS `registros_auditoria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registros_auditoria` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `usuario_id` int DEFAULT NULL,
  `entidad` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entidad_id` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accion` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `carga` json DEFAULT NULL,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `registros_auditoria_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registros_auditoria`
--

LOCK TABLES `registros_auditoria` WRITE;
/*!40000 ALTER TABLE `registros_auditoria` DISABLE KEYS */;
/*!40000 ALTER TABLE `registros_auditoria` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'admin','Administrador','Acceso total al sistema','2025-09-11 02:35:53'),(2,'jefe','Jefe de departamento','Permisos para su departamento','2025-09-11 02:35:53'),(3,'profesional','Profesional','Acceso a su agenda y fichas','2025-09-11 02:35:53'),(4,'secretaria','Secretaría','Gestión de turnos y pagos','2025-09-11 02:35:53'),(5,'contable','Contable','Acceso a reportes y pagos','2025-09-11 02:35:53');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `servicios`
--

DROP TABLE IF EXISTS `servicios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `servicios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `duracion_default_min` int NOT NULL DEFAULT '30',
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `servicios`
--

LOCK TABLES `servicios` WRITE;
/*!40000 ALTER TABLE `servicios` DISABLE KEYS */;
INSERT INTO `servicios` VALUES (1,'PSICO_IND','Terapia Psicológica Individual',45,NULL),(2,'FONO_IND','Terapia Fonoaudiológica Individual',45,NULL),(3,'TO_IND','Terapia Ocupacional Individual',45,NULL),(4,'PSICOP_IND','Terapia Psicopedagógica Individual',45,NULL),(5,'EVAL_PSICO','Evaluación Psicodiagnóstica',60,NULL),(6,'EVAL_NEURO','Evaluación Neurolinguistica',60,NULL),(7,'TALLER_HS','Taller de Habilidades Sociales',90,NULL);
/*!40000 ALTER TABLE `servicios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `turno_profesionales`
--

DROP TABLE IF EXISTS `turno_profesionales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `turno_profesionales` (
  `turno_id` bigint NOT NULL,
  `profesional_id` int NOT NULL,
  `rol_en_turno` enum('responsable','asistente','observador') COLLATE utf8mb4_unicode_ci DEFAULT 'responsable',
  PRIMARY KEY (`turno_id`,`profesional_id`),
  KEY `idx_turno_profesional` (`profesional_id`),
  CONSTRAINT `turno_profesionales_ibfk_1` FOREIGN KEY (`turno_id`) REFERENCES `turnos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `turno_profesionales_ibfk_2` FOREIGN KEY (`profesional_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `turno_profesionales`
--

LOCK TABLES `turno_profesionales` WRITE;
/*!40000 ALTER TABLE `turno_profesionales` DISABLE KEYS */;
INSERT INTO `turno_profesionales` VALUES (1,1,'responsable'),(2,2,'responsable'),(3,5,'responsable'),(4,4,'responsable'),(5,9,'responsable'),(6,6,'responsable'),(7,7,'responsable'),(8,8,'responsable'),(9,13,'responsable'),(9,15,'asistente'),(10,11,'responsable'),(11,1,'responsable'),(12,10,'responsable'),(13,12,'responsable'),(14,15,'responsable'),(15,13,'responsable'),(16,1,'responsable'),(17,1,'responsable'),(18,1,'responsable'),(19,1,'responsable'),(20,1,'responsable'),(21,5,'responsable'),(22,5,'responsable'),(23,5,'responsable'),(24,5,'responsable'),(25,5,'responsable'),(26,2,'responsable'),(27,2,'responsable'),(28,2,'responsable'),(29,2,'responsable'),(30,2,'responsable'),(31,6,'responsable'),(32,6,'responsable'),(33,6,'responsable'),(34,6,'responsable'),(35,6,'responsable'),(36,3,'responsable'),(37,3,'responsable'),(38,3,'responsable'),(39,3,'responsable'),(40,3,'responsable'),(41,7,'responsable'),(42,7,'responsable'),(43,7,'responsable'),(44,7,'responsable'),(45,7,'responsable'),(46,4,'responsable'),(47,4,'responsable'),(48,4,'responsable'),(49,4,'responsable'),(50,4,'responsable'),(51,8,'responsable'),(52,8,'responsable'),(53,8,'responsable'),(54,8,'responsable'),(55,8,'responsable'),(56,9,'responsable'),(57,9,'responsable'),(58,9,'responsable'),(59,9,'responsable'),(60,13,'responsable'),(61,13,'responsable'),(62,13,'responsable'),(63,13,'responsable'),(64,13,'responsable'),(65,13,'responsable');
/*!40000 ALTER TABLE `turno_profesionales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `turnos`
--

DROP TABLE IF EXISTS `turnos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `turnos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `paciente_id` int NOT NULL,
  `servicio_id` int NOT NULL,
  `inicio` datetime NOT NULL,
  `fin` datetime NOT NULL,
  `duracion_min` int NOT NULL,
  `consultorio_id` int DEFAULT NULL,
  `estado` enum('pendiente','confirmado','completado','cancelado','no_presento') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `estado_pago` enum('pendiente','parcial','pagado','eximido') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `creado_por` int DEFAULT NULL,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `motivo_cancelacion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notas` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `servicio_id` (`servicio_id`),
  KEY `consultorio_id` (`consultorio_id`),
  KEY `creado_por` (`creado_por`),
  KEY `idx_inicio` (`inicio`),
  KEY `idx_estado` (`estado`),
  KEY `idx_turno_paciente` (`paciente_id`),
  KEY `idx_turno_inicio_estado` (`inicio`,`estado`),
  CONSTRAINT `turnos_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`id`),
  CONSTRAINT `turnos_ibfk_2` FOREIGN KEY (`servicio_id`) REFERENCES `servicios` (`id`),
  CONSTRAINT `turnos_ibfk_3` FOREIGN KEY (`consultorio_id`) REFERENCES `consultorios` (`id`),
  CONSTRAINT `turnos_ibfk_4` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `turnos`
--

LOCK TABLES `turnos` WRITE;
/*!40000 ALTER TABLE `turnos` DISABLE KEYS */;
INSERT INTO `turnos` VALUES (1,1,1,'2025-09-11 09:00:00','2025-09-11 09:45:00',45,1,'completado','pendiente',NULL,'2025-09-11 10:04:47','2025-09-11 22:12:00',NULL,'El paciente asistió y completó la sesión.'),(2,2,2,'2025-09-11 09:30:00','2025-09-11 10:15:00',45,2,'confirmado','pendiente',NULL,'2025-09-11 10:04:47','2025-09-11 10:04:47',NULL,NULL),(3,3,5,'2025-09-11 10:00:00','2025-09-11 11:00:00',60,1,'confirmado','pendiente',NULL,'2025-09-11 10:04:47','2025-09-11 10:04:47',NULL,NULL),(4,4,3,'2025-09-11 10:30:00','2025-09-11 11:15:00',45,3,'pendiente','pendiente',NULL,'2025-09-11 10:04:47','2025-09-11 10:04:47',NULL,NULL),(5,5,4,'2025-09-11 11:15:00','2025-09-11 12:00:00',45,1,'confirmado','pendiente',NULL,'2025-09-11 10:04:47','2025-09-11 10:04:47',NULL,NULL),(6,6,2,'2025-09-11 11:30:00','2025-09-11 12:15:00',45,7,'confirmado','pendiente',NULL,'2025-09-11 10:04:47','2025-09-11 10:04:47',NULL,NULL),(7,7,1,'2025-09-11 14:00:00','2025-09-11 14:45:00',45,4,'confirmado','pendiente',NULL,'2025-09-11 10:04:47','2025-09-11 10:04:47',NULL,NULL),(8,8,3,'2025-09-11 14:30:00','2025-09-11 15:15:00',45,6,'confirmado','pendiente',NULL,'2025-09-11 10:04:47','2025-09-11 10:04:47',NULL,NULL),(9,9,7,'2025-09-11 15:00:00','2025-09-11 16:30:00',90,11,'confirmado','pendiente',NULL,'2025-09-11 10:04:47','2025-09-11 10:04:47',NULL,NULL),(10,10,4,'2025-09-11 16:00:00','2025-09-11 16:45:00',45,5,'cancelado','pendiente',NULL,'2025-09-11 10:04:47','2025-09-11 10:04:47',NULL,NULL),(11,11,1,'2025-09-11 17:00:00','2025-09-11 17:45:00',45,1,'confirmado','pendiente',NULL,'2025-09-11 10:04:47','2025-09-11 10:04:47',NULL,NULL),(12,12,2,'2025-09-11 18:00:00','2025-09-11 18:45:00',45,2,'pendiente','pendiente',NULL,'2025-09-11 10:04:47','2025-09-11 10:04:47',NULL,NULL),(13,13,3,'2025-09-12 11:30:00','2025-09-12 12:29:37',45,3,'confirmado','pendiente',NULL,'2025-09-11 10:04:47','2025-09-13 01:19:17',NULL,NULL),(14,14,4,'2025-09-12 09:00:23','2025-09-12 09:45:00',45,3,'confirmado','pendiente',NULL,'2025-09-11 10:04:47','2025-09-13 01:16:13',NULL,NULL),(15,15,1,'2025-09-12 09:45:00','2025-09-12 10:15:00',45,3,'confirmado','pendiente',NULL,'2025-09-11 10:04:47','2025-09-13 01:20:07',NULL,NULL),(16,1,1,'2025-09-16 09:00:12','2025-09-16 09:44:48',45,1,'confirmado','pagado',NULL,'2025-09-16 08:44:09','2025-09-29 03:16:55',NULL,NULL),(17,2,1,'2025-09-16 09:45:00','2025-09-16 10:30:00',45,1,'pendiente','pendiente',NULL,'2025-09-16 08:44:09','2025-09-26 11:25:51',NULL,NULL),(18,3,1,'2025-09-16 10:30:00','2025-09-16 11:15:00',45,1,'no_presento','pendiente',NULL,'2025-09-16 08:44:09','2025-09-26 11:25:45',NULL,NULL),(19,4,1,'2025-09-16 11:15:00','2025-09-16 12:00:00',45,1,'completado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-29 01:33:26',NULL,NULL),(20,5,1,'2025-09-16 12:00:00','2025-09-16 12:45:00',45,1,'cancelado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-29 01:33:28',NULL,NULL),(21,6,1,'2025-09-16 14:00:00','2025-09-16 14:45:00',45,1,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(22,7,1,'2025-09-16 14:45:00','2025-09-16 15:30:00',45,1,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(23,8,1,'2025-09-16 15:30:00','2025-09-16 16:15:00',45,1,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(24,9,1,'2025-09-16 16:15:00','2025-09-16 17:00:00',45,1,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(25,10,1,'2025-09-16 17:00:00','2025-09-16 17:45:00',45,1,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(26,11,2,'2025-09-16 09:00:00','2025-09-16 09:45:00',45,2,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(27,12,2,'2025-09-16 09:45:00','2025-09-16 10:30:00',45,2,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(28,13,2,'2025-09-16 10:30:00','2025-09-16 11:15:00',45,2,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(29,14,2,'2025-09-16 11:15:00','2025-09-16 12:00:00',45,2,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(30,15,2,'2025-09-16 12:00:00','2025-09-16 12:30:00',45,2,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 09:14:14',NULL,NULL),(31,16,2,'2025-09-16 14:00:00','2025-09-16 14:45:00',45,2,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(32,17,2,'2025-09-16 14:45:00','2025-09-16 15:30:00',45,2,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(33,18,2,'2025-09-16 15:30:00','2025-09-16 16:15:00',45,2,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(34,19,2,'2025-09-16 16:15:00','2025-09-16 17:00:00',45,2,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(35,20,2,'2025-09-16 17:00:00','2025-09-16 17:45:00',45,2,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(36,21,4,'2025-09-16 09:00:00','2025-09-16 09:45:00',45,3,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(37,22,4,'2025-09-16 09:45:00','2025-09-16 10:30:00',45,3,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(38,23,4,'2025-09-16 10:30:00','2025-09-16 11:15:00',45,3,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(39,24,4,'2025-09-16 11:15:00','2025-09-16 12:00:00',45,3,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(40,25,4,'2025-09-16 12:00:00','2025-09-16 12:45:00',45,3,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(41,26,4,'2025-09-16 14:00:00','2025-09-16 14:45:00',45,3,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(42,27,4,'2025-09-16 14:45:00','2025-09-16 15:30:00',45,3,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(43,28,4,'2025-09-16 15:30:00','2025-09-16 16:15:00',45,3,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(44,29,4,'2025-09-16 16:15:00','2025-09-16 17:00:00',45,3,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(45,30,4,'2025-09-16 17:00:00','2025-09-16 17:45:00',45,3,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(46,1,3,'2025-09-16 09:00:00','2025-09-16 09:45:00',45,4,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(47,2,3,'2025-09-16 09:45:00','2025-09-16 10:30:00',45,4,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(48,3,3,'2025-09-16 10:30:00','2025-09-16 11:15:00',45,4,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(49,4,3,'2025-09-16 11:15:00','2025-09-16 12:00:00',45,4,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(50,5,3,'2025-09-16 12:00:00','2025-09-16 12:45:00',45,4,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(51,6,3,'2025-09-16 14:00:00','2025-09-16 14:45:00',45,4,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(52,7,3,'2025-09-16 14:45:00','2025-09-16 15:30:00',45,4,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(53,8,3,'2025-09-16 15:30:00','2025-09-16 16:15:00',45,4,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(54,9,3,'2025-09-16 16:15:00','2025-09-16 17:00:00',45,4,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(55,10,3,'2025-09-16 17:00:00','2025-09-16 17:45:00',45,4,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(56,11,5,'2025-09-16 09:00:00','2025-09-16 10:00:00',60,5,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(57,12,5,'2025-09-16 10:00:00','2025-09-16 11:00:00',60,5,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(58,13,5,'2025-09-16 11:00:00','2025-09-16 12:00:00',60,5,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(59,14,5,'2025-09-16 12:00:00','2025-09-16 13:00:00',60,5,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(60,15,5,'2025-09-16 14:00:00','2025-09-16 15:00:00',60,5,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(61,16,5,'2025-09-16 15:00:00','2025-09-16 16:00:00',60,5,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(62,17,5,'2025-09-16 16:00:00','2025-09-16 17:00:00',60,5,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(63,18,5,'2025-09-16 17:00:00','2025-09-16 18:00:00',60,5,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(64,19,5,'2025-09-16 18:00:00','2025-09-16 19:00:00',60,5,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL),(65,20,5,'2025-09-16 19:00:00','2025-09-16 20:00:00',60,5,'confirmado','pendiente',NULL,'2025-09-16 08:44:09','2025-09-16 08:44:09',NULL,NULL);
/*!40000 ALTER TABLE `turnos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rol_id` int NOT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre_mostrar` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `rol_id` (`rol_id`),
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,3,'0000000','noelia.urquiza@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Noelia Urquiza','3813390033',1,'2025-09-11 10:04:47','2025-09-29 04:28:11'),(2,3,'1111111','ivana.garcia@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Ivana Garcia','3813679893',1,'2025-09-11 10:04:47','2025-09-29 04:28:50'),(3,3,'2222222','daiana.nunez@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Daiana Nuñez','3865560493',1,'2025-09-11 10:04:47','2025-09-29 04:28:50'),(4,3,'3333333','alejandra.gonzalez@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Alejandra Gonzalez','3812235510',1,'2025-09-11 10:04:47','2025-09-29 04:28:50'),(5,3,'4444444','carla.rodriguez@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Carla Rodriguez','3811112222',1,'2025-09-11 10:04:47','2025-09-29 04:28:50'),(6,3,'5555555','marcos.fernandez@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Marcos Fernandez','3812223333',1,'2025-09-11 10:04:47','2025-09-29 04:28:50'),(7,3,'6666666','valentina.lopez@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Valentina Lopez','3813334444',1,'2025-09-11 10:04:47','2025-09-29 04:28:50'),(8,3,'7777777','javier.bustos@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Javier Bustos','3814445555',1,'2025-09-11 10:04:47','2025-09-29 04:28:50'),(9,3,'8888888','lucia.martinez@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Lucia Martinez','3815556666',1,'2025-09-11 10:04:47','2025-09-29 04:28:50'),(10,3,'99999999','daniel.castillo@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Daniel Castillo','3816667777',1,'2025-09-11 10:04:47','2025-09-29 04:28:50'),(11,3,'00000000','sofia.morales@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Sofia Morales','3817778888',1,'2025-09-11 10:04:47','2025-09-29 04:28:50'),(12,3,'11111111','pablo.navarro@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Pablo Navarro','3818889999',1,'2025-09-11 10:04:47','2025-09-29 04:28:50'),(13,3,'22222222','gabriela.rios@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Gabriela Rios','3819990000',1,'2025-09-11 10:04:47','2025-09-29 04:28:50'),(14,3,'33333333','facundo.vega@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Facundo Vega','3810001111',1,'2025-09-11 10:04:47','2025-09-29 04:28:50'),(15,3,'44444444','camila.vera@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Camila Vera','3811110000',1,'2025-09-11 10:04:47','2025-09-29 04:28:50'),(16,3,'55555555','martin.quiroga@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Martin Quiroga','3812221111',1,'2025-09-11 10:04:47','2025-09-29 04:28:50'),(17,3,'66666666',NULL,'$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe',NULL,NULL,1,'2025-09-29 04:32:12','2025-09-29 04:33:45');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'estimular'
--

--
-- Dumping routines for database 'estimular'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-29  4:37:48
