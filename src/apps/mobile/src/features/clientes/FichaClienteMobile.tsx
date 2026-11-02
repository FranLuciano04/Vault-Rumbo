import { ETIQUETA_SEGMENTO, ErrorApi } from "@rumbo/shared";
import { useCliente } from "@rumbo/shared/hooks";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { cliente } from "../../cliente";
import { AccionesContacto } from "./AccionesContacto";
import { HistorialClienteMobile } from "./HistorialClienteMobile";
import { VolverAClientes } from "./VolverAClientes";

/** Ficha del cliente para el teléfono (RF-006, CU-03): datos, acciones de contacto e historial. */
export function FichaClienteMobile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: ficha, error, isPending } = useCliente(cliente, id);

  if (isPending)
    return (
      <View className="flex-1 gap-4 bg-white p-6 pt-12">
        <VolverAClientes />
        <Text role="status">Cargando…</Text>
      </View>
    );
  if (!ficha) {
    const noEncontrado = error instanceof ErrorApi && error.status === 404;
    return (
      <View className="flex-1 gap-4 bg-white p-6 pt-12">
        <VolverAClientes />
        <Text role={noEncontrado ? "heading" : "alert"}>
          {noEncontrado
            ? "Cliente no encontrado."
            : "No pudimos cargar el cliente. Probá de nuevo en unos minutos."}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      testID="ficha-cliente"
      className="flex-1 bg-white"
      contentContainerClassName="gap-5 p-4 pt-12"
    >
      <VolverAClientes />
      <View className="gap-1">
        <Text role="heading" className="text-2xl font-bold">
          {ficha.nombre}
        </Text>
        <Text className="text-base">{ficha.contacto}</Text>
        {ficha.instagram && <Text className="text-sm text-gray-500">{`@${ficha.instagram}`}</Text>}
        <Text className="text-sm text-primary">{ETIQUETA_SEGMENTO[ficha.segmento]}</Text>
      </View>
      {ficha.etiquetas.length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {ficha.etiquetas.map((etiqueta) => (
            <Text
              key={etiqueta}
              className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary"
            >
              {etiqueta}
            </Text>
          ))}
        </View>
      )}
      {ficha.preferencias ? <Text className="text-sm">{ficha.preferencias}</Text> : null}
      {ficha.no_recontactar && (
        <Text className="self-start rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary">
          No incluir en recontactos
        </Text>
      )}
      <View className="flex-row gap-3">
        <AccionesContacto contacto={ficha.contacto} />
      </View>
      <HistorialClienteMobile id={ficha.id} />
    </ScrollView>
  );
}
