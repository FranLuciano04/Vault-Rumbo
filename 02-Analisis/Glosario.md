---
tipo: referencia
estado: borrador
responsable: Francisco
pc: pc2
actualizado: 21/10/26
---
# Glosario

tags:: #tipo/referencia #estado/borrador #pc/pc2

Este glosario reúne el lenguaje común de Rumbo: los términos que se usan con el mismo significado en el análisis, en el sistema y en las pantallas. Cada definición resume la nota que describe el término en detalle.

En el modelo de datos y en la interfaz de programación, los valores con tilde o eñe se escriben sin ellos (por ejemplo, `dueno`, `sena`, `resena`, `en_gestion`). En el análisis y en las pantallas se escriben en castellano.

## Entidades del dominio
| Término | Definición | Nota |
|---|---|---|
| **Alerta** | Recordatorio para no perder vencimientos ni tareas. Tiene un tipo según su origen: `pago`, `formulario`, `salida`, `viaje`, `insistencia`, `recontacto`, `reseña` o `manual`. Estados: `pendiente · vista · resuelta`. | [[Alerta]] |
| **Cliente** | Persona o grupo que consulta y viaja con la agencia. Concentra la ficha, las preferencias, el historial y el segmento. Es el activo del negocio. | [[Cliente]] |
| **ContenidoRed** | Pieza de contenido para redes sociales, gestionada en un tablero kanban. Estados: `idea · en producción · listo · publicado · descartado`. | [[ContenidoRed]] |
| **Cotización** | Documento que responde a una Oportunidad, armado desde una plantilla con los ítems y sus precios. Estados: `borrador · enviada · aceptada · rechazada · vencida`. | [[Cotización]] |
| **Destino** | Lugar que ofrece la agencia (ciudad o país). Catálogo compartido que usan los viajes y los hoteles, y del que cuelgan los requisitos por destino. | [[Destino]] |
| **Hotel** | Hotel del catálogo, con sus reseñas, para consultar y recomendar. Estados: `activo · cerrado`. | [[Hotel]] |
| **Operador** | Operador turístico o mayorista al que la agencia le compra el viaje. Es la contraparte del costo del viaje. | [[Operador]] |
| **Oportunidad** | Una consulta o *lead*: el interés de un cliente en un viaje antes de que sea una venta. Estados del embudo: `nueva · en_gestión · cotizada · ganada · perdida`. | [[Oportunidad]] |
| **Pago** | Un pago o cuota del plan de un viaje, con monto, vencimiento y estado. El sistema lo registra, no lo cobra online. Estados: `pendiente · pagado · vencido · anulado`. | [[Pago]] |
| **RequisitoDestino** | Requisito o formulario que exige un destino (visa, vacunación, documentación). Dispara las alertas de tipo `formulario`. | [[RequisitoDestino]] |
| **Reseña** | Opinión post-viaje de un cliente sobre un hotel. Estados: `publicada · oculta`. | [[Reseña]] |
| **Usuario** | Persona que opera el sistema, con un rol. No confundir con el Cliente, que no opera el sistema. | [[Usuario]] |
| **Viaje** | Reserva concreta de un cliente: destino, fechas, categoría, estado y economía. Es el núcleo operativo. Estados: `reservado · vendido · confirmado · en curso · finalizado · cancelado`. | [[Viaje]] |

## Roles
| Término | Definición |
|---|---|
| **empleado** (asesor) | Usuario principal: atiende consultas, cotiza, arma viajes y controla pagos y alertas. Ve toda la agencia y organiza lo suyo con la vista personal. |
| **admin** | Gestiona usuarios y configura el negocio (comisiones, parámetros, catálogos). Ve toda la empresa. |
| **dueño** | Propietaria de la agencia. Ve todo, con reportes y estadísticas, y puede hacer todo lo del `admin`. |
| **freelance** | Vendedor externo que carga sus propias ventas y clientes y solo ve lo suyo. No modifica el catálogo ni usa el módulo de redes. |
| **encargado de redes** | No es un rol: es el acceso al módulo de redes que `admin` o `dueño` le dan a un `empleado`. |
| **pasajero** | El Cliente visto como actor externo: recibe cotizaciones y deja reseñas, pero no opera el sistema. |

Detalle en [[Actores]] y [[RN-10 Visibilidad por propiedad y rol]].

