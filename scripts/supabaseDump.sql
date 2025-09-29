-- ####################################################################
-- Translated Schema for Supabase/PostgreSQL
-- ####################################################################

-- --------------------------------------------------------------------
-- 1. ENUM Type Definitions
-- --------------------------------------------------------------------

CREATE TYPE disponibilidad_tipo AS ENUM ('disponible', 'bloqueado');
CREATE TYPE pago_metodo AS ENUM ('efectivo', 'tarjeta', 'transferencia', 'mercadopago', 'otro');
CREATE TYPE pago_estado AS ENUM ('pendiente', 'completado', 'fallido', 'reembolsado');
CREATE TYPE turno_profesional_rol AS ENUM ('responsable', 'asistente', 'observador');
CREATE TYPE turno_estado AS ENUM ('pendiente', 'confirmado', 'completado', 'cancelado', 'no_presento');
CREATE TYPE turno_pago_estado AS ENUM ('pendiente', 'parcial', 'pagado', 'eximido');

-- --------------------------------------------------------------------
-- 2. Trigger function for ON UPDATE CURRENT_TIMESTAMP behavior
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_actualizado_en_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.actualizado_en = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';


-- --------------------------------------------------------------------
-- 3. Table Definitions and Data Insertion
-- --------------------------------------------------------------------

