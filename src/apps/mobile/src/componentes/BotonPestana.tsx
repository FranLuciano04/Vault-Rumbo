import { Pressable, type PressableProps, Text, View } from "react-native";

/** Botón de la barra de pestañas del prototipo: la pestaña activa lleva una píldora celeste. */
export function crearBotonPestana(titulo: string) {
  return function BotonPestana({ onPress, onLongPress, accessibilityState }: PressableProps) {
    const activa = accessibilityState?.selected === true;
    return (
      <Pressable
        role="tab"
        accessibilityLabel={titulo}
        accessibilityState={{ selected: activa }}
        onPress={onPress}
        onLongPress={onLongPress}
        className="flex-1 items-center justify-center py-2"
      >
        <View className={`rounded-full px-5 py-1 ${activa ? "bg-secondary" : ""}`}>
          <Text className={`text-xs font-semibold ${activa ? "text-primary" : "text-gray-500"}`}>
            {titulo}
          </Text>
        </View>
      </Pressable>
    );
  };
}
