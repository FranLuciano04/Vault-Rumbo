---
tipo: caso-uso
estado: formalizado
modulo: [viajes]
responsable: Francisco
pc: pc1
actualizado: 11/11/26
fecha_aprobacion: 29/09/26
---
# CU-07 Confirmar reserva

tags:: #tipo/caso-uso #estado/formalizado #pc/pc1

## Descripción
El empleado **cierra la venta** creando el [[Viaje]] a partir de una [[Oportunidad]] ganada: fija destino, fechas, categoría y responsable, carga su economía ([[CU-10 Registrar economía del viaje]]) y plan de cuotas ([[CU-11 Definir plan de cuotas]]). El [[Viaje]] nace en estado **`reservado`** (el cliente aceptó la cotización) y pasa a `vendido` cuando se cobra la **seña** ([[CU-12 Registrar cobro de un pago]]). El estado `confirmado` del [[Viaje]] corresponde a "total pagado", y no debe confundirse con el acto de confirmar la reserva.

## Actor principal
[[Actores|empleado]]

## Actores secundarios
- [[Actores|Pasajero / Cliente]] (externo: confirma la compra; no opera el sistema).

## Precondiciones
- El empleado está autenticado ([[CU-24 Iniciar sesión]]).
- Existe una [[Oportunidad]] abierta con una [[Cotización]] `aceptada` ([[CU-06 Emitir cotización]]), o una [[Oportunidad]] ya cerrada `ganada` por venta directa ([[CU-05 Seguir oportunidad]] A4).

## Flujo principal
1. Desde la [[Oportunidad]] (con su [[Cotización]] aceptada), el empleado elige **Confirmar reserva**.
2. El sistema **precarga** el diálogo: de la [[Cotización]] aceptada, la **moneda** y el **precio de venta** (su total); de la [[Oportunidad]], las **fechas** tentativas de salida y regreso y el **destino**, que se preelige si hay un solo destino del catálogo cuyo nombre coincide con el consultado ([[DEC-0006 Destino como entidad de catálogo|DEC-0006]]).
3. El empleado carga o confirma los datos del [[Viaje]]: **destino** (del catálogo, [[CU-26 Gestionar destinos]]), **fechas** (salida/regreso), **categoría** (`grupal` o `individual`), **responsable** ([[Usuario]]), **precio de venta** y **costo**. El costo se carga a mano, porque la cotización no lo tiene. Todo se puede editar **menos la moneda**, que la fija la cotización aceptada ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]]).
4. Carga el **primer pago**: monto, tipo y vencimiento. No hace falta que esté cobrado.
5. El sistema crea el [[Viaje]] en estado `reservado`, asociado al [[Cliente]] y vinculado a la [[Oportunidad]] de origen, y **cierra la [[Oportunidad]] como `ganada`** si todavía no lo estaba.
6. El sistema genera automáticamente las [[Alerta|Alertas]] de tipo `formulario` según los [[RequisitoDestino|requisitos del destino]] ([[CU-15 Configurar recordatorios por destino]]) y una [[Alerta]] de tipo `salida` con aviso previo a la fecha de salida del [[Viaje]] (anticipación **configurable, default 7 días**).
7. El sistema registra el **control económico** ([[CU-10 Registrar economía del viaje]] — `<<include>>`) y el **plan de la reserva** con el primer pago, que puede sumar menos que el precio de venta ([[CU-11 Definir plan de cuotas]] A7). El resto del plan se completa desde el viaje. Con el **primer cobro** ([[CU-12 Registrar cobro de un pago]] A0) el [[Viaje]] pasa a `vendido`.
8. Si la cotización aceptada tiene hoteles, el sistema crea un tramo del **itinerario** por cada uno, en el orden de los ítems ([[CU-09 Armar itinerario de hoteles]] A6). Si no tiene, ofrece armarlo desde el viaje ([[CU-09 Armar itinerario de hoteles]]).

