---
tipo: caso-uso
estado: en-revision
modulo: [viajes]
responsable: Francisco
pc: pc1
actualizado: 11/09/26
---
# CU-07 Confirmar reserva

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
El empleado **cierra la venta** creando el [[Viaje]] a partir de una [[Oportunidad]] ganada: fija destino, fechas, categoría y responsable, y deja el viaje listo para su control económico ([[CU-10 Registrar economía del viaje]]) y su itinerario ([[CU-09 Armar itinerario de hoteles]]). El [[Viaje]] nace en estado **`vendido`** (aceptó la cotización y pagó la seña). *(Ojo con el nombre: "confirmar reserva" = cerrar la venta; el estado `confirmado` del [[Viaje]] es otra cosa — significa "total pagado", ver [[CU-12 Registrar cobro de un pago]].)*

## Actor principal
[[Actores|empleado]]

## Actores secundarios
- [[Actores|Pasajero / Cliente]] (externo: confirma la compra; no opera el sistema).

## Precondiciones
- El empleado está autenticado ([[CU-24 Iniciar sesión]]).
- Existe una [[Oportunidad]] `ganada` (o una [[Cotización]] `aceptada`) para un [[Cliente]] ([[CU-05 Seguir oportunidad]], [[CU-06 Emitir cotización]]).

## Flujo principal
1. Desde la [[Oportunidad]] ganada, el empleado elige **Confirmar reserva**.
2. Carga/confirma los datos del [[Viaje]]: **destino** (del catálogo, [[CU-26 Gestionar destinos]]), **fechas** (salida/regreso), **categoría** (ej. salida grupal, individual) y **responsable** ([[Usuario]]).
3. El sistema crea el [[Viaje]] en estado `vendido` (venta cerrada con seña), asociado al [[Cliente]] y vinculado a la [[Oportunidad]] de origen.
4. El sistema genera automáticamente las [[Alerta|Alertas]] de tipo `formulario` según los [[RequisitoDestino|requisitos del destino]] ([[CU-15 Configurar recordatorios por destino]]).
5. El sistema encadena el **control económico** ([[CU-10 Registrar economía del viaje]] — `<<include>>`) y ofrece armar el **itinerario de hoteles** ([[CU-09 Armar itinerario de hoteles]]).

## Flujos alternativos
- **A1 — Venta directa (sin cotización formal):** la [[Oportunidad]] se cerró `ganada` sin [[Cotización]] escrita ([[CU-05 Seguir oportunidad]] A4) → igual se confirma el [[Viaje]].
- **A2 — Destino sin requisitos:** el destino no tiene [[RequisitoDestino|requisitos]] configurados → no se generan [[Alerta|Alertas]] de formulario.
- **A3 — Datos faltantes:** falta destino o fechas → el sistema no confirma y pide completarlos.

## Postcondiciones
- Existe un [[Viaje]] `vendido` asociado al [[Cliente]] y a su [[Oportunidad]], con las [[Alerta|Alertas]] de formulario por destino generadas, listo para su economía ([[CU-10 Registrar economía del viaje]]) y su itinerario ([[CU-09 Armar itinerario de hoteles]]).
- La [[Oportunidad]] queda `ganada` y cerrada.

## Reglas de negocio aplicadas
- La **comisión** no se calcula acá: se determina al registrar la economía ([[CU-10 Registrar economía del viaje]], [[RN-01 Comisión automática]]).
- El [[Viaje]] hereda el `responsable` de la operación ([[DEC-0005 Autenticación y modelo de roles]]).

## Entidades del dominio involucradas
- [[Viaje]] · [[Oportunidad]] · [[Cliente]] · [[Destino]] · [[Alerta]] · [[RequisitoDestino]] · [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]] · (pendiente) diagrama de secuencia consulta→reserva.

## Decisiones asociadas
- [[DEC-0006 Destino como entidad de catálogo]] · [[DEC-0005 Autenticación y modelo de roles]]

## 🔎 Revisión
> [!note] Francisco (11/09) — **definido en la sync:** (1) el [[Viaje]] nace en **`vendido`** (aceptó cotización + pagó seña); el estado `confirmado` pasa a significar **"total pagado"** y se alcanza al saldar ([[CU-12 Registrar cobro de un pago]]). Se eliminó `armado`. Ciclo: `vendido → confirmado → en curso → finalizado` (+`cancelado`). (2) la economía ([[CU-10 Registrar economía del viaje]]) se encadena (`<<include>>`) pero no bloquea. **A coordinar:** el orden fino seña ↔ economía/plan de cuotas ([[CU-10 Registrar economía del viaje|CU-10]]/[[CU-11 Definir plan de cuotas|CU-11]]/[[CU-12 Registrar cobro de un pago|CU-12]]) con Nahuel.
