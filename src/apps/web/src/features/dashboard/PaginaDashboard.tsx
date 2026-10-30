import {
  formatearFecha,
  formatearImporte,
  type MontoPorMoneda,
  type UsuarioActual,
} from "@rumbo/shared";
import { useDashboard, useUsuarios } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Eye } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mensajeDeError } from "@/lib/errores";
import { EmbudoDeVentas } from "./EmbudoDeVentas";
import { PanelLista } from "./PanelLista";
import { Importes, TarjetaIndicador } from "./TarjetaIndicador";
import { VentasPorMes } from "./VentasPorMes";

/** «Margen 20 %» (o uno por moneda si hay más de una): `margen` es una fracción por moneda. */
function textoMargen(margen: readonly MontoPorMoneda[]) {
  const porcentaje = (m: MontoPorMoneda) => `${String(Math.round(Number(m.monto) * 100))} %`;
  const [unico] = margen;
  if (!unico) return "Margen 0 %";
  if (margen.length === 1) return `Margen ${porcentaje(unico)}`;
  return `Margen ${margen.map((m) => `${m.moneda} ${porcentaje(m)}`).join(" · ")}`;
}

const NOTA_USD = "Los importes en USD se muestran aparte, sin convertir.";
const CLASE_SECUNDARIO = "mt-1 block text-sm font-normal text-muted-foreground";

/**
 * Dashboard (CU-21, pantallas 28, 46 y 47). Admin y dueño ven toda la agencia y pueden filtrar por
 * empleado; empleado y freelance ven lo suyo, recortado por la API.
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

  const { data: usuarios } = useUsuarios(
    cliente,
    { activo: true, por_pagina: 100 },
    { enabled: veAgencia },
  );
  const { data, isPending, isError, error } = useDashboard(cliente, {
    desde: desde || undefined,
    hasta: hasta || undefined,
    responsable_id: veAgencia && responsableId ? responsableId : undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Marketing y análisis
        </p>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        {data && !isError && (
          <p className="text-sm text-muted-foreground">
            Del {formatearFecha(data.desde)} al {formatearFecha(data.hasta)}
          </p>
        )}
      </header>

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Eye aria-hidden="true" className="size-4 shrink-0" />
        {veAgencia
          ? `Foto en vivo, solo lectura. Tocá un indicador para ver el detalle. ${NOTA_USD}`
          : `Ves solo tus ventas y tus comisiones. ${NOTA_USD}`}
      </p>

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
          <div className="flex flex-col gap-1">
            <Label htmlFor="dashboard-responsable">Empleado</Label>
            <select
              id="dashboard-responsable"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={responsableId}
              onChange={(e) => {
                setResponsableId(e.target.value);
              }}
            >
              <option value="">Toda la agencia</option>
              {usuarios?.items.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isPending && <p role="status">Cargando el dashboard…</p>}
      {isError && <p role="alert">{mensajeDeError(error)}</p>}
      {data && !isError && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {veAgencia ? (
              <>
                <TarjetaIndicador titulo="Ventas del mes" ruta="/viajes">
                  <Importes montos={data.ventas} />
                </TarjetaIndicador>
                <TarjetaIndicador titulo="Ganancia estimada" ruta="/viajes">
                  <Importes montos={data.ganancia_estimada} />
                  <span className={CLASE_SECUNDARIO}>{textoMargen(data.margen)}</span>
                </TarjetaIndicador>
                <TarjetaIndicador titulo="Cobrado a pasajeros" ruta="/viajes">
                  <Importes montos={data.cobrado} />
                  <span className={CLASE_SECUNDARIO}>
                    Pendiente de cobrar: <Importes montos={data.pendiente_de_cobrar} enLinea />
                  </span>
                </TarjetaIndicador>
                <TarjetaIndicador titulo="A pagar a operadores" ruta="/viajes">
                  <Importes montos={data.pendiente_de_pagar} />
                </TarjetaIndicador>
                <TarjetaIndicador titulo="Comisiones">
                  <Importes montos={data.comisiones} />
                </TarjetaIndicador>
              </>
            ) : (
              <>
                <TarjetaIndicador titulo="Ventas del mes" ruta="/viajes">
                  <Importes montos={data.ventas} />
                </TarjetaIndicador>
                <TarjetaIndicador titulo="Tu comisión del mes" ruta="/viajes">
                  <Importes montos={data.comisiones} />
                </TarjetaIndicador>
                <TarjetaIndicador titulo="Cobrado a tus pasajeros" ruta="/viajes">
                  <Importes montos={data.cobrado} />
                  <span className={CLASE_SECUNDARIO}>
                    Pendiente de cobrar: <Importes montos={data.pendiente_de_cobrar} enLinea />
                  </span>
                </TarjetaIndicador>
                <TarjetaIndicador titulo="Viajes próximos" ruta="/viajes">
                  {data.viajes_proximos.length}
                </TarjetaIndicador>
              </>
            )}
            <TarjetaIndicador titulo="Ticket promedio">
              <Importes montos={data.ticket_promedio} />
            </TarjetaIndicador>
            <TarjetaIndicador titulo="Alertas pendientes" ruta="/agenda">
              {data.alertas_pendientes}
            </TarjetaIndicador>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <EmbudoDeVentas embudo={data.embudo} />
            <VentasPorMes meses={data.ventas_mensuales} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TarjetaIndicador titulo="Consultas pendientes" ruta="/oportunidades">
              {data.consultas_pendientes}
            </TarjetaIndicador>
            <TarjetaIndicador titulo="Presupuestos abiertos" ruta="/oportunidades">
              {data.presupuestos_abiertos}
            </TarjetaIndicador>
            <TarjetaIndicador titulo="Reservas confirmadas" ruta="/viajes">
              {data.reservas_confirmadas}
            </TarjetaIndicador>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <PanelLista
              titulo="Próximos vencimientos"
              vacio="No hay vencimientos próximos."
              hayFilas={data.proximos_vencimientos.length > 0}
            >
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
            </PanelLista>

            <PanelLista
              titulo="Viajes próximos"
              vacio="No hay viajes próximos."
              hayFilas={data.viajes_proximos.length > 0}
            >
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
            </PanelLista>

            <PanelLista
              titulo="Destinos más vendidos"
              vacio="Todavía no hay ventas."
              hayFilas={data.destinos_mas_vendidos.length > 0}
            >
              {data.destinos_mas_vendidos.map((d) => (
                <li key={d.destino_id} className="flex justify-between gap-2">
                  <span>{d.destino_nombre}</span>
                  <span>{d.viajes} viajes</span>
                </li>
              ))}
            </PanelLista>

            {veAgencia && (
              <PanelLista
                titulo="Ventas por vendedor"
                vacio="Todavía no hay ventas."
                hayFilas={data.ventas_por_vendedor.length > 0}
              >
                {data.ventas_por_vendedor.map((v) => (
                  <li key={v.vendedor_id} className="flex justify-between gap-2">
                    <span>{v.vendedor_nombre}</span>
                    <span className="text-right">
                      <Importes montos={v.ventas} />
                    </span>
                  </li>
                ))}
              </PanelLista>
            )}
          </div>
        </>
      )}
    </div>
  );
}
