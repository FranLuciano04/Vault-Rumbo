import { http, HttpResponse, type RequestHandler } from "msw";
import type { Cliente, ClienteCrear, ClienteEditar, HistorialCliente } from "../cliente";
import { respuestaProblema } from "./problema";

/** Clientes ficticios que respetan el esquema `Cliente`. */
export const clientesMock: Cliente[] = [
  {
    id: "3c1f6d2e-8a47-4b19-9e53-7d0a2b4c6e11",
    nombre: "Camila Benítez",
    contacto: "+54 9 11 5555-1234",
    segmento: "pareja",
    etiquetas: ["Caribe", "luna de miel"],
    preferencias: "Hoteles todo incluido, vuelos directos.",
    no_recontactar: false,
    asesor_asignado_id: "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03",
  },
  {
    id: "9e5b0a74-1c3d-4f68-a2b9-5c8d7e0f1a22",
    nombre: "Familia Sosa",
    contacto: "sosa.familia@mail.test",
    segmento: "familia",
    etiquetas: ["Brasil", "cruceros"],
    preferencias: null,
    no_recontactar: false,
    asesor_asignado_id: null,
  },
  {
    id: "d4a8c6e2-5f19-4073-8b3a-2e1c9d7f0b33",
    nombre: "Joaquín Ramos",
    contacto: "+54 9 351 555-9876",
    segmento: "individual",
    etiquetas: ["Europa"],
    preferencias: "Viaja solo, prefiere escapadas cortas.",
    no_recontactar: true,
    asesor_asignado_id: "e7b20d94-6a3f-4c15-9d8e-0b5a3f7c2e04",
  },
];

/** Historial de la primera clienta; el resto no tiene movimientos. */
const historialMock: HistorialCliente = {
  oportunidades: [
    {
      id: "6b2d9f08-7e41-4c5a-8d13-0a9e3c5b7f44",
      destino_consultado: "Punta Cana",
      estado: "ganada",
      fecha_desde_tentativa: "2026-02-10",
      fecha_hasta_tentativa: "2026-02-20",
    },
  ],
  viajes: [
    {
      id: "f0a7c3d9-2b64-4e18-9c5d-8b1e6a4d2f55",
      destino_id: "1d8e5b3a-9c20-47f6-a4b8-3e7d0c2a6f66",
      estado: "finalizado",
      fecha_salida: "2026-02-10",
      fecha_regreso: "2026-02-20",
    },
  ],
  resenas: [
    {
      id: "2e9a4c7d-8b13-4d60-b5f2-6c0a8e3d1b77",
      hotel_id: "7c3b1e9f-4a58-4d2c-8e60-9f2d5a7b0c88",
      puntaje: 5,
      comentario: "Excelente atención y muy buena ubicación.",
      fecha: "2026-02-25",
      estado: "publicada",
    },
  ],
};

const SIN_HISTORIAL: HistorialCliente = { oportunidades: [], viajes: [], resenas: [] };

const BASE = "*/api/clientes";

function noEncontrado() {
  return respuestaProblema(404, "No encontrado", { detail: "El cliente no existe." });
}

/** Handlers MSW de las cinco rutas de `/api/clientes` (CU-02, CU-03). */
export const manejadoresClientes: RequestHandler[] = [
  http.get(BASE, ({ request }) => {
    const url = new URL(request.url);
    const buscar = url.searchParams.get("buscar")?.toLowerCase();
    const etiqueta = url.searchParams.get("etiqueta");
    const mios = url.searchParams.get("mios") === "true";
    const pagina = Number(url.searchParams.get("pagina") ?? 1);
    const porPagina = Number(url.searchParams.get("por_pagina") ?? 20);
    const filtrados = clientesMock.filter(
      (c) =>
        (!buscar ||
          c.nombre.toLowerCase().includes(buscar) ||
          c.contacto.toLowerCase().includes(buscar)) &&
        (!etiqueta || c.etiquetas.includes(etiqueta)) &&
        (!mios || c.asesor_asignado_id !== null),
    );
    const desde = (pagina - 1) * porPagina;
    return HttpResponse.json({
      items: filtrados.slice(desde, desde + porPagina),
      total: filtrados.length,
      pagina,
      por_pagina: porPagina,
    });
  }),

  http.post(BASE, async ({ request }) => {
    const datos = (await request.json()) as ClienteCrear;
    const duplicados = clientesMock.filter((c) => c.contacto === datos.contacto);
    if (duplicados.length > 0 && !datos.confirmar_duplicado) {
      return respuestaProblema(409, "Conflicto", {
        detail: "Ya existe un cliente con ese contacto.",
        duplicados,
      });
    }
    const nuevo: Cliente = {
      id: crypto.randomUUID(),
      nombre: datos.nombre,
      contacto: datos.contacto,
      segmento: datos.segmento,
      etiquetas: datos.etiquetas ?? [],
      preferencias: datos.preferencias ?? null,
      no_recontactar: false,
      asesor_asignado_id: datos.asesor_asignado_id ?? null,
    };
    return HttpResponse.json(nuevo, { status: 201 });
  }),

  http.get(`${BASE}/:id`, ({ params }) => {
    const cliente = clientesMock.find((c) => c.id === params["id"]);
    return cliente ? HttpResponse.json(cliente) : noEncontrado();
  }),

  http.patch(`${BASE}/:id`, async ({ params, request }) => {
    const cliente = clientesMock.find((c) => c.id === params["id"]);
    if (!cliente) return noEncontrado();
    const cambios = (await request.json()) as ClienteEditar;
    return HttpResponse.json({ ...cliente, ...cambios });
  }),

  http.get(`${BASE}/:id/historial`, ({ params }) => {
    const cliente = clientesMock.find((c) => c.id === params["id"]);
    if (!cliente) return noEncontrado();
    return HttpResponse.json(cliente === clientesMock[0] ? historialMock : SIN_HISTORIAL);
  }),
];
