-- Estimular - Sample Data
-- Generated on 2025-09-11

-- Usar la base de datos
USE estimular;

-- Insertar 11 Consultorios
INSERT INTO `consultorios` (`id`, `nombre`, `ubicacion`) VALUES
(1, 'Consultorio 1', 'Ala Norte'),
(2, 'Consultorio 2', 'Ala Norte'),
(3, 'Consultorio 3', 'Ala Sur'),
(4, 'Consultorio 4', 'Ala Sur'),
(5, 'Consultorio 5', 'Ala Oeste'),
(6, 'Sala de Terapia Ocupacional', 'Planta Baja'),
(7, 'Sala de Fonoaudiología', 'Planta Baja'),
(8, 'Consultorio 8', 'Primer Piso'),
(9, 'Consultorio 9', 'Primer Piso'),
(10, 'Consultorio 10', 'Primer Piso'),
(11, 'Sala de Grupos', 'Anexo');

-- Insertar 30 Pacientes
INSERT INTO `pacientes` (`id`, `nombre`, `apellido`, `fecha_nacimiento`, `dni`, `cud`, `telefono`, `email`, `titular_nombre`, `obra_social`) VALUES
(1, 'Mateo', 'González', '2018-05-14', '55123456', NULL, '3815550101', 'mateo.gonzalez@example.com', 'Carlos González', 'Osde'),
(2, 'Sofía', 'Rodriguez', '2019-02-20', '56234567', 'CERT-1234', '3815550102', 'sofia.rodriguez@example.com', 'Laura Rodriguez', 'Swiss Medical'),
(3, 'Lucas', 'Gomez', '2017-11-30', '54345678', NULL, '3815550103', 'lucas.gomez@example.com', 'Fernando Gomez', 'Galeno'),
(4, 'Valentina', 'Fernandez', '2020-01-15', '57456789', NULL, '3815550104', 'valentina.fernandez@example.com', 'Maria Fernandez', 'Osde'),
(5, 'Benjamín', 'Lopez', '2018-08-19', '55567890', NULL, '3815550105', 'benjamin.lopez@example.com', 'Javier Lopez', 'Swiss Medical'),
(6, 'Julieta', 'Diaz', '2019-07-25', '56678901', 'CERT-5678', '3815550106', 'julieta.diaz@example.com', 'Ana Diaz', 'Galeno'),
(7, 'Bautista', 'Martinez', '2017-04-12', '54789012', NULL, '3815550107', 'bautista.martinez@example.com', 'Pedro Martinez', 'Osde'),
(8, 'Isabella', 'Perez', '2020-03-05', '57890123', NULL, '3815550108', 'isabella.perez@example.com', 'Lucia Perez', 'Swiss Medical'),
(9, 'Felipe', 'Sanchez', '2018-12-01', '55901234', NULL, '3815550109', 'felipe.sanchez@example.com', 'Marcos Sanchez', 'Galeno'),
(10, 'Catalina', 'Romero', '2019-09-10', '56012345', NULL, '3815550110', 'catalina.romero@example.com', 'Gabriela Romero', 'Osde'),
(11, 'Thiago', 'Garcia', '2017-06-22', '54123456', 'CERT-1111', '3815550111', 'thiago.garcia@example.com', 'Diego Garcia', 'Swiss Medical'),
(12, 'Emma', 'Sosa', '2020-04-18', '57234567', NULL, '3815550112', 'emma.sosa@example.com', 'Valeria Sosa', 'Galeno'),
(13, 'Santino', 'Torres', '2018-03-11', '55345678', NULL, '3815550113', 'santino.torres@example.com', 'Andres Torres', 'Osde'),
(14, 'Olivia', 'Ruiz', '2019-11-02', '56456789', NULL, '3815550114', 'olivia.ruiz@example.com', 'Paula Ruiz', 'Swiss Medical'),
(15, 'Joaquín', 'Ramirez', '2017-10-08', '54567890', NULL, '3815550115', 'joaquin.ramirez@example.com', 'Esteban Ramirez', 'Galeno'),
(16, 'Martina', 'Alvarez', '2020-06-29', '57678901', 'CERT-2222', '3815550116', 'martina.alvarez@example.com', 'Silvia Alvarez', 'Osde'),
(17, 'Lautaro', 'Benitez', '2018-01-03', '55789012', NULL, '3815550117', 'lautaro.benitez@example.com', 'Roberto Benitez', 'Swiss Medical'),
(18, 'Mía', 'Flores', '2019-08-14', '56890123', NULL, '3815550118', 'mia.flores@example.com', 'Carolina Flores', 'Galeno'),
(19, 'Agustín', 'Acosta', '2017-02-25', '54901234', NULL, '3815550119', 'agustin.acosta@example.com', 'Gustavo Acosta', 'Osde'),
(20, 'Alma', 'Medina', '2020-07-21', '57012345', NULL, '3815550120', 'alma.medina@example.com', 'Adriana Medina', 'Swiss Medical'),
(21, 'Dante', 'Herrera', '2018-09-09', '55112233', NULL, '3815550121', 'dante.herrera@example.com', 'Hernan Herrera', 'Galeno'),
(22, 'Helena', 'Suarez', '2019-04-03', '56223344', 'CERT-3333', '3815550122', 'helena.suarez@example.com', 'Sofia Suarez', 'Osde'),
(23, 'Ignacio', 'Gimenez', '2017-08-17', '54334455', NULL, '3815550123', 'ignacio.gimenez@example.com', 'Ivan Gimenez', 'Swiss Medical'),
(24, 'Ambar', 'Molina', '2020-09-12', '57445566', NULL, '3815550124', 'ambar.molina@example.com', 'Monica Molina', 'Galeno'),
(25, 'Nicolás', 'Castro', '2018-07-07', '55556677', NULL, '3815550125', 'nicolas.castro@example.com', 'Natalia Castro', 'Osde'),
(26, 'Juana', 'Ortiz', '2019-01-28', '56667788', NULL, '3815550126', 'juana.ortiz@example.com', 'Julia Ortiz', 'Swiss Medical'),
(27, 'León', 'Silva', '2017-12-13', '54778899', 'CERT-4444', '3815550127', 'leon.silva@example.com', 'Leonardo Silva', 'Galeno'),
(28, 'Regina', 'Rojas', '2020-10-30', '57889900', NULL, '3815550128', 'regina.rojas@example.com', 'Raquel Rojas', 'Osde'),
(29, 'Bruno', 'Nuñez', '2018-10-24', '55990011', NULL, '3815550129', 'bruno.nunez@example.com', 'Beatriz Nuñez', 'Swiss Medical'),
(30, 'Renata', 'Luna', '2019-05-09', '56001122', NULL, '3815550130', 'renata.luna@example.com', 'Romina Luna', 'Galeno');

