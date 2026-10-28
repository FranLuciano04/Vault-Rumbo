import { http, HttpResponse, type RequestHandler } from "msw";
import type {
  FiltrosHoteles,
  Hotel,
  HotelCrear,
  HotelEditar,
  Resena,
  ResenaCrear,
  ResenaEditar,
} from "../modelos";
import { respuestaProblema } from "./problema";
import { auditoriaMock } from "./viajes";

// Ids de otros mocks, para que el catálogo cuadre con ellos: destinos de `destinosMock`, clientes
// de `clientesMock`, y los hoteles del itinerario de `tramosMock` y de la reseña del historial.
const destino = {
  bariloche: "3f6a1c20-8b4d-4e57-a9c1-5d2e7b9f0a11",
  cancun: "9c2d4e61-1a7f-4b38-8d05-6e3f1a2b4c22",
  brasil: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e03",
  puntaCana: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e05",
};
const camila = "3c1f6d2e-8a47-4b19-9e53-7d0a2b4c6e11";
const sosa = "9e5b0a74-1c3d-4f68-a2b9-5c8d7e0f1a22";
const joaquin = "d4a8c6e2-5f19-4073-8b3a-2e1c9d7f0b33";

/** Id de cada hotel ficticio, por si otro mock o test necesita uno del catálogo. */
export const idHotelMock = {
  llaoLlao: "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a10",
  cabanas: "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a11",
  copacabana: "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a01",
  pousada: "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a02",
  riu: "7c3b1e9f-4a58-4d2c-8e60-9f2d5a7b0c88",
  playaDorada: "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a12",
} as const;

type DatosHotel = Pick<Hotel, "id" | "nombre" | "destino_id" | "categoria" | "precio_referencia"> &
  Partial<Pick<Hotel, "servicios" | "estado">>;

/** Un hotel ficticio, activo y sin valoración: `conValoracion` la completa desde las reseñas. */
function hotel(datos: DatosHotel): Hotel {
  return {
    ...auditoriaMock,
    servicios: [],
    estado: "activo",
    puntaje_promedio: null,
    cantidad_resenas: 0,
    ...datos,
  };
}

const resenaBase = { ...auditoriaMock, viaje_id: null, motivo_baja: null };

/** Reseñas ficticias: las publicadas de cada hotel y una oculta por moderación (CU-29). */
export const resenasMock: Resena[] = [
  {
    ...resenaBase,
    id: "2e9a4c7d-8b13-4d60-b5f2-6c0a8e3d1b77",
    hotel_id: idHotelMock.riu,
    cliente_id: camila,
    puntaje: 5,
    comentario: "Excelente atención y muy buena ubicación.",
    fecha: "2026-02-25",
    estado: "publicada",
  },
  {
    ...resenaBase,
    id: "e1a2b3c4-d5e6-4f70-8a9b-0c1d2e3f4a02",
    hotel_id: idHotelMock.llaoLlao,
    cliente_id: camila,
    puntaje: 4,
    comentario: "Muy bueno, el desayuno flojo.",
    fecha: "2026-08-14",
    estado: "publicada",
  },
  {
    ...resenaBase,
    id: "e1a2b3c4-d5e6-4f70-8a9b-0c1d2e3f4a03",
    hotel_id: idHotelMock.llaoLlao,
    cliente_id: sosa,
    puntaje: 5,
    comentario: "Las vistas al lago valen cada peso.",
    fecha: "2026-09-02",
    estado: "publicada",
  },
  {
    ...resenaBase,
    id: "e1a2b3c4-d5e6-4f70-8a9b-0c1d2e3f4a04",
    hotel_id: idHotelMock.llaoLlao,
    cliente_id: joaquin,
    puntaje: 1,
    comentario: "Reseña con insultos al personal.",
    fecha: "2026-09-10",
    estado: "oculta",
    motivo_baja: "Contenido ofensivo",
  },
  {
    ...resenaBase,
    id: "e1a2b3c4-d5e6-4f70-8a9b-0c1d2e3f4a05",
    hotel_id: idHotelMock.copacabana,
    cliente_id: sosa,
    puntaje: 5,
    comentario: "Frente a la playa, impecable.",
    fecha: "2026-07-20",
    estado: "publicada",
  },
  {
    ...resenaBase,
    id: "e1a2b3c4-d5e6-4f70-8a9b-0c1d2e3f4a06",
    hotel_id: idHotelMock.pousada,
    cliente_id: joaquin,
    puntaje: 3,
    comentario: "Correcto, pero lejos del centro.",
    fecha: "2026-06-11",
    estado: "publicada",
  },
];

