import { ETIQUETA_ESTADO_OPORTUNIDAD, ETIQUETA_ESTADO_VIAJE, formatearFecha } from "@rumbo/shared";
import { useHistorialCliente } from "@rumbo/shared/hooks";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { cliente } from "../../cliente";

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
    <View className="gap-2">
      <Text role="heading" className="text-xs font-medium uppercase text-gray-500">
        {titulo}
      </Text>
      {hayItems ? children : <Text className="text-sm text-gray-500">{vacio}</Text>}
    </View>
  );
}

const Fila = ({ principal, estado }: { principal: string; estado: string }) => (
  <View className="flex-row items-center justify-between border-b border-border py-2">
    <Text className="flex-1 text-sm font-medium">{principal}</Text>
    <Text className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-primary">
      {estado}
    </Text>
  </View>
);

/** Oportunidades, viajes y reseñas del cliente (RF-006, CU-03). */
export function HistorialClienteMobile({ id }: { id: string }) {
  const { data, isPending, isError } = useHistorialCliente(cliente, id);

  return (
    <View className="gap-4">
      <Text role="heading" className="text-lg font-semibold">
        Historial
      </Text>
      {isPending && <Text role="status">Cargando el historial…</Text>}
      {isError && (
        <Text role="alert" className="text-sm font-medium text-red-700">
          No pudimos cargar el historial. Probá de nuevo en unos minutos.
        </Text>
      )}
      {data && (
        <>
          <Seccion
            titulo="Oportunidades"
            vacio="Sin oportunidades."
            hayItems={data.oportunidades.length > 0}
          >
            {data.oportunidades.map((o) => (
              <Fila
                key={o.id}
                principal={o.destino_consultado}
                estado={ETIQUETA_ESTADO_OPORTUNIDAD[o.estado]}
              />
            ))}
          </Seccion>
          <Seccion titulo="Viajes" vacio="Sin viajes." hayItems={data.viajes.length > 0}>
            {data.viajes.map((v) => (
              <Fila
                key={v.id}
                principal={`${formatearFecha(v.fecha_salida)} → ${formatearFecha(v.fecha_regreso)}`}
                estado={ETIQUETA_ESTADO_VIAJE[v.estado]}
              />
            ))}
          </Seccion>
          <Seccion titulo="Reseñas" vacio="Sin reseñas." hayItems={data.resenas.length > 0}>
            {data.resenas.map((r) => (
              <View key={r.id} className="border-b border-border py-2">
                <Text className="text-sm">{`${String(r.puntaje)} de 5 · ${r.comentario}`}</Text>
                <Text className="text-xs text-gray-500">{formatearFecha(r.fecha)}</Text>
              </View>
            ))}
          </Seccion>
        </>
      )}
    </View>
  );
}
