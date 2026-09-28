# Trabajo práctico 05

## Aclaración

Este archivo README.md fue generado completamente con IA para lograr cumplir el plazo de entrega. Será revisado, corregido y detallado según lo solicitado en el trabajo práctico.

## Descripción

Aplicación web desarrollada con **Node.js, Express y EJS** para consultar salas de estudio y reservar temporalmente un turno.

El objetivo principal es aplicar un **pipeline de middleware en Express**, utilizando middleware incorporado, de terceros y personalizado para registrar, identificar, medir, preparar y validar solicitudes antes de ejecutar los handlers finales. El trabajo requiere Morgan, parsers, recursos estáticos, middleware global, middleware de router, validación del POST, un `express.Router()` montado bajo `/reservas`, respuestas 400, una página 404 final y datos únicamente en memoria. 

## Instalación

```bash
npm install
```

Dependencias:

- `express`
- `ejs`
- `express-ejs-layouts`
- `morgan`

El proyecto utiliza CommonJS:

```json
{
  "type": "commonjs",
  "scripts": {
    "start": "node src/index.js",
    "check": "node --check src/index.js"
  }
}
```

`node_modules` y `.env` deben quedar excluidos mediante `.gitignore`.

## Ejecución

```bash
npm start
```

Para comprobar la sintaxis:

```bash
npm run check
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

`/reservas/nueva` se declara antes de `/reservas/:id`.

### Inicio

Explica el propósito del sitio e incluye enlaces al listado y al formulario.

### Estado

Responde JSON con el servicio, cantidad de reservas e identificador de solicitud:

```json
{
  "servicio": "activo",
  "reservas": 4,
  "solicitudId": "BIB-0001"
}
```

### Listado

Muestra todas las reservas, un mensaje alternativo si la colección está vacía y enlaces al detalle y al formulario.

### Detalle

Busca por `id`, muestra todos los datos y responde `404` con HTML cuando la reserva no existe.

### Formulario

Incluye controles etiquetados para estudiante, email, sala, fecha, turno y cantidad de personas. Cada control posee `id` y `name`.

### POST

El POST utiliza un middleware de validación y un handler final diferente:

```js
reservasRouter.post("/", validarReserva, crearReserva);
```

El validador responde `400` o prepara los datos y llama a `next()`. El handler agrega la reserva en memoria y redirige a `/reservas`.

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

El orden se justifica porque cada middleware debe disponer de la información preparada por los anteriores. Los parsers deben ejecutarse antes de la validación para que `req.body` exista cuando se ejecute `validarReserva`.

### Diagrama de POST válido

```text
POST /reservas
      ↓ morgan("dev")
      ↓ identificarSolicitud
      ↓ medirDuracion
      ↓ expressLayouts
      ↓ express.urlencoded
      ↓ reservasRouter
      ↓ prepararAreaReservas
      ↓ validarReserva
      ↓ crearReserva
      ↓ 302 /reservas
      ↓ finish: ID + estado + duración
```

### Diagrama de POST inválido

```text
POST /reservas
      ↓ morgan("dev")
      ↓ identificarSolicitud
      ↓ medirDuracion
      ↓ express.urlencoded
      ↓ reservasRouter
      ↓ prepararAreaReservas
      ↓ validarReserva
      ↓ 400
      ↓ render del formulario
      ↓ fin del ciclo