/** Puntaje promedio (dos decimales) y cantidad de las reseñas publicadas del hotel (CU-18). */
function conValoracion(h: Hotel): Hotel {
  const puntajes = resenasMock
    .filter((r) => r.hotel_id === h.id && r.estado === "publicada")
    .map((r) => r.puntaje);
  return {
    ...h,
    cantidad_resenas: puntajes.length,
    puntaje_promedio:
      puntajes.length === 0
        ? null
        : (puntajes.reduce((suma, p) => suma + p, 0) / puntajes.length).toFixed(2),
  };
}

/** Catálogo ficticio: seis hoteles en cuatro destinos; el Playa Dorada cerró (CU-16 A4). */
export const hotelesMock: Hotel[] = [
  hotel({
    id: idHotelMock.llaoLlao,
    nombre: "Hotel Llao Llao",
    destino_id: destino.bariloche,
    categoria: "5 estrellas",
    precio_referencia: "150000.00",
    servicios: ["wifi", "pileta", "desayuno"],
  }),
  hotel({
    id: idHotelMock.cabanas,
    nombre: "Cabañas del Nahuel",
    destino_id: destino.bariloche,
    categoria: "3 estrellas",
    precio_referencia: "60000.00",
    servicios: ["wifi", "cocina"],
  }),
  hotel({
    id: idHotelMock.copacabana,
    nombre: "Copacabana Palace",
    destino_id: destino.brasil,
    categoria: "5 estrellas",
    precio_referencia: "320000.00",
    servicios: ["wifi", "pileta", "desayuno", "spa"],
  }),
  hotel({
    id: idHotelMock.pousada,
    nombre: "Pousada do Sol",
    destino_id: destino.brasil,
    categoria: "4 estrellas",
    precio_referencia: "140000.00",
    servicios: ["wifi", "desayuno"],
  }),
  hotel({
    id: idHotelMock.riu,
    nombre: "Riu Palace Punta Cana",
    destino_id: destino.puntaCana,
    categoria: "5 estrellas",
    precio_referencia: "210000.00",
    servicios: ["wifi", "pileta", "all inclusive"],
  }),
  hotel({
    id: idHotelMock.playaDorada,
    nombre: "Hotel Playa Dorada",
    destino_id: destino.cancun,
    categoria: "4 estrellas",
    precio_referencia: "110000.00",
    servicios: ["wifi", "pileta"],
    estado: "cerrado",
  }),
].map(conValoracion);

/** Orden del catálogo (CU-18 A2): por nombre, por puntaje de mayor a menor o por precio. */
function ordenar(hoteles: Hotel[], criterio: FiltrosHoteles["orden"]): Hotel[] {
  const numero = (valor: string | null) => Number(valor ?? 0);
  return [...hoteles].sort((a, b) => {
    if (criterio === "valoracion") return numero(b.puntaje_promedio) - numero(a.puntaje_promedio);
    if (criterio === "precio") return numero(a.precio_referencia) - numero(b.precio_referencia);
    return a.nombre.localeCompare(b.nombre, "es");
  });
}

function pagina<T>(items: T[], url: URL) {
  const numero = Number(url.searchParams.get("pagina") ?? 1);
  const porPagina = Number(url.searchParams.get("por_pagina") ?? 20);
  const salto = (numero - 1) * porPagina;
  return {
    items: items.slice(salto, salto + porPagina),
    total: items.length,
    pagina: numero,
    por_pagina: porPagina,
  };
}

function hotelNoEncontrado() {
  return respuestaProblema(404, "No encontrado", { detail: "El hotel no existe." });
}

function resenaNoEncontrada() {
  return respuestaProblema(404, "No encontrado", { detail: "La reseña no existe." });
}

function datosInvalidos(detail: string) {
  return respuestaProblema(422, "Datos inválidos", { detail });
}

const puntajeValido = (puntaje: number) =>
  Number.isInteger(puntaje) && puntaje >= 1 && puntaje <= 5;

