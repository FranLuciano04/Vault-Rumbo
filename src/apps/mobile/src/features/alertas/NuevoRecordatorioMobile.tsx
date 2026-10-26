import DateTimePicker from "@react-native-community/datetimepicker";
import { ERROR_AL_GUARDAR, ErrorApi, formatearFecha, hoyEnBuenosAires } from "@rumbo/shared";
import { esquemaRecordatorio } from "@rumbo/shared/esquemas";
import { useClientes, useCrearRecordatorio, useDebouncedValue } from "@rumbo/shared/hooks";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { cliente } from "../../cliente";
import { MensajeError } from "../../componentes/MensajeError";
import { Opcion } from "../../componentes/Opcion";

const NO_EXISTE = "Lo que querés guardar ya no existe o no lo podés ver.";
const ELEGIR_CLIENTE = "Elegí un cliente o dejá el recordatorio como personal.";

const dosCifras = (n: number) => String(n).padStart(2, "0");
/** `aaaa-mm-dd` del día local de la fecha elegida (sin pasar por UTC). */
const aIsoLocal = (f: Date) =>
  `${String(f.getFullYear())}-${dosCifras(f.getMonth() + 1)}-${dosCifras(f.getDate())}`;
const deIsoLocal = (iso: string) => {
  const [anio = 0, mes = 1, dia = 1] = iso.split("-").map(Number);
  return new Date(anio, mes - 1, dia, 12);
};

type Errores = { descripcion?: string; fecha?: string };
type ClienteElegido = { id: string; nombre: string };

