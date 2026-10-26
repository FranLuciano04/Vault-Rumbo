import { Text } from "react-native";

export function MensajeError({ texto }: { texto?: string }) {
  return texto ? <Text className="mt-1 text-sm text-red-700">{texto}</Text> : null;
}