/** Handlers MSW del catálogo de hoteles y sus reseñas (CU-16, CU-17, CU-18, CU-29). */
export const manejadoresHoteles: RequestHandler[] = [
  http.get("*/api/hoteles", ({ request }) => {
    const url = new URL(request.url);
    const filtro = (nombre: string) => url.searchParams.get(nombre);
    const estado = filtro("estado") ?? "activo";
    const precioMax = filtro("precio_max");
    const servicio = filtro("servicio");
    const filtrados = hotelesMock.filter(
      (h) =>
        h.estado === estado &&
        (!filtro("destino_id") || h.destino_id === filtro("destino_id")) &&
        (!filtro("categoria") || h.categoria === filtro("categoria")) &&
        (!precioMax || Number(h.precio_referencia) <= Number(precioMax)) &&
        (!servicio || h.servicios.includes(servicio)),
    );
    return HttpResponse.json(
      pagina(ordenar(filtrados, filtro("orden") as FiltrosHoteles["orden"]), url),
    );
  }),

  http.post("*/api/hoteles", async ({ request }) => {
    const datos = (await request.json()) as HotelCrear;
    if (!datos.nombre || !datos.destino_id) return datosInvalidos("Faltan el nombre y el destino.");
    if (hotelesMock.some((h) => h.nombre === datos.nombre && h.destino_id === datos.destino_id)) {
      return respuestaProblema(409, "Conflicto", {
        detail: "Ya existe un hotel con ese nombre en el destino.",
      });
    }
    return HttpResponse.json(
      hotel({
        id: crypto.randomUUID(),
        nombre: datos.nombre,
        destino_id: datos.destino_id,
        categoria: datos.categoria ?? null,
        precio_referencia: datos.precio_referencia ?? null,
        servicios: datos.servicios ?? [],
      }),
      { status: 201 },
    );
  }),

  http.get("*/api/hoteles/:id", ({ params }) => {
    const h = hotelesMock.find((x) => x.id === params["id"]);
    return h ? HttpResponse.json(h) : hotelNoEncontrado();
  }),

  http.patch("*/api/hoteles/:id", async ({ params, request }) => {
    const h = hotelesMock.find((x) => x.id === params["id"]);
    if (!h) return hotelNoEncontrado();
    return HttpResponse.json({ ...h, ...((await request.json()) as HotelEditar) });
  }),

  http.post("*/api/hoteles/:id/baja", ({ params }) => {
    const h = hotelesMock.find((x) => x.id === params["id"]);
    return h ? HttpResponse.json({ ...h, estado: "cerrado" }) : hotelNoEncontrado();
  }),

  http.get("*/api/hoteles/:id/resenas", ({ params, request }) => {
    if (!hotelesMock.some((x) => x.id === params["id"])) return hotelNoEncontrado();
    const url = new URL(request.url);
    const estado = url.searchParams.get("estado") ?? "publicada";
    const delHotel = resenasMock
      .filter((r) => r.hotel_id === params["id"] && r.estado === estado)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    return HttpResponse.json(pagina(delHotel, url));
  }),

  http.post("*/api/hoteles/:id/resenas", async ({ params, request }) => {
    if (!hotelesMock.some((x) => x.id === params["id"])) return hotelNoEncontrado();
    const datos = (await request.json()) as ResenaCrear;
    if (!puntajeValido(datos.puntaje)) return datosInvalidos("El puntaje va de 1 a 5.");
    const nueva: Resena = {
      ...resenaBase,
      id: crypto.randomUUID(),
      hotel_id: String(params["id"]),
      cliente_id: datos.cliente_id,
      viaje_id: datos.viaje_id ?? null,
      puntaje: datos.puntaje,
      comentario: datos.comentario,
      fecha: datos.fecha,
      estado: "publicada",
    };
    return HttpResponse.json(nueva, { status: 201 });
  }),

  http.patch("*/api/resenas/:id", async ({ params, request }) => {
    const r = resenasMock.find((x) => x.id === params["id"]);
    if (!r) return resenaNoEncontrada();
    const cambios = (await request.json()) as ResenaEditar;
    if (cambios.puntaje !== undefined && !puntajeValido(cambios.puntaje)) {
      return datosInvalidos("El puntaje va de 1 a 5.");
    }
    return HttpResponse.json({ ...r, ...cambios });
  }),

  http.post("*/api/resenas/:id/ocultar", async ({ params, request }) => {
    const r = resenasMock.find((x) => x.id === params["id"]);
    if (!r) return resenaNoEncontrada();
    const { motivo_baja } = (await request.json()) as { motivo_baja?: string };
    if (!motivo_baja) return datosInvalidos("Indicá el motivo.");
    return HttpResponse.json({ ...r, estado: "oculta", motivo_baja });
  }),

  http.post("*/api/resenas/:id/restaurar", ({ params }) => {
    const r = resenasMock.find((x) => x.id === params["id"]);
    return r
      ? HttpResponse.json({ ...r, estado: "publicada", motivo_baja: null })
      : resenaNoEncontrada();
  }),

  http.delete("*/api/resenas/:id", ({ params }) =>
    resenasMock.some((x) => x.id === params["id"])
      ? new HttpResponse(null, { status: 204 })
      : resenaNoEncontrada(),
  ),
];
