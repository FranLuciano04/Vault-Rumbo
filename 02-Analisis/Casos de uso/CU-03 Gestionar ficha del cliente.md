---
tipo: caso-uso
estado: formalizado
modulo: [clientes]
responsable: Paloma
pc: pc1
actualizado: 27/10/26
fecha_aprobacion: 29/09/26
---
# CU-03 Gestionar ficha del cliente

tags:: #tipo/caso-uso #estado/formalizado #pc/pc1

## Descripción
El empleado consulta y edita la ficha de un [[Cliente]] existente —datos de contacto, segmento y preferencias— y revisa su **historial** (oportunidades, viajes y reseñas), manteniendo viva la memoria del cliente ([[Relevamiento — Fuente de verdad]]).

## Actor principal
[[Actores|empleado]]

## Actores secundarios
- [[Actores|Pasajero / Cliente]] (externo: aporta cambios de datos o preferencias; no opera el sistema).

## Precondiciones
- El empleado está autenticado ([[CU-24 Iniciar sesión]]).
- El [[Cliente]] existe (fue dado de alta en [[CU-02 Registrar cliente]]).

## Flujo principal
1. El empleado **busca** al [[Cliente]] (por nombre o contacto) y abre su ficha.
2. El sistema muestra los datos, el segmento, las preferencias y el **historial**: [[Oportunidad|Oportunidades]], [[Viaje|Viajes]] y [[Reseña|Reseñas]] asociados.
3. El empleado edita los campos que necesite: **nombre**, **contacto** (teléfono/WhatsApp o email), su usuario de **Instagram** (opcional), **segmento** (familia · amigos · individual · pareja), **preferencias** y el **asesor asignado** ([[Usuario]], opcional — ver [[DEC-0005 Autenticación y modelo de roles]]).
4. El sistema valida que se conserven los datos mínimos (**nombre** y al menos un **contacto**) y guarda los cambios.
5. El sistema confirma la actualización.

## Flujos alternativos
- **A1 — Cliente no encontrado:** la búsqueda no arroja resultados → el sistema ofrece darlo de alta ([[CU-02 Registrar cliente]]).
- **A2 — Edición inválida:** se intenta dejar la ficha sin nombre o sin ningún contacto → el sistema rechaza el guardado y conserva los datos previos.
- **A3 — Solo consulta:** el empleado revisa la ficha y el historial sin modificar nada.
- **A4 — Posible duplicado al editar:** el nuevo **nombre** o **contacto** coincide con el de otro [[Cliente]] → el sistema avisa como en el alta ([[CU-02 Registrar cliente]] A1) y guarda solo si el empleado confirma. Solo se controla lo que cambia, sin contar la propia ficha. Si el `freelance` no ve al otro cliente, el aviso no muestra sus datos. Un duplicado ya confirmado ([[DEC-0020 Cliente traído por dos asesores|DEC-0020]]) puede editar sus otros campos sin aviso. *Agregado el 27/10/26 por decisión del equipo (H-04 de la review de M2).*

## Postcondiciones
- La ficha del [[Cliente]] refleja los cambios, preservando los datos mínimos (nombre + un contacto).
- El historial de [[Oportunidad|Oportunidades]], [[Viaje|Viajes]] y [[Reseña|Reseñas]] queda disponible como memoria del cliente para futuras gestiones.

## Reglas de negocio aplicadas
- (Ninguna regla económica en este CU.)
- Invariante de dominio: un [[Cliente]] no es un [[Usuario]]; la ficha se conserva con al menos nombre y un contacto.
- Cualquier empleado autenticado puede editar la ficha; no hay campos restringidos por rol (coherente con la visibilidad para toda la agencia de [[CU-02 Registrar cliente]]).

## Entidades del dominio involucradas
- [[Cliente]] · [[Oportunidad]] · [[Viaje]] · [[Reseña]] · [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · (pendiente) diagrama de actividad de la edición de ficha.

## Decisiones asociadas
- [[DEC-0005 Autenticación y modelo de roles]] (quién puede editar la ficha).

## 🔎 Revisión
> [!note] Paloma (10/09): Decisiones de la responsable — (1) **todos los empleados** pueden editar la ficha, sin campos restringidos por rol; (2) el `Cliente` **no se borra ni se archiva** y **no tiene estado**: la ficha solo se edita y se consulta, para conservar la memoria del cliente. El permiso de edición se ratifica en la sync junto con [[DEC-0005 Autenticación y modelo de roles]].
>
> [!note] Francisco (11/09) — revisión de inconsistencias: **definido.** Coherente con [[DEC-0005 Autenticación y modelo de roles]] (edición global del `Cliente`). Se suma el campo editable `asesor_asignado` (opcional, no restringe acceso). Paloma: para tu conocimiento; ajustable en la sync si hace falta.
