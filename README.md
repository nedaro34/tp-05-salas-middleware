# Trabajo práctico 05

## Descripción

Este proyecto es el quinto trabajo práctico solicitado en el módulo 3 de la Diplomatura en Desarrollo Web Full Stack con Javascript dictada por el Nodo Tecnológico de Catamarca.

Este README.md fue realizado parcialmente con IA para acortar tiempos, por lo que puede contener algo de inconsistencias o ambigüedad en la redacción.

Aquellos apartados que fueron solicitados que se expliquen con palabras propias, fueron redactados manualmente usando conocimiento propio.

Esta aplicación web fue desarrollada con **Node.js, Express y EJS** para consultar salas de estudio y reservar temporalmente un turno.

Fue desarrollada con el fin de aplicar un **pipeline de middleware en Express**, utilizando middleware incorporado, de terceros y personalizado para registrar, identificar, medir, preparar y validar solicitudes antes de ejecutar los handlers finales. El trabajo requiere Morgan, parsers, recursos estáticos, middleware global, middleware de router, validación del POST, un `express.Router()` montado bajo `/reservas`, respuestas 400, una página 404 final y datos únicamente en memoria. 

## Instalación

Clonar el repositorio y acceder a la carpeta del proyecto:


```bash
git clone https://github.com/nedaro34/tp-05-salas-middleware
cd tp-05-salas-middleware
```

Instala las dependencias con:
```bash
npm install
```

Dependencias:

- `express`
- `ejs`
- `express-ejs-layouts`
- `morgan`


## Ejecución

Para iniciar la aplicación ejecuta:
```bash
npm start
```

Para comprobar la sintaxis:
```bash
npm run check
```

Para mantener el servidor activo mientras realizas cambios:
```bash
npm run watch
```

## Rutas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Página de inicio |
| GET | `/estado` | Estado del servicio en JSON |
| GET | `/reservas` | Listado de reservas |
| GET | `/reservas/nueva` | Formulario de nueva reserva |
| GET | `/reservas/:id` | Detalle de una reserva |
| POST | `/reservas` | Validación y creación |

### Inicio
Explica el propósito del sitio e incluye enlaces al listado y al formulario.

### Estado
Responde JSON con el servicio, cantidad de reservas e identificador de solicitud. Por ejemplo:
```json
{
  "servicio": "activo",
  "reservas": 4,
  "solicitudId": "BIB-0001"
}
```

### Listado
Muestra todas las reservas, un mensaje alternativo si la colección está vacía, contiene enlaces a los detalles de cada reserva y al formulario para crear reservas nuevas.

### Detalle
Busca por `id`, muestra todos los datos de la reserva con ese identificador y responde con una página `404` cuando la reserva no existe.

### Formulario
Incluye campos para crear una reserva nueva: estudiante, email, sala, fecha, turno y cantidad de personas. Cada campo esta etiquetado y posee `id` y `name`.

### POST
El POST utiliza un middleware de validación y un handler final diferente:

```js
reservasRouter.post("/", validarReserva, crearReserva);
```

El validador responde `400` al recibir datos inválidos o prepara los datos y llama a `next()`. El handler agrega la reserva en memoria y redirige a `/reservas`.

## Pipeline de middleware

El orden global es:

```text
Morgan
   ↓
identificarSolicitud
   ↓
medirDuracion
   ↓
expressLayouts
   ↓
express.static
   ↓
express.urlencoded
   ↓
express.json
   ↓
rutas de aplicación
   ↓
router de reservas
   ↓
página 404
```

### Diagrama de POST válido

```text
POST /reservas

morgan("dev")
   ↓
identificarSolicitud
   ↓
medirDuracion
   ↓
expressLayouts
   ↓
express.static
   ↓
express.urlencoded
   ↓
reservasRouter
   ↓
prepararReservas
   ↓
validarReserva
   ↓
crearReserva
   ↓
302 /reservas
   ↓
finish: id + estado + duración
```

### Diagrama de POST inválido

```text
POST /reservas

morgan("dev")
   ↓
identificarSolicitud
   ↓
medirDuracion
   ↓
expressLayouts
   ↓
express.static
   ↓
express.urlencoded
   ↓
reservasRouter
   ↓
prepararReservas
   ↓
validarReserva
   ↓
400 /reservas/nueva
   ↓
fin del ciclo
```

El ciclo de POST inválido se repetirá indefinidamente mientras continúe ingresando datos inválidos. La última función ejecutada es `validarReserva()`.


## Alcance de cada función

### Morgan

Middleware de terceros utilizado con:

```js
app.use(morgan("dev"));
```

Registra las solicitudes y permite comprobar estados 200, 302, 400 y 404 durante las pruebas.

### `identificarSolicitud`

Middleware personalizado global que genera IDs consecutivos como `BIB-0001`, `BIB-0002`, etc. El valor se guarda en `res.locals.solicitudId`, por lo que queda disponible en las vistas y en `/estado`.

### `medirDuracion`

Middleware personalizado global que guarda el tiempo inicial, registra un listener `finish` sobre `response`, ejecuta `next()` y, al finalizar la respuesta, calcula e imprime ID, método, `request.originalUrl`, `response.statusCode` y duración. La medición se realiza después de finalizar la respuesta.

### `express.static`

Middleware incorporado de Express que sirve los recursos estáticos ubicados en `public/`.

### `express.urlencoded`

Parser incorporado que procesa los datos enviados mediante formularios y los hace disponibles mediante `request.body`.

### `express.json`

Parser incorporado para solicitudes cuyo cuerpo contiene JSON.

### `reservasRouter`

Se crea y monta así:

```js
const reservasRouter = express.Router();
aplicacion.use("/reservas", reservasRouter);
```

