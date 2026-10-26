import {
  diasDeAtraso,
  ErrorApi,
  ETIQUETA_TIPO_ALERTA,
  datosDeContexto,
  formatearFecha,
  hoyEnBuenosAires,
  mensajeDeError,
} from "@rumbo/shared";
import { useAlerta, usePosponerAlerta } from "@rumbo/shared/hooks";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { cliente } from "../../cliente";

const MILISEGUNDOS_POR_DIA = 86_400_000;

// Las tres opciones rápidas de la pantalla 54 del prototipo, todas posteriores a hoy.
const OPCIONES_POSPONER = [
  { etiqueta: "Mañana", dias: 1 },
  { etiqueta: "En 3 días", dias: 3 },
  { etiqueta: "En una semana", dias: 7 },
];

/** `aaaa-mm-dd` de `dias` días después de `fecha` (también `aaaa-mm-dd`). */
function sumarDias(fecha: string, dias: number): string {
  return new Date(Date.parse(fecha) + dias * MILISEGUNDOS_POR_DIA).toISOString().slice(0, 10);
}

function useVolverALaAgenda() {
  const router = useRouter();
  return () => {
    if (router.canGoBack()) router.back();
    else router.replace("/agenda");
  };
}

function Volver() {
  const volver = useVolverALaAgenda();
  return (
    <Pressable role="button" accessibilityLabel="Volver" onPress={volver}>
      <Text className="text-primary">‹ Agenda</Text>
    </Pressable>
  );
}

function Pantalla({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-1 gap-4 bg-white p-6 pt-12">
      <Volver />
      {children}
    </View>
  );
}

/**
 * Detalle de una alerta en el celular (CU-14, pantallas 53 y 54 del prototipo): tipo, descripción
 * y contexto del origen, acceso a la ficha del cliente y posponer con tres fechas futuras.
 */
export function DetalleAlertaMobile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const volverALaAgenda = useVolverALaAgenda();
  const { data: alerta, error, isPending } = useAlerta(cliente, id);
  const posponer = usePosponerAlerta(cliente);
  const [eligiendo, setEligiendo] = useState(false);

  if (isPending)
    return (
      <Pantalla>
        <ActivityIndicator accessibilityLabel="Cargando alerta" />
      </Pantalla>
    );
  if (!alerta)
    return (
      <Pantalla>
        <Text role="alert">
          {error instanceof ErrorApi && error.status === 404
            ? "No encontramos la alerta."
            : "No pudimos cargar la alerta. Probá de nuevo en unos minutos."}
        </Text>
      </Pantalla>
    );

  const hoy = hoyEnBuenosAires();
  const atraso = diasDeAtraso(alerta.fecha, hoy);
  // El backend exige una fecha posterior a la de la alerta y a hoy: las opciones salen de la mayor.
  const base = alerta.fecha > hoy ? alerta.fecha : hoy;
  const clienteDeLaAlerta = alerta.contexto.cliente;

  const elegir = (fecha: string) => {
    posponer.mutate(
      { id: alerta.id, fecha },
      {
        onSuccess: volverALaAgenda,
      },
    );
  };

  return (
    <ScrollView testID="detalle-alerta" contentContainerClassName="gap-4 bg-white p-6 pt-12">
      <Volver />
      <Text className="text-xs font-semibold uppercase text-gray-500">
        {ETIQUETA_TIPO_ALERTA[alerta.tipo]}
      </Text>
      <Text role="heading" className="text-xl font-bold">
        {alerta.descripcion}
      </Text>
      {atraso > 0 && (
        <Text className="self-start rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
          Hace {atraso} {atraso === 1 ? "día" : "días"}
        </Text>
      )}
      {datosDeContexto(alerta).map(({ etiqueta, valor }) => (
        <View key={etiqueta} className="flex-row gap-2">
          <Text className="text-sm text-gray-500">{etiqueta}</Text>
          <Text className="text-sm font-medium">{valor}</Text>
        </View>
      ))}
      {clienteDeLaAlerta && (
        <Pressable
          role="button"
          accessibilityLabel="Ver cliente"
          onPress={() => {
            router.push(`/clientes/${clienteDeLaAlerta.id}`);
          }}
          className="items-center rounded-xl bg-primary py-3"
        >
          <Text className="font-semibold text-primary-foreground">Ver cliente</Text>
        </Pressable>
      )}
      {alerta.estado !== "pendiente" ? null : !eligiendo ? (
        <Pressable
          role="button"
          accessibilityLabel="Posponer"
          onPress={() => {
            setEligiendo(true);
          }}
          className="items-center rounded-xl border border-input py-3"
        >
          <Text className="font-semibold text-primary">Posponer</Text>
        </Pressable>
      ) : (
        <View className="gap-3 rounded-2xl border border-border p-4">
          <Text role="heading" className="text-lg font-semibold">
            Posponer alerta
          </Text>
          {OPCIONES_POSPONER.map(({ etiqueta, dias }) => {
            const fecha = sumarDias(base, dias);
            const titulo = `${etiqueta} · ${formatearFecha(fecha)}`;
            return (
              <Pressable
                key={dias}
                role="button"
                accessibilityLabel={titulo}
                disabled={posponer.isPending}
                onPress={() => {
                  elegir(fecha);
                }}
                className="rounded-xl border border-input px-4 py-3"
              >
                <Text className="text-base">{titulo}</Text>
              </Pressable>
            );
          })}
          {posponer.isError && (
            <Text role="alert" accessibilityLiveRegion="assertive" className="text-red-700">
              {mensajeDeError(posponer.error)}
            </Text>
          )}
          <Pressable
            role="button"
            accessibilityLabel="Cancelar"
            onPress={() => {
              setEligiendo(false);
              posponer.reset();
            }}
            className="items-center py-2"
          >
            <Text className="font-semibold text-primary">Cancelar</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
