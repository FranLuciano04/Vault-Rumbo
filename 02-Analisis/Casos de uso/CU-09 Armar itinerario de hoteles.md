---
tipo: caso-uso
estado: en-revision
modulo: [viajes, hoteles]
responsable: Francisco
pc: pc1
actualizado: 11/09/26
---
# CU-09 Armar itinerario de hoteles

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
El empleado asocia uno o varios [[Hotel|Hoteles]] del catálogo al [[Viaje]], definiendo cada tramo (check-in/out y orden) y, cuando corresponde, la **fecha de vencimiento de pago al proveedor** de ese hotel. Ver [[DEC-0003 Relación Viaje–Hotel y Reseña]].

## Actor principal
[[Actores|empleado]]

## Actores secundarios
-

## Precondiciones
- El empleado está autenticado ([[CU-24 Iniciar sesión]]).
- Existe un [[Viaje]] ([[CU-07 Confirmar reserva]]).

## Flujo principal
1. El empleado abre el [[Viaje]] y entra a su **itinerario**.
2. Busca y agrega un [[Hotel]] del catálogo ([[CU-18 Buscar y recomendar hoteles]]).
3. Para cada [[Hotel]] carga el tramo: **check-in**, **check-out**, **orden** en el itinerario y, opcionalmente, la **fecha de vencimiento de pago al proveedor** (`vencimiento_pago_proveedor`).
4. El sistema guarda la relación en `viaje_hotel` ([[DEC-0003 Relación Viaje–Hotel y Reseña]]).
5. Si se cargó un vencimiento de pago a proveedor, el sistema genera una [[Alerta]] de tipo `pago` **un mes antes** de esa fecha.

## Flujos alternativos
- **A1 — Viaje sin hoteles:** un [[Viaje]] puede no tener hoteles (solo aéreo, excursión, crucero) → el itinerario queda vacío ([[DEC-0003 Relación Viaje–Hotel y Reseña]]).
- **A2 — Hotel fuera del catálogo:** el hotel no existe → el empleado lo da de alta primero ([[CU-16 Gestionar hotel en catálogo]]) y vuelve a agregarlo.
- **A3 — Editar/quitar tramo:** el empleado modifica fechas/orden o quita un [[Hotel]] del itinerario; el sistema reagenda o cierra la [[Alerta]] de pago asociada.
- **A4 — Pago a proveedor realizado:** el empleado marca `pago_proveedor_realizado` para ese hotel → el sistema resuelve su [[Alerta]].

## Postcondiciones
- El [[Viaje]] queda con su itinerario de [[Hotel|Hoteles]] (tramos y orden) y, si aplica, con las [[Alerta|Alertas]] de vencimiento de pago a proveedor agendadas.

## Reglas de negocio aplicadas
- Relación [[Viaje]] ⇄ [[Hotel]] **N:M** vía `viaje_hotel` (con `check_in`, `check_out`, `orden`, `vencimiento_pago_proveedor`, `pago_proveedor_realizado`) — ver [[DEC-0003 Relación Viaje–Hotel y Reseña]].
- El aviso de vencimiento a proveedor se genera **un mes antes** (requisito del relevamiento: "cada hotel tiene una fecha de vencimiento").

## Entidades del dominio involucradas
- [[Viaje]] · [[Hotel]] (relación `viaje_hotel`) · [[Alerta]] · [[Destino]] · [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]] · [[DGM-ER]] (tabla `viaje_hotel`).

## Decisiones asociadas
- [[DEC-0003 Relación Viaje–Hotel y Reseña]]

## 🔎 Revisión
> [!note] Francisco (11/09): especificado incluyendo el **vencimiento de pago a proveedor por hotel** (`vencimiento_pago_proveedor` en `viaje_hotel`) con [[Alerta]] un mes antes, del cruce del relevamiento crudo. A validar con Nahuel el tipo de [[Alerta]] usado (`pago`) y con Paloma que no impacte el catálogo de [[Hotel]].
