import {
  mensajeDeError,
  type BorradorContenido,
  type CanalContenido,
  type ContenidoRed,
} from "@rumbo/shared";
import { canalesContenido } from "@rumbo/shared/esquemas";
import { useCrearContenido, useEditarContenido, useGenerarPropuestasIA } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Check, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BorradoresPropuesta } from "./BorradoresPropuesta";
import { ETIQUETA_CANAL } from "./etiquetas";

const TONOS = ["Inspirador", "Promocional", "Informativo"] as const;

/** Botón de opción excluyente (canal, tono) con el estado en `aria-pressed`. */
function Opcion({
  activa,
  deshabilitada = false,
  alElegir,
  children,
}: {
  activa: boolean;
  deshabilitada?: boolean;
  alElegir: () => void;
  children: string;
}) {
  return (
    <Button
      size="sm"
      className="rounded-full"
      variant={activa ? "default" : "outline"}
      aria-pressed={activa}
      disabled={deshabilitada}
      onClick={alElegir}
    >
      {activa && <Check aria-hidden="true" />}
      {children}
    </Button>
  );
}

/**
 * Panel «Propuesta con IA» (CU-20, RF-119, RF-121). Con `pieza` aplica el borrador a esa pieza (A3);
 * sin ella crea una pieza nueva y pide su fecha de publicación. La IA solo recibe tema, canal y tono.
 */
