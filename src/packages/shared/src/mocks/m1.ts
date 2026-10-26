import { http, HttpResponse, type RequestHandler } from "msw";
import type { Configuracion, Destino, Operador, RequisitoDestino, Usuario } from "../modelos";
import { asesoresMock } from "./clientes";
import { respuestaProblema } from "./problema";
import { normalizarTexto, pagina } from "./utilidades";

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

export const destinosMock: [Destino, Destino, Destino, ...Destino[]] = [
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
  {
    id: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e01",
    nombre: "Europa",
    pais: "Varios",
    region: null,
    notas: null,
    activo: true,
    ...auditoria,
  },
  {
    id: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e02",
    nombre: "Cusco",
    pais: "Perú",
    region: null,
    notas: null,
    activo: true,
    ...auditoria,
  },
  {
    id: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e03",
    nombre: "Brasil",
    pais: "Brasil",
    region: null,
    notas: null,
    activo: true,
    ...auditoria,
  },
  {
    id: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e04",
    nombre: "Salta",
    pais: "Argentina",
    region: null,
    notas: null,
    activo: true,
    ...auditoria,
  },
  {
    id: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e05",
    nombre: "Punta Cana",
    pais: "República Dominicana",
    region: null,
    notas: null,
    activo: true,
    ...auditoria,
  },
  {
    id: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e06",
    nombre: "Lisboa",
    pais: "Portugal",
    region: null,
    notas: null,
    activo: true,
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

/** Requisito de un destino distinto de Cancún: el listado por destino no lo mezcla con los demás. */
export const requisitoOtroDestinoMock: RequisitoDestino = {
  id: "d4f1e8a2-7b53-4a96-8c0e-5e2a9b7d1c99",
  destino_id: destinosMock[2].id,
  nombre: "Vacuna de fiebre amarilla",
  tipo: "vacunacion",
  obligatorio: true,
  descripcion: null,
  anticipacion_dias: 10,
  activo: true,
  ...auditoria,
};

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

const ROLES = ["admin", "dueno", "empleado", "freelance"];
const TIPOS_COMISION = ["porcentaje", "importe"];
const PATRON_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PATRON_IMPORTE = /^\d{1,12}(\.\d{1,2})?$/;

type Cuerpo = Record<string, unknown>;

function invalido(detail: string) {
  return respuestaProblema(422, "Datos inválidos", { detail });
}

function conflicto(detail: string) {
  return respuestaProblema(409, "Conflicto", { detail });
}

/** Cuerpo del pedido; los esquemas del backend recortan los textos (`str_strip_whitespace`). */
async function cuerpoDe(pedido: Request): Promise<Cuerpo> {
  const cuerpo = (await pedido
    .clone()
    .json()
    .catch(() => ({}))) as Cuerpo;
  return Object.fromEntries(
    Object.entries(cuerpo).map(([clave, valor]) => [
      clave,
      typeof valor === "string" ? valor.trim() : valor,
    ]),
  );
}

/** Texto obligatorio de 1 a `max` caracteres, como `Field(min_length=1, max_length=max)`. */
const textoValido = (valor: unknown, max: number) =>
  typeof valor === "string" && valor.length >= 1 && valor.length <= max;

/** Listado con `activo` (`null` = sin filtrar si no viene), `buscar` (si se pasa `textos`) y paginación. */
function listado<T extends { activo: boolean }>(
  todos: readonly T[],
  url: URL,
  activoPorDefecto: boolean | null,
  textos?: (item: T) => string[],
) {
  const parametro = url.searchParams.get("activo");
  const activo = parametro === null ? activoPorDefecto : parametro === "true";
  const buscar = textos ? normalizarTexto(url.searchParams.get("buscar") ?? "") : "";
  return pagina(
    todos.filter(
      (item) =>
        (activo === null || item.activo === activo) &&
        (!buscar || textos?.(item).some((texto) => normalizarTexto(texto).includes(buscar))),
    ),
    url,
  );
}

/** El nombre ya lo tiene otra fila (activa o no), sin mayúsculas, tildes ni espacios de más. */
const nombreRepetido = (
  todos: readonly { id: string; nombre: string }[],
  nombre: unknown,
  propioId?: string | readonly string[],
) =>
  typeof nombre === "string" &&
  todos.some((x) => x.id !== propioId && normalizarTexto(x.nombre) === normalizarTexto(nombre));

/** Quitar el rol admin o dar de baja al único admin activo dejaría al sistema sin quién lo administre. */
const eraUltimoAdmin = (id: string | readonly string[] | undefined) =>
  usuariosMock.some((u) => u.id === id && u.rol === "admin" && u.activo) &&
  !usuariosMock.some((u) => u.id !== id && u.rol === "admin" && u.activo);

const sinUltimoAdmin = () => conflicto("Tiene que quedar al menos un usuario admin activo.");

/** Mismas reglas que `UsuarioCrear`. */
function errorAltaUsuario(c: Cuerpo): string | null {
  if (!textoValido(c["nombre"], 120)) return "El nombre es obligatorio (hasta 120 caracteres).";
  if (!textoValido(c["email"], 254) || !PATRON_EMAIL.test(c["email"] as string))
    return "El email no es válido.";
  if (!ROLES.includes(c["rol"] as string)) return "El rol no es válido.";
  return null;
}

/** Mismas reglas que `ConfiguracionEditar`: el PUT reemplaza los tres valores. */
function errorConfiguracion(c: Cuerpo): string | null {
  const entero = (valor: unknown, minimo: number) =>
    typeof valor === "number" && Number.isInteger(valor) && valor >= minimo;
  if (!entero(c["vigencia_cotizacion_meses"], 1)) return "La vigencia debe ser de 1 mes o más.";
  if (!entero(c["anticipacion_salida_dias"], 0)) return "La anticipación no puede ser negativa.";
  if (!entero(c["recontacto_meses"], 1)) return "El recontacto debe ser de 1 mes o más.";
  return null;
}

/** Mismas reglas que `ComisionPorDefecto`: tipo y valor van juntos, valor ≥ 0 con 2 decimales. */
function errorComision(c: Cuerpo): string | null {
  const { comision_default_tipo: tipo, comision_default_valor: valor } = c;
  if (tipo === undefined || valor === undefined) return "Faltan el tipo y el valor de la comisión.";
  if (tipo !== null && !TIPOS_COMISION.includes(tipo as string)) return "El tipo no es válido.";
  if ((tipo === null) !== (valor === null))
    return "El tipo y el valor de la comisión van juntos o ninguno.";
  if (valor === null) return null;
  if (
    (typeof valor !== "string" && typeof valor !== "number") ||
    !PATRON_IMPORTE.test(String(valor))
  )
    return "El valor debe ser positivo, con hasta 2 decimales.";
  if (tipo === "porcentaje" && Number(valor) > 100)
    return "Un porcentaje de comisión no puede superar 100.";
  return null;
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
  http.get("*/api/usuarios", ({ request }) => listado(usuariosMock, new URL(request.url), null)),
  http.post("*/api/usuarios", async ({ request }) => {
    const cuerpo = await cuerpoDe(request);
    const error = errorAltaUsuario(cuerpo);
    if (error) return invalido(error);
    const email = (cuerpo["email"] as string).toLowerCase();
    if (usuariosMock.some((u) => u.email.toLowerCase() === email))
      return conflicto("Ya existe un usuario con ese email.");
    return HttpResponse.json(await recurso(usuariosMock[2], undefined, request), { status: 201 });
  }),
  http.get("*/api/usuarios/asesores", () => HttpResponse.json(asesoresMock())),
  http.get("*/api/usuarios/:usuario_id", async ({ params }) =>
    HttpResponse.json(await recurso(usuariosMock[2], params["usuario_id"])),
  ),
  http.patch("*/api/usuarios/:usuario_id", async ({ params, request }) => {
    const { rol } = await cuerpoDe(request);
    if (rol !== undefined && rol !== "admin" && eraUltimoAdmin(params["usuario_id"]))
      return sinUltimoAdmin();
    return HttpResponse.json(await recurso(usuariosMock[2], params["usuario_id"], request));
  }),
  http.post("*/api/usuarios/:usuario_id/baja", async ({ params }) => {
    if (eraUltimoAdmin(params["usuario_id"])) return sinUltimoAdmin();
    return HttpResponse.json({
      ...(await recurso(usuariosMock[2], params["usuario_id"])),
      activo: false,
    });
  }),
  http.put("*/api/usuarios/:usuario_id/comision-por-defecto", async ({ params, request }) => {
    const error = errorComision(await cuerpoDe(request));
    if (error) return invalido(error);
    return HttpResponse.json(await recurso(usuariosMock[2], params["usuario_id"], request));
  }),
  // Parámetros del negocio
  http.get("*/api/configuracion", () => HttpResponse.json(configuracionMock)),
  http.put("*/api/configuracion", async ({ request }) => {
    const cuerpo = await cuerpoDe(request);
    const error = errorConfiguracion(cuerpo);
    if (error) return invalido(error);
    return HttpResponse.json({ ...configuracionMock, ...(cuerpo as Partial<Configuracion>) });
  }),
  // Destinos y sus requisitos
  http.get("*/api/destinos", ({ request }) =>
    listado(destinosMock, new URL(request.url), true, (d) => [d.nombre, d.pais]),
  ),
  http.post("*/api/destinos", async ({ request }) => {
    if (nombreRepetido(destinosMock, (await cuerpoDe(request))["nombre"]))
      return conflicto("Ya existe un destino con ese nombre.");
    return HttpResponse.json(await recurso(destinosMock[0], undefined, request), { status: 201 });
  }),
  http.get("*/api/destinos/:destino_id", async ({ params }) =>
    HttpResponse.json(await recurso(destinosMock[0], params["destino_id"])),
  ),
  http.patch("*/api/destinos/:destino_id", async ({ params, request }) => {
    if (nombreRepetido(destinosMock, (await cuerpoDe(request))["nombre"], params["destino_id"]))
      return conflicto("Ya existe un destino con ese nombre.");
    return HttpResponse.json(await recurso(destinosMock[0], params["destino_id"], request));
  }),
  http.post("*/api/destinos/:destino_id/baja", async ({ params }) =>
    HttpResponse.json({
      ...(await recurso(destinosMock[0], params["destino_id"])),
      activo: false,
    }),
  ),
  http.post("*/api/destinos/:destino_id/reactivar", async ({ params }) =>
    HttpResponse.json({ ...(await recurso(destinosMock[2], params["destino_id"])), activo: true }),
  ),
  http.get("*/api/destinos/:destino_id/requisitos", ({ params, request }) =>
    pagina(
      [...requisitosMock, requisitoOtroDestinoMock].filter(
        (requisito) => requisito.destino_id === params["destino_id"],
      ),
      new URL(request.url),
    ),
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
  http.get("*/api/operadores", ({ request }) =>
    listado(operadoresMock, new URL(request.url), true, (o) => [o.nombre]),
  ),
  http.post("*/api/operadores", async ({ request }) => {
    if (nombreRepetido(operadoresMock, (await cuerpoDe(request))["nombre"]))
      return conflicto("Ya existe un operador con ese nombre.");
    return HttpResponse.json(await recurso(operadoresMock[0], undefined, request), {
      status: 201,
    });
  }),
  http.get("*/api/operadores/:operador_id", async ({ params }) =>
    HttpResponse.json(await recurso(operadoresMock[0], params["operador_id"])),
  ),
  http.patch("*/api/operadores/:operador_id", async ({ params, request }) => {
    if (nombreRepetido(operadoresMock, (await cuerpoDe(request))["nombre"], params["operador_id"]))
      return conflicto("Ya existe un operador con ese nombre.");
    return HttpResponse.json(await recurso(operadoresMock[0], params["operador_id"], request));
  }),
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
