---
tipo: decision
estado: formalizado
modulo: [M6, M8]
decisores: [Francisco, Paloma, Nahuel]
fecha_aprobacion: 30/10/26
supersede:
actualizado: 30/10/26
---
# DEC-0024 Reglas del dashboard, calendario y criterios de M6

tags:: #tipo/decision #estado/formalizado #pc/pc2

> ✅ **Aprobada por el equipo el 30/10/26.** Claude propuso las recomendaciones en la sesión de Francisco, a partir de las reviews de T-095, T-119 y T-121. Francisco las aprobó en nombre del equipo («todo el equipo estamos de acuerdo»).

## Contexto
Hoy cerramos varios tickets de M6 y M8, y en sus reviews quedaron abiertas algunas reglas del negocio que ni los CU ni las DEC fijaban:
- **T-095:** revertir un cobro.
- **T-119:** el contrato de M8.
- **T-121:** el embudo y los indicadores económicos.

También quedaban dos preguntas de días anteriores. Las notas del momento están en la [[Bitácora de sesiones]] del 30/10/26.

## Decisión

### Dashboard (CU-21, T-121 y siguientes)
1. **Pendiente de cobrar = foto del momento.** Suma todos los pagos `pendiente` o `vencido`, sin importar en qué período se vendió el viaje. Lo cobrado, en cambio, se mide por `fecha_cobro` dentro del período.
2. **La comisión porcentual con ganancia ≤ 0 vale 0.** Una comisión de importe fijo no cambia (complementa [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]]).
3. **Pertenencia al período:**
   - las oportunidades y los viajes (ventas) entran por su fecha de creación;
   - los cobros, por `fecha_cobro`;
   - los extremos son inclusivos y se cortan en hora de Argentina;
   - sin fechas, el período es el mes en curso.
4. **Venta = viaje no cancelado.**
5. **Alcance del freelance en el dashboard:** ve lo mismo que en el resto del sistema, o sea su visibilidad de [[DEC-0008 Autenticación propia y rol de vendedor freelance|DEC-0008]]: los viajes de sus clientes y los que lleva. El empleado ve los viajes en los que es responsable. Admin y dueño ven toda la agencia y pueden filtrar por responsable.
6. **Las comisiones se atribuyen al vendedor (`vendedor_id`), no al responsable.**
   - El filtro por persona y la vista propia de empleado y freelance cuentan la comisión de los viajes donde esa persona es la vendedora.
   - Si el viaje no tiene vendedor, la comisión se cuenta para el responsable.
7. **Pasajeros por destino:** suma de `Oportunidad.pasajeros` de las ventas del período. Los viajes sin oportunidad de origen no suman pasajeros, pero sí cuentan como viaje.

### Calendario (CU-23)
8. **El calendario incluye las alertas programadas**, como dice el flujo principal de CU-23. Se suma `tipo = alerta` al contrato (con `alerta_id`) y al filtro.
9. **El filtro por estado (CU-23 A1) se resuelve en el cliente.** El calendario devuelve el rango completo, y cada evento trae su estado.

### Reportes (CU-22)
10. **El catálogo de reportes es el que lista CU-22 paso 1**, con un id por reporte:
    - `ventas`: ventas totales;
    - `ganancia`: ganancia y rentabilidad;
    - `cobranzas`: cobrado contra pendiente;
    - `pagos-operadores`;
    - `ventas-por-destino`;
    - `ventas-por-operador`;
    - `ventas-por-vendedor`, con las comisiones;
    - `pasajeros`;
    - `formas-de-pago`;
    - `comparacion-mensual`.

    Si la agencia pide otro, se agrega con su propio id.

### Contrato
11. **El contrato de diseño se alinea con el de código.** `05-Diseño/API/generar-openapi.js` (PC1) suma `responsable_id` en `/dashboard` y `tipo = alerta` en `/calendario`.

### Viajes y cobros (M6)
12. **«Lo mío» del freelance en el listado de viajes** son los viajes donde es responsable. El listado ya está acotado por su visibilidad, así que el filtro solo lo achica.
13. **Revertir un cobro reabre la alerta del pago, aunque alguien la haya resuelto a mano.** El pago vuelve a estar pendiente, así que la alerta tiene que volver a estar activa (comportamiento actual de T-095).
14. **No se revierte un cobro de un viaje cancelado (409).** Primero se revierte la cancelación (CU-27) y después el cobro (comportamiento actual).
15. **La reseña post-viaje se agenda el mismo día en que se finaliza el viaje**, porque RF-041 no fija desfasaje (comportamiento actual de T-096).

## Alternativas consideradas
| Tema | Alternativa descartada | Por qué no |
|---|---|---|
| Pendiente de cobrar | Solo los pagos de las ventas del período, o solo los que vencen en el período | No es la «foto del momento» que pide CU-21. Las cuotas de ventas anteriores quedaban afuera |
| Comisión con ganancia negativa | Comisión negativa | Le restaría al vendedor por una venta a pérdida que no decidió solo |
| Freelance en el dashboard | Solo los viajes en los que es responsable | Contradice DEC-0008 y lo que ve en el listado (T-091) |
| Atribución de comisiones | Por responsable | La comisión es del vendedor ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor\|DEC-0007]]) |
| Alertas en el calendario | Acotar CU-23 a viajes y vencimientos | CU-23 está formalizado y las nombra en el flujo principal |
| Revertir un cobro | Reabrir solo las alertas resueltas automáticamente | Deja un pago pendiente sin alerta |

## Justificación
Cada regla sigue lo que ya dicen CU-21, CU-22, CU-23, DEC-0007 y DEC-0008, y elige la lectura más simple de explicar a la agencia. Las 12 a 15 confirman el comportamiento que ya está implementado.

## Impacto
- **T-121 (ya mergeado):** hay que ajustar los puntos 5 y 6 en una rama `fix/` ([[DEC-0019 Las fallas se arreglan al encontrarlas|DEC-0019]]).
- **T-120 y T-125:** el calendario suma las alertas (punto 8).
- **T-122:** pasajeros por destino (punto 7).
- **T-123 y T-127:** el catálogo de reportes (punto 10).
- **PC1:** hay que actualizar `05-Diseño/API/generar-openapi.js` (punto 11).
- **Restricciones que respeta:** ninguna regla agrega alcance fuera de fase 1.

## Decisores y fecha
- Decisores: Francisco, Paloma y Nahuel.
- Aprobada: 30/10/26.

## Vínculo con el código (a partir de PC2)
- T-121: PR #161 (puntos 1 a 4 ya implementados).
- T-095: PR #155 (puntos 13 y 14).
