import { formatearFecha, type Resena } from "@rumbo/shared";
import { useOcultarResena } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Star } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mensajeDeError } from "@/lib/errores";

/** Reseña publicada (CU-18); con `puedeModerar`, admin y dueña la ocultan indicando el motivo (CU-29). */
export function ResenaPublicada({
  cliente,
  resena,
  puedeModerar,
}: {
  cliente: AxiosInstance;
  resena: Resena;
  puedeModerar: boolean;
}) {
  const [ocultando, setOcultando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [sinMotivo, setSinMotivo] = useState(false);
  const ocultar = useOcultarResena(cliente);
  const idMotivo = `motivo-${resena.id}`;
  return (
    <li className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-sm">
        <Star aria-hidden="true" className="size-4 fill-amber-400 text-amber-400" />
        <span className="font-medium">{resena.puntaje}</span>
        <span className="text-muted-foreground">{formatearFecha(resena.fecha)}</span>
        {puedeModerar && !ocultando && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={() => {
              setOcultando(true);
            }}
          >
            Ocultar reseña
          </Button>
        )}
      </div>
      <p>{resena.comentario}</p>
      {ocultando && (
        <form
          className="flex flex-wrap items-end gap-2"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const motivoLimpio = motivo.trim();
            setSinMotivo(motivoLimpio === "");
            if (motivoLimpio === "") return;
            ocultar.mutate({ resenaId: resena.id, datos: { motivo_baja: motivoLimpio } });
          }}
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor={idMotivo}>Motivo</Label>
            <Input
              id={idMotivo}
              className="h-9 w-64"
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
              }}
            />
          </div>
          <Button type="submit" size="sm" disabled={ocultar.isPending}>
            Confirmar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setOcultando(false);
              setSinMotivo(false);
              setMotivo("");
              ocultar.reset();
            }}
          >
            Cancelar
          </Button>
          {sinMotivo && (
            <p role="alert" className="w-full text-sm text-destructive">
              El motivo es obligatorio para ocultar la reseña.
            </p>
          )}
          {ocultar.isError && (
            <p role="alert" className="w-full text-sm text-destructive">
              {mensajeDeError(ocultar.error)}
            </p>
          )}
        </form>
      )}
    </li>
  );
}
