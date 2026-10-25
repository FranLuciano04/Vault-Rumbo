import { ETIQUETA_SEGMENTO, ErrorApi, type Cliente, type SegmentoCliente } from "@rumbo/shared";
import { esquemaAltaCliente } from "@rumbo/shared/esquemas";
import { useAsesores, useCrearCliente, useYo } from "@rumbo/shared/hooks";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { cliente } from "../../cliente";
import { VolverAClientes } from "./VolverAClientes";

const AVISO_CLIENTE_AJENO =
  "Ya hay un cliente con ese contacto en la agencia. Consultalo con un admin";
const ERROR_AL_GUARDAR = "No pudimos registrar el cliente. Probá de nuevo en unos minutos.";

const esquemaFormulario = esquemaAltaCliente.pick({
  nombre: true,
  contacto: true,
  instagram: true,
  segmento: true,
});

const CAMPOS = ["nombre", "contacto", "instagram", "segmento", "asesor_asignado_id"] as const;
type Errores = Partial<Record<(typeof CAMPOS)[number], string>>;

function MensajeError({ texto }: { texto?: string }) {
  return texto ? <Text className="mt-1 text-sm text-red-700">{texto}</Text> : null;
}

function Campo({
  etiqueta,
  error,
  onChangeText,
}: {
  etiqueta: string;
  error?: string;
  onChangeText: (texto: string) => void;
}) {
  return (
    <View>
      <Text className="mb-1 text-sm font-medium text-gray-700">{etiqueta}</Text>
      <TextInput
        accessibilityLabel={etiqueta}
        autoCapitalize="none"
        onChangeText={onChangeText}
        className="rounded-xl border border-input px-4 py-3"
      />
      <MensajeError texto={error} />
    </View>
  );
}

function Opcion({
  texto,
  elegida,
  alElegir,
}: {
  texto: string;
  elegida: boolean;
  alElegir: () => void;
}) {
  return (
    <Pressable
      role="button"
      accessibilityState={{ selected: elegida }}
      onPress={alElegir}
      className={`rounded-full border px-4 py-2 ${elegida ? "border-primary bg-primary" : "border-input"}`}
    >
      <Text className={elegida ? "font-semibold text-primary-foreground" : "text-gray-700"}>
        {texto}
      </Text>
    </Pressable>
  );
}

/** Asesor asignado (RF-150): lo eligen admin, dueño y empleado; sin elegir, queda sin asesor. */
function SelectorAsesor({
  elegido,
  alElegir,
  error,
}: {
  elegido: string | null;
  alElegir: (id: string | null) => void;
  error?: string;
}) {
  const { data: asesores } = useAsesores(cliente);
  return (
    <View>
      <Text className="mb-1 text-sm font-medium text-gray-700">Asesor asignado</Text>
      <View className="flex-row flex-wrap gap-2">
        <Opcion
          texto="Sin asesor"
          elegida={elegido === null}
          alElegir={() => {
            alElegir(null);
          }}
        />
        {asesores?.map(({ id, nombre }) => (
          <Opcion
            key={id}
            texto={nombre}
            elegida={elegido === id}
            alElegir={() => {
              alElegir(id);
            }}
          />
        ))}
      </View>
      <MensajeError texto={error} />
    </View>
  );
}

/** Aviso de posible duplicado (CU-02 A1): los candidatos con acceso a su ficha, o el aviso del freelance. */
function AvisoDuplicado({
  candidatos,
  enviando,
  alConfirmar,
}: {
  candidatos: Cliente[];
  enviando: boolean;
  alConfirmar: () => void;
}) {
  const router = useRouter();
  return (
    <View className="gap-3 rounded-xl bg-amber-50 p-4">
      <Text role="alert" className="font-semibold text-amber-900">
        Posible cliente duplicado
      </Text>
      {candidatos.length === 0 ? (
        <Text className="text-sm text-amber-900">{AVISO_CLIENTE_AJENO}</Text>
      ) : (
        <>
          <Text className="text-sm text-amber-900">
            Ya hay clientes parecidos (mismo contacto o nombre). Si es la misma persona, abrí su
            ficha.
          </Text>
          {candidatos.map(({ id, nombre, contacto }) => (
            <View key={id} className="gap-2">
              <View>
                <Text className="font-medium text-amber-900">{nombre}</Text>
                <Text className="text-sm text-amber-900">{contacto}</Text>
              </View>
              <Pressable
                role="button"
                onPress={() => {
                  router.push(`/clientes/${id}`);
                }}
                className="items-center rounded-xl border border-primary py-3"
              >
                <Text className="font-semibold text-primary">Ir al cliente existente</Text>
              </Pressable>
            </View>
          ))}
        </>
      )}
      <Pressable
        role="button"
        disabled={enviando}
        onPress={alConfirmar}
        className="items-center rounded-xl bg-primary py-3"
      >
        <Text className="font-semibold text-primary-foreground">Confirmar alta</Text>
      </Pressable>
    </View>
  );
}

