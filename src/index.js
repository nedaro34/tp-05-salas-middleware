const express = require("express");
const ejs = require("ejs");
const expressLayouts = require("express-ejs-layouts");
const morgan = require("morgan");
const path = require("node:path");

const reservas = [
    {
        id: 1,
        estudiante: "Daniel",
        email: "daniel@gmail.com",
        sala: "Sala Norte",
        fecha: "2026-02-20",
        turno: "Mañana",
        personas: 3
    },
    {
        id: 2,
        estudiante: "Oscar",
        email: "oscarcitoEmoxito@live.com",
        sala: "Sala Norte",
        fecha: "2026-02-21",
        turno: "Noche",
        personas: 2
    },
    {
        id: 3,
        estudiante: "Nahuel",
        email: "el_loco_nahu@outlook.com",
        sala: "Sala Sur",
        fecha: "2026-02-21",
        turno: "Tarde",
        personas: 1
    },
    {
        id: 4,
        estudiante: "Alejandra",
        email: "Alechiki22@hotmail.com",
        sala: "Sala Multimedia",
        fecha: "2026-02-21",
        turno: "Tarde",
        personas: 6
    }
]

const puerto = 3000;
let numeroSolicitud = 0;

function identificarSolicitud(request, response, next) {
    numeroSolicitud++;
    response.locals.solicitudId = `BIB-${String(numeroSolicitud).padStart(4, "0")}`;
    console.log(`identificarSolicitud : [${response.locals.solicitudId}] ${request.method} ${request.originalUrl}`);
    next();
}

function medirDuracion(request, response, next) {
    const inicio = process.hrtime.bigint();

    response.on("finish", () => {
        const duracion = Number(process.hrtime.bigint() - inicio) / 1_000_000;
        console.log(`Duración: [${response.locals.solicitudId}] ${request.method} ${request.originalUrl} ${response.statusCode} ${duracion.toFixed(2)} ms`);
    })

    next()
}

function prepararReservas(require, response, next) {
    response.locals.seccion = "Solicitud de Reservas";
    console.log("Sección: " + response.locals.seccion);
    next();
}


function validarReserva(request, response, next) {
    const estudiante = request.body.estudiante?.trim();
    const email = request.body.email?.trim();
    const sala = request.body.sala?.trim();
    const fecha = request.body.fecha?.trim();
    const turno = request.body.turno?.trim();
    const personas = Number(request.body.personas?.trim());

    const salasPermitidas = ["Sala Norte", "Sala Sur", "Sala Multimedia"];
    const turnosPermitidos = ["Mañana", "Tarde", "Noche"];

    if (!estudiante ||
        !email ||
        !email.includes("@") ||
        !salasPermitidas.includes(sala) ||
        !fecha ||
        !turnosPermitidos.includes(turno) ||
        personas < 1 || personas > 6) {
        return response.status(400).render("reservas/nueva", {
            titulo: "nueva reserva",
            error: "Revisa los datos ingresados",
            valores: request.body
        }
        )
    }

    request.reservaValidada = { estudiante, email, sala, fecha, turno, personas };
    next();
}

function crearReserva(request, response) {
    const nuevoID = reservas.length == 0 ? 0 : reservas[reservas.length - 1].id + 1;
    reservas.push({
        id: nuevoID,
        ...request.reservaValidada
    })

    response.redirect("/reservas")
}


const aplicacion = express();

function main() {
    try {
        aplicacion.set("view engine", "ejs");
        aplicacion.set("views", path.join(__dirname, "..", "views"));
        aplicacion.set("layout", "layouts/main");

        aplicacion.use(morgan("dev"));
        aplicacion.use(identificarSolicitud);
        aplicacion.use(medirDuracion);
        aplicacion.use(expressLayouts);
        aplicacion.use(express.static(path.join(__dirname, "..", "public")));
        aplicacion.use(express.urlencoded({ extended: false }))
        aplicacion.use(express.json());

        //listo
        aplicacion.get("/", (request, response) => {
            response.status(200).render("inicio", {
                titulo: "Reservas en sala",
                descripcion: "Administra las diversas reservas realizadas en nuestras salas"
            })
        })

        //listo
        aplicacion.get("/estado", (request, response) => {
            response.status(200).json({
                servicio: "activo",
                reservas: reservas.length,
                solicitudId: response.locals.solicitudId
            })
        })

        const reservasRouter = express.Router();
        reservasRouter.use(prepararReservas)

        reservasRouter.get("/", (request, response) => {
            response.status(200).render("reservas/lista", {
                titulo: "Reservas en nuestro sistema",
                reservas
            })
        })

        reservasRouter.get("/nueva", (request, response) => {
            response.status(200).render("reservas/nueva", {
                titulo: "Nueva reserva",
                error: null,
                valores: {}
            })
        })

        reservasRouter.get("/:id", (request, response) => {
            const id = Number(request.params.id);
            const reserva = reservas.find((reserva) => reserva.id === id);

            if (!reserva) {
                return response.status(404).render("no-encontrado", {
                    titulo: "Reserva no encontrada",
                    mensaje: "No existe una reseva con ese identificador.",
                });
            }

            response.render("reservas/detalle", {
                titulo: reserva.estudiante,
                reserva,
            });
        });

        reservasRouter.post("/", validarReserva, crearReserva);
        aplicacion.use("/reservas", reservasRouter);

        //verificar funcionamiento
        aplicacion.use((request, response) => {
            response.status(404).render("no-encontrado", {
                titulo: "Página no encontrada",
                mensaje: "La dirección solicitada no existe.",
            });
        });


        aplicacion.listen(puerto, () => {
            console.log("Aplicación disponible en http://localhost:" + puerto);
        })

    } catch (error) {
        console.log(`Hubo un error durante la ejecución del sistema: ${error}`);
        process.exitCode = 1;
    }
}

main();