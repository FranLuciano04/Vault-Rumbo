import { http, HttpResponse, type RequestHandler } from "msw";
import type { Cliente, ClienteCrear, ClienteEditar, HistorialCliente } from "../cliente";
import { normalizarInstagram } from "../esquemas/clientes";
import { usuariosPorRol } from "./index";
import { respuestaProblema } from "./problema";

/** Clientes ficticios que respetan el esquema `Cliente`. */
export const clientesMock: Cliente[] = [
  {
    id: "3c1f6d2e-8a47-4b19-9e53-7d0a2b4c6e11",
    nombre: "Camila Benítez",
    contacto: "+54 9 11 5555-1234",
    instagram: "camila.benitez",
    segmento: "pareja",
    etiquetas: ["Caribe", "luna de miel"],
    preferencias: "Hoteles todo incluido, vuelos directos.",
    no_recontactar: false,
    asesor_asignado_id: "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03",
    created_by: "5d3e9c18-7b24-4a6f-8e10-2c4a9b6d5f02",
    updated_by: "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03",
    created_at: "2026-01-12T14:30:00Z",
    updated_at: "2026-03-02T10:15:00Z",
  },
  {
    id: "9e5b0a74-1c3d-4f68-a2b9-5c8d7e0f1a22",
    nombre: "Familia Sosa",
    contacto: "sosa.familia@mail.test",
    instagram: null,
    segmento: "familia",
    etiquetas: ["Brasil", "cruceros"],
    preferencias: null,
    no_recontactar: false,
    asesor_asignado_id: null,
    created_by: "5d3e9c18-7b24-4a6f-8e10-2c4a9b6d5f02",
    updated_by: "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03",
    created_at: "2026-01-12T14:30:00Z",
    updated_at: "2026-03-02T10:15:00Z",
  },
  {
    id: "d4a8c6e2-5f19-4073-8b3a-2e1c9d7f0b33",
    nombre: "Joaquín Ramos",
    contacto: "+54 9 351 555-9876",
    instagram: null,
    segmento: "individual",
    etiquetas: ["Europa"],
    preferencias: "Viaja solo, prefiere escapadas cortas.",
    no_recontactar: true,
    asesor_asignado_id: "e7b20d94-6a3f-4c15-9d8e-0b5a3f7c2e04",
    created_by: "5d3e9c18-7b24-4a6f-8e10-2c4a9b6d5f02",
    updated_by: "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03",
    created_at: "2026-01-12T14:30:00Z",
    updated_at: "2026-03-02T10:15:00Z",
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
  return respuestaProblema(404, "No encontrado", {
    detail: "El cliente no existe o no lo podés ver.",
  });
}

/** Handlers MSW de las rutas de `/api/clientes` (CU-02, CU-03). */
export const manejadoresClientes: RequestHandler[] = [
  http.get(BASE, ({ request }) => {
    const url = new URL(request.url);
    const buscar = url.searchParams.get("buscar")?.toLowerCase();
    // `etiqueta` es el alias viejo de `etiquetas`; el cliente tiene que tener todas.
    const etiquetas = [
      ...url.searchParams.getAll("etiquetas"),
      ...url.searchParams.getAll("etiqueta"),
    ];
    const segmento = url.searchParams.get("segmento");
    const mios = url.searchParams.get("mios") === "true";
    const pagina = Number(url.searchParams.get("pagina") ?? 1);
    const porPagina = Number(url.searchParams.get("por_pagina") ?? 20);
    const filtrados = clientesMock.filter(
      (c) =>
        (!buscar ||
          c.nombre.toLowerCase().includes(buscar) ||
          c.contacto.toLowerCase().includes(buscar)) &&
        etiquetas.every((e) => c.etiquetas.includes(e)) &&
        (!segmento || c.segmento === segmento) &&
        (!mios || c.asesor_asignado_id === usuariosPorRol.empleado.id),
    );
    const desde = (pagina - 1) * porPagina;
    return HttpResponse.json({
      items: filtrados.slice(desde, desde + porPagina),
      total: filtrados.length,
      pagina,
      por_pagina: porPagina,
    });
  }),

  http.get(`${BASE}/etiquetas`, () =>
    HttpResponse.json(
      [...new Set(clientesMock.flatMap((c) => c.etiquetas))].sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    ),
  ),

  http.post(BASE, async ({ request }) => {
    const datos = (await request.json()) as ClienteCrear;
    const duplicados = clientesMock.filter((c) => c.contacto === datos.contacto);
    if (duplicados.length > 0 && !datos.confirmar_duplicado) {
      return respuestaProblema(409, "Conflicto", {
        detail: "Ya existe un cliente con ese contacto.",
        duplicados,
      });
    }
    const ahora = new Date().toISOString();
    const nuevo: Cliente = {
      id: crypto.randomUUID(),
      nombre: datos.nombre,
      contacto: datos.contacto,
      instagram: (normalizarInstagram(datos.instagram) as string | null | undefined) ?? null,
      segmento: datos.segmento,
      etiquetas: datos.etiquetas ?? [],
      preferencias: datos.preferencias ?? null,
      no_recontactar: false,
      asesor_asignado_id: datos.asesor_asignado_id ?? null,
      created_by: usuariosPorRol.empleado.id,
      updated_by: usuariosPorRol.empleado.id,
      created_at: ahora,
      updated_at: ahora,
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
    const normalizados =
      "instagram" in cambios
        ? { ...cambios, instagram: normalizarInstagram(cambios.instagram) as string | null }
        : cambios;
    return HttpResponse.json({ ...cliente, ...normalizados });
  }),

  http.get(`${BASE}/:id/historial`, ({ params }) => {
    const cliente = clientesMock.find((c) => c.id === params["id"]);
    if (!cliente) return noEncontrado();
    return HttpResponse.json(cliente === clientesMock[0] ? historialMock : SIN_HISTORIAL);
  }),
];
