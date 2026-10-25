import {
  diasDeAtraso,
  ETIQUETA_TIPO_ALERTA,
  hoyEnBuenosAires,
  lineaDeContexto,
  type Alerta,
} from "@rumbo/shared";
import {
  useAlertas,
  useAlertasPorPaginas,
  useProgresoDelDia,
  useResolverConDeshacer,
  useYo,
} from "@rumbo/shared/hooks";
import { useEffect, useState } from "react";
import { ActivityIndicator, AppState, FlatList, Pressable, Text, View } from "react-native";
import { cliente } from "../../cliente";

const POR_PAGINA = 100;

type Fila = { titulo: string } | { alerta: Alerta };

function Plazo({ fecha, hoy }: { fecha: string; hoy: string }) {
  const atraso = diasDeAtraso(fecha, hoy);
  if (atraso <= 0) return null;
  return (
    <Text className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
      Hace {atraso} {atraso === 1 ? "día" : "días"}
    </Text>
  );
}

function FilaAlerta({
  alerta,
  hoy,
  mostrarResponsable,
  alResolver,
}: {
  alerta: Alerta;
  hoy: string;
  mostrarResponsable: boolean;
  alResolver: () => void;
}) {
  const esPago = alerta.tipo === "pago";
  const detalle = [...lineaDeContexto(alerta), mostrarResponsable && alerta.responsable.nombre]
    .filter(Boolean)
    .join(" · ");
  return (
    <View className="flex-row items-center justify-between gap-3 border-b border-border py-3">
      <View className="flex-1">
        <Text className="text-xs font-semibold uppercase text-gray-500">
          {ETIQUETA_TIPO_ALERTA[alerta.tipo]}
        </Text>
        <Text className="text-base font-medium">{alerta.descripcion}</Text>
        <Text className="text-sm text-gray-500">{detalle}</Text>
        {esPago && (
          <Text className="text-sm text-gray-500">Se resuelve al registrar el cobro.</Text>
        )}
      </View>
      <View className="items-end gap-2">
        <Plazo fecha={alerta.fecha} hoy={hoy} />
        {!esPago && (
          <Pressable
            role="button"
            accessibilityLabel={`Resolver: ${alerta.descripcion}`}
            onPress={alResolver}
            className="rounded-xl border border-input px-3 py-2"
          >
            <Text className="text-sm font-semibold text-primary">Resolver</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/**
 * Agenda del día en el celular (CU-14, pantallas 35 y 55 del prototipo): las alertas pendientes
 * hasta hoy, atrasadas y de hoy, con el progreso del día; se resuelven con «Deshacer». El alcance
 * por rol lo resuelve la API; admin y dueño ven además al responsable de cada alerta.
 */
export function AgendaMobile() {
  const yo = useYo(cliente);
  const esDeAgencia = yo.data?.rol === "admin" || yo.data?.rol === "dueno";
  const alertas = useAlertasPorPaginas(cliente, { por_pagina: POR_PAGINA });
  const vistas = useAlertas(cliente, { estado: "vista", por_pagina: 1 });
  const progreso = useProgresoDelDia(cliente);
  const { resueltas, error, limpiarError, enviarPendientes, resolver, deshacer } =
    useResolverConDeshacer(cliente);
  const [refrescando, setRefrescando] = useState(false);

  // Si la app pasa a segundo plano dentro del plazo de gracia, la resolución sale igual.
  useEffect(() => {
    const suscripcion = AppState.addEventListener("change", (estado) => {
      if (estado !== "active") enviarPendientes();
    });
    return () => {
      suscripcion.remove();
    };
  }, [enviarPendientes]);

  const hoy = hoyEnBuenosAires();
  const resueltasIds = new Set(resueltas.map((r) => r.alerta.id));
  const cargadas = alertas.data?.pages.flatMap((pagina) => pagina.items) ?? [];
  const total = alertas.data?.pages[0]?.total ?? 0;
  const pendientes = cargadas
    .filter((a) => !resueltasIds.has(a.id))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const atrasadas = pendientes.filter((a) => a.fecha < hoy);
  const deHoy = pendientes.filter((a) => a.fecha >= hoy);
  const filas: Fila[] = [
    ...(atrasadas.length > 0 ? [{ titulo: `Atrasadas · ${String(atrasadas.length)}` }] : []),
    ...atrasadas.map((alerta) => ({ alerta })),
    ...(deHoy.length > 0 ? [{ titulo: `Hoy · ${String(deHoy.length)}` }] : []),
    ...deHoy.map((alerta) => ({ alerta })),
  ];
  const faltanPorCargar = alertas.hasNextPage;
  const sinResolver = vistas.data?.total ?? 0;

  const cargarMas = () => {
    if (alertas.hasNextPage && !alertas.isFetchingNextPage) void alertas.fetchNextPage();
  };
  const reintentar = () => Promise.all([alertas.refetch(), vistas.refetch(), progreso.refetch()]);
  const refrescar = async () => {
    limpiarError();
    setRefrescando(true);
    await reintentar();
    setRefrescando(false);
  };

  const porcentaje = progreso.data?.total_del_dia
    ? (progreso.data.resueltas_hoy / progreso.data.total_del_dia) * 100
    : 0;

  return (
    <View testID="pantalla-agenda" className="flex-1 bg-white px-4 pt-12">
      <Text role="heading" className="mb-3 text-xl font-bold text-primary">
        Agenda del día
      </Text>
      {progreso.data && (
        <View className="mb-3 rounded-2xl bg-primary p-4">
          <Text className="text-lg font-semibold text-primary-foreground">
            {esDeAgencia ? "La agencia lleva" : "Llevás"} {progreso.data.resueltas_hoy} de{" "}
            {progreso.data.total_del_dia} alertas resueltas
          </Text>
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Progreso del día"
            accessibilityValue={{
              min: 0,
              max: progreso.data.total_del_dia,
              now: progreso.data.resueltas_hoy,
            }}
            className="mt-2 h-2 overflow-hidden rounded-full bg-white/25"
          >
            <View className="h-full bg-white" style={{ width: `${String(porcentaje)}%` }} />
          </View>
        </View>
      )}
      {error && (
        <Text
          accessible
          role="alert"
          accessibilityLiveRegion="assertive"
          className="mb-3 text-sm font-medium text-red-700"
        >
          {error}
        </Text>
      )}
      {alertas.isPending && <ActivityIndicator accessibilityLabel="Cargando alertas" />}
      {alertas.isError && (
        <View
          accessible
          role="alert"
          accessibilityLiveRegion="assertive"
          className="mb-3 flex-row items-center justify-between gap-3"
        >
          <Text className="flex-1 text-sm font-medium text-red-700">
            No pudimos cargar la agenda. Probá de nuevo en unos minutos.
          </Text>
          <Pressable
            role="button"
            accessibilityLabel="Reintentar"
            onPress={() => void reintentar()}
            className="rounded-xl bg-primary px-4 py-2"
          >
            <Text className="font-semibold text-primary-foreground">Reintentar</Text>
          </Pressable>
        </View>
      )}
      <FlatList
        testID="lista-alertas"
        data={filas}
        keyExtractor={(fila) => ("alerta" in fila ? fila.alerta.id : fila.titulo)}
        refreshing={refrescando}
        onRefresh={() => void refrescar()}
        onEndReached={cargarMas}
        ListEmptyComponent={
          alertas.data && !faltanPorCargar && !vistas.isPending ? (
            <View className="py-6">
              <Text className="text-center text-gray-500">
                {esDeAgencia
                  ? "La agencia no tiene alertas pendientes para hoy."
                  : "No tenés alertas pendientes para hoy."}
              </Text>
              {sinResolver > 0 && (
                <Text className="text-center text-gray-500">
                  Tenés {sinResolver} {sinResolver === 1 ? "alerta vista" : "alertas vistas"} sin
                  resolver.
                </Text>
              )}
            </View>
          ) : undefined
        }
        ListFooterComponent={
          faltanPorCargar ? (
            <View className="items-center gap-2 py-4">
              <Text className="text-sm text-gray-500">
                Mostrando {pendientes.length} de {total} alertas
              </Text>
              <Pressable
                role="button"
                accessibilityLabel="Ver más alertas"
                disabled={alertas.isFetchingNextPage}
                onPress={cargarMas}
                className="rounded-xl border border-input px-4 py-2"
              >
                <Text className="font-semibold text-primary">Ver más</Text>
              </Pressable>
            </View>
          ) : undefined
        }
        renderItem={({ item }) =>
          "alerta" in item ? (
            <FilaAlerta
              alerta={item.alerta}
              hoy={hoy}
              mostrarResponsable={esDeAgencia}
              alResolver={() => {
                resolver(item.alerta);
              }}
            />
          ) : (
            <Text
              accessibilityRole="header"
              className="pt-2 text-xs font-semibold uppercase text-gray-500"
            >
              {item.titulo}
            </Text>
          )
        }
      />
      <View accessibilityLiveRegion="polite">
        {resueltas
          .filter((r) => !r.enviada)
          .map(({ alerta }) => (
            <View
              key={alerta.id}
              className="mb-4 flex-row items-center justify-between rounded-xl bg-gray-900 px-4 py-3"
            >
              <View>
                <Text className="font-medium text-white">Alerta resuelta</Text>
                <Text className="text-sm text-white/80">{ETIQUETA_TIPO_ALERTA[alerta.tipo]}</Text>
              </View>
              <Pressable
                role="button"
                accessibilityLabel={`Deshacer: ${alerta.descripcion}`}
                onPress={() => {
                  deshacer(alerta.id);
                }}
                className="rounded-xl border border-white px-3 py-2"
              >
                <Text className="font-semibold text-white">Deshacer</Text>
              </Pressable>
            </View>
          ))}
      </View>
    </View>
  );
}
