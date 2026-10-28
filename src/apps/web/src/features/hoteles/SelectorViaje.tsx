import { formatearFecha } from "@rumbo/shared";
import { useDestinos, useViajes } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import type { ComponentProps } from "react";
import { CampoFormulario, CLASE_SELECT } from "@/components/CampoFormulario";

type PropsSelect = Omit<ComponentProps<"select">, "id" | "children">;

/** Campo con el select ya armado; `opciones` son los viajes a elegir además de «Sin viaje». */
function CampoViaje({
  id,
  deshabilitado,
  opciones,
  aviso,
  ...select
}: PropsSelect & {
  id: string;
  deshabilitado: boolean;
  opciones?: { id: string; texto: string }[];
  aviso?: string;
}) {
  return (
    <>
      <CampoFormulario id={id} etiqueta="Viaje (opcional)">
        {(props) => (
          <select disabled={deshabilitado} className={CLASE_SELECT} {...props} {...select}>
            <option value="">Sin viaje</option>
            {opciones?.map(({ id: viajeId, texto }) => (
              <option key={viajeId} value={viajeId}>
                {texto}
              </option>
            ))}
          </select>
        )}
      </CampoFormulario>
      {aviso && (
        <p role="alert" className="text-xs text-destructive">
          {aviso}
        </p>
      )}
    </>
  );
}

/** Los viajes del cliente elegido; solo se consultan cuando hay cliente. */
function ViajesDelCliente({
  cliente,
  clienteId,
  ...campo
}: PropsSelect & { id: string; cliente: AxiosInstance; clienteId: string }) {
  const viajes = useViajes(cliente, { cliente_id: clienteId, por_pagina: 100 });
  const { data: destinos } = useDestinos(cliente, { por_pagina: 100 });
  return (
    <CampoViaje
      {...campo}
      deshabilitado={viajes.isPending}
      aviso={viajes.isError ? "No pudimos cargar los viajes del cliente." : undefined}
      opciones={viajes.data?.items.map(({ id, destino_id, fecha_salida }) => ({
        id,
        texto: `${destinos?.items.find((d) => d.id === destino_id)?.nombre ?? "Viaje"} · salida ${formatearFecha(fecha_salida)}`,
      }))}
    />
  );
}

/**
 * Viaje de origen de la reseña (CU-17 A1, opcional): lista los viajes del cliente elegido y queda
 * deshabilitado mientras no haya cliente.
 */
export function SelectorViaje({
  cliente,
  clienteId,
  ...campo
}: PropsSelect & { id: string; cliente: AxiosInstance; clienteId?: string }) {
  if (!clienteId) return <CampoViaje {...campo} deshabilitado />;
  return <ViajesDelCliente {...campo} cliente={cliente} clienteId={clienteId} />;
}
