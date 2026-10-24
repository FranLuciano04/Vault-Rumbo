import type { HistorialCliente as Historial } from "@rumbo/shared";
import { useHistorialCliente } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { formatearFecha } from "@/lib/formato";

const ESTADO_OPORTUNIDAD: Record<Historial["oportunidades"][number]["estado"], string> = {
  nueva: "Nueva",
  en_gestion: "En gestión",
  cotizada: "Cotizada",
  ganada: "Ganada",
  perdida: "Perdida",
};
const ESTADO_VIAJE: Record<Historial["viajes"][number]["estado"], string> = {
  reservado: "Reservado",
  vendido: "Vendido",
  confirmado: "Confirmado",
  en_curso: "En curso",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const Estado = ({ children }: { children: string }) => (
  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
    {children}
  </span>
);

function Seccion({
  titulo,
  vacio,
  hayItems,
  children,
}: {
  titulo: string;
  vacio: string;
  hayItems: boolean;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {titulo}
      </h3>
      {hayItems ? (
        <ul className="flex flex-col divide-y rounded-xl border">{children}</ul>
      ) : (
        <p className="text-sm text-muted-foreground">{vacio}</p>
      )}
    </section>
  );
}

const CLASE_ENLACE = "flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-accent";

/** Memoria del cliente (RF-006, CU-03): oportunidades, viajes y reseñas con un enlace a cada una. */
export function HistorialCliente({ cliente, id }: { cliente: AxiosInstance; id: string }) {
  const { data, isPending, isError } = useHistorialCliente(cliente, id);

  return (
    <div className="flex flex-col gap-5 rounded-2xl border bg-card p-5">
      <h2 className="text-xl font-semibold">Historial</h2>
      {isPending && <p role="status">Cargando el historial…</p>}
      {isError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          No pudimos cargar el historial. Probá de nuevo en unos minutos.
        </p>
      )}
      {data && (
        <>
          <Seccion
            titulo="Oportunidades"
            vacio="Sin oportunidades."
            hayItems={data.oportunidades.length > 0}
          >
            {data.oportunidades.map((o) => (
              <li key={o.id}>
                <Link to={`/oportunidades/${o.id}`} className={CLASE_ENLACE}>
                  <span className="font-medium">{o.destino_consultado}</span>
                  <Estado>{ESTADO_OPORTUNIDAD[o.estado]}</Estado>
                </Link>
              </li>
            ))}
          </Seccion>
          <Seccion titulo="Viajes" vacio="Sin viajes." hayItems={data.viajes.length > 0}>
            {data.viajes.map((v) => (
              <li key={v.id}>
                <Link to={`/viajes/${v.id}`} className={CLASE_ENLACE}>
                  <span>
                    {formatearFecha(v.fecha_salida)} → {formatearFecha(v.fecha_regreso)}
                  </span>
                  <Estado>{ESTADO_VIAJE[v.estado]}</Estado>
                </Link>
              </li>
            ))}
          </Seccion>
          <Seccion titulo="Reseñas" vacio="Sin reseñas." hayItems={data.resenas.length > 0}>
            {data.resenas.map((r) => (
              <li key={r.id}>
                <Link to={`/hoteles/${r.hotel_id}?resena=${r.id}`} className={CLASE_ENLACE}>
                  <span>
                    <span className="font-medium">{r.puntaje} de 5</span> · {r.comentario}
                  </span>
                  <span className="text-muted-foreground">{formatearFecha(r.fecha)}</span>
                </Link>
              </li>
            ))}
          </Seccion>
        </>
      )}
    </div>
  );
}
