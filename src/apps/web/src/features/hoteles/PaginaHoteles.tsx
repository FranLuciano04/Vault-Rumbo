import { mensajeDeError, type FiltrosHoteles, type UsuarioActual } from "@rumbo/shared";
import { useDebouncedValue, useDestinos, useHoteles } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button, variantesBoton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TarjetaHotel } from "./TarjetaHotel";

const CATEGORIAS = ["3 estrellas", "4 estrellas", "5 estrellas"];
const SERVICIOS = ["wifi", "pileta", "desayuno", "spa", "cocina", "all inclusive"];
const ORDENES: { valor: NonNullable<FiltrosHoteles["orden"]>; etiqueta: string }[] = [
  { valor: "valoracion", etiqueta: "Mejor valorados" },
  { valor: "precio", etiqueta: "Precio" },
  { valor: "nombre", etiqueta: "Nombre" },
];
const ETIQUETA_FILTRO = {
  destino_id: "destino",
  categoria: "categoría",
  precio_max: "precio máximo",
  servicio: "servicio",
} as const;
const FILTROS_INICIALES: FiltrosHoteles = { pagina: 1, orden: "valoracion" };
const CLASE_SELECT = "h-9 rounded-md border border-input bg-background px-3 text-sm";

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * Catálogo de hoteles (CU-18, pantallas 21, 22 y 44). El freelance lo consulta pero no da de alta:
 * lo decide la API (`puede_dar_de_alta`) en el sin resultados, y el rol en el encabezado.
 */
export function PaginaHoteles({
  cliente,
  usuario,
}: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
}) {
  const [filtros, setFiltros] = useState<FiltrosHoteles>(FILTROS_INICIALES);
  const [textoPrecio, setTextoPrecio] = useState("");
  const precioMax = useDebouncedValue(textoPrecio.trim() || undefined);
  const { data, isPending, isError, error, isPlaceholderData } = useHoteles(cliente, filtros);
  const { data: destinos } = useDestinos(cliente, { activo: true, por_pagina: 100 });
  const nombreDestino = (id: string) => destinos?.items.find((d) => d.id === id)?.nombre;

  // Todo cambio de filtro vuelve a la primera página.
  const filtrar = (cambios: FiltrosHoteles) => {
    setFiltros((f) => ({ ...f, ...cambios, pagina: 1 }));
  };
  const irAPagina = (pagina: number) => {
    setFiltros((f) => ({ ...f, pagina }));
  };
  const limpiar = () => {
    setTextoPrecio("");
    setFiltros(FILTROS_INICIALES);
  };
  const quitar = (filtro: keyof typeof ETIQUETA_FILTRO) => {
    if (filtro === "precio_max") setTextoPrecio("");
    filtrar({ [filtro]: undefined });
  };

  // El precio ya demorado pasa a los filtros (ajuste de estado durante el render, sin efecto).
  if (precioMax !== filtros.precio_max) filtrar({ precio_max: precioMax });

  const pagina = filtros.pagina ?? 1;
  const ultima = data ? Math.max(1, Math.ceil(data.total / data.por_pagina)) : 1;
  const puedeAlta = usuario.rol !== "freelance";
  const sinResultados = data && data.items.length === 0 && !isPlaceholderData;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Hoteles
          </p>
          <h1 className="text-3xl font-semibold">Catálogo de hoteles</h1>
          <p className="text-sm text-muted-foreground">
            El puntaje es el promedio de las reseñas de los clientes.
          </p>
        </div>
        {puedeAlta && (
          <Link to="/hoteles/nuevo" className={variantesBoton()}>
            <Plus aria-hidden="true" />
            Nuevo hotel
          </Link>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Destino"
          className={CLASE_SELECT}
          value={filtros.destino_id ?? ""}
          onChange={(e) => {
            filtrar({ destino_id: e.target.value || undefined });
          }}
        >
          <option value="">Destino: todos</option>
          {destinos?.items.map((destino) => (
            <option key={destino.id} value={destino.id}>
              {destino.nombre}
            </option>
          ))}
        </select>
        <select
          aria-label="Categoría"
          className={CLASE_SELECT}
          value={filtros.categoria ?? ""}
          onChange={(e) => {
            filtrar({ categoria: e.target.value || undefined });
          }}
        >
          <option value="">Categoría: todas</option>
          {CATEGORIAS.map((categoria) => (
            <option key={categoria}>{categoria}</option>
          ))}
        </select>
        <Input
          type="number"
          min={0}
          aria-label="Precio máximo"
          placeholder="Precio máximo"
          className="w-40"
          value={textoPrecio}
          onChange={(e) => {
            setTextoPrecio(e.target.value);
          }}
        />
        <select
          aria-label="Ordenar por"
          className={CLASE_SELECT}
          value={filtros.orden}
          onChange={(e) => {
            filtrar({ orden: e.target.value as FiltrosHoteles["orden"] });
          }}
        >
          {ORDENES.map(({ valor, etiqueta }) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>
        <Button variant="ghost" onClick={limpiar}>
          Limpiar filtros
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {SERVICIOS.map((servicio) => {
          const activo = filtros.servicio === servicio;
          return (
            <Button
              key={servicio}
              size="sm"
              className="rounded-full"
              variant={activo ? "default" : "outline"}
              aria-pressed={activo}
              onClick={() => {
                filtrar({ servicio: activo ? undefined : servicio });
              }}
            >
              {capitalizar(servicio)}
            </Button>
          );
        })}
      </div>

      {isPending && <p role="status">Cargando hoteles…</p>}
      {isError && <p role="alert">No pudimos cargar los hoteles. {mensajeDeError(error)}</p>}
      {data && <p className="text-sm text-muted-foreground">{data.total} hoteles encontrados</p>}

      {sinResultados && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border bg-card p-6">
          <p>No encontramos hoteles con esos filtros.</p>
          <div className="flex flex-wrap gap-2">
            {data.alternativas?.ampliar_filtros.map((filtro) => (
              <Button
                key={filtro}
                variant="outline"
                onClick={() => {
                  quitar(filtro);
                }}
              >
                Quitar filtro: {ETIQUETA_FILTRO[filtro]}
              </Button>
            ))}
            {data.alternativas?.puede_dar_de_alta && (
              <Link to="/hoteles/nuevo" className={variantesBoton()}>
                Dar de alta un hotel
              </Link>
            )}
          </div>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div
          aria-busy={isPlaceholderData}
          className={cn(
            "flex flex-col gap-4 transition-opacity",
            isPlaceholderData && "opacity-60",
          )}
        >
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((hotel) => (
              <TarjetaHotel
                key={hotel.id}
                hotel={hotel}
                destino={nombreDestino(hotel.destino_id)}
              />
            ))}
          </ul>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={pagina <= 1 || isPlaceholderData}
              onClick={() => {
                irAPagina(pagina - 1);
              }}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={pagina >= ultima || isPlaceholderData}
              onClick={() => {
                irAPagina(pagina + 1);
              }}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
