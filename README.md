
<img width="1797" height="862" alt="Captura de pantalla 2026-06-04 102426" src="https://github.com/user-attachments/assets/03bc6bb9-650e-4678-9979-a16f127e2bc6" />
<img width="1758" height="473" alt="Captura de pantalla 2026-06-04 102445" src="https://github.com/user-attachments/assets/3794de0f-b093-4cfb-9072-eae77cc3888c" />
# Sistema de Registro de Cupos y Control de Pagos - Bus 60 Asientos

Este es un sistema web interactivo desarrollado en **HTML5, CSS3 y JavaScript nativo (Vanilla JS)** para administrar las reservaciones de asientos y el estado de los pagos de un bus con capacidad de **60 personas**.

La aplicación está diseñada bajo el concepto de **Glassmorphism**, brindando una apariencia moderna, elegante y adaptable a cualquier tipo de pantalla (computadoras, tablets y móviles).

---

## 🚀 Características Principales

### 1. Gestión de Capacidad en Tiempo Real
* **Capacidad Máxima Fija:** El bus tiene exactamente **60 asientos** disponibles. El sistema prohíbe sobreventas y advierte si se intenta registrar un grupo que exceda los asientos libres.
* **Dashboard Estadístico:** Indicadores dinámicos que muestran en tiempo real:
  * Cupos ocupados / libres.
  * Porcentaje total de ocupación del bus (con indicador de color por nivel de llenado).
  * Monto total recaudado.
  * Monto pendiente por cobrar.

### 2. Registro y Cálculo de Grupos
* **Líder de Grupo y Acompañantes:** Se registra a una persona responsable y su cantidad de acompañantes. El sistema calcula los asientos necesarios como `Responsable (1) + Acompañantes`.
* **Cálculo de Costo Automático:** La tarifa por persona es de **$3.00 USD**. El costo del grupo se calcula automáticamente (`Asientos * $3`).
* **Asignación de Asientos Inteligente:** El sistema asigna automáticamente los primeros asientos libres del `1` al `60` al grupo registrado. Al eliminar un registro, estos asientos se liberan automáticamente para futuras reservas.

### 3. Control y Estados de Pago
* **Abonos:** Registra la cantidad de dinero aportado por el responsable.
* **Clasificación por Colores de Estado:**
  * 🟢 **Pagado Completo:** El abono cubre el total del costo (`Deuda = $0.00`).
  * 🟡 **Pago Parcial (Abonado):** Se realizó un abono mayor a $0.00, pero menor al costo total. Muestra la deuda pendiente.
  * 🔴 **Sin Pagar:** El abono registrado es de $0.00. La deuda es equivalente al costo total.
* Estos colores se reflejan tanto en la lista de pasajeros como en el mapa visual de asientos del autobús.

### 4. Mapa Visual Interactivo del Bus
* Representación gráfica de la distribución real de asientos de un autobús:
  * Dos filas de asientos a la izquierda, pasillo central, y dos filas a la derecha.
  * Icono de cabina del conductor y volante para simular la parte frontal del bus.
* **Interactividad Bidireccional:**
  * Al pasar el cursor sobre un pasajero en la lista, se iluminan los asientos que tiene asignados en el bus.
  * Al hacer clic en un asiento del bus, el sistema desplaza automáticamente la lista de pasajeros hasta encontrar a su responsable y lo resalta visualmente.
* **Información Detallada (Tooltip):** Al pasar el cursor sobre cualquier asiento ocupado, emerge una ventana flotante con el nombre del líder del grupo, el número de asiento individual y los detalles del pago de ese grupo.

### 5. Administración y Exportación de Datos
* **Buscador en Tiempo Real:** Filtra instantáneamente la lista de pasajeros por nombre y atenúa los asientos en el mapa del bus que no pertenecen a la búsqueda.
* **Edición Completa:** Permite modificar los datos del grupo (nombre y cantidad de personas), reubicando automáticamente sus asientos si cambia el tamaño del grupo.
* **Modal de Pago Rápido:** Actualiza el abono de dinero de forma rápida mediante un botón dedicado en la tabla sin alterar otros campos.
* **Exportar a CSV:** Descarga un archivo compatible con Microsoft Excel que incluye el listado completo, costos, abonos, deudas y asientos específicos asignados.
* **Exportar a PDF / Impresión:** Un botón dedicado activa una hoja de estilos de impresión (`@media print`) que elimina el menú lateral y el mapa del autobús, generando un documento PDF limpio, formal y de bajo consumo de tinta listo para descargar o imprimir físicamente.

---

## 🛠️ Tecnologías Utilizadas

* **HTML5:** Estructura semántica para una buena accesibilidad.
* **CSS3 (Variables & Grid/Flexbox):** Diseño Glassmorphism con bordes brillantes, desenfoque de fondo, fuentes modernas (Outfit) y transiciones fluidas.
* **JavaScript Nativo (ES6):** Comunicación asíncrona mediante peticiones HTTP (`fetch`), manipulación dinámica del DOM y lógica de control interactiva.
* **PHP 7.4+:** Servidor Backend para procesar las operaciones CRUD, estructurar respuestas JSON y realizar la asignación y validación de asientos en el lado del servidor.
* **MySQL:** Base de datos relacional para almacenar permanentemente la información de pasajeros, acompañantes, abonos y asientos asignados.

---

## 🖥️ Requisitos e Instalación

Para ejecutar la aplicación con persistencia en base de datos, se requiere un entorno de servidor web local. Recomendamos usar **XAMPP**.

### Paso 1: Configurar los Archivos
1. Asegúrate de que la carpeta del proyecto `Cupos_bus` esté en el directorio de publicaciones de tu servidor web local (por ejemplo, `C:\xampp\htdocs\Cupos_bus`).

### Paso 2: Iniciar Servidores en XAMPP
1. Abre el panel de control de XAMPP.
2. Inicia los módulos de **Apache** y **MySQL**.

### Paso 3: Crear e Importar la Base de Datos
1. Abre tu navegador e ingresa a **phpMyAdmin**: [http://localhost/phpmyadmin/](http://localhost/phpmyadmin/).
2. Crea una nueva base de datos llamada `cupos_bus_db`.
3. Selecciona la pestaña **Importar** (Import).
4. Selecciona el archivo **`database.sql`** ubicado dentro del directorio de la aplicación (`C:\xampp\htdocs\Cupos_bus\database.sql`).
5. Haz clic en **Importar** (o Continuar) en la parte inferior para estructurar la tabla `registrations`.

> [!NOTE]
> **Credenciales por Defecto:**
> El archivo `db.php` está configurado con las credenciales estándares de XAMPP (`host: localhost`, `user: root`, `password: ""` (vacío)). Si has modificado la clave de root o tu puerto de base de datos en tu entorno local, puedes editarlos abriendo el archivo [db.php](file:///c:/xampp2/htdocs/Cupos_bus/db.php).

### Paso 4: Abrir la Aplicación
1. Ingresa a la aplicación en tu navegador web usando la dirección del servidor local:
   👉 **[http://localhost/Cupos_bus/](http://localhost/Cupos_bus/)**

---

## 📊 Reglas de Negocio Aplicadas

1. **Tarifa por persona:** $3.00 USD.
2. **Capacidad límite:** 60 personas.
3. **Cálculo de cupo:** `1 (Líder del grupo) + X (Acompañantes)`.
4. **Validación de abono:** El monto del abono no puede exceder el costo total del grupo (se alerta al usuario en caso de intento de sobrepago).