## Términos del negocio
| Término | Definición | Fuente |
|---|---|---|
| **Baja lógica** | Dar de baja un registro cambiándole el estado (inactivo, cerrado, oculto, anulado, cancelado o descartado), sin borrarlo. | [[RN-04 Baja lógica]] |
| **Canal** | Por dónde llega la consulta: Instagram, WhatsApp o presencial. | [[Oportunidad]] |
| **Comisión del vendedor** | Lo que cobra el vendedor por un viaje, como importe fijo o porcentaje sobre la ganancia. Cada vendedor tiene un valor por defecto que se puede sobrescribir en cada viaje. Es un concepto separado de la ganancia. | [[RN-01 Comisión automática]] |
| **Costo** | Lo que la agencia le paga al operador por el viaje. | [[RN-01 Comisión automática]] |
| **Cuota** | Cada uno de los pagos intermedios del plan. Tipo de Pago `cuota`. | [[Pago]] |
| **Embudo de ventas** | El recorrido de las oportunidades por sus estados, de `nueva` a `ganada` o `perdida`. Se mide en el dashboard. | [[CU-21 Ver dashboard y embudo]] |
| **Forma de pago** | Cómo pagó el cliente un cobro: efectivo, transferencia, tarjeta de crédito, tarjeta de débito, cheque o depósito. Las billeteras virtuales cuentan como transferencia. Se carga al cobrar. | [[Pago]] |
| **Ganancia** | Precio de venta menos costo, por operación. La calcula el sistema. | [[RN-01 Comisión automática]] |
| **Insistencia** | Alerta para volver a contactar a un cliente que no respondió, a los días que indique el empleado. | [[CU-05 Seguir oportunidad]] |
| **Itinerario** | Los hoteles de un viaje, en orden. Cada **tramo** tiene check-in, check-out y, si corresponde, el vencimiento del pago al proveedor. Un mismo hotel puede repetirse en varios tramos. | [[CU-09 Armar itinerario de hoteles]] |
| **Margen** | La ganancia como porcentaje del precio de venta. Lo calcula el sistema. | [[RN-01 Comisión automática]] |
| **Moneda de la operación** | ARS o USD, elegida por viaje. El plan de pagos se arma en esa moneda; un cobro puede hacerse en la otra, con el **tipo de cambio** del día. | [[RN-03 Pago indivisible]] |
| **Opt-out** (`no_recontactar`) | Marca de un cliente que no quiere ser recontactado. Lo saca de las sugerencias de recontacto. | [[CU-30 Sugerir recontacto de clientes]] |
| **Plan de cuotas** | El conjunto de pagos de un viaje (seña, cuotas y saldo) con sus vencimientos. Siempre suma el precio de venta. | [[RN-02 Plan de pagos igual al precio de venta]] |
| **Precio de venta** | Lo que paga el cliente por el viaje. | [[RN-01 Comisión automática]] |
| **Proceso automático diario** | Corrida de las 00:00 (hora argentina) que vence pagos y cotizaciones y genera las alertas `viaje` y `recontacto`. Lo que hace queda sin autor (= «lo hizo el sistema»). | [[DGM-ACT — Proceso automático diario]] |
| **Recontacto** | Sugerencia de volver a contactar a un cliente que lleva unos seis meses sin comprar ni viajar. El sistema sugiere y una persona contacta. | [[CU-30 Sugerir recontacto de clientes]] |
| **Saldo** | Lo que falta cobrar de un viaje. También es el tipo de Pago `saldo`, el último del plan o el pago único. | [[Pago]] |
| **Salida grupal** | Viaje de categoría `grupal`; los demás son `individual`. | [[Viaje]] |
| **Segmento** | Tipo de cliente: familia, amigos, individual o pareja. Para acciones comerciales también se agrupan clientes con etiquetas libres (Brasil, Caribe, cruceros…). | [[Cliente]] |
| **Seña** | Pago inicial, opcional, del plan de cuotas. Tipo de Pago `seña`. Su cobro, o el del primer pago si no hay seña, pasa el viaje a `vendido`. | [[RN-05 Ciclo de vida del viaje]] |
| **Vigencia de la cotización** | Hasta cuándo se sostienen los precios de una cotización: un mes por defecto. | [[RN-07 Vigencia de la cotización]] |
| **Vista personal** | Filtro «lo mío» de cada usuario sobre lo que ve de toda la agencia. | [[RN-10 Visibilidad por propiedad y rol]] |

## 🔎 Revisión
> Borrador del 21/10/26 (Francisco, recomendado C3 del PC1). Las definiciones salen de las notas de entidades, [[Actores]], las reglas y los CU, todos formalizados; no agregan datos del negocio. El criterio de los enum en ASCII está en la tabla de convenciones de [[DGM-ER]]. Falta la aprobación del equipo.
