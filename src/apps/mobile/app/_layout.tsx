import "../global.css";
import { crearQueryClient } from "@rumbo/shared";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useState } from "react";

export default function LayoutRaiz() {
  const [queryClient] = useState(() => crearQueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
