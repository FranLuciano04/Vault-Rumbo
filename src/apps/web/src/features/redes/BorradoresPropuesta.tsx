import type { BorradorContenido } from "@rumbo/shared";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Los borradores de la IA (CU-20): se elige uno y su texto se puede editar antes de guardarlo. */
export function BorradoresPropuesta({
  borradores,
  textos,
  elegido,
  alElegir,
  alEditarTexto,
}: {
  borradores: BorradorContenido[];
  /** El texto vigente de cada borrador (el de la IA o el que corrigió la persona). */
  textos: string[];
  elegido: number;
  alElegir: (indice: number) => void;
  alEditarTexto: (indice: number, texto: string) => void;
}) {
  const [editando, setEditando] = useState<number>();

  return (
    <div role="radiogroup" aria-label="Borradores" className="flex flex-col gap-3">
      {borradores.map((borrador, indice) => {
        const activo = indice === elegido;
        return (
          <div
            key={`${String(indice)}-${borrador.titulo}`}
            className={cn(
              "flex flex-col gap-2 rounded-xl border p-4 text-sm",
              activo ? "border-2 border-primary bg-muted/40" : "bg-card",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 font-medium">
                <input
                  type="radio"
                  name="borrador"
                  checked={activo}
                  onChange={() => {
                    alElegir(indice);
                  }}
                />
                <span>{borrador.titulo}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {activo ? "Elegido" : "Opción"}
                </span>
              </label>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Editar ${borrador.titulo}`}
                onClick={() => {
                  setEditando(indice);
                }}
              >
                <Pencil aria-hidden="true" />
                Editar
              </Button>
            </div>
            {editando === indice ? (
              <Textarea
                aria-label="Texto del borrador"
                value={textos[indice] ?? ""}
                onChange={(evento) => {
                  alEditarTexto(indice, evento.target.value);
                }}
              />
            ) : (
              <p className="whitespace-pre-line">{textos[indice]}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
