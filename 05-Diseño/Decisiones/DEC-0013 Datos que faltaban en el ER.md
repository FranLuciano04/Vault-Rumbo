---
tipo: decision
estado: formalizado
modulo: [economia, configuracion, seguridad]
decisores: [Francisco, Nahuel, Paloma]
fecha_aprobacion: 30/09/26
supersede:
actualizado: 30/09/26
---
# DEC-0013 Datos que faltaban en el ER

tags:: #tipo/decision #estado/formalizado #pc/pc1

> ✅ **Ratificada por el equipo completo el 30/09/26** (Francisco, Nahuel y Paloma). Nahuel la había aprobado el 29/09, al escribir el script SQL (F2) y el contrato OpenAPI (F1).

## Contexto
Al pasar el [[DGM-ER]] a SQL y al derivar los endpoints aparecieron once datos (y un duodécimo al aceptar las propuestas de Paloma para CU-14) que los casos de uso y las decisiones ya piden, pero que el ER no tenía dónde guardar:
1. [[CU-12 Registrar cobro de un pago|CU-12]] pide la **fecha efectiva del cobro**, y `PAGO` no tenía esa columna.
2. La **vigencia de la cotización** (1 mes), la **anticipación de la alerta `salida`** (7 días) y el **plazo del recontacto** (6 meses) son configurables por `admin` ([[CU-06 Emitir cotización|CU-06]], [[CU-07 Confirmar reserva|CU-07]], [[CU-30 Sugerir recontacto de clientes|CU-30]]), pero no había tabla de parámetros.
3. La comisión del vendedor es **importe o porcentaje**, con **default por vendedor** y override por viaje ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]], [[CU-13 Configurar porcentaje de comisión|CU-13]]), pero el ER solo tenía `VIAJE.comision_vendedor` como número, sin tipo y sin default en `USUARIO`.
4. El **acceso al módulo de redes** es una capacidad que asigna `admin` ([[DEC-0005 Autenticación y modelo de roles|DEC-0005]]), pero `USUARIO` no tenía dónde guardarla.
5. [[CU-25 Gestionar usuarios y roles|CU-25]] A3 pide la **baja lógica de un usuario**, pero `USUARIO` no tenía un campo `activo`.
6. [[CU-27 Cancelar viaje|CU-27]] A3: al revertir una cancelación, el viaje **vuelve al estado que tenía antes de cancelarse**, pero `VIAJE` no lo guardaba.
7. Los requisitos de [[CU-04 Registrar consulta|CU-04]] y [[CU-05 Seguir oportunidad|CU-05]] piden guardar las **notas** de la consulta y del seguimiento, y `OPORTUNIDAD` no tenía dónde.
8. Tres requisitos piden guardar un **motivo**: el de pérdida de la `Oportunidad` (lista fija), el de cancelación del `Viaje` (con su fecha, [[CU-27 Cancelar viaje|CU-27]]) y el de baja de una `Reseña` ([[CU-29 Eliminar reseña|CU-29]]). Ninguno estaba en el ER.
9. En [[CU-09 Armar itinerario de hoteles|CU-09]], cada tramo puede tener su alerta de pago al proveedor, y al editar o pagar el tramo se cierra «su» alerta. Como `ALERTA` solo podía colgar del viaje, con dos tramos no se sabía cuál era cuál.
10. [[CU-28 Crear recordatorio manual|CU-28]] pide cargar una **descripción** de la tarea, y las alertas automáticas también necesitan un texto; `ALERTA` no tenía ninguno.
11. [[CU-20 Generar propuesta de contenido con IA|CU-20]] guarda el borrador elegido en una pieza de `ContenidoRed`, pero `CONTENIDO_RED` solo tenía título.
12. El **progreso del día** que se sumó a [[CU-14 Ver y atender alertas del día|CU-14]] (RF-155, propuesta de Paloma) necesita saber qué alertas se resolvieron **hoy**, y `updated_at` no sirve porque cambia con cualquier edición.

