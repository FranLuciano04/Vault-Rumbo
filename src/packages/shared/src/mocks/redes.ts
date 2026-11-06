import { http, HttpResponse, type RequestHandler } from "msw";
import type {
  ContenidoRed,
  ContenidoRedCrear,
  ContenidoRedEditar,
  PropuestaIAPedido,
} from "../modelos";
import { respuestaProblema } from "./problema";
import { usuariosPorRol, type RolMock } from "./usuarios";
import { auditoriaMock } from "./viajes";

const canales = ["instagram", "tiktok", "whatsapp_ventas"];
const estados = ["idea", "en_produccion", "listo", "publicado", "descartado"];

const base = { ...auditoriaMock, usuario_id: usuariosPorRol.empleado.id };

/** Piezas ficticias del tablero: al menos una en cada columna del kanban (CU-19). */
export const contenidosMock: ContenidoRed[] = [
  {
    ...base,
    id: "6a1b2c3d-4e5f-4a60-8b71-8c9d0e1f2a01",
    titulo: "Ideas de escapadas de fin de semana desde Buenos Aires",
    texto: null,
    canal: "instagram",
    estado_kanban: "idea",
    fecha_publicacion: "2026-12-10",
  },
  {
    ...base,
    id: "6a1b2c3d-4e5f-4a60-8b71-8c9d0e1f2a02",
    titulo: "Tres playas del Caribe para tu luna de miel",
    texto: "Arena blanca y agua tibia. Escribinos y armamos tu viaje.",
    canal: "instagram",
    estado_kanban: "en_produccion",
    fecha_publicacion: "2026-12-01",
  },
  {
    ...base,
    id: "6a1b2c3d-4e5f-4a60-8b71-8c9d0e1f2a03",
    titulo: "Bariloche en invierno: paquetes con ski incluido",
    texto: "Salidas de julio con pase de ski y traslados. Últimos lugares.",
    canal: "whatsapp_ventas",
    estado_kanban: "listo",
    fecha_publicacion: "2026-11-20",
  },
  {
    ...base,
    id: "6a1b2c3d-4e5f-4a60-8b71-8c9d0e1f2a04",
    titulo: "Un día en Punta Cana, en 30 segundos",
    texto: "Mirá cómo es amanecer en el Caribe. #PuntaCana #Rumbo",
    canal: "tiktok",
    estado_kanban: "publicado",
    fecha_publicacion: "2026-10-28",
  },
  {
    ...base,
    id: "6a1b2c3d-4e5f-4a60-8b71-8c9d0e1f2a05",
    titulo: "Sorteo de un fin de semana en Mendoza",
    texto: null,
    canal: "instagram",
    estado_kanban: "descartado",
    fecha_publicacion: "2026-11-05",
  },
  {
    ...base,
    id: "6a1b2c3d-4e5f-4a60-8b71-8c9d0e1f2a06",
    titulo: "Cómo elegir el seguro de viaje",
    texto: "Lo que tenés que mirar antes de contratar la cobertura.",
    canal: "tiktok",
    estado_kanban: "idea",
    fecha_publicacion: "2026-12-15",
  },
];

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

const sinPermiso = () =>
  respuestaProblema(403, "Sin permiso", { detail: "No tenés acceso al módulo de redes." });
const noEncontrado = () =>
  respuestaProblema(404, "No encontrado", { detail: "La pieza no existe." });
const datosInvalidos = (detail: string) => respuestaProblema(422, "Datos inválidos", { detail });
const conflicto = (detail: string) => respuestaProblema(409, "Conflicto", { detail });

/** Borradores ficticios con el tema, el canal y el tono pedidos (CU-20); no se guardan. */
function borradores({ tema, canal, tono }: PropuestaIAPedido) {
  const registro = tono ? ` (tono ${tono})` : "";
  return [
    {
      titulo: `${tema}: lo que no te podés perder`,
      texto: `Una propuesta para ${canal}${registro}: contá la experiencia de ${tema} y cerrá con una invitación a escribirnos.`,
    },
    {
      titulo: `Tu próximo viaje empieza en ${tema}`,
      texto: `Otra mirada${registro}: tres motivos para elegir ${tema} esta temporada.`,
    },
  ];
}