Las rutas internas son relativas al montaje: `/`, `/nueva` y `/:id`.

### `prepararAreaReservas`

Middleware de router que define:

```js
res.locals.seccion = "Solicitud de Reservas";
```

### `validarReserva`

Middleware de ruta que:

1. Aplica `trim()` a textos.
2. Convierte `personas` con `Number`.
3. Comprueba campos obligatorios.
4. Comprueba que la sala sea permitida.
5. Comprueba que el turno sea permitido.
6. Comprueba un entero entre 1 y 6.
7. Responde `400` y conserva los valores ante error.
8. Muestra el error con `role="alert"`.
9. Prepara `request.reservaValidada` y llama a `next()` si los datos son correctos.

La validación HTML no reemplaza la validación del servidor.

### `crearReserva`

Handler final que utiliza `request.reservaValidada`, agrega la reserva al arreglo en memoria y redirige a `/reservas`. No repite la validación completa.

### Página 404

Se registra después de todas las rutas y del router:

```js
aplicacion.use((request, response) => {
    response.status(404).render("no-encontrado", {
        titulo: "Página no encontrada",
        mensaje: "La dirección solicitada no existe.",
    });
});
```

No se llama a `next()` después del render.

## Validación

Las salas permitidas son:

```js
const salasPermitidas = ["Sala Norte", "Sala Sur", "Sala Multimedia"];
```

Los turnos permitidos son:

```js
const turnosPermitidos = ["Mañana", "Tarde", "Noche"];
```

La cantidad de personas debe ser un entero entre 1 y 6.

El proyecto define al menos cuatro reservas iniciales propias, con `id`, `estudiante`, `email`, `sala`, `fecha`, `turno` y `personas`. Los IDs son únicos y crecientes.

## Pruebas manuales

| Caso | Estado esperado | Evidencia |
|---|---:|---|
| Inicio | 200 | Navegación y solicitud ID |
| Estado | 200 | JSON con cantidad e ID |
| Listado | 200 | Cuatro o más reservas |
| Estado vacío | 200 | Mensaje alternativo |
| Formulario | 200 | Controles etiquetados |
| Detalle válido | 200 | Datos completos |
| Detalle inexistente | 404 | Página HTML |
| Campos vacíos | 400 | Error y valores conservados |
| Sala no permitida | 400 | No se crea registro |
| Turno no permitido | 400 | No se crea registro |
| Email sin @ | 400 | No se crea registro |
| Personas igual a 0 | 400 | No se crea registro |
| Personas igual a 7 | 400 | No se crea registro |
| Reserva válida | 302 y luego 200 | Nueva tarjeta |
| URL inexistente | 404 | Middleware final |
| Reinicio | 200 | Regreso a datos iniciales |

## Persistencia temporal

Las reservas iniciales se definen en `src/index.js`. Las nuevas reservas se almacenan solamente en memoria y no se escriben en archivos ni en una base de datos. Por eso, al reiniciar el servidor desaparecen las altas realizadas mediante el formulario y vuelven a quedar únicamente las reservas iniciales.

## Conceptos solicitados

### Diferencias entre middleware incorporado, de terceros y personalizado
- **Incorporado:** `express.static`, `express.urlencoded` y `express.json`, proporcionados por Express.
- **De terceros:** Morgan, instalado como dependencia externa.
- **Personalizado:** funciones creadas para la aplicación, como `identificarSolicitud`, `medirDuracion`, `prepararAreaReservas` y `validarReserva`.

La diferencia entre ellos, es que el personalizado es creado por mí, con código realizado a medida según mis necesidades y el diseño de mi arquitectura, teniendo control total sobre el funcionamiento del middleware. En cambio, el middleware de terceros es incorporado como una dependencia externa independiente que ya me brinda un funcionamiento específico que no puedo modificar; y el middleware incorporado funciona de manera similar al middleware de terceros, pero vienen incorporados dentro de un módulo que puede contener uno o más middleware dentro de él.

### Cuando se utiliza `next()`
`next()` se utiliza para continuar la ejecución del pipeline hacia el siguiente middleware o handler.

### Porqué los parsers aparecen antes de la validación
Los parsers se ejecutan antes de la validación porque son los encargados de transformar el formato de los datos entrantes al formato admitido por la aplicació´n, mientras que la validación se encarga de comprobar si esos datos ya transformados son correctos.

### Diferencias entre alcance global, de router y de ruta
- **Global:** afecta las solicitudes que atraviesan el pipeline general. Ej.: Morgan, `identificarSolicitud` y `medirDuracion`.
- **De router:** se aplica a las rutas de `reservasRouter`. Ej.: `prepararAreaReservas`.
- **De ruta:** se aplica a una ruta específica. Ej.: `validarReserva` en `POST /reservas`.

### Motivo del evento finish
En **response**, cuando se ejecuta el evento **finish**, recién realiza el cálculo del tiempo total que tardó en ejecutarse la respuesta.

### Resultado del montaje del router
El montaje del router nos permite simplificar el código que define cada parte de la dirección URL, permitiendo que parte del código usado en tareas de procesamiento (como parsers o validaciones) sea convertido en un middleware.

### Diferencia entre el POST 302 y el GET posterior
Cuando una reserva es válida, `POST /reservas` agrega el registro en memoria y responde con una redirección `302` hacia `/reservas`. Luego el navegador realiza un nuevo `GET /reservas`, que muestra la colección actualizada.

### Motivo por el cual las altas desaparecen al reiniciar
Las altas desaparecen al reiniciar debido a que la aplicación no tiene ningún método de permanencia de datos: todo los datos ingresados mediante el formulario es almacenado en memoria, y dicha memoria es vaciada al reiniciar la aplicación.