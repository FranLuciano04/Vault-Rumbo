# 6. Modelo UML

Esta sección reúne todos los diagramas UML del sistema, salvo el de casos de uso, que acompaña a su especificación en la sección 5. Todos se escribieron en Mermaid y se incluyen como imagen.

| Tipo de diagrama | Cantidad | Qué muestra |
|---|---|---|
| Clases | 1 vista principal y 3 de enumeraciones | Las 13 entidades del dominio, sus atributos y sus relaciones |
| Entidad-relación | 1 | Las tablas de la base de datos relacional |
| Estados | 6 | El ciclo de vida de las entidades con reglas propias |
| Actividad | 5 | El flujo de los casos de uso centrales y el proceso automático diario |
| Secuencia | 4 | Los mensajes entre actores y clases en los casos de uso centrales |

## Diagrama de clases

Modelo de dominio con las **13 entidades** —`Cliente`, `Oportunidad`, `Cotización`, `Viaje`, `Pago`, `Alerta`, `Hotel`, `Reseña`, `Usuario`, `ContenidoRed`, `Destino`, `RequisitoDestino` y `Operador`— y la clase asociativa `ViajeHotel`. Está a nivel de dominio: lleva solo atributos, sin métodos, y las relaciones se expresan con asociaciones y multiplicidades UML en ambos extremos. Las claves foráneas no se listan como atributos: las expresa la asociación, con el rol como etiqueta (`responsable`, `vendedor`, `asesor asignado`).

![Diagrama de clases, vista principal.](DGM-clases.png){ width=100% }

Cómo leerlo:

- **Circuito comercial.** `Cliente` → `Oportunidad` → `Cotización` → `Viaje`. Una oportunidad deriva en a lo sumo un viaje cuando se gana.
- **`ViajeHotel` es una clase asociativa.** Resuelve la relación muchos a muchos entre `Viaje` y `Hotel` y tiene identidad propia, porque el mismo hotel puede figurar en dos tramos no consecutivos del mismo viaje, cada uno con su vencimiento de pago al proveedor.
- **`Reseña` depende de tres lados.** Obligatoriamente de `Cliente` y de `Hotel`; el vínculo con `Viaje` es opcional, solo para trazabilidad.
- **Bloque económico del viaje.** `ganancia` y `margen` son atributos derivados (ganancia = precio de venta − costo; margen = ganancia / precio de venta), y la comisión del vendedor va aparte de la ganancia. El `Operador` es la contraparte del costo.
- **Multimoneda.** La moneda del viaje es la de referencia del plan de cuotas; cada `Pago` registra la moneda, el tipo de cambio y el monto efectivamente cobrados, que pueden diferir.
- **`Usuario` no es `Cliente`.** El usuario opera el sistema y aparece con varios roles (responsable de la oportunidad y del viaje, vendedor, asesor asignado y propietario de la alerta); el cliente es un dato.
- **`Alerta` tiene varios orígenes posibles**, todos opcionales según su tipo: el viaje, el pago, la oportunidad o el cliente. Una alerta manual puede quedar suelta, sin origen.

### Enumeraciones del dominio

Las **20 enumeraciones** son parte del mismo modelo. Se muestran en tres bandas agrupadas por módulo; cada dependencia punteada indica qué atributo usa la enumeración. `Moneda` es la única compartida: la usan `Viaje`, `Cotización` y `Pago`.

![Enumeraciones: CRM y seguridad.](DGM-clases-enums-1.png){ width=100% }

![Enumeraciones: viaje, economía y pagos.](DGM-clases-enums-2.png){ width=100% }

![Enumeraciones: catálogo, postventa, alertas y redes.](DGM-clases-enums-3.png){ width=100% }

## Diagrama entidad-relación

Modelo relacional para PostgreSQL, par del diagrama de clases: aquel describe objetos y este describe tablas. Las claves primarias son siempre `uuid`; a diferencia del diagrama de clases, las claves foráneas sí se listan. Los valores de las enumeraciones se guardan sin tildes ni eñes (`en_gestion`, `sena`, `resena`).

![Modelo entidad-relación.](DGM-ER.png){ width=100% }

Criterios principales del modelo:

- **Todo viaje tiene al menos un pago.** Aun sin plan de cuotas, al confirmar la reserva se crea un pago de tipo saldo. Como una clave foránea no puede exigir «al menos una fila hija», esa obligación la garantiza el backend.
- **La alerta tiene cinco orígenes posibles y excluyentes:** el viaje, el pago, la oportunidad, el cliente o el tramo del itinerario (`viaje_hotel`). Son columnas opcionales con una restricción que impide cargar más de una; una alerta manual suelta no tiene ninguna.
- **Auditoría en todas las tablas de entidad:** quién creó y modificó cada registro y cuándo. Lo que hace el proceso automático diario queda sin autor, y un autor vacío se lee como «lo hizo el sistema».
- **Bajas lógicas:** nada se borra en cascada; los registros se desactivan o se anulan y se conserva el historial.
- **Catálogos normalizados:** el destino del viaje y del hotel, y el operador del viaje, son tablas propias. El destino consultado en una oportunidad es texto libre y se normaliza al confirmar el viaje.
- **Parámetros del negocio:** la tabla `configuracion`, de una sola fila, guarda los valores que edita el administrador (vigencia de la cotización, anticipación del aviso de salida y plazo del recontacto). Con ella y con `viaje_hotel`, el esquema tiene **15 tablas**.

## Diagramas de estados

