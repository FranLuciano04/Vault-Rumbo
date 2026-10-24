import { ErrorApi } from "@rumbo/shared";
import { useCliente } from "@rumbo/shared/hooks";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { cliente } from "../../cliente";
import { HistorialClienteMobile } from "./HistorialClienteMobile";
import { ETIQUETA_SEGMENTO } from "./segmentos";

function BotonContacto({ titulo, destino }: { titulo: string; destino: string }) {
  return (
    <Pressable
      role="button"
      accessibilityLabel={titulo}
      onPress={() => void Linking.openURL(destino)}
      className="flex-1 items-center rounded-xl bg-primary py-3"
    >
      <Text className="font-semibold text-primary-foreground">{titulo}</Text>
    </Pressable>
  );
}

/** Acciones según el contacto: con email solo se escribe; con teléfono se llama o se abre WhatsApp. */
function AccionesContacto({ contacto }: { contacto: string }) {
  if (contacto.includes("@"))
    return <BotonContacto titulo="Enviar email" destino={`mailto:${contacto}`} />;
  const digitos = contacto.replace(/\D/g, "");
  return (
    <>
      <BotonContacto titulo="Llamar" destino={`tel:${contacto.replace(/[^\d+]/g, "")}`} />
      <BotonContacto titulo="WhatsApp" destino={`https://wa.me/${digitos}`} />
    </>
  );
}

/** Ficha del cliente para el teléfono (RF-006, CU-03): datos, acciones de contacto e historial. */
export function FichaClienteMobile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: ficha, error, isPending } = useCliente(cliente, id);

  if (isPending)
    return (
      <Text role="status" className="p-6">
        Cargando…
      </Text>
    );
  if (!ficha) {
    const noEncontrado = error instanceof ErrorApi && error.status === 404;
    return (
      <View className="flex-1 bg-white p-6">
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
      <Pressable
        role="button"
        accessibilityLabel="Volver"
        onPress={() => {
          router.back();
        }}
      >
        <Text className="text-primary">‹ Clientes</Text>
      </Pressable>
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
      {ficha.no_recontactar ? (
        <Text role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
          No recontactar: el cliente pidió no ser contactado.
        </Text>
      ) : (
        <View className="flex-row gap-3">
          <AccionesContacto contacto={ficha.contacto} />
        </View>
      )}
      <HistorialClienteMobile id={ficha.id} />
    </ScrollView>
  );
}
