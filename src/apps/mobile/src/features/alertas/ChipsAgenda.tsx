import { Pressable, Text, View } from "react-native";

export type Pestana = "todas" | "atrasadas" | "hoy" | "proximas";

const CHIPS: { clave: Pestana; etiqueta: string }[] = [
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
  activa: Pestana;
  totales: Record<Pestana, number | undefined>;
  alElegir: (pestana: Pestana) => void;
}) {
  return (
    <View
      accessible
      role="tablist"
      accessibilityLabel="Alertas"
      className="mb-3 flex-row flex-wrap gap-2"
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
            className={`rounded-full border px-3 py-1.5 ${seleccionada ? "border-primary bg-primary" : "border-input"}`}
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
