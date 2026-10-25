import { useRouter } from "expo-router";
import { Pressable, Text } from "react-native";

export function VolverAClientes() {
  const router = useRouter();
  return (
    <Pressable
      role="button"
      accessibilityLabel="Volver"
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace("/clientes");
      }}
    >
      <Text className="text-primary">‹ Clientes</Text>
    </Pressable>
  );
}
