Los diagramas de esta sección muestran cómo fluye el trabajo de la agencia a través del sistema, desde los casos de uso hasta la arquitectura. Todos están escritos en Mermaid (ver la sección 8) y se incluyen como imagen. Acá van los principales; la carpeta de entrega tiene el conjunto completo: los seis diagramas de estados, los cinco de actividad y los cuatro de secuencia.

## Diagrama de casos de uso

El sistema tiene **31 casos de uso** en once módulos. `Admin`, `Dueño` y `Freelance` son especializaciones del `Empleado`: heredan sus casos operativos, y solo se dibujan aparte los que son exclusivos de cada uno. El freelance, además, no gestiona hoteles, no registra reseñas y no usa el módulo de redes. El pasajero es actor externo: recibe la cotización y aporta la reseña, pero no opera el sistema.

![Diagrama de casos de uso.](DGM-casos-de-uso.png){ width=55% }

## Circuito de la consulta a la venta

Es el caso de uso núcleo (CU-01), que el resto de los casos compone: el cliente consulta, la agencia cotiza, se confirma la reserva, se cobran las cuotas y se hace la postventa. El diagrama de secuencia de negocio muestra quién interviene en cada paso y cómo cambian los estados de la oportunidad y del viaje.

![Secuencia de negocio: de la consulta a la venta.](DGM-SEC-consulta-a-venta.png){ width=95% }

## Diagrama de clases

Modelo de dominio con las **13 entidades** y la clase asociativa `ViajeHotel`. Está a nivel de dominio: lleva solo atributos, sin métodos, y las relaciones se expresan con asociaciones y multiplicidades. Las 20 enumeraciones están en la carpeta de entrega.

![Diagrama de clases, vista principal.](DGM-clases.png){ width=100% }

## Diagramas de estados

Seis entidades tienen un ciclo de vida con reglas propias: `Viaje`, `Oportunidad`, `Pago`, `Cotización`, `Alerta` y `ContenidoRed`. Estos son los tres centrales del circuito de venta. Las flechas marcadas con ⚙ las aplica el proceso automático diario, y las marcadas con ↺ son correcciones.

![Estados del viaje: el primer cobro lo pasa a vendido y, si salda el total, a confirmado.](EST-Viaje.png){ width=85% }

![Estados de la oportunidad: pasa a ganada al confirmarse la reserva.](EST-Oportunidad.png){ width=70% }

![Estados del pago: vencido es un pendiente con la fecha pasada; anulado es la baja lógica.](EST-Pago.png){ width=70% }

## Diagrama de actividad

El circuito completo de CU-01, con las decisiones de cada paso y el actor que realiza cada acción.

![Actividad: de la consulta a la venta.](DGM-ACT-consulta-a-venta.png){ width=80% }

## Diagrama de secuencia de análisis

Registrar el cobro de un pago (CU-12), con la interfaz, el control y las entidades que intervienen. La versión de diseño, con Vista, Controlador y Modelo, está en la sección 6.

![Secuencia: registrar el cobro de un pago.](DGM-SEC-registrar-cobro.png){ width=100% }
