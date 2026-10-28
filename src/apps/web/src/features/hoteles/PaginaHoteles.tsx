import {
  CATEGORIAS_HOTEL,
  SERVICIOS_HOTEL,
  mensajeDeError,
  type FiltrosHoteles,
  type UsuarioActual,
} from "@rumbo/shared";
import { useDebouncedValue, useDestinos, useHoteles } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Eye, Plus } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Button, variantesBoton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SinResultadosHoteles, type FiltroAmpliable } from "./SinResultadosHoteles";
import { TarjetaHotel } from "./TarjetaHotel";

const ORDENES: { valor: NonNullable<FiltrosHoteles["orden"]>; etiqueta: string }[] = [
  { valor: "valoracion", etiqueta: "Mejor valorados" },
  { valor: "precio", etiqueta: "Precio" },
  { valor: "nombre", etiqueta: "Nombre" },
];
const FILTROS_INICIALES: FiltrosHoteles = { pagina: 1, orden: "valoracion" };
const PRECIO_VALIDO = /^\d+(\.\d{1,2})?$/;
const CLASE_SELECT = "h-9 rounded-md border border-input bg-background px-3 text-sm";

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

function Campo({ id, etiqueta, children }: { id: string; etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
    </div>
  );
}

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
  const [precioVisto, setPrecioVisto] = useState<string>();
  const contador = useRef<HTMLParagraphElement>(null);
  const precio = textoPrecio.trim();
  const precioInvalido = precio !== "" && !PRECIO_VALIDO.test(precio);
  const precioDemorado = useDebouncedValue(precio !== "" && !precioInvalido ? precio : undefined);
  const { data, isPending, isError, error, isPlaceholderData } = useHoteles(cliente, filtros);
  // Todos los destinos: el select ofrece los activos, pero un hotel puede estar en uno dado de baja.
  const { data: destinos } = useDestinos(cliente, { por_pagina: 100 });
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
  const quitar = (filtro: FiltroAmpliable) => {
    if (filtro === "precio_max") setTextoPrecio("");
    filtrar({ [filtro]: undefined });
    contador.current?.focus();
  };

  // El precio pasa a los filtros solo cuando cambia el valor ya demorado (ajuste de estado durante
  // el render, sin efecto): así limpiar o quitar el filtro no reaplica el valor viejo.
  if (precioDemorado !== precioVisto) {
    setPrecioVisto(precioDemorado);
    filtrar({ precio_max: precioDemorado });
  }

  const pagina = filtros.pagina ?? 1;
  const ultima = data ? Math.max(1, Math.ceil(data.total / data.por_pagina)) : 1;
  // Si la página pedida quedó vacía pero hay hoteles, se vuelve a la última que tiene.
  if (data && !isPlaceholderData && data.items.length === 0 && data.total > 0 && pagina > ultima) {
    irAPagina(ultima);
  }
  const puedeAlta = usuario.rol !== "freelance";
  const sinResultados = data?.total === 0 && !isPlaceholderData;

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

      {!puedeAlta && (
        <p
          role="note"
          className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <Eye aria-hidden="true" className="size-4 shrink-0" />
          Solo consulta: el catálogo de hoteles es compartido. El alta de hoteles la hacen empleados
          y administración.
        </p>
      )}

      <div className="flex flex-wrap items-start gap-3">
        <Campo id="hoteles-destino" etiqueta="Destino">
          <select
            id="hoteles-destino"
            className={CLASE_SELECT}
            value={filtros.destino_id ?? ""}
            onChange={(e) => {
              filtrar({ destino_id: e.target.value || undefined });
            }}
          >
            <option value="">Todos</option>
            {destinos?.items
              .filter((destino) => destino.activo)
              .map((destino) => (
                <option key={destino.id} value={destino.id}>
                  {destino.nombre}
                </option>
              ))}
          </select>
        </Campo>
        <Campo id="hoteles-categoria" etiqueta="Categoría">
          <select
            id="hoteles-categoria"
            className={CLASE_SELECT}
            value={filtros.categoria ?? ""}
            onChange={(e) => {
              filtrar({ categoria: e.target.value || undefined });
            }}
          >
            <option value="">Todas</option>
            {CATEGORIAS_HOTEL.map((categoria) => (
              <option key={categoria}>{categoria}</option>
            ))}
          </select>
        </Campo>
        <Campo id="hoteles-precio" etiqueta="Precio máximo">
          <Input
            id="hoteles-precio"
            type="number"
            min={0}
            step="0.01"
            className="w-40"
            aria-invalid={precioInvalido}
            aria-describedby={precioInvalido ? "hoteles-precio-error" : undefined}
            value={textoPrecio}
            onChange={(e) => {
              setTextoPrecio(e.target.value);
            }}
          />
          {precioInvalido && (
            <p id="hoteles-precio-error" className="text-sm text-destructive">
              Ingresá un importe válido, por ejemplo 150000 o 150000.50.
            </p>
          )}
        </Campo>
        <Campo id="hoteles-orden" etiqueta="Ordenar por">
          <select
            id="hoteles-orden"
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
        </Campo>
        <Button variant="ghost" className="self-end" onClick={limpiar}>
          Limpiar filtros
        </Button>
      </div>

      <div role="group" aria-label="Servicios" className="flex flex-wrap items-center gap-2">
        {SERVICIOS_HOTEL.map((servicio) => {
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
      {data && (
        <p ref={contador} tabIndex={-1} className="text-sm text-muted-foreground outline-none">
          {data.total} {data.total === 1 ? "hotel encontrado" : "hoteles encontrados"}
        </p>
      )}

      {sinResultados && (
        <SinResultadosHoteles
          alternativas={data.alternativas}
          alQuitar={quitar}
          alLimpiar={limpiar}
        />
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