function ResultadosClientes({
  buscar,
  alElegir,
}: {
  buscar: string;
  alElegir: (elegido: ClienteElegido) => void;
}) {
  const { data, isPending, isError } = useClientes(cliente, { buscar, por_pagina: 5 });
  if (isPending) return <Text role="status">Buscando clientes…</Text>;
  if (isError) return <Text role="alert">No pudimos buscar clientes. Probá de nuevo.</Text>;
  if (data.items.length === 0) return <Text role="status">No encontramos clientes.</Text>;
  return (
    <View className="gap-1">
      {data.items.map(({ id, nombre, contacto }) => (
        <Pressable
          key={id}
          role="button"
          onPress={() => {
            alElegir({ id, nombre });
          }}
          className="rounded-xl border border-input px-4 py-3"
        >
          <Text>
            {nombre} · {contacto}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Alta de recordatorio manual para el teléfono (CU-28, pantalla 56): personal o asociado a un cliente. */
export function NuevoRecordatorioMobile() {
  const router = useRouter();
  const crear = useCrearRecordatorio(cliente);
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState("");
  // Valor inicial estable: si cambiara en cada render, el selector de Android se reabriría.
  const [fechaInicial] = useState(() => new Date());
  const [eligiendoFecha, setEligiendoFecha] = useState(false);
  const [conCliente, setConCliente] = useState(false);
  const [elegido, setElegido] = useState<ClienteElegido | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const buscar = useDebouncedValue(busqueda.trim());
  const [errores, setErrores] = useState<Errores>({});
  const [aviso, setAviso] = useState<string | null>(null);

  const volver = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/agenda");
  };

  const alElegirFecha = useCallback((_evento: unknown, elegida: Date) => {
    setEligiendoFecha(false);
    setFecha(aIsoLocal(elegida));
  }, []);
  const alCerrarSelector = useCallback(() => {
    setEligiendoFecha(false);
  }, []);

  async function enviar() {
    setAviso(null);
    const datos = esquemaRecordatorio.safeParse({ descripcion, fecha });
    if (!datos.success) {
      const delCampo: Errores = {};
      for (const { path, message } of datos.error.issues) {
        if (path[0] === "descripcion" || path[0] === "fecha") delCampo[path[0]] ??= message;
      }
      setErrores(delCampo);
      return;
    }
    setErrores({});
    if (conCliente && !elegido) {
      setAviso(ELEGIR_CLIENTE);
      return;
    }
    try {
      await crear.mutateAsync({
        descripcion: datos.data.descripcion,
        fecha: datos.data.fecha,
        ...(elegido && { cliente_id: elegido.id }),
      });
      // Solo una fecha futura se avisa: la agenda del día no la muestra todavía.
      router.dismissTo({
        pathname: "/agenda",
        params: datos.data.fecha > hoyEnBuenosAires() ? { recordatorio: datos.data.fecha } : {},
      });
    } catch (falla) {
      if (!(falla instanceof ErrorApi)) {
        setAviso(ERROR_AL_GUARDAR);
        return;
      }
      if (falla.status === 404) {
        setAviso(NO_EXISTE);
        return;
      }
      if (falla.status === 422 && falla.errores.length > 0) {
        const delCampo: Errores = {};
        const restantes: string[] = [];
        for (const { campo, mensaje } of falla.errores) {
          if (campo === "descripcion" || campo === "fecha") delCampo[campo] = mensaje;
          else restantes.push(mensaje);
        }
        setErrores(delCampo);
        setAviso(restantes.length > 0 ? restantes.join(" ") : null);
        return;
      }
      setAviso(
        (falla.status === 409 || falla.status === 403) && falla.detail
          ? falla.detail
          : ERROR_AL_GUARDAR,
      );
    }
  }

  return (
    <ScrollView
      testID="nuevo-recordatorio"
      className="flex-1 bg-white"
      contentContainerClassName="gap-4 p-6 pt-12"
      keyboardShouldPersistTaps="handled"
    >
      <Text role="heading" className="text-xl font-bold text-primary">
        Nuevo recordatorio
      </Text>
      <View>
        <Text className="mb-1 text-sm font-medium text-gray-700">Descripción</Text>
        <TextInput
          accessibilityLabel="Descripción"
          value={descripcion}
          onChangeText={setDescripcion}
          className="rounded-xl border border-input px-4 py-3"
        />
        <MensajeError texto={errores.descripcion} />
      </View>
      <View>
        <Text className="mb-1 text-sm font-medium text-gray-700">Fecha</Text>
        <Pressable
          role="button"
          accessibilityLabel={`Fecha: ${fecha ? formatearFecha(fecha) : "sin elegir"}`}
          onPress={() => {
            setEligiendoFecha(true);
          }}
          className="rounded-xl border border-input px-4 py-3"
        >
          <Text>{fecha ? formatearFecha(fecha) : "Elegir fecha"}</Text>
        </Pressable>
        {eligiendoFecha && (
          <DateTimePicker
            value={fecha ? deIsoLocal(fecha) : fechaInicial}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onValueChange={alElegirFecha}
            onDismiss={alCerrarSelector}
          />
        )}
        <MensajeError texto={errores.fecha} />
      </View>
      <Text className="-mt-2 text-sm text-gray-500">
        El recordatorio aparece en tu agenda el día elegido.
      </Text>
      <View>
        <Text className="mb-1 text-sm font-medium text-gray-700">Asociar a</Text>
        <View className="flex-row flex-wrap gap-2">
          <Opcion
            texto="Personal (sin asociar)"
            elegida={!conCliente}
            alElegir={() => {
              setConCliente(false);
              setElegido(null);
            }}
          />
          <Opcion
            texto="Cliente"
            elegida={conCliente}
            alElegir={() => {
              setConCliente(true);
            }}
          />
        </View>
      </View>
      {conCliente && !elegido && (
        <View className="gap-2">
          <Text className="text-sm font-medium text-gray-700">Buscar cliente</Text>
          <TextInput
            accessibilityLabel="Buscar cliente"
            value={busqueda}
            onChangeText={setBusqueda}
            className="rounded-xl border border-input px-4 py-3"
          />
          {buscar !== "" && <ResultadosClientes buscar={buscar} alElegir={setElegido} />}
        </View>
      )}
      {elegido && (
        <View className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-sm text-gray-500">Asociado a: {elegido.nombre}</Text>
          <Pressable
            role="button"
            onPress={() => {
              setElegido(null);
            }}
            className="rounded-xl border border-input px-3 py-2"
          >
            <Text className="text-sm font-semibold text-primary">Cambiar cliente</Text>
          </Pressable>
        </View>
      )}
      {aviso && (
        <View accessible role="alert" className="rounded-md bg-red-50 p-3">
          <Text className="text-sm font-medium text-red-700">{aviso}</Text>
        </View>
      )}
      <Pressable
        role="button"
        disabled={crear.isPending}
        onPress={() => void enviar()}
        className="items-center rounded-xl bg-primary py-3"
      >
        <Text className="font-semibold text-primary-foreground">Guardar</Text>
      </Pressable>
      <Pressable
        role="button"
        onPress={volver}
        className="items-center rounded-xl border border-input py-3"
      >
        <Text className="font-semibold text-primary">Cancelar</Text>
      </Pressable>
    </ScrollView>
  );
}
