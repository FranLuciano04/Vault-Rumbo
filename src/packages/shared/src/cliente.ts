import axios, { isAxiosError, type AxiosInstance } from "axios";
import type { components } from "./tipos.gen";

export type ObtenerToken = () => Promise<string | null> | string | null;

export interface OpcionesCliente {
  baseURL: string;
  obtenerToken: ObtenerToken;
}

export type Problema = components["schemas"]["Problema"];
export type ErrorCampo = components["schemas"]["ErrorCampo"];
export type UsuarioActual = components["schemas"]["UsuarioActual"];
export type AsesorDelCliente = components["schemas"]["AsesorDelCliente"];
export type Cliente = components["schemas"]["Cliente"];
export type ClienteListado = components["schemas"]["ClienteListado"];
type AltaGenerada = components["schemas"]["ClienteCrear"];
/** El generador marca como obligatorios los campos con valor por defecto; en el alta son opcionales. */
export type ClienteCrear = Omit<AltaGenerada, "etiquetas" | "confirmar_duplicado"> &
  Partial<Pick<AltaGenerada, "etiquetas" | "confirmar_duplicado">>;
type EdicionGenerada = components["schemas"]["ClienteEditar"];
/** Igual que el alta: `confirmar_duplicado` tiene valor por defecto, así que en la edición es opcional. */
export type ClienteEditar = Omit<EdicionGenerada, "confirmar_duplicado"> &
  Partial<Pick<EdicionGenerada, "confirmar_duplicado">>;
export type HistorialCliente = components["schemas"]["HistorialCliente"];
export type PaginaClientes = components["schemas"]["Pagina_ClienteListado_"];
export type ProblemaDuplicado = components["schemas"]["ProblemaDuplicado"];
export type SegmentoCliente = components["schemas"]["SegmentoCliente"];
export type HotelExistente = components["schemas"]["HotelExistente"];

/** Error tipado que traduce un problem+json de la API (ver Contrato de la API, �Errores�). */
export class ErrorApi extends Error {
  override name = "ErrorApi";
  status = 0;
  title = "";
  detail = "";
  errores: ErrorCampo[] = [];
  /** Posibles duplicados que trae el 409 del alta (CU-02 A1). */
  duplicados?: Cliente[];
  /** Hotel que ya existe con ese nombre en el destino, en el 409 del alta o la edición (CU-16 A2). */
  existente?: HotelExistente;
}

/** Con `responseType: "arraybuffer"` el problem+json llega en bytes: se decodifica para recuperar el problema. */
function leerCuerpoProblema(data: unknown): unknown {
  const esBinario = Object.prototype.toString.call(data) === "[object ArrayBuffer]";
  if (!esBinario) return data;
  try {
    return JSON.parse(new TextDecoder().decode(data as ArrayBuffer)) as unknown;
  } catch {
    return undefined;
  }
}

export function crearCliente({ baseURL, obtenerToken }: OpcionesCliente): AxiosInstance {
  const cliente = axios.create({ baseURL });

  cliente.interceptors.request.use(async (config) => {
    const token = await obtenerToken();
    if (token) config.headers.set("Authorization", `Bearer ${token}`);
    return config;
  });

  cliente.interceptors.response.use(
    (respuesta) => {
      // Sin API detrás del proxy, el dev server contesta 200 con el index.html: no es una respuesta de la API.
      const tipo = String(respuesta.headers["content-type"] ?? "");
      const esperaJson = [undefined, "json"].includes(respuesta.config.responseType);
      const tieneCuerpo =
        respuesta.status !== 204 && respuesta.data != null && respuesta.data !== "";
      // Un objeto ya parseado sin content-type pasa; un string es lo que axios no pudo parsear.
      const noEsJson =
        (tipo !== "" && !/\bjson\b/i.test(tipo)) || typeof respuesta.data === "string";
      if (esperaJson && tieneCuerpo && noEsJson) {
        const errorApi = new ErrorApi("La API no respondió");
        errorApi.status = respuesta.status;
        errorApi.title = errorApi.message;
        throw errorApi;
      }
      return respuesta;
    },
    (error: unknown) => {
      if (!isAxiosError(error) || !error.response) throw error;
      const data: unknown = leerCuerpoProblema(error.response.data);
      const problema: Partial<
        Problema & Pick<ProblemaDuplicado, "duplicados"> & { existente: HotelExistente }
      > = data && typeof data === "object" ? data : {};
      const errorApi = new ErrorApi(problema.title ?? error.message);
      errorApi.status = error.response.status;
      errorApi.title = problema.title ?? "";
      errorApi.detail = problema.detail ?? "";
      errorApi.errores = problema.errores ?? [];
      if (problema.duplicados) errorApi.duplicados = problema.duplicados;
      if (problema.existente) errorApi.existente = problema.existente;
      throw errorApi;
    },
  );

  return cliente;
}
