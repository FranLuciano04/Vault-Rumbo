import { enlaceLlamada, normalizarTelefonoAR } from "@rumbo/shared";
import { Linking, Pressable, Text } from "react-native";

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

/** Acciones según el contacto: con email solo se escribe; con un teléfono válido se llama o se abre WhatsApp. */
export function AccionesContacto({ contacto }: { contacto: string }) {
  if (contacto.includes("@"))
    return <BotonContacto titulo="Enviar email" destino={`mailto:${contacto}`} />;
  const llamada = enlaceLlamada(contacto);
  const whatsapp = normalizarTelefonoAR(contacto);
  return (
    <>
      {llamada && <BotonContacto titulo="Llamar" destino={llamada} />}
      {whatsapp && <BotonContacto titulo="WhatsApp" destino={`https://wa.me/${whatsapp}`} />}
    </>
  );
}
