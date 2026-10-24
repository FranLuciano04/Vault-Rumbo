import { ErrorApi, type UsuarioActual } from "@rumbo/shared";
import { useCliente } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { FormularioCliente } from "./FormularioCliente";
import { HistorialCliente } from "./HistorialCliente";
import { ETIQUETA_SEGMENTO } from "./segmentos";
import { iniciales } from "./TablaClientes";

const TITULO_TARJETA = "mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase";

const Dato = ({ titulo, children }: { titulo: string; children: string }) => (
  <div>
    <dt className="text-xs text-muted-foreground">{titulo}</dt>
    <dd className="font-medium">{children}</dd>
  </div>
);

/** Ficha del cliente (CU-03, pantallas 10 y 40): datos, edición en línea e historial. */
export function FichaCliente({
  cliente,
  usuario,
}: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
}) {
  const { id = "" } = useParams();
  const { data: ficha, isPending, error } = useCliente(cliente, id);
  const [editando, setEditando] = useState(false);

  if (isPending) return <p role="status">Cargando la ficha…</p>;
  if (error) {
    const noExiste = error instanceof ErrorApi && error.status === 404;
    return (
      <div className="flex flex-col items-start gap-3">
        <p role={noExiste ? undefined : "alert"}>
          {noExiste
            ? "Cliente no encontrado. No existe o no lo podés ver."
            : "No pudimos cargar la ficha. Probá de nuevo en unos minutos."}
        </p>
        <Link to="/clientes" className="text-sm font-medium underline">
          Volver a clientes
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-chart-2 font-medium text-primary-foreground"
          >
            {iniciales(ficha.nombre)}
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Clientes / Ficha
            </p>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold">{ficha.nombre}</h1>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                {ETIQUETA_SEGMENTO[ficha.segmento]}
              </span>
            </div>
            <ul className="flex flex-wrap gap-1">
              {ficha.etiquetas.map((etiqueta) => (
                <li key={etiqueta} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">
                  {etiqueta}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {!editando && (
          <Button
            onClick={() => {
              setEditando(true);
            }}
          >
            <Pencil aria-hidden="true" className="size-4" />
            Editar ficha
          </Button>
        )}
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[22rem_1fr]">
        {editando ? (
          <FormularioCliente
            cliente={cliente}
            ficha={ficha}
            conAsesor={usuario.rol === "admin" || usuario.rol === "dueno"}
            alTerminar={() => {
              setEditando(false);
            }}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <section className="rounded-2xl border bg-card p-5">
              <h2 className={TITULO_TARJETA}>Contacto</h2>
              <dl className="flex flex-col gap-3">
                <Dato titulo="Teléfono o email">{ficha.contacto}</Dato>
                {ficha.instagram && <Dato titulo="Instagram">{`@${ficha.instagram}`}</Dato>}
              </dl>
            </section>
            {ficha.preferencias && (
              <section className="rounded-2xl border bg-card p-5">
                <h2 className={TITULO_TARJETA}>Preferencias</h2>
                <p className="text-sm">{ficha.preferencias}</p>
              </section>
            )}
          </div>
        )}
        <HistorialCliente cliente={cliente} id={ficha.id} />
      </div>
    </div>
  );
}
