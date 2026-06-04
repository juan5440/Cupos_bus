<?php
// Configuración de la base de datos (Parámetros por defecto de XAMPP)
$host = 'localhost';
$dbname = 'cupos_bus_db';
$username = 'root';
$password = '';

try {
    // Establecer conexión PDO con soporte UTF-8
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    // Si la conexión falla, retornar un JSON con error 500
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Error de conexión a la base de datos MySQL: ' . $e->getMessage()
    ]);
    exit;
}
