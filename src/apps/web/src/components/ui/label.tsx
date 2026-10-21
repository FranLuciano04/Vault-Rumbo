import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Etiqueta de shadcn/ui (estilo new-york) sobre `<label>` nativo.
export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-sm leading-none font-medium", className)} {...props} />;
}