-- Insertar 16 Profesionales (como usuarios y en la tabla de profesionales)
-- Rol 'profesional' tiene id 3 (según inserciones por defecto)
-- Departamentos: 'psico' (1), 'fono' (2), 'to' (3), 'psicop' (4)
INSERT INTO `usuarios` (`id`, `rol_id`, `username`, `email`, `password_hash`, `nombre_mostrar`, `telefono`) VALUES
(1, 3, 'nurquiza', 'noelia.urquiza@example.com', '$2b$10$fakedhash', 'Noelia Urquiza', '3813390033'),
(2, 3, 'igarcia', 'ivana.garcia@example.com', '$2b$10$fakedhash', 'Ivana Garcia', '3813679893'),
(3, 3, 'dnunez', 'daiana.nunez@example.com', '$2b$10$fakedhash', 'Daiana Nuñez', '3865560493'),
(4, 3, 'agonzalez', 'alejandra.gonzalez@example.com', '$2b$10$fakedhash', 'Alejandra Gonzalez', '3812235510'),
(5, 3, 'crodriguez', 'carla.rodriguez@example.com', '$2b$10$fakedhash', 'Carla Rodriguez', '3811112222'),
(6, 3, 'mfernandez', 'marcos.fernandez@example.com', '$2b$10$fakedhash', 'Marcos Fernandez', '3812223333'),
(7, 3, 'vlopez', 'valentina.lopez@example.com', '$2b$10$fakedhash', 'Valentina Lopez', '3813334444'),
(8, 3, 'jbustos', 'javier.bustos@example.com', '$2b$10$fakedhash', 'Javier Bustos', '3814445555'),
(9, 3, 'lmartinez', 'lucia.martinez@example.com', '$2b$10$fakedhash', 'Lucia Martinez', '3815556666'),
(10, 3, 'dcastillo', 'daniel.castillo@example.com', '$2b$10$fakedhash', 'Daniel Castillo', '3816667777'),
(11, 3, 'smorales', 'sofia.morales@example.com', '$2b$10$fakedhash', 'Sofia Morales', '3817778888'),
(12, 3, 'pnavarro', 'pablo.navarro@example.com', '$2b$10$fakedhash', 'Pablo Navarro', '3818889999'),
(13, 3, 'grios', 'gabriela.rios@example.com', '$2b$10$fakedhash', 'Gabriela Rios', '3819990000'),
(14, 3, 'fvega', 'facundo.vega@example.com', '$2b$10$fakedhash', 'Facundo Vega', '3810001111'),
(15, 3, 'cvera', 'camila.vera@example.com', '$2b$10$fakedhash', 'Camila Vera', '3811110000'),
(16, 3, 'mquiroga', 'martin.quiroga@example.com', '$2b$10$fakedhash', 'Martin Quiroga', '3812221111');