## Flujos alternativos
- **A1 — Venta directa (sin cotización formal):** la [[Oportunidad]] se cerró `ganada` sin [[Cotización]] escrita ([[CU-05 Seguir oportunidad]] A4) → igual se confirma el [[Viaje]], sin precarga de la cotización y sin itinerario.
- **A2 — Destino sin requisitos:** el destino no tiene [[RequisitoDestino|requisitos]] configurados → no se generan [[Alerta|Alertas]] de formulario.
- **A3 — Datos faltantes:** falta destino, fechas, precio de venta, costo o primer pago → el sistema no confirma y pide completarlos.
- **A4 — Un tramo del itinerario no entra:** un hotel de la cotización queda fuera de las fechas del viaje, se superpone con otro tramo o ya está cerrado en el catálogo → ese tramo **no se crea** y la respuesta de la reserva lo avisa. La reserva no se rechaza: el tramo se arregla después desde el viaje ([[CU-09 Armar itinerario de hoteles]] A3).

## Postcondiciones
- Existe un [[Viaje]] `reservado` asociado al [[Cliente]] y a su [[Oportunidad]], con las [[Alerta|Alertas]] de formulario por destino y de salida generadas y su economía/plan cargados; pasará a `vendido` con el primer cobro ([[CU-12 Registrar cobro de un pago]] A0).
- La [[Oportunidad]] queda `ganada` y cerrada: **la cierra este CU** al confirmar la reserva.

## Reglas de negocio aplicadas
- La **comisión** no se calcula acá: se determina al registrar la economía ([[CU-10 Registrar economía del viaje]], [[RN-01 Comisión automática]]).
- El [[Viaje]] hereda el `responsable` de la operación ([[DEC-0005 Autenticación y modelo de roles]]).
- La reserva pide solo el **primer pago**: el plan tiene al menos un pago mayor que cero y no supera el precio de venta ([[CU-11 Definir plan de cuotas]] A7). «Confirmar la reserva» es el acto de crear el viaje, no su estado `confirmado` ([[DEC-0028 Cotizaciones alternativas y reserva con el primer pago|DEC-0028]]).

## Entidades del dominio involucradas
- [[Viaje]] · [[Oportunidad]] · [[Cliente]] · [[Destino]] · [[Alerta]] · [[RequisitoDestino]] · [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]] · [[DGM-SEC — De la consulta a la venta]] (secuencia, vista de negocio) · [[DGM-ACT — Confirmar reserva]] (actividad) · [[DGM-SEC — Confirmar reserva]] (secuencia, clases del sistema).

## Decisiones asociadas
- [[DEC-0006 Destino como entidad de catálogo]] · [[DEC-0005 Autenticación y modelo de roles]] · [[DEC-0026 Tipo de cambio y deuda nueva en un viaje confirmado|DEC-0026]] · [[DEC-0028 Cotizaciones alternativas y reserva con el primer pago|DEC-0028]]

## 🔎 Revisión
> [!note] Francisco + Nahuel (11/09) — **definido en la sync:** el [[Viaje]] nace en **`reservado`** (aceptó la cotización), pasa a **`vendido`** al cobrarse la **seña** y a **`confirmado`** al pagar el **total** ([[CU-12 Registrar cobro de un pago]]). Ciclo completo: `reservado → vendido → confirmado → en curso → finalizado` (+`cancelado`). CU-07 encadena economía ([[CU-10 Registrar economía del viaje]]) y plan de cuotas ([[CU-11 Definir plan de cuotas]]). Resuelto el orden seña ↔ economía/plan con Nahuel (dueño de pagos).
>
> [!note] Nahuel (18/09) — al cerrar el enum `tipo` de [[Alerta]] se sumó acá la generación de la alerta `salida` (aviso de próxima salida, junto con las de `formulario`).
>
> [!note] Nahuel (18/09, entrevista grill) — la anticipación de `salida` queda como **parámetro de configuración global con default 7 días** (Q8), análogo a `anticipacion_dias` de [[RequisitoDestino]]; el valor a confirmar con la agencia no bloquea PC1.
>
> [!success] Equipo (11/11/26) — **precarga, primer pago e itinerario desde la cotización** ([[DEC-0028 Cotizaciones alternativas y reserva con el primer pago|DEC-0028]] puntos 2, 3 y 4). El diálogo se precarga con la cotización aceptada y la oportunidad, pide precio de venta, costo y primer pago, y crea los tramos de hotel de la cotización. Se sumó A4. ⚠️ [[DGM-ACT — Confirmar reserva]] y [[DGM-SEC — Confirmar reserva]] quedaron desactualizados.
