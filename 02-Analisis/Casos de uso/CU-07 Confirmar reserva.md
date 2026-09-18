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
El empleado **cierra la venta** creando el [[Viaje]] a partir de una [[Oportunidad]] ganada: fija destino, fechas, categoría y responsable, carga su economía ([[CU-10 Registrar economía del viaje]]) y plan de cuotas ([[CU-11 Definir plan de cuotas]]). El [[Viaje]] nace en estado **`reservado`** (el cliente aceptó la cotización) y pasa a `vendido` cuando se cobra la **seña** ([[CU-12 Registrar cobro de un pago]]). El estado `confirmado` del [[Viaje]] corresponde a "total pagado", y no debe confundirse con el acto de confirmar la reserva.

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
3. El sistema crea el [[Viaje]] en estado `reservado`, asociado al [[Cliente]] y vinculado a la [[Oportunidad]] de origen.
4. El sistema genera automáticamente las [[Alerta|Alertas]] de tipo `formulario` según los [[RequisitoDestino|requisitos del destino]] ([[CU-15 Configurar recordatorios por destino]]) y una [[Alerta]] de tipo `salida` con aviso previo a la fecha de salida del [[Viaje]] (anticipación **configurable, default 7 días** ⚠️ valor a validar con la agencia).
5. El sistema encadena el **control económico** ([[CU-10 Registrar economía del viaje]] — `<<include>>`) y el **plan de cuotas** con la seña ([[CU-11 Definir plan de cuotas]]); al cobrarse la seña ([[CU-12 Registrar cobro de un pago]]) el [[Viaje]] pasa a `vendido`. También ofrece armar el **itinerario de hoteles** ([[CU-09 Armar itinerario de hoteles]]).

## Flujos alternativos
- **A1 — Venta directa (sin cotización formal):** la [[Oportunidad]] se cerró `ganada` sin [[Cotización]] escrita ([[CU-05 Seguir oportunidad]] A4) → igual se confirma el [[Viaje]].
- **A2 — Destino sin requisitos:** el destino no tiene [[RequisitoDestino|requisitos]] configurados → no se generan [[Alerta|Alertas]] de formulario.
- **A3 — Datos faltantes:** falta destino o fechas → el sistema no confirma y pide completarlos.

## Postcondiciones
- Existe un [[Viaje]] `reservado` asociado al [[Cliente]] y a su [[Oportunidad]], con las [[Alerta|Alertas]] de formulario por destino y de salida generadas y su economía/plan cargados; pasará a `vendido` al cobrarse la seña ([[CU-12 Registrar cobro de un pago]]).
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
> [!note] Francisco + Nahuel (11/09) — **definido en la sync:** el [[Viaje]] nace en **`reservado`** (aceptó la cotización), pasa a **`vendido`** al cobrarse la **seña** y a **`confirmado`** al pagar el **total** ([[CU-12 Registrar cobro de un pago]]). Ciclo completo: `reservado → vendido → confirmado → en curso → finalizado` (+`cancelado`). CU-07 encadena economía ([[CU-10 Registrar economía del viaje]]) y plan de cuotas ([[CU-11 Definir plan de cuotas]]). Resuelto el orden seña ↔ economía/plan con Nahuel (dueño de pagos).
>
> [!note] Nahuel (18/09) — al cerrar el enum `tipo` de [[Alerta]] se sumó acá la generación de la alerta `salida` (aviso de próxima salida, junto con las de `formulario`).
>
> [!note] Nahuel (18/09, entrevista grill) — la anticipación de `salida` queda como **parámetro de configuración global con default 7 días** (Q8), análogo a `anticipacion_dias` de [[RequisitoDestino]]; el valor a confirmar con la agencia no bloquea PC1.