INSERT INTO `profesionales` (`id`, `departamento_id`, `matricula`) VALUES
(1, 1, 'PS-1122'), -- Noelia Urquiza, Psicología
(2, 2, 'FO-2233'), -- Ivana Garcia, Fonoaudiología
(3, 4, 'PP-3344'), -- Daiana Nuñez, Psicopedagogía
(4, 3, 'TO-4455'), -- Alejandra Gonzalez, Terapia Ocupacional
(5, 1, 'PS-5566'), -- Carla Rodriguez, Psicología
(6, 2, 'FO-6677'), -- Marcos Fernandez, Fonoaudiología
(7, 4, 'PP-7788'), -- Valentina Lopez, Psicopedagogía
(8, 3, 'TO-8899'), -- Javier Bustos, Terapia Ocupacional
(9, 1, 'PS-9900'), -- Lucia Martinez, Psicología
(10, 2, 'FO-0011'), -- Daniel Castillo, Fonoaudiología
(11, 4, 'PP-1123'), -- Sofia Morales, Psicopedagogía
(12, 3, 'TO-2234'), -- Pablo Navarro, Terapia Ocupacional
(13, 1, 'PS-3345'), -- Gabriela Rios, Psicología
(14, 2, 'FO-4456'), -- Facundo Vega, Fonoaudiología
(15, 4, 'PP-5567'), -- Camila Vera, Psicopedagogía
(16, 3, 'TO-6678'); -- Martin Quiroga, Terapia Ocupacional

-- Insertar Servicios
INSERT INTO `servicios` (`id`, `codigo`, `nombre`, `duracion_default_min`) VALUES
(1, 'PSICO_IND', 'Terapia Psicológica Individual', 45),
(2, 'FONO_IND', 'Terapia Fonoaudiológica Individual', 45),
(3, 'TO_IND', 'Terapia Ocupacional Individual', 45),
(4, 'PSICOP_IND', 'Terapia Psicopedagógica Individual', 45),
(5, 'EVAL_PSICO', 'Evaluación Psicodiagnóstica', 60),
(6, 'EVAL_NEURO', 'Evaluación Neurolinguistica', 60),
(7, 'TALLER_HS', 'Taller de Habilidades Sociales', 90);

