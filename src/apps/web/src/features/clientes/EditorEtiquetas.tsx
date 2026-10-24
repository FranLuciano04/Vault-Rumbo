import { MAX_ETIQUETAS, MAX_LARGO_ETIQUETA } from "@rumbo/shared/esquemas";
import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Etiquetas del cliente (RF-031) como chips removibles más un campo para sumar otra. */
export function EditorEtiquetas({
  etiquetas,
  alCambiar,
}: {
  etiquetas: string[];
  alCambiar: (etiquetas: string[]) => void;
}) {
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  function agregar() {
    const nueva = texto.trim();
    if (!nueva) return;
    if (nueva.length > MAX_LARGO_ETIQUETA) {
      setAviso(`Cada etiqueta puede tener hasta ${String(MAX_LARGO_ETIQUETA)} caracteres.`);
      return;
    }
    if (etiquetas.length >= MAX_ETIQUETAS) {
      setAviso(`Un cliente puede tener hasta ${String(MAX_ETIQUETAS)} etiquetas.`);
      return;
    }
    setAviso(null);
    setTexto("");
    if (!etiquetas.some((e) => e.toLowerCase() === nueva.toLowerCase()))
      alCambiar([...etiquetas, nueva]);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="nueva-etiqueta">Nueva etiqueta</Label>
      <div className="flex gap-2">
        <Input
          id="nueva-etiqueta"
          value={texto}
          aria-invalid={aviso !== null}
          aria-describedby={aviso ? "nueva-etiqueta-error" : undefined}
          onChange={(e) => {
            setTexto(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            agregar();
          }}
        />
        <Button type="button" variant="outline" onClick={agregar}>
          Agregar etiqueta
        </Button>
      </div>
      {aviso && (
        <p id="nueva-etiqueta-error" className="text-xs text-destructive">
          {aviso}
        </p>
      )}
      <ul className="flex flex-wrap gap-1">
        {etiquetas.map((etiqueta) => (
          <li key={etiqueta}>
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              aria-label={`Quitar etiqueta ${etiqueta}`}
              onClick={() => {
                alCambiar(etiquetas.filter((e) => e !== etiqueta));
              }}
            >
              {etiqueta}
              <X aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
