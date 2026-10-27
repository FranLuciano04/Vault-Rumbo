import {
  ETIQUETA_TIPO_ALERTA,
  avisoRecordatorio,
  filtrosDePestana,
  hoyEnBuenosAires,
  type Alerta,
  type PestanaAgenda,
  type TipoAlerta,
  type UsuarioActual,
} from "@rumbo/shared";
import {
  useAlertas,
  useMarcarAlertaVista,
  useProgresoDelDia,
  useTotalesAgenda,
} from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Check, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { mensajeDeError } from "@/lib/errores";
import { useVolverFoco } from "@/lib/useVolverFoco";
import { cn } from "@/lib/utils";
import { FiltroResponsable } from "./FiltroResponsable";
import { FilaAlerta } from "./FilaAlerta";
import { PanelDetalleAlerta } from "./PanelDetalleAlerta";
import { FormularioRecordatorio } from "./FormularioRecordatorio";
import { useResolverConDeshacer } from "./useResolverConDeshacer";

const PESTANAS: { clave: PestanaAgenda; etiqueta: string }[] = [
  { clave: "todas", etiqueta: "Todas" },
  { clave: "atrasadas", etiqueta: "Atrasadas" },
  { clave: "hoy", etiqueta: "Hoy" },
  { clave: "proximas", etiqueta: "Próximas" },
];

const TIPOS = Object.keys(ETIQUETA_TIPO_ALERTA) as TipoAlerta[];

const porFecha = (a: Alerta, b: Alerta) => a.fecha.localeCompare(b.fecha);

const POR_PAGINA = 100;

/** Un total del servidor; mientras carga, un guion que los lectores de pantalla leen como «cargando». */
function Total({ valor }: { valor: number | undefined }) {
  if (valor !== undefined) return valor;
  return (
    <>
      <span aria-hidden="true">–</span>
      <span className="sr-only">cargando</span>
    </>
  );
}

const TITULO_VACIO: Record<Exclude<PestanaAgenda, "todas">, string> = {
  atrasadas: "No hay alertas atrasadas",
  hoy: "No hay alertas para hoy",
  proximas: "No hay alertas próximas",
};

interface AccionesDeLista {
  cliente: AxiosInstance;
  hoy: string;
  mostrarResponsable: boolean;
  alResolver: (alerta: Alerta) => void;
  alMarcarVista: (alerta: Alerta) => void;
  marcandoVista: boolean;
  puedeEditar: (alerta: Alerta) => boolean;
  alEditar: (alerta: Alerta) => void;
  alVerDetalle: (alerta: Alerta) => void;
}

function ListaDeAlertas({
  titulo,
  alertas,
  alResolver,
  alMarcarVista,
  puedeEditar,
  alEditar,
  alVerDetalle,
  ...resto
}: { titulo?: string; alertas: Alerta[] } & AccionesDeLista) {
  return (
    <section className="flex flex-col gap-1">
      {titulo && (
        <h2 className="px-3 pt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {titulo}
        </h2>
      )}
      <ul className="flex flex-col">
        {alertas.map((alerta) => (
          <FilaAlerta
            key={alerta.id}
            alerta={alerta}
            alResolver={() => {
              alResolver(alerta);
            }}
            alMarcarVista={() => {
              alMarcarVista(alerta);
            }}
            alVerDetalle={() => {
              alVerDetalle(alerta);
            }}
            {...(puedeEditar(alerta) && {
              alEditar: () => {
                alEditar(alerta);
              },
            })}
            {...resto}
          />
        ))}
      </ul>
    </section>
  );
}

/**
 * Agenda del día (CU-14, pantallas 3, 4, 5, 37, 49 y 50): las alertas pendientes hasta hoy con su
 * progreso, las próximas aparte, y resolver (con «Deshacer»), posponer o marcar como vista. Admin
 * y dueño reciben de la API las de toda la agencia y ven al responsable de cada una.
 */