-- Insertar Turnos para la semana actual (Jueves 11 de Septiembre, 2025)
-- Turnos para el Jueves 11/09/2025
INSERT INTO `turnos` (`id`, `paciente_id`, `servicio_id`, `inicio`, `fin`, `duracion_min`, `consultorio_id`, `estado`) VALUES
(1, 1, 1, '2025-09-11 09:00:00', '2025-09-11 09:45:00', 45, 1, 'confirmado'),
(2, 2, 2, '2025-09-11 09:30:00', '2025-09-11 10:15:00', 45, 2, 'confirmado'),
(3, 3, 5, '2025-09-11 10:00:00', '2025-09-11 11:00:00', 60, 1, 'confirmado'),
(4, 4, 3, '2025-09-11 10:30:00', '2025-09-11 11:15:00', 45, 3, 'pendiente'),
(5, 5, 4, '2025-09-11 11:15:00', '2025-09-11 12:00:00', 45, 1, 'confirmado'),
(6, 6, 2, '2025-09-11 11:30:00', '2025-09-11 12:15:00', 45, 7, 'confirmado'),
(7, 7, 1, '2025-09-11 14:00:00', '2025-09-11 14:45:00', 45, 4, 'confirmado'),
(8, 8, 3, '2025-09-11 14:30:00', '2025-09-11 15:15:00', 45, 6, 'confirmado'),
(9, 9, 7, '2025-09-11 15:00:00', '2025-09-11 16:30:00', 90, 11, 'confirmado'),
(10, 10, 4, '2025-09-11 16:00:00', '2025-09-11 16:45:00', 45, 5, 'cancelado'),
(11, 11, 1, '2025-09-11 17:00:00', '2025-09-11 17:45:00', 45, 1, 'confirmado'),
(12, 12, 2, '2025-09-11 18:00:00', '2025-09-11 18:45:00', 45, 2, 'pendiente');

-- Asignar profesionales a los turnos
INSERT INTO `turno_profesionales` (`turno_id`, `profesional_id`, `rol_en_turno`) VALUES
(1, 1, 'responsable'), -- Noelia (Psico) en C1
(2, 2, 'responsable'), -- Ivana (Fono) en C2
(3, 5, 'responsable'), -- Carla (Psico) en C1
(4, 4, 'responsable'), -- Alejandra (TO) en C3
(5, 9, 'responsable'), -- Lucia (Psico) en C1
(6, 6, 'responsable'), -- Marcos (Fono) en C7
(7, 7, 'responsable'), -- Valentina (Psicop) en C4
(8, 8, 'responsable'), -- Javier (TO) en C6
(9, 13, 'responsable'),-- Gabriela (Psico) en C11
(9, 15, 'asistente'),  -- Camila (Psicop) en C11
(10, 11, 'responsable'),-- Sofia (Psicop) en C5
(11, 1, 'responsable'), -- Noelia (Psico) en C1
(12, 10, 'responsable');-- Daniel (Fono) en C2

-- Turnos para el Viernes 12/09/2025
INSERT INTO `turnos` (`id`, `paciente_id`, `servicio_id`, `inicio`, `fin`, `duracion_min`, `consultorio_id`, `estado`) VALUES
(13, 13, 3, '2025-09-12 09:00:00', '2025-09-12 09:45:00', 45, 6, 'confirmado'),
(14, 14, 4, '2025-09-12 10:00:00', '2025-09-12 10:45:00', 45, 3, 'confirmado'),
(15, 15, 1, '2025-09-12 16:00:00', '2025-09-12 16:45:00', 45, 8, 'confirmado');

INSERT INTO `turno_profesionales` (`turno_id`, `profesional_id`, `rol_en_turno`) VALUES
(13, 12, 'responsable'), -- Pablo (TO) en C6
(14, 15, 'responsable'), -- Camila (Psicop) en C3
(15, 13, 'responsable'); -- Gabriela (Psico) en C8

COMMIT;