/** Handlers MSW del tablero de contenido y las propuestas con IA (CU-19, CU-20). Solo entra quien
 * tiene acceso a redes (`accesoRedes`, por defecto el del usuario mock del rol); el freelance
 * nunca, ni con la capacidad (DEC-0008, DEC-0013). */
export function manejadoresRedesPara(
  rol: RolMock,
  accesoRedes: boolean = usuariosPorRol[rol].acceso_redes,
): RequestHandler[] {
  const entra = rol !== "freelance" && accesoRedes;
  const piezas = contenidosMock.map((c) => ({ ...c }));

  return [
    http.get("*/api/contenidos", ({ request }) => {
      if (!entra) return sinPermiso();
      const url = new URL(request.url);
      const filtro = (nombre: string) => url.searchParams.get(nombre);
      const estado = filtro("estado_kanban");
      const canal = filtro("canal");
      if ((estado && !estados.includes(estado)) || (canal && !canales.includes(canal))) {
        return datosInvalidos("Filtro desconocido.");
      }
      const filtradas = piezas
        .filter(
          (c) =>
            (!estado || c.estado_kanban === estado) &&
            (!canal || c.canal === canal) &&
            (!filtro("desde") || c.fecha_publicacion >= String(filtro("desde"))) &&
            (!filtro("hasta") || c.fecha_publicacion <= String(filtro("hasta"))),
        )
        .sort((a, b) => a.fecha_publicacion.localeCompare(b.fecha_publicacion));
      return HttpResponse.json(pagina(filtradas, url));
    }),

    http.post("*/api/contenidos", async ({ request }) => {
      if (!entra) return sinPermiso();
      const datos = (await request.json()) as Partial<ContenidoRedCrear>;
      if (!datos.titulo || !datos.fecha_publicacion || !canales.includes(datos.canal ?? "")) {
        return datosInvalidos("Faltan el título, el canal y la fecha de publicación.");
      }
      const nueva: ContenidoRed = {
        ...base,
        id: crypto.randomUUID(),
        titulo: datos.titulo,
        texto: datos.texto ?? null,
        canal: datos.canal as ContenidoRed["canal"],
        estado_kanban: "idea",
        fecha_publicacion: datos.fecha_publicacion,
      };
      return HttpResponse.json(nueva, { status: 201 });
    }),

    http.post("*/api/contenidos/propuestas-ia", async ({ request }) => {
      if (!entra) return sinPermiso();
      const pedido = (await request.json()) as Partial<PropuestaIAPedido>;
      if (!pedido.tema || !canales.includes(pedido.canal ?? "")) {
        return datosInvalidos("Faltan el tema y el canal.");
      }
      return HttpResponse.json({ borradores: borradores(pedido as PropuestaIAPedido) });
    }),

    http.get("*/api/contenidos/:id", ({ params }) => {
      if (!entra) return sinPermiso();
      const c = piezas.find((x) => x.id === params["id"]);
      return c ? HttpResponse.json(c) : noEncontrado();
    }),

    http.patch("*/api/contenidos/:id", async ({ params, request }) => {
      if (!entra) return sinPermiso();
      const c = piezas.find((x) => x.id === params["id"]);
      if (!c) return noEncontrado();
      if (c.estado_kanban === "descartado") {
        return conflicto("La pieza está descartada: no se edita ni se mueve.");
      }
      const cambios = (await request.json()) as ContenidoRedEditar;
      if (
        (cambios.estado_kanban && !estados.includes(cambios.estado_kanban)) ||
        (cambios.canal && !canales.includes(cambios.canal))
      ) {
        return datosInvalidos("Estado o canal desconocido.");
      }
      return HttpResponse.json({ ...c, ...cambios });
    }),

    http.post("*/api/contenidos/:id/descartar", ({ params }) => {
      if (!entra) return sinPermiso();
      const c = piezas.find((x) => x.id === params["id"]);
      if (!c) return noEncontrado();
      return c.estado_kanban === "publicado" || c.estado_kanban === "descartado"
        ? conflicto("Solo se descarta una pieza que todavía no se publicó ni se descartó.")
        : HttpResponse.json({ ...c, estado_kanban: "descartado" });
    }),
  ];
}

/** Handlers de una persona con acceso a redes (empleada habilitada). */
export const manejadoresRedes: RequestHandler[] = manejadoresRedesPara("empleado", true);