```

El POST inválido termina en `validarReserva`; `crearReserva` no se ejecuta.

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

Middleware personalizado global que guarda el tiempo inicial, registra un listener `finish` sobre `res`, ejecuta `next()` y, al finalizar la respuesta, calcula e imprime ID, método, `req.originalUrl`, `res.statusCode` y duración. La medición se realiza después de finalizar la respuesta.

### `express.static`

Middleware incorporado de Express que sirve los recursos estáticos ubicados en `public/`.

### `express.urlencoded`

Parser incorporado que procesa los datos enviados mediante formularios y los hace disponibles mediante `req.body`.

### `express.json`

Parser incorporado para solicitudes cuyo cuerpo contiene JSON.

### `reservasRouter`

Se crea y monta así:

```js
const reservasRouter = express.Router();
app.use("/reservas", reservasRouter);
```

Las rutas internas son relativas al montaje: `/`, `/nueva` y `/:id`.

### `prepararAreaReservas`

Middleware de router que define:

```js
res.locals.seccion = "Reservas de salas";
```

El listado y el formulario utilizan este valor. `/estado` no depende de él.

### `validarReserva`

Middleware de ruta que:

1. Aplica `trim()` a textos.
2. Convierte `personas` con `Number`.
3. Comprueba campos obligatorios.
4. Comprueba que la sala sea permitida.
5. Comprueba que el turno sea permitido.
6. Comprueba un entero entre 1 y 6.
7. Comprueba básicamente que el email contenga `@`.
8. Responde `400` y conserva los valores ante error.
9. Muestra el error con `role="alert"`.
10. Prepara `req.reservaValidada` y llama a `next()` si los datos son correctos.

La validación HTML no reemplaza la validación del servidor.

### `crearReserva`

Handler final que utiliza `req.reservaValidada`, agrega la reserva al arreglo en memoria y redirige a `/reservas`. No repite la validación completa.

### Página 404

Se registra después de todas las rutas y del router:

```js
app.use((req, res) => {
  res.status(404).render("no-encontrado", {
    titulo: "Página no encontrada",
    mensaje: "La dirección solicitada no existe.",
  });
});
```

No se llama a `next()` después del render.

## Middleware incorporado, de terceros y personalizado

- **Incorporado:** `express.static`, `express.urlencoded` y `express.json`, proporcionados por Express.
- **De terceros:** Morgan, instalado como dependencia externa.
- **Personalizado:** funciones creadas para la aplicación, como `identificarSolicitud`, `medirDuracion`, `prepararAreaReservas` y `validarReserva`.

## Uso de `next()`

`next()` continúa el pipeline hacia el siguiente middleware o handler. En `validarReserva` se llama únicamente cuando los datos son válidos. Si hay un error, se responde `400` y se renderiza el formulario, por lo que el ciclo termina en ese middleware.

## Alcance global, de router y de ruta

- **Global:** afecta las solicitudes que atraviesan el pipeline general. Ej.: Morgan, `identificarSolicitud` y `medirDuracion`.
- **De router:** se aplica a las rutas de `reservasRouter`. Ej.: `prepararAreaReservas`.
- **De ruta:** se aplica a una ruta específica. Ej.: `validarReserva` en `POST /reservas`.

## Validación

Las salas permitidas son:

```js
const salasPermitidas = ["Sala Norte", "Sala Sur", "Sala Multimedia"];
```

Los turnos permitidos son `Mañana`, `Tarde` y `Noche`. La cantidad de personas debe ser un entero entre 1 y 6 y el email debe contener `@`.

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

Para cada caso también se revisan Morgan y la línea de medición personalizada.

## POST 302 y GET posterior

Cuando una reserva es válida, `POST /reservas` agrega el registro en memoria y responde con una redirección `302` hacia `/reservas`. Luego el navegador realiza un nuevo `GET /reservas`, que muestra la colección actualizada.

## Persistencia temporal

Las reservas iniciales se definen en `src/index.js`. Las nuevas reservas se almacenan solamente en memoria y no se escriben en archivos ni en una base de datos.

Por eso, al reiniciar el servidor desaparecen las altas realizadas mediante el formulario y vuelven a quedar únicamente las reservas iniciales. Esta persistencia permanente está fuera del alcance del trabajo.

## Estructura del proyecto

```text
tp-05-salas-middleware/
├── public/
│   └── css/
│       └── estilos.css
├── src/
│   └── index.js
├── views/
│   ├── layouts/
│   │   └── main.ejs
│   ├── reservas/
│   │   ├── lista.ejs
│   │   └── detalle.ejs
│   ├── nueva.ejs
│   ├── inicio.ejs
│   └── no-encontrado.ejs
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

El router permanece dentro de `src/index.js` en este trabajo práctico.

## Fuera de alcance

No se evalúan:

- Routers separados en archivos.
- Controladores o servicios.
- Middleware centralizado de errores.
- Autenticación o autorización.
- Sesiones o cookies.
- Bases de datos.
- Escritura de reservas en archivos.
- Sanitización avanzada.
- Limitación de solicitudes.
- Seguridad de producción.
- Pruebas automatizadas.

## Comprobación final

Antes de entregar:

```bash
npm run check
npm start
```

Además, se debe recorrer el sitio, probar estados 200, 302, 400 y 404, comprobar que no haya respuestas pendientes ni errores de cabeceras, verificar que `req.body` exista antes de validar, revisar el ID y la medición en la terminal, contrastar el README con el pipeline real, reiniciar para comprobar la memoria temporal y verificar `package-lock.json` y la ausencia de `node_modules` en Git.
