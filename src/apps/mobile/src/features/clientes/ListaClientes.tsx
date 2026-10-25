import { ETIQUETA_SEGMENTO, type ClienteListado } from "@rumbo/shared";
import { useClientes } from "@rumbo/shared/hooks";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { cliente } from "../../cliente";

const ESPERA_BUSQUEDA_MS = 300;

const SinClientes = () => (
  <Text className="py-6 text-center text-gray-500">No encontramos clientes.</Text>
);

/** Pestaña Clientes (RF-005): búsqueda por texto y scroll paginado; el alcance por rol lo resuelve la API. */
export function ListaClientes() {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [buscar, setBuscar] = useState("");
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState<ClienteListado[][]>([]);
  const { data, isError, isFetching, isPlaceholderData, refetch } = useClientes(cliente, {
    buscar,
    pagina,
  });

  useEffect(() => {
    const espera = setTimeout(() => {
      setBuscar(texto);
      setPagina(1);
    }, ESPERA_BUSQUEDA_MS);
    return () => {
      clearTimeout(espera);
    };
  }, [texto]);

  // Se acumulan las páginas al llegar datos nuevos (ajuste de estado durante el render).
  const [recibido, setRecibido] = useState(data);
  if (data && !isPlaceholderData && data !== recibido) {
    setRecibido(data);
    // La primera página reemplaza todo (búsqueda nueva); las demás se agregan al final.
    const siguientes = data.pagina === 1 ? [] : [...paginas];
    siguientes[data.pagina - 1] = data.items;
    setPaginas(siguientes);
  }

  const clientes = paginas.flat();
  const hayMas = data !== undefined && !isPlaceholderData && clientes.length < data.total;

  return (
    <View testID="pantalla-clientes" className="flex-1 bg-white px-4 pt-12">
      <View className="mb-3 flex-row items-center justify-between">
        <Text role="heading" className="text-xl font-bold text-primary">
          Clientes
        </Text>
        <Pressable
          role="button"
          onPress={() => {
            router.push("/clientes/nuevo");
          }}
          className="rounded-xl bg-primary px-4 py-2"
        >
          <Text className="font-semibold text-primary-foreground">Nuevo cliente</Text>
        </Pressable>
      </View>
      <TextInput
        accessibilityLabel="Buscar cliente"
        placeholder="Buscar por nombre, contacto o etiqueta"
        value={texto}
        onChangeText={setTexto}
        className="mb-3 rounded-xl border border-input px-4 py-3"
      />
      {isError && (
        <View accessible role="alert" className="mb-3 flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-sm font-medium text-red-700">
            No pudimos cargar los clientes. Probá de nuevo en unos minutos.
          </Text>
          <Pressable
            role="button"
            accessibilityLabel="Reintentar"
            onPress={() => void refetch()}
            className="rounded-xl bg-primary px-4 py-2"
          >
            <Text className="font-semibold text-primary-foreground">Reintentar</Text>
          </Pressable>
        </View>
      )}
      <FlatList
        testID="lista-clientes"
        data={clientes}
        keyExtractor={(item) => item.id}
        onEndReached={() => {
          if (hayMas && !isFetching) setPagina((actual) => actual + 1);
        }}
        ListEmptyComponent={
          data && !isFetching && clientes.length === 0 ? <SinClientes /> : undefined
        }
        renderItem={({ item }) => (
          <Pressable
            role="button"
            onPress={() => {
              router.push(`/clientes/${item.id}`);
            }}
            className="border-b border-border py-3"
          >
            <Text className="text-base font-semibold">{item.nombre}</Text>
            <Text className="text-sm text-gray-500">{item.contacto}</Text>
            <Text className="text-xs text-primary">{ETIQUETA_SEGMENTO[item.segmento]}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
