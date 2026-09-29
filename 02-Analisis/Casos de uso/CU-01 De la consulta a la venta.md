---
tipo: caso-uso
estado: formalizado
modulo: [clientes, cotizaciones, viajes, economia, alertas, hoteles]
responsable: Francisco
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# CU-01 De la consulta a la venta

tags:: #tipo/caso-uso #estado/formalizado #pc/pc1

## Descripción
Flujo núcleo del negocio: desde que llega una consulta por redes hasta que el viaje queda vendido, con su control económico, pagos y alertas, y el hotel sumado al catálogo.

## Actor principal
[[Actores|empleado]] (rol operativo; los `admin`/`dueño`/`freelance` son especializaciones — [[Actores]], [[DEC-0005 Autenticación y modelo de roles]])

## Actores secundarios
- [[Actores|Pasajero / Cliente]] (externo: recibe cotización y recordatorios)

## Precondiciones
- Llega una consulta por un canal: Instagram, WhatsApp o presencial.

## Flujo principal
1. **Cliente:** el empleado identifica al [[Cliente]] o, si es nuevo, crea su ficha (preferencias, segmento) ([[CU-02 Registrar cliente]]).
2. **Consulta:** registra el **canal** (Instagram · WhatsApp · presencial), los pasajeros, el destino y las fechas → se crea una [[Oportunidad]] en estado `nueva`, ya asociada al [[Cliente]], que pasa a `en_gestión` al empezar a atenderla ([[CU-04 Registrar consulta]], [[CU-05 Seguir oportunidad]]).
3. **Cotización:** se genera la [[Cotización]] desde plantilla → documento; la [[Oportunidad]] pasa a `cotizada` ([[CU-06 Emitir cotización]]).
4. **Reserva y seguimiento:** cuando el cliente acepta, se confirma el [[Viaje]], que nace en estado **`reservado`** ([[CU-07 Confirmar reserva]]). Se carga su **economía** —precio de venta, **costo del [[Operador]]**, **moneda** (ARS/USD); el sistema calcula **ganancia** (`venta − costo`) y **margen**, y se registra aparte la **comisión del vendedor** ([[CU-10 Registrar economía del viaje]], [[RN-01 Comisión automática]])— y el **plan de cuotas** ([[Pago]], [[CU-11 Definir plan de cuotas]]). Al confirmar la reserva la [[Oportunidad]] queda `ganada`, y el sistema arma las [[Alerta|alertas]] de seguimiento: las de formularios por destino ([[RequisitoDestino]]) y de próxima salida ([[CU-07 Confirmar reserva]]) y las de vencimiento de cada pago ([[CU-11 Definir plan de cuotas]]). Con el **primer cobro** el [[Viaje]] pasa a `vendido`; al saldarse el total, a `confirmado` ([[CU-12 Registrar cobro de un pago]]).
5. **Post-venta:** al finalizar el viaje, el cliente deja [[Reseña]] y el [[Hotel]] se suma/consolida en el catálogo.

## Flujos alternativos
- **A1 — El cliente no responde:** el sistema agenda un recordatorio de insistencia (volver a preguntar en X días).
- **A2 — Pago en cuotas:** se registran vencimientos escalonados; aviso un mes antes de cada uno. Un mismo viaje puede cobrarse parte en ARS y parte en USD ([[CU-12 Registrar cobro de un pago]]).
- **A3 — Destino con requisitos:** recordatorio del formulario específico según el destino ([[RequisitoDestino]]).

## Postcondiciones
- [[Viaje]] registrado (estado según el avance del cobro: `reservado`/`vendido`/`confirmado`) con control económico, pagos y alertas configurados, ficha del cliente actualizada y hotel en el catálogo.

## Reglas de negocio aplicadas
- [[RN-01 Comisión automática]] (ganancia y margen automáticos; comisión del vendedor aparte).

## Entidades del dominio involucradas
- [[Oportunidad]] · [[Cliente]] · [[Cotización]] · [[Viaje]] · [[Operador]] · [[Destino]] · [[Pago]] · [[Alerta]] · [[RequisitoDestino]] · [[Reseña]] · [[Hotel]]

## Diagramas
- [[MOC — Modelo de dominio]] · [[DGM — Casos de uso]] · [[DGM-SEC — De la consulta a la venta]] (secuencia) · [[DGM-ACT — De la consulta a la venta]] (actividad)

## 🔎 Revisión
> [!note] Nahuel (09/09): ¿"Consulta" es exactamente la entidad [[Oportunidad]]? Ver [[DEC-0002 Modelar la consulta como Oportunidad]]. → **Resuelto:** sí, la consulta se modela como [[Oportunidad]] (DEC-0002, alineada a los 5 estados el 18/09, a ratificar en sync).
>
> [!note] Nahuel (18/09, entrevista grill) — **CU-01 reescrito al modelo sellado:** actor `empleado` (antes "Agente/Asesor"), canal con `presencial`, estados de [[Oportunidad]] y [[Viaje]] (`reservado`/`vendido`/`confirmado`), modelo económico de [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] (ganancia/margen/comisión del vendedor, multimoneda), [[Operador]] y alerta de `salida`. Reemplaza la versión del 09/09 (que usaba "costo neto/comisión" del modelo viejo).