export function PaginaAgenda({
  cliente,
  usuario,
}: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
}) {
  const esDeAgencia = usuario.rol === "admin" || usuario.rol === "dueno";
  const [pestana, setPestana] = useState<PestanaAgenda>("todas");
  const hoy = hoyEnBuenosAires();
  const [mostrarVistas, setMostrarVistas] = useState(false);
  const [tipo, setTipo] = useState<TipoAlerta | "">("");
  const [responsable, setResponsable] = useState("");
  const [pagina, setPagina] = useState(1);
  // `null` = formulario cerrado; `{}` = alta; `{ alerta }` = edición de un recordatorio.
  const [recordatorio, setRecordatorio] = useState<{ alerta?: Alerta } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const focoRecordatorio = useVolverFoco();
  const focoDetalle = useVolverFoco();
  // Id de la alerta resuelta desde el panel: su «Deshacer» recibe el foco al aparecer.
  const enfocarDeshacer = useRef<string | null>(null);
  const abrirRecordatorio = (abierto: { alerta?: Alerta }) => {
    focoRecordatorio.recordar();
    setAviso(null);
    setRecordatorio(abierto);
  };
  const cerrarRecordatorio = () => {
    setRecordatorio(null);
    focoRecordatorio.volver();
  };
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const cerrarDetalle = () => {
    setDetalleId(null);
    focoDetalle.volver();
  };
  const filtros = {
    por_pagina: POR_PAGINA,
    pagina,
    ...(tipo && { tipo }),
    ...(responsable && { propietario_id: responsable }),
    ...filtrosDePestana(pestana, hoy),
  };
  // Todo cambio de filtro vuelve a la primera página.
  const filtrar = (cambio: () => void) => {
    cambio();
    setPagina(1);
  };

  const pendientes = useAlertas(cliente, filtros);
  const vistas = useAlertas(cliente, { ...filtros, pagina: 1, estado: "vista" });
  const progreso = useProgresoDelDia(cliente);
  const marcarVista = useMarcarAlertaVista(cliente);
  const {
    resueltas,
    error: errorAlResolver,
    limpiarError,
    resolver,
    deshacer,
  } = useResolverConDeshacer(cliente);
  const totales = useTotalesAgenda(cliente, hoy, {
    responsable,
    tipo,
    conVistas: mostrarVistas,
    resueltas: resueltas.map((r) => r.alerta),
  });

  const porcentaje = progreso.data?.total_del_dia
    ? (progreso.data.resueltas_hoy / progreso.data.total_del_dia) * 100
    : 0;
  const resueltasIds = new Set(resueltas.map((r) => r.alerta.id));
  const alertas = [
    ...(pendientes.data?.items ?? []),
    ...(mostrarVistas ? (vistas.data?.items ?? []) : []),
  ]
    .filter((a) => !resueltasIds.has(a.id))
    .sort(porFecha);
  const atrasadas = alertas.filter((a) => a.fecha < hoy);
  const deHoy = alertas.filter((a) => a.fecha >= hoy);
  const acciones: AccionesDeLista = {
    cliente,
    hoy,
    mostrarResponsable: esDeAgencia,
    alResolver: resolver,
    alMarcarVista: (alerta) => {
      marcarVista.mutate(alerta.id, { onSuccess: limpiarError });
    },
    marcandoVista: marcarVista.isPending,
    puedeEditar: (alerta) =>
      alerta.tipo === "manual" &&
      alerta.estado === "pendiente" &&
      alerta.propietario_id === usuario.id,
    alEditar: (alerta) => {
      abrirRecordatorio({ alerta });
    },
    alVerDetalle: (alerta) => {
      focoDetalle.recordar();
      setDetalleId(alerta.id);
    },
  };
  const errorAccion =
    errorAlResolver ?? (marcarVista.isError ? mensajeDeError(marcarVista.error) : null);
  const ultimaPagina = pendientes.data
    ? Math.max(1, Math.ceil(pendientes.data.total / pendientes.data.por_pagina))
    : 1;
  // Si al bajar el total la página pedida queda fuera de rango (se resolvió la única de la última), retrocede.
  if (pendientes.data && pagina > ultimaPagina) setPagina(ultimaPagina);
  const sinResolver = vistas.data?.total ?? 0;
  const hayVistas = !mostrarVistas && sinResolver > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {esDeAgencia ? "Principal · Toda la agencia" : "Principal"}
          </p>
          <h1 className="text-3xl font-semibold">Agenda del día</h1>
        </div>
        <Button
          onClick={() => {
            abrirRecordatorio({});
          }}
        >
          <Plus aria-hidden="true" className="size-4" />
          Nuevo recordatorio
        </Button>
      </div>

      {recordatorio && (
        <FormularioRecordatorio
          // La clave reinicia el formulario al pasar de un recordatorio a otro.
          key={recordatorio.alerta?.id ?? "nuevo"}
          cliente={cliente}
          {...(recordatorio.alerta && { alerta: recordatorio.alerta })}
          alCerrar={cerrarRecordatorio}
          alGuardar={({ fecha }) => {
            setAviso(avisoRecordatorio(recordatorio.alerta ? "actualizado" : "creado", fecha));
            cerrarRecordatorio();
          }}
        />
      )}
      {aviso && (
        <p role="status" className="text-sm font-medium text-muted-foreground">
          {aviso}
        </p>
      )}

      <div className="flex flex-wrap gap-4">
        {progreso.data && (
          <div className="min-w-64 flex-1 rounded-2xl bg-primary p-5 text-primary-foreground">
            <p className="text-xs font-medium tracking-wide uppercase opacity-80">
              Progreso del día
            </p>
            <p className="text-xl font-semibold">
              {esDeAgencia ? "La agencia lleva" : "Llevás"} {progreso.data.resueltas_hoy} de{" "}
              {progreso.data.total_del_dia} alertas resueltas
            </p>
            <div
              role="progressbar"
              aria-label="Progreso del día"
              aria-valuemin={0}
              aria-valuenow={progreso.data.resueltas_hoy}
              aria-valuemax={progreso.data.total_del_dia}
              className="mt-3 h-2 overflow-hidden rounded-full bg-primary-foreground/25"
            >
              <div
                className="h-full bg-primary-foreground"
                style={{
                  width: `${String(porcentaje)}%`,
                }}
              />
            </div>
          </div>
        )}
        <div role="group" aria-label="Totales de la agenda" className="flex gap-4">
          {[
            { rotulo: "Atrasadas", total: totales.atrasadas },
            { rotulo: "Para hoy", total: totales.hoy },
          ].map(({ rotulo, total }) => (
            <dl key={rotulo} className="min-w-32 rounded-2xl border bg-card p-5">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {rotulo}
              </dt>
              <dd className="text-3xl font-semibold">
                <Total valor={total} />
              </dd>
            </dl>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Alertas" className="flex rounded-lg border bg-card p-1">
          {PESTANAS.map(({ clave, etiqueta }) => (
            <Button
              key={clave}
              id={`pestana-${clave}`}
              role="tab"
              aria-controls="panel-agenda"
              aria-selected={pestana === clave}
              variant={pestana === clave ? "default" : "ghost"}
              onClick={() => {
                filtrar(() => {
                  setPestana(clave);
                });
              }}
            >
              {etiqueta}{" "}
              <span className="tabular-nums">
                <Total valor={totales[clave]} />
              </span>
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={mostrarVistas}
            aria-label="Mostrar vistas"
            onClick={() => {
              setMostrarVistas(!mostrarVistas);
            }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
                mostrarVistas ? "bg-primary" : "bg-input",
              )}
            >
              <span
                className={cn(
                  "size-4 rounded-full bg-background transition-transform",
                  mostrarVistas && "translate-x-4",
                )}
              />
            </span>
            Mostrar vistas
          </button>
          <select
            aria-label="Tipo"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={tipo}
            onChange={(e) => {
              filtrar(() => {
                setTipo(e.target.value as TipoAlerta | "");
              });
            }}
          >
            <option value="">Tipo: todos</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO_ALERTA[t]}
              </option>
            ))}
          </select>
          {esDeAgencia && (
            <FiltroResponsable
              cliente={cliente}
              valor={responsable}
              alCambiar={(id) => {
                filtrar(() => {
                  setResponsable(id);
                });
              }}
            />
          )}
        </div>
      </div>

      {errorAccion && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorAccion}
        </p>
      )}
      {mostrarVistas && vistas.isError && (
        <p role="alert">No pudimos cargar las alertas vistas. Probá de nuevo en unos minutos.</p>
      )}
      {pendientes.isPending && <p role="status">Cargando alertas…</p>}
      {pendientes.isError && (
        <p role="alert">No pudimos cargar las alertas. Probá de nuevo en unos minutos.</p>
      )}

      <div
        id="panel-agenda"
        role="tabpanel"
        aria-labelledby={`pestana-${pestana}`}
        className="flex flex-col gap-4"
      >
        {pendientes.data && !vistas.isPending && alertas.length === 0 && (
          <div role="status" className="rounded-2xl border bg-card p-8 text-center">
            <h2 className="text-lg font-semibold">
              {pestana !== "todas"
                ? TITULO_VACIO[pestana]
                : hayVistas
                  ? "No hay alertas nuevas"
                  : "¡Estás al día!"}
            </h2>
            {pestana === "todas" && (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  {hayVistas
                    ? `Tenés ${String(sinResolver)} ${sinResolver === 1 ? "alerta vista" : "alertas vistas"} sin resolver.`
                    : esDeAgencia
                      ? "La agencia no tiene alertas pendientes para hoy."
                      : "No tenés alertas pendientes para hoy. Podés adelantar trabajo o dejar un recordatorio."}
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  {hayVistas && (
                    <Button
                      onClick={() => {
                        filtrar(() => {
                          setMostrarVistas(true);
                        });
                      }}
                    >
                      Ver las vistas
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      filtrar(() => {
                        setPestana("proximas");
                      });
                    }}
                  >
                    Adelantar próximas
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      abrirRecordatorio({});
                    }}
                  >
                    Crear recordatorio
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {alertas.length > 0 && (
          <div className="rounded-2xl border bg-card p-2">
            {pestana !== "todas" ? (
              <ListaDeAlertas alertas={alertas} {...acciones} />
            ) : (
              <>
                {atrasadas.length > 0 && (
                  <ListaDeAlertas
                    titulo={`Atrasadas · ${String(atrasadas.length)}`}
                    alertas={atrasadas}
                    {...acciones}
                  />
                )}
                <ListaDeAlertas
                  titulo={`Hoy · ${String(deHoy.length)}`}
                  alertas={deHoy}
                  {...acciones}
                />
              </>
            )}
          </div>
        )}

        {ultimaPagina > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Página {pagina} de {ultimaPagina}: mostrando {pendientes.data?.items.length} de{" "}
              {pendientes.data?.total} alertas
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={pagina <= 1}
                onClick={() => {
                  setPagina(pagina - 1);
                }}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={pagina >= ultimaPagina}
                onClick={() => {
                  setPagina(pagina + 1);
                }}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      {detalleId && (
        <PanelDetalleAlerta
          key={detalleId}
          cliente={cliente}
          alertaId={detalleId}
          hoy={hoy}
          alCerrar={cerrarDetalle}
          alResolver={(alerta) => {
            // La fila desaparece: el foco pasa al «Deshacer» del aviso.
            enfocarDeshacer.current = alerta.id;
            focoDetalle.olvidar();
            resolver(alerta);
            setDetalleId(null);
          }}
          alMarcarVista={acciones.alMarcarVista}
          marcandoVista={marcarVista.isPending}
        />
      )}

      <div
        aria-live="polite"
        className="fixed bottom-6 left-1/2 flex -translate-x-1/2 flex-col gap-2"
      >
        {resueltas
          .filter((r) => !r.enviada)
          .map(({ alerta }) => (
            <div
              key={alerta.id}
              className="flex items-center gap-3 rounded-xl bg-foreground px-4 py-3 text-background"
            >
              <Check aria-hidden="true" className="size-5" />
              <div>
                <p className="font-medium">Alerta resuelta</p>
                <p className="text-sm opacity-80">{ETIQUETA_TIPO_ALERTA[alerta.tipo]}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-foreground"
                aria-label={`Deshacer: ${alerta.descripcion}`}
                ref={(boton) => {
                  if (boton && enfocarDeshacer.current === alerta.id) {
                    enfocarDeshacer.current = null;
                    boton.focus();
                  }
                }}
                onClick={() => {
                  deshacer(alerta.id);
                }}
              >
                Deshacer
              </Button>
            </div>
          ))}
      </div>
    </div>
  );
}
