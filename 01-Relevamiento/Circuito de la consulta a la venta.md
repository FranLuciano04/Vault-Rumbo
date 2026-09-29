---
tipo: referencia
estado: formalizado
modulo: [clientes, cotizaciones, viajes, economia, alertas, hoteles]
responsable: Nahuel
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# Circuito de la consulta a la venta

tags:: #tipo/referencia #estado/formalizado #pc/pc1

Así trabaja hoy la agencia y así lo acompaña el sistema, de punta a punta.

**Actor principal:** el [[Actores|empleado]] de la agencia.
**Punto de partida:** llega una consulta por Instagram, WhatsApp o de forma presencial.

## Los seis pasos del circuito

1. **Consulta.** Se registran el canal, los pasajeros, el destino y las fechas tentativas. Queda abierta una oportunidad de venta, que pasa a estar en gestión cuando el empleado empieza a atenderla.
2. **Cliente.** Se identifica al cliente o se crea su ficha, con sus datos de contacto, su segmento y sus preferencias.
3. **Cotización.** Se arma la cotización desde una plantilla, con sus ítems y su moneda, y se genera el documento que se envía al cliente. La cotización tiene una fecha de vigencia.
4. **Reserva.** Cuando el cliente acepta, se confirma el viaje y se carga su economía: precio de venta, costo del operador, moneda y comisión del vendedor. El sistema calcula la ganancia y el margen, y se define el plan de cuotas. El viaje avanza a medida que se cobra: primero la seña, después el saldo.
5. **Seguimiento.** El sistema agenda las alertas de vencimiento de cada cuota, las de los requisitos del destino y el aviso de próxima salida, y refleja el viaje en el calendario con su porcentaje pagado.
6. **Post-venta.** Al finalizar el viaje, el sistema recuerda pedir la reseña; el cliente la deja y el hotel queda consolidado en el catálogo para futuras recomendaciones.

## Situaciones frecuentes

- **El cliente no responde:** el sistema agenda un recordatorio de insistencia para volver a contactarlo a los pocos días.
- **Pago en cuotas:** se registran vencimientos escalonados, con aviso anticipado de cada uno. Un mismo viaje puede cobrarse en parte en pesos y en parte en dólares.
- **Destino con requisitos:** el sistema recuerda el formulario o la documentación específica que exige ese destino, con la anticipación configurada.
- **La venta no se concreta:** la oportunidad se cierra como perdida registrando el motivo, que después alimenta los reportes.

## Resultado

El viaje queda registrado con su control económico, sus pagos y sus alertas configuradas, la ficha del cliente actualizada con la operación y el hotel sumado al catálogo con su reseña.

## Diagramas
- [[DGM-SEC — De la consulta a la venta]] — la misma secuencia en el tiempo, con lo que resuelve el sistema por su cuenta.

## 🔎 Revisión
> [!note] Nahuel (22/09) — nota creada al incorporar el relevamiento al pipeline de entregables. **Es un resumen de alto nivel, no la especificación:** el detalle formal —precondiciones, flujos alternativos, postcondiciones y reglas— vive en [[CU-01 De la consulta a la venta]] y en los casos de uso atómicos que lo componen. **Si cambia el circuito, se actualiza primero el CU y después esta nota.** Reemplaza al "caso de uso genérico" que el documento de relevamiento traía embebido, que había quedado desactualizado (canal sin `presencial`, modelo económico con "comisión" del esquema viejo y sin los estados de [[Oportunidad]] ni [[Viaje]]). **Borrador a ratificar en la sync.**