Seis entidades tienen un ciclo de vida con reglas propias. En los diagramas, cada flecha lleva el código de la transición y el evento que la dispara; las flechas marcadas con ⚙ las aplica el sistema por su cuenta (en general, el proceso automático diario) y las marcadas con ↺ son correcciones de un error de carga, no pasos del flujo de negocio. En verde se marcan los cierres exitosos y en rojo las bajas lógicas.

### Viaje

@@ESTADOS EST-Viaje@@

![Estados del viaje.](EST-Viaje.png){ width=85% }

### Oportunidad

@@ESTADOS EST-Oportunidad@@

![Estados de la oportunidad.](EST-Oportunidad.png){ width=75% }

### Cotización

@@ESTADOS EST-Cotización@@

![Estados de la cotización.](EST-Cotización.png){ width=75% }

### Pago

@@ESTADOS EST-Pago@@

![Estados del pago.](EST-Pago.png){ width=75% }

### Alerta

@@ESTADOS EST-Alerta@@

![Estados de la alerta.](EST-Alerta.png){ width=75% }

### Contenido de redes

@@ESTADOS EST-ContenidoRed@@

![Estados del contenido de redes.](EST-ContenidoRed.png){ width=75% }

## Diagramas de actividad

Muestran el flujo de los casos de uso centrales, con sus decisiones, sus bucles y las acciones que ocurren en paralelo, separados en carriles según quién hace cada acción.

### De la consulta a la venta (CU-01)

Los pasos del circuito principal, en orden, con las situaciones que lo desvían: el cliente no responde, desiste, paga en cuotas o viaja a un destino con requisitos. Intervienen el cliente, el empleado y el sistema.

![Actividad: de la consulta a la venta.](DGM-ACT-consulta-a-venta.png){ width=100% }

### Confirmar reserva (CU-07)

El momento en que una oportunidad ganada se convierte en viaje. El sistema crea el viaje y genera en paralelo las alertas del destino y de la salida; después se cargan el control económico y el plan de cuotas, con la validación de que la suma de las cuotas sea igual al precio de venta.

![Actividad: confirmar reserva.](DGM-ACT-confirmar-reserva.png){ width=100% }

### Registrar el cobro de un pago (CU-12)

El camino del dinero. El empleado registra un cobro, con tipo de cambio si se paga en otra moneda; el sistema marca el pago, cierra su alerta y actualiza el saldo. Según el caso, el viaje avanza a `vendido` (primer cobro) o a `confirmado` (saldo en cero). Como flujo aparte, con su propio inicio, se muestra la corrección de un cobro mal registrado.

![Actividad: registrar el cobro de un pago.](DGM-ACT-registrar-cobro.png){ width=100% }

### Cancelar viaje (CU-27)

El flujo que más se ramifica según el estado del viaje. Un viaje finalizado no se cancela; los pagos no cobrados se anulan y los cobrados solo se informan, y la comisión del vendedor se pierde o se mantiene según el viaje haya empezado o no. Como flujo aparte se muestra la reversión de una cancelación hecha por error.

![Actividad: cancelar viaje.](DGM-ACT-cancelar-viaje.png){ width=100% }

### Proceso automático diario

Lo que el sistema hace solo, todos los días a las 00:00, sin que nadie lo dispare. No es un caso de uso, porque no tiene actor humano: reúne en una sola corrida las transiciones automáticas de los diagramas de estados. Sus cuatro tareas son independientes y corren en paralelo: vencer los pagos, vencer las cotizaciones, sugerir el avance de los viajes según sus fechas y detectar los clientes para recontactar. Las alertas de pago, de requisitos del destino y de salida no las genera esta corrida: se crean con su fecha al confirmar la reserva y aparecen en la agenda cuando llega ese día.

![Actividad: proceso automático diario.](DGM-ACT-proceso-diario.png){ width=100% }

## Diagramas de secuencia

El primero es una vista **de negocio**, con el sistema como caja negra. Los otros tres son vistas **de análisis**: los participantes son las clases del sistema y se muestran los mensajes que intercambian.

### De la consulta a la venta (CU-01)

El circuito completo en el tiempo: desde que llega la consulta hasta que el viaje queda cobrado y el hotel se suma al catálogo, con quién hace cada cosa y qué resuelve el sistema por su cuenta.

![Secuencia de negocio: de la consulta a la venta.](DGM-SEC-consulta-a-venta.png){ width=95% }

### Confirmar reserva (CU-07)

Los mensajes entre el empleado y las clases del sistema al convertir en viaje una oportunidad con su cotización aceptada y cerrarla como ganada, con las alertas generadas en paralelo, el control económico y el plan de cuotas.

![Secuencia: confirmar reserva.](DGM-SEC-confirmar-reserva.png){ width=100% }

### Registrar el cobro de un pago (CU-12)

Los mensajes al registrar un cobro, resolver la alerta de vencimiento y avanzar el viaje a `vendido` o a `confirmado`. Como continuación en el tiempo se muestra la corrección de un cobro mal registrado.

![Secuencia: registrar el cobro de un pago.](DGM-SEC-registrar-cobro.png){ width=100% }

### Cancelar viaje (CU-27)

Los mensajes al cancelar un viaje, anular sus pagos no cobrados, resolver sus alertas y dejar constancia de la comisión según el viaje haya empezado o no. Como continuación se muestra la reversión de una cancelación hecha por error.

![Secuencia: cancelar viaje.](DGM-SEC-cancelar-viaje.png){ width=100% }
