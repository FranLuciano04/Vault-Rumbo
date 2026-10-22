import { http, HttpResponse, type RequestHandler } from "msw";
import type {
  Configuracion,
  Destino,
  Operador,
  Pagina,
  RequisitoDestino,
  Usuario,
} from "../modelos";

/** Columnas de auditoría de ejemplo (DEC-0008): las creó y editó la admin de ejemplo. */
const auditoria = {
  created_by: "0b8f7a52-4c1e-4f0a-9a57-1d2f6c3b7a01",
  updated_by: "0b8f7a52-4c1e-4f0a-9a57-1d2f6c3b7a01",
  created_at: "2026-09-01T12:00:00Z",
  updated_at: "2026-10-15T09:30:00Z",
};

export const usuariosMock: [Usuario, Usuario, Usuario] = [
  {
    id: "0b8f7a52-4c1e-4f0a-9a57-1d2f6c3b7a01",
    nombre: "Lucía Fernández",
    email: "lucia@rumbo.test",
    rol: "admin",
    activo: true,
    acceso_redes: true,
    comision_default_tipo: null,
    comision_default_valor: null,
    ...auditoria,
  },
  {
    id: "a1c4e7f0-3d58-4b92-b6a3-8f0e2d1c4b03",
    nombre: "Ana Pérez",
    email: "ana@rumbo.test",
    rol: "empleado",
    activo: true,
    acceso_redes: false,
    comision_default_tipo: "porcentaje",
    comision_default_valor: "10.00",
    ...auditoria,
  },
  {
    id: "e7b20d94-6a3f-4c15-9d8e-0b5a3f7c2e04",
    nombre: "Tomás Roldán",
    email: "tomas@rumbo.test",
    rol: "freelance",
    activo: true,
    acceso_redes: false,
    comision_default_tipo: "importe",
    comision_default_valor: "15000.00",
    ...auditoria,
  },
];

export const configuracionMock: Configuracion = {
  vigencia_cotizacion_meses: 1,
  anticipacion_salida_dias: 7,
  recontacto_meses: 6,
  ...auditoria,
};

export const destinosMock: [Destino, Destino, Destino] = [
  {
    id: "3f6a1c20-8b4d-4e57-a9c1-5d2e7b9f0a11",
    nombre: "Bariloche",
    pais: "Argentina",
    region: "Patagonia",
    notas: "Temporada alta de julio a agosto.",
    activo: true,
    ...auditoria,
  },
  {
    id: "9c2d4e61-1a7f-4b38-8d05-6e3f1a2b4c22",
    nombre: "Cancún",
    pais: "México",
    region: "Quintana Roo",
    notas: null,
    activo: true,
    ...auditoria,
  },
  {
    id: "d4b81f93-5c2e-4a60-b7d9-0f8e6c1a3d33",
    nombre: "Roma",
    pais: "Italia",
    region: null,
    notas: "Pide seguro de viaje.",
    activo: false,
    ...auditoria,
  },
];

export const requisitosMock: [RequisitoDestino, RequisitoDestino] = [
  {
    id: "58e0a7b4-2d19-4c63-9f8a-1b5c7d3e4a44",
    destino_id: destinosMock[1].id,
    nombre: "Pasaporte vigente",
    tipo: "documentacion",
    obligatorio: true,
    descripcion: "Con al menos seis meses de vigencia.",
    anticipacion_dias: 30,
    activo: true,
    ...auditoria,
  },
  {
    id: "b7a3c9e5-6f02-4d18-8e4b-2c9d0a6f5b55",
    destino_id: destinosMock[1].id,
    nombre: "Seguro de asistencia al viajero",
    tipo: "seguro",
    obligatorio: false,
    descripcion: null,
    anticipacion_dias: 7,
    activo: true,
    ...auditoria,
  },
];

export const operadoresMock: [Operador, Operador, Operador] = [
  {
    id: "1e5c8a72-9d34-4b06-a2f7-3a6b8c0d1e66",
    nombre: "Despegar Mayorista",
    contacto: "ventas@despegar.test",
    activo: true,
    ...auditoria,
  },
  {
    id: "6a9f2d38-4c71-4e85-b0a3-7d1e5f9c2b77",
    nombre: "Sol y Playa Operadora",
    contacto: "+54 11 5555-0102",
    activo: true,
    ...auditoria,
  },
  {
    id: "e2c7b04d-8a16-4f39-95e1-4b0c6d8a3f88",
    nombre: "Andes Travel",
    contacto: null,
    activo: false,
    ...auditoria,
  },
];

function pagina<T>(items: T[]): Pagina<T> {
  return { items, total: items.length, pagina: 1, por_pagina: 20 };
}

