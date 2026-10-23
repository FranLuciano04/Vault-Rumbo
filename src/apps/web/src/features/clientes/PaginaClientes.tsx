import type { SegmentoCliente, UsuarioActual } from "@rumbo/shared";
import { useClientes, type FiltrosClientes } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TablaClientes } from "./TablaClientes";

const SEGMENTOS: SegmentoCliente[] = ["familia", "pareja", "amigos", "individual"];

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * Listado de clientes (CU-03, pantallas 8 y 39). El freelance solo recibe los suyos, por decisión
 * de la API: no ve el selector de vista.
 */
export function PaginaClientes({
  cliente,
  usuario,
}: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
}) {
  const esFreelance = usuario.rol === "freelance";
  const [filtros, setFiltros] = useState<FiltrosClientes>({ pagina: 1, mios: !esFreelance });
  const [verEtiqueta, setVerEtiqueta] = useState(false);
  const { data, isPending, isError } = useClientes(cliente, filtros);

  // Todo cambio de filtro vuelve a la primera página.
  const filtrar = (cambios: FiltrosClientes) => {
    setFiltros((f) => ({ ...f, ...cambios, pagina: 1 }));
  };
  const irAPagina = (pagina: number) => {
    setFiltros((f) => ({ ...f, pagina }));
  };

  const pagina = data?.pagina ?? 1;
  const ultima = data ? Math.max(1, Math.ceil(data.total / data.por_pagina)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Clientes</h1>

      {esFreelance ? (
        <p
          role="note"
          className="rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground"
        >
          Estás viendo solo tus clientes. Para ver el resto, pedile acceso a la dueña.
        </p>
      ) : (
        <div className="flex gap-2">
          {[
            { etiqueta: "Mis clientes", mios: true },
            { etiqueta: "Toda la agencia", mios: false },
          ].map(({ etiqueta, mios }) => (
            <Button
              key={etiqueta}
              variant={filtros.mios === mios ? "default" : "outline"}
              aria-pressed={filtros.mios === mios}
              onClick={() => {
                filtrar({ mios });
              }}
            >
              {etiqueta}
            </Button>
          ))}
        </div>
      )}

      <Input
        aria-label="Buscar por nombre, teléfono o email"
        placeholder="Buscar por nombre, teléfono o email"
        value={filtros.buscar ?? ""}
        onChange={(e) => {
          filtrar({ buscar: e.target.value || undefined });
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        {SEGMENTOS.map((segmento) => (
          <Button
            key={segmento}
            size="sm"
            variant={filtros.segmento === segmento ? "default" : "outline"}
            aria-pressed={filtros.segmento === segmento}
            onClick={() => {
              filtrar({ segmento: filtros.segmento === segmento ? undefined : segmento });
            }}
          >
            {capitalizar(segmento)}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setVerEtiqueta((v) => !v);
          }}
        >
          Etiquetas
        </Button>
        {verEtiqueta && (
          <Input
            aria-label="Filtrar por etiqueta"
            placeholder="Etiqueta"
            className="h-8 w-48"
            value={filtros.etiqueta ?? ""}
            onChange={(e) => {
              filtrar({ etiqueta: e.target.value || undefined });
            }}
          />
        )}
      </div>

      {isPending && <p role="status">Cargando clientes…</p>}
      {isError && (
        <p role="alert">No pudimos cargar los clientes. Probá de nuevo en unos minutos.</p>
      )}
      {data && data.items.length === 0 && <p>No se encontraron clientes.</p>}
      {data && data.items.length > 0 && (
        <>
          <TablaClientes clientes={data.items} />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Mostrando {data.items.length} de {data.total} clientes
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagina <= 1}
                onClick={() => {
                  irAPagina(pagina - 1);
                }}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagina >= ultima}
                onClick={() => {
                  irAPagina(pagina + 1);
                }}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
