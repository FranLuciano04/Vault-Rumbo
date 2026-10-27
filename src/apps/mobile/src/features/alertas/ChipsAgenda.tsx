import type { PestanaAgenda } from "@rumbo/shared";
import { Pressable, Text, View } from "react-native";

const CHIPS: { clave: PestanaAgenda; etiqueta: string }[] = [
  { clave: "todas", etiqueta: "Todas" },
  { clave: "atrasadas", etiqueta: "Atrasadas" },
  { clave: "hoy", etiqueta: "Hoy" },
  { clave: "proximas", etiqueta: "Próximas" },
];

/**
 * Chips de la agenda (RF-154, pantallas 35 y 55 del prototipo): cada uno anuncia su nombre con el
 * total del servidor. Mientras el total carga se muestra un guion.
 */
export function ChipsAgenda({
  activa,
  totales,
  alElegir,
}: {
  activa: PestanaAgenda;
  totales: Record<PestanaAgenda, number | undefined>;
  alElegir: (pestana: PestanaAgenda) => void;
}) {
  return (
    // Sin `accessible`: agruparía los chips en un solo foco de VoiceOver/TalkBack.
    <View
      role="tablist"
      accessibilityLabel="Alertas"
      testID="chips-agenda"
      className="mb-3 flex-row rounded-xl border border-border bg-white p-1"
    >
      {CHIPS.map(({ clave, etiqueta }) => {
        const seleccionada = clave === activa;
        const total = totales[clave];
        return (
          <Pressable
            key={clave}
            role="tab"
            accessibilityLabel={total === undefined ? etiqueta : `${etiqueta}: ${String(total)}`}
            accessibilityState={{ selected: seleccionada }}
            onPress={() => {
              alElegir(clave);
            }}
            className={`flex-1 items-center rounded-lg px-1 py-2 ${seleccionada ? "bg-primary" : ""}`}
          >
            <Text
              className={`text-sm font-medium ${seleccionada ? "text-primary-foreground" : "text-gray-700"}`}
            >
              {etiqueta} {total ?? "–"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
