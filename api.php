<?php
// Configurar cabeceras de respuesta para JSON
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

// Importar conexión a base de datos
require_once 'db.php';

// Limite de asientos constante
define('BUS_CAPACITY', 60);
define('PRICE_PER_PERSON', 3.00);

// Detectar el método y la acción requerida
$action = $_GET['action'] ?? 'list';
$input = json_decode(file_get_contents('php://input'), true) ?? [];

// Si es una petición OPTIONS (Preflight en CORS), terminar aquí
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// FUNCIONES AUXILIARES DE ASIGNACIÓN DE ASIENTOS
function getOccupiedSeatsList($pdo, $skipId = null) {
    $occupied = [];
    $query = "SELECT id, seats FROM registrations";
    
    if ($skipId !== null) {
        $stmt = $pdo->prepare("SELECT id, seats FROM registrations WHERE id != ?");
        $stmt->execute([$skipId]);
    } else {
        $stmt = $pdo->query($query);
    }
    
    $rows = $stmt->fetchAll();
    foreach ($rows as $row) {
        if (!empty($row['seats'])) {
            $seatsArr = explode(',', $row['seats']);
            foreach ($seatsArr as $s) {
                $occupied[] = (int)$s;
            }
        }
    }
    return $occupied;
}

function allocateSeats($pdo, $count, $skipId = null) {
    $occupied = getOccupiedSeatsList($pdo, $skipId);
    $allocated = [];
    
    for ($seat = 1; $seat <= BUS_CAPACITY; $seat++) {
        if (!in_array($seat, $occupied)) {
            $allocated[] = $seat;
            if (count($allocated) === $count) {
                return $allocated;
            }
        }
    }
    return null; // No hay suficientes asientos libres
}

// CONTROLADOR DE ACCIONES
try {
    switch ($action) {
        case 'list':
            // Listar todos los registros
            $stmt = $pdo->query("SELECT * FROM registrations ORDER BY id ASC");
            $rows = $stmt->fetchAll();
            
            $registrations = [];
            foreach ($rows as $row) {
                $registrations[] = [
                    'id' => (string)$row['id'],
                    'name' => $row['name'],
                    'companions' => (int)$row['companions'],
                    'totalSeats' => (int)$row['total_seats'],
                    'paidAmount' => (float)$row['paid_amount'],
                    'seats' => !empty($row['seats']) ? array_map('intval', explode(',', $row['seats'])) : [],
                    'createdAt' => $row['created_at']
                ];
            }
            
            echo json_encode($registrations);
            break;
            
        case 'create':
            // Crear registro
            $name = trim($input['name'] ?? '');
            $companions = isset($input['companions']) ? (int)$input['companions'] : 0;
            $paidAmount = isset($input['paidAmount']) ? (float)$input['paidAmount'] : 0.00;
            
            if (empty($name)) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'El nombre del responsable es requerido.']);
                exit;
            }
            
            $totalSeats = $companions + 1;
            
            // Validar capacidad
            $occupiedCount = count(getOccupiedSeatsList($pdo));
            $spaceLeft = BUS_CAPACITY - $occupiedCount;
            
            if ($totalSeats > $spaceLeft) {
                http_response_code(400);
                echo json_encode([
                    'status' => 'error', 
                    'message' => "No hay suficientes asientos libres. Quedan {$spaceLeft} cupos y solicitaste {$totalSeats}."
                ]);
                exit;
            }
            
            // Asignar asientos
            $allocatedSeats = allocateSeats($pdo, $totalSeats);
            if ($allocatedSeats === null) {
                http_response_code(500);
                echo json_encode(['status' => 'error', 'message' => 'Error al asignar asientos en el servidor.']);
                exit;
            }
            
            $seatsString = implode(',', $allocatedSeats);
            
            // Insertar en la base de datos
            $stmt = $pdo->prepare("INSERT INTO registrations (name, companions, total_seats, paid_amount, seats) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$name, $companions, $totalSeats, $paidAmount, $seatsString]);
            
            echo json_encode([
                'status' => 'success',
                'message' => 'Registro creado correctamente.',
                'id' => $pdo->lastInsertId()
            ]);
            break;
            
        case 'update':
            // Modificar registro completo
            $id = isset($input['id']) ? (int)$input['id'] : null;
            $name = trim($input['name'] ?? '');
            $companions = isset($input['companions']) ? (int)$input['companions'] : 0;
            $paidAmount = isset($input['paidAmount']) ? (float)$input['paidAmount'] : 0.00;
            
            if (!$id || empty($name)) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'ID y nombre son obligatorios para actualizar.']);
                exit;
            }
            
            $totalSeats = $companions + 1;
            
            // Validar capacidad excluyendo los asientos actuales del registro
            $occupiedCount = count(getOccupiedSeatsList($pdo, $id));
            $spaceLeft = BUS_CAPACITY - $occupiedCount;
            
            if ($totalSeats > $spaceLeft) {
                http_response_code(400);
                echo json_encode([
                    'status' => 'error', 
                    'message' => "No hay suficientes asientos disponibles. Quedan {$spaceLeft} cupos y solicitaste {$totalSeats}."
                ]);
                exit;
            }
            
            // Asignar nuevos asientos
            $allocatedSeats = allocateSeats($pdo, $totalSeats, $id);
            if ($allocatedSeats === null) {
                http_response_code(500);
                echo json_encode(['status' => 'error', 'message' => 'Error al reasignar asientos en el servidor.']);
                exit;
            }
            
            $seatsString = implode(',', $allocatedSeats);
            
            // Actualizar base de datos
            $stmt = $pdo->prepare("UPDATE registrations SET name = ?, companions = ?, total_seats = ?, paid_amount = ?, seats = ? WHERE id = ?");
            $stmt->execute([$name, $companions, $totalSeats, $paidAmount, $seatsString, $id]);
            
            echo json_encode(['status' => 'success', 'message' => 'Registro actualizado correctamente.']);
            break;
            
        case 'update_payment':
            // Actualizar sólo el abono (desde modal)
            $id = isset($input['id']) ? (int)$input['id'] : null;
            $paidAmount = isset($input['paidAmount']) ? (float)$input['paidAmount'] : 0.00;
            
            if (!$id) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'ID de pasajero es requerido.']);
                exit;
            }
            
            $stmt = $pdo->prepare("UPDATE registrations SET paid_amount = ? WHERE id = ?");
            $stmt->execute([$paidAmount, $id]);
            
            echo json_encode(['status' => 'success', 'message' => 'Abono actualizado correctamente.']);
            break;
            
        case 'delete':
            // Eliminar registro
            $id = isset($input['id']) ? (int)$input['id'] : null;
            
            if (!$id) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'ID de pasajero es requerido para eliminar.']);
                exit;
            }
            
            $stmt = $pdo->prepare("DELETE FROM registrations WHERE id = ?");
            $stmt->execute([$id]);
            
            echo json_encode(['status' => 'success', 'message' => 'Registro eliminado correctamente.']);
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Acción no encontrada.']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Ocurrió un error en el servidor: ' . $e->getMessage()
    ]);
}