export function PropuestaIA({
  cliente,
  pieza,
  alCerrar,
}: {
  cliente: AxiosInstance;
  pieza?: ContenidoRed;
  alCerrar: () => void;
}) {
  const generar = useGenerarPropuestasIA(cliente);
  const crear = useCrearContenido(cliente);
  const editar = useEditarContenido(cliente);
  const [tema, setTema] = useState(pieza?.titulo ?? "");
  const [canal, setCanal] = useState<CanalContenido | undefined>(pieza?.canal);
  const [tono, setTono] = useState<string>(TONOS[0]);
  const [fecha, setFecha] = useState("");
  const [titulo, setTitulo] = useState("");
  // El canal del pedido que produjo los borradores: es el que se guarda, aunque después se cambie el botón.
  const [canalGenerado, setCanalGenerado] = useState<CanalContenido>();
  // Cada generación remonta los borradores: ninguno queda en edición.
  const [generacion, setGeneracion] = useState(0);
  const panel = useRef<HTMLElement>(null);
  const [borradores, setBorradores] = useState<BorradorContenido[]>([]);
  const [textos, setTextos] = useState<string[]>([]);
  const [elegido, setElegido] = useState(0);
  // Un solo mensaje a la vez: la validación del formulario o el error de la IA o del guardado.
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [falloLaIA, setFalloLaIA] = useState(false);
  const ocupado = generar.isPending || crear.isPending || editar.isPending;

  // Al abrir el foco entra al panel y, al cerrarlo, vuelve al botón que lo abrió.
  useEffect(() => {
    const abridor = document.activeElement;
    panel.current?.querySelector<HTMLElement>("input")?.focus();
    return () => {
      if (abridor instanceof HTMLElement) abridor.focus();
    };
  }, []);

  function alTeclear(evento: KeyboardEvent) {
    if (evento.key === "Escape") {
      if (!ocupado) alCerrar();
      return;
    }
    if (evento.key !== "Tab" || !panel.current) return;
    const foco = [
      ...panel.current.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled), textarea:not(:disabled)",
      ),
    ];
    const primero = foco[0];
    const ultimo = foco[foco.length - 1];
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo?.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero?.focus();
    }
  }

  function pedir() {
    setFalloLaIA(false);
    if (!tema.trim()) {
      setMensaje("Escribí el tema o el destino del posteo.");
      return;
    }
    if (!canal) {
      setMensaje("Elegí un canal.");
      return;
    }
    setMensaje(null);
    generar.mutate(
      { tema: tema.trim(), canal, tono },
      {
        onSuccess: ({ borradores: nuevos }) => {
          setBorradores(nuevos);
          setTextos(nuevos.map(({ texto }) => texto));
          setElegido(0);
          setTitulo(nuevos[0]?.titulo ?? "");
          setCanalGenerado(canal);
          setGeneracion(generacion + 1);
        },
        // Si falla un «Regenerar» se conservan los borradores anteriores (RF-122).
        onError: (falla) => {
          setMensaje(mensajeDeError(falla));
          setFalloLaIA(true);
        },
      },
    );
  }

  async function guardar() {
    const borrador = borradores[elegido];
    if (!borrador || !canalGenerado) return;
    if (!pieza && !titulo.trim()) {
      setMensaje("Escribí el título de la pieza.");
      return;
    }
    if (!pieza && !fecha) {
      setMensaje("Elegí la fecha de publicación.");
      return;
    }
    setMensaje(null);
    const texto = textos[elegido] ?? borrador.texto;
    try {
      // Desde una pieza se conserva su título; desde el encabezado se crea una nueva.
      if (pieza) await editar.mutateAsync({ contenidoId: pieza.id, cambios: { texto } });
      else
        await crear.mutateAsync({
          titulo: titulo.trim(),
          texto,
          canal: canalGenerado,
          fecha_publicacion: fecha,
        });
      alCerrar();
    } catch (falla) {
      setMensaje(mensajeDeError(falla));
    }
  }

  return (
    <aside
      role="dialog"
      aria-modal="true"
      ref={panel}
      aria-label="Propuesta con IA"
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-lg flex-col gap-4 overflow-y-auto border-l bg-background p-6 shadow-lg"
      onKeyDown={alTeclear}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {pieza && (
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {`Para la pieza «${pieza.titulo}»`}
            </p>
          )}
          <h2 className="text-lg font-semibold">Propuesta con IA</h2>
        </div>
        <Button size="sm" variant="ghost" disabled={ocupado} onClick={alCerrar}>
          Cerrar
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="propuesta-tema">Tema o destino</Label>
        <Input
          id="propuesta-tema"
          value={tema}
          maxLength={500}
          onChange={(evento) => {
            setTema(evento.target.value);
          }}
        />
      </div>
      <div role="group" aria-label="Canal" className="flex flex-wrap gap-2">
        {canalesContenido.map((opcion) => (
          <Opcion
            key={opcion}
            activa={canal === opcion}
            deshabilitada={pieza !== undefined}
            alElegir={() => {
              setCanal(opcion);
            }}
          >
            {ETIQUETA_CANAL[opcion]}
          </Opcion>
        ))}
      </div>
      <div role="group" aria-label="Tono u objetivo" className="flex flex-wrap gap-2">
        {TONOS.map((opcion) => (
          <Opcion
            key={opcion}
            activa={tono === opcion}
            alElegir={() => {
              setTono(opcion);
            }}
          >
            {opcion}
          </Opcion>
        ))}
      </div>
      <div className="flex gap-3 rounded-xl bg-muted/60 p-4 text-sm">
        <Sparkles aria-hidden="true" className="size-4 shrink-0 text-primary" />
        <div>
          <p className="font-medium">La IA solo usa lo que escribís acá</p>
          <p className="text-xs text-muted-foreground">
            No ve clientes, catálogo ni ventas. Revisá y editá el borrador antes de guardarlo.
          </p>
        </div>
      </div>

      {mensaje && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {mensaje}
        </p>
      )}

      {borradores.length === 0 ? (
        <Button className="self-start" disabled={ocupado} onClick={pedir}>
          {falloLaIA ? "Reintentar" : "Generar"}
        </Button>
      ) : (
        <>
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {borradores.length === 1 ? "1 borrador" : `${String(borradores.length)} borradores`}
          </h3>
          <BorradoresPropuesta
            borradores={borradores}
            textos={textos}
            elegido={elegido}
            key={generacion}
            alElegir={(indice) => {
              setElegido(indice);
              setTitulo(borradores[indice]?.titulo ?? "");
            }}
            alEditarTexto={(indice, texto) => {
              setTextos(textos.map((actual, i) => (i === indice ? texto : actual)));
            }}
          />
          {!pieza && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="propuesta-titulo">Título</Label>
              <Input
                id="propuesta-titulo"
                value={titulo}
                maxLength={200}
                onChange={(evento) => {
                  setTitulo(evento.target.value);
                }}
              />
              <Label htmlFor="propuesta-fecha">Fecha de publicación</Label>
              <Input
                id="propuesta-fecha"
                type="date"
                value={fecha}
                onChange={(evento) => {
                  setFecha(evento.target.value);
                }}
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" disabled={ocupado} onClick={pedir}>
              <RefreshCw aria-hidden="true" />
              Regenerar
            </Button>
            <Button variant="outline" disabled={ocupado} onClick={alCerrar}>
              Descartar
            </Button>
            <Button className="flex-1" disabled={ocupado} onClick={() => void guardar()}>
              <Check aria-hidden="true" />
              Guardar en la pieza
            </Button>
          </div>
        </>
      )}
    </aside>
  );
}