## Decisión
1. **`PAGO.fecha_cobro`** (`date`, nullable): se carga al cobrar, junto con `forma_pago` y `moneda_pago`, y se borra si se revierte el cobro.
2. **Tabla `CONFIGURACION` de una sola fila**, con columnas tipadas y los valores validados con la agencia como default: `vigencia_cotizacion_meses` = 1, `anticipacion_salida_dias` = 7 y `recontacto_meses` = 6. Es una tabla de parámetros, **no una entidad del dominio**: el dominio sigue teniendo 13 entidades. La edita `admin`.
3. **Comisión con tipo y valor:** nuevo enum `tipo_comision` (`importe`, `porcentaje`; el porcentaje es sobre la ganancia). `USUARIO` suma `comision_default_tipo` y `comision_default_valor` (ambos nullable, porque no todo usuario vende). `VIAJE` suma `comision_tipo` junto a `comision_vendedor`. Cambiar el default de un vendedor no recalcula los viajes ya registrados.
4. **`USUARIO.acceso_redes`** (`boolean`, default `false`). `admin` y `dueño` tienen acceso por su rol, sin importar el valor.
5. **`USUARIO.activo`** (`boolean`, default `true`), como en `DESTINO` y `OPERADOR`. Un usuario inactivo no puede iniciar sesión.
6. **`VIAJE.estado_previo`** (enum `estado_viaje`, nullable): se carga al cancelar y se vacía al revertir. Solo tiene valor mientras el viaje está `cancelado`. Se descartó deducir el estado a partir de los cobros y las fechas porque es más frágil.
7. **`OPORTUNIDAD.notas`** (`text`, nullable): una bitácora libre que se va editando. Se descartó una tabla de interacciones porque sumaba una entidad nueva a días del PC1; queda como mejora posible.
8. **Motivos:** `OPORTUNIDAD.motivo_perdida` (nuevo enum `motivo_perdida`: `precio`, `fechas_disponibilidad`, `desistio`, `otra_agencia`, `sin_respuesta`, `otro`) y `motivo_perdida_detalle` (texto, si es `otro`); `VIAJE.motivo_cancelacion` y `fecha_cancelacion`; `RESENA.motivo_baja`. Todos nullable y cargados solo en el estado que corresponde.
9. **`ALERTA.viaje_hotel_id`** (nullable) como **quinto origen**; el CHECK pasa a «a lo sumo uno de cinco».
10. **`ALERTA.descripcion`** (`text`, obligatoria): la escribe el empleado en CU-28 y la arma el sistema en las alertas automáticas.
11. **`CONTENIDO_RED.texto`** (`text`, nullable): el cuerpo del posteo, escrito a mano o completado con el borrador de la IA.
12. **`ALERTA.resuelta_en`** (`timestamptz`, nullable): se carga al pasar a `resuelta` (a mano o sola) y se limpia si la alerta se reabre. Solo tiene valor en las alertas resueltas.

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Fecha del cobro = `updated_at` del pago | Sin columna nueva | Se pierde si se cobra con fecha anterior o se edita después | ❌ |
| Parámetros en variables de entorno | Simple | No los puede cambiar `admin` desde la app | ❌ |
| Parámetros como tabla clave-valor | Flexible | Pierde los tipos y los CHECK de la base | ❌ |
| Guardar siempre la comisión como importe ya calculado | Más simple | Se pierde qué porcentaje se aplicó | ❌ |

## Impacto
- [[DGM-ER]], [[DGM — Diagrama de clases]] (nuevos enums `TipoComision` y `MotivoPerdida`: son 20) y las notas de [[Pago]], [[Usuario]], [[Viaje]], [[Oportunidad]], [[Reseña]], [[Alerta]] y [[ContenidoRed]].
- [[Modelo de datos SQL]]: pasa a 15 tablas y 20 enumeraciones.
- [[Contrato de la API (OpenAPI)]]: los esquemas del circuito de CU-01 y los endpoints de configuración, baja de usuarios, pérdida de oportunidades y cancelación de viajes.

## Decisores y fecha
- Nahuel — aprobada el 29/09/26. Francisco, Nahuel y Paloma — **ratificada el 30/09/26**, completa y sin cambios. La lista de motivos de pérdida del punto 8 es una propuesta del equipo (no sale del relevamiento) y el equipo la adopta como válida.

## Vínculo con el código (a partir de PC2)
- Rama: `-` · Commits: `-`
