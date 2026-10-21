---
tipo: regla
estado: borrador
modulo: [cotizaciones]
responsable: Francisco
pc: pc2
actualizado: 21/10/26
---
# RN-07 Vigencia de la cotización

tags:: #tipo/regla #estado/borrador #pc/pc2

## Enunciado
Cada [[Cotización]] tiene una fecha de vigencia (`validez_hasta`), que se calcula al emitirla: la fecha de emisión más un plazo que configura el administrador. El plazo por defecto es de un mes (RF-022).

## Vencimiento
- El proceso automático diario pasa a `vencida` toda cotización `enviada` cuya vigencia expiró sin respuesta del cliente (RF-026).
- Una cotización vencida deja de sostener los precios: para retomar la venta se emite una cotización nueva.
- Las cotizaciones en estado `borrador` no vencen.
- El vencimiento no modifica el estado de la [[Oportunidad]].

## Aplica en
- Entidades: [[Cotización]] · [[Oportunidad]]
- Casos de uso: [[CU-06 Emitir cotización]]

## Origen
RF-022 y RF-026 de [[Requisitos funcionales]].

## 🔎 Revisión
> Borrador del 21/10/26 (Francisco, recomendado C1 del PC1). Reúne RF-022 y RF-026, formalizados el 29/09; la agencia validó ese mismo día la vigencia de un mes. El plazo vive en la tabla `configuracion` de [[DEC-0013 Datos que faltaban en el ER|DEC-0013]]. Falta la aprobación del equipo.
