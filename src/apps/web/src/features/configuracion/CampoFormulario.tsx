import type { ComponentProps, ReactNode } from "react";
import type { FieldError } from "react-hook-form";
import { Label } from "@/components/ui/label";

/** Etiqueta, control y mensaje de error de un campo; el control recibe `id` y `aria-*` ya armados. */
export function CampoFormulario({
  id,
  etiqueta,
  error,
  children,
}: {
  id: string;
  etiqueta: string;
  error?: FieldError;
  children: (
    props: Pick<ComponentProps<"input">, "id" | "aria-invalid" | "aria-describedby">,
  ) => ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{etiqueta}</Label>
      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": error ? `${id}-error` : undefined,
      })}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error.message}
        </p>
      )}
    </div>
  );
}
