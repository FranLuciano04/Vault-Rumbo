import type { Cliente } from "@rumbo/shared";
import { TriangleAlert } from "lucide-react";
import { Link } from "react-router";
import { Button, variantesBoton } from "@/components/ui/button";

const AVISO_CLIENTE_AJENO =
  "Ya hay un cliente con ese contacto en la agencia. Consultalo con un admin";

/**
 * Aviso de posible duplicado (CU-02 A1, CU-03): los candidatos con acceso a su ficha, o el aviso
 * del freelance. Con `alCancelar` ofrece también cerrar solo el aviso.
 */
export function AvisoDuplicado({
  candidatos,
  enviando,
  textoConfirmar,
  alConfirmar,
  alCancelar,
}: {
  candidatos: Cliente[];
  enviando: boolean;
  textoConfirmar: string;
  alConfirmar: () => void;
  alCancelar?: () => void;
}) {
  return (
    <section
      role="alert"
      className="flex flex-col gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
    >
      <h2 className="flex items-center gap-2 font-semibold">
        <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
        Posible cliente duplicado
      </h2>
      {candidatos.length === 0 ? (
        <p>{AVISO_CLIENTE_AJENO}</p>
      ) : (
        <>
          <p>
            Ya hay clientes parecidos (mismo contacto o nombre). Si es la misma persona, abrí su
            ficha.
          </p>
          <ul className="flex flex-col gap-2">
            {candidatos.map(({ id, nombre, contacto }) => (
              <li key={id} className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="font-medium">{nombre}</span>
                  <span>{contacto}</span>
                </div>
                <Link to={`/clientes/${id}`} className={variantesBoton({ variant: "outline" })}>
                  Ir al cliente existente
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="flex gap-2">
        <Button type="button" disabled={enviando} onClick={alConfirmar}>
          {textoConfirmar}
        </Button>
        {alCancelar && (
          <Button type="button" variant="outline" onClick={alCancelar}>
            Cancelar
          </Button>
        )}
      </div>
    </section>
  );
}
