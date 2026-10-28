import { mensajeDeError, type FiltrosHoteles, type Hotel } from "@rumbo/shared";
import { useDestinos, useHoteles } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Plus } from "lucide-react";
import { useState } from "react";
import { SinResultadosHoteles, type FiltroAmpliable } from "../../hoteles/SinResultadosHoteles";
import { TarjetaHotel } from "../../hoteles/TarjetaHotel";
import { Button } from "@/components/ui/button";

const sinAcentos = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();

function ResultadosHoteles({
  cliente,
  destinoId,
  elegidos,
  alElegir,
}: {
  cliente: AxiosInstance;
  destinoId?: string;
  elegidos: readonly string[];
  alElegir: (hotel: Hotel) => void;
}) {
  const [filtros, setFiltros] = useState<FiltrosHoteles>({
    pagina: 1,
    orden: "valoracion",
    destino_id: destinoId,
  });
  const { data, isPending, isError, error } = useHoteles(cliente, filtros);

  if (isPending) return <p role="status">Cargando hoteles…</p>;
  if (isError) return <p role="alert">No pudimos cargar los hoteles. {mensajeDeError(error)}</p>;
  if (data.total === 0) {
    return (
      <SinResultadosHoteles
        alternativas={data.alternativas}
        alQuitar={(filtro: FiltroAmpliable) => {
          setFiltros((f) => ({ ...f, [filtro]: undefined, pagina: 1 }));
        }}
        alLimpiar={() => {
          setFiltros({ pagina: 1, orden: "valoracion" });
        }}
      />
    );
  }
  return (
    <ul aria-label="Hoteles encontrados" className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {data.items.map((hotel) => (
        <TarjetaHotel
          key={hotel.id}
          hotel={hotel}
          accion={
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Agregar ${hotel.nombre}`}
              disabled={elegidos.includes(hotel.id)}
              onClick={() => {
                alElegir(hotel);
              }}
            >
              <Plus aria-hidden="true" /> {elegidos.includes(hotel.id) ? "Agregado" : "Agregar"}
            </Button>
          }
        />
      ))}
    </ul>
  );
}

/**
 * Buscador de hoteles del catálogo dentro de la cotización (RF-106, CU-06 A4): arranca filtrado
 * por el destino de la oportunidad (resuelto por nombre) y ordenado por valoración.
 */
export function BuscadorHoteles({
  cliente,
  destinoConsultado,
  elegidos,
  alElegir,
}: {
  cliente: AxiosInstance;
  destinoConsultado: string | null;
  elegidos: readonly string[];
  alElegir: (hotel: Hotel) => void;
}) {
  const destinos = useDestinos(cliente, { por_pagina: 100 });
  // Con el catálogo de destinos todavía cargando se espera; si falla, se busca sin destino.
  if (destinos.isPending) return <p role="status">Cargando hoteles…</p>;
  const destino = destinoConsultado
    ? destinos.data?.items.find((d) => sinAcentos(d.nombre) === sinAcentos(destinoConsultado))
    : undefined;
  return (
    <ResultadosHoteles
      cliente={cliente}
      destinoId={destino?.id}
      elegidos={elegidos}
      alElegir={alElegir}
    />
  );
}
