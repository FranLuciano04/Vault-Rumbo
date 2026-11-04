import { mensajeDeError } from "@rumbo/shared";
import { useCliente, useEditarCliente } from "@rumbo/shared/hooks";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { cliente } from "../../cliente";
import { AccionesContacto } from "../clientes/AccionesContacto";

/**
 * Sugerencia de recontacto en el celular (CU-30, RF-029, RF-030): preferencias y contacto del
 * cliente, aviso de que la consulta se crea desde la web y «No recontactar», que marca al
 * cliente (el servidor resuelve la alerta).
 */
export function RecontactoMobile({
  clienteId,
  estado,
  alResolver,
}: {
  clienteId: string;
  estado: string;
  alResolver: () => void;
}) {
  const { data: ficha, isError: fichaConError } = useCliente(cliente, clienteId);
  const editar = useEditarCliente(cliente);
  const [confirmando, setConfirmando] = useState(false);
  const aviso = editar.isError ? mensajeDeError(editar.error) : null;

  // El servidor resuelve la alerta de recontacto al marcar al cliente.
  const confirmar = () => {
    editar.mutate({ id: clienteId, cambios: { no_recontactar: true } }, { onSuccess: alResolver });
  };

  return (
    <View className="gap-4">
      {fichaConError && (
        <Text role="alert" className="text-red-700">
          No pudimos cargar el contacto del cliente.
        </Text>
      )}
      {ficha?.preferencias ? <Text className="text-sm">{ficha.preferencias}</Text> : null}
      {ficha && (
        <View className="flex-row gap-3">
          <AccionesContacto contacto={ficha.contacto} />
        </View>
      )}
      <Text className="text-sm text-gray-500">
        Crear la consulta se hace desde la web, en Oportunidades.
      </Text>
      {estado === "resuelta" ? null : !confirmando ? (
        <Pressable
          role="button"
          accessibilityLabel="No recontactar"
          onPress={() => {
            setConfirmando(true);
          }}
          className="items-center rounded-xl border border-input py-3"
        >
          <Text className="font-semibold text-red-700">No recontactar</Text>
        </Pressable>
      ) : (
        <View className="gap-3 rounded-2xl border border-border p-4">
          <Text role="heading" className="text-lg font-semibold">
            ¿No recontactar a este cliente?
          </Text>
          <Text className="text-sm">
            No volverá a aparecer en las sugerencias de recontacto. Podés revertirlo desde su ficha.
          </Text>
          {aviso && (
            <Text role="alert" accessibilityLiveRegion="assertive" className="text-red-700">
              {aviso}
            </Text>
          )}
          <Pressable
            role="button"
            accessibilityLabel="Confirmar"
            disabled={editar.isPending}
            onPress={confirmar}
            className="items-center rounded-xl bg-primary py-3"
          >
            <Text className="font-semibold text-primary-foreground">Confirmar</Text>
          </Pressable>
          <Pressable
            role="button"
            accessibilityLabel="Cancelar"
            disabled={editar.isPending}
            onPress={() => {
              setConfirmando(false);
              editar.reset();
            }}
            className="items-center py-2"
          >
            <Text className="font-semibold text-primary">Cancelar</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