/**
 * Alta de cliente para el teléfono (CU-02, pantalla 58): valida el formato, avisa los posibles
 * duplicados (RF-003) y abre la ficha al terminar. El freelance no elige asesor (RF-150).
 */
export function NuevoClienteMobile() {
  const router = useRouter();
  const crear = useCrearCliente(cliente);
  const { data: usuario } = useYo(cliente);
  const conAsesor = usuario !== undefined && usuario.rol !== "freelance";
  // Textos que escribe la persona; se leen al enviar, sin esperar al próximo render.
  const texto = useRef({ nombre: "", contacto: "", instagram: "" });
  const [segmento, setSegmento] = useState<SegmentoCliente>("individual");
  const [asesorId, setAsesorId] = useState<string | null>(null);
  const [errores, setErrores] = useState<Errores>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [duplicados, setDuplicados] = useState<Cliente[] | null>(null);
  // Cuenta las ediciones: un 409 de datos ya editados no se muestra.
  const ediciones = useRef(0);

  // Editar cualquier campo tras el aviso obliga a volver a chequear (CU-02 A1).
  function editado() {
    ediciones.current += 1;
    setDuplicados(null);
  }

  async function enviar(confirmarDuplicado: boolean) {
    setAviso(null);
    setDuplicados(null);
    const edicionesAlEnviar = ediciones.current;
    const datos = esquemaFormulario.safeParse({ ...texto.current, segmento });
    if (!datos.success) {
      const delCampo: Errores = {};
      for (const { path, message } of datos.error.issues) {
        const propio = CAMPOS.find((nombre) => nombre === path[0]);
        if (propio) delCampo[propio] ??= message;
      }
      setErrores(delCampo);
      return;
    }
    setErrores({});
    try {
      const nuevo = await crear.mutateAsync({
        ...datos.data,
        instagram: datos.data.instagram ?? null,
        ...(conAsesor && { asesor_asignado_id: asesorId }),
        ...(confirmarDuplicado && { confirmar_duplicado: true }),
      });
      router.replace(`/clientes/${nuevo.id}`);
    } catch (falla) {
      if (!(falla instanceof ErrorApi)) {
        setAviso(ERROR_AL_GUARDAR);
        return;
      }
      if (falla.status === 409 && falla.duplicados) {
        if (ediciones.current === edicionesAlEnviar) setDuplicados(falla.duplicados);
        return;
      }
      if (falla.status === 422 && falla.errores.length > 0) {
        const delCampo: Errores = {};
        const restantes: string[] = [];
        for (const { campo, mensaje } of falla.errores) {
          const propio = CAMPOS.find((nombre) => nombre === campo);
          if (propio) delCampo[propio] = mensaje;
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
      testID="nuevo-cliente"
      className="flex-1 bg-white"
      contentContainerClassName="gap-4 p-6 pt-12"
      keyboardShouldPersistTaps="handled"
    >
      <VolverAClientes />
      <Text role="heading" className="text-xl font-bold text-primary">
        Nuevo cliente
      </Text>
      <Campo
        etiqueta="Nombre y apellido o grupo"
        error={errores.nombre}
        onChangeText={(valor) => {
          texto.current.nombre = valor;
          editado();
        }}
      />
      <Campo
        etiqueta="Contacto (teléfono o email)"
        error={errores.contacto}
        onChangeText={(valor) => {
          texto.current.contacto = valor;
          editado();
        }}
      />
      <Campo
        etiqueta="Instagram (opcional)"
        error={errores.instagram}
        onChangeText={(valor) => {
          texto.current.instagram = valor;
          editado();
        }}
      />
      <View>
        <Text className="mb-1 text-sm font-medium text-gray-700">Segmento</Text>
        <View className="flex-row flex-wrap gap-2">
          {Object.entries(ETIQUETA_SEGMENTO).map(([valor, etiqueta]) => (
            <Opcion
              key={valor}
              texto={etiqueta}
              elegida={segmento === valor}
              alElegir={() => {
                if (segmento === valor) return;
                setSegmento(valor as SegmentoCliente);
                editado();
              }}
            />
          ))}
        </View>
        <MensajeError texto={errores.segmento} />
      </View>
      {conAsesor && (
        <SelectorAsesor
          elegido={asesorId}
          alElegir={(id) => {
            if (id === asesorId) return;
            setAsesorId(id);
            editado();
          }}
          error={errores.asesor_asignado_id}
        />
      )}
      {aviso && (
        <View accessible role="alert" className="rounded-md bg-red-50 p-3">
          <Text className="text-sm font-medium text-red-700">{aviso}</Text>
        </View>
      )}
      {duplicados && (
        <AvisoDuplicado
          candidatos={duplicados}
          enviando={crear.isPending}
          alConfirmar={() => void enviar(true)}
        />
      )}
      <Pressable
        role="button"
        disabled={crear.isPending}
        onPress={() => void enviar(false)}
        className="items-center rounded-xl bg-primary py-3"
      >
        <Text className="font-semibold text-primary-foreground">Registrar cliente</Text>
      </Pressable>
    </ScrollView>
  );
}
