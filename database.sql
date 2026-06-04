-- Creación de la base de datos
CREATE DATABASE IF NOT EXISTS `cupos_bus_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `cupos_bus_db`;

-- Creación de la tabla de registros
CREATE TABLE IF NOT EXISTS `registrations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `companions` INT NOT NULL DEFAULT 0,
  `total_seats` INT NOT NULL,
  `paid_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `seats` VARCHAR(255) NOT NULL, -- Guardará los asientos como texto (ej. "1,2,3")
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
