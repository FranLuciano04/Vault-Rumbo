---
tipo: caso-uso
estado: en-revision
modulo: [clientes, cotizaciones, viajes, economia, alertas, hoteles]
responsable: Francisco
pc: pc1
actualizado: 09/09/26
---
# CU-01 De la consulta a la venta

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
Flujo núcleo del negocio: desde que llega una consulta por redes hasta que el viaje queda vendido, con su control económico, pagos y alertas, y el hotel sumado al catálogo.

## Actor principal
[[Actores|Agente / Asesor]]

## Actores secundarios
- [[Actores|Pasajero / Cliente]] (externo: recibe cotización y recordatorios)

## Precondiciones
- Llega una consulta por Instagram o WhatsApp.

## Flujo principal
1. **Consulta:** el agente registra pasajeros, destino y fechas → se crea una [[Oportunidad]].
2. **Cliente:** se identifica o se crea la ficha del [[Cliente]] (preferencias, segmento).
3. **Cotización:** se genera la [[Cotización]] desde plantilla → documento.
4. **Reserva:** se confirma el [[Viaje]] con venta, costo neto, comisión y cuotas ([[Pago]]).
5. **Seguimiento:** el sistema arma [[Alerta|alertas]] de pago y formularios por destino.
6. **Post-venta:** el cliente deja [[Reseña]] y el [[Hotel]] se suma al catálogo.

## Flujos alternativos
- **A1 — El cliente no responde:** el sistema agenda un recordatorio de insistencia (volver a preguntar en X días).
- **A2 — Pago en cuotas:** se registran vencimientos escalonados; aviso un mes antes de cada uno.
- **A3 — Destino con requisitos:** recordatorio del formulario específico según el destino.

## Postcondiciones
- Viaje registrado con control económico, pagos y alertas configurados, ficha del cliente actualizada y hotel en el catálogo.

## Reglas de negocio aplicadas
- [[RN-01 Comisión automática]]

## Entidades del dominio involucradas
- [[Oportunidad]] · [[Cliente]] · [[Cotización]] · [[Viaje]] · [[Pago]] · [[Alerta]] · [[Reseña]] · [[Hotel]]

## Diagramas
- [[MOC — Modelo de dominio]] · (pendiente) diagrama de secuencia y de actividad

## 🔎 Revisión
> [!question] Nahuel (09/09): ¿"Consulta" es exactamente la entidad [[Oportunidad]]? Ver [[DEC-0002 Modelar la consulta como Oportunidad]].
