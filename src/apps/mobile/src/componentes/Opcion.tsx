import { Pressable, Text } from "react-native";

/** Opción elegible en forma de píldora (segmento, asesor, tipo de asociación). */
export function Opcion({
  texto,
  elegida,
  alElegir,
}: {
  texto: string;
  elegida: boolean;
  alElegir: () => void;
}) {
  return (
    <Pressable
      role="button"
      accessibilityState={{ selected: elegida }}
      onPress={alElegir}
      className={`rounded-full border px-4 py-2 ${elegida ? "border-primary bg-primary" : "border-input"}`}
    >
      <Text className={elegida ? "font-semibold text-primary-foreground" : "text-gray-700"}>
        {texto}
      </Text>
    </Pressable>
  );
}