/** Recurso de ejemplo con el id de la URL; si hay cuerpo (alta o edición), lo superpone. */
async function recurso<T extends { id: string }>(
  ejemplo: T,
  id: string | readonly string[] | undefined,
  pedido?: Request,
): Promise<T> {
  const cuerpo = (pedido ? await pedido.json().catch(() => ({})) : {}) as Record<string, unknown>;
  // Los importes viajan como texto decimal aunque el cuerpo de entrada los admita como número.
  const valor = cuerpo["comision_default_valor"];
  if (typeof valor === "number") cuerpo["comision_default_valor"] = valor.toFixed(2);
  return { ...ejemplo, ...(cuerpo as Partial<T>), id: typeof id === "string" ? id : ejemplo.id };
}

/** Handlers MSW de usuarios y configuración (CU-25, CU-06, CU-13, CU-15, CU-26, CU-31). */
export const manejadoresM1: RequestHandler[] = [
  // Usuarios
  http.get("*/api/usuarios", () => HttpResponse.json(pagina(usuariosMock))),
  http.post("*/api/usuarios", async ({ request }) =>
    HttpResponse.json(await recurso(usuariosMock[2], undefined, request), { status: 201 }),
  ),
  http.get("*/api/usuarios/:usuario_id", async ({ params }) =>
    HttpResponse.json(await recurso(usuariosMock[2], params["usuario_id"])),
  ),
  http.patch("*/api/usuarios/:usuario_id", async ({ params, request }) =>
    HttpResponse.json(await recurso(usuariosMock[2], params["usuario_id"], request)),
  ),
  http.post("*/api/usuarios/:usuario_id/baja", async ({ params }) =>
    HttpResponse.json({
      ...(await recurso(usuariosMock[2], params["usuario_id"])),
      activo: false,
    }),
  ),
  http.put("*/api/usuarios/:usuario_id/comision-por-defecto", async ({ params, request }) =>
    HttpResponse.json(await recurso(usuariosMock[2], params["usuario_id"], request)),
  ),
  // Parámetros del negocio
  http.get("*/api/configuracion", () => HttpResponse.json(configuracionMock)),
  http.put("*/api/configuracion", async ({ request }) =>
    HttpResponse.json({
      ...configuracionMock,
      ...((await request.json().catch(() => ({}))) as Partial<Configuracion>),
    }),
  ),
  // Destinos y sus requisitos
  http.get("*/api/destinos", () => HttpResponse.json(pagina(destinosMock))),
  http.post("*/api/destinos", async ({ request }) =>
    HttpResponse.json(await recurso(destinosMock[0], undefined, request), { status: 201 }),
  ),
  http.get("*/api/destinos/:destino_id", async ({ params }) =>
    HttpResponse.json(await recurso(destinosMock[0], params["destino_id"])),
  ),
  http.patch("*/api/destinos/:destino_id", async ({ params, request }) =>
    HttpResponse.json(await recurso(destinosMock[0], params["destino_id"], request)),
  ),
  http.post("*/api/destinos/:destino_id/baja", async ({ params }) =>
    HttpResponse.json({
      ...(await recurso(destinosMock[0], params["destino_id"])),
      activo: false,
    }),
  ),
  http.post("*/api/destinos/:destino_id/reactivar", async ({ params }) =>
    HttpResponse.json({ ...(await recurso(destinosMock[2], params["destino_id"])), activo: true }),
  ),
  http.get("*/api/destinos/:destino_id/requisitos", () =>
    HttpResponse.json(pagina(requisitosMock)),
  ),
  http.post("*/api/destinos/:destino_id/requisitos", async ({ params, request }) =>
    HttpResponse.json(
      {
        ...(await recurso(requisitosMock[0], undefined, request)),
        destino_id: String(params["destino_id"]),
      },
      { status: 201 },
    ),
  ),
  http.patch("*/api/requisitos-destino/:requisito_id", async ({ params, request }) =>
    HttpResponse.json(await recurso(requisitosMock[0], params["requisito_id"], request)),
  ),
  http.post("*/api/requisitos-destino/:requisito_id/baja", async ({ params }) =>
    HttpResponse.json({
      ...(await recurso(requisitosMock[0], params["requisito_id"])),
      activo: false,
    }),
  ),
  // Operadores
  http.get("*/api/operadores", () => HttpResponse.json(pagina(operadoresMock))),
  http.post("*/api/operadores", async ({ request }) =>
    HttpResponse.json(await recurso(operadoresMock[0], undefined, request), { status: 201 }),
  ),
  http.get("*/api/operadores/:operador_id", async ({ params }) =>
    HttpResponse.json(await recurso(operadoresMock[0], params["operador_id"])),
  ),
  http.patch("*/api/operadores/:operador_id", async ({ params, request }) =>
    HttpResponse.json(await recurso(operadoresMock[0], params["operador_id"], request)),
  ),
  http.post("*/api/operadores/:operador_id/baja", async ({ params }) =>
    HttpResponse.json({
      ...(await recurso(operadoresMock[0], params["operador_id"])),
      activo: false,
    }),
  ),
  http.post("*/api/operadores/:operador_id/reactivar", async ({ params }) =>
    HttpResponse.json({
      ...(await recurso(operadoresMock[2], params["operador_id"])),
      activo: true,
    }),
  ),
];
