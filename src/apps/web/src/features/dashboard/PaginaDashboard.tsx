import { formatearFecha, formatearImporte, type UsuarioActual } from "@rumbo/shared";
import { useDashboard } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Link } from "react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmbudoDeVentas } from "./EmbudoDeVentas";
import { Importes, TarjetaIndicador } from "./TarjetaIndicador";

interface Vendedor {
  id: string;
  nombre: string;
}

const CLASE_PANEL = "rounded-2xl border bg-card p-4";

/**
 * Dashboard (CU-21, pantallas 28, 46 y 47). Admin y dueño ven toda la agencia y pueden filtrar por
 * responsable; empleado y freelance ven lo suyo, recortado por la API.
 */
export function PaginaDashboard({
  cliente,
  usuario,
}: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
}) {
  const veAgencia = usuario.rol === "admin" || usuario.rol === "dueno";
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [responsableId, setResponsableId] = useState("");
  // Las opciones del selector salen del ranking sin filtrar, para que no se achiquen al elegir uno.
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);

  const { data, isPending, isError } = useDashboard(cliente, {
    desde: desde || undefined,
    hasta: hasta || undefined,
    responsable_id: veAgencia && responsableId ? responsableId : undefined,
  });

  if (data && veAgencia && !responsableId) {
    const actuales = data.ventas_por_vendedor.map((v) => ({
      id: v.vendedor_id,
      nombre: v.vendedor_nombre,
    }));
    if (actuales.map((v) => v.id).join() !== vendedores.map((v) => v.id).join()) {
      setVendedores(actuales);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Gestión</p>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        {data && (
          <p className="text-sm text-muted-foreground">
            Del {formatearFecha(data.desde)} al {formatearFecha(data.hasta)}
          </p>
        )}
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="dashboard-desde">Desde</Label>
          <Input
            id="dashboard-desde"
            type="date"
            value={desde}
            onChange={(e) => {
              setDesde(e.target.value);
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="dashboard-hasta">Hasta</Label>
          <Input
            id="dashboard-hasta"
            type="date"
            value={hasta}
            onChange={(e) => {
              setHasta(e.target.value);
            }}
          />
        </div>
        {veAgencia && (
          <select
            aria-label="Responsable"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={responsableId}
            onChange={(e) => {
              setResponsableId(e.target.value);
            }}
          >
            <option value="">Toda la agencia</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
              </option>
            ))}
          </select>
        )}
      </div>

      {isPending && <p role="status">Cargando el dashboard…</p>}
      {isError && (
        <p role="alert">No pudimos cargar el dashboard. Probá de nuevo en unos minutos.</p>
      )}
      {data && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {veAgencia ? (
              <>
                <TarjetaIndicador titulo="Ventas del mes" ruta="/viajes">
                  <Importes montos={data.ventas} />
                </TarjetaIndicador>
                <TarjetaIndicador titulo="Ganancia estimada" ruta="/viajes">
                  <Importes montos={data.ganancia_estimada} />
                </TarjetaIndicador>
                <TarjetaIndicador titulo="Cobrado a pasajeros" ruta="/viajes">
                  <Importes montos={data.cobrado} />
                  <span className="mt-1 block text-sm font-normal text-muted-foreground">
                    Pendiente de cobrar: <Importes montos={data.pendiente_de_cobrar} />
                  </span>
                </TarjetaIndicador>
                <TarjetaIndicador titulo="A pagar a operadores" ruta="/viajes">
                  <Importes montos={data.pendiente_de_pagar} />
                </TarjetaIndicador>
                <TarjetaIndicador titulo="Comisiones">
                  <Importes montos={data.comisiones} />
                </TarjetaIndicador>
                <TarjetaIndicador titulo="Ticket promedio">
                  <Importes montos={data.ticket_promedio} />
                </TarjetaIndicador>
              </>
            ) : (
              <>
                <TarjetaIndicador titulo="Tu comisión del mes" ruta="/viajes">
                  <Importes montos={data.comisiones} />
                </TarjetaIndicador>
                <TarjetaIndicador titulo="Cobrado a tus pasajeros" ruta="/viajes">
                  <Importes montos={data.cobrado} />
                  <span className="mt-1 block text-sm font-normal text-muted-foreground">
                    Pendiente de cobrar: <Importes montos={data.pendiente_de_cobrar} />
                  </span>
                </TarjetaIndicador>
                <TarjetaIndicador titulo="Tus viajes activos" ruta="/viajes">
                  {data.viajes_proximos.length}
                </TarjetaIndicador>
              </>
            )}
            <TarjetaIndicador titulo="Alertas pendientes" ruta="/agenda">
              {data.alertas_pendientes}
            </TarjetaIndicador>
          </div>

          <EmbudoDeVentas embudo={data.embudo} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TarjetaIndicador titulo="Consultas pendientes" ruta="/oportunidades">
              {data.consultas_pendientes}
            </TarjetaIndicador>
            <TarjetaIndicador titulo="Presupuestos abiertos" ruta="/cotizaciones">
              {data.presupuestos_abiertos}
            </TarjetaIndicador>
            <TarjetaIndicador titulo="Reservas confirmadas" ruta="/viajes">
              {data.reservas_confirmadas}
            </TarjetaIndicador>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <section aria-labelledby="titulo-vencimientos" className={CLASE_PANEL}>
              <h2 id="titulo-vencimientos" className="text-lg font-semibold">
                Próximos vencimientos
              </h2>
              {data.proximos_vencimientos.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No hay vencimientos próximos.</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {data.proximos_vencimientos.map((v) => (
                    <li key={v.pago_id}>
                      <Link to={`/viajes/${v.viaje_id}`} className="flex justify-between gap-2">
                        <span>
                          {formatearFecha(v.vencimiento)} · {v.cliente_nombre}
                        </span>
                        <span>{formatearImporte(v.monto, v.moneda)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="titulo-viajes" className={CLASE_PANEL}>
              <h2 id="titulo-viajes" className="text-lg font-semibold">
                Viajes próximos
              </h2>
              {data.viajes_proximos.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No hay viajes próximos.</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {data.viajes_proximos.map((v) => (
                    <li key={v.viaje_id}>
                      <Link to={`/viajes/${v.viaje_id}`} className="flex justify-between gap-2">
                        <span>
                          {v.destino_nombre} · {v.cliente_nombre}
                        </span>
                        <span>{formatearFecha(v.fecha_salida)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="titulo-destinos" className={CLASE_PANEL}>
              <h2 id="titulo-destinos" className="text-lg font-semibold">
                Destinos más vendidos
              </h2>
              {data.destinos_mas_vendidos.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Todavía no hay ventas.</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {data.destinos_mas_vendidos.map((d) => (
                    <li key={d.destino_id} className="flex justify-between gap-2">
                      <span>{d.destino_nombre}</span>
                      <span>{d.viajes} viajes</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {veAgencia && (
              <section aria-labelledby="titulo-vendedores" className={CLASE_PANEL}>
                <h2 id="titulo-vendedores" className="text-lg font-semibold">
                  Ventas por vendedor
                </h2>
                {data.ventas_por_vendedor.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Todavía no hay ventas.</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {data.ventas_por_vendedor.map((v) => (
                      <li key={v.vendedor_id} className="flex justify-between gap-2">
                        <span>{v.vendedor_nombre}</span>
                        <span className="text-right">
                          <Importes montos={v.ventas} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