--
-- Table structure for table "roles"
--
DROP TABLE IF EXISTS "roles" CASCADE;
CREATE TABLE "roles" (
  "id" SERIAL PRIMARY KEY,
  "codigo" varchar(30) NOT NULL UNIQUE,
  "nombre" varchar(100) NOT NULL,
  "descripcion" text,
  "creado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Dumping data for table "roles"
--
INSERT INTO "roles" ("id", "codigo", "nombre", "descripcion", "creado_en") VALUES
(1,'admin','Administrador','Acceso total al sistema','2025-09-11 02:35:53'),
(2,'jefe','Jefe de departamento','Permisos para su departamento','2025-09-11 02:35:53'),
(3,'profesional','Profesional','Acceso a su agenda y fichas','2025-09-11 02:35:53'),
(4,'secretaria','Secretaría','Gestión de turnos y pagos','2025-09-11 02:35:53'),
(5,'contable','Contable','Acceso a reportes y pagos','2025-09-11 02:35:53');


--
-- Table structure for table "usuarios"
--
DROP TABLE IF EXISTS "usuarios" CASCADE;
CREATE TABLE "usuarios" (
  "id" SERIAL PRIMARY KEY,
  "rol_id" int NOT NULL REFERENCES "roles"("id"),
  "username" varchar(100) NOT NULL UNIQUE,
  "email" varchar(150) UNIQUE,
  "password_hash" varchar(255),
  "nombre_mostrar" varchar(150),
  "telefono" varchar(40),
  "activo" boolean DEFAULT true,
  "creado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "actualizado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Dumping data for table "usuarios"
--
INSERT INTO "usuarios" ("id", "rol_id", "username", "email", "password_hash", "nombre_mostrar", "telefono", "activo", "creado_en", "actualizado_en") VALUES
(1,3,'0000000','noelia.urquiza@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Noelia Urquiza','3813390033',true,'2025-09-11 10:04:47','2025-09-29 04:28:11'),
(2,3,'1111111','ivana.garcia@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Ivana Garcia','3813679893',true,'2025-09-11 10:04:47','2025-09-29 04:28:50'),
(3,3,'2222222','daiana.nunez@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Daiana Nuñez','3865560493',true,'2025-09-11 10:04:47','2025-09-29 04:28:50'),
(4,3,'3333333','alejandra.gonzalez@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Alejandra Gonzalez','3812235510',true,'2025-09-11 10:04:47','2025-09-29 04:28:50'),
(5,3,'4444444','carla.rodriguez@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Carla Rodriguez','3811112222',true,'2025-09-11 10:04:47','2025-09-29 04:28:50'),
(6,3,'5555555','marcos.fernandez@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Marcos Fernandez','3812223333',true,'2025-09-11 10:04:47','2025-09-29 04:28:50'),
(7,3,'6666666','valentina.lopez@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Valentina Lopez','3813334444',true,'2025-09-11 10:04:47','2025-09-29 04:28:50'),
(8,3,'7777777','javier.bustos@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Javier Bustos','3814445555',true,'2025-09-11 10:04:47','2025-09-29 04:28:50'),
(9,3,'8888888','lucia.martinez@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Lucia Martinez','3815556666',true,'2025-09-11 10:04:47','2025-09-29 04:28:50'),
(10,3,'99999999','daniel.castillo@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Daniel Castillo','3816667777',true,'2025-09-11 10:04:47','2025-09-29 04:28:50'),
(11,3,'00000000','sofia.morales@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Sofia Morales','3817778888',true,'2025-09-11 10:04:47','2025-09-29 04:28:50'),
(12,3,'11111111','pablo.navarro@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Pablo Navarro','3818889999',true,'2025-09-11 10:04:47','2025-09-29 04:28:50'),
(13,3,'22222222','gabriela.rios@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Gabriela Rios','3819990000',true,'2025-09-11 10:04:47','2025-09-29 04:28:50'),
(14,3,'33333333','facundo.vega@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Facundo Vega','3810001111',true,'2025-09-11 10:04:47','2025-09-29 04:28:50'),
(15,3,'44444444','camila.vera@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Camila Vera','3811110000',true,'2025-09-11 10:04:47','2025-09-29 04:28:50'),
(16,3,'55555555','martin.quiroga@estimular.com','$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe','Martin Quiroga','3812221111',true,'2025-09-11 10:04:47','2025-09-29 04:28:50'),
(17,3,'66666666',NULL,'$2b$10$bb4.JAVZIuo4t6SfqlfCO.LdCVG2fsW.zbjlKOhz97myy8BUvfwHe',NULL,NULL,true,'2025-09-29 04:32:12','2025-09-29 04:33:45');
SELECT setval(pg_get_serial_sequence('"usuarios"', 'id'), 18, false);


--
-- Table structure for table "departamentos"
--
DROP TABLE IF EXISTS "departamentos" CASCADE;
CREATE TABLE "departamentos" (
  "id" SERIAL PRIMARY KEY,
  "codigo" varchar(50) UNIQUE,
  "nombre" varchar(150) NOT NULL
);

--
-- Dumping data for table "departamentos"
--
INSERT INTO "departamentos" ("id", "codigo", "nombre") VALUES
(1,'psico','Psicología'),
(2,'fono','Fonoaudiología'),
(3,'to','Terapia Ocupacional'),
(4,'psicop','Psicopedagogía');
SELECT setval(pg_get_serial_sequence('"departamentos"', 'id'), 5, false);


--
-- Table structure for table "profesionales"
--
DROP TABLE IF EXISTS "profesionales" CASCADE;
CREATE TABLE "profesionales" (
  "id" int PRIMARY KEY REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "departamento_id" int REFERENCES "departamentos"("id"),
  "matricula" varchar(100),
  "bio" text
);

--
-- Dumping data for table "profesionales"
--
INSERT INTO "profesionales" ("id", "departamento_id", "matricula", "bio") VALUES
(1,1,'PS-1122',NULL),
(2,2,'FO-2233',NULL),
(3,4,'PP-3344',NULL),
(4,3,'TO-4455',NULL),
(5,1,'PS-5566',NULL),
(6,2,'FO-6677',NULL),
(7,4,'PP-7788',NULL),
(8,3,'TO-8899',NULL),
(9,1,'PS-9900',NULL),
(10,2,'FO-0011',NULL),
(11,4,'PP-1123',NULL),
(12,3,'TO-2234',NULL),
(13,1,'PS-3345',NULL),
(14,2,'FO-4456',NULL),
(15,4,'PP-5567',NULL),
(16,3,'TO-6678',NULL);


--
-- Table structure for table "pacientes"
--
DROP TABLE IF EXISTS "pacientes" CASCADE;
CREATE TABLE "pacientes" (
  "id" SERIAL PRIMARY KEY,
  "nombre" varchar(120),
  "apellido" varchar(120),
  "fecha_nacimiento" date,
  "dni" varchar(50),
  "cud" varchar(100),
  "telefono" varchar(40),
  "email" varchar(150),
  "titular_nombre" varchar(150),
  "obra_social" varchar(150),
  "creado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "actualizado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Dumping data for table "pacientes"
--
INSERT INTO "pacientes" ("id", "nombre", "apellido", "fecha_nacimiento", "dni", "cud", "telefono", "email", "titular_nombre", "obra_social") VALUES
(1,'Mateo','González','2018-05-14','55123456',NULL,'3815550101','mateo.gonzalez@email.com','Carlos González','Osde'),
(2,'Sofía','Rodriguez','2019-02-20','56234567','CERT-1234','3815550102','sofia.rodriguez@email.com','Laura Rodriguez','Swiss Medical'),
(3,'Lucas','Gomez','2017-11-30','54345678',NULL,'3815550103','lucas.gomez@email.com','Fernando Gomez','Galeno'),
(4,'Valentina','Fernandez','2020-01-15','57456789',NULL,'3815550104','valentina.fernandez@email.com','Maria Fernandez','Osde'),
(5,'Benjamín','Lopez','2018-08-19','55567890',NULL,'3815550105','benjamin.lopez@email.com','Javier Lopez','Swiss Medical'),
(6,'Julieta','Diaz','2019-07-25','56678901','CERT-5678','3815550106','julieta.diaz@email.com','Ana Diaz','Galeno'),
(7,'Bautista','Martinez','2017-04-12','54789012',NULL,'3815550107','bautista.martinez@email.com','Pedro Martinez','Osde'),
(8,'Isabella','Perez','2020-03-05','57890123',NULL,'3815550108','isabella.perez@email.com','Lucia Perez','Swiss Medical'),
(9,'Felipe','Sanchez','2018-12-01','55901234',NULL,'3815550109','felipe.sanchez@email.com','Marcos Sanchez','Galeno'),
(10,'Catalina','Romero','2019-09-10','56012345',NULL,'3815550110','catalina.romero@email.com','Gabriela Romero','Osde'),
(11,'Thiago','Garcia','2017-06-22','54123456','CERT-1111','3815550111','thiago.garcia@email.com','Diego Garcia','Swiss Medical'),
(12,'Emma','Sosa','2020-04-18','57234567',NULL,'3815550112','emma.sosa@email.com','Valeria Sosa','Galeno'),
(13,'Santino','Torres','2018-03-11','55345678',NULL,'3815550113','santino.torres@email.com','Andres Torres','Osde'),
(14,'Olivia','Ruiz','2019-11-02','56456789',NULL,'3815550114','olivia.ruiz@email.com','Paula Ruiz','Swiss Medical'),
(15,'Joaquín','Ramirez','2017-10-08','54567890',NULL,'3815550115','joaquin.ramirez@email.com','Esteban Ramirez','Galeno'),
(16,'Martina','Alvarez','2020-06-29','57678901','CERT-2222','3815550116','martina.alvarez@email.com','Silvia Alvarez','Osde'),
(17,'Lautaro','Benitez','2018-01-03','55789012',NULL,'3815550117','lautaro.benitez@email.com','Roberto Benitez','Swiss Medical'),
(18,'Mía','Flores','2019-08-14','56890123',NULL,'3815550118','mia.flores@email.com','Carolina Flores','Galeno'),
(19,'Agustín','Acosta','2017-02-25','54901234',NULL,'3815550119','agustin.acosta@email.com','Gustavo Acosta','Osde'),
(20,'Alma','Medina','2020-07-21','57012345',NULL,'3815550120','alma.medina@email.com','Adriana Medina','Swiss Medical'),
(21,'Dante','Herrera','2018-09-09','55112233',NULL,'3815550121','dante.herrera@email.com','Hernan Herrera','Galeno'),
(22,'Helena','Suarez','2019-04-03','56223344','CERT-3333','3815550122','helena.suarez@email.com','Sofia Suarez','Osde'),
(23,'Ignacio','Gimenez','2017-08-17','54334455',NULL,'3815550123','ignacio.gimenez@email.com','Ivan Gimenez','Swiss Medical'),
(24,'Ambar','Molina','2020-09-12','57445566',NULL,'3815550124','ambar.molina@email.com','Monica Molina','Galeno'),
(25,'Nicolás','Castro','2018-07-07','55556677',NULL,'3815550125','nicolas.castro@email.com','Natalia Castro','Osde'),
(26,'Juana','Ortiz','2019-01-28','56667788',NULL,'3815550126','juana.ortiz@email.com','Julia Ortiz','Swiss Medical'),
(27,'León','Silva','2017-12-13','54778899','CERT-4444','3815550127','leon.silva@email.com','Leonardo Silva','Galeno'),
(28,'Regina','Rojas','2020-10-30','57889900',NULL,'3815550128','regina.rojas@email.com','Raquel Rojas','Osde'),
(29,'Bruno','Nuñez','2018-10-24','55990011',NULL,'3815550129','bruno.nunez@email.com','Beatriz Nuñez','Swiss Medical'),
(30,'Renata','Luna','2019-05-09','56001122',NULL,'3815550130','renata.luna@email.com','Romina Luna','Galeno');
SELECT setval(pg_get_serial_sequence('"pacientes"', 'id'), 31, false);


--
-- Table structure for table "consultorios"
--
DROP TABLE IF EXISTS "consultorios" CASCADE;
CREATE TABLE "consultorios" (
  "id" SERIAL PRIMARY KEY,
  "nombre" varchar(100) NOT NULL,
  "ubicacion" varchar(255)
);

--
-- Dumping data for table "consultorios"
--
INSERT INTO "consultorios" ("id", "nombre", "ubicacion") VALUES
(1,'Consultorio 1','Ala Norte'),
(2,'Consultorio 2','Ala Norte'),
(3,'Consultorio 3','Ala Sur'),
(4,'Consultorio 4','Ala Sur'),
(5,'Consultorio 5','Ala Oeste'),
(6,'Sala de Terapia Ocupacional','Planta Baja'),
(7,'Sala de Fonoaudiología','Planta Baja'),
(8,'Consultorio 8','Primer Piso'),
(9,'Consultorio 9','Primer Piso'),
(10,'Consultorio 10','Primer Piso'),
(11,'Sala de Grupos','Anexo');
SELECT setval(pg_get_serial_sequence('"consultorios"', 'id'), 12, false);


--
-- Table structure for table "servicios"
--
DROP TABLE IF EXISTS "servicios" CASCADE;
CREATE TABLE "servicios" (
  "id" SERIAL PRIMARY KEY,
  "codigo" varchar(80) UNIQUE,
  "nombre" varchar(150) NOT NULL,
  "duracion_default_min" int NOT NULL DEFAULT '30',
  "descripcion" text
);

--
-- Dumping data for table "servicios"
--
INSERT INTO "servicios" ("id", "codigo", "nombre", "duracion_default_min") VALUES
(1,'PSICO_IND','Terapia Psicológica Individual',45),
(2,'FONO_IND','Terapia Fonoaudiológica Individual',45),
(3,'TO_IND','Terapia Ocupacional Individual',45),
(4,'PSICOP_IND','Terapia Psicopedagógica Individual',45),
(5,'EVAL_PSICO','Evaluación Psicodiagnóstica',60),
(6,'EVAL_NEURO','Evaluación Neurolinguistica',60),
(7,'TALLER_HS','Taller de Habilidades Sociales',90);
SELECT setval(pg_get_serial_sequence('"servicios"', 'id'), 8, false);


--
-- Table structure for table "turnos"
--
DROP TABLE IF EXISTS "turnos" CASCADE;
CREATE TABLE "turnos" (
  "id" BIGSERIAL PRIMARY KEY,
  "paciente_id" int NOT NULL REFERENCES "pacientes"("id"),
  "servicio_id" int NOT NULL REFERENCES "servicios"("id"),
  "inicio" timestamp without time zone NOT NULL,
  "fin" timestamp without time zone NOT NULL,
  "duracion_min" int NOT NULL,
  "consultorio_id" int REFERENCES "consultorios"("id"),
  "estado" turno_estado DEFAULT 'pendiente',
  "estado_pago" turno_pago_estado DEFAULT 'pendiente',
  "creado_por" int REFERENCES "usuarios"("id"),
  "creado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "actualizado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "motivo_cancelacion" varchar(255),
  "notas" text
);

--
-- Dumping data for table "turnos"
--
INSERT INTO "turnos" ("id", "paciente_id", "servicio_id", "inicio", "fin", "duracion_min", "consultorio_id", "estado", "estado_pago", "creado_por", "motivo_cancelacion", "notas") VALUES
(1,1,1,'2025-09-11 09:00:00','2025-09-11 09:45:00',45,1,'completado','pendiente',NULL,NULL,'El paciente asistió y completó la sesión.'),
(2,2,2,'2025-09-11 09:30:00','2025-09-11 10:15:00',45,2,'confirmado','pendiente',NULL,NULL,NULL),
(3,3,5,'2025-09-11 10:00:00','2025-09-11 11:00:00',60,1,'confirmado','pendiente',NULL,NULL,NULL),
(4,4,3,'2025-09-11 10:30:00','2025-09-11 11:15:00',45,3,'pendiente','pendiente',NULL,NULL,NULL),
(5,5,4,'2025-09-11 11:15:00','2025-09-11 12:00:00',45,1,'confirmado','pendiente',NULL,NULL,NULL),
(6,6,2,'2025-09-11 11:30:00','2025-09-11 12:15:00',45,7,'confirmado','pendiente',NULL,NULL,NULL),
(7,7,1,'2025-09-11 14:00:00','2025-09-11 14:45:00',45,4,'confirmado','pendiente',NULL,NULL,NULL),
(8,8,3,'2025-09-11 14:30:00','2025-09-11 15:15:00',45,6,'confirmado','pendiente',NULL,NULL,NULL),
(9,9,7,'2025-09-11 15:00:00','2025-09-11 16:30:00',90,11,'confirmado','pendiente',NULL,NULL,NULL),
(10,10,4,'2025-09-11 16:00:00','2025-09-11 16:45:00',45,5,'cancelado','pendiente',NULL,NULL,NULL),
(11,11,1,'2025-09-11 17:00:00','2025-09-11 17:45:00',45,1,'confirmado','pendiente',NULL,NULL,NULL),
(12,12,2,'2025-09-11 18:00:00','2025-09-11 18:45:00',45,2,'pendiente','pendiente',NULL,NULL,NULL),
(13,13,3,'2025-09-12 11:30:00','2025-09-12 12:29:37',45,3,'confirmado','pendiente',NULL,NULL,NULL),
(14,14,4,'2025-09-12 09:00:23','2025-09-12 09:45:00',45,3,'confirmado','pendiente',NULL,NULL,NULL),
(15,15,1,'2025-09-12 09:45:00','2025-09-12 10:15:00',45,3,'confirmado','pendiente',NULL,NULL,NULL),
(16,1,1,'2025-09-16 09:00:12','2025-09-16 09:44:48',45,1,'confirmado','pagado',NULL,NULL,NULL),
(17,2,1,'2025-09-16 09:45:00','2025-09-16 10:30:00',45,1,'pendiente','pendiente',NULL,NULL,NULL),
(18,3,1,'2025-09-16 10:30:00','2025-09-16 11:15:00',45,1,'no_presento','pendiente',NULL,NULL,NULL),
(19,4,1,'2025-09-16 11:15:00','2025-09-16 12:00:00',45,1,'completado','pendiente',NULL,NULL,NULL),
(20,5,1,'2025-09-16 12:00:00','2025-09-16 12:45:00',45,1,'cancelado','pendiente',NULL,NULL,NULL),
(21,6,1,'2025-09-16 14:00:00','2025-09-16 14:45:00',45,1,'confirmado','pendiente',NULL,NULL,NULL),
(22,7,1,'2025-09-16 14:45:00','2025-09-16 15:30:00',45,1,'confirmado','pendiente',NULL,NULL,NULL),
(23,8,1,'2025-09-16 15:30:00','2025-09-16 16:15:00',45,1,'confirmado','pendiente',NULL,NULL,NULL),
(24,9,1,'2025-09-16 16:15:00','2025-09-16 17:00:00',45,1,'confirmado','pendiente',NULL,NULL,NULL),
(25,10,1,'2025-09-16 17:00:00','2025-09-16 17:45:00',45,1,'confirmado','pendiente',NULL,NULL,NULL),
(26,11,2,'2025-09-16 09:00:00','2025-09-16 09:45:00',45,2,'confirmado','pendiente',NULL,NULL,NULL),
(27,12,2,'2025-09-16 09:45:00','2025-09-16 10:30:00',45,2,'confirmado','pendiente',NULL,NULL,NULL),
(28,13,2,'2025-09-16 10:30:00','2025-09-16 11:15:00',45,2,'confirmado','pendiente',NULL,NULL,NULL),
(29,14,2,'2025-09-16 11:15:00','2025-09-16 12:00:00',45,2,'confirmado','pendiente',NULL,NULL,NULL),
(30,15,2,'2025-09-16 12:00:00','2025-09-16 12:30:00',45,2,'confirmado','pendiente',NULL,NULL,NULL),
(31,16,2,'2025-09-16 14:00:00','2025-09-16 14:45:00',45,2,'confirmado','pendiente',NULL,NULL,NULL),
(32,17,2,'2025-09-16 14:45:00','2025-09-16 15:30:00',45,2,'confirmado','pendiente',NULL,NULL,NULL),
(33,18,2,'2025-09-16 15:30:00','2025-09-16 16:15:00',45,2,'confirmado','pendiente',NULL,NULL,NULL),
(34,19,2,'2025-09-16 16:15:00','2025-09-16 17:00:00',45,2,'confirmado','pendiente',NULL,NULL,NULL),
(35,20,2,'2025-09-16 17:00:00','2025-09-16 17:45:00',45,2,'confirmado','pendiente',NULL,NULL,NULL),
(36,21,4,'2025-09-16 09:00:00','2025-09-16 09:45:00',45,3,'confirmado','pendiente',NULL,NULL,NULL),
(37,22,4,'2025-09-16 09:45:00','2025-09-16 10:30:00',45,3,'confirmado','pendiente',NULL,NULL,NULL),
(38,23,4,'2025-09-16 10:30:00','2025-09-16 11:15:00',45,3,'confirmado','pendiente',NULL,NULL,NULL),
(39,24,4,'2025-09-16 11:15:00','2025-09-16 12:00:00',45,3,'confirmado','pendiente',NULL,NULL,NULL),
(40,25,4,'2025-09-16 12:00:00','2025-09-16 12:45:00',45,3,'confirmado','pendiente',NULL,NULL,NULL),
(41,26,4,'2025-09-16 14:00:00','2025-09-16 14:45:00',45,3,'confirmado','pendiente',NULL,NULL,NULL),
(42,27,4,'2025-09-16 14:45:00','2025-09-16 15:30:00',45,3,'confirmado','pendiente',NULL,NULL,NULL),
(43,28,4,'2025-09-16 15:30:00','2025-09-16 16:15:00',45,3,'confirmado','pendiente',NULL,NULL,NULL),
(44,29,4,'2025-09-16 16:15:00','2025-09-16 17:00:00',45,3,'confirmado','pendiente',NULL,NULL,NULL),
(45,30,4,'2025-09-16 17:00:00','2025-09-16 17:45:00',45,3,'confirmado','pendiente',NULL,NULL,NULL),
(46,1,3,'2025-09-16 09:00:00','2025-09-16 09:45:00',45,4,'confirmado','pendiente',NULL,NULL,NULL),
(47,2,3,'2025-09-16 09:45:00','2025-09-16 10:30:00',45,4,'confirmado','pendiente',NULL,NULL,NULL),
(48,3,3,'2025-09-16 10:30:00','2025-09-16 11:15:00',45,4,'confirmado','pendiente',NULL,NULL,NULL),
(49,4,3,'2025-09-16 11:15:00','2025-09-16 12:00:00',45,4,'confirmado','pendiente',NULL,NULL,NULL),
(50,5,3,'2025-09-16 12:00:00','2025-09-16 12:45:00',45,4,'confirmado','pendiente',NULL,NULL,NULL),
(51,6,3,'2025-09-16 14:00:00','2025-09-16 14:45:00',45,4,'confirmado','pendiente',NULL,NULL,NULL),
(52,7,3,'2025-09-16 14:45:00','2025-09-16 15:30:00',45,4,'confirmado','pendiente',NULL,NULL,NULL),
(53,8,3,'2025-09-16 15:30:00','2025-09-16 16:15:00',45,4,'confirmado','pendiente',NULL,NULL,NULL),
(54,9,3,'2025-09-16 16:15:00','2025-09-16 17:00:00',45,4,'confirmado','pendiente',NULL,NULL,NULL),
(55,10,3,'2025-09-16 17:00:00','2025-09-16 17:45:00',45,4,'confirmado','pendiente',NULL,NULL,NULL),
(56,11,5,'2025-09-16 09:00:00','2025-09-16 10:00:00',60,5,'confirmado','pendiente',NULL,NULL,NULL),
(57,12,5,'2025-09-16 10:00:00','2025-09-16 11:00:00',60,5,'confirmado','pendiente',NULL,NULL,NULL),
(58,13,5,'2025-09-16 11:00:00','2025-09-16 12:00:00',60,5,'confirmado','pendiente',NULL,NULL,NULL),
(59,14,5,'2025-09-16 12:00:00','2025-09-16 13:00:00',60,5,'confirmado','pendiente',NULL,NULL,NULL),
(60,15,5,'2025-09-16 14:00:00','2025-09-16 15:00:00',60,5,'confirmado','pendiente',NULL,NULL,NULL),
(61,16,5,'2025-09-16 15:00:00','2025-09-16 16:00:00',60,5,'confirmado','pendiente',NULL,NULL,NULL),
(62,17,5,'2025-09-16 16:00:00','2025-09-16 17:00:00',60,5,'confirmado','pendiente',NULL,NULL,NULL),
(63,18,5,'2025-09-16 17:00:00','2025-09-16 18:00:00',60,5,'confirmado','pendiente',NULL,NULL,NULL),
(64,19,5,'2025-09-16 18:00:00','2025-09-16 19:00:00',60,5,'confirmado','pendiente',NULL,NULL,NULL),
(65,20,5,'2025-09-16 19:00:00','2025-09-16 20:00:00',60,5,'confirmado','pendiente',NULL,NULL,NULL);
SELECT setval(pg_get_serial_sequence('"turnos"', 'id'), 66, false);


--
-- Table structure for table "asistencia"
--
DROP TABLE IF EXISTS "asistencia" CASCADE;
CREATE TABLE "asistencia" (
  "id" BIGSERIAL PRIMARY KEY,
  "turno_id" bigint NOT NULL REFERENCES "turnos"("id") ON DELETE CASCADE,
  "profesional_id" int NOT NULL REFERENCES "usuarios"("id"),
  "paciente_presente" boolean DEFAULT false,
  "ingreso_en" timestamp without time zone,
  "salida_en" timestamp without time zone,
  "notas" text,
  "registrado_por" int REFERENCES "usuarios"("id"),
  "registrado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Table structure for table "disponibilidades"
--
DROP TABLE IF EXISTS "disponibilidades" CASCADE;
CREATE TABLE "disponibilidades" (
  "id" BIGSERIAL PRIMARY KEY,
  "profesional_id" int NOT NULL REFERENCES "usuarios"("id"),
  "inicio" timestamp without time zone NOT NULL,
  "fin" timestamp without time zone NOT NULL,
  "tipo" disponibilidad_tipo DEFAULT 'disponible',
  "nota" varchar(255),
  "creado_por" int REFERENCES "usuarios"("id"),
  "creado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Table structure for table "documentos"
--
DROP TABLE IF EXISTS "documentos" CASCADE;
CREATE TABLE "documentos" (
  "id" BIGSERIAL PRIMARY KEY,
  "paciente_id" int REFERENCES "pacientes"("id"),
  "turno_id" bigint REFERENCES "turnos"("id"),
  "nombre_archivo" varchar(255),
  "ruta_archivo" varchar(500),
  "mime" varchar(100),
  "subido_por" int REFERENCES "usuarios"("id"),
  "subido_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Table structure for table "lista_espera"
--
DROP TABLE IF EXISTS "lista_espera" CASCADE;
CREATE TABLE "lista_espera" (
  "id" BIGSERIAL PRIMARY KEY,
  "paciente_id" int NOT NULL REFERENCES "pacientes"("id"),
  "servicio_id" int REFERENCES "servicios"("id"),
  "profesional_preferido_id" int REFERENCES "usuarios"("id"),
  "solicitado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  "notificado" boolean DEFAULT false
);


--
-- Table structure for table "notificaciones"
--
DROP TABLE IF EXISTS "notificaciones" CASCADE;
CREATE TABLE "notificaciones" (
  "id" BIGSERIAL PRIMARY KEY,
  "profesional_id" int NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "mensaje" varchar(255) NOT NULL,
  "turno_id" bigint REFERENCES "turnos"("id") ON DELETE SET NULL,
  "creado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Dumping data for table "notificaciones"
--
INSERT INTO "notificaciones" ("id", "profesional_id", "mensaje", "turno_id", "creado_en") VALUES
(1,1,'El estado del turno para undefined ha cambiado a: CONFIRMADO',18,'2025-09-17 14:28:58'),
(2,1,'El estado del turno para undefined ha cambiado a: PENDIENTE',16,'2025-09-17 14:29:04'),
(3,1,'El estado del turno para undefined ha cambiado a: COMPLETADO',18,'2025-09-17 14:29:24'),
(4,1,'El estado del turno para undefined ha cambiado a: CONFIRMADO',18,'2025-09-17 14:29:53'),
(5,1,'El estado del turno para undefined ha cambiado a: COMPLETADO',16,'2025-09-17 14:30:22'),
(6,1,'El estado del turno para undefined ha cambiado a: CONFIRMADO',19,'2025-09-17 14:30:40'),
(7,1,'El estado del turno para Lucas ha cambiado a: COMPLETADO',18,'2025-09-17 14:59:12'),
(8,1,'El estado del turno para Mateo ha cambiado a: CONFIRMADO',16,'2025-09-17 21:05:20'),
(9,1,'El estado del turno para Mateo ha cambiado a: COMPLETADO',16,'2025-09-17 21:05:47'),
(10,1,'El estado del turno para Lucas ha cambiado a: CONFIRMADO',18,'2025-09-17 21:08:53'),
(11,1,'El estado del turno para Lucas ha cambiado a: NO_PRESENTO',18,'2025-09-17 21:09:38'),
(12,1,'El estado del turno para Sofía ha cambiado a: COMPLETADO',17,'2025-09-17 21:10:01'),
(13,1,'El estado del turno para Mateo ha cambiado a: CONFIRMADO',16,'2025-09-17 21:10:09'),
(14,1,'El estado del turno para Mateo ha cambiado a: COMPLETADO',16,'2025-09-17 21:10:23'),
(15,1,'El estado del turno para Sofía ha cambiado a: CANCELADO',17,'2025-09-17 21:15:25'),
(16,1,'El estado del turno para Sofía ha cambiado a: PENDIENTE',17,'2025-09-17 21:15:37'),
(17,1,'Llego Valentina Fernandez',19,'2025-09-17 21:33:08'),
(18,1,'El estado del turno para Valentina Fernandez ha cambiado a: CONFIRMADO',19,'2025-09-17 21:33:21'),
(19,1,'Llego Valentina Fernandez',19,'2025-09-18 09:10:28'),
(20,1,'El estado del turno para Valentina Fernandez ha cambiado a: CONFIRMADO',19,'2025-09-18 09:11:33'),
(21,1,'Llego Valentina Fernandez',19,'2025-09-18 09:36:40'),
(22,1,'El estado del turno para Valentina Fernandez ha cambiado a: CONFIRMADO',19,'2025-09-18 09:37:07'),
(23,1,'Llego Valentina Fernandez',19,'2025-09-18 10:08:35'),
(24,1,'El estado del turno para Valentina Fernandez ha cambiado a: CONFIRMADO',19,'2025-09-18 10:08:53'),
(25,1,'Llego Valentina Fernandez',19,'2025-09-18 10:09:12'),
(26,1,'El estado del turno para Valentina Fernandez ha cambiado a: CONFIRMADO',19,'2025-09-18 10:10:29'),
(27,1,'El estado del turno para Mateo González ha cambiado a: CONFIRMADO',16,'2025-09-26 10:38:58'),
(28,1,'Llego Valentina Fernandez',19,'2025-09-26 11:26:08'),
(29,1,'Llego Mateo González',16,'2025-09-29 01:33:38'),
(30,1,'El estado del turno para Mateo González ha cambiado a: CONFIRMADO',16,'2025-09-29 01:33:44'),
(31,1,'Llego Mateo González',16,'2025-09-29 02:19:13'),
(32,1,'El estado del turno para Mateo González ha cambiado a: CONFIRMADO',16,'2025-09-29 02:19:22'),
(33,1,'Llego Mateo González',16,'2025-09-29 03:16:43'),
(34,1,'El estado del turno para Mateo González ha cambiado a: CONFIRMADO',16,'2025-09-29 03:16:55');
SELECT setval(pg_get_serial_sequence('"notificaciones"', 'id'), 35, false);


--
-- Table structure for table "pagos"
--
DROP TABLE IF EXISTS "pagos" CASCADE;
CREATE TABLE "pagos" (
  "id" BIGSERIAL PRIMARY KEY,
  "turno_id" bigint REFERENCES "turnos"("id") ON DELETE SET NULL,
  "paciente_id" int NOT NULL REFERENCES "pacientes"("id"),
  "monto" decimal(12,2) NOT NULL,
  "moneda" varchar(10) DEFAULT 'ARS',
  "metodo" pago_metodo DEFAULT 'efectivo',
  "estado" pago_estado DEFAULT 'completado',
  "comprobante" varchar(120),
  "creado_por" int REFERENCES "usuarios"("id"),
  "creado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- Dumping data for table "pagos"
--
INSERT INTO "pagos" ("id", "turno_id", "paciente_id", "monto", "estado") VALUES
(1,16,1,2500.00,'completado'),
(2,17,2,2500.00,'pendiente'),
(3,18,3,2500.00,'pendiente'),
(4,19,4,2500.00,'pendiente'),
(5,20,5,2500.00,'pendiente'),
(6,21,6,2500.00,'pendiente'),
(7,22,7,2500.00,'pendiente'),
(8,23,8,2500.00,'pendiente'),
(9,24,9,2500.00,'pendiente'),
(10,25,10,2500.00,'pendiente'),
(11,26,11,2200.00,'pendiente'),
(12,27,12,2200.00,'pendiente'),
(13,28,13,2200.00,'pendiente'),
(14,29,14,2200.00,'pendiente'),
(15,30,15,2200.00,'pendiente'),
(16,31,16,2200.00,'pendiente'),
(17,32,17,2200.00,'pendiente'),
(18,33,18,2200.00,'pendiente'),
(19,34,19,2200.00,'pendiente'),
(20,35,20,2200.00,'pendiente'),
(21,36,21,2800.00,'pendiente'),
(22,37,22,2800.00,'pendiente'),
(23,38,23,2800.00,'pendiente'),
(24,39,24,2800.00,'pendiente'),
(25,40,25,2800.00,'pendiente'),
(26,41,26,2800.00,'pendiente'),
(27,42,27,2800.00,'pendiente'),
(28,43,28,2800.00,'pendiente'),
(29,44,29,2800.00,'pendiente'),
(30,45,30,2800.00,'pendiente'),
(31,46,1,3000.00,'pendiente'),
(32,47,2,3000.00,'pendiente'),
(33,48,3,3000.00,'pendiente'),
(34,49,4,3000.00,'pendiente'),
(35,50,5,3000.00,'pendiente'),
(36,51,6,3000.00,'pendiente'),
(37,52,7,3000.00,'pendiente'),
(38,53,8,3000.00,'pendiente'),
(39,54,9,3000.00,'pendiente'),
(40,55,10,3000.00,'pendiente'),
(41,56,11,3500.00,'pendiente'),
(42,57,12,3500.00,'pendiente'),
(43,58,13,3500.00,'pendiente'),
(44,59,14,3500.00,'pendiente'),
(45,60,15,3500.00,'pendiente'),
(46,61,16,3500.00,'pendiente'),
(47,62,17,3500.00,'pendiente'),
(48,63,18,3500.00,'pendiente'),
(49,64,19,3500.00,'pendiente'),
(50,65,20,3500.00,'pendiente'),
(51,1,1,2500.00,'pendiente'),
(52,2,2,2200.00,'pendiente'),
(53,3,3,3500.00,'pendiente'),
(54,4,4,3000.00,'pendiente'),
(55,5,5,2800.00,'pendiente'),
(56,6,6,2200.00,'pendiente'),
(57,7,7,2500.00,'pendiente'),
(58,8,8,3000.00,'pendiente'),
(59,9,9,4000.00,'pendiente'),
(60,10,10,2800.00,'pendiente'),
(61,11,11,2500.00,'pendiente'),
(62,12,12,2200.00,'pendiente'),
(63,13,13,3000.00,'pendiente'),
(64,14,14,2800.00,'pendiente'),
(65,15,15,2500.00,'pendiente');
SELECT setval(pg_get_serial_sequence('"pagos"', 'id'), 66, false);


--
-- Table structure for table "registros_auditoria"
--
DROP TABLE IF EXISTS "registros_auditoria" CASCADE;
CREATE TABLE "registros_auditoria" (
  "id" BIGSERIAL PRIMARY KEY,
  "usuario_id" int REFERENCES "usuarios"("id"),
  "entidad" varchar(80),
  "entidad_id" varchar(80),
  "accion" varchar(80),
  "carga" jsonb,
  "creado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Table structure for table "turno_profesionales"
--
DROP TABLE IF EXISTS "turno_profesionales" CASCADE;
CREATE TABLE "turno_profesionales" (
  "turno_id" bigint NOT NULL REFERENCES "turnos"("id") ON DELETE CASCADE,
  "profesional_id" int NOT NULL REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  "rol_en_turno" turno_profesional_rol DEFAULT 'responsable',
  PRIMARY KEY ("turno_id", "profesional_id")
);

--
-- Dumping data for table "turno_profesionales"
--
INSERT INTO "turno_profesionales" ("turno_id", "profesional_id", "rol_en_turno") VALUES
(1,1,'responsable'),(2,2,'responsable'),(3,5,'responsable'),(4,4,'responsable'),(5,9,'responsable'),
(6,6,'responsable'),(7,7,'responsable'),(8,8,'responsable'),(9,13,'responsable'),(9,15,'asistente'),
(10,11,'responsable'),(11,1,'responsable'),(12,10,'responsable'),(13,12,'responsable'),(14,15,'responsable'),
(15,13,'responsable'),(16,1,'responsable'),(17,1,'responsable'),(18,1,'responsable'),(19,1,'responsable'),
(20,1,'responsable'),(21,5,'responsable'),(22,5,'responsable'),(23,5,'responsable'),(24,5,'responsable'),
(25,5,'responsable'),(26,2,'responsable'),(27,2,'responsable'),(28,2,'responsable'),(29,2,'responsable'),
(30,2,'responsable'),(31,6,'responsable'),(32,6,'responsable'),(33,6,'responsable'),(34,6,'responsable'),
(35,6,'responsable'),(36,3,'responsable'),(37,3,'responsable'),(38,3,'responsable'),(39,3,'responsable'),
(40,3,'responsable'),(41,7,'responsable'),(42,7,'responsable'),(43,7,'responsable'),(44,7,'responsable'),
(45,7,'responsable'),(46,4,'responsable'),(47,4,'responsable'),(48,4,'responsable'),(49,4,'responsable'),
(50,4,'responsable'),(51,8,'responsable'),(52,8,'responsable'),(53,8,'responsable'),(54,8,'responsable'),
(55,8,'responsable'),(56,9,'responsable'),(57,9,'responsable'),(58,9,'responsable'),(59,9,'responsable'),
(60,13,'responsable'),(61,13,'responsable'),(62,13,'responsable'),(63,13,'responsable'),(64,13,'responsable'),
(65,13,'responsable');


-- --------------------------------------------------------------------
-- 4. Trigger Creations
-- --------------------------------------------------------------------

CREATE TRIGGER update_pacientes_actualizado_en
BEFORE UPDATE ON "pacientes"
FOR EACH ROW
EXECUTE PROCEDURE update_actualizado_en_column();

CREATE TRIGGER update_turnos_actualizado_en
BEFORE UPDATE ON "turnos"
FOR EACH ROW
EXECUTE PROCEDURE update_actualizado_en_column();

CREATE TRIGGER update_usuarios_actualizado_en
BEFORE UPDATE ON "usuarios"
FOR EACH ROW
EXECUTE PROCEDURE update_actualizado_en_column();


-- --------------------------------------------------------------------
-- 5. Index Creations
-- --------------------------------------------------------------------

CREATE INDEX ON "asistencia" ("turno_id");
CREATE INDEX ON "asistencia" ("profesional_id");
CREATE INDEX ON "asistencia" ("registrado_por");

CREATE INDEX ON "disponibilidades" ("profesional_id");
CREATE INDEX ON "disponibilidades" ("creado_por");

CREATE INDEX ON "documentos" ("paciente_id");
CREATE INDEX ON "documentos" ("turno_id");
CREATE INDEX ON "documentos" ("subido_por");

CREATE INDEX ON "lista_espera" ("paciente_id");
CREATE INDEX ON "lista_espera" ("servicio_id");
CREATE INDEX ON "lista_espera" ("profesional_preferido_id");

CREATE INDEX ON "notificaciones" ("profesional_id");
CREATE INDEX ON "notificaciones" ("turno_id");

CREATE INDEX ON "pagos" ("turno_id");
CREATE INDEX ON "pagos" ("paciente_id");
CREATE INDEX ON "pagos" ("creado_por");

CREATE INDEX ON "profesionales" ("departamento_id");
CREATE INDEX ON "registros_auditoria" ("usuario_id");
CREATE INDEX ON "usuarios" ("rol_id");

CREATE INDEX idx_turno_profesional ON "turno_profesionales" ("profesional_id");

CREATE INDEX idx_turno_servicio ON "turnos" ("servicio_id");
CREATE INDEX idx_turno_consultorio ON "turnos" ("consultorio_id");
CREATE INDEX idx_turno_creado_por ON "turnos" ("creado_por");
CREATE INDEX idx_turno_inicio ON "turnos" ("inicio");
CREATE INDEX idx_turno_estado ON "turnos" ("estado");
CREATE INDEX idx_turno_paciente ON "turnos" ("paciente_id");
CREATE INDEX idx_turno_inicio_estado ON "turnos" ("inicio", "estado");